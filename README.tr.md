# ⚡ Tesla Carview

[![Version](https://img.shields.io/badge/version-v3.17.0-E31937?style=flat-square)](CHANGELOG.md)
[![License](https://img.shields.io/badge/License-PolyForm_Noncommercial-blue?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Raspberry_Pi_%7C_Linux_%7C_VPS-lightgrey?style=flat-square)](docs/02-deployment.en.md)

> 🇩🇪 [Deutsch](README.md) · 🇬🇧 [English](README.en.md) · 🇫🇷 [Français](README.fr.md) · 🇪🇸 [Español](README.es.md) · 🇬🇷 [Ελληνικά](README.el.md) · 🇺🇦 [Українська](README.uk.md)
>
> 📋 [Changelog](CHANGELOG.md) · 📚 [Dokümantasyon](docs/README.en.md)
>
> 🤖 *FR/ES/TR/EL/UK çevirileri DE/EN'den yapay zekâ destekli olarak hazırlanmıştır. Düzeltmeleri GitHub üzerinden memnuniyetle karşılarız.*

> **© 2026 Sven Krische** · [PolyForm Noncommercial 1.0.0](LICENSE) altında lisanslıdır · [AUTHORS](AUTHORS) · [NOTICE](NOTICE.md)
> Özgün tasarım, mimari ve uygulama: Sven Krische ([@KnevS](https://github.com/KnevS)).

**Araç Kullanılabilirlik Yönetimi (Car Usability Management)** — kendi sunucunuzda barındırılır, bulut yok, üçüncü taraf yok.
GPS izlerinden ve seyir defterinden, şarj planlamalı rota oluşturma ve bakım kayıtlarına kadar:
tüm araç verileriniz kendi sunucunuzda kalır.

Çalıştığı ortamlar: **Linux sunucuları** (x86_64), **Raspberry Pi 3/4/5** (ARM64/ARMv7), yerel geliştirme.

<!-- Operator-Hinweis im Footer / Footer note for operators:
     Wer Tesla Carview selbst hostet, kann die eigenen Kontaktdaten
     ueber frontend/.env (siehe frontend/.env.example) einsetzen.
     Self-hosters can configure their own footer contact via the .env. -->


---

## ⚠ Önemli — 2026 itibarıyla Tesla API durumu

Tesla, **resmi olmayan Owner API**'nin araç uç noktalarını Mayıs ile Haziran 2026 arasında kapattı. Daha önce yaygın olarak kullanılan topluluk çözümü (bir Tesla hesabı refresh token ile oturum açıp `/api/1/vehicles/{id}/vehicle_data` çağrısı yapma) artık **HTTP 401 "invalid bearer token"** döndürüyor — bu yöntem öldü ve hiçbir yamayla yeniden canlandırılamaz.

Canlı araç verileri (batarya, klima, TPMS, telemetri akışı) için **tek bir resmi yol** vardır: [developer.tesla.com](https://developer.tesla.com/) üzerinden uygulama onayıyla Tesla **Fleet API**. Güncel bekleme süresi **haftalar ile aylar** arasında.

**💡 Tesla ücretsiz kotası — tipik özel kullanım 0 €/ay:** Tesla, **hesap başına ayda 10 USD ücretsiz kredi** sunuyor — bu genellikle bir araç için telemetri akışını ve günlük komutları tamamen karşılıyor. Bunun üzerinde pay-as-you-go (150.000 stream sinyali = 1 USD, 1.000 komut = 1 USD, 50 wake-up = 1 USD). TeslaView tamamen hazır — uygulamanız onaylandığı anda tüm özellikler hemen etkin olur. Bekleme tamamen Tesla tarafındadır; TeslaView her zaman ücretsiz kalır.

**Fleet API onayı olmadan TeslaView'in hâlâ sunduğu özellikler:**

| Bağlantı | Veri kaynağı | Elde ettikleriniz | Kurulum |
|---|---|---|---|
| **OwnTracks** (önerilir, hemen kullanılabilir) | Sürücünün akıllı telefonu | Yolculuklar, GPS izi, mesafe, hız | Sihirbaz adım 5, ~5 dk |
| **Tesla Fleet OAuth** | Tesla bulutu | Batarya, klima, TPMS — tümü polling üzerinden | Fleet API onayı gerekir |
| **Tesla Fleet Telemetry** | Tesla → push WebSocket | Canlı akış | Fleet API + Virtual Key + Tesla kaydı |
| **Tesla Owner API** | Tesla bulutu | ❌ **2026'da engellendi** | — |
| **Monta entegrasyonu** | Monta bulutu | Şirket aracı faturalandırması için ev şarjı maliyeti | Sihirbazda API anahtarı |

**Fleet onayı olmadan yeni kurulumlar için somut öneri:** OwnTracks'i etkinleştirin — yasal olarak geçerli, GPS tabanlı bir seyir defteri, yolculuk ısı haritası, mesafe takibi ve otomatik sürücü ataması elde edersiniz. Eksik kalan batarya/klima değerleri, klasik bir kurumsal seyir defteri için kesinlikle şart değildir.

---

## Özellikler

| Alan | Açıklama |
|---|---|
| **Pano (Dashboard)** | Genel istatistikler, son yolculuk, aylık mesafe grafiği |
| **Yolculuklar** | Harita üzerinde GPS izi, tüketim, hız, zamana göre SoC |
| **Şarj** | Maliyetli şarj oturumları, GPS tabanlı şarj konumu eşleştirme, ücretsiz oturumlar işaretlenebilir |
| **Şarj konumları** | GPS yarıçapı, fiyat/kWh ve otomatik tespitli tanımlanabilir noktalar |
| **Batarya / Batarya Sağlığı Asistanı** | Faz 1 (v3.6.0): menzil geçmişi, dejenerasyon, şarj eğrisi, dış sıcaklığa göre verim, hayalet boşalma, anomaliler — tümü kendi verilerinizden çıkarılan saf istatistikler. Faz 2 (v3.7.0): push ile kalıcı anomali uyarıları + don/sıcak havada ön koşullandırma önerileri (Open-Meteo) |
| **Uygulama merkezi (App hub)** (v3.9.0) | Tesla tarayıcısı için özenle seçilmiş web uygulamaları: ARD Audiothek, Deutschlandfunk Live, GoingElectric, OpenChargeMap, Telegram Web, Wikipedia, ABRP — ücretsiz, hesap zorunluluğu yok, **Tesla'nın yerleşik uygulamalarıyla bilinçli olarak çakışmaz**. Kiracı bazında yönetici beyaz listesi |
| **Yakınımda (Nearby)** (v3.13.0) | OpenStreetMap Overpass üzerinden etrafınızdaki POI'ler (kafe, tuvalet, oyun alanı, **geocache'ler**, market, manzara noktaları…). Kaynak seçici: güncel araç konumu / aktif şarj oturumu / son yolculuk. 24 saatlik yerel önbellek |
| **Otomatik limitli şarj noktaları** (v3.12.0) | Ev/iş/sık kullanılan şarj cihazlarını yönetin: ad, GPS, yarıçap, tarife, istenen şarj limiti. Varışta → Tesla `set_charge_limit` komutu (Fleet API) ya da yedek olarak push hatırlatması |
| **OwnTracks doğrulama** (v3.11.0) | Sahte kayıtlara karşı üç savunma hattı: iOS Shortcut üzerinden Bluetooth doğrulama, araç başına yolculuk kilidi, manuel duraklatma anahtarı — araç paylaşımı yolculuklarının veya 2+ cihazla çift kayıtların seyir defterini kirletmesini engeller |
| **Koordinattan önce adres** (v3.10.0) | Tüm listeler ve detay görünümleri adresi tercih eder; enlem/boylam yalnızca yedek olarak (4 ondalık basamak, ~11 m) |
| **Otomatik coğrafi kodlama** (v3.8.0) | GPS'i olup adresi olmayan yolculuklar/şarj oturumları Nominatim/OSM üzerinden otomatik çözülür — canlı hook + gece toplu işleme + yönetici tetikleyici, yerelde 24 saat önbelleğe alınır
| **Teknik** | Canlı telemetri: TPMS, güç akışı, klima, şarj durumu |
| **Kontroller** | Araç komutları: klima, klima koruyucu (köpek/kamp), koltuk ısıtıcıları (5 koltuk × 4 seviye), direksiyon ısıtıcısı, kapılar, frunk/bagaj, camlar, sentry modu, amper kaydırıcısı ve şarj portu dahil şarj, kalkış programı, boombox, yazılım güncellemesi, navigasyon (Virtual Key gerekir) |
| **Rota planlayıcı** | Şarj süresi tahmini dahil SoC farkındalıklı şarj duraklarıyla etkileşimli rota planlayıcı; kalkış SoC'si (canlı veya manuel), hedef SoC ve şarj hedefi yapılandırılabilir; rota boyunca hava durumu (Open-Meteo), trafik (HERE Maps), hız kameraları (OpenStreetMap); döşeme (tile) proxy'li harita görünümü |
| **Seyir defteri** | BMF uyumlu elektronik Fahrtenbuch: sınıflandırma, iş ortağı, amaç, kilometre saati sütunları, PDF'te ardışık numaralandırma, dışa aktarım sonrası kilit, manuel giriş, yolculuk birleştirme/ayırma |
| **Faturalandırma** | Tüm araçlar için ev şarjı oturumları ve Monta entegrasyonu; şirket araçları için maliyet dökümü (PDF, geri ödeme şablonu) |
| **Servis günlüğü** | Maliyetiyle birlikte bakım, onarım, lastik ve muayene kayıtları |
| **Dışa aktarım** | Yolculuklar ve şarj için CSV/JSON dışa aktarımı, tam yedekleme |
| **Servis aralıkları** | Araç başına yinelenen servis görevleri (MOT, lastikler, fren hidroliği, …) zaman ve km aralıkları + günlük push hatırlatıcılar ile |
| **Denetim günlüğü (audit log)** | Güvenlik olayları için filtrelerle ve CSV dışa aktarımıyla yönetici görüntüleyicisi (GDPR dostu) |
| **Dinamik tarife** | aWattar (DE/AT) ve Tibber entegrasyonu: panoda 24 saatlik fiyat eğrisi, en ucuz 4 saatlik pencerede tek tıkla şarj programı |
| **PDF geri ödeme** | Ev şarjı geri ödemesi için imzalanabilir PDF (istemci tarafı, bulut yok) |
| **Bildirimler** | Şarj tamamlandığında Web Push ve bakım hatırlatmaları — bağlıyken Telegram'a paralel olarak iletilir |
| **Telegram bot** | Inline butonlu tam 1:1 bot: `/status` (kilit/klima/sentry/şarj butonlarıyla + kilit açma onayı), `/battery`, `/range`, `/location` (Haritalar bağlantısı), `/today`, `/trips`, `/classify` (yolculuk etiketleme), `/service`, `/firmware`, `/clean` — ayrıca şarj tamamlama, sentry uyarıları, servis hatırlatmaları ve yeni firmware sürümleri için proaktif push. Her araç eylemi için denetim günlüğü. Aşağıdaki ["Neden Telegram, neden WhatsApp / Signal değil?"](#neden-telegram-neden-whatsapp--signal-değil) bölümüne bakın |
| **Kullanıcı el kitabı** | Doğrudan uygulama içinde okunabilen eksiksiz kılavuz |
| **Tasarım ve temalar** | 5 tasarım stili (Glass, Cyber, Minimal, Sport, **Nevs-Edition**) + 6 vurgu rengi, tümü yerel olarak saklanır; Nevs-Edition kendi Bricolage Grotesque tipografisi ve canlı durum çubuğu ile birlikte gelir |
| **Ayarlar** | Tüm bölümler katlanabilir ve tek tek yeniden sıralanabilir (sürükle-bırak) |
| **Navigasyon** | Sıralanabilir, tek tek gizlenebilir navigasyon girdileri |
| **Mobil / Tesla** | iPhone/iPad (Safari), Android, Tesla araç içi tarayıcı ve masaüstü için kurulabilir PWA. iOS tarzı alt sekme çubuğu (4 hızlı sekme + "Daha fazla" alt sayfası). Dar ekranlarda seyir defteri için kompakt kart görünümü. |
| **CO₂ karşılaştırması** | Tesla CO₂'sine karşı dizel eşdeğeri, tasarruf edilen ton, şebeke karışım faktörü (DE için 0,38 kg/kWh) — Enerji Raporunda haftalık |
| **Hava durumu tüketimi** | Enerji Raporunda sıcaklık aralığına (< −10 °C ile > 30 °C arası) göre tüketim korelasyonu — soğuk ve sıcağın menzili nasıl etkilediğini gösterir |
| **Klima istatistikleri** | Günlük klima kullanımı (saat), koltuk ısıtması, ön koşullandırma sayısı, en soğuk/en sıcak gün |
| **Firmware takipçisi** | Geçmiş ve yüklü gün sayısıyla birlikte her yeni araç yazılımı sürümünü otomatik olarak kaydeder |
| **Topluluk Karşılaştırması (Benchmark)** | Aynı modeli kullanan diğer sürücülerle isteğe bağlı anonim tüketim karşılaştırması; k-anonymity, SHA-256 hash, GDPR uyumlu |
| **Sistem durumu** | Trafik ışığı kartı (Tesla token, Virtual Key, Fleet Telemetry, poller, DB) — bir bakışta yeşil/sarı/kırmızı |
| **Etkinlik ısı haritası** | Tüm yolculukların takvim ısı haritası (Yıl/Ay/Hafta/Tümü), tıklayınca o günün yolculuk listesine gider |
| **Kiracı takma adı** | Gizlilik: oturum açma sayfası gerçek kiracı adı yerine rastgele bir `sıfat-isim` takma adı gösterir, yönetici tarafından yeniden üretilebilir |
| **Önce Fleet Telemetry** | Tercih edilen veri kaynağı olarak WebSocket akışı (Tesla onayı gerekir). Etkin olduğunda → poller saatte 1× heartbeat'e düşer ve API bütçesinin %95'inden fazlasını korur. Aksi halde yedek olarak API polling |
| **Diskte şifreleme (at rest)** | Tesla OAuth token'ları, TOTP MFA gizli anahtarı ve Virtual Key özel anahtarı için AES-256-GCM. Parola sıfırlama token'ları için hash + zamanlama güvenli karşılaştırma. `data/.encryption-key` konumunda otomatik üretilen anahtar |
| **Kendiliğinden güncellenen PWA** | Service worker dağıtımları algılar ve otomatik yeniden yükler — `Ctrl+Shift+R` gerekmez, iOS PWA dahil |

---

## Önizleme

Demo örneğinden alınan canlı ekran görüntüleri, her gün 04:45'te yenilenir:

<table>
  <tr>
    <td><img src="https://www.teslaview.krische.com/shots/desktop/dashboard.png" alt="Dashboard" /></td>
    <td><img src="https://www.teslaview.krische.com/shots/desktop/trips.png" alt="Trips" /></td>
    <td><img src="https://www.teslaview.krische.com/shots/desktop/charging.png" alt="Charging" /></td>
  </tr>
  <tr>
    <td align="center"><em>Pano</em></td>
    <td align="center"><em>Yolculuklar</em></td>
    <td align="center"><em>Şarj</em></td>
  </tr>
  <tr>
    <td><img src="https://www.teslaview.krische.com/shots/desktop/routes.png" alt="Route planner" /></td>
    <td><img src="https://www.teslaview.krische.com/shots/desktop/telemetry.png" alt="Telemetry" /></td>
    <td><img src="https://www.teslaview.krische.com/shots/desktop/settings.png" alt="Settings" /></td>
  </tr>
  <tr>
    <td align="center"><em>Rota planlayıcı</em></td>
    <td align="center"><em>Telemetri</em></td>
    <td align="center"><em>Ayarlar</em></td>
  </tr>
</table>

📸 Canlı demo: **[demo.teslaview.krische.com](https://demo.teslaview.krische.com)** · [Mobil görünüm](https://www.teslaview.krische.com/shots/mobile/dashboard.png) · [Tüm ekran görüntüleri](https://www.teslaview.krische.com/#screens)

### Telegram bot

Hesabınızı *Ayarlar → Telegram* altında bağlayın ve botu doğrudan iPhone/Android üzerinde kullanın:

<table>
  <tr>
    <td width="33%"><img src="https://www.teslaview.krische.com/shots/mobile/telegram-status.png" alt="/status with inline buttons" /></td>
    <td width="33%"><img src="https://www.teslaview.krische.com/shots/mobile/telegram-notification.png" alt="Push notification" /></td>
    <td width="33%"><img src="https://www.teslaview.krische.com/shots/mobile/telegram-classify.png" alt="Classify a trip" /></td>
  </tr>
  <tr>
    <td align="center"><em>Inline butonlu /status</em></td>
    <td align="center"><em>Push bildirimi</em></td>
    <td align="center"><em>Yolculuğu sınıflandır</em></td>
  </tr>
</table>

Komutlar: `/status`, `/battery`, `/range`, `/location`, `/today`, `/trips`, `/classify`, `/service`, `/firmware`, `/clean`, `/help`, `/unlink`. `/status` altında kilitleme/kilit açma (onaylı), klima, sentry ve şarj için inline butonlar. Şarj tamamlama, sentry uyarıları, servis hatırlatmaları ve yazılım güncellemeleri için push bildirimleri — Web Push ile paralel olarak.

[Tüm Telegram mockup'larına bakın ↗](https://www.teslaview.krische.com/#telegram)

#### Neden Telegram, neden WhatsApp / Signal değil?

Bu soru bize sıkça soruluyor — kısa özet:

| Servis | Kendi sunucunuzda barındırılabilir mi? | Özel bot API'si var mı? | Burada kullanılıyor mu? |
|---|---|---|---|
| **Telegram** | Bot API tamamen açık, BotFather ücretsiz, hesap riski yok | ✅ Evet | ✅ **Evet, birincil kanal** |
| **WhatsApp** | Yalnızca Meta Cloud API üzerinden (Business hesabı + doğrulanmış işletme numarası + şablon onayı). Kendi numaranızla özel kullanım **öngörülmemiştir**. Resmi olmayan kütüphaneler (whatsapp-web.js, baileys) **ToS ihlalidir** ve hesap yasaklarına yol açar. | ❌ Özel kullanıcılar için değil | ❌ **Hayır** — bilinçli olarak uygulanmadı |
| **Signal** | Resmi bot sunucusu yok, webhook API'si yok. Kendi başına çalıştırılan fork'lar (signald) kırılgan ve Signal tarafından düzenli olarak engelleniyor. | ❌ Hayır | ❌ **Hayır** |
| **Threema** | İşletmeler için resmi REST API var — ama ücretli (~50 €/yıl gateway hesabı) | ⚠ Evet, ticari | ❌ Uygulanmadı (ücretli) |
| **Web Push** (PWA) | Tarayıcı standardı, doğrudan iPhone/Android üzerinde çalışır, hesap gerekmez, tarayıcının push servisi dışında üçüncü taraf sunucu yok | ✅ Evet | ✅ **Evet, birincil kanal** |

**Sonuç:** Telegram + Web Push birlikte en önemli kanalları kapsar — üçüncü taraf maliyeti yok, ToS ihlali yok, takip yok. WhatsApp teknik olarak mümkün olurdu, ancak kurulumu (Meta'nın onay süreciyle birlikte işletme yapısı) TeslaView'in kendi kendine barındırma doğasıyla çelişiyor. Gerçekten WhatsApp istiyorsanız: *whatsapp-web.js* gibi köprü çözümleri ileri kullanıcılar tarafından kendi başına eklenebilir — biz bunu önermiyoruz.

---

## Çok kiracılı mimari (v2.0'dan itibaren)

v2.0'dan itibaren Tesla Carview, tam veri yalıtımı ile **birden çok kiracıyı** destekler:

- Her kiracının kendi SQLite veritabanı vardır
- Yeni kiracılar yalnızca isteğe bağlı **not** içeren **davet bağlantısı** ile eklenir (Yönetici → Kullanıcılar → Davet bağlantısı oluştur, 7 gün geçerli, tek kullanımlık); davetler yeniden gönderilebilir, yumuşak iptal edilebilir veya silinebilir
- Kiracı başına **birden fazla araç**: senkronizasyon Ayarlar → 🔄 Araçları senkronize et üzerinden
- Hassas izinlerle kiracı başına **kullanıcı yönetimi** (roller, araç ataması, kilitleme): kullanıcı başına `Araçları düzenle`, `Araç ekle`, `MFA gerekli`
- **Yeni hesaplar için zorunlu MFA** — yönlendirici (router) koruyucusu MFA etkin olana kadar TOTP kurulumuna yönlendirir
- **Yönetici görev kartı**, atanmış aracı olmayan aktif kullanıcıları tek tıkla işlemlerle listeler
- **Seyir defteri girdileri yazarını takip eder** ve her girdinin yanında gösterir
- **Passkey kimlik doğrulaması** (Touch ID, Face ID, Windows Hello, FIDO2)
- **Parola sıfırlama** yönetici tarafından oluşturulan bağlantı üzerinden
- **Monta üzerinden ev wallbox'ı algılama** (charge-point-ID eşleşmesi → şarj listesinde ve faturalandırmada 🏠 işareti)
- **Ücretsiz şarj oturumları**: şarj geçmişinde işaretlenebilir, faturalandırmadan hariç tutulur
- **Yasal sayfalarda sürüm yükseltme**, artırmadan önce "Stand:" satırına bugünün tarihini otomatik olarak yazar

---

## Sistem gereksinimleri

| Bileşen | Minimum | Önerilen | Not |
|---|---|---|---|
| **CPU** | 1 çekirdek | 2+ çekirdek | Pi 5 / VPS / x86 — ARM64 + AMD64 desteklenir |
| **RAM** | 2 GB | 4+ GB | Ollama ile: 4+ GB gerekli (1B model), 3B modeller için 8+ GB |
| **Disk** | 2 GB | 10+ GB | Ollama ile: model başına ekstra 1–20 GB |
| **OS** | Docker uyumlu | Debian/Ubuntu/Pi OS | systemd tabanlı önerilir |
| **İnternet** | hayır | DSL+ | Tesla API + GHCR image çekme + Ollama model indirme için |

### AI modu donanım tablosu (Ollama yerel)

Veri egemenliğine sahip yerel AI sohbeti (Ollama, varsayılan olarak açık) kullanmak isterseniz:

| Donanım | Önerilen model | RAM | tok/s (çıkarım) | Kullanılabilir |
|---|---|---|---|---|
| Pi 4 (4 GB) | `llama3.2:1b` | ~1,5 GB | 4–6 | basit Soru-Cevap, gecikme hissedilir |
| Pi 4 (8 GB) | `qwen2.5:1.5b` | ~1,8 GB | 3–5 | daha iyi, hâlâ yavaş |
| Pi 5 (8 GB) | `qwen2.5:3b` | ~3 GB | 4–6 | önerilen varsayılan |
| VPS (4 vCPU / 8 GB) | `qwen2.5:3b` | ~3 GB | 8–12 | rahat |
| VPS / iş istasyonu (16 GB+) | `llama3:8b` | ~6,5 GB | 5–8 | çok iyi, biraz daha yavaş |
| GPU (8+ GB VRAM) | `llama3:8b` veya benzeri | modele göre | 30–80+ | kurumsal sınıf |

**Ollama'yı devre dışı bırakın** eğer donanımınız yetmiyorsa — şu içerikle bir `docker-compose.override.yml` oluşturun:
```yaml
services:
  ollama:
    profiles: [disabled]
```
Ardından Ollama olmadan `docker compose up -d`. Veya daha basit: sihirbazda `AI provider = Off` ayarlayın. Bulut alternatifi: `AI provider = Grok` (xAI API anahtarı gerekir, veriler buluta gider).

## Hızlı başlangıç

> **⏳ Tesla tarafı hazırlığı (kurulumla paralel ilerleyebilir):**
> Tesla Fleet API'yi kullanmak, [developer.tesla.com](https://developer.tesla.com/) üzerinde bir uygulama kaydı yapmak anlamına gelir. **Tesla onayı 1–3 hafta sürebilir.** Kurulumun kendisi bu olmadan da çalışır — Tesla dışı her özellik hemen kullanılabilir ve Tesla kimlik bilgilerini daha sonra `bash deploy/setup-wizard.sh` üzerinden ekleyebilirsiniz. Adımlar ve Virtual Key kurulumu için [docs/04-tesla-api.en.md](docs/04-tesla-api.en.md) bakınız.

### Raspberry Pi / Linux sunucusu (önerilen)

```bash
# Hedef makinede root olarak:
curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
```

Script mimariyi otomatik tespit eder (x86_64, ARM64, ARMv7) ve her şeyi kurar.

### Yerel geliştirme

```bash
git clone https://github.com/KnevS/Tesla-Carview.git
cd Tesla-Carview

# Backend
cd backend
cp .env.example .env
# .env dosyasını ayarlayın (JWT_SECRET zorunludur!)
npm install && npm run dev

# Frontend (ikinci terminal)
cd frontend && npm install && npm run dev
```

→ tarayıcıyı açın: **http://localhost:5173**
→ ilk başlatmada otomatik olarak kurulum sihirbazına yönlendirilirsiniz

### Sadece yapılandırma (kurulum yok)

```bash
bash deploy/setup-wizard.sh
```

Etkileşimli asistan: alan adı, Tesla API kimlik bilgileri, e-posta, Web Push.

---

## İlk yapılandırma (web sihirbazı)

İlk başlatmada uygulama otomatik olarak **/setup**'a yönlendirir.
Burada kiracı adını ve yönetici hesabını tarayıcıda oluşturabilirsiniz.

Oturum açtıktan sonra önerilen adımlar:
1. Tesla aracı bağlayın (Ayarlar → Tesla)
2. Araca Virtual Key kaydedin (Ayarlar → Virtual Key)
3. MFA'yı etkinleştirin (Ayarlar → İki faktörlü kimlik doğrulama)
4. Şarj konumlarını yapılandırın

**Kullanıcı el kitabı** doğrudan uygulama içinde `/handbook` adresinde mevcuttur.

---

## Araç komutları ve Virtual Key

Araç komutları (klima, kapılar, korna vb.) için bir **Virtual Key** gereklidir.
Virtual Key, uygulamanın imzalı komutları doğrudan araca göndermesine olanak tanır.

**Ön koşul**: sunucuda çalışan bir [`tesla-http-proxy`](https://github.com/teslamotors/vehicle-command).

```bash
# proxy'yi başlat (örnek — yolları ayarlayın):
tesla-http-proxy -port 4443 -host 0.0.0.0 \
  -tls-key /etc/tesla-proxy/server.key \
  -cert /etc/tesla-proxy/server.crt \
  -key-file /etc/tesla-proxy/tesla_priv.pem
```

Genel anahtarın aracın anahtarı doğrulayabilmesi için uygulama alan adında
`/.well-known/appspecific/com.tesla.3p.public-key.pem` adresinden erişilebilir olması gerekir.


---

## Monta entegrasyonu (isteğe bağlı)

Tesla Carview, [Monta](https://monta.com) — bir EV şarj yönetim servisi — ile isteğe bağlı senkronizasyonu destekler. Entegrasyon **tüm araçlar** için kullanılabilir:

- **Özel araçlar**: Monta şarj oturumları, faturalandırma görünümünde ev şarjları olarak gösterilir (🏠 rozet, otomatik ev wallbox'ı algılama).
- **Şirket araçları**: Ek olarak, tam maliyet faturalandırması — aylık özet, imzalanabilir PDF geri ödeme sayfası, işveren için faturalandırma şablonu.

Ayarlarda araç başına yapılandırma (Araç profili → Ev şarjı):
- **Monta Client ID** + **Client Secret** (OAuth2, Partner API)
- **Charge Point ID** (oturumları belirli bir şarj noktasına göre filtreler)
- **Wallbox elektrik fiyatı** (€/kWh, şirket araçları için faturalandırma temeli)

Senkronizasyon manuel olarak **Faturalandırma → Monta Sync** üzerinden çalışır.


---

## Güvenlik

- JWT (15 dk access token, 7 gün httpOnly cookie olarak refresh token)
- **TOTP MFA** (Google Authenticator, Authy, 1Password vb.)
- **Passkey'ler** (WebAuthn, parolasız oturum açma)
- **10 yedek kodu** (bcrypt-hash'li, tek kullanımlık)
- 5 başarısız denemeden sonra **hesap kilitlemesi** (15 dk)
- 3 başarısız oturum açmadan sonra **fail2ban** IP engellemesi (10 dk)
- TLS 1.2/1.3, HSTS, OCSP stapling ile **HTTPS**
- **CSP, X-Frame-Options, Permissions-Policy** başlıkları
- Oturum açma ve API uç noktalarında **hız sınırlama (rate limiting)**
- Güvenlikle ilgili tüm eylemler için **denetim günlüğü (audit log)**
- Yedekleme uyarısı ve onay metni ile **veri silme**

---

## Teknoloji yığını

| Katman | Teknoloji |
|---|---|
| Frontend | Vue 3 + Vite + Pinia + Tailwind CSS + Chart.js + Leaflet |
| Backend | Node.js 20 + Express + SQLite (better-sqlite3) |
| Auth | JWT + bcrypt + TOTP (otpauth) + WebAuthn (@simplewebauthn) |
| Tesla verileri | Tesla Fleet API (OAuth2) + Fleet Telemetry (WebSocket) |
| Çok kiracılılık | Kiracı başına ayrı SQLite veritabanları, global veriler için master DB |
| Dağıtım | Docker Compose + nginx + Let's Encrypt |
| Platformlar | linux/amd64 · linux/arm64 · linux/arm/v7 |

---

## Proje yapısı

```
tesla-carview/
├── backend/
│   ├── src/
│   │   ├── db/            # schema + DB initialisation (master-schema.sql)
│   │   ├── middleware/    # auth.js (multi-tenant JWT), security.js, validate.js
│   │   ├── routes/        # auth, setup, register, passkey, password-reset,
│   │   │                  # users, vehicles, trips, charging, data-management, …
│   │   └── services/      # teslaApi, poller (multi-tenant), dataSync (GPS), …
│   └── .env.example       # configuration template
├── frontend/
│   └── src/
│       ├── views/         # Login, Register, Setup, Dashboard, Trips,
│       │                  # Settings (Passkey), UserManagement, DataManagement,
│       │                  # Handbook, PasswordReset, …
│       ├── components/    # NavBar (admin links, handbook), StatCard
│       ├── store/         # auth.js (passkey, tenant), index.js
│       └── router/        # routes with admin guard
├── deploy/
│   ├── setup.sh                  # fully automated server setup
│   ├── setup-wizard.sh           # interactive configuration assistant
│   ├── nginx-host.conf.template  # nginx config (HTTPS, TLS hardening)
│   └── update.sh                 # zero-downtime update
├── docs/                  # detailed guides
├── docker-compose.yml          # development
└── docker-compose.prod.yml     # production
```

---

## Önemli ortam değişkenleri (.env)

| Değişken | Açıklama | Örnek |
|---|---|---|
| `JWT_SECRET` | JWT için gizli anahtar (≥ 32 karakter, rastgele) | `openssl rand -hex 32` |
| `TESLA_CLIENT_ID` | Tesla Developer uygulaması client ID | `abc123…` |
| `TESLA_CLIENT_SECRET` | Tesla Developer uygulaması secret | `secret…` |
| `FRONTEND_URL` | Uygulamanın genel URL'si (OAuth callback + passkey'ler için) | `https://carview.example.com` |
| `RP_NAME` | Passkey iletişim kutuları için görünen ad | `Tesla Carview` |
| `RP_ID` | WebAuthn için alan adı (protokolsüz) | `carview.example.com` |

---

## Dokümantasyon

Tesla Carview iki ayrı dokümantasyon katmanı ile birlikte gelir:

### 👤 Uygulamanın kullanıcıları için

Çalışan uygulamada `/handbook` adresindeki uygulama içi el kitabı — veya doğrudan [`frontend/src/handbook/handbook.en.md`](frontend/src/handbook/handbook.en.md) adresinden okuyun. Konular: pano, yolculuklar, şarj, BMF uyumlu seyir defteri, araç kontrolleri, servis aralıkları, demo modu, mobil kurulum, kullanıcı tarafı sorun giderme.

### 🛠 Kendi sunucusunda barındıranlar ve yöneticiler için

[`docs/`](docs/README.en.md) klasöründeki teknik dokümantasyon:

| Belge | İçerik |
|---|---|
| [📚 Doküman dizini](docs/README.en.md) | Her teknik belgenin haritası |
| [Hızlı başlangıç](docs/01-quickstart.en.md) | Yerel geliştirme ortamı |
| [Dağıtım](docs/02-deployment.en.md) | Sunucu dağıtımı + Raspberry Pi |
| [Kimlik doğrulama ve MFA](docs/03-authentication.en.md) | Oturum açma sistemi, MFA, passkey'ler |
| [Tesla Fleet API](docs/04-tesla-api.en.md) | Tesla Developer hesabı oluşturma |
| [Güvenlik mimarisi](docs/05-security-architecture.en.md) | Tehdit modeli, tüm önlemler |
| [fail2ban](docs/06-fail2ban.en.md) | Brute-force korumasını yapılandırma |
| [Kurulum sihirbazı](docs/07-setup-wizard.en.md) | Etkileşimli yapılandırma asistanı |
| [Dokploy dağıtımı](docs/08-dokploy.en.md) | Alternatif dağıtım platformu |
| [Tesla API kotası](docs/09-tesla-api-usage.en.md) | API maliyeti ve takibi |
| **[🔧 Yapılandırma (ENV)](docs/10-configuration.en.md)** | Her ortam değişkeni — zorunlu, isteğe bağlı, demo, otomatik güncelleme |
| **[🛠 İşletim](docs/11-operations.en.md)** | Yedekleme/geri yükleme, gece bakımı, demo modu, otomatik güncelleme, günlükler |
| **[🛡️ Yüksek erişilebilirlik (HA)](docs/12-high-availability.en.md)** | SLA-kritik kurulumlar için mimari seçenekleri (teaser, talep üzerine) |

---

## Güncellemeler

```bash
bash deploy/update.sh
```

---

## Katkıda bulunma

Katkılar memnuniyetle karşılanır! Önce [Katkı Yönergeleri](CONTRIBUTING.md)'ni okuyun, ardından bir [good first issue](https://github.com/KnevS/Tesla-Carview/labels/good%20first%20issue) seçin veya doğrudan bir pull request açın.

---

## Lisans

[**PolyForm Noncommercial 1.0.0**](LICENSE) — [polyformproject.org](https://polyformproject.org) tarafından yayınlanan ticari olmayan yazılım lisansı.

**İzin verilenler:** kişisel kullanım, kendi sunucunuzda barındırma (aile/hane içi kullanım dahil), değişiklikler, aynı koşullar altında ücretsiz yeniden dağıtım, hayır kurumları tarafından kullanım, eğitim ve kamu araştırma kurumları tarafından kullanım.

**Yasak olanlar:** yazılımın satılması, üçüncü taraflar için ücretli bir hizmet olarak (SaaS) çalıştırılması, her türlü ticari kullanım, alt lisanslama.

Herhangi bir yeniden dağıtım, tam lisans metnini ve `Required Notice` telif hakkını içermelidir. Yazılım "olduğu gibi" sağlanır, garanti yoktur — ayrıntılar için [LICENSE](LICENSE)'a bakın.

### 📜 Önceki Sanat (Prior-Art) Bildirimi

Bu depoda belgelenen tüm teknik prosedürler — özellikle **Batarya Sağlığı Asistanı (Battery-Health Companion)** (faz 1+2), araç başına yolculuk kilidi ile **Bluetooth tetikleyici üzerinden OwnTracks doğrulaması**, **coğrafi sınırlı (geofenced) konum başına otomatik şarj limiti**, **Tesla tarayıcısı için özenle seçilmiş web uygulama merkezi**, **OSM Overpass üzerinden bir şarj oturumu etrafında POI araması**, **yerel önbellekli otomatik ters coğrafi kodlama**, **önce-adres UI stratejisi** ve **push önerileriyle çok aşamalı anomali tespiti** — ilgili Git commit'in tarihinden itibaren kamuya açık olarak yayınlanmıştır ve patent ve marka hukuku anlamında "prior art" oluşturur.

Bu bildirim, daha sonra üçüncü tarafların aynı prosedürler üzerinde fikri mülkiyet başvurularını önlemeye yöneliktir.

Git hash'leri ve commit zaman damgaları kriptografik olarak doğrulanabilir ve GitHub tarafından bağımsız olarak zaman damgalanır.

---

## ❤️ Destek

Tesla Carview, **kendi hanenizde özel, kendi sunucunuzda barındırılan kullanım için** ücretsiz ve reklamsızdır ([LICENSE](LICENSE) ve [PolyForm Noncommercial 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0/) bakınız). Ticari yeniden satış, üçüncü taraf SaaS barındırma veya ticari ürünlere gömülmesi **yasaktır**.

Program size değer ifade ediyorsa, aşağıdaki kâr amacı gütmeyen
kuruluşlar doğrudan desteğinizden memnuniyet duyacaktır:

| Kuruluş | Açıklama |
|---|---|
| **Aktion Deutschland Hilft** | Dünya çapında hızlı ve etkili afet yardımı için yardım kuruluşları birliği |
| **Lebenshilfe Rems-Murr** | Rems-Murr bölgesindeki engelli bireylere destek, eşlik ve dahil etme |
| **Radio 7 Drachenkinder** | Bölgedeki ağır hasta çocuklar için yardım — terapileri ve dilekleri finanse eder |

> **Bağışınızın %100'ü doğrudan kuruluşa gider. Ne miktarı ne de verilerinizi görürüz.**

Uygulamada her sayfanın altındaki footer'da **❤ Destek** bağlantısı üzerinden veya doğrudan `/support` adresinden erişilebilir.
