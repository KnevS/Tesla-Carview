🌐 **Langue :** [EN](Security) · [DE](DE-Security) · **FR** · [ES](ES-Security) · [TR](TR-Security) · [EL](EL-Security)

---

# Sécurité — Authentification, MFA et bonnes pratiques

Tesla Carview gère des données sensibles : localisation du véhicule, historique de recharge et commandes de contrôle de votre voiture. Cette page explique comment tout est sécurisé et ce que **vous** devez faire pour protéger votre installation.

---

## Options de connexion

### 1. Nom d'utilisateur + mot de passe (standard)
- Le mot de passe est haché avec bcrypt (facteur de coût 12)
- Les tentatives de connexion échouées sont limitées : après 5 tentatives, le compte est verrouillé 15 minutes
- Tous les événements de connexion sont enregistrés dans le journal d'audit

**Bonnes pratiques pour les mots de passe :**
- Utilisez une phrase de passe : `Soleil-Montagne-Voiture-Café` (4+ mots, facile à retenir, difficile à craquer)
- Minimum 12 caractères — plus c'est long, mieux c'est
- Ne réutilisez pas les mots de passe d'autres services
- Utilisez un gestionnaire de mots de passe (Bitwarden, 1Password, KeePass)

### 2. Passkeys (sans mot de passe, recommandé)
Les passkeys utilisent la biométrie de votre appareil (empreinte digitale, Face ID) à la place d'un mot de passe. Ils résistent au phishing et sont bien plus sécurisés.

Configuration :
1. **Paramètres → Sécurité → Ajouter une Passkey**
2. Votre navigateur ouvre une invite biométrique — confirmez avec votre doigt ou visage
3. Terminé — vous pouvez maintenant vous connecter uniquement avec votre biométrie

Les passkeys fonctionnent sur :
- Mac (Touch ID)
- iPhone/iPad (Face ID / Touch ID)
- Android (empreinte digitale)
- Windows (Windows Hello)
- Clés matérielles (YubiKey)

> ⚠️ Le navigateur du véhicule Tesla ne prend pas en charge les passkeys. Utilisez nom d'utilisateur + mot de passe avec "Rester connecté" dans la voiture.

### 3. MFA / Authentification à deux facteurs (TOTP)
Ajoutez une couche supplémentaire avec une application d'authentification :
1. **Paramètres → Sécurité → Activer le MFA**
2. Scannez le QR code avec Google Authenticator, Authy, Bitwarden ou similaire
3. Entrez le code à 6 chiffres pour confirmer

Après configuration : chaque connexion nécessite votre mot de passe + le code à 6 chiffres.

**Les admins peuvent exiger le MFA pour tous les utilisateurs :**
```env
# .env — force le MFA pour tous les nouveaux utilisateurs :
MFA_REQUIRED_FOR_NEW_USERS=true
```

---

## Sécurité des sessions

| Paramètre | Valeur |
|---|---|
| Durée de vie du token d'accès | 15 minutes (courte durée) |
| Token de rafraîchissement — standard | 7 jours |
| Token de rafraîchissement — "Rester connecté" | 90 jours |
| Stockage du token de rafraîchissement | Cookie `httpOnly`, `Secure`, `SameSite=Lax` |
| Rotation des tokens | Nouveau token de rafraîchissement à chaque utilisation |

Les tokens sont stockés sous forme de hachages SHA-256 — le texte en clair ne touche jamais la base de données.

---

## Bonnes pratiques de sécurité pour votre serveur

Au-delà de la sécurité intégrée de Tesla Carview, votre serveur a également besoin de protection.

### 🔒 Durcissement SSH

**Désactivez l'authentification par mot de passe — utilisez uniquement les clés :**

```bash
# Générez une paire de clés sur votre ordinateur LOCAL :
ssh-keygen -t ed25519 -C "tesla-server"

# Copiez la clé publique sur le serveur :
ssh-copy-id -i ~/.ssh/id_ed25519.pub root@YOUR-SERVER-IP

# Sur le serveur, désactivez l'auth par mot de passe :
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

> ⚠️ Vérifiez que la connexion par clé fonctionne **avant** de fermer votre session SSH actuelle.

**Changer le port SSH par défaut (optionnel, réduit le bruit dans les logs) :**
```bash
# Dans /etc/ssh/sshd_config :
Port 2222    # N'importe quel port non standard

