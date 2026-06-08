# Архітектура безпеки

> 🤖 *Цей український переклад створений з AI-підтримкою з [README.en.md](README.en.md). Виправлення приймаються на GitHub.*

> 🇩🇪 [Auf Deutsch lesen](05-security-architecture.md) · 🇬🇧 [Read in English](05-security-architecture.en.md)

## Модель загроз

Цей застосунок захищає дані автомобіля одного користувача/домогосподарства
на самостійно керованому сервері. Основні загрози:

| Загроза | Захист |
|---|---|
| Несанкціонований доступ до веб-інтерфейсу | Автентифікація користувача з JWT + MFA |
| Brute force на вхід | Rate limiting + блокування облікового запису |
| Викрадення сесії через XSS | Access token лише в RAM, без localStorage |
| Викрадення cookie (CSRF) | `SameSite=Strict` + JSON API (без form submit) |
| Man-in-the-middle | TLS 1.3, HSTS, OCSP stapling |
| Clickjacking | `X-Frame-Options: DENY` + CSP `frame-src 'none'` |
| Витік даних з компрометації DB | Хеші паролів (Argon2id), хеші токенів (SHA-256), коди MFA (bcrypt) **+ AES-256-GCM at-rest** для токенів Tesla, секрету MFA, приватного ключа Virtual-Key (див. "Шифрування at rest" нижче) |
| Stored XSS через адмін-markdown (юридичні сторінки) | `DOMPurify` перед `v-html`, allow-list тегів/атрибутів, URL-схеми обмежені http(s)/mailto/tel |
| IDOR (користувач A читає дані користувача B у тому ж tenant) | Хелпери `assertVehicleAccess`/`assertTripAccess`/`assertChargingAccess` у кожному mutating роуті; адміни бачать усе в межах свого tenant, звичайні користувачі — лише авто, прив'язані через `vehicle_users` |
| Setup-race hijack (зловмисник реєструє першого адміна) | Опціональний gate через ENV `SETUP_TOKEN` (заголовок `X-Setup-Token`) + rate limit + атомарна перевірка-перед-записом |
| Перерахування tenant через сторінку входу | Псевдоніми замість справжніх імен на сторінці входу (curated пул `adjective-noun`) |
| Застарілі залежності | Увімкнути Dependabot alerts у репозиторії |

## Шифрування at rest (з 2026-05)

Двостороннє шифрування (AES-256-GCM) для стовпців DB, для яких backend
потребує plaintext під час виконання і тому не може їх лише хешувати:

| Дані | Таблиця.колонка | Формат |
|---|---|---|
| Tesla OAuth access token | `tokens.access_token` | `v1:iv:tag:ciphertext` |
| Tesla OAuth refresh token | `tokens.refresh_token` | `v1:iv:tag:ciphertext` |
| TOTP MFA secret | `users.mfa_secret` | `v1:iv:tag:ciphertext` |
| Приватний ключ Tesla Virtual-Key (PEM) | `virtual_key.private_key_pem` | `v1:iv:tag:ciphertext` |

**Джерела ключів (за пріоритетом):**
1. `ENCRYPTION_KEY_B64` (змінна середовища, 32 байти у base64) — рекомендовано; живе поза `data/`. Згенерувати: `openssl rand -base64 32`
2. `/run/secrets/encryption_key` (Docker secret, 32 raw байти)
3. `data/.encryption-key` (файл, режим 0600) — fallback та існуючі установки; авто-генерується при першому запуску.

**Важливо:** Ключ має бути включений у вашу резервну копію. Без нього з'єднання Tesla, налаштування MFA та Virtual Keys будуть втрачені назавжди.

генерується при першому запуску backend. **Включайте його в резервну копію** — без
ключа підключення Tesla, налаштування MFA та Virtual-Keys неможливо відновити.

Однонаправлене хешування (SHA-256 + `timingSafeEqual`) для випадкових токенів, які
лише перевіряються, ніколи не відтворюються:

| Дані | Метод |
|---|---|
| Refresh-токени сесії | SHA-256, raw-значення лише в httpOnly cookie |
| Токени скидання пароля | SHA-256, у `tenant_settings` |

Реалізація: `backend/src/services/cryptoService.js`.

## Межа довіри tenant

Багатотенантна модель трактує один tenant як **одну групу довіри**:

- Кожен tenant має ізольовану SQLite-базу (cross-tenant-читання неможливе).
- Усередині tenant роль **admin** бачить кожне авто та дані кожного користувача —
  необхідно для адміністрування tenant (призначення авто, генерація reset-посилань,
  керування юридичними погодженнями тощо).
- Звичайні облікові записи **user** бачать лише авто, прив'язані до них через
  таблицю `vehicle_users(vehicle_id, user_id)`. Хелпери IDOR в
  `backend/src/middleware/vehicleAccess.js` застосовують це на кожному endpoint
  поїздки, зарядки та авто.

