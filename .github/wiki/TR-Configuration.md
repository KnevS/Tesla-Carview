🌐 **Dil:** [EN](Configuration) · [DE](DE-Configuration) · [FR](FR-Configuration) · [ES](ES-Configuration) · **TR** · [EL](EL-Configuration)

---

# Yapılandırma — Ortam Değişkenleri

Tüm Tesla Carview ayarları `/opt/tesla-carview/backend/.env` adresindeki `.env` dosyası aracılığıyla yapılandırılır.

`.env`'deki herhangi bir değişiklikten sonra backend'i yeniden başlat:
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d --build backend
```

---

## Gerekli ayarlar (uygulamanın çalışması için ayarlanmalı)

| Değişken | Örnek | Açıklama |
|---|---|---|
| `JWT_SECRET` | `some-random-64-char-string` | Giriş token'larını imzalamak için gizli anahtar. Şununla oluştur: `openssl rand -hex 32` |
| `TESLA_CLIENT_ID` | `abc123...` | Tesla Developer Portal'dan |
| `TESLA_CLIENT_SECRET` | `xyz789...` | Tesla Developer Portal'dan |
| `FRONTEND_URL` | `https://tesla.alaninadın.com` | Kurulumunun genel URL'si |
| `DATABASE_PATH` | `/app/data` | Veritabanlarının depolandığı yer (Docker'da değiştirme) |

---

## İsteğe bağlı ama önerilen

| Değişken | Varsayılan | Açıklama |
|---|---|---|
| `AUTO_UPDATE_ENABLED` | `false` | Gecelik otomatik güncellemeler için `true` olarak ayarla |
| `MFA_REQUIRED_FOR_NEW_USERS` | `false` | Tüm yeni kullanıcı hesapları için MFA kurulumunu zorla |
| `REGISTRATION_REQUIRES_INVITE` | `false` | Yeni kiracı kaydı için davet kodu gereksin |
| `POLL_INTERVAL_MS` | `60000` | Araç aktifken Tesla API'sini ne sıklıkta sorgula (ms) |
| `POLL_SLEEP_INTERVAL_MS` | `600000` | Araç uyurken sorgulama aralığı (ms) |

---

## Dinamik tarife (elektrik fiyatlandırması)

| Değişken | Açıklama |
|---|---|
| `AWATTAR_ENABLED` | `true`/`false` — aWATTar'ı etkinleştir (DE/AT, ücretsiz) |
| `TIBBER_TOKEN` | Tibber API token'ın (şuradan al: [developer.tibber.com](https://developer.tibber.com)) |

---

## Demo modu

| Değişken | Varsayılan | Açıklama |
|---|---|---|
| `DEMO_ENABLED` | `false` | Sahte verilerle genel demo kiracısını etkinleştir |
| `DEMO_MAX_CONCURRENT` | `10` | Maksimum eş zamanlı demo kullanıcısı |
| `DEMO_LIFETIME_DAYS` | `14` | Demo hesaplarının ne kadar süreceği |

---

## Gelişmiş / Fleet Telemetry

| Değişken | Açıklama |
|---|---|
| `FLEET_TELEMETRY_ENABLED` | `true`/`false` — Fleet Telemetry aracılığıyla gerçek zamanlı GPS'i etkinleştir |
| `FLEET_TELEMETRY_PORT` | Fleet Telemetry sunucusu için port (varsayılan: 4443) |
| `VIRTUAL_KEY_PRIVATE_KEY_PATH` | Virtual Key özel anahtar dosyasının yolu |

---

## Güvenli JWT_SECRET nasıl oluşturulur

```bash
openssl rand -hex 32
# Çıktı: a8f3e9b2c1d4... gibi bir şey
# Bunu .env dosyana kopyala
```

---

## Mevcut yapılandırmayı kontrol et

```bash
# Mevcut .env'yi görüntüle (çıktıyı paylaşırken dikkatli ol — sırlar içerir):
cat /opt/tesla-carview/backend/.env

# Çalışan konteynerin gördüğü ortam değişkenlerini kontrol et:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml exec backend env | grep -v PASSWORD | grep -v SECRET
```

---

## Tam referans

Ayrıntılı açıklamalar içeren tüm ortam değişkenlerinin tam listesi için teknik belgelere bak:
[docs/10-configuration.en.md](https://github.com/KnevS/Tesla-Carview/blob/main/docs/10-configuration.en.md)
