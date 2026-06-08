# 🛠 İşletim

> 🤖 *Bu Türkçe çeviri [11-operations.en.md](11-operations.en.md) dosyasından yapay zeka destekli oluşturulmuştur. Düzeltmeler GitHub üzerinden memnuniyetle karşılanır.*

> 🇩🇪 [Auf Deutsch lesen](11-operations.md) · 👤 [Kullanıcı el kitabı](../frontend/src/handbook/handbook.en.md) · 🏠 [Doküman dizini](.)

Kendi sunucusunda barındıranlar için günlük işletim: yedekleme, geri yükleme, bakım, demo modu, güncelleme. Her eylem **yalnızca yöneticiye özeldir** ve audit-log'a kaydedilir.

---

## 💾 Yedekleme ve geri yükleme

### Yedek oluştur

**Web UI üzerinden (önerilir):**

1. Yönetici olarak giriş yap → **Admin → Veri yönetimi**
2. "💾 Tam yedekleme ve geri yükleme" kartı → **"⬇ Backup erstellen"** butonu
3. Bir JSON dosyası indirilir — dosya adı `tesla-carview-backup-<slug>-YYYY-MM-DD.json`

İçerik: aktif tenant DB'sinin 26 tablosunun tümü (araçlar, seyahatler + GPS noktaları, şarj seansları, telemetri, sürüş günlüğü, servis aralıkları, kullanıcılar, passkey credential'ları, audit log'ları, ayarlar, Tesla OAuth token'ları, Virtual Key, yasal onaylar, seyahat değişiklik geçmişi). Bilinçli olarak hariç tutulur: `push_subscriptions` (tarayıcıya özgü) ve `refresh_tokens` (bunlar `master.db`'de yaşar).

> **Passkey'ler**: `passkey_credentials` yedeğe dahil edilir. **Aynı sunucuya** geri yüklemeden sonra, kayıtlı passkey'ler hemen çalışır — `credential_id` sunucu tarafında saklanır ve `user_id` geri yükleme tarafından korunur. Farklı bir sunucuya veya alan adına geri yükleme passkey'lerin yeniden kaydını gerektirir (WebAuthn alan adına bağlıdır).

**CLI / cron üzerinden** (dış yedekleme stratejileri için):

```bash
# SQLite dosyalarını doğrudan yedekler — atomik, servis durdurma yok
docker compose -f docker-compose.prod.yml exec backend sh -c \
  "sqlite3 /app/data/master.db '.backup /app/data/backup-$(date +%F).db'"
docker cp tesla-carview-backend:/app/data/. /path/to/backup/
```

Önerilen: UI yedeğini dış bir diske de saklayın — tenant başına tek bir JSON dosyası taşınabilir ve sürüm kontrolüne tabi tutulabilir.

### Yedeği geri yükle

**Kullanım senaryosu:** yeni sistem kuruldu veya eski sistem karıştı. Önceki durumu geri getirin:

1. En az bir kez kurulum sihirbazını çalıştırın (admin hesabı oluşturun)
2. Yönetici olarak giriş yap → **Admin → Veri yönetimi → "⬆ Backup wiederherstellen…"**
3. JSON dosyasını seçin + onay metnini `WIEDERHERSTELLEN` yazın
4. "Jetzt wiederherstellen" → sunucu önce mevcut `.db` dosyasının **güvenlik yedeğini** oluşturur (yol başarı mesajında döner), sonra tüm tabloları boşaltır ve JSON'dan yeniden doldurur, hepsi **tek bir transaction içinde**, hata durumunda rollback yapılır
5. Çıkış yap + yeniden gir, tamam

### Geri yüklemedeki güvenlik katmanları

- `requireAdmin` middleware
- `WIEDERHERSTELLEN` onay cümlesi tam olarak yazılmalıdır
- Geri yüklemeden önce dosya düzeyinde yedek (`<dbname>_pre_restore_<timestamp>.db`)
- Sütun kesişimi: canlı şemada yeniden adlandırılmış bir sütun varsa, o sütun tüm içe aktarmayı öldürmek yerine atlanır
- Her yedekleme ve her geri yükleme için audit log girişi

---

## 🌙 Gecelik bakım

Her gün **03:30 ile 03:40 Europe/Berlin** arasında çalışır (`Intl.DateTimeFormat` üzerinden DST-güvenli). Her backend yeniden başlatmasında durur, 2 dakika backoff ile geri döner.

### Ne yapar

| Nerede | Görev |
|---|---|
| `master.db` | Süresi dolmuş `refresh_tokens`'ı sil |
| `master.db` | 24 sa'den eski `oauth_pkce` durumlarını sil |
| `master.db` | 30 g'den eski soft-revoke edilmiş tenant davetlerini sil |
| `master.db` | `VACUUM` + `wal_checkpoint(TRUNCATE)` |
| her `tenant.db` | 180 g'den eski `audit_logs`'u sil |
| her `tenant.db` | 30 g'den eski kullanılan/süresi dolmuş `user_invites`'ı sil |
| her `tenant.db` | `wal_checkpoint(TRUNCATE)` |
| her `tenant.db` | Yalnızca DB > 50 MB olduğunda `VACUUM` |
| her `tenant.db` | Sayımlarla `system_maintenance` denetim girişi |

### Manuel tetikleme

**UI:** Sistem → Sistem durumu → "🌙 Nächtliche Wartung" → **"Jetzt ausführen"**.

**API:**
```bash
curl -X POST https://carview.example.com/api/system/maintenance-now \
  -H "Authorization: Bearer $ADMIN_JWT"
```

### Son çalıştırmayı incele

```bash
curl https://carview.example.com/api/system/maintenance-log \
  -H "Authorization: Bearer $ADMIN_JWT" | jq
```

Sayımlar, süre ve hata durumu ile en son 50 çalıştırmaya kadar gösterir.

---

## ⬆️ Otomatik güncelleme (opt-in)

> ⚠️ **Varsayılan olarak kapalı.** Etkinleştirmek, sisteminizin geceleri `main`'den yeni commit'leri çekip container'ı yeniden oluşturduğu anlamına gelir. Önce `deploy/update.sh`'in kurulumunuzda sorunsuz çalıştığını doğrulayın.

### Etkinleştir

```bash
# backend/.env
AUTO_UPDATE_ENABLED=true
UPDATE_REPO_DIR=/opt/tesla-carview   # varsayılan zaten bu, farklıysa override edin
```

Sonra backend'i yeniden başlatın:
```bash
docker compose -f docker-compose.prod.yml up -d --build backend
```

### Gece ne olur

1. Yapılandırılmış repo yolunda `git fetch origin main`
2. `git rev-parse HEAD`'i `origin/main` ile karşılaştırır
3. Farklıysa: `bash deploy/update.sh` (10 dk timeout)
4. Yeniden oluşturma sırasında frontend otomatik olarak Tesla şakalarıyla **bakım örtüsünü** gösterir (bkz. `frontend/src/components/MaintenanceOverlay.vue`) — kullanıcılar pek fark etmez
5. Durum (yerel hash, uzak hash, güncelleme sonucu) bakım loguna iner

### İstediğin zaman manuel güncelleme

```bash
cd /opt/tesla-carview
bash deploy/update.sh
```

---

## 🧪 Demo modu

**Tesla'sı olmayan test kullanıcıları** için. Bunu yalnızca kendiniz için çalıştırıyorsanız, kapalı bırakın.

### Etkinleştir

```bash
# backend/.env
DEMO_ENABLED=true
```

Backend'i yeniden başlatın. İlk açılışta `demo` slug'lı ve `data/tenants/<uuid>.db` DB dosyasıyla ek bir tenant oluşturulur.

### Sıkı sınırlar (`routes/demo.js`'de kodlanmış)

| Sabit | Varsayılan | ENV değişkeni | Anlamı |
|---|---|---|---|
| `MAX_ACTIVE_DEMO_USERS` | `200` | `MAX_ACTIVE_DEMO_USERS` | Eşzamanlı test kullanıcıları. Dolduğunda HTTP 503. |
| `DEMO_SIGNUPS_PER_IP` | `2` / 24 sa | `DEMO_SIGNUPS_PER_IP` | IP başına 24sa penceresinde en fazla 2 kayıt |
| `DEMO_LIFETIME_DAYS` | `2` | `DEMO_LIFETIME_DAYS` | Hesap + tüm verisi 2 gün sonra silinir, kalıntı yok |

Üçü de ortam değişkeni üzerinden override edilebilir — `DEMO_ENABLED=true` ile özel bir örnek için `MAX_ACTIVE_DEMO_USERS=5` ve `DEMO_LIFETIME_DAYS=1` ayarlamayı düşünün.

### Test kullanıcılarının gördüğü

- Giriş sayfası boş slot sayısıyla mavi bir "🧪 Tesla Carview ausprobieren — ohne Tesla" kartı gösterir
- Tek tık → kullanıcı `tester-<hex>` oluşturulur, giriş yapılır, sahte araç + 3 hafta geçmiş tohumlanır
- Uygulamanın üstünde banner: "Demo-Modus — Konto und Daten werden am DD.MM.YYYY automatisch gelöscht (X Tage übrig)"
- Gizlilik ve şartlar sayfaları otomatik olarak bir **test kullanıcısı ekini** gösterir (SLA yok, destek yok, sahte veri, `DEMO_LIFETIME_DAYS` gün sonra silme)
- Her 30 dk: demo araç başına yeni bir sahte seyahat — böylece demo canlı hissedilir

### Temizlik

- Her 6 saatte bir demo yaşam döngüsü çalışır: `expires_at < now` olan kullanıcılar tek bir transaction'da silinir, her bağımlı tabloyla birlikte (araçlar, seyahatler, GPS noktaları, şarj, batarya, telemetri, sürüş günlüğü, MFA kodları, audit log'ları, şarj konumları, servis aralıkları)
- Demo tenant'ı kendisi kalır — yalnızca test kullanıcı verileri silinir
- **İzolasyon**: demo slug'ı `localStorage`'a **asla** yazılmaz — tarayıcı sekmesini kapatıp üretim URL'sini yeniden açan bir test kullanıcısı yanlışlıkla demo tenant'ına düşmez

