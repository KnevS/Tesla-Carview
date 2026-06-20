# Tesla Fleet API kurulumu

> 🤖 *Bu Türkçe çeviri [04-tesla-api.en.md](04-tesla-api.en.md) dosyasından yapay zeka destekli oluşturulmuştur. Düzeltmeler GitHub üzerinden memnuniyetle karşılanır.*

> 🇩🇪 [Auf Deutsch lesen](04-tesla-api.md)

## Veri kaynağı stratejisi (Telemetri öncelikli, yedek olarak polling)

Hibrit poller değişikliğinden (2026-05) bu yana Tesla Carview polling yerine
**Fleet Telemetry (push)** yöntemini tercih eder. Her iki yol da aktiftir, ancak
bir araç için Telemetri akışı başlar başlamaz poller otomatik olarak heartbeat
moduna geçer:

| Yol | Gecikme | Maliyet | Ön koşul |
|---|---|---|---|
| **1. Fleet Telemetry (WebSocket push)** | 1–5 sn canlı | ücretsiz | Onaylı Virtual Key + HTTPS endpoint + VIN başına Tesla beyaz listesi |
| **2. Fleet API polling (pull)** | 30s online / 5dk boşta | çağrı başına $ bütçesi | Yalnızca OAuth token |
| **3. Heartbeat polling** | saatte 1× | minimum | Bir VIN için Telemetri aktif olduğunda otomatik devreye girer |

Uygulama: `backend/src/services/poller.js`, streaming sunucusu
`backend/src/services/fleetTelemetry.js`'de, VIN başına durum göstergesi
Ayarlar → ⚡ Tesla bağlantısı → 📡 Fleet Telemetry içinde.

> Fleet Telemetry, Developer Portal'da **uygulama Client ID'si başına**
> Tesla onayı gerektirir. Onay olmadan yapılandırma API'si HTTP 404 döner —
> yedek polling yolu çalışmaya devam eder.

## Tesla Developer hesabı oluştur

1. https://developer.tesla.com adresinde bir hesap oluşturun
2. Yeni bir uygulama oluşturun:
   - **İsim**: Tesla Carview (veya istediğiniz herhangi bir şey)
   - **Allowed Origins**: `https://your-domain.com`
   - **Allowed Redirect URIs**: `https://your-domain.com/api/auth/callback`
3. **Client ID** ve **Client Secret** değerlerini not edin


---

## İş ortağı kaydı — sihirbaz üzerinden otomatik (önerilir)

**v3.23.5** sürümünden itibaren uygulamayı Tesla'ya **artık elle `curl` ile
kaydetmeniz gerekmiyor**. Kurulum sihirbazı (Yönetim merkezi → 🛠️) bunu
kendisi yapar:

