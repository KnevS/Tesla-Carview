# Deployment — Linux sunucu ve Raspberry Pi

> 🤖 *Bu Türkçe çeviri [02-deployment.en.md](02-deployment.en.md) dosyasından yapay zeka destekli oluşturulmuştur. Düzeltmeler GitHub üzerinden memnuniyetle karşılanır.*

> 🇩🇪 [Auf Deutsch lesen](02-deployment.md)

Tesla Carview **tüm yaygın Linux platformlarında** çalışır:

| Platform | Mimari | Test edildi |
|---|---|---|
| Linux sunucu (VPS, dedicated) | x86_64 | ✓ |
| Raspberry Pi 4 / 5 | ARM64 | ✓ |
| Raspberry Pi 3 (ve öncesi) | ARMv7 | ✗ ¹ |
| Yerel geliştirme (Mac/Windows/Linux) | tümü | ✓ |

¹ **Raspberry Pi 3 ve öncesi (32 bit ARM) v3.51.0'dan itibaren desteklenmiyor.** Node.js 24. sürümden itibaren ARMv7 imajı yayınlamıyor — ne alpine ne de Debian —, bu nedenle backend imajı orada artık derlenemiyor. `deploy/setup.sh` bu sistemlerde imaj indirmede hata vermek yerine bir açıklamayla durur.


---

## Ön koşullar

- Debian/Ubuntu (veya Raspberry Pi OS)
- Root erişimi
- Opsiyonel: sunucu IP'sine işaret eden A kaydı olan kendi alan adınız (HTTPS için)
- Tesla Developer hesabı ([04-tesla-api.en.md](./04-tesla-api.en.md))

