🌐 **Language / Sprache / Langue / Idioma / Dil / Γλώσσα**

| | |
|---|---|
| 🇬🇧 **[English](Tesla-API-Setup)** | English version |
| 🇩🇪 **[Deutsch](DE-Tesla-API-Setup)** | Deutsche Version |
| 🇫🇷 **[Français](FR-Tesla-API-Setup)** | Version française |
| 🇪🇸 **[Español](ES-Tesla-API-Setup)** | Estás aquí |
| 🇹🇷 **[Türkçe](TR-Tesla-API-Setup)** | Türkçe sürüm |
| 🇬🇷 **[Ελληνικά](EL-Tesla-API-Setup)** | Ελληνική έκδοση |

---

# Configuración de la API de Tesla

Conectar Tesla Carview a su cuenta de Tesla requiere una **cuenta de Tesla Developer** y una **aplicación OAuth**. Este proceso tarda aproximadamente 20–30 minutos y solo debe realizarse una vez.

---

## Descripción general: ¿qué ocurre aquí?

Tesla utiliza OAuth 2.0 — el mismo estándar que se usa en "Iniciar sesión con Google". Usted crea una aplicación en el portal de desarrolladores de Tesla, que obtiene un **Client ID** y un **Client Secret**. Tesla Carview utiliza estos datos para solicitar acceso a los datos de su vehículo con su permiso.

```
Portal de Desarrolladores de Tesla
  → Registrar aplicación → obtener Client ID + Secret
  → Ingresar en Tesla Carview
  → Hacer clic en "Conectar cuenta de Tesla"
  → Se abre la página de inicio de sesión de Tesla
  → Usted aprueba el acceso
  → Tesla envía tokens a Tesla Carview
  → Los datos fluyen ✅
```

---

## Paso 1: Crear una cuenta de Tesla Developer

1. Vaya a [developer.tesla.com](https://developer.tesla.com)
2. Inicie sesión con su cuenta de Tesla habitual (la misma que usa para el automóvil)
3. Acepte los términos del desarrollador

---

## Paso 2: Registrar su aplicación

1. En el portal de desarrolladores, haga clic en **"Add New Application"**
2. Complete el formulario:

   | Campo | Qué ingresar |
   |---|---|
   | **Application Name** | Cualquier nombre descriptivo, p. ej. "Mi Tesla Carview" |
   | **Description** | "Private self-hosted Tesla data logger" |
   | **Allowed Origin URL** | `https://tesla.yourdomain.com` |
   | **Redirect URI** | `https://tesla.yourdomain.com/api/auth/tesla/callback` |
   | **Application Type** | Web Application |

3. En **Scopes**, seleccione:
   - `vehicle_device_data` — para leer el estado del vehículo
   - `vehicle_cmds` — para enviar comandos (climatización, cerraduras, etc.)
   - `vehicle_charging_cmds` — para el control de la carga
   - `offline_access` — para mantenerse conectado sin iniciar sesión cada hora

4. Haga clic en **Save**

5. Anote su **Client ID** y **Client Secret** — los necesitará en el siguiente paso

> ⚠️ **Mantenga su Client Secret en privado.** Va en su archivo `.env` y nunca debe compartirse ni subirse a git.

---

## Paso 3: Configurar la Clave Virtual (para comandos)

La Clave Virtual es el mecanismo de seguridad de Tesla para enviar comandos al automóvil. Sin ella, puede leer datos pero no controlar nada (sin arranque de climatización, sin bloqueo/desbloqueo).

Tesla Carview genera una clave automáticamente. Solo debe añadirla a su automóvil:

1. En Tesla Carview, vaya a **Ajustes → Clave Virtual**
2. Copie la URL que aparece (similar a `https://tesla.yourdomain.com/api/virtual-key/pair`)
3. Abra esa URL en el **navegador del Tesla en la pantalla táctil del automóvil** (no en su teléfono)
4. Toque **"Add key"** en la pantalla del automóvil
5. Confirme con la aplicación de Tesla en su teléfono (le pedirá que apruebe la nueva clave)

Después del emparejamiento, los comandos (climatización, bloqueo, etc.) funcionarán desde Tesla Carview.

---

## Paso 4: Ingresar las credenciales en Tesla Carview

1. Vaya a **Admin → Sistema** en Tesla Carview
2. Ingrese su **Client ID** y **Client Secret**
3. Haga clic en **Guardar**

O agréguelos directamente al archivo `.env`:

```bash
nano /opt/tesla-carview/backend/.env
```

```env
TESLA_CLIENT_ID=your-client-id-here
TESLA_CLIENT_SECRET=your-client-secret-here
```

Luego reinicie:
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d
```

---

## Paso 5: Conectar su cuenta de Tesla

1. En Tesla Carview, vaya a **Dashboard → Conectar cuenta de Tesla** (o el aviso al primer inicio de sesión)
2. Haga clic en **"Conectar con Tesla"**
3. Se le redirigirá a la página de inicio de sesión de Tesla — inicie sesión con su cuenta de Tesla
4. Tesla le pregunta a qué vehículo desea conceder acceso — seleccione su automóvil
5. Se le redirigirá de vuelta a Tesla Carview — la conexión queda establecida ✅

La aplicación consulta ahora los datos de su vehículo cada 60 segundos mientras el automóvil está activo, y suspende la consulta cuando el automóvil está aparcado y en modo de reposo (para evitar agotar la batería).

---

## Problemas habituales

### "403 Forbidden" en todas las llamadas a la API de Tesla

Su cuenta de Tesla Developer puede estar **suspendida o con límite de velocidad**. Esto ocurre si:
- Se realizaron demasiadas llamadas a la API (throttling)
- La información de facturación en el portal del desarrollador está incompleta
- Tesla ha marcado la cuenta

Revise [developer.tesla.com](https://developer.tesla.com) — si ve un aviso de facturación o suspensión, resuélvalo primero.

### El vehículo aparece como "offline" incluso cuando está en marcha

La API de Tesla tiene una limitación conocida: algunos vehículos más nuevos (especialmente los que tienen VINs XP7, como el Model Y Juniper) no devuelven datos GPS a través del endpoint estándar. Tesla Carview utiliza Fleet Telemetry para esos vehículos. Esto se configura automáticamente.

### Los comandos no funcionan ("Clave Virtual no emparejada")

→ Repita el Paso 3 anterior. Asegúrese de haber abierto la URL de emparejamiento en el **navegador del Tesla** (no en su teléfono ni en su computadora).

### "Redirect URI mismatch"

El Redirect URI en el Portal de Desarrolladores de Tesla debe **coincidir exactamente** con lo que ingresó — incluyendo `https://`, el dominio correcto y sin barra al final.

---

## Cómo funciona la consulta de datos

Tesla Carview consulta su vehículo cada 60 segundos de manera predeterminada cuando el automóvil está activo. Cuando el automóvil está en reposo (aparcado durante más de unos minutos), la consulta se reduce a cada 10 minutos para evitar despertar al automóvil (lo que agota la batería de 12V).

Puede ajustar el intervalo de consulta en el archivo `.env`:
```env
POLL_INTERVAL_MS=60000        # 60 segundos (predeterminado)
POLL_SLEEP_INTERVAL_MS=600000 # 10 minutos en reposo
```
