🌐 **Idioma:** [EN](Security) · [DE](DE-Security) · [FR](FR-Security) · **ES** · [TR](TR-Security) · [EL](EL-Security)

---

# Seguridad — Autenticación, MFA y buenas prácticas

Tesla Carview maneja datos sensibles: ubicación del vehículo, historial de carga y comandos de control de tu coche. Esta página explica cómo está protegido y qué **debes hacer tú** para mantener tu instalación segura.

---

## Opciones de inicio de sesión

### 1. Usuario + Contraseña (estándar)
- La contraseña se hashea con bcrypt (factor de coste 12)
- Los intentos fallidos están limitados: tras 5 intentos, la cuenta se bloquea 15 minutos
- Todos los eventos de inicio de sesión se registran en el log de auditoría

**Buenas prácticas con contraseñas:**
- Usa una frase de contraseña: `Sol-Montaña-Coche-Café` (4+ palabras, fácil de recordar, difícil de crackear)
- Mínimo 12 caracteres — cuanto más larga, mejor
- No reutilices contraseñas de otros servicios
- Usa un gestor de contraseñas (Bitwarden, 1Password, KeePass)

### 2. Passkeys (sin contraseña, recomendado)
Las passkeys usan la biometría de tu dispositivo (huella digital, Face ID) en lugar de una contraseña. Son resistentes al phishing y mucho más seguras.

Configuración:
1. **Ajustes → Seguridad → Añadir Passkey**
2. Tu navegador abre un prompt biométrico — confirma con tu huella o cara
3. Listo — ahora puedes iniciar sesión solo con tu biometría

Las passkeys funcionan en:
- Mac (Touch ID)
- iPhone/iPad (Face ID / Touch ID)
- Android (huella digital)
- Windows (Windows Hello)
- Llaves de hardware (YubiKey)

> ⚠️ El navegador del coche Tesla no soporta passkeys. Usa usuario + contraseña con "Mantener sesión" en el coche.

### 3. MFA / Autenticación en dos pasos (TOTP)
Añade una capa extra con una app de autenticación:
1. **Ajustes → Seguridad → Activar MFA**
2. Escanea el código QR con Google Authenticator, Authy, Bitwarden o similar
3. Introduce el código de 6 dígitos para confirmar

Tras la configuración: cada inicio de sesión requiere tu contraseña + el código de 6 dígitos.

**Los admins pueden exigir MFA para todos los usuarios:**
```env
# .env — obliga el MFA para todos los nuevos usuarios:
MFA_REQUIRED_FOR_NEW_USERS=true
```

---

## Seguridad de sesiones

| Ajuste | Valor |
|---|---|
| Tiempo de vida del token de acceso | 15 minutos (de corta duración) |
| Token de actualización — estándar | 7 días |
| Token de actualización — "Mantener sesión" | 90 días |
| Almacenamiento del token de actualización | Cookie `httpOnly`, `Secure`, `SameSite=Lax` |
| Rotación de tokens | Nuevo token de actualización en cada uso |

Los tokens se almacenan como hashes SHA-256 — el texto claro nunca toca la base de datos.

---

## Buenas prácticas de seguridad para tu servidor

Más allá de la seguridad integrada de Tesla Carview, tu servidor también necesita protección.

### 🔒 Hardening de SSH

**Desactiva la autenticación por contraseña — usa solo claves:**

```bash
# Genera un par de claves en tu ordenador LOCAL:
ssh-keygen -t ed25519 -C "tesla-server"

# Copia la clave pública al servidor:
ssh-copy-id -i ~/.ssh/id_ed25519.pub root@TU-IP-SERVIDOR

# En el servidor, desactiva la auth por contraseña:
nano /etc/ssh/sshd_config
```
Cambia estas líneas:
```
PasswordAuthentication no
PermitRootLogin prohibit-password
PubkeyAuthentication yes
```
```bash
systemctl restart sshd
```

> ⚠️ Comprueba que el inicio de sesión por clave funciona **antes** de cerrar tu sesión SSH actual.

**Cambiar el puerto SSH por defecto (opcional, reduce el ruido en los logs):**
```bash
# En /etc/ssh/sshd_config:
Port 2222    # Cualquier puerto no estándar

# Actualizar el firewall:
ufw allow 2222/tcp
ufw delete allow 22/tcp
systemctl restart sshd
```

### 🔥 Firewall (UFW)

