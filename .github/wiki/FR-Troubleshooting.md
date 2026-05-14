🌐 **Langue :** [EN](Troubleshooting) · [DE](DE-Troubleshooting) · **FR** · [ES](ES-Troubleshooting) · [TR](TR-Troubleshooting) · [EL](EL-Troubleshooting)

---

# Dépannage

Solutions aux problèmes les plus courants. Commencez par la cause la plus probable et descendez progressivement.

---

## 🚫 Impossible d'accéder à l'application

### Vérifiez : Le serveur est-il en cours d'exécution ?

```bash
# Vérifier le statut des conteneurs :
docker compose -f /opt/tesla-carview/docker-compose.prod.yml ps

# Doit afficher tous les conteneurs comme "Up" :
# tesla-carview-backend    Up
# tesla-carview-frontend   Up
# tesla-carview-nginx      Up
```

Si un conteneur affiche "Exit" ou "Restarting" :
```bash
# Voir les logs du conteneur problématique :
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs backend
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs nginx
```

Tout redémarrer :
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d
```

### Vérifiez : Le domaine se résout-il correctement ?

```bash
nslookup tesla.yourdomain.com
# Doit afficher l'adresse IP de votre serveur

# Ou depuis votre navigateur : visitez https://dnschecker.org
```

Si le DNS ne se résout pas → attendez 10–30 minutes après avoir modifié les enregistrements DNS.

### Vérifiez : Le pare-feu bloque-t-il l'accès ?

```bash
ufw status
# Les ports 80 et 443 doivent afficher ALLOW
```

Si manquants :
```bash
ufw allow 80/tcp
ufw allow 443/tcp
```

---

## 🔴 "502 Bad Gateway" ou "503 Service Unavailable"

Cela signifie que nginx fonctionne mais que le backend ne répond pas.

```bash
# Vérifier le backend :
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs backend --tail=50
```

Cause fréquente : le backend a planté en raison d'une erreur de démarrage. Souvent une variable `.env` manquante ou un problème de permissions de base de données.

Corriger les permissions de la base de données :
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml down
chown -R 1000:1000 /var/lib/docker/volumes/tesla_data/
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d
```

---

## 🔒 Erreurs SSL/HTTPS ("Certificat invalide", "NET::ERR_CERT_EXPIRED")

Le certificat Let's Encrypt a expiré ou n'a pas été émis correctement.

```bash
# Vérifier le statut du certificat :
certbot certificates

# Renouveler manuellement :
certbot renew --force-renewal
systemctl restart nginx
```

Si certbot ne peut pas renouveler (DNS non résolu, port 80 bloqué) :
1. Vérifiez que le port 80 est ouvert dans votre pare-feu ET sur votre box (redirection de ports)
2. Vérifiez que le DNS de votre domaine pointe vers l'IP de votre serveur

---

## 🚗 Le véhicule n'affiche pas de données / affiche "hors ligne"

### API Tesla non connectée
→ Vérifiez **Admin → Système → Santé du système** — la section "Token Tesla" affiche l'état de la connexion.

Si expiré : **Admin → Système → Reconnecter le compte Tesla**

### Le véhicule est en veille
Les Tesla se mettent en veille après 15–30 minutes d'inactivité. L'application attend que la voiture se réveille. Vous pouvez la réveiller manuellement :
1. Ouvrez l'application Tesla officielle sur votre téléphone
2. Tapez sur une fonction (climatisation, klaxon) pour réveiller la voiture
3. Tesla Carview devrait se mettre à jour dans les 60 secondes

