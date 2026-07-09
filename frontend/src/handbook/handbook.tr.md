# 📖 Tesla Carview Kullanım Kılavuzu

> ℹ️ **Yöneticiler ve kendi sunucusunu işletenler için not:** Bu kılavuz uygulamayı kullanıcı bakış açısından açıklar. Kurulum, ortam değişkenleri, yedekleme/geri yükleme, gece bakımı ve demo modunun etkinleştirilmesi **teknik dokümantasyonda** [`docs/`](https://github.com/KnevS/Tesla-Carview/blob/main/docs/README.en.md) (İngilizce) klasöründe belgelenmiştir; özellikle [10-configuration](https://github.com/KnevS/Tesla-Carview/blob/main/docs/10-configuration.en.md) ve [11-operations](https://github.com/KnevS/Tesla-Carview/blob/main/docs/11-operations.en.md).
>
> 📚 **Tesla Carview'e yeni misiniz?** **[GitHub Wiki](https://github.com/KnevS/Tesla-Carview/wiki)** rehberli bir giriş sunar: adım adım kurulum, statik IP olmadan ağ erişimi (DynDNS, Cloudflare Tunnel), Raspberry Pi depolama (SD kart yerine SSD) — BT uzmanı olmayanlar için yazılmıştır.

Self-Hosted · Çoklu Kiracı (Multi-Tenant)

## 🌟 Genel Bakış {#overview}

Tesla Carview, Tesla araçlar için **kendi sunucunda barındırılan** bir veri kaydetme uygulamasıdır. Tüm veriler yalnızca senin sunucunda kalır — bulut yok, veri paylaşımı yok. Uygulama tamamen **responsive**'dir ve **iPhone/iPad (Safari)**, Android telefonlar ve masaüstü tarayıcılarında çalışır.

**Özellikler özet:**

- 🚗 **Yol defteri** — GPS rotaları, tüketim, sürüş türü kategorizasyonu
- ⚡ **Şarj** — Maliyetli şarj seansları, GPS ile konum tespiti
- 🔋 **Batarya** — Aşınma takibi, menzil geçmişi, şarj eğrisi, sıcaklığa karşı verimlilik, hayalet boşalma, anomali tespiti (Companion Aşama 1, salt istatistik, yerel)
- 📊 **Pano** — İstatistikler, aylık özet, son etkinlikler
- 🗓️ **Haftalık içgörüler** — «Haftanız» pano kartı: kat edilen yol, 90 günlük ortalamaya kıyasla tüketim (soğuk hava gerekçesi dahil), şarj maliyeti ve açık anormallikler hakkında açık ipuçları (v3.30, salt istatistik; isteğe bağlı yerel LLM zenginleştirmesi, Ollama)
- 🛞 **Lastik basıncı eğilimi** — lastik başına yavaş, sıcaklık düzeltmeli basınç kaybını algılar ve erken uyarır (v3.33)
- 🍃 **Sürüş puanı** — sürüş verimliliğini kendi ortalamana göre değerlendirir, veriye dayalı tasarruf ipuçlarıyla (v3.34, salt istatistik)
- 🔌 **Canlı şarj eğrisi** — devam eden şarj oturumu gerçek zamanlı: güç, şarj durumu ve beklenen eğri (v3.35)
- 🎮 **Kontrol** — Klima, kapılar, ışıklar — doğrudan uygulamadan
- 📝 **Servis defteri** — Bakım, onarım, tarihli maliyetler
- 📤 **Dışa aktarma** — Sürüşler için CSV/JSON/**PDF**, şarj için CSV, ZIP olarak tam yedek; tarih, mesafe, enerji ve SOC ile baskıya hazır PDF seyahat günlüğü
- 🔔 **Bildirimler** — paralel üç kanal: Web Push (tarayıcı/PWA), Telegram botu ve **e-posta** (SMTP). Tetikleyiciler: şarj bitişi, Sentry alarmı, düşük batarya, bakım vadesi, coğrafi sınır ve daha fazlası. Eylem düğmeli push (klima başlat, şarj bul, ertele), etiket gruplama ve iPhone/Apple Watch'a yansıma
- 📊 **Haftalık seyahat özeti** — her Pazartesi yerel saatle 07:00'de push/Telegram/e-posta ile otomatik: haftanın km'si, enerji tüketimi, şarj maliyeti ve önceki haftaya kıyasla eğilim
- 🌱 **CO₂ bilançosu** — eşdeğer benzinli araca kıyasla tasarruf edilen CO₂'yi hesaplayan özel sayfa (DE şebeke karışımı vs 6,5 l benzin/100 km); ağaç/yıl ve gidiş-dönüş Frankfurt–Mallorca uçuşları cinsinden eşdeğerler
- 📱 **Mobil için optimize** — iPhone/iPad (Safari), Android ve masaüstünde tam kullanılabilir

## 🔀 Sıralama yönü {#sort-order}

Kronolojik girişler içeren tüm listelerde (sürüşler, şarj seansları, servis defteri kayıtları, faturalandırma, denetim olayları, kullanıcı listesi, yasal metin sürümleri) sağ üst köşede bir **sıralama düğmesi** bulunur. Bir tıklama şu ikisi arasında geçiş yapar:

- ↓ **Önce en yeniler** (varsayılan)
- ↑ **Önce en eskiler**

Seçilen sıralama **görünüm başına tarayıcıda kaydedilir** (`localStorage`) ve sayfa yenileme ve sekme kapatma sonrası korunur — her liste için farklı ayarlayabilirsin (örn. yol defteri "en yeniler üstte", kullanıcı listesi "son giriş en altta").

## ⚠️ 2026 itibarıyla Tesla API durumu {#tesla-api-2026}

Mayıs/Haziran 2026'da Tesla, araç uç noktaları için resmi olmayan Owner API'sini kapattı. Topluluk geçici çözümüne (Tesla hesabından refresh token) güvenenler artık araç verileri yerine **HTTP 401 "invalid bearer token"** alıyor. Tesla Carview bundan iki net sonuç çıkardı:

### Üç veri kaynağı bir bakışta

| Kaynak | Ne alırsınız | Kurulum çabası | Maliyet |
| --- | --- | --- | --- |
| **Tesla Fleet API** | Pil, iklim, canlı GPS, TPMS, komutlar | [developer.tesla.com](https://developer.tesla.com) üzerinde uygulama onayı, bekleme süresi haftalar–aylar | genelde 0 €/ay — Tesla hesap başına 10 $ ücretsiz kredi verir; bir araç + streaming telemetri ile tipik özel kullanımı kapsar. Üzerinde kullandıkça öde. |
| **OwnTracks** (akıllı telefon) | GPS izi, seyahat tespiti, mesafe | sihirbazda ~5 dk + uygulama kurulumu | ücretsiz |
| **Manuel giriş** | API olmadan temel veriler (seyahat günlüğü çalışır) | sihirbazda < 1 dk | ücretsiz |

**Önemli:** üç yol da paralel çalışabilir — OwnTracks size hemen eksiksiz bir GPS seyahat günlüğü verir, manuel giriş Tesla senkronizasyonunu beklemeyi atlar, Fleet API daha sonra pil ve iklim verisi ekler.

### OwnTracks kurulumu (önerilen, hemen kullanılabilir) {#owntracks-setup}

1. **Yönetici sihirbazı** → "Akıllı Telefon GPS (OwnTracks)" adımı → "Yeni cihaz ekle" → etiket, araç, sürücü seçin.
2. **QR kodunu tara**: oluşturulduktan sonra bir QR kodu gösterilir. **Yerel iPhone kamerası ile** (OwnTracks uygulaması DEĞİL!) tara → "OwnTracks'te Aç" → yapılandırma içe aktarımını onayla.
3. iOS Ayarları → OwnTracks içinde **konum erişimini "Her Zaman" olarak ayarla**. Yoksa arka plan GPS yok.
4. Sürücü 5 km/saatten hızlı hareket eder etmez, otomatik olarak bir seyahat başlar. 5 dakika hareketsizlik onu sonlandırır.

**Yönetici hakları olmayan son kullanıcılar için**: her sürücünün "📱 Benim GPS'im" altında kendi sayfası vardır — yönetici yardımına gerek yok.

### Manuel araç girişi {#manual-vehicle}

Sihirbazın "Araçlar" adımında yan yana iki kart bulunur: "☁ Tesla senkronizasyonu (bulut)" ve "✍ Manuel giriş". Manuel varyant:

- Tesla API erişimi olmadan çalışır
- Alanlar: etiket (zorunlu), plaka, VIN (isteğe bağlı — yoksa sentetik "MANUAL…" VIN), model, başlangıç kilometre sayacı
- Oluşturan kullanıcı otomatik olarak sürücü olarak eklenir → hemen üzerinde OwnTracks cihazı kaydedebilir
- Başlangıç kilometre sayacı mevcut kilometre alanına da yazılır — TCO hesaplaması ilk günden çalışır

### TCO Kokpiti (Toplam Sahip Olma Maliyeti) {#tco-cockpit}

`/tco` altında her araç için gerçek toplam maliyeti ve dürüst bir €/km değerini görürsünüz. Dört KPI kartı:

- **km başına maliyet** — toplam maliyet ÷ katedilen km
- **Toplam maliyet** — tüm kalemlerin toplamı
- **Amortisman** — alım − satış fiyatı (veya tahmini kalıntı değer: 8 yıl boyunca %25'e doğrusal amortisman)
- **Elektrik maliyeti** — şarj oturumlarından

Altında oranlarla ayrıntılı döküm + bakım kayıtları CRUD (muayene, lastik, onarım, yıllık muayene, aksesuar, diğer) + temel veri formu (alım fiyatı/tarihi, satış, sigorta, araç vergisi, başlangıç km).

### Yapay zeka sağlayıcısı: Ollama veya Grok {#ai-provider}

Yönetici sihirbazı → "Harici API'ler" → AI sağlayıcısı:

- **🏠 Ollama** (varsayılan, veri egemen): kendi donanımınızda çalışan yerel LLM. Donanım sınıfına göre model önerileri (Pi 4: `llama3.2:1b`, Pi 5: `qwen2.5:3b`, VPS: `llama3:8b`). Sihirbazdan SSE ilerleme çubuğu ile model kurulumu. **Veriler örneği ASLA terk etmez.**
- **☁ Grok** (bulut): xAI Grok API'si — daha hızlı, ancak her istek ABD sunucularına gider. xAI API anahtarı gerekli, dahili günlük bütçe koruyucusu.
- **⊝ Kapalı**: AI sohbeti tamamen devre dışı.

< 4 GB RAM'li ana bilgisayarlarda Ollama'yı `docker-compose.override.yml` ile `services.ollama.profiles: [disabled]` kullanarak devre dışı bırakın.

### Benim GPS'im — sürücüler için self-servis {#my-gps}

Oturum açmış her kullanıcının `/my-tracking` ("📱 Benim GPS'im" navigasyonda) altında kendi sayfası vardır:

- **Kendi** OwnTracks cihazlarının listesi (sürücü sadece kendisini, yönetici hepsini görür)
- Doğrudan kurulum için QR kodu, herhangi bir zamanda yeniden alınabilir (artık kayıp-token sorunu yok)
- Erişim hakları olan araçlara göre filtrelenmiş araç seçimi — diğer arabalara yanlışlıkla GPS gönderimi yok

## 📊 Sürüş Değerleri ve Isı Haritası {#fahrtwerte-heatmap}

**Sürüş Değerleri** (menü → *Sürüş Değerleri* veya yolculuk listesindeki düğme) tüm yolculukları sıralanabilir bir tabloda gösterir: tarih, rota, süre, mesafe, tüketim ve ayrıca minimum / maksimum / ortalama olarak hız ve güç, şarj durumu (başlangıç → bitiş). Sıralamak için sütun başlığına, yolculuğu açmak için satıra tıklayın. Üstte özet kartları (yolculuklar, toplam mesafe, toplam enerji, toplam süre); **CSV dışa aktarma** değerleri Excel/muhasebe için verir. Tüm değerler birim ayarlarınıza uyar. Güç değerleri telemetriden gelir; yoksa (ör. yalnızca OwnTracks yolculuğu) "—" görünür.

**Isı haritası** (menü → *Isı Haritası*) haritada *nerede* sürdüğünü gösterir — ayrı ayrı açılıp kapanabilen dört katmanla: **sürüşler** (başlangıç/varış noktalarının yoğunluğu), **şarjlar**, tanımlı **şarj konumların** ve **güzergâhlar** (sürüşlerin GPS rotaları çizgi olarak, dönemdeki en yeni 300 sürüşe kadar). Dönem seçilebilir (30/90/365 gün/tümü); harita görünür noktalara otomatik uyar. Her **katmanın rengi** seçeneğin yanındaki renk noktasıyla ayarlanabilir (tarayıcıda saklanır, «↺ Varsayılan renkler» sıfırlar).

**Sürüş detayında bölge analizi** (bir sürüşü aç → «Bölge analizi» kartı): tek bir sürüşü bölgelere göre inceler; her mod tablo + haritada vurgulama sunar. Üç mod: **hız bölgeleri** (aralık başına mesafe, süre, ortalama güç ve net enerji — onay kutuları ilgili kesimleri renklendirir, seçilmeyenler soluklaşır), **bölgelerim** (sürüşün hangi coğrafi sınırlara/şarj konumlarına değdiği; giriş/çıkış saati, süre ve bölgedeki mesafe — bölge daireleri haritada gösterilebilir) ve **kesit** (başlangıç/bitiş kaydırıcılarıyla serbest aralık, tüm değerlerle). Ayrıca GPS haritasındaki **📍 İpuçları** kutusu Vmax, en yüksek güç, en güçlü geri kazanım ve durakları (≥ 1 dk) işaretler.


## 🔋 Batarya sağlık paneli (Companion Aşama 1) {#battery-health}

**Sağlık ve tahmin (v3.27–v3.28):** %100 SoC’ye normalize edilmiş menzilin güven bandıyla doğrusal projeksiyonu (yıllık yıpranma, 3 yıl içindeki menzil, %80’e kalan süre), ayrıca kalıcı artışta park tüketimi uyarısı. Saf istatistik, yapay zeka yok.

v3.6.0 itibarıyla `/battery` altı bölüm sunuyor; temel batarya sorularına dürüst yanıtlar — **sadece istatistik, yapay zeka yok, veri kaçağı yok**:

1. **Menzil geçmişi** — maks. rated_range zaman içinde.
2. **Bozulma** — ilk ve son ölçüm arası fark, renk kodlu (yeşil <%5, sarı <%10, kırmızı ≥%10).
3. **Şarj eğrisi** — dört SOC bandına gruplandırılmış ortalama tepe güç (%0-20, %20-50, %50-80, %80-100) ve başlangıç SOC'una karşı kW dağılım grafiği. %80 üzerinde düşük değerler normaldir (tapering); %20-50 aralığındaki anomaliler BMS sorunlarına işaret edebilir.
4. **Verimlilik vs dış sıcaklık** — yolculuklardan 5 °C kovalarda 100 km başına kWh. Soğuk kış cezasını görünür kılar.
5. **Hayalet boşalma** — park halinde saatlik SOC kaybı. Sürüş ve şarj pencerelerini hariç tutar. Üstte medyan + ortalama, ilk 10 olay tabloda. >%1/saat dikkate değer (sentry, güncellemeler, ön iklimlendirme).
6. **Anomaliler** — sürüş/şarj olmaksızın >%10 SOC sıçramaları, >30 km menzil sıçramaları, aykırı verimlilik (>35 veya <7 kWh/100km).

**Veri kaynakları**: `battery_snapshots`, `trips`, `charging_sessions` — hepsi kendi SQLite'ınızdan. Dış çağrı, bulut veya model yok. Hesaplama sunucu tarafında `backend/src/routes/battery.js`'de çalışır.

**Araç seçici**: tüm bölümler seçili araca tepki verir.

### Companion Aşama 2 (v3.7.0'den itibaren) {#companion-phase-2}

`/battery` üzerinde, mevcut verilerinizden iki yeni bölüm:

- **Companion uyarıları**: kalıcı anomaliler. Companion motoru gecelik (içinde `nightlyMaintenance` hijyeninin) ve her 6 saatte bir çalışır — her yeni anomali bir kez bildirilir (Web Push + bağlıysa Telegram). Her uyarıda "✓ Görüldü olarak işaretle" ve "✕ Kapat" eylemleri vardır.
- **Ön iklimlendirme önerisi**: yarın tipik kalkış saatinizde (son 30 günün yolculuklarından öğrenilir) beklenen sıcaklık 5 °C altında veya 30 °C üzerinde ise, somut nedenle bir push önerisi gelir. Hava kaynağı: [Open-Meteo](https://open-meteo.com/) — ücretsiz, hesap gerektirmez.

**Veri akışı tamamen yerel**: hava çağrısı tek dış istektir (yalnızca lat/lon, hesap yok). Anomaliler ve öneriler iki yeni tabloya gider: `battery_anomalies` ve `precondition_suggestions` (UNIQUE kısıtıyla idempotent).

**Aşama 3 (yol haritası)**: Ollama üzerinden derin companion sohbet — hâlâ yerel.

## 📋 Gereksinimler {#requirements}

### Sunucu

- En az 1 GB RAM ile Linux sunucu (x86_64, ARM64 veya ARMv7)
- Docker + Docker Compose (kurulum betiği yükler)
- Genel olarak erişilebilen bir alan adı + TLS sertifikası (Tesla API için zorunlu)
- 443 numaralı port (HTTPS) dışarıdan erişilebilir olmalı

### Tesla Developer Hesabı

- `developer.tesla.com` adresinden kayıt
- Uygulama oluştur → Client ID ve Client Secret'ı not et
- Geri çağrı (Callback) URL'si: `https://<senin-domainin>/api/auth/callback`
- Araç komutları için: Fleet API erişimi başvurusu (ücretsiz, 1–3 iş günü)
- **Tesla'daki tek seferlik iş ortağı kaydını sihirbaz otomatik olarak halleder** (v3.23.5'ten itibaren) — yalnızca Client ID + Secret girersiniz, artık elle `curl` çağrısı gerekmez.

## 🚀 Kurulum {#installation}

Kurulum betiği her şeyi otomatik kurar: Docker, nginx, TLS, tesla-http-proxy.

```bash
# Hedef sunucuda root olarak:
curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash

# Betik etkileşimli olarak şunları sorar:
# → Alan adı (örn. carview.sunucum.com)
# → Tesla Client ID ve Client Secret
# → Tesla Redirect URI
# → JWT Secret (otomatik oluşturulur)
```

> **Alternatif: Manuel yapılandırma**
>
> `.env.example` dosyasını `.env` olarak kopyala ve tüm değerleri ayarla. Sonra: `docker compose -f docker-compose.prod.yml up -d`

## ⚙️ Tarayıcıda ilk kurulum {#first-setup}

1. **Tarayıcıyı aç** — `https://<senin-domainin>/setup` adresini aç — otomatik yönlendirilirsin.
2. **Kiracı (tenant) oluştur** — Bir kiracı adı (örn. „Yılmaz Ailesi") ve kısa kod (örn. „yilmaz") seç. Kısa kod, girişte gereklidir — bir yere not et.
3. **Yönetici hesabı oluştur** — Kullanıcı adı ve parola belirle. Parola en az 12 karakter olmalı. Öneri: 4 kelimelik bir parola cümlesi (passphrase).
4. **Yapılandırma asistanı** — İlk girişten sonra asistan otomatik olarak başlar ve tüm kritik kurulum adımlarında seni yönlendirir (aşağıya bak).

## 🧙 Yapılandırma asistanı {#settings-wizard}

İlk girişten sonra **yapılandırma asistanı** otomatik olarak açılır. **Ayarlar → Asistanı başlat** menüsünden istediğin zaman yeniden açılabilir.

**Adminler için** asistan, doğru bağımlılık sırasında 16 adımdan geçirir:

| Adım | Açıklama |
|------|----------|
| **Dil** | Uygulama dilini seç |
| **Tesla kimlik bilgileri** | Client ID + Secret girin — TeslaView ardından **uygulamayı Tesla'ya otomatik kaydeder** (tek tık, `curl` yok); algılanan alan adı bir kez onaylanır |
| **Tesla OAuth** | Tesla hesabını bağla — buton, girişten sonra otomatik kapanan bir popup açar |
| **Araçlar** | Tesla hesabından araçları senkronize et |
| **Sanal Anahtar** | Akıllı telefon için kayıt bağlantısını göster ve kopyala |
| **Fleet Telemetry** | Araç başına GPS takibini etkinleştir |
| **Elektrik fiyatı** | Araç başına ev şarj fiyatı (€/kWh) |
| **Yasal kontrol** | Yasal metinlerdeki açık yer tutucuların otomatik taraması |
| **Harici API'lar** | OCM, HERE Maps, Grok/xAI |
| **İzleme** | Otomatik iyileştirme + uyarı e-postası |
| **Tasarım → Özet** | Tercihler; tüm değişiklikler son adımda kaydedilir |

> **İpucu:** Her adım atlanabilir — asistan istediğin zaman yeniden başlatılabilir.

> **🌐 Dil seçici:** Her sihirbaz sağ üstte kompakt bir dil seçici gösterir. Kullanıcı profilinde veya kiracı varsayılanında saklanan dil giriş yapıldığında otomatik olarak uygulanır; seçici, sihirbazı kapatmadan dili anında değiştirmenizi sağlar.

## 🔑 Virtual Key kurulumu {#virtual-key}

Araç komutları (kapı açma, klima vb.) için araca bir Virtual Key kaydedilmelidir. Bu yalnızca yeni araçlar için gereklidir (`vehicle_command_protocol_required: true`).

1. **tesla-http-proxy**'nin çalıştığından emin ol:

   ```bash
   systemctl status tesla-http-proxy
   ```

2. iPhone'da Safari'de aç: `https://tesla.com/_ak/<senin-domainin>`
3. Tesla uygulaması „Bu uygulamaya izin ver?" diye sorar → onayla
4. Aracın Bluetooth menzilinde kal — anahtar 30 saniye içinde kabul edilir
5. **Ayarlar → Araç bağlantısı → Virtual Key durumu** altından doğrula

## ⚡ Şarj noktaları ve maliyetler {#charging-locations}

**Şarj seyri, konuma göre maliyet ve en uygun zamanlar (v3.24–v3.26):** her oturum « 📈 Seyri görüntüle » ile güç/şarj durumu eğrisini ve temel değerleri, ayrıca tahmini şebeke tüketimini gösterir. « Konuma göre maliyet » bölümü konuma göre toplar (şarj sayısı, kWh, toplam maliyet, ort. €/kWh). Ayarlar → Tarife altında bir fiyat sağlayıcısı (aWattar/Tibber) bağlıysa « En uygun şarj zamanları » güncel fiyatı ve önümüzdeki 24 saatin en iyi 4 sa/8 sa aralığını gösterir. Saf istatistik.

Şarj noktaları GPS ile otomatik tanınır ve kWh başına bir fiyatla eşleştirilir.

**Otomatik GPS tanıma** — Bir şarj noktası GPS koordinatları ve yarıçapla (varsayılan 200 m) tanımlıysa, şarj başlangıcında uygun konum otomatik tespit edilir ve kayıtlı kWh fiyatı uygulanır.

**Şarj noktası oluşturma** — **Şarj → Konumlar** altında: ad, tür (Ev/Ofis/Halka açık), kWh fiyatı, GPS koordinatları ve tanıma yarıçapı gir.

**Maliyetleri elle düzenleme** — Şarj listesinde: bir seansa tıkla → maliyeti düzenle. Maliyet 0 da yapılabilir (örn. ücretsiz şarj).

**✕ Şarjı ücretsiz olarak işaretle** — **Şarj geçmişinde** her seansın küçük bir *„✕ ücretsiz"* düğmesi vardır. Böyle işaretlenen şarjlar gri gösterilir, *„ücretsiz"* rozeti taşır ve **ev şarjı hesaplamasından otomatik olarak hariç tutulur** — hem aylık özetlerden hem de tekil değerlendirmelerden.

Tipik kullanım: işverenin sağladığı, özel hesaba dahil edilmemesi gereken iş yeri şarjı. *„↩ ücretli"* düğmesiyle işaret istediğin zaman geri alınabilir.


### Otomatik şarj limiti (v3.12.0'dan itibaren)

Her konum istenen bir şarj limiti taşıyabilir (örn. %80). Yolculuk sonunda TeslaView konumun yarıçapta olup olmadığını kontrol eder:
- Fleet API aktif → arabaya hemen `set_charge_limit` gönderir
- Fleet API yok → manuel ayarlama öneren push bildirimi

"🔋 Şimdi uygula" düğmesi komutu manuel olarak tetikler. Tesla günlük şarj için %70-80, uzun süreli depolama için %50-60, sadece uzun yolculuklar için %100 önerir.

## 🔐 Güvenlik {#security}

- 🔑 **Passkey / WebAuthn** — Parmak izi, Face ID veya donanım anahtarıyla parolasız giriş
- 📱 **Araç için QR oturum açma** — Ayarlarda oluşturulan tek seferlik kod (60 s), Tesla tarayıcısı veya başka bir cihazla taranabilir — araçta parola yazmaya gerek yok
- 📱 **TOTP MFA** — Authenticator uygulamasıyla iki faktörlü kimlik doğrulama
- 🛡️ **Hesap kilitleme** — 5 başarısız denemeden sonra hesap 15 dakika kilitlenir
- 🍪 **Refresh token** — httpOnly çerez, 7 gün geçerli, otomatik rotasyon
- 📋 **Denetim günlüğü** — Tüm girişler, değişiklikler ve güvenlik olayları kayıt altına alınır
- 🔒 **HTTPS + HSTS** — TLS 1.2/1.3, HSTS, OCSP stapling, güvenli başlıklar

**Önerilen güvenlik ayarları:**

- İlk girişten sonra MFA'yı (TOTP) etkinleştir
- Parolasız giriş için bir passkey kur
- Düzenli olarak yedek (export) al
- Güçlü parola: en az 16 karakter veya 4 kelimelik passphrase

**Yeni kullanıcılar için zorunlu MFA.** Yeni hesaplar varsayılan olarak `MFA-zorunlu` bayrağıyla oluşturulur — kullanıcı ilk girişinde uygulama otomatik olarak **`/mfa/setup`** sayfasına yönlendirir ve TOTP kurulumu tamamlanmadan kullanıcıyı bırakmaz. Yöneticiler bu bayrağı kullanıcı kaydında (**Yönetici → Kullanıcılar**) kapatabilir veya tekrar açabilir. Yönetici hesapları için MFA zorunlu değildir, ancak şiddetle önerilir.

## 🏢 Çoklu kiracı (Multi-Tenant) {#multitenancy}

Tesla Carview, tek bir örnek üzerinde tamamen izole edilmiş birden fazla kiracıyı destekler. Her kiracının kendi veritabanı vardır — bir kiracı asla başka bir kiracının verilerini göremez.

**Kiracı oluşturma (davet bağlantısı)** — Yeni kiracılar yalnızca bir **davet bağlantısıyla** kayıt olabilir. Bir yönetici, **Yönetici → Kullanıcılar → Davet bağlantısı oluştur** altında bağlantıyı üretir ve isteğe bağlı bir **not** ekleyebilir (ör. „Ahmet Yılmaz için, XY firması") — böylece davet daha sonra tanınabilir. Bağlantı 7 gün geçerlidir ve sadece bir kez kullanılabilir. Geçerli bir bağlantı olmadan `/register` kapalıdır. Mevcut davetler **yeniden gönderilebilir** (aynı not, yeni token), **bloke edilebilir** (listede görünür kalır ama kullanılamaz) veya kalıcı olarak **silinebilir**.

**Kiracı başına birden fazla araç** — Bir Tesla hesabındaki tüm araçlar senkronizasyonda otomatik içe aktarılır. **Ayarlar → Tesla Bağlantısı → 🔄 Araçları senkronize et** ile senkronizasyon istediğin zaman tetiklenebilir — hesaba yeni bir araç eklendiyse kullanışlıdır. Araçlar arasında gezinmek için navigasyon çubuğunun sağ üstünü kullan.

**Kiracı koduyla giriş** — Birden fazla kiracı varsa girişte bir kiracı alanı belirir. Tek kiracıda otomatik tanınır.

**Kullanıcı yönetimi** — Yöneticiler, kendi kiracıları içinde başka kullanıcılar oluşturabilir ve onlara araç atayabilir; **Yönetici → Kullanıcılar** altında. Kullanıcı başına üç yetki ayarlanabilir:

- **Araçları düzenle** — Kullanıcının araç temel verilerini (ad, plaka, renk, elektrik tarifesi, Monta yapılandırması) değiştirmesine izin verir. Yeni kullanıcılarda varsayılan: kapalı.
- **Araç ekle** — Kullanıcının Tesla hesabından yeni araçları senkronize etmesine izin verir. Varsayılan: kapalı.
- **MFA zorunlu** — İlk girişte TOTP kurulumunu zorunlu kılar (yukarıdaki Güvenlik bölümüne bakın). Yeni kullanıcılarda varsayılan: açık.

Yöneticiler bu üç hakka örtük olarak sahiptir — kutucuklar yönetici hesaplarda gizlenir. Ayrıca kullanıcı yönetimi sayfasının başlığında, etkin (yönetici olmayan) bir kullanıcının atanmış aracı yoksa turuncu bir **görev kartı** belirir; tek tıkla araç atama veya „Araç ekle" hakkını verme kısayollarıyla.

**Kiracı takma adı (gizlilik katmanı)** — Açık giriş sayfasında kiracı **gerçek adıyla görünmez**, bunun yerine `brave-eagle`, `quiet-otter` gibi rastgele bir `sıfat-isim` takma adı görünür. Böylece dışarıdan kimse bu self-hosting örneğini hangi kişi veya şirketin kullandığını göremez.

- Takma ad kiracı oluşturulurken **otomatik olarak atanır**.
- **Ayarlar → 🔐 Kiracı takma adı** altından kontrol edebilirsiniz.
- **«Yenile»** düğmesi yeni bir takma ad atar; eskisi geçmişe taşınır ve rastgele tekrar önerilmez.
- **Unutmayın.** Birden fazla kiracı varsa, takma ad girişte tek tanımlayıcınızdır — parolanızın yanına parola yöneticinize kaydedin. Yedek olmadan kaybedilirse boş bir kiracı ortamından başlamak gerekir.
- **Dahili slug** ve gerçek ad veritabanında kalır ve yöneticilere görünür — yalnızca giriş sayfası anonimleştirilmiştir.

## 💾 Yedekleme {#backup}

**Manuel dışa aktarma** — **Dışa aktarma** altında: Sürüşler için CSV, JSON veya **PDF** (tablo, özet ve sayfa atlamalı PDF seyahat günlüğü), şarj seansları için CSV, ayrıca ZIP olarak tam yedek.

**Otomatik yedek (sunucu)** — SQLite veritabanları, `./data` bind-mount dizinindedir (Compose dosyasına göre, genellikle `/opt/tesla-carview/data`). Sunucuda otomatik yedekleme için:

```bash
# Saat 03:00'te günlük yedek (crontab -e):
0 3 * * * cp /opt/tesla-carview/data/master.db /opt/tesla-carview/data/tenants/*.db /backup/
```

**Yerleşik tam yedek** (Admin → Veri yönetimi → «Backup erstellen»), passkey kimlik bilgileri de dahil olmak üzere tüm 26 tabloyu JSON olarak dışa aktarır. Aynı sunucuya geri yüklemeden sonra kayıtlı passkey'ler hemen çalışır.

> ⚠️ **Silmeden önce önemli**
>
> Veri silmeden önce mutlaka bir export al. Silinen veriler geri getirilemez.

## ⚡ Tesla Developer API kurulumu {#tesla-api}

Tesla Carview, resmi **Tesla Fleet API** üzerinden iletişim kurar. Bunun için ücretsiz bir Tesla Developer hesabına ve kayıtlı bir uygulamaya ihtiyacın var.

### Adım 1 – Geliştirici hesabı oluştur

1. `developer.tesla.com` adresine git ve Tesla hesabınla giriş yap.
2. Developer Terms of Service'i kabul et.
3. **Create Application**'a tıkla.

### Adım 2 – Uygulamayı yapılandır

1. **Application Name:** istediğin ad, örn. *Tesla Carview*
2. **Description:** kısa açıklama (zorunlu)
3. **Allowed Origin:** uygulamanın herkese açık URL'si, örn.

   ```
   https://carview.example.com
   ```

4. **Redirect URI:** uygulamanın geri çağrı URL'si:

   ```
   https://carview.example.com/api/auth/callback
   ```

5. **Scopes (zorunlu):** `vehicle_device_data`, `vehicle_cmds`, `vehicle_charging_cmds`, `vehicle_location`, `openid`, `offline_access`
6. ⚠ `vehicle_location`, GPS takibi (Fleet Telemetry) için zorunludur

### Adım 3 – Kimlik bilgilerini not et

Oluşturduktan sonra şunları alırsın:

- **Client ID** — UUID benzeri bir karakter dizisi
- **Client Secret** — yalnızca bir kez görünür, hemen kopyala ve güvenli bir yere kaydet

```env
TESLA_CLIENT_ID=abc123def456...
TESLA_CLIENT_SECRET=tsl_secret_...
```

Bu değerleri `.env` dosyasına yaz veya etkileşimli kurulum sihirbazına gir.

### Adım 4 – Fleet API erişimi başvurusu (komutlar için)

Araç komutlarının (klima, kapılar, şarj) çalışması için uygulamanın Tesla'da *partner* olarak kayıtlı olması gerekir. Bu, bir defalık şu uç nokta üzerinden yapılır:

```
POST https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/partner_accounts
```

`FRONTEND_URL` ayarlıysa kurulum betiği bu adımı otomatik yapar. Aksi hâlde Postman veya curl ile manuel yap. Etkinleşmesi 1–3 iş gününü bulur.

### Adım 5 – Tesla Carview içinde bağlan

1. Girişten sonra: **Ayarlar → Tesla Bağlantısı → Tesla'yı yeniden bağla**
2. Tesla'ya yönlendirilirsin; orada giriş yapıp uygulamaya erişim izni vermelisin.
3. Yönlendirmeden sonra: **Ayarlar → 🔄 Araçları senkronize et**
4. Tesla hesabındaki tüm araçlar uygulamada görünür.

### Adım 6 – Fleet Telemetry'yi etkinleştirme (GPS takibi)

Daha yeni araçlarda (örn. 2024'ten itibaren Model Y, XP7 VIN) GPS verisi yalnızca **Fleet Telemetry** üzerinden gelir — REST API'den değil. Bunun için iki tek seferlik adım gerekir:

1. **Uygulamayı Tesla'da kaydet** — Ayarlar → Fleet Telemetry → *„🔑 Uygulamayı Tesla'da kaydet"*'e tıkla. Bir defalık.
2. **Fleet Telemetry erişimi iste** — Sonraki adım „HTTP 404" ile başarısız olursa Tesla, uç noktayı henüz açmamıştır. Bu durumda Tesla Developer Support'a başvur (aşağıya bak).
3. **Telemetriyi etkinleştir** — Ayarlar → Fleet Telemetry → *„📡 Telemetriyi etkinleştir"*'e tıkla. Aracı GPS, hız ve batarya verilerini akıtacak şekilde yapılandırır.

**Tesla Support'tan Fleet Telemetry erişimi istemek**

Adım 2, 404 ile başarısız olursa aşağıdaki talebi Tesla Developer Support formuna gönder (`developer.tesla.com/dashboard → Support Inquiry`):

```
Subject: Fleet Telemetry Access Request – Self-Hosted App for Personal Use

Hello Tesla Developer Support,

I am requesting approval for fleet_telemetry_config access for a
self-hosted application used exclusively for personal purposes
(own vehicle, single user).

Context:
- App name: MyCarviewApp
- Client ID: a1b2c3d4-0000-0000-0000-e5f6a7b8c9d0
- Hosting: self-hosted on private infrastructure
- User scope: single user (vehicle owner)
- Vehicle VIN: 5YJ3E1EA1NF000000

Current status:
- OAuth, polling, charging control, and vehicle commands work.
- fleet_telemetry_config returns HTTP 404.

Use case:
Personal monitoring of my own vehicle (location, charging state,
drive state) via my self-hosted backend. No third-party access,
no commercial use, no data sharing.

Could you please review and enable fleet_telemetry_config?

Thank you
```

⚠ Client ID ve VIN'i kendi değerlerinle değiştir. Tesla genellikle birkaç gün içinde yanıt verir.

### API maliyetlerini anlamak

**Önce şunu bilin:** Tesla **hesap başına aylık 10 $ ücretsiz kredi** verir (2026 itibarıyla) — **bir araç + Fleet Telemetry + günde birkaç komut/wake** için yeterli. Tipik özel kullanımda Fleet API faturası **0 €**'da kalır. Üzerinde kullandıkça öde: Streaming 150.000 sinyal = 1 $, Komut 1.000 = 1 $, Polling 500 istek = 1 $, Wake 50 = 1 $ (en pahalı işlem). Fleet Telemetry olmadan uygulama arka planda sorgular:

| Durum | Aralık | Çağrı/gün |
|-------|--------|-----------|
| Sürüş yapıyor | 30 sn | 2.880'e kadar |
| Çevrimiçi, park | 10 dak | 144'e kadar |
| Çevrimdışı / uyku | 45 dak | 32'ye kadar |
| Fleet Telemetry ile | 1 saatlik sinyal | 24 |

**Günlük sınır:** Varsayılan olarak günde 80 çağrı/araç, ardından gece yarısına kadar duraklama.

**Maliyeti düşür:**
- Fleet Telemetry kur → polling yerine streaming, ücretsiz kredi olmadan ~5 $/ay, krediyle 0 $
- Ayarlar → Tesla Bağlantısı: aylık limit + sert durdurma

**Sonuç:** Bir araç + streaming telemetri = Fleet API pratikte ücretsiz.

## 🔌 Monta entegrasyonu (ev şarjı & faturalandırma) {#monta}

Tesla Carview, **Monta wallbox**'tan şarj verilerini doğrudan çekebilir. Entegrasyon **tüm araçlar** için kullanılabilir:

- **Özel araçlar**: Monta şarj oturumları bilgi olarak görüntülenir (şarj geçmişinde 🏠 rozeti, ev wallbox tespiti).
- **Şirket araçları**: Bunlara ek olarak tam faturalandırma mevcuttur — aylık özet, PDF geri ödeme belgesi ve işveren için şablon.

> ℹ️ Faturalandırma özellikleri (PDF, geri ödeme şablonu) yalnızca **Şirket aracı** kategorisindeki araçlar içindir. Monta şarj verileri tüm araçlar için kullanılabilir.

### Adım 1 – Monta API anahtarı oluştur

1. **Monta**'ya giriş yap (uygulama veya web: `portal.monta.com`).
2. **Ayarlar → API**'ye git.
3. **API Anahtarı oluştur**'a tıkla ve anahtarı kopyala (`monta_` ile başlar).

Anahtar yalnızca bir kez görünür — hemen Tesla Carview'a gir.

### Adım 2 – Charge-Point ID'sini bul

1. Monta portalında: **Şarj noktaları → Cihazlarım**'ı seç.
2. **Charge-Point ID** detay görünümünde yer alır (biçim: `cp_12345`).
3. Alternatif: `GET /api/v1/charge-points` API çağrısı tüm şarj noktalarını ID'leriyle döndürür.

### Adım 3 – Tesla Carview'a girme

1. **Ayarlar → Araç profili**'ne git.
2. **Wallbox elektrik fiyatı (€/kWh)** gir, örn. `0.34` (şirket araçları için faturalandırma tabanı).
3. **Monta Charge-Point ID** ve **Monta API anahtarını** ekle.
4. **Kaydet**'e tıkla.

### Ev wallbox tespiti

Araçta bir **Monta Charge-Point ID** yapılandırıldığında, senkronizasyondan dönen tüm oturumlar tanım gereği ev wallbox'ında yapılan şarjlardır. Uygulama eşleşen yerel oturumları otomatik olarak **ev şarjı** olarak işaretler ve şarj listesinde 🏠 rozeti, faturalandırmada 🏠 işareti gösterir. Bu işaret aylık raporda da güçlü bir „ev/dış" sinyali olarak kullanılır — GPS tabanlı eşleşmeden bağımsızdır, böylece araç şarj sırasında GPS konumu sağlamasa bile oturum doğru sınıflandırılır.

### Faturalandırmayı kullanma

- Navigasyondan **Faturalandırma**'ya git.
- İstediğin ayı seç — tüm ev şarjları listelenir.
- Ücretsiz olan şarjları (örn. işverende) şarj geçmişinde **✕ ücretsiz** ile işaretleyebilirsin — bunlar faturadan çıkarılır.
- **PDF dışa aktar** ile imzaya hazır bir fatura sayfası alırsın.

## 📝 Servis defteri {#logbook}

**Servis defteri**'ni araç işletimiyle ilgili her şeyi belgelemek için kullan: bakım, onarımlar, lastik değişimi, muayene, kazalar ve serbest notlar. Her giriş otomatik olarak şunları alır:

- **Tarih ve saat** — oluştururken varsayılan olarak „şimdi"; geriye dönük ve ileri tarihli girişler de mümkündür.
- **Yazar** — oturum açan kullanıcı yazar olarak kaydedilir ve her girişin yanında **👤 kullanıcı adı** olarak görüntülenir. Bu özellikten önceki girişler „👤 bilinmiyor" olarak görünür.
- **Kategori ve isteğe bağlı alanlar** — o anki kilometre, maliyet, serbest açıklama.

Bu sayede daha sonra hangi notu veya bakımı kimin kaydettiği takip edilebilir — birden fazla aktif kullanıcısı olan kiracılarda özellikle yararlıdır.

## 🔵 OwnTracks doğrulama (v3.11.0'dan itibaren) {#owntracks-validation}

**Çözülen sorun:** OwnTracks telefonunuzdan GPS verilerini TeslaView'a gönderir. Başka bir araç sürdüğünüzde veya yolcu olduğunuzda, yanlış yolculuklar Tesla yolculukları olarak görünür. Aynı Tesla'da birden fazla kişi OwnTracks kullanırsa yolculuklar çift kaydedilir.

TeslaView'in üç savunma hattı var:

### A) Bluetooth doğrulama (otomatik, önerilen)

iPhone'unuz şu anda Tesla Bluetooth'una bağlı olup olmadığını bilir. iOS Kısayolu TeslaView'a "bindim" / "indim" der.

**Kurulum (bir kez, ~3 dakika):**

1. **Tesla Bluetooth adını not edin**: iOS → Ayarlar → Bluetooth → Tesla'nızın girdisi (örn. "Tesla 7SA5...").
2. **TeslaView'de**: `/my-tracking` → cihazınızda "🔵 Bluetooth doğrulama" → adı girin → kaydedin.
3. **iOS Kısayollar uygulaması** → "Otomasyon" → "+ Yeni otomasyon":
   - "Bluetooth bağlandığında" → Tesla'yı seçin
   - "URL içeriğini al" eylemi ekleyin → TeslaView'in gösterdiği **Bağlanma URL'sini** yapıştırın, **HTTP yöntemi = POST**
   - Kaydedin ve "Sormadan çalıştır" seçeneğini açın
4. **İkinci otomasyon** "Bluetooth bağlantı kesildiğinde" için → **Bağlantı kesme URL'si**.

Bluetooth yapılandırması kaydedildikten sonra TeslaView, telefon Tesla'ya bağlı olmadığı her OwnTracks konumunu yok sayar.

### B) Yolculuk kilidi (otomatik)

Aynı Tesla'da OwnTracks'li iki kişi olursa, koruma olmadan her iki yolculuk çift kaydedilir. TeslaView bu nedenle **harekete geçen ilk cihaza yolculuk kilidi** koyar — diğerleri yolculuk süresince yok sayılır (15 dakika hareketsizlikten sonra otomatik bırakılır). Kullanıcı kurulumu gerekmez.

### C) Manuel duraklatma (acil fren)

`/my-tracking` içinde her cihazın bir ⏸ düğmesi var. Bir süre Tesla kullanmayacağınızı biliyorsanız (kiralık araçla tatil, bisiklet turu), cihazı manuel olarak duraklatın. Dönüşte tekrar aktive edin.

### Android'de kurulum (iOS yerine)

Android, iOS Kısayollarına yerel bir 1:1 alternatif sunmaz. Üç yol:

**Önerilen: MacroDroid** (ücretsiz sürüm yeterli, ~10M indirme, güvenli)
1. Play Store'dan kurun
2. "+ Yeni makro" → tetikleyici "Bluetooth" → "Cihaza bağlandı" → Tesla'yı seçin
3. Eylem "HTTP isteği" → yöntem GET → TeslaView'den bağlanma URL'sini yapıştırın
4. "Tesla bağlandı" olarak kaydedin
5. "Bluetooth ayrıldı" için aynısı, bağlantı kesme URL'si ile

**Alternatifler:**
- **Automate (Llamalab)** — 30 bloğa kadar ücretsiz, görsel akış (temiz ama öğrenme eğrisi)
- **Tasker** — 3,49 € bir defalık, altın standart

⚠ **Doğrulama notu:** Bu kılavuz Android'de canlı doğrulanmadı (geliştirici tarafı yalnız iOS). Sorun varsa GitHub issue açın.

### Durum göstergesi

- 🟢 **Tesla'da** — aktif, yolculuklar kaydediliyor
- 🟡 **Tesla'da değil** — Bluetooth bağlı değil, yolculuklar yok sayılır
- ⏸ **Duraklatıldı** — manuel devre dışı
- 🔵 **Durum bilinmiyor** — kurulumdan sonra ilk Bluetooth olayını bekliyor
- 🔵 **Bluetooth doğrulaması olmadan aktif** — eski mod, Bluetooth adı yok

## 📍 Yakında (v3.13.0'dan itibaren) {#nearby}

`/nearby` arabanız, aktif şarj oturumunuz veya son yolculuk bitişiniz etrafındaki POIları (ilgi noktalarını) gösterir. Hızlı şarj molalarında kullanışlı.

**Kategoriler**: kafe, restoran, fast food, fırın, süpermarket, WC, içme suyu, oyun alanı, park, piknik, manzara, ATM, eczane, **geocache**.

**Veri kaynağı**: [OpenStreetMap Overpass API](https://overpass-api.de) — ücretsiz, hesap yok, API anahtarı yok. Çağrılar sunucu tarafında yapılır ve sonuçlar 24 saat `poi_cache`'da önbellenir (4 ondalık → ~11 m).

**Yarıçap**: 500 m / 1.5 km / 3 km. POI tıklandığında OpenStreetMap açılır.

**Filtre**: her kategori toggle — örn. şarj sırasında define avı için sadece geocache göster.

## 🚀 Uygulama merkezi (v3.9.0'dan itibaren) {#app-hub}

`/launcher` Tesla tarayıcısında çalışan ve Tesla'nın yerel olarak SUNMADIĞI **seçilmiş web uygulamaları listesi** sunar:

- **Ses (kamu yayıncıları)** — ARD Audiothek, Deutschlandfunk canlı
- **EV dünyası** — GoingElectric, electrive, OpenChargeMap, A Better Routeplanner
- **Mesajlaşma** — Telegram Web, Signal (Tesla'da yerel sohbet yok)
- **Bilgi** — Wikipedia

**Dahil edilme kriterleri:** ücretsiz, güvenli (HTTPS), zorunlu uygulama mağazası kurulumu yok, gizliliğe saygılı, **Tesla yerel çoğaltması yok** (Spotify, Apple Music, oyunlar, haritalar, yayın hizmetleri kasıtlı olarak yok — Tesla zaten sunuyor).

**Tesla hoparlörlerinden ses:** her zamanki gibi telefonunuzdan Bluetooth ile geçer — yapılandırma yok.

**Yönetici beyaz listesi:** `/admin?tab=launcher` altında yönetici, kiracı başına uygulamaları gizleyebilir, örn. Telegram Web göstermek istemiyorsanız. Liste `tenant_settings` içinde `launcher.disabled_slugs` altında saklanır.

**Özel uygulamalar (v3.40.0'dan itibaren):** App Hub yönetiminde yönetici ayrıca **kendi web uygulamalarını oluşturabilir, düzenleyebilir ve silebilir** (emoji, ad, URL, isteğe bağlı not; yalnızca http/https adresleri). Özel uygulamalar tüm kullanıcılar için «Özel» kategorisinde görünür ve kiracı başına saklanır; oluşturma, düzenleme ve silme denetim günlüğüne kaydedilir.

## 📍 Konumu manuel girme (GPS olmadan) {#manual-location}

Tesla'n GPS göndermiyorsa (Fleet Telemetry'siz XP7-VIN'lerde veya bağlantı kesintilerinde tipik), şarj konumunu ve yolculuk adreslerini elle güncelleyebilirsin:

- **Şarj konumu** — şarj listesinde konum adına tıkla, satır içi düzenleyici açılır. Üç yol: tanımlı bir şarj konumu seç (tarife / konum miras alınır), serbest ad gir veya enlem/boylam koordinatlarını manuel gir (yapılandırılmış yarıçap içinde tanımlı konumlarla otomatik eşleşme, varsayılan 200 m).
- **Yolculuk adresleri** — `Yolculuk ayrıntısı → ✎ Düzenle` altında: serbest metinle başlangıç ve bitiş adresi, harita için isteğe bağlı enlem/boylam.

Her düzenlenebilir alanda, ne işe yaradığını, ne zaman gerektiğini ve kaydedince ne olacağını açıklayan bir mouse-over ipucu vardır.

### Otomatik adres çözünürlüğü v3.8.0'dan itibaren {#auto-geocode}

**v3.10.0'dan itibaren adres koordinatlardan önce**: her liste (servis defteri, yolculuklar, şarj oturumları) ve detay görünümü adresi tercih eder. Yalnızca adres yoksa (veya geri doldurma henüz çalışmadıysa) lat/lon yedek olarak görünür — 4 ondalık basamağa (~11 m) biçimlendirilmiş. Mümkün olduğunda okunabilir konum gösterilir, "54.1234, 9.5678" değil.

Bir yolculuk veya şarj oturumunda **GPS koordinatları olup ama adres metni yoksa**, TeslaView adresi arka planda otomatik olarak doldurur:

- **Canlı tetikleyici**: her OwnTracks yolculuk kapanışından ve her şarj eklenmesinden hemen sonra fire-and-forget ters arama çalışır.
- **Gecelik geri doldurma**: her gece kiracı başına en fazla 60 eski kayıt işlenir.
- **Yönetici talep üzerine**: `POST /api/system/geocode-backfill` (yönetici alanı) yapılandırılabilir bir `limit` ile anlık çalışma başlatır.

**Kaynak**: [Nominatim/OpenStreetMap](https://nominatim.openstreetmap.org) — ücretsiz, hesap yok, API anahtarı yok. Veri egemen (OSM Vakfı, AB).

**Yerel önbellek**: her arama `geocode_cache`'a iner (4 ondalık basamağa yuvarlanmış ~11 m) ve aynı konumdaki başka her yolculuk/oturum için yeni dış çağrı olmadan kullanılabilir. Nominatim'in saniyede 1 istek limiti sıkı uygulanır.

## 🎮 Genişletilmiş araç kontrolü {#control-extended}

**Kontrol** sayfası artık Tesla mobil uygulamasının kapsamına oldukça yakındır:

| Alan | Fonksiyonlar |
|---|---|
| Klima | Aç/kapat, hedef sıcaklık, ön klimalandırma max-defrost, **climate keeper modları** (kapalı / koruma / 🐶 köpek / ⛺ kamp), direksiyon ısıtması |
| Koltuklar | 5 koltuk (sürücü, yolcu, arka sol/orta/sağ) × 4 ısıtma kademesi |
| Gövde | Kapılar, sentry modu, ön bagaj ve bagaj kapağı tetikleyici, tüm camları havalandır/kapat, ışıklar ve korna |
| Şarj | Başlat/durdur, şarj limiti kaydırıcı, **şarj akımı kaydırıcı (5–48 A)**, şarj kapağı aç/kapat |
| Boombox | Harici hoparlörler üzerinden 9 hazır Tesla sesi (yalnızca Boombox donanımına sahip araçlar; araç hareketsiz olmalı) |
| Kalkış zaman planı | Günlük kalkış saati, isteğe bağlı yalnızca Pzt–Cum — Tesla, ön klimalandırmayı yaklaşık 20–30 dk önce başlatır; araç prize takılı olmalı |
| Off-Peak şarj | Dinamik tarifeler (Tibber, aWattar, gece tarifesi) için sabit şarj başlangıç saati. Kalkış zaman planından farklı olarak araç **geriye doğru hesaplamaz** — saat başlangıçtır, hazır olma süresi değil. Şarj limit dolana kadar devam eder. |
| Yazılım güncellemesi | Durum (mevcut / indiriliyor / yükleniyor / zamanlanmış), „Şimdi yükle" 1 dk gecikmeli planlar, „İptal" zamanlanmış yüklemeyi siler |

Notlar:
- Komutlar için aktif **Virtual Key** ve çalışan `tesla-http-proxy` gerekir (Hızlı başlangıç bölümüne bakın).
- Araç uykudayken komutlar reddedilir — önce „☀️ Uyandır" düğmesine bas (~30 sn).
- Climate keeper yalnızca sürücü aracı terk ederken klima açıksa çalışır.

## 📜 Yasal içerik yönetimi {#legal-admin}

**Yönetici → Yasal içerik** altında yönetici künye, gizlilik politikası ve kullanım koşullarını günceller. Üç önemli nokta:

- **Varsayılan dili koru, diğerleri takip etsin** — Senkronizasyon modu varsayılan olarak açıktır: Almancayı düzenlersin, diğer beş yerel ayar aynı metni byte-byte yansıtır. Ön yüz mavi bir uyarı şeridi gösterir („şu anda yalnızca Almanca olarak güncellenmektedir"). Senkronizasyon modu, tek bir yerel ayarı bireysel olarak düzenlemek için düzenleme başına kapatılabilir.
- **Sürüm artışı tarihi otomatik günceller** — Kaydetmede „Sürümü artır" işaretlendiğinde, arka uç önce gövdedeki „Stand:" / „Last updated:" / „Son güncelleme" satırına bugünün tarihini yazar ve ancak ondan sonra sürümü artırır. Böylece her büyük sürüm o satırı elle güncellemen gerekmeden doğru tarihi taşır. Sürüm artışı olmayan basit gövde düzeltmeleri tarihi değişmeden bırakır.
- **Onay takibi** — Her sürüm artışı, tüm aktif kullanıcıları gizlilik ve koşulları yeniden kabul etmeye zorlar — onay penceresi o ana kadar girişi engeller. Onaylar GDPR uyumlu şekilde kullanıcı + sürüm + IP + zaman damgası olarak kiracı veritabanına kaydedilir.

## 🔧 Servis aralıkları {#service-intervals}

**Vorausschau (v3.31):** km aralıkları için TeslaView, kilometrenize göre ne zaman dolacağını tahmin eder; TCO panosu ayrıca 12 aylık maliyet öngörüsü gösterir. Saf istatistik.

**Ayarlar → Servis aralıkları** altında her araç için tekrar eden servis görevleri tanımlarsın (muayene, bakım, fren hidroliği, mevsimsel lastik değişimi, polen filtresi, silecekler, klima bakımı). Her kayıt **zaman aralığı** (ay), **km aralığı** veya her ikisini de kabul eder. „Standartları oluştur" Tesla için tipik bir listeyi önceden doldurur.

Uygulama „X gün / Y km içinde vade" hesaplar ve süresi geçmiş ya da yakında dolacak öğeleri panelin üstünde gösterir. **Günlük push hatırlatması** (Web-Push), bir aralık < 30 gün veya < 1.000 km kalınca tetiklenir. Anti-spam: her push girişi „bildirildi" olarak işaretler; bir sonraki hatırlatma yalnızca „Tamam" damgası veya 30 günlük erteleme sonrası gelir. „Tamam" otomatik olarak bugünün tarihini ve mevcut kilometreyi atar.

## 📋 Denetim günlüğü {#audit-log}

**Yönetici → Denetim günlüğü** altında yöneticiler tüm güvenlikle ilgili olayları görür: girişler (başarılı + başarısız), hesap kilitleri, MFA kurulumu, yetki değişiklikleri, Tesla komutları, KVKK/GDPR onayları, kullanıcı oluşturma. Eylem, kullanıcı kimliği ve tarih aralığına göre filtrelenebilir. Eylemler renkle kodlanır (başarısızlık için kırmızı, kimlik doğrulama için mavi, yönetici işlemleri için mor). Detay bloğu JSON'u açar. **CSV dışa aktarma**, filtrelenmiş kümeyi Excel'e hazır şekilde verir (noktalı virgül, BOM) — GDPR erişim talepleri veya olay sonrası analiz için uygundur. Veriler kiracı bazında izole edilmiştir.

## 📄 PDF gider belgesi {#pdf-billing}

**Faturalandırma** sayfasındaki **„📄 PDF erzeugen"** butonu imzalanmaya hazır bir A4 belgesi üretir: şirket / araç / dönem başlığı; oturum tablosu (Monta tarafından tespit edilen ev şarjları için 🏠 işareti dahil); toplamlar (oturum / kWh / tutar); imza alanları. Üretim tamamen tarayıcıda `jsPDF` ile yapılır — şarj verileri makinenden ayrılmaz.

## 💸 Dinamik elektrik fiyatı {#dynamic-tariff}

Dinamik bir elektrik tarifeniz varsa (Tibber, aWattar HOURLY, EPEX spot), **Ayarlar → Elektrik fiyatı API'si** altında bir sağlayıcı yapılandırın:

| Sağlayıcı | API Token | Fiyat tabanı |
|---|---|---|
| **aWattar** (DE/AT) | gerekmez — kamuya açık | EPEX spot fiyatı, isteğe bağlı + ct/kWh ek ücret |
| **Tibber** (DE/SE/NO/NL/…) | developer.tibber.com'dan token | Vergiler dahil son müşteri fiyatı |

Pano daha sonra şu anki fiyatı, 24 saatlik bir grafiği ve „en ucuz 4 saatlik pencere" önerisini gösteren bir **tarife widget'ı** görüntüler. **„🚗 Şarjı en ucuz pencereye planla"** tıkı, o pencerenin başlangıcını doğrudan aktif aracın `set_scheduled_charging` ayarına yazar. Fiyatlar 30 dakika önbelleğe alınır. Sağlayıcı yapılandırılmadığında widget gizlenir ve dışa giden hiçbir istek yapılmaz.

## 📒 Vergi dairesi için yolculuk defteri (Alman BMF uyumlu) {#fahrtenbuch-bmf}

Yolculuk defteri, Alman vergi dairelerinin BMF kurallarına göre elektronik yolculuk defteri olarak kabul ettiği bir PDF üretir. Özel/iş kilometrajının ayrılması gereken her ülkede de benzer şekilde faydalıdır.

**Adım adım:**

1. **Her yolculuğu sınıflandır** — tür rozetine tıklayarak Özel → İş → İşe gidiş arasında geçiş yap.
2. **İş yolculuklarında iki alanı doldur** (BMF zorunluluğu):
   - **İş ortağı** — kimi ziyaret ettin?
   - **Amaç** — iş gerekçesi.
3. **Ayı seç** üstteki filtreden.
4. **„📄 Finanzamt-PDF" tıkla** — sıralı numaralandırma, her yolculuğun başlangıç ve bitiş kilometresi, mesafe, başlangıç → varış, iş ortağı ve amaçla A4 yatay belge.

**Manipülasyon koruması** — dışa aktarımdan sonra dahil edilen yolculuklar otomatik olarak değişikliklere karşı kilitlenir. Kilitli yolculuklar 🔒 simgesi gösterir. Dışa aktarımdan önce yapılan düzeltmeler yolculuk başına bir **değişiklik geçmişine** kaydedilir.

**Manuel kayıt** — bir yolculuk eksikse **„+ Manuell"** ile tamamen kendin gir. Zorunlu: başlangıç ve bitiş saati. Manuel kayıtlar ✍ rozeti taşır.

**Ardışık yolculukları birleştir** — telemetri bir yolculuğu ikiye bölmüşse (kısa duraklama, GPS boşluğu), ilk yolculukta **„Mit nächster zusammenführen"** tıkla.

## 🗓️ Aktivite ısı haritası {#trips-heatmap}

Yolculuk defterinde aylık özetin üstünde **tüm yolculuklara ait takvim ısı haritası** bulunur:

- **Üst filtre**: ayrıntı düzeyini seçin — `Yıl`, `Ay`, `Hafta` veya `Tümü`. `Yıl/Ay/Hafta` için ikinci bir seçici döneme göre filtreler.
- **Hücre parlaklığı** o günün kilometresine göre; koyu hücre = yolculuk yok, açık yeşil = çok.
- **Bir günün üzerine gelince** tooltip'te tarih + yolculuk sayısı + toplam km görünür.
- **Dolu bir güne tıklamak** o tarihe göre filtrelenmiş yolculuk listesine götürür — „o gün ne yaptım?" sorusuna hızlı yanıt.
- Alt kısımda renk skalası açıklaması ve etkin filtrenin toplamı yer alır.

Veri kaynağı: BMF yolculuk defteriyle aynı yolculuklar — ısı haritası salt görselleştirmedir, hiçbir veri yazmaz.

## 📱 Akıllı telefon ve Tesla içinde kullanım (PWA kurulumu) {#mobile-tesla-install}

Tesla Carview bir **PWA**'dır (Progressive Web App) — App Store veya Google Play olmadan yerel uygulama gibi kurulabilir. iPhone, iPad, Android, Tesla araç tarayıcısı ve tüm Chromium masaüstü tarayıcılarında çalışır.

**Android Akıllı Telefon / Tesla / Chrome / Edge:**
1. Uygulamayı tarayıcıda aç ve giriş yap.
2. Altta „Carview als App installieren" şeridi belirir → **Installieren** düğmesine dokun.
3. Simge ana ekrana iner. Dokunulduğunda uygulama tarayıcı çubuğu olmadan tam ekran açılır.

**iPhone / iPad (Safari):**
1. Uygulamayı Safari'de aç ve giriş yap.
2. **Paylaş** düğmesi → **„Ana Ekrana Ekle"** → Ekle.
3. Simge, yerel uygulamalar gibi ana ekranda görünür.

**Tesla Ekranında:**
- Araçta: tarayıcıyı aç, Carview URL'sini gir.
- Uygulama Tesla ekran boyutuna uyum sağlar. Dar görünümde yolculuk defteri otomatik olarak büyük dokunma hedefleri olan kart görünümüne geçer.
- İpucu: **„◫ Karten"** butonu büyük ekranlarda da kompakt görünümü zorlar.

**Öneri:** Carview'i Tesla tarayıcısında yer imi olarak kaydet — Tesla, kaydedilen yer imlerini doğrudan tarayıcı hızlı erişiminde gösterir. Kısa bir durakta seyahat notu girmek, her seferinde URL yazmaktan çok daha hızlıdır.

### 🗂️ Masaüstü navigasyonu: menü grupları

Masaüstü ve tablet tarayıcılarında navigasyon üç ana bölüme ayrılır:

| Grup | İçerik |
|---|---|
| **Araç** | Pano · Canlı veriler · Kontrol · Batarya |
| **Analiz** | Sürüşler · Yol defteri · Şarj · Enerji raporu · Uyku monitörü · İklim · Servis defteri · Fatura · Dışa aktarma |
| **Planlama** | Rota planlayıcı · Şarj istasyonları · Otomasyonlar · Grok (YZ) |

### 🚗 Sürüş günlüğünü doğrudan Tesla tarayıcısında açma {#tesla-direkt}

Sürüş günlüğünün üst kısmındaki **« 🚗 Tesla'da Aç »** düğmesi, Tesla tarayıcısından erişimi kolaylaştırır:

1. Telefonunuzda veya bilgisayarınızda Carview'de **Analizler → Sürüş Günlüğü**'nü açın.
2. **« 🚗 Tesla'da Aç »** düğmesine tıklayın.
3. Bir **QR kodu** ve **doğrudan URL** içeren bir pencere açılır (örn. `https://uygulamaniz.example.com/pair/abc123…`).
4. Tesla'da tarayıcıyı açın ve URL'yi girin — varsa QR kodu da tarayabilirsiniz.
5. Tesla tarayıcısı bir Passkey kimlik doğrulama sayfası açar. **« Passkey ile Onayla »**'ya dokunun ve kimliğinizi doğrulayın.
6. Başarılı doğrulamanın ardından Tesla tarayıcısı oturum açar ve doğrudan sürüş günlüğüne yönlenir.

Oturum **5 dakika** geçerlidir. Refresh-token çerezi oturumu **7 gün** açık tutar. Sürüş günlüğü URL'si Tesla tarayıcısının hızlı erişim sık kullanılanlarına eklenebilir.

**Her araç için çalışır** — sürüş günlüğü ve manuel giriş Tesla API bağlantısı gerektirmez. Diğer marka araç sürücüleri manuel girişi (« + Manuel ») kullanarak uyumlu PDF dışa aktarabilir.

### 📲 iPhone Navigasyonu: Sekme Çubuğu

iPhone ve diğer akıllı telefonlarda Tesla Carview, ekranın altında **iOS tarzı bir sekme çubuğu** gösterir:

- **4 hızlı sekme** — Pano, Sürüşler, Şarj, Kontrol her zaman tek dokunuşla erişilebilir
- **"Daha fazla" düğmesi** → diğer tüm bölümleri (Araç, Analiz, Planlama) içeren bir alt sayfa açar; araç seçici, el kitabı, ayarlar ve çıkış da buradadır
- **Dynamic Island / Home Indicator** doğru şekilde desteklenir
- Etkin sekme küçük bir göstergeyle işaretlenir

**Nevs-Edition** tasarımında sekme çubuğu petrol rengine döner.

## 🗺️ Rota planlayıcı {#route-planner}

**WLTP yerine kişisel menzil (v3.29):** varış şarj durumu, sıcaklığa bağlı gerçek tüketiminize göre hesaplanır; güven bandı ve « sınırlı olabilir » uyarısı ile. Saf istatistik.

Rota planlayıcı, sürüş güzergahları hesaplar ve yol boyunca hızlı şarj istasyonlarını gösterir.

**Rota hesapla** — Başlangıç ve varış adreslerini gir. « + Ara durak » ile istediğin kadar waypoint ekleyebilir ve sürükle-bırak ile sıralayabilirsin.

**Kaçınma seçenekleri** — Hedef alanının yanında üç geçiş düğmesi:
- **Otoyollar** — güzergah karayolları ve şehirlerarası yollar üzerinden geçer
- **Ücretli yollar** — ücretli bölümler atlanır
- **Feribotlar** — güzergahta feribot bağlantısı yer almaz

Seçenekler tarayıcıda kaydedilir. Yönlendirme Valhalla (openstreetmap.de) kullanır; erişilemezse otomatik olarak OSRM'ye geçilir ve toast bildirimi gösterilir.

**Hızlı şarj istasyonları** — Güzergah boyunca Supercharger'lar ve CCS. Admin → System → Harici API anahtarları altında ücretsiz bir OpenChargeMap API anahtarı gerektirir. Arama, seçilen yarıçapı (5/10/25/50 km) doğru kullanır, istasyon adlarını ve adreslerini gösterir, yalnızca DC filtresini destekler ve konnektör türleri, şarj noktası sayısı ve Tesla uyumluluğunu gösterir.

**Gerçek zamanlı trafik** — HERE Maps API anahtarı yapılandırıldığında, güncel trafik akışı seyahat süresi tahminine dahil edilir.

**Şarj planlaması** — SoC planlaması etkinleştirildiğinde (pil seviyesini gir), planlayıcı zaman tahminiyle akıllı şarj durakları hesaplar ve her bölüm için menzil yeterli mi diye kontrol eder.

## 🟢 Sistem durumu (yönetici) {#system-health}

**İşletim öz testi (v3.32):** istek üzerine ve her hafta TeslaView güvenliği ve yedek bütünlüğünü denetler (MFA kapsamı, şifreleme anahtarı, SQLite bütünlüğü, son yedeğin güncelliği ve bütünlüğü) — trafik ışığı raporu olarak. Saf tanılama.

**System** altında yöneticiler sekiz kontrolle renkli trafik ışığı kartı görür:

- **Tesla OAuth token** — bağlı mı? ne zaman sona eriyor?
- **Virtual Key** — oluşturuldu mu? (imzalı komutlar için gerekli)
- **Fleet Telemetry** — son veri noktası ne zaman geldi?
- **Tesla poller** — uygulama aracı en son ne zaman sorguladı?
- **Kiracı DB** — veritabanı boyutu
- **Gece bakımı** — son otomatik bakım çalışmasının zaman damgası
- **OpenChargeMap** — canlı HTTP yoklaması (anahtar yapılandırılmamışsa soluk)
- **HERE Maps** — canlı HTTP yoklaması (anahtar yapılandırılmamışsa soluk)

Yeşil (her şey yolunda), sarı (dikkat) veya kırmızı (eylem gerekli). İsteğe bağlı hizmetler (OCM, HERE) yalnızca anahtar yapılandırılmış ancak uç nokta yanıt vermiyorsa hata sayılır.

**İzleme & Öz-iyileştirme** — Altta iki ayarlı İzleme kartı:
- **Öz-iyileştirme açık/kapalı** — Otomatik bir cron her 15 dakikada tüm konteynerlerin çalışıp çalışmadığını ve `/api/health` yanıt verip vermediğini kontrol eder. Çöken servisler otomatik olarak yeniden başlatılır.
- **Uyarı e-postası** — Bir e-posta adresi yapılandırılmışsa, her yeniden başlatmadan sonra zaman damgası ve yeniden başlatılan servis sayısıyla bildirim gönderilir.

Heal günlüğü ve security-check günlüğünün son 50 girişi doğrudan bu kartta görüntülenebilir ve « Günlüğü güncelle » ile her zaman yenilenebilir.

## 💬 Grok Chat {#grok}

**Grok Chat**, xAI destekli konuşmayı doğrudan Tesla Carview'a getirir. Seyahatleriniz, şarj verileriniz ve araç istatistikleriniz hakkında doğal dilde sorular sorabilirsiniz.

**Bağlam**: Araç verileri düğmesi (gösterge simgesi) etkinken, sohbet son seyahat, son şarj ve kilometre sayacı bilgisini bağlam olarak gönderir. Genel sorular için kapatın.

**Yeni sohbet**: Kenar çubuğunda **+ Yeni Sohbet** düğmesine tıklayın. Sorunuzu yazın ve Enter'a veya Gönder'e basın. Metin akışlı olarak görünür.

**Tesla tarayıcısı**: Küçük ekranda (< 768 px) kenar çubuğu yukarı katlanır. Ses girişi Web Speech API kullanır (Tesla tarayıcısı V12+).

**Günlük bütçe**: Varsayılan **100 sent/gün**. Mevcut kullanım kenar çubuğunun üstünde gösterilir.

**Gizlilik**: İstekler backend üzerinden yönlendirilir — tarayıcınızdan xAI'ye hiçbir zaman doğrudan değil.

## 🌍 CO₂ Karşılaştırması {#co2}

Enerji Raporu'ndaki **CO₂ karşılaştırması** sürüşünüzün çevresel etkisini gösterir:

- **Tesla CO₂** — Tüketiminize ve Almanya elektrik karışımına göre hesaplanır (0,38 kg CO₂/kWh).
- **Dizel eşdeğeri** — Benzer bir aracın (7 l/100 km, 2,65 kg CO₂/l) üretmiş olacağı CO₂.
- **Tasarruf edilen tonlar** — Tesla ile dizel arasındaki fark.

Değerler seçilen dönem için (4/8/12 hafta) hesaplanır ve trend grafiğinde haftalık yeşil çubuk olarak gösterilir.

## 🌡️ Hava Durumu Tüketimi {#weather-consumption}

**Tüketim-sıcaklık korelasyonu**, dış sıcaklığın tüketiminizi nasıl etkilediğini gösterir. Çubuk grafik tüm sürüşleri 6 sıcaklık aralığına göre gruplar (< −10 °C ile > 30 °C). Renkler yeşilden (verimli) kırmızıya (verimsiz) geçer.

## ❄️ İklim İstatistikleri {#climate-stats}

**İklim İstatistikleri** sayfası (`/climate`) aracınızın günlük klima sistemi kullanımını gösterir:

- **Klima** — Dönem başına saat
- **Koltuk ısıtma sürücü/yolcu** — Kullanım günleri
- **Ön iklim sayısı** — Uygulama veya zamanlama ile başlatma sayısı
- **En soğuk/sıcak gün** — Sıcaklık uç değerleri

Veriler **her araç senkronizasyonunda otomatik olarak** toplanır. Günlük grafikte: 🪑 = koltuk ısıtma aktif, 🔄 = ön iklim.

## 📦 Firmware Takipçisi {#firmware}

Admin → Sistem'deki **firmware takipçisi** araçta tespit edilen tüm yazılım sürümlerini gösterir: güncel sürüm, geçmiş (tarih, kurulu gün sayısı) ve toplam güncelleme sayısı.

## 🌍 Topluluk Karşılaştırması {#community-benchmark}

Enerji Raporu'ndaki **Topluluk Karşılaştırması**, aynı modeldeki diğer Tesla sürücüleriyle anonim tüketim karşılaştırması yapmanızı sağlar.

**Gizlilik ilkeleri:** yalnızca toplu değerler (kWh/100 km), SHA-256 hash olarak saklanan örnek, minimum 3 katılımcı gerekli (k-anonimlik), istediğiniz zaman iptal edilebilir.

**Katılım:** geçişi etkinleştirin, ardından «Veri katkıla» düğmesine tıklayın. Modeliniz için ≥ 3 katılımcı olduğunda ortalama, P25, P75 ve konumunuzu görürsünüz.

## 🎨 Tasarım & Temalar {#design-themes}

Tesla Carview **5 tasarım stili** ve **6 vurgu rengi** sunar — tümü yerel olarak saklanır, sunucu yeniden yüklemesi gerekmez.

### Tasarım stilleri

| Tasarım | Karakter |
|---|---|
| ✨ **Premium Glass** | Yumuşak, zarif, backdrop blur ile glassmorfizm |
| ⚡ **Cyberpunk-Tesla** | Neon parıltı, keskin çizgiler, monospace ağırlıklı |
| ◻ **Minimal Swiss** | Bol boşluk, sade, sayılar odakta |
| ▰ **Sport / Performance** | Köşeli, cesur, hız göstergesi estetiği |
| ◈ **Nevs-Edition** | Tech-editoryal, petrol vurgusu, Bricolage Grotesque tipografi |

**Nevs-Edition**, kendi tipografi paketine sahip tek stildir: başlıklar için *Bricolage Grotesque*, gövde fontu olarak *Manrope* ve etiketler için *JetBrains Mono*. Ayrıca NavBar'ın üzerinde gerçek zamanlı araç verilerini (batarya seviyesi, vites, kilometre, son senkronizasyon sinyali) gösteren ince bir **durum çubuğu** içerir.

### Vurgu renkleri

6 renk: Tesla Kırmızısı, Elektrik Mavisi, Enerji Yeşili, Mor, Gün Batımı, Buz Mavisi — her tasarım stiliyle serbestçe birleştirilebilir.

Değiştirmek için: **Ayarlar → Tasarım & Renkler**.

## 🔧 Sorun giderme {#troubleshooting}

**Araç GPS verisi döndürmüyor**
Daha yeni Tesla modelleri (XP7 VIN, örn. Model Y Juniper) REST API üzerinden `drive_state` vermez. GPS takibi Fleet Telemetry ile yapılır. tesla-http-proxy'nin çalıştığından ve Virtual Key'in kayıtlı olduğundan emin ol.

**Güncellemeden sonra giriş yapılamıyor**
v2.0'a (multi-tenant) geçişten sonra girişte bir kiracı kodu gerekir. Taşınan veritabanının kodu „default"tur. Onu giriş alanına yaz veya „Kiracı seç"'e tıkla.

**Tesla bağlantısı başarısız (401)**
Tesla OAuth tokenı süresi dolmuş. Ayarlar → Tesla Bağlantısı'na git ve Tesla hesabını yeniden bağla. `.env` dosyasındaki `TESLA_CLIENT_ID` ve `TESLA_CLIENT_SECRET` değerlerinin doğru olduğundan emin ol.

**Araç komutları başarısız oluyor**
Kontrol et: 1) tesla-http-proxy çalışıyor (`systemctl status tesla-http-proxy`) 2) Virtual Key araçta kayıtlı (Ayarlar → Araç bağlantısı) 3) Araç çevrimiçi (uyumuyor).

**Telemetri verisi yok / GPS eksik**
Fleet Telemetry iki adım gerektirir: (1) uygulamayı Tesla'da kaydet (Ayarlar → „🔑 Uygulamayı kaydet"), (2) telemetriyi etkinleştir (Ayarlar → „📡 Telemetriyi etkinleştir"). Adım 2, HTTP 404 ile başarısız olursa Tesla Developer Support'tan `fleet_telemetry_config` erişimi iste — kılavuzun „Adım 6"'sında bir şablon var. Ayrıca `developer.tesla.com` üzerindeki uygulama scope'larında `vehicle_location` etkin olmalı.

**Backend başlamıyor**
Logları kontrol et: `docker logs tesla-carview-backend`. Sık nedenler: eksik `.env` değişkenleri (`JWT_SECRET`, `TESLA_CLIENT_ID`), veritabanı taşıma hataları.

## ❤️ Uygulama senin için bir değer ifade ediyorsa {#donations}

Tesla Carview, **kendi kendine barındırılan özel kullanım için** ücretsizdir ve reklamsızdır (lisans: PolyForm Noncommercial 1.0.0 — ticari yeniden satış veya üçüncü taraflar için SaaS barındırma izni yoktur). Geri vermek istersen aşağıdaki kuruluşlar desteğine sevinir.

- **[Aktion Deutschland Hilft](https://www.aktion-deutschland-hilft.de/de/spenden/)** — Dünya çapında hızlı ve etkili afet yardımı sağlayan yardım kuruluşları birliği.
- **[Lebenshilfe Rems-Murr](https://www.lebenshilfe-rems-murr.de/)** — Rems-Murr bölgesindeki engelli bireyler için destek, eşlik ve katılım.
- **[Radio 7 Drachenkinder](https://www.radio7.de/aktionen/drachenkinder)** — Bölgedeki ağır hasta çocuklara yardım — terapileri, gezileri ve dilekleri finanse eder.

Bağışının %100'ü doğrudan kuruma gider. Ne tutarı ne de verilerini biz görürüz.
