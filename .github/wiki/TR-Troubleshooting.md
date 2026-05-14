# Sorun Giderme

En yaygın sorunlara çözümler. En olası nedenle başlayıp aşağıya doğru ilerleyin.

---

🌐 **Language / Sprache / Langue / Idioma / Dil / Γλώσσα**

| | |
|---|---|
| 🇬🇧 **[English](Troubleshooting)** | English version |
| 🇩🇪 **[Deutsch](DE-Troubleshooting)** | Deutsche Version |
| 🇫🇷 **[Français](FR-Troubleshooting)** | Version française |
| 🇪🇸 **[Español](ES-Troubleshooting)** | Versión en español |
| 🇹🇷 **[Türkçe](TR-Troubleshooting)** | Buradasınız |
| 🇬🇷 **[Ελληνικά](EL-Troubleshooting)** | Ελληνική έκδοση |

---

## 🚫 Uygulamaya hiç erişilemiyor

### Kontrol: Sunucu çalışıyor mu?

```bash
# Konteyner durumunu kontrol edin:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml ps

# Tüm konteynerler "Up" olarak görünmelidir:
# tesla-carview-backend    Up
# tesla-carview-frontend   Up
# tesla-carview-nginx      Up
```

Herhangi bir konteyner "Exit" veya "Restarting" gösteriyorsa:
```bash
# Sorunlu konteynerin loglarını görüntüleyin:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs backend
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs nginx
```

Her şeyi yeniden başlatın:
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d
```

### Kontrol: Alan adı doğru çözümleniyor mu?

```bash
nslookup tesla.yourdomain.com
# Sunucunuzun IP adresini göstermelidir

# Ya da tarayıcınızdan: https://dnschecker.org adresini ziyaret edin
```

DNS çözümlenmiyorsa → DNS kayıtlarını değiştirdikten sonra 10–30 dakika bekleyin.

### Kontrol: Güvenlik duvarı erişimi engelliyor mu?

```bash
ufw status
# 80 ve 443 portları ALLOW göstermelidir
```

Eksikse:
```bash
ufw allow 80/tcp
ufw allow 443/tcp
```

---

## 🔴 "502 Bad Gateway" veya "503 Service Unavailable"

Bu, nginx'in çalıştığı ancak arka ucun yanıt vermediği anlamına gelir.

```bash
# Arka ucu kontrol edin:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs backend --tail=50
```

Yaygın neden: başlatma hatası nedeniyle arka uç çöktü. Genellikle eksik bir `.env` değişkeni veya veritabanı izin sorunu.

Veritabanı izinlerini düzeltin:
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml down
chown -R 1000:1000 /var/lib/docker/volumes/tesla_data/
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d
```

---

## 🔒 SSL/HTTPS hataları ("Certificate not valid", "NET::ERR_CERT_EXPIRED")

Let's Encrypt sertifikası sona ermiş veya doğru şekilde verilmemiş.

```bash
# Sertifika durumunu kontrol edin:
certbot certificates

# Manuel olarak yenileyin:
certbot renew --force-renewal
systemctl restart nginx
```

certbot yenileyemiyorsa (DNS çözümlenmiyorsa, port 80 engelleniyorsa):
1. Güvenlik duvarınızda VE yönlendiricinizde (port yönlendirme) port 80'in açık olduğunu kontrol edin
2. Alan adınızın DNS'inin sunucunuzun IP'sini gösterdiğini kontrol edin

---

## 🚗 Araç veri göstermiyor / "çevrimdışı" görünüyor

### Tesla API bağlı değil
→ **Yönetici → Sistem → Sistem Sağlığı** bölümünü kontrol edin — "Tesla Token" bölümü bağlantı durumunu gösterir.

Süresi dolmuşsa: **Yönetici → Sistem → Tesla Hesabını Yeniden Bağla**

### Araç uyku modunda
Tesla araçlar 15–30 dakika hareketsizlik sonrasında uyur. Uygulama arabanın uyanmasını bekler. Manuel olarak uyandırabilirsiniz:
1. Telefonunuzdaki resmi Tesla uygulamasını açın
2. Arabayı uyandırmak için herhangi bir işleve dokunun (iklim, korna)
3. Tesla Carview 60 saniye içinde güncellenmelidir

