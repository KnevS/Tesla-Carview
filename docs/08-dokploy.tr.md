# Dokploy ile deployment

> 🤖 *Bu Türkçe çeviri [08-dokploy.en.md](08-dokploy.en.md) dosyasından yapay zeka destekli oluşturulmuştur. Düzeltmeler GitHub üzerinden memnuniyetle karşılanır.*

> 🇩🇪 [Auf Deutsch lesen](08-dokploy.md)

[Dokploy](https://dokploy.com), kendi sunucunuzda barındırabileceğiniz açık kaynaklı bir
PaaS platformudur (Coolify veya Railway ile karşılaştırılabilir). Otomatik deployment için
yönlendirme, SSL (Let's Encrypt + Traefik üzerinden), loglar ve GitHub webhook'larını yönetir —
tam bir CI/CD pipeline'ı yükü olmadan.

**Ne zaman mantıklı:**
- Deployment'ları yönetmek için SSH komutları yerine bir web arayüzü istiyorsanız
- Aynı sunucuda birden fazla uygulama çalışıyorsa
- Ayrı bir GitHub Actions workflow'u istemiyorsanız

---

## 1. Dokploy'u sunucuya kur

```bash
# yeni bir VPS'te root olarak (Debian/Ubuntu önerilir):
curl -sSL https://dokploy.com/install.sh | sh
```

Dokploy ardından **3000** portunda başlar. Tarayıcıda `http://YOUR-SERVER-IP:3000` adresini açın
ve yönetici hesabını oluşturun.

> Güvenlik duvarı notu: 3000 portu geçici olarak erişilebilir olmalıdır. Giriş yaptıktan sonra
> Dokploy panel için kendi alan adı + SSL'sini kurabilir. Bundan sonra 3000 portunu tekrar kapatabilirsiniz.

---

## 2. Tesla Carview'i uygulama olarak ekle

Dokploy panelinde:

1. **Projects** → **Create Project** (örn. `tesla-carview`)
2. Projenin içinde: **Create Service** → **Application**
3. İsim: `tesla-carview`
4. Build türü: **Docker Compose**
5. Compose dosyası: `docker-compose.prod.yml`

---

## 3. GitHub reposunu bağla

### Seçenek A — GitHub App (önerilir)

1. Dokploy paneli → **Settings** → **Git Providers** → **GitHub App** → **Install**
2. `Tesla-Carview` reposu için izin verin
3. Uygulama yapılandırmasında: **Source** → repoyu seçin, branch: `main`

### Seçenek B — public repo (kimlik doğrulama yok)

**Source** altına HTTPS URL'sini girin:
```
https://github.com/YOUR-GITHUB-USER/Tesla-Carview.git
```
Branch: `main`

---

## 4. Ortam değişkenlerini ayarla

Uygulamanın **Environment** sekmesinde `.env` dosyasındaki tüm değişkenleri girin.
Minimum gereken alanlar:

| Değişken | Açıklama |
|---|---|
| `JWT_SECRET` | Uzun rastgele değer (`openssl rand -hex 64`) |
| `TESLA_CLIENT_ID` | Tesla Developer uygulama client ID |
| `TESLA_CLIENT_SECRET` | Tesla Developer uygulama secret |
| `TESLA_REDIRECT_URI` | `https://your.domain.com/api/auth/callback` |
| `FRONTEND_URL` | `https://your.domain.com` |
| `NODE_ENV` | `production` |

> `backend/.env.example` dosyasındaki diğer tüm değişkenler ihtiyaca göre eklenebilir.

---

## 5. Alan adı ve SSL yapılandırması

**Domains** sekmesinde:

1. **Add Domain** → `your.domain.com`
2. SSL sağlayıcısı: **Let's Encrypt** (Traefik üzerinden otomatik)
3. Hedef port: **80** (nginx frontend container'ı dahili yönlendirmeyi yönetir)

Alan adının A kaydı sunucu IP'sini göstermelidir.

---

## 6. Kalıcı veri (bind-mount)

Tesla Carview, isimlendirilmiş Docker volume değil **bind-mount** (`./data:/app/data`) kullanır.
Tüm veritabanı dosyaları (`master.db`, `tenants/*.db`), host üzerinde uygulama dizinindeki
`data/` alt dizininde — varsayılan olarak `/opt/tesla-carview/data/` — bulunur.

Yedeklemeler için basit bir `cp` yeterlidir:

```bash
# manuel yedek:
cp /opt/tesla-carview/data/master.db /opt/backups/
cp /opt/tesla-carview/data/tenants/*.db /opt/backups/
```

Yerleşik otomatik yedekleme (Sistem Ayarları → Otomatik Yedekleme) alternatif olarak yedekleri
S3'e veya SFTP üzerinden gönderebilir — host tarafında cron işine gerek kalmaz.

---

## 7. İlk deployment'ı tetikle

Uygulama sekmesinde sağ üstte: **Deploy** → Dokploy kodu GitHub'dan alır,
Docker imajlarını oluşturur ve container'ları başlatır.

Build sırasındaki loglar:
- **Deployments** sekmesi → mevcut deployment'a tıklayın → gerçek zamanlı log çıktısı

---

## 8. GitHub push'ta otomatik deployment

### Ön koşul: GitHub App entegrasyonu (adım 3A)

GitHub App entegrasyonu ile Dokploy otomatik olarak bir webhook kaydeder.
`main` branch'e her push yeni bir deployment'ı tetikler — başka yapılandırma gerekmez.

### Manuel webhook (seçenek B / GitHub App olmadan)

1. Dokploy → uygulama → **General** sekmesi → **Webhook URL**'yi kopyalayın
   (format: `https://dokploy.your.domain.com/api/deploy/XXXXX`)
2. GitHub → repo → Settings → Webhooks → **Add webhook**
   - Payload URL: kopyalanan webhook URL
   - Content type: `application/json`
   - Secret: boş bırakın (veya Dokploy'da ayarlayın)
   - Tetikleyici: **Just the push event**

Bundan sonra: `main`'e push → Dokploy otomatik build ve deploy eder.

---

## 9. Loglar ve izleme

```
Dokploy paneli → Uygulama → Logs
```

Veya doğrudan sunucudaki Docker üzerinden:

```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs -f backend
```

---

## Karşılaştırma: Dokploy vs. GitHub Actions SSH

| Kriter | GitHub Actions + SSH | Dokploy |
|---|---|---|
| Loglar/durum için web UI | ✗ (yalnızca GitHub UI) | ✓ |
| SSL otomasyonu | Manuel (Certbot) | ✓ (Traefik) |
| Bir sunucuda birden fazla uygulama | Karmaşık | ✓ |
| Özel CI/CD mantığı | ✓ (esnek) | ✗ (yalnızca build + start) |
| Kaynak maliyeti (Dokploy'un kendisi) | yok | ~200 MB RAM |
| GitHub bağımlılığı | ✓ (Actions) | Opsiyonel (webhook yeterli) |

---

## Daha fazla okuma

- [Dokploy dokümantasyonu](https://docs.dokploy.com)
- [Tesla Carview — GitHub Actions SSH deploy](./02-deployment.en.md#github-actions-auto-deploy)
- [Tesla API yapılandırması](./04-tesla-api.en.md)