---

## 🛡️ İzleme ve self-healing

Bir cron işi (`/opt/monitoring/bin/heal.sh`) her 15 dakikada bir çalışır ve temel servisleri izler:

1. **Container durumu** — `docker inspect`'i `tesla-carview-backend`, `-frontend` ve `-nginx` için inceler; bir container `running` durumunda değilse `docker compose up -d <service>` ile yeniden başlatılır.
2. **Health endpoint'i** — tüm container'lar çalışıyorsa `GET /api/health`'i kontrol eder; yanıt `{"status":"ok"}` değilse backend container'ı yeniden başlatılır.
3. **E-posta uyarı** — her otomatik yeniden başlatmanın ardından yapılandırılmış adrese bir bildirim e-postası gönderilir (ayarlıysa).
4. **Log rotation** — `/var/log/tcv-heal.log` 1 MB'ı aştığında otomatik olarak son 500 satıra kısaltılır.

**Yapılandırma** (Admin → Sistem → İzleme ve self-healing):

| Ayar | Açıklama |
|---|---|
| Self-healing açık/kapalı | DB anahtarı `monitoring.heal_enabled`; `false` ayarlandığında cron işi hemen çıkar |
| Uyarı e-postası | DB anahtarı `monitoring.alert_email`; boş = uyarı yok |

