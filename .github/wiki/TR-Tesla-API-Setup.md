# Tesla API Kurulumu

Tesla Carview'u Tesla hesabınıza bağlamak için bir **Tesla Geliştirici hesabı** ve bir **OAuth uygulaması** gereklidir. Bu işlem yaklaşık 20–30 dakika sürer ve yalnızca bir kez yapılması yeterlidir.

---

🌐 **Language / Sprache / Langue / Idioma / Dil / Γλώσσα**

| | |
|---|---|
| 🇬🇧 **[English](Tesla-API-Setup)** | English version |
| 🇩🇪 **[Deutsch](DE-Tesla-API-Setup)** | Deutsche Version |
| 🇫🇷 **[Français](FR-Tesla-API-Setup)** | Version française |
| 🇪🇸 **[Español](ES-Tesla-API-Setup)** | Versión en español |
| 🇹🇷 **[Türkçe](TR-Tesla-API-Setup)** | Buradasınız |
| 🇬🇷 **[Ελληνικά](EL-Tesla-API-Setup)** | Ελληνική έκδοση |

---

## Genel bakış: Burada ne oluyor?

Tesla, OAuth 2.0 kullanır — "Google ile Giriş Yap" özelliğiyle aynı standart. Tesla'nın geliştirici portalında bir uygulama oluşturursunuz; bu uygulama bir **İstemci Kimliği (Client ID)** ve **İstemci Sırrı (Client Secret)** alır. Tesla Carview, bu bilgileri kullanarak sizin izninizle araç verilerinize erişim talep eder.

```
Tesla Geliştirici Portalı
  → Uygulama Kaydet → Client ID + Secret al
  → Tesla Carview'a gir
  → "Tesla Hesabını Bağla"ya tıkla
  → Tesla giriş sayfası açılır
  → Erişimi onaylarsınız
  → Tesla, Tesla Carview'a token'lar gönderir
  → Veriler akmaya başlar ✅
```

---

## Adım 1: Tesla Geliştirici hesabı oluşturun

