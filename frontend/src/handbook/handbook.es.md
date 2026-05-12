# 📖 Manual de Tesla Carview

> ℹ️ **Nota para administradores y auto-alojadores:** Este manual describe la app desde la perspectiva del usuario. Instalación, variables de entorno, copias de seguridad/restauración, mantenimiento nocturno y la activación del modo demo se documentan en la **documentación técnica** de la carpeta [`docs/`](https://github.com/KnevS/Tesla-Carview/blob/main/docs/README.en.md) (en inglés), especialmente [10-configuration](https://github.com/KnevS/Tesla-Carview/blob/main/docs/10-configuration.en.md) y [11-operations](https://github.com/KnevS/Tesla-Carview/blob/main/docs/11-operations.en.md).

Versión 2.1 · Auto-alojado · Multi-inquilino

## 🌟 Visión general {#overview}

Tesla Carview es una aplicación **auto-alojada** de registro de datos para vehículos Tesla. Todos los datos permanecen exclusivamente en tu propio servidor: sin nube, sin compartir datos. La aplicación es completamente **responsive** y funciona en **iPhone/iPad (Safari)**, smartphones Android y navegadores de escritorio.

**Funciones de un vistazo:**

- 🚗 **Libro de viajes** — Tracks GPS, consumo, categorización del tipo de viaje
- ⚡ **Carga** — Sesiones de carga con costes, detección de ubicación por GPS
- 🔋 **Batería** — Seguimiento de la degradación, historial de autonomía
- 📊 **Panel** — Estadísticas, vista mensual, últimas actividades
- 🎮 **Control** — Climatización, puertas, luces, directamente desde la aplicación
- 📝 **Libro de mantenimiento** — Mantenimientos, reparaciones, costes con fecha
- 📤 **Exportación** — CSV/JSON para todos los datos, copia completa como ZIP
- 🔔 **Notificaciones push** — Notificación del navegador al finalizar la carga
- 📱 **Optimizado para móvil** — Totalmente usable en iPhone/iPad (Safari), Android y escritorio

## 🔀 Orden de clasificación {#sort-order}

Todas las listas con entradas cronológicas (viajes, sesiones de carga, entradas del libro de mantenimiento, facturación, eventos de auditoría, lista de usuarios, versiones de textos legales) tienen un **conmutador de orden** en la esquina superior derecha. Un clic alterna entre:

- ↓ **Más recientes primero** (predeterminado)
- ↑ **Más antiguos primero**

El orden elegido se **guarda por vista en tu navegador** (`localStorage`) y persiste tras recargar y cerrar la pestaña — puedes configurarlo de forma diferente para cada lista (p. ej., libro de viajes «más recientes arriba», lista de usuarios «último inicio de sesión al final»).

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
4. **Conectar Tesla** — Tras iniciar sesión: **Ajustes → Conectar cuenta Tesla**. Se te redirigirá a Tesla para iniciar sesión allí.
5. **Importar vehículos** — Ve a **Ajustes → Conexión Tesla → Sincronizar vehículos**. Todos los vehículos de la cuenta Tesla conectada se importan automáticamente. Si tienes varios Tesla en una misma cuenta, aparecerán todos a la vez.

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

Los lugares de carga se detectan automáticamente por GPS y se vinculan a un precio por kWh.

**Detección automática por GPS** — Si un lugar de carga está configurado con coordenadas GPS y un radio (200 m por defecto), al iniciar la carga se detecta automáticamente el lugar correspondiente y se aplica el precio/kWh almacenado.

**Crear un lugar de carga** — En **Carga → Lugares**: introduce nombre, tipo (Casa/Oficina/Público), precio/kWh, coordenadas GPS y radio de detección.

**Ajustar costes manualmente** — En la lista de cargas: clic en una sesión → editar costes. También se pueden poner a 0 (p. ej. carga gratuita).

**✕ Marcar una carga como gratuita** — En el **historial de cargas**, cada sesión tiene un pequeño botón *«✕ gratis»*. Las cargas marcadas así aparecen en gris con la etiqueta *«gratis»* y se **excluyen automáticamente del cálculo de carga doméstica**, tanto en los resúmenes mensuales como en el análisis individual.

Caso de uso típico: cargas en el lugar de trabajo pagadas por la empresa, que no deben formar parte de la cuenta privada. Con el botón *«↩ pagar»* la marca puede revertirse en cualquier momento.

## 🔐 Seguridad {#security}

- 🔑 **Passkey / WebAuthn** — Inicio de sesión sin contraseña con huella digital, Face ID o llave hardware
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

**Exportación manual** — En **Exportación**: CSV o JSON para viajes y sesiones de carga, además de copia completa como ZIP.

**Copia automática (servidor)** — Las bases de datos SQLite están en el volumen Docker `tesla_data`. Para copias automáticas en el servidor:

```bash
# Copia diaria a las 3 (crontab -e):
0 3 * * * cp /var/lib/docker/volumes/tesla_data/_data/*.db /backup/
```

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

## 🔌 Integración con Monta (facturación) {#monta}

Para conductores de coche de empresa: Tesla Carview puede leer los datos de carga directamente desde tu **wallbox Monta** y generar una factura mensual para tu empresa.

> ⚠️ La integración con Monta solo está disponible para vehículos en la categoría **Coche de empresa** (Ajustes → Perfil del vehículo → Categoría).

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
2. Elige la categoría **💼 Coche de empresa**.
3. Introduce **precio de electricidad de la wallbox (€/kWh)**, p. ej. `0.34`.
4. Añade el **ID del punto de carga Monta** y la **API key de Monta**.
5. Pulsa **Guardar**.

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

## 📍 Introducir ubicación manualmente (sin GPS) {#manual-location}

Si tu Tesla no entrega GPS (típico de VIN XP7 sin Fleet Telemetry, o durante caídas de conexión), puedes mantener la ubicación de carga y las direcciones de viajes a mano:

- **Ubicación de carga** — haz clic en el nombre de ubicación en la lista de cargas para abrir el editor en línea. Tres vías: elegir una ubicación de carga definida (tarifa / posición se heredan), introducir un nombre libre o teclear coordenadas lat/lon (auto-emparejamiento con las ubicaciones definidas dentro del radio configurado, 200 m por defecto).
- **Direcciones de viaje** — bajo `Detalle del viaje → ✎ Editar`: direcciones de inicio y final como texto libre, más lat/lon opcionales para el mapa.

Cada campo editable tiene un tooltip que explica qué hace, cuándo usarlo y qué ocurre al guardar.

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

Tesla Carview es una PWA — instalable como app nativa sin la App Store.

**Android / Tesla / Chrome / Edge:** aparece una franja "Carview als App installieren" → toca **Installieren**. El icono va a la pantalla de inicio.

**iPhone / iPad (Safari):** **Compartir** → **"Añadir a pantalla de inicio"**.

**Pantalla Tesla:** abre el navegador del coche e introduce la URL de Carview. La interfaz se adapta; el libro de viajes pasa a tarjetas con grandes objetivos táctiles en pantallas estrechas. El botón **"◫ Karten"** fuerza esa vista.

## 🟢 Estado del sistema (admin) {#system-health}

Bajo **System**, los administradores ven una tarjeta tipo semáforo con cinco comprobaciones:

- **Token OAuth Tesla** — ¿conectado? ¿cuándo caduca?
- **Virtual Key** — ¿creada? (necesaria para comandos firmados)
- **Fleet Telemetry** — ¿cuándo llegó el último punto de datos?
- **Poller Tesla** — ¿cuándo consultó la app por última vez el vehículo?
- **DB del inquilino** — tamaño de la base

Verde (todo bien), amarillo (atención, p. ej. token a punto de caducar) o rojo (acción requerida).

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
