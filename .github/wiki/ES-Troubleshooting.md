🌐 **Language / Sprache / Langue / Idioma / Dil / Γλώσσα**

| | |
|---|---|
| 🇬🇧 **[English](Troubleshooting)** | English version |
| 🇩🇪 **[Deutsch](DE-Troubleshooting)** | Deutsche Version |
| 🇫🇷 **[Français](FR-Troubleshooting)** | Version française |
| 🇪🇸 **[Español](ES-Troubleshooting)** | Estás aquí |
| 🇹🇷 **[Türkçe](TR-Troubleshooting)** | Türkçe sürüm |
| 🇬🇷 **[Ελληνικά](EL-Troubleshooting)** | Ελληνική έκδοση |

---

# Solución de problemas

Soluciones a los problemas más habituales. Comience por la causa más probable y vaya avanzando.

---

## 🚫 No se puede acceder a la aplicación en absoluto

### Comprobación: ¿El servidor está funcionando?

```bash
# Verificar el estado de los contenedores:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml ps

# Debería mostrar todos los contenedores como "Up":
# tesla-carview-backend    Up
# tesla-carview-frontend   Up
# tesla-carview-nginx      Up
```

Si algún contenedor muestra "Exit" o "Restarting":
```bash
# Ver registros del contenedor con problemas:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs backend
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs nginx
```

Reiniciar todo:
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d
```

### Comprobación: ¿El dominio se resuelve correctamente?

```bash
nslookup tesla.yourdomain.com
# Debería mostrar la dirección IP de su servidor

# O desde su navegador: visite https://dnschecker.org
```

Si el DNS no se resuelve → espere de 10 a 30 minutos después de cambiar los registros DNS.

### Comprobación: ¿El firewall está bloqueando el acceso?

```bash
ufw status
# Los puertos 80 y 443 deben mostrar ALLOW
```

Si no aparecen:
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

Causa habitual: el backend se bloqueó debido a un error de inicio. A menudo es una variable `.env` faltante o un problema de permisos de la base de datos.

Corregir permisos de la base de datos:
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml down
chown -R 1000:1000 /var/lib/docker/volumes/tesla_data/
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d
```

---

## 🔒 Errores SSL/HTTPS ("Certificate not valid", "NET::ERR_CERT_EXPIRED")

El certificado de Let's Encrypt ha caducado o no se emitió correctamente.

```bash
# Verificar el estado del certificado:
certbot certificates

# Renovar manualmente:
certbot renew --force-renewal
systemctl restart nginx
```

Si certbot no puede renovar (DNS no se resuelve, puerto 80 bloqueado):
1. Compruebe que el puerto 80 esté abierto en su firewall Y en su router (reenvío de puertos)
2. Compruebe que el DNS de su dominio apunte a la IP de su servidor

---

## 🚗 El vehículo no muestra datos / aparece como "offline"

### API de Tesla no conectada
→ Compruebe **Admin → Sistema → Estado del sistema** — la sección "Token de Tesla" muestra el estado de la conexión.

Si ha expirado: **Admin → Sistema → Reconectar cuenta de Tesla**

### El vehículo está en reposo
Los vehículos Tesla entran en reposo después de 15–30 minutos de inactividad. La aplicación espera a que el automóvil se despierte. Puede despertarlo manualmente:
1. Abra la aplicación oficial de Tesla en su teléfono
2. Toque cualquier función (climatización, bocina) para despertar el automóvil
3. Tesla Carview debería actualizarse en 60 segundos

