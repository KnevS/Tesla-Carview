🌐 **Language / Sprache / Langue / Idioma / Dil / Γλώσσα**

| | |
|---|---|
| 🇬🇧 **[English](Security)** | English version |
| 🇩🇪 **[Deutsch](DE-Security)** | Deutsche Version |
| 🇫🇷 **[Français](FR-Security)** | Version française |
| 🇪🇸 **[Español](ES-Security)** | Estás aquí |
| 🇹🇷 **[Türkçe](TR-Security)** | Türkçe sürüm |
| 🇬🇷 **[Ελληνικά](EL-Security)** | Ελληνική έκδοση |

---

# Seguridad — Autenticación, MFA y buenas prácticas de TI

Tesla Carview maneja datos sensibles: la ubicación del vehículo, el historial de carga y los comandos de control de su automóvil. Esta página explica cómo está protegido y qué **usted** debe hacer para mantener su instalación segura.

---

## Opciones de inicio de sesión

### 1. Nombre de usuario + contraseña (estándar)
- La contraseña se cifra con bcrypt (factor de coste 12)
- Los intentos fallidos de inicio de sesión tienen límite de velocidad: tras 5 intentos fallidos, la cuenta queda bloqueada durante 15 minutos
- Todos los eventos de inicio de sesión se registran en el registro de auditoría

**Buenas prácticas de contraseñas:**
- Use una frase de contraseña: `Sol-Montaña-Coche-Café` (4+ palabras, fácil de recordar, difícil de descifrar)
- Mínimo 12 caracteres — cuanto más larga, mejor
- No reutilice contraseñas de otros servicios
- Use un gestor de contraseñas (Bitwarden, 1Password, KeePass)

### 2. Passkeys (sin contraseña, recomendado)
Las passkeys usan la biometría de su dispositivo (huella dactilar, Face ID) en lugar de una contraseña. Son resistentes al phishing y mucho más seguras.

Configuración:
1. **Ajustes → Seguridad → Añadir passkey**
2. Su navegador abre una solicitud biométrica — confirme con su huella o rostro
3. Listo — ahora puede iniciar sesión solo con su biometría

Las passkeys funcionan en:
- Mac (Touch ID)
- iPhone/iPad (Face ID / Touch ID)
- Android (huella dactilar)
- Windows (Windows Hello)
- Llaves de hardware (YubiKey)

> ⚠️ El navegador del automóvil Tesla no admite passkeys. Use nombre de usuario + contraseña con "Mantener sesión iniciada" en el automóvil.

### 3. MFA / Autenticación de dos factores (TOTP)
Añada una capa adicional con una aplicación de autenticación:
1. **Ajustes → Seguridad → Activar MFA**
2. Escanee el código QR con Google Authenticator, Authy, Bitwarden o similar
3. Ingrese el código de 6 dígitos para confirmar

Después de la configuración: cada inicio de sesión requiere su contraseña + el código de 6 dígitos.

**Los administradores pueden exigir MFA para todos los usuarios:**
```env
# .env — obliga el MFA para todos los usuarios nuevos:
MFA_REQUIRED_FOR_NEW_USERS=true
```

---

## Seguridad de sesiones

| Ajuste | Valor |
|---|---|
| Duración del token de acceso | 15 minutos (de corta duración) |
| Token de actualización — estándar | 7 días |
| Token de actualización — "Mantener sesión iniciada" | 90 días |
| Almacenamiento del token de actualización | Cookie `httpOnly`, `Secure`, `SameSite=Lax` |
| Rotación de tokens | Nuevo token de actualización en cada uso |

Los tokens se almacenan como hashes SHA-256 — el texto en claro nunca toca la base de datos.

---

## Buenas prácticas de seguridad TI para su servidor

Más allá de la seguridad integrada de Tesla Carview, su servidor también necesita protección.

### 🔒 Refuerzo de SSH

**Desactive la autenticación por contraseña — use solo claves:**

```bash
# Genere un par de claves en su computadora LOCAL:
ssh-keygen -t ed25519 -C "tesla-server"

# Copie la clave pública al servidor:
ssh-copy-id -i ~/.ssh/id_ed25519.pub root@YOUR-SERVER-IP

# En el servidor, desactive la autenticación por contraseña:
nano /etc/ssh/sshd_config
```
Cambie estas líneas:
```
PasswordAuthentication no
PermitRootLogin prohibit-password
PubkeyAuthentication yes
```
```bash
systemctl restart sshd
```

> ⚠️ Compruebe que el inicio de sesión por clave funciona **antes** de cerrar su sesión SSH actual.

