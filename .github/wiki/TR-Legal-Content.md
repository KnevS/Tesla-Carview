🌐 **Dil:** [EN](Legal-Content) · [DE](DE-Legal-Content) · [FR](FR-Legal-Content) · [ES](ES-Legal-Content) · **TR** · [EL](EL-Legal-Content)

---

# Yasal İçerik (Kimlik, Gizlilik, Şartlar)

Tesla Carview kamuya açık erişilebilirse (yalnızca yerel ağınızda değil), yasal olarak bir imprint (kimlik bildirimi), gizlilik politikası ve kullanım koşulları sağlamanız gerekebilir — özellikle Alman/AB hukuku kapsamında (DSGVO/GDPR).

---

## Bu benim için geçerli mi?

**Tesla Carview'i yalnızca yerel ağımda kullanıyorum (genel alan adı yok):**
→ Yasal gereklilik yok. Bu sayfayı atla.

**Genel bir alan adım var ve uygulamayı yalnızca ben kullanıyorum:**
→ Düşük risk, ama Almanya/AB'deysen bir imprint önerilir.

**Tesla Carview'i aile veya arkadaşlarla kullanıyorum (ticari olmayan):**
→ Güvende olmak için imprint ve gizlilik politikasını yapılandırmalısın.

**Genel bir demo veya açık kayıt çalıştırıyorum:**
→ Almanya/AB'de imprint, gizlilik politikası ve koşullar zorunludur.

---

## Yasal içerik nerede yapılandırılır

1. **Admin** olarak giriş yap
2. **Admin → Yasal İçerik**'e git
3. Üç bölüm göreceksin: **Kimlik Bildirimi**, **Gizlilik Politikası**, **Kullanım Koşulları**

---

## Şablonları doldurma

Tesla Carview, `<<YER_TUTUCU>>` olarak işaretlenmiş alan içeren şablonlar sağlar. Şunları doldurman gerekir:

| Yer tutucu | Ne gireceğin |
|---|---|
| `<<NAME>>` | Tam yasal adın |
| `<<STREET>>` | Sokak ve ev numarası |
| `<<CITY>>` | Şehir ve posta kodu |
| `<<COUNTRY>>` | Ülken |
| `<<EMAIL>>` | İletişim e-posta adresi |
| `<<PHONE>>` | Telefon numarası (Almanya'da zorunlu) |

> ⚠️ **Uygulama sizi uyaracaktır** herhangi bir `<<YER_TUTUCU>>` alanı boş kalırsa. Tüm yer tutucuları doldurmadan yayına geçme.

---

## Sürüm oluşturma ve yayınlama

Yasal içerik sürümlüdür. Değişiklik yaptığında:
1. Editörde içeriği düzenle
2. **"Yeni sürüm yayınla"**'ya tıkla
3. Önceki sürümü kabul eden kullanıcılar bir sonraki girişlerinde yeni sürümü kabul etmeleri istenir

Bu, kimin hangi sürümü ne zaman kabul ettiğini gösteren bir denetim izi oluşturur.

---

## Çok dilli yasal içerik

Tesla Carview yasal içeriği bir birincil dilde (DE sunucuları için varsayılan olarak Almanca) yönetir ve diğer dillere yansıtır. Almanca sürümü değiştirirsen, diğer diller otomatik olarak güncellenir.

Özel çeviriye ihtiyacın varsa, her dili ayrıca düzenleyebilirsin.

---

## Gizlilik politikası için GDPR/DSGVO minimum gereksinimleri

AB'deysen gizlilik politikan şunları belirtmeli:
- Hangi kişisel verileri topladığın (kullanıcı adı, e-posta, araç verileri, konum)
- Neden topladığın (kişisel kullanım, özel kayıt)
- Ne kadar saklayacağın (hesap silinmesine kadar veya X yıl)
- Kimin erişimi var (yalnızca sen admin olarak)
- Kullanıcı hakları (erişim, silme, düzeltme)
- Veri soruları için iletişim (e-posta adresin)

Tesla Carview'in şablonu bunların hepsini kapsar. Sadece iletişim bilgilerini doldur.

---

## Operatör iletişimi (yasal içerikten ayrı)

Ticari sorgular veya basın iletişimi için uygulama altbilgisinde bir iletişim e-postası yapılandırabilirsin:
- **Ayarlar → Operatör İletişimi**
- Uygulama altbilgisinde görünür ve yasal imprinting'den ayrıdır

Bu, frontend ortam dosyasında yapılandırılır (ana `.env` değil):
```bash
# /opt/tesla-carview/frontend/.env:
VITE_OPERATOR_CONTACT_EMAIL=iletisim@alaninadın.com
```