**API endpoint'leri** (yalnızca admin):
- `GET /api/system/monitoring-config` — mevcut yapılandırmayı okur
- `PUT /api/system/monitoring-config` — yapılandırmayı kaydeder
- `GET /api/system/monitoring-log?lines=50` — heal ve güvenlik loglarından son N satırı döner

**Logları manuel inceleyin:**
```bash
tail -50 /var/log/tcv-heal.log
tail -50 /var/log/security-check.log
```

**Cron girişi** (`/etc/cron.d/tesla-carview-monitoring`):
```
*/15 * * * * root /opt/monitoring/bin/heal.sh >/dev/null 2>&1
```

---

## 📊 Bir bakışta sistem sağlığı

UI: **Admin → Sistem** → yönetici en üstte renkli bir trafik ışığı kartı görür. Backend endpoint'i: `GET /api/system/health` (yalnızca admin). Kontroller:

| Kontrol | Yeşil | Sarı | Kırmızı | Bilgi (soluk) |
|---|---|---|---|---|
| Tesla OAuth token | geçerli, > 7g kaldı | < 7g kaldı | süresi dolmuş veya eksik | — |
| Virtual Key | oluşturuldu | — | oluşturulmadı | — |
| Fleet Telemetry | son veri noktası < 24 sa | < 7 g | hiçbir şey veya > 7 g | — |
| Tesla poller | son poll < 60 dk | < 1 g | — | — |
| Tenant DB | bilgi amaçlı — MB cinsinden boyut | — | — | — |
| Gecelik bakım | son çalıştırma < 25 sa | — | — | — |
| OpenChargeMap | canlı sonda OK | — | sonda başarısız (anahtar var) | anahtar yapılandırılmadı |
| HERE Maps | canlı sonda OK | — | sonda başarısız (anahtar var) | anahtar yapılandırılmadı |