1. **«Tesla Fleet API kimlik bilgileri»** adımında Client ID + Client
   Secret değerlerini girin ([Tesla geliştirici portalı](https://developer.tesla.com)).
2. TeslaView, altında örneğinizin **algılanan alan adını** tek seferlik
   onay için gösterir.
3. **«🔑 Şimdi Tesla'ya kaydet»** düğmesine tıklayın — ya da yalnızca
   «İleri» deyin, sihirbaz otomatik olarak kaydeder.

Arka planda sunucu bir `client_credentials` belirteci alır ve alan adınızla
`POST /api/1/partner_accounts` çağrısını yapar — bu, elle yapılan bir `curl`
çağrısının yaptığının aynısıdır. Başarı hatırlanır (`✓ <alan adı> için
kayıtlı`); alan adı değişikliğinden sonra sihirbaz yeniden kayıt önerir.

> Uç nokta: `POST /api/fleet/partner/register`. Yönetim ayarları → ⚡ Tesla
> bağlantısı üzerinden de erişilebilir.

### Güvenlik hijyeni

Otomasyon, hiçbir sırrın sızmaması ve hiçbir yanlış yapılandırmanın
oluşmaması için bilinçli olarak şu şekilde kurulmuştur:

- **Client Secret sunucudan asla ayrılmaz.** `tenant_settings` içinde
  şifreli olarak saklanır (anahtar: `data/.encryption-key`), sunucu
  tarafında okunur ve yalnızca Tesla'nın belirteç uç noktasına gönderilir —
  asla tarayıcıya geri döndürülmez.
- **Alan adı serbestçe seçilemez.** Her zaman işletim alan adı
  (`FRONTEND_URL`) kaydedilir; tarayıcıdan gönderilen bir değer yalnızca
  `FRONTEND_URL` eksikse yedektir. Bu, yanlışlıkla hatalı bir alan adının
  kaydedilmesini önler — Tesla, alan adını zaten
  `https://<alan adı>/.well-known/appspecific/com.tesla.3p.public-key.pem`
  adresindeki açık anahtarı alarak doğrular.
- **Yalnızca yöneticiler** kaydı tetikleyebilir.
- **Bağımsız (idempotent).** Yeniden çağırmak zararsızdır — Tesla yalnızca
  mevcut girişi günceller.

> `.env` tercih ediyorsanız kimlik bilgilerini yine de orada
> tanımlayabilirsiniz (aşağıya bakın) — sihirbaz bunları otomatik olarak
> alır.

---

## .env yapılandırması

```env
TESLA_CLIENT_ID=your-client-id
TESLA_CLIENT_SECRET=your-client-secret
TESLA_REDIRECT_URI=https://your-domain.com/api/auth/callback
TESLA_AUDIENCE=https://fleet-api.prd.na.vn.cloud.tesla.com
```

> **Bölgeler**:
> - Kuzey Amerika: `fleet-api.prd.na.vn.cloud.tesla.com`
> - Avrupa: `fleet-api.prd.eu.vn.cloud.tesla.com`
>
> Aracınızın bulunduğu konuma uygun bölgeyi seçin.

---

## Tesla aracını bağla

Uygulamaya giriş yaptıktan sonra **"Tesla'yı bağla"** bağlantısına tıklayın
(veya doğrudan: `https://your-domain.com/api/auth/tesla/login`).

Tesla giriş sayfasına yönlendirilirsiniz. Erişimi verdikten sonra, araç
otomatik olarak algılanır ve senkronizasyon başlar.

---

## İzinler (OAuth scope'ları)

| Scope | Amaç |
|---|---|
| `openid` | Tesla kimliği |
| `offline_access` | Refresh token (tekrar giriş yapmadan) |
| `vehicle_device_data` | Seyahat verileri, şarj durumu, batarya okuma |
| `vehicle_cmds` | Araç komutları (yalnızca Virtual Key ile) |
| `vehicle_charging_cmds` | Şarj komutları |
| `vehicle_location` | GPS konumu |

---

## Araç komutları (Virtual Key)

İklim, korna veya kapılar gibi komutlar için ek olarak bir **Virtual Key** gerekir.
`tesla-http-proxy` proxy'si komutları kriptografik olarak imzalar — Tesla yalnızca
eşleştirilmiş anahtarla imzalanmış komutları kabul eder.

### Kurulum adımları

1. **Bir anahtar çifti üret**:
   ```bash
   openssl ecparam -name prime256v1 -genkey -noout -out tesla_priv.pem
   openssl ec -in tesla_priv.pem -pubout -out tesla_pub.pem
   ```

2. **Public key'i şu adreste sun**:
   `https://your-domain.com/.well-known/appspecific/com.tesla.3p.public-key.pem`

3. **`tesla-http-proxy` kur** ve başlat:
   ```bash
   # binary'yi https://github.com/teslamotors/vehicle-command adresinden indir
   tesla-http-proxy -port 4443 -host 0.0.0.0 \
     -tls-key server.key -cert server.crt \
     -key-file tesla_priv.pem
   ```

4. **Virtual Key'i araca kaydet** (uygulama üzerinden Ayarlar → Virtual Key).

> **Önemli**: private key (`tesla_priv.pem`) ve public key
> (`.well-known/…`) eşleşmiş kalmalıdır. Yeni bir private key, araçta
> yeniden eşleştirme işlemi gerektirir.


---

## Polling aralığı

Yerleşik poller Tesla API'sini sorgular:
- **Her 30 saniyede bir** araç aktifken (sürüş veya şarj)
- **Her 5 dakikada bir** araç uyku durumundayken (durum 408)

Poller **aracı uyandırmaz** — bataryayı korumak için uyku durumu saygı görür.

Poller'ı devre dışı bırak (örn. test için): `.env` dosyasında `ENABLE_POLLER=false`.

---

## XP7 VIN özelliği

VIN öneki `XP7` olan araçlar (örn. Model Y Juniper), `/vehicle_data` üzerinde
`?endpoints=…` parametresini desteklemez.

**Geçici çözüm**: `/vehicle_data`'yı `endpoints` parametresi olmadan çağırın —
`charge_state`, `climate_state` ve `vehicle_state` döner.

`drive_state` üzerinden GPS REST API ile bu araçlar için kullanılamaz;
GPS bunun yerine Fleet Telemetry'den gelir.
