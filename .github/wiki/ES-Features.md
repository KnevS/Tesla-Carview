🌐 **Language / Sprache / Langue / Idioma / Dil / Γλώσσα**

| | |
|---|---|
| 🇬🇧 **[English](Features)** | English version |
| 🇩🇪 **[Deutsch](DE-Features)** | Deutsche Version |
| 🇫🇷 **[Français](FR-Features)** | Version française |
| 🇪🇸 **[Español](ES-Features)** | Estás aquí |
| 🇹🇷 **[Türkçe](TR-Features)** | Türkçe sürüm |
| 🇬🇷 **[Ελληνικά](EL-Features)** | Ελληνική έκδοση |

---

# Descripción general de funciones

Tesla Carview cubre el ciclo de vida completo de su Tesla — desde el registro de cada viaje hasta el control del automóvil y la gestión de los costos de carga.

---

## 📊 Dashboard

El dashboard es su panel central, que muestra:
- **Estado del vehículo en tiempo real** — nivel de batería, autonomía, ubicación, estado de carga
- **Viajes recientes** — los últimos 5 viajes con distancia y consumo
- **Estadísticas mensuales** — distancia, energía utilizada, costo de carga
- **Widget de tarifa dinámica** — precio actual de la electricidad (aWATTar DE/AT, Tibber)
- **Intervalos de servicio** — recordatorios de mantenimiento próximos (ITV, aceite, líquido de frenos, etc.)
- **Estado del sistema** — estado de la conexión con la API de Tesla, Fleet Telemetry, tamaño de la base de datos

El dashboard se actualiza automáticamente cada 60 segundos cuando tiene la pestaña abierta.

---

## 🚗 Viajes (Fahrtenbuch)

Cada trayecto se registra automáticamente con:
- Ubicación de inicio y fin (dirección + coordenadas GPS)
- Distancia, duración, velocidad media
- Consumo de energía (kWh y kWh/100km)
- Nivel de batería al inicio/fin
- Clasificación del tipo de viaje (privado / trayecto habitual / laboral)

### Libro de viajes (compatible con BMF)
El libro de viajes cumple con los requisitos de la oficina tributaria alemana (Finanzamt/BMF):
- Campos de socio comercial y propósito del viaje
- Numeración secuencial de viajes
- Función "Bloquear" para finalizar el libro de viajes
- **Exportación en PDF** en formato A4 apaisado con todos los campos legalmente requeridos
- Fusión y división de viajes para trayectos con múltiples paradas
- Creación manual de viajes para entradas olvidadas

### Edición de ubicación GPS
Si un viaje tiene una dirección incorrecta o faltante, puede editarla directamente:
- Haga clic en cualquier viaje → Editar ubicación
- Ingrese la dirección manualmente o arrastre un marcador en el mapa

---

## ⚡ Carga

Todas las sesiones de carga se registran automáticamente:
- Ubicación (coincidencia GPS con las ubicaciones de carga guardadas)
- Energía añadida (kWh) y costo estimado
- Velocidad de carga y duración
- Indicador de carga en casa (🏠) mediante la integración con Monta

### Ubicaciones de carga
Defina su hogar y sus puntos de carga habituales:
- **Ajustes → Ubicaciones de carga** → Añadir con dirección + GPS + radio
- Las sesiones en esa ubicación se etiquetan automáticamente
- Establezca una tarifa por kWh por ubicación para el cálculo de costos

### Integración con Monta
Si utiliza Monta para la carga en casa:
- Ingrese su clave de API de Monta en los Ajustes
- Las sesiones de Monta se sincronizan automáticamente con los datos correctos de kWh y costo
- El indicador de carga en casa se activa automáticamente

### Cálculo de costos y factura en PDF
Genere facturas en PDF para reembolso (p. ej. para su empleador):
- **Facturación → Generar factura**
- Seleccione el rango de fechas e incluya/excluya sesiones específicas
- PDF con membrete, tabla, totales y campo de firma
- Generado completamente del lado del cliente — ningún dato sale de su servidor

---

## 🔋 Batería

Realice un seguimiento de la salud de su batería a lo largo del tiempo:
- Curva de degradación (autonomía estimada vs. autonomía nominal)
- Contador de ciclos de carga
- Datos históricos del nivel de carga
- Autonomía a diferentes temperaturas (comparación invierno vs. verano)

