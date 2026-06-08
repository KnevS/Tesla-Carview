# Arquitectura de seguridad

> 🤖 *Esta traducción al español es asistida por IA desde [05-security-architecture.en.md](05-security-architecture.en.md). Correcciones bienvenidas vía GitHub.*

> 🇩🇪 [Auf Deutsch lesen](05-security-architecture.md)

## Modelo de amenazas

Esta aplicación protege los datos del vehículo de un único usuario/hogar
en un servidor auto-gestionado. Las amenazas principales son:

| Amenaza | Mitigación |
|---|---|
| Acceso no autorizado a la UI web | Autenticación de usuario con JWT + MFA |
| Fuerza bruta en el login | Rate limiting + bloqueo de cuenta |
| Secuestro de sesión vía XSS | Access token sólo en RAM, sin localStorage |
| Robo de cookie (CSRF) | `SameSite=Strict` + API JSON (sin form submit) |
| Man-in-the-middle | TLS 1.3, HSTS, OCSP stapling |
| Clickjacking | `X-Frame-Options: DENY` + CSP `frame-src 'none'` |
| Fuga de datos por compromiso de la BD | Hashes de contraseña (Argon2id), hashes de tokens (SHA-256), códigos MFA (bcrypt) **+ AES-256-GCM en reposo** para tokens Tesla, secreto MFA y clave privada de Virtual Key (véase "Cifrado en reposo" abajo) |
| XSS persistente vía markdown del admin (páginas legales) | `DOMPurify` antes de `v-html`, lista blanca de etiquetas/atributos, esquemas de URL restringidos a http(s)/mailto/tel |
| IDOR (el usuario A lee los datos del usuario B dentro del mismo tenant) | Helpers `assertVehicleAccess`/`assertTripAccess`/`assertChargingAccess` en cada ruta que muta; los admins ven todo dentro de su tenant, los usuarios normales sólo ven los vehículos vinculados vía `vehicle_users` |
| Secuestro durante el setup (un atacante registra al primer admin) | Gate opcional `SETUP_TOKEN` por env (cabecera `X-Setup-Token`) + rate limit + check-then-write atómico |
| Enumeración de tenants en la página de login | Pseudónimos en lugar de nombres reales en la página de login (pool curado `adjetivo-sustantivo`) |
| Dependencias obsoletas | Activar alertas de Dependabot en el repositorio |

## Cifrado en reposo (desde 2026-05)

Cifrado reversible (AES-256-GCM) para columnas de BD cuyo plaintext necesita el
backend en runtime y que, por tanto, no pueden hashearse:

| Dato | Tabla.columna | Formato |
|---|---|---|
| Access token OAuth de Tesla | `tokens.access_token` | `v1:iv:tag:ciphertext` |
| Refresh token OAuth de Tesla | `tokens.refresh_token` | `v1:iv:tag:ciphertext` |
| Secreto MFA TOTP | `users.mfa_secret` | `v1:iv:tag:ciphertext` |
| Clave privada de Virtual Key de Tesla (PEM) | `virtual_key.private_key_pem` | `v1:iv:tag:ciphertext` |

**Fuentes de la clave (prioridad):**
1. `ENCRYPTION_KEY_B64` (variable de entorno, 32 bytes codificados en base64) — recomendado; vive fuera de `data/`. Generar: `openssl rand -base64 32`
2. `/run/secrets/encryption_key` (Docker secret, 32 bytes en bruto)
3. `data/.encryption-key` (archivo, modo 0600) — fallback e instalaciones existentes; se auto-genera en el primer arranque.

**Importante:** La clave debe incluirse en tu backup. Sin ella, las conexiones Tesla, las configuraciones MFA y las Virtual Keys se pierden de forma permanente.

generada en el primer arranque del backend. **Inclúyela en tu backup** — sin
la clave, las conexiones Tesla, las configuraciones MFA y las Virtual Keys son irrecuperables.

Hash unidireccional (SHA-256 + `timingSafeEqual`) para tokens aleatorios que
sólo se verifican, nunca se reproducen:

| Dato | Método |
|---|---|
| Refresh tokens de sesión | SHA-256, el valor en bruto sólo en la cookie httpOnly |
| Tokens de reseteo de contraseña | SHA-256, en `tenant_settings` |

Implementación: `backend/src/services/cryptoService.js`.

## Frontera de confianza del tenant

El modelo multi-tenant trata cada tenant como **un único grupo de confianza**:

- Cada tenant tiene una base de datos SQLite aislada (no es posible leer entre tenants).
- Dentro de un tenant, el rol **admin** ve todos los vehículos y los datos de todos los usuarios —
  necesario para administrar el tenant (asignar vehículos, generar enlaces de reseteo,
  gestionar aceptaciones legales, etc.).
- Las cuentas regulares de **user** sólo ven los vehículos vinculados a ellas mediante la
  tabla `vehicle_users(vehicle_id, user_id)`. Los helpers IDOR en
  `backend/src/middleware/vehicleAccess.js` aplican esto en cada endpoint de viaje,
  carga y vehículo.

