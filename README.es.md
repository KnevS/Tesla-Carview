# ⚡ Tesla Carview

[![Version](https://img.shields.io/badge/version-v3.17.0-E31937?style=flat-square)](CHANGELOG.md)
[![License](https://img.shields.io/badge/License-PolyForm_Noncommercial-blue?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Raspberry_Pi_%7C_Linux_%7C_VPS-lightgrey?style=flat-square)](docs/02-deployment.en.md)

> 🇩🇪 [Deutsch](README.md) · 🇬🇧 [English](README.en.md) · 🇫🇷 [Français](README.fr.md) · 🇹🇷 [Türkçe](README.tr.md) · 🇬🇷 [Ελληνικά](README.el.md) · 🇺🇦 [Українська](README.uk.md)
>
> 📋 [Changelog](CHANGELOG.md) · 📚 [Documentación](docs/README.en.md)
>
> 🤖 *Las traducciones a FR/ES/TR/EL/UK se han generado con ayuda de IA a partir de DE/EN. Se agradecen correcciones a través de GitHub.*

> **© 2026 Sven Krische** · Licenciado bajo [PolyForm Noncommercial 1.0.0](LICENSE) · [AUTHORS](AUTHORS) · [NOTICE](NOTICE.md)
> Diseño, arquitectura e implementación originales por Sven Krische ([@KnevS](https://github.com/KnevS)).

**Car Usability Management** — autoalojado, sin nube, sin terceros.
Desde los recorridos GPS y el libro de ruta hasta la planificación de rutas con paradas de carga y el historial de mantenimiento:
todos los datos del vehículo permanecen en tu propio servidor.

Funciona en: **servidores Linux** (x86_64), **Raspberry Pi 3/4/5** (ARM64/ARMv7), desarrollo local.

<!-- Operator-Hinweis im Footer / Footer note for operators:
     Wer Tesla Carview selbst hostet, kann die eigenen Kontaktdaten
     ueber frontend/.env (siehe frontend/.env.example) einsetzen.
     Self-hosters can configure their own footer contact via the .env. -->


---

## ⚠ Importante — Estado de la API de Tesla en 2026

Tesla cerró la **Owner API no oficial** para los endpoints de vehículos entre mayo y junio de 2026. El workaround habitual de la comunidad (iniciar sesión con un refresh token de cuenta de Tesla y llamar a `/api/1/vehicles/{id}/vehicle_data`) ahora devuelve **HTTP 401 "invalid bearer token"** — el truco ha muerto y ningún parche puede resucitarlo.

Para los datos del vehículo en tiempo real (batería, climatización, TPMS, stream de telemetría) solo queda **una vía oficial**: la **Fleet API** de Tesla con aprobación de la aplicación a través de [developer.tesla.com](https://developer.tesla.com/). El tiempo de espera actual es de **semanas a meses**.

**💡 Crédito gratuito de Tesla — el uso privado típico cuesta 0 €/mes:** Tesla concede **10 USD de crédito gratuito por cuenta y mes** — habitualmente suficiente para cubrir el stream de telemetría de un vehículo y los comandos diarios. Por encima, se factura por uso (150 000 señales de stream = 1 USD, 1 000 comandos = 1 USD, 50 wake-ups = 1 USD). TeslaView ya está totalmente preparado — en el momento en que se apruebe tu aplicación, todas las funciones quedan activas al instante. La espera está exclusivamente del lado de Tesla; TeslaView siempre es gratuito.

**Lo que TeslaView sigue ofreciendo sin aprobación de la Fleet API:**

| Conexión | Fuente de datos | Lo que obtienes | Configuración |
|---|---|---|---|
| **OwnTracks** (recomendado, inmediato) | Smartphone del conductor | Viajes, traza GPS, distancia, velocidad | Paso 5 del asistente, ~5 min |
| **Tesla Fleet OAuth** | Nube de Tesla | Batería, climatización, TPMS, todo mediante polling | Requiere aprobación de la Fleet API |
| **Tesla Fleet Telemetry** | Tesla → push WebSocket | Stream en vivo | Fleet API + Virtual Key + **registro de la app con 1 clic en el asistente** (v3.23.5) |
| **Tesla Owner API** | Nube de Tesla | ❌ **bloqueada en 2026** | — |
| **Integración con Monta** | Nube de Monta | Coste de carga doméstica para liquidación de coches de empresa | Clave API en el asistente |

**En concreto, para nuevas instalaciones sin aprobación de Fleet:** activa OwnTracks — obtienes un libro de ruta basado en GPS conforme a la normativa, mapa de calor de viajes, seguimiento de distancia y asignación automática de conductor. Los valores ausentes de batería/climatización no son estrictamente necesarios para un libro de ruta clásico de empresa.

---

## Funciones

| Área | Descripción |
|---|---|
| **Dashboard** | Estadísticas generales, último viaje, gráfico de distancia mensual |
| **Viajes** | Traza GPS en el mapa, consumo, velocidad, SoC a lo largo del tiempo |
| **Métricas de viaje** (v3.37.0) | Análisis tabular por viaje: duración, distancia, consumo, velocidad y potencia como mín/máx/media — ordenable, con tarjetas de resumen y exportación CSV |
| **Mapa de calor** (v3.41.0) | Mapa de calor geográfico con cuatro capas conmutables: viajes (densidad inicio/fin), sesiones de carga, puntos de carga definidos y trayectos (como líneas) — rango temporal seleccionable, colores de capa ajustables, sin plugins de mapa externos |
| **Análisis de zonas** (v3.39.0) | Analiza el detalle del viaje por zonas: rangos de velocidad, zonas propias (geocercas/lugares de carga) o un tramo libre — valores en tabla + resaltado en el mapa, marcadores (Vmax, potencia máxima, regeneración, paradas) |
| **Planificador de carga** (v3.42.0) | Franjas de carga más baratas antes de la salida a partir de la tarifa dinámica (aWattar/Tibber): a partir de la carga objetivo, la capacidad de la batería, la potencia de carga y la hora de salida elige las horas más baratas — con coste, tiempo de carga y ahorro frente a cargar ahora. Solo análisis de la curva de precios, sin acceso al vehículo |
| **Reparto coche de empresa** (v3.43.0) | Divide la carga en casa entre uso profesional/privado y la exporta como PDF de reembolso — tarifa plana (§ 3 Nr. 50 EStG alemán, 30/70 €) o cuota por km (parte profesional × coste de carga en casa). Solo coches de empresa, en alemán |
| **Carga con excedente solar** (v3.44.0) | Cargar solo con excedente solar: lee el excedente de Home Assistant y deriva la corriente de carga recomendada — «Aplicar ahora» fija la corriente e inicia/detiene (Fleet API). Totalmente local, sin nube |
| **Impuesto coche de empresa** (v3.45.0) | Regla del 1 % vs. método del libro de ruta para el beneficio en especie — con tasa para VE dependiente de la fecha (0,25 %/0,5 %/1 %, límite de precio de catálogo según la fecha de compra). Cálculo orientativo, solo coches de empresa, en alemán |
| **Certificado SoH** (v3.46.0) | Certificado de salud de la batería en PDF para devolución de leasing/reventa — autonomía al 100 %, tasa de degradación, previsión hasta el 80 %, opcional SoH en %. Estimación estadística, sin garantía |
| **Libro de ruta a prueba de manipulaciones** (v3.47.0) | Cada cambio de un viaje va a una cadena hash enlazada y firmada con HMAC — el historial de cambios no puede alterarse sin dejar rastro (GoBD). Verificación de integridad + declaración en el PDF fiscal |
| **Cargas** | Sesiones de carga con coste, emparejamiento de ubicación de carga por GPS, las sesiones gratuitas se pueden marcar |
| **Ubicaciones de carga** | Puntos definibles con radio GPS, precio/kWh, detección automática |
| **Battery / Battery-Health Companion** | Fase 1 (v3.6.0): histórico de autonomía, degradación, curva de carga, eficiencia frente a temperatura exterior, drenaje fantasma, anomalías — todo son estadísticas puras a partir de tus propios datos. Fase 2 (v3.7.0): alertas persistentes de anomalías por push + sugerencias de preacondicionamiento ante heladas/calor (Open-Meteo) |
| **App hub** (v3.9.0) | Aplicaciones web seleccionadas para el navegador del Tesla: ARD Audiothek, Deutschlandfunk Live, GoingElectric, OpenChargeMap, Telegram Web, Wikipedia, ABRP — gratuitas, sin cuenta obligatoria, **deliberadamente sin duplicados** de las apps nativas de Tesla. Lista blanca por administrador por inquilino. Los admins añaden sus propias web apps (v3.40.0). |
| **Nearby** (v3.13.0) | POI alrededor de ti (cafetería, baños, parques infantiles, **geocachés**, supermercados, miradores…) vía OpenStreetMap Overpass. Selector de fuente: posición actual del vehículo / sesión de carga activa / último viaje. Caché local de 24 horas |
| **Puntos de carga con límite automático** (v3.12.0) | Gestiona cargadores de casa/trabajo/habituales: nombre, GPS, radio, tarifa, límite de carga deseado. Al llegar → comando `set_charge_limit` de Tesla (Fleet API) o, como alternativa, aviso push |
| **Validación de OwnTracks** (v3.11.0) | Tres líneas de defensa contra registros falsos: validación Bluetooth vía iOS Shortcut, bloqueo de viaje por vehículo, conmutador manual de pausa — evita que los viajes de carsharing o los registros duplicados con 2+ dispositivos contaminen el libro de ruta |
| **Dirección antes que coordenadas** (v3.10.0) | Todas las listas y vistas de detalle prefieren la dirección; las coordenadas lat/lon solo como respaldo (4 decimales, ~11 m) |
| **Geocodificación automática** (v3.8.0) | Los viajes/sesiones de carga con GPS pero sin dirección se resuelven automáticamente vía Nominatim/OSM — hook en vivo + backfill nocturno + disparador para admin, cacheado localmente durante 24 horas
| **Tech** | Telemetría en vivo: TPMS, flujo de energía, climatización, estado de carga |
| **Controles** | Comandos del vehículo: climatización, climate-keeper (modo perro/camping), calefacción de asientos (5 asientos × 4 niveles), calefacción del volante, puertas, frunk/portón, ventanillas, modo centinela, carga incl. slider de amperios y puerto de carga, programación de salida, boombox, actualización de software, navegación (requiere Virtual Key) |
| **Planificador de rutas** | Planificador interactivo con paradas de carga conscientes del SoC, incl. estimación del tiempo de carga; SoC de salida (en vivo o manual), SoC objetivo y meta de carga configurables; meteorología (Open-Meteo), tráfico (HERE Maps), radares (OpenStreetMap) a lo largo de la ruta; vista de mapa con tile proxy |
| **Libro de ruta** | Fahrtenbuch electrónico conforme a BMF: clasificación, contraparte comercial, propósito, columnas de cuentakilómetros, numeración consecutiva en PDF, bloqueo tras exportación, entrada manual, fusión/división de viajes |
| **Facturación** | Sesiones de carga doméstica e integración con Monta para todos los vehículos; informe de costes (PDF, plantilla de reembolso) para coches de empresa |
| **Registro de servicio** | Mantenimientos, reparaciones, neumáticos, inspecciones con coste |
| **Exportación** | Exportación CSV/JSON/**PDF** de viajes y cargas, copia de seguridad completa; libro de viajes PDF listo para imprimir con fecha, distancia, energía, SOC |
| **Intervalos de servicio** | Tareas de servicio recurrentes por vehículo (ITV, neumáticos, líquido de frenos, …) con intervalos por tiempo y por km + recordatorios push diarios |
| **Audit log** | Visor de administración para eventos de seguridad con filtros y exportación CSV (compatible con RGPD) |
| **Tarifa dinámica** | Integración con aWattar (DE/AT) y Tibber: curva de precios de 24 h en el dashboard, programación de carga con un clic en la ventana de 4 h más barata |
| **Reembolso en PDF** | PDF firmable para el reembolso de la carga doméstica (lado cliente, sin nube) |
| **Notificaciones** | Web Push + Telegram + **email** en paralelo al terminar carga, umbrales SOC, geocercas y recordatorios de mantenimiento — cada canal configurable individualmente |
| **Bot de Telegram** | Bot 1:1 completo con botones inline: `/status` (con botones de bloqueo/climatización/centinela/carga + confirmación de desbloqueo), `/battery`, `/range`, `/location` (enlace a Maps), `/today`, `/trips`, `/classify` (etiquetar un viaje), `/service`, `/firmware`, `/clean` — además de push proactivo para fin de carga, alertas de centinela, recordatorios de servicio y nuevas versiones de firmware. Audit log para cada acción sobre el vehículo. Ver más abajo ["¿Por qué Telegram y no WhatsApp / Signal?"](#por-qué-telegram-y-no-whatsapp--signal) |
| **Manual de usuario** | Guía completa legible directamente dentro de la app |
| **Diseño y temas** | 5 estilos de diseño (Glass, Cyber, Minimal, Sport, **Nevs-Edition**) + 6 colores de acento, todo almacenado localmente; Nevs-Edition con su propia tipografía Bricolage Grotesque y barra de estado en vivo |
| **Ajustes** | Todas las secciones plegables y reordenables individualmente (arrastrar para ordenar) |
| **Navegación** | Entradas de navegación ordenables y ocultables individualmente |
| **Móvil / Tesla** | PWA instalable para iPhone/iPad (Safari), Android, el navegador del Tesla y el escritorio. Barra de pestañas inferior estilo iOS (4 pestañas rápidas + bottom sheet "Más"). Vista de tarjetas compactas en el libro de ruta en pantallas estrechas. |
| **Balance CO₂** | Página dedicada que compara el CO₂ ahorrado frente a un vehículo de combustión equivalente (6,5 l/100 km), equivalentes en árboles/año y vuelos ida y vuelta Fráncfort–Mallorca, metodología transparente. También semanal en el Informe de Energía. |
| **Resumen semanal** | Cada lunes a las 07:00 automático: km, consumo, coste de carga, tendencia vs. semana anterior — por push, Telegram y email |
| **Consumo según meteorología** | Correlación del consumo por franja de temperatura (< −10 °C a > 30 °C) en el Informe de Energía — muestra cómo el frío y el calor afectan a la autonomía |
| **Estadísticas climáticas** | Uso diario del aire acondicionado (horas), calefacción de asientos, contador de preacondicionamiento, día más frío/cálido |
| **Tracker de firmware** | Registra automáticamente cada nueva versión de software del vehículo con histórico y días instalados |
| **Community Benchmark** | Comparación anónima opt-in del consumo con otros conductores del mismo modelo; k-anonimato, hash SHA-256, conforme al RGPD |
| **Estado del sistema** | Tarjeta tipo semáforo (token de Tesla, Virtual Key, Fleet Telemetry, poller, BD) — verde/amarillo/rojo de un vistazo |
| **Autodiagnóstico operativo** (v3.32) | Autodiagnóstico de admin en **Sistema**: bajo demanda y automáticamente cada semana en el mantenimiento nocturno verifica seguridad e integridad del backup — cobertura MFA, clave de cifrado, secretos críticos, actividad del registro de auditoría, integridad de SQLite, además de vigencia e integridad del último backup — como informe tipo semáforo. Pura diagnosis, sin IA |
| **Mapa de calor de actividad** | Mapa de calor tipo calendario de todos los viajes (Año/Mes/Semana/Todo), un clic lleva a la lista de viajes de ese día |
| **Pseudónimo de inquilino** | Privacidad: la página de inicio de sesión muestra un pseudónimo aleatorio `adjetivo-sustantivo` en lugar del nombre real del inquilino, regenerable por el admin |
| **Fleet Telemetry primero** | Streaming WebSocket como fuente de datos preferida (requiere aprobación de Tesla). Cuando está activo → el poller cae a un heartbeat de 1×/h, ahorrando >95 % del presupuesto de API. En caso contrario, polling de API como respaldo |
| **Registro de Tesla con 1 clic** (v3.23.5) | El asistente registra tu app con Tesla por sí mismo (`partner_accounts`) — sin terminal, sin `curl`. Introduce Client ID + Secret, confirma el dominio, registra. El secreto permanece en el servidor, el dominio = `FRONTEND_URL` (no falsificable). Requisito para Fleet Telemetry |
| **Cifrado en reposo** | AES-256-GCM para los tokens OAuth de Tesla, el secreto MFA TOTP y la clave privada de Virtual Key. Hash + comparación timing-safe para tokens de restablecimiento de contraseña. Clave autogenerada en `data/.encryption-key` |
| **PWA con autoactualización** | El service worker detecta despliegues y recarga automáticamente — no se requiere `Ctrl+Shift+R`, incluso en la PWA de iOS |

---

## Vista previa

Capturas en vivo de la instancia demo, actualizadas a diario a las 04:45:

<table>
  <tr>
    <td><img src="https://www.teslaview.krische.com/shots/desktop/dashboard.png" alt="Dashboard" /></td>
    <td><img src="https://www.teslaview.krische.com/shots/desktop/trips.png" alt="Trips" /></td>
    <td><img src="https://www.teslaview.krische.com/shots/desktop/charging.png" alt="Charging" /></td>
  </tr>
  <tr>
    <td align="center"><em>Dashboard</em></td>
    <td align="center"><em>Viajes</em></td>
    <td align="center"><em>Cargas</em></td>
  </tr>
  <tr>
    <td><img src="https://www.teslaview.krische.com/shots/desktop/routes.png" alt="Route planner" /></td>
    <td><img src="https://www.teslaview.krische.com/shots/desktop/telemetry.png" alt="Telemetry" /></td>
    <td><img src="https://www.teslaview.krische.com/shots/desktop/settings.png" alt="Settings" /></td>
  </tr>
  <tr>
    <td align="center"><em>Planificador de rutas</em></td>
    <td align="center"><em>Telemetría</em></td>
    <td align="center"><em>Ajustes</em></td>
  </tr>
</table>

📸 Demo en vivo: **[demo.teslaview.krische.com](https://demo.teslaview.krische.com)** · [Vista móvil](https://www.teslaview.krische.com/shots/mobile/dashboard.png) · [Todas las capturas](https://www.teslaview.krische.com/#screens)

### Bot de Telegram

Vincula tu cuenta en *Ajustes → Telegram* y utiliza el bot directamente en iPhone/Android:

<table>
  <tr>
    <td width="33%"><img src="https://www.teslaview.krische.com/shots/mobile/telegram-status.png" alt="/status with inline buttons" /></td>
    <td width="33%"><img src="https://www.teslaview.krische.com/shots/mobile/telegram-notification.png" alt="Push notification" /></td>
    <td width="33%"><img src="https://www.teslaview.krische.com/shots/mobile/telegram-classify.png" alt="Classify a trip" /></td>
  </tr>
  <tr>
    <td align="center"><em>/status con botones inline</em></td>
    <td align="center"><em>Notificación push</em></td>
    <td align="center"><em>Clasificar un viaje</em></td>
  </tr>
</table>

Comandos: `/status`, `/battery`, `/range`, `/location`, `/today`, `/trips`, `/classify`, `/service`, `/firmware`, `/clean`, `/help`, `/unlink`. Botones inline bajo `/status` para bloquear/desbloquear (con confirmación), climatización, centinela, carga. Notificaciones push para fin de carga, alertas de centinela, recordatorios de servicio y actualizaciones de software — en paralelo con Web Push.

[Ver todos los mockups de Telegram ↗](https://www.teslaview.krische.com/#telegram)

#### ¿Por qué Telegram y no WhatsApp / Signal?

Nos lo preguntan a menudo — resumen breve:

| Servicio | ¿Autoalojable? | ¿API para bots privados? | ¿Se usa aquí? |
|---|---|---|---|
| **Telegram** | Bot API totalmente abierta, BotFather es gratuito, sin riesgo para la cuenta | ✅ Sí | ✅ **Sí, canal principal** |
| **WhatsApp** | Solo vía Meta Cloud API (cuenta Business + número de empresa verificado + aprobación de plantillas). El uso privado con tu propio número **no está previsto**. Las librerías no oficiales (whatsapp-web.js, baileys) son una **violación de los ToS** y conducen al baneo de la cuenta. | ❌ No para usuarios privados | ❌ **No** — deliberadamente no implementado |
| **Signal** | No hay servidor de bots oficial, no hay API de webhook. Los forks autoejecutados (signald) son frágiles y Signal los bloquea con regularidad. | ❌ No | ❌ **No** |
| **Threema** | API REST oficial para empresas — pero de pago (~50 €/año por cuenta gateway) | ⚠ Sí, comercial | ❌ No implementado (de pago) |
| **Web Push** (PWA) | Estándar del navegador, funciona directamente en iPhone/Android, sin cuenta, sin servidor de terceros más allá del servicio push del navegador | ✅ Sí | ✅ **Sí, canal principal** |

**Conclusión:** Telegram + Web Push cubren juntos los canales más importantes — sin costes de terceros, sin violaciones de ToS, sin tracking. WhatsApp sería técnicamente posible, pero la configuración (construcción Business con el proceso de aprobación de Meta) contradice la naturaleza autoalojada de TeslaView. Si realmente quieres WhatsApp: los usuarios avanzados pueden añadir por su cuenta soluciones puente como *whatsapp-web.js* — no lo recomendamos.

---

## Arquitectura multi-tenant (desde v2.0)

Desde la v2.0, Tesla Carview soporta **múltiples inquilinos** con aislamiento total de datos:

- Cada inquilino tiene su propia base de datos SQLite
- Nuevos inquilinos únicamente vía **enlace de invitación** con **nota** opcional (Admin → Usuarios → Crear enlace de invitación, válido 7 días, de un solo uso); las invitaciones pueden reemitirse, revocarse de forma soft o eliminarse
- **Varios vehículos** por inquilino: sincronización vía Ajustes → 🔄 Sincronizar vehículos
- **Gestión de usuarios** por inquilino (roles, asignación de vehículo, bloqueo) con permisos detallados: `Editar vehículos`, `Añadir vehículos`, `MFA obligatorio` por usuario
- **MFA forzado para cuentas nuevas** — el guard del router redirige a la configuración TOTP hasta que el MFA esté activo
- **Tarjeta de tareas del admin** lista los usuarios activos sin vehículo asignado con acciones de un clic
- **Las entradas del libro de ruta registran su autor** y lo muestran junto a cada entrada
- **Autenticación con Passkey** (Touch ID, Face ID, Windows Hello, FIDO2)
- **Restablecimiento de contraseña** mediante enlace generado por el admin
- **Detección de wallbox doméstica vía Monta** (coincidencia de charge-point-ID → marcador 🏠 en la lista de cargas y en la facturación)
- **Sesiones de carga gratuitas**: marcables en el histórico de cargas, excluidas de la facturación
- **El bump de versión en las páginas legales** escribe automáticamente la fecha de hoy en la línea "Stand:" antes de incrementar

---

## Requisitos del sistema

| Componente | Mínimo | Recomendado | Nota |
|---|---|---|---|
| **CPU** | 1 núcleo | 2+ núcleos | Pi 5 / VPS / x86 — ARM64 + AMD64 soportados |
| **RAM** | 2 GB | 4+ GB | con Ollama: se requieren 4+ GB (modelo 1B), 8+ GB para modelos 3B |
| **Disco** | 2 GB | 10+ GB | con Ollama: 1–20 GB adicionales por modelo |
| **SO** | con Docker | Debian/Ubuntu/Pi OS | recomendado basado en systemd |
| **Internet** | no | DSL+ | para la API de Tesla + pulls de imágenes en GHCR + descargas de modelos de Ollama |

### Tabla de hardware para modo IA (Ollama local)

Si quieres usar el chat de IA local con soberanía de datos (Ollama, activo por defecto):

| Hardware | Modelo recomendado | RAM | tok/s (inferencia) | Útil para |
|---|---|---|---|---|
| Pi 4 (4 GB) | `llama3.2:1b` | ~1.5 GB | 4–6 | preguntas y respuestas simples, latencia perceptible |
| Pi 4 (8 GB) | `qwen2.5:1.5b` | ~1.8 GB | 3–5 | mejor, aún lento |
| Pi 5 (8 GB) | `qwen2.5:3b` | ~3 GB | 4–6 | predeterminado recomendado |
| VPS (4 vCPU / 8 GB) | `qwen2.5:3b` | ~3 GB | 8–12 | cómodo |
| VPS / estación de trabajo (16 GB+) | `llama3:8b` | ~6.5 GB | 5–8 | muy bueno, algo más lento |
| GPU (8+ GB VRAM) | `llama3:8b` o similar | según modelo | 30–80+ | de nivel empresarial |

**Desactiva Ollama** si tu hardware no puede ejecutarlo — crea un `docker-compose.override.yml` con:
```yaml
services:
  ollama:
    profiles: [disabled]
```
Luego `docker compose up -d` sin Ollama. O más sencillo: en el asistente, ajusta `AI provider = Off`. Alternativa en la nube: `AI provider = Grok` (requiere clave API de xAI, los datos van a la nube).

## Quickstart

> **⏳ Preparación del lado de Tesla (puede ejecutarse en paralelo con la instalación):**
> Usar la Fleet API de Tesla implica registrar una aplicación en [developer.tesla.com](https://developer.tesla.com/). **La aprobación de Tesla puede tardar de 1 a 3 semanas.** La instalación en sí funciona sin ella — todas las funciones que no son de Tesla están inmediatamente disponibles, y puedes añadir las credenciales de Tesla más tarde con `bash deploy/setup-wizard.sh`. Consulta [docs/04-tesla-api.en.md](docs/04-tesla-api.en.md) para los pasos y la configuración del Virtual Key.

### Raspberry Pi / servidor Linux (recomendado)

```bash
# Como root en la máquina destino:
curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
```

El script detecta automáticamente la arquitectura (x86_64, ARM64, ARMv7) e instala todo.

### Desarrollo local

```bash
git clone https://github.com/KnevS/Tesla-Carview.git
cd Tesla-Carview

# Backend
cd backend
cp .env.example .env
# ajusta .env (¡JWT_SECRET es obligatorio!)
npm install && npm run dev

# Frontend (segundo terminal)
cd frontend && npm install && npm run dev
```

→ abre el navegador: **http://localhost:5173**
→ en el primer arranque se te redirige automáticamente al asistente de configuración

### Solo configurar (sin instalar)

```bash
bash deploy/setup-wizard.sh
```

Asistente interactivo para: dominio, credenciales de la API de Tesla, e-mail, Web Push.

---

## Configuración inicial (asistente web)

En el primer arranque la app redirige automáticamente a **/setup**.
Allí puedes crear el nombre del inquilino y la cuenta de administrador desde el navegador.

Pasos recomendados tras iniciar sesión:
1. Conectar el vehículo Tesla (Ajustes → Tesla)
2. Registrar el Virtual Key en el vehículo (Ajustes → Virtual Key)
3. Activar MFA (Ajustes → Autenticación de doble factor)
4. Configurar ubicaciones de carga

El **manual de usuario** está disponible directamente dentro de la app en `/handbook`.

---

## Comandos de vehículo y Virtual Key

Se necesita un **Virtual Key** para los comandos del vehículo (climatización, puertas, claxon, etc.).
El Virtual Key permite que la app envíe comandos firmados directamente al vehículo.

**Requisito previo**: tener un [`tesla-http-proxy`](https://github.com/teslamotors/vehicle-command) en ejecución en el servidor.

```bash
# arranca el proxy (ejemplo — ajusta las rutas):
tesla-http-proxy -port 4443 -host 0.0.0.0 \
  -tls-key /etc/tesla-proxy/server.key \
  -cert /etc/tesla-proxy/server.crt \
  -key-file /etc/tesla-proxy/tesla_priv.pem
```

La clave pública debe estar accesible en `/.well-known/appspecific/com.tesla.3p.public-key.pem`
en el dominio de la app para que el vehículo pueda verificar la clave.


---

## Integración con Monta (opcional)

Tesla Carview soporta sincronización opcional con [Monta](https://monta.com) — un servicio de gestión de carga para vehículos eléctricos. La integración está disponible para **todos los vehículos**:

- **Vehículos privados**: las sesiones de carga de Monta aparecen en la vista de facturación como cargas domésticas (badge 🏠, detección automática de wallbox doméstica).
- **Coches de empresa**: además, facturación completa de costes — resumen mensual, hoja de reembolso firmable en PDF, plantilla de facturación para el empleador.

Configuración por vehículo en los ajustes (Perfil del vehículo → Carga doméstica):
- **Monta Client ID** + **Client Secret** (OAuth2, Partner API)
- **Charge Point ID** (filtra las sesiones a un punto de carga concreto)
- **Precio de la electricidad de la wallbox** (€/kWh, base de facturación para coches de empresa)

La sincronización se ejecuta manualmente desde **Facturación → Sincronización con Monta**.


---

## Seguridad

- JWT (access token 15 min, refresh token 7 días como cookie httpOnly)
- **TOTP MFA** (Google Authenticator, Authy, 1Password, etc.)
- **Passkeys** (WebAuthn, inicio de sesión sin contraseña)
- **10 códigos de respaldo** (hash bcrypt, de un solo uso)
- **Bloqueo de cuenta** tras 5 intentos fallidos (15 min)
- **fail2ban** bloqueo de IP tras 3 logins fallidos (10 min)
- **HTTPS** con TLS 1.2/1.3, HSTS, OCSP stapling
- Cabeceras **CSP, X-Frame-Options, Permissions-Policy**
- **Rate limiting** en login y endpoints de la API
- **Audit log** de todas las acciones relevantes para la seguridad
- **Eliminación de datos** con aviso de copia de seguridad y texto de confirmación

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Frontend | Vue 3 + Vite + Pinia + Tailwind CSS + Chart.js + Leaflet |
| Backend | Node.js 20 + Express + SQLite (better-sqlite3) |
| Auth | JWT + bcrypt + TOTP (otpauth) + WebAuthn (@simplewebauthn) |
| Datos de Tesla | Tesla Fleet API (OAuth2) + Fleet Telemetry (WebSocket) |
| Multi-tenancy | Bases de datos SQLite separadas por inquilino, BD maestra para datos globales |
| Despliegue | Docker Compose + nginx + Let's Encrypt |
| Plataformas | linux/amd64 · linux/arm64 · linux/arm/v7 |

---

## Estructura del proyecto

```
tesla-carview/
├── backend/
│   ├── src/
│   │   ├── db/            # schema + DB initialisation (master-schema.sql)
│   │   ├── middleware/    # auth.js (multi-tenant JWT), security.js, validate.js
│   │   ├── routes/        # auth, setup, register, passkey, password-reset,
│   │   │                  # users, vehicles, trips, charging, data-management, …
│   │   └── services/      # teslaApi, poller (multi-tenant), dataSync (GPS), …
│   └── .env.example       # configuration template
├── frontend/
│   └── src/
│       ├── views/         # Login, Register, Setup, Dashboard, Trips,
│       │                  # Settings (Passkey), UserManagement, DataManagement,
│       │                  # Handbook, PasswordReset, …
│       ├── components/    # NavBar (admin links, handbook), StatCard
│       ├── store/         # auth.js (passkey, tenant), index.js
│       └── router/        # routes with admin guard
├── deploy/
│   ├── setup.sh                  # fully automated server setup
│   ├── setup-wizard.sh           # interactive configuration assistant
│   ├── nginx-host.conf.template  # nginx config (HTTPS, TLS hardening)
│   └── update.sh                 # zero-downtime update
├── docs/                  # detailed guides
├── docker-compose.yml          # development
└── docker-compose.prod.yml     # production
```

---

## Variables de entorno importantes (.env)

| Variable | Descripción | Ejemplo |
|---|---|---|
| `JWT_SECRET` | Clave secreta para JWT (≥ 32 caracteres, aleatoria) | `openssl rand -hex 32` |
| `TESLA_CLIENT_ID` | Client ID de la app de Tesla Developer | `abc123…` |
| `TESLA_CLIENT_SECRET` | Secret de la app de Tesla Developer | `secret…` |
| `FRONTEND_URL` | URL pública de la app (para callback OAuth + passkeys) | `https://carview.example.com` |
| `RP_NAME` | Nombre mostrado en los diálogos de passkey | `Tesla Carview` |
| `RP_ID` | Dominio para WebAuthn (sin protocolo) | `carview.example.com` |

---

## Documentación

Tesla Carview se entrega con dos niveles de documentación independientes:

### 👤 Para los usuarios de la app

Manual integrado en `/handbook` dentro de la app en ejecución — o léelo directamente en [`frontend/src/handbook/handbook.en.md`](frontend/src/handbook/handbook.en.md). Temas: dashboard, viajes, cargas, libro de ruta conforme a BMF, controles del vehículo, intervalos de servicio, modo demo, instalación móvil, troubleshooting del lado del usuario.

### 🛠 Para self-hosters y administradores

Documentación técnica en la carpeta [`docs/`](docs/README.en.md):

| Documento | Contenido |
|---|---|
| [📚 Índice de docs](docs/README.en.md) | Mapa de todos los documentos técnicos |
| [Quickstart](docs/01-quickstart.en.md) | Entorno de desarrollo local |
| [Despliegue](docs/02-deployment.en.md) | Despliegue en servidor + Raspberry Pi |
| [Autenticación y MFA](docs/03-authentication.en.md) | Sistema de login, MFA, passkeys |
| [Tesla Fleet API](docs/04-tesla-api.en.md) | Configurar cuenta de Tesla Developer |
| [Arquitectura de seguridad](docs/05-security-architecture.en.md) | Modelo de amenazas, todas las medidas |
| [fail2ban](docs/06-fail2ban.en.md) | Configurar la protección contra fuerza bruta |
| [Asistente de configuración](docs/07-setup-wizard.en.md) | Asistente de configuración interactivo |
| [Despliegue con Dokploy](docs/08-dokploy.en.md) | Plataforma de despliegue alternativa |
| [Cuota de la API de Tesla](docs/09-tesla-api-usage.en.md) | Coste y seguimiento de la API |
| **[🔧 Configuración (ENV)](docs/10-configuration.en.md)** | Todas las variables de entorno — obligatorias, opcionales, demo, auto-update |
| **[🛠 Operaciones](docs/11-operations.en.md)** | Backup/restore, mantenimiento nocturno, modo demo, auto-update, logs |
| **[🛡️ Alta disponibilidad (HA)](docs/12-high-availability.en.md)** | Opciones de arquitectura para configuraciones críticas con SLA (teaser, bajo petición) |

---

## Actualizaciones

```bash
bash deploy/update.sh
```

---

## Contribuciones

¡Las contribuciones son bienvenidas! Lee primero las [Pautas de contribución](CONTRIBUTING.md), luego elige un [good first issue](https://github.com/KnevS/Tesla-Carview/labels/good%20first%20issue) o abre directamente un pull request.

---

## Licencia

[**PolyForm Noncommercial 1.0.0**](LICENSE) — licencia de software no comercial de [polyformproject.org](https://polyformproject.org).

**Permitido:** uso personal, autoalojamiento (incluyendo para familia/hogar), modificaciones, redistribución gratuita bajo los mismos términos, uso por parte de organizaciones benéficas, instituciones educativas y de investigación pública.

**Prohibido:** vender el software, ejecutarlo como servicio de pago (SaaS) para terceros, uso comercial de cualquier tipo, sublicencia.

Toda redistribución debe incluir el texto completo de la licencia y el `Required Notice` de copyright. El software se proporciona "tal cual", sin garantía — para más detalles ver [LICENSE](LICENSE).

### 📜 Divulgación de Prior-Art

Todos los procedimientos técnicos documentados en este repositorio — en particular **Battery-Health Companion** (fases 1+2), **validación de OwnTracks mediante disparador Bluetooth** con bloqueo de viaje por vehículo, **límite de carga automático por ubicación geocercada**, **app hub web curado para el navegador de Tesla**, **búsqueda de POI alrededor de una sesión de carga vía OSM Overpass**, **geocodificación inversa automática con caché local**, **estrategia de UI con dirección primero** y **detección de anomalías en múltiples etapas con recomendaciones push** — se publican públicamente con la fecha del commit Git correspondiente y constituyen "prior art" en el sentido del derecho de patentes y marcas.

Esta divulgación pretende evitar que terceros presenten posteriormente registros de propiedad intelectual sobre los mismos procedimientos.

Los hashes de Git y las marcas de tiempo de los commits son criptográficamente verificables y reciben una marca temporal independiente por parte de GitHub.

---

## ❤️ Apoyo

Tesla Carview es gratuito y sin publicidad **para uso privado y autoalojado en tu propio hogar** (ver [LICENSE](LICENSE) y [PolyForm Noncommercial 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0/)). La reventa comercial, el hosting SaaS para terceros o la integración en productos comerciales **no** están permitidos.

Si el programa vale algo para ti, las siguientes organizaciones sin
ánimo de lucro agradecerán tu apoyo directo:

| Organización | Descripción |
|---|---|
| **Aktion Deutschland Hilft** | Alianza de organizaciones de ayuda para una asistencia rápida y eficaz en catástrofes en todo el mundo |
| **Lebenshilfe Rems-Murr** | Apoyo, acompañamiento e inclusión para personas con discapacidad en la región de Rems-Murr |
| **Radio 7 Drachenkinder** | Ayuda para niños gravemente enfermos en la región — financia terapias y deseos |

> **El 100 % de tu donación va directamente a la organización. No vemos ni el importe ni tus datos.**

Accesible en la app mediante el enlace **❤ Apoyo** en el pie de página de cada página, o directamente en `/support`.
