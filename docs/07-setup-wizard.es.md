# Asistente de configuración — configuración inicial

> 🤖 *Esta traducción al español es asistida por IA desde [07-setup-wizard.en.md](07-setup-wizard.en.md). Correcciones bienvenidas vía GitHub.*

> 🇩🇪 [Auf Deutsch lesen](07-setup-wizard.md)

Tesla Carview ofrece dos caminos para la **instalación inicial** y un asistente integrado para la **configuración continua**.

---

## Asistentes integrados en la app {#settings-wizard}

A partir de v3.4.0 hay **dos asistentes separados**:

### 1. Asistente de ajustes personales (`SettingsWizard.vue`)

Aparece automáticamente tras el primer login y se puede volver a abrir en cualquier momento desde **Ajustes → 🧙 Iniciar asistente**. Disponible para **todos los usuarios**.

| # | Paso | Descripción |
|---|------|-------------|
| 1 | **Bienvenida** | Visión general |
| 2 | **Idioma** | Seleccionar el idioma de la app |
| 3 | **Diseño** | Elegir estilo de diseño (Glass, Cyberpunk, Minimal, Sport, Nevs-Edition) |
| 4 | **Color de acento** | Color de acento para botones y navegación |
| 5 | **Unidades** | km/mi, °C/°F, kWh/100km, etc. |
| 6 | **Dashboard** | Visibilidad y orden de las tarjetas |
| 7 | **Navegación** | Ordenar y ocultar elementos de navegación |
| 8 | **Notificaciones** | Suscripción a Web Push, selección de tipos de evento |
| 9 | **Hecho** | Se guardan todos los ajustes |

### 2. Asistente de configuración del admin (`AdminSetupWizard.vue`)

Accesible desde **Admin Hub → 🛠️ Asistente de configuración**. **Sólo admins.** Guía por toda la configuración del sistema — sin necesidad de editar SSH ni `.env`.

| Paso | Descripción |
|------|-------------|
| **Credenciales Tesla** | Definir Client-ID, Client-Secret, Audience vía UI (almacenados en BD) |
| **Tesla OAuth** | Conectar la cuenta Tesla (popup → callback PostMessage → auto-refresh) |
| **Vehículos** | Sincronizar vehículos desde la cuenta Tesla |
| **Virtual Key** | Mostrar/copiar la URL de registro; comprobar estado |
| **Fleet Telemetry** | Configurar por VIN; visualización de estado |
| **Web Push (VAPID)** | Generar claves VAPID directamente en el navegador o introducirlas manualmente |
| **Telegram Bot** | Configurar el token del bot (requiere reinicio del servidor) |
| **Precio eléctrico** | Definir la tarifa de carga en casa (€/kWh) por vehículo |
| **APIs externas** | Configurar ABRP, clave Grok/xAI |
| **Monitorización** | Self-healing + e-mail de alerta |
| **Resumen** | Visión del estado; aviso de reinicio si se configuró Telegram |

### Notas

- **Modo borrador** (asistente personal): los cambios se guardan sólo en el último paso
- **Guardado inmediato** (asistente de admin): las credenciales se guardan paso a paso en `tenant_settings` (BD)
- **Tesla OAuth**: ventana popup; se cierra automáticamente tras iniciar sesión
- **Generación VAPID**: directamente en el navegador — no se necesita `docker exec`
- **Selector de idioma en la cabecera** (cada asistente): cada asistente muestra un selector compacto 🌐 arriba a la derecha. Elegir un idioma se aplica instantáneamente a todos los textos del asistente; para usuarios con sesión iniciada la elección se persiste en el perfil. Al iniciar sesión se aplica automáticamente el idioma almacenado en el perfil o el predeterminado del tenant.
- **Auto-inicialización al arrancar el backend**: las claves VAPID se generan automáticamente por tenant cuando ni `tenant_settings` ni el `.env` las proporcionan. Por tanto, las notificaciones push funcionan inmediatamente después del primer login — el paso correspondiente del asistente muestra "✓ ya configurado (Auto)".
- **Prefill del asistente** (`GET /api/system/wizard-prefill`): al abrir el asistente, este pide al backend valores por defecto (audiencia de Fleet API por Geo-IP, e-mail de alerta = e-mail del admin, tarifa eléctrica por país) más un estado por paso. Los pasos completados se marcan con un banner verde y se pueden saltar directamente; la pantalla de bienvenida muestra "X de Y pasos ya completados".
---

Tesla Carview ofrece dos caminos para la configuración inicial.

## Asistente web (recomendado)

En el primer arranque la app detecta automáticamente que aún no existe ninguna cuenta de administrador
y redirige el navegador a **/setup**.

### Pasos

1. **Bienvenida** — visión general del sistema
2. **Crear cuenta de administrador** — elegir nombre de usuario y contraseña robusta
3. **Hecho** — redirección a la página de login

El asistente web en `/setup` sólo está disponible mientras no exista ningún admin.
Después la página queda bloqueada automáticamente.

## Asistente de terminal

```bash
bash deploy/setup-wizard.sh
```

Pregunta interactivamente:

| Parámetro | Descripción | Ejemplo |
|---|---|---|
| URL pública | URL completa de la aplicación | `https://tesla.example.com` |
| Tesla Client-ID | Del Tesla Developer Portal | `abc123...` |
| Tesla Client-Secret | Del Tesla Developer Portal | `xyz456...` |
| Ruta de BD | Archivo SQLite | `./data/tesla-carview.db` |
| E-mail | Para Let's Encrypt | `admin@example.com` |
| Claves VAPID | Para Web Push (opcional) | vacío = desactivado |

El script escribe todo en `backend/.env` y fija los permisos del archivo a `600` (sólo legible por el propietario).

## Cambiar la configuración posteriormente

```bash
# volver a ejecutar el asistente de terminal (sobrescribe .env):
bash deploy/setup-wizard.sh

# o editar directamente:
nano /opt/tesla-carview/backend/.env

# luego reiniciar los contenedores:
docker compose -f docker-compose.prod.yml up -d
```

## Todos los parámetros

Lista completa de variables de entorno en `backend/.env.example`:

| Variable | Obligatoria | Descripción |
|---|---|---|
| `PORT` | – | Puerto del backend (por defecto: 3000) |
| `JWT_SECRET` | ✓ | Cadena aleatoria ≥ 64 caracteres |
| `FRONTEND_URL` | ✓ | URL pública de la app |
| `TESLA_CLIENT_ID` | ✓* | Client ID de Tesla Fleet API |
| `TESLA_CLIENT_SECRET` | ✓* | Client secret de Tesla Fleet API |
| `TESLA_REDIRECT_URI` | ✓* | URL de callback OAuth |
| `TESLA_AUDIENCE` | – | Región de la Tesla API (por defecto: NA) |
| `DB_PATH` | – | Ruta al archivo SQLite |
| `ENABLE_POLLER` | – | Poller de datos del vehículo on/off |
| `ADMIN_EMAIL` | – | E-mail para Let's Encrypt |
| `VAPID_PUBLIC_KEY` | – | Clave pública de Web Push |
| `VAPID_PRIVATE_KEY` | – | Clave privada de Web Push |

*Sólo obligatoria cuando se va a conectar un vehículo Tesla.

## Generar claves VAPID

```bash
npx web-push generate-vapid-keys
```