**Recomendación para hogares / empresas con varios conductores:**

- Si todos los conductores confían plenamente entre sí (un hogar, flota familiar):
  pon a todos en un único tenant, asigna cada vehículo a cada usuario mediante
  `vehicle_users`. Cómodo.
- Si los conductores NO deben ver el GPS / libro de viajes de los demás
  (empleados independientes, separación privado vs. negocio relevante para Hacienda):
  dale a cada conductor **su propio tenant**, registra cada vehículo
  en el tenant respectivo. Los guardias IDOR aplicarán la frontera.

Deliberadamente no hay un modelo de permisos fino por atributo
dentro de un tenant — esa complejidad se traslada hacia arriba, a la frontera
del tenant.

## Flujo de autenticación

```
                    HTTPS
Navegador  <-----------------  nginx (terminación TLS)
                                   |
                               Red Docker
                                   |
                              Backend Express
                                   |
                              Base de datos SQLite
```

### Ciclo de vida del token

```
Login         --> access token (15 min, RAM)  +  cookie refresh (7d, httpOnly)
Petición API  --> Authorization: Bearer <access-token>
401           --> POST /api/auth/refresh  (la cookie se envía automáticamente)
                  --> nuevo access token + nueva cookie refresh (rotación)
Logout        --> eliminar refresh token de la BD + borrar cookie
```

### ¿Por qué no localStorage?

```
localStorage:    legible desde JavaScript   -->  XSS puede robar el token
Memoria (RAM):   sólo la pestaña activa     -->  XSS no puede persistir el token
Cookie httpOnly: no legible desde JS        -->  XSS no puede leer la cookie
```

## Hash de contraseñas

**Argon2id** (desde v3.1.5, recomendación OWASP 2024):
- Parámetros: t=3 iteraciones, m=65536 (64 MB RAM), p=4 hilos
- Memory-hard: la fuerza bruta con GPU/ASIC es significativamente más cara que con bcrypt
- Cada hash contiene un salt aleatorio (protección frente a rainbow tables)
- Comparación timing-safe vía `argon2.verify()`

**Migración:** Los hashes bcrypt existentes (12 rondas) se sustituyen de forma transparente
por Argon2id en el siguiente login exitoso. Ambos formatos se aceptan durante
el periodo de transición.

## MFA TOTP

- **Algoritmo**: HMAC-SHA1 (RFC 4226)
- **Periodo**: 30 segundos
- **Tolerancia**: ±1 periodo (deriva de reloj hasta 60 s permitida)
- **Dígitos**: 6
- **Secreto**: 20 bytes aleatorios (entropía de 160 bits)

## Configuración TLS de nginx

```nginx
# protocolos
ssl_protocols TLSv1.2 TLSv1.3;

# session tickets off = se preserva perfect forward secrecy
# incluso si la clave del servidor se compromete más adelante
ssl_session_tickets off;

# HSTS: el navegador cachea HTTPS durante 2 años
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

## Content Security Policy (CSP)

```
default-src 'self'          # todo sólo desde nuestro propio dominio
script-src  'self'          # sin JS inline, sin eval()
style-src   'self' 'unsafe-inline'  # Tailwind necesita estilos inline
img-src     'self' data: https://*.tile.openstreetmap.org  # tiles del mapa
connect-src 'self'          # sólo la API propia
object-src  'none'          # sin Flash, sin lector PDF
frame-src   'none'          # sin embeber en iframe
```

**Permissions-Policy** (desde v3.1.5) — bloquea APIs del navegador que la app no usa:
```
camera=(), microphone=(), geolocation=(), payment=(),
usb=(), bluetooth=(), display-capture=()
```

## Esquema de base de datos (tablas relevantes para seguridad)

```sql
users
  password_hash  -- Argon2id (hashes bcrypt antiguos migrados al hacer login)
  mfa_secret     -- codificado en base32 (secreto TOTP)
  locked_until   -- timestamp de bloqueo

refresh_tokens
  token_hash     -- SHA-256 del token original
  expires_at     -- caduca automáticamente

mfa_backup_codes
  code_hash      -- bcrypt, 10 rondas
  used           -- un solo uso

audit_logs
  action         -- p. ej. login_success, mfa_enabled, password_changed
  ip_address     -- para análisis forense
```

## Recomendaciones tras el despliegue

1. **Cambiar la contraseña del admin inmediatamente** (Ajustes → Contraseña)
2. **Activar MFA** para todos los usuarios
3. **Guardar los códigos de respaldo de forma segura** (gestor de contraseñas)
4. **Hacer backup de la base de datos regularmente** (véase [02-deployment.en.md](./02-deployment.en.md))
5. **Autenticación SSH por clave** en lugar de contraseña en el servidor
6. **Activar alertas de Dependabot** en el repositorio de GitHub
7. **Revisar los logs regularmente**: `docker logs tesla-carview-backend`