**Cambie el puerto SSH predeterminado (opcional, reduce el ruido en los registros):**
```bash
# En /etc/ssh/sshd_config:
Port 2222    # Cualquier puerto no estándar

# Actualice el firewall:
ufw allow 2222/tcp
ufw delete allow 22/tcp
systemctl restart sshd
```

### 🔥 Firewall (UFW)

El script de instalación configura UFW automáticamente. Verifique que sea correcto:

```bash
ufw status verbose
```

Debería mostrar:
```
Status: active
To                         Action      From
--                         ------      ----
22/tcp (o su puerto SSH)   ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
```

Bloquee todo lo demás — ningún otro puerto debería estar expuesto públicamente.

### 🛡️ Fail2ban (protección contra fuerza bruta)

Fail2ban bloquea automáticamente las IPs que fallan repetidamente en los intentos de inicio de sesión SSH o web. El script de instalación lo instala y configura.

Verificar estado:
```bash
fail2ban-client status
fail2ban-client status sshd
fail2ban-client status nginx-http-auth
```

Desbloquear una IP (si se ha bloqueado a sí mismo):
```bash
fail2ban-client set sshd unbanip YOUR-IP
```

### 🔄 Mantener todo actualizado

**Actualizaciones automáticas del sistema operativo:**
```bash
apt install unattended-upgrades -y
dpkg-reconfigure unattended-upgrades  # Seleccione sí
```

**Actualizaciones automáticas de Tesla Carview:**
```env
# En /opt/tesla-carview/backend/.env:
AUTO_UPDATE_ENABLED=true
```

Las actualizaciones se ejecutan todas las noches a las 03:30 (Europe/Berlin) si están activadas.

**Actualizaciones de imágenes Docker:**
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml pull
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d
```

### 🌐 HTTPS y renovación de certificados

Los certificados de Let's Encrypt caducan cada 90 días y se renuevan automáticamente mediante un trabajo cron (configurado por el script de instalación).

Verificar el estado del certificado:
```bash
certbot certificates
```

Probar la renovación (simulacro, sin cambios):
```bash
certbot renew --dry-run
```

Forzar la renovación si es necesario:
```bash
certbot renew --force-renewal
systemctl restart nginx
```

### 🔑 Proteja su archivo `.env`

Su archivo `.env` contiene el Client ID de Tesla, el Client Secret y el secreto JWT. Nunca debe:
- Subirse a git (está en `.gitignore` — no lo anule)
- Hacerse accesible públicamente
- Compartirse en capturas de pantalla o solicitudes de soporte

```bash
# Verifique los permisos — deben ser 600 (solo lectura/escritura del propietario):
ls -la /opt/tesla-carview/backend/.env

# Corrija si es incorrecto:
chmod 600 /opt/tesla-carview/backend/.env
```

### 📝 Registro de auditoría

Tesla Carview registra todas las acciones sensibles:
- Intentos de inicio de sesión (éxito y error)
- Bloqueos de cuenta
- Cambios de contraseña
- Ejecuciones de comandos del vehículo
- Eliminaciones de datos
- Acciones de administración

Ver en: **Admin → Registro de auditoría**

Exportar para análisis: **Admin → Registro de auditoría → Exportar CSV**

---

## Cabeceras de seguridad

La configuración de nginx de Tesla Carview incluye cabeceras de seguridad modernas:
- `Content-Security-Policy` (CSP) — previene XSS
- `Strict-Transport-Security` (HSTS) — obliga el uso de HTTPS
- `X-Frame-Options: DENY` — previene el clickjacking
- `X-Content-Type-Options: nosniff`
- `Permissions-Policy` — restringe las funciones del navegador

Verifique sus cabeceras: [securityheaders.com](https://securityheaders.com)

---

## Notificar una vulnerabilidad de seguridad

¿Encontró un problema de seguridad? Por favor, repórtelo de manera responsable:
- **No** abra un issue público en GitHub
- Correo electrónico: consulte el [SECURITY.md](https://github.com/KnevS/Tesla-Carview/blob/main/SECURITY.md) en el repositorio
- Nuestro objetivo es responder en un plazo de 48 horas

---

## Lista de verificación de seguridad para nuevas instalaciones

- [ ] Autenticación SSH por clave activada, autenticación por contraseña desactivada
- [ ] Firewall activo (UFW), solo los puertos 22/80/443 abiertos
- [ ] Fail2ban en funcionamiento
- [ ] Contraseña de administrador segura (16+ caracteres o frase de contraseña)
- [ ] MFA activado para la cuenta de administrador
- [ ] Permisos del archivo `.env` configurados a 600
- [ ] Actualizaciones automáticas activadas (SO + Tesla Carview)
- [ ] Copias de seguridad periódicas configuradas (consulte [Copia de seguridad y restauración](Backup-and-Restore))
- [ ] Registro de auditoría revisado periódicamente
