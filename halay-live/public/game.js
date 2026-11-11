// Halay Live - oyun (tarayicida calisir, OBS "Tarayici Kaynagi" olarak eklenir)
import * as THREE from 'three';

const qs = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

let cfg = await (await fetch('/api/config')).json();

// ---------------------------------------------------------------- sahne
const stageEl = $('stage');
const renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(48, 9 / 16, 0.1, 200);

function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
  t.anisotropy = 8;
  return t;
}

scene.background = canvasTex(8, 256, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, '#0d1033'); gr.addColorStop(0.45, '#3a1d5c'); gr.addColorStop(0.62, '#c2506a'); gr.addColorStop(0.72, '#f6a55c'); gr.addColorStop(1, '#f6a55c');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});
scene.fog = new THREE.Fog(0x4a2a5e, 30, 95);

scene.add(new THREE.HemisphereLight(0xffd9c0, 0x30284a, 1.5));
const sun = new THREE.DirectionalLight(0xffc890, 1.7); sun.position.set(-6, 12, 9); scene.add(sun);

// zemin: cimen + tas meydan
const grass = new THREE.Mesh(new THREE.CircleGeometry(110, 48), new THREE.MeshLambertMaterial({ color: 0x3f6b3a }));
grass.rotation.x = -Math.PI / 2; grass.position.y = -0.02; scene.add(grass);
const plazaTex = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#6f6a72'; g.fillRect(0, 0, w, h);
  const s = 64;
  for (let y = 0; y < h / s; y++) for (let x = -1; x < w / s; x++) {
    const v = 150 + ((x * 37 + y * 91) % 5) * 12;
    g.fillStyle = `rgb(${v + 14},${v + 4},${v})`;
    const ox = (y % 2) * s / 2;
    g.beginPath(); g.roundRect(x * s + ox + 3, y * s + 3, s - 6, s - 6, 10); g.fill();
  }
}, 9);
const plaza = new THREE.Mesh(new THREE.CircleGeometry(17, 64), new THREE.MeshLambertMaterial({ map: plazaTex }));
plaza.rotation.x = -Math.PI / 2; scene.add(plaza);

// sahne halisi (kilim)
const STAGE_Z = -11.5;
const kilimTex = canvasTex(512, 256, (g, w, h) => {
  g.fillStyle = '#a3182c'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#f2e3c2'; g.lineWidth = 10; g.strokeRect(12, 12, w - 24, h - 24);
  const cols = ['#f2e3c2', '#1d2f6f', '#e8a531'];
  for (let i = 0; i < 6; i++) for (let k = 0; k < 3; k++) {
    const cx = 60 + i * 78, cy = h / 2, r = 54 - k * 17;
    g.fillStyle = cols[k]; g.beginPath(); g.moveTo(cx, cy - r); g.lineTo(cx + r * 0.7, cy); g.lineTo(cx, cy + r); g.lineTo(cx - r * 0.7, cy); g.fill();
  }
  g.fillStyle = '#1d2f6f';
  for (let x = 30; x < w - 20; x += 26) { g.fillRect(x, 28, 12, 12); g.fillRect(x, h - 40, 12, 12); }
});
const kilim = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.5), new THREE.MeshLambertMaterial({ map: kilimTex }));
kilim.rotation.x = -Math.PI / 2; kilim.position.set(0, 0.02, STAGE_Z); scene.add(kilim);

// tabela
const signTex = canvasTex(1024, 320, (g, w, h) => {
  g.fillStyle = '#fff4dc'; g.beginPath(); g.roundRect(0, 0, w, h, 40); g.fill();
  g.strokeStyle = '#b3122e'; g.lineWidth = 16; g.beginPath(); g.roundRect(14, 14, w - 28, h - 28, 30); g.stroke();
  g.fillStyle = '#b3122e'; g.textAlign = 'center'; g.textBaseline = 'middle';
  let size = 150; g.font = `900 ${size}px "Segoe UI",Arial,sans-serif`;
  while (g.measureText(cfg.title).width > w - 120 && size > 40) { size -= 6; g.font = `900 ${size}px "Segoe UI",Arial,sans-serif`; }
  g.fillText(cfg.title, w / 2, h / 2 + 6);
});
const sign = new THREE.Mesh(new THREE.PlaneGeometry(8, 2.5), new THREE.MeshBasicMaterial({ map: signTex }));
sign.position.set(0, 4.6, STAGE_Z - 2.2); scene.add(sign);
const poleMat = new THREE.MeshLambertMaterial({ color: 0x5a3a22 });
for (const x of [-3.7, 3.7]) {
  const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 5.6, 8), poleMat);
  p.position.set(x, 2.8, STAGE_Z - 2.25); scene.add(p);
}

