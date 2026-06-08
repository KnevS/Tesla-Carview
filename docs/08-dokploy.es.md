# Despliegue con Dokploy

> 🤖 *Esta traducción al español es asistida por IA desde [08-dokploy.en.md](08-dokploy.en.md). Correcciones bienvenidas vía GitHub.*

> 🇩🇪 [Auf Deutsch lesen](08-dokploy.md)

[Dokploy](https://dokploy.com) es una plataforma PaaS open-source auto-alojada
(comparable a Coolify o Railway). Gestiona enrutamiento, SSL (vía Let's Encrypt + Traefik),
logs y webhooks de GitHub para el despliegue automático — sin la sobrecarga de un pipeline
CI/CD completo.

**Cuándo tiene sentido:**
- Quieres una UI web en lugar de comandos SSH para gestionar despliegues
- Varias apps corren en el mismo servidor
- No quieres un workflow separado de GitHub Actions

---

## 1. Instalar Dokploy en el servidor

```bash
# como root en un VPS fresco (Debian/Ubuntu recomendado):
curl -sSL https://dokploy.com/install.sh | sh
```

Dokploy arranca entonces en el puerto **3000**. Abre `http://YOUR-SERVER-IP:3000` en el navegador
y crea la cuenta de administrador.

> Nota sobre el firewall: el puerto 3000 debe estar accesible temporalmente. Tras iniciar sesión, Dokploy
> puede configurar su propio dominio + SSL para el dashboard. Después puedes volver a cerrar el puerto 3000.

---

## 2. Añadir Tesla Carview como app

En el dashboard de Dokploy:

1. **Projects** → **Create Project** (p. ej. `tesla-carview`)
2. Dentro del proyecto: **Create Service** → **Application**
3. Nombre: `tesla-carview`
4. Tipo de build: **Docker Compose**
5. Archivo compose: `docker-compose.prod.yml`

---

## 3. Conectar el repositorio de GitHub

### Opción A — GitHub App (recomendada)

1. Dashboard de Dokploy → **Settings** → **Git Providers** → **GitHub App** → **Install**
2. Concede permiso para el repositorio `Tesla-Carview`
3. En la configuración de la app: **Source** → selecciona el repositorio, rama: `main`

### Opción B — repositorio público (sin auth)

Simplemente introduce la URL HTTPS en **Source**:
```
https://github.com/YOUR-GITHUB-USER/Tesla-Carview.git
```
Rama: `main`

---

## 4. Definir variables de entorno

En la pestaña **Environment** de la app, introduce todas las variables del archivo `.env`.
Campos mínimos obligatorios:

| Variable | Descripción |
|---|---|
| `JWT_SECRET` | Valor aleatorio largo (`openssl rand -hex 64`) |
| `TESLA_CLIENT_ID` | Client ID de la app de Tesla Developer |
| `TESLA_CLIENT_SECRET` | Secret de la app de Tesla Developer |
| `TESLA_REDIRECT_URI` | `https://your.domain.com/api/auth/callback` |
| `FRONTEND_URL` | `https://your.domain.com` |
| `NODE_ENV` | `production` |

> Todas las demás variables de `backend/.env.example` se pueden añadir según necesidad.

---

## 5. Configurar dominio y SSL

En la pestaña **Domains**:

1. **Add Domain** → `your.domain.com`
2. Proveedor SSL: **Let's Encrypt** (automático vía Traefik)
3. Puerto destino: **80** (el contenedor frontend de nginx gestiona el enrutamiento interno)

El registro A del dominio debe apuntar a la IP del servidor.

---

## 6. Datos persistentes (bind-mount)

Tesla Carview usa un **bind-mount** (`./data:/app/data`), no un volumen Docker con nombre.
Todos los archivos de base de datos (`master.db`, `tenants/*.db`) residen directamente en el subdirectorio `data/`
del directorio de la app en el host — por defecto `/opt/tesla-carview/data/`.

Un simple `cp` es suficiente para los backups:

```bash
# backup manual:
cp /opt/tesla-carview/data/master.db /opt/backups/
cp /opt/tesla-carview/data/tenants/*.db /opt/backups/
```

El auto-backup integrado (System Settings → Automatic Backup) puede alternativamente enviar los backups
a S3 o vía SFTP — sin necesidad de cron del lado del host.

---

## 7. Disparar el primer despliegue

En la pestaña de la app, arriba a la derecha: **Deploy** → Dokploy descarga el código de GitHub,
construye las imágenes Docker e inicia los contenedores.

Logs durante la build:
- pestaña **Deployments** → clic en el despliegue actual → log en tiempo real

---

## 8. Despliegue automático con push a GitHub

### Requisito previo: integración con GitHub App (paso 3A)

Con la integración de GitHub App, Dokploy registra un webhook automáticamente.
Cada push a `main` dispara un nuevo despliegue — sin configuración adicional.

### Webhook manual (opción B / sin GitHub App)

1. Dokploy → app → pestaña **General** → copiar **Webhook URL**
   (formato: `https://dokploy.your.domain.com/api/deploy/XXXXX`)
2. GitHub → repositorio → Settings → Webhooks → **Add webhook**
   - Payload URL: la URL del webhook copiada
   - Content type: `application/json`
   - Secret: dejar vacío (o definir en Dokploy)
   - Trigger: **Just the push event**

A partir de ahora: push a `main` → Dokploy construye y despliega automáticamente.

---

## 9. Logs y monitorización

```
Dashboard de Dokploy → App → Logs
```

O directamente vía Docker en el servidor:

```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs -f backend
```

---

## Comparativa: Dokploy vs. GitHub Actions SSH

| Criterio | GitHub Actions + SSH | Dokploy |
|---|---|---|
| UI web para logs/estado | ✗ (sólo la UI de GitHub) | ✓ |
| Automatización de SSL | Manual (Certbot) | ✓ (Traefik) |
| Varias apps en un servidor | Complejo | ✓ |
| Lógica CI/CD personalizada | ✓ (flexible) | ✗ (sólo build + start) |
| Coste de recursos (Dokploy en sí) | ninguno | ~200 MB RAM |
| Dependencia de GitHub | ✓ (Actions) | Opcional (basta con webhook) |

---

## Lectura adicional

- [Documentación de Dokploy](https://docs.dokploy.com)
- [Tesla Carview — despliegue SSH con GitHub Actions](./02-deployment.en.md#github-actions-auto-deploy)
- [Configurar la Tesla API](./04-tesla-api.en.md)
