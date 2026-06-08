# Kurulum sihirbazı — ilk yapılandırma

> 🤖 *Bu Türkçe çeviri [07-setup-wizard.en.md](07-setup-wizard.en.md) dosyasından yapay zeka destekli oluşturulmuştur. Düzeltmeler GitHub üzerinden memnuniyetle karşılanır.*

> 🇩🇪 [Auf Deutsch lesen](07-setup-wizard.md)

Tesla Carview, **ilk kurulum** için iki yol ve **sürekli yapılandırma** için uygulama içi bir asistan sunar.

---

## Uygulama içi asistanlar {#settings-wizard}

v3.4.0'dan itibaren **iki ayrı asistan** vardır:

### 1. Kişisel ayar sihirbazı (`SettingsWizard.vue`)

İlk girişten sonra otomatik olarak görünür ve istediğiniz zaman **Ayarlar → 🧙 Sihirbazı başlat** ile yeniden açılabilir. **Tüm kullanıcılara** açıktır.

| # | Adım | Açıklama |
|---|------|-------------|
| 1 | **Hoş geldiniz** | Genel bakış |
| 2 | **Dil** | Uygulama dili seçimi |
| 3 | **Tasarım** | Tasarım stili seçimi (Glass, Cyberpunk, Minimal, Sport, Nevs-Edition) |
| 4 | **Vurgu rengi** | Butonlar ve gezinme için vurgu rengi |
| 5 | **Birimler** | km/mi, °C/°F, kWh/100km vb. |
| 6 | **Panel** | Kart görünürlüğü ve sıralaması |
| 7 | **Gezinme** | Gezinme öğelerini sırala ve gizle |
| 8 | **Bildirimler** | Web Push aboneliği, etkinlik türü seçimi |
| 9 | **Tamamlandı** | Tüm ayarlar kaydedildi |

### 2. Admin Setup Asistanı (`AdminSetupWizard.vue`)

**Admin Hub → 🛠️ Setup Asistanı** üzerinden erişilebilir. **Yalnızca yöneticiler.** Tüm sistem yapılandırmasında yol gösterir — SSH veya `.env` düzenleme gerekmez.

| Adım | Açıklama |
|------|-------------|
| **Tesla kimlik bilgileri** | Client-ID, Client-Secret, Audience'ı arayüzden ayarlayın (DB'de saklanır) |
| **Tesla OAuth** | Tesla hesabını bağla (popup → PostMessage callback → otomatik refresh) |
| **Araçlar** | Tesla hesabından araçları senkronize et |
| **Virtual Key** | Kayıt URL'sini göster/kopyala; durum kontrolü |
| **Fleet Telemetry** | VIN başına yapılandırma; durum gösterimi |
| **Web Push (VAPID)** | VAPID anahtarlarını doğrudan tarayıcıda üret veya manuel gir |
| **Telegram Bot** | Bot token'ı yapılandır (sunucu yeniden başlatma gerektirir) |
| **Elektrik fiyatı** | Araç başına ev şarj tarifesi (€/kWh) ayarla |
| **Dış API'ler** | ABRP, Grok/xAI anahtarını yapılandır |
| **İzleme** | Self-healing + uyarı e-postası |
| **Özet** | Durum genel bakışı; Telegram yapılandırıldıysa yeniden başlatma uyarısı |

### Notlar