// agaclar + isiklar
const bulbPos = [], bulbCol = [];
const bulbColors = [0xffd23f, 0xff5d73, 0x7cf0ff, 0x9dff8a, 0xffffff, 0xffa24d].map((c) => new THREE.Color(c));
const addBulb = (x, y, z) => { bulbPos.push(x, y, z); const c = pick(bulbColors); bulbCol.push(c.r, c.g, c.b); };
const trunkGeo = new THREE.CylinderGeometry(0.18, 0.25, 2, 6), leafGeo = new THREE.ConeGeometry(1.7, 4.2, 8);
const leafMat = new THREE.MeshLambertMaterial({ color: 0x24492b });
for (let i = 0; i < 22; i++) {
  const a = (i / 22) * Math.PI * 2 + 0.14, r = 19.5 + (i % 3) * 2.2;
  const x = Math.sin(a) * r, z = Math.cos(a) * r;
  if (z > 12 && Math.abs(x) < 9) continue; // kamera onu acik kalsin
  const s = 0.9 + (i % 4) * 0.18;
  const t = new THREE.Mesh(trunkGeo, poleMat); t.position.set(x, 1, z); scene.add(t);
  const l = new THREE.Mesh(leafGeo, leafMat); l.position.set(x, 2 + 2.1 * s, z); l.scale.setScalar(s); scene.add(l);
  for (let k = 0; k < 26; k++) {
    const h = Math.random(), ang = Math.random() * 6.28, rr = 1.75 * s * (1 - h) + 0.05;
    addBulb(x + Math.sin(ang) * rr, 2 + h * 4.2 * s, z + Math.cos(ang) * rr);
  }
}
// meydan cevresinde direkler arasi ampul ipleri
const POLES = 10;
for (let i = 0; i < POLES; i++) {
  const a0 = (i / POLES) * Math.PI * 2, a1 = ((i + 1) / POLES) * Math.PI * 2, R = 16.4;
  const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 5, 6), poleMat);
  p.position.set(Math.sin(a0) * R, 2.5, Math.cos(a0) * R); scene.add(p);
  for (let k = 0; k <= 14; k++) {
    const t = k / 14, a = a0 + (a1 - a0) * t;
    addBulb(Math.sin(a) * R, 5 - Math.sin(t * Math.PI) * 0.9, Math.cos(a) * R);
  }
}
for (let k = 0; k <= 24; k++) addBulb(-3.9 + (7.8 * k) / 24, 5.95 + (k % 2) * 0.02, STAGE_Z - 2.15); // tabela ustu
const bulbGeo = new THREE.BufferGeometry();
bulbGeo.setAttribute('position', new THREE.Float32BufferAttribute(bulbPos, 3));
bulbGeo.setAttribute('color', new THREE.Float32BufferAttribute(bulbCol, 3));
const dotTex = canvasTex(64, 64, (g) => {
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
});
const bulbs = new THREE.Points(bulbGeo, new THREE.PointsMaterial({ size: 0.55, map: dotTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
scene.add(bulbs);

// dugun masalari
const clothMat = new THREE.MeshLambertMaterial({ color: 0xf7f2ea });
for (const [x, z] of [[-12, -6], [12, -6], [-13.5, 2], [13.5, 2]]) {
  const t = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.9, 1.3), clothMat); t.position.set(x, 0.45, z); t.rotation.y = Math.atan2(x, z) + Math.PI / 2; scene.add(t);
}

// ---------------------------------------------------------------- karakter (ince belli cay bardagi)
const GEO = {
  body: new THREE.LatheGeometry([[0, 0], [0.27, 0], [0.3, 0.06], [0.27, 0.22], [0.2, 0.46], [0.22, 0.62], [0.3, 0.86], [0.335, 1.0]].map(([x, y]) => new THREE.Vector2(x, y)), 20),
  rim: new THREE.TorusGeometry(0.335, 0.022, 6, 24),
  top: new THREE.CircleGeometry(0.31, 20),
  saucer: new THREE.CylinderGeometry(0.46, 0.34, 0.06, 20),
  saucerRing: new THREE.TorusGeometry(0.44, 0.03, 6, 24),
  eye: new THREE.SphereGeometry(0.085, 10, 8),
  pupil: new THREE.SphereGeometry(0.042, 8, 6),
  limb: new THREE.CylinderGeometry(0.035, 0.035, 0.5, 6).translate(0, -0.25, 0),
  hand: new THREE.SphereGeometry(0.065, 8, 6),
  shoe: new THREE.SphereGeometry(0.1, 8, 6).scale(1, 0.6, 1.6),
  shadow: new THREE.CircleGeometry(0.5, 16),
  fes: new THREE.CylinderGeometry(0.17, 0.21, 0.26, 12),
  cap: new THREE.SphereGeometry(0.3, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.45, 1),
  brim: new THREE.CylinderGeometry(0.42, 0.42, 0.03, 16),
  flower: new THREE.SphereGeometry(0.11, 8, 6),
  topHat: new THREE.CylinderGeometry(0.2, 0.2, 0.34, 14),
  bow: new THREE.BoxGeometry(0.24, 0.09, 0.04),
  veil: new THREE.ConeGeometry(0.62, 1.25, 16, 1, true, Math.PI * 0.45, Math.PI * 1.1),
  drum: new THREE.CylinderGeometry(0.36, 0.36, 0.3, 18).rotateX(Math.PI / 2),
  drumHead: new THREE.CircleGeometry(0.34, 18),
  zurna: new THREE.ConeGeometry(0.1, 0.62, 10, 1, true),
  mendil: new THREE.PlaneGeometry(0.3, 0.3),
};
const lam = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });
const MAT = {
  glass: new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.2, depthWrite: false }),
  white: lam(0xffffff), black: lam(0x15121a), limb: lam(0x3a2a22), gold: lam(0xe8b53a), red: lam(0xc8102e),
  shadow: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }),
  veil: new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }),
  drumSkin: lam(0xf1e2c4), wood: lam(0x7a4a22), straw: lam(0xe9cf8a),
  mendil: new THREE.MeshBasicMaterial({ color: 0xff2d55, side: THREE.DoubleSide }),
};
const TEAS = [0xb3261e, 0x9c1c12, 0xc94a1a, 0x7d1410, 0xd4722a, 0x8fae3a, 0xd9486e].map((c) => ({ tea: lam(c), top: lam(new THREE.Color(c).multiplyScalar(0.7)) }));
const ACCENTS = [0xff5d73, 0x3fa7ff, 0xffd23f, 0x8a5cff, 0x31c48d, 0xffffff, 0xff8a3d].map((c) => lam(c));
const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; };

