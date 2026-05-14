🌐 **Dil:** [EN](Backup-and-Restore) · [DE](DE-Backup-and-Restore) · [FR](FR-Backup-and-Restore) · [ES](ES-Backup-and-Restore) · **TR** · [EL](EL-Backup-and-Restore)

---

# Yedekleme ve Geri Yükleme

Verileriniz (seyahatler, şarj geçmişi, seyahat defteri, ayarlar) sunucundaki SQLite veritabanlarında yaşar. Düzenli yedeklemeler donanım arızasına, kazara silmeye veya yeni bir sunucuya geçişe karşı koruma sağlar.

---

## Neyin yedeklenmesi gerekiyor?

| Veri | Konum | Boyut (tipik) |
|---|---|---|
| Ana veritabanı | `/app/data/master.db` | ~1 MB |
| Kiracı veritabanları | `/app/data/tenants/*.db` | Kiracı başına ~50 MB (3 yıl) |
| Ortam yapılandırması | `/opt/tesla-carview/backend/.env` | Küçük |
| SSL sertifikası | `/etc/letsencrypt/` | Küçük |

> Docker image'ları ve uygulama kodu yedeklemeye **gerek yok** — her zaman GitHub'dan yeniden indirilebilir.

---

## Seçenek 1: Uygulama içi yedekleme (çoğu kullanıcı için önerilen)

Tesla Carview'in yerleşik bir yedekleme özelliği var:

1. **Admin → Data → Yedekleme**'ye git
2. **Yedek İndir**'e tıkla
3. 25 veritabanı tablosunun tamamını içeren bir JSON dosyası indirilir
4. Güvenli bir yerde sakla (harici sürücü, bulut depolama, farklı cihaz)

**Yedekten geri yükle:**
1. **Admin → Data → Geri Yükleme**'ye git
2. Yedekleme JSON dosyasını yükle
3. `RESTORE` onay ifadesini yaz
4. Geri yükleme saniyeler içinde tamamlanır
5. Geri yüklemeden önce mevcut verilerin güvenlik yedeği otomatik olarak alınır

---

## Seçenek 2: Otomatik yedekleme betiği

Müdahalesiz yedeklemeler için, her gün bir kopya kaydeden bir cron job oluştur:

```bash
# Yedekleme dizini oluştur
mkdir -p /opt/backups/tesla-carview

# Yedekleme betiği oluştur
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

# Cron'a ekle (her gün sabah 2'de çalışır)
echo "0 2 * * * root /opt/backups/backup-tesla.sh >> /var/log/tesla-backup.log 2>&1" > /etc/cron.d/tesla-backup
```

---

## Seçenek 3: Uzak konum yedekleme (önemli veriler için önerilen)

Aynı sunucudaki yedekleme, sunucu arızasına karşı koruma sağlamaz. Yedeklemeleri uzak konuma kopyala:

### Uzak SSH sunucusuna / NAS'a

```bash
# Yedekleme betiğine ekle:
rsync -az /opt/backups/tesla-carview/ user@nas-ip:/backups/tesla-carview/
```

### Hetzner Storage Box'a (uygun, 100 GB için ~1 €/ay)

```bash
# Yedekleme betiğine ekle:
rsync -az /opt/backups/tesla-carview/ your-storagebox.your-storagebox.de:/backups/
```

### Bulut sağlayıcıya (Backblaze B2, AWS S3)

```bash
# rclone kur (çoğu bulut sağlayıcısını destekler):
curl https://rclone.org/install.sh | sudo bash
rclone config  # Bulut sağlayıcın için etkileşimli kurulum

# Yedekleme betiğine ekle:
rclone sync /opt/backups/tesla-carview/ backblaze:my-bucket/tesla-carview/
```

---

## Yeni sunucuya geçiş

Yeni bir sunucuya taşınırken (donanım yükseltmesi, VPS değişikliği):

1. **Eski sunucuda:** Admin → Data → Yedekleme aracılığıyla tam yedek indir
2. **Yeni sunucuda:** Kurulum betiğini çalıştır: `curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash`
3. Yeni kuruluma giriş yap
4. **Admin → Data → Geri Yükleme**'ye git → yedeği yükle
5. DNS kaydını yeni sunucu IP'sine işaret edecek şekilde güncelle
6. Alan adın değiştiyse Tesla Developer Portal'daki Redirect URI'yi güncelle

---

## Gece bakımı (otomatik)

Tesla Carview her gece 03:30'da (Berlin saat dilimi) otomatik bir bakım görevi çalıştırır:

- Süresi dolmuş token'ları ve yetim kayıtları kaldırır
- WAL checkpoint (SQLite optimizasyonu)
- VACUUM — bir veritabanı 50 MB'ı aşarsa disk alanı geri kazanır
- `AUTO_UPDATE_ENABLED=true` ise: en son kodu çeker ve yeniden başlatır

Manuel olarak tetikleyebilirsin:
- **Admin → Sistem → Bakımı Şimdi Çalıştır**

Veya bakım günlüğünü görüntüle:
- **Admin → Sistem → Bakım Günlüğü**

---

## Yedekleme en iyi uygulamaları

- **3-2-1 kuralı:** 3 kopya, 2 farklı depolama türü, 1 uzak konumda
- Gerçekte geri yükleyerek yedeklerini test et (Admin → Geri Yükleme test özelliğini kullan)
- `.env` dosyası yedeğini ayrı ve güvenli bir şekilde sakla (kimlik bilgileri içerir)
- Herhangi bir büyük güncelleme veya yapılandırma değişikliğinden önce yedek al
