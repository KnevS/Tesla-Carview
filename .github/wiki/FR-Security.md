# Sécurité — Authentification, MFA et bonnes pratiques informatiques

Tesla Carview traite des données sensibles : la localisation du véhicule, l'historique de recharge et les commandes envoyées à votre voiture. Cette page explique comment ces données sont sécurisées et ce que **vous** devez faire pour protéger votre installation.

---

🌐 **Language / Sprache / Langue / Idioma / Dil / Γλώσσα**

| | |
|---|---|
| 🇬🇧 **[English](Security)** | English version |
| 🇩🇪 **[Deutsch](DE-Security)** | Deutsche Version |
| 🇫🇷 **[Français](FR-Security)** | Vous êtes ici |
| 🇪🇸 **[Español](ES-Security)** | Versión en español |
| 🇹🇷 **[Türkçe](TR-Security)** | Türkçe sürüm |
| 🇬🇷 **[Ελληνικά](EL-Security)** | Ελληνική έκδοση |

---

## Options de connexion

### 1. Nom d'utilisateur + mot de passe (méthode standard)
- Le mot de passe est haché avec bcrypt (facteur de coût 12)
- Les tentatives de connexion échouées sont limitées en débit : après 5 tentatives infructueuses, le compte est verrouillé pendant 15 minutes
- Tous les événements de connexion sont enregistrés dans le journal d'audit

**Bonnes pratiques pour les mots de passe :**
- Utilisez une phrase de passe : `Soleil-Montagne-Voiture-Café` (4 mots ou plus, facile à retenir, difficile à craquer)
- Minimum 12 caractères — plus c'est long, mieux c'est
- Ne réutilisez pas les mots de passe d'autres services
- Utilisez un gestionnaire de mots de passe (Bitwarden, 1Password, KeePass)

### 2. Clés d'accès (sans mot de passe, recommandé)
Les clés d'accès utilisent la biométrie de votre appareil (empreinte digitale, Face ID) à la place d'un mot de passe. Elles sont résistantes au hameçonnage et bien plus sécurisées.

Configuration :
1. **Paramètres → Sécurité → Ajouter une clé d'accès**
2. Votre navigateur ouvre une invite biométrique — confirmez avec votre doigt ou votre visage
3. Terminé — vous pouvez désormais vous connecter avec votre seule biométrie

Les clés d'accès fonctionnent sur :
- Mac (Touch ID)
- iPhone/iPad (Face ID / Touch ID)
- Android (empreinte digitale)
- Windows (Windows Hello)
- Clés matérielles (YubiKey)

> ⚠️ Le navigateur de la voiture Tesla ne prend pas en charge les clés d'accès. Utilisez le nom d'utilisateur + mot de passe avec « Rester connecté » dans la voiture.

### 3. MFA / Authentification à deux facteurs (TOTP)
Ajoutez une couche de protection supplémentaire avec une application d'authentification :
1. **Paramètres → Sécurité → Activer la MFA**
2. Scannez le code QR avec Google Authenticator, Authy, Bitwarden ou une application similaire
3. Saisissez le code à 6 chiffres pour confirmer

Une fois configurée : chaque connexion nécessite votre mot de passe + le code à 6 chiffres.

**Les administrateurs peuvent exiger la MFA pour tous les utilisateurs :**
```env
# .env — impose la MFA pour tous les nouveaux utilisateurs :
MFA_REQUIRED_FOR_NEW_USERS=true
```

---

## Sécurité des sessions

| Paramètre | Valeur |
|---|---|
| Durée de vie du token d'accès | 15 minutes (courte durée) |
| Token de rafraîchissement — standard | 7 jours |
| Token de rafraîchissement — « Rester connecté » | 90 jours |
| Stockage du token de rafraîchissement | Cookie `httpOnly`, `Secure`, `SameSite=Lax` |
| Rotation des tokens | Nouveau token de rafraîchissement à chaque utilisation |

Les tokens sont stockés sous forme de hachages SHA-256 — le texte en clair n'est jamais écrit dans la base de données.

---

## Bonnes pratiques de sécurité informatique pour votre serveur

Au-delà de la sécurité intégrée de Tesla Carview, votre serveur a également besoin d'être protégé.

### 🔒 Durcissement SSH

**Désactivez l'authentification par mot de passe — utilisez uniquement les clés :**

```bash
# Générez une paire de clés sur votre ordinateur LOCAL :
ssh-keygen -t ed25519 -C "tesla-server"

# Copiez la clé publique sur le serveur :
ssh-copy-id -i ~/.ssh/id_ed25519.pub root@YOUR-SERVER-IP

# Sur le serveur, désactivez l'authentification par mot de passe :
nano /etc/ssh/sshd_config
```
Modifiez ces lignes :
```
PasswordAuthentication no
PermitRootLogin prohibit-password
PubkeyAuthentication yes
```
```bash
systemctl restart sshd
```

> ⚠️ Vérifiez que la connexion par clé fonctionne **avant** de fermer votre session SSH en cours.