const ROLE_TR = { halaybasi: 'Halay Başı', gelin: 'Gelin', damat: 'Damat', davulcu: 'Davulcu', zurnaci: 'Zurnacı' };
const labelsEl = $('labels');
const hashColor = (s) => { let h = 0; for (const ch of s) h = (h * 31 + ch.codePointAt(0)) >>> 0; return `hsl(${h % 360} 65% 45%)`; };

function avatarEl(user) {
  if (user.avatar) {
    const img = document.createElement('img'); img.referrerPolicy = 'no-referrer'; img.src = user.avatar;
    img.onerror = () => img.replaceWith(initialEl(user));
    return img;
  }
  return initialEl(user);
}
function initialEl(user) {
  const d = document.createElement('span'); d.className = 'ini'; d.style.background = hashColor(user.id);
  const b = document.createElement('b'); b.textContent = [...(user.name || '?')][0].toUpperCase(); d.append(b);
  return d;
}

class Dancer {
  constructor(user) {
    this.user = user; this.score = 0; this.role = 'dancer'; this.joined = performance.now();
    this.seed = Math.random() * 10; this.target = new THREE.Vector3(); this.faceTo = null; this.bubbleUntil = 0;
    const v = (Math.random() * 1e6) | 0;
    const tea = TEAS[v % TEAS.length], accent = ACCENTS[(v >> 3) % ACCENTS.length];
    const g = (this.g = new THREE.Group());
    const sh = mesh(GEO.shadow, MAT.shadow, 0, 0.03, 0); sh.rotation.x = -Math.PI / 2; g.add(sh);
    this.legs = [-1, 1].map((s) => {
      const p = new THREE.Group(); p.position.set(s * 0.13, 0.56, 0);
      p.add(mesh(GEO.limb, MAT.limb), mesh(GEO.shoe, accent, 0, -0.5, 0.05)); g.add(p); return p;
    });
    const b = (this.body = new THREE.Group()); b.position.y = 0.55; g.add(b);
    const sc = mesh(GEO.saucer, MAT.white, 0, 0.0, 0), ring = mesh(GEO.saucerRing, MAT.red, 0, 0.03, 0); ring.rotation.x = Math.PI / 2;
    const glass = mesh(GEO.body, MAT.glass, 0, 0.04, 0); glass.scale.set(1.06, 1.02, 1.06);
    const body = mesh(GEO.body, tea.tea, 0, 0.04, 0); body.scale.y = 0.9;
    const top = mesh(GEO.top, tea.top, 0, 0.945, 0); top.rotation.x = -Math.PI / 2;
    const rim = mesh(GEO.rim, MAT.gold, 0, 1.06, 0); rim.rotation.x = Math.PI / 2;
    b.add(sc, ring, body, top, glass, rim);
    for (const s of [-1, 1]) {
      b.add(mesh(GEO.eye, MAT.white, s * 0.11, 0.8, 0.245), mesh(GEO.pupil, MAT.black, s * 0.115, 0.8, 0.315));
    }
    const mouth = mesh(GEO.pupil, MAT.black, 0, 0.66, 0.225); mouth.scale.set(1.7, 0.8, 0.5); b.add(mouth);
    this.arms = [-1, 1].map((s) => {
      const p = new THREE.Group(); p.position.set(s * 0.21, 0.52, 0);
      p.add(mesh(GEO.limb, MAT.limb), mesh(GEO.hand, MAT.limb, 0, -0.52, 0)); b.add(p); return p;
    });
    // gundelik sapka
    const hat = (this.hat = new THREE.Group()); hat.position.y = 1.06; b.add(hat);
    switch (v % 6) {
      case 1: hat.add(mesh(GEO.fes, MAT.red, 0, 0.13, 0)); break;
      case 2: { const c = mesh(GEO.cap, accent, 0, 0, 0); c.scale.multiplyScalar(1.15); hat.add(c, mesh(GEO.brim, accent, 0, 0.01, 0.16)); hat.children[1].scale.set(0.6, 1, 0.6); break; }
      case 3: hat.add(mesh(GEO.flower, accent, 0.2, 0.05, 0.12), mesh(GEO.flower, MAT.gold, 0.2, 0.05, 0.2)); hat.children[1].scale.setScalar(0.5); break;
      case 4: hat.add(mesh(GEO.brim, MAT.straw, 0, 0.01, 0), mesh(GEO.cap, MAT.straw, 0, 0.02, 0)); break;
      case 5: { const c = mesh(GEO.cap, accent, 0, -0.03, 0); c.scale.set(1.2, 1.5, 1.2); hat.add(c); break; }
    }
    this.props = {};
    // etiket
    if (user) {
      const el = (this.el = document.createElement('div')); el.className = 'tag';
      const txt = document.createElement('span'); txt.className = 'nm';
      this.roleEl = document.createElement('span'); this.roleEl.className = 'role';
      const nm = document.createElement('span'); nm.textContent = user.name;
      txt.append(this.roleEl, nm); el.append(avatarEl(user), txt); labelsEl.append(el);
    }
    scene.add(g);
  }
  prop(name) {
    if (this.props[name]) return this.props[name];
    const p = new THREE.Group();
    if (name === 'gelin') {
      p.add(mesh(GEO.veil, MAT.veil, 0, 0.6, 0));
      for (let i = 0; i < 5; i++) p.add(mesh(GEO.flower, MAT.white, Math.sin(i * 0.5 - 1) * 0.3, 1.08, Math.cos(i * 0.5 - 1) * 0.3));
      p.children.slice(1).forEach((f) => f.scale.setScalar(0.6));
    } else if (name === 'damat') {
      p.add(mesh(GEO.topHat, MAT.black, 0, 1.24, 0), mesh(GEO.brim, MAT.black, 0, 1.08, 0), mesh(GEO.bow, MAT.red, 0, 0.55, 0.23));
      p.children[1].scale.set(0.75, 1, 0.75);
    } else if (name === 'davulcu') {
      const head = mesh(GEO.drumHead, MAT.drumSkin, 0, 0.4, 0.71);
      p.add(mesh(GEO.drum, MAT.red, 0, 0.4, 0.55), head, mesh(GEO.fes, MAT.red, 0, 1.19, 0));
    } else if (name === 'zurnaci') {
      const z = mesh(GEO.zurna, MAT.wood, 0, 0.56, 0.52); z.rotation.x = -1.25; z.material = MAT.wood;
      p.add(z, mesh(GEO.cap, MAT.black, 0, 1.06, 0), mesh(GEO.brim, MAT.black, 0, 1.07, 0));
    } else if (name === 'halaybasi') {
      const m = mesh(GEO.mendil, MAT.mendil, 0, -0.66, 0); this.arms[1].add(m); this.mendil = m;
      p.add(mesh(GEO.fes, MAT.gold, 0, 1.19, 0));
    }
    this.body.add(p); this.props[name] = p; return p;
  }
  setRole(role) {
    this.role = role;
    for (const k in this.props) this.props[k].visible = false;
    if (this.mendil) this.mendil.visible = role === 'halaybasi';
    this.hat.visible = role === 'dancer';
    if (role !== 'dancer') this.prop(role).visible = true;
    if (this.mendil) this.mendil.visible = role === 'halaybasi';
    if (this.el) { this.roleEl.textContent = ROLE_TR[role] || ''; this.el.classList.toggle('vip', role !== 'dancer'); }
  }
  say(text) {
    if (!this.el) return;
    this.bubble?.remove();
    const b = (this.bubble = document.createElement('div')); b.className = 'bubble'; b.textContent = text.slice(0, 48);
    this.el.append(b); this.bubbleUntil = performance.now() + 4500;
  }
  update(dt, beat) {
    const g = this.g, p = g.position, dx = this.target.x - p.x, dz = this.target.z - p.z, dist = Math.hypot(dx, dz);
    let face;
    if (dist > 0.6) { // yuruyerek yerine git
      const step = Math.min(dist, 6.5 * dt); p.x += (dx / dist) * step; p.z += (dz / dist) * step; face = Math.atan2(dx, dz);
    } else {
      const k = 1 - Math.exp(-8 * dt); p.x += dx * k; p.z += dz * k; face = this.faceTo ?? Math.atan2(-p.x, -p.z);
    }
    let d = face - g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); g.rotation.y += d * Math.min(1, 10 * dt);

