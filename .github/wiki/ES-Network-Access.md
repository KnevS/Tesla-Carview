🌐 **Idioma:** [EN](Network-Access) · [DE](DE-Network-Access) · [FR](FR-Network-Access) · **ES** · [TR](TR-Network-Access) · [EL](EL-Network-Access)

---

# Acceso a la red — Sin IP estática

Tesla Carview corre en tu propio servidor — pero para que sea accesible desde internet (incluyendo desde tu Tesla), necesitas una dirección estable y públicamente accesible. Esta página te guía por cada opción, paso a paso.

> **¿No eres experto en IT?** Sigue esta página de arriba a abajo. Cada opción incluye instrucciones precisas sin conocimientos previos asumidos.

---

## ¿Qué opción me conviene?

| Tu situación | Mejor opción |
|---|---|
| Internet doméstico (IP cambia cada día) | [Opción A: Cloudflare Tunnel](#opci%C3%B3n-a-cloudflare-tunnel-recomendado) o [Opción B: DynDNS + router](#opci%C3%B3n-b-dyndns--router-dom%C3%A9stico) |
| Cable / fibra — **no puedes abrir puertos** (CG-NAT) | [Opción A: Cloudflare Tunnel](#opci%C3%B3n-a-cloudflare-tunnel-recomendado) |
| VPS / servidor en un proveedor de hosting | [Opción C: VPS con IP estática](#opci%C3%B3n-c-vps-en-un-proveedor-de-hosting) |
| Tienes un dominio propio | [Opción D: Dominio propio + registro DNS](#opci%C3%B3n-d-dominio-propio-con-registro-dns) |

---

## El problema con el internet doméstico

Tu conexión a internet recibe una **nueva IP cada día** (o con más frecuencia). Esto significa que la dirección que introduces hoy será incorrecta mañana.

**El DNS dinámico lo resuelve:**
- Reservas un hostname fijo (ej. `mi-tesla.duckdns.org`)
- Un pequeño programa en tu router o servidor reporta automáticamente cada nueva IP
- Tu hostname siempre apunta a la IP actual — sin actualizaciones manuales

---

## ¿Estás detrás de CG-NAT?

Muchos proveedores de cable (Vodafone, Orange y otros) ya no dan a cada cliente su propia IPv4 pública. Varios clientes comparten una IP — esto es el **NAT de grado de operador (CG-NAT)**.

**Cómo comprobarlo:**
1. Visita [https://api4.my-ip.io/ip](https://api4.my-ip.io/ip) — anota la IP que se muestra
2. Abre la página de estado de tu router — anota la IP WAN que aparece
3. Si las dos IPs son **diferentes** → estás detrás de CG-NAT

Con CG-NAT, el reenvío de puertos **no funciona**. Usa la Opción A (Cloudflare Tunnel) — no necesita puertos abiertos.

---

## Opción A: Cloudflare Tunnel (Recomendado)

Cloudflare Tunnel crea una conexión saliente cifrada desde tu servidor a la red global de Cloudflare. No necesitas reenvío de puertos. Gratis. Funciona detrás de CG-NAT.

**Requisitos:** Un dominio, o un subdominio gratuito (instrucciones abajo).

### Paso 1: Obtener un dominio gratuito (si no tienes uno)

Ve a [duckdns.org](https://www.duckdns.org), inicia sesión con Google o GitHub, elige un nombre → obtienes ej. `mi-tesla.duckdns.org` gratis.

O compra un dominio barato (~1 $/año) en [Porkbun](https://www.porkbun.com), [Namecheap](https://www.namecheap.com) o [inwx.de](https://www.inwx.de).

### Paso 2: Añadir tu dominio a Cloudflare

1. Regístrate en [dash.cloudflare.com](https://dash.cloudflare.com) — gratis
2. Haz clic en **"Add a Site"** → introduce tu dominio → **Plan gratuito**
3. Cloudflare te muestra dos direcciones de nameservers, ej.:
   ```
   alice.ns.cloudflare.com
   bob.ns.cloudflare.com
   ```
4. Ve a tu registrador de dominio e introduce estos como nameservers
5. Espera 10–30 minutos → Cloudflare confirma "Nameservers updated"

### Paso 3: Instalar y configurar `cloudflared`

En tu servidor (via SSH):

```bash
# Descargar e instalar
curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb \
  -o /tmp/cloudflared.deb
dpkg -i /tmp/cloudflared.deb

# Iniciar sesión (se muestra un enlace al navegador — ábrelo)
cloudflared tunnel login

# Crear tunnel
cloudflared tunnel create tesla-carview
# ¡Anota el Tunnel ID que se muestra!
```

Crear archivo de configuración:

```bash
mkdir -p /etc/cloudflared
nano /etc/cloudflared/config.yml
```

Contenido (reemplaza `YOUR_TUNNEL_ID` y `tudominio.com`):

```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: /root/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: tesla.tudominio.com
    service: http://localhost:80
  - service: http_status:404
```

Crear entrada DNS automáticamente:

```bash
cloudflared tunnel route dns tesla-carview tesla.tudominio.com
```

### Paso 4: Instalar como servicio del sistema

```bash
cloudflared service install
systemctl enable cloudflared
systemctl start cloudflared
```

**Listo.** Tesla Carview ahora es accesible en `https://tesla.tudominio.com` — con HTTPS automático, sin puertos abiertos, sin IP estática.

---

## Opción B: DynDNS + Router doméstico

> **Importante:** Solo funciona si tienes una IPv4 pública real. [Comprueba primero el CG-NAT](#est%C3%A1s-detr%C3%A1s-de-cg-nat).

### Paso 1: Registrarse en un servicio DynDNS

**Dynu** (gratis, sin confirmación mensual):
1. Ve a [dynu.com](https://www.dynu.com) → crea cuenta → DDNS → Add
2. Introduce un nombre, ej. `mi-tesla` → obtienes `mi-tesla.freeddns.org`
3. Anota tu hostname, usuario y contraseña (Panel de control → API Credentials)

**DuckDNS** (aún más simple):
1. [duckdns.org](https://www.duckdns.org) → inicia sesión → elige subdominio → anota tu token

### Paso 2: Configurar tu router

Busca "DNS dinámico" o "DDNS" en los ajustes de internet/WAN de tu router.

| Campo | Dynu | DuckDNS |
|---|---|---|
| Proveedor | Personalizado | Personalizado |
| URL de actualización | `https://api.dynu.com/nic/update?hostname=<domain>&myip=<ipaddr>` | `https://www.duckdns.org/update?domains=TUNAME&token=TUTOKEN&ip=<ipaddr>` |
| Dominio | `mi-tesla.freeddns.org` | `mi-tesla.duckdns.org` |
| Usuario | Usuario Dynu | — |
| Contraseña | Contraseña Dynu | — |

### Paso 3: Reenvío de puertos

Para que el tráfico entrante llegue a tu servidor:

| Campo | Valor |
|---|---|
| Nombre | Tesla Carview |
| Protocolo | TCP |
| Puerto externo | 443 |
| Al dispositivo | IP local de tu servidor (ej. `192.168.1.100`) |
| Puerto interno | 443 |

> **Consejo:** Asigna una IP local fija a tu servidor en los ajustes de tu router.

### Paso 4: Certificado SSL y configuración de Tesla Carview

```bash
# Establecer FRONTEND_URL en /opt/tesla-carview/backend/.env:
FRONTEND_URL=https://mi-tesla.freeddns.org

# Obtener certificado SSL:
certbot --nginx -d mi-tesla.freeddns.org
```

---

## Opción C: VPS en un proveedor de hosting

Un VPS (Virtual Private Server) es un pequeño servidor Linux alquilado con una **IP pública fija y permanente**. Sin DynDNS, sin reenvío de puertos.

**Comparativa de precios (2025):**

| Proveedor | Producto | Precio/mes |
|---|---|---|
| [Hetzner](https://www.hetzner.com) | CX22 | ~4,35 € |
| [netcup](https://www.netcup.eu) | VPS 1000 G11 | ~4,44 € |
| [Contabo](https://contabo.com) | VPS S | ~5,99 € |

**Configuración (ejemplo: Hetzner):**
1. Regístrate → crea servidor → elige Ubuntu 24.04 → anota la IP pública
2. Conéctate por SSH: `ssh root@TU-IP-SERVIDOR`
3. Ejecuta el script de instalación:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
   ```

El script te pide tu nombre de dominio y configura nginx + Let's Encrypt automáticamente.

Luego apunta un dominio a él → [Opción D](#opci%C3%B3n-d-dominio-propio-con-registro-dns)

---

## Opción D: Dominio propio con registro DNS

Si tienes tu propio dominio y un servidor con IP fija, crea un **registro A**:

**¿Qué es un registro A?** Es una entrada en el directorio: `tesla.tudominio.com → 123.456.789.0`

**En Cloudflare DNS:**
DNS → Add record → Tipo: A, Nombre: `tesla`, IPv4: IP de tu servidor → Save

**En Namecheap:**
Domain List → Manage → Advanced DNS → Add New Record → A Record, Host: `tesla`, Value: tu IP

**En IONOS:**
Dominios → tu dominio → DNS → Añadir registro → A, Hostname: `tesla`, Destino: tu IP

**En Hetzner DNS ([dns.hetzner.com](https://dns.hetzner.com)):**
Selecciona zona → Records → Add Record → A, Name: `tesla`, Value: tu IP

> **TTL:** Establece 300 (5 minutos) inicialmente — fácil de corregir errores. Aumenta a 3600 después.

### Verificar la propagación

```bash
nslookup tesla.tudominio.com
# o en línea: https://dnschecker.org
```

### IP dinámica con tu propio dominio

Si tienes dominio pero no IP fija:

**CNAME → DuckDNS** (el router mantiene DuckDNS actualizado):
```
tesla.tudominio.com  →  CNAME  →  mi-tesla.duckdns.org
```

---

## Árbol de decisión

```
¿La IP de tu router es diferente de lo que muestra https://api4.my-ip.io/ip?
  SÍ (CG-NAT) → Opción A: Cloudflare Tunnel
  NO:
    ¿Tienes un servidor en un centro de datos?
      SÍ → Opción C + D (VPS + registro DNS)
      NO (red doméstica):
        ¿Tienes tu propio dominio?
          SÍ → Opción B (DynDNS) + Opción D (registro DNS)
          NO → Opción B con subdominio gratuito (DuckDNS/Dynu)
```

---

## Problemas comunes

### "Sitio no accesible" justo después de la instalación

El DNS tarda 5–30 minutos en propagarse. Prueba primero en local:
```bash
curl -I http://localhost
```

### "Certificado inválido" / Errores HTTPS

```bash
certbot renew --force-renewal
systemctl restart nginx
```

### La URL de actualización DynDNS del router no funciona

Tu router reemplaza `<ipaddr>` automáticamente — no lo rellenes manualmente. Prueba la URL en un navegador reemplazando `<ipaddr>` con tu IP actual.

### "Mi IP WAN empieza por 100. o 10."

Eso es CG-NAT → usa [la Opción A (Cloudflare Tunnel)](#opci%C3%B3n-a-cloudflare-tunnel-recomendado).

### IPv6 / sin IPv4

Las nuevas conexiones de fibra usan IPv6. Funciona igual — usa un registro **AAAA** en lugar de **A** en el DNS.

---

## Enlaces útiles

- [Documentación de Cloudflare Tunnel](https://developers.cloudflare.com/tunnel/)
- [DuckDNS](https://www.duckdns.org/) — DNS dinámico gratuito
- [Dynu DDNS](https://www.dynu.com/) — gratis, sin confirmación mensual
- [dnschecker.org](https://dnschecker.org) — verificar propagación DNS mundial
- [api4.my-ip.io/ip](https://api4.my-ip.io/ip) — comprobar tu IP pública

---

*→ [[ES-Installation]] | [[ES-Raspberry-Pi-Storage]] | [[ES-Home]]*
