# 09 — Tesla Fleet API kullanım izleyici + Bütçe koruması

> 🤖 *Bu Türkçe çeviri [09-tesla-api-usage.en.md](09-tesla-api-usage.en.md) dosyasından yapay zeka destekli oluşturulmuştur. Düzeltmeler GitHub üzerinden memnuniyetle karşılanır.*

> 🇩🇪 [Auf Deutsch lesen](09-tesla-api-usage.md)

Tesla, Fleet API için ücret almaya başladığından beri uygulama dışarı giden her çağrıyı sayar,
tarife panelinde yapılandırılan oranları kullanarak beklenen maliyeti tahmin eder ve
opsiyonel olarak bir eşiğin üzerinde çağrıları engeller (hard stop).

## Mimari

```
backend/src/services/teslaApi.js   ← apiGet/apiPost/apiProxyPost
        │   (wrapper: assertWithinBudget + recordCall)
        ▼
backend/src/services/teslaUsage.js ← UsageTracker, BudgetGuard, config store, sınıflandırma
        │
        ▼
backend/src/db/database.js         ← tablolar tesla_api_usage + tesla_usage_events,
                                     tenant_settings içindeki varsayılan tarifeler
backend/src/routes/teslaUsage.js   ← REST API: /api/tesla-usage/...
backend/src/index.js               ← route'lar bağlı, webhook requireAuth'tan önce,
                                     hata işleyici statusCode'u iletir
backend/src/services/fleetTelemetry.js ← streaming sinyaller sayılır

frontend/src/components/TeslaUsageWidget.vue ← canlı gösterim (30 sn yenileme)
frontend/src/views/Dashboard.vue   ← widget gömülü
frontend/src/views/Settings.vue    ← admin paneli: tarifeler + limit + hard stop
frontend/src/locales/*.json        ← çeviriler (6 dilin tümü)
```

## Veri modeli (tenant DB başına)

`tesla_api_usage` — `(period, category, endpoint)` başına sayaç:

| Sütun | Tür | Açıklama |
| --- | --- | --- |
| `period` | TEXT | "YYYY-MM" |
| `category` | TEXT | `vehicle_data` \| `wake` \| `command` \| `streaming_signal` \| `other` |
| `endpoint` | TEXT | `:id`/`:vin` maskelemesi ile normalleştirilmiş yol |
| `count` | INTEGER | çağrı sayısı |
| `cost_usd` | REAL | birikmiş maliyet USD cinsinden |
| `last_call_at` | INTEGER | Unix zaman damgası |

`tesla_usage_events` — webhook üzerinden iletilen gelen Tesla doğrulama e-postaları.

Varsayılan tarifeler `tenant_settings` içinde `tesla_usage.*` anahtarları altında yaşar.
Oluşturma / migrasyon sırasında muhafazakar varsayılanlara ayarlanır ve Tesla fiyatları
değiştirdiğinde yönetici tarafından istediği zaman ayarlanabilir.

## Sınıflandırma

`categorize(method, path)` yolu şu sırayla kontrol eder:

1. `/oauth2/` veya `/oauth/` içerir → `null` (sayılmaz)
2. `/wake_up` içerir            → `wake`
3. `/command/` içerir           → `command`
4. `/vehicle_data` içerir veya `/api/1/vehicles[/:id]` ya da `/fleet_telemetry_config` ile eşleşir → `vehicle_data`
5. diğer `/api/1/` yolları      → `other`

`normalizeEndpoint`, sayısal ID'leri `:id` ile ve 17 karakterlik VIN'leri `:vin` ile değiştirir,
böylece sayaç mantıksal endpoint başına toplama yapar.

## REST endpoint'leri

| Yöntem | Yol | Amaç | Yetki |
| --- | --- | --- | --- |
| GET  | `/api/tesla-usage/current`        | Mevcut ay özeti + son etkinlikler | User |
| GET  | `/api/tesla-usage/details`        | Maliyete göre sıralanmış endpoint listesi | User |
| GET  | `/api/tesla-usage/history?months=` | Son N ay (maks. 36) | User |
| GET  | `/api/tesla-usage/events?limit=`  | En son webhook etkinlikleri | User |
| GET  | `/api/tesla-usage/config`         | Mevcut tarifeler / limit / hard stop | Admin |
| PUT  | `/api/tesla-usage/config`         | Tarifeleri / limiti / hard stop'u yaz | Admin |
| POST | `/api/tesla-usage/reset`          | Mevcut ay sayaçlarını sıfırla | Admin |
| POST | `/api/tesla-usage/webhook/email`  | Bir Tesla doğrulama e-postası ilet | webhook secret |

## Tesla doğrulama e-postaları için webhook

Tesla, bireysel eşikler aşıldığında (% 50, % 75, % 100) bir bildirim e-postası gönderir.
Bunları yönlendirebilen herkes (örn. Microsoft Graph aboneliği, Mailgun route vb.)
bunları `/api/tesla-usage/webhook/email` adresine POST eder.

```
POST /api/tesla-usage/webhook/email
X-Webhook-Secret: <TESLA_USAGE_WEBHOOK_SECRET değeri>
Content-Type: application/json

{
  "subject":     "Your Tesla Fleet API spend reached 75 %",
  "body":        "...mailin tam içeriği...",
  "tenantSlug":  "default",        // opsiyonel, aksi halde tüm tenant'lar
  "spend_usd":   37.50,            // opsiyonel, çıkarılırsa
  "threshold":   "75 %",           // opsiyonel
  "period":      "2026-05"         // opsiyonel
}
```

Yanıt: `{ "stored": <n> }` — etkinlik tablosuna giriş alan tenant sayısı ile.

