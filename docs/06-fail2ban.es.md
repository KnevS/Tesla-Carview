# fail2ban — protección contra fuerza bruta

> 🤖 *Esta traducción al español es asistida por IA desde [06-fail2ban.en.md](06-fail2ban.en.md). Correcciones bienvenidas vía GitHub.*

> 🇩🇪 [Auf Deutsch lesen](06-fail2ban.md)

Tesla Carview usa fail2ban para bloquear automáticamente a atacantes que adivinan credenciales de login o muestran otra actividad sospechosa.

## Cómo funciona

fail2ban lee los logs de nginx y banea IPs mediante iptables/nftables cuando se superan los umbrales.

## Comprobación de la instalación

```bash
systemctl status fail2ban
fail2ban-client status
```

## Configuración recomendada para Tesla Carview

### `/etc/fail2ban/jail.d/tesla-carview.conf`

```ini
[DEFAULT]
bantime  = 180        # banear IP durante 3 minutos
findtime = 60         # ventana de observación: 1 minuto
maxretry = 3          # 3 intentos fallidos → baneada

[nginx-limit-req]
# se dispara con errores de rate-limit de nginx (respuestas 429)
enabled  = true
port     = http,https
filter   = nginx-limit-req
logpath  = /var/log/nginx/error.log
maxretry = 3
findtime = 60
bantime  = 180

[nginx-tesla-login]
# específicamente para el endpoint de login — más estricto
enabled  = true
port     = http,https
filter   = nginx-tesla-login
logpath  = /var/log/nginx/access.log
maxretry = 3
findtime = 60
bantime  = 600        # 10 minutos en fallos de login
```

### `/etc/fail2ban/filter.d/nginx-tesla-login.conf`

```ini
[Definition]
# coincide con respuestas 401 en el endpoint de login
failregex = ^<HOST> .* "POST /api/auth/login HTTP/\d" 401
ignoreregex =
```

### `/etc/fail2ban/filter.d/nginx-limit-req.conf`

```ini
[Definition]
# filtro estándar para los excesos de rate-limit de nginx
failregex = ^\d{4}/\d{2}/\d{2} \d{2}:\d{2}:\d{2} \[error\] .+limiting requests, excess:.+by zone.+client: <HOST>
ignoreregex =
```

## Activar la configuración

```bash
# crear los archivos de configuración (como arriba)
sudo systemctl reload fail2ban

# comprobar estado
sudo fail2ban-client status nginx-tesla-login
sudo fail2ban-client status nginx-limit-req

# desbanear manualmente una IP
sudo fail2ban-client set nginx-tesla-login unbanip 1.2.3.4

# log de fail2ban en tiempo real
tail -f /var/log/fail2ban.log
```

## Tiempos de baneo por gravedad

| Escenario | maxretry | findtime | bantime |
|---|---|---|---|
| Login 401 (3 intentos fallidos) | 3 | 60 s | 600 s (10 min) |
| Rate limit superado | 3 | 60 s | 180 s (3 min) |
| Fuerza bruta SSH | 5 | 600 s | 3600 s (1 h) |

## Notificación por e-mail en el baneo (opcional)

```ini
# en /etc/fail2ban/jail.local
[DEFAULT]
destemail = your@email.com
sender    = fail2ban@your-domain.com
action    = %(action_mwl)s   # ban + mail + whois lookup
```

## Interacción con el bloqueo a nivel de aplicación

Tesla Carview bloquea cuentas tras 5 intentos fallidos **en la capa de aplicación** (15 min).

fail2ban protege **a nivel de red**: la IP queda baneada antes de que la petición llegue siquiera al proceso Node.js.

| Capa | Mecanismo | Disparo | Duración |
|---|---|---|---|
| Red | fail2ban | 3× HTTP 401 en 60 s | 10 min |
| Aplicación | bloqueo de cuenta | 5× contraseña incorrecta | 15 min |

Ambos mecanismos se complementan: fail2ban protege frente a fuerza bruta sobre muchas cuentas, el bloqueo a nivel de aplicación protege cuentas individuales.
