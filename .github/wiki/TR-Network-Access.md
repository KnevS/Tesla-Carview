🌐 **Dil:** [EN](Network-Access) · [DE](DE-Network-Access) · [FR](FR-Network-Access) · [ES](ES-Network-Access) · **TR** · [EL](EL-Network-Access)

---

# Ağ Erişimi — Statik IP Olmadan

Tesla Carview kendi sunucunda çalışır — ancak internetten erişilebilir olması için (Tesla'ndan da dahil) kararlı, kamuya açık bir adrese ihtiyaç var. Bu sayfa her seçeneği adım adım anlatıyor.

> **IT uzmanı değil misin?** Bu sayfayı yukarıdan aşağıya takip et. Her seçenek önceden bilgi gerektirmeden kesin talimatlar içerir.

---

## Hangi seçenek benim için uygun?

| Durumun | En iyi seçenek |
|---|---|
| Ev interneti (IP her gün değişiyor) | [Seçenek A: Cloudflare Tunnel](#seçenek-a-cloudflare-tunnel-önerilen) veya [Seçenek B: DynDNS + Router](#seçenek-b-dyndns--ev-routerı) |
| Kablo / fiber — **port açamazın** (CG-NAT) | [Seçenek A: Cloudflare Tunnel](#seçenek-a-cloudflare-tunnel-önerilen) |
| Hosting sağlayıcısında VPS / sunucu | [Seçenek C: Statik IP'li VPS](#seçenek-c-hosting-sağlayıcısında-vps) |
| Kendi alan adın var | [Seçenek D: Kendi alan adı + DNS kaydı](#seçenek-d-dns-kaydıyla-kendi-alan-adı) |

---

## Ev interneti ile ilgili sorun

Ev internet bağlantın her gün (veya daha sık) **yeni bir IP adresi alır**. Bu, bugün girdiğin adresin yarın yanlış olacağı anlamına gelir.

**Dinamik DNS bunu çözer:**
- Sabit bir hostname ayırtırsın (ör. `tesla-benim.duckdns.org`)
- Routerın veya sunucundaki küçük bir program her yeni IP'yi otomatik olarak bildirir
- Hostname her zaman mevcut IP'ye işaret eder — manuel güncelleme gerekmez

---

## CG-NAT'ın arkasında mısın?

Birçok kablo sağlayıcısı (Turkcell, Türk Telekom ve diğerleri) artık her müşteriye kendi genel IPv4'ünü vermiyor. Birden fazla müşteri tek IP'yi paylaşır — bu **Operatör Sınıfı NAT (CG-NAT)**'tır.

**Nasıl kontrol edilir:**
1. [https://api4.my-ip.io/ip](https://api4.my-ip.io/ip)'yi ziyaret et — gösterilen IP'yi not al
2. Routerın durum sayfasını aç — oradaki WAN IP'sini not al
3. İki IP **farklıysa** → CG-NAT'ın arkındasın

CG-NAT ile port yönlendirme **çalışmaz**. Seçenek A'yı kullan (Cloudflare Tunnel) — açık port gerektirmez.

---

## Seçenek A: Cloudflare Tunnel (Önerilen)

Cloudflare Tunnel, sunucundan Cloudflare'nin küresel ağına şifreli bir giden bağlantı oluşturur. Port yönlendirme gerekmez. Ücretsiz. CG-NAT'ın arkasında çalışır.

**Gereksinimler:** Bir alan adı veya ücretsiz alt alan adı (aşağıda talimatlar).

### Adım 1: Ücretsiz alan adı al (yoksa)

[duckdns.org](https://www.duckdns.org)'a git, Google veya GitHub ile giriş yap, bir isim seç → ör. `tesla-benim.duckdns.org`'u ücretsiz alırsın.

Veya [Porkbun](https://www.porkbun.com), [Namecheap](https://www.namecheap.com) veya [inwx.de](https://www.inwx.de)'de ucuz bir alan adı satın al (~1 $/yıl).

### Adım 2: Alan adını Cloudflare'ye ekle

1. [dash.cloudflare.com](https://dash.cloudflare.com)'a kaydol — ücretsiz
2. **"Add a Site"**'a tıkla → alan adını gir → **Ücretsiz plan**
3. Cloudflare iki nameserver adresi gösterir, ör.:
   ```
   alice.ns.cloudflare.com
   bob.ns.cloudflare.com
   ```
4. Alan adı kayıt şirketine git ve bunları nameserver olarak gir
5. 10–30 dakika bekle → Cloudflare "Nameservers updated" onaylar

### Adım 3: `cloudflared`'ı kur ve yapılandır

Sunucunda (SSH ile):

```bash
# İndir ve kur
curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb \
  -o /tmp/cloudflared.deb
dpkg -i /tmp/cloudflared.deb

# Giriş yap (bir tarayıcı bağlantısı gösterilir — onu aç)
cloudflared tunnel login

# Tunnel oluştur
cloudflared tunnel create tesla-carview
# Gösterilen Tunnel ID'yi not al!
```

Yapılandırma dosyası oluştur:

```bash
mkdir -p /etc/cloudflared
nano /etc/cloudflared/config.yml
```

İçerik (`YOUR_TUNNEL_ID` ve `alaninadın.com`'u değiştir):

```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: /root/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: tesla.alaninadın.com
    service: http://localhost:80
  - service: http_status:404
```

DNS girişini otomatik oluştur:

```bash
cloudflared tunnel route dns tesla-carview tesla.alaninadın.com
```

### Adım 4: Sistem servisi olarak kur

```bash
cloudflared service install
systemctl enable cloudflared
systemctl start cloudflared
```

**Bitti.** Tesla Carview artık `https://tesla.alaninadın.com`'da erişilebilir — otomatik HTTPS, açık port yok, statik IP gerekmez.

---

## Seçenek B: DynDNS + Ev Routerı

> **Önemli:** Yalnızca gerçek bir genel IPv4 adresiniz varsa çalışır. [Önce CG-NAT'ı kontrol et](#cg-natın-arkasında-mısın).

### Adım 1: DynDNS hizmetine kaydol

**Dynu** (ücretsiz, aylık onay gerekmez):
1. [dynu.com](https://www.dynu.com)'a git → hesap oluştur → DDNS → Add
2. Bir isim gir, ör. `tesla-benim` → `tesla-benim.freeddns.org` alırsın
3. Hostname, kullanıcı adı ve şifrenı not al (Kontrol Paneli → API Kimlik Bilgileri)

**DuckDNS** (daha da basit):
1. [duckdns.org](https://www.duckdns.org) → giriş yap → alt alan adı seç → tokenını not al

### Adım 2: Routerını yapılandır

Routerının internet/WAN ayarlarında "Dinamik DNS" veya "DDNS"'i ara.

| Alan | Dynu | DuckDNS |
|---|---|---|
| Sağlayıcı | Kullanıcı tanımlı | Kullanıcı tanımlı |
| Güncelleme URL'si | `https://api.dynu.com/nic/update?hostname=<domain>&myip=<ipaddr>` | `https://www.duckdns.org/update?domains=ADIN&token=TOKENIN&ip=<ipaddr>` |
| Alan adı | `tesla-benim.freeddns.org` | `tesla-benim.duckdns.org` |
| Kullanıcı adı | Dynu kullanıcı adı | — |
| Şifre | Dynu şifresi | — |

### Adım 3: Port yönlendirme

Gelen trafiğin sunucuna ulaşması için:

| Alan | Değer |
|---|---|
| Ad | Tesla Carview |
| Protokol | TCP |
| Dış port | 443 |
| Cihaza | Sunucunun yerel IP'si (ör. `192.168.1.100`) |
| İç port | 443 |

> **İpucu:** Router ayarlarından sunucuna sabit yerel IP ata.

### Adım 4: SSL sertifikası ve Tesla Carview yapılandırması

```bash
# /opt/tesla-carview/backend/.env'de FRONTEND_URL'yi ayarla:
FRONTEND_URL=https://tesla-benim.freeddns.org

# SSL sertifikası al:
certbot --nginx -d tesla-benim.freeddns.org
```

---

## Seçenek C: Hosting Sağlayıcısında VPS

Bir VPS (Virtual Private Server), **sabit ve kalıcı bir genel IP'ye sahip** küçük bir kiralık Linux sunucusudur. DynDNS, port yönlendirme gerekmez.

**Fiyat karşılaştırması (2025):**

| Sağlayıcı | Ürün | Fiyat/ay |
|---|---|---|
| [Hetzner](https://www.hetzner.com) | CX22 | ~4,35 € |
| [netcup](https://www.netcup.eu) | VPS 1000 G11 | ~4,44 € |
| [Contabo](https://contabo.com) | VPS S | ~5,99 € |

**Kurulum (örnek: Hetzner):**
1. Kaydol → sunucu oluştur → Ubuntu 24.04 seç → genel IP'yi not al
2. SSH ile bağlan: `ssh root@SUNUCU-IP'N`
3. Kurulum betiğini çalıştır:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
   ```

Betik alan adını sorar ve nginx + Let's Encrypt'i otomatik yapılandırır.

Sonra bir alan adını buraya yönlendir → [Seçenek D](#seçenek-d-dns-kaydıyla-kendi-alan-adı)

---

## Seçenek D: DNS Kaydıyla Kendi Alan Adı

Kendi alan adın ve sabit IP'li bir sunucun varsa bir **A kaydı** oluştur:

**A kaydı nedir?** Bir telefon rehberi girişidir: `tesla.alaninadın.com → 123.456.789.0`

**Cloudflare DNS'te:**
DNS → Add record → Tür: A, Ad: `tesla`, IPv4: sunucu IP'n → Kaydet

**Namecheap'te:**
Domain List → Manage → Advanced DNS → Add New Record → A Record, Host: `tesla`, Value: IP'n

**IONOS'ta:**
Domains → alan adın → DNS → Add record → A, Hostname: `tesla`, Destination: IP'n

**Hetzner DNS'te ([dns.hetzner.com](https://dns.hetzner.com)):**
Bölgeyi seç → Records → Add Record → A, Name: `tesla`, Value: IP'n

> **TTL:** Başlangıçta 300 (5 dakika) ayarla — hataları düzeltmek kolaylaşır. Sonradan 3600'e çıkar.

### Yayılmayı doğrula

```bash
nslookup tesla.alaninadın.com
# veya çevrimiçi: https://dnschecker.org
```

### Kendi alan adınla dinamik IP

Alan adın var ama sabit IP'n yoksa:

**CNAME → DuckDNS** (router DuckDNS'i güncel tutar):
```
tesla.alaninadın.com  →  CNAME  →  tesla-benim.duckdns.org
```

---

## Karar Ağacı

```
Router IP'n https://api4.my-ip.io/ip'nin gösterdiğinden farklı mı?
  EVET (CG-NAT) → Seçenek A: Cloudflare Tunnel
  HAYIR:
    Veri merkezinde sunucun var mı?
      EVET → Seçenek C + D (VPS + DNS kaydı)
      HAYIR (ev ağı):
        Kendi alan adın var mı?
          EVET → Seçenek B (DynDNS) + Seçenek D (DNS kaydı)
          HAYIR → Seçenek B ile ücretsiz alt alan adı (DuckDNS/Dynu)
```

---

## Yaygın Sorunlar

### Kurulumdan hemen sonra "Site erişilemiyor"

DNS yayılması 5–30 dakika sürer. Önce yerel olarak test et:
```bash
curl -I http://localhost
```

### "Sertifika geçersiz" / HTTPS hataları

```bash
certbot renew --force-renewal
systemctl restart nginx
```

### Router'ın DynDNS güncelleme URL'si çalışmıyor

Router `<ipaddr>`'i otomatik olarak değiştirir — manuel doldurma. Mevcut gerçek IP'nle `<ipaddr>`'i değiştirerek URL'yi tarayıcıda test et.

### "WAN IP'm 100. veya 10. ile başlıyor"

Bu CG-NAT → [Seçenek A (Cloudflare Tunnel)](#seçenek-a-cloudflare-tunnel-önerilen)'ı kullan.

### IPv6 / IPv4 yok

Yeni fiber bağlantılar IPv6 kullanır. Aynı şekilde çalışır — DNS'te **A** yerine **AAAA** kaydı kullan.

---

## Faydalı Bağlantılar

- [Cloudflare Tunnel belgeleri](https://developers.cloudflare.com/tunnel/)
- [DuckDNS](https://www.duckdns.org/) — ücretsiz dinamik DNS
- [Dynu DDNS](https://www.dynu.com/) — ücretsiz, aylık onay yok
- [dnschecker.org](https://dnschecker.org) — DNS yayılımını dünya genelinde doğrula
- [api4.my-ip.io/ip](https://api4.my-ip.io/ip) — genel IP'ni kontrol et

---

*→ [[TR-Installation]] | [[TR-Raspberry-Pi-Storage]] | [[TR-Home]]*