- **Taslak modu** (kişisel sihirbaz): değişiklikler yalnızca son adımda kaydedilir
- **Anında kaydetme** (admin asistanı): kimlik bilgileri adım adım `tenant_settings` (DB) içine kaydedilir
- **Tesla OAuth**: popup penceresi; girişten sonra otomatik kapanır
- **VAPID üretimi**: doğrudan tarayıcıda — `docker exec` gerekmez
- **Header'da dil değiştirici** (her sihirbazda): her sihirbaz sağ üst köşede kompakt bir 🌐 değiştirici gösterir. Bir dil seçmek tüm sihirbaz metinlerine anında uygulanır; oturum açmış kullanıcılar için seçim profile kalıcı olarak kaydedilir. Girişte profilde veya tenant varsayılanında saklanan dil otomatik olarak uygulanır.
- **Backend açılışında otomatik başlatma**: `tenant_settings` veya `.env` VAPID anahtarları sağlamadığında bunlar tenant başına otomatik olarak üretilir. Push bildirimleri bu nedenle ilk girişten hemen sonra çalışır — ilgili sihirbaz adımı "✓ zaten yapılandırıldı (Otomatik)" gösterir.
- **Sihirbaz ön doldurma** (`GET /api/system/wizard-prefill`): sihirbaz açıldığında backend'den varsayılan değerleri ister (Geo-IP'den Fleet API audience, uyarı e-postası = admin e-postası, ülkeye göre elektrik tarifesi) artı adım başına durum. Tamamlanmış adımlar yeşil banner ile işaretlenir ve doğrudan atlanabilir; hoş geldiniz ekranı "X / Y adım zaten tamamlandı" gösterir.
---

Tesla Carview ilk yapılandırma için iki yol sunar.

## Web sihirbazı (önerilen)

İlk başlatmada uygulama henüz bir yönetici hesabı olmadığını otomatik olarak algılar
ve tarayıcıyı **/setup** sayfasına yönlendirir.

### Adımlar

1. **Hoş geldiniz** — sistem genel bakışı
2. **Yönetici hesabı oluştur** — bir kullanıcı adı ve güçlü parola seçin
3. **Tamamlandı** — giriş sayfasına yönlendirme

`/setup` web sihirbazı yalnızca admin yokken erişilebilir.
Sonrasında sayfa otomatik olarak kilitlenir.

## Terminal sihirbazı

```bash
bash deploy/setup-wizard.sh
```

Etkileşimli olarak sorar:

| Parametre | Açıklama | Örnek |
|---|---|---|
| Genel URL | Uygulamanın tam URL'si | `https://tesla.example.com` |
| Tesla Client-ID | Tesla Developer portalından | `abc123...` |
| Tesla Client-Secret | Tesla Developer portalından | `xyz456...` |
| Veritabanı yolu | SQLite dosyası | `./data/tesla-carview.db` |
| E-posta | Let's Encrypt için | `admin@example.com` |
| VAPID anahtarları | Web Push için (opsiyonel) | boş bırak = devre dışı |

Script her şeyi `backend/.env` dosyasına yazar ve dosya izinlerini `600`'e ayarlar (yalnızca sahibi okuyabilir).

## Yapılandırmayı daha sonra değiştirmek

```bash
# terminal sihirbazını tekrar çalıştır (.env üzerine yazar):
bash deploy/setup-wizard.sh

# veya doğrudan düzenle:
nano /opt/tesla-carview/backend/.env

# sonra container'ları yeniden başlat:
docker compose -f docker-compose.prod.yml up -d
```

## Tüm parametreler

`backend/.env.example` dosyasındaki tüm ortam değişkenleri listesi:

| Değişken | Gerekli | Açıklama |
|---|---|---|
| `PORT` | – | Backend portu (varsayılan: 3000) |
| `JWT_SECRET` | ✓ | Rastgele dizi ≥ 64 karakter |
| `FRONTEND_URL` | ✓ | Uygulamanın genel URL'si |
| `TESLA_CLIENT_ID` | ✓* | Tesla Fleet API client ID |
| `TESLA_CLIENT_SECRET` | ✓* | Tesla Fleet API client secret |
| `TESLA_REDIRECT_URI` | ✓* | OAuth callback URL |
| `TESLA_AUDIENCE` | – | Tesla API bölgesi (varsayılan: NA) |
| `DB_PATH` | – | SQLite dosyasının yolu |
| `ENABLE_POLLER` | – | Araç verisi poller'ı açık/kapalı |
| `ADMIN_EMAIL` | – | Let's Encrypt için e-posta |
| `VAPID_PUBLIC_KEY` | – | Web Push public key |
| `VAPID_PRIVATE_KEY` | – | Web Push private key |

*Yalnızca bir Tesla aracı bağlanacaksa gereklidir.

## VAPID anahtarlarını üret

```bash
npx web-push generate-vapid-keys
```