### XP7 VIN (Model Y Juniper) — GPS güncellenmiyor
Bazı yeni araçlar standart REST API üzerinden GPS verisi döndürmüyor. Bu bir Tesla kısıtlamasıdır. Fleet Telemetry bu araçlar için GPS verisi sağlar — gerekirse [Tesla Fleet Telemetry Erişimi](https://developer.tesla.com) ile iletişime geçin.

---

## 🔑 "Tesla API returned 403 Forbidden"

Tüm Tesla API çağrıları 403 döndürüyor? Bu genellikle **Tesla Geliştirici hesabınızın askıya alındığı veya faturalandırma sorunu yaşandığı** anlamına gelir.

1. [developer.tesla.com](https://developer.tesla.com) adresinde oturum açın
2. Hesap uyarılarını, faturalandırma bildirimlerini veya askıya alma mesajlarını kontrol edin
3. Gerekli faturalandırma bilgilerini tamamlayın (ücretsiz katman kullanımında bile kredi kartı gerekebilir)
4. Çözdükten sonra: **Yönetici → Sistem → Tesla Hesabını Yeniden Bağla**

---

## 🔐 Giriş sorunları

### "Invalid username or password" — ama doğru olduğundan eminim

- Caps Lock'u kontrol edin
- Yakın zamanda şifre değiştirdiyseniz, eski şifreyi deneyin (tarayıcı eskiyi önbelleğe almış olabilir)
- Yönetici hesapları kullanıcı şifrelerini sıfırlayabilir: **Yönetici → Kullanıcılar → hesabınız → Şifreyi Sıfırla**

### "Account locked" (Hesap kilitlendi)

5 başarısız giriş denemesinden sonra hesap 15 dakika kilitlenir. Bekleyin veya bir yöneticiden kilidi açmasını isteyin.

Yöneticiler şu yolla açabilir:
```bash
# Konteyner içinde:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml exec backend node -e "
const db = require('./src/db/database.js');
db.getDb('YOUR-TENANT-ID').prepare('UPDATE users SET failed_login_attempts=0, locked_until=NULL WHERE username=?').run('USERNAME');
"
```

### Yönetici şifresini unuttum

Yönetici olarak giriş yapamıyorsanız:
```bash
# Arka uç konteynerinde bir shell alın:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml exec backend sh

# Şifreyi sıfırlayın (değerleri değiştirin):
node -e "
const bcrypt = require('bcrypt');
const { getDb } = require('./src/db/database.js');
const hash = bcrypt.hashSync('NewPassword123!', 12);
// Kiracı kimliğine ihtiyacınız var — master.db'de bulun:
// getDb, kiracı UUID ile çağrılır
"
```

Ya da daha basiti: şifreyi bildiğinizde almış olduğunuz bir yedekten geri yükleyin.

---

## 📱 Anlık bildirimler çalışmıyor

### Masaüstü
1. Tarayıcı bildirim izinlerini kontrol edin: adres çubuğundaki kilit simgesine tıklayın → Bildirimler → İzin Ver
2. Uygulamanın HTTPS kullandığını kontrol edin (anlık bildirimler için zorunlu)
3. Deneyin: Ayarlar → Anlık Bildirimler → Test Bildirimi

### iOS (iPhone/iPad)
iOS'ta anlık bildirimler yalnızca **Ana Ekran kısayolundan** (PWA) çalışır, tarayıcı sekmesinden değil.
1. Safari'de Tesla Carview'u açın
2. Paylaş → "Ana Ekrana Ekle"ye dokunun
3. Ana Ekran simgesinden açın → bildirimler artık çalışır

---

## 🐛 Komutlar çalışmıyor (iklim, kilitler vb.)

Komutlar için Sanal Anahtarın eşleştirilmiş olması gerekir:
1. Kontrol edin: **Ayarlar → Sanal Anahtar** — durum "Eşleştirildi" göstermelidir
2. Eşleştirilmediyse: eşleştirme URL'sini **Tesla araç tarayıcısında** açın (telefonunuzda değil)
3. Telefonunuzdaki Tesla uygulamasında onaylayın

Ayrıca kontrol edin: **Yönetici → Sistem → Sanal Anahtar Durumu**

---

## 🗄️ Veritabanı hataları ("disk I/O error", "database is locked")

Genellikle Raspberry Pi'daki arızalı SD kart nedeniyle olur. Kontrol edin:

```bash
# Dosya sistemi hatalarını kontrol edin:
dmesg | grep -i "error\|fail\|corrupt"

# SD kart sağlığını kontrol edin:
df -h
```

G/Ç hataları görürseniz → SD kartınız arızalanıyor. **Derhal bir yedek alın** ve USB SSD'ye geçin: [→ Raspberry Pi Depolama](Raspberry-Pi-Storage)

---

## 📋 Logları görüntüleme

```bash
# Arka uç uygulama logları:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs backend --tail=100 -f

# nginx erişim logu:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs nginx --tail=50

# Sistem günlüğü (fail2ban vb.):
journalctl -u fail2ban --since "1 hour ago"

# fail2ban yasakları:
fail2ban-client status sshd
```

---

## Hâlâ çözüm bulamadınız mı?

1. [GitHub Sorunlarını](https://github.com/KnevS/Tesla-Carview/issues) kontrol edin — birileri aynı sorunu yaşamış olabilir
2. Şunları içeren yeni bir sorun açın:
   - Denedikleriniz
   - Ne olduğu (hata mesajları, ekran görüntüleri)
   - Kurulumunuz (Pi modeli, VPS sağlayıcısı, işletim sistemi sürümü)
   - İlgili log çıktısı (şifreler veya sırları gizleyin)
