# Accesible desde cualquier lugar — sin IP estática

> 🤖 *Esta traducción al español es asistida por IA desde [14-network-access.en.md](14-network-access.en.md). Correcciones bienvenidas vía GitHub.*

> 🇩🇪 [Auf Deutsch lesen](14-network-access.md)

Este capítulo explica **paso a paso** cómo hacer Tesla Carview accesible desde cualquier lugar — incluso sin una dirección IP pública fija, incluso detrás de un router doméstico, incluso en una conexión de internet residencial.

> **¿No eres experto en IT? No hay problema.** Cada opción incluye instrucciones paso a paso precisas que puedes seguir sin conocimientos previos.

---

## ¿Qué opción es la adecuada para mí?

| Situación | Mejor opción |
|---|---|
| Internet doméstico (router), la IP cambia a diario | [Opción A: Cloudflare Tunnel](#opción-a-cloudflare-tunnel-recomendado-para-uso-doméstico) u [Opción B: DynDNS + router](#opción-b-dyndns--router-doméstico) |
| Internet por cable o fibra — **no se pueden abrir puertos** (CG-NAT) | [Opción A: Cloudflare Tunnel](#opción-a-cloudflare-tunnel-recomendado-para-uso-doméstico) |
| Servidor propio / VPS en un proveedor de hosting (netcup, Hetzner) | [Opción C: VPS con IP estática](#opción-c-vps-en-un-proveedor-de-hosting-netcup-hetzner-contabo) |
| Dominio propio disponible | [Opción D: Dominio propio + registro DNS](#opción-d-dominio-propio-con-registro-dns) |

---

## El problema con las direcciones IP dinámicas

Tu conexión de internet doméstica **no tiene una dirección IP fija** — el router recibe una nueva a diario (o más a menudo). Esto significa: si introduces hoy `192.0.2.47` en la app, mañana estará mal.

La solución se llama **Dynamic DNS (DynDNS o DDNS)**:
- Reservas un nombre de dominio fijo (p. ej. `my-tesla.duckdns.org`)
- Un pequeño programa (que se ejecuta automáticamente en tu router o servidor) reporta la nueva dirección IP cada vez que cambia
- Tu nombre de dominio siempre apunta a la IP actual — nunca tienes que cambiar nada manualmente

---

## Otro problema: sin IPv4 pública (CG-NAT)

Muchas conexiones de internet por cable (p. ej. Vodafone, Virgin Media, ciertos proveedores móviles) ya no proporcionan una dirección IPv4 pública propia. Varios clientes comparten una IP. Esto se llama Carrier-Grade NAT (CG-NAT).

**Test de detección:** Ve a [https://api4.my-ip.io/ip](https://api4.my-ip.io/ip) y compara la IP mostrada con la IP que tu router muestra en su página de estado. Si las IPs son **diferentes** → estás detrás de CG-NAT. La Opción B **no funcionará**.

Con CG-NAT, la **Opción A (Cloudflare Tunnel)** es la única solución sin un servidor adicional.

---

## Opción A: Cloudflare Tunnel (recomendado para uso doméstico)

**¿Qué es?** Cloudflare Tunnel establece una conexión cifrada saliente desde tu servidor a internet — sin abrir ningún puerto en tu router. Tu instancia de Tesla Carview pasa a ser accesible a través de la red global de Cloudflare.

**Coste:** Gratis.

**Requisitos:**
- Un dominio (p. ej. `mydomain.com`) **o** un subdominio gratuito (instrucciones abajo)
- El dominio debe estar gestionado por Cloudflare (paso gratuito)

### Paso 1: Conseguir un dominio gratuito (si no tienes uno)

Sin dominio propio, usa DuckDNS:
1. Ve a [https://www.duckdns.org](https://www.duckdns.org) e inicia sesión con Google o GitHub
2. Elige un nombre, p. ej. `my-tesla` → obtienes `my-tesla.duckdns.org`
3. Anota tu **token** (la larga cadena alfanumérica que se muestra en tu perfil)

Alternativamente: Consigue un dominio barato desde ~1 $/año en [Namecheap](https://www.namecheap.com), [Porkbun](https://www.porkbun.com) o [inwx.de](https://www.inwx.de).

### Paso 2: Cuenta de Cloudflare + añadir dominio

1. Ve a [https://dash.cloudflare.com](https://dash.cloudflare.com) → regístrate gratis
2. Haz clic en **"Add a Site"** e introduce tu dominio
3. Elige el **Free plan** (0 €)
4. Cloudflare te muestra dos direcciones de nameserver, p. ej.:
   ```
   alice.ns.cloudflare.com
   bob.ns.cloudflare.com
   ```
5. Ve a tu registrador de dominio (Namecheap, IONOS, etc.) e introdúcelas **como nameservers**
   - En Namecheap: Domain List → Manage → Nameservers → Custom DNS
   - En IONOS: Dominios → tu dominio → Nameservers → Custom nameservers
6. Espera 10–30 minutos hasta que Cloudflare confirme: **"Nameservers updated"**

### Paso 3: Crear el túnel

En tu servidor (vía SSH o terminal):

```bash
# Instalar cloudflared
curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb \
  -o /tmp/cloudflared.deb
dpkg -i /tmp/cloudflared.deb

# Iniciar sesión en tu cuenta de Cloudflare (se abrirá una ventana del navegador)
cloudflared tunnel login

# Crear el túnel (elige cualquier nombre)
cloudflared tunnel create tesla-carview

# Muestra: Tunnel ID (p. ej. "abc123-...") — ¡anótalo!
```

### Paso 4: Configurar el túnel

```bash
mkdir -p /etc/cloudflared
nano /etc/cloudflared/config.yml
```

Contenido (sustituye `YOUR_TUNNEL_ID` y `yourdomain.com`):

```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: /root/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: tesla.yourdomain.com
    service: http://localhost:80
  - service: http_status:404
```

Crear el registro DNS (Cloudflare lo hace automáticamente):
```bash
cloudflared tunnel route dns tesla-carview tesla.yourdomain.com
```

### Paso 5: Instalar como servicio (arranca automáticamente tras reinicio)

```bash
cloudflared service install
systemctl enable cloudflared
systemctl start cloudflared
```

**¡Hecho!** Tesla Carview es ahora accesible en `https://tesla.yourdomain.com` — con HTTPS automático, sin port forwarding, sin IP estática.

---

## Opción B: DynDNS + router doméstico

> **Importante:** Sólo funciona si tienes tu **propia IPv4 pública** (sin CG-NAT). Pruébalo primero — [ver arriba](#otro-problema-sin-ipv4-pública-cg-nat).

**¿Qué es?** Tu router reporta automáticamente su nueva IP a un servicio DynDNS. Siempre puedes llegar a Tesla Carview con el mismo nombre de dominio.

### Paso 1: Elegir un servicio DynDNS y registrarse

**Recomendado: Dynu** (totalmente gratis, no requiere confirmación mensual)

1. Ve a [https://www.dynu.com](https://www.dynu.com) → crea una cuenta
2. DDNS → Add → introduce un nombre, p. ej. `my-tesla` → obtienes `my-tesla.freeddns.org`
3. Anota: **hostname**, **username**, **password** (en Control Panel → API Credentials)

**Alternativa: DuckDNS** (aún más simple, pero requiere configuración manual del router)

1. [https://www.duckdns.org](https://www.duckdns.org) → inicia sesión → elige subdominio
2. Update URL: `https://www.duckdns.org/update?domains=YOURNAME&token=YOURTOKEN&ip=`

### Paso 2: Configurar tu router

Para **FritzBox:**
1. Abre la interfaz de FritzBox: [http://fritz.box](http://fritz.box)
2. **Internet → Sharing → DynDNS**
3. Marca **"Use DynDNS"**
4. Rellena:

   | Campo | Valor Dynu |
   |---|---|
   | DynDNS provider | User-defined |
   | Update URL | `https://api.dynu.com/nic/update?hostname=<domain>&myip=<ipaddr>` |
   | Domain name | `my-tesla.freeddns.org` |
   | Username | usuario Dynu |
   | Password | contraseña Dynu |

5. **Aplicar** → FritzBox prueba la conexión → tick verde = funcionando

Para **otros routers:** Busca "Dynamic DNS" o "DDNS" en los ajustes del router — la mayoría de routers modernos lo soportan con campos similares.

### Paso 3: Port forwarding

Para que el tráfico desde fuera llegue a tu servidor:

1. **Internet → Sharing → Port Sharing** (FritzBox)
2. **New Port Sharing** → **Other Application**
3. Rellena:

   | Campo | Valor |
   |---|---|
   | Name | Tesla Carview HTTPS |
   | Protocol | TCP |
   | External port | 443 |
   | To device | IP de tu servidor en la red local (p. ej. `192.168.1.100`) |
   | Internal port | 443 |

4. **Aplicar** y activar

> **Consejo:** Asigna a tu servidor una **IP local fija (estática)** para que el port forwarding no "derive". En FritzBox: Home Network → Network → tu dispositivo → Always assign this IP.

### Paso 4: Configurar Tesla Carview

Abre `/opt/tesla-carview/backend/.env` y establece:

```bash
FRONTEND_URL=https://my-tesla.freeddns.org
```

Obtén un certificado SSL vía Let's Encrypt:
```bash
certbot --nginx -d my-tesla.freeddns.org
```

**¡Hecho!** Accesible en `https://my-tesla.freeddns.org`.

---

## Opción C: VPS en un proveedor de hosting (netcup, Hetzner, Contabo)

Un VPS (Virtual Private Server) es un pequeño servidor Linux alquilado en un centro de datos. Siempre tiene una **dirección IPv4 pública fija** — sin trucos de DynDNS.

**Comparativa de precios (2026):**

| Proveedor | Producto | Precio/mes | Specs | Notas |
|---|---|---|---|---|
| [netcup](https://www.netcup.com/en/server/vps-lite) | **VPS nano G11s** ⭐ | **~3,08 €** | 2 vCore · 2 GB RAM · 60 GB SSD | Punto de entrada más barato, DC alemán, tráfico ilimitado — **recomendado para TeslaView** |
| [netcup](https://www.netcup.eu) | VPS 1000 G11 | ~4,44 € | 2 vCore · 2 GB RAM · 40 GB SSD | Algo más de margen de rendimiento |
| [Hetzner](https://www.hetzner.com) | CX22 | ~4,35 € | 2 vCPU · 4 GB RAM · 40 GB | Muy fiable, Núremberg/Falkenstein |
| [Contabo](https://contabo.com) | VPS S | ~5,99 € | 4 vCPU · 8 GB RAM · 100 GB | Mucho almacenamiento para multi-tenant |
| [IONOS](https://www.ionos.com) | VPS S | ~1,00 € | 1 vCore · 1 GB RAM · 10 GB | Primer mes barato, luego más caro |

> 💡 **Código de descuento para netcup:** Podemos enviarte un código de descuento personal para netcup bajo petición. Manda un breve e-mail a [rabatt-code-netcup@krische.com](mailto:rabatt-code-netcup@krische.com) con el asunto "netcup TeslaView".

> **¿Por qué VPS nano G11s para TeslaView?** Tesla Carview usa ~150–200 MB RAM en reposo (backend + nginx + proxy). 2 GB RAM dan margen de sobra. El SSD de 60 GB tiene espacio para muchos años de datos de telemetría (SQLite crece ~500 MB/año para un vehículo activo). 2 vCores aseguran que las consultas de export y migración no bloqueen al poller.

### Setup en netcup (ejemplo)

1. Regístrate en [netcup.eu](https://www.netcup.eu)
2. **Server Control Panel (SCP)** → ordenar VPS → elegir Ubuntu 24.04
3. Copia la contraseña de root del e-mail de confirmación
4. Abre una terminal e inicia sesión:
   ```bash
   ssh root@YOUR-SERVER-IP
   ```
5. Instala Tesla Carview:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
   ```

El script de setup pregunta por un nombre de dominio. Introduce tu dominio (p. ej. `tesla.yourdomain.com`) — Let's Encrypt y nginx se configuran automáticamente.

### Apuntar un dominio al VPS

Si tienes tu propio dominio, crea un **registro A**:

```
tesla.yourdomain.com  →  A  →  YOUR-VPS-IP  →  TTL 300
```

Cómo hacerlo: [→ Opción D abajo](#opción-d-dominio-propio-con-registro-dns)

---

## Opción D: Dominio propio con registro DNS

Si tienes tu propio dominio (p. ej. `yourdomain.com`) y un servidor con una **IP fija** (VPS o IP estática doméstica), todo lo que necesitas es un registro DNS.

### ¿Qué es un registro A?

Un **registro A** funciona como una entrada de una guía telefónica:
- A la izquierda está el nombre: `tesla.yourdomain.com`
- A la derecha está la dirección: `123.456.789.0` (la IP de tu servidor)
- Cada navegador que visite `tesla.yourdomain.com` recibe: "La IP es `123.456.789.0`"

### Cómo crear un registro A

**En Namecheap:**
1. Domain List → Manage → Advanced DNS → Add New Record
2. Type: **A Record**, Host: `tesla`, Value: la IP de tu servidor
3. Save All Changes

**En IONOS:**
1. Dominios → tu dominio → DNS → Add record
2. Type: **A**, Hostname: `tesla`, Destination: la IP de tu servidor
3. Save

**En inwx.de:**
1. Gestión de dominios → DNS → Add record
2. Type: **A**, Name: `tesla`, Content: la IP de tu servidor, TTL: 300
3. Save

**En Hetzner DNS Console ([dns.hetzner.com](https://dns.hetzner.com)):**
1. Selecciona la zona → Records → Add Record
2. Type: **A**, Name: `tesla`, Value: la IP de tu servidor
3. Add record

> **TTL** (Time to Live) determina cuánto tiempo se cachean las entradas DNS. Pon 300 (5 minutos) durante el setup inicial para poder corregir errores rápido. Puedes subirlo a 3600 más adelante.

### Verificar: ¿se ha propagado el registro DNS?

```bash
# Prueba desde tu ordenador de casa:
nslookup tesla.yourdomain.com
# o
dig tesla.yourdomain.com
```

O en línea: [https://dnschecker.org](https://dnschecker.org) — muestra si el registro es visible en todo el mundo.

### IP dinámica con dominio propio

Si tienes dominio propio pero no IP fija, combina ambos enfoques:

**Variante 1: CNAME apuntando a DuckDNS** (el router mantiene DuckDNS actualizado automáticamente)
```
tesla.yourdomain.com  →  CNAME  →  my-tesla.duckdns.org
```

**Variante 2: Script de actualización + cron job**
```bash
# Cron job que actualiza la IP cada 5 minutos:
*/5 * * * * curl -s "https://www.duckdns.org/update?domains=my-tesla&token=YOURTOKEN&ip=$(curl -s https://api4.my-ip.io/ip)"
```

---

## Problemas comunes y soluciones

### "Site not reachable" tras el setup

1. **Espera 5–30 minutos** — las entradas DNS tardan en propagarse
2. **Prueba localmente primero:** ¿es accesible Tesla Carview en el servidor?
   ```bash
   curl -I http://localhost
   ```
3. **Port forwarding del router:** Haz clic en **Test** junto a la regla de port sharing

### "Certificate invalid" / errores HTTPS

```bash
# Reemitir el certificado Let's Encrypt:
certbot renew --force-renewal
systemctl restart nginx
```

### La URL de update del router no funciona

- Tu router sustituye `<ipaddr>` por la IP actual — no la rellenes manualmente
- Prueba la URL manualmente en tu navegador (sustituye temporalmente `<ipaddr>` por tu IP real)
- Comprueba: ¿muestra el estado de tu router una IP pública? Una dirección que empiece por `10.x.x.x` o `100.x.x.x` significa CG-NAT

### "Mi IP empieza por 100." o "10."

Eso es **CG-NAT** — ver [Opción A (Cloudflare Tunnel)](#opción-a-cloudflare-tunnel-recomendado-para-uso-doméstico), esa es la única solución sin un servidor adicional.

### IPv6 en lugar de IPv4

Las conexiones de internet más nuevas (especialmente fibra) funcionan con **IPv6**. Funciona de la misma forma — tu router tiene una dirección IPv6 fija y no necesita DynDNS. En el registro DNS, usa el tipo **AAAA** (IPv6) en lugar de **A** (IPv4).

---

## Árbol de decisión

```
¿Estás detrás de CG-NAT?  (la IP empieza por 100. o tu router muestra una IP diferente de la de ipify.org)
  → SÍ:  Opción A (Cloudflare Tunnel)
  → NO:
      ¿Tienes un servidor en un centro de datos?
        → SÍ:  Opción C + D (VPS + registro DNS)
        → NO (red doméstica):  Opción B (DynDNS + router)
```

---

## Enlaces útiles

- [Documentación de Cloudflare Tunnel](https://developers.cloudflare.com/tunnel/)
- [DuckDNS](https://www.duckdns.org/)
- [Dynu DDNS](https://www.dynu.com/)
- [Tutorial de la comunidad netcup: nginx Reverse Proxy](https://community.netcup.com/en/tutorials/how-to-setup-nginx-reverse-proxy)
- [Hetzner DNS Console](https://dns.hetzner.com)
- [dnschecker.org — verificar propagación DNS](https://dnschecker.org)
- [ipify.org — comprueba tu IP pública](https://api4.my-ip.io/ip)

---

*→ Volver a [02-deployment.en.md](02-deployment.en.md) | [Todos los docs](README.en.md)*
