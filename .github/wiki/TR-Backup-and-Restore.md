# Yedekleme ve Geri Yükleme

Verileriniz (yolculuklar, şarj geçmişi, seyahat defteri, ayarlar) sunucunuzdaki SQLite veritabanlarında saklanır. Düzenli yedeklemeler, donanım arızasına, yanlışlıkla silmeye veya yeni bir sunucuya geçişe karşı koruma sağlar.

---

🌐 **Language / Sprache / Langue / Idioma / Dil / Γλώσσα**

| | |
|---|---|
| 🇬🇧 **[English](Backup-and-Restore)** | English version |
| 🇩🇪 **[Deutsch](DE-Backup-and-Restore)** | Deutsche Version |
| 🇫🇷 **[Français](FR-Backup-and-Restore)** | Version française |
| 🇪🇸 **[Español](ES-Backup-and-Restore)** | Versión en español |
| 🇹🇷 **[Türkçe](TR-Backup-and-Restore)** | Buradasınız |
| 🇬🇷 **[Ελληνικά](EL-Backup-and-Restore)** | Ελληνική έκδοση |

---

## Nelerin yedeklenmesi gerekiyor?

| Veri | Konum | Boyut (tipik) |
|---|---|---|
| Ana veritabanı | `/app/data/master.db` | ~1 MB |
| Kiracı veritabanları | `/app/data/tenants/*.db` | Kiracı başına ~50 MB (3 yıl) |
| Ortam yapılandırması | `/opt/tesla-carview/backend/.env` | Küçük |
| SSL sertifikası | `/etc/letsencrypt/` | Küçük |

> Docker image'ları ve uygulama kodu yedeklenmesi **gerekmez** — GitHub'dan her zaman yeniden indirilebilirler.

---

## Seçenek 1: Uygulama içi yedekleme (çoğu kullanıcı için önerilen)

Tesla Carview yerleşik bir yedekleme özelliğine sahiptir:

1. **Yönetici → Veri → Yedekleme** bölümüne gidin
2. **Yedeği İndir** düğmesine tıklayın
3. Tüm 25 veritabanı tablosunu içeren bir JSON dosyası indirilir
4. Güvenli bir yere kaydedin (harici disk, bulut depolama, farklı cihaz)

**Yedekten geri yükleme:**
1. **Yönetici → Veri → Geri Yükle** bölümüne gidin
2. Yedek JSON dosyasını yükleyin
3. `RESTORE` onay ifadesini yazın
4. Geri yükleme saniyeler içinde tamamlanır
5. Geri yüklemeden önce mevcut verilerin güvenlik yedeği otomatik olarak alınır

---

## Seçenek 2: Otomatik yedekleme betiği

Müdahalesiz yedeklemeler için günlük bir kopya kaydeden bir cron job oluşturun:

```bash
# Yedek dizini oluşturun
mkdir -p /opt/backups/tesla-carview

# Yedekleme betiği oluşturun
cat > /opt/backups/backup-tesla.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d-%H%M)
BACKUP_DIR="/opt/backups/tesla-carview"
DATA_DIR="/var/lib/docker/volumes/tesla_data/_data"

# Veritabanlarını kopyala
cp "$DATA_DIR/master.db" "$BACKUP_DIR/master-$DATE.db"
cp -r "$DATA_DIR/tenants" "$BACKUP_DIR/tenants-$DATE/"
cp "/opt/tesla-carview/backend/.env" "$BACKUP_DIR/env-$DATE.bak"

# Yalnızca son 14 günü sakla
find "$BACKUP_DIR" -name "*.db" -mtime +14 -delete
find "$BACKUP_DIR" -name "*.bak" -mtime +14 -delete
find "$BACKUP_DIR" -type d -name "tenants-*" -mtime +14 -exec rm -rf {} +

echo "Yedekleme tamamlandı: $DATE"
EOF

chmod +x /opt/backups/backup-tesla.sh

# Cron'a ekleyin (her gece saat 02:00'de çalışır)
echo "0 2 * * * root /opt/backups/backup-tesla.sh >> /var/log/tesla-backup.log 2>&1" > /etc/cron.d/tesla-backup
```

---

## Seçenek 3: Uzak konuma yedekleme (önemli veriler için önerilen)

Aynı sunucudaki bir yedek, sunucu arızasına karşı koruma sağlamaz. Yedekleri uzak konuma kopyalayın:

### Uzak SSH sunucusu / NAS'a

```bash
# Yedekleme betiğinize ekleyin:
rsync -az /opt/backups/tesla-carview/ user@nas-ip:/backups/tesla-carview/
```

### Hetzner Storage Box'a (ucuz, 100 GB için ~1€/ay)

```bash
# Yedekleme betiğinize ekleyin:
rsync -az /opt/backups/tesla-carview/ your-storagebox.your-storagebox.de:/backups/
```

### Bulut sağlayıcıya (Backblaze B2, AWS S3)

```bash
# rclone yükleyin (çoğu bulut sağlayıcısını destekler):
curl https://rclone.org/install.sh | sudo bash
rclone config  # Bulut sağlayıcınız için etkileşimli kurulum

# Yedekleme betiğine ekleyin:
rclone sync /opt/backups/tesla-carview/ backblaze:my-bucket/tesla-carview/
```

---

## Yeni bir sunucuya geçiş

Yeni bir sunucuya geçerken (donanım yükseltmesi, VPS değişikliği):

1. **Eski sunucuda:** Yönetici → Veri → Yedekleme üzerinden tam yedek indirin
2. **Yeni sunucuda:** Kurulum betiğini çalıştırın: `curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash`
3. Yeni kuruluma giriş yapın
4. **Yönetici → Veri → Geri Yükle** → yedeği yükleyin
5. DNS kaydınızı yeni sunucu IP'sini gösterecek şekilde güncelleyin
6. Alan adınız değiştiyse Tesla Geliştirici Portalı'ndaki Redirect URI'yi güncelleyin

---

## Geceleri bakım (otomatik)

Tesla Carview her gece 03:30'da (Berlin saati) otomatik bir bakım görevi çalıştırır:

- Süresi dolmuş token'ları ve artık kayıtları kaldırır
- WAL checkpoint (SQLite optimizasyonu)
- VACUUM — veritabanı 50 MB'yi aşarsa disk alanını geri kazanır
- `AUTO_UPDATE_ENABLED=true` ise: en son kodu çeker ve yeniden başlatır

Manuel olarak tetikleyebilirsiniz:
- **Yönetici → Sistem → Bakımı Şimdi Çalıştır**

Ya da bakım günlüğünü görüntüleyin:
- **Yönetici → Sistem → Bakım Günlüğü**

---

## Yedekleme en iyi uygulamaları

- **3-2-1 kuralı:** 3 kopya, 2 farklı depolama türü, 1 uzak konumda
- Yedeklerinizi gerçekten geri yükleyerek test edin (Yönetici → Geri Yükleme test özelliğini kullanın)
- `.env` dosya yedeğinizi ayrı ve güvenli saklayın (kimlik bilgileri içerir)
- Herhangi bir büyük güncelleme veya yapılandırma değişikliğinden önce yedekleyin