**Changez le port SSH par défaut (optionnel, réduit le bruit dans les journaux) :**
```bash
# Dans /etc/ssh/sshd_config :
Port 2222    # N'importe quel port non standard

# Mettez à jour le pare-feu :
ufw allow 2222/tcp
ufw delete allow 22/tcp
systemctl restart sshd
```

### 🔥 Pare-feu (UFW)

Le script d'installation configure UFW automatiquement. Vérifiez que la configuration est correcte :

```bash
ufw status verbose
```

Devrait afficher :
```
Status: active
To                         Action      From
--                         ------      ----
22/tcp (ou votre port SSH)  ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
```

Bloquez tout le reste — aucun autre port ne doit être exposé publiquement.

### 🛡️ Fail2ban (protection contre les attaques par force brute)

Fail2ban bannit automatiquement les adresses IP qui échouent répétitivement à se connecter en SSH ou sur le web. Le script d'installation l'installe et le configure.

Vérifiez l'état :
```bash
fail2ban-client status
fail2ban-client status sshd
fail2ban-client status nginx-http-auth
```

Débannir une IP (si vous vous êtes bloqué vous-même) :
```bash
fail2ban-client set sshd unbanip YOUR-IP
```

### 🔄 Maintenez tout à jour

**Mises à jour automatiques de l'OS :**
```bash
apt install unattended-upgrades -y
dpkg-reconfigure unattended-upgrades  # Sélectionnez oui
```

**Mises à jour automatiques de Tesla Carview :**
```env
# Dans /opt/tesla-carview/backend/.env :
AUTO_UPDATE_ENABLED=true
```

Les mises à jour s'exécutent chaque nuit à 03h30 (Europe/Berlin) si cette option est activée.

**Mises à jour des images Docker :**
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml pull
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d
```

### 🌐 HTTPS et renouvellement des certificats

Les certificats Let's Encrypt expirent tous les 90 jours et se renouvellent automatiquement via une tâche cron (configurée par le script d'installation).

Vérifiez l'état du certificat :
```bash
certbot certificates
```

Testez le renouvellement (simulation, sans modification) :
```bash
certbot renew --dry-run
```

Forcez le renouvellement si nécessaire :
```bash
certbot renew --force-renewal
systemctl restart nginx
```

### 🔑 Protégez votre fichier `.env`

Votre fichier `.env` contient le Client ID Tesla, le Client Secret et le secret JWT. Il ne doit jamais être :
- Intégré dans un dépôt git (il est dans `.gitignore` — ne contournez pas cette règle)
- Accessible publiquement
- Partagé dans des captures d'écran ou des demandes d'assistance

```bash
# Vérifiez les permissions — doivent être 600 (lecture/écriture pour le propriétaire uniquement) :
ls -la /opt/tesla-carview/backend/.env

# Corrigez si nécessaire :
chmod 600 /opt/tesla-carview/backend/.env
```

### 📝 Journal d'audit

Tesla Carview enregistre toutes les actions sensibles :
- Tentatives de connexion (succès et échecs)
- Verrouillages de comptes
- Modifications de mots de passe
- Exécutions de commandes sur le véhicule
- Suppressions de données
- Actions administratives

Consultez le journal dans : **Admin → Journal d'audit**

Exportez pour analyse : **Admin → Journal d'audit → Exporter en CSV**

---

## En-têtes de sécurité

La configuration nginx de Tesla Carview inclut des en-têtes de sécurité modernes :
- `Content-Security-Policy` (CSP) — prévient les attaques XSS
- `Strict-Transport-Security` (HSTS) — force HTTPS
- `X-Frame-Options: DENY` — prévient le clickjacking
- `X-Content-Type-Options: nosniff`
- `Permissions-Policy` — restreint les fonctionnalités du navigateur

Vérifiez vos en-têtes sur : [securityheaders.com](https://securityheaders.com)

---

## Signaler une vulnérabilité de sécurité

Vous avez découvert un problème de sécurité ? Veuillez le signaler de manière responsable :
- **N'ouvrez pas** un ticket public sur GitHub
- E-mail : consultez le fichier [SECURITY.md](https://github.com/KnevS/Tesla-Carview/blob/main/SECURITY.md) dans le dépôt
- Nous nous efforçons de répondre dans les 48 heures

---

## Liste de vérification de sécurité pour les nouvelles installations

- [ ] Authentification SSH par clé activée, authentification par mot de passe désactivée
- [ ] Pare-feu actif (UFW), seuls les ports 22/80/443 sont ouverts
- [ ] Fail2ban en cours d'exécution
- [ ] Mot de passe administrateur solide (16+ caractères ou phrase de passe)
- [ ] MFA activée pour le compte administrateur
- [ ] Permissions du fichier `.env` définies à 600
- [ ] Mises à jour automatiques activées (OS + Tesla Carview)
- [ ] Sauvegardes régulières configurées (voir [Sauvegarde & Restauration](Backup-and-Restore))
- [ ] Journal d'audit consulté périodiquement
