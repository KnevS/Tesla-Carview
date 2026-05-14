🌐 **Idioma:** [EN](Troubleshooting) · [DE](DE-Troubleshooting) · [FR](FR-Troubleshooting) · **ES** · [TR](TR-Troubleshooting) · [EL](EL-Troubleshooting)

---

# Solución de problemas

Soluciones a los problemas más comunes. Empieza por la causa más probable y ve bajando.

---

## 🚫 No se puede acceder a la app para nada

### Comprueba: ¿Está el servidor en funcionamiento?

```bash
# Verificar estado de los contenedores:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml ps

# Debe mostrar todos los contenedores como "Up":
# tesla-carview-backend    Up
# tesla-carview-frontend   Up
# tesla-carview-nginx      Up
```

Si algún contenedor muestra "Exit" o "Restarting":
```bash
# Ver logs del contenedor problemático:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs backend
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs nginx
```

Reiniciar todo:
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d
```

### Comprueba: ¿Se resuelve correctamente el dominio?

```bash
nslookup tesla.tudominio.com
# Debe mostrar la IP de tu servidor

# O desde tu navegador: visita https://dnschecker.org
```

Si el DNS no se resuelve → espera 10–30 minutos tras cambiar los registros DNS.

### Comprueba: ¿Está el firewall bloqueando el acceso?

```bash
ufw status
# Los puertos 80 y 443 deben mostrar ALLOW
```

Si faltan:
```bash
ufw allow 80/tcp
ufw allow 443/tcp
```

---

## 🔴 "502 Bad Gateway" o "503 Service Unavailable"

Esto significa que nginx está funcionando pero el backend no responde.

```bash
# Verificar el backend:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs backend --tail=50
```

Causa común: el backend se cayó por un error de inicio. A menudo una variable `.env` faltante o un problema de permisos de la base de datos.

Corregir permisos de la base de datos:
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml down
chown -R 1000:1000 /var/lib/docker/volumes/tesla_data/
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d
```

---

## 🔒 Errores SSL/HTTPS ("Certificado no válido", "NET::ERR_CERT_EXPIRED")

El certificado Let's Encrypt ha expirado o no se emitió correctamente.

```bash
# Verificar estado del certificado:
certbot certificates

# Renovar manualmente:
certbot renew --force-renewal
systemctl restart nginx
```

Si certbot no puede renovar (DNS no resuelve, puerto 80 bloqueado):
1. Comprueba que el puerto 80 está abierto en tu firewall Y en tu router (reenvío de puertos)
2. Comprueba que el DNS de tu dominio apunta a la IP de tu servidor

---

## 🚗 El vehículo no muestra datos / aparece "offline"

### API Tesla no conectada
→ Comprueba **Admin → Sistema → Salud del sistema** — la sección "Token Tesla" muestra el estado de la conexión.

Si ha expirado: **Admin → Sistema → Reconectar cuenta Tesla**

### El vehículo está durmiendo
Los Tesla se duermen tras 15–30 minutos de inactividad. La app espera a que el coche se despierte. Puedes despertarlo manualmente:
1. Abre la app oficial de Tesla en tu teléfono
2. Toca cualquier función (clima, bocina) para despertar el coche
3. Tesla Carview debería actualizarse en 60 segundos