    const walking = dist > 0.6, ph = beat % 4, b = this.body, [aL, aR] = this.arms, [lL, lR] = this.legs;
    const bounce = Math.abs(Math.sin(beat * Math.PI));
    b.position.y = 0.55 + bounce * 0.08; b.rotation.z = Math.sin(beat * Math.PI * 0.5) * 0.07; b.rotation.y = 0;
    aL.rotation.set(0, 0, 0); aR.rotation.set(0, 0, 0);
    if (walking) {
      const w = Math.sin(performance.now() * 0.014 + this.seed);
      lL.rotation.x = w * 0.8; lR.rotation.x = -w * 0.8; aL.rotation.x = -w * 0.6; aR.rotation.x = w * 0.6;
    } else {
      // halay adimi: 2 adim + sol tekme + sag tekme
      const kick = (a) => -Math.max(0, Math.sin(Math.PI * (ph - a))) * (ph >= a && ph < a + 1 ? 1.1 : 0);
      const stepL = ph < 1 ? -Math.sin(Math.PI * ph) * 0.35 : 0, stepR = ph >= 1 && ph < 2 ? -Math.sin(Math.PI * (ph - 1)) * 0.35 : 0;
      lL.rotation.x = stepL + kick(2); lR.rotation.x = stepR + kick(3);
      const sh = Math.sin(beat * Math.PI * 2) * 0.12;
      switch (this.role) {
        case 'halaybasi': aL.rotation.z = -0.95 + sh; aR.rotation.z = 2.5 + Math.sin(beat * Math.PI * 2) * 0.45; break;
        case 'gelin': case 'damat': aL.rotation.z = -2.4 + Math.sin(beat * Math.PI) * 0.35; aR.rotation.z = 2.4 + Math.sin(beat * Math.PI) * 0.35; b.rotation.y = Math.sin(beat * Math.PI * 0.5) * 0.5; break;
        case 'davulcu': aL.rotation.x = -1.0 - Math.max(0, Math.sin(beat * Math.PI * 2)) * 0.7; aR.rotation.x = -1.0 - Math.max(0, -Math.sin(beat * Math.PI * 2)) * 0.7; aL.rotation.z = -0.5; aR.rotation.z = 0.5; break;
        case 'zurnaci': aL.rotation.x = aR.rotation.x = -1.75; aL.rotation.z = 0.25; aR.rotation.z = -0.25; b.rotation.y = Math.sin(beat * Math.PI * 0.5) * 0.3; break;
        default: aL.rotation.z = -0.95 + sh; aR.rotation.z = 0.95 + sh;
      }
    }
    if (this.bubble && performance.now() > this.bubbleUntil) { this.bubble.remove(); this.bubble = null; }
  }
  dispose() { scene.remove(this.g); this.el?.remove(); }
}

