🌐 **Language / Sprache / Langue / Idioma / Dil / Γλώσσα**

| | |
|---|---|
| 🇬🇧 **[English](Home)** | English version |
| 🇩🇪 **[Deutsch](DE-Home)** | Deutsche Version |
| 🇫🇷 **[Français](FR-Home)** | Version française |
| 🇪🇸 **[Español](ES-Home)** | Estás aquí |
| 🇹🇷 **[Türkçe](TR-Home)** | Türkçe sürüm |
| 🇬🇷 **[Ελληνικά](EL-Home)** | Ελληνική έκδοση |

---

> ℹ️ **Nota de idioma:** Las subpáginas de este wiki están disponibles en **[inglés](Home)** y **[alemán](DE-Home)**. La página de inicio está completamente traducida al español; las páginas de detalle se abren en inglés.

# Bienvenido al Wiki de Tesla Carview

**Tesla Carview** es una aplicación de registro de datos y control autoalojada para vehículos Tesla. Tus datos permanecen en tu propio servidor — sin nube, sin acceso de terceros.

---

## ⚖️ Licencia — leer primero

Tesla Carview está licenciado para **uso privado no comercial únicamente**.

Puedes:
- ✅ Ejecutar tu propia instancia para uso personal
- ✅ Modificar el código para tu propia instalación privada
- ✅ Compartir el proyecto con otros (con atribución)

**No** puedes:
- ❌ Operar Tesla Carview como servicio de pago para terceros
- ❌ Usarlo comercialmente (clientes, SaaS, gestión de flotas remunerada)
- ❌ Eliminar los avisos de copyright o atribución

Detalles completos de la licencia: [Licencia y Derechos de Uso](License-and-Usage)

---

## 🗺️ ¿Por dónde empezar?

### Soy nuevo — ¿por dónde comienzo?

→ **[Guía de instalación](Installation)** — Configuración paso a paso en 30 minutos

### Tesla Carview funciona pero no puedo acceder desde el exterior

→ **[Acceso a la red](Network-Access)** — DynDNS, Cloudflare Tunnel, FritzBox, VPS

### Mi tarjeta SD de Raspberry Pi sigue fallando

→ **[Almacenamiento Raspberry Pi](Raspberry-Pi-Storage)** — USB SSD, NVMe, arranque PXE

### Quiero conectar mi cuenta Tesla

→ **[Configuración de la API de Tesla](Tesla-API-Setup)** — Cuenta de desarrollador, tokens, Virtual Key

### Quiero entender todas las funcionalidades

→ **[Resumen de funciones](Features)** — Panel, viajes, carga, controles y más

### Tengo varios usuarios o quiero configurarlo para la familia

→ **[Multi-inquilino y Usuarios](Multi-Tenant)** — Inquilinos, invitaciones, permisos

### Algo no funciona

→ **[Solución de problemas](Troubleshooting)** — Problemas comunes y soluciones

---

## 🔑 De un vistazo

| Característica | Detalles |
|---|---|
| **Plataforma** | Servidor Linux, Raspberry Pi, VPS |
| **Almacenamiento** | SQLite (por inquilino, sin base de datos externa) |
| **Autenticación** | Usuario/contraseña, Passkeys, MFA (TOTP) |
| **API** | Tesla Fleet API (oficial), Virtual Key para comandos |
| **Idiomas** | DE, EN, FR, ES, TR, EL |
| **Licencia** | Uso privado no comercial |

---

## 📂 Para expertos en TI

Este wiki es el punto de entrada guiado. Si prefieres leer Markdown sin procesar con todos los detalles técnicos, todo está en el repositorio:

| Recurso | Enlace |
|---|---|
| Índice de documentación técnica | [docs/README.en.md](https://github.com/KnevS/Tesla-Carview/blob/main/docs/README.en.md) |
| Todas las variables de entorno | [docs/10-configuration.en.md](https://github.com/KnevS/Tesla-Carview/blob/main/docs/10-configuration.en.md) |
| Arquitectura de seguridad | [docs/05-security-architecture.en.md](https://github.com/KnevS/Tesla-Carview/blob/main/docs/05-security-architecture.en.md) |
| Copia de seguridad y operaciones | [docs/11-operations.en.md](https://github.com/KnevS/Tesla-Carview/blob/main/docs/11-operations.en.md) |

---

*Este wiki se genera automáticamente desde el repositorio. Última actualización: ver [commits](https://github.com/KnevS/Tesla-Carview/commits/main).*
