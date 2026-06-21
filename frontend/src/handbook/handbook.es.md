# 📖 Manual de Tesla Carview

> ℹ️ **Nota para administradores y auto-alojadores:** Este manual describe la app desde la perspectiva del usuario. Instalación, variables de entorno, copias de seguridad/restauración, mantenimiento nocturno y la activación del modo demo se documentan en la **documentación técnica** de la carpeta [`docs/`](https://github.com/KnevS/Tesla-Carview/blob/main/docs/README.en.md) (en inglés), especialmente [10-configuration](https://github.com/KnevS/Tesla-Carview/blob/main/docs/10-configuration.en.md) y [11-operations](https://github.com/KnevS/Tesla-Carview/blob/main/docs/11-operations.en.md).
>
> 📚 **¿Nuevo en Tesla Carview?** El **[Wiki de GitHub](https://github.com/KnevS/Tesla-Carview/wiki)** ofrece una introducción guiada: instalación paso a paso, acceso a la red sin IP estática (DynDNS, Cloudflare Tunnel), almacenamiento Raspberry Pi (SSD en lugar de tarjeta SD) — escrito para no expertos en informática.

Versión 2.1 · Auto-alojado · Multi-inquilino

## 🌟 Visión general {#overview}

Tesla Carview es una aplicación **auto-alojada** de registro de datos para vehículos Tesla. Todos los datos permanecen exclusivamente en tu propio servidor: sin nube, sin compartir datos. La aplicación es completamente **responsive** y funciona en **iPhone/iPad (Safari)**, smartphones Android y navegadores de escritorio.

**Funciones de un vistazo:**

- 🚗 **Libro de viajes** — Tracks GPS, consumo, categorización del tipo de viaje
- ⚡ **Carga** — Sesiones de carga con costes, detección de ubicación por GPS
- 🔋 **Batería** — Seguimiento de la degradación, historial de autonomía, curva de carga, eficiencia vs temperatura, descarga fantasma, detección de anomalías (Companion Fase 1, estadística pura, local)
- 📊 **Panel** — Estadísticas, vista mensual, últimas actividades
- 🎮 **Control** — Climatización, puertas, luces, directamente desde la aplicación
- 📝 **Libro de mantenimiento** — Mantenimientos, reparaciones, costes con fecha
- 📤 **Exportación** — CSV/JSON/**PDF** para viajes, CSV para carga, copia completa como ZIP; libro de viajes PDF listo para imprimir con fecha, distancia, energía y SOC
- 🔔 **Notificaciones** — tres canales en paralelo: Web Push (navegador/PWA), bot de Telegram y **email** (SMTP). Disparadores: carga terminada, alarma Sentry, batería baja, mantenimiento, geocerca y más. Push con botones de acción (iniciar climatización, buscar cargador, posponer), agrupación por tag y reflejo a iPhone/Apple Watch
- 📊 **Resumen semanal de viajes** — cada lunes a las 07:00 hora local, automático vía push/Telegram/email: km de la semana, consumo, coste de carga y tendencia frente a la semana anterior
- 🌱 **Balance CO₂** — página dedicada que calcula el CO₂ ahorrado vs. un vehículo de combustión equivalente (red DE vs. 6,5 l gasolina/100 km); equivalentes en árboles/año y vuelos ida y vuelta Fráncfort–Mallorca
- 📱 **Optimizado para móvil** — Totalmente usable en iPhone/iPad (Safari), Android y escritorio

## 🔀 Orden de clasificación {#sort-order}

Todas las listas con entradas cronológicas (viajes, sesiones de carga, entradas del libro de mantenimiento, facturación, eventos de auditoría, lista de usuarios, versiones de textos legales) tienen un **conmutador de orden** en la esquina superior derecha. Un clic alterna entre:

- ↓ **Más recientes primero** (predeterminado)
- ↑ **Más antiguos primero**

El orden elegido se **guarda por vista en tu navegador** (`localStorage`) y persiste tras recargar y cerrar la pestaña — puedes configurarlo de forma diferente para cada lista (p. ej., libro de viajes «más recientes arriba», lista de usuarios «último inicio de sesión al final»).

## ⚠️ Estado de la API de Tesla en 2026 {#tesla-api-2026}

En mayo/junio de 2026, Tesla cerró la Owner API no oficial para los endpoints de vehículo. Quien usaba el workaround comunitario (refresh token de la cuenta Tesla) ahora obtiene **HTTP 401 «invalid bearer token»** en lugar de los datos del vehículo. Tesla Carview saca dos conclusiones claras:

### Tres fuentes de datos de un vistazo

| Fuente | Lo que obtienes | Esfuerzo de configuración | Coste |
| --- | --- | --- | --- |
| **Tesla Fleet API** | Batería, clima, GPS en vivo, TPMS, comandos | Aprobación de app en [developer.tesla.com](https://developer.tesla.com), espera semanas–meses | normalmente 0 €/mes — Tesla concede 10 $ de crédito gratuito por cuenta, cubre el uso privado típico con un coche + telemetría streaming. Por encima, pago por uso. |
| **OwnTracks** (smartphone) | Trayectoria GPS, detección de viajes, distancia | ~5 min en el asistente + instalación de la app | gratis |
| **Entrada manual** | Datos base sin API (el libro de viajes funciona) | < 1 min en el asistente | gratis |

**Importante:** las tres vías pueden funcionar en paralelo — OwnTracks te da inmediatamente un libro de viajes GPS completo, la entrada manual evita esperar la sincronización Tesla, la Fleet API añade luego datos de batería y clima.

### Configuración de OwnTracks (recomendada, disponible inmediatamente) {#owntracks-setup}

1. **Asistente admin** → paso «GPS smartphone (OwnTracks)» → «Agregar nuevo dispositivo» → elige etiqueta, vehículo, conductor.
2. **Escanear el código QR**: tras la creación se muestra un código QR. Escanéalo **con la cámara nativa del iPhone** (¡NO con la app OwnTracks!) → «Abrir en OwnTracks» → confirma la importación de configuración.
3. Pon el **acceso a ubicación en «Siempre»** en los ajustes iOS → OwnTracks. Si no, no hay GPS en segundo plano.
4. En cuanto el conductor circula a más de 5 km/h, se inicia un viaje automáticamente. 5 minutos de parada lo terminan.

**Para usuarios sin permisos de admin**: cada conductor tiene su propia página en «📱 Mi GPS» para añadir + escanear el QR — sin ayuda del admin.

### Entrada manual de vehículo {#manual-vehicle}

En el paso «Vehículos» del asistente hay dos tarjetas lado a lado: «☁ Sincronización Tesla (cloud)» y «✍ Entrada manual». La variante manual:

- Funciona sin acceso a la API de Tesla
- Campos: etiqueta (obligatoria), matrícula, VIN (opcional — VIN sintético «MANUAL…» en caso contrario), modelo, odómetro inicial
- El usuario creador se añade automáticamente como conductor → puede registrar un dispositivo OwnTracks de inmediato
- El odómetro inicial también se escribe en el campo odómetro actual — el cálculo TCO funciona desde el primer día

### Cabina TCO (coste total de propiedad) {#tco-cockpit}

Bajo `/tco` ves el coste total real por vehículo y un valor €/km honesto. Cuatro tarjetas KPI:

- **Coste por km** — coste total ÷ km recorridos
- **Coste total** — suma de todos los conceptos
- **Depreciación** — compra − precio de venta (o valor residual estimado: depreciación lineal en 8 años hasta el 25 %)
- **Coste eléctrico** — desde las sesiones de carga

Desglose detallado debajo con porcentajes + CRUD de entradas de mantenimiento (inspección, neumáticos, reparación, ITV, accesorios, otros) + formulario de datos base (precio/fecha de compra, venta, seguro, impuesto vehículo, km inicial).

### Asistente IA: Ollama o Grok {#ai-provider}

En el asistente admin → «APIs externas» → proveedor IA:

- **🏠 Ollama** (predeterminado, soberanía de datos): LLM local ejecutado en tu propio hardware. Recomendaciones de modelo por clase de hardware (Pi 4: `llama3.2:1b`, Pi 5: `qwen2.5:3b`, VPS: `llama3:8b`). Instalación de modelo desde el asistente vía barra de progreso SSE. **Los datos NUNCA salen de la instancia.**
- **☁ Grok** (cloud): API de xAI Grok — más rápido, pero cada solicitud va a servidores US. Clave API de xAI requerida, guardián de presupuesto diario incluido.
- **⊝ Apagado**: chat IA completamente desactivado.

En hosts con < 4 GB RAM desactiva Ollama vía `docker-compose.override.yml` con `services.ollama.profiles: [disabled]`.

### Mi GPS — autoservicio para conductores {#my-gps}

Cada usuario autenticado tiene su propia página en `/my-tracking` («📱 Mi GPS» en la navegación):

- Lista de los dispositivos OwnTracks **propios** (el conductor ve solo los suyos, el admin todos)
- Código QR para configuración directa, recuperable en cualquier momento (sin más problema de token perdido)
- Selección de vehículo filtrada a vehículos con derechos de acceso — sin envío GPS accidental a otros coches

## 🔋 Panel salud de batería (Companion Fase 1) {#battery-health}

**Salud y pronóstico (v3.27–v3.28):** proyección lineal de la autonomía normalizada al 100 % con banda de confianza (degradación anual, autonomía en 3 años, tiempo hasta el 80 %), más un aviso de consumo en reposo ante un aumento sostenido. Estadística pura, sin IA.

Desde v3.6.0, `/battery` ofrece seis secciones que responden honestamente a las preguntas clave sobre la batería — **solo estadística, sin IA, sin salida de datos**:

1. **Historial de autonomía** — curva móvil del rated_range máx.
2. **Degradación** — diferencia entre primera y última medición, codificada por color (verde <5 %, amarillo <10 %, rojo ≥10 %).
3. **Curva de carga** — potencia máxima media agrupada en cuatro bandas de SOC (0-20 %, 20-50 %, 50-80 %, 80-100 %) y dispersión kW vs SOC inicial. Valores más bajos por encima del 80 % son normales (tapering); las anomalías en 20-50 % pueden indicar problemas BMS.
4. **Eficiencia vs temperatura exterior** — kWh/100 km en intervalos de 5 °C a partir de tus trayectos. Hace visible el coste invernal.
5. **Descarga fantasma** — pérdida de SOC por hora en parado. Excluye ventanas de trayecto y carga. Mediana + media arriba, top-10 eventos en tabla. >1 %/h es destacable (sentry, updates, preacondicionamiento).
6. **Anomalías** — saltos SOC >10 % sin trayecto/carga, saltos de autonomía >30 km, eficiencia atípica (>35 o <7 kWh/100km).

**Fuentes**: `battery_snapshots`, `trips`, `charging_sessions` — todo desde tu propia SQLite. Sin llamadas externas, sin nube, sin modelo. El cálculo se ejecuta en el servidor en `backend/src/routes/battery.js`.

**Selector de vehículo**: todas las secciones reaccionan al vehículo seleccionado.

### Companion Fase 2 (desde v3.7.0) {#companion-phase-2}

Dos nuevas secciones en `/battery`, ambas a partir de sus datos existentes:

- **Alertas Companion**: anomalías persistentes. El motor Companion se ejecuta cada noche (dentro de la higiene `nightlyMaintenance`) y cada 6 horas — cada nueva anomalía se notifica una vez (Web Push + Telegram si está vinculado). Cada alerta tiene "✓ Marcar como vista" y "✕ Descartar".
- **Sugerencia de preacondicionamiento**: si la temperatura prevista para mañana en su hora habitual de salida (aprendida de los últimos 30 días de viajes) está por debajo de 5 °C o por encima de 30 °C, llega una sugerencia push con la razón concreta. Fuente meteo: [Open-Meteo](https://open-meteo.com/) — gratis, sin cuenta.

**Flujo de datos totalmente local**: la llamada meteo es la única solicitud externa (solo lat/lon, sin cuenta). Las anomalías y sugerencias aterrizan en dos nuevas tablas `battery_anomalies` y `precondition_suggestions` (idempotente vía restricción UNIQUE).

**Fase 3 (hoja de ruta)**: chat companion profundo a través de Ollama — sigue siendo local.

## 📋 Requisitos {#requirements}

### Servidor

- Servidor Linux (x86_64, ARM64 o ARMv7) con al menos 1 GB de RAM
- Docker + Docker Compose (los instala el script de configuración)
- Dominio accesible públicamente + certificado TLS (requerido por la API de Tesla)
- El puerto 443 (HTTPS) debe ser accesible desde fuera

### Cuenta Tesla Developer

- Registro en `developer.tesla.com`
- Crear una app → anotar Client ID y Client Secret
- URL de callback: `https://<tu-dominio>/api/auth/callback`
- Para los comandos del vehículo: solicitar acceso a la Fleet API (gratis, 1–3 días laborables)
- **El registro de socio único con Tesla lo gestiona el asistente automáticamente** (desde la v3.23.5) — solo introduces Client ID + Secret, sin necesidad de llamada `curl` manual.

## 🚀 Instalación {#installation}

El script de instalación instala todo automáticamente: Docker, nginx, TLS, tesla-http-proxy.

```bash
# Como root en el servidor de destino:
curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash

# El script pregunta de forma interactiva:
# → Dominio (p. ej. carview.miservidor.com)
# → Tesla Client ID y Client Secret
# → Tesla Redirect URI
# → JWT Secret (se genera automáticamente)
```

> **Alternativa: configuración manual**
>
> Copia `.env.example` → `.env` y ajusta todos los valores. Luego: `docker compose -f docker-compose.prod.yml up -d`

## ⚙️ Configuración inicial en el navegador {#first-setup}

1. **Abrir el navegador** — Abre `https://<tu-dominio>/setup`; se te redirigirá automáticamente.
2. **Crear inquilino** — Elige un nombre de inquilino (p. ej. «Familia Pérez») y un identificador corto (p. ej. «perez»). El identificador es necesario al iniciar sesión: anótalo.
3. **Crear cuenta de administrador** — Define usuario y contraseña. La contraseña debe tener al menos 12 caracteres. Recomendación: una passphrase de 4 palabras.
4. **Asistente de configuración** — Tras el primer inicio de sesión, el asistente se lanza automáticamente y te guía por todos los pasos críticos (ver abajo).

## 🧙 Asistente de configuración {#settings-wizard}

Tras el primer inicio de sesión, el **asistente de configuración** se abre automáticamente. Puede relanzarse en cualquier momento desde **Ajustes → Iniciar asistente**.

**Para admins**, el asistente guía por 16 pasos en el orden correcto de dependencias:

| Paso | Descripción |
|------|-------------|
| **Idioma** | Seleccionar el idioma de la app |
| **Credenciales de Tesla** | Introduce Client ID + Secret — TeslaView **registra entonces la app con Tesla automáticamente** (1 clic, sin `curl`); el dominio detectado se confirma una vez |
| **Tesla OAuth** | Conectar cuenta Tesla — el botón abre un popup que se cierra tras el inicio de sesión |
| **Vehículos** | Sincronizar vehículos desde la cuenta Tesla |
| **Clave virtual** | Mostrar y copiar el enlace de registro para el smartphone |
| **Fleet Telemetry** | Activar seguimiento GPS por vehículo |
| **Precio electricidad** | Precio de carga en casa (€/kWh) por vehículo |
| **Verificación legal** | Escaneo automático de marcadores de posición abiertos en textos legales |
| **APIs externas** | OCM, HERE Maps, Grok/xAI |
| **Monitorización** | Auto-curación + correo de alerta |
| **Diseño → Resumen** | Preferencias; todos los cambios se guardan en el último paso |

> **Consejo:** Cada paso puede omitirse — el asistente puede relanzarse en cualquier momento.

> **🌐 Selector de idioma:** Cada asistente muestra un selector de idioma compacto arriba a la derecha. El idioma guardado en el perfil de usuario o el predeterminado del tenant se aplica automáticamente al iniciar sesión; el selector permite cambiar el idioma a mitad del asistente sin salir de él.

## 🔑 Configurar la Virtual Key {#virtual-key}

Para los comandos del vehículo (abrir puertas, climatización, etc.) debe registrarse una Virtual Key en el coche. Esto solo es necesario en vehículos más nuevos (`vehicle_command_protocol_required: true`).

1. Asegúrate de que **tesla-http-proxy** está en marcha:

   ```bash
   systemctl status tesla-http-proxy
   ```

2. En el iPhone, abre en Safari: `https://tesla.com/_ak/<tu-dominio>`
3. La app de Tesla pregunta «¿Permitir esta app?» → confirmar
4. Mantente dentro del alcance Bluetooth del coche; la clave se acepta en menos de 30 segundos
5. Verifica en **Ajustes → Conexión del vehículo → Estado de Virtual Key**

## ⚡ Lugares de carga y costes {#charging-locations}

**Progreso de carga, coste por lugar y mejores franjas (v3.24–v3.26):** cada sesión muestra con « 📈 Ver progreso » su curva de potencia/estado de carga y las cifras clave, más una estimación del consumo de red. La sección « Coste por lugar » agrega por lugar (cargas, kWh, coste total, precio medio €/kWh). Con un proveedor de precios (aWattar/Tibber) conectado en Ajustes → Tarifa, « Mejores franjas de carga » muestra el precio actual y la mejor franja de 4 h/8 h de las próximas 24 h. Estadística pura.

Los lugares de carga se detectan automáticamente por GPS y se vinculan a un precio por kWh.

**Detección automática por GPS** — Si un lugar de carga está configurado con coordenadas GPS y un radio (200 m por defecto), al iniciar la carga se detecta automáticamente el lugar correspondiente y se aplica el precio/kWh almacenado.

**Crear un lugar de carga** — En **Carga → Lugares**: introduce nombre, tipo (Casa/Oficina/Público), precio/kWh, coordenadas GPS y radio de detección.

**Ajustar costes manualmente** — En la lista de cargas: clic en una sesión → editar costes. También se pueden poner a 0 (p. ej. carga gratuita).

**✕ Marcar una carga como gratuita** — En el **historial de cargas**, cada sesión tiene un pequeño botón *«✕ gratis»*. Las cargas marcadas así aparecen en gris con la etiqueta *«gratis»* y se **excluyen automáticamente del cálculo de carga doméstica**, tanto en los resúmenes mensuales como en el análisis individual.

Caso de uso típico: cargas en el lugar de trabajo pagadas por la empresa, que no deben formar parte de la cuenta privada. Con el botón *«↩ pagar»* la marca puede revertirse en cualquier momento.


### Límite de carga automático (desde v3.12.0)

Cada lugar puede llevar un límite de carga deseado (p. ej. 80 %). Al final del trayecto TeslaView comprueba si la posición está en el radio:
- Fleet API activa → envía `set_charge_limit` al coche inmediatamente
- Sin Fleet API → notificación push sugiriendo ajuste manual

El botón «🔋 Aplicar ahora» dispara el comando manualmente. Tesla recomienda 70-80 % para carga diaria, 50-60 % para almacenamiento largo, 100 % solo para viajes largos.

## 🔐 Seguridad {#security}

- 🔑 **Passkey / WebAuthn** — Inicio de sesión sin contraseña con huella digital, Face ID o llave hardware
- 📱 **Inicio de sesión QR para el coche** — Token de un solo uso (60 s) creado en los ajustes, escaneable con el navegador Tesla u otro dispositivo — sin tener que escribir contraseña en el coche
- 📱 **TOTP MFA** — Autenticación de dos factores con app de autenticación
- 🛡️ **Bloqueo de cuenta** — La cuenta se bloquea durante 15 min tras 5 intentos fallidos
- 🍪 **Refresh token** — Cookie httpOnly, válida 7 días, rotación automática
- 📋 **Registro de auditoría** — Se registran todos los inicios de sesión, cambios y eventos de seguridad
- 🔒 **HTTPS + HSTS** — TLS 1.2/1.3, HSTS, OCSP stapling, cabeceras seguras

**Configuración de seguridad recomendada:**

- Activar MFA (TOTP) tras el primer inicio de sesión
- Configurar passkey para inicio de sesión sin contraseña
- Realizar copias de seguridad con regularidad (exportación)
- Contraseña fuerte: al menos 16 caracteres o passphrase de 4 palabras

**MFA obligatoria para nuevos usuarios.** Las cuentas nuevas se crean por defecto con la marca `MFA obligatoria` — al iniciar sesión por primera vez, la aplicación redirige automáticamente al usuario a **`/mfa/setup`** y solo le permite continuar tras configurar TOTP. Los administradores pueden desactivar o reactivar la obligatoriedad en la ficha del usuario (**Admin → Usuarios**). Las cuentas de administrador no están obligadas a activar la MFA, pero es muy recomendable.

## 🏢 Multi-inquilino {#multitenancy}

Tesla Carview admite varios inquilinos totalmente aislados en una misma instancia. Cada inquilino tiene su propia base de datos: un inquilino nunca puede ver los datos de otro.

**Crear inquilinos (enlace de invitación)** — Los nuevos inquilinos solo pueden registrarse mediante un **enlace de invitación**. Un administrador genera el enlace en **Admin → Usuarios → Crear enlace de invitación** y puede adjuntar una **nota** opcional (p. ej. «para Juan Pérez, empresa XY») para identificar la invitación más adelante. El enlace es válido durante 7 días y solo puede usarse una vez. Sin un enlace válido, `/register` está bloqueado. Las invitaciones existentes pueden **reemitirse** (misma nota, nuevo token), **bloquearse** (siguen visibles pero ya no son utilizables) o **eliminarse** definitivamente.

**Varios vehículos por inquilino** — Todos los vehículos de una cuenta Tesla se importan automáticamente al sincronizar. En **Ajustes → Conexión Tesla → 🔄 Sincronizar vehículos** la sincronización puede dispararse manualmente en cualquier momento; útil cuando se ha añadido un nuevo vehículo a la cuenta. Cambia entre vehículos en la parte superior derecha de la barra de navegación.

**Inicio de sesión con identificador de inquilino** — Con varios inquilinos aparece un campo de inquilino al iniciar sesión. Con uno solo, se detecta automáticamente.

**Gestión de usuarios** — Los administradores pueden crear más usuarios dentro de su inquilino y asignarles vehículos en **Admin → Usuarios**. Por usuario se pueden ajustar tres permisos:

- **Editar vehículos** — Permite al usuario modificar los datos básicos del vehículo (nombre, matrícula, color, tarifa eléctrica, configuración de Monta). Por defecto para usuarios nuevos: desactivado.
- **Añadir vehículos** — Permite al usuario sincronizar nuevos vehículos desde la cuenta de Tesla. Por defecto: desactivado.
- **MFA obligatoria** — Fuerza la configuración de TOTP en el primer inicio de sesión (ver Seguridad arriba). Por defecto para usuarios nuevos: activado.

Los administradores tienen estos tres derechos de forma implícita: las casillas se ocultan en las cuentas de administrador. Además, en la cabecera de la página de gestión de usuarios aparece una **tarjeta de tareas** naranja en cuanto un usuario activo (no admin) no tiene ningún vehículo asignado, con botones rápidos para asignar un vehículo o conceder el derecho «Añadir vehículos».

**Pseudónimo de inquilino (capa de privacidad)** — La página pública de inicio de sesión **no muestra** el nombre real del inquilino, sino un pseudónimo aleatorio de tipo `adjetivo-sustantivo` como `brave-eagle` o `quiet-otter`. Así nadie desde fuera puede saber qué persona o empresa usa este auto-hospedaje.

- El pseudónimo se **asigna automáticamente** al crear el inquilino.
- Revísalo en **Ajustes → 🔐 Pseudónimo del inquilino**.
- El botón **«Regenerar»** asigna uno nuevo; el anterior pasa al historial y no se volverá a sugerir por azar.
- **Recuérdalo.** Con varios inquilinos, el pseudónimo es tu único identificador de inicio de sesión — guárdalo junto a la contraseña en tu gestor de contraseñas. Perderlo sin copia de seguridad implica empezar desde un entorno vacío.
- El **slug interno** y el nombre real permanecen en la base y siguen visibles para los administradores — solo la página de inicio de sesión está anonimizada.

## 💾 Copia de seguridad {#backup}

**Exportación manual** — En **Exportación**: CSV, JSON o **PDF** para viajes (libro de viajes PDF con tabla, resumen y saltos de página), CSV para sesiones de carga, además de copia completa como ZIP.

**Copia automática (servidor)** — Las bases de datos SQLite se encuentran en el directorio bind-mount `./data` (relativo al archivo Compose, normalmente `/opt/tesla-carview/data`). Para copias automáticas en el servidor:

```bash
# Copia diaria a las 3 (crontab -e):
0 3 * * * cp /opt/tesla-carview/data/master.db /opt/tesla-carview/data/tenants/*.db /backup/
```

La **copia de seguridad integrada** (Admin → Gestión de datos → «Backup erstellen») exporta las 26 tablas en JSON, incluidas las credenciales de passkey. Tras restaurar en el mismo servidor, las passkeys registradas vuelven a funcionar de inmediato.

> ⚠️ **Importante antes de borrar**
>
> Crea siempre una exportación antes de borrar datos. Los datos eliminados no pueden recuperarse.

## ⚡ Configuración de la Tesla Developer API {#tesla-api}

Tesla Carview se comunica a través de la **Tesla Fleet API** oficial. Para ello necesitas una cuenta Tesla Developer gratuita y una app registrada.

### Paso 1 – Crear cuenta de desarrollador

1. Entra en `developer.tesla.com` e inicia sesión con tu cuenta Tesla.
2. Acepta los Developer Terms of Service.
3. Haz clic en **Create Application**.

### Paso 2 – Configurar la app

1. **Application Name:** cualquier nombre, p. ej. *Tesla Carview*
2. **Description:** descripción breve (obligatorio)
3. **Allowed Origin:** la URL pública de tu app, p. ej.

   ```
   https://carview.example.com
   ```

4. **Redirect URI:** la URL de callback de la app:

   ```
   https://carview.example.com/api/auth/callback
   ```

5. **Scopes (necesarios):** `vehicle_device_data`, `vehicle_cmds`, `vehicle_charging_cmds`, `vehicle_location`, `openid`, `offline_access`
6. ⚠ `vehicle_location` es obligatorio para el seguimiento GPS (Fleet Telemetry)

### Paso 3 – Anotar las credenciales

Tras crearla obtendrás:

- **Client ID** — una cadena tipo UUID
- **Client Secret** — visible una sola vez; cópialo y guárdalo en un lugar seguro de inmediato

```env
TESLA_CLIENT_ID=abc123def456...
TESLA_CLIENT_SECRET=tsl_secret_...
```

Pon estos valores en el archivo `.env` o introdúcelos en el asistente de configuración interactivo.

### Paso 4 – Solicitar acceso a la Fleet API (para comandos)

Para que los comandos del vehículo (climatización, puertas, carga) funcionen, tu app debe estar registrada como *socio* en Tesla. Esto se hace una sola vez vía:

```
POST https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/partner_accounts
```

El script de configuración lo hace automáticamente si `FRONTEND_URL` está definido. De lo contrario, hazlo manualmente con Postman o curl. La activación tarda entre 1 y 3 días laborables.

### Paso 5 – Conectar dentro de Tesla Carview

1. Tras iniciar sesión: **Ajustes → Conexión Tesla → Reconectar Tesla**
2. Se te redirigirá a Tesla; deberás iniciar sesión y conceder permisos a la app.
3. Tras la redirección: **Ajustes → 🔄 Sincronizar vehículos**
4. Todos los vehículos de la cuenta Tesla aparecen en la app.

### Paso 6 – Activar Fleet Telemetry (seguimiento GPS)

En vehículos más nuevos (p. ej. Model Y desde 2024, VIN XP7) los datos GPS llegan exclusivamente vía **Fleet Telemetry**, no por la API REST. Hacen falta dos pasos puntuales:

1. **Registrar la app en Tesla** — Ajustes → Fleet Telemetry → pulsa *«🔑 Registrar app en Tesla»*. Solo una vez.
2. **Solicitar acceso a Fleet Telemetry** — Si el siguiente paso falla con «HTTP 404», Tesla aún no ha habilitado el endpoint. En tal caso contacta con Tesla Developer Support (ver más abajo).
3. **Activar la telemetría** — Ajustes → Fleet Telemetry → pulsa *«📡 Activar telemetría»*. Configura el vehículo para que transmita GPS, velocidad y datos de batería.

**Solicitar acceso a Fleet Telemetry al soporte de Tesla**

Si el paso 2 falla con 404, envía la siguiente solicitud al formulario de Tesla Developer Support (`developer.tesla.com/dashboard → Support Inquiry`):

```
Subject: Fleet Telemetry Access Request – Self-Hosted App for Personal Use

Hello Tesla Developer Support,

I am requesting approval for fleet_telemetry_config access for a
self-hosted application used exclusively for personal purposes
(own vehicle, single user).

Context:
- App name: MyCarviewApp
- Client ID: a1b2c3d4-0000-0000-0000-e5f6a7b8c9d0
- Hosting: self-hosted on private infrastructure
- User scope: single user (vehicle owner)
- Vehicle VIN: 5YJ3E1EA1NF000000

Current status:
- OAuth, polling, charging control, and vehicle commands work.
- fleet_telemetry_config returns HTTP 404.

Use case:
Personal monitoring of my own vehicle (location, charging state,
drive state) via my self-hosted backend. No third-party access,
no commercial use, no data sharing.

Could you please review and enable fleet_telemetry_config?

Thank you
```

⚠ Sustituye Client ID y VIN por tus propios valores. Tesla suele responder en pocos días.

### Entender los costes de la API

**Importante antes:** Tesla concede **10 $ de crédito gratuito por cuenta al mes** (estado 2026) — suficiente para **un vehículo con Fleet Telemetry + algunos comandos/wakes al día**. En uso privado típico la factura Fleet API queda en **0 €**. Por encima, pago por uso: Streaming 150.000 señales = 1 $, Comandos 1.000 = 1 $, Polling 500 requests = 1 $, Wakes 50 = 1 $ (la acción más cara). Sin Fleet Telemetry la app consulta en segundo plano:

| Estado | Intervalo | Llamadas/día |
|--------|-----------|--------------|
| Conduciendo | 30 s | hasta 2.880 |
| En línea, parado | 10 min | hasta 144 |
| Sin conexión / dormido | 45 min | hasta 32 |
| Con Fleet Telemetry | Heartbeat 1 h | 24 |

**Límite diario:** máx. 80 llamadas/vehículo/día por defecto, luego pausa hasta medianoche.

**Reducir costes:** configurar Fleet Telemetry (streaming en lugar de polling, ~5 $/mes fuera del crédito gratuito, 0 $ con crédito), activar límite mensual en Ajustes → Conexión Tesla. **En la práctica: un vehículo + telemetría streaming = Fleet API prácticamente gratis.**

## 🔌 Integración con Monta (carga doméstica y facturación) {#monta}

Tesla Carview puede leer los datos de carga directamente desde tu **wallbox Monta**. La integración está disponible para **todos los vehículos**:

- **Vehículos privados**: las sesiones Monta se muestran como información de carga (badge 🏠 en el historial, detección de wallbox doméstica).
- **Coches de empresa**: además, se dispone de la facturación completa — resumen mensual, hoja PDF de reembolso y plantilla para el empleador.

> ℹ️ Las funciones de facturación (PDF, plantilla de reembolso) están reservadas para vehículos de la categoría **Coche de empresa**. Los datos de carga Monta están disponibles para todos los vehículos.

### Paso 1 – Crear una API key en Monta

1. Inicia sesión en **Monta** (app o web: `portal.monta.com`).
2. Ve a **Ajustes → API**.
3. Pulsa **Crear API Key** y copia la clave (empieza por `monta_`).

La clave solo se muestra una vez: introdúcela en Tesla Carview de inmediato.

### Paso 2 – Encontrar el ID del punto de carga

1. En el portal de Monta: selecciona **Puntos de carga → Mis dispositivos**.
2. El **ID del punto de carga** aparece en la vista de detalle (formato: `cp_12345`).
3. Alternativa: la llamada API `GET /api/v1/charge-points` devuelve todos los puntos de carga con sus IDs.

### Paso 3 – Introducir en Tesla Carview

1. Ve a **Ajustes → Perfil del vehículo**.
2. Introduce **precio de electricidad de la wallbox (€/kWh)**, p. ej. `0.34` (base de facturación para coches de empresa).
3. Añade el **ID del punto de carga Monta** y la **API key de Monta**.
4. Pulsa **Guardar**.

### Detección de wallbox doméstico

Cuando se configura un **ID de Charge-Point de Monta** en el vehículo, todas las sesiones devueltas por la sincronización son por definición cargas en el wallbox doméstico. La aplicación marca automáticamente las sesiones locales correspondientes como **carga en casa** y muestra un badge 🏠 en la lista de cargas, además de un marcador 🏠 en la facturación. La marca también se utiliza como señal fiable «en casa vs. fuera» en el resumen mensual — independiente del emparejamiento por GPS, de modo que una sesión queda clasificada correctamente incluso cuando el vehículo no entrega posición GPS durante la carga.

### Usar la facturación

- Ve a **Facturación** en la navegación.
- Elige el mes deseado: aparecerán todas las cargas en casa.
- Las cargas que fueron gratuitas (p. ej. en la empresa) puedes marcarlas en el historial con **✕ gratis**; quedarán excluidas de la factura.
- Con **Exportar PDF** obtienes una hoja de facturación lista para firmar.

## 📝 Libro de servicio {#logbook}

Usa el **libro de servicio** para documentar todo lo relativo al funcionamiento del vehículo: mantenimiento, reparaciones, cambios de neumáticos, inspecciones, accidentes y notas libres. Cada entrada recibe automáticamente:

- **Fecha y hora** — preestablecidas en «ahora» al crear; las entradas retroactivas o planificadas son posibles.
- **Autor** — el usuario que ha iniciado sesión queda registrado como autor y se muestra junto a cada entrada como **👤 nombre de usuario**. Las entradas anteriores a esta función aparecen como «👤 desconocido».
- **Categoría y campos opcionales** — kilometraje en el momento, coste, descripción libre.

Esto permite saber más adelante quién registró qué nota o mantenimiento, especialmente útil en inquilinos con varios usuarios activos.

## 🔵 Validación OwnTracks (desde v3.11.0) {#owntracks-validation}

**Problema resuelto:** OwnTracks empuja datos GPS desde tu móvil a TeslaView. Si conduces otro coche o vas de copiloto, aparecerían trayectos falsos como Tesla. Con varias personas usando OwnTracks en el mismo Tesla, los trayectos se duplicarían.

TeslaView tiene tres líneas de defensa:

### A) Validación Bluetooth (automática, recomendada)

Tu iPhone sabe si está conectado al Bluetooth del Tesla. Un Atajo de iOS le dice a TeslaView «entré» / «salí».

**Configuración (una vez, ~3 min):**

1. **Anota el nombre Bluetooth del Tesla**: iOS → Ajustes → Bluetooth → la entrada de tu Tesla (p. ej. «Tesla 7SA5...»).
2. **En TeslaView**: `/my-tracking` → despliega «🔵 Validación Bluetooth» → introduce el nombre → guardar.
3. **App Atajos iOS** → «Automatización» → «+ Nueva automatización»:
   - «Al conectar Bluetooth» → elige el Tesla
   - Añade acción «Obtener contenidos de URL» → pega la **URL conexión** que muestra TeslaView, **método HTTP = POST**
   - Guarda y activa «Ejecutar inmediatamente»
4. **Segunda automatización** para «desconexión» → **URL desconexión**.

Una vez guardado, TeslaView ignora cualquier posición OwnTracks donde el móvil **no** esté conectado al Tesla.

### B) Bloqueo de trayecto (automático)

Con varias personas en el mismo Tesla, los trayectos se duplicarían. TeslaView pone un **bloqueo en el primer dispositivo** en movimiento — los demás se ignoran durante el trayecto (liberación automática tras 15 min inactivos). Sin configuración del usuario.

### C) Pausa manual (freno de emergencia)

En `/my-tracking` cada dispositivo tiene un botón ⏸. Si sabes que no conducirás el Tesla durante un tiempo (vacaciones con coche alquilado, ruta en bici), pausa el dispositivo. Reactívalo al volver.

### Configuración en Android (en vez de iOS)

Android no tiene un reemplazo nativo 1:1 para los Atajos de iOS. Tres caminos:

**Recomendado: MacroDroid** (versión gratis suficiente, ~10M descargas, seguro)
1. Instalar desde Play Store
2. «+ Nueva macro» → trigger «Bluetooth» → «Conectado a dispositivo» → elegir el Tesla
3. Acción «Petición HTTP» → método GET → pegar la URL de conexión de TeslaView
4. Guardar como «Tesla conectado»
5. Segunda macro igual para «Bluetooth desconectado» con la URL de desconexión

**Alternativas:**
- **Automate (Llamalab)** — gratis hasta 30 bloques, flujo visual (más limpio pero curva de aprendizaje)
- **Tasker** — 3,49 € único, estándar de oro

⚠ **Nota de verificación:** Esta guía no se ha verificado en vivo en Android (lado del desarrollador solo iOS). Si algo no encaja, abre un issue en GitHub.

### Indicador de estado

- 🟢 **En el Tesla** — activo, trayectos registrados
- 🟡 **No en el Tesla** — Bluetooth desconectado, trayectos ignorados
- ⏸ **En pausa** — desactivado manualmente
- 🔵 **Estado desconocido** — esperando primer evento Bluetooth tras configuración
- 🔵 **Activo sin validación Bluetooth** — modo legado, sin nombre Bluetooth

## 📍 Cerca (desde v3.13.0) {#nearby}

`/nearby` muestra POIs (puntos de interés) alrededor de tu coche, tu sesión de carga activa o el final de tu último trayecto. Útil en paradas de carga rápida.

**Categorías**: cafetería, restaurante, comida rápida, panadería, supermercado, aseos, agua potable, parque infantil, parque, pícnic, mirador, cajero, farmacia, **geocaches**.

**Fuente**: [OpenStreetMap Overpass API](https://overpass-api.de) — gratis, sin cuenta, sin clave API. Las llamadas pasan en el servidor y los resultados se cachean 24 h en `poi_cache` (redondeados a 4 decimales → ~11 m).

**Radio**: 500 m / 1.5 km / 3 km. Pulsa un POI para abrirlo en OpenStreetMap.

**Filtro**: cada categoría como toggle — p. ej. solo geocaches para una búsqueda durante la carga.

## 🚀 Hub de apps (desde v3.9.0) {#app-hub}

`/launcher` ofrece una **lista curada de apps web** que se ejecutan en el navegador Tesla y que Tesla NO ofrece nativamente:

- **Audio (radio pública)** — ARD Audiothek, Deutschlandfunk en vivo
- **Mundo VE** — GoingElectric, electrive, OpenChargeMap, A Better Routeplanner
- **Mensajería** — Telegram Web, Signal (Tesla no tiene chat nativo)
- **Conocimiento** — Wikipedia

**Criterios de inclusión:** gratis, seguro (HTTPS), sin instalación forzada de app-store, respetuoso con la privacidad, **sin duplicados nativos Tesla** (Spotify, Apple Music, juegos, mapas, streaming están intencionadamente ausentes — Tesla ya los ofrece).

**Audio por los altavoces Tesla:** pasa por Bluetooth desde tu teléfono como siempre — sin configuración.

**Lista blanca admin:** bajo `/admin?tab=launcher` un admin puede ocultar apps por inquilino, p. ej. si no quieres mostrar Telegram Web. La lista se persiste en `tenant_settings` bajo `launcher.disabled_slugs`.

## 📍 Introducir ubicación manualmente (sin GPS) {#manual-location}

Si tu Tesla no entrega GPS (típico de VIN XP7 sin Fleet Telemetry, o durante caídas de conexión), puedes mantener la ubicación de carga y las direcciones de viajes a mano:

- **Ubicación de carga** — haz clic en el nombre de ubicación en la lista de cargas para abrir el editor en línea. Tres vías: elegir una ubicación de carga definida (tarifa / posición se heredan), introducir un nombre libre o teclear coordenadas lat/lon (auto-emparejamiento con las ubicaciones definidas dentro del radio configurado, 200 m por defecto).
- **Direcciones de viaje** — bajo `Detalle del viaje → ✎ Editar`: direcciones de inicio y final como texto libre, más lat/lon opcionales para el mapa.

Cada campo editable tiene un tooltip que explica qué hace, cuándo usarlo y qué ocurre al guardar.

### Resolución automática de direcciones desde v3.8.0 {#auto-geocode}

**Dirección antes que coordenadas desde v3.10.0**: cada lista (libro de mantenimiento, trayectos, sesiones de carga) y vista de detalle prefiere la dirección. Solo si no hay dirección almacenada (o el backfill aún no se ejecutó) aparecen lat/lon como reserva — con 4 decimales (~11 m). Siempre que sea posible se muestra el lugar legible, no «54.1234, 9.5678».

Cuando un trayecto o sesión de carga tiene **coordenadas GPS pero no texto de dirección**, TeslaView completa la dirección automáticamente en segundo plano:

- **Trigger en vivo**: justo después de cada cierre de trayecto OwnTracks y cada inserción de carga, se ejecuta un lookup inverso fire-and-forget.
- **Backfill nocturno**: hasta 60 registros antiguos por inquilino se procesan cada noche.
- **Bajo demanda admin**: `POST /api/system/geocode-backfill` (área admin) dispara una ejecución inmediata con un `limit` configurable.

**Fuente**: [Nominatim/OpenStreetMap](https://nominatim.openstreetmap.org) — gratis, sin cuenta, sin clave API. Soberanía de datos (Fundación OSM, UE).

**Caché local**: cada lookup va a `geocode_cache` (redondeado a 4 decimales ~11 m) y queda disponible para cualquier otro trayecto/sesión en la misma ubicación sin otra llamada externa. El límite de 1 petición/segundo de Nominatim se respeta estrictamente.

## 🎮 Control de vehículo ampliado {#control-extended}

La vista **Control** está ahora cerca de la paridad con la app móvil de Tesla:

| Área | Funciones |
|---|---|
| Climatización | On/off, temperatura objetivo, precondicionamiento max-desempañado, **modos climate keeper** (off / mantener / 🐶 perro / ⛺ camp), calefacción del volante |
| Asientos | 5 asientos (conductor, pasajero, traseros I/M/D) × 4 niveles de calor |
| Carrocería | Puertas, modo centinela, actuador del frunk y portón, abrir/cerrar todas las ventanas, luces y bocina |
| Carga | Inicio/parada, deslizador de límite, **deslizador de amperaje (5–48 A)**, trampilla de carga abrir/cerrar |
| Boombox | 9 sonidos Tesla preinstalados por los altavoces externos (solo vehículos con hardware Boombox; coche detenido) |
| Programa de salida | Hora diaria, opcionalmente solo lun–vie — Tesla inicia el preacondicionamiento ~20–30 min antes; el vehículo debe estar enchufado |
| Carga en valle horario | Hora de inicio de carga fija para tarifas dinámicas (Tibber, aWattar, tarifa nocturna). A diferencia del programa de salida, el coche **no** cuenta hacia atrás — la hora es el inicio, no el «listo a las». La carga continúa hasta alcanzar el límite. |
| Actualización de software | Estado (disponible / descargando / instalando / programada), «Instalar ahora» programa con un desfase de 1 min, «Cancelar» borra una instalación programada |

Notas:
- Los comandos requieren una **Virtual Key** activa y un `tesla-http-proxy` en ejecución (véase Inicio rápido).
- Cuando el coche está dormido, los comandos se rechazan — pulsa primero «☀️ Despertar» (~30 s).
- Climate keeper solo funciona si la climatización estaba encendida cuando el conductor abandona el coche.

## 📜 Gestión de contenidos legales {#legal-admin}

En **Admin → Contenidos legales**, el administrador mantiene aviso legal, política de privacidad y condiciones de uso. Tres puntos importantes:

- **Mantén el idioma por defecto, los demás lo siguen** — El modo de sincronización está activado por defecto: editas la versión alemana y los otros cinco idiomas reflejan el mismo texto byte por byte. El frontend muestra entonces un banner azul («actualmente solo se mantiene en alemán»). El modo de sincronización puede desactivarse por edición para mantener un solo idioma individualmente.
- **El incremento de versión actualiza la fecha automáticamente** — Cuando marcas «Incrementar versión» al guardar, el backend escribe primero la fecha de hoy en la línea «Stand:» / «Last updated:» / «Última actualización» del cuerpo y solo después incrementa la versión. Así, cada versión mayor lleva automáticamente la fecha correcta sin que tengas que mantener esa línea a mano. Las correcciones de cuerpo simples sin incremento dejan la fecha sin cambios.
- **Seguimiento de aceptaciones** — Cada incremento obliga a todos los usuarios activos a aceptar de nuevo privacidad y condiciones — el modal de aceptación bloquea el inicio de sesión hasta entonces. Las aceptaciones se almacenan en la BD del inquilino por usuario + versión + IP + marca de tiempo, en cumplimiento del RGPD.

## 🔧 Intervalos de mantenimiento {#service-intervals}

**Previsión (v3.31):** para los intervalos en km, TeslaView proyecta según tu kilometraje cuándo vencerá; el panel TCO muestra además una previsión de costes a 12 meses. Estadística pura.

En **Ajustes → Intervalos de mantenimiento** defines, por vehículo, tareas recurrentes (ITV, revisión, líquido de frenos, cambio de neumáticos por temporada, filtro de habitáculo, escobillas, mantenimiento de climatización). Cada entrada admite un **intervalo temporal** (meses), un **intervalo en km**, o ambos. «Sembrar valores por defecto» prerellena una lista típica para Tesla.

La app calcula «vencimiento en X días / Y km» y muestra los elementos vencidos o próximos a vencer arriba en el panel. Un **recordatorio push diario** (Web-Push) salta cuando un intervalo está a < 30 días o < 1.000 km. Antispam: cada push marca la entrada como notificada; el siguiente aviso solo llega tras un sello «Hecho» o un aplazamiento de 30 días. «Hecho» fija automáticamente la fecha de hoy y el kilometraje actual.

## 📋 Registro de auditoría {#audit-log}

En **Admin → Registro de auditoría** los administradores ven todos los eventos relevantes para la seguridad: inicios de sesión (correctos + fallidos), bloqueos de cuenta, configuración MFA, cambios de permisos, comandos Tesla, aceptaciones RGPD, creación de usuarios. Filtrable por acción, ID de usuario y rango de fechas. Las acciones están codificadas por color (rojo para fallos, azul para auth, violeta para admin). El bloque de detalles abre el JSON. La **exportación CSV** entrega el conjunto filtrado listo para Excel (punto y coma, BOM) — adecuado para solicitudes de acceso RGPD o forense. Los datos están aislados por inquilino.

## 📄 Liquidación en PDF {#pdf-billing}

El botón **«📄 PDF erzeugen»** en **Facturación** produce una hoja A4 lista para firmar: encabezado con empresa, vehículo y periodo; tabla de sesiones incluyendo el marcador 🏠 para cargas en casa detectadas por Monta; totales (sesiones / kWh / importe); líneas de firma. La generación ocurre completamente en el navegador vía `jsPDF` — los datos de carga nunca salen de tu máquina.

## 💸 Precio dinámico de la electricidad {#dynamic-tariff}

Si tienes una tarifa dinámica (Tibber, aWattar HOURLY, EPEX spot), configura un proveedor en **Ajustes → API de precio eléctrico**:

| Proveedor | Token API | Base de precio |
|---|---|---|
| **aWattar** (DE/AT) | no requerido — público | Precio spot EPEX, opcionalmente + recargo en ct/kWh |
| **Tibber** (DE/SE/NO/NL/…) | token desde developer.tibber.com | Precio final al cliente, IVA incluido |

El panel mostrará un **widget de tarifa** con el precio actual, una curva 24h y la recomendación «ventana 4h más barata». Un clic en **«🚗 Programar carga en ventana más barata»** escribe el inicio de esa ventana directamente en `set_scheduled_charging` del vehículo activo. Los precios se cachean 30 minutos. Sin proveedor configurado el widget queda oculto y no se realiza ninguna solicitud saliente.

## 📒 Libro de viajes para Hacienda (conforme al BMF alemán) {#fahrtenbuch-bmf}

El libro de viajes genera un PDF reconocido por las administraciones fiscales alemanas como libro de viajes electrónico según las reglas del BMF. El mismo flujo es útil en cualquier país donde haya que separar kilometraje privado y profesional.

**Paso a paso:**

1. **Clasifica cada viaje** — un clic en el badge de tipo alterna entre Privado → Empresa → Trayecto al trabajo.
2. **En viajes de empresa rellena dos campos** (obligatorios BMF):
   - **Socio comercial** — a quién visitaste.
   - **Motivo** — razón profesional.
3. **Elige el mes** en el filtro superior.
4. **Pulsa "📄 Finanzamt-PDF"** — produce un documento A4 horizontal con numeración consecutiva, kilometraje inicial y final de cada viaje, distancias, origen → destino, socio y motivo.

**Protección antimanipulación** — tras la exportación los viajes incluidos quedan bloqueados frente a cambios. Los bloqueados muestran un icono 🔒. Las correcciones realizadas antes de la exportación se registran en un **historial de cambios** por viaje.

**Entrada manual** — si falta un viaje, usa **"+ Manuell"** para introducirlo completo. Obligatorio: hora de inicio y fin. Las entradas manuales llevan un badge ✍.

**Fusionar viajes consecutivos** — cuando la telemetría dividió un viaje en dos (parada breve, hueco GPS), pulsa **"Mit nächster zusammenführen"** en el primer viaje.

## 🗓️ Mapa de actividad {#trips-heatmap}

Sobre el resumen mensual del cuaderno de bitácora encontrarás un **mapa de calor de todos los viajes** en estilo calendario:

- **Filtro superior**: elige la granularidad — `Año`, `Mes`, `Semana` o `Todo`. Para `Año/Mes/Semana` aparece un segundo selector con el periodo concreto.
- **Brillo de cada celda** según los kilómetros del día; celda oscura = sin viajes, verde claro = muchos.
- **Pasa el ratón** sobre un día para ver fecha + número de viajes + km totales en un tooltip.
- **Haz clic** sobre un día no vacío para ir directamente a la lista de viajes de ese día — responde rápido a «¿qué hice ese día?».
- El pie muestra la leyenda de la escala y el total del filtro activo.

Origen de los datos: los mismos viajes que usa el cuaderno BMF — el mapa es solo visualización, no escribe nada.

## 📱 Uso en smartphone y en el Tesla (instalación PWA) {#mobile-tesla-install}

Tesla Carview es una **PWA** (Progressive Web App) — instalable como app nativa sin App Store ni Google Play. Funciona en iPhone, iPad, Android, en el navegador del vehículo Tesla y en cualquier Chromium de escritorio.

**Smartphone Android / Tesla / Chrome / Edge:**
1. Abre la app en el navegador e inicia sesión.
2. Aparece un banner "Carview als App installieren" → toca **Installieren**.
3. El icono aparece en la pantalla de inicio. Tocarlo abre la app a pantalla completa, sin barra de navegador.

**iPhone / iPad (Safari):**
1. Abre la app en Safari e inicia sesión.
2. Botón **Compartir** → **"Añadir a pantalla de inicio"** → Añadir.
3. El icono aparece en la pantalla de inicio como una app nativa.

**En la pantalla Tesla:**
- En el coche: abre el navegador, introduce tu URL de Carview.
- La app se adapta al tamaño de la pantalla Tesla. En vista estrecha, el libro de viajes cambia automáticamente a vista de tarjetas con grandes zonas táctiles.
- Consejo: el botón **"◫ Karten"** fuerza la vista compacta también en pantallas grandes.

**Recomendación:** Guarda Carview como favorito en el navegador Tesla — Tesla muestra los favoritos guardados directamente en el acceso rápido del navegador. Para anotar notas de viaje en una pausa corta es más rápido que escribir la URL cada vez.

### 🚗 Abrir el libro de registro directamente en el navegador de Tesla {#tesla-directo}

El botón **« 🚗 Abrir en Tesla »** en la parte superior del libro de registro facilita el acceso desde el navegador Tesla:

1. Abre **Análisis → Libro de registro** en Carview desde tu teléfono u ordenador.
2. Haz clic en **« 🚗 Abrir en Tesla »**.
3. Aparece un modal con un **código QR** y una **URL directa** (ej. `https://tu-app.example.com/pair/abc123…`).
4. En el Tesla, abre el navegador e introduce la URL — o escanea el QR con una cámara si está disponible.
5. El navegador Tesla abre una página de autenticación Passkey. Toca **« Confirmar con Passkey »** y autentícate.
6. Tras autenticación exitosa, el navegador Tesla inicia sesión y navega directamente al libro de registro.

La sesión es válida **5 minutos**. La cookie refresh-token mantiene la sesión **7 días**. La URL del libro se puede guardar en los marcadores rápidos del navegador Tesla.

**Funciona para cualquier vehículo** — el libro y la entrada manual no requieren conexión a la API de Tesla. Los conductores de otras marcas pueden usar la entrada manual y exportar un PDF conforme.

### 📲 Navegación iPhone: barra de pestañas

En iPhone y otros smartphones, Tesla Carview muestra una **barra de pestañas estilo iOS nativo** en la parte inferior:

- **4 pestañas rápidas** — Panel, Viajes, Carga, Control siempre a un toque
- **Botón «Más»** → abre una hoja inferior con todas las demás secciones (Libro de viajes, Batería, Grok, Admin …)
- **Dynamic Island / Home Indicator** correctamente respetados
- La pestaña activa se marca con un pequeño indicador

En el diseño **Nevs-Edition**, la barra de pestañas adopta el color petróleo.

## 🗺️ Planificador de ruta {#route-planner}

**Autonomía personal en lugar del WLTP (v3.29):** el estado de carga a la llegada se calcula a partir de tu consumo real dependiente de la temperatura, con banda de confianza y aviso « podría quedar justo ». Estadística pura.

El planificador calcula rutas de conducción y muestra estaciones de carga rápida en el camino.

**Calcular una ruta** — Introduce las direcciones de origen y destino. Con « + Parada intermedia » puedes añadir tantos puntos de paso como quieras y reordenarlos arrastrando.

**Opciones de evitación** — Tres botones de alternancia junto al campo de destino:
- **Autopistas** — la ruta utiliza carreteras nacionales y locales
- **Peajes** — se evitan los tramos de peaje
- **Ferrys** — sin travesías en ferry en el itinerario

Las opciones se guardan en el navegador. El enrutamiento usa Valhalla (openstreetmap.de); si no está disponible, hay respaldo automático a OSRM con aviso toast.

**Estaciones de carga** — Supercargadores y CCS a lo largo del trayecto. Requiere una clave API gratuita de OpenChargeMap en Admin → System → Claves API externas. La búsqueda usa correctamente el radio seleccionado (5/10/25/50 km), muestra nombres y direcciones de las estaciones, admite el filtro solo DC e indica tipos de conector, número de puntos de carga y compatibilidad Tesla.

**Tráfico en tiempo real** — Con una clave HERE Maps configurada, el tráfico actual se integra en la estimación del tiempo de viaje.

**Planificación de carga** — Al activar la planificación SoC (introduce el nivel de batería), el planificador calcula paradas de carga óptimas con estimación de tiempo y comprueba si la autonomía es suficiente para cada tramo.

## 🟢 Estado del sistema (admin) {#system-health}

**Autoprueba operativa (v3.32):** bajo demanda y cada semana, TeslaView verifica la seguridad y la integridad de las copias (cobertura MFA, clave de cifrado, integridad SQLite, vigencia e integridad de la última copia) como informe tipo semáforo. Diagnóstico puro.

Bajo **System**, los administradores ven una tarjeta tipo semáforo con ocho comprobaciones:

- **Token OAuth Tesla** — ¿conectado? ¿cuándo caduca?
- **Virtual Key** — ¿creada? (necesaria para comandos firmados)
- **Fleet Telemetry** — ¿cuándo llegó el último punto de datos?
- **Poller Tesla** — ¿cuándo consultó la app por última vez el vehículo?
- **DB del inquilino** — tamaño de la base
- **Mantenimiento nocturno** — marca de tiempo del último pase automático
- **OpenChargeMap** — sonda HTTP en vivo (atenuado si no hay clave configurada)
- **HERE Maps** — sonda HTTP en vivo (atenuado si no hay clave configurada)

Verde (todo bien), amarillo (atención) o rojo (acción requerida). Los servicios opcionales (OCM, HERE) solo cuentan como error si hay una clave configurada pero el endpoint no responde.

**Monitorización y auto-reparación** — Debajo la tarjeta de Monitorización con dos ajustes:
- **Auto-reparación activada/desactivada** — Un cron automático comprueba cada 15 minutos si todos los contenedores están en marcha y si `/api/health` responde. Los servicios caídos se reinician automáticamente.
- **E-mail de alerta** — Si hay una dirección de e-mail configurada, se envía una notificación tras cada reinicio con marca de tiempo y número de servicios reiniciados.

El log heal y el log security-check (últimas 50 entradas) son consultables directamente en esta tarjeta y actualizables en cualquier momento con «Actualizar log».

## 💬 Grok Chat {#grok}

**Grok Chat** integra la conversación xAI directamente en Tesla Carview. Haz preguntas en lenguaje natural sobre tus viajes, datos de carga y estadísticas del vehículo.

**Contexto**: Cuando el botón de datos del vehículo (icono velocímetro) está activo, el chat envía tu último viaje, última carga y odómetro como contexto. Desactívalo para preguntas generales.

**Nuevo chat**: Haz clic en **+ Nuevo chat** en la barra lateral. Escribe tu pregunta y pulsa Enter o Enviar. El texto aparece en streaming.

**Navegador Tesla**: En pantalla pequeña (< 768 px), la barra lateral se colapsa arriba. Entrada de voz mediante Web Speech API (navegador Tesla V12+).

**Presupuesto diario**: Por defecto **100 céntimos/día**. El uso actual se muestra arriba en la barra lateral.

**Privacidad**: Las solicitudes se enrutan a través del backend — nunca directamente desde tu navegador a xAI.

## 🌍 Comparación de CO₂ {#co2}

La **comparación de CO₂** en el Informe de Energía muestra el impacto ambiental de tu conducción:

- **CO₂ Tesla** — Calculado a partir de tu consumo y la mezcla eléctrica alemana (0,38 kg CO₂/kWh).
- **Equivalente diésel** — CO₂ que habría producido un vehículo similar a 7 l/100 km (2,65 kg CO₂/l).
- **Toneladas ahorradas** — La diferencia entre Tesla y diésel.

Los valores se calculan para el período seleccionado (4/8/12 semanas) y se muestran por semana en el gráfico de tendencias como barra verde.

## 🌡️ Consumo por clima {#weather-consumption}

La **correlación consumo-temperatura** muestra cómo la temperatura exterior influye en tu consumo. El gráfico de barras agrupa todos los viajes en 6 rangos de temperatura (< −10 °C a > 30 °C). Los colores van de verde (eficiente) a rojo (ineficiente).

## ❄️ Estadísticas climáticas {#climate-stats}

La página **Estadísticas climáticas** (`/climate`) muestra el uso diario del sistema de climatización:

- **Aire acondicionado** — Horas por período
- **Calefacción de asientos conductor/pasajero** — Días de uso
- **Precondicionamientos** — Veces que la app o un horario activó el clima
- **Día más frío/cálido** — Temperaturas extremas

Los datos se recopilan **automáticamente en cada sincronización**. En el gráfico diario: 🪑 = calefacción de asiento activa, 🔄 = precondicionamiento.

## 📦 Rastreador de firmware {#firmware}

El **rastreador de firmware** en Admin → Sistema muestra todas las versiones de software detectadas en tu vehículo: versión actual, historial (fecha, días instalado) y total de actualizaciones.

## 🌍 Benchmark Comunidad {#community-benchmark}

El **Benchmark Comunidad** (en el Informe de Energía) permite comparar anónimamente el consumo con otros conductores Tesla del mismo modelo.

**Principios de privacidad:** solo valores agregados (kWh/100 km), instancia almacenada como hash SHA-256, mínimo 3 participantes requeridos (k-anonimato), revocable en cualquier momento.

**Participar:** activar el interruptor, luego hacer clic en «Contribuir datos». Una vez que haya ≥ 3 participantes para tu modelo, verás la media, P25, P75 y tu posición.

## 🎨 Diseño y Temas {#design-themes}

Tesla Carview ofrece **5 estilos de diseño** y **6 colores de acento** — todo almacenado localmente, sin recarga del servidor.

### Estilos de diseño

| Diseño | Carácter |
|---|---|
| ✨ **Premium Glass** | Suave, elegante, glassmorfismo con backdrop blur |
| ⚡ **Cyberpunk-Tesla** | Brillo neón, líneas nítidas, estilo monospace |
| ◻ **Minimal Swiss** | Mucho espacio, reducido, números en foco |
| ▰ **Sport / Performance** | Angular, audaz, estética de tacómetro |
| ◈ **Nevs-Edition** | Tech-editorial, acento petróleo, tipografía Bricolage Grotesque |

**Nevs-Edition** es el único estilo con su propia suite tipográfica: *Bricolage Grotesque* para títulos, *Manrope* como fuente de cuerpo y *JetBrains Mono* para etiquetas. También incluye una delgada **barra de estado** sobre la NavBar con datos del vehículo en vivo (nivel de batería, marcha, odómetro, última señal de sincronización).

### Colores de acento

6 colores: Rojo Tesla, Azul eléctrico, Verde energía, Morado, Atardecer, Azul hielo — combinables libremente con cualquier estilo.

Cambiar en: **Ajustes → Diseño y Colores**.

## 🔧 Solución de problemas {#troubleshooting}

**El vehículo no devuelve datos GPS**
Los Tesla más nuevos (VIN XP7, p. ej. Model Y Juniper) no entregan `drive_state` por la API REST. El seguimiento GPS se realiza por Fleet Telemetry. Asegúrate de que tesla-http-proxy está en marcha y la Virtual Key está registrada.

**El inicio de sesión no funciona tras la actualización**
Tras una actualización a la v2.0 (multi-inquilino) hace falta un identificador de inquilino al iniciar sesión. El identificador para la base de datos migrada es «default». Introdúcelo en el campo de inicio de sesión o pulsa «Elegir inquilino».

**La conexión con Tesla falla (401)**
El token OAuth de Tesla ha caducado. Ve a Ajustes → Conexión Tesla y vuelve a conectar tu cuenta Tesla. Asegúrate de que `TESLA_CLIENT_ID` y `TESLA_CLIENT_SECRET` son correctos en `.env`.

**Los comandos del vehículo fallan**
Comprueba: 1) tesla-http-proxy está en marcha (`systemctl status tesla-http-proxy`) 2) La Virtual Key está registrada en el coche (Ajustes → Conexión del vehículo) 3) El coche está en línea (no dormido).

**Sin datos de telemetría / falta GPS**
Fleet Telemetry requiere dos pasos: (1) registrar la app en Tesla (Ajustes → «🔑 Registrar app»), (2) activar la telemetría (Ajustes → «📡 Activar telemetría»). Si el paso 2 falla con HTTP 404, hay que solicitar acceso a `fleet_telemetry_config` al Tesla Developer Support; en el manual hay una plantilla en el «Paso 6». Además, `vehicle_location` debe estar activado en los scopes de la app en `developer.tesla.com`.

**El backend no arranca**
Revisa los logs: `docker logs tesla-carview-backend`. Causas frecuentes: variables de `.env` faltantes (`JWT_SECRET`, `TESLA_CLIENT_ID`), errores de migración de la base de datos.

## ❤️ Si la app vale algo para ti {#donations}

Tesla Carview es gratuita y sin publicidad **para uso privado y autoalojado** (licencia: PolyForm Noncommercial 1.0.0 — no se permite la reventa comercial ni el alojamiento SaaS para terceros). Si quieres devolver algo, estas organizaciones agradecerán tu apoyo.

- **[Aktion Deutschland Hilft](https://www.aktion-deutschland-hilft.de/de/spenden/)** — Alianza de organizaciones humanitarias para una ayuda rápida y eficaz en catástrofes en todo el mundo.
- **[Lebenshilfe Rems-Murr](https://www.lebenshilfe-rems-murr.de/)** — Apoyo, acompañamiento y participación para personas con discapacidad en el distrito de Rems-Murr.
- **[Radio 7 Drachenkinder](https://www.radio7.de/aktionen/drachenkinder)** — Ayuda a niños gravemente enfermos en la región: financia terapias, salidas y deseos.

El 100 % de tu donación va directamente a la organización. No vemos ni el importe ni tus datos.
