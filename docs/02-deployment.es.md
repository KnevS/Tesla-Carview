# Despliegue — Servidor Linux y Raspberry Pi

> 🤖 *Esta traducción al español es asistida por IA desde [02-deployment.en.md](02-deployment.en.md). Correcciones bienvenidas vía GitHub.*

> 🇩🇪 [Auf Deutsch lesen](02-deployment.md)

Tesla Carview funciona en **todas las plataformas Linux habituales**:

| Plataforma | Arquitectura | Probado |
|---|---|---|
| Servidor Linux (VPS, dedicado) | x86_64 | ✓ |
| Raspberry Pi 4 / 5 | ARM64 | ✓ |
| Raspberry Pi 3 (y anteriores) | ARMv7 | ✗ ¹ |
| Desarrollo local (Mac/Windows/Linux) | todas | ✓ |

¹ **Raspberry Pi 3 y anteriores (ARM de 32 bits) ya no son compatibles desde v3.51.0.** Node.js no publica imágenes ARMv7 a partir de la versión 24 —ni alpine ni Debian—, por lo que allí ya no se puede construir la imagen del backend. `deploy/setup.sh` se detiene en esos sistemas con una explicación en lugar de fallar al descargar la imagen.


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
