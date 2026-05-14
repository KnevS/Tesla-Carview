🌐 **Idioma:** [EN](Features) · [DE](DE-Features) · [FR](FR-Features) · **ES** · [TR](TR-Features) · [EL](EL-Features)

---

# Descripción de funciones

Tesla Carview cubre el ciclo de vida completo de tu Tesla — desde el registro de cada viaje hasta el control del coche y la gestión de los costes de carga.

---

## 📊 Panel de control

El panel es tu vista central, mostrando:
- **Estado del vehículo en tiempo real** — nivel de batería, autonomía, ubicación, estado de carga
- **Viajes recientes** — últimos 5 viajes con distancia y consumo
- **Estadísticas mensuales** — distancia, energía usada, coste de carga
- **Widget de tarifa dinámica** — precio de electricidad actual (aWATTar DE/AT, Tibber)
- **Intervalos de servicio** — recordatorios de mantenimiento próximos (ITV, aceite, líquido de frenos, etc.)
- **Salud del sistema** — estado de conexión API Tesla, Fleet Telemetry, tamaño de la base de datos

El panel se actualiza automáticamente cada 60 segundos cuando tienes la pestaña abierta.

---

## 🚗 Viajes (Libro de registros)

Cada viaje se registra automáticamente con:
- Ubicación de inicio y fin (dirección + coordenadas GPS)
- Distancia, duración, velocidad media
- Consumo de energía (kWh y kWh/100 km)
- Nivel de batería al inicio/fin
- Clasificación del tipo de viaje (privado / trabajo / empresa)

### Libro de registros de viajes
El libro de registros cumple con los requisitos legales:
- Campos de socio comercial y propósito del viaje
- Numeración secuencial de viajes
- Función "Bloquear" para finalizar el libro de registros
- **Exportación PDF** en formato A4 apaisado con todos los campos legalmente requeridos
- Fusión y división de viajes para trayectos con múltiples paradas
- Creación manual de viajes para entradas olvidadas

### Edición de ubicación GPS
Si un viaje tiene una dirección incorrecta o que falta, puedes editarla directamente:
- Haz clic en cualquier viaje → Editar ubicación
- Introduce la dirección manualmente o arrastra un marcador en el mapa

---

## ⚡ Carga

Todas las sesiones de carga se registran automáticamente:
- Ubicación (coincidencia GPS con ubicaciones de carga guardadas)
- Energía añadida (kWh) y coste estimado
- Velocidad y duración de carga
- Indicador de carga en casa (🏠) via integración Monta

### Ubicaciones de carga
Define tu casa y puntos de carga habituales:
- **Ajustes → Ubicaciones de carga** → Añadir con dirección + GPS + radio
- Las sesiones en esa ubicación se etiquetan automáticamente
- Establece una tarifa por kWh por ubicación para el cálculo de costes

### Integración Monta
Si usas Monta para la carga doméstica:
- Introduce tu clave API de Monta en los ajustes
- Las sesiones Monta se sincronizan automáticamente con los datos correctos de kWh y coste
- El indicador de carga doméstica se establece automáticamente

### Cálculo de costes y factura PDF
Genera facturas PDF para reembolso (ej. para tu empresa):
- **Facturación → Generar factura**
- Selecciona el rango de fechas e incluye/excluye sesiones específicas
- PDF con membrete, tabla, totales y campo de firma
- Generado completamente en el cliente — ningún dato sale de tu servidor

---

## 🔋 Batería

Sigue la salud de tu batería a lo largo del tiempo:
- Curva de degradación (autonomía estimada vs. autonomía nominal)
- Contador de ciclos de carga
- Datos históricos del nivel de carga
- Autonomía a diferentes temperaturas (comparación invierno vs. verano)

---

## 🎮 Control del vehículo

