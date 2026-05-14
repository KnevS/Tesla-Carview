🌐 **Dil:** [EN](Multi-Tenant) · [DE](DE-Multi-Tenant) · [FR](FR-Multi-Tenant) · [ES](ES-Multi-Tenant) · **TR** · [EL](EL-Multi-Tenant)

---

# Çok Kiracılı ve Kullanıcılar

Tesla Carview, tek bir sunucuda birden fazla izole hesabı ("kiracı") destekler — aileler için veya ticari olmayan lisans kapsamında yakın arkadaşlara hizmet sunmak isteyenler için mükemmel.

---

## Kiracıları anlamak

Kiracıları aynı binadaki ayrı daireler gibi düşün:
- Her kiracının kendi **kullanıcıları**, **araçları** ve **verileri** var
- Kiracılar birbirinin verilerini göremez
- Tek sunucu, birden fazla izole ortam

**Ne zaman birden fazla kiracıya ihtiyaç duyarsın?**
- Ayrı veri isteyen iki Tesla sahibi olan aile
- Sen ve bir arkadaşın sunucu paylaşıyorsunuz
- Üretim verilerini etkilemeden ikinci bir yapılandırmayı test etme

**Ne zaman tek kiracı yeterli?**
- Sen ve partnerin tek bir Tesla paylaşıyorsunuz
- Birden fazla Tesla'n var ama tüm verileri tek bir yerde istiyorsun
- Bireysel kullanım

---

## Ana veritabanı ve kiracı veritabanları

Tesla Carview iki tür veritabanı kullanır:

| Veritabanı | Konum | İçeriği |
|---|---|---|
| `master.db` | `/app/data/master.db` | Kiracı listesi, kullanıcı tokenları, OAuth durumu |
| `{tenant-uuid}.db` | `/app/data/tenants/` | Bir kiracının tüm araç ve kullanıcı verileri |

Her kiracının verileri dosya düzeyinde tamamen izole edilmiştir.

---

## Yeni kiracı oluşturma

### Seçenek 1: Kendi kendine kayıt (etkinleştirilmişse)

Kullanıcılar `https://tesla.alaninadın.com/register` adresinden kendi kiracılarını kaydedebilir:
1. Kiracı adı, slug (kısa URL uyumlu tanımlayıcı), admin kullanıcı adı ve şifresi gir
2. Koşulları kabul et
3. Bitti — yeni bir izole kiracı oluşturulur

**Davet kodlarıyla kendi kendine kaydı kısıtla:**
`.env`'de:
```env
REGISTRATION_REQUIRES_INVITE=true
```
Sonra **Admin → Davetler → Davet Kodu Oluştur**'da davet kodları oluştur ve bağlantıyı paylaş.

### Seçenek 2: Admin aracılığıyla (kendi kendine kayıt olmadan)

Kendi kendine kayıt devre dışıysa, sen (admin olarak) API üzerinden veya kaydı geçici olarak etkinleştirerek doğrudan kiracı oluşturursun.

---

## Kiracı içindeki kullanıcıları yönetme

### Kullanıcı rolleri

| Rol | Yapabilecekleri |
|---|---|
| **Admin** | Her şey — araçlar, kullanıcılar, ayarlar, veri yönetimi |
| **Kullanıcı** | Atanan araçların verilerini görüntüleme, seyahat defteri girdisi oluşturma |

Adminler temel rolün ötesinde kullanıcı başına izinler belirler:

| İzin | Kullanıcılar için varsayılan |
|---|---|
| Araçları düzenleyebilir | Hayır |
| Araç ekleyebilir | Hayır |
| MFA gerekli | Evet (yapılandırılabilir) |

### Kullanıcı davet etme

Admin olarak kiracına başkalarını davet et:
1. **Admin → Kullanıcılar → Kullanıcı Davet Et**
2. E-postalarını gir (veya e-posta olmadan sadece link oluştur)
3. Başlangıç izinlerini ayarla
4. Linke tıklarlar ve şifrelerini belirlerler

### Kullanıcılara araç atama

Bir kullanıcı yalnızca kendisine atanan araçları görebilir:
1. **Admin → Kullanıcılar** → bir kullanıcıya tıkla
2. "Araçlar" altında → görebilecekleri araçları ata
3. Değişiklikler hemen geçerli olur (oturum kapatmaya gerek yok)

---

## Kiracı takma adları

Gizlilik için kiracılar giriş sayfasında gerçek kiracı adı yerine bir **takma ad** ile tanımlanır (ör. "brave-eagle"). Bu, giriş sayfasının bu sunucuyu kimin çalıştırdığını ele vermesini önler.

Takma adı değiştirebilirsin:
- **Admin → Ayarlar → Kiracı → Takma Adı Değiştir**

---

## Kiracıyı silme

Kiracı silme yıkıcı bir işlemdir ve onay gerektirir:
1. **Admin → Data → Kiracıyı Sil**
2. Onay ifadesini yaz
3. Silmeden önce otomatik olarak yedekleme yapılır

---

## Kiracı durumu

Kiracılar silmeden askıya alınabilir:
- **Admin → Kiracılar → Askıya Al**
- Askıya alınan kiracılar giriş yapamaz
- Veriler korunur

---

## Teknik sınırlar (tek sunucu)

| Kaynak | Pratik limit |
|---|---|
| Kiracı sayısı | Sabit sınır yok (SQLite iyi ölçeklenir) |
| Kiracı başına araç | Sabit sınır yok |
| Kiracı başına kullanıcı | Sabit sınır yok |
| Kiracı başına veritabanı boyutu | 3 yıllık veriler için ~50 MB (tipik) |

Tesla Carview büyük ölçekli çok kiracılı SaaS kullanımı için tasarlanmamıştır — özel/aile kullanımı içindir. İzin verilen hususlar için [Lisans ve Kullanım Hakları](TR-License-and-Usage)'na bak.
