🌐 **Dil:** [EN](Installation) · [DE](DE-Installation) · [FR](FR-Installation) · [ES](ES-Installation) · **TR** · [EL](EL-Installation)

---

# Kurulum Kılavuzu

> **Gereken süre:** ~30 dakika | **Zorluk:** Başlangıç seviyesi

Bu kılavuz seni sıfırdan eksiksiz bir Tesla Carview kurulumundan geçirir.

---

## Başlamadan önce ne lazım

Herhangi bir komut çalıştırmadan önce şunlara sahip olduğundan emin ol:

- [ ] Linux sunucu, VPS veya Raspberry Pi (aşağıdaki [donanım seçeneklerine](#donanım-seçenekleri) bak)
- [ ] Sunucuna işaret eden bir alan adı — VEYA DynDNS / Cloudflare Tunnel kullanmayı planla ([→ Ağ Erişimi](TR-Network-Access))
- [ ] Tesla Geliştirici hesabı ([→ Tesla API Kurulumu](TR-Tesla-API-Setup))
- [ ] Sunucuna SSH erişimi (veya Pi'de klavye + ekran)

---

## Donanım seçenekleri

### Seçenek 1: Raspberry Pi (ev sunucusu)
İdeal olan: evde kişisel kullanım, düşük maliyet (~60–120 € toplam)

| Model | RAM | Önerilen depolama |
|---|---|---|
| Raspberry Pi 5 (önerilen) | 4 GB veya 8 GB | M.2 HAT+ ile NVMe SSD |
| Raspberry Pi 4 | 4 GB | USB SSD |
| Raspberry Pi 3 | 1 GB | USB SSD (daha yavaş) |

> ⚠️ **Önemli:** Kalıcı çalışma için SD kart kullanma. Tesla Carview'in yazma yükü altında aylarca dayanır. 20 dakikada düzeltmek için [Raspberry Pi Depolama](TR-Raspberry-Pi-Storage)'ya bak.

### Seçenek 2: Hosting sağlayıcısında VPS
İdeal olan: 7/24 kullanılabilirlik, yönetilecek donanım yok, kolay kurulum

| Sağlayıcı | Aylık maliyet | Notlar |
|---|---|---|
| [Hetzner](https://www.hetzner.com) CX22 | ~4,35 € | Önerilen, çok güvenilir |
| [netcup](https://www.netcup.eu) VPS 1000 | ~4,44 € | Alman veri merkezleri |
| [Contabo](https://contabo.com) VPS S | ~5,99 € | Çok depolama |

Bir VPS'nin **sabit bir genel IP adresi** vardır — DynDNS kurulumuna gerek yok.

---

## Adım 1: Sunucuyu hazırla

SSH ile sunucuna bağlan (veya Pi'de terminal aç):

```bash
ssh root@SUNUCU-IP'N
```

Sistemin güncel olduğundan emin ol:

```bash
apt update && apt upgrade -y
```

---

## Adım 2: Alan adını sunucuna yönlendir

Tesla Carview **HTTPS gerektirir** (Tesla'nın API'si yalnızca güvenli bağlantılar üzerinden çalışır). Bu, geçerli bir SSL sertifikasıyla alan adı gerektirir.

**Sabit IP'li VPS'im var:**
→ Alan adı kayıt şirketine git ve A kaydı oluştur:
```
tesla.alaninadın.com  →  A  →  VPS-IP'N
```
DNS'in yayılması için 5–30 dakika bekle, sonra devam et.

**Evdeyim, sabit IP'm yok:**
→ [Ağ Erişimi](TR-Network-Access)'ne bak — önce DynDNS veya Cloudflare Tunnel kur, sonra buraya geri dön.

**Hiç alan adım yok:**
→ [DuckDNS.org](https://www.duckdns.org)'dan ücretsiz alt alan adı al (ör. `tesla-benim.duckdns.org`) — ücretsiz ve Let's Encrypt ile çalışır.

---

## Adım 3: Kurulum betiğini çalıştır

Bu tek komut etkileşimli kurulum sihirbazını indirir ve çalıştırır:

```bash
curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
```

Sihirbaz sana bir dizi soru sorar:

| Soru | Ne gireceğin |
|---|---|
| Alan adı | `tesla.alaninadın.com` veya `tesla-benim.duckdns.org` |
| Admin kullanıcı adı | Herhangi bir isim (ör. adın, `admin`) |
| Admin şifresi | Güçlü bir şifre (min. 12 karakter) |
| Kiracı adı | Kurulumuna ne diyeceğin (ör. "Benim Teslam") |
| HTTPS'yi etkinleştir | Evet (her zaman — Tesla API için gerekli) |

Betik daha sonra otomatik olarak:
1. Docker, nginx, certbot, fail2ban kurar
2. Alan adın için Let's Encrypt SSL sertifikası alır
3. nginx'i güvenlik başlıklarıyla yapılandırır
4. Tüm Docker konteynerlerini başlatır
5. Veritabanını kurar

**Bu 5–10 dakika sürer.**

---

## Adım 4: İlk giriş

Tarayıcını aç ve `https://tesla.alaninadın.com`'a git

Tesla Carview giriş sayfasını görmelisin. 3. Adımda belirlediğin admin kullanıcı adı ve şifreyi gir.

> 💡 **İpucu:** Giriş sayfasında "Oturumumu açık tut (90 gün)"u işaretle, böylece her seferinde şifreni yazmak zorunda kalmazsın — özellikle Tesla tarayıcısından erişirken kullanışlı.

---

## Adım 5: Tesla hesabını bağla

Giriş yaptıktan sonra Tesla hesabını bağlamak için bir kurulum istemi göreceksin. [Tesla API Kurulumu](TR-Tesla-API-Setup)'ndaki talimatları takip et.

---

## Adım 6: Bitti!

Tesla Carview kurulumun çalışıyor. Uygulama araç verilerini otomatik olarak sorgulamaya başlayacak.

Bundan sonra ne yapmalı:
- **Aracını kur** → Panel → Araç Ekle
- **Bildirimleri yapılandır** → Ayarlar → Anlık Bildirimler
- **Aile üyelerini davet et** → Admin → Kullanıcılar → Davet Et
- **Şarj konumu oluştur** → Ayarlar → Şarj Konumları

---

## Güncelleme

Tesla Carview kendini otomatik olarak güncelleyebilir. Ayarlardan etkinleştir:

```bash
# /opt/tesla-carview/backend/.env içinde:
AUTO_UPDATE_ENABLED=true
```

Veya manuel güncelle:

```bash
cd /opt/tesla-carview
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

---

## Kurulum sorunlarını giderme

**Betiği çalıştırırken "Permission denied"**
→ `root` olarak çalıştırdığından emin ol. Önce `sudo su` çalıştır.

**certbot sırasında "Domain not found"**
→ DNS henüz yayılmadı. 10–30 dakika bekle ve tekrar dene. Şununla kontrol et: `nslookup tesla.alaninadın.com`

**Konteynerler başlamıyor**
→ Loglara bak: `docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs`

**Daha fazla yardım** → [Sorun Giderme](TR-Troubleshooting) | [Bir sorun bildir](https://github.com/KnevS/Tesla-Carview/issues)
