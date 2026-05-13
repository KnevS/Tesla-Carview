# Troubleshooting

Solutions to the most common problems. Start with the most likely cause and work your way down.

---

## 🚫 Can't reach the app at all

### Check: Is the server running?

```bash
# Check container status:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml ps

# Should show all containers as "Up":
# tesla-carview-backend    Up
# tesla-carview-frontend   Up
# tesla-carview-nginx      Up
```

If any container shows "Exit" or "Restarting":
```bash
# View logs for the problem container:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs backend
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs nginx
```

Restart everything:
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d
```

### Check: Is the domain resolving correctly?

```bash
nslookup tesla.yourdomain.com
# Should show your server's IP address

# Or from your browser: visit https://dnschecker.org
```

If DNS isn't resolving → wait 10–30 minutes after changing DNS records.

### Check: Is the firewall blocking access?

```bash
ufw status
# Ports 80 and 443 must show ALLOW
```

If missing:
```bash
ufw allow 80/tcp
ufw allow 443/tcp
```

---

## 🔴 "502 Bad Gateway" or "503 Service Unavailable"

This means nginx is running but the backend isn't responding.

```bash
# Check backend:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs backend --tail=50
```

Common cause: backend crashed due to a startup error. Often a missing `.env` variable or database permission issue.

Fix database permissions:
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml down
chown -R 1000:1000 /var/lib/docker/volumes/tesla_data/
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d
```

---

## 🔒 SSL/HTTPS errors ("Certificate not valid", "NET::ERR_CERT_EXPIRED")

The Let's Encrypt certificate has expired or wasn't issued correctly.

```bash
# Check certificate status:
certbot certificates

# Renew manually:
certbot renew --force-renewal
systemctl restart nginx
```

If certbot can't renew (DNS not resolving, port 80 blocked):
1. Check that port 80 is open in your firewall AND on your router (port forwarding)
2. Check that your domain's DNS points to your server's IP

---

## 🚗 Vehicle not showing data / shows "offline"

### Tesla API not connected
→ Check **Admin → System → System Health** — the "Tesla Token" section shows the connection status.

If expired: **Admin → System → Reconnect Tesla Account**

### Vehicle is sleeping
Tesla vehicles sleep after 15–30 minutes of inactivity. The app waits for the car to wake up. You can wake it manually:
1. Open the official Tesla app on your phone
2. Tap any function (climate, honk) to wake the car
3. Tesla Carview should update within 60 seconds

### XP7 VIN (Model Y Juniper) — GPS not updating
Some newer vehicles don't return GPS data via the standard REST API. This is a Tesla limitation. Fleet Telemetry provides GPS data for these vehicles — contact [Tesla Fleet Telemetry Access](https://developer.tesla.com) if you need this.

---

## 🔑 "Tesla API returned 403 Forbidden"

All Tesla API calls return 403? This typically means your **Tesla Developer account is suspended or has a billing issue**.

1. Log in to [developer.tesla.com](https://developer.tesla.com)
2. Check for any account warnings, billing notices, or suspension messages
3. Complete any required billing information (even for free-tier usage, credit card may be required)
4. After resolving: **Admin → System → Reconnect Tesla Account**

---

## 🔐 Login problems

### "Invalid username or password" — but I'm sure it's right

- Check Caps Lock
- If you recently changed passwords, try the old one (browser may have cached the old one)
- Admin accounts can reset user passwords: **Admin → Users → your account → Reset Password**

### "Account locked"

After 5 failed login attempts, the account is locked for 15 minutes. Wait or ask an admin to unlock.

Admins can unlock via:
```bash
# In the container:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml exec backend node -e "
const db = require('./src/db/database.js');
db.getDb('YOUR-TENANT-ID').prepare('UPDATE users SET failed_login_attempts=0, locked_until=NULL WHERE username=?').run('USERNAME');
"
```

### Forgot admin password

If you can't log in as admin:
```bash
# Get a shell in the backend container:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml exec backend sh

# Reset password (replace values):
node -e "
const bcrypt = require('bcrypt');
const { getDb } = require('./src/db/database.js');
const hash = bcrypt.hashSync('NewPassword123!', 12);
// You need the tenant ID — find it in master.db:
// getDb is called with tenant UUID
"
```

Or simpler: restore from a backup that you made when you knew the password.

---

## 📱 Push notifications not working

### Desktop
1. Check browser notification permissions: click the lock icon in the address bar → Notifications → Allow
2. Check that the app is using HTTPS (required for push)
3. Try: Settings → Push Notifications → Test Notification

### iOS (iPhone/iPad)
Push notifications on iOS only work from the **Home Screen shortcut** (PWA), not from the browser tab.
1. Open Tesla Carview in Safari
2. Tap Share → "Add to Home Screen"
3. Open from the Home Screen icon → notifications now work

---

## 🐛 Commands not working (climate, locks, etc.)

Commands require the Virtual Key to be paired:
1. Check: **Settings → Virtual Key** — status should show "Paired"
2. If not paired: open the pairing URL in the **Tesla car browser** (not your phone)
3. Confirm on the Tesla app on your phone

Also check: **Admin → System → Virtual Key Status**

---

## 🗄️ Database errors ("disk I/O error", "database is locked")

Usually caused by a failing SD card on Raspberry Pi. Check:

```bash
# Check filesystem for errors:
dmesg | grep -i "error\|fail\|corrupt"

# Check SD card health:
df -h
```

If you see I/O errors → your SD card is failing. **Immediately make a backup** and switch to USB SSD: [→ Raspberry Pi Storage](Raspberry-Pi-Storage)

---

## 📋 Viewing logs

```bash
# Backend application logs:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs backend --tail=100 -f

# nginx access log:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs nginx --tail=50

# System journal (fail2ban, etc.):
journalctl -u fail2ban --since "1 hour ago"

# fail2ban bans:
fail2ban-client status sshd
```

---

## Still stuck?

1. Check the [GitHub Issues](https://github.com/KnevS/Tesla-Carview/issues) — someone may have had the same problem
2. Open a new issue with:
   - What you tried
   - What happened (error messages, screenshots)
   - Your setup (Pi model, VPS provider, OS version)
   - Relevant log output (redact any passwords or secrets)
