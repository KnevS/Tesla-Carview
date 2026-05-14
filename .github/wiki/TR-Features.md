# Özellikler Genel Bakışı

Tesla Carview, Tesla'nızın tüm yaşam döngüsünü kapsar — her yolculuğu takip etmekten aracı kontrol etmeye ve şarj maliyetlerini yönetmeye kadar.

---

🌐 **Language / Sprache / Langue / Idioma / Dil / Γλώσσα**

| | |
|---|---|
| 🇬🇧 **[English](Features)** | English version |
| 🇩🇪 **[Deutsch](DE-Features)** | Deutsche Version |
| 🇫🇷 **[Français](FR-Features)** | Version française |
| 🇪🇸 **[Español](ES-Features)** | Versión en español |
| 🇹🇷 **[Türkçe](TR-Features)** | Buradasınız |
| 🇬🇷 **[Ελληνικά](EL-Features)** | Ελληνική έκδοση |

---

## 📊 Pano

Pano, merkezi genel bakış ekranınızdır ve şunları gösterir:
- **Canlı araç durumu** — pil seviyesi, menzil, konum, şarj durumu
- **Son yolculuklar** — mesafe ve tüketim ile birlikte son 5 yolculuk
- **Aylık istatistikler** — mesafe, kullanılan enerji, şarj maliyeti
- **Dinamik tarife widget'ı** — anlık elektrik fiyatı (aWATTar DE/AT, Tibber)
- **Servis aralıkları** — yaklaşan bakım hatırlatmaları (TÜV, yağ, fren hidroliği vb.)
- **Sistem sağlığı** — Tesla API bağlantı durumu, Fleet Telemetry, veritabanı boyutu

Pano, sekme açıkken her 60 saniyede bir otomatik olarak yenilenir.

---

## 🚗 Yolculuklar (Fahrtenbuch)

Her sürüş otomatik olarak şunlarla birlikte kaydedilir:
- Başlangıç ve bitiş konumu (adres + GPS koordinatları)
- Mesafe, süre, ortalama hız
- Enerji tüketimi (kWh ve kWh/100km)
- Başlangıç/bitişteki pil seviyesi
- Yolculuk türü sınıflandırması (özel / işe gidiş / iş)

### Seyahat defteri (BMF uyumlu)
Seyahat defteri, Alman vergi dairesi (Finanzamt/BMF) gereksinimlerini karşılar:
- İş ortağı ve yolculuk amacı alanları
- Sıralı yolculuk numaralandırması
- Defteri kesinleştirmek için "Kilitle" işlevi
- Tüm yasal olarak zorunlu alanlarla A4 yatay formatta **PDF dışa aktarma**
- Çok duraklı yolculuklar için yolculuk birleştirme ve bölme
- Unutulan kayıtlar için manuel yolculuk oluşturma

### GPS konumu düzenleme
Bir yolculukta eksik veya yanlış adres varsa doğrudan düzenleyebilirsiniz:
- Herhangi bir yolculuğa tıklayın → Konumu düzenle
- Adresi manuel olarak girin veya harita pinini sürükleyin

---

## ⚡ Şarj

Tüm şarj oturumları otomatik olarak kaydedilir:
- Konum (kaydedilmiş şarj konumlarıyla GPS eşleşmesi)
- Eklenen enerji (kWh) ve tahmini maliyet
- Şarj hızı ve süresi
- Monta entegrasyonu aracılığıyla ev şarjı bayrağı (🏠)

### Şarj konumları
Ev ve düzenli şarj noktalarınızı tanımlayın:
- **Ayarlar → Şarj Konumları** → Adres + GPS + yarıçap ile ekleyin
- O konumdaki oturumlar otomatik olarak etiketlenir
- Maliyet hesaplaması için her konum için kWh başına ücret belirleyin

### Monta entegrasyonu
Ev şarjı için Monta kullanıyorsanız:
- Monta API anahtarınızı Ayarlar'a girin
- Monta oturumları doğru kWh ve maliyet verileriyle otomatik olarak senkronize edilir
- Ev şarjı bayrağı otomatik olarak ayarlanır

### Maliyet hesaplaması ve PDF fatura
Geri ödeme için PDF fatura oluşturun (örn. işvereniniz için):
- **Faturalandırma → Fatura Oluştur**
- Tarih aralığını seçin ve belirli oturumları dahil edin/dışarıda bırakın
- Antetli kağıt, tablo, toplamlar ve imza alanı içeren PDF
- Tamamen istemci tarafında oluşturulur — verileriniz sunucunuzdan çıkmaz

---

## 🔋 Pil

Pil sağlığını zaman içinde takip edin:
- Degradasyon eğrisi (tahmini ve etiket menzili)
- Şarj döngüsü sayacı
- Geçmiş şarj seviyesi verileri
- Farklı sıcaklıklardaki menzil (kış - yaz karşılaştırması)

