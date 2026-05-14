# Kurulum Kılavuzu

> **Tahmini süre:** ~30 dakika | **Zorluk:** Başlangıç dostu

Bu kılavuz, Tesla Carview'u sıfırdan eksiksiz şekilde kurmanızı adım adım anlatır.

---

🌐 **Language / Sprache / Langue / Idioma / Dil / Γλώσσα**

| | |
|---|---|
| 🇬🇧 **[English](Installation)** | English version |
| 🇩🇪 **[Deutsch](DE-Installation)** | Deutsche Version |
| 🇫🇷 **[Français](FR-Installation)** | Version française |
| 🇪🇸 **[Español](ES-Installation)** | Versión en español |
| 🇹🇷 **[Türkçe](TR-Installation)** | Buradasınız |
| 🇬🇷 **[Ελληνικά](EL-Installation)** | Ελληνική έκδοση |

---

## Başlamadan önce gerekenler

Herhangi bir komut çalıştırmadan önce aşağıdakilere sahip olduğunuzdan emin olun:

- [ ] Bir Linux sunucu, VPS veya Raspberry Pi (aşağıdaki [donanım seçeneklerine](#donanım-seçenekleri) bakın)
- [ ] Sunucunuza yönlendirilmiş bir alan adı — VEYA DynDNS / Cloudflare Tunnel kullanmayı planlıyor olun ([→ Ağ Erişimi](Network-Access))
- [ ] Bir Tesla Geliştirici hesabı ([→ Tesla API Kurulumu](Tesla-API-Setup))
- [ ] Sunucunuza SSH erişimi (veya Pi üzerinde klavye + ekran)

---

## Donanım seçenekleri

### Seçenek 1: Raspberry Pi (ev sunucusu)
En uygun kullanım: evde kişisel kullanım, düşük maliyet (toplamda ~60–120 €)

| Model | RAM | Önerilen depolama |
|---|---|---|
| Raspberry Pi 5 (önerilen) | 4 GB veya 8 GB | M.2 HAT+ üzerinden NVMe SSD |
| Raspberry Pi 4 | 4 GB | USB SSD |
| Raspberry Pi 3 | 1 GB | USB SSD (yavaş) |

> ⚠️ **Önemli:** Kalıcı çalışma için SD kart kullanmayın. Tesla Carview'un yazma yükü altında aylarca sürmeden bozulabilir. 20 dakikalık çözüm için [Raspberry Pi Depolama](Raspberry-Pi-Storage) sayfasına bakın.

### Seçenek 2: Bir barındırma sağlayıcısında VPS
En uygun kullanım: 7/24 erişilebilirlik, donanım yönetimi yok, kolay kurulum

| Sağlayıcı | Aylık maliyet | Notlar |
|---|---|---|
| [Hetzner](https://www.hetzner.com) CX22 | ~€4.35 | Önerilen, çok güvenilir |
| [netcup](https://www.netcup.eu) VPS 1000 | ~€4.44 | Alman veri merkezleri |
| [Contabo](https://contabo.com) VPS S | ~€5.99 | Bol depolama alanı |

VPS'nin **sabit bir genel IP adresi** vardır — DynDNS kurulumuna gerek yoktur.

---

## Adım 1: Sunucuyu hazırlayın

Sunucunuza SSH ile bağlanın (veya Pi'de bir terminal açın):

```bash
ssh root@YOUR-SERVER-IP
```

Sistemin güncel olduğundan emin olun:

```bash
apt update && apt upgrade -y
```

---

## Adım 2: Alan adınızı sunucunuza yönlendirin

Tesla Carview **HTTPS gerektirir** (Tesla'nın API'si yalnızca güvenli bağlantılar üzerinden çalışır). Bu, geçerli bir SSL sertifikasına sahip bir alan adına ihtiyacınız olduğu anlamına gelir.

**Sabit IP'ye sahip bir VPS'im var:**
→ Alan adı kayıt kuruluşunuza gidip bir A kaydı oluşturun:
```
tesla.yourdomain.com  →  A  →  YOUR-VPS-IP
```
DNS'in yayılması için 5–30 dakika bekleyin, ardından devam edin.

**Evdeyim ve sabit IP'm yok:**
→ [Ağ Erişimi](Network-Access) sayfasına bakın — önce DynDNS veya Cloudflare Tunnel kurun, ardından buraya dönün.

**Hiç alan adım yok:**
→ [DuckDNS.org](https://www.duckdns.org)'dan ücretsiz bir alt alan adı alın (örneğin `my-tesla.duckdns.org`) — ücretsizdir ve Let's Encrypt ile çalışır.

---

## Adım 3: Kurulum betiğini çalıştırın

Bu tek komut, etkileşimli kurulum sihirbazını indirir ve çalıştırır:

```bash
curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
```

Sihirbaz size bir dizi soru sorar:

| Soru | Ne gireceğiniz |
|---|---|
| Alan adı | `tesla.yourdomain.com` veya `my-tesla.duckdns.org` |
| Yönetici kullanıcı adı | Herhangi bir ad (örn. adınız, `admin`) |
| Yönetici şifresi | Güçlü bir şifre (en az 12 karakter) |
| Kiracı adı | Kurulumunuzun adı (örn. "My Tesla") |
| HTTPS'yi etkinleştir | Evet (her zaman — Tesla API için zorunlu) |

Betik ardından otomatik olarak şunları yapar:
1. Docker, nginx, certbot, fail2ban'ı yükler
2. Alan adınız için Let's Encrypt SSL sertifikası alır
3. Güvenlik başlıklarıyla nginx'i yapılandırır
4. Tüm Docker konteynerlerini başlatır
5. Veritabanını kurar

**Bu işlem 5–10 dakika sürer.**

---

## Adım 4: İlk giriş

Tarayıcınızı açın ve `https://tesla.yourdomain.com` adresine gidin

Tesla Carview giriş sayfasını görmeniz gerekir. Adım 3'te belirlediğiniz yönetici kullanıcı adı ve şifresini girin.

> 💡 **İpucu:** Giriş sayfasında "Oturumu açık tut (90 gün)" seçeneğini işaretleyin; böylece her seferinde şifrenizi girmek zorunda kalmazsınız — özellikle Tesla tarayıcısından erişirken kullanışlıdır.

---

## Adım 5: Tesla hesabınızı bağlayın

Giriş yaptıktan sonra Tesla hesabınızı bağlamanız için bir kurulum istemi göreceksiniz. [Tesla API Kurulumu](Tesla-API-Setup) sayfasındaki talimatları izleyin.

---

## Adım 6: Tamamlandı!

Tesla Carview kurulumunuz çalışıyor. Uygulama, aracınızın verilerini otomatik olarak toplamaya başlayacaktır.

Bundan sonra yapabilecekleriniz:
- **Aracınızı kurun** → Pano → Araç Ekle
- **Bildirimleri yapılandırın** → Ayarlar → Anlık Bildirimler
- **Aile üyelerini davet edin** → Yönetici → Kullanıcılar → Davet Et
- **Şarj konumu ekleyin** → Ayarlar → Şarj Konumları

---

## Güncelleme

Tesla Carview kendini otomatik olarak güncelleyebilir. Ayarlardan etkinleştirin:

```bash
# /opt/tesla-carview/backend/.env dosyasında:
AUTO_UPDATE_ENABLED=true
```

Ya da manuel olarak güncelleyin:

```bash
cd /opt/tesla-carview
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

---

## Kurulum sorunlarını giderme

**Betiği çalıştırırken "Permission denied"**
→ `root` olarak çalıştırdığınızdan emin olun. Önce `sudo su` komutunu çalıştırın.

**certbot sırasında "Domain not found"**
→ DNS'iniz henüz yayılmadı. 10–30 dakika bekleyip tekrar deneyin. Şu komutla kontrol edin: `nslookup tesla.yourdomain.com`

**Konteynerler başlamıyor**
→ Logları kontrol edin: `docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs`

**Daha fazla yardım** → [Sorun Giderme](Troubleshooting) | [Sorun Bildirin](https://github.com/KnevS/Tesla-Carview/issues)