**Рекомендація для домогосподарств / компаній з кількома водіями:**

- Якщо всі водії повністю довіряють одне одному (одне домогосподарство, сімейний парк):
  помістіть усіх в один tenant, призначте кожне авто кожному користувачу через
  `vehicle_users`. Зручно.
- Якщо водії НЕ повинні бачити записи GPS / Fahrtenbuch один одного
  (незалежні працівники, податково релевантний поділ приватне vs. бізнес для
  кожного водія): надайте кожному водію **свій власний tenant**, зареєструйте
  кожне авто у відповідному tenant. Захист IDOR тоді забезпечує межу.

Свідомо немає тонкої моделі дозволів per-attribute усередині tenant — ця
складність винесена на межу tenant.

## Процес автентифікації

```
                    HTTPS
Browser  <---------------------  nginx (TLS termination)
                                   |
                               Docker мережа
                                   |
                              Express backend
                                   |
                              SQLite база даних
```

### Життєвий цикл токенів

```
Login       --> access token (15 хв, RAM)  +  refresh cookie (7д, httpOnly)
API request --> Authorization: Bearer <access-token>
401         --> POST /api/auth/refresh  (cookie надсилається автоматично)
                --> новий access token + нова refresh cookie (ротація)
Logout      --> видалити refresh-токен з DB + очистити cookie
```

### Чому не localStorage?

```
localStorage:  читається JavaScript    -->  XSS може вкрасти токен
Memory (RAM):  лише активна вкладка     -->  XSS не може зберегти токен
httpOnly cookie: недоступний з JS       -->  XSS не може прочитати cookie
```

## Хешування паролів

**Argon2id** (з v3.1.5, рекомендація OWASP 2024):
- Параметри: t=3 ітерації, m=65536 (64 MB RAM), p=4 потоки
- Memory-hard: GPU/ASIC-брутфорс значно дорожчий за bcrypt
- Кожен хеш містить випадкову сіль (захист від rainbow tables)
- Timing-safe порівняння через `argon2.verify()`

**Міграція:** Існуючі bcrypt-хеші (12 раундів) прозоро замінюються на
Argon2id при наступному успішному вході. Обидва формати приймаються
в перехідний період.

## MFA TOTP

- **Алгоритм**: HMAC-SHA1 (RFC 4226)
- **Період**: 30 секунд
- **Допустиме відхилення**: ±1 період (дозволено дрейф годинника до 60 с)
- **Кількість цифр**: 6
- **Секрет**: 20 випадкових байтів (160 біт ентропії)

## Конфігурація TLS у nginx

```nginx
# протоколи
ssl_protocols TLSv1.2 TLSv1.3;

# session tickets off = perfect forward secrecy зберігається
# навіть якщо серверний ключ буде скомпрометований пізніше
ssl_session_tickets off;

# HSTS: браузер кешує HTTPS на 2 роки
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

## Content Security Policy (CSP)

```
default-src 'self'          # усе лише з нашого власного домену
script-src  'self'          # без inline JS, без eval()
style-src   'self' 'unsafe-inline'  # Tailwind потребує inline-стилів
img-src     'self' data: https://*.tile.openstreetmap.org  # тайли карти
connect-src 'self'          # лише власне API
object-src  'none'          # без Flash, без PDF-рідера
frame-src   'none'          # без вбудовування iframe
```

**Permissions-Policy** (з v3.1.5) — блокує API браузера, які застосунок не використовує:
```
camera=(), microphone=(), geolocation=(), payment=(),
usb=(), bluetooth=(), display-capture=()
```

## Схема бази даних (таблиці, релевантні для безпеки)

```sql
users
  password_hash  -- Argon2id (легасі-хеші bcrypt мігрують при вході)
  mfa_secret     -- base32 (TOTP секрет)
  locked_until   -- timestamp блокування

refresh_tokens
  token_hash     -- SHA-256 від оригінального токену
  expires_at     -- закінчується автоматично

mfa_backup_codes
  code_hash      -- bcrypt, 10 раундів
  used           -- одноразове використання

audit_logs
  action         -- наприклад, login_success, mfa_enabled, password_changed
  ip_address     -- для криміналістичного аналізу
```

## Рекомендації після розгортання

1. **Негайно змініть пароль адміна** (Налаштування → Пароль)
2. **Увімкніть MFA** для всіх користувачів
3. **Безпечно збережіть резервні коди** (менеджер паролів)
4. **Регулярно резервуйте базу даних** (див. [02-deployment.en.md](./02-deployment.en.md))
5. **SSH-автентифікація за ключем** замість пароля на сервері
6. **Увімкніть Dependabot alerts** у репозиторії GitHub
7. **Регулярно переглядайте журнали**: `docker logs tesla-carview-backend`
