🌐 **Language / Sprache / Langue / Idioma / Dil / Γλώσσα**

| | |
|---|---|
| 🇬🇧 **[English](Configuration)** | English version |
| 🇩🇪 **[Deutsch](DE-Configuration)** | Deutsche Version |
| 🇫🇷 **[Français](FR-Configuration)** | Version française |
| 🇪🇸 **[Español](ES-Configuration)** | Estás aquí |
| 🇹🇷 **[Türkçe](TR-Configuration)** | Türkçe sürüm |
| 🇬🇷 **[Ελληνικά](EL-Configuration)** | Ελληνική έκδοση |

---

# Configuración — Variables de entorno

Todos los ajustes de Tesla Carview se configuran mediante el archivo `.env` en `/opt/tesla-carview/backend/.env`.

Después de cualquier cambio en `.env`, reinicie el backend:
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d --build backend
```

---

## Ajustes requeridos (deben configurarse para que la aplicación funcione)

| Variable | Ejemplo | Descripción |
|---|---|---|
| `JWT_SECRET` | `some-random-64-char-string` | Clave secreta para firmar los tokens de inicio de sesión. Genere con: `openssl rand -hex 32` |
| `TESLA_CLIENT_ID` | `abc123...` | Del Portal de Desarrolladores de Tesla |
| `TESLA_CLIENT_SECRET` | `xyz789...` | Del Portal de Desarrolladores de Tesla |
| `FRONTEND_URL` | `https://tesla.yourdomain.com` | La URL pública de su instalación |
| `DATABASE_PATH` | `/app/data` | Dónde se almacenan las bases de datos (no cambiar en Docker) |

---

## Opcionales pero recomendados

| Variable | Predeterminado | Descripción |
|---|---|---|
| `AUTO_UPDATE_ENABLED` | `false` | Establezca `true` para actualizarse automáticamente cada noche |
| `MFA_REQUIRED_FOR_NEW_USERS` | `false` | Obliga la configuración de MFA para todas las cuentas de usuario nuevas |
| `REGISTRATION_REQUIRES_INVITE` | `false` | Requiere un código de invitación para registrar un nuevo tenant |
| `POLL_INTERVAL_MS` | `60000` | Con qué frecuencia consultar la API de Tesla cuando el automóvil está activo (ms) |
| `POLL_SLEEP_INTERVAL_MS` | `600000` | Intervalo de consulta cuando el automóvil está en reposo (ms) |

---

## Tarifa dinámica (precios de electricidad)

| Variable | Descripción |
|---|---|
| `AWATTAR_ENABLED` | `true`/`false` — activar aWATTar (DE/AT, gratuito) |
| `TIBBER_TOKEN` | Su token de API de Tibber (obténgalo en [developer.tibber.com](https://developer.tibber.com)) |

---

## Avanzado / Fleet Telemetry

| Variable | Descripción |
|---|---|
| `FLEET_TELEMETRY_ENABLED` | `true`/`false` — activar GPS en tiempo real mediante Fleet Telemetry |
| `FLEET_TELEMETRY_PORT` | Puerto para el servidor Fleet Telemetry (predeterminado: 4443) |
| `VIRTUAL_KEY_PRIVATE_KEY_PATH` | Ruta al archivo de clave privada de la Clave Virtual |

---

## Cómo generar un JWT_SECRET seguro

```bash
openssl rand -hex 32
# Salida: algo como a8f3e9b2c1d4...
# Copie esto en su archivo .env
```

---

## Verificar su configuración actual

```bash
# Ver el .env actual (tenga cuidado al compartir la salida — contiene secretos):
cat /opt/tesla-carview/backend/.env

# Verificar qué variables de entorno ve el contenedor en ejecución:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml exec backend env | grep -v PASSWORD | grep -v SECRET
```

---

## Referencia completa

Para una lista completa de todas las variables de entorno con descripciones detalladas, consulte la documentación técnica:
[docs/10-configuration.en.md](https://github.com/KnevS/Tesla-Carview/blob/main/docs/10-configuration.en.md)
