# Yapılandırma — Ortam Değişkenleri

Tüm Tesla Carview ayarları, `/opt/tesla-carview/backend/.env` konumundaki `.env` dosyası üzerinden yapılandırılır.

`.env` dosyasında yapılan herhangi bir değişiklikten sonra arka ucu yeniden başlatın:
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d --build backend
```

---

🌐 **Language / Sprache / Langue / Idioma / Dil / Γλώσσα**

| | |
|---|---|
| 🇬🇧 **[English](Configuration)** | English version |
| 🇩🇪 **[Deutsch](DE-Configuration)** | Deutsche Version |
| 🇫🇷 **[Français](FR-Configuration)** | Version française |
| 🇪🇸 **[Español](ES-Configuration)** | Versión en español |
| 🇹🇷 **[Türkçe](TR-Configuration)** | Buradasınız |
| 🇬🇷 **[Ελληνικά](EL-Configuration)** | Ελληνική έκδοση |

---

## Zorunlu ayarlar (uygulamanın çalışması için ayarlanmalıdır)

| Değişken | Örnek | Açıklama |
|---|---|---|
| `JWT_SECRET` | `some-random-64-char-string` | Giriş token'larını imzalamak için gizli anahtar. Şu komutla oluşturun: `openssl rand -hex 32` |
| `TESLA_CLIENT_ID` | `abc123...` | Tesla Geliştirici Portalı'ndan |
| `TESLA_CLIENT_SECRET` | `xyz789...` | Tesla Geliştirici Portalı'ndan |
| `FRONTEND_URL` | `https://tesla.yourdomain.com` | Kurulumunuzun genel URL'si |
| `DATABASE_PATH` | `/app/data` | Veritabanlarının depolandığı yer (Docker'da değiştirmeyin) |

---

## İsteğe bağlı ama önerilen

| Değişken | Varsayılan | Açıklama |
|---|---|---|
| `AUTO_UPDATE_ENABLED` | `false` | Geceleri otomatik güncellemek için `true` olarak ayarlayın |
| `MFA_REQUIRED_FOR_NEW_USERS` | `false` | Tüm yeni kullanıcı hesapları için MFA kurulumunu zorunlu kıl |
| `REGISTRATION_REQUIRES_INVITE` | `false` | Yeni kiracı kaydı için davet kodu zorunlu kıl |
| `POLL_INTERVAL_MS` | `60000` | Araba aktifken Tesla API'sini ne sıklıkla sorgulayacağı (ms) |
| `POLL_SLEEP_INTERVAL_MS` | `600000` | Araba uyku modundayken sorgulama aralığı (ms) |

---

## Dinamik tarife (elektrik fiyatlandırması)

| Değişken | Açıklama |
|---|---|
| `AWATTAR_ENABLED` | `true`/`false` — aWATTar'ı etkinleştir (DE/AT, ücretsiz) |
| `TIBBER_TOKEN` | Tibber API token'ınız ([developer.tibber.com](https://developer.tibber.com) adresinden alın) |

---

## Gelişmiş / Fleet Telemetry

| Değişken | Açıklama |
|---|---|
| `FLEET_TELEMETRY_ENABLED` | `true`/`false` — Fleet Telemetry aracılığıyla gerçek zamanlı GPS'i etkinleştir |
| `FLEET_TELEMETRY_PORT` | Fleet Telemetry sunucusu için port (varsayılan: 4443) |
| `VIRTUAL_KEY_PRIVATE_KEY_PATH` | Sanal Anahtar özel anahtar dosyasının yolu |

---

## Güvenli bir JWT_SECRET nasıl oluşturulur

```bash
openssl rand -hex 32
# Çıktı: a8f3e9b2c1d4... gibi bir şey
# Bunu .env dosyanıza kopyalayın
```

---

## Mevcut yapılandırmanızı kontrol etme

```bash
# Mevcut .env'i görüntüleyin (çıktıyı paylaşırken dikkatli olun — sırlar içerir):
cat /opt/tesla-carview/backend/.env

# Çalışan konteynerin gördüğü ortam değişkenlerini kontrol edin:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml exec backend env | grep -v PASSWORD | grep -v SECRET
```

---

## Tam referans

Her ortam değişkeninin ayrıntılı açıklamalarıyla tam listesi için teknik belgelere bakın:
[docs/10-configuration.en.md](https://github.com/KnevS/Tesla-Carview/blob/main/docs/10-configuration.en.md)
