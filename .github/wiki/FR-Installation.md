🌐 **Langue :** [EN](Installation) · [DE](DE-Installation) · **FR** · [ES](ES-Installation) · [TR](TR-Installation) · [EL](EL-Installation)

---

# Guide d'installation

> **Temps nécessaire :** ~30 minutes | **Difficulté :** Accessible aux débutants

Ce guide vous accompagne dans une installation complète de Tesla Carview depuis zéro.

---

## Ce dont vous avez besoin avant de commencer

Avant de saisir la moindre commande, assurez-vous d'avoir :

- [ ] Un serveur Linux, VPS ou Raspberry Pi (voir les [options matérielles](#options-matérielles) ci-dessous)
- [ ] Un nom de domaine pointant vers votre serveur — OU prévoyez d'utiliser DynDNS / Cloudflare Tunnel ([→ Accès réseau](FR-Network-Access))
- [ ] Un compte développeur Tesla ([→ Configuration de l'API Tesla](FR-Tesla-API-Setup))
- [ ] Un accès SSH à votre serveur (ou clavier + écran sur le Pi)

---

## Options matérielles

### Option 1 : Raspberry Pi (serveur domestique)
Idéal pour : usage personnel à domicile, faible coût (~60–120 € au total)

| Modèle | RAM | Stockage recommandé |
|---|---|---|
| Raspberry Pi 5 (recommandé) | 4 Go ou 8 Go | SSD NVMe via M.2 HAT+ |
| Raspberry Pi 4 | 4 Go | SSD USB |
| Raspberry Pi 3 | 1 Go | SSD USB (plus lent) |

> ⚠️ **Important :** N'utilisez pas de carte SD pour un fonctionnement permanent. Elle tombera en panne en quelques mois sous la charge d'écriture de Tesla Carview. Consultez [Stockage Raspberry Pi](FR-Raspberry-Pi-Storage) pour une solution en 20 minutes.

### Option 2 : VPS chez un hébergeur
Idéal pour : disponibilité 24h/24, aucun matériel à gérer, configuration facile

| Hébergeur | Coût mensuel | Notes |
|---|---|---|
| [Hetzner](https://www.hetzner.com) CX22 | ~4,35 € | Recommandé, très fiable |
| [netcup](https://www.netcup.eu) VPS 1000 | ~4,44 € | Centres de données allemands |
| [Contabo](https://contabo.com) VPS S | ~5,99 € | Beaucoup de stockage |

Un VPS possède une **adresse IP publique fixe** — pas besoin de configurer DynDNS.

---

## Étape 1 : Préparer le serveur

Connectez-vous à votre serveur via SSH (ou ouvrez un terminal sur le Pi) :

```bash
ssh root@VOTRE-IP-SERVEUR
```

Assurez-vous que le système est à jour :

```bash
apt update && apt upgrade -y
```

---

## Étape 2 : Faire pointer un domaine vers votre serveur

Tesla Carview **nécessite HTTPS** (l'API Tesla ne fonctionne qu'avec des connexions sécurisées). Vous avez donc besoin d'un domaine avec un certificat SSL valide.

**J'ai un VPS avec une IP fixe :**
→ Allez chez votre registrar de domaine et créez un enregistrement A :
```
tesla.votredomaine.com  →  A  →  VOTRE-IP-VPS
```
Attendez 5 à 30 minutes pour la propagation DNS, puis continuez.

**Je suis à domicile sans IP fixe :**
→ Consultez [Accès réseau](FR-Network-Access) — configurez d'abord DynDNS ou Cloudflare Tunnel, puis revenez ici.

**Je n'ai pas de domaine du tout :**
→ Obtenez un sous-domaine gratuit sur [DuckDNS.org](https://www.duckdns.org) (ex. `mon-tesla.duckdns.org`) — gratuit et compatible avec Let's Encrypt.

---

## Étape 3 : Lancer le script d'installation

Cette commande unique télécharge et lance l'assistant d'installation interactif :

```bash
curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
```

L'assistant vous pose une série de questions :

| Question | Quoi saisir |
|---|---|
| Nom de domaine | `tesla.votredomaine.com` ou `mon-tesla.duckdns.org` |
| Nom d'utilisateur admin | N'importe quel nom (ex. votre prénom, `admin`) |
| Mot de passe admin | Un mot de passe fort (min. 12 caractères) |
| Nom du locataire | Comment appeler votre installation (ex. "Mon Tesla") |
| Activer HTTPS | Oui (toujours — requis pour l'API Tesla) |

> **Deployment mode:** The setup script asks whether you have an existing reverse proxy (nginx, Caddy, Traefik). Choose **Proxy mode** to skip nginx installation. In that case, forward requests to `http://127.0.0.1:8080` in your existing proxy.


Le script effectue ensuite automatiquement :
1. Installation de Docker, nginx, certbot, fail2ban
2. Obtention d'un certificat SSL Let's Encrypt pour votre domaine
3. Configuration de nginx avec des en-têtes de sécurité
4. Démarrage de tous les conteneurs Docker
5. Configuration de la base de données

**Cela prend 5 à 10 minutes.**

---

## Étape 4 : Première connexion

Ouvrez votre navigateur et accédez à `https://tesla.votredomaine.com`

Vous devriez voir la page de connexion Tesla Carview. Saisissez le nom d'utilisateur admin et le mot de passe définis à l'étape 3.

> 💡 **Astuce :** Cochez "Rester connecté (90 jours)" sur la page de connexion pour ne pas avoir à saisir votre mot de passe à chaque fois — particulièrement utile depuis le navigateur Tesla.

---

## Étape 5 : Connecter votre compte Tesla

Après la connexion, vous verrez une invite pour connecter votre compte Tesla. Suivez les instructions dans [Configuration de l'API Tesla](FR-Tesla-API-Setup).

---

## Étape 6 : Terminé !

Votre installation Tesla Carview est opérationnelle. L'application commencera à interroger automatiquement les données de votre véhicule.

Prochaines étapes :
- **Configurer votre véhicule** → Tableau de bord → Ajouter un véhicule
- **Configurer les notifications** → Paramètres → Notifications push
- **Inviter des membres de la famille** → Admin → Utilisateurs → Inviter
- **Configurer un lieu de recharge** → Paramètres → Lieux de recharge

---

## Mise à jour

Tesla Carview peut se mettre à jour automatiquement. Activez cette option dans les paramètres :

```bash
# Dans /opt/tesla-carview/backend/.env :
AUTO_UPDATE_ENABLED=true
```

Ou mettez à jour manuellement :

```bash
cd /opt/tesla-carview
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

---

## Résolution des problèmes d'installation

**"Permission denied" lors de l'exécution du script**
→ Assurez-vous d'être connecté en tant que `root`. Exécutez d'abord `sudo su`.

**"Domain not found" pendant certbot**
→ Votre DNS n'a pas encore propagé. Attendez 10 à 30 minutes et réessayez. Vérifiez avec : `nslookup tesla.votredomaine.com`

**Les conteneurs ne démarrent pas**
→ Vérifiez les logs : `docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs`

**Plus d'aide** → [Dépannage](FR-Troubleshooting) | [Ouvrir un ticket](https://github.com/KnevS/Tesla-Carview/issues)