---

## 🎮 Araç Kontrolü

Tesla'nızı doğrudan uygulamadan kontrol edin:
- 🌡️ **İklim** — başlat/durdur, sıcaklık ayarla, koltuk ısıtma, direksiyon ısıtma
- 🔓 **Kilitler** — kapıları kilitle/aç
- 💡 **Işıklar** — ışıkları yak, korna çal
- 🚪 **Bagaj/frunk** — bagaj ve frunk'u aç
- 🔌 **Şarj** — şarj portunu aç/kapat, şarj amperi ayarla, başlat/durdur
- 🔄 **Yazılım güncellemeleri** — OTA güncellemelerini tetikle ve izle
- ⏰ **Zamanlı şarj** — gece saati şarj penceresi ayarla
- 🎵 **Uzaktan boombox** — boombox seslerini tetikle (desteklenen yerlerde)
- 🌬️ **İklim koruyucu** — kamp/köpek/sıcak tutma modunu ayarla
- 🪟 **Camlar** — camları aç/kapat

> Komutlar için **Sanal Anahtarın** eşleştirilmiş olması gerekir. Bkz. [Tesla API Kurulumu](Tesla-API-Setup#step-3-set-up-the-virtual-key-for-commands).

---

## 📝 Servis Defteri (Betriebsbuch)

Tüm bakım olaylarını kaydedin:
- Tarih, kategori (bakım / onarım / lastik / muayene / not)
- Maliyet, kilometre
- Açıklama ve ekler
- İşi yapan kişi (atölye adı)

### Servis aralıkları ve hatırlatmalar
Yinelenen bakım hatırlatmaları ayarlayın:
- **Ayarlar → Servis Aralıkları** → Aralık ekle (örn. "2 yıl içinde TÜV", "Her 2 yılda fren hidroliği")
- Her aralıktan 30 gün önce ve 1000 km önce anlık bildirimler
- Pano, yaklaşan servisleri önizleme kartı olarak gösterir

---

## 📤 Dışa Aktarma

Tüm verilerinizi dışa aktarın:
- **Yolculuklar** — CSV veya JSON
- **Şarj oturumları** — CSV veya JSON
- **Servis defteri** — CSV
- **Tam yedek** — JSON (tüm tablolar), geri yükleme için içe aktarılabilir

---

## 🔔 Anlık Bildirimler

Tarayıcınızda şu durumlarda bildirim alın:
- Şarj tamamlandı
- Bir servis aralığı yaklaşıyor
- Yazılım güncellemesi mevcut

Bildirimler masaüstünde (Chrome, Firefox, Edge) ve mobilde (Android Chrome, Ana Ekran kısayoluyla iOS Safari) çalışır.

**Kurulum:** Ayarlar → Anlık Bildirimler → Bildirimleri etkinleştir

---

## 📱 PWA (Aşamalı Web Uygulaması)

Tesla Carview bir PWA olarak çalışır — ana ekranınıza yükleyebilirsiniz:

- **Android/Masaüstü Chrome:** Adres çubuğundaki yükleme simgesine dokunun
- **iOS Safari:** Paylaş → "Ana Ekrana Ekle"ye dokunun
- **Tesla tarayıcısı:** Menüye dokunun → "Ana ekrana ekle"

Yüklü PWA, önbelleğe alınmış sayfalar için çevrimdışı çalışır ve yerel bir uygulama gibi bildirim alır.

---

## 🌡️ Dinamik Tarife (aWATTar / Tibber)

Dinamik bir elektrik tarifeye sahipseniz:
- aWATTar (DE/AT, API anahtarı gerekmez) veya Tibber (Ayarlar'da API anahtarı) bağlayın
- Pano, anlık fiyatı ve 24 saatlik fiyat grafiğini gösterir
- **Otomatik şarj penceresi ayarı** — tek tıklamayla zamanlı şarjı önümüzdeki 24 saatteki en ucuz 4 saatlik pencereye ayarlar

---

## 🌍 Çok Dilli

Uygulama tam olarak şu dillere çevrilmiştir:
🇩🇪 Almanca · 🇬🇧 İngilizce · 🇫🇷 Fransızca · 🇪🇸 İspanyolca · 🇹🇷 Türkçe · 🇬🇷 Yunanca

Dil şu sıraya göre belirlenir:
1. Kullanıcı profil ayarınız (her şeyin önüne geçer)
2. Kiracının varsayılan dili
3. Tarayıcı diliniz

---

## 🌙 Bakım Modu

Uygulama, arka uç erişilemez olduğunda (güncellemelerden sonra yeniden başlatılıyor) otomatik olarak bir "bakım" katmanı gösterir. Almanca/İngilizce Tesla alıntıları, geri sayım sayacı gösterir ve arka uç geri dönene kadar her 3 saniyede bir yoklar — ardından kaybolur.
