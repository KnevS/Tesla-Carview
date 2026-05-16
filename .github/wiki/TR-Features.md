# Özellikler Genel Bakışı

🌐 **Language / Sprache**

| | |
|---|---|
| 🇬🇧 **[English](Features)** | English version |
| 🇩🇪 **[Deutsch](DE-Features)** | Deutsche Version |
| 🇫🇷 **[Français](FR-Features)** | Version française |
| 🇪🇸 **[Español](ES-Features)** | Versión en español |
| 🇹🇷 **[Türkçe](TR-Features)** | Buradasınız |
| 🇬🇷 **[Ελληνικά](EL-Features)** | Ελληνική έκδοση |

---

Tesla Carview, Tesla'nızın tüm yaşam döngüsünü kapsar — her sürüşün takibinden araç kontrolüne, rota planlamasına ve şarj maliyeti yönetimine kadar. Her şey kendi sunucunuzda çalışır.

---

## Tesla Carview ne sunar?

| Modül | Özet |
|---|---|
| 📊 Gösterge Paneli | Canlı durum, istatistikler, tarife widget'ı, sistem sağlığı |
| 🚗 Seyahat Günlüğü | Otomatik kaydedilen sürüşler, uyumlu PDF dışa aktarma |
| ⚡ Şarj | Oturumlar, konumlar, Monta senkronizasyonu, maliyet faturaları |
| 🔋 Batarya | Sağlık, bozulma, menzil geçmişi |
| 🗺️ Rota Planlayıcı | OSRM yönlendirme, şarjör katmanı, Tesla'ya gönder |
| 🎮 Araç Kontrolü | İklim, kilitler, şarj, OTA, programlı şarj |
| 📝 Bakım Defteri | Kayıtlar, aralıklar, push hatırlatıcılar |
| 💬 Grok Chat | Araç bağlamıyla xAI destekli yapay zeka asistanı |
| 📤 Dışa Aktarma | CSV, JSON, PDF faturaları, tam yedek |
| 🔐 Güvenlik | Passkey'ler, MFA (TOTP), Tesla tarayıcısı için QR-SSO |
| 🌍 Çok Dilli | DE · EN · FR · ES · TR · EL |
| 📱 PWA | Ana ekrana kurulabilir, çevrimdışı kabuk |

---

## 📊 Gösterge Paneli

- **Canlı araç durumu** — batarya seviyesi, menzil, konum, şarj durumu
- **Son sürüşler** — mesafe ve tüketimle son 5 sürüş
- **Aylık istatistikler** — kilometre, enerji, şarj maliyetleri
- **Dinamik tarife widget'ı** — güncel fiyat (aWATTar DE/AT, Tibber), 24 saatlik grafik, otomatik şarj penceresi
- **Bakım aralıkları** — muayene, yağ, fren sıvısı vb. hatırlatıcılar
- **Sistem sağlığı** — Tesla API durumu, Fleet Telemetry, veritabanı boyutu

**Ayarlar → Sihirbazı Başlat** üzerinden tamamen özelleştirilebilir.

---

## 🚗 Sürüşler (Seyahat Günlüğü)

Her sürüş otomatik olarak kaydedilir:
- Başlangıç ve bitiş konumu, mesafe, süre, ortalama hız
- Enerji tüketimi (kWh ve kWh/100 km)
- Başlangıç/bitiş batarya seviyesi
- Seyahat tipi (özel / işe gidiş / iş)

### BMF uyumlu seyahat günlüğü
- İş ortağı ve seyahat amacı alanları
- Sıralı numaralandırma ve kilit işlevi
- **PDF dışa aktarma** — A4 yatay format, tüm zorunlu alanlar
- Sürüş birleştirme, bölme ve manuel giriş

---

## ⚡ Şarj

Tüm şarj oturumları otomatik kayıt:
- Konum, enerji (kWh), maliyet, hız ve süre
- Ev şarjı göstergesi (🏠) Monta entegrasyonu ile

**Ayarlar → Şarj Konumları** altında sık kullanılan noktalar tanımlanabilir.  
Monta API anahtarıyla oturumlar otomatik senkronize edilir.  
Geri ödeme için PDF fatura (**Faturalama → Fatura Oluştur**) — tamamen istemci tarafında.

---

## 🗺️ Rota Planlayıcı