# Mettre à jour le pare-feu :
ufw allow 2222/tcp
ufw delete allow 22/tcp
systemctl restart sshd
```

### 🔥 Pare-feu (UFW)

Le script d'installation configure UFW automatiquement. Vérifiez qu'il est correct :

```bash
ufw status verbose
```

Doit afficher :
```
Status: active
To                         Action      From
--                         ------      ----
22/tcp (ou votre port SSH) ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
```

Bloquez tout le reste — aucun autre port ne doit être exposé publiquement.

### 🛡️ Fail2ban (protection contre le brute-force)

Fail2ban bannit automatiquement les IP qui échouent répétitivement à la connexion SSH ou web. Le script d'installation l'installe et le configure.

Vérifier le statut :
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

**Mises à jour automatiques pour l'OS :**
```bash
apt install unattended-upgrades -y
dpkg-reconfigure unattended-upgrades  # Sélectionnez oui
```

**Mises à jour automatiques pour Tesla Carview :**
```env
# Dans /opt/tesla-carview/backend/.env :
AUTO_UPDATE_ENABLED=true
```

Les mises à jour s'exécutent chaque nuit à 03h30 (Europe/Berlin) si activées.

**Mises à jour des images Docker :**
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml pull
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d
```

### 🌐 HTTPS et renouvellement des certificats

Les certificats Let's Encrypt expirent tous les 90 jours et se renouvellent automatiquement via une tâche cron (configurée par le script d'installation).

Vérifier le statut du certificat :
```bash
certbot certificates
```

Tester le renouvellement (simulation, aucun changement) :
```bash
certbot renew --dry-run
```

Forcer le renouvellement si nécessaire :
```bash
certbot renew --force-renewal
systemctl restart nginx
```

### 🔑 Protégez votre fichier `.env`

Votre fichier `.env` contient le Client ID Tesla, le Client Secret et le secret JWT. Il ne doit jamais être :
- Commité dans git (il est dans `.gitignore` — ne le contournez pas)
- Rendu accessible publiquement
- Partagé dans des captures d'écran ou des demandes de support

```bash
# Vérifiez les permissions — doit être 600 (lecture/écriture propriétaire uniquement) :
ls -la /opt/tesla-carview/backend/.env

# Corriger si incorrect :
chmod 600 /opt/tesla-carview/backend/.env
```

### 📝 Journal d'audit

Tesla Carview enregistre toutes les actions sensibles :
- Tentatives de connexion (succès et échec)
- Verrouillages de compte
- Changements de mot de passe
- Exécutions de commandes véhicule
- Suppressions de données
- Actions admin

Consultez sur : **Admin → Journal d'audit**

Exportez pour analyse : **Admin → Journal d'audit → Exporter CSV**

---

## En-têtes de sécurité

La configuration nginx de Tesla Carview inclut des en-têtes de sécurité modernes :
- `Content-Security-Policy` (CSP) — prévient les XSS
- `Strict-Transport-Security` (HSTS) — force HTTPS
- `X-Frame-Options: DENY` — prévient le clickjacking
- `X-Content-Type-Options: nosniff`
- `Permissions-Policy` — restreint les fonctionnalités du navigateur

Vérifiez vos en-têtes : [securityheaders.com](https://securityheaders.com)

---

## Signaler une vulnérabilité de sécurité

Vous avez trouvé un problème de sécurité ? Signalez-le de manière responsable :
- **N'ouvrez pas** une issue publique sur GitHub
- E-mail : consultez le fichier [SECURITY.md](https://github.com/KnevS/Tesla-Carview/blob/main/SECURITY.md) dans le dépôt
- Nous visons à répondre dans les 48 heures

---

## Liste de contrôle de sécurité pour les nouvelles installations

- [ ] Authentification SSH par clé activée, authentification par mot de passe désactivée
- [ ] Pare-feu actif (UFW), seuls les ports 22/80/443 ouverts
- [ ] Fail2ban en cours d'exécution
- [ ] Mot de passe admin fort (16+ caractères ou phrase de passe)
- [ ] MFA activé pour le compte admin
- [ ] Permissions du fichier `.env` définies à 600
- [ ] Mises à jour automatiques activées (OS + Tesla Carview)
- [ ] Sauvegardes régulières configurées (voir [Sauvegarde et restauration](FR-Backup-and-Restore))
- [ ] Journal d'audit examiné périodiquement
