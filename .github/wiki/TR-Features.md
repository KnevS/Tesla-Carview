🌐 **Dil:** [EN](Features) · [DE](DE-Features) · [FR](FR-Features) · [ES](ES-Features) · **TR** · [EL](EL-Features)

---

# Özellik Genel Bakışı

Tesla Carview, Tesla'nın tüm yaşam döngüsünü kapsar — her seyahati kaydetmekten arabayı kontrol etmeye ve şarj maliyetlerini yönetmeye kadar.

---

## 📊 Panel

Panel, merkezi genel bakışındır ve şunları gösterir:
- **Canlı araç durumu** — batarya seviyesi, menzil, konum, şarj durumu
- **Son seyahatler** — mesafe ve tüketimle birlikte son 5 seyahat
- **Aylık istatistikler** — mesafe, kullanılan enerji, şarj maliyeti
- **Dinamik tarife widget'ı** — mevcut elektrik fiyatı (aWATTar DE/AT, Tibber)
- **Servis aralıkları** — yaklaşan bakım hatırlatıcıları (muayene, yağ, fren hidroliği vb.)
- **Sistem sağlığı** — Tesla API bağlantı durumu, Fleet Telemetry, veritabanı boyutu

Panel sekmesi açıkken her 60 saniyede bir otomatik olarak yenilenir.

---

## 🚗 Seyahatler (Seyahat Defteri)

Her sürüş otomatik olarak kaydedilir:
- Başlangıç ve bitiş konumu (adres + GPS koordinatları)
- Mesafe, süre, ortalama hız
- Enerji tüketimi (kWh ve kWh/100 km)
- Başlangıç/bitişte batarya seviyesi
- Seyahat türü sınıflandırması (özel / işe gidiş / iş)

### Seyahat defteri
Seyahat defteri yasal gereksinimleri karşılar:
- İş ortağı ve seyahat amacı alanları
- Sıralı seyahat numaralandırması
- Defteri sonlandırmak için "Kilitle" işlevi
- Tüm yasal olarak gerekli alanlarla A4 yatay formatta **PDF dışa aktarma**
- Çok duraklı yolculuklar için seyahat birleştirme ve bölme
- Unutulan girişler için manuel seyahat oluşturma

### GPS konumunu düzenleme
Bir seyahatin eksik veya yanlış adresi varsa doğrudan düzenleyebilirsin:
- Herhangi bir seyahate tıkla → Konumu düzenle
- Adresi manuel gir veya bir harita pimi sürükle

---

## ⚡ Şarj

Tüm şarj oturumları otomatik olarak kaydedilir:
- Konum (kayıtlı şarj konumlarıyla GPS eşleştirmesi)
- Eklenen enerji (kWh) ve tahmini maliyet
- Şarj hızı ve süresi
- Monta entegrasyonu aracılığıyla ev şarj bayrağı (🏠)

### Şarj konumları
Evini ve düzenli şarj noktalarını tanımla:
- **Ayarlar → Şarj Konumları** → Adres + GPS + yarıçapla ekle
- O konumdaki oturumlar otomatik olarak etiketlenir
- Maliyet hesaplama için konum başına kWh başına oran ayarla

### Monta entegrasyonu
Ev şarjı için Monta kullanıyorsan:
- Ayarlara Monta API anahtarını gir
- Monta oturumları doğru kWh ve maliyet verileriyle otomatik senkronize edilir
- Ev şarj bayrağı otomatik olarak ayarlanır

### Maliyet hesaplama ve PDF fatura
Geri ödeme için PDF fatura oluştur (ör. işveren için):
- **Faturalandırma → Fatura Oluştur**
- Tarih aralığı seç ve belirli oturumları dahil/hariç tut
- Antetli, tablolu, toplamlar ve imza alanı içeren PDF
- Tamamen istemci tarafında oluşturulur — sunucundan hiçbir veri çıkmaz

---

## 🔋 Batarya

Batarya sağlığını zaman içinde takip et:
- Bozulma eğrisi (tahmini menzile karşı nominal menzil)
- Şarj döngüsü sayacı
- Geçmiş şarj seviyesi verileri
- Farklı sıcaklıklarda menzil (kış ile yaz karşılaştırması)

---

## 🎮 Araç Kontrolü

