# Despliegue — Servidor Linux y Raspberry Pi

> 🤖 *Esta traducción al español es asistida por IA desde [02-deployment.en.md](02-deployment.en.md). Correcciones bienvenidas vía GitHub.*

> 🇩🇪 [Auf Deutsch lesen](02-deployment.md)

Tesla Carview funciona en **todas las plataformas habituales**:

| Plataforma | Arquitectura | Probado |
|---|---|---|
| Servidor Linux (VPS, dedicado) | x86_64 | ✓ |
| Raspberry Pi 4 / 5 | ARM64 | ✓ |
| Raspberry Pi 3 (y anteriores) | ARMv7 | ✗ ¹ |
| Windows (Docker Desktop + WSL2) | x86_64 | ✓ ² |
| Desarrollo local (Mac/Windows/Linux) | todas | ✓ |

¹ **Raspberry Pi 3 y anteriores (ARM de 32 bits) ya no son compatibles desde v3.51.0.** Node.js no publica imágenes ARMv7 a partir de la versión 24 —ni alpine ni Debian—, por lo que allí ya no se puede construir la imagen del backend. `deploy/setup.sh` se detiene en esos sistemas con una explicación en lugar de fallar al descargar la imagen.

² **Windows funciona, pero no está probado en CI.** La aplicación vive por completo en contenedores Linux; Windows solo es el anfitrión. Detalles y las dos limitaciones: sección «Windows (Docker Desktop)» al final de esta página.


---

## Requisitos previos

- Debian/Ubuntu (o Raspberry Pi OS)
- Acceso root
- Opcional: dominio propio con un registro A apuntando a la IP del servidor (para HTTPS)
- Cuenta de Tesla Developer ([04-tesla-api.en.md](./04-tesla-api.en.md))

