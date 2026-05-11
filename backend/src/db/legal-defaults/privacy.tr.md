# Gizlilik Politikası

> Bu politika, **özel olarak kendisi tarafından barındırılan** bu Tesla veri kaydedici örneği kullanıldığında hangi kişisel verilerin, hangi hukuki dayanakla ve hangi amaçla işlendiğini açıklar. Genel Veri Koruma Yönetmeliği (GDPR) ve Almanya Federal Veri Koruma Kanunu (BDSG) uygulanır.

## 1. Veri sorumlusu

GDPR md. 4 (7) anlamında veri sorumlusu:

<<NAME>>
<<STREET>>
<<ZIP_CITY>>
<<COUNTRY>>
E-posta: <<EMAIL>>

## 2. İşlemenin niteliği

Uygulama, **yalnızca veri sorumlusunun ve hane halkının özel kullanımı** için işletilmektedir. Üçüncü taraf verilerinin işlenmesi **söz konusu değildir**; herkese açık kayıt mümkün değildir.

Tüm veriler **veri sorumlusunun kendi sunucusunda yerel olarak** kalır. Bölüm 5'te belgelenen iki istisna (Tesla, opsiyonel olarak Monta) dışında üçüncü taraflara **aktarım yapılmaz**.

## 3. İşlenen veriler

| Veri kategorisi | Amaç | Hukuki dayanak |
|---|---|---|
| Kullanıcı adı, parola özeti, MFA gizli anahtarı, oturum açma geçmişi | Kimlik doğrulama ve hesap güvenliği | GDPR md. 6 (1) (b) — sözleşmenin ifası |
| Tesla hesabı OAuth jetonu | Kullanıcının kendi araçları için Tesla Fleet API erişimi | GDPR md. 6 (1) (b) |
| Araç ana verileri (VIN, model, yıl) | Araç yönetimi | GDPR md. 6 (1) (b) |
| Yolculuk verileri (GPS, hız, tüketim) | Seyir defteri, menzil ve tüketim analizi | GDPR md. 6 (1) (a/b) |
| Şarj seansları (enerji, süre, maliyet, GPS) | Şarj geçmişi, ev şarj maliyetinin hesaplanması | GDPR md. 6 (1) (b) |
| Pil telemetrisi (SoC, sıcaklık, gerilim) | Yıpranma analizi | GDPR md. 6 (1) (b) |
| Sunucu günlükleri (IP, user agent, zaman damgaları, durum kodları) | Güvenlik, kötüye kullanımın önlenmesi (fail2ban, hız sınırlaması) | GDPR md. 6 (1) (f) — meşru menfaat |
| Güvenlikle ilgili işlemlerin denetim günlüğü | Olay durumunda adli inceleme | GDPR md. 6 (1) (f) |

## 4. Saklama süreleri

| Veri kategorisi | Saklama |
|---|---|
| Yenileme jetonları | 7 gün dönüşümlü, ardından otomatik silme |
| Sunucu günlükleri (nginx) | 14 gün, rotasyonlu |
| Yolculuk ve şarj verileri | süresiz — uygulamada silme / temizleme işlevi mevcut |
| Kullanıcı hesabı | aktif silme yapılana kadar |

Veri sorumlusu, uygulamadaki **"Veri yönetimi"** işlevi aracılığıyla verileri istediği zaman silebilir.

## 5. Alıcılar / üçüncü ülkeye aktarım

### 5.1 Tesla, Inc. (ABD)

Araç verilerinin sorgulanması ve aracın kontrolü için [Tesla Fleet API](https://developer.tesla.com) kullanılır. API çağrıları (OAuth jetonu, araç VIN'i, komut parametreleri dahil) Tesla, Inc. (3500 Deer Creek Road, Palo Alto, CA 94304, ABD) şirketine iletilir. GDPR md. 28 anlamında veri işleyen ilişkisi yoktur; Tesla bağımsız bir veri sorumlusu olarak hareket eder. Aktarım mekanizması: AB Komisyonu'nun **Standart Sözleşme Hükümleri** ve **EU-US Data Privacy Framework**. Tesla gizlilik bildirimi: [https://www.tesla.com/legal/privacy](https://www.tesla.com/legal/privacy).

### 5.2 Monta ApS (Danimarka) — opsiyonel

Ayarlardan Monta entegrasyonu etkinleştirildiğinde, şarj seansları faturalandırma amacıyla Monta Partner API ile senkronize edilir. Alıcı: Monta ApS, Vesterbrogade 26, 1620 Kopenhag, Danimarka. İşleme AEA içinde gerçekleşir — üçüncü ülkeye aktarım yapılmaz. Gizlilik: [https://monta.com/privacy](https://monta.com/privacy).

## 6. Çerezler

Uygulama **yalnızca kesinlikle gerekli çerezleri** kullanır:

- `refreshToken` (httpOnly, Secure, SameSite=Strict) — oturum bilgisi, 7 gün geçerli
- `localStorage['locale']` — seçilen dil, yalnızca tarayıcıda yerel olarak saklanır, asla iletilmez

Hiçbir takip, reklam veya analiz çerezi **kullanılmaz**. Bu nedenle § 25 TDDDG kapsamında onay gerekli değildir.

## 7. Barındırma

Bu örneği barındıran sunucu, ya doğrudan veri sorumlusu tarafından (kendi kendine barındırma) ya da bir veri işleme sözleşmesiyle bağlı bir hosting sağlayıcısında işletilir. Somut sağlayıcı talep üzerine bildirilir.

## 8. Veri sahibi olarak haklarınız

Özellikle GDPR md. 15-22 kapsamında aşağıdaki haklara sahipsiniz:

- Hakkınızda işlenen verilere **erişim** hakkı (md. 15)
- Yanlış verilerin **düzeltilmesi** hakkı (md. 16)
- **Silme** hakkı ("unutulma hakkı", md. 17) — yasalarca izin verilen ölçüde
- İşlemenin **kısıtlanması** hakkı (md. 18)
- Yapılandırılmış, makine tarafından okunabilir biçimde **veri taşınabilirliği** hakkı (md. 20) — uygulama CSV/JSON dışa aktarımı sunar
- Meşru menfaate dayalı işlemeye **itiraz** hakkı (md. 21)
- Bir denetim makamına **şikâyette bulunma** hakkı (md. 77) — yetkili makam, sizin Almanya'daki eyalet veri koruma kurumunuzdur

Taleplerinizi <<EMAIL>> adresine e-posta yoluyla iletin.

## 9. Güvenlik

Uygulama, GDPR md. 32 uyarınca teknik ve organizasyonel önlemleri uygular. Ayrıntılar: depodaki [Güvenlik Politikası](https://github.com/KnevS/Tesla-Carview/blob/main/SECURITY.en.md) belgesine bakın.

## 10. Bu politikanın değiştirilmesi

İşleme veya hukuki çerçeve değiştiğinde bu politika güncellenebilir. Her değişiklikten sonra bir sonraki oturum açma sırasında yeniden onaylamanız istenecektir. Önceki sürümler kanıt amacıyla sistemde saklanır.

Son güncelleme: <<DATE>>
