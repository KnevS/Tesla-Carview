# Güvenlik mimarisi

> 🤖 *Bu Türkçe çeviri [05-security-architecture.en.md](05-security-architecture.en.md) dosyasından yapay zeka destekli oluşturulmuştur. Düzeltmeler GitHub üzerinden memnuniyetle karşılanır.*

> 🇩🇪 [Auf Deutsch lesen](05-security-architecture.md)

## Tehdit modeli

Bu uygulama, kendi işlettiği bir sunucuda tek bir kullanıcının/hanenin
araç verisini korur. Ana tehditler şunlardır:

| Tehdit | Önlem |
|---|---|
| Web UI'ye yetkisiz erişim | JWT + MFA ile kullanıcı kimlik doğrulama |
| Girişe kaba kuvvet saldırısı | Rate limiting + hesap kilitleme |
| XSS yoluyla oturum hırsızlığı | Access token yalnızca RAM'de, localStorage yok |
| Cookie hırsızlığı (CSRF) | `SameSite=Strict` + JSON API (form submit yok) |
| Ortadaki adam (man-in-the-middle) | TLS 1.3, HSTS, OCSP stapling |
| Clickjacking | `X-Frame-Options: DENY` + CSP `frame-src 'none'` |
| DB sızıntısından veri kaybı | Parola hash'leri (Argon2id), token hash'leri (SHA-256), MFA kodları (bcrypt) **+ AES-256-GCM at-rest** Tesla token'ları, MFA secret'ı, Virtual Key private key için (aşağıda "At-rest şifreleme" başlığına bakın) |
| Yönetici markdown'ı (yasal sayfalar) üzerinden depolanmış XSS | `v-html`'den önce `DOMPurify`, etiket/öznitelik beyaz listesi, URL şemaları http(s)/mailto/tel ile sınırlı |
| IDOR (aynı tenant içinde kullanıcı A'nın kullanıcı B'nin verisini okuması) | Her değiştirici route'da `assertVehicleAccess`/`assertTripAccess`/`assertChargingAccess` helper'ları; yöneticiler tenant'ları içinde her şeyi görür, normal kullanıcılar yalnızca `vehicle_users` ile bağlı araçları görür |
| Kurulum yarışı ele geçirme (saldırgan ilk admini kaydeder) | Opsiyonel `SETUP_TOKEN` env kapısı (header `X-Setup-Token`) + rate limit + atomik check-then-write |
| Giriş sayfası üzerinden tenant numaralandırma | Giriş sayfasında gerçek isimler yerine takma adlar (özenle seçilmiş `sıfat-isim` havuzu) |
| Güncel olmayan bağımlılıklar | Repoda Dependabot uyarılarını etkinleştirin |

## At-rest şifreleme (2026-05'ten itibaren)

Backend'in çalışma zamanında plaintext'ine ihtiyaç duyduğu ve bu nedenle
hash'lenemeyen DB sütunları için iki yönlü şifreleme (AES-256-GCM):

| Veri | Tablo.sütun | Format |
|---|---|---|
| Tesla OAuth access token | `tokens.access_token` | `v1:iv:tag:ciphertext` |
| Tesla OAuth refresh token | `tokens.refresh_token` | `v1:iv:tag:ciphertext` |
| TOTP MFA secret'ı | `users.mfa_secret` | `v1:iv:tag:ciphertext` |
| Tesla Virtual Key private key (PEM) | `virtual_key.private_key_pem` | `v1:iv:tag:ciphertext` |

**Anahtar kaynakları (öncelik sırasıyla):**
1. `ENCRYPTION_KEY_B64` (ortam değişkeni, base64 kodlu 32 bayt) — önerilir; `data/` dışında yaşar. Üretmek için: `openssl rand -base64 32`
2. `/run/secrets/encryption_key` (Docker secret, 32 ham bayt)
3. `data/.encryption-key` (dosya, mod 0600) — yedek ve mevcut kurulumlar için; ilk başlatmada otomatik üretilir.

**Önemli:** Anahtarınız yedeğinize dahil edilmelidir. Anahtar olmadan Tesla bağlantıları, MFA kurulumları ve Virtual Key kalıcı olarak kaybolur.

ilk backend başlatmasında üretilir. **Yedeğinize dahil edin** — anahtar olmadan
Tesla bağlantıları, MFA kurulumları ve Virtual Key kurtarılamaz.

Yalnızca doğrulanan, asla yeniden oynatılmayan rastgele token'lar için
tek yönlü hash'lenmiş (SHA-256 + `timingSafeEqual`):

| Veri | Yöntem |
|---|---|
| Oturum refresh token'ları | SHA-256, ham değer yalnızca httpOnly cookie'sinde |
| Parola sıfırlama token'ları | SHA-256, `tenant_settings` içinde |

Uygulama: `backend/src/services/cryptoService.js`.

## Tenant güven sınırı

Çok kiracılı (multi-tenant) model, bir tenant'ı **bir güven grubu** olarak ele alır:

- Her tenant'ın izole bir SQLite veritabanı vardır (tenant'lar arası okuma mümkün değildir).
- Bir tenant içinde, **admin** rolü her aracı ve her kullanıcının verisini görür —
  tenant'ı yönetmek için gereklidir (araç atama, sıfırlama bağlantısı üretme,
  yasal onayları yönetme vb.).
- Normal **user** hesapları yalnızca `vehicle_users(vehicle_id, user_id)`
  tablosu aracılığıyla kendilerine bağlı araçları görür.
  `backend/src/middleware/vehicleAccess.js` içindeki IDOR helper'ları bunu
  her seyahat, şarj ve araç endpoint'inde uygular.

