# 🛠 Operaciones

> 🤖 *Esta traducción al español es asistida por IA desde [11-operations.en.md](11-operations.en.md). Correcciones bienvenidas vía GitHub.*

> 🇩🇪 [Auf Deutsch lesen](11-operations.md) · 👤 [Manual de usuario](../frontend/src/handbook/handbook.en.md) · 🏠 [Índice de docs](.)

Operaciones del día a día para self-hosters: backup, restore, mantenimiento, modo demo, update. Cada acción es **sólo para admins** y queda en el log de auditoría.

---

## 💾 Backup y restauración

### Crear un backup

**Vía la UI web (recomendado):**

1. Inicia sesión como admin → **Admin → Gestión de datos**
2. Tarjeta "💾 Backup completo y restauración" → botón **"⬇ Backup erstellen"**
3. Se descarga un archivo JSON — nombre `tesla-carview-backup-<slug>-YYYY-MM-DD.json`

Contenido: las 26 tablas de la BD del tenant activo (vehículos, viajes + puntos GPS, sesiones de carga, telemetría, libro de viajes, intervalos de servicio, usuarios, credenciales de passkey, logs de auditoría, ajustes, tokens OAuth Tesla, Virtual Key, aceptaciones legales, histórico de cambios de viajes). Excluido deliberadamente: `push_subscriptions` (específico del navegador) y `refresh_tokens` (estos viven en `master.db`).

> **Passkeys**: `passkey_credentials` está incluido en el backup. Tras restaurar al **mismo servidor**, las passkeys registradas funcionan inmediatamente — el `credential_id` se almacena en el servidor y el `user_id` se preserva en la restauración. Restaurar a un servidor o dominio diferente requiere volver a registrar las passkeys (WebAuthn está ligado al dominio).

**Vía CLI / cron** (para estrategias de backup externas):

```bash
# Hace backup directo de los archivos SQLite — atómico, sin parada del servicio
docker compose -f docker-compose.prod.yml exec backend sh -c \
  "sqlite3 /app/data/master.db '.backup /app/data/backup-$(date +%F).db'"
docker cp tesla-carview-backend:/app/data/. /path/to/backup/
```

Recomendado: guarda también el backup de la UI en un disco externo — un único archivo JSON por tenant es portable y versionable.

### Restaurar desde un backup

**Caso de uso:** sistema nuevo instalado, o el viejo quedó enredado. Recupera el estado anterior:

1. Ejecuta el asistente de configuración al menos una vez (crear cuenta de admin)
2. Inicia sesión como admin → **Admin → Gestión de datos → "⬆ Backup wiederherstellen…"**
3. Elige el archivo JSON + escribe la confirmación `WIEDERHERSTELLEN`
4. "Jetzt wiederherstellen" → el servidor primero crea un **backup de seguridad de la `.db` actual** (la ruta se devuelve en el mensaje de éxito), luego vacía todas las tablas y las rellena desde el JSON, todo dentro de **una sola transacción**, con rollback en caso de error
5. Cierra sesión + vuelve a entrar, hecho

### Capas de seguridad en la restauración

- Middleware `requireAdmin`
- La frase de confirmación `WIEDERHERSTELLEN` debe escribirse exactamente
- Backup a nivel de archivo previo a la restauración (`<dbname>_pre_restore_<timestamp>.db`)
- Intersección de columnas: cuando el esquema vivo tiene una columna renombrada, esa columna se omite en lugar de abortar toda la importación
- Entrada de log de auditoría por cada backup y cada restauración

---

## 🌙 Mantenimiento nocturno

Se ejecuta diariamente entre las **03:30 y las 03:40 Europe/Berlin** (seguro frente al cambio de horario vía `Intl.DateTimeFormat`). Se detiene en cada reinicio del backend y vuelve con un backoff de 2 min.

### Qué hace

| Dónde | Tarea |
|---|---|
| `master.db` | Eliminar `refresh_tokens` caducados |
| `master.db` | Eliminar estados `oauth_pkce` con más de 24 h |
| `master.db` | Eliminar invitaciones de tenant revocadas soft con más de 30 d |
| `master.db` | `VACUUM` + `wal_checkpoint(TRUNCATE)` |
| cada `tenant.db` | Eliminar `audit_logs` con más de 180 d |
| cada `tenant.db` | Eliminar `user_invites` usados/caducados con más de 30 d |
| cada `tenant.db` | `wal_checkpoint(TRUNCATE)` |
| cada `tenant.db` | `VACUUM` sólo cuando la BD > 50 MB |
| cada `tenant.db` | Entrada de auditoría `system_maintenance` con contadores |

### Disparar manualmente

**UI:** Sistema → Estado del sistema → "🌙 Nächtliche Wartung" → **"Jetzt ausführen"**.