## Hard stop

`hard_stop_enabled = 1` olduğunda, faturalandırılabilir harcama (brüt maliyet − bedava kredi)
`monthly_limit_usd × hard_stop_pct/100` değerine ulaştığında `assertWithinBudget(db)` her Tesla
çağrısından önce `TeslaBudgetExceededError` (HTTP 429) fırlatır. `index.js`'deki global hata
işleyici `statusCode`'u iletir ve `code: "TeslaBudgetExceededError"` ile
`detail.billable / detail.hardStopAt` içeren yapılandırılmış bir JSON yanıtı döner.

Varsayılan, hard stop **kapalı** — kimse bilinçli bir seçim yapmadan fonksiyon donmasıyla
karşılaşmamalıdır.

## Frontend

`TeslaUsageWidget.vue` widget'ı her 30 saniyede bir `/api/tesla-usage/current` yükler:

* `monthly_limit_usd` karşılığında yüzde kullanım gösteren büyük çubuk
* dikey kırmızı bir çizgi hard stop eşiğini işaretler
* küçük döşemeler olarak kategori dağılımı (vehicle data / wake / commands / streaming / other)
* bedava kredi düşümü hakkında not ve en son webhook etkinliği
* hard stop devreye girdiğinde kırmızı banner satırı

`Settings.vue` admin paneli şunları gösterir:

* para birimi, aylık limit, bedava kredi, hard stop % + anahtar
* beş tarife alanı (çağrı başına ya da streaming sinyali başına USD)
* iki buton: **Tarifeleri kaydet** ve **Mevcut ayı sıfırla**

## Polling maliyetlerini anlamak ve azaltmak

### Neden hiç maliyet oluşur?

Fleet Telemetry aktif değilken arka plan poller'ı düzenli olarak `/vehicle_data` çağırır.
Tesla **her** böyle çağrıyı faturalandırır (0,005 USD/çağrı ≈ 0,005 EUR).

### Polling modları (Fleet Telemetry olmadan)

| Mod | Aralık | Çağrı/gün | Maliyet/ay |
|------|----------|-----------|------------|
| DRIVING — aktif sürüş (D/R/N) | 30 sn | en fazla 2.880 | en fazla ~€43 |
| PARKED — çevrimiçi ama duruyor | 10 dk | en fazla 144 | en fazla ~€21 |
| IDLE — çevrimdışı / uyuyor | 45 dk | en fazla 32 | en fazla ~€4,50 |
| Fleet Telemetry heartbeat | 1 sa | 24 | ~€3,60 |

**Tipik senaryo** (8 sa çevrimiçi/park, 16 sa uyku):
8 × 6 + 16 × 1,3 ≈ **günde 69 çağrı** = yaklaşık **ayda €1**

### Günlük üst sınır ve aylık üst sınır

Araç başına gün başına yerleşik bir günlük üst sınır vardır (varsayılan: 30 çağrı, `TESLA_DAILY_CAP` üzerinden yapılandırılabilir).
Sınıra ulaşıldığında poller UTC gece yarısına kadar duraklar.

Ayrıca bir aylık üst sınır vardır (varsayılan: 400 çağrı, `TESLA_MONTHLY_CAP` üzerinden yapılandırılabilir).
Aylık sınıra ulaşıldığında polling, bir sonraki aya kadar otomatik olarak durur.

> **Önemli:** Her iki üst sınır sayacı artık **DB'de kalıcıdır** —
> `tesla_api_usage` tablosunda saklanır ve container yeniden başlatmalarından sağ çıkar.
> Günde birden fazla deployment artık üst sınırı sıfırlamaz, sık container yeniden
> başlatmalarında bile beklenmedik maliyetleri güvenilir şekilde önler.

### Bir fatura neden hâlâ yüksek olabilir?

- **Araç uzun süre çevrimiçi** — PARKED aralığı (10 dk) sürekli ateşlenir
- **Fleet Telemetry aktif değil** — heartbeat modu yok, poller kör çalışır
- **Hata ayıklama / manuel API çağrıları** da aylık faturaya sayılır

> **Container yeniden başlatma hakkında not:** Günlük ve aylık üst sınırlar artık DB'de kalıcıdır
> ve yeniden başlatmalarla sıfırlanmaz. Günde birden fazla deployment bu nedenle artık
> beklenmedik maliyetler biriktirmez.

### Öneriler

1. **Fleet Telemetry kur** — günlük ~24 heartbeat çağrısına düşer (~€3,60/ay)
2. Ayarlar → Tesla API'de **hard stop'u etkinleştir** → bir aylık limit belirleyin
3. Günde birçok küçük rollout yerine **deployment'ları gruplayın**
4. Gerçek bir Tesla bağlı değilse **ENABLE_POLLER=false** ayarlayın (örn. yalnızca demo örneği)

## Belirsizlikler / TODO'lar

* Varsayılan tarifeler (0,005 USD/çağrı, 0,000005 USD/streaming sinyali) kaba varsayımlardır —
  kesin değerler sahip olduğunuz Tesla katmanına bağlıdır ve ilk doğrulama e-postası
  karşısında uzlaştırılmalıdır.
* Streaming sinyalleri konu başına değil, payload'daki veri başına sayılır — Tesla
  farklı faturalandırırsa (örn. abonelik başına gün başına), `fleetTelemetry.js`'deki
  `recordCall(... 'streaming_signal' ...)` ayarlanmalıdır.
* Webhook, mail forwarder'ın yapılandırılmış JSON ilettiğini varsayar; mail → JSON
  eşleştirmesi bu repo dışında yaşar (örn. bir Power Automate akış tanımı içinde).
