# Security — Authentication, MFA & IT Best Practices

🌐 **Language:** **EN** · [DE](DE-Security) · [FR](FR-Security) · [ES](ES-Security) · [TR](TR-Security) · [EL](EL-Home)

Tesla Carview handles sensitive data: vehicle location, charging history, and control commands to your car. This page covers how it's secured and what **you** should do to keep your installation safe.

---

## Login options

### 1. Username + Password (standard)
- Password is hashed with bcrypt (cost factor 12)
- Failed logins are rate-limited: after 5 failed attempts, the account is locked for 15 minutes
- All login events are recorded in the audit log

**Good password practices:**
- Use a passphrase: `Sonne-Berg-Auto-Kaffee` (4+ words, easy to remember, hard to crack)
- Minimum 12 characters — longer is better
- Don't reuse passwords from other services
- Use a password manager (Bitwarden, 1Password, KeePass)

### 2. Passkeys (passwordless, recommended)
Passkeys use your device's biometrics (fingerprint, Face ID) instead of a password. They are phishing-resistant and much more secure.

Setup:
1. **Settings → Security → Add Passkey**
2. Your browser opens a biometric prompt — confirm with finger or face
3. Done — you can now log in with just your biometric

Passkeys work on:
- Mac (Touch ID)
- iPhone/iPad (Face ID / Touch ID)
- Android (fingerprint)
- Windows (Windows Hello)
- Hardware keys (YubiKey)

> ⚠️ The Tesla car browser does not support passkeys. Use username + password with "Stay signed in" in the car.

### 3. MFA / Two-Factor Authentication (TOTP)
Add an extra layer with an authenticator app:
1. **Settings → Security → Enable MFA**
2. Scan the QR code with Google Authenticator, Authy, Bitwarden, or similar
3. Enter the 6-digit code to confirm

After setup: every login requires your password + the 6-digit code.

**Admins can require MFA for all users:**
```env
# .env — forces MFA for all new users:
MFA_REQUIRED_FOR_NEW_USERS=true
```

---

## Session security

| Setting | Value |
|---|---|
| Access token lifetime | 15 minutes (short-lived) |
| Refresh token — standard | 7 days |
| Refresh token — "Stay signed in" | 90 days |
| Refresh token storage | `httpOnly`, `Secure`, `SameSite=Lax` cookie |
| Token rotation | New refresh token on each use |

Tokens are stored as SHA-256 hashes — the cleartext never touches the database.

---

## IT security best practices for your server

Beyond Tesla Carview's built-in security, your server needs protection too.

### 🔒 SSH hardening

**Disable password authentication — use keys only:**

```bash
# Generate a key pair on your LOCAL computer:
ssh-keygen -t ed25519 -C "tesla-server"

# Copy public key to server:
ssh-copy-id -i ~/.ssh/id_ed25519.pub root@YOUR-SERVER-IP

# On the server, disable password auth:
nano /etc/ssh/sshd_config
```
Change these lines:
```
PasswordAuthentication no
PermitRootLogin prohibit-password
PubkeyAuthentication yes
```
```bash
systemctl restart sshd
```

> ⚠️ Test that key-based login works **before** closing your current SSH session.

**Change the default SSH port (optional, reduces log noise):**
```bash
# In /etc/ssh/sshd_config:
Port 2222    # Any non-standard port

# Update firewall:
ufw allow 2222/tcp
ufw delete allow 22/tcp
systemctl restart sshd
```

### 🔥 Firewall (UFW)

The setup script configures UFW automatically. Verify it's correct:

```bash
ufw status verbose
```

Should show:
```
Status: active
To                         Action      From
--                         ------      ----
22/tcp (or your SSH port)  ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
```

Block everything else — no other ports should be exposed publicly.

### 🛡️ Fail2ban (brute-force protection)

Fail2ban automatically bans IPs that repeatedly fail SSH or web logins. The setup script installs and configures it.

Check status:
```bash
fail2ban-client status
fail2ban-client status sshd
fail2ban-client status nginx-http-auth
```

Unban an IP (if you locked yourself out):
```bash
fail2ban-client set sshd unbanip YOUR-IP
```

### 🔄 Keep everything updated

**Auto-updates for the OS:**
```bash
apt install unattended-upgrades -y
dpkg-reconfigure unattended-upgrades  # Select yes
```

**Auto-updates for Tesla Carview:**
```env
# In /opt/tesla-carview/backend/.env:
AUTO_UPDATE_ENABLED=true
```

Updates run nightly at 03:30 (Europe/Berlin) if enabled.

**Docker image updates:**
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml pull
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d
```

### 🌐 HTTPS & certificate renewal

Let's Encrypt certificates expire every 90 days and renew automatically via a cron job (set up by the install script).

Check certificate status:
```bash
certbot certificates
```

Test renewal (dry run, no changes):
```bash
certbot renew --dry-run
```

Force renewal if needed:
```bash
certbot renew --force-renewal
systemctl restart nginx
```

### 🔑 Protect your `.env` file

Your `.env` file contains Tesla Client ID, Client Secret, and JWT secret. It must never be:
- Committed to git (it's in `.gitignore` — don't override this)
- Made publicly accessible
- Shared in screenshots or support requests

```bash
# Check permissions — should be 600 (owner read/write only):
ls -la /opt/tesla-carview/backend/.env

# Fix if wrong:
chmod 600 /opt/tesla-carview/backend/.env
```

### 📝 Audit log

Tesla Carview records all sensitive actions:
- Login attempts (success and failure)
- Account lockouts
- Password changes
- Vehicle command executions
- Data deletions
- Admin actions

View at: **Admin → Audit Log**

Export for analysis: **Admin → Audit Log → Export CSV**

---

## Security headers

Tesla Carview's nginx configuration includes modern security headers:
- `Content-Security-Policy` (CSP) — prevents XSS
- `Strict-Transport-Security` (HSTS) — forces HTTPS
- `X-Frame-Options: DENY` — prevents clickjacking
- `X-Content-Type-Options: nosniff`
- `Permissions-Policy` — restricts browser features

Check your headers: [securityheaders.com](https://securityheaders.com)

---

## Reporting a security vulnerability

Found a security issue? Please report it responsibly:
- **Do not** open a public GitHub issue
- Email: see the [SECURITY.md](https://github.com/KnevS/Tesla-Carview/blob/main/SECURITY.md) in the repository
- We aim to respond within 48 hours

---

## Security checklist for new installations

- [ ] SSH key-based auth enabled, password auth disabled
- [ ] Firewall active (UFW), only ports 22/80/443 open
- [ ] Fail2ban running
- [ ] Strong admin password (16+ characters or passphrase)
- [ ] MFA enabled for admin account
- [ ] `.env` file permissions set to 600
- [ ] Auto-updates enabled (OS + Tesla Carview)
- [ ] Regular backups configured (see [Backup & Restore](Backup-and-Restore))
- [ ] Audit log periodically reviewed
