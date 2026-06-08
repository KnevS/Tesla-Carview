# Yol haritası fikirleri

> 🤖 *Bu Türkçe çeviri [13-roadmap-ideas.en.md](13-roadmap-ideas.en.md) dosyasından yapay zeka destekli oluşturulmuştur. Düzeltmeler GitHub üzerinden memnuniyetle karşılanır.*

> 🇩🇪 [Auf Deutsch lesen](13-roadmap-ideas.md)

Gelecek sürümler için özellik fikirleri koleksiyonu. Tesla veri izleyici
alanındaki olağan özellik setinden esinlenilmiştir (Teslamate, TeslaFi,
TeslaLogger, TeslaMate fork'ları, ABRP Companion, Watt for Tesla vb.) —
bu liste yalnızca **işlevsel açıklamalar** içerir; UI düzeni yok, kopyalanmış
metin yok, kod parçacığı yok ve marka/isim aktarımı yok.

> **Hukuki not:** İşlevsellik olarak işlevsellik, Alman ve AB hukukunda
> genel olarak telif hakkıyla korunmaz (BGH I ZR 159/10 "Lottoblock",
> ABAD C-406/10 "SAS Institute"); *korunan şey* somut ifadedir (kod,
> metin, grafik tasarım). Bu belge, bu alandaki uygulamaların
> **yaygın olarak ne yaptığıyla** sınırlandırılmıştır — Tesla Carview
> **nasılı** bağımsız olarak uygular.

## Alanda yaygın olarak görülen — Tesla Carview için adaylar

### Enerji ve verimlilik
- **Sefer başına tüketim vs. WLTP** model için, delta göstergesi olarak.
- **Sefer başına eko-skor**, otomobilin kendi temel değerine karşı Wh/km'den
  türetilmiş (tamamen yerel, bulut modeli yok).
- **Seferin GPS hattında enerji ısı haritası**: kırmızı = yüksek tüketim,
  yeşil = rejeneratif geri kazanım, sarı = sabit hız.
- **Sefer başına yükseklik profili** (open-elevation veya çevrimdışı yükseklik
  döşemelerinden). Tüketim ↔ tırmanılan metre korelasyonu.
- **İklim-enerji ayrımı**: ikisi de raporlandığında sürüş gücü ile
  tekerlek gücü arasındaki fark.

### Batarya ve şarj
- **Kapasite trendi** (zaman içinde net kWh, bozulma üzerinde regresyon,
  "SoH 90 % beklenir ~AA/YYYY").
- **Önerilen şarj penceresi**, mevcut tarife eğrisini (aWattar / Tibber)
  hedef SoC ve planlanan kalkış zamanı ile birleştirir.
- **Hızlı şarjda kayıp tahmini** (ödenen kWh vs. bataryaya gerçekten ulaşan
  kWh) — ev faturalandırması ve DC şarj cihazı türü başına.
- **Hızlı şarj eğrisi karşılaştırması**: aynı konumda / şarj cihazı türünde
  mevcut seans, geçmiş seanslara karşı çizgi grafik olarak.
- **Hayalet boşalma izleyicisi**: park halindeyken SoC değişimi, konum /
  mevsim başına ayrıştırılmış (Sentry-Mode maliyet tahmini).

### Seyahatler ve sürüş günlüğü
- **Konum ısı haritası** (yeni etkinlik ısı haritasını tamamlayıcı):
  yol çizgileri olmadan haritada "sıkça nerede oldum".
- **Sık güzergah algılama** — başlangıç/bitiş mevcut bir güzergaha benzer
  olduğunda, bir sınıflandırma (işe gidiş vs. özel) ve önceden kullanılan
  amacı öner.
- **Sefer tekrar oynatma**: SoC, hız ve iklim değerleriyle senkronize olarak
  sefer zaman çizelgesi boyunca oynatma.
- **Geofence otomatik sınıflandırma**: "Ev", "İş" poligonları, aralarındaki
  seferler `commute` olarak otomatik etiketlenir.
- **İş ortağı şablonları** (sıkça ziyaret edilen ortaklar/müşteriler
  giriş alanında dropdown olarak).

### Konfor ve kontrol
- **Önceden ısıtma otomasyonu**: otomobil menzil içindeyken ve fişe takılıyken,
  bir sonraki takvim etkinliğinden X dk önce iklim başlat.
- **Sentry-Mode zekası**: ev noktasında X dk sonra otomatik kapatma,
  otelde/otoparkta otomatik açma.
- **Kapı davranışı**: yaklaşma + telefon anahtarı + ev geofence ile
  cep modu kilitleme.
- **Dinamik şarj limiti**: yarınki programdan çıkarılan hedef SoC
  (opsiyonel takvim entegrasyonu).

### Raporlar ve analitik
- **Bakım tahmini**, km trendine (doğrusal ekstrapolasyon) dayalı:
  "Mevcut kullanımda muayene yaklaşık GG.AA.YYYY'de". Servis aralıkları
  üzerinden yarı uygulanmış.
- **Hava durumuna göre menzil gerçekçiliği**: gerçek tüketim dış sıcaklıkla
  korelasyonlu (`state.outside_temp` üzerinden); tahmin "-5 °C'de
  tam bir batarya bugün ~280 km".
- **Yıllık rapor PDF**: ısı haritası, top 5 güzergah, toplam kWh, toplam
  maliyet, dizel eşdeğeri CO₂ ile tek sayfa görsel (yerel olarak hesaplanır,
  bulut tahmini yok).
- **CO₂ raporlama modu**: sefer başına varsayılan olarak Almanya/AB
  şebeke karışımını kullanan tahmini CO₂ değeri (operatör g/kWh'yi
  geçersiz kılabilir, örn. PV payı için).

### Sistem ve çok kullanıcılı
- **Aile paylaşımı paneli**: araç başına "kim ne zaman sürdü" gösteren ek
  sekme — sürücü başına hafta başına grafik (mevcut `driver_id`'yi kullanır).
- **Push bildirim kuralları**: yapılandırılabilir tetikleyiciler (örn. "SoC < 20%
  VE evde değil" → hatırlatma).
- **Giden webhook'lar**: tenant başına hedef (Home Assistant, IFTTT, n8n)
  — sefer sonu, şarj sonu, bakım vade JSON olarak gönderilir.
- **Salt okunur API token'ları** üçüncü taraf analizler için, scope
  seçimiyle (yalnızca seferler / yalnızca şarj / yalnızca batarya).

### Gizlilik ve güvenlik (mevcut olanın ötesinde)
- **Tenant başına GPS-bulanıklaştırma modu**: son mil koordinatları
  ~200 m'ye yuvarlanır, böylece kesin ev konumu asla kalıcı hale gelmez
  (çok sürücülü tenant'lar için önemli).
- **Unutulma hakkı işi**: N yıldan eski seferler otomatik olarak
  anonimleştirilir (GPS 4 ondalık basamağa yuvarlanır, adresler atılır),
  audit kaydı korunur.
- **Yüksek etkili eylemler için WebAuthn step-up** (yedek indirme,
  tenant silme) giriş passkey'inin üzerine.

## Alandan bilinçli olarak ALINMAYAN şeyler

- **Araç verisinin** üçüncü taraf bir panele **dış bulut senkronizasyonu**.
  Self-hosting vaadiyle çelişir.
- **Tescilli export formatları**. Verinin taşınabilir kalması için
  CSV / JSON'u koruruz.
- **Tanımlayıcı otomatik istatistik katılımı** (model ortalamalarını
  hesaplamak için anonimleştirilmiş sefer verisini bir havuza gönder).
  Sonradan opt-in olarak gelebilir, asla varsayılan olarak değil.

## Önerilen öncelik sırası

Çaba başına değere göre sıralanmış:

1. **Geofence otomatik sınıflandırma** (küçük UI, günlük yaşam etkisi)
2. **Sefer başına tüketim vs. WLTP** (bir sayı, çok değer)
3. **Konum ısı haritası** (etkinlik ısı haritasıyla aynı render yolu)
4. **Giden webhook'lar** (ekosistemi açar)
5. **Hava durumuna göre menzil gerçekçiliği** (önce 1-2 hafta veri gerekir)
6. **Yıllık rapor PDF** (harika pazarlama materyali)
7. **GPS bulanıklaştırma modu** (şirket tenant'ları için önemli)

Listelenen tüm işlevler **önerilerdir, taahhüt değildir**. Her uygulama
dış kod veya dış metin almadan bağımsız olarak yapılır.