### VIN XP7 (Model Y Juniper) — GPS sin actualizar
Algunos vehículos nuevos no devuelven datos GPS por el endpoint REST estándar. Esta es una limitación de Tesla. Fleet Telemetry proporciona datos GPS para esos vehículos — contacta [Tesla Fleet Telemetry Access](https://developer.tesla.com) si lo necesitas.

---

## 🔑 "La API Tesla devolvió 403 Forbidden"

¿Todas las llamadas a la API Tesla devuelven 403? Esto normalmente significa que tu **cuenta de desarrollador Tesla está suspendida o tiene un problema de facturación**.

1. Inicia sesión en [developer.tesla.com](https://developer.tesla.com)
2. Busca avisos de cuenta, notificaciones de facturación o mensajes de suspensión
3. Completa la información de facturación requerida (incluso para uso gratuito, puede requerirse tarjeta de crédito)
4. Tras resolver: **Admin → Sistema → Reconectar cuenta Tesla**

---

## 🔐 Problemas de inicio de sesión

### "Usuario o contraseña incorrectos" — pero estoy seguro de que son correctos

- Comprueba el bloqueo de mayúsculas
- Si cambiaste la contraseña recientemente, prueba la antigua (el navegador puede tener la antigua en caché)
- Los admins pueden restablecer contraseñas: **Admin → Usuarios → tu cuenta → Restablecer contraseña**

### "Cuenta bloqueada"

Tras 5 intentos fallidos de inicio de sesión, la cuenta se bloquea 15 minutos. Espera o pide a un admin que la desbloquee.

Los admins pueden desbloquear via:
```bash
# En el contenedor:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml exec backend node -e "
const db = require('./src/db/database.js');
db.getDb('YOUR-TENANT-ID').prepare('UPDATE users SET failed_login_attempts=0, locked_until=NULL WHERE username=?').run('USERNAME');
"
```

### Contraseña de admin olvidada

Si no puedes iniciar sesión como admin:
```bash
# Obtener un shell en el contenedor backend:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml exec backend sh

# Restablecer contraseña (reemplaza los valores):
node -e "
const bcrypt = require('bcrypt');
const { getDb } = require('./src/db/database.js');
const hash = bcrypt.hashSync('NewPassword123!', 12);
// Necesitas el ID del inquilino — encuéntralo en master.db:
// getDb se llama con el UUID del inquilino
"
```

O más simple: restaura desde un backup que hiciste cuando conocías la contraseña.

---

## 📱 Las notificaciones push no funcionan

### Escritorio
1. Comprueba los permisos de notificación del navegador: haz clic en el icono del candado en la barra de direcciones → Notificaciones → Permitir
2. Comprueba que la app usa HTTPS (necesario para push)
3. Prueba: Ajustes → Notificaciones push → Notificación de prueba

### iOS (iPhone/iPad)
Las notificaciones push en iOS solo funcionan desde el **acceso directo en pantalla de inicio** (PWA), no desde la pestaña del navegador.
1. Abre Tesla Carview en Safari
2. Toca Compartir → "Añadir a pantalla de inicio"
3. Abre desde el icono de la pantalla de inicio → las notificaciones ya funcionan

---

## 🐛 Los comandos no funcionan (clima, cerraduras, etc.)

Los comandos requieren que la Virtual Key esté emparejada:
1. Comprueba: **Ajustes → Virtual Key** — el estado debe mostrar "Emparejada"
2. Si no está emparejada: abre la URL de emparejamiento en el **navegador del Tesla** (no tu teléfono)
3. Confirma en la app Tesla en tu teléfono

También comprueba: **Admin → Sistema → Estado de la Virtual Key**

---

## 🗄️ Errores de base de datos ("disk I/O error", "database is locked")

Generalmente causado por una tarjeta SD fallida en Raspberry Pi. Comprueba:

```bash
# Verificar errores del sistema de archivos:
dmesg | grep -i "error\|fail\|corrupt"

# Verificar salud de la tarjeta SD:
df -h
```

Si ves errores de I/O → tu tarjeta SD está fallando. **Haz un backup inmediatamente** y cambia a SSD USB: [→ Almacenamiento Raspberry Pi](ES-Raspberry-Pi-Storage)

---

## 📋 Ver logs

```bash
# Logs de la aplicación backend:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs backend --tail=100 -f

# Log de acceso nginx:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs nginx --tail=50

# Journal del sistema (fail2ban, etc.):
journalctl -u fail2ban --since "1 hour ago"

# Bans de fail2ban:
fail2ban-client status sshd
```

---

## ¿Sigues atascado?

1. Comprueba los [Issues de GitHub](https://github.com/KnevS/Tesla-Carview/issues) — alguien puede haber tenido el mismo problema
2. Abre un nuevo issue con:
   - Qué probaste
   - Qué ocurrió (mensajes de error, capturas de pantalla)
   - Tu configuración (modelo Pi, proveedor VPS, versión del SO)
   - Salida de log relevante (oculta contraseñas o secretos)
