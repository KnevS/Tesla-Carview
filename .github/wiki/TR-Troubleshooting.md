🌐 **Dil:** [EN](Troubleshooting) · [DE](DE-Troubleshooting) · [FR](FR-Troubleshooting) · [ES](ES-Troubleshooting) · **TR** · [EL](EL-Troubleshooting)

---

# Sorun Giderme

En yaygın sorunların çözümleri. En olası nedenden başla ve aşağıya doğru ilerle.

---

## 🚫 Uygulamaya hiç erişilemiyor

### Kontrol: Sunucu çalışıyor mu?

```bash
# Konteyner durumunu kontrol et:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml ps

# Tüm konteynerleri "Up" olarak göstermeli:
# tesla-carview-backend    Up
# tesla-carview-frontend   Up
# tesla-carview-nginx      Up
```

Herhangi bir konteyner "Exit" veya "Restarting" gösteriyorsa:
```bash
# Sorunlu konteyner için logları görüntüle:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs backend
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs nginx
```

Her şeyi yeniden başlat:
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d
```

### Kontrol: Alan adı doğru çözümleniyor mu?

```bash
nslookup tesla.alaninadın.com
# Sunucunun IP adresini göstermeli

# Veya tarayıcından: https://dnschecker.org'u ziyaret et
```

DNS çözümlemiyorsa → DNS kayıtlarını değiştirdikten sonra 10–30 dakika bekle.

### Kontrol: Güvenlik duvarı erişimi engelliyor mu?

```bash
ufw status
# 80 ve 443 portları ALLOW göstermeli
```

Eksikse:
```bash
ufw allow 80/tcp
ufw allow 443/tcp
```

---

## 🔴 "502 Bad Gateway" veya "503 Service Unavailable"

Bu, nginx'in çalıştığını ama backend'in yanıt vermediğini gösterir.

```bash
# Backend'i kontrol et:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs backend --tail=50
```

Yaygın neden: backend bir başlatma hatası nedeniyle çöktü. Genellikle eksik bir `.env` değişkeni veya veritabanı izin sorunu.

Veritabanı izinlerini düzelt:
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml down
chown -R 1000:1000 /var/lib/docker/volumes/tesla_data/
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d
```

---

## 🔒 SSL/HTTPS hataları ("Sertifika geçersiz", "NET::ERR_CERT_EXPIRED")

Let's Encrypt sertifikası süresi dolmuş veya doğru şekilde verilmemiş.

```bash
# Sertifika durumunu kontrol et:
certbot certificates

# Manuel olarak yenile:
certbot renew --force-renewal
systemctl restart nginx
```

Certbot yenileyemiyorsa (DNS çözümlenmiyor, 80. port engellendi):
1. 80. portun güvenlik duvarında VE routerda (port yönlendirme) açık olduğunu kontrol et
2. Alan adının DNS'inin sunucunun IP'sine işaret ettiğini kontrol et

---

## 🚗 Araç veri göstermiyor / "çevrimdışı" gösteriyor

### Tesla API bağlı değil
→ **Admin → Sistem → Sistem Sağlığı**'nı kontrol et — "Tesla Token" bölümü bağlantı durumunu gösterir.

Süresi dolmuşsa: **Admin → Sistem → Tesla Hesabını Yeniden Bağla**

### Araç uyuyor
Tesla araçları 15–30 dakika hareketsizlikten sonra uyur. Uygulama arabanın uyanmasını bekler. Manuel olarak uyandırabilirsin:
1. Telefonundaki resmi Tesla uygulamasını aç
2. Arabayı uyandırmak için herhangi bir işleve dokun (iklim, korna)
3. Tesla Carview 60 saniye içinde güncellenmeli