1. [developer.tesla.com](https://developer.tesla.com) adresine gidin
2. Düzenli Tesla hesabınızla giriş yapın (araç için kullandığınızın aynısı)
3. Geliştirici koşullarını kabul edin

---

## Adım 2: Uygulamanızı kaydedin

1. Geliştirici portalında **"Add New Application"** düğmesine tıklayın
2. Formu doldurun:

   | Alan | Ne gireceğiniz |
   |---|---|
   | **Application Name** | Açıklayıcı bir şey, örn. "My Tesla Carview" |
   | **Description** | "Private self-hosted Tesla data logger" |
   | **Allowed Origin URL** | `https://tesla.yourdomain.com` |
   | **Redirect URI** | `https://tesla.yourdomain.com/api/auth/tesla/callback` |
   | **Application Type** | Web Application |

3. **Scopes** bölümünde şunları seçin:
   - `vehicle_device_data` — araç durumunu okumak için
   - `vehicle_cmds` — komut göndermek için (iklim, kilitler vb.)
   - `vehicle_charging_cmds` — şarj kontrolü için
   - `offline_access` — her saat yeniden giriş yapmadan bağlı kalmak için

4. **Save** düğmesine tıklayın

5. **Client ID** ve **Client Secret** bilgilerinizi not edin — bir sonraki adımda gerekecekler

> ⚠️ **Client Secret'ınızı gizli tutun.** `.env` dosyanıza gider ve asla paylaşılmamalı veya git'e commit edilmemelidir.

---

## Adım 3: Sanal Anahtarı ayarlayın (komutlar için)

Sanal Anahtar, Tesla'nın araca komut göndermek için kullandığı güvenlik mekanizmasıdır. Bu olmadan verileri okuyabilirsiniz ancak herhangi bir şeyi kontrol edemezsiniz (iklim başlatma, kilitleme/açma yok).

Tesla Carview anahtarı otomatik olarak oluşturur. Sadece onu arabanıza eklemeniz gerekir:

1. Tesla Carview'da **Ayarlar → Sanal Anahtar** bölümüne gidin
2. Gösterilen URL'yi kopyalayın (örneğin `https://tesla.yourdomain.com/api/virtual-key/pair` gibi görünür)
3. Bu URL'yi **arabanızın dokunmatik ekranındaki Tesla tarayıcısında** açın (telefonunuzda değil)
4. Arabanın ekranında **"Add key"** düğmesine dokunun
5. Telefonunuzdaki Tesla uygulamasıyla onaylayın (yeni anahtarı onaylamanızı ister)

Eşleştirme sonrasında, Tesla Carview üzerinden komutlar (iklim, kilitleme vb.) çalışmaya başlar.

---

## Adım 4: Kimlik bilgilerini Tesla Carview'a girin

1. Tesla Carview'da **Yönetici → Sistem** bölümüne gidin
2. **Client ID** ve **Client Secret** bilgilerinizi girin
3. **Kaydet** düğmesine tıklayın

Ya da doğrudan `.env` dosyasına ekleyin:

```bash
nano /opt/tesla-carview/backend/.env
```

```env
TESLA_CLIENT_ID=your-client-id-here
TESLA_CLIENT_SECRET=your-client-secret-here
```

Ardından yeniden başlatın:
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d
```

---

## Adım 5: Tesla hesabınızı bağlayın

1. Tesla Carview'da **Pano → Tesla Hesabını Bağla** bölümüne gidin (veya ilk girişte gelen istem)
2. **"Tesla ile Bağlan"** düğmesine tıklayın
3. Tesla'nın giriş sayfasına yönlendirilirsiniz — Tesla hesabınızla giriş yapın
4. Tesla, hangi araca erişim izni verileceğini sorar — arabanızı seçin
5. Tesla Carview'a geri yönlendirilirsiniz — bağlantı kuruldu ✅

Uygulama artık araba aktifken araç verilerini her 60 saniyede bir çeker; park halindeyken ve uyku modundayken ise pil şarjını tüketmemek için sorgulamayı yavaşlatır.

---

## Sık karşılaşılan sorunlar

### Tüm Tesla API çağrılarında "403 Forbidden"

Tesla geliştirici hesabınız **askıya alınmış veya oran sınırlandırmasına tabi** olabilir. Bu şu durumlarda olur:
- Çok fazla API çağrısı yapıldı (kısıtlama)
- Geliştirici portalındaki fatura bilgileriniz eksik
- Tesla hesabı işaretlenmiş

[developer.tesla.com](https://developer.tesla.com) adresini kontrol edin — fatura veya askıya alma bildirimi varsa önce bunu çözün.

### Araç sürülürken bile "çevrimdışı" görünüyor

Tesla'nın API'sinde bilinen bir kısıtlama var: bazı yeni araçlar (özellikle Model Y Juniper gibi XP7 VIN'li olanlar) standart endpoint üzerinden GPS verisi döndürmüyor. Tesla Carview bu araçlar için Fleet Telemetry kullanır. Bu otomatik olarak yapılandırılır.

### Komutlar çalışmıyor ("Virtual Key eşleştirilmemiş")

→ Yukarıdaki Adım 3'ü tekrarlayın. Eşleştirme URL'sini **Tesla tarayıcısında** açtığınızdan emin olun (telefonunuzda veya bilgisayarınızda değil).

### "Redirect URI mismatch"

Tesla Geliştirici Portalı'ndaki Redirect URI, girdiğinizle **tam olarak eşleşmelidir** — `https://` dahil, doğru alan adı ve sona slash olmadan.

---

## Veri sorgulama nasıl çalışır

Tesla Carview, araba aktifken varsayılan olarak her 60 saniyede bir aracınızı sorgular. Araç uyku modundayken (birkaç dakikadan fazla park halinde), 12V pili tüketmemek için sorgulama her 10 dakikaya yavaşlar.

Sorgulama aralığını `.env` dosyasından ayarlayabilirsiniz:
```env
POLL_INTERVAL_MS=60000        # 60 saniye (varsayılan)
POLL_SLEEP_INTERVAL_MS=600000 # Uyku modunda 10 dakika
```