Sürüşlerinizi önceden planlayın ve doğrudan Tesla navigasyonuna gönderin:
- **Başlangıç noktası** — araç GPS'i, tarayıcı GPS'i veya manuel giriş
- **Hedef arama** — backend proxy aracılığıyla Nominatim coğrafi kodlama
- **5'e kadar ara nokta**
- **OSRM yönlendirme** — hesap gerektirmeyen açık kaynak motor
- **Tahmini varış SoC** — gerçek tüketiminize dayalı
- **Şarjör katmanı** — hızlı şarj istasyonları (CCS, CHAdeMO, Tesla) OpenChargeMap üzerinden
- **Tesla'ya gönder** — bir dokunuşla araç navigasyonuna gönder
- **Rota kaydetme** — sık kullanılan rotalar için hızlı erişim
- **ABRP yedeği** — A Better Route Planner'a isteğe bağlı bağlantı

---

## 🎮 Araç Kontrolü

- 🌡️ İklim, sıcaklık, koltuk/direksiyon ısıtma, Camp/Dog/Keep modları
- 🔓 Kilitler, 💡 Işıklar, 🚪 Bagaj/frunk, 🪟 Camlar
- 🔌 Şarj kapağı, amper, başlat/durdur
- ⏰ Programlı şarj, 🔄 OTA güncellemeleri, 🎵 Boombox

---

## 📝 Bakım Defteri

Tüm bakım olaylarını belgeleyin: tarih, kategori, maliyet, kilometre, servis adı.

**Ayarlar → Bakım Aralıkları** altında tekrarlayan aralıklar yapılandırın. Her vadeden 30 gün ve 1 000 km önce push bildirimleri gönderilir.

---

## 💬 Grok Chat (Yapay Zeka Asistanı)

xAI Grok ile doğal dilde Tesla verileriniz hakkında soru sorun:
- Son sürüşler, şarj oturumları ve araç verileri bağlamsal olarak görülür
- Yanıtlar kelime kelime akış şeklinde görünür
- Sohbet geçmişi kaydedilir ve aranabilir
- Günlük token bütçesi yapılandırılabilir
- İstekler backend üzerinden — tarayıcıdan xAI'ye doğrudan hiçbir zaman değil

> `XAI_API_KEY` ortam değişkeni gereklidir. [console.x.ai](https://console.x.ai) adresinden edinin.

---

## 🔐 Güvenlik & Kimlik Doğrulama

### Passkey'ler (WebAuthn)
Face ID, Touch ID veya donanım anahtarıyla giriş yapın.

### MFA (TOTP)
Herhangi bir doğrulayıcı uygulamayla iki faktörlü kimlik doğrulama.

### Tesla tarayıcısı için QR-SSO
1. Tesla tarayıcısı QR kod gösterir (5 dakika geçerli)
2. Telefonunuzla tarayın
3. Telefon passkey/Face ID ile kimlik doğrulaması yapın
4. Tesla tarayıcı oturumu otomatik açılır

---

## 🧙 Kurulum Sihirbazı

**Ayarlar → Sihirbazı Başlat** üzerinden yeniden başlatılabilir.

**Yönetici adımları (ilk kurulum):** dil → Tesla OAuth → araçlar → Virtual Key → Fleet Telemetry → elektrik fiyatı → yasal içerik → harici API'ler → izleme (SMTP + Anthropic) → tasarım → renk → birimler → gösterge paneli → gezinme → bildirimler → özet

Yönetici olmayan kullanıcılar yalnızca tasarım, birimler, gösterge paneli, gezinme, bildirimler ve özet adımlarını görür.

---

## 🌡️ Dinamik Tarife (aWATTar / Tibber)

- Güncel fiyat ve 24 saatlik grafik gösterge panelinde
- **Otomatik şarj penceresi** — bir tıkla en ucuz 4 saatlik dilime programlı şarj ayarlanır

---

## 📱 PWA

Ana ekranınıza yükleyin:
- **Android/Chrome:** adres çubuğundaki kurulum simgesi
- **iOS Safari:** Paylaş → "Ana Ekrana Ekle"
- **Tesla tarayıcısı:** Menü → "Ana Ekrana Ekle"

---

## 📤 Dışa Aktarma & Yedekleme

- Sürüşler, şarj oturumları, bakım defteri — CSV veya JSON
- **Tam yedek** — JSON, **Admin → Veri Yönetimi** üzerinden geri yüklenebilir