### VIN XP7 (Model Y Juniper) — GPS ne se met pas à jour
Certains véhicules récents ne renvoient pas les données GPS via l'API REST standard. C'est une limitation de Tesla. Fleet Telemetry fournit les données GPS pour ces véhicules — contactez [Tesla Fleet Telemetry Access](https://developer.tesla.com) si vous en avez besoin.

---

## 🔑 "L'API Tesla a renvoyé 403 Forbidden"

Tous les appels à l'API Tesla renvoient 403 ? Cela signifie généralement que votre **compte développeur Tesla est suspendu ou a un problème de facturation**.

1. Connectez-vous à [developer.tesla.com](https://developer.tesla.com)
2. Vérifiez les avertissements de compte, les notifications de facturation ou les messages de suspension
3. Complétez les informations de facturation requises (même pour l'utilisation gratuite, une carte de crédit peut être requise)
4. Après résolution : **Admin → Système → Reconnecter le compte Tesla**

---

## 🔐 Problèmes de connexion

### "Nom d'utilisateur ou mot de passe invalide" — mais je suis sûr que c'est correct

- Vérifiez le verrouillage des majuscules
- Si vous avez récemment changé de mot de passe, essayez l'ancien (le navigateur peut avoir mis en cache l'ancien)
- Les comptes admin peuvent réinitialiser les mots de passe utilisateurs : **Admin → Utilisateurs → votre compte → Réinitialiser le mot de passe**

### "Compte verrouillé"

Après 5 tentatives de connexion échouées, le compte est verrouillé 15 minutes. Attendez ou demandez à un admin de le déverrouiller.

Les admins peuvent déverrouiller via :
```bash
# Dans le conteneur :
docker compose -f /opt/tesla-carview/docker-compose.prod.yml exec backend node -e "
const db = require('./src/db/database.js');
db.getDb('YOUR-TENANT-ID').prepare('UPDATE users SET failed_login_attempts=0, locked_until=NULL WHERE username=?').run('USERNAME');
"
```

### Mot de passe admin oublié

Si vous ne pouvez pas vous connecter en tant qu'admin :
```bash
# Obtenir un shell dans le conteneur backend :
docker compose -f /opt/tesla-carview/docker-compose.prod.yml exec backend sh

# Réinitialiser le mot de passe (remplacez les valeurs) :
node -e "
const bcrypt = require('bcrypt');
const { getDb } = require('./src/db/database.js');
const hash = bcrypt.hashSync('NewPassword123!', 12);
// Vous avez besoin de l'ID du locataire — trouvez-le dans master.db :
// getDb est appelé avec l'UUID du locataire
"
```

Ou plus simple : restaurez depuis une sauvegarde que vous avez faite quand vous connaissiez le mot de passe.

---

## 📱 Notifications push qui ne fonctionnent pas

### Ordinateur de bureau
1. Vérifiez les permissions de notification du navigateur : cliquez sur l'icône de cadenas dans la barre d'adresse → Notifications → Autoriser
2. Vérifiez que l'application utilise HTTPS (requis pour le push)
3. Essayez : Paramètres → Notifications push → Notification de test

### iOS (iPhone/iPad)
Les notifications push sur iOS ne fonctionnent qu'à partir du **raccourci écran d'accueil** (PWA), pas depuis l'onglet du navigateur.
1. Ouvrez Tesla Carview dans Safari
2. Appuyez sur Partager → "Ajouter à l'écran d'accueil"
3. Ouvrez depuis l'icône de l'écran d'accueil → les notifications fonctionnent maintenant

---

## 🐛 Commandes qui ne fonctionnent pas (climatisation, verrouillage, etc.)

Les commandes nécessitent que la Virtual Key soit appairée :
1. Vérifiez : **Paramètres → Virtual Key** — le statut doit afficher "Appairée"
2. Si non appairée : ouvrez l'URL d'appairage dans le **navigateur de la voiture Tesla** (pas votre téléphone)
3. Confirmez dans l'application Tesla sur votre téléphone

Vérifiez également : **Admin → Système → Statut de la Virtual Key**

---

## 🗄️ Erreurs de base de données ("disk I/O error", "database is locked")

Généralement causé par une carte SD défaillante sur Raspberry Pi. Vérifiez :

```bash
# Vérifier les erreurs du système de fichiers :
dmesg | grep -i "error\|fail\|corrupt"

# Vérifier l'état de la carte SD :
df -h
```

Si vous voyez des erreurs I/O → votre carte SD est en train de lâcher. **Faites immédiatement une sauvegarde** et passez au SSD USB : [→ Stockage Raspberry Pi](FR-Raspberry-Pi-Storage)

---

## 📋 Consultation des logs

```bash
# Logs de l'application backend :
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs backend --tail=100 -f

# Log d'accès nginx :
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs nginx --tail=50

# Journal système (fail2ban, etc.) :
journalctl -u fail2ban --since "1 hour ago"

# Bannissements fail2ban :
fail2ban-client status sshd
```

---

## Toujours bloqué ?

1. Consultez les [Issues GitHub](https://github.com/KnevS/Tesla-Carview/issues) — quelqu'un a peut-être eu le même problème
2. Ouvrez une nouvelle issue avec :
   - Ce que vous avez essayé
   - Ce qui s'est passé (messages d'erreur, captures d'écran)
   - Votre configuration (modèle Pi, fournisseur VPS, version OS)
   - La sortie de log pertinente (censurez les mots de passe ou secrets)
