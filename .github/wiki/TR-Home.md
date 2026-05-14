🌐 **Language / Sprache / Langue / Idioma / Dil / Γλώσσα**

| | |
|---|---|
| 🇬🇧 **[English](Home)** | English version |
| 🇩🇪 **[Deutsch](DE-Home)** | Deutsche Version |
| 🇫🇷 **[Français](FR-Home)** | Version française |
| 🇪🇸 **[Español](ES-Home)** | Versión en español |
| 🇹🇷 **[Türkçe](TR-Home)** | Buradasınız |
| 🇬🇷 **[Ελληνικά](EL-Home)** | Ελληνική έκδοση |

---

> ℹ️ **Dil notu:** Bu wikinin alt sayfaları **[İngilizce](Home)** ve **[Almanca](DE-Home)** olarak mevcuttur. Ana sayfa Türkçe olarak çevrilmiştir; detay sayfaları İngilizce olarak açılır.

# Tesla Carview Wiki'ye Hoş Geldiniz

**Tesla Carview**, Tesla araçları için kendi sunucunuzda barındırabileceğiniz bir veri kaydedici ve kontrol uygulamasıdır. Verileriniz kendi sunucunuzda kalır — bulut yok, üçüncü taraf erişimi yok.

---

## ⚖️ Lisans — önce okuyun

Tesla Carview yalnızca **ticari olmayan, özel kullanım** için lisanslanmıştır.

Yapabilecekleriniz:
- ✅ Kişisel kullanım için kendi örneğinizi çalıştırmak
- ✅ Kendi özel kurulumunuz için kodu değiştirmek
- ✅ Projeyi başkalarıyla paylaşmak (kaynak belirterek)

**Yapamayacaklarınız:**
- ❌ Tesla Carview'ı başkaları için ücretli hizmet olarak işletmek
- ❌ Ticari amaçlarla kullanmak (müşteri projeleri, SaaS, ücretli filo yönetimi)
- ❌ Telif hakkı bildirimlerini veya atıfları kaldırmak

Lisans ayrıntılarının tamamı: [Lisans ve Kullanım Hakları](License-and-Usage)

---

## 🗺️ Nereden başlamalısınız?

### Yeniyim — nereden başlamalıyım?

→ **[Kurulum Kılavuzu](Installation)** — 30 dakikada adım adım kurulum

### Tesla Carview çalışıyor ancak dışarıdan erişemiyorum

→ **[Ağ Erişimi](Network-Access)** — DynDNS, Cloudflare Tunnel, FritzBox, VPS

### Raspberry Pi SD kartım sürekli bozuluyor

→ **[Raspberry Pi Depolama](Raspberry-Pi-Storage)** — USB SSD, NVMe, PXE önyükleme

### Tesla hesabımı bağlamak istiyorum

→ **[Tesla API Kurulumu](Tesla-API-Setup)** — Geliştirici hesabı, tokenlar, Virtual Key

### Tüm özellikleri anlamak istiyorum

→ **[Özellikler Genel Bakış](Features)** — Gösterge paneli, seyahatler, şarj, kontroller ve daha fazlası

### Birden fazla kullanıcım var veya aile için kurmak istiyorum

→ **[Çok Kiracılı & Kullanıcılar](Multi-Tenant)** — Kiracılar, kullanıcı davetleri, izinler

### Bir şeyler çalışmıyor

→ **[Sorun Giderme](Troubleshooting)** — Yaygın sorunlar ve çözümler

---

## 🔑 Bir bakışta

| Özellik | Ayrıntılar |
|---|---|
| **Platform** | Linux sunucu, Raspberry Pi, VPS |
| **Depolama** | SQLite (kiracı başına, harici veritabanı gerekmez) |
| **Kimlik Doğrulama** | Kullanıcı adı/şifre, Passkeys, MFA (TOTP) |
| **API** | Tesla Fleet API (resmi), komutlar için Virtual Key |
| **Diller** | DE, EN, FR, ES, TR, EL |
| **Lisans** | Ticari olmayan özel kullanım |

---

## 📂 BT uzmanları için

Bu wiki rehberli giriş noktasıdır. Tüm teknik ayrıntılarla ham Markdown okumayı tercih ediyorsanız her şey depoda mevcuttur:

| Kaynak | Bağlantı |
|---|---|
| Teknik belge dizini | [docs/README.en.md](https://github.com/KnevS/Tesla-Carview/blob/main/docs/README.en.md) |
| Tüm ortam değişkenleri | [docs/10-configuration.en.md](https://github.com/KnevS/Tesla-Carview/blob/main/docs/10-configuration.en.md) |
| Güvenlik mimarisi | [docs/05-security-architecture.en.md](https://github.com/KnevS/Tesla-Carview/blob/main/docs/05-security-architecture.en.md) |
| Yedekleme & işlemler | [docs/11-operations.en.md](https://github.com/KnevS/Tesla-Carview/blob/main/docs/11-operations.en.md) |

---

*Bu wiki depodan otomatik olarak oluşturulmaktadır. Son güncelleme: [commits](https://github.com/KnevS/Tesla-Carview/commits/main) sayfasına bakın.*
