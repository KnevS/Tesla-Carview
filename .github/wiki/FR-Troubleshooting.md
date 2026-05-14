# Dépannage

Solutions aux problèmes les plus courants. Commencez par la cause la plus probable et progressez vers le bas.

---

🌐 **Language / Sprache / Langue / Idioma / Dil / Γλώσσα**

| | |
|---|---|
| 🇬🇧 **[English](Troubleshooting)** | English version |
| 🇩🇪 **[Deutsch](DE-Troubleshooting)** | Deutsche Version |
| 🇫🇷 **[Français](FR-Troubleshooting)** | Vous êtes ici |
| 🇪🇸 **[Español](ES-Troubleshooting)** | Versión en español |
| 🇹🇷 **[Türkçe](TR-Troubleshooting)** | Türkçe sürüm |
| 🇬🇷 **[Ελληνικά](EL-Troubleshooting)** | Ελληνική έκδοση |

---

## 🚫 Impossible d'accéder à l'application

### Vérification : Le serveur fonctionne-t-il ?

```bash
# Vérifier l'état des conteneurs :
docker compose -f /opt/tesla-carview/docker-compose.prod.yml ps

# Tous les conteneurs doivent afficher "Up" :
# tesla-carview-backend    Up
# tesla-carview-frontend   Up
# tesla-carview-nginx      Up
```

Si un conteneur affiche « Exit » ou « Restarting » :
```bash
# Consulter les journaux du conteneur problématique :
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs backend
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs nginx
```

Redémarrez tout :
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d
```

### Vérification : Le domaine se résout-il correctement ?

```bash
nslookup tesla.votredomaine.com
# Doit afficher l'adresse IP de votre serveur

# Ou depuis votre navigateur : visitez https://dnschecker.org
```

Si le DNS ne se résout pas → attendez 10 à 30 minutes après avoir modifié les enregistrements DNS.

### Vérification : Le pare-feu bloque-t-il l'accès ?

```bash
ufw status
# Les ports 80 et 443 doivent afficher ALLOW
```

Si ce n'est pas le cas :
```bash
ufw allow 80/tcp
ufw allow 443/tcp
```

---

## 🔴 « 502 Bad Gateway » ou « 503 Service Unavailable »

Cela signifie que nginx fonctionne mais que le backend ne répond pas.

```bash
# Vérifier le backend :
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs backend --tail=50
```

Cause fréquente : le backend s'est arrêté en raison d'une erreur au démarrage. Souvent due à une variable `.env` manquante ou un problème de permissions sur la base de données.

Corriger les permissions de la base de données :
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml down
chown -R 1000:1000 /var/lib/docker/volumes/tesla_data/
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d
```

---

## 🔒 Erreurs SSL/HTTPS (« Certificate not valid », « NET::ERR_CERT_EXPIRED »)

Le certificat Let's Encrypt a expiré ou n'a pas été émis correctement.

```bash
# Vérifier l'état du certificat :
certbot certificates

# Renouveler manuellement :
certbot renew --force-renewal
systemctl restart nginx
```

Si certbot ne peut pas renouveler (DNS non résolu, port 80 bloqué) :
1. Vérifiez que le port 80 est ouvert dans votre pare-feu ET sur votre routeur (redirection de port)
2. Vérifiez que le DNS de votre domaine pointe bien vers l'IP de votre serveur

---

## 🚗 Le véhicule n'affiche pas de données / affiche « hors ligne »

### API Tesla non connectée
→ Vérifiez **Admin → Système → Santé du système** — la section « Token Tesla » affiche l'état de la connexion.

Si expiré : **Admin → Système → Reconnecter le compte Tesla**

### Le véhicule est en veille
Les Tesla entrent en veille après 15 à 30 minutes d'inactivité. L'application attend que la voiture se réveille. Vous pouvez la réveiller manuellement :
1. Ouvrez l'application officielle Tesla sur votre téléphone
2. Appuyez sur n'importe quelle fonction (climatisation, klaxon) pour réveiller la voiture
3. Tesla Carview devrait se mettre à jour dans les 60 secondes

