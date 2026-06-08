# 📚 Tesla Carview — Documentación técnica

> 🤖 *Esta traducción al español es asistida por IA desde [README.en.md](README.en.md). Correcciones bienvenidas vía GitHub.*

> 🇩🇪 [Auf Deutsch lesen](README.md) · 👤 [Manual de usuario (EN)](../frontend/src/handbook/handbook.en.md)

Esta documentación está dirigida a **self-hosters, administradores y desarrolladores**. Cubre instalación, configuración, operaciones y arquitectura.

> Los **usuarios de la aplicación en ejecución** (inicio de sesión, libro de viajes, controles, permisos, demo, …) encontrarán todo en el **manual integrado en la app** en `/handbook` o directamente en [`frontend/src/handbook/handbook.en.md`](../frontend/src/handbook/handbook.en.md). Los dos documentos se solapan deliberadamente en algunos temas, pero siempre se referencian entre sí.

---

## Índice

### 🚀 Configuración inicial

| Documento | Tema |
|---|---|
| [01-quickstart.en.md](01-quickstart.en.md) | Inicio rápido: clonar el repo, ejecutar backend + frontend localmente |
| [02-deployment.en.md](02-deployment.en.md) | Despliegue en producción en un servidor Linux / Raspberry Pi con Docker + nginx + Let's Encrypt |
| [14-network-access.en.md](14-network-access.en.md) | **Accesible desde cualquier lugar** sin IP estática — DynDNS, FritzBox, Cloudflare Tunnel, VPS, dominio propio |
| [15-raspberry-pi-storage.en.md](15-raspberry-pi-storage.en.md) | **Almacenamiento en Raspberry Pi** — sustituir la tarjeta SD por SSD USB, NVMe HAT+, arranque por red PXE |
| [07-setup-wizard.en.md](07-setup-wizard.en.md) | Asistente interactivo de configuración (`deploy/setup-wizard.sh`) |
| [08-dokploy.en.md](08-dokploy.en.md) | Alternativa: despliegue mediante Dokploy |

### ⚙️ Configuración

| Documento | Tema |
|---|---|
| [10-configuration.en.md](10-configuration.en.md) | **Cada variable de entorno** — obligatorias, opcionales, demo, auto-actualización |
| [04-tesla-api.en.md](04-tesla-api.en.md) | Crear una cuenta de desarrollador Tesla, registrar la app, elegir scopes |
| [09-tesla-api-usage.en.md](09-tesla-api-usage.en.md) | Coste, cuota y seguimiento de la Tesla API |

### 🛠 Operaciones

| Documento | Tema |
|---|---|
| [11-operations.en.md](11-operations.en.md) | **Backup y restauración**, **mantenimiento nocturno**, **modo demo**, auto-actualización, salud del sistema, logs |
| [12-high-availability.en.md](12-high-availability.en.md) | **Arquitectura HA** (teaser) — warm standby, activo-activo, geo-redundante, K8s. Se entrega por proyecto bajo petición. |

### 🔐 Seguridad

| Documento | Tema |
|---|---|
| [03-authentication.en.md](03-authentication.en.md) | Flujo de autenticación: JWT, refresh token, MFA, passkeys |
| [05-security-architecture.en.md](05-security-architecture.en.md) | Modelo de amenazas y todas las medidas de seguridad |
| [06-fail2ban.en.md](06-fail2ban.en.md) | Protección contra fuerza bruta con fail2ban |

---

## ¿Dónde vive cada pieza de información?

| Pregunta | Respuesta |
|---|---|
| "¿Cómo instalo Tesla Carview en mi servidor?" | [02-deployment.en.md](02-deployment.en.md) |
| "¿Qué variable env controla X?" | [10-configuration.en.md](10-configuration.en.md) |
| "¿Cómo creo un backup?" | [11-operations.en.md](11-operations.en.md) |
| "Mi Tesla no aparece — ¿qué hago?" | [Manual de usuario → Resolución de problemas](../frontend/src/handbook/handbook.en.md#-troubleshooting) |
| "¿Cómo uso el libro de viajes para Hacienda?" | [Manual de usuario → Libro BMF](../frontend/src/handbook/handbook.en.md#-logbook-for-the-tax-office-bmf-compliant-fahrtenbuch-bmf) |
| "¿Cómo activo MFA en mi cuenta?" | [Manual de usuario → Seguridad](../frontend/src/handbook/handbook.en.md#-security) |
| "¿Por qué las cuentas nuevas requieren MFA?" | [03-authentication.en.md](03-authentication.en.md) (arquitectura) y [Manual de usuario → Seguridad](../frontend/src/handbook/handbook.en.md#-security) (lado del usuario) |
| "¿Cómo funciona el modo demo por dentro?" | [11-operations.en.md → Modo demo](11-operations.en.md#-demo-mode) |
| "¿Qué se registra en el log de auditoría?" | [05-security-architecture.en.md](05-security-architecture.en.md) y la UI en `/admin/audit` |

---

## Contenido relacionado fuera de los docs

- **`backend/.env.example`** — plantilla comentada para la configuración del backend
- **`frontend/.env.example`** — plantilla para el contacto del pie de página (en tiempo de build)
- **`deploy/setup.sh`** — configuración del servidor totalmente automatizada
- **`deploy/setup-wizard.sh`** — asistente interactivo
- **`deploy/update.sh`** — actualización sin tiempo de inactividad
- **`docker-compose.prod.yml`** — stack de producción con backend + frontend + nginx
