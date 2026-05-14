# Güvenlik — Kimlik Doğrulama, MFA ve BT En İyi Uygulamaları

Tesla Carview hassas verileri işler: araç konumu, şarj geçmişi ve arabanıza gönderilen kontrol komutları. Bu sayfa, bunların nasıl güvence altına alındığını ve kurulumunuzu güvende tutmak için **sizin** ne yapmanız gerektiğini açıklar.

---

🌐 **Language / Sprache / Langue / Idioma / Dil / Γλώσσα**

| | |
|---|---|
| 🇬🇧 **[English](Security)** | English version |
| 🇩🇪 **[Deutsch](DE-Security)** | Deutsche Version |
| 🇫🇷 **[Français](FR-Security)** | Version française |
| 🇪🇸 **[Español](ES-Security)** | Versión en español |
| 🇹🇷 **[Türkçe](TR-Security)** | Buradasınız |
| 🇬🇷 **[Ελληνικά](EL-Security)** | Ελληνική έκδοση |

---

## Giriş seçenekleri

### 1. Kullanıcı Adı + Şifre (standart)
- Şifre bcrypt ile hashlenir (maliyet faktörü 12)
- Başarısız girişler oran sınırlandırmasına tabidir: 5 başarısız denemeden sonra hesap 15 dakika kilitlenir
- Tüm giriş olayları denetim günlüğüne kaydedilir

**İyi şifre uygulamaları:**
- Bir parola cümlesi kullanın: `Güneş-Dağ-Araba-Kahve` (4+ kelime, hatırlaması kolay, kırması zor)
- En az 12 karakter — daha uzun daha iyidir
- Diğer hizmetlerden şifre yeniden kullanmayın
- Bir şifre yöneticisi kullanın (Bitwarden, 1Password, KeePass)

### 2. Geçiş Anahtarları (şifresiz, önerilen)
Geçiş anahtarları, şifre yerine cihazınızın biyometrisini (parmak izi, Face ID) kullanır. Kimlik avına karşı dayanıklıdır ve çok daha güvenlidir.

Kurulum:
1. **Ayarlar → Güvenlik → Geçiş Anahtarı Ekle**
2. Tarayıcınız bir biyometrik istem açar — parmak veya yüzle onaylayın
3. Tamamlandı — artık yalnızca biyometriğinizle giriş yapabilirsiniz

Geçiş anahtarları şunlarda çalışır:
- Mac (Touch ID)
- iPhone/iPad (Face ID / Touch ID)
- Android (parmak izi)
- Windows (Windows Hello)
- Donanım anahtarları (YubiKey)

> ⚠️ Tesla araç tarayıcısı geçiş anahtarlarını desteklemez. Araçta "Oturumu açık tut" seçeneğiyle kullanıcı adı + şifre kullanın.

### 3. MFA / İki Faktörlü Kimlik Doğrulama (TOTP)
Bir doğrulayıcı uygulamayla ekstra bir güvenlik katmanı ekleyin:
1. **Ayarlar → Güvenlik → MFA'yı Etkinleştir**
2. QR kodu Google Authenticator, Authy, Bitwarden veya benzer uygulamayla tarayın
3. Onaylamak için 6 haneli kodu girin

Kurulumdan sonra: her giriş şifrenizi + 6 haneli kodu gerektirir.

**Yöneticiler tüm kullanıcılar için MFA'yı zorunlu kılabilir:**
```env
# .env — tüm yeni kullanıcılar için MFA'yı zorlar:
MFA_REQUIRED_FOR_NEW_USERS=true
```

---

## Oturum güvenliği

| Ayar | Değer |
|---|---|
| Erişim token'ı ömrü | 15 dakika (kısa ömürlü) |
| Yenileme token'ı — standart | 7 gün |
| Yenileme token'ı — "Oturumu açık tut" | 90 gün |
| Yenileme token'ı depolama | `httpOnly`, `Secure`, `SameSite=Lax` çerezi |
| Token rotasyonu | Her kullanımda yeni yenileme token'ı |

Token'lar SHA-256 hash'leri olarak saklanır — düz metin asla veritabanına ulaşmaz.

---

## Sunucunuz için BT güvenlik en iyi uygulamaları

Tesla Carview'un yerleşik güvenliğinin ötesinde, sunucunuzun da korunması gerekir.

### 🔒 SSH sertleştirme

**Şifre kimlik doğrulamasını devre dışı bırakın — yalnızca anahtar kullanın:**

```bash
# YEREL bilgisayarınızda bir anahtar çifti oluşturun:
ssh-keygen -t ed25519 -C "tesla-server"

# Genel anahtarı sunucuya kopyalayın:
ssh-copy-id -i ~/.ssh/id_ed25519.pub root@YOUR-SERVER-IP

# Sunucuda şifre kimlik doğrulamasını devre dışı bırakın:
nano /etc/ssh/sshd_config
```
Bu satırları değiştirin:
```
PasswordAuthentication no
PermitRootLogin prohibit-password
PubkeyAuthentication yes
```
```bash
systemctl restart sshd
```

> ⚠️ Mevcut SSH oturumunuzu kapatmadan önce anahtar tabanlı girişin çalıştığını **test edin**.

