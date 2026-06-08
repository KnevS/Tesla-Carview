# 🔧 Yapılandırma

> 🤖 *Bu Türkçe çeviri [10-configuration.en.md](10-configuration.en.md) dosyasından yapay zeka destekli oluşturulmuştur. Düzeltmeler GitHub üzerinden memnuniyetle karşılanır.*

> 🇩🇪 [Auf Deutsch lesen](10-configuration.md) · 👤 [Kullanıcı el kitabı](../frontend/src/handbook/handbook.en.md) · 🏠 [Doküman dizini](.)

Tesla Carview'i kontrol eden her ortam değişkeni. Çoğu `backend/.env` dosyasında bulunur (şablon olarak `backend/.env.example`'a bakın). **(gerekli)** olarak işaretlenen girişler ayarlanmalıdır; geri kalan her şeyin makul bir varsayılanı vardır.

---

## 🔐 Gerekli

| Değişken | Açıklama | Örnek |
|---|---|---|
| `JWT_SECRET` | JSON Web Token'lar için secret anahtarı. **≥ 32 karakter, kriptografik olarak rastgele.** | `openssl rand -hex 32` |
| `TESLA_CLIENT_ID` | [Tesla Developer Portal](https://developer.tesla.com) üzerinden Client ID | `abc123…` |
| `TESLA_CLIENT_SECRET` | Tesla Developer Portal üzerinden Client secret | `secret…` |
| `FRONTEND_URL` | Uygulamanın genel HTTPS URL'si — OAuth callback ve passkey kaydı için kullanılır | `https://carview.example.com` |
| `RP_NAME` | Passkey diyaloglarında görünen ad | `Tesla Carview` |
| `RP_ID` | WebAuthn için alan adı (protokol olmadan, **`FRONTEND_URL` ile eşleşmelidir**) | `carview.example.com` |

> ⚠️ `JWT_SECRET` çalışma zamanında **değişmemelidir**, aksi takdirde tüm oturumlar geçersiz olur. `RP_ID`'nin değişmesi mevcut tüm passkey'leri geçersiz kılar — kullanıcıların yeniden kaydolması gerekir.

---

## ⚡ Tesla Fleet API

| Değişken | Varsayılan | Açıklama |
|---|---|---|
| `TESLA_REDIRECT_URI` | `${FRONTEND_URL}/api/auth/callback` | OAuth redirect URI. Tesla Developer Portal'a tam olarak girilmelidir. |
| `TESLA_API_HOST` | `fleet-api.prd.eu.vn.cloud.tesla.com` | Bölgeye özgü Tesla API endpoint'i (NA: `…na.vn.cloud.tesla.com`). |
| `TESLA_PROXY_HOST` | `host.docker.internal:4443` | İmzalı araç komutları için `tesla-http-proxy` adresi. |

Ayrıntılı kurulum adımları: [04-tesla-api.en.md](04-tesla-api.en.md) (developer hesabı, uygulama kaydı, scope'lar) ve [09-tesla-api-usage.en.md](09-tesla-api-usage.en.md) (maliyet / kota).

---

## 🔔 Web Push (bildirimler)

"Şarj tamamlandı" ve bakım hatırlatma push'ları için VAPID anahtarları gereklidir. Onlar olmadan push bildirimleri çalışmaz — diğer her şey çalışmaya devam eder.

| Değişken | Varsayılan | Açıklama |
|---|---|---|
| `VAPID_PUBLIC_KEY` | — | Public key, `npx web-push generate-vapid-keys` ile üretin |
| `VAPID_PRIVATE_KEY` | — | Private key (aynı üreteç) |
| `VAPID_CONTACT` | `mailto:noreply@example.com` | Push servisi için iletişim URI'si (ideal olarak kendi e-postanız) |

---

## 🧪 Demo sandbox

| Değişken | Varsayılan | Açıklama |
|---|---|---|
| `DEMO_ENABLED` | `false` | `true` olduğunda: açılışta `demo` slug'lı ayrı bir demo tenant oluşturulur. Giriş sayfasında "🚀 Demo starten" butonu görünür. Sıkı sınırlar: IP başına 24 sa'de 1 kayıt, en fazla 10 eşzamanlı test kullanıcısı, her hesap 14 gün yaşar. |

İşletim + güvenlik ayrıntıları: [11-operations.en.md → Demo modu](11-operations.en.md#demo-mode). Test kullanıcıları, gizlilik / şartlar sayfalarına 14 günden sonraki koşulsuz silinmeyi belgeleyen bir ek otomatik olarak görür.

---

## ⬆️ Otomatik güncelleme

| Değişken | Varsayılan | Açıklama |
|---|---|---|
| `AUTO_UPDATE_ENABLED` | `false` | `true` olduğunda: ~03:30 Europe/Berlin gecelik cron `git fetch origin main` çalıştırır ve yeni bir commit'te `deploy/update.sh` yürütür. Kısa bir container yeniden başlatmasına neden olur — bakım örtüsü bunu UI'da kapatır. |
| `UPDATE_REPO_DIR` | `/opt/tesla-carview` | Otomatik güncelleyicinin üzerinde çalıştığı git working tree yolu. |

Önerilen: `deploy/update.sh`'i birkaç kez manuel çalıştırın, alışın, sonra etkinleştirin.

---

## ⚙️ İşletim ve performans

| Değişken | Varsayılan | Açıklama |
|---|---|---|
| `PORT` | `3000` | Backend HTTP sunucusunun TCP portu (container içinde). |
| `DB_PATH` | `/app/data/tesla-carview.db` | Eski veritabanı yolu — ilk açılışta `default` tenant olarak taşınır, sonra kullanılmaz. |
| `ENABLE_POLLER` | `true` | `false` olduğunda: döngüsel Tesla API polling yok (örn. özel okuma replikaları için). |
| `TESLA_DAILY_CAP` | `30` | Araç başına gün başına maksimum `vehicle_data` çağrısı. DB'de kalıcı — container yeniden başlatmalarından sağ çıkar. |
| `TESLA_MONTHLY_CAP` | `400` | Araç başına ay başına maksimum `vehicle_data` çağrısı. Limit ulaşıldığında polling otomatik durur. |
| `NODE_ENV` | `production` | Standart üretim kurulumu. `development` dev-sunucu davranışını etkinleştirir. |

---

## 🌐 Frontend (`frontend/.env`)

Bundle'a **build zamanında** dahil edilir. Değerleri değiştirmek yeniden build gerektirir.

| Değişken | Varsayılan | Açıklama |
|---|---|---|
| `VITE_FOOTER_EMAIL` | `''` | Footer'daki iletişim e-postası. Boş = blok gizli. |
| `VITE_FOOTER_ABOUT_DE` | `''` | "Hakkımda" sayfasının URL'si (Almanca varyant). |
| `VITE_FOOTER_ABOUT_EN` | `''` | "Hakkımda" sayfasının URL'si (İngilizce varyant). |
| `VITE_FOOTER_LINKEDIN_URL` | `''` | Operatörün LinkedIn profili. |

Dosya `.gitignored`'dur. `frontend/.env.example` reposunda commit edilmiş şablondur.

---

## 🖥️ Admin UI üzerinden yapılandırma (v3.4.0'tan itibaren)

v3.4.0'tan itibaren çoğu secret'ın manuel olarak `.env`'e eklenmesi gerekmez. **Admin Setup Asistanı** (Admin Hub → 🛠️) her adımda yol gösterir.

**Teknik arka plan — DB-öncesi-env deseni:**
`configService.js` her değeri önce `tenant_settings`'ten (tenant'ın SQLite DB'si) okur, sonra `.env`'e geri döner. Mevcut `.env` yapılandırmaları değişmeden çalışmaya devam eder; bir değer UI üzerinden ayarlandığında DB değeri öncelik kazanır.

| Ayar | UI yolu | `.env` fallback değişkeni |
|---------|---------|--------------------------|
| Tesla Client-ID | Admin Hub → 🛠️ → Tesla kimlik bilgileri | `TESLA_CLIENT_ID` |
| Tesla Client-Secret | Admin Hub → 🛠️ → Tesla kimlik bilgileri | `TESLA_CLIENT_SECRET` |
| Tesla Audience | Admin Hub → 🛠️ → Tesla kimlik bilgileri | `TESLA_AUDIENCE` |
| VAPID Public Key | Admin Hub → 🛠️ → Web Push | `VAPID_PUBLIC_KEY` |
| VAPID Private Key | Admin Hub → 🛠️ → Web Push | `VAPID_PRIVATE_KEY` |
| VAPID Contact | Admin Hub → 🛠️ → Web Push | `VAPID_CONTACT` |
| Telegram Bot Token | Admin Hub → 🛠️ → Telegram | `TELEGRAM_BOT_TOKEN` |
| xAI / Grok API Key | Admin Hub → 🛠️ → Dış API'ler | `XAI_API_KEY` |
| ABRP Global App Key | Admin Hub → 🛠️ → Dış API'ler | `ABRP_API_KEY` |

> **VAPID anahtarları üret:** Admin Setup Asistanında "🔑 Yeni oluştur" tıklayın — `docker exec` gerekmez.

> **Telegram Bot:** Token ilk ayarlandıktan sonra container yeniden başlatması gerektirir (`docker compose … up -d --build backend`). Asistan bir uyarı gösterir.

---

## Hızlı başvuru: minimum kurulum

```bash
# backend/.env (gerekli)
JWT_SECRET=$(openssl rand -hex 32)
TESLA_CLIENT_ID=…
TESLA_CLIENT_SECRET=…
FRONTEND_URL=https://carview.example.com
RP_NAME="Tesla Carview"
RP_ID=carview.example.com

# Opsiyonel ama önerilir
VAPID_PUBLIC_KEY=$(npx web-push generate-vapid-keys | grep Public | awk '{print $3}')
VAPID_PRIVATE_KEY=…
VAPID_CONTACT=mailto:you@example.com

# Demo yalnızca test kullanıcılarını davet etmek istediğinizde
# DEMO_ENABLED=true

# Otomatik güncelleme yalnızca güncelleme akışını anladıktan sonra
# AUTO_UPDATE_ENABLED=true
```

Kaydettikten sonra: `docker compose -f docker-compose.prod.yml up -d --build backend` — backend açılışta `.env`'i okur.

---

## Ayrıca bakın

- [02-deployment.en.md](02-deployment.en.md) — ilk deployment + nginx + Let's Encrypt
- [07-setup-wizard.en.md](07-setup-wizard.en.md) — etkileşimli yapılandırma asistanı
- [11-operations.en.md](11-operations.en.md) — günlük işler: yedekleme, geri yükleme, bakım, demo
