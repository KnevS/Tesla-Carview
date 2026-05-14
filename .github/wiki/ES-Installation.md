🌐 **Language / Sprache / Langue / Idioma / Dil / Γλώσσα**

| | |
|---|---|
| 🇬🇧 **[English](Installation)** | English version |
| 🇩🇪 **[Deutsch](DE-Installation)** | Deutsche Version |
| 🇫🇷 **[Français](FR-Installation)** | Version française |
| 🇪🇸 **[Español](ES-Installation)** | Estás aquí |
| 🇹🇷 **[Türkçe](TR-Installation)** | Türkçe sürüm |
| 🇬🇷 **[Ελληνικά](EL-Installation)** | Ελληνική έκδοση |

---

# Guía de instalación

> **Tiempo estimado:** ~30 minutos | **Dificultad:** Apto para principiantes

Esta guía le muestra cómo realizar una instalación completa de Tesla Carview desde cero.

---

## Lo que necesita antes de comenzar

Antes de ejecutar cualquier comando, asegúrese de contar con:

- [ ] Un servidor Linux, VPS o Raspberry Pi (consulte las [opciones de hardware](#opciones-de-hardware) a continuación)
- [ ] Un nombre de dominio apuntando a su servidor — O bien, planifique usar DynDNS / Cloudflare Tunnel ([→ Acceso a la red](Network-Access))
- [ ] Una cuenta de Tesla Developer ([→ Configuración de la API de Tesla](Tesla-API-Setup))
- [ ] Acceso SSH a su servidor (o un teclado + pantalla en la Pi)

---

## Opciones de hardware

### Opción 1: Raspberry Pi (servidor doméstico)
Ideal para: uso personal en casa, bajo costo (~€60–120 en total)

| Modelo | RAM | Almacenamiento recomendado |
|---|---|---|
| Raspberry Pi 5 (recomendado) | 4 GB u 8 GB | SSD NVMe mediante M.2 HAT+ |
| Raspberry Pi 4 | 4 GB | SSD USB |
| Raspberry Pi 3 | 1 GB | SSD USB (más lento) |

> ⚠️ **Importante:** No use una tarjeta SD para la operación permanente. Fallará en cuestión de meses bajo la carga de escritura de Tesla Carview. Consulte [Almacenamiento en Raspberry Pi](Raspberry-Pi-Storage) para una solución de 20 minutos.

### Opción 2: VPS en un proveedor de hosting
Ideal para: disponibilidad 24/7, sin hardware que gestionar, configuración sencilla

| Proveedor | Costo mensual | Notas |
|---|---|---|
| [Hetzner](https://www.hetzner.com) CX22 | ~€4.35 | Recomendado, muy fiable |
| [netcup](https://www.netcup.eu) VPS 1000 | ~€4.44 | Centros de datos alemanes |
| [Contabo](https://contabo.com) VPS S | ~€5.99 | Gran cantidad de almacenamiento |

Un VPS tiene una **dirección IP pública fija** — no se necesita configuración de DynDNS.

---

## Paso 1: Preparar el servidor

Conéctese a su servidor mediante SSH (o abra una terminal en la Pi):

```bash
ssh root@YOUR-SERVER-IP
```

Asegúrese de que el sistema esté actualizado:

```bash
apt update && apt upgrade -y
```

---

## Paso 2: Apuntar un dominio a su servidor

Tesla Carview **requiere HTTPS** (la API de Tesla solo funciona a través de conexiones seguras). Esto significa que necesita un dominio con un certificado SSL válido.

**Tengo un VPS con IP fija:**
→ Vaya a su registrador de dominio y cree un registro A:
```
tesla.yourdomain.com  →  A  →  YOUR-VPS-IP
```
Espere entre 5 y 30 minutos para que el DNS se propague y luego continúe.

**Estoy en casa sin IP fija:**
→ Consulte [Acceso a la red](Network-Access) — primero configure DynDNS o Cloudflare Tunnel y luego regrese aquí.

**No tengo ningún dominio:**
→ Obtenga un subdominio gratuito en [DuckDNS.org](https://www.duckdns.org) (p. ej. `mi-tesla.duckdns.org`) — es gratuito y funciona con Let's Encrypt.

---

## Paso 3: Ejecutar el script de instalación

Este único comando descarga y ejecuta el asistente de configuración interactivo:

```bash
curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
```

El asistente le hace una serie de preguntas:

| Pregunta | Qué ingresar |
|---|---|
| Nombre de dominio | `tesla.yourdomain.com` o `mi-tesla.duckdns.org` |
| Nombre de usuario administrador | Cualquier nombre (p. ej. su nombre de pila, `admin`) |
| Contraseña de administrador | Una contraseña segura (mín. 12 caracteres) |
| Nombre del tenant | Cómo llamar a su instalación (p. ej. "Mi Tesla") |
| Activar HTTPS | Sí (siempre — requerido por la API de Tesla) |

El script realiza automáticamente lo siguiente:
1. Instala Docker, nginx, certbot, fail2ban
2. Obtiene un certificado SSL de Let's Encrypt para su dominio
3. Configura nginx con cabeceras de seguridad
4. Inicia todos los contenedores Docker
5. Configura la base de datos

**Esto tarda entre 5 y 10 minutos.**

---

## Paso 4: Primer inicio de sesión

Abra su navegador y vaya a `https://tesla.yourdomain.com`

Debería ver la página de inicio de sesión de Tesla Carview. Ingrese el nombre de usuario y la contraseña de administrador que configuró en el Paso 3.

> 💡 **Consejo:** Marque la opción "Mantener sesión iniciada (90 días)" en la página de inicio de sesión para no tener que escribir su contraseña cada vez — especialmente útil al acceder desde el navegador del Tesla.

---

## Paso 5: Conectar su cuenta de Tesla

Después de iniciar sesión, verá un aviso de configuración para conectar su cuenta de Tesla. Siga las instrucciones en [Configuración de la API de Tesla](Tesla-API-Setup).

---

## Paso 6: ¡Listo!

Su instalación de Tesla Carview está en funcionamiento. La aplicación comenzará a consultar los datos de su vehículo automáticamente.

Qué hacer a continuación:
- **Configurar su vehículo** → Dashboard → Añadir vehículo
- **Configurar notificaciones** → Ajustes → Notificaciones push
- **Invitar a familiares** → Admin → Usuarios → Invitar
- **Configurar una ubicación de carga** → Ajustes → Ubicaciones de carga

---

## Actualización

Tesla Carview puede actualizarse automáticamente. Actívelo en los ajustes:

```bash
# En /opt/tesla-carview/backend/.env:
AUTO_UPDATE_ENABLED=true
```

O actualice manualmente:

```bash
cd /opt/tesla-carview
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

---

## Resolución de problemas de instalación

**"Permiso denegado" al ejecutar el script**
→ Asegúrese de ejecutarlo como `root`. Ejecute primero `sudo su`.

**"Dominio no encontrado" durante certbot**
→ El DNS aún no se ha propagado. Espere de 10 a 30 minutos e inténtelo de nuevo. Compruebe con: `nslookup tesla.yourdomain.com`

**Los contenedores no arrancan**
→ Revise los registros: `docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs`

**Más ayuda** → [Solución de problemas](Troubleshooting) | [Abrir un issue](https://github.com/KnevS/Tesla-Carview/issues)