> **Raspberry Pi mi kullanıyorsunuz?** Önce [15-raspberry-pi-storage.en.md](15-raspberry-pi-storage.en.md) dosyasını okuyun — SD kartlar sürekli yazma yükü altında bozulur. USB SSD veya NVMe kurmak 20 dakika sürer ve sonradan çok sorun tasarruf ettirir.
>
> **Sabit IP yok mu?** [14-network-access.en.md](14-network-access.en.md) DynDNS, Cloudflare Tunnel ve VPS seçeneklerini adım adım açıklar.
>
> **Önerilen başlangıç VPS:** [netcup VPS nano G11s](https://www.netcup.com/en/server/vps-lite) (2 vCore, 2 GB RAM, 60 GB SSD, ~€3,08/ay) tüm Tesla Carview gereksinimlerini karşılayan, test edilmiş en ucuz VPS'tir — birkaç yıllık telemetri verisi için yeterli depolama dahil. İndirim kodu talep üzerine: [rabatt-code-netcup@krische.com](mailto:rabatt-code-netcup@krische.com).

---

## 📦 Otomatik kurulum (herkes için)

```bash
# Hedef makinede root olarak:
curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
```

Veya manuel olarak:
```bash
git clone https://github.com/KnevS/Tesla-Carview.git /opt/tesla-carview
bash /opt/tesla-carview/deploy/setup.sh
```

Script mimariyi otomatik algılar ve şunları yapar:
1. Sistem paketlerini kurar (nginx, certbot, docker, ufw, fail2ban)
2. Güvenlik duvarını yapılandırır (SSH, HTTP, HTTPS)
3. SSH koruması için fail2ban
4. Yapılandırma sihirbazını başlatır
5. Let's Encrypt SSL (HTTPS alan adı verilmişse)
6. TLS sertleştirmesi ile nginx
7. Docker container'larını başlatır (çoklu mimari)

---

## Yapılandırma sihirbazını çalıştır

```bash
bash /opt/tesla-carview/deploy/setup-wizard.sh
```

Sihirbaz etkileşimli olarak sorar:
- Genel URL (örn. `https://tesla.example.com` veya `http://192.168.1.100:8080`)
- Tesla API Client-ID ve Client-Secret
- Veritabanı yolu
- SSL sertifikaları için e-posta adresi
- Web Push VAPID anahtarları (opsiyonel)

---

## Raspberry Pi — özellikler

```bash
# Raspberry Pi OS'i hazırla (gerekirse):
sudo apt-get update && sudo apt-get upgrade -y

# ARM için Docker kur (setup.sh otomatik yapar):
curl -fsSL https://get.docker.com | sh
```

Ev ağındaki bir Raspberry Pi'de nginx/SSL gerekmez — uygulama container'ı doğrudan 8080 portundan erişilebilirdir.
`.env` dosyasında `FRONTEND_URL=http://192.168.1.100:8080` ayarlayın.

---

## Tesla API'sini yapılandır

```bash
nano /opt/tesla-carview/backend/.env
```

Gerekli alanlar:
```env
TESLA_CLIENT_ID=your-client-id
TESLA_CLIENT_SECRET=your-client-secret
TESLA_REDIRECT_URI=https://your.domain.com/api/auth/callback
```

Container'ları yeniden başlatın:
```bash
cd /opt/tesla-carview
docker compose -f docker-compose.prod.yml up -d
```

---

## İlk yapılandırma (web sihirbazı)

İlk başlatmada uygulama otomatik olarak tarayıcıda **/setup** sayfasını açar.
İlk yönetici hesabı orada oluşturulur.

---

## Güncellemeleri uygula

```bash
bash /opt/tesla-carview/deploy/update.sh
```

---

## Otomatik deployment

`main` branch'e her push'ta otomatik deployment için iki yol vardır:

| Yöntem | En uygun | Kılavuz |
|---|---|---|
| **GitHub Actions + SSH** | Tek uygulama, mevcut sunucu, tam kontrol | Aşağıya bakın |
| **Dokploy** | Birden fazla uygulama, web arayüzü tercihi, kolay SSL | [08-dokploy.en.md](./08-dokploy.en.md) |

---

## GitHub Actions otomatik deployment

`main` branch'e her push'ta otomatik deployment.

### Ön koşul: SSH deploy anahtarı oluşturun

```bash
# sunucuda:
ssh-keygen -t ed25519 -C "tesla-carview-deploy" -f ~/.ssh/tesla_deploy -N ""

# public key'i SSH kullanıcısı için yetkilendir:
cat ~/.ssh/tesla_deploy.pub >> /home/YOUR_USER/.ssh/authorized_keys
```

> **Not**: deploy kullanıcısının `docker` ve `git` için parolasız sudo'ya ihtiyacı vardır:
> ```bash
> echo 'YOUR_USER ALL=(ALL) NOPASSWD: /usr/bin/docker, /usr/bin/git' \
>   > /etc/sudoers.d/tesla-deploy
> ```

### GitHub secret'larını ayarla

GitHub → repository → Settings → Secrets and variables → Actions → *New repository secret*:

| Secret | Açıklama | Örnek |
|---|---|---|
| `DEPLOY_HOST` | Sunucu hostname veya IP | `123.456.789.0` |
| `DEPLOY_USER` | SSH kullanıcı adı | `deploy` |
| `DEPLOY_SSH_KEY` | `~/.ssh/tesla_deploy` içeriği (private key) | `-----BEGIN OPENSSH…` |
| `DEPLOY_APP_DIR` | Sunucudaki kurulum yolu | `/opt/tesla-carview` |


---

## Veritabanı yedekleme

```bash
# bir yedek oluştur:
cp /opt/tesla-carview/data/master.db /opt/backups/master-$(date +%Y%m%d-%H%M).db
cp /opt/tesla-carview/data/tenants/*.db /opt/backups/

# her gün saat 03:00'te otomatik (crontab -e root olarak):
0 3 * * * cp /opt/tesla-carview/data/master.db /opt/tesla-carview/data/tenants/*.db /opt/backups/
```

> **Not:** Tesla Carview bind-mount (`./data:/app/data`) kullanır, isimlendirilmiş Docker volume değil. Tüm veritabanı dosyaları doğrudan host üzerinde `/opt/tesla-carview/data/` altındadır. Alternatif olarak, uygulamanın sistem ayarlarındaki yerleşik otomatik yedekleme yapılandırılabilir (yerel, dizin, S3 veya SFTP).

---

## Kurulum sonrası sağlık kontrolü

İlk kurulumdan sonra (ve sonrasında istediğiniz zaman) yerleşik hijyen kontrolünü çalıştırabilirsiniz:

```bash
bash /opt/tesla-carview/scripts/hygiene-check.sh
```

Script 7 alanı kontrol eder ve renkli bir özet yazdırır:

| # | Kontrol | Otomatik düzeltme |
|---|---|---|
| 1 | Sistem ortamı — Docker sürümü, Node.js ≥ 20, disk kullanımı | — |
| 2 | Bağımlılık güvenliği — frontend + backend için `npm audit` | `--fix` `npm audit fix` çalıştırır |
| 3 | Bundle boyutu — ana JS chunk eşiklerle karşılaştırılır (uyarı > 1,2 MB, hata > 1,5 MB) | — |
| 4 | `.env` bütünlüğü — gerekli tüm anahtarlar var mı? | — |
| 5 | Docker sağlığı — sağlıksız/çıkmış container'lar, kullanılmayan imaj + volume | `--fix` imajları temizler |
| 6 | Veritabanı bütünlüğü — tenant başına SQLite `PRAGMA integrity_check` | — |
| 7 | SSL sertifikası — yapılandırılan alan adınız için son geçerlilik gününe kadar | — |

```bash
# CI modu (renksiz, hata durumunda exit 1 — setup.sh ve GitHub Actions tarafından kullanılır):
bash scripts/hygiene-check.sh --ci

# Otomatik düzeltme modu (npm audit fix çalıştırır, Docker imajlarını temizler):
bash scripts/hygiene-check.sh --fix
```

Gecelik bakım işi (`backend/src/services/nightlyMaintenance.js`) bu kontrollerin bir alt kümesini her gece saat 03:30 Europe/Berlin'de otomatik olarak çalıştırır ve sonuçları admin sağlık loguna yazar (`Admin → Sistem → Bakım`).

---

## Logları görüntüle

```bash
# backend logları:
docker compose -f docker-compose.prod.yml logs -f backend

# nginx logları:
tail -f /var/log/nginx/tesla-carview.access.log
```