Controla tu Tesla directamente desde la app:
- 🌡️ **Clima** — encender/apagar, ajustar temperatura, calefacción de asientos, calefacción del volante
- 🔓 **Cerraduras** — bloquear/desbloquear puertas
- 💡 **Luces** — destellar luces, bocina
- 🚪 **Maletero/frunk** — abrir maletero y frunk
- 🔌 **Carga** — abrir/cerrar puerto de carga, ajustar amperios, iniciar/detener
- 🔄 **Actualizaciones de software** — activar y supervisar actualizaciones OTA
- ⏰ **Carga programada** — configurar ventanas de carga en horas valle
- 🎵 **Boombox remoto** — activar sonidos boombox (donde sea compatible)
- 🌬️ **Modo de climatización** — establecer modo camping/perro/mantener
- 🪟 **Ventanas** — abrir/cerrar ventanas

> Los comandos requieren que la **Virtual Key** esté emparejada. Ver [Configuración de la API Tesla](ES-Tesla-API-Setup#paso-3-configurar-la-virtual-key-para-comandos).

---

## 📝 Libro de mantenimiento

Registra todos los eventos de mantenimiento:
- Fecha, categoría (mantenimiento / reparación / neumáticos / inspección / nota)
- Coste, kilometraje
- Descripción y archivos adjuntos
- Quién realizó el trabajo (nombre del taller)

### Intervalos de servicio y recordatorios
Configura recordatorios de mantenimiento recurrentes:
- **Ajustes → Intervalos de servicio** → Añadir intervalo (ej. "ITV en 2 años", "Líquido de frenos cada 2 años")
- Notificaciones push 30 días antes y 1000 km antes de cada intervalo
- El panel muestra los próximos servicios como tarjeta de vista previa

---

## 📤 Exportar

Exporta todos tus datos:
- **Viajes** — CSV o JSON
- **Sesiones de carga** — CSV o JSON
- **Libro de mantenimiento** — CSV
- **Copia de seguridad completa** — JSON (todas las tablas), importable para restaurar

---

## 🔔 Notificaciones push

Recibe notificaciones en tu navegador cuando:
- La carga se completa
- Se acerca un intervalo de servicio
- Hay una actualización de software disponible

Las notificaciones funcionan en escritorio (Chrome, Firefox, Edge) y móvil (Android Chrome, iOS Safari con acceso directo en pantalla de inicio).

**Configuración:** Ajustes → Notificaciones push → Activar notificaciones

---

## 📱 PWA (Progressive Web App)

Tesla Carview funciona como una PWA — puedes instalarla en tu pantalla de inicio:

- **Android/Chrome escritorio:** Toca el icono de instalación en la barra de direcciones
- **iOS Safari:** Compartir → "Añadir a pantalla de inicio"
- **Navegador Tesla:** Menú → "Añadir a pantalla de inicio"

La PWA instalada funciona sin conexión para páginas en caché y recibe notificaciones como una app nativa.

---

## 🌡️ Tarifa dinámica (aWATTar / Tibber)

Si tienes una tarifa eléctrica dinámica:
- Conecta aWATTar (DE/AT, sin clave API necesaria) o Tibber (clave API en Ajustes)
- El panel muestra el precio actual y el gráfico de precios de 24 horas
- **Configurar ventana de carga automáticamente** — un clic configura la carga programada en la ventana de 4 horas más barata en las próximas 24 horas

---

## 🌍 Multiidioma

La app está completamente traducida a:
🇩🇪 Alemán · 🇬🇧 Inglés · 🇫🇷 Francés · 🇪🇸 Español · 🇹🇷 Turco · 🇬🇷 Griego

El idioma se determina por:
1. Tu configuración de perfil de usuario (tiene prioridad)
2. El idioma predeterminado del inquilino
3. El idioma de tu navegador

---

## 🧪 Modo demo

Opcionalmente activa un modo demo para que otros puedan probar la app sin un Tesla real:
- `DEMO_ENABLED=true` en `.env`
- Se generan automáticamente viajes y historial de carga ficticios
- Las cuentas demo expiran después de 14 días
- La limitación por IP previene el abuso

---

## 🌙 Modo mantenimiento

La app muestra automáticamente una superposición de "mantenimiento" cuando el backend no está disponible (reiniciando tras actualizaciones). Muestra citas de Tesla en alemán/inglés, un temporizador de cuenta atrás, y sondea cada 3 segundos hasta que el backend vuelve — luego desaparece.
