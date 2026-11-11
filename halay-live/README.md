# Halay Live

TikTok canlı yayını için interaktif halay/düğün oyunu. İzleyiciler beğeni, takip, yorum ya da hediyeyle
halaya katılır; pahalı hediyeler rol verir (zurnacı, halay başı, davulcu, gelin, damat) ve efekt tetikler.

Karakterler özgün: ince belli çay bardakları.

## Kurulum (Windows)

1. [Node.js LTS](https://nodejs.org) kur.
2. Bu klasörde `baslat.bat` dosyasına çift tıkla. İlk açılışta bağımlılıkları kendisi kurar.
3. Kullanıcı adını boş bırakırsan simülatör modunda açılır.

- Oyun ekranı: http://localhost:3000/
- Kontrol paneli / simülatör: http://localhost:3000/panel.html
- Hızlı deneme: http://localhost:3000/?demo=80 (80 sahte izleyici)

## OBS ayarı

1. Ayarlar → Video: taban ve çıkış çözünürlüğü `1080x1920`, 30 FPS.
2. Kaynak ekle → **Tarayıcı**: URL `http://localhost:3000/`, genişlik 1080, yükseklik 1920,
   "Ses kontrolünü OBS üzerinden yap" işaretli.
3. Yayını TikTok LIVE Studio'ya ya da yayın anahtarıyla TikTok'a ver.

## Gerçek yayına bağlama

`baslat.bat` sorduğunda yayını açan hesabın kullanıcı adını yaz (ya da `node server.js kullanici_adi`).
Hesap o anda canlı yayında olmalı; değilse program belirli aralıklarla yeniden dener.

Bağlantı, resmi olmayan `tiktok-live-connector` kütüphanesiyle kurulur. TikTok bu yöntemi resmen
desteklemez; ara sıra kopabilir.

## Ayarlar (`config.json`)

| Alan | Anlamı |
|---|---|
| `title` | Tabela ve ekran başlığı |
| `giftTiers` | Hediyenin **birim jeton değeri** `minCoins` ve üstüyse hangi aksiyon olacağı |
| `giftOverrides` | Belirli bir hediye adını doğrudan aksiyona bağlar, ör. `{"Rose": "join"}` |
| `join` | Hediyesiz katılım yolları (takip / beğeni / paylaşım / yorum kelimesi). Varsayılan: hepsi açık; sadece hediyeyle katılım için hepsini kapat |
| `points` | Beğeni, takip, paylaşım ve jeton başına puan (sıralama ve halaydaki yer) |
| `likeGoal` | Kaç beğenide "Hızlı Halay" başlayacağı ve süresi |
| `roleDurationSec` | Rolün süresi (0 = biri devralana kadar) |
| `maxDancers` | Aynı anda sahnedeki en fazla kişi |

Aksiyonlar: `join`, `confetti`, `zurnaci`, `halaybasi`, `davulcu`, `gelin`, `damat`, `money`.

Değişiklikten sonra oyun sayfasını yenilemek yeterli.

## Müzik

Varsayılan olarak basit bir davul/zurna sentezi çalar. `public/music/halay.mp3` koyarsan o çalar.
Sessiz açmak için: `http://localhost:3000/?mute`