### VIN XP7 (Model Y Juniper) — GPS qui ne se met pas à jour
Certains véhicules plus récents ne renvoient pas de données GPS via l'API REST standard. C'est une limitation de Tesla. Fleet Telemetry fournit des données GPS pour ces véhicules — contactez [Tesla Fleet Telemetry Access](https://developer.tesla.com) si vous en avez besoin.

---

## 🔑 « Tesla API returned 403 Forbidden »

Tous les appels à l'API Tesla renvoient 403 ? Cela signifie généralement que votre **compte Tesla Developer est suspendu ou présente un problème de facturation**.

1. Connectez-vous sur [developer.tesla.com](https://developer.tesla.com)
2. Recherchez des avertissements de compte, des avis de facturation ou des messages de suspension
3. Complétez les informations de facturation requises (même pour l'usage gratuit, une carte de crédit peut être demandée)
4. Après résolution : **Admin → Système → Reconnecter le compte Tesla**

---

## 🔐 Problèmes de connexion

### « Identifiant ou mot de passe invalide » — mais je suis certain que c'est correct

- Vérifiez la touche Maj (Verr Maj)
- Si vous avez récemment changé de mot de passe, essayez l'ancien (le navigateur peut avoir mémorisé l'ancien)
- Les comptes administrateurs peuvent réinitialiser les mots de passe des utilisateurs : **Admin → Utilisateurs → votre compte → Réinitialiser le mot de passe**

### « Compte verrouillé »

Après 5 tentatives de connexion infructueuses, le compte est verrouillé pendant 15 minutes. Attendez ou demandez à un administrateur de déverrouiller.

Les administrateurs peuvent déverrouiller via :
```bash
# Dans le conteneur :
docker compose -f /opt/tesla-carview/docker-compose.prod.yml exec backend node -e "
const db = require('./src/db/database.js');
db.getDb('YOUR-TENANT-ID').prepare('UPDATE users SET failed_login_attempts=0, locked_until=NULL WHERE username=?').run('USERNAME');
"
```

### Mot de passe administrateur oublié

Si vous ne pouvez plus vous connecter en tant qu'administrateur :
```bash
# Obtenir un shell dans le conteneur backend :
docker compose -f /opt/tesla-carview/docker-compose.prod.yml exec backend sh

# Réinitialiser le mot de passe (remplacez les valeurs) :
node -e "
const bcrypt = require('bcrypt');
const { getDb } = require('./src/db/database.js');
const hash = bcrypt.hashSync('NewPassword123!', 12);
// Vous avez besoin de l'ID du tenant — trouvez-le dans master.db :
// getDb est appelé avec l'UUID du tenant
"
```

Ou, plus simplement : restaurez depuis une sauvegarde effectuée lorsque vous connaissiez le mot de passe.

---

## 📱 Notifications push qui ne fonctionnent pas

### Ordinateur de bureau
1. Vérifiez les permissions de notification du navigateur : cliquez sur l'icône de cadenas dans la barre d'adresse → Notifications → Autoriser
2. Vérifiez que l'application utilise HTTPS (requis pour les notifications push)
3. Essayez : Paramètres → Notifications push → Notification de test

### iOS (iPhone/iPad)
Les notifications push sur iOS fonctionnent uniquement depuis le **raccourci sur l'écran d'accueil (PWA)**, pas depuis un onglet du navigateur.
1. Ouvrez Tesla Carview dans Safari
2. Appuyez sur Partager → « Sur l'écran d'accueil »
3. Ouvrez l'application depuis l'icône de l'écran d'accueil → les notifications fonctionnent désormais

---

## 🐛 Les commandes ne fonctionnent pas (climatisation, verrouillage, etc.)

Les commandes nécessitent que la clé virtuelle soit couplée :
1. Vérifiez : **Paramètres → Clé virtuelle** — le statut doit afficher « Couplée »
2. Si non couplée : ouvrez l'URL de couplage dans le **navigateur de la voiture Tesla** (pas depuis votre téléphone)
3. Confirmez depuis l'application Tesla sur votre téléphone

Vérifiez également : **Admin → Système → Statut de la clé virtuelle**

---

## 🗄️ Erreurs de base de données (« disk I/O error », « database is locked »)

Généralement causées par une carte SD défaillante sur Raspberry Pi. Vérifiez :

```bash
# Vérifier le système de fichiers pour détecter des erreurs :
dmesg | grep -i "error\|fail\|corrupt"

# Vérifier l'état de la carte SD :
df -h
```

Si vous voyez des erreurs I/O → votre carte SD est en train de lâcher. **Effectuez immédiatement une sauvegarde** et passez à un SSD USB : [→ Stockage Raspberry Pi](Raspberry-Pi-Storage)

---

## 📋 Consultation des journaux

```bash
# Journaux de l'application backend :
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs backend --tail=100 -f

# Journal d'accès nginx :
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs nginx --tail=50

# Journal système (fail2ban, etc.) :
journalctl -u fail2ban --since "1 hour ago"

# Bannissements fail2ban :
fail2ban-client status sshd
```

---

## Toujours bloqué ?

1. Consultez les [problèmes GitHub](https://github.com/KnevS/Tesla-Carview/issues) — quelqu'un a peut-être rencontré le même problème
2. Ouvrez un nouveau problème en indiquant :
   - Ce que vous avez essayé
   - Ce qui s'est passé (messages d'erreur, captures d'écran)
   - Votre configuration (modèle de Pi, fournisseur VPS, version de l'OS)
   - Les journaux pertinents (masquez les mots de passe et informations confidentielles)
