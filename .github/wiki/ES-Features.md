# Descripción de funcionalidades

🌐 **Language / Sprache**

| | |
|---|---|
| 🇬🇧 **[English](Features)** | English version |
| 🇩🇪 **[Deutsch](DE-Features)** | Deutsche Version |
| 🇫🇷 **[Français](FR-Features)** | Version française |
| 🇪🇸 **[Español](ES-Features)** | Estás aquí |
| 🇹🇷 **[Türkçe](TR-Features)** | Türkçe sürüm |
| 🇬🇷 **[Ελληνικά](EL-Features)** | Ελληνική έκδοση |

---

Tesla Carview cubre todo el ciclo de vida de tu Tesla — desde el seguimiento de cada viaje hasta el control del vehículo, la planificación de rutas y la gestión de los costes de carga. Todo funciona en tu propio servidor.

---

## ¿Qué ofrece Tesla Carview?

| Módulo | Resumen |
|---|---|
| 📊 Panel | Estado en vivo, estadísticas, widget de tarifa, salud del sistema |
| 🚗 Diario de viajes | Viajes registrados automáticamente, exportación PDF conforme |
| ⚡ Carga | Sesiones, ubicaciones, sincronización Monta, facturas de costes |
| 🔋 Batería | Salud, degradación, historial de autonomía |
| 🗺️ Planificador | Enrutamiento OSRM, mapa de cargadores, enviar al Tesla |
| 🎮 Control | Clima, cerraduras, carga, OTA, carga programada |
| 📝 Libro de mantenimiento | Registros, intervalos, recordatorios push |
| 💬 Grok Chat | Asistente IA xAI con contexto del vehículo |
| 📤 Exportar | CSV, JSON, facturas PDF, copia de seguridad completa |
| 🔐 Seguridad | Passkeys, MFA (TOTP), QR-SSO para el navegador Tesla |
| 🌍 Multilingüe | DE · EN · FR · ES · TR · EL |
| 📱 PWA | Instalable en la pantalla de inicio, shell sin conexión |

---

## 📊 Panel

El panel es tu vista central:
- **Estado en vivo** — nivel de batería, autonomía, ubicación, estado de carga
- **Últimos viajes** — los 5 últimos con distancia y consumo
- **Estadísticas mensuales** — kilómetros, energía, costes de carga
- **Widget de tarifa dinámica** — precio actual (aWATTar DE/AT, Tibber) con gráfico de 24 h y ventana de carga automática
- **Intervalos de mantenimiento** — recordatorios de ITV, aceite, líquido de frenos, etc.
- **Salud del sistema** — estado de la API Tesla, Fleet Telemetry, tamaño de la base de datos

El panel es totalmente personalizable en **Configuración → Iniciar asistente**.

---

## 🚗 Viajes (Diario de viajes)

Cada viaje se registra automáticamente:
- Lugar de inicio y fin (dirección + coordenadas GPS)
- Distancia, duración, velocidad media
- Consumo de energía (kWh y kWh/100 km)
- Nivel de batería al inicio/fin
- Clasificación del viaje (privado / trabajo / negocio)

### Diario conforme BMF
- Campos de socio comercial y propósito del viaje
- Numeración secuencial y función de bloqueo
- **Exportación PDF** en A4 horizontal con todos los campos obligatorios
- Fusión y división de viajes, creación manual

---

## ⚡ Carga

Todas las sesiones de carga se registran automáticamente:
- Ubicación, energía añadida (kWh), coste estimado, velocidad y duración
- Indicador de carga en casa (🏠) via integración Monta

Define tus puntos habituales en **Configuración → Ubicaciones de carga**.  
Genera facturas PDF para reembolso (**Facturación → Crear factura**) — completamente del lado del cliente.

---

## 🗺️ Planificador de ruta

