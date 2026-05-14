🌐 **Dil:** [EN](Tesla-API-Setup) · [DE](DE-Tesla-API-Setup) · [FR](FR-Tesla-API-Setup) · [ES](ES-Tesla-API-Setup) · **TR** · [EL](EL-Tesla-API-Setup)

---

# Tesla API Kurulumu

Tesla Carview'i Tesla hesabına bağlamak için bir **Tesla Geliştirici hesabı** ve bir **OAuth uygulaması** gerekir. Bu işlem yaklaşık 20–30 dakika sürer ve yalnızca bir kez yapılması gerekir.

---

## Genel bakış: Burada ne oluyor?

Tesla, OAuth 2.0 kullanır — "Google ile Giriş Yap" ile aynı standart. Tesla'nın geliştirici portalında bir uygulama oluşturursun ve bu uygulama bir **Client ID** ve **Client Secret** alır. Tesla Carview bunları, senin izninle araç verilerine erişim istemek için kullanır.

```
Tesla Geliştirici Portalı
  → Uygulama Kaydet → Client ID + Secret al
  → Tesla Carview'e gir
  → "Tesla Hesabını Bağla"ya tıkla
  → Tesla giriş sayfası açılır
  → Erişimi onaylarsın
  → Tesla, Tesla Carview'e tokenlar gönderir
  → Veriler akar ✅
```

---

## Adım 1: Tesla Geliştirici hesabı oluştur

1. [developer.tesla.com](https://developer.tesla.com) adresine git
2. Normal Tesla hesabınla giriş yap (araç için kullandığın hesap)
3. Geliştirici koşullarını kabul et

---

## Adım 2: Uygulamanı kaydet

1. Geliştirici portalında **"Add New Application"**'a tıkla
2. Formu doldur:

   | Alan | Ne gireceğin |
   |---|---|
   | **Application Name** | Açıklayıcı bir şey, ör. "Benim Tesla Carview'm" |
   | **Description** | "Kendi barındırdığım özel Tesla veri kaydedici" |
   | **Allowed Origin URL** | `https://tesla.alaninadın.com` |
   | **Redirect URI** | `https://tesla.alaninadın.com/api/auth/tesla/callback` |
   | **Application Type** | Web Application |

3. **Scopes** altında şunları seç:
   - `vehicle_device_data` — araç durumunu okumak için
   - `vehicle_cmds` — komut göndermek için (iklim, kilitler, vb.)
   - `vehicle_charging_cmds` — şarj kontrolü için
   - `offline_access` — her saat yeniden giriş yapmadan bağlı kalmak için

4. **Save**'e tıkla

5. **Client ID** ve **Client Secret**'ini not al — bir sonraki adımda gerekecek

> ⚠️ **Client Secret'ini gizli tut.** `.env` dosyana gider ve asla paylaşılmamalı veya git'e yüklenmemeli.

---

## Adım 3: Virtual Key'i kur (komutlar için)

Virtual Key, Tesla'nın araca komut göndermek için kullandığı güvenlik mekanizmasıdır. Onsuz veri okuyabilirsin ama hiçbir şeyi kontrol edemezsin (iklim başlatma, kilit açma/kilitleme yok).

Tesla Carview otomatik olarak bir anahtar oluşturur. Sadece aracına eklemen gerekir:

1. Tesla Carview'de **Ayarlar → Virtual Key**'e git
2. Gösterilen URL'yi kopyala (şuna benziyor: `https://tesla.alaninadın.com/api/virtual-key/pair`)
3. Bu URL'yi **araç dokunmatik ekranındaki Tesla tarayıcısında** aç (telefon veya bilgisayar değil)
4. Aracın ekranında **"Add key"**'e dokun
5. Telefonundaki Tesla uygulamasıyla onayla (yeni anahtarı onaylamanı ister)

Eşleştirme sonrasında Tesla Carview'den komutlar (iklim, kilit, vb.) çalışacaktır.

---

## Adım 4: Kimlik bilgilerini Tesla Carview'e gir

1. Tesla Carview'de **Admin → Sistem**'e git
2. **Client ID** ve **Client Secret**'ini gir
3. **Kaydet**'e tıkla

Veya doğrudan `.env` dosyasına ekle:

```bash
nano /opt/tesla-carview/backend/.env
```

```env
TESLA_CLIENT_ID=client-id-buraya
TESLA_CLIENT_SECRET=client-secret-buraya
```

Sonra yeniden başlat:
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d
```

---

## Adım 5: Tesla hesabını bağla

1. Tesla Carview'de **Panel → Tesla Hesabını Bağla**'ya git (veya ilk girişte istem)
2. **"Tesla ile Bağlan"**'a tıkla
3. Tesla'nın giriş sayfasına yönlendirilirsin — Tesla hesabınla giriş yap
4. Tesla hangi araca erişim izni vereceğini sorar — arabanı seç
5. Tesla Carview'e geri yönlendirilirsin — bağlantı kuruldu ✅

Uygulama artık araç aktifken her 60 saniyede bir araç verilerini sorgulayacak ve araç park halindeyken ve uyurken sorgulamayı yavaşlatacak (pili boşaltmamak için).

---

## Yaygın sorunlar

### Tüm Tesla API çağrılarında "403 Forbidden"

Tesla geliştirici hesabın **askıya alınmış veya hız sınırı uygulanmış** olabilir. Bu şu durumlarda olur:
- Çok fazla API çağrısı yapıldı (kısıtlama)
- Geliştirici portalındaki faturalandırma bilgileri eksik
- Tesla hesabı işaretledi

[developer.tesla.com](https://developer.tesla.com)'u kontrol et — faturalandırma veya askıya alma bildirimi görürsen önce bunu çöz.

### Araç sürüş halindeyken "çevrimdışı" gösteriyor

Tesla'nın API'sinin bilinen bir sınırlaması var: bazı yeni araçlar (özellikle XP7 VIN'lere sahip Model Y Juniper gibi) standart endpoint üzerinden GPS verisi döndürmüyor. Tesla Carview bu araçlar için Fleet Telemetry kullanır. Bu otomatik olarak yapılandırılır.

### Komutlar çalışmıyor ("Virtual Key eşleştirilmemiş")

→ Yukarıdaki 3. Adımı tekrarla. Eşleştirme URL'sini **Tesla tarayıcısında** açtığından emin ol (telefon veya bilgisayar değil).

### "Redirect URI mismatch"

Tesla Geliştirici Portalındaki Redirect URI, girdiğinle **tam olarak eşleşmeli** — `https://`, doğru alan adı dahil ve sonda eğik çizgi olmadan.

---

## Veri sorgulama nasıl çalışır

Tesla Carview, araç aktifken varsayılan olarak her 60 saniyede bir aracını sorgular. Araç uyurken (birkaç dakikadan fazla park halinde), aracı uyandırmaktan kaçınmak için sorgulama her 10 dakikada bire düşer (12V pili boşaltır).

`.env` dosyasında sorgulama aralığını ayarlayabilirsin:
```env
POLL_INTERVAL_MS=60000        # 60 saniye (varsayılan)
POLL_SLEEP_INTERVAL_MS=600000 # Uyurken 10 dakika
```