Opsiyonel servisler (OCM, HERE) yalnızca bir anahtar yapılandırılmış ancak endpoint yanıt vermediğinde hata olarak sayılır. Anahtar olmadan: `info` durumu, soluk, genel trafik ışığı rengine etkisi yok.

---

## 🔍 Loglara bakmak

**Container logları:**
```bash
docker compose -f docker-compose.prod.yml logs -f --tail 200 backend
```

**Audit log** (tenant başına güvenlikle ilgili etkinlikler):
- UI: **Admin → Audit log** filtreler ile (eylem, kullanıcı kimliği, tarih) ve CSV export
- API: `GET /api/audit` (yalnızca admin)

**Bakım logu** (son gecelik çalıştırmalar):
- UI: Sistem → "🌙 Nächtliche Wartung" → ayrıntılar
- API: `GET /api/system/maintenance-log` (yalnızca admin)

---

## 🚨 Acil durum: veritabanı sıfırlama

Her şey alev aldığında ve yalnızca temiz bir yeniden başlatma çare olduğunda:

```bash
# 1. ÖNCE bir yedek alın (yukarıya bakın)
# 2. Container'ları durdurun
docker compose -f docker-compose.prod.yml down

# 3. Veri dizinini temizleyin — TÜM VERİLER GİDER
# Veri bind-mount ./data içinde yaşar (Docker named volume'da DEĞİL!)
rm -rf ./data/master.db ./data/tenants/

# 4. Sıfırdan başlayın — kurulum sihirbazı otomatik görünür
docker compose -f docker-compose.prod.yml up -d
```

> v2.0'dan beri SQLite veritabanları `./data` altında bind-mount olarak yaşar (Compose dosyasına göre), Docker named volume içinde **değil**. `docker volume rm` bu kurulumda etkisizdir.

Daha sonra bir yedeği geri yüklemek için, geçici bir admin hesabıyla kurulum sihirbazını tamamlayın, giriş yapın ve UI geri yükleme akışını kullanın.

---

## Ayrıca bakın

- [01-quickstart.en.md](01-quickstart.en.md) — ilk kurulum
- [02-deployment.en.md](02-deployment.en.md) — üretim deployment'ı
- [10-configuration.en.md](10-configuration.en.md) — tüm ortam değişkenleri
- [05-security-architecture.en.md](05-security-architecture.en.md) — güvenlik modeli
