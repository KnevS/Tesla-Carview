# Déploiement — Serveur Linux & Raspberry Pi

> 🤖 *Cette traduction française est assistée par IA depuis [02-deployment.en.md](02-deployment.en.md). Corrections bienvenues via GitHub.*

> 🇩🇪 [Auf Deutsch lesen](02-deployment.md)

Tesla Carview fonctionne sur **toutes les plateformes Linux courantes** :

| Plateforme | Architecture | Testé |
|---|---|---|
| Serveur Linux (VPS, dédié) | x86_64 | ✓ |
| Raspberry Pi 4 / 5 | ARM64 | ✓ |
| Raspberry Pi 3 (et antérieurs) | ARMv7 | ✗ ¹ |
| Développement local (Mac/Windows/Linux) | tous | ✓ |

¹ **Les Raspberry Pi 3 et antérieurs (ARM 32 bits) ne sont plus pris en charge depuis la v3.51.0.** Node.js ne publie plus d'images ARMv7 à partir de la version 24 — ni alpine ni Debian —, l'image backend ne peut donc plus y être construite. `deploy/setup.sh` s'interrompt sur ces systèmes avec une explication au lieu d'échouer au téléchargement de l'image.


---

## Prérequis

- Debian/Ubuntu (ou Raspberry Pi OS)
- Accès root
- Optionnel : un domaine personnel avec un enregistrement A pointant vers l'IP du serveur (pour HTTPS)
- Compte Tesla Developer ([04-tesla-api.en.md](./04-tesla-api.en.md))

> **Vous utilisez un Raspberry Pi ?** Lisez d'abord [15-raspberry-pi-storage.en.md](15-raspberry-pi-storage.en.md) — les cartes SD lâchent sous une charge d'écriture continue. Mettre en place un SSD USB ou NVMe prend 20 minutes et évite beaucoup de soucis par la suite.
>
> **Pas d'IP fixe ?** [14-network-access.en.md](14-network-access.en.md) explique pas à pas DynDNS, Cloudflare Tunnel et les options VPS.
>
> **VPS d'entrée de gamme recommandé :** Le [netcup VPS nano G11s](https://www.netcup.com/en/server/vps-lite) (2 vCore, 2 Go RAM, 60 Go SSD, ~3,08 €/mois) est le VPS testé le moins cher qui remplit toutes les exigences de Tesla Carview — y compris suffisamment de stockage pour plusieurs années de données de télémétrie. Code de réduction disponible sur demande : [rabatt-code-netcup@krische.com](mailto:rabatt-code-netcup@krische.com).

---

## 📦 Installation automatique (pour tout le monde)

```bash
# En tant que root sur la machine cible :
curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
```

Ou manuellement :
```bash
git clone https://github.com/KnevS/Tesla-Carview.git /opt/tesla-carview
bash /opt/tesla-carview/deploy/setup.sh
```

Le script détecte automatiquement l'architecture et gère :
1. Installation des paquets système (nginx, certbot, docker, ufw, fail2ban)
2. Configuration du pare-feu (SSH, HTTP, HTTPS)
3. fail2ban pour la protection SSH
4. Lancement de l'assistant de configuration
5. SSL Let's Encrypt (si un domaine HTTPS est fourni)
6. nginx avec durcissement TLS
7. Démarrage des conteneurs Docker (multi-arch)

---

## Lancer l'assistant de configuration

```bash
bash /opt/tesla-carview/deploy/setup-wizard.sh
```

L'assistant pose interactivement :
- URL publique (par ex. `https://tesla.example.com` ou `http://192.168.1.100:8080`)
- Tesla API Client-ID et Client-Secret
- Chemin de la base de données
- Adresse e-mail pour les certificats SSL
- Clés VAPID Web Push (optionnel)

---

## Raspberry Pi — spécificités

```bash
# préparer Raspberry Pi OS (si nécessaire) :
sudo apt-get update && sudo apt-get upgrade -y

# installer Docker pour ARM (fait automatiquement par setup.sh) :
curl -fsSL https://get.docker.com | sh
```

Sur un Raspberry Pi dans un réseau domestique, aucun nginx/SSL n'est nécessaire — le conteneur de l'app est directement accessible sur le port 8080.
Définissez `FRONTEND_URL=http://192.168.1.100:8080` dans le `.env`.

---

## Configurer Tesla API

```bash
nano /opt/tesla-carview/backend/.env
```

Champs obligatoires :
```env
TESLA_CLIENT_ID=your-client-id
TESLA_CLIENT_SECRET=your-client-secret
TESLA_REDIRECT_URI=https://your.domain.com/api/auth/callback
```

Redémarrer les conteneurs :
```bash
cd /opt/tesla-carview
docker compose -f docker-compose.prod.yml up -d
```

---

## Configuration initiale (assistant web)

