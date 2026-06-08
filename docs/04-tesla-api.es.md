# Configurar la Tesla Fleet API

> 🤖 *Esta traducción al español es asistida por IA desde [04-tesla-api.en.md](04-tesla-api.en.md). Correcciones bienvenidas vía GitHub.*

> 🇩🇪 [Auf Deutsch lesen](04-tesla-api.md)

## Estrategia de fuentes de datos (Telemetry primero, polling como fallback)

Desde el cambio al poller híbrido (2026-05) Tesla Carview prefiere
**Fleet Telemetry (push)** frente al polling. Ambas rutas están activas, pero
el poller cae automáticamente a modo heartbeat en cuanto Telemetry transmite
para un vehículo:

| Ruta | Latencia | Coste | Requisito previo |
|---|---|---|---|
| **1. Fleet Telemetry (WebSocket push)** | 1–5 s en vivo | gratis | Virtual key aprobada + endpoint HTTPS + whitelisting de Tesla por VIN |
| **2. Fleet API polling (pull)** | 30 s online / 5 min en reposo | presupuesto $ por llamada | sólo token OAuth |
| **3. Polling heartbeat** | 1×/h | mínimo | Se activa automáticamente cuando Telemetry está activa para un VIN |

Implementación: `backend/src/services/poller.js`, servidor de streaming en
`backend/src/services/fleetTelemetry.js`, indicador de estado por VIN en
Ajustes → ⚡ Conexión Tesla → 📡 Fleet Telemetry.

> Fleet Telemetry requiere aprobación de Tesla por **client ID de la aplicación**
> en el Developer Portal. Sin aprobación la API de configuración devuelve
> HTTP 404 — la ruta de polling como fallback sigue funcionando.

## Crear una cuenta de Tesla Developer

1. Crea una cuenta en https://developer.tesla.com
2. Crea una nueva aplicación:
   - **Name**: Tesla Carview (o lo que prefieras)
   - **Allowed Origins**: `https://your-domain.com`
   - **Allowed Redirect URIs**: `https://your-domain.com/api/auth/callback`
3. Anota el **Client ID** y el **Client Secret**


---

## Configurar el .env

```env
TESLA_CLIENT_ID=your-client-id
TESLA_CLIENT_SECRET=your-client-secret
TESLA_REDIRECT_URI=https://your-domain.com/api/auth/callback
TESLA_AUDIENCE=https://fleet-api.prd.na.vn.cloud.tesla.com
```

> **Regiones**:
> - Norteamérica: `fleet-api.prd.na.vn.cloud.tesla.com`
> - Europa: `fleet-api.prd.eu.vn.cloud.tesla.com`
>
> Elige la región que coincida con la ubicación de tu vehículo.

---

## Conectar un vehículo Tesla

Tras iniciar sesión en la app, haz clic en el enlace **"Conectar Tesla"**
(o directamente: `https://your-domain.com/api/auth/tesla/login`).

Serás reenviado a la página de login de Tesla. Tras conceder acceso, el vehículo
se detecta automáticamente y comienza la sincronización.

---

## Permisos (scopes OAuth)

| Scope | Finalidad |
|---|---|
| `openid` | Identidad Tesla |
| `offline_access` | Refresh token (sin tener que iniciar sesión repetidamente) |
| `vehicle_device_data` | Leer datos de viaje, estado de carga, batería |
| `vehicle_cmds` | Comandos al vehículo (sólo con Virtual Key) |
| `vehicle_charging_cmds` | Comandos de carga |
| `vehicle_location` | Posición GPS |

---

## Comandos del vehículo (Virtual Key)

Para comandos como climatización, bocina o puertas se necesita además una **Virtual Key**.
El proxy `tesla-http-proxy` firma los comandos criptográficamente — Tesla sólo acepta
comandos firmados con la clave emparejada.

### Pasos de configuración

1. **Generar un par de claves**:
   ```bash
   openssl ecparam -name prime256v1 -genkey -noout -out tesla_priv.pem
   openssl ec -in tesla_priv.pem -pubout -out tesla_pub.pem
   ```

2. **Publicar la clave pública** en:
   `https://your-domain.com/.well-known/appspecific/com.tesla.3p.public-key.pem`

3. **Instalar `tesla-http-proxy`** e iniciarlo:
   ```bash
   # descarga el binario desde https://github.com/teslamotors/vehicle-command
   tesla-http-proxy -port 4443 -host 0.0.0.0 \
     -tls-key server.key -cert server.crt \
     -key-file tesla_priv.pem
   ```

4. **Registrar la Virtual Key en el vehículo** mediante la app (Ajustes → Virtual Key).

> **Importante**: la clave privada (`tesla_priv.pem`) y la clave pública
> (`.well-known/…`) deben permanecer emparejadas. Una nueva clave privada
> requiere otro emparejamiento en el vehículo.


---

## Intervalo de polling

El poller integrado consulta la Tesla API:
- **Cada 30 segundos** cuando el vehículo está activo (conduciendo o cargando)
- **Cada 5 minutos** cuando el vehículo está dormido (estado 408)

El poller **no despierta al vehículo** — se respeta el estado de reposo para preservar la batería.

Desactivar el poller (p. ej. para pruebas): `ENABLE_POLLER=false` en el `.env`.

---

## Particularidad del VIN XP7

Los vehículos con prefijo de VIN `XP7` (p. ej. Model Y Juniper) no soportan el
parámetro `?endpoints=…` en `/vehicle_data`.

**Workaround**: llama a `/vehicle_data` sin el parámetro `endpoints` — devuelve
`charge_state`, `climate_state` y `vehicle_state`.

El GPS vía `drive_state` no está disponible para estos vehículos a través de la API REST;
el GPS llega en su lugar desde Fleet Telemetry.
