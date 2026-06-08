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
