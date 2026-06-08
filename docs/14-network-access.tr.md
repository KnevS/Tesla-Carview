# Her yerden erişilebilir — sabit IP olmadan

> 🤖 *Bu Türkçe çeviri [14-network-access.en.md](14-network-access.en.md) dosyasından yapay zeka destekli oluşturulmuştur. Düzeltmeler GitHub üzerinden memnuniyetle karşılanır.*

> 🇩🇪 [Auf Deutsch lesen](14-network-access.md)

Bu bölüm, Tesla Carview'i nasıl her yerden erişilebilir hale getireceğinizi **adım adım** açıklar — sabit bir public IP adresi olmadan bile, ev yönlendiricisinin arkasında bile, residential internet bağlantısında bile.

> **IT uzmanı değilsiniz mi? Sorun değil.** Her seçenek, önceden bilgi sahibi olmadan takip edebileceğiniz net adım adım talimatlar içerir.

---

## Benim için hangi seçenek doğru?

| Durum | En iyi seçenek |
|---|---|
| Ev interneti (yönlendirici), IP günlük değişir | [Seçenek A: Cloudflare Tunnel](#secenek-a-cloudflare-tunnel-ev-kullanimi-icin-onerilir) veya [Seçenek B: DynDNS + Yönlendirici](#secenek-b-dyndns--ev-yonlendiricisi) |
| Kablo veya fiber internet — **port açamıyor** (CG-NAT) | [Seçenek A: Cloudflare Tunnel](#secenek-a-cloudflare-tunnel-ev-kullanimi-icin-onerilir) |
| Hosting sağlayıcısında kendi sunucu / VPS (netcup, Hetzner) | [Seçenek C: Sabit IP'li VPS](#secenek-c-bir-hosting-saglayicisinda-vps-netcup-hetzner-contabo) |
| Kendi alan adı mevcut | [Seçenek D: Kendi alan adı + DNS kaydı](#secenek-d-dns-kayitli-kendi-alan-adi) |

---

## Dinamik IP adresleriyle ilgili sorun

Ev internet bağlantınızın **sabit bir IP adresi yoktur** — yönlendirici her gün (veya daha sık) yeni bir tane alır. Bu şu anlama gelir: bugün uygulamaya `192.0.2.47` girerseniz, yarın yanlış olacaktır.

Çözüme **Dinamik DNS (DynDNS veya DDNS)** denir:
- Sabit bir alan adı ayırırsınız (örn. `my-tesla.duckdns.org`)
- Küçük bir program (yönlendiricinizde veya sunucunuzda otomatik çalışır) her değiştiğinde yeni IP adresini bildirir
- Alan adınız her zaman mevcut IP'ye işaret eder — manuel olarak hiçbir şey değiştirmeniz gerekmez

---

## Başka bir sorun: Public IPv4 yok (CG-NAT)

Birçok kablo internet bağlantısı (örn. Vodafone, Virgin Media, bazı mobil sağlayıcılar) artık kendi public IPv4 adresini sağlamaz. Birden fazla müşteri bir IP'yi paylaşır. Buna Carrier-Grade NAT (CG-NAT) denir.

**Tespit testi:** [https://api4.my-ip.io/ip](https://api4.my-ip.io/ip) adresine gidin ve görüntülenen IP ile yönlendiricinizin durum sayfasında gösterdiği IP'yi karşılaştırın. IP'ler **farklıysa** → CG-NAT arkasındasınız. Seçenek B **çalışmaz**.

CG-NAT ile, ek bir sunucu olmadan **Seçenek A (Cloudflare Tunnel)** tek çözümdür.

---

## Seçenek A: Cloudflare Tunnel (ev kullanımı için önerilir)

**Nedir?** Cloudflare Tunnel, sunucunuzdan internete şifrelenmiş bir giden bağlantı kurar — yönlendiricinizde herhangi bir port açmadan. Tesla Carview örneğiniz Cloudflare'in global ağı üzerinden erişilebilir hale gelir.

**Maliyet:** Ücretsiz.

**Gereksinimler:**
- Bir alan adı (örn. `mydomain.com`) **veya** ücretsiz bir alt alan adı (talimatlar aşağıda)
- Alan adı Cloudflare tarafından yönetilmelidir (ücretsiz adım)

### Adım 1: Ücretsiz bir alan adı edinin (yoksa)

Kendi alan adınız yoksa, DuckDNS kullanın:
1. [https://www.duckdns.org](https://www.duckdns.org) adresine gidin ve Google veya GitHub ile giriş yapın
2. Bir isim seçin, örn. `my-tesla` → `my-tesla.duckdns.org` alırsınız
3. **Token'ınızı** not edin (profilinizin altında gösterilen uzun alfasayısal dize)

Alternatif olarak: [Namecheap](https://www.namecheap.com), [Porkbun](https://www.porkbun.com) veya [inwx.de](https://www.inwx.de) gibi yerlerden ~1$/yıl gibi ucuz bir alan adı edinin.

### Adım 2: Cloudflare hesabı + alan adı ekle

1. [https://dash.cloudflare.com](https://dash.cloudflare.com) adresine gidin → ücretsiz kayıt olun
2. **"Add a Site"** öğesine tıklayın ve alan adınızı girin
3. **Free plan** (€0) seçin
4. Cloudflare size iki nameserver adresi gösterir, örn.:
   ```
   alice.ns.cloudflare.com
   bob.ns.cloudflare.com
   ```
5. Alan adı kayıt operatörünüze gidin (Namecheap, IONOS vb.) ve bunları **nameserver olarak** girin
   - Namecheap'te: Domain List → Manage → Nameservers → Custom DNS
   - IONOS'ta: Domains → alan adınız → Nameservers → Custom nameservers
6. Cloudflare **"Nameservers updated"** mesajını gösterene kadar 10–30 dakika bekleyin

### Adım 3: Tunnel'ı oluştur

Sunucunuzda (SSH veya terminal üzerinden):

```bash
# cloudflared'i kurun
curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb \
  -o /tmp/cloudflared.deb
dpkg -i /tmp/cloudflared.deb

# Cloudflare hesabınıza giriş yapın (bir tarayıcı penceresi açılır)
cloudflared tunnel login

# Tunnel'ı oluşturun (istediğiniz adı seçin)
cloudflared tunnel create tesla-carview

# Bu, Tunnel ID gösterir (örn. "abc123-...") — not edin!
```

### Adım 4: Tunnel'ı yapılandır

```bash
mkdir -p /etc/cloudflared
nano /etc/cloudflared/config.yml
```

İçerik (`YOUR_TUNNEL_ID` ve `yourdomain.com` değerlerini değiştirin):

```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: /root/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: tesla.yourdomain.com
    service: http://localhost:80
  - service: http_status:404
```

DNS kaydı oluştur (Cloudflare bunu otomatik yapar):
```bash
cloudflared tunnel route dns tesla-carview tesla.yourdomain.com
```

### Adım 5: Servis olarak kur (yeniden başlatmadan sonra otomatik başlar)

```bash
cloudflared service install
systemctl enable cloudflared
systemctl start cloudflared
```

**Tamamlandı!** Tesla Carview artık `https://tesla.yourdomain.com` adresinde erişilebilir — otomatik HTTPS ile, port yönlendirme olmadan, sabit IP olmadan.

---

## Seçenek B: DynDNS + Ev Yönlendiricisi

> **Önemli:** Yalnızca **kendi public IPv4** adresiniz varsa çalışır (CG-NAT yok). Önce bunu test edin — [yukarıya bakın](#baska-bir-sorun-public-ipv4-yok-cg-nat).

**Nedir?** Yönlendiriciniz yeni IP adresini otomatik olarak bir DynDNS servisine bildirir. Tesla Carview'e her zaman aynı alan adı altında ulaşabilirsiniz.

### Adım 1: Bir DynDNS servisi seçin ve kayıt olun

**Önerilen: Dynu** (tamamen ücretsiz, aylık onay gerekmez)

1. [https://www.dynu.com](https://www.dynu.com) adresine gidin → bir hesap oluşturun
2. DDNS → Add → bir isim girin, örn. `my-tesla` → `my-tesla.freeddns.org` alırsınız
3. Not edin: **hostname**, **username**, **password** (Control Panel → API Credentials altında)

**Alternatif: DuckDNS** (daha basit, ancak manuel yönlendirici yapılandırması gerektirir)

1. [https://www.duckdns.org](https://www.duckdns.org) → giriş yap → alt alan adı seç
2. Update URL: `https://www.duckdns.org/update?domains=YOURNAME&token=YOURTOKEN&ip=`

### Adım 2: Yönlendiricinizi yapılandırın

**FritzBox için:**
1. FritzBox arayüzünü açın: [http://fritz.box](http://fritz.box)
2. **Internet → Sharing → DynDNS**
3. **"Use DynDNS"** seçin
4. Doldurun:

   | Alan | Dynu değeri |
   |---|---|
   | DynDNS sağlayıcısı | User-defined |
   | Update URL | `https://api.dynu.com/nic/update?hostname=<domain>&myip=<ipaddr>` |
   | Alan adı | `my-tesla.freeddns.org` |
   | Kullanıcı adı | Dynu kullanıcı adı |
   | Parola | Dynu parolası |

5. **Apply** → FritzBox bağlantıyı test eder → yeşil tik = çalışıyor

**Diğer yönlendiriciler için:** Yönlendirici ayarlarında "Dynamic DNS" veya "DDNS" arayın — modern yönlendiricilerin çoğu benzer alanlarla bunu destekler.

### Adım 3: Port yönlendirme

Dış trafiğin sunucunuza ulaşması için:

1. **Internet → Sharing → Port Sharing** (FritzBox)
2. **New Port Sharing** → **Other Application**
3. Doldurun:

   | Alan | Değer |
   |---|---|
   | İsim | Tesla Carview HTTPS |
   | Protokol | TCP |
   | Dış port | 443 |
   | Cihaza | Yerel ağdaki sunucunuzun IP'si (örn. `192.168.1.100`) |
   | Dahili port | 443 |

4. **Apply** ve etkinleştirin

> **İpucu:** Port yönlendirmenin "kaymaması" için sunucunuza **sabit (statik) yerel IP** verin. FritzBox'ta: Home Network → Network → cihazınız → Always assign this IP.

### Adım 4: Tesla Carview'i yapılandır

`/opt/tesla-carview/backend/.env` dosyasını açın ve ayarlayın:

```bash
FRONTEND_URL=https://my-tesla.freeddns.org
```

Let's Encrypt üzerinden SSL sertifikası alın:
```bash
certbot --nginx -d my-tesla.freeddns.org
```

**Tamamlandı!** `https://my-tesla.freeddns.org` adresinde erişilebilir.

---

## Seçenek C: Bir hosting sağlayıcısında VPS (netcup, Hetzner, Contabo)

VPS (Virtual Private Server), bir veri merkezinde kiralanan küçük bir Linux sunucudur. Her zaman **sabit, public IPv4 adresi** vardır — DynDNS hilelerine gerek yok.

**Fiyat karşılaştırması (2026):**

| Sağlayıcı | Ürün | Fiyat/ay | Özellikler | Notlar |
|---|---|---|---|---|
| [netcup](https://www.netcup.com/en/server/vps-lite) | **VPS nano G11s** ⭐ | **~€3,08** | 2 vCore · 2 GB RAM · 60 GB SSD | En ucuz giriş noktası, Alman DC, sınırsız trafik — **TeslaView için önerilir** |
| [netcup](https://www.netcup.eu) | VPS 1000 G11 | ~€4,44 | 2 vCore · 2 GB RAM · 40 GB SSD | Biraz daha fazla performans alanı |
| [Hetzner](https://www.hetzner.com) | CX22 | ~€4,35 | 2 vCPU · 4 GB RAM · 40 GB | Çok güvenilir, Nuremberg/Falkenstein |
| [Contabo](https://contabo.com) | VPS S | ~€5,99 | 4 vCPU · 8 GB RAM · 100 GB | Çok kiracılı için bolca depolama |
| [IONOS](https://www.ionos.com) | VPS S | ~€1,00 | 1 vCore · 1 GB RAM · 10 GB | İlk ay ucuz, sonra daha yüksek |

> 💡 **netcup için indirim kodu:** Talep üzerine size netcup için kişisel bir indirim kodu gönderebiliriz. [rabatt-code-netcup@krische.com](mailto:rabatt-code-netcup@krische.com) adresine "netcup TeslaView" konu ile kısa bir e-posta gönderin.

> **TeslaView için neden VPS nano G11s?** Tesla Carview boştayken ~150–200 MB RAM kullanır (backend + nginx + proxy). 2 GB RAM bol miktarda alan sağlar. 60 GB SSD, birçok yıl telemetri verisi için yer sağlar (aktif bir araç için SQLite yılda ~500 MB büyür). 2 vCore, export ve migrasyon sorgularının poller'ı bloke etmemesini sağlar.

### netcup'ta kurulum (örnek)

1. [netcup.eu](https://www.netcup.eu) adresinde kayıt olun
2. **Server Control Panel (SCP)** → VPS sipariş et → Ubuntu 24.04 seçin
3. Onay e-postasından root parolasını kopyalayın
4. Bir terminal açın ve giriş yapın:
   ```bash
   ssh root@YOUR-SERVER-IP
   ```
5. Tesla Carview'i kurun:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
   ```

Kurulum scripti bir alan adı ister. Alan adınızı girin (örn. `tesla.yourdomain.com`) — Let's Encrypt ve nginx otomatik yapılandırılır.

### VPS'ye bir alan adı yönlendir

Kendi alan adınız varsa, bir **A kaydı** oluşturun:

```
tesla.yourdomain.com  →  A  →  YOUR-VPS-IP  →  TTL 300
```

Nasıl yapılır: [→ Aşağıdaki Seçenek D](#secenek-d-dns-kayitli-kendi-alan-adi)

---

## Seçenek D: DNS kayıtlı kendi alan adı

Kendi alan adınız varsa (örn. `yourdomain.com`) ve **sabit IP'li** bir sunucunuz varsa (VPS veya sabit ev IP'si), tek ihtiyacınız bir DNS kaydıdır.

### A kaydı nedir?

Bir **A kaydı**, bir telefon rehberi girişi gibi çalışır:
- Solda isim var: `tesla.yourdomain.com`
- Sağda adres var: `123.456.789.0` (sunucu IP'niz)
- `tesla.yourdomain.com` adresini ziyaret eden her tarayıcıya şu söylenir: "IP `123.456.789.0`"

### A kaydı nasıl oluşturulur

**Namecheap'te:**
1. Domain List → Manage → Advanced DNS → Add New Record
2. Tür: **A Record**, Host: `tesla`, Değer: sunucu IP'niz
3. Save All Changes

**IONOS'ta:**
1. Domains → alan adınız → DNS → Add record
2. Tür: **A**, Hostname: `tesla`, Destination: sunucu IP'niz
3. Save

**inwx.de'de:**
1. Domain management → DNS → Add record
2. Tür: **A**, Name: `tesla`, Content: sunucu IP'niz, TTL: 300
3. Save

**Hetzner DNS Console'da ([dns.hetzner.com](https://dns.hetzner.com)):**
1. Zone seç → Records → Add Record
2. Tür: **A**, Name: `tesla`, Value: sunucu IP'niz
3. Add record

> **TTL** (Time to Live), DNS girişlerinin ne kadar önbelleğe alınacağını belirler. İlk kurulum sırasında hataların hızlıca düzeltilebilmesi için 300 (5 dakika) ayarlayın. Sonradan 3600'e yükseltebilirsiniz.

### Doğrula: DNS kaydı yayıldı mı?

```bash
# Ev bilgisayarınızdan test edin:
nslookup tesla.yourdomain.com
# veya
dig tesla.yourdomain.com
```

Veya çevrimiçi: [https://dnschecker.org](https://dnschecker.org) — kaydın dünya genelinde görünür olup olmadığını gösterir.

### Kendi alan adınızla dinamik IP

Kendi alan adınız var ama sabit IP yoksa, her iki yaklaşımı birleştirin:

**Varyant 1: DuckDNS'e işaret eden CNAME** (yönlendirici DuckDNS'i otomatik günceller)
```
tesla.yourdomain.com  →  CNAME  →  my-tesla.duckdns.org
```

**Varyant 2: Update scripti + cron işi**
```bash
# IP'yi her 5 dakikada bir güncelleyen cron işi:
*/5 * * * * curl -s "https://www.duckdns.org/update?domains=my-tesla&token=YOURTOKEN&ip=$(curl -s https://api4.my-ip.io/ip)"
```

---

## Yaygın sorunlar ve çözümler

### Kurulumdan sonra "Site erişilemez"

1. **5–30 dakika bekleyin** — DNS girişlerinin yayılması zaman alır
2. **Önce yerel test edin:** Tesla Carview sunucuda erişilebilir mi?
   ```bash
   curl -I http://localhost
   ```
3. **Yönlendirici port yönlendirme:** Port sharing kuralının yanındaki **Test**'e tıklayın

### "Sertifika geçersiz" / HTTPS hataları

```bash
# Let's Encrypt sertifikasını yeniden yayınla:
certbot renew --force-renewal
systemctl restart nginx
```

### Yönlendirici update URL'si çalışmıyor

- Yönlendiriciniz `<ipaddr>` değerini mevcut IP ile değiştirir — manuel doldurmayın
- URL'yi tarayıcıda manuel test edin (`<ipaddr>` yerine geçici olarak gerçek IP'nizi koyun)
- Kontrol edin: yönlendiricinizin durumu public IP gösteriyor mu? `10.x.x.x` veya `100.x.x.x` ile başlayan bir adres CG-NAT anlamına gelir

### "IP'm 100. veya 10. ile başlıyor"

Bu **CG-NAT**'tır — bkz. [Seçenek A (Cloudflare Tunnel)](#secenek-a-cloudflare-tunnel-ev-kullanimi-icin-onerilir), ek bir sunucu olmadan tek çözüm budur.

### IPv4 yerine IPv6

Yeni internet bağlantıları (özellikle fiber) **IPv6** ile çalışır. Bu aynı şekilde çalışır — yönlendiricinizin sabit bir IPv6 adresi vardır ve DynDNS gerekmez. DNS kaydında **A** (IPv4) yerine **AAAA** (IPv6) türünü kullanın.

---

## Karar ağacı

```
CG-NAT arkasında mısınız?  (IP 100. ile başlıyor veya yönlendiriciniz ipify.org'dan farklı bir IP gösteriyor)
  → EVET:  Seçenek A (Cloudflare Tunnel)
  → HAYIR:
      Bir veri merkezinde sunucunuz var mı?
        → EVET:  Seçenek C + D (VPS + DNS kaydı)
        → HAYIR (ev ağı):  Seçenek B (DynDNS + yönlendirici)
```

---

## Faydalı bağlantılar

- [Cloudflare Tunnel dokümantasyonu](https://developers.cloudflare.com/tunnel/)
- [DuckDNS](https://www.duckdns.org/)
- [Dynu DDNS](https://www.dynu.com/)
- [netcup Community Tutorial: nginx Reverse Proxy](https://community.netcup.com/en/tutorials/how-to-setup-nginx-reverse-proxy)
- [Hetzner DNS Console](https://dns.hetzner.com)
- [dnschecker.org — DNS yayılımını doğrula](https://dnschecker.org)
- [ipify.org — public IP'nizi kontrol edin](https://api4.my-ip.io/ip)

---

*→ [02-deployment.en.md](02-deployment.en.md) dosyasına geri dön | [Tüm dokümanlar](README.en.md)*
