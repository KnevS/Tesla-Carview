# Çok Kiracılı & Kullanıcılar

Tesla Carview, tek bir sunucuda birden fazla izole hesabı ("kiracı") destekler — aileler için ya da ticari olmayan lisans kapsamında hizmeti yakın arkadaşlarınıza sunmak istiyorsanız idealdir.

---

🌐 **Language / Sprache / Langue / Idioma / Dil / Γλώσσα**

| | |
|---|---|
| 🇬🇧 **[English](Multi-Tenant)** | English version |
| 🇩🇪 **[Deutsch](DE-Multi-Tenant)** | Deutsche Version |
| 🇫🇷 **[Français](FR-Multi-Tenant)** | Version française |
| 🇪🇸 **[Español](ES-Multi-Tenant)** | Versión en español |
| 🇹🇷 **[Türkçe](TR-Multi-Tenant)** | Buradasınız |
| 🇬🇷 **[Ελληνικά](EL-Multi-Tenant)** | Ελληνική έκδοση |

---

## Kiracıları anlamak

Kiracıları aynı binadaki ayrı daireler gibi düşünün:
- Her kiracının kendi **kullanıcıları**, **araçları** ve **verileri** vardır
- Kiracılar birbirlerinin verilerini göremez
- Tek sunucu, birden fazla izole ortam

**Ne zaman birden fazla kiracıya ihtiyaç duyarsınız?**
- Ayrı veri isteyen iki Tesla sahibi olan bir aile
- Siz ve bir arkadaşınız bir sunucu paylaşıyorsunuz
- Üretim verilerine dokunmadan ikinci bir yapılandırmayı test etmek

**Ne zaman bir kiracı yeterlidir?**
- Siz ve partneriniz bir Tesla paylaşıyorsunuz
- Birden fazla Tesla'nız var ama tüm verileri tek bir yerde istiyorsunuz
- Tek başına kullanım

---

## Ana veritabanı ve kiracı veritabanları

Tesla Carview iki tür veritabanı kullanır:

| Veritabanı | Konum | İçerik |
|---|---|---|
| `master.db` | `/app/data/master.db` | Kiracı listesi, kullanıcı token'ları, OAuth durumu |
| `{tenant-uuid}.db` | `/app/data/tenants/` | Bir kiracının tüm araç & kullanıcı verileri |

Her kiracının verileri dosya düzeyinde tamamen izole edilmiştir.

---

## Yeni kiracı oluşturma

### Seçenek 1: Kendi kendine kayıt (etkinleştirilmişse)

Kullanıcılar `https://tesla.yourdomain.com/register` adresinden kendi kiracılarını kaydedebilir:
1. Kiracı adı, slug (kısa URL uyumlu tanımlayıcı), yönetici kullanıcı adı ve şifre girin
2. Koşulları kabul edin
3. Tamamlandı — yeni bir izole kiracı oluşturulur

**Kendi kendine kaydı davet kodlarıyla kısıtlama:**
`.env` dosyasında:
```env
REGISTRATION_REQUIRES_INVITE=true
```
Ardından **Yönetici → Davetler → Davet Kodu Oluştur** bölümünden davet kodları oluşturun ve bağlantıyı paylaşın.

### Seçenek 2: Yönetici aracılığıyla (kendi kendine kayıt gerekmez)

Kendi kendine kayıt devre dışıysa, siz (yönetici olarak) kiracıları doğrudan API aracılığıyla veya geçici olarak kaydı etkinleştirerek oluşturursunuz.

---

## Kiracı içindeki kullanıcıları yönetme

### Kullanıcı rolleri

| Rol | Yapabilecekleri |
|---|---|
| **Yönetici** | Her şey — araçlar, kullanıcılar, ayarlar, veri yönetimi |
| **Kullanıcı** | Atanan araçların verilerini görüntüleme, seyahat defteri girişleri oluşturma |

Yöneticiler temel rolün ötesinde kullanıcı başına izinler belirler:

| İzin | Kullanıcılar için varsayılan |
|---|---|
| Araçları düzenleyebilir | Hayır |
| Araç ekleyebilir | Hayır |
| MFA zorunlu | Evet (yapılandırılabilir) |

### Kullanıcı davet etme

Yönetici olarak kiracınıza başkalarını davet edin:
1. **Yönetici → Kullanıcılar → Kullanıcı Davet Et**
2. E-posta adreslerini girin (veya e-posta olmadan yalnızca bağlantı oluşturun)
3. Başlangıç izinlerini ayarlayın
4. Bağlantıya tıklayıp şifrelerini belirlerler

### Kullanıcılara araç atama

Bir kullanıcı yalnızca atandığı araçları görebilir:
1. **Yönetici → Kullanıcılar** → bir kullanıcıya tıklayın
2. "Araçlar" bölümünde → hangi araçları görebileceklerini atayın
3. Değişiklikler hemen geçerli olur (çıkış yapmaya gerek yok)

---

## Kiracı takma adları

Gizlilik için, kiracılar giriş sayfasında gerçek kiracı adıyla değil, bir **takma ad** (örn. "brave-eagle") ile tanımlanır. Bu, giriş sayfasının bu sunucuyu kimin çalıştırdığını açığa çıkarmasını önler.

Takma adı değiştirebilirsiniz:
- **Yönetici → Ayarlar → Kiracı → Takma Adı Değiştir**

---

## Kiracıyı silme

Kiracı silme geri alınamaz bir işlemdir ve onay gerektirir:
1. **Yönetici → Veri → Kiracıyı Sil**
2. Onay ifadesini yazın
3. Silmeden önce otomatik olarak bir yedek oluşturulur

---

## Kiracı durumu

Kiracılar silinmeden askıya alınabilir:
- **Yönetici → Kiracılar → Askıya Al**
- Askıya alınan kiracılar giriş yapamaz
- Veriler korunur

---

## Teknik sınırlar (tek sunucu)

| Kaynak | Pratik sınır |
|---|---|
| Kiracı sayısı | Sabit sınır yok (SQLite iyi ölçeklenir) |
| Kiracı başına araç | Sabit sınır yok |
| Kiracı başına kullanıcı | Sabit sınır yok |
| Kiracı başına veritabanı boyutu | 3 yıllık veri için ~50 MB (tipik) |

Tesla Carview, büyük ölçekli çok kiracılı SaaS kullanımı için tasarlanmamıştır — kişisel/aile kullanımı içindir. İzin verilenlere ilişkin ayrıntılar için [Lisans ve Kullanım](License-and-Usage) sayfasına bakın.
