🌐 **Dil:** [EN](Security) · [DE](DE-Security) · [FR](FR-Security) · [ES](ES-Security) · **TR** · [EL](EL-Security)

---

# Güvenlik — Kimlik Doğrulama, MFA ve En İyi Uygulamalar

Tesla Carview hassas verileri yönetir: araç konumu, şarj geçmişi ve arabana kontrol komutları. Bu sayfa nasıl güvence altına alındığını ve kurulumunu güvende tutmak için **senin** ne yapman gerektiğini açıklar.

---

## Giriş seçenekleri

### 1. Kullanıcı adı + Şifre (standart)
- Şifre bcrypt ile hashlenir (maliyet faktörü 12)
- Başarısız girişler hız sınırlamasına tabidir: 5 başarısız denemeden sonra hesap 15 dakika kilitlenir
- Tüm giriş olayları denetim günlüğüne kaydedilir

**İyi şifre uygulamaları:**
- Bir şifre cümlesi kullan: `Güneş-Dağ-Araba-Kahve` (4+ kelime, hatırlaması kolay, kırılması zor)
- Minimum 12 karakter — ne kadar uzunsa o kadar iyi
- Diğer hizmetlerdeki şifreleri yeniden kullanma
- Bir şifre yöneticisi kullan (Bitwarden, 1Password, KeePass)

### 2. Passkey (şifresiz, önerilen)
Passkey'ler bir şifre yerine cihazın biyometrisini (parmak izi, Face ID) kullanır. Kimlik avına karşı dirençli ve çok daha güvenli.

Kurulum:
1. **Ayarlar → Güvenlik → Passkey Ekle**
2. Tarayıcın biyometrik bir istem açar — parmak veya yüzünle onayla
3. Bitti — artık yalnızca biyometrin ile giriş yapabilirsin

Passkey'ler şu platformlarda çalışır:
- Mac (Touch ID)
- iPhone/iPad (Face ID / Touch ID)
- Android (parmak izi)
- Windows (Windows Hello)
- Donanım anahtarları (YubiKey)

> ⚠️ Tesla araç tarayıcısı passkey'leri desteklemiyor. Arabada kullanıcı adı + şifre kullan ve "Oturumumu açık tut"u işaretle.

### 3. MFA / İki Faktörlü Kimlik Doğrulama (TOTP)
Bir kimlik doğrulama uygulamasıyla ekstra güvenlik katmanı ekle:
1. **Ayarlar → Güvenlik → MFA'yı Etkinleştir**
2. QR kodunu Google Authenticator, Authy, Bitwarden veya benzeriyle tara
3. Onaylamak için 6 haneli kodu gir

Kurulumdan sonra: her giriş şifreni + 6 haneli kodu gerektirir.

**Adminler tüm kullanıcılar için MFA zorunlu kılabilir:**
```env
# .env — tüm yeni kullanıcılar için MFA'yı zorla:
MFA_REQUIRED_FOR_NEW_USERS=true
```

---

## Oturum güvenliği

| Ayar | Değer |
|---|---|
| Erişim token ömrü | 15 dakika (kısa ömürlü) |
| Yenileme token — standart | 7 gün |
| Yenileme token — "Oturumumu açık tut" | 90 gün |
| Yenileme token depolama | `httpOnly`, `Secure`, `SameSite=Lax` çerez |
| Token rotasyonu | Her kullanımda yeni yenileme token |

Token'lar SHA-256 hash'leri olarak depolanır — düz metin asla veritabanına dokunmaz.

---

## Sunucun için IT güvenlik en iyi uygulamaları

Tesla Carview'in yerleşik güvenliğinin ötesinde, sunucunun da korunması gerekir.

### 🔒 SSH sertleştirme

**Şifre kimlik doğrulamasını devre dışı bırak — yalnızca anahtar kullan:**

```bash
# YEREL bilgisayarında bir anahtar çifti oluştur:
ssh-keygen -t ed25519 -C "tesla-server"

# Genel anahtarı sunucuya kopyala:
ssh-copy-id -i ~/.ssh/id_ed25519.pub root@SUNUCU-IP'N

# Sunucuda, şifre kimlik doğrulamasını devre dışı bırak:
nano /etc/ssh/sshd_config
```
Bu satırları değiştir:
```
PasswordAuthentication no
PermitRootLogin prohibit-password
PubkeyAuthentication yes
```
```bash
systemctl restart sshd
```

> ⚠️ Mevcut SSH oturumunu kapatmadan önce anahtar tabanlı girişin çalıştığını **test et**.

**Varsayılan SSH portunu değiştir (isteğe bağlı, log gürültüsünü azaltır):**
```bash
# /etc/ssh/sshd_config'de:
Port 2222    # Herhangi bir standart dışı port

# Güvenlik duvarını güncelle:
ufw allow 2222/tcp
ufw delete allow 22/tcp
systemctl restart sshd
```

### 🔥 Güvenlik Duvarı (UFW)

