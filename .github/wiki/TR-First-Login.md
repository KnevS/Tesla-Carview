🌐 **Dil:** [EN](First-Login) · [DE](DE-First-Login) · [FR](FR-First-Login) · [ES](ES-First-Login) · **TR** · [EL](EL-First-Login)

---

# İlk Giriş ve Kiracı Kurulumu

Kurulumdan sonra bu sayfa Tesla Carview'i ilk açtığında seni yönlendirir.

---

## "Kiracı" nedir?

Tesla Carview tek bir sunucuda birden fazla izole hesabı destekler — bunlara **kiracı** denir. Her kiracının şunları vardır:
- Kendi kullanıcıları ve araçları
- Kendi veritabanı (veriler tamamen ayrıdır)
- Kendi ayarları ve yasal içeriği

**Tek kullanıcılı kurulum için:** Bir kiracın var (kurulum sırasında oluşturulur). Kiracılar hakkında hiç düşünmene gerek yok — giriş sayfası bunu otomatik olarak halleder.

**Aile / küçük grup için:** Her kişi aynı kiracı altında kendi hesabına sahip olabilir. Veya tam izolasyon için ayrı kiracılar oluşturabilirsin.

---

## İlk kez giriş yapma

1. Tarayıcında `https://tesla.alaninadın.com` adresini aç
2. Giriş sayfasını göreceksin

   Sunucunda yalnızca **bir kiracı** varsa, kiracı alanı otomatik olarak gizlenir — sadece kullanıcı adı ve şifrenizi gir.

   **Birden fazla kiracı** varsa, hangi kiracıya giriş yapacağını seçmek için bir açılır menü belirir.

3. Admin kullanıcı adı ve şifrenizi gir (kurulum sırasında ayarlanan)
4. **"Oturumumu açık tut (90 gün)"** işaretle — özellikle Tesla tarayıcısı için kesinlikle önerilir

5. **Giriş Yap**'a tıkla

---

## Kurulum sihirbazı

Tesla hesabını ilk kez bağlıyorsan, bir kurulum sihirbazı seni şu adımlardan geçirir:

1. **Tesla Hesabını Bağla** → [Tesla API Kurulumu](TR-Tesla-API-Setup)'na bak
2. **Araç Seç** → Hangi arabayı takip edeceğini seç
3. **Yasal içerik** → Imprint/gizlilik yapılandır (kamuya açık erişilebilirse gerekli)
4. **Bitti!** → Panele götürülürsün

---

## Diğer kullanıcıları davet etme

Admin olarak, kiracına başkalarını davet edebilirsin (aile üyeleri, partner):

1. **Admin → Kullanıcılar → Kullanıcı Davet Et**'e git
2. E-posta veya kullanıcı adlarını gir
3. Kendi şifrelerini oluşturmak için bir bağlantı alırlar
4. Hangi araçları görebileceklerini ve hangi işlemleri yapabileceklerini ayarlayabilirsin

Tüm detaylar için [Çok Kiracılı ve Kullanıcılar](TR-Multi-Tenant)'a bak.

---

## Tesla Carview'i Tesla tarayıcısından kullanma

Tesla dokunmatik ekranının yerleşik bir tarayıcısı vardır. Tesla Carview'i doğrudan araçtan kullanabilirsin:

1. Tesla dokunmatik ekranında tarayıcıyı aç
2. `https://tesla.alaninadın.com`'a git
3. Kullanıcı adı ve şifrenle giriş yap ("90 gün oturumumu açık tut"u işaretle)
4. Hızlı erişim için yer işareti ekle veya ana ekrana ekle

> 💡 **İpucu:** Tesla tarayıcısı passkey'leri (parmak izi/yüz girişi) desteklemiyor. Kullanıcı adı + şifre kullan ve "Oturumumu açık tut"u işaretle, böylece yalnızca bir kez giriş yapman gerekir.

---

## Şifreni değiştirme

1. **Ayarlar → Hesap**'a git
2. **Şifre Değiştir**'e tıkla
3. Mevcut şifreni ve yeni şifreyi gir (minimum 12 karakter)

---

## İki faktörlü kimlik doğrulama (MFA) kurma

Güvenlik için, bir kimlik doğrulama uygulamasıyla MFA kur (Google Authenticator, Authy, Bitwarden):

1. **Ayarlar → Güvenlik**'e git
2. **İki Faktörlü Kimlik Doğrulamayı Kur**'a tıkla
3. QR kodunu kimlik doğrulama uygulamanla tara
4. Onaylamak için 6 haneli kodu gir

Kurulumdan sonra, her girişte şifren + 6 haneli kod istenecektir (passkey kullanmadığın sürece).

Tüm kimlik doğrulama seçenekleri için [Güvenlik](TR-Security)'e bak.