Tesla'nı doğrudan uygulamadan kontrol et:
- 🌡️ **İklim** — başlat/durdur, sıcaklık ayarla, koltuk ısıtma, direksiyon ısıtma
- 🔓 **Kilitler** — kapıları kilitle/kilidi aç
- 💡 **Işıklar** — flaş yak, korna
- 🚪 **Bagaj/frunk** — bagaj ve frunk'ı aç
- 🔌 **Şarj** — şarj portunu aç/kapat, amper ayarla, başlat/durdur
- 🔄 **Yazılım güncellemeleri** — OTA güncellemelerini tetikle ve izle
- ⏰ **Planlanmış şarj** — düşük tarife şarj pencerelerini ayarla
- 🎵 **Uzaktan boombox** — boombox seslerini tetikle (desteklendiği yerde)
- 🌬️ **İklim modu** — kamp/köpek/tutma modunu ayarla
- 🪟 **Camlar** — camları aç/kapat

> Komutlar **Virtual Key**'in eşleştirilmesini gerektirir. Bkz. [Tesla API Kurulumu](TR-Tesla-API-Setup#adım-3-virtual-keyi-kur-komutlar-için).

---

## 📝 Servis Defteri

Tüm bakım olaylarını kaydet:
- Tarih, kategori (bakım / onarım / lastik / muayene / not)
- Maliyet, kilometre
- Açıklama ve ekler
- Kimin yaptığı (atölye adı)

### Servis aralıkları ve hatırlatıcılar
Tekrarlayan bakım hatırlatıcıları kur:
- **Ayarlar → Servis Aralıkları** → Aralık ekle (ör. "2 yıl içinde muayene", "Her 2 yılda fren hidroliği")
- Her aralıktan 30 gün önce ve 1000 km önce anlık bildirimler
- Panel yaklaşan servisleri önizleme kartı olarak gösterir

---

## 📤 Dışa Aktarma

Tüm verilerini dışa aktar:
- **Seyahatler** — CSV veya JSON
- **Şarj oturumları** — CSV veya JSON
- **Servis defteri** — CSV
- **Tam yedekleme** — JSON (tüm tablolar), geri yükleme için içe aktarılabilir

---

## 🔔 Anlık Bildirimler

Şu durumlarda tarayıcında bildirim al:
- Şarj tamamlandı
- Servis aralığı yaklaşıyor
- Yazılım güncellemesi mevcut

Bildirimler masaüstü (Chrome, Firefox, Edge) ve mobilde (Android Chrome, iOS Safari ana ekran kısayoluyla) çalışır.

**Kurulum:** Ayarlar → Anlık Bildirimler → Bildirimleri etkinleştir

---

## 📱 PWA (Progresif Web Uygulaması)

Tesla Carview PWA olarak çalışır — ana ekranına yükleyebilirsin:

- **Android/Masaüstü Chrome:** Adres çubuğundaki yükleme simgesine dokun
- **iOS Safari:** Paylaş → "Ana Ekrana Ekle"
- **Tesla tarayıcısı:** Menü → "Ana ekrana ekle"

Yüklü PWA önbellekteki sayfalar için çevrimdışı çalışır ve yerel bir uygulama gibi bildirim alır.

---

## 🌡️ Dinamik Tarife (aWATTar / Tibber)

Dinamik elektrik tarifen varsa:
- aWATTar'ı bağla (DE/AT, API anahtarı gerekmez) veya Tibber (Ayarlarda API anahtarı)
- Panel mevcut fiyatı ve 24 saatlik fiyat grafiğini gösterir
- **Şarj penceresini otomatik ayarla** — tek tıkla planlanmış şarjı sonraki 24 saatteki en ucuz 4 saatlik pencereye ayarlar

---

## 🌍 Çok Dilli

Uygulama tamamen şu dillere çevrilmiştir:
🇩🇪 Almanca · 🇬🇧 İngilizce · 🇫🇷 Fransızca · 🇪🇸 İspanyolca · 🇹🇷 Türkçe · 🇬🇷 Yunanca

Dil şöyle belirlenir:
1. Kullanıcı profil ayarın (her şeyin önünde gelir)
2. Kiracının varsayılan dili
3. Tarayıcı dilin

---

## 🧪 Demo Modu

Başkalarının gerçek bir Tesla olmadan uygulamayı denemesi için isteğe bağlı olarak demo modu etkinleştir:
- `.env`'de `DEMO_ENABLED=true`
- Sahte seyahatler ve şarj geçmişi otomatik olarak oluşturulur
- Demo hesapları 14 gün sonra sona erer
- IP tabanlı hız sınırlama kötüye kullanımı önler

---

## 🌙 Bakım Modu

Uygulama, backend erişilemez olduğunda (güncellemelerden sonra yeniden başlarken) otomatik olarak bir "bakım" bindirmesi gösterir. Almanca/İngilizce Tesla alıntıları, geri sayım sayacı gösterir ve her 3 saniyede bir backend'i sorgular — geri döndüğünde kaybolur.