Planifica rutas con antelación y envíalas directamente a la navegación del Tesla:
- **Punto de inicio** — desde el GPS del vehículo, del navegador o entrada manual
- **Búsqueda de destino** — geocodificación Nominatim via proxy backend
- **Hasta 5 paradas** intermedias
- **Enrutamiento OSRM** — motor open-source, sin cuenta necesaria
- **SoC estimado de llegada** — basado en tu consumo real
- **Superposición de cargadores** — estaciones de carga rápida (CCS, CHAdeMO, Tesla) via OpenChargeMap
- **Enviar al Tesla** — un toque envía el destino a la navegación del vehículo
- **Guardar rutas** — rutas favoritas para acceso rápido
- **Alternativa ABRP** — enlace opcional a A Better Route Planner

---

## 🎮 Control del vehículo

- 🌡️ Climatización, temperatura, asientos/volante calefactados, modos Camp/Dog/Keep
- 🔓 Cerraduras, 💡 Luces, 🚪 Maletero/frunk, 🪟 Ventanas
- 🔌 Carga (tapa, amperaje, inicio/parada)
- ⏰ Carga programada, 🔄 Actualizaciones OTA, 🎵 Boombox

---

## 📝 Libro de mantenimiento

Documenta todos los eventos de mantenimiento: fecha, categoría, coste, kilometraje, taller.

Configura intervalos recurrentes en **Configuración → Intervalos de mantenimiento**. Se envían notificaciones push 30 días y 1 000 km antes de cada vencimiento.

---

## 💬 Grok Chat (Asistente IA)

Haz preguntas sobre tus datos Tesla en lenguaje natural, impulsado por xAI Grok:
- Contexto de viajes, sesiones de carga y datos del vehículo
- Respuestas en streaming, historial guardado, presupuesto diario configurable
- Las solicitudes van por el backend — nunca directamente a xAI

> Requiere `XAI_API_KEY` en `.env`. Obtén una clave en [console.x.ai](https://console.x.ai).

---

## 🔐 Seguridad & Autenticación

### Passkeys (WebAuthn)
Inicia sesión con Face ID, Touch ID o una llave de hardware.

### MFA (TOTP)
Autenticación de dos factores con cualquier aplicación autenticadora.

### QR-SSO para el navegador Tesla
1. El navegador Tesla muestra un código QR (válido 5 min)
2. Escanea con tu teléfono
3. Autentícate con el passkey/Face ID de tu teléfono
4. La sesión del navegador Tesla se desbloquea automáticamente

---

## 🧙 Asistente de configuración

Relanzable desde **Configuración → Iniciar asistente**.

**Pasos de administrador (primera configuración):** idioma → Tesla OAuth → vehículos → Virtual Key → Fleet Telemetry → precio electricidad → contenido legal → APIs externas → monitorización (SMTP + Anthropic) → diseño → color → unidades → panel → navegación → notificaciones → resumen

Los usuarios no administradores solo ven los pasos de diseño, unidades, panel, navegación, notificaciones y resumen.

---

## 🌡️ Tarifa dinámica (aWATTar / Tibber)

- Precio actual y gráfico de 24 h en el panel
- **Ventana de carga automática** — una pulsación programa la carga en la ventana de 4 h más barata

---

## 📱 PWA

Instala Tesla Carview en tu pantalla de inicio:
- **Android/Chrome escritorio:** icono de instalación en la barra de direcciones
- **iOS Safari:** Compartir → "Añadir a pantalla de inicio"
- **Navegador Tesla:** Menú → "Añadir a pantalla de inicio"

---

## 📤 Exportar & Copia de seguridad

- Viajes, sesiones de carga, libro de mantenimiento — CSV o JSON
- **Copia de seguridad completa** — JSON restaurable via **Admin → Gestión de datos**

---

## 📅 ICS Calendar Export

Planned routes can be exported as `.ics` files and imported into any calendar application. `CLASS:PRIVATE` is set automatically. Available in the Route Planner after a route has been calculated.

---

## 🛞 Tire Pressure (TireMap)

Top-down car silhouette with color-coded tires: green (OK), yellow (outside recommendation), red (critical). Tooltip and legend included.

---

## ♻️ Recuperation Statistics

Trip detail: recovered kWh, recuperation share (%), net consumption after recuperation. Only shown when data is available.

---

## 🔲 Control Layout Toggle

Switch between tile layout and compact list view in Vehicle Control. Preference saved in `localStorage`.