**Çok sürücülü haneler / şirketler için tavsiye:**

- Tüm sürücüler birbirine tamamen güveniyorsa (bir hane, aile filosu):
  herkesi bir tenant'a koyun, `vehicle_users` üzerinden her aracı her
  kullanıcıya atayın. Pratik.
- Sürücülerin birbirinin GPS / sürüş günlüğü kayıtlarını GÖRMEMESİ gerekiyorsa
  (bağımsız çalışanlar, sürücü başına vergi ile ilgili özel/iş ayrımı): her
  sürücüye **kendi tenant'ını** verin, her aracı ilgili tenant'a kaydedin.
  IDOR koruyucuları sınırı uygular.

Bir tenant içinde kasıtlı olarak ince taneli, öznitelik başına izin modeli
yoktur — bu karmaşıklık bunun yerine tenant sınırına yükseltilir.

## Kimlik doğrulama akışı

```
                    HTTPS
Tarayıcı  <-------------------  nginx (TLS sonlandırma)
                                   |
                               Docker ağı
                                   |
                              Express backend
                                   |
                              SQLite veritabanı
```

### Token yaşam döngüsü

```
Giriş         --> access token (15 dk, RAM)  +  refresh cookie (7g, httpOnly)
API isteği    --> Authorization: Bearer <access-token>
401           --> POST /api/auth/refresh  (cookie otomatik gönderilir)
                  --> yeni access token + yeni refresh cookie (rotasyon)
Çıkış         --> refresh token'ı DB'den sil + cookie'yi temizle
```

### Neden localStorage değil?

```
localStorage:  JavaScript tarafından okunabilir   -->  XSS token'ı çalabilir
Bellek (RAM):  yalnızca aktif sekme               -->  XSS token'ı kalıcı yapamaz
httpOnly cookie: JS'den okunamaz                  -->  XSS cookie'yi okuyamaz
```

## Parola hash'leme

**Argon2id** (v3.1.5'ten itibaren, OWASP 2024 önerisi):
- Parametreler: t=3 iterasyon, m=65536 (64 MB RAM), p=4 thread
- Bellek yoğun (memory-hard): GPU/ASIC kaba kuvvet bcrypt'ten önemli ölçüde daha pahalıdır
- Her hash rastgele bir salt içerir (rainbow-table koruması)
- `argon2.verify()` ile zamanlama güvenli karşılaştırma

**Geçiş:** Mevcut bcrypt hash'leri (12 round) bir sonraki başarılı girişte
şeffaf olarak Argon2id ile değiştirilir. Geçiş döneminde her iki format
da kabul edilir.

## MFA TOTP

- **Algoritma**: HMAC-SHA1 (RFC 4226)
- **Periyot**: 30 saniye
- **Tolerans**: ±1 periyot (60 sn'ye kadar saat sapması izin verilir)
- **Hane**: 6
- **Secret**: 20 rastgele bayt (160 bit entropi)

## nginx TLS yapılandırması

```nginx
# protokoller
ssl_protocols TLSv1.2 TLSv1.3;

# oturum bilet kapalı = sunucu anahtarı daha sonra ele geçirilse bile
# perfect forward secrecy korunur
ssl_session_tickets off;

# HSTS: tarayıcı HTTPS'i 2 yıl önbelleğe alır
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

## Content Security Policy (CSP)

```
default-src 'self'          # her şey yalnızca kendi alan adımızdan
script-src  'self'          # inline JS yok, eval() yok
style-src   'self' 'unsafe-inline'  # Tailwind inline style'a ihtiyaç duyar
img-src     'self' data: https://*.tile.openstreetmap.org  # harita karoları
connect-src 'self'          # yalnızca kendi API
object-src  'none'          # Flash yok, PDF okuyucu yok
frame-src   'none'          # iframe gömme yok
```

**Permissions-Policy** (v3.1.5'ten itibaren) — uygulamanın kullanmadığı tarayıcı API'lerini kilitler:
```
camera=(), microphone=(), geolocation=(), payment=(),
usb=(), bluetooth=(), display-capture=()
```

## Veritabanı şeması (güvenlikle ilgili tablolar)

```sql
users
  password_hash  -- Argon2id (eski bcrypt hash'leri girişte taşınır)
  mfa_secret     -- base32 kodlu (TOTP secret)
  locked_until   -- kilitleme zaman damgası

refresh_tokens
  token_hash     -- orijinal token'ın SHA-256'sı
  expires_at     -- otomatik sona erer

mfa_backup_codes
  code_hash      -- bcrypt, 10 round
  used           -- tek kullanımlık

audit_logs
  action         -- örn. login_success, mfa_enabled, password_changed
  ip_address     -- adli analiz için
```

## Deployment sonrası tavsiyeler

1. **Yönetici parolasını hemen değiştirin** (Ayarlar → Parola)
2. Tüm kullanıcılar için **MFA'yı etkinleştirin**
3. **Yedek kodları güvenle saklayın** (parola yöneticisi)
4. **Veritabanını düzenli olarak yedekleyin** (bkz. [02-deployment.en.md](./02-deployment.en.md))
5. Sunucuda parola yerine **SSH anahtar kimlik doğrulaması**
6. GitHub reposunda **Dependabot uyarılarını etkinleştirin**
7. **Logları düzenli inceleyin**: `docker logs tesla-carview-backend`