**API:**
```bash
curl -X POST https://carview.example.com/api/system/maintenance-now \
  -H "Authorization: Bearer $ADMIN_JWT"
```

### Inspeccionar la última ejecución

```bash
curl https://carview.example.com/api/system/maintenance-log \
  -H "Authorization: Bearer $ADMIN_JWT" | jq
```

Muestra las últimas hasta 50 ejecuciones con contadores, duración y estado de error.

---

## ⬆️ Auto-actualización (opt-in)

> ⚠️ **Desactivada por defecto.** Activarla significa que tu sistema descarga nuevos commits de `main` cada noche y reconstruye el contenedor. Verifica primero que `deploy/update.sh` se ejecuta limpiamente en tu configuración.

### Activar

```bash
# backend/.env
AUTO_UPDATE_ENABLED=true
UPDATE_REPO_DIR=/opt/tesla-carview   # por defecto es exactamente esto, sólo sobrescribir si es distinto
```

Luego reinicia el backend:
```bash
docker compose -f docker-compose.prod.yml up -d --build backend
```

### Qué pasa por la noche

1. `git fetch origin main` en la ruta del repo configurada
2. Compara `git rev-parse HEAD` con `origin/main`
3. Si son distintos: `bash deploy/update.sh` (timeout de 10 min)
4. Durante el rebuild el frontend muestra automáticamente el **overlay de mantenimiento** (ver `frontend/src/components/MaintenanceOverlay.vue`) con bromas Tesla — los usuarios apenas lo notan
5. El estado (hash local, hash remoto, resultado del update) aterriza en el log de mantenimiento

### Actualización manual en cualquier momento

```bash
cd /opt/tesla-carview
bash deploy/update.sh
```

---

## 🧪 Modo demo

Para **testers sin Tesla**. Si esto sólo lo ejecutas para ti, déjalo desactivado.

### Activar

```bash
# backend/.env
DEMO_ENABLED=true
```

Reinicia el backend. Se crea un tenant adicional con slug `demo` y archivo de BD `data/tenants/<uuid>.db` en el primer arranque.

### Límites estrictos (codificados en `routes/demo.js`)

| Constante | Por defecto | Variable ENV | Significado |
|---|---|---|---|
| `MAX_ACTIVE_DEMO_USERS` | `200` | `MAX_ACTIVE_DEMO_USERS` | Testers concurrentes. HTTP 503 cuando está lleno. |
| `DEMO_SIGNUPS_PER_IP` | `2` / 24 h | `DEMO_SIGNUPS_PER_IP` | Como máximo 2 altas por IP en una ventana de 24 h |
| `DEMO_LIFETIME_DAYS` | `2` | `DEMO_LIFETIME_DAYS` | La cuenta + todos sus datos se eliminan tras 2 d, sin restos |

Las tres son sobrescribibles vía variable de entorno — para una instancia privada con `DEMO_ENABLED=true`, considera fijar `MAX_ACTIVE_DEMO_USERS=5` y `DEMO_LIFETIME_DAYS=1`.

### Qué ven los testers

- La página de login muestra una tarjeta azul "🧪 Tesla Carview ausprobieren — ohne Tesla" con los slots libres
- Un clic → se crea el usuario `tester-<hex>`, se inicia sesión, se siembran un vehículo falso + 3 semanas de histórico
- Banner en la parte superior de la app: "Demo-Modus — Konto und Daten werden am DD.MM.YYYY automatisch gelöscht (X Tage übrig)"
- Las páginas de privacidad y términos muestran automáticamente un **addendum para testers** (sin SLA, sin soporte, datos falsos, eliminación tras `DEMO_LIFETIME_DAYS` días)
- Cada 30 min: un nuevo viaje falso por vehículo demo — para que la demo se sienta viva

### Limpieza

- Cada 6 h se ejecuta el ciclo de vida de la demo: los usuarios con `expires_at < now` se eliminan en una transacción, junto con todas las tablas dependientes (vehículos, viajes, puntos GPS, carga, batería, telemetría, libro de viajes, códigos MFA, logs de auditoría, ubicaciones de carga, intervalos de servicio)
- El propio tenant demo permanece — sólo se borran los datos del tester
- **Aislamiento**: el slug demo **nunca** se escribe en `localStorage` — un tester que cierre la pestaña del navegador y vuelva a abrir la URL de producción no terminará accidentalmente en el tenant demo

---

## 🛡️ Monitorización y self-healing

Un cron job (`/opt/monitoring/bin/heal.sh`) se ejecuta cada 15 minutos y vigila los servicios principales:

