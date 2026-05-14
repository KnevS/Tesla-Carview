🌐 **Idioma:** [EN](Tesla-API-Setup) · [DE](DE-Tesla-API-Setup) · [FR](FR-Tesla-API-Setup) · **ES** · [TR](TR-Tesla-API-Setup) · [EL](EL-Tesla-API-Setup)

---

# Configuración de la API Tesla

Conectar Tesla Carview a tu cuenta Tesla requiere una **cuenta de desarrollador Tesla** y una **aplicación OAuth**. Este proceso tarda unos 20–30 minutos y solo hay que hacerlo una vez.

---

## Resumen: ¿Qué ocurre aquí?

Tesla usa OAuth 2.0 — el mismo estándar que "Iniciar sesión con Google". Creas una app en el portal de desarrolladores de Tesla, que obtiene un **Client ID** y un **Client Secret**. Tesla Carview los usa para solicitar acceso a los datos de tu vehículo con tu permiso.

```
Portal de Desarrolladores Tesla
  → Registrar App → obtener Client ID + Secret
  → Introducir en Tesla Carview
  → Hacer clic en "Conectar cuenta Tesla"
  → Se abre la página de inicio de sesión de Tesla
  → Apruebas el acceso
  → Tesla envía tokens a Tesla Carview
  → Los datos fluyen ✅
```

---

## Paso 1: Crear una cuenta de desarrollador Tesla

1. Ve a [developer.tesla.com](https://developer.tesla.com)
2. Inicia sesión con tu cuenta Tesla habitual (la misma que usas para el coche)
3. Acepta los términos de desarrollador

---

## Paso 2: Registrar tu aplicación

1. En el portal de desarrolladores, haz clic en **"Add New Application"**
2. Rellena el formulario:

   | Campo | Qué introducir |
   |---|---|
   | **Application Name** | Cualquier nombre descriptivo, ej. "Mi Tesla Carview" |
   | **Description** | "Registrador de datos Tesla autoalojado privado" |
   | **Allowed Origin URL** | `https://tesla.tudominio.com` |
   | **Redirect URI** | `https://tesla.tudominio.com/api/auth/tesla/callback` |
   | **Application Type** | Web Application |

3. En **Scopes**, selecciona:
   - `vehicle_device_data` — para leer el estado del vehículo
   - `vehicle_cmds` — para enviar comandos (clima, cerraduras, etc.)
   - `vehicle_charging_cmds` — para control de carga
   - `offline_access` — para mantener la conexión sin volver a iniciar sesión cada hora

4. Haz clic en **Save**

5. Anota tu **Client ID** y **Client Secret** — los necesitarás en el siguiente paso

> ⚠️ **Guarda tu Client Secret en privado.** Va en tu archivo `.env` y nunca debe compartirse ni subirse a git.

---

## Paso 3: Configurar la Virtual Key (para comandos)

La Virtual Key es el mecanismo de seguridad de Tesla para enviar comandos al coche. Sin ella, puedes leer datos pero no controlar nada (sin arrancar el clima, sin bloquear/desbloquear).

Tesla Carview genera una clave automáticamente. Solo tienes que añadirla a tu coche:

1. En Tesla Carview, ve a **Ajustes → Virtual Key**
2. Copia la URL que se muestra (parecida a `https://tesla.tudominio.com/api/virtual-key/pair`)
3. Abre esa URL en el **navegador del Tesla en la pantalla táctil del coche** (no en tu teléfono)
4. Toca **"Add key"** en la pantalla del coche
5. Confirma con la app Tesla en tu teléfono (te pedirá que apruebes la nueva clave)

Después de emparejar, los comandos (clima, bloqueo, etc.) funcionarán desde Tesla Carview.

---

## Paso 4: Introducir las credenciales en Tesla Carview

1. Ve a **Admin → Sistema** en Tesla Carview
2. Introduce tu **Client ID** y **Client Secret**
3. Haz clic en **Guardar**

O añádelos directamente al archivo `.env`:

```bash
nano /opt/tesla-carview/backend/.env
```

```env
TESLA_CLIENT_ID=tu-client-id-aqui
TESLA_CLIENT_SECRET=tu-client-secret-aqui
```

Luego reinicia:
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d
```

---

## Paso 5: Conectar tu cuenta Tesla

1. En Tesla Carview, ve a **Panel → Conectar cuenta Tesla** (o el mensaje al primer inicio)
2. Haz clic en **"Conectar con Tesla"**
3. Te redirige a la página de inicio de sesión de Tesla — inicia sesión con tu cuenta Tesla
4. Tesla pregunta a qué vehículo conceder acceso — selecciona tu coche
5. Te redirige de vuelta a Tesla Carview — la conexión está establecida ✅

La app ahora consultará los datos de tu vehículo cada 60 segundos mientras el coche esté activo, y pausará las consultas cuando el coche esté aparcado y dormido (para no agotar la batería).

---

## Problemas comunes

### "403 Forbidden" en todas las llamadas a la API Tesla

Tu cuenta de desarrollador Tesla puede estar **suspendida o con límite de velocidad**. Esto ocurre si:
- Se hicieron demasiadas llamadas a la API (throttling)
- La información de facturación en el portal de desarrolladores está incompleta
- Tesla ha marcado la cuenta

Revisa [developer.tesla.com](https://developer.tesla.com) — si ves un aviso de facturación o suspensión, resuélvelo primero.

### El vehículo aparece "offline" aunque esté circulando

La API de Tesla tiene una limitación conocida: algunos vehículos nuevos (especialmente con VINs XP7 como el Model Y Juniper) no devuelven datos GPS por el endpoint estándar. Tesla Carview usa Fleet Telemetry para esos vehículos. Esto se configura automáticamente.

### Los comandos no funcionan ("Virtual Key no emparejada")

→ Repite el Paso 3. Asegúrate de haber abierto la URL de emparejamiento en el **navegador del Tesla** (no en tu teléfono u ordenador).

### "Redirect URI mismatch"

El Redirect URI en el Tesla Developer Portal debe **coincidir exactamente** con lo que introdujiste — incluyendo `https://`, el dominio correcto y sin barra al final.

---

## Cómo funciona la consulta de datos

Tesla Carview consulta tu vehículo cada 60 segundos por defecto cuando el coche está activo. Cuando el coche está dormido (aparcado más de unos minutos), la frecuencia baja a cada 10 minutos para evitar despertar el coche (que agota la batería de 12V).

Puedes ajustar el intervalo de consulta en el archivo `.env`:
```env
POLL_INTERVAL_MS=60000        # 60 segundos (por defecto)
POLL_SLEEP_INTERVAL_MS=600000 # 10 minutos cuando está dormido
```