### VIN XP7 (Model Y Juniper) — el GPS no se actualiza
Algunos vehículos más nuevos no devuelven datos GPS a través de la API REST estándar. Esta es una limitación de Tesla. Fleet Telemetry proporciona datos GPS para esos vehículos — contacte [Tesla Fleet Telemetry Access](https://developer.tesla.com) si necesita esto.

---

## 🔑 "Tesla API returned 403 Forbidden"

¿Todas las llamadas a la API de Tesla devuelven 403? Esto generalmente significa que **su cuenta de Tesla Developer está suspendida o tiene un problema de facturación**.

1. Inicie sesión en [developer.tesla.com](https://developer.tesla.com)
2. Compruebe si hay advertencias de cuenta, avisos de facturación o mensajes de suspensión
3. Complete cualquier información de facturación requerida (incluso para uso gratuito, es posible que se requiera tarjeta de crédito)
4. Después de resolver: **Admin → Sistema → Reconectar cuenta de Tesla**

---

## 🔐 Problemas de inicio de sesión

### "Usuario o contraseña inválidos" — pero estoy seguro de que es correcto

- Verifique que Bloq Mayús no esté activado
- Si cambió recientemente la contraseña, pruebe la anterior (el navegador puede haber guardado la antigua)
- Los administradores pueden restablecer contraseñas de usuario: **Admin → Usuarios → su cuenta → Restablecer contraseña**

### "Cuenta bloqueada"

Después de 5 intentos fallidos de inicio de sesión, la cuenta queda bloqueada durante 15 minutos. Espere o pida a un administrador que la desbloquee.

Los administradores pueden desbloquear mediante:
```bash
# En el contenedor:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml exec backend node -e "
const db = require('./src/db/database.js');
db.getDb('YOUR-TENANT-ID').prepare('UPDATE users SET failed_login_attempts=0, locked_until=NULL WHERE username=?').run('USERNAME');
"
```

### Contraseña de administrador olvidada

Si no puede iniciar sesión como administrador:
```bash
# Obtener un shell en el contenedor del backend:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml exec backend sh

# Restablecer contraseña (reemplace los valores):
node -e "
const bcrypt = require('bcrypt');
const { getDb } = require('./src/db/database.js');
const hash = bcrypt.hashSync('NewPassword123!', 12);
// Necesita el ID del tenant — encuéntrelo en master.db:
// getDb se llama con el UUID del tenant
"
```

O más sencillo: restaure desde una copia de seguridad que realizó cuando conocía la contraseña.

---

## 📱 Las notificaciones push no funcionan

### Escritorio
1. Compruebe los permisos de notificación del navegador: haga clic en el icono de candado en la barra de direcciones → Notificaciones → Permitir
2. Compruebe que la aplicación usa HTTPS (requerido para push)
3. Pruebe: Ajustes → Notificaciones push → Notificación de prueba

### iOS (iPhone/iPad)
Las notificaciones push en iOS solo funcionan desde el **acceso directo en la pantalla de inicio** (PWA), no desde la pestaña del navegador.
1. Abra Tesla Carview en Safari
2. Toque Compartir → "Añadir a pantalla de inicio"
3. Ábralo desde el icono de la pantalla de inicio → las notificaciones ahora funcionan

---

## 🐛 Los comandos no funcionan (climatización, cerraduras, etc.)

Los comandos requieren que la Clave Virtual esté emparejada:
1. Compruebe: **Ajustes → Clave Virtual** — el estado debe mostrar "Emparejada"
2. Si no está emparejada: abra la URL de emparejamiento en el **navegador del automóvil Tesla** (no en su teléfono)
3. Confirme en la aplicación de Tesla en su teléfono

También compruebe: **Admin → Sistema → Estado de la Clave Virtual**

---

## 🗄️ Errores de base de datos ("disk I/O error", "database is locked")

Generalmente causados por una tarjeta SD defectuosa en Raspberry Pi. Compruebe:

```bash
# Verificar el sistema de archivos en busca de errores:
dmesg | grep -i "error\|fail\|corrupt"

# Verificar el estado de la tarjeta SD:
df -h
```

Si ve errores de E/S → su tarjeta SD está fallando. **Realice una copia de seguridad inmediatamente** y cambie a SSD USB: [→ Almacenamiento en Raspberry Pi](Raspberry-Pi-Storage)

---

## 📋 Ver registros

```bash
# Registros de la aplicación del backend:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs backend --tail=100 -f

# Registro de acceso de nginx:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs nginx --tail=50

# Diario del sistema (fail2ban, etc.):
journalctl -u fail2ban --since "1 hour ago"

# Bloqueos de fail2ban:
fail2ban-client status sshd
```

---

## ¿Sigue sin resolverse?

1. Consulte los [Issues de GitHub](https://github.com/KnevS/Tesla-Carview/issues) — alguien puede haber tenido el mismo problema
2. Abra un nuevo issue con:
   - Lo que intentó
   - Lo que ocurrió (mensajes de error, capturas de pantalla)
   - Su configuración (modelo de Pi, proveedor de VPS, versión del SO)
   - Salida de registros relevante (redacte cualquier contraseña o secreto)
