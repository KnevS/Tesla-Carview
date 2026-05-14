# Ağ Erişimi — Statik IP Olmadan

Tesla Carview kendi sunucunuzda çalışır — ancak internetten (Tesla'nızdan da dahil olmak üzere) erişilebilir olması için kararlı, kamuya açık bir adrese ihtiyacınız var. Bu sayfa, her seçeneği adım adım anlatır.

> **BT uzmanı değil misiniz?** Bu sayfayı baştan sona takip edin. Her seçenek, ön bilgi gerektirmeyen kesin talimatlar içerir.

---

🌐 **Language / Sprache / Langue / Idioma / Dil / Γλώσσα**

| | |
|---|---|
| 🇬🇧 **[English](Network-Access)** | English version |
| 🇩🇪 **[Deutsch](DE-Network-Access)** | Deutsche Version |
| 🇫🇷 **[Français](FR-Network-Access)** | Version française |
| 🇪🇸 **[Español](ES-Network-Access)** | Versión en español |
| 🇹🇷 **[Türkçe](TR-Network-Access)** | Buradasınız |
| 🇬🇷 **[Ελληνικά](EL-Network-Access)** | Ελληνική έκδοση |

---

## Hangi seçenek benim için doğru?

| Durumunuz | En iyi seçenek |
|---|---|
| Ev interneti (IP her gün değişiyor) | [Seçenek A: Cloudflare Tunnel](#seçenek-a-cloudflare-tunnel-önerilen) veya [Seçenek B: DynDNS + Yönlendirici](#seçenek-b-dyndns--ev-yönlendiricisi) |
| Kablo / fiber — **port açamıyorum** (CG-NAT) | [Seçenek A: Cloudflare Tunnel](#seçenek-a-cloudflare-tunnel-önerilen) |
| Barındırma sağlayıcısında VPS / sunucu | [Seçenek C: Statik IP'li VPS](#seçenek-c-barındırma-sağlayıcısında-vps) |
| Bir alan adına sahipsiniz | [Seçenek D: Kendi alan adı + DNS kaydı](#seçenek-d-dns-kaydıyla-kendi-alan-adı) |

---

## Ev internetinin sorunu

Ev internet bağlantınız **her gün yeni bir IP adresi** alır (veya daha sık). Bu, bugün girdiğiniz adresin yarın yanlış olacağı anlamına gelir.

**Dinamik DNS** bunu çözer:
- Sabit bir ana bilgisayar adı ayırtırsınız (örn. `my-tesla.duckdns.org`)
- Yönlendiricinizde veya sunucunuzda küçük bir program her yeni IP'yi otomatik olarak bildirir
- Ana bilgisayar adınız her zaman mevcut IP'yi gösterir — manuel güncelleme gerekmez

---

## CG-NAT arkasında mısınız?

Pek çok kablo sağlayıcısı (Vodafone, Virgin Media ve diğerleri) artık her müşteriye kendi genel IPv4'ünü vermiyor. Birden fazla müşteri tek bir IP'yi paylaşıyor — buna **Taşıyıcı Sınıfı NAT (CG-NAT)** denir.

**Nasıl kontrol edilir:**
1. [https://api4.my-ip.io/ip](https://api4.my-ip.io/ip) adresini ziyaret edin — gösterilen IP'yi not edin
2. Yönlendiricinizin durum sayfasını açın — oradaki WAN IP'yi not edin
3. İki IP **farklıysa** → CG-NAT arkasındasınız

CG-NAT ile port yönlendirme **çalışmaz**. Seçenek A'yı (Cloudflare Tunnel) kullanın — açık port gerektirmez.

---

## Seçenek A: Cloudflare Tunnel (Önerilen)

Cloudflare Tunnel, sunucunuzdan Cloudflare'in küresel ağına şifreli, giden bir bağlantı oluşturur. Port yönlendirme gerekmez. Ücretsiz. CG-NAT arkasında çalışır.

**Gereksinimler:** Bir alan adı veya ücretsiz alt alan adı (aşağıda talimatlar).

### Adım 1: Ücretsiz alan adı alın (yoksa)

[duckdns.org](https://www.duckdns.org) adresine gidin, Google veya GitHub ile giriş yapın, bir ad seçin → örneğin `my-tesla.duckdns.org` adresini ücretsiz alırsınız.

Ya da [Porkbun](https://www.porkbun.com), [Namecheap](https://www.namecheap.com) veya [inwx.de](https://www.inwx.de) adreslerinden ucuz bir alan adı satın alın (~1$/yıl).

### Adım 2: Alan adınızı Cloudflare'e ekleyin

1. [dash.cloudflare.com](https://dash.cloudflare.com) adresine kayıt olun — ücretsiz
2. **"Add a Site"** → alan adınızı girin → **Ücretsiz plan**
3. Cloudflare size iki isim sunucusu adresi gösterir, örn.:
   ```
   alice.ns.cloudflare.com
   bob.ns.cloudflare.com
   ```
4. Alan adı kayıt kuruluşunuza gidin ve bunları isim sunucuları olarak girin
5. 10–30 dakika bekleyin → Cloudflare "Nameservers updated" onaylar

### Adım 3: `cloudflared`'ı yükleyin ve yapılandırın

Sunucunuzda (SSH üzerinden):

```bash
# İndir ve yükle
curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb \
  -o /tmp/cloudflared.deb
dpkg -i /tmp/cloudflared.deb

# Giriş yapın (bir tarayıcı bağlantısı gösterilir — açın)
cloudflared tunnel login

# Tünel oluşturun
cloudflared tunnel create tesla-carview
# Gösterilen Tünel Kimliğini not edin!
```

Yapılandırma dosyası oluşturun:

```bash
mkdir -p /etc/cloudflared
nano /etc/cloudflared/config.yml
```

İçerik (`YOUR_TUNNEL_ID` ve `yourdomain.com` kısmını değiştirin):

```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: /root/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: tesla.yourdomain.com
    service: http://localhost:80
  - service: http_status:404
```

DNS girişini otomatik olarak oluşturun:

```bash
cloudflared tunnel route dns tesla-carview tesla.yourdomain.com
```

### Adım 4: Sistem servisi olarak yükleyin

```bash
cloudflared service install
systemctl enable cloudflared
systemctl start cloudflared
```

**Tamamlandı.** Tesla Carview artık `https://tesla.yourdomain.com` adresinde erişilebilir — otomatik HTTPS ile, açık port olmadan, statik IP gerekmeden.

---

## Seçenek B: DynDNS + Ev Yönlendiricisi

> **Önemli:** Yalnızca gerçek bir genel IPv4 adresiniz varsa çalışır. [Önce CG-NAT'ı kontrol edin](#cg-nat-arkasında-mısınız).

### Adım 1: Bir DynDNS servisiyle kayıt olun

**Dynu** (ücretsiz, aylık onay gerektirmez):
1. [dynu.com](https://www.dynu.com) → hesap oluştur → DDNS → Ekle
2. Bir ad girin, örn. `my-tesla` → `my-tesla.freeddns.org` alırsınız
3. Ana bilgisayar adınızı, kullanıcı adınızı ve şifrenizi not edin (Kontrol Paneli → API Kimlik Bilgileri)

**DuckDNS** (daha da basit):
1. [duckdns.org](https://www.duckdns.org) → giriş yap → alt alan adı seç → token'ınızı not edin

### Adım 2: Yönlendiricinizi yapılandırın

**FritzBox:**
1. [http://fritz.box](http://fritz.box) → **İnternet → Paylaşım → DynDNS**
2. **"DynDNS kullan"** seçeneğini işaretleyin ve doldurun:

   | Alan | Dynu | DuckDNS |
   |---|---|---|
   | Sağlayıcı | Kullanıcı tanımlı | Kullanıcı tanımlı |
   | Güncelleme URL'si | `https://api.dynu.com/nic/update?hostname=<domain>&myip=<ipaddr>` | `https://www.duckdns.org/update?domains=YOURNAME&token=YOURTOKEN&ip=<ipaddr>` |
   | Alan adı | `my-tesla.freeddns.org` | `my-tesla.duckdns.org` |
   | Kullanıcı adı | Dynu kullanıcı adı | — |
   | Şifre | Dynu şifresi | — |

3. **Uygula** → yeşil onay işareti = çalışıyor

**Diğer yönlendiriciler:** İnternet/WAN ayarlarında "Dynamic DNS" veya "DDNS" arayın.

### Adım 3: Port yönlendirme

Gelen trafiğin sunucunuza ulaşması için:

**FritzBox:** İnternet → Paylaşım → Port Paylaşımı → Yeni Port Paylaşımı → Diğer Uygulama

| Alan | Değer |
|---|---|
| Ad | Tesla Carview |
| Protokol | TCP |
| Harici port | 443 |
| Cihaza | Sunucunuzun yerel IP'si (örn. `192.168.1.100`) |
| İç port | 443 |

> **İpucu:** Sunucunuza sabit bir yerel IP verin. FritzBox'ta: Ev Ağı → Ağ → cihazınız → Her zaman bu IP'yi ata.

### Adım 4: SSL sertifikası ve Tesla Carview yapılandırması

```bash
# /opt/tesla-carview/backend/.env dosyasında FRONTEND_URL'yi ayarlayın:
FRONTEND_URL=https://my-tesla.freeddns.org

# SSL sertifikası alın:
certbot --nginx -d my-tesla.freeddns.org
```

---

## Seçenek C: Barındırma Sağlayıcısında VPS

VPS (Sanal Özel Sunucu), **sabit, kalıcı genel IP'ye** sahip küçük bir kiralık Linux sunucusudur. DynDNS veya port yönlendirme gerekmez.

**Fiyat karşılaştırması (2025):**

| Sağlayıcı | Ürün | Aylık fiyat |
|---|---|---|
| [Hetzner](https://www.hetzner.com) | CX22 | ~€4.35 |
| [netcup](https://www.netcup.eu) | VPS 1000 G11 | ~€4.44 |
| [Contabo](https://contabo.com) | VPS S | ~€5.99 |

**Kurulum (örnek: Hetzner):**
1. Kayıt olun → sunucu oluşturun → Ubuntu 24.04 seçin → genel IP'yi not edin
2. SSH ile bağlanın: `ssh root@YOUR-SERVER-IP`
3. Kurulum betiğini çalıştırın:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
   ```

Betik, alan adınızı sorar ve nginx + Let's Encrypt'i otomatik olarak yapılandırır.

Ardından bir alan adını buna yönlendirin → [Seçenek D](#seçenek-d-dns-kaydıyla-kendi-alan-adı)

---

## Seçenek D: DNS Kaydıyla Kendi Alan Adı

Kendi alan adınız ve sabit IP'li bir sunucunuz varsa, bir **A kaydı** oluşturun:

**A kaydı nedir?** Bir telefon defteri girişidir: `tesla.yourdomain.com → 123.456.789.0`

**Cloudflare DNS'te:**
DNS → Kayıt ekle → Tür: A, Ad: `tesla`, IPv4: sunucu IP'niz → Kaydet

**Namecheap'te:**
Alan Listesi → Yönet → Gelişmiş DNS → Yeni Kayıt Ekle → A Kaydı, Host: `tesla`, Değer: IP'niz

**IONOS'ta:**
Alan adları → alan adınız → DNS → Kayıt ekle → A, Ana bilgisayar adı: `tesla`, Hedef: IP'niz

**Hetzner DNS'te ([dns.hetzner.com](https://dns.hetzner.com)):**
Bölge seçin → Kayıtlar → Kayıt Ekle → A, Ad: `tesla`, Değer: IP'niz

> **TTL:** Başlangıçta 300 (5 dakika) olarak ayarlayın — hataları düzeltmeyi kolaylaştırır. Daha sonra 3600'e yükseltin.

### Yayılımı doğrulayın

```bash
nslookup tesla.yourdomain.com
# ya da çevrimiçi: https://dnschecker.org
```

### Kendi alan adıyla dinamik IP

Alan adınız var ama sabit IP'niz yoksa:

**CNAME → DuckDNS** (yönlendirici DuckDNS'i güncel tutar):
```
tesla.yourdomain.com  →  CNAME  →  my-tesla.duckdns.org
```

---

## Karar Ağacı

```
Yönlendirici IP'niz https://api4.my-ip.io/ip'nin gösterdiğinden farklı mı?
  EVET (CG-NAT) → Seçenek A: Cloudflare Tunnel
  HAYIR:
    Veri merkezinde bir sunucunuz var mı?
      EVET → Seçenek C + D (VPS + DNS kaydı)
      HAYIR (ev ağı):
        Kendi alan adınız var mı?
          EVET → Seçenek B (DynDNS) + Seçenek D (DNS kaydı)
          HAYIR  → Ücretsiz alt alan adıyla Seçenek B (DuckDNS/Dynu)
```

---

## Sık Karşılaşılan Sorunlar

### Kurulumdan hemen sonra "Site erişilemiyor"

DNS yayılması 5–30 dakika alır. Önce yerel olarak test edin:
```bash
curl -I http://localhost
```

### "Sertifika geçersiz" / HTTPS hataları

```bash
certbot renew --force-renewal
systemctl restart nginx
```

### Yönlendirici DynDNS güncelleme URL'si çalışmıyor

Yönlendiriciniz `<ipaddr>` kısmını otomatik olarak değiştirir — manuel olarak doldurmayın. URL'yi tarayıcıda test edin, `<ipaddr>` kısmını gerçek mevcut IP'nizle değiştirin.

### "WAN IP'm 100. veya 10. ile başlıyor"

Bu CG-NAT'tır → [Seçenek A (Cloudflare Tunnel)](#seçenek-a-cloudflare-tunnel-önerilen) kullanın.

### IPv6 / IPv4 yok

Daha yeni fiber bağlantılar IPv6 kullanır. Aynı şekilde çalışır — DNS'te **A** kaydı yerine **AAAA** kaydı kullanın. Yönlendiriciniz sabit bir IPv6 öneki tutar (çoğu bağlantıda IPv6 için DynDNS gerekmez).

---

## Yararlı Bağlantılar

- [Cloudflare Tunnel belgeleri](https://developers.cloudflare.com/tunnel/)
- [DuckDNS](https://www.duckdns.org/) — ücretsiz dinamik DNS
- [Dynu DDNS](https://www.dynu.com/) — ücretsiz, aylık onay gerektirmez
- [dnschecker.org](https://dnschecker.org) — DNS yayılımını dünya genelinde doğrulayın
- [api4.my-ip.io/ip](https://api4.my-ip.io/ip) — genel IP'nizi kontrol edin

---

*→ [[Installation]] | [[Raspberry-Pi-Storage]] | [[Home]]*