> **¿Usas una Raspberry Pi?** Lee primero [15-raspberry-pi-storage.en.md](15-raspberry-pi-storage.en.md) — las tarjetas SD fallan bajo carga continua de escritura. Configurar un SSD USB o NVMe lleva 20 minutos y ahorra muchos problemas más adelante.
>
> **¿Sin IP estática?** [14-network-access.en.md](14-network-access.en.md) explica paso a paso DynDNS, Cloudflare Tunnel y opciones de VPS.
>
> **VPS de entrada recomendado:** El [netcup VPS nano G11s](https://www.netcup.com/en/server/vps-lite) (2 vCore, 2 GB RAM, 60 GB SSD, ~3,08 €/mes) es el VPS más económico probado que cumple todos los requisitos de Tesla Carview — incluido almacenamiento suficiente para varios años de datos de telemetría. Código de descuento disponible bajo petición: [rabatt-code-netcup@krische.com](mailto:rabatt-code-netcup@krische.com).

---

## 📦 Configuración automática (para todos)

```bash
# Como root en la máquina destino:
curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
```

O manualmente:
```bash
git clone https://github.com/KnevS/Tesla-Carview.git /opt/tesla-carview
bash /opt/tesla-carview/deploy/setup.sh
```

El script detecta la arquitectura automáticamente y se encarga de:
1. Instalar paquetes del sistema (nginx, certbot, docker, ufw, fail2ban)
2. Configurar el cortafuegos (SSH, HTTP, HTTPS)
3. fail2ban para protección de SSH
4. Lanzar el asistente de configuración
5. SSL de Let's Encrypt (si se proporciona un dominio HTTPS)
6. nginx con endurecimiento TLS
7. Iniciar los contenedores Docker (multi-arch)

---

## Ejecutar el asistente de configuración

```bash
bash /opt/tesla-carview/deploy/setup-wizard.sh
```

El asistente pregunta de forma interactiva:
- URL pública (p. ej. `https://tesla.example.com` o `http://192.168.1.100:8080`)
- Client-ID y Client-Secret de la Tesla API
- Ruta de la base de datos
- Dirección de e-mail para los certificados SSL
- Claves VAPID de Web Push (opcional)

---

## Raspberry Pi — particularidades

```bash
# preparar Raspberry Pi OS (si es necesario):
sudo apt-get update && sudo apt-get upgrade -y

# instalar Docker para ARM (lo hace automáticamente setup.sh):
curl -fsSL https://get.docker.com | sh
```

En una Raspberry Pi dentro de una red doméstica no hace falta nginx/SSL — el contenedor de la app está disponible directamente en el puerto 8080.
Define `FRONTEND_URL=http://192.168.1.100:8080` en el `.env`.

---

## Configurar la Tesla API

```bash
nano /opt/tesla-carview/backend/.env
```

Campos obligatorios:
```env
TESLA_CLIENT_ID=your-client-id
TESLA_CLIENT_SECRET=your-client-secret
TESLA_REDIRECT_URI=https://your.domain.com/api/auth/callback
```

Reinicia los contenedores:
```bash
cd /opt/tesla-carview
docker compose -f docker-compose.prod.yml up -d
```

---

## Configuración inicial (asistente web)

En el primer arranque la app abre automáticamente **/setup** en el navegador.
Ahí se crea la primera cuenta de administrador.

---

## Aplicar actualizaciones

```bash
bash /opt/tesla-carview/deploy/update.sh
```

---

## Despliegue automático

Hay dos caminos para el despliegue automático en cada push a `main`:

| Método | Recomendado para | Guía |
|---|---|---|
| **GitHub Actions + SSH** | App única, servidor existente, control total | Ver abajo |
| **Dokploy** | Varias apps, UI web deseada, SSL más sencillo | [08-dokploy.en.md](./08-dokploy.en.md) |

---

## Auto-despliegue con GitHub Actions

Despliegue automático en cada push a `main`.

### Requisito previo: crear una clave SSH de despliegue

```bash
# en el servidor:
ssh-keygen -t ed25519 -C "tesla-carview-deploy" -f ~/.ssh/tesla_deploy -N ""

# autoriza la clave pública para el usuario SSH:
cat ~/.ssh/tesla_deploy.pub >> /home/YOUR_USER/.ssh/authorized_keys
```

> **Nota**: el usuario de despliegue necesita sudo sin contraseña para `docker` y `git`:
> ```bash
> echo 'YOUR_USER ALL=(ALL) NOPASSWD: /usr/bin/docker, /usr/bin/git' \
>   > /etc/sudoers.d/tesla-deploy
> ```

### Definir secrets en GitHub

GitHub → repositorio → Settings → Secrets and variables → Actions → *New repository secret*:

| Secret | Descripción | Ejemplo |
|---|---|---|
| `DEPLOY_HOST` | Nombre de host o IP del servidor | `123.456.789.0` |
| `DEPLOY_USER` | Nombre del usuario SSH | `deploy` |
| `DEPLOY_SSH_KEY` | Contenido de `~/.ssh/tesla_deploy` (clave privada) | `-----BEGIN OPENSSH…` |
| `DEPLOY_APP_DIR` | Ruta de instalación en el servidor | `/opt/tesla-carview` |


---

## Backup de la base de datos

```bash
# crear un backup:
cp /opt/tesla-carview/data/master.db /opt/backups/master-$(date +%Y%m%d-%H%M).db
cp /opt/tesla-carview/data/tenants/*.db /opt/backups/

# automático diariamente a las 3 a. m. (crontab -e como root):
0 3 * * * cp /opt/tesla-carview/data/master.db /opt/tesla-carview/data/tenants/*.db /opt/backups/
```

> **Nota:** Tesla Carview usa un bind-mount (`./data:/app/data`), no un volumen Docker con nombre. Todos los archivos de base de datos residen directamente bajo `/opt/tesla-carview/data/` en el host. Alternativamente, el auto-backup integrado puede configurarse en los ajustes del sistema de la app (local, ruta, S3 o SFTP).

---

## Comprobación de salud post-instalación

Tras la configuración inicial (y en cualquier momento posterior) puedes ejecutar la comprobación de higiene integrada:

```bash
bash /opt/tesla-carview/scripts/hygiene-check.sh
```

El script verifica 7 áreas e imprime un resumen con código de color:

| # | Comprobación | Auto-fix |
|---|---|---|
| 1 | Entorno del sistema — versión de Docker, Node.js ≥ 20, uso de disco | — |
| 2 | Seguridad de dependencias — `npm audit` para frontend + backend | `--fix` ejecuta `npm audit fix` |
| 3 | Tamaño del bundle — chunk JS principal vs. umbrales (warn > 1,2 MB, fail > 1,5 MB) | — |
| 4 | Completitud de `.env` — ¿están todas las claves obligatorias presentes? | — |
| 5 | Salud de Docker — contenedores unhealthy/exited, imágenes y volúmenes huérfanos | `--fix` purga imágenes |
| 6 | Integridad de la base de datos — `PRAGMA integrity_check` de SQLite por tenant | — |
| 7 | Certificado SSL — días hasta la caducidad para tu dominio configurado | — |

```bash
# modo CI (sin colores, exit 1 si hay fallos — usado por setup.sh y GitHub Actions):
bash scripts/hygiene-check.sh --ci

# modo auto-fix (ejecuta npm audit fix, purga imágenes Docker):
bash scripts/hygiene-check.sh --fix
```

El trabajo de mantenimiento nocturno (`backend/src/services/nightlyMaintenance.js`) ejecuta automáticamente un subconjunto de estas comprobaciones cada noche a las 03:30 Europe/Berlin y escribe los resultados en el log de salud del administrador (`Admin → Sistema → Mantenimiento`).

---

## Ver logs

```bash
# logs del backend:
docker compose -f docker-compose.prod.yml logs -f backend

# logs de nginx:
tail -f /var/log/nginx/tesla-carview.access.log
```

---

## Funcionamiento detrás de un proxy inverso propio

Si instalas `setup.sh` en **modo proxy** (ya tienes nginx, Caddy o Traefik), no se crea ninguna configuración de nginx y tendrás que reproducir los límites de tasa por tu cuenta. Si faltan o son demasiado estrictos, la aplicación acaba en HTTP 429 y parece rota: páginas cargadas a medias que solo una recarga parece arreglar.

| Ruta | Recomendación | Por qué |
|---|---|---|
| `/api/auth/login` | 10/min, ráfaga 3 | Protección contra fuerza bruta |
| `/api/tiles/` | 1200/min, ráfaga 300 | Un zoom del mapa carga 50–150 teselas de golpe |
| `/api/` (resto) | 120/min, **ráfaga ≥ 60** | Un cambio de página lanza 15–26 peticiones |

La ruta más específica debe ganar: si `/api/tiles/` cae bajo el límite general de la API, un solo zoom del mapa bloquea toda la API. El valor crítico no es la tasa sostenida, sino la ráfaga.

En el repositorio hay plantillas listas para usar: [`deploy/nginx-host.conf.template`](../deploy/nginx-host.conf.template) y [`deploy/traefik-dynamic.example.yml`](../deploy/traefik-dynamic.example.yml).

La propia respuesta indica de dónde viene un 429:

- Cabecera `x-retry-in` → **Traefik**
- Página de error HTML sin cabeceras adicionales → **nginx** (`limit_req`)
- `ratelimit-limit` / `ratelimit-remaining` → **la aplicación** (express-rate-limit)

---

## Windows (Docker Desktop)

La aplicación se ejecuta por completo en contenedores Linux — Windows solo es el anfitrión. Con **Docker Desktop en modo WSL2** arranca el mismo stack que en un servidor Linux. `setup.sh` no funciona ahí (bash, apt, systemd, certbot); en su lugar está `deploy/setup-windows.ps1`.

```powershell
git clone https://github.com/KnevS/Tesla-Carview.git
cd Tesla-Carview
powershell -ExecutionPolicy Bypass -File .\deploy\setup-windows.ps1
```

El script crea `backend\.env` con un `JWT_SECRET` aleatorio, escribe un `docker-compose.override.yml` para Windows e inicia el stack. Después, abre `http://localhost:8080`.

### Dos limitaciones — ambas medidas, ninguna evitable

1. **Sin comandos al vehículo.** Los comandos firmados pasan por `tesla-http-proxy`, que necesita el bind mount `/etc/tesla-proxy` y el UID fijo 988 — ninguno existe en Windows. El servicio queda desactivado; el backend arranca igualmente porque su `depends_on` está en `required: false`. Todo lo de lectura — viajes, cargas, análisis, libro de ruta, planificador — funciona por completo.
2. **`host.docker.internal` apunta a otro sitio.** Docker Desktop inserta ese nombre en el `/etc/hosts` de cada contenedor, y esa entrada gana al alias de red del archivo compose. Medido: el nombre resuelve entonces a la puerta de enlace del anfitrión (172.17.0.1) en vez de al contenedor del proxy — los comandos iban en silencio al destino equivocado. Si aun así ejecutas el proxy, pon `TESLA_PROXY_BASE=https://tesla-carview-proxy:4443` en `backend\.env`.

### No confundir los dos archivos `.env`

La aplicación lee `backend\.env` (se pasa al contenedor como `env_file`). Compose lee un `.env` en la **raíz del proyecto** y con él sustituye los marcadores `${...}` de los archivos compose (`TESLA_PROXY_CONFIG_DIR`, `TESLA_PROXY_UID`, `OLLAMA_MEMORY_LIMIT`). Medido, porque lo contrario parece lo natural: una entrada en `backend/.env` **no** afecta a esa sustitución. Plantilla: `.env.example` en la raíz del proyecto.

### HTTPS no es algo específico de Windows

Tesla exige una dirección HTTPS accesible públicamente — para el inicio de sesión, el registro de socio y Fleet Telemetry. Eso vale igual para cualquier instalación doméstica, sea cual sea el sistema operativo. Las opciones (DynDNS, Cloudflare Tunnel, VPS) están en [14-network-access.es.md](14-network-access.es.md).

### Actualizaciones

`deploy/update.sh` es un script de bash y no se ejecuta en Windows. En su lugar:

```powershell
git pull
docker compose -f docker-compose.prod.yml -f docker-compose.override.yml pull
docker compose -f docker-compose.prod.yml -f docker-compose.override.yml up -d
```

### Qué significa «no probado en CI»

El build gate de Docker construye imágenes Linux para amd64 y arm64; ningún host Windows se comprueba automáticamente. El camino está documentado y las trampas de arriba se midieron contra un daemon Docker real — pero solo lo verifican de forma continua quienes lo recorren.