---

## 🎮 Control del vehículo

Controle su Tesla directamente desde la aplicación:
- 🌡️ **Climatización** — encender/apagar, ajustar temperatura, calefacción de asientos, calefacción del volante
- 🔓 **Cerraduras** — bloquear/desbloquear puertas
- 💡 **Luces** — destellar luces, bocina
- 🚪 **Maletero/frunk** — abrir maletero y frunk
- 🔌 **Carga** — abrir/cerrar puerto de carga, ajustar amperaje de carga, iniciar/detener
- 🔄 **Actualizaciones de software** — activar y monitorear actualizaciones OTA
- ⏰ **Carga programada** — configurar ventanas de carga en horas de menor demanda
- 🎵 **Boombox remoto** — activar sonidos del boombox (donde sea compatible)
- 🌬️ **Modo climático** — configurar modo camping/perro/mantener
- 🪟 **Ventanas** — abrir/cerrar ventanas

> Los comandos requieren que la **Clave Virtual** esté emparejada. Consulte [Configuración de la API de Tesla](Tesla-API-Setup#step-3-set-up-the-virtual-key-for-commands).

---

## 📝 Libro de servicio (Betriebsbuch)

Registre todos los eventos de mantenimiento:
- Fecha, categoría (mantenimiento / reparación / neumáticos / inspección / nota)
- Costo, kilometraje
- Descripción y archivos adjuntos
- Quién realizó el trabajo (nombre del taller)

### Intervalos de servicio y recordatorios
Configure recordatorios de mantenimiento periódicos:
- **Ajustes → Intervalos de servicio** → Añadir intervalo (p. ej. "ITV en 2 años", "Líquido de frenos cada 2 años")
- Notificaciones push 30 días antes y 1000 km antes de cada intervalo
- El dashboard muestra los servicios próximos como tarjeta de vista previa

---

## 📤 Exportación

Exporte todos sus datos:
- **Viajes** — CSV o JSON
- **Sesiones de carga** — CSV o JSON
- **Libro de servicio** — CSV
- **Copia de seguridad completa** — JSON (todas las tablas), importable para restaurar

---

## 🔔 Notificaciones push

Reciba notificaciones en su navegador cuando:
- La carga esté completa
- Se aproxime un intervalo de servicio
- Haya una actualización de software disponible

Las notificaciones funcionan en escritorio (Chrome, Firefox, Edge) y en móvil (Android Chrome, iOS Safari con acceso directo en pantalla de inicio).

**Configuración:** Ajustes → Notificaciones push → Activar notificaciones

---

## 📱 PWA (Progressive Web App)

Tesla Carview funciona como PWA — puede instalarlo en su pantalla de inicio:

- **Android/Chrome en escritorio:** Toque el icono de instalación en la barra de direcciones
- **iOS Safari:** Toque Compartir → "Añadir a pantalla de inicio"
- **Navegador del Tesla:** Toque el menú → "Añadir a pantalla de inicio"

La PWA instalada funciona sin conexión para las páginas en caché y recibe notificaciones como una aplicación nativa.

---

## 🌡️ Tarifa dinámica (aWATTar / Tibber)

Si tiene una tarifa eléctrica dinámica:
- Conecte aWATTar (DE/AT, sin clave de API) o Tibber (clave de API en Ajustes)
- El dashboard muestra el precio actual y el gráfico de precios de 24 horas
- **Configuración automática de ventana de carga** — un clic configura la carga programada para la ventana de 4 horas más económica en las próximas 24 horas

---

## 🌍 Multiidioma

La aplicación está completamente traducida a:
🇩🇪 Alemán · 🇬🇧 Inglés · 🇫🇷 Francés · 🇪🇸 Español · 🇹🇷 Turco · 🇬🇷 Griego

El idioma se determina por:
1. La configuración de su perfil de usuario (tiene prioridad sobre todo)
2. El idioma predeterminado del tenant
3. El idioma de su navegador

---

## 🌙 Modo de mantenimiento

La aplicación muestra una superposición de "mantenimiento" automáticamente cuando el backend no está disponible (al reiniciar tras actualizaciones). Muestra citas de Tesla en alemán/inglés, un temporizador de cuenta regresiva y consulta cada 3 segundos hasta que el backend vuelva a estar disponible — luego desaparece.