// ---------------------------------------------------------------- oyun durumu
const dancers = new Map();      // id -> Dancer
let line = [];                  // halaydaki sira (puana gore)
let lineDirty = true, lastSort = 0;
const roles = {};               // role -> { d, until }
const RINGS = [];               // { r, cap }
{ let total = 0, k = 0; while (total < cfg.maxDancers) { const r = 3.3 + k * 1.2, cap = Math.floor((2 * Math.PI * r) / 0.84); RINGS.push({ r, cap, start: total }); total += cap; k++; } }
const SPOTS = {
  gelin: () => [Math.sin(coupleRot) * -0.75, Math.cos(coupleRot) * -0.75], damat: () => [Math.sin(coupleRot) * 0.75, Math.cos(coupleRot) * 0.75],
  davulcu: () => [-0.85, STAGE_Z], zurnaci: () => [0.85, STAGE_Z],
};
let coupleRot = Math.PI / 2, ringRot = 0, beat = 0, fastUntil = 0, likeTotal = 0, goalsHit = 0;

// sahne bos kalmasin: varsayilan calgicilar
const npc = { davulcu: new Dancer(null), zurnaci: new Dancer(null) };
for (const r of ['davulcu', 'zurnaci']) { const [x, z] = SPOTS[r](); npc[r].setRole(r); npc[r].g.position.set(x, 0, z); npc[r].target.set(x, 0, z); npc[r].faceTo = 0; }

function spawnPoint() { const a = rand(0, Math.PI * 2); return [Math.sin(a) * 19, Math.cos(a) * 19]; }

function join(user, silent) {
  let d = dancers.get(user.id);
  if (d) return d;
  if (dancers.size >= cfg.maxDancers) { // en dusuk puanli, rolsuz kisiyi cikar
    let low = null; for (const x of dancers.values()) if (x.role === 'dancer' && (!low || x.score < low.score)) low = x;
    if (!low) return null; removeDancer(low);
  }
  d = new Dancer(user); const [x, z] = spawnPoint(); d.g.position.set(x, 0, z);
  dancers.set(user.id, d); line.push(d); lineDirty = true;
  if (!silent) announce(user, 'halaya katıldı');
  return d;
}
function removeDancer(d) {
  for (const r in roles) if (roles[r]?.d === d) delete roles[r];
  dancers.delete(d.user.id); line = line.filter((x) => x !== d); d.dispose(); lineDirty = true;
}
function giveRole(d, role) {
  for (const r in roles) if (roles[r]?.d === d) delete roles[r]; // eski rolunu birak
  const prev = roles[role]?.d;
  if (prev && prev !== d) backToLine(prev);
  roles[role] = { d, until: cfg.roleDurationSec > 0 ? performance.now() + cfg.roleDurationSec * 1000 : Infinity };
  d.setRole(role); d.faceTo = role === 'halaybasi' ? null : 0;
  line = line.filter((x) => x !== d);
  if (role === 'halaybasi') line.unshift(d);
  lineDirty = true;
}
function backToLine(d) { d.setRole('dancer'); d.faceTo = null; if (!line.includes(d)) line.push(d); lineDirty = true; }

function layout(now, dt) {
  for (const r in roles) if (roles[r] && now > roles[r].until) { backToLine(roles[r].d); delete roles[r]; }
  if (lineDirty && now - lastSort > 1500) {
    const hb = roles.halaybasi?.d;
    line.sort((a, b) => (a === hb ? -1 : b === hb ? 1 : b.score - a.score || a.joined - b.joined));
    lineDirty = false; lastSort = now; renderBoard();
  }
  ringRot += dt * 0.11 * (now < fastUntil ? 1.8 : 1);
  coupleRot += dt * 0.5;
  line.forEach((d, i) => {
    const ring = RINGS.findLast((r) => i >= r.start) || RINGS[0], j = i - ring.start, k = RINGS.indexOf(ring);
    const a = (j / ring.cap) * Math.PI * 2 * (k % 2 ? -1 : 1) + ringRot * (k % 2 ? -1 : 1) * (3.3 / ring.r);
    d.target.set(Math.sin(a) * ring.r, 0, Math.cos(a) * ring.r);
  });
  for (const r of ['gelin', 'damat', 'davulcu', 'zurnaci']) if (roles[r]) { const [x, z] = SPOTS[r](); roles[r].d.target.set(x, 0, z); }
  npc.davulcu.g.visible = !roles.davulcu || roles.davulcu.d.g.position.distanceTo(roles.davulcu.d.target) > 1;
  npc.zurnaci.g.visible = !roles.zurnaci || roles.zurnaci.d.g.position.distanceTo(roles.zurnaci.d.target) > 1;
}
const occupiedRadius = () => (RINGS.findLast((r) => line.length > r.start) || RINGS[0]).r;

