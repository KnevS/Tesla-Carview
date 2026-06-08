# Автентифікація та MFA

> 🤖 *Цей український переклад створений з AI-підтримкою з [README.en.md](README.en.md). Виправлення приймаються на GitHub.*

> 🇩🇪 [Auf Deutsch lesen](03-authentication.md) · 🇬🇧 [Read in English](03-authentication.en.md)

## Процес входу

```
[Browser]  POST /api/auth/login  { username, password }

  Case A: без MFA
  <-- { accessToken, user }
  redirect на dashboard

  Case B: MFA увімкнений
  <-- { requiresMfa: true, tempToken }  (дійсний 5 хв)
  redirect на введення MFA

  POST /api/auth/mfa/verify  { tempToken, code }
  <-- { accessToken, user }
  redirect на dashboard
```

## Концепція токенів

| Токен | Зберігання | Термін дії | Використовується для |
|---|---|---|---|
| **Access token** | JS-пам'ять (Pinia) | 15 хвилин | API-запити як заголовок `Bearer` |
| **Refresh token** | httpOnly cookie | 7 днів | отримання нового access token |
| **Temp token** | JS-пам'ять | 5 хвилин | лише для верифікації MFA |

**Чому не localStorage?** localStorage читається JavaScript і тому вразливий до XSS.
Access token у пам'яті зникає при закритті вкладки, httpOnly cookie — ні.
Refresh cookie не може бути прочитана JavaScript.

## Налаштування MFA

### Як користувач

1. Відкрити **Налаштування** (⚙️)
2. Натиснути **"Увімкнути MFA"**
3. Відсканувати QR-код застосунком-автентифікатором:
   - [Google Authenticator](https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2) (Android/iOS)
   - [Authy](https://authy.com/) (Android/iOS/Desktop, з резервним копіюванням)
   - [1Password](https://1password.com/) (вбудований TOTP)
   - [Bitwarden](https://bitwarden.com/) (вбудований TOTP)
4. Ввести показаний 6-значний код
5. **Зберегти 10 резервних кодів** (показуються лише один раз!)
   - Збережіть їх у менеджері паролів
   - Або роздрукуйте та зберігайте в безпечному місці

### Резервні коди

- Кожен код — **одноразовий**
- Формат: `XXXX-XXXX` (8 hex-символів з дефісом)
- Введіть замість TOTP-коду, якщо не маєте доступу до застосунку
- Лічильник коди, що залишилися, видимий у налаштуваннях
- Коли вичерпані: вимкніть MFA та налаштуйте знову

## Створення користувача (адмін)

Лише користувачі з роллю `admin` можуть створювати нових користувачів:

```bash
# безпосередньо через API (пароль ≥ 12 символів):
curl -X POST https://your-domain.com/api/users \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"username": "karin", "password": "strongPassword123!", "role": "user"}'
```

## Passkeys (без пароля)

Tesla Carview підтримує WebAuthn/FIDO2 passkeys як альтернативу паролям:

1. Відкрити **Налаштування → Passkeys**
2. Натиснути **"+ Додати passkey"** — відкриється діалог браузера
3. Підтвердити через Face ID, Touch ID або апаратний ключ
4. Відтепер: вибирайте **"Увійти через passkey"** на сторінці входу

Passkeys стійкі до фішингу і не вимагають пароля.

## QR SSO вхід (для браузера на дисплеї Tesla)

Вбудований браузер на дисплеях Tesla не підтримує WebAuthn/Face ID.
Завдяки QR pair flow ви все одно можете увійти через Passkey/Face ID:

```
[браузер Tesla]              [Смартфон]
  відкрити сторінку входу
  "Увійти через смартфон"
  показати QR-код  ───────────── сканувати
  (опитування кожні 2 с)        відкрити /pair/{token}
                                натиснути "Підтвердити з passkey"
                                Face ID / Touch ID ✓
                                POST /api/pair/confirm/{token}
  сеанс підтверджено ◄─────────
  отримати JWT
  відкрити dashboard
```

**Покроково:**

1. У браузері Tesla натисніть **"Увійти через смартфон"**
2. З'явиться QR-код (дійсний 5 хвилин)
3. Відскануйте QR-код камерою смартфона
4. На телефоні відкриється `https://your-domain.com/pair/{token}`
5. Натисніть **"Підтвердити з passkey"** → Face ID / Touch ID
6. Браузер Tesla входить автоматично

**Властивості безпеки:**
- Токен: 256-bit випадкове значення, неможливо вгадати
- TTL: 5 хвилин, одноразовий
- Прив'язаний до tenant: токен дійсний лише для вашого власного tenant
- Passkey на смартфоні підтверджує особу на стороні сервера

**Вимога:** Принаймні один passkey має бути зареєстрований на смартфоні заздалегідь (Налаштування → Passkeys).

## Вимоги до пароля

- Принаймні **12 символів**
- Максимум 256 символів
- Без додаткових вимог щодо класів символів (довжина важливіша за складність)
- Рекомендація: парольна фраза з 4+ випадкових слів
