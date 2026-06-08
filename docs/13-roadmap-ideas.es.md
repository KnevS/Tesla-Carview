# Ideas de roadmap

> 🤖 *Esta traducción al español es asistida por IA desde [13-roadmap-ideas.en.md](13-roadmap-ideas.en.md). Correcciones bienvenidas vía GitHub.*

> 🇩🇪 [Auf Deutsch lesen](13-roadmap-ideas.md)

Una colección de ideas de funcionalidades para futuras releases. Inspirada en el
conjunto de funciones habitual en el espacio de los rastreadores de datos Tesla
(Teslamate, TeslaFi, TeslaLogger, forks de TeslaMate, ABRP Companion, Watt for
Tesla, etc.) — esta lista contiene **sólo descripciones funcionales**, sin
diseños de UI, sin textos copiados, sin fragmentos de código y sin importación
de marcas/nombres.

> **Nota legal:** La funcionalidad como tal generalmente no es protegible por
> derecho de autor según el derecho alemán y de la UE (BGH I ZR 159/10
> "Lottoblock", TJUE C-406/10 "SAS Institute"); lo que *sí* está protegido es la
> expresión concreta (código, texto, diseño gráfico). Este documento se limita a
> **qué** suelen hacer las apps en este espacio — Tesla Carview implementa el
> **cómo** de forma independiente.

## Visto habitualmente en el espacio — candidatos para Tesla Carview

### Energía y eficiencia
- **Consumo por viaje vs. WLTP** del modelo, como indicador delta.
- **Eco-score por viaje** derivado de Wh/km frente al baseline propio del
  coche (puramente local, sin modelo en la nube).
- **Mapa de calor de energía sobre la línea GPS** del viaje: rojo = consumo
  alto, verde = recuperación regen, amarillo = crucero constante.
- **Perfil de altimetría** por viaje (desde open-elevation o tiles de altura
  offline). Correlación consumo ↔ metros subidos.
- **Reparto energía climatización**: diferencia entre potencia motriz y
  potencia en la rueda cuando se reportan ambas.

### Batería y carga
- **Tendencia de capacidad** (kWh netos en el tiempo, regresión sobre
  degradación, "SoH 90 % esperado en ~MM/AAAA").
- **Ventana de carga recomendada** combinando la curva de tarifa existente
  (aWattar / Tibber) con SoC objetivo y hora de salida planificada.
- **Estimación de pérdidas en carga rápida** (kWh pagados vs. kWh que
  realmente entran en la batería) — para facturación doméstica y por tipo
  de cargador DC.
- **Comparación de curvas de carga rápida**: la sesión actual frente a
  sesiones históricas en la misma ubicación / tipo de cargador como
  gráfico de líneas.
- **Rastreador de drenaje fantasma**: delta de SoC mientras está aparcado,
  desglosado por ubicación / temporada (estimación de coste del Sentry-Mode).

### Viajes y libro de viajes
- **Mapa de calor de ubicaciones** (complementario al nuevo mapa de calor
  de actividad): "dónde he estado a menudo" en el mapa, sin trazos de
  ruta.
- **Detección de rutas frecuentes** — cuando inicio/fin sean similares a
  una ruta existente, sugerir una clasificación (commute vs. privado) y
  el propósito usado previamente.
- **Replay de viaje**: reproducir el viaje a lo largo de la línea temporal
  con valores sincronizados de SoC, velocidad y climatización.
- **Autoclasificación por geofence**: polígonos "Casa", "Trabajo", viajes
  entre ellos auto-etiquetados como `commute`.
- **Plantillas de socios de negocio** (socios/clientes visitados con
  frecuencia como desplegable en el campo de entrada).

### Comodidad y control
- **Automatización de preacondicionamiento**: disparar climatización X min
  antes del próximo evento del calendario cuando el coche está en rango y
  enchufado.
- **Inteligencia del Sentry-Mode**: auto-off en el punto de casa tras X
  min, auto-on en hotel/aparcamiento.
- **Comportamiento de puertas**: al acercarse + phone-key + geofence de
  casa, bloqueo en modo bolsillo.
- **Límite de carga dinámico**: SoC objetivo inferido a partir de la
  agenda de mañana (integración opcional con el calendario).

### Reportes y analítica
- **Predicción de mantenimiento** basada en la tendencia de km
  (extrapolación lineal): "ITV alrededor del DD.MM.AAAA al uso actual".
  Implementada a medias mediante intervalos de servicio.
- **Realismo de autonomía por meteorología**: consumo real correlado con
  temperatura exterior (de `state.outside_temp`); pronóstico "a -5 °C
  una batería llena son ~280 km hoy".
- **PDF de informe anual**: una visual de una página con mapa de calor,
  top 5 rutas, kWh totales, coste total, CO₂ vs. equivalente diésel
  (calculado localmente, sin estimación en la nube).
- **Modo de reporte CO₂**: por viaje una cifra estimada de CO₂ usando
  como predeterminado el mix de red alemán/UE (el operador puede
  sobrescribir los g/kWh, p. ej. para una cuota fotovoltaica).

### Sistema y multiusuario
- **Dashboard de family-sharing**: pestaña extra por vehículo mostrando
  "quién condujo cuándo" — gráfico por conductor por semana (usa el
  `driver_id` existente).
- **Reglas de notificación push**: disparadores configurables (p. ej.
  "SoC < 20 % Y no en casa" → recordatorio).
- **Webhooks salientes**: destino por tenant (Home Assistant, IFTTT, n8n)
  — fin de viaje, fin de carga, mantenimiento vencido publicados como
  JSON.
- **Tokens de API de sólo lectura** para análisis de terceros, con
  selección de scope (sólo viajes / sólo carga / sólo batería).

### Privacidad y seguridad (más allá de lo ya existente)
- **Modo GPS-fuzzing** por tenant: las coordenadas de los últimos metros
  redondeadas a ~200 m para que la ubicación exacta de casa nunca se
  persista (relevante para tenants multi-conductor).
- **Trabajo de derecho al olvido**: los viajes mayores a N años se
  auto-anonimizan (GPS redondeado a 4 decimales, direcciones eliminadas),
  registro de auditoría conservado.
- **Step-up WebAuthn** para acciones de alto impacto (descarga de backup,
  eliminación de tenant) por encima de la passkey de login.

## Cosas deliberadamente NO adoptadas del espacio

- **Sincronización en la nube externa** de los datos del vehículo hacia
  un dashboard de terceros. Entra en conflicto con la promesa de
  self-hosting.
- **Formatos de exportación propietarios**. Mantenemos CSV / JSON para que
  los datos sigan siendo portables.
- **Participación identificable en estadísticas automáticas** (enviar
  datos de viaje anonimizados a un pool para calcular medias del
  modelo). Puede llegar como opt-in más adelante, nunca como
  predeterminado.

## Orden sugerido de prioridad

Ordenado por valor-por-esfuerzo:

1. **Autoclasificación por geofence** (UI pequeña, impacto en el día a día)
2. **Consumo por viaje vs. WLTP** (un número, mucho valor)
3. **Mapa de calor de ubicaciones** (mismo camino de render que el mapa
   de calor de actividad)
4. **Webhooks salientes** (abre el ecosistema)
5. **Realismo de autonomía por meteorología** (necesita 1–2 semanas de
   datos primero)
6. **PDF de informe anual** (gran artefacto de marketing)
7. **Modo GPS-fuzzing** (relevante para tenants de empresa)

Todas las funciones listadas son **propuestas, no compromisos**. Cada
implementación se hace de forma independiente, sin tomar código externo ni
texto externo.