// ---------------------------------------------------------------- parcaciklar (konfeti / para)
const PN = 900, pGeo = new THREE.PlaneGeometry(0.16, 0.26);
const pMesh = new THREE.InstancedMesh(pGeo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), PN);
pMesh.frustumCulled = false; scene.add(pMesh);
const parts = Array.from({ length: PN }, () => ({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), s: 1 }));
const dummy = new THREE.Object3D(), tmpC = new THREE.Color(); let pNext = 0;
const CONF = [0xff2d55, 0xffd23f, 0x3fa7ff, 0x31c48d, 0xffffff, 0xff8a3d];
function burst(kind, x, y, z, n) {
  for (let i = 0; i < n; i++) {
    const q = parts[pNext]; const idx = pNext; pNext = (pNext + 1) % PN;
    if (kind === 'money') { q.p.set(x + rand(-7, 7), y + rand(5, 11), z + rand(-7, 7)); q.v.set(rand(-0.4, 0.4), rand(-1.5, -0.6), rand(-0.4, 0.4)); q.s = 2.1; tmpC.set(pick([0x3fae5a, 0x2e8b47, 0x6fcf7f])); q.life = rand(5, 8); }
    else { q.p.set(x, y, z); const a = rand(0, 6.28), sp = rand(2, 6.5); q.v.set(Math.sin(a) * sp, rand(5, 11), Math.cos(a) * sp); q.s = 1; tmpC.set(pick(CONF)); q.life = rand(2.5, 4.5); }
    q.r.set(rand(0, 6), rand(0, 6), rand(0, 6)); pMesh.setColorAt(idx, tmpC);
  }
  pMesh.instanceColor.needsUpdate = true;
}
function updateParts(dt) {
  for (let i = 0; i < PN; i++) {
    const q = parts[i];
    if (q.life <= 0) { dummy.scale.setScalar(0); dummy.updateMatrix(); pMesh.setMatrixAt(i, dummy.matrix); continue; }
    q.life -= dt; q.v.y = Math.max(q.v.y - 9 * dt, -1.6); q.v.x *= 1 - 1.2 * dt; q.v.z *= 1 - 1.2 * dt;
    q.p.addScaledVector(q.v, dt); if (q.p.y < 0.03) { q.p.y = 0.03; q.v.set(0, 0, 0); } else { q.r.x += dt * 5; q.r.z += dt * 3; }
    dummy.position.copy(q.p); dummy.rotation.copy(q.r); dummy.scale.setScalar(q.s * Math.min(1, q.life * 2)); dummy.updateMatrix(); pMesh.setMatrixAt(i, dummy.matrix);
  }
  pMesh.instanceMatrix.needsUpdate = true;
}
for (let i = 0; i < PN; i++) pMesh.setColorAt(i, tmpC.set(0xffffff));

// ---------------------------------------------------------------- HUD
$('title').textContent = cfg.title;
function renderLegend() {
  const el = $('legend'); el.replaceChildren();
  for (const t of cfg.giftTiers) { const s = document.createElement('span'); s.textContent = `${t.emoji} ${t.label}`; const i = document.createElement('i'); i.textContent = t.minCoins + '+'; s.append(i); el.append(s); }
}
renderLegend();
function renderBoard() {
  const top = [...dancers.values()].filter((d) => d.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);
  const rows = $('rows'); rows.replaceChildren();
  top.forEach((d, i) => { const r = document.createElement('div'), a = document.createElement('span'), b = document.createElement('span'); a.textContent = `${i + 1}. ${d.user.name}`; b.textContent = d.score; r.append(a, b); rows.append(r); });
  $('board').style.display = top.length ? '' : 'none';
  $('n').textContent = dancers.size;
}
function renderGoal() {
  const tgt = cfg.likeGoal.target, cur = likeTotal - goalsHit * tgt;
  $('goalbar').style.width = clamp((cur / tgt) * 100, 0, 100) + '%';
  $('goaltxt').textContent = `❤️ ${cur} / ${tgt} beğeni → HIZLI HALAY`;
}
function announce(user, text, big) {
  const el = document.createElement('div'); el.className = 'ann' + (big ? ' big' : '');
  const b = document.createElement('b'); b.textContent = user.name; const s = document.createElement('span'); s.textContent = text;
  el.append(avatarEl(user), b, s);
  const box = $('banner'); box.append(el); while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => el.remove(), 4000);
}
renderBoard(); renderGoal();

// ---------------------------------------------------------------- olaylar
function tierFor(e) {
  const o = cfg.giftOverrides?.[e.giftName]; if (o) return cfg.giftTiers.find((t) => t.action === o) || { action: o };
  const unit = e.unit ?? e.coins ?? 1;
  return [...cfg.giftTiers].sort((a, b) => b.minCoins - a.minCoins).find((t) => unit >= t.minCoins) || cfg.giftTiers[0];
}
function addScore(d, n) { if (!d || !n) return; d.score += Math.round(n); lineDirty = true; }