Au premier démarrage, l'app ouvre automatiquement **/setup** dans le navigateur.
C'est là que le premier compte administrateur est créé.

---

## Appliquer les mises à jour

```bash
bash /opt/tesla-carview/deploy/update.sh
```

---

## Déploiement automatique

Il existe deux chemins pour le déploiement automatique à chaque push sur `main` :

| Méthode | Idéal pour | Guide |
|---|---|---|
| **GitHub Actions + SSH** | Une seule app, serveur existant, contrôle total | Voir ci-dessous |
| **Dokploy** | Plusieurs apps, UI web souhaitée, SSL plus simple | [08-dokploy.en.md](./08-dokploy.en.md) |

---

## Auto-déploiement GitHub Actions

Déploiement automatique à chaque push sur `main`.

### Prérequis : créer une clé SSH de déploiement

```bash
# sur le serveur :
ssh-keygen -t ed25519 -C "tesla-carview-deploy" -f ~/.ssh/tesla_deploy -N ""

# autoriser la clé publique pour l'utilisateur SSH :
cat ~/.ssh/tesla_deploy.pub >> /home/YOUR_USER/.ssh/authorized_keys
```

> **Remarque** : l'utilisateur de déploiement a besoin d'un sudo sans mot de passe pour `docker` et `git` :
> ```bash
> echo 'YOUR_USER ALL=(ALL) NOPASSWD: /usr/bin/docker, /usr/bin/git' \
>   > /etc/sudoers.d/tesla-deploy
> ```

### Définir les secrets GitHub

GitHub → dépôt → Settings → Secrets and variables → Actions → *New repository secret* :

| Secret | Description | Exemple |
|---|---|---|
| `DEPLOY_HOST` | Nom d'hôte ou IP du serveur | `123.456.789.0` |
| `DEPLOY_USER` | Nom d'utilisateur SSH | `deploy` |
| `DEPLOY_SSH_KEY` | Contenu de `~/.ssh/tesla_deploy` (clé privée) | `-----BEGIN OPENSSH…` |
| `DEPLOY_APP_DIR` | Chemin d'installation sur le serveur | `/opt/tesla-carview` |


---

## Sauvegarde de la base de données

```bash
# créer une sauvegarde :
cp /opt/tesla-carview/data/master.db /opt/backups/master-$(date +%Y%m%d-%H%M).db
cp /opt/tesla-carview/data/tenants/*.db /opt/backups/

# quotidien automatique à 3 h du matin (crontab -e en tant que root) :
0 3 * * * cp /opt/tesla-carview/data/master.db /opt/tesla-carview/data/tenants/*.db /opt/backups/
```

> **Remarque :** Tesla Carview utilise un bind-mount (`./data:/app/data`), pas un volume Docker nommé. Tous les fichiers de base de données résident directement sous `/opt/tesla-carview/data/` sur l'hôte. Alternativement, la sauvegarde automatique intégrée peut être configurée dans les paramètres système de l'application (local, chemin, S3 ou SFTP).

---

## Vérification de santé post-installation

Après l'installation initiale (et à tout moment ensuite), vous pouvez exécuter le contrôle d'hygiène intégré :

```bash
bash /opt/tesla-carview/scripts/hygiene-check.sh
```

Le script vérifie 7 domaines et affiche un résumé avec code couleur :

| # | Vérification | Auto-fix |
|---|---|---|
| 1 | Environnement système — version Docker, Node.js ≥ 20, usage disque | — |
| 2 | Sécurité des dépendances — `npm audit` pour frontend + backend | `--fix` exécute `npm audit fix` |
| 3 | Taille du bundle — chunk JS principal vs seuils (warn > 1,2 Mo, fail > 1,5 Mo) | — |
| 4 | Complétude du `.env` — toutes les clés requises présentes ? | — |
| 5 | Santé Docker — conteneurs unhealthy/exited, images et volumes dangling | `--fix` purge les images |
| 6 | Intégrité de la base — SQLite `PRAGMA integrity_check` par tenant | — |
| 7 | Certificat SSL — jours restants avant expiration pour votre domaine configuré | — |

```bash
# Mode CI (sans couleurs, exit 1 en cas d'échec — utilisé par setup.sh et GitHub Actions) :
bash scripts/hygiene-check.sh --ci

# Mode auto-fix (lance npm audit fix, purge les images Docker) :
bash scripts/hygiene-check.sh --fix
```

Le job de maintenance nocturne (`backend/src/services/nightlyMaintenance.js`) exécute un sous-ensemble de ces vérifications automatiquement chaque nuit à 03:30 Europe/Berlin et écrit les résultats dans le journal de santé admin (`Admin → Système → Maintenance`).

---

## Consulter les journaux

```bash
# logs du backend :
docker compose -f docker-compose.prod.yml logs -f backend

# logs nginx :
tail -f /var/log/nginx/tesla-carview.access.log
```
