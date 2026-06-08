# 🔧 Configuración

> 🤖 *Esta traducción al español es asistida por IA desde [10-configuration.en.md](10-configuration.en.md). Correcciones bienvenidas vía GitHub.*

> 🇩🇪 [Auf Deutsch lesen](10-configuration.md) · 👤 [Manual de usuario](../frontend/src/handbook/handbook.en.md) · 🏠 [Índice de docs](.)

Cada variable de entorno que controla Tesla Carview. La mayoría viven en `backend/.env` (ver `backend/.env.example` como plantilla). Las entradas marcadas como **(obligatorias)** deben definirse; el resto tiene un valor por defecto razonable.

---

## 🔐 Obligatorias

| Variable | Descripción | Ejemplo |
|---|---|---|
| `JWT_SECRET` | Clave secreta para JSON Web Tokens. **≥ 32 caracteres, criptográficamente aleatoria.** | `openssl rand -hex 32` |
| `TESLA_CLIENT_ID` | Client ID del [Tesla Developer Portal](https://developer.tesla.com) | `abc123…` |
| `TESLA_CLIENT_SECRET` | Client secret del Tesla Developer Portal | `secret…` |
| `FRONTEND_URL` | URL HTTPS pública de la app — usada para el callback OAuth y el registro de passkeys | `https://carview.example.com` |
| `RP_NAME` | Nombre a mostrar en los diálogos de passkey | `Tesla Carview` |
| `RP_ID` | Dominio para WebAuthn (sin protocolo, **debe coincidir** con `FRONTEND_URL`) | `carview.example.com` |

> ⚠️ `JWT_SECRET` **no debe cambiar** en runtime o todas las sesiones quedarán inválidas. Cambiar `RP_ID` invalida todas las passkeys existentes — los usuarios tendrán que volver a registrarlas.

---

## ⚡ Tesla Fleet API

| Variable | Por defecto | Descripción |
|---|---|---|
| `TESLA_REDIRECT_URI` | `${FRONTEND_URL}/api/auth/callback` | URI de redirección OAuth. Debe introducirse exactamente igual en el Tesla Developer Portal. |
| `TESLA_API_HOST` | `fleet-api.prd.eu.vn.cloud.tesla.com` | Endpoint específico de región de la Tesla API (NA: `…na.vn.cloud.tesla.com`). |
| `TESLA_PROXY_HOST` | `host.docker.internal:4443` | Dirección de `tesla-http-proxy` para comandos firmados de vehículo. |

Pasos detallados de configuración: [04-tesla-api.en.md](04-tesla-api.en.md) (cuenta de desarrollador, registro de la app, scopes) y [09-tesla-api-usage.en.md](09-tesla-api-usage.en.md) (coste / cuota).

---

## 🔔 Web Push (notificaciones)

Se requieren claves VAPID para los push de "carga finalizada" y los recordatorios de mantenimiento. Sin ellas las notificaciones push no funcionan — todo lo demás sí.

| Variable | Por defecto | Descripción |
|---|---|---|
| `VAPID_PUBLIC_KEY` | — | Clave pública, genera con `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | — | Clave privada (mismo generador) |
| `VAPID_CONTACT` | `mailto:noreply@example.com` | URI de contacto para el servicio push (idealmente tu propio e-mail) |

---

## 🧪 Sandbox de demo

| Variable | Por defecto | Descripción |
|---|---|---|
| `DEMO_ENABLED` | `false` | Cuando es `true`: en el arranque se crea un tenant de demo separado con slug `demo`. La página de login muestra un botón "🚀 Demo starten". Límites estrictos: 1 alta por IP cada 24 h, máx. 10 testers concurrentes, cada cuenta vive 14 días. |

Detalles de operación + seguridad: [11-operations.en.md → Modo demo](11-operations.en.md#demo-mode). Los testers ven automáticamente un addendum en las páginas de privacidad / términos que documenta la eliminación incondicional tras 14 días.

---

## ⬆️ Auto-actualización

| Variable | Por defecto | Descripción |
|---|---|---|
| `AUTO_UPDATE_ENABLED` | `false` | Cuando es `true`: un cron nocturno a las ~03:30 Europe/Berlin ejecuta `git fetch origin main` y, ante un nuevo commit, ejecuta `deploy/update.sh`. Provoca un breve reinicio del contenedor — el overlay de mantenimiento lo cubre en la UI. |
| `UPDATE_REPO_DIR` | `/opt/tesla-carview` | Ruta al árbol de trabajo git sobre el que opera el auto-updater. |

Recomendado: ejecuta `deploy/update.sh` manualmente unas cuantas veces, familiarízate, y luego actívalo.

---

## ⚙️ Operaciones y rendimiento

| Variable | Por defecto | Descripción |
|---|---|---|
| `PORT` | `3000` | Puerto TCP del servidor HTTP del backend (dentro del contenedor). |
| `DB_PATH` | `/app/data/tesla-carview.db` | Ruta a la base de datos legacy — migrada como tenant `default` en el primer arranque, luego sin usar. |
| `ENABLE_POLLER` | `true` | Cuando es `false`: sin polling cíclico de la Tesla API (p. ej. para réplicas de lectura dedicadas). |
| `TESLA_DAILY_CAP` | `30` | Máximo de llamadas `vehicle_data` por vehículo por día. Persistente en BD — sobrevive a reinicios de contenedor. |
| `TESLA_MONTHLY_CAP` | `400` | Máximo de llamadas `vehicle_data` por vehículo por mes. El polling se detiene automáticamente al alcanzar el límite. |
| `NODE_ENV` | `production` | Configuración estándar de producción. `development` activa el comportamiento de dev-server. |

---

## 🌐 Frontend (`frontend/.env`)

Embebido en el bundle en **tiempo de build**. Cambiar valores requiere rebuild.

| Variable | Por defecto | Descripción |
|---|---|---|
| `VITE_FOOTER_EMAIL` | `''` | E-mail de contacto en el pie. Vacío = bloque oculto. |
| `VITE_FOOTER_ABOUT_DE` | `''` | URL de la página "sobre mí" (variante alemana). |
| `VITE_FOOTER_ABOUT_EN` | `''` | URL de la página "sobre mí" (variante inglesa). |
| `VITE_FOOTER_LINKEDIN_URL` | `''` | Perfil de LinkedIn del operador. |

El archivo está en `.gitignore`. `frontend/.env.example` es la plantilla commiteada en el repo.

---

## 🖥️ Configuración vía Admin UI (desde v3.4.0)

A partir de v3.4.0 la mayoría de los secretos ya no necesitan añadirse manualmente al `.env`. El **Asistente de configuración del admin** (Admin Hub → 🛠️) te guía por cada paso.

**Trasfondo técnico — patrón DB-antes-de-env:**
`configService.js` lee cada valor primero de `tenant_settings` (la BD SQLite del tenant), y luego cae al `.env`. Las configuraciones `.env` existentes siguen funcionando sin cambios; una vez que un valor se establece vía la UI, el valor de la BD tiene precedencia.

| Ajuste | Ruta en la UI | Variable `.env` de fallback |
|---------|---------|--------------------------|
| Tesla Client-ID | Admin Hub → 🛠️ → Credenciales Tesla | `TESLA_CLIENT_ID` |
| Tesla Client-Secret | Admin Hub → 🛠️ → Credenciales Tesla | `TESLA_CLIENT_SECRET` |
| Tesla Audience | Admin Hub → 🛠️ → Credenciales Tesla | `TESLA_AUDIENCE` |
| VAPID Public Key | Admin Hub → 🛠️ → Web Push | `VAPID_PUBLIC_KEY` |
| VAPID Private Key | Admin Hub → 🛠️ → Web Push | `VAPID_PRIVATE_KEY` |
| VAPID Contact | Admin Hub → 🛠️ → Web Push | `VAPID_CONTACT` |
| Telegram Bot Token | Admin Hub → 🛠️ → Telegram | `TELEGRAM_BOT_TOKEN` |
| xAI / Grok API Key | Admin Hub → 🛠️ → APIs externas | `XAI_API_KEY` |
| ABRP Global App Key | Admin Hub → 🛠️ → APIs externas | `ABRP_API_KEY` |

> **Generar claves VAPID:** Haz clic en "🔑 Generate new" en el Asistente de configuración del admin — no se necesita `docker exec`.

> **Telegram Bot:** Requiere un reinicio del contenedor después de definir el token por primera vez (`docker compose … up -d --build backend`). El asistente muestra un aviso.

---

## Referencia rápida: configuración mínima

```bash
# backend/.env (obligatorias)
JWT_SECRET=$(openssl rand -hex 32)
TESLA_CLIENT_ID=…
TESLA_CLIENT_SECRET=…
FRONTEND_URL=https://carview.example.com
RP_NAME="Tesla Carview"
RP_ID=carview.example.com

# Opcionales pero recomendadas
VAPID_PUBLIC_KEY=$(npx web-push generate-vapid-keys | grep Public | awk '{print $3}')
VAPID_PRIVATE_KEY=…
VAPID_CONTACT=mailto:you@example.com

# Demo sólo si quieres invitar a testers
# DEMO_ENABLED=true

# Auto-actualización sólo después de haber entendido el flujo de update
# AUTO_UPDATE_ENABLED=true
```

Tras guardar: `docker compose -f docker-compose.prod.yml up -d --build backend` — el backend lee el `.env` en el arranque.

---

## Véase también

- [02-deployment.en.md](02-deployment.en.md) — primer despliegue + nginx + Let's Encrypt
- [07-setup-wizard.en.md](07-setup-wizard.en.md) — asistente interactivo de configuración
- [11-operations.en.md](11-operations.en.md) — día a día: backup, restore, mantenimiento, demo
