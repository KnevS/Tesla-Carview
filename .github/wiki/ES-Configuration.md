🌐 **Idioma:** [EN](Configuration) · [DE](DE-Configuration) · [FR](FR-Configuration) · **ES** · [TR](TR-Configuration) · [EL](EL-Configuration)

---

# Configuración — Variables de entorno

Todos los ajustes de Tesla Carview se configuran a través del archivo `.env` en `/opt/tesla-carview/backend/.env`.

Tras cualquier cambio en `.env`, reinicia el backend:
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d --build backend
```

---

## Ajustes necesarios (imprescindibles para que funcione la app)

| Variable | Ejemplo | Descripción |
|---|---|---|
| `JWT_SECRET` | `some-random-64-char-string` | Clave secreta para firmar tokens de sesión. Genera con: `openssl rand -hex 32` |
| `TESLA_CLIENT_ID` | `abc123...` | Del Tesla Developer Portal |
| `TESLA_CLIENT_SECRET` | `xyz789...` | Del Tesla Developer Portal |
| `TESLA_AUTH_BASE` | `https://auth.tesla.com/oauth2/v3` | URL base OAuth de Tesla — completada automáticamente por el wizard; solo cambiar si Tesla actualiza su endpoint |
| `FRONTEND_URL` | `https://tesla.tudominio.com` | La URL pública de tu instalación |
| `DATABASE_PATH` | `/app/data` | Dónde se almacenan las bases de datos (no cambiar en Docker) |

---

## Opcionales pero recomendados

| Variable | Por defecto | Descripción |
|---|---|---|
| `AUTO_UPDATE_ENABLED` | `false` | Establecer a `true` para actualizaciones automáticas nocturnas |
| `MFA_REQUIRED_FOR_NEW_USERS` | `false` | Forzar configuración MFA para todas las nuevas cuentas de usuario |
| `REGISTRATION_REQUIRES_INVITE` | `false` | Requerir un código de invitación para registrar un nuevo inquilino |
| `POLL_INTERVAL_MS` | `60000` | Con qué frecuencia consultar la API Tesla cuando el coche está activo (ms) |
| `POLL_SLEEP_INTERVAL_MS` | `600000` | Intervalo de consulta cuando el coche está durmiendo (ms) |

---

## Tarifa dinámica (precio de electricidad)

| Variable | Descripción |
|---|---|
| `AWATTAR_ENABLED` | `true`/`false` — activar aWATTar (DE/AT, gratuito) |
| `TIBBER_TOKEN` | Tu token API de Tibber (obtén en [developer.tibber.com](https://developer.tibber.com)) |

---

## Modo demo

| Variable | Por defecto | Descripción |
|---|---|---|
| `DEMO_ENABLED` | `false` | Activar inquilino demo público con datos ficticios |
| `DEMO_MAX_CONCURRENT` | `10` | Máximo de usuarios demo simultáneos |
| `DEMO_LIFETIME_DAYS` | `14` | Duración de las cuentas demo |

---

## Avanzado / Fleet Telemetry

| Variable | Descripción |
|---|---|
| `FLEET_TELEMETRY_ENABLED` | `true`/`false` — activar GPS en tiempo real via Fleet Telemetry |
| `FLEET_TELEMETRY_PORT` | Puerto para el servidor Fleet Telemetry (por defecto: 4443) |
| `VIRTUAL_KEY_PRIVATE_KEY_PATH` | Ruta al archivo de clave privada de la Virtual Key |

---

## Cómo generar un JWT_SECRET seguro

```bash
openssl rand -hex 32
# Resultado: algo como a8f3e9b2c1d4...
# Copia esto en tu archivo .env
```

---

## Verificar tu configuración actual

```bash
# Ver el .env actual (cuidado al compartir la salida — contiene secretos):
cat /opt/tesla-carview/backend/.env

# Verificar qué variables de entorno ve el contenedor en ejecución:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml exec backend env | grep -v PASSWORD | grep -v SECRET
```

---

## Referencia completa

Para una lista completa de todas las variables de entorno con descripciones detalladas, consulta la documentación técnica:
[docs/10-configuration.en.md](https://github.com/KnevS/Tesla-Carview/blob/main/docs/10-configuration.en.md)
