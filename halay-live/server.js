// Halay Live - sunucu
// TikTok canli yayin olaylarini okur, sadelestirir ve oyuna (tarayici) WebSocket ile iletir.
// Kullanim:  node server.js [tiktok_kullanici_adi]
const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
const { WebSocketServer } = require('ws');

const CONFIG_PATH = path.join(__dirname, 'config.json');
const loadConfig = () => JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
let config = loadConfig();

const app = express();
app.use(express.json({ limit: '50kb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/vendor/three', express.static(path.join(__dirname, 'node_modules/three/build')));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

let status = { tiktok: 'kapalı', user: '' };

function broadcast(msg) {
  const data = JSON.stringify(msg);
  for (const c of wss.clients) if (c.readyState === 1) c.send(data);
}
wss.on('connection', (ws) => ws.send(JSON.stringify({ type: 'status', ...status })));

app.get('/api/config', (_req, res) => {
  try { config = loadConfig(); } catch (e) { console.error('config.json okunamadı:', e.message); }
  res.json(config);
});
app.get('/api/status', (_req, res) => res.json(status));

// Simulator / TikFinity webhook girisi: { type, user:{id,name,avatar}, count, coins, giftName, comment }
const TYPES = new Set(['join', 'like', 'chat', 'gift', 'follow', 'share', 'reset']);
app.post('/api/event', (req, res) => {
  const e = req.body || {};
  if (!TYPES.has(e.type)) return res.status(400).json({ error: 'bilinmeyen olay tipi' });
  broadcast({ ...e, sim: true });
  res.json({ ok: true });
});

// ---------- TikTok baglantisi ----------
const pic = (u) =>
  u?.profilePictureUrl ||
  u?.profilePicture?.urls?.[0] || u?.profilePicture?.url?.[0] || u?.profilePicture?.urlList?.[0] ||
  u?.avatarThumb?.urlList?.[0] || u?.avatarMedium?.urlList?.[0] || u?.avatarLarge?.urlList?.[0] || '';

const normUser = (d) => {
  const u = d?.user || d || {};
  const id = String(u.uniqueId || d?.uniqueId || u.userId || d?.userId || '');
  return { id, name: String(u.nickname || d?.nickname || id), avatar: pic(u) || pic(d) };
};

function startTikTok(username) {
  let lib;
  try { lib = require('tiktok-live-connector'); }
  catch { console.error('tiktok-live-connector yüklü değil: npm install'); return; }
  const { TikTokLiveConnection, WebcastEvent, ControlEvent } = lib;
  status = { tiktok: 'bağlanıyor', user: username };
  let retry = 5000;
  let conn;

  const setStatus = (s) => { status.tiktok = s; broadcast({ type: 'status', ...status }); console.log('[TikTok]', s); };
  const emit = (type, d, extra = {}) => {
    const user = normUser(d);
    if (!user.id) return;
    broadcast({ type, user, ...extra });
  };

  const connect = () => {
    try { conn = new TikTokLiveConnection(username, {}); }
    catch (e) { setStatus('başlatılamadı: ' + e.message); return schedule(); }
    conn.on(WebcastEvent.MEMBER, (d) => emit('join', d));
    conn.on(WebcastEvent.FOLLOW, (d) => emit('follow', d));
    conn.on(WebcastEvent.SHARE, (d) => emit('share', d));
    conn.on(WebcastEvent.CHAT, (d) => emit('chat', d, { comment: String(d.comment || '').slice(0, 120) }));
    conn.on(WebcastEvent.LIKE, (d) => emit('like', d, { count: Number(d.likeCount || 1), total: Number(d.totalLikeCount || 0) }));
    conn.on(WebcastEvent.GIFT, (d) => {
      const g = d.giftDetails || d.gift || {};
      const giftType = g.giftType ?? d.giftType;
      // Seri (streak) hediyelerde sadece seri bitince isle, yoksa ayni hediye birden cok sayilir.
      if (giftType === 1 && !d.repeatEnd) return;
      const unit = Number(g.diamondCount ?? d.diamondCount ?? 1);
      const count = Number(d.repeatCount || 1);
      emit('gift', d, { giftName: String(g.giftName || d.giftName || ''), giftId: d.giftId, unit, count, coins: unit * count });
    });
    conn.on(WebcastEvent.STREAM_END, () => setStatus('yayın bitti'));
    conn.on(ControlEvent.DISCONNECTED, () => { setStatus('koptu, yeniden bağlanılıyor'); schedule(); });
    conn.on(ControlEvent.ERROR, (e) => console.error('[TikTok] hata:', e?.info || e?.exception?.message || e));
    conn.connect()
      .then((s) => { retry = 5000; setStatus('bağlı (oda ' + s.roomId + ')'); })
      .catch((e) => { setStatus('bağlanamadı: ' + (e?.message || e)); schedule(); });
  };
  let timer = null;
  const schedule = () => {
    if (timer) return;
    timer = setTimeout(() => { timer = null; connect(); }, retry);
    retry = Math.min(retry * 2, 60000);
  };
  connect();
}

process.on('unhandledRejection', (e) => console.error('[hata]', e?.message || e));

const username = (process.argv[2] || process.env.TIKTOK_USER || config.tiktokUsername || '').replace(/^@/, '');
const port = Number(process.env.PORT || config.port || 3000);
server.listen(port, () => {
  console.log(`\nHalay Live çalışıyor`);
  console.log(`  Oyun (OBS tarayıcı kaynağı, 1080x1920): http://localhost:${port}/`);
  console.log(`  Kontrol paneli / simülatör:             http://localhost:${port}/panel.html\n`);
  if (username) startTikTok(username);
  else console.log('TikTok kullanıcı adı verilmedi -> sadece simülatör modu. (node server.js kullanici_adi)\n');
});
