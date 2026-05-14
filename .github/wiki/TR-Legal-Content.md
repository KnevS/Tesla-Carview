# Yasal İçerik (Künye, Gizlilik, Koşullar)

Tesla Carview kamuya açıksa (yalnızca yerel ağınızda değil), özellikle Alman/AB hukuku (DSGVO/GDPR) kapsamında künye (Impressum), gizlilik politikası ve kullanım koşulları sunmanız yasal olarak zorunlu olabilir.

---

🌐 **Language / Sprache / Langue / Idioma / Dil / Γλώσσα**

| | |
|---|---|
| 🇬🇧 **[English](Legal-Content)** | English version |
| 🇩🇪 **[Deutsch](DE-Legal-Content)** | Deutsche Version |
| 🇫🇷 **[Français](FR-Legal-Content)** | Version française |
| 🇪🇸 **[Español](ES-Legal-Content)** | Versión en español |
| 🇹🇷 **[Türkçe](TR-Legal-Content)** | Buradasınız |
| 🇬🇷 **[Ελληνικά](EL-Legal-Content)** | Ελληνική έκδοση |

---

## Bu benim için geçerli mi?

**Tesla Carview'u yalnızca yerel ağımda kullanıyorum (genel alan adı yok):**
→ Yasal gereklilik yok. Bu sayfayı atlayabilirsiniz.

**Genel alan adım var ve yalnızca ben kullanıyorum:**
→ Düşük risk, ancak Almanya/AB'deyseniz künye önerilir.

**Tesla Carview'u aile veya arkadaşlarımla kullanıyorum (ticari olmayan):**
→ Güvende olmak için künye ve gizlilik politikasını yapılandırmalısınız.

---

## Yasal içerik nerede yapılandırılır

1. **Yönetici** olarak giriş yapın
2. **Yönetici → Yasal İçerik** bölümüne gidin
3. Üç bölüm göreceksiniz: **Künye**, **Gizlilik Politikası**, **Kullanım Koşulları**

---

## Şablonları doldurma

Tesla Carview, `<<PLACEHOLDER>>` olarak işaretlenmiş yer tutucu alanlarıyla şablonlar sunar. Doldurmanız gerekenler:

| Yer tutucu | Ne gireceğiniz |
|---|---|
| `<<NAME>>` | Tam yasal adınız |
| `<<STREET>>` | Sokak ve bina numaranız |
| `<<CITY>>` | Şehir ve posta kodunuz |
| `<<COUNTRY>>` | Ülkeniz |
| `<<EMAIL>>` | Bir iletişim e-posta adresi |
| `<<PHONE>>` | Telefon numarası (Almanya'da zorunlu) |

> ⚠️ **Uygulama sizi uyaracaktır** herhangi bir `<<PLACEHOLDER>>` alanı doldurulmamışsa. Tüm yer tutucuları tamamlamadan kamuya açmayın.

---

## Sürümleme ve yayımlama

Yasal içerik sürümlüdür. Değişiklik yaptığınızda:
1. İçeriği düzenleyicide düzenleyin
2. **"Yeni sürümü yayımla"** düğmesine tıklayın
3. Önceki sürümü kabul etmiş kullanıcılardan bir sonraki girişlerinde yeni sürümü kabul etmeleri istenir

Bu, kimin hangi sürümü ne zaman kabul ettiğini gösteren bir denetim izi oluşturur.

---

## Çok dilli yasal içerik

Tesla Carview, yasal içeriği tek bir birincil dilde (Alman sunucuları için varsayılan olarak Almanca) yönetir ve diğer dillere aktarır. Almanca sürümü değiştirirseniz, diğer diller otomatik olarak güncellenir.

Özel çeviriler istiyorsanız, her dili ayrı ayrı düzenleyebilirsiniz.

---

## Gizlilik politikası için GDPR / DSGVO asgari gereksinimleri

AB'deyseniz gizlilik politikanızda şunları belirtmeniz gerekir:
- Hangi kişisel verileri topladığınız (kullanıcı adı, e-posta, araç verileri, konum)
- Neden topladığınız (kişisel kullanım, özel kayıt)
- Ne kadar süre sakladığınız (hesap silinene kadar veya X yıl)
- Kimin erişimi olduğu (yalnızca siz yönetici olarak)
- Kullanıcı hakları (erişim, silme, düzeltme)
- Veri sorguları için iletişim bilgisi (e-posta adresiniz)

Tesla Carview'un şablonu bunların tümünü kapsar. Sadece iletişim bilgilerinizi doldurun.

---

## İşletici iletişim bilgileri (yasal bilgilerden ayrı)

Ticari sorular veya basın iletişimi için footer'da bir iletişim e-postası yapılandırabilirsiniz:
- **Ayarlar → İşletici İletişim**
- Bu, uygulama footer'ında görünür ve yasal künyeden ayrıdır

Bu, ana `.env` dosyasında değil, frontend ortam dosyasında yapılandırılır:
```bash
# /opt/tesla-carview/frontend/.env:
VITE_OPERATOR_CONTACT_EMAIL=contact@yourdomain.com
```
