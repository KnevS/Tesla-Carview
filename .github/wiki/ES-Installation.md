🌐 **Idioma:** [EN](Installation) · [DE](DE-Installation) · [FR](FR-Installation) · **ES** · [TR](TR-Installation) · [EL](EL-Installation)

---

# Guía de instalación

> **Tiempo necesario:** ~30 minutos | **Dificultad:** Apto para principiantes

Esta guía te lleva paso a paso por una instalación completa de Tesla Carview desde cero.

---

## Lo que necesitas antes de empezar

Antes de ejecutar ningún comando, asegúrate de tener:

- [ ] Un servidor Linux, VPS o Raspberry Pi (ver [opciones de hardware](#opciones-de-hardware) abajo)
- [ ] Un dominio apuntando a tu servidor — O planeas usar DynDNS / Cloudflare Tunnel ([→ Acceso a la red](ES-Network-Access))
- [ ] Una cuenta de desarrollador Tesla ([→ Configuración de la API Tesla](ES-Tesla-API-Setup))
- [ ] Acceso SSH a tu servidor (o un teclado + pantalla en la Pi)

---

## Opciones de hardware

### Opción 1: Raspberry Pi (servidor doméstico)
Ideal para: uso personal en casa, bajo coste (~60–120 € en total)

| Modelo | RAM | Almacenamiento recomendado |
|---|---|---|
| Raspberry Pi 5 (recomendado) | 4 GB o 8 GB | SSD NVMe via M.2 HAT+ |
| Raspberry Pi 4 | 4 GB | SSD USB |
| Raspberry Pi 3 | 1 GB | SSD USB (más lento) |

> ⚠️ **Importante:** No uses una tarjeta SD para uso permanente. Fallará en meses bajo la carga de escritura de Tesla Carview. Ver [Almacenamiento Raspberry Pi](ES-Raspberry-Pi-Storage) para solucionarlo en 20 minutos.

### Opción 2: VPS en un proveedor de hosting
Ideal para: disponibilidad 24/7, sin hardware que gestionar, configuración sencilla

| Proveedor | Coste mensual | Notas |
|---|---|---|
| [Hetzner](https://www.hetzner.com) CX22 | ~4,35 € | Recomendado, muy fiable |
| [netcup](https://www.netcup.eu) VPS 1000 | ~4,44 € | Centros de datos alemanes |
| [Contabo](https://contabo.com) VPS S | ~5,99 € | Mucho almacenamiento |

Un VPS tiene una **IP pública fija** — no necesitas configurar DynDNS.

---

## Paso 1: Prepara el servidor

Conéctate a tu servidor via SSH (o abre un terminal en la Pi):

```bash
ssh root@YOUR-SERVER-IP
```

Asegúrate de que el sistema está actualizado:

```bash
apt update && apt upgrade -y
```

---

## Paso 2: Apunta un dominio a tu servidor

Tesla Carview **requiere HTTPS** (la API de Tesla solo funciona sobre conexiones seguras). Necesitas un dominio con un certificado SSL válido.

**Tengo un VPS con IP fija:**
→ Ve a tu registrador de dominio y crea un registro A:
```
tesla.tudominio.com  →  A  →  TU-IP-VPS
```
Espera 5–30 minutos para que el DNS se propague y continúa.

**Estoy en casa sin IP fija:**
→ Ver [Acceso a la red](ES-Network-Access) — configura DynDNS o Cloudflare Tunnel primero, luego vuelve aquí.

**No tengo dominio:**
→ Obtén un subdominio gratis en [DuckDNS.org](https://www.duckdns.org) (ej. `mi-tesla.duckdns.org`) — es gratis y funciona con Let's Encrypt.

---

## Paso 3: Ejecuta el script de instalación

Este comando descarga y ejecuta el asistente de configuración interactivo:

```bash
curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
```

El asistente te hace una serie de preguntas:

| Pregunta | Qué introducir |
|---|---|
| Nombre de dominio | `tesla.tudominio.com` o `mi-tesla.duckdns.org` |
| Nombre de usuario admin | Cualquier nombre (ej. tu nombre, `admin`) |
| Contraseña admin | Una contraseña segura (mín. 12 caracteres) |
| Nombre del inquilino | Cómo llamar tu instalación (ej. "Mi Tesla") |
| Activar HTTPS | Sí (siempre — necesario para la API Tesla) |

El script entonces automáticamente:
1. Instala Docker, nginx, certbot, fail2ban
2. Obtiene un certificado SSL de Let's Encrypt para tu dominio
3. Configura nginx con cabeceras de seguridad
4. Inicia todos los contenedores Docker
5. Configura la base de datos

**Esto tarda 5–10 minutos.**

---

## Paso 4: Primer acceso

Abre tu navegador y ve a `https://tesla.tudominio.com`

Deberías ver la página de inicio de sesión de Tesla Carview. Introduce el nombre de usuario y contraseña de admin que configuraste en el Paso 3.

> 💡 **Consejo:** Marca "Mantener sesión (90 días)" en la página de inicio de sesión para no tener que escribir la contraseña cada vez — especialmente útil al acceder desde el navegador del Tesla.

---

## Paso 5: Conecta tu cuenta Tesla

Después de iniciar sesión, verás un mensaje para conectar tu cuenta Tesla. Sigue las instrucciones en [Configuración de la API Tesla](ES-Tesla-API-Setup).

---

## Paso 6: ¡Listo!

Tu instalación de Tesla Carview está funcionando. La app comenzará a consultar los datos de tu vehículo automáticamente.

Qué hacer a continuación:
- **Configura tu vehículo** → Panel → Añadir vehículo
- **Configura notificaciones** → Ajustes → Notificaciones push
- **Invita a familiares** → Admin → Usuarios → Invitar
- **Configura un punto de carga** → Ajustes → Ubicaciones de carga

---

## Actualización

Tesla Carview puede actualizarse automáticamente. Actívalo en los ajustes:

```bash
# En /opt/tesla-carview/backend/.env:
AUTO_UPDATE_ENABLED=true
```

O actualiza manualmente:

```bash
cd /opt/tesla-carview
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

---

## Solución de problemas de instalación

**"Permission denied" al ejecutar el script**
→ Asegúrate de ejecutarlo como `root`. Ejecuta `sudo su` primero.

**"Domain not found" durante certbot**
→ Tu DNS aún no se ha propagado. Espera 10–30 minutos e intenta de nuevo. Comprueba con: `nslookup tesla.tudominio.com`

**Los contenedores no arrancan**
→ Revisa los logs: `docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs`

**Más ayuda** → [Solución de problemas](ES-Troubleshooting) | [Abrir un issue](https://github.com/KnevS/Tesla-Carview/issues)