**Varsayılan SSH portunu değiştirin (isteğe bağlı, günlük gürültüsünü azaltır):**
```bash
# /etc/ssh/sshd_config dosyasında:
Port 2222    # Herhangi bir standart dışı port

# Güvenlik duvarını güncelleyin:
ufw allow 2222/tcp
ufw delete allow 22/tcp
systemctl restart sshd
```

### 🔥 Güvenlik Duvarı (UFW)

Kurulum betiği UFW'yi otomatik olarak yapılandırır. Doğru olduğunu kontrol edin:

```bash
ufw status verbose
```

Şunu göstermelidir:
```
Status: active
To                         Action      From
--                         ------      ----
22/tcp (veya SSH portunuz) ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
```

Geri kalanını engelleyin — başka hiçbir port kamuya açık olmamalıdır.

### 🛡️ Fail2ban (kaba kuvvet koruması)

Fail2ban, SSH veya web girişlerini defalarca başarısız deneyen IP'leri otomatik olarak engeller. Kurulum betiği onu yükler ve yapılandırır.

Durumu kontrol edin:
```bash
fail2ban-client status
fail2ban-client status sshd
fail2ban-client status nginx-http-auth
```

Bir IP'nin engelini kaldırın (kendinizi kilitlediyseniz):
```bash
fail2ban-client set sshd unbanip YOUR-IP
```

### 🔄 Her şeyi güncel tutun

**İşletim sistemi için otomatik güncellemeler:**
```bash
apt install unattended-upgrades -y
dpkg-reconfigure unattended-upgrades  # Evet'i seçin
```

**Tesla Carview için otomatik güncellemeler:**
```env
# /opt/tesla-carview/backend/.env dosyasında:
AUTO_UPDATE_ENABLED=true
```

Etkinleştirilmişse güncellemeler her gece 03:30'da (Europe/Berlin) çalışır.

**Docker image güncellemeleri:**
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml pull
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d
```

### 🌐 HTTPS ve sertifika yenileme

Let's Encrypt sertifikaları her 90 günde bir sona erer ve kurulum betiğinin ayarladığı bir cron job aracılığıyla otomatik olarak yenilenir.

Sertifika durumunu kontrol edin:
```bash
certbot certificates
```

Yenilemeyi test edin (deneme çalışması, değişiklik yok):
```bash
certbot renew --dry-run
```

Gerekirse yenilemeyi zorla:
```bash
certbot renew --force-renewal
systemctl restart nginx
```

### 🔑 `.env` dosyanızı koruyun

`.env` dosyanız Tesla Client ID, Client Secret ve JWT sırrını içerir. Şunlar kesinlikle olmamalıdır:
- Git'e commit edilmek (`.gitignore`'da yer alır — bunu geçersiz kılmayın)
- Kamuya açık hale getirilmek
- Ekran görüntülerinde veya destek taleplerinizde paylaşılmak

```bash
# İzinleri kontrol edin — 600 olmalıdır (yalnızca sahip okuma/yazma):
ls -la /opt/tesla-carview/backend/.env

# Yanlışsa düzeltin:
chmod 600 /opt/tesla-carview/backend/.env
```

### 📝 Denetim günlüğü

Tesla Carview tüm hassas eylemleri kaydeder:
- Giriş denemeleri (başarılı ve başarısız)
- Hesap kilitlemeleri
- Şifre değişiklikleri
- Araç komutu çalıştırmaları
- Veri silme işlemleri
- Yönetici eylemleri

Şuradan görüntüleyin: **Yönetici → Denetim Günlüğü**

Analiz için dışa aktarın: **Yönetici → Denetim Günlüğü → CSV'ye Aktar**

---

## Güvenlik başlıkları

Tesla Carview'un nginx yapılandırması modern güvenlik başlıkları içerir:
- `Content-Security-Policy` (CSP) — XSS'yi önler
- `Strict-Transport-Security` (HSTS) — HTTPS'yi zorunlu kılar
- `X-Frame-Options: DENY` — tıklama hırsızlığını önler
- `X-Content-Type-Options: nosniff`
- `Permissions-Policy` — tarayıcı özelliklerini kısıtlar

Başlıklarınızı kontrol edin: [securityheaders.com](https://securityheaders.com)

---

## Güvenlik açığı bildirme

Bir güvenlik sorunu mu buldunuz? Lütfen sorumlu şekilde bildirin:
- Kamuya açık bir GitHub sorunu **açmayın**
- E-posta: depodaki [SECURITY.md](https://github.com/KnevS/Tesla-Carview/blob/main/SECURITY.md) dosyasına bakın
- 48 saat içinde yanıt vermeyi hedefliyoruz

---

## Yeni kurulumlar için güvenlik kontrol listesi

- [ ] SSH anahtar tabanlı kimlik doğrulama etkinleştirildi, şifre kimlik doğrulaması devre dışı
- [ ] Güvenlik duvarı aktif (UFW), yalnızca 22/80/443 portları açık
- [ ] Fail2ban çalışıyor
- [ ] Güçlü yönetici şifresi (16+ karakter veya parola cümlesi)
- [ ] Yönetici hesabı için MFA etkinleştirildi
- [ ] `.env` dosya izinleri 600 olarak ayarlandı
- [ ] Otomatik güncellemeler etkinleştirildi (İşletim sistemi + Tesla Carview)
- [ ] Düzenli yedeklemeler yapılandırıldı (bkz. [Yedekleme ve Geri Yükleme](Backup-and-Restore))
- [ ] Denetim günlüğü periyodik olarak incelendi