### XP7 VIN (Model Y Juniper) — GPS güncellenmiyor
Bazı yeni araçlar standart REST API üzerinden GPS verisi döndürmüyor. Bu bir Tesla kısıtlaması. Fleet Telemetry bu araçlar için GPS verisi sağlar — buna ihtiyacın varsa [Tesla Fleet Telemetry Access](https://developer.tesla.com)'e başvur.

---

## 🔑 "Tesla API 403 Forbidden döndürdü"

Tüm Tesla API çağrıları 403 döndürüyor mu? Bu genellikle **Tesla geliştirici hesabının askıya alınmış olduğu veya faturalandırma sorunu yaşadığı** anlamına gelir.

1. [developer.tesla.com](https://developer.tesla.com)'da oturum aç
2. Hesap uyarıları, faturalandırma bildirimleri veya askıya alma mesajlarını kontrol et
3. Gerekli faturalandırma bilgilerini tamamla (ücretsiz kullanım için bile kredi kartı gerekebilir)
4. Çözüldükten sonra: **Admin → Sistem → Tesla Hesabını Yeniden Bağla**

---

## 🧭 Kurulum sihirbazı yönetici oluşturmada başarısız oluyor

**Belirti:** Yeni bir kurulumda sihirbazın 2. adımı (yönetici hesabı oluşturma) `Transaction function cannot return a promise` hatasıyla başarısız olur. v3.32.5 dahil önceki sürümleri etkiler.

**Neden ve çözüm:** `/api/setup/init` içindeki bir hata ([#170](https://github.com/KnevS/Tesla-Carview/issues/170)) — **v3.32.6'da düzeltildi**. En son sürüme güncelleyin ve sihirbazı yeniden açın:

```bash
cd /opt/tesla-carview
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

Ardından yönetici hesabı yeniden oluşturulabilir. Mevcut kurulumlar etkilenmez.

---

## 🔐 Giriş sorunları

### "Geçersiz kullanıcı adı veya şifre" — ama doğru olduğundan eminim

- Büyük harf kilidini kontrol et
- Yakın zamanda şifreni değiştirdiysen eski şifreyi dene (tarayıcı eskisini önbelleğe almış olabilir)
- Admin hesapları kullanıcı şifrelerini sıfırlayabilir: **Admin → Kullanıcılar → hesabın → Şifre Sıfırla**

### "Hesap kilitlendi"

5 başarısız giriş denemesinden sonra hesap 15 dakika kilitlenir. Bekle veya kilidi açması için bir admine sor.

Adminler şu yolla kilit açabilir:
```bash
# Konteynerde:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml exec backend node -e "
const db = require('./src/db/database.js');
db.getDb('KIRACIN-ID').prepare('UPDATE users SET failed_login_attempts=0, locked_until=NULL WHERE username=?').run('KULLANICI_ADI');
"
```

### Admin şifresini unuttum

Admin olarak giriş yapamıyorsan:
```bash
# Backend konteynerinde bir shell al:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml exec backend sh

# Şifreyi sıfırla (değerleri değiştir):
node -e "
const bcrypt = require('bcrypt');
const { getDb } = require('./src/db/database.js');
const hash = bcrypt.hashSync('NewPassword123!', 12);
// Kiracı ID'sine ihtiyacın var — master.db'de bul:
// getDb kiracı UUID'si ile çağrılır
"
```

Veya daha basit: şifreyi bildiğin zaman yaptığın bir yedekten geri yükle.

---

## 📱 Anlık bildirimler çalışmıyor

### Masaüstü
1. Tarayıcı bildirim izinlerini kontrol et: adres çubuğundaki kilit simgesine tıkla → Bildirimler → İzin Ver
2. Uygulamanın HTTPS kullandığını kontrol et (push için gerekli)
3. Dene: Ayarlar → Anlık Bildirimler → Test Bildirimi

### iOS (iPhone/iPad)
iOS'ta anlık bildirimler yalnızca **Ana Ekran kısayolundan** (PWA) çalışır, tarayıcı sekmesinden değil.
1. Safari'de Tesla Carview'i aç
2. Paylaş'a dokun → "Ana Ekrana Ekle"
3. Ana Ekran simgesinden aç → bildirimler artık çalışır

---

## 🐛 Komutlar çalışmıyor (iklim, kilitler, vb.)

Komutlar Virtual Key'in eşleştirilmesini gerektirir:
1. Kontrol et: **Ayarlar → Virtual Key** — durum "Eşleştirildi" göstermeli
2. Eşleştirilmemişse: eşleştirme URL'sini **Tesla araç tarayıcısında** aç (telefon değil)
3. Telefonundaki Tesla uygulamasında onayla

Ayrıca kontrol et: **Admin → Sistem → Virtual Key Durumu**

---

## 🗄️ Veritabanı hataları ("disk I/O error", "database is locked")

Genellikle Raspberry Pi'daki bozulan SD kart tarafından tetiklenir. Kontrol et:

```bash
# Dosya sistemi hatalarını kontrol et:
dmesg | grep -i "error\|fail\|corrupt"

# SD kart sağlığını kontrol et:
df -h
```

G/Ç hatası görürsen → SD kartın bozuluyor. **Hemen yedek al** ve USB SSD'ye geç: [→ Raspberry Pi Depolama](TR-Raspberry-Pi-Storage)

---

## 📋 Logları görüntüleme

```bash
# Backend uygulama logları:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs backend --tail=100 -f

# nginx erişim logu:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs nginx --tail=50

# Sistem journal (fail2ban, vb.):
journalctl -u fail2ban --since "1 hour ago"

# fail2ban yasakları:
fail2ban-client status sshd
```

---

## Hâlâ takılı mısın?

1. [GitHub Issues](https://github.com/KnevS/Tesla-Carview/issues)'a bak — biri aynı sorunu yaşamış olabilir
2. Şunlarla yeni bir sorun aç:
   - Neler denediğin
   - Ne olduğu (hata mesajları, ekran görüntüleri)
   - Kurulumun (Pi modeli, VPS sağlayıcısı, işletim sistemi sürümü)
   - İlgili log çıktısı (şifreleri veya sırları maskele)