El script de instalación configura UFW automáticamente. Verifica que está correcto:

```bash
ufw status verbose
```

Debe mostrar:
```
Status: active
To                         Action      From
--                         ------      ----
22/tcp (o tu puerto SSH)   ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
```

Bloquea todo lo demás — ningún otro puerto debe estar expuesto públicamente.

### 🛡️ Fail2ban (protección contra ataques de fuerza bruta)

Fail2ban banea automáticamente las IPs que fallan repetidamente el inicio de sesión SSH o web. El script de instalación lo instala y configura.

Verificar estado:
```bash
fail2ban-client status
fail2ban-client status sshd
fail2ban-client status nginx-http-auth
```

Desbanear una IP (si te bloqueaste a ti mismo):
```bash
fail2ban-client set sshd unbanip TU-IP
```

### 🔄 Mantén todo actualizado

**Actualizaciones automáticas del SO:**
```bash
apt install unattended-upgrades -y
dpkg-reconfigure unattended-upgrades  # Selecciona sí
```

**Actualizaciones automáticas de Tesla Carview:**
```env
# En /opt/tesla-carview/backend/.env:
AUTO_UPDATE_ENABLED=true
```

Las actualizaciones se ejecutan cada noche a las 03:30 (Europe/Berlin) si están activadas.

**Actualizaciones de imágenes Docker:**
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml pull
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d
```

### 🌐 HTTPS y renovación de certificados

Los certificados de Let's Encrypt expiran cada 90 días y se renuevan automáticamente via un cron job (configurado por el script de instalación).

Verificar estado del certificado:
```bash
certbot certificates
```

Probar renovación (simulación, sin cambios):
```bash
certbot renew --dry-run
```

Forzar renovación si es necesario:
```bash
certbot renew --force-renewal
systemctl restart nginx
```

### 🔑 Protege tu archivo `.env`

Tu archivo `.env` contiene el Client ID de Tesla, el Client Secret y el secreto JWT. Nunca debe:
- Subirse a git (está en `.gitignore` — no lo anules)
- Hacerse accesible públicamente
- Compartirse en capturas de pantalla o solicitudes de soporte

```bash
# Verificar permisos — debe ser 600 (lectura/escritura solo del propietario):
ls -la /opt/tesla-carview/backend/.env

# Corregir si es incorrecto:
chmod 600 /opt/tesla-carview/backend/.env
```

### 📝 Log de auditoría

Tesla Carview registra todas las acciones sensibles:
- Intentos de inicio de sesión (éxito y fallo)
- Bloqueos de cuenta
- Cambios de contraseña
- Ejecuciones de comandos de vehículo
- Eliminaciones de datos
- Acciones de admin

Ver en: **Admin → Log de auditoría**

Exportar para análisis: **Admin → Log de auditoría → Exportar CSV**

---

## Cabeceras de seguridad

La configuración nginx de Tesla Carview incluye cabeceras de seguridad modernas:
- `Content-Security-Policy` (CSP) — previene XSS
- `Strict-Transport-Security` (HSTS) — fuerza HTTPS
- `X-Frame-Options: DENY` — previene clickjacking
- `X-Content-Type-Options: nosniff`
- `Permissions-Policy` — restringe funciones del navegador

Comprueba tus cabeceras: [securityheaders.com](https://securityheaders.com)

---

## Reportar una vulnerabilidad de seguridad

¿Has encontrado un problema de seguridad? Por favor repórtalo de forma responsable:
- **No** abras un issue público en GitHub
- Email: ver el archivo [SECURITY.md](https://github.com/KnevS/Tesla-Carview/blob/main/SECURITY.md) en el repositorio
- Nos comprometemos a responder en 48 horas

---

## Lista de verificación de seguridad para nuevas instalaciones

- [ ] Autenticación SSH por clave activada, auth por contraseña desactivada
- [ ] Firewall activo (UFW), solo puertos 22/80/443 abiertos
- [ ] Fail2ban en funcionamiento
- [ ] Contraseña admin fuerte (16+ caracteres o frase de contraseña)
- [ ] MFA activado para la cuenta admin
- [ ] Permisos del archivo `.env` establecidos en 600
- [ ] Actualizaciones automáticas activadas (SO + Tesla Carview)
- [ ] Copias de seguridad regulares configuradas (ver [Backup y restauración](ES-Backup-and-Restore))
- [ ] Log de auditoría revisado periódicamente
