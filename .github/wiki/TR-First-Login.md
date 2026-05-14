# İlk Giriş ve Kiracı Kurulumu

Kurulumun ardından bu sayfa, Tesla Carview'u ilk kez açtığınızda yapmanız gerekenleri adım adım anlatır.

---

🌐 **Language / Sprache / Langue / Idioma / Dil / Γλώσσα**

| | |
|---|---|
| 🇬🇧 **[English](First-Login)** | English version |
| 🇩🇪 **[Deutsch](DE-First-Login)** | Deutsche Version |
| 🇫🇷 **[Français](FR-First-Login)** | Version française |
| 🇪🇸 **[Español](ES-First-Login)** | Versión en español |
| 🇹🇷 **[Türkçe](TR-First-Login)** | Buradasınız |
| 🇬🇷 **[Ελληνικά](EL-First-Login)** | Ελληνική έκδοση |

---

## "Kiracı" nedir?

Tesla Carview, tek bir sunucuda birden fazla izole hesabı destekler — bunlara **kiracı** (tenant) denir. Her kiracının:
- Kendi kullanıcıları ve araçları vardır
- Kendi veritabanı vardır (veriler tamamen ayrıdır)
- Kendi ayarları ve yasal içerikleri vardır

**Tek kullanıcılı kurulumda:** Kurulum sırasında oluşturulan bir kiracınız vardır. Kiracılar hakkında hiç düşünmenize gerek yok — giriş sayfası otomatik olarak halleder.

**Aile / küçük grup için:** Her kişi aynı kiracı altında kendi hesabına sahip olabilir. Ya da tam izolasyon için ayrı kiracılar oluşturabilirsiniz.

---

## İlk kez giriş yapma

1. Tarayıcınızda `https://tesla.yourdomain.com` adresini açın
2. Giriş sayfasını göreceksiniz

   Sunucunuzda yalnızca **bir kiracı** varsa, kiracı alanı otomatik olarak gizlenir — sadece kullanıcı adınızı ve şifrenizi girin.

   **Birden fazla kiracı** varsa, hangi kiracıya giriş yapacağınızı seçmek için bir açılır menü belirir.

3. Kurulum sırasında belirlediğiniz yönetici kullanıcı adı ve şifreni girin
4. **"Oturumu açık tut (90 gün)"** seçeneğini işaretleyin — özellikle Tesla tarayıcısı için şiddetle önerilir

5. **Giriş Yap** düğmesine tıklayın

---

## Kurulum sihirbazı

Tesla hesabını ilk kez bağlıyorsanız, bir kurulum sihirbazı sizi şu adımlardan geçirir:

1. **Tesla Hesabını Bağla** → [Tesla API Kurulumu](Tesla-API-Setup) sayfasına bakın
2. **Araç Seç** → Hangi aracı takip etmek istediğinizi seçin
3. **Yasal içerik** → Künye/gizlilik bildirimini yapılandırın (kamuya açıksa zorunlu)
4. **Tamamlandı!** → Panoya yönlendirilirsiniz

---

## Diğer kullanıcıları davet etme

Yönetici olarak, kiracınıza başkalarını (aile üyeleri, partner) davet edebilirsiniz:

1. **Yönetici → Kullanıcılar → Kullanıcı Davet Et** bölümüne gidin
2. E-posta adreslerini veya kullanıcı adlarını girin
3. Kendi şifrelerini oluşturmak için bir bağlantı alırlar
4. Hangi araçları görebileceklerini ve hangi işlemleri yapabileceklerini ayarlayabilirsiniz

Tüm ayrıntılar için [Çok Kiracılı & Kullanıcılar](Multi-Tenant) sayfasına bakın.

---

## Tesla Carview'u Tesla tarayıcısından kullanma

Tesla dokunmatik ekranında yerleşik bir tarayıcı bulunur. Tesla Carview'u doğrudan araçtan kullanabilirsiniz:

1. Tesla dokunmatik ekranındaki tarayıcıyı açın
2. `https://tesla.yourdomain.com` adresine gidin
3. Kullanıcı adı ve şifrenizle giriş yapın ("Oturumu açık tut" seçeneğini 90 gün için işaretleyin)
4. Hızlı erişim için yer imi ekleyin veya ana ekrana ekleyin

> 💡 **İpucu:** Tesla tarayıcısı geçiş anahtarlarını (parmak izi/yüz girişi) desteklemez. Kullanıcı adı + şifre kullanın ve "Oturumu açık tut" seçeneğini işaretleyin; böylece yalnızca bir kez giriş yapmanız yeterli olur.

---

## Şifrenizi değiştirme

1. **Ayarlar → Hesap** bölümüne gidin
2. **Şifre Değiştir** düğmesine tıklayın
3. Mevcut şifrenizi ve yeni şifrenizi girin (en az 12 karakter)

---

## İki faktörlü kimlik doğrulamayı (MFA) ayarlama

Güvenlik için bir doğrulayıcı uygulama (Google Authenticator, Authy, Bitwarden) ile MFA kurun:

1. **Ayarlar → Güvenlik** bölümüne gidin
2. **İki Faktörlü Kimlik Doğrulamayı Kur** düğmesine tıklayın
3. QR kodunu doğrulayıcı uygulamanızla tarayın
4. Onaylamak için 6 haneli kodu girin

Kurulumdan sonra her girişte kod istenecektir (geçiş anahtarı kullanmadığınız sürece).

Tüm kimlik doğrulama seçenekleri için [Güvenlik](Security) sayfasına bakın.