function onEvent(e) {
  if (e.type === 'status') { $('conn').textContent = e.user ? `@${e.user} · ${e.tiktok}` : 'simülatör modu'; return; }
  if (e.type === 'reset') { for (const d of [...dancers.values()]) removeDancer(d); likeTotal = goalsHit = 0; renderBoard(); renderGoal(); return; }
  const u = e.user; if (!u?.id) return;
  let d = dancers.get(u.id);
  const J = cfg.join, P = cfg.points;
  switch (e.type) {
    case 'follow': if (J.onFollow) d = join(u); addScore(d, P.follow); break;
    case 'share': if (J.onShare) d = join(u); addScore(d, P.share); break;
    case 'like': {
      const n = e.count || 1; if (J.onLike) d = join(u); addScore(d, n * P.like);
      likeTotal += n;
      if (likeTotal - goalsHit * cfg.likeGoal.target >= cfg.likeGoal.target) { goalsHit++; fastUntil = performance.now() + cfg.likeGoal.fastSeconds * 1000; burst('confetti', 0, 1, 0, 160); }
      renderGoal(); break;
    }
    case 'chat': {
      const txt = (e.comment || '').trim(), low = txt.toLocaleLowerCase('tr');
      if (!d && J.chatKeywords.some((k) => low.includes(k))) d = join(u);
      else d?.say(txt);
      break;
    }
    case 'gift': {
      const t = tierFor(e), isNew = !d; d = join(u, true); if (!d) break;
      addScore(d, (e.coins || e.unit || 1) * P.coin);
      const at = d.g.position;
      switch (t.action) {
        case 'join': if (isNew) announce(u, 'halaya katıldı'); else announce(u, `+${(e.coins || 1) * P.coin} puan`); break;
        case 'confetti': burst('confetti', 0, 1.2, 0, 140); announce(u, 'konfeti patlattı 🎉'); break;
        case 'money': burst('money', 0, 0, 0, 260); announce(u, 'para saçtı 💸', true); focus(d, 7); break;
        default:
          if (ROLE_TR[t.action]) { giveRole(d, t.action); announce(u, `${ROLE_TR[t.action].toLocaleLowerCase('tr')} oldu!`, true); burst('confetti', at.x, 1.5, at.z, 60); focus(d, 7); }
      }
      break;
    }
  }
}

// ---------------------------------------------------------------- kamera
const cam = { pos: new THREE.Vector3(0, 14, 24), look: new THREE.Vector3(0, 1, 0), tp: new THREE.Vector3(), tl: new THREE.Vector3(), shot: 'wide', until: 0, target: null, a: 0 };
camera.position.copy(cam.pos);
function focus(d, sec) { cam.shot = 'focus'; cam.target = d; cam.until = performance.now() + sec * 1000; }
function nextShot(now) {
  const opts = ['wide', 'orbit', 'wide', 'orbit', 'stage'];
  if (roles.gelin || roles.damat) opts.push('couple', 'couple');
  if (line.length) opts.push('close');
  let s = pick(opts); if (s === cam.shot) s = pick(opts);
  cam.shot = s; cam.until = now + (s === 'wide' || s === 'orbit' ? 11000 : 6500);
  if (s === 'close') cam.target = pick(line.slice(0, 30));
}
function updateCamera(now, dt) {
  if (now > cam.until) nextShot(now);
  const R = occupiedRadius(); cam.a += dt * 0.22;
  switch (cam.shot) {
    case 'wide': cam.tp.set(Math.sin(now * 0.0002) * 3, 5.5 + R * 1.15, 7 + R * 2.25); cam.tl.set(0, 1.2, -0.5); break;
    case 'orbit': cam.tp.set(Math.sin(cam.a) * (R + 6.5), 4.2, Math.cos(cam.a) * (R + 6.5)); cam.tl.set(0, 1.3, 0); break;
    case 'stage': cam.tp.set(Math.sin(now * 0.0005) * 1.2, 2.5, STAGE_Z + 6.8); cam.tl.set(0, 1.1, STAGE_Z); break;
    case 'couple': cam.tp.set(Math.sin(cam.a) * 4.6, 4.4, Math.cos(cam.a) * 4.6); cam.tl.set(0, 1.0, 0); break;
    case 'close': case 'focus': {
      const d = cam.target; if (!d || !d.g.parent) { cam.until = 0; break; }
      const p = d.g.position, r = Math.hypot(p.x, p.z) || 1;
      if (d.role === 'davulcu' || d.role === 'zurnaci') cam.tp.set(p.x * 0.6, 2.2, p.z + 4.6);
      else if (r < 2) cam.tp.set(p.x + Math.sin(cam.a) * 4.4, 4.2, p.z + Math.cos(cam.a) * 4.4);
      else cam.tp.set(p.x * (1 - 3.6 / r), 2.3, p.z * (1 - 3.6 / r));
      cam.tl.set(p.x, 1.25, p.z);
    }
  }
  const k = 1 - Math.exp(-2.2 * dt); cam.pos.lerp(cam.tp, k); cam.look.lerp(cam.tl, k * 1.4 > 1 ? 1 : k * 1.4);
  camera.position.copy(cam.pos); camera.lookAt(cam.look);
}

// ---------------------------------------------------------------- etiketler
const v3 = new THREE.Vector3();
function updateLabels() {
  const w = stageEl.clientWidth, h = stageEl.clientHeight, crowded = dancers.size > 60;
  for (const d of dancers.values()) {
    v3.set(d.g.position.x, 2.05, d.g.position.z); const dist = v3.distanceTo(camera.position); v3.project(camera);
    const vis = v3.z < 1 && Math.abs(v3.x) < 1.2 && Math.abs(v3.y) < 1.2 && (d.role !== 'dancer' || !crowded || dist < 26 || d.bubble);
    if (!vis) { d.el.style.display = 'none'; continue; }
    const s = clamp(8 / dist, 0.3, 1.25) * (d.role !== 'dancer' ? 1.25 : 1);
    d.el.style.display = ''; d.el.style.zIndex = (10000 - dist * 50) | 0;
    d.el.style.transform = `translate(-50%,-100%) translate(${((v3.x + 1) / 2) * w}px,${((1 - v3.y) / 2) * h}px) scale(${s})`;
  }
}