1. **Estado de los contenedores** — inspecciona `docker inspect` para `tesla-carview-backend`, `-frontend` y `-nginx`; si un contenedor no está en estado `running`, se reinicia vía `docker compose up -d <service>`.
2. **Endpoint de salud** — cuando todos los contenedores están corriendo, comprueba `GET /api/health`; si la respuesta no es `{"status":"ok"}` se reinicia el contenedor backend.
3. **Alerta por e-mail** — tras cada reinicio automático se envía un e-mail de notificación a la dirección configurada (si está definida).
4. **Rotación de logs** — `/var/log/tcv-heal.log` se recorta automáticamente a las últimas 500 líneas cuando supera 1 MB.

**Configuración** (Admin → Sistema → Monitorización y self-healing):

| Ajuste | Descripción |
|---|---|
| Self-healing on/off | Clave de BD `monitoring.heal_enabled`; ponla en `false` y el cron job sale inmediatamente |
| E-mail de alerta | Clave de BD `monitoring.alert_email`; vacío = sin alerta |

**Endpoints de API** (sólo admin):
- `GET /api/system/monitoring-config` — lee la configuración actual
- `PUT /api/system/monitoring-config` — guarda la configuración
- `GET /api/system/monitoring-log?lines=50` — devuelve las últimas N líneas de los logs de heal y seguridad

**Inspeccionar logs manualmente:**
```bash
tail -50 /var/log/tcv-heal.log
tail -50 /var/log/security-check.log
```

**Entrada de cron** (`/etc/cron.d/tesla-carview-monitoring`):
```
*/15 * * * * root /opt/monitoring/bin/heal.sh >/dev/null 2>&1
```

---

## 📊 Salud del sistema de un vistazo

UI: **Admin → Sistema** → el admin ve una tarjeta semáforo en color en la parte superior. Endpoint del backend: `GET /api/system/health` (sólo admin). Comprobaciones:

| Comprobación | Verde | Amarillo | Rojo | Info (atenuado) |
|---|---|---|---|---|
| Token OAuth de Tesla | válido, > 7d restantes | < 7d restantes | caducado o ausente | — |
| Virtual Key | creada | — | no creada | — |
| Fleet Telemetry | último dato < 24 h | < 7 d | nada o > 7 d | — |
| Poller Tesla | último poll < 60 min | < 1 d | — | — |
| BD de tenant | informativo — tamaño en MB | — | — | — |
| Mantenimiento nocturno | última ejecución < 25 h | — | — | — |
| OpenChargeMap | sondeo en vivo OK | — | sondeo fallido (clave definida) | sin clave configurada |
| HERE Maps | sondeo en vivo OK | — | sondeo fallido (clave definida) | sin clave configurada |

Los servicios opcionales (OCM, HERE) sólo se cuentan como error cuando hay una clave configurada pero el endpoint no responde. Sin clave: estado `info`, atenuado, sin efecto en el color general del semáforo.

---

## 🔍 Mirar los logs

**Logs del contenedor:**
```bash
docker compose -f docker-compose.prod.yml logs -f --tail 200 backend
```

**Log de auditoría** (eventos relevantes para seguridad por tenant):
- UI: **Admin → Log de auditoría** con filtros (acción, user-id, fecha) y exportación CSV
- API: `GET /api/audit` (sólo admin)

**Log de mantenimiento** (últimas ejecuciones nocturnas):
- UI: Sistema → "🌙 Nächtliche Wartung" → detalles
- API: `GET /api/system/maintenance-log` (sólo admin)

---

## 🚨 Emergencia: reseteo de la base de datos

Cuando todo está ardiendo y sólo un arranque limpio puede salvarlo:

```bash
# 1. Haz un backup PRIMERO (ver arriba)
# 2. Para los contenedores
docker compose -f docker-compose.prod.yml down

# 3. Borra el directorio data — TODOS LOS DATOS DESAPARECEN
# Los datos viven en el bind-mount ./data (¡no en un volumen Docker con nombre!)
rm -rf ./data/master.db ./data/tenants/

# 4. Arranca de cero — el asistente de configuración aparece automáticamente
docker compose -f docker-compose.prod.yml up -d
```

> Desde v2.0 las bases de datos SQLite viven bajo `./data` como bind-mount (relativo al archivo Compose), **no** en un volumen Docker con nombre. `docker volume rm` no tiene efecto en esta configuración.

Para restaurar un backup después, completa el asistente de configuración con una cuenta de admin temporal, inicia sesión y usa el flujo de restore de la UI.

---

## Véase también

- [01-quickstart.en.md](01-quickstart.en.md) — configuración inicial
- [02-deployment.en.md](02-deployment.en.md) — despliegue en producción
- [10-configuration.en.md](10-configuration.en.md) — todas las variables de entorno
- [05-security-architecture.en.md](05-security-architecture.en.md) — modelo de seguridad
