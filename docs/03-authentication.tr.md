# Kimlik doğrulama ve MFA

> 🤖 *Bu Türkçe çeviri [03-authentication.en.md](03-authentication.en.md) dosyasından yapay zeka destekli oluşturulmuştur. Düzeltmeler GitHub üzerinden memnuniyetle karşılanır.*

> 🇩🇪 [Auf Deutsch lesen](03-authentication.md)

## Giriş akışı

```
[Tarayıcı]  POST /api/auth/login  { username, password }

  Durum A: MFA yok
  <-- { accessToken, user }
  panele yönlendir

  Durum B: MFA etkin
  <-- { requiresMfa: true, tempToken }  (5 dakika geçerli)
  MFA girişine yönlendir

  POST /api/auth/mfa/verify  { tempToken, code }
  <-- { accessToken, user }
  panele yönlendir
```

## Token konsepti

| Token | Depolama | Geçerlilik | Kullanım amacı |
|---|---|---|---|
| **Access token** | JS bellek (Pinia) | 15 dakika | `Bearer` header olarak API istekleri |
| **Refresh token** | httpOnly cookie | 7 gün | Yeni access token alma |
| **Temp token** | JS bellek | 5 dakika | Yalnızca MFA doğrulaması için |

**Neden localStorage değil?** localStorage JavaScript tarafından okunabilir ve dolayısıyla XSS'e karşı savunmasızdır.
Bellekteki access token sekme kapatıldığında kaybolur, httpOnly cookie ise kaybolmaz.
Refresh cookie'si JavaScript tarafından okunamaz.

## MFA kurulumu

### Kullanıcı olarak

1. **Ayarlar** (⚙️) bölümünü açın
2. **"MFA'yı etkinleştir"** öğesine tıklayın
3. QR kodu bir authenticator uygulamasıyla tarayın:
   - [Google Authenticator](https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2) (Android/iOS)
   - [Authy](https://authy.com/) (Android/iOS/Masaüstü, yedekleme ile)
   - [1Password](https://1password.com/) (yerleşik TOTP)
   - [Bitwarden](https://bitwarden.com/) (yerleşik TOTP)
4. Görüntülenen 6 haneli kodu girin
5. **10 yedek kodu kaydedin** (yalnızca bir kez gösterilir!)
   - Bir parola yöneticisinde saklayın
   - Veya yazdırıp güvenli bir yerde tutun

### Yedek kodlar

- Her kod **tek kullanımlıktır**
- Format: `XXXX-XXXX` (tireli 8 hex karakter)
- Uygulamaya erişiminiz olmadığında TOTP kodu yerine girin
- Kalan kod sayacı ayarlarda görünür
- Tükenince: MFA'yı devre dışı bırakıp yeniden kurun

## Kullanıcı oluştur (yönetici)

Yalnızca `admin` rolündeki kullanıcılar yeni kullanıcı oluşturabilir:

```bash
# doğrudan API üzerinden (parola ≥ 12 karakter):
curl -X POST https://your-domain.com/api/users \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"username": "karin", "password": "strongPassword123!", "role": "user"}'
```

## Passkey (parolasız)

Tesla Carview, parolalara alternatif olarak WebAuthn/FIDO2 passkey'leri destekler:

1. **Ayarlar → Passkey** bölümünü açın
2. **"+ Passkey ekle"** öğesine tıklayın — tarayıcı diyaloğu açılır
3. Face ID, Touch ID veya güvenlik anahtarı ile onaylayın
4. Bundan sonra: giriş sayfasında **"Passkey ile giriş yap"** seçin

Passkey'ler kimlik avına (phishing) dayanıklıdır ve parola gerektirmez.

## QR SSO girişi (Tesla ekran tarayıcısı için)

Tesla ekranlarındaki yerleşik tarayıcı WebAuthn/Face ID desteklemez.
QR eşleştirme akışı ile Passkey/Face ID kullanarak yine de giriş yapabilirsiniz:

```
[Tesla tarayıcı]              [Akıllı telefon]
  giriş sayfasını aç
  "Akıllı telefon ile giriş yap"
  QR kodu göster  ─────────── tara
  (her 2 sn'de yokla)          /pair/{token} aç
                               "Passkey ile onayla" dokun
                               Face ID / Touch ID ✓
                               POST /api/pair/confirm/{token}
  oturum onaylandı ◄──────────
  JWT al
  paneli aç
```

**Adım adım:**

1. Tesla tarayıcısında **"Akıllı telefon ile giriş yap"** öğesine dokunun
2. QR kodu görünür (5 dakika geçerli)
3. QR kodu akıllı telefon kameranızla tarayın
4. Telefonda `https://your-domain.com/pair/{token}` açılır
5. **"Passkey ile onayla"** öğesine dokunun → Face ID / Touch ID
6. Tesla tarayıcısı otomatik olarak giriş yapar

**Güvenlik özellikleri:**
- Token: 256 bit rastgele değer, tahmin edilemez
- TTL: 5 dakika, tek kullanımlık
- Tenant kapsamlı: token yalnızca kendi tenant'ınız için geçerlidir
- Akıllı telefondaki passkey kimliği sunucu tarafında doğrular

**Gereksinim:** Akıllı telefonda önceden en az bir passkey kayıtlı olmalıdır (Ayarlar → Passkey).

## Parola gereksinimleri

- En az **12 karakter**
- En fazla 256 karakter
- Karakter sınıfı zorunluluğu yok (uzunluk karmaşıklıktan daha önemlidir)
- Tavsiye: 4+ rastgele kelimeden oluşan bir parola cümlesi (passphrase)