// ---------------------------------------------------------------- ses (davul + zurna sentezi; public/music/halay.mp3 varsa o calar)
const muted = qs.has('mute'); let actx = null, master = null, lastEighth = -1, useFile = false;
async function initAudio() {
  if (muted) return;
  try { const r = await fetch('/music/halay.mp3', { method: 'HEAD' }); if (r.ok) { useFile = true; const a = new Audio('/music/halay.mp3'); a.loop = true; a.volume = 0.8; const go = () => a.play().catch(() => { $('tap').style.display = 'grid'; }); go(); addEventListener('click', () => { $('tap').style.display = 'none'; a.play(); }); return; } } catch {}
  actx = new AudioContext(); master = actx.createGain(); master.gain.value = 0.5; master.connect(actx.destination);
  if (actx.state !== 'running') { $('tap').style.display = 'grid'; addEventListener('click', () => { actx.resume(); $('tap').style.display = 'none'; }, { once: true }); }
}
function dum(t, f = 95, v = 1) { const o = actx.createOscillator(), g = actx.createGain(); o.frequency.setValueAtTime(f * 1.8, t); o.frequency.exponentialRampToValueAtTime(f * 0.55, t + 0.16); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.28); o.connect(g).connect(master); o.start(t); o.stop(t + 0.3); }
let noiseBuf = null;
function tek(t, v = 0.35) { if (!noiseBuf) { noiseBuf = actx.createBuffer(1, 4410, 44100); const ch = noiseBuf.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length) ** 2; } const s = actx.createBufferSource(), g = actx.createGain(), f = actx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2500; s.buffer = noiseBuf; g.gain.value = v; s.connect(f).connect(g).connect(master); s.start(t); }
const SCALE = [293.66, 311.13, 369.99, 392.0, 440.0, 466.16, 554.37, 587.33]; // hicaz
const RIFF = [4, 4, 5, 4, 3, 2, 3, 4, 4, 5, 7, 5, 4, 3, 2, 3, 2, 2, 3, 2, 1, 0, 1, 2, 3, 4, 3, 2, 1, 0, 0, -1];
function zurna(t, n, len) { if (n < 0) return; const o = actx.createOscillator(), f = actx.createBiquadFilter(), g = actx.createGain(); o.type = 'sawtooth'; o.frequency.value = SCALE[n]; f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 2.2; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.16, t + 0.02); g.gain.setValueAtTime(0.16, t + len * 0.8); g.gain.linearRampToValueAtTime(0, t + len); o.connect(f).connect(g).connect(master); o.start(t); o.stop(t + len + 0.02); }
const PATTERN = 'D.T.DDT.';
function audioTick(eighth, secPerEighth) {
  if (!actx || actx.state !== 'running' || useFile) return;
  const t = actx.currentTime + 0.02, c = PATTERN[eighth % 8];
  if (c === 'D') dum(t); else if (c === 'T') tek(t);
  zurna(t, RIFF[eighth % RIFF.length], secPerEighth * 0.95);
}
initAudio();

// ---------------------------------------------------------------- dongu
function resize() { const w = stageEl.clientWidth, h = stageEl.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const fast = now < fastUntil, bps = (cfg.bpm / 60) * (fast ? 1.3 : 1);
  $('fast').style.display = fast ? 'block' : 'none';
  beat += dt * bps;
  const eighth = Math.floor(beat * 2); if (eighth !== lastEighth) { lastEighth = eighth; audioTick(eighth, 0.5 / bps); }
  layout(now, dt);
  for (const d of dancers.values()) d.update(dt, beat);
  npc.davulcu.update(dt, beat); npc.zurnaci.update(dt, beat);
  updateParts(dt); updateCamera(now, dt);
  bulbs.material.size = 0.5 + Math.abs(Math.sin(beat * Math.PI)) * 0.14;
  renderer.render(scene, camera); updateLabels();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
setInterval(renderBoard, 2000);

// ---------------------------------------------------------------- baglanti
function connect() {
  const ws = new WebSocket(`ws://${location.host}/ws`);
  ws.onmessage = (m) => { try { onEvent(JSON.parse(m.data)); } catch (err) { console.error(err); } };
  ws.onclose = () => setTimeout(connect, 2000);
}
connect();

// test icin:  /?demo=80  -> 80 sahte izleyici + rastgele olaylar
window.halay = { onEvent, dancers, roles, cam };
if (qs.has('demo')) {
  const N = ['Ayşe', 'Mehmet', 'Elif 🌸', 'Can', 'Zeynep', 'Emre', 'Deniz', 'Buse', 'Kerem', 'Selin', 'Umutcan', 'Ceyda', 'Berat', 'İpek', 'Ramazan H.', 'Mira', 'Yasemin', 'Alihan', 'Sude', 'Necdet'];
  const mk = (i) => ({ id: 'demo' + i, name: pick(N) + (i > 19 ? i : '') });
  const n = Number(qs.get('demo')) || 40;
  for (let i = 0; i < n; i++) onEvent({ type: 'like', user: mk(i), count: (Math.random() * 30) | 0 });
  [20, 30, 99, 199, 299].forEach((unit, i) => onEvent({ type: 'gift', user: mk(i), unit, coins: unit }));
  setInterval(() => onEvent({ type: 'chat', user: mk((Math.random() * n) | 0), comment: pick(['lülülüüü', 'vay vay', 'helal', 'oyna oyna', 'düğün var 😂']) }), 1500);
}