Kurulum betiği UFW'yi otomatik olarak yapılandırır. Doğru olduğunu doğrula:

```bash
ufw status verbose
```

Şunu göstermeli:
```
Status: active
To                         Action      From
--                         ------      ----
22/tcp (veya SSH portun)   ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
```

Diğer her şeyi engelle — başka hiçbir port kamuya açık olmamalı.

### 🛡️ Fail2ban (kaba kuvvet koruması)

Fail2ban, SSH veya web girişlerinde tekrar tekrar başarısız olan IP'leri otomatik olarak yasaklar. Kurulum betiği onu kurar ve yapılandırır.

Durumu kontrol et:
```bash
fail2ban-client status
fail2ban-client status sshd
fail2ban-client status nginx-http-auth
```

Bir IP'nin yasağını kaldır (kendini kitlelediysen):
```bash
fail2ban-client set sshd unbanip IP'N
```

### 🔄 Her şeyi güncel tut

**İşletim sistemi için otomatik güncellemeler:**
```bash
apt install unattended-upgrades -y
dpkg-reconfigure unattended-upgrades  # Evet'i seç
```

**Tesla Carview için otomatik güncellemeler:**
```env
# /opt/tesla-carview/backend/.env'de:
AUTO_UPDATE_ENABLED=true
```

Etkinleştirilmişse güncellemeler her gece 03:30'da (Europe/Berlin) çalışır.

**Docker image güncellemeleri:**
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml pull
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d
```

### 🌐 HTTPS ve sertifika yenileme

Let's Encrypt sertifikaları 90 günde bir sona erer ve kurulum betiği tarafından kurulan bir cron job aracılığıyla otomatik olarak yenilenir.

Sertifika durumunu kontrol et:
```bash
certbot certificates
```

Yenilemeyi test et (simülasyon, değişiklik yok):
```bash
certbot renew --dry-run
```

Gerekirse yenilemeyi zorla:
```bash
certbot renew --force-renewal
systemctl restart nginx
```

### 🔑 `.env` dosyanı koru

`.env` dosyan Tesla Client ID, Client Secret ve JWT sırrını içerir. Asla şunlar olmamalı:
- Git'e yüklenmemeli (`.gitignore`'da — bunu geçersiz kılma)
- Kamuya açık yapılmamalı
- Ekran görüntülerinde veya destek isteklerinde paylaşılmamalı

```bash
# İzinleri kontrol et — 600 olmalı (yalnızca sahip okuma/yazma):
ls -la /opt/tesla-carview/backend/.env

# Yanlışsa düzelt:
chmod 600 /opt/tesla-carview/backend/.env
```

### 📝 Denetim günlüğü

Tesla Carview tüm hassas eylemleri kaydeder:
- Giriş denemeleri (başarı ve başarısızlık)
- Hesap kilitlemeleri
- Şifre değişiklikleri
- Araç komut çalıştırmaları
- Veri silmeleri
- Admin eylemleri

Görüntüle: **Admin → Denetim Günlüğü**

Analiz için dışa aktar: **Admin → Denetim Günlüğü → CSV'ye Aktar**

---

## Güvenlik başlıkları

Tesla Carview'in nginx yapılandırması modern güvenlik başlıklarını içerir:
- `Content-Security-Policy` (CSP) — XSS'i önler
- `Strict-Transport-Security` (HSTS) — HTTPS'yi zorlar
- `X-Frame-Options: DENY` — clickjacking'i önler
- `X-Content-Type-Options: nosniff`
- `Permissions-Policy` — tarayıcı özelliklerini kısıtlar

Başlıklarını kontrol et: [securityheaders.com](https://securityheaders.com)

---

## Güvenlik açığı bildirme

Bir güvenlik sorunu buldun mu? Lütfen sorumlu bir şekilde bildir:
- Herkese açık bir GitHub sorunu **açma**
- E-posta: depodaki [SECURITY.md](https://github.com/KnevS/Tesla-Carview/blob/main/SECURITY.md) dosyasına bak
- 48 saat içinde yanıt vermeyi hedefliyoruz

---

## Yeni kurulumlar için güvenlik kontrol listesi

- [ ] SSH anahtar tabanlı kimlik doğrulama etkin, şifre kimlik doğrulaması devre dışı
- [ ] Güvenlik duvarı aktif (UFW), yalnızca 22/80/443 portları açık
- [ ] Fail2ban çalışıyor
- [ ] Güçlü admin şifresi (16+ karakter veya şifre cümlesi)
- [ ] Admin hesabı için MFA etkin
- [ ] `.env` dosyası izinleri 600 olarak ayarlanmış
- [ ] Otomatik güncellemeler etkin (İşletim sistemi + Tesla Carview)
- [ ] Düzenli yedeklemeler yapılandırılmış (bkz. [Yedekleme ve Geri Yükleme](TR-Backup-and-Restore))
- [ ] Denetim günlüğü periyodik olarak incelendi
