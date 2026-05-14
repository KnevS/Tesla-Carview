🌐 **Language / Sprache / Langue / Idioma / Dil / Γλώσσα**

| | |
|---|---|
| 🇬🇧 **[English](Network-Access)** | English version |
| 🇩🇪 **[Deutsch](DE-Network-Access)** | Deutsche Version |
| 🇫🇷 **[Français](FR-Network-Access)** | Version française |
| 🇪🇸 **[Español](ES-Network-Access)** | Estás aquí |
| 🇹🇷 **[Türkçe](TR-Network-Access)** | Türkçe sürüm |
| 🇬🇷 **[Ελληνικά](EL-Network-Access)** | Ελληνική έκδοση |

---

# Acceso a la red — Sin IP estática

Tesla Carview se ejecuta en su propio servidor — pero para que sea accesible desde internet (incluyendo desde su Tesla), necesita una dirección pública estable. Esta página le guía a través de cada opción, paso a paso.

> **¿No es experto en TI?** Siga esta página de arriba a abajo. Cada opción incluye instrucciones precisas sin conocimientos previos asumidos.

---

## ¿Cuál opción es adecuada para mí?

| Su situación | Mejor opción |
|---|---|
| Internet doméstico (IP cambia a diario) | [Opción A: Cloudflare Tunnel](#opcion-a-cloudflare-tunnel-recomendado) u [Opción B: DynDNS + Router](#opcion-b-dyndns--router-domestico) |
| Cable / fibra — **no puede abrir puertos** (CG-NAT) | [Opción A: Cloudflare Tunnel](#opcion-a-cloudflare-tunnel-recomendado) |
| VPS / servidor en un proveedor de hosting | [Opción C: VPS con IP estática](#opcion-c-vps-en-un-proveedor-de-hosting) |
| Tiene un dominio propio | [Opción D: Dominio propio + registro DNS](#opcion-d-dominio-propio-con-registro-dns) |

---

## El problema con el internet doméstico

Su conexión a internet doméstica obtiene una **nueva dirección IP cada día** (o con más frecuencia). Esto significa que la dirección que ingresa hoy es incorrecta mañana.

**El DNS dinámico** resuelve esto:
- Reserva un nombre de host fijo (p. ej. `mi-tesla.duckdns.org`)
- Un pequeño programa en su router o servidor informa automáticamente cada nueva IP
- Su nombre de host siempre apunta a la IP actual — sin actualizaciones manuales

---

## ¿Está detrás de CG-NAT?

Muchos proveedores de cable (Vodafone, Virgin Media y otros) ya no dan a cada cliente su propia IPv4 pública. Varios clientes comparten una IP — esto es **NAT a nivel de operador (CG-NAT)**.

**Cómo comprobarlo:**
1. Visite [https://api4.my-ip.io/ip](https://api4.my-ip.io/ip) — anote la IP mostrada
2. Abra la página de estado de su router — anote la IP WAN
3. Si las dos IPs son **diferentes** → está detrás de CG-NAT

Con CG-NAT, el reenvío de puertos **no funciona**. Use la Opción A (Cloudflare Tunnel) — no necesita puertos abiertos.

---

## Opción A: Cloudflare Tunnel (Recomendado)

Cloudflare Tunnel crea una conexión saliente cifrada desde su servidor a la red global de Cloudflare. No se necesita reenvío de puertos. Gratuito. Funciona detrás de CG-NAT.

**Requisitos:** Un dominio, o un subdominio gratuito (instrucciones a continuación).

### Paso 1: Obtener un dominio gratuito (si no tiene uno)

Vaya a [duckdns.org](https://www.duckdns.org), inicie sesión con Google o GitHub, elija un nombre → obtiene p. ej. `mi-tesla.duckdns.org` de forma gratuita.

O compre un dominio barato (~$1/año) en [Porkbun](https://www.porkbun.com), [Namecheap](https://www.namecheap.com) o [inwx.de](https://www.inwx.de).

### Paso 2: Añadir su dominio a Cloudflare

1. Regístrese en [dash.cloudflare.com](https://dash.cloudflare.com) — gratuito
2. Haga clic en **"Add a Site"** → ingrese su dominio → **Plan gratuito**
3. Cloudflare le muestra dos direcciones de servidor de nombres, p. ej.:
   ```
   alice.ns.cloudflare.com
   bob.ns.cloudflare.com
   ```
4. Vaya a su registrador de dominio e ingrese estos como servidores de nombres
5. Espere de 10 a 30 minutos → Cloudflare confirma "Nameservers updated"

### Paso 3: Instalar y configurar `cloudflared`

En su servidor (mediante SSH):

```bash
# Descargar e instalar
curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb \
  -o /tmp/cloudflared.deb
dpkg -i /tmp/cloudflared.deb

# Iniciar sesión (se muestra un enlace del navegador — ábralo)
cloudflared tunnel login

# Crear túnel
cloudflared tunnel create tesla-carview
# ¡Anote el ID del túnel mostrado!
```

Crear archivo de configuración:

```bash
mkdir -p /etc/cloudflared
nano /etc/cloudflared/config.yml
```

Contenido (reemplace `YOUR_TUNNEL_ID` y `yourdomain.com`):

```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: /root/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: tesla.yourdomain.com
    service: http://localhost:80
  - service: http_status:404
```

Crear entrada DNS automáticamente:

```bash
cloudflared tunnel route dns tesla-carview tesla.yourdomain.com
```

### Paso 4: Instalar como servicio del sistema

```bash
cloudflared service install
systemctl enable cloudflared
systemctl start cloudflared
```

**Listo.** Tesla Carview es ahora accesible en `https://tesla.yourdomain.com` — con HTTPS automático, sin puertos abiertos, sin IP estática necesaria.

---

## Opción B: DynDNS + Router doméstico

> **Importante:** Solo funciona si tiene una dirección IPv4 pública real. [Compruebe primero si tiene CG-NAT](#esta-detras-de-cg-nat).

### Paso 1: Registrarse en un servicio DynDNS

**Dynu** (gratuito, sin confirmación mensual requerida):
1. Vaya a [dynu.com](https://www.dynu.com) → crear cuenta → DDNS → Añadir
2. Ingrese un nombre, p. ej. `mi-tesla` → obtiene `mi-tesla.freeddns.org`
3. Anote su nombre de host, nombre de usuario y contraseña (Panel de control → Credenciales de API)

**DuckDNS** (aún más sencillo):
1. [duckdns.org](https://www.duckdns.org) → iniciar sesión → elegir subdominio → anote su token

### Paso 2: Configurar su router

**FritzBox:**
1. Abra [http://fritz.box](http://fritz.box) → **Internet → Compartir → DynDNS**
2. Marque **"Usar DynDNS"** y complete:

   | Campo | Dynu | DuckDNS |
   |---|---|---|
   | Proveedor | Definido por usuario | Definido por usuario |
   | URL de actualización | `https://api.dynu.com/nic/update?hostname=<domain>&myip=<ipaddr>` | `https://www.duckdns.org/update?domains=YOURNAME&token=YOURTOKEN&ip=<ipaddr>` |
   | Dominio | `mi-tesla.freeddns.org` | `mi-tesla.duckdns.org` |
   | Nombre de usuario | Nombre de usuario de Dynu | — |
   | Contraseña | Contraseña de Dynu | — |

3. Haga clic en **Aplicar** → marca de verificación verde = funcionando

**Otros routers:** Busque "Dynamic DNS" o "DDNS" en los ajustes de internet/WAN.

### Paso 3: Reenvío de puertos

Para que el tráfico entrante llegue a su servidor:

**FritzBox:** Internet → Compartir → Compartición de puertos → Nueva compartición de puertos → Otra aplicación

| Campo | Valor |
|---|---|
| Nombre | Tesla Carview |
| Protocolo | TCP |
| Puerto externo | 443 |
| Al dispositivo | La IP local de su servidor (p. ej. `192.168.1.100`) |
| Puerto interno | 443 |

> **Consejo:** Asigne a su servidor una IP local fija. En FritzBox: Red doméstica → Red → su dispositivo → Asignar siempre esta IP.

### Paso 4: Certificado SSL y configuración de Tesla Carview

```bash
# Establezca FRONTEND_URL en /opt/tesla-carview/backend/.env:
FRONTEND_URL=https://mi-tesla.freeddns.org

# Obtener certificado SSL:
certbot --nginx -d mi-tesla.freeddns.org
```

---

## Opción C: VPS en un proveedor de hosting

Un VPS (Servidor Privado Virtual) es un pequeño servidor Linux arrendado con una **IP pública fija y permanente**. Sin DynDNS, sin reenvío de puertos necesario.

**Comparación de precios (2025):**

| Proveedor | Producto | Precio/mes |
|---|---|---|
| [Hetzner](https://www.hetzner.com) | CX22 | ~€4.35 |
| [netcup](https://www.netcup.eu) | VPS 1000 G11 | ~€4.44 |
| [Contabo](https://contabo.com) | VPS S | ~€5.99 |

**Configuración (ejemplo: Hetzner):**
1. Registrarse → crear servidor → elegir Ubuntu 24.04 → anotar la IP pública
2. Conectarse por SSH: `ssh root@YOUR-SERVER-IP`
3. Ejecutar el script de instalación:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
   ```

El script solicita su nombre de dominio y configura nginx + Let's Encrypt automáticamente.

Luego apunte un dominio a él → [Opción D](#opcion-d-dominio-propio-con-registro-dns)

---

## Opción D: Dominio propio con registro DNS

Si tiene su propio dominio y un servidor con IP fija, cree un **registro A**:

**¿Qué es un registro A?** Es una entrada de directorio telefónico: `tesla.yourdomain.com → 123.456.789.0`

**En Cloudflare DNS:**
DNS → Añadir registro → Tipo: A, Nombre: `tesla`, IPv4: la IP de su servidor → Guardar

**En Namecheap:**
Lista de dominios → Administrar → DNS avanzado → Añadir nuevo registro → Registro A, Host: `tesla`, Valor: su IP

**En IONOS:**
Dominios → su dominio → DNS → Añadir registro → A, Nombre de host: `tesla`, Destino: su IP

**En Hetzner DNS ([dns.hetzner.com](https://dns.hetzner.com)):**
Seleccionar zona → Registros → Añadir registro → A, Nombre: `tesla`, Valor: su IP

> **TTL:** Establezca 300 (5 minutos) inicialmente — facilita la corrección de errores. Auméntelo a 3600 más adelante.

### Verificar la propagación

```bash
nslookup tesla.yourdomain.com
# o en línea: https://dnschecker.org
```

### IP dinámica con su propio dominio

Si tiene dominio pero no IP fija:

**CNAME → DuckDNS** (el router mantiene DuckDNS actualizado):
```
tesla.yourdomain.com  →  CNAME  →  mi-tesla.duckdns.org
```

---

## Árbol de decisión

```
¿Es diferente la IP de su router a lo que muestra https://api4.my-ip.io/ip?
  SÍ (CG-NAT) → Opción A: Cloudflare Tunnel
  NO:
    ¿Tiene un servidor en un centro de datos?
      SÍ → Opción C + D (VPS + registro DNS)
      NO (red doméstica):
        ¿Tiene su propio dominio?
          SÍ → Opción B (DynDNS) + Opción D (registro DNS)
          NO  → Opción B con subdominio gratuito (DuckDNS/Dynu)
```

---

## Problemas habituales

### "El sitio no es accesible" justo después de la instalación

El DNS tarda de 5 a 30 minutos en propagarse. Pruebe primero localmente:
```bash
curl -I http://localhost
```

### "Certificado inválido" / errores HTTPS

```bash
certbot renew --force-renewal
systemctl restart nginx
```

### La URL de actualización DynDNS del router no funciona

Su router reemplaza `<ipaddr>` automáticamente — no lo complete manualmente. Pruebe la URL en un navegador reemplazando `<ipaddr>` con su IP pública actual.

### "Mi IP WAN empieza por 100. o 10."

Eso es CG-NAT → use [Opción A (Cloudflare Tunnel)](#opcion-a-cloudflare-tunnel-recomendado).

### IPv6 / sin IPv4

Las conexiones de fibra más nuevas usan IPv6. Funciona igual — use un registro **AAAA** en lugar de **A** en DNS. Su router mantiene un prefijo IPv6 fijo (no se necesita DynDNS para IPv6 en la mayoría de conexiones).

---

## Enlaces útiles

- [Documentación de Cloudflare Tunnel](https://developers.cloudflare.com/tunnel/)
- [DuckDNS](https://www.duckdns.org/) — DNS dinámico gratuito
- [Dynu DDNS](https://www.dynu.com/) — gratuito, sin confirmación mensual
- [dnschecker.org](https://dnschecker.org) — verificar la propagación DNS en todo el mundo
- [api4.my-ip.io/ip](https://api4.my-ip.io/ip) — comprobar su IP pública

---

*→ [[Installation]] | [[Raspberry-Pi-Storage]] | [[Home]]*
