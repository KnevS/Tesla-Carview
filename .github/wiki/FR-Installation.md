# Guide d'installation

> **Durée estimée :** ~30 minutes | **Difficulté :** Accessible aux débutants

Ce guide vous accompagne pas à pas dans une installation complète de Tesla Carview depuis le début.

---

🌐 **Language / Sprache / Langue / Idioma / Dil / Γλώσσα**

| | |
|---|---|
| 🇬🇧 **[English](Installation)** | English version |
| 🇩🇪 **[Deutsch](DE-Installation)** | Deutsche Version |
| 🇫🇷 **[Français](FR-Installation)** | Vous êtes ici |
| 🇪🇸 **[Español](ES-Installation)** | Versión en español |
| 🇹🇷 **[Türkçe](TR-Installation)** | Türkçe sürüm |
| 🇬🇷 **[Ελληνικά](EL-Installation)** | Ελληνική έκδοση |

---

## Ce dont vous avez besoin avant de commencer

Avant de saisir la moindre commande, assurez-vous de disposer de :

- [ ] Un serveur Linux, un VPS ou un Raspberry Pi (voir les [options matérielles](#options-matérielles) ci-dessous)
- [ ] Un nom de domaine pointant vers votre serveur — OU l'intention d'utiliser DynDNS / Cloudflare Tunnel ([→ Accès réseau](Network-Access))
- [ ] Un compte Tesla Developer ([→ Configuration de l'API Tesla](Tesla-API-Setup))
- [ ] Un accès SSH à votre serveur (ou un clavier et un écran directement sur le Pi)

---

## Options matérielles

### Option 1 : Raspberry Pi (serveur domestique)
Idéal pour : usage personnel à domicile, faible coût (~60–120 € au total)

| Modèle | RAM | Stockage recommandé |
|---|---|---|
| Raspberry Pi 5 (recommandé) | 4 Go ou 8 Go | SSD NVMe via M.2 HAT+ |
| Raspberry Pi 4 | 4 Go | SSD USB |
| Raspberry Pi 3 | 1 Go | SSD USB (plus lent) |

> ⚠️ **Important :** N'utilisez pas de carte SD pour un fonctionnement permanent. Elle sera défaillante en quelques mois sous la charge d'écriture de Tesla Carview. Consultez [Stockage Raspberry Pi](Raspberry-Pi-Storage) pour une solution en 20 minutes.

### Option 2 : VPS chez un hébergeur
Idéal pour : disponibilité 24h/24 et 7j/7, aucun matériel à gérer, configuration simple

| Fournisseur | Coût mensuel | Remarques |
|---|---|---|
| [Hetzner](https://www.hetzner.com) CX22 | ~4,35 € | Recommandé, très fiable |
| [netcup](https://www.netcup.eu) VPS 1000 | ~4,44 € | Centres de données allemands |
| [Contabo](https://contabo.com) VPS S | ~5,99 € | Beaucoup d'espace de stockage |

Un VPS dispose d'une **adresse IP publique fixe** — aucune configuration DynDNS nécessaire.

---

## Étape 1 : Préparer le serveur

Connectez-vous à votre serveur via SSH (ou ouvrez un terminal sur le Pi) :

```bash
ssh root@YOUR-SERVER-IP
```

Assurez-vous que le système est à jour :

```bash
apt update && apt upgrade -y
```

---

## Étape 2 : Associer un domaine à votre serveur

Tesla Carview **requiert HTTPS** (l'API Tesla ne fonctionne que sur des connexions sécurisées). Vous avez donc besoin d'un domaine avec un certificat SSL valide.

**Je dispose d'un VPS avec une IP fixe :**
→ Rendez-vous chez votre registrar et créez un enregistrement A :
```
tesla.votredomaine.com  →  A  →  VOTRE-IP-VPS
```
Attendez 5 à 30 minutes que le DNS se propage, puis continuez.

**Je suis à domicile sans IP fixe :**
→ Consultez [Accès réseau](Network-Access) — configurez d'abord DynDNS ou Cloudflare Tunnel, puis revenez ici.

**Je n'ai pas encore de domaine :**
→ Obtenez un sous-domaine gratuit sur [DuckDNS.org](https://www.duckdns.org) (ex. `mon-tesla.duckdns.org`) — c'est gratuit et compatible avec Let's Encrypt.

---

## Étape 3 : Lancer le script d'installation

Cette commande unique télécharge et lance l'assistant d'installation interactif :

```bash
curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
```

L'assistant vous pose une série de questions :

| Question | Ce qu'il faut saisir |
|---|---|
| Nom de domaine | `tesla.votredomaine.com` ou `mon-tesla.duckdns.org` |
| Nom d'utilisateur administrateur | N'importe quel nom (ex. votre prénom, `admin`) |
| Mot de passe administrateur | Un mot de passe solide (minimum 12 caractères) |
| Nom du tenant | Comment nommer votre installation (ex. "Mon Tesla") |
| Activer HTTPS | Oui (toujours — requis pour l'API Tesla) |

Le script effectue ensuite automatiquement les opérations suivantes :
1. Installation de Docker, nginx, certbot, fail2ban
2. Obtention d'un certificat SSL Let's Encrypt pour votre domaine
3. Configuration de nginx avec les en-têtes de sécurité
4. Démarrage de tous les conteneurs Docker
5. Initialisation de la base de données

**Cette opération prend 5 à 10 minutes.**

---

## Étape 4 : Première connexion

Ouvrez votre navigateur et accédez à `https://tesla.votredomaine.com`

Vous devriez voir la page de connexion de Tesla Carview. Saisissez le nom d'utilisateur et le mot de passe administrateur définis à l'étape 3.

> 💡 **Conseil :** Cochez "Rester connecté (90 jours)" sur la page de connexion afin de ne pas avoir à ressaisir votre mot de passe à chaque fois — particulièrement pratique depuis le navigateur Tesla.

---

## Étape 5 : Connecter votre compte Tesla

Après la connexion, une invite s'affiche pour vous guider dans la connexion de votre compte Tesla. Suivez les instructions de la page [Configuration de l'API Tesla](Tesla-API-Setup).

---

## Étape 6 : C'est terminé !

Votre installation de Tesla Carview est opérationnelle. L'application commence automatiquement à interroger les données de votre véhicule.

Ce que vous pouvez faire ensuite :
- **Configurer votre véhicule** → Tableau de bord → Ajouter un véhicule
- **Configurer les notifications** → Paramètres → Notifications push
- **Inviter des membres de la famille** → Admin → Utilisateurs → Inviter
- **Configurer un lieu de recharge** → Paramètres → Lieux de recharge

---

## Mises à jour

Tesla Carview peut se mettre à jour automatiquement. Activez cette option dans les paramètres :

```bash
# Dans /opt/tesla-carview/backend/.env :
AUTO_UPDATE_ENABLED=true
```

Ou effectuez une mise à jour manuelle :

```bash
cd /opt/tesla-carview
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

---

## Résolution des problèmes d'installation

**« Permission denied » lors de l'exécution du script**
→ Assurez-vous d'être connecté en tant que `root`. Exécutez d'abord `sudo su`.

**« Domain not found » pendant l'exécution de certbot**
→ Votre DNS ne s'est pas encore propagé. Attendez 10 à 30 minutes et réessayez. Vérifiez avec : `nslookup tesla.votredomaine.com`

**Les conteneurs ne démarrent pas**
→ Consultez les journaux : `docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs`

**Besoin d'aide supplémentaire** → [Dépannage](Troubleshooting) | [Signaler un problème](https://github.com/KnevS/Tesla-Carview/issues)
