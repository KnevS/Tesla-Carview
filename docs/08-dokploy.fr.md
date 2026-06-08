# Déploiement avec Dokploy

> 🤖 *Cette traduction française est assistée par IA depuis [08-dokploy.en.md](08-dokploy.en.md). Corrections bienvenues via GitHub.*

> 🇩🇪 [Auf Deutsch lesen](08-dokploy.md)

[Dokploy](https://dokploy.com) est une plateforme PaaS open-source auto-hébergée
(comparable à Coolify ou Railway). Elle gère le routage, le SSL (via Let's Encrypt + Traefik),
les journaux et les webhooks GitHub pour un déploiement automatique — sans la lourdeur d'un
pipeline CI/CD complet.

**Quand c'est pertinent :**
- Vous voulez une UI web plutôt que des commandes SSH pour gérer les déploiements
- Plusieurs apps tournent sur le même serveur
- Vous ne voulez pas d'un workflow GitHub Actions séparé

---

## 1. Installer Dokploy sur le serveur

```bash
# en tant que root sur un VPS frais (Debian/Ubuntu recommandé) :
curl -sSL https://dokploy.com/install.sh | sh
```

Dokploy démarre alors sur le port **3000**. Ouvrez `http://YOUR-SERVER-IP:3000` dans le navigateur
et créez le compte admin.

> Note pare-feu : le port 3000 doit être joignable temporairement. Après connexion, Dokploy
> peut mettre en place son propre domaine + SSL pour le dashboard. Vous pourrez ensuite refermer le port 3000.

---

## 2. Ajouter Tesla Carview en tant qu'app

Dans le dashboard Dokploy :

1. **Projects** → **Create Project** (par ex. `tesla-carview`)
2. Dans le projet : **Create Service** → **Application**
3. Nom : `tesla-carview`
4. Type de build : **Docker Compose**
5. Fichier Compose : `docker-compose.prod.yml`

---

## 3. Connecter le dépôt GitHub

### Option A — GitHub App (recommandée)

1. Dashboard Dokploy → **Settings** → **Git Providers** → **GitHub App** → **Install**
2. Accorder la permission pour le dépôt `Tesla-Carview`
3. Dans la config de l'app : **Source** → sélectionner le dépôt, branche : `main`

### Option B — dépôt public (sans auth)

Saisissez simplement l'URL HTTPS sous **Source** :
```
https://github.com/YOUR-GITHUB-USER/Tesla-Carview.git
```
Branche : `main`

---

## 4. Définir les variables d'environnement

Dans l'onglet **Environment** de l'app, saisissez toutes les variables du fichier `.env`.
Champs minimum requis :

| Variable | Description |
|---|---|
| `JWT_SECRET` | Valeur aléatoire longue (`openssl rand -hex 64`) |
| `TESLA_CLIENT_ID` | Client ID de l'app Tesla Developer |
| `TESLA_CLIENT_SECRET` | Secret de l'app Tesla Developer |
| `TESLA_REDIRECT_URI` | `https://your.domain.com/api/auth/callback` |
| `FRONTEND_URL` | `https://your.domain.com` |
| `NODE_ENV` | `production` |

> Toutes les autres variables de `backend/.env.example` peuvent être ajoutées selon les besoins.

---

## 5. Configurer le domaine & SSL

Dans l'onglet **Domains** :

1. **Add Domain** → `your.domain.com`
2. Fournisseur SSL : **Let's Encrypt** (automatique via Traefik)
3. Port cible : **80** (le conteneur frontend nginx gère le routage interne)

L'enregistrement A du domaine doit pointer vers l'IP du serveur.

---

## 6. Données persistantes (bind-mount)

Tesla Carview utilise un **bind-mount** (`./data:/app/data`), pas un volume Docker nommé.
Tous les fichiers de base de données (`master.db`, `tenants/*.db`) résident directement dans le sous-répertoire `data/`
du répertoire de l'app sur l'hôte — par défaut `/opt/tesla-carview/data/`.

Un simple `cp` suffit pour les sauvegardes :

```bash
# sauvegarde manuelle :
cp /opt/tesla-carview/data/master.db /opt/backups/
cp /opt/tesla-carview/data/tenants/*.db /opt/backups/
```

La sauvegarde automatique intégrée (Paramètres système → Sauvegarde automatique) peut alternativement pousser les sauvegardes
vers S3 ou via SFTP — pas besoin de cron côté hôte.

---

## 7. Déclencher le premier déploiement

Dans l'onglet de l'app, en haut à droite : **Deploy** → Dokploy récupère le code depuis GitHub,
construit les images Docker et démarre les conteneurs.

Logs pendant le build :
- Onglet **Deployments** → cliquer sur le déploiement courant → sortie de log en temps réel

---

## 8. Déploiement automatique sur push GitHub

### Prérequis : intégration GitHub App (étape 3A)

Avec l'intégration GitHub App, Dokploy enregistre un webhook automatiquement.
Chaque push sur `main` déclenche un nouveau déploiement — pas de configuration supplémentaire.

### Webhook manuel (option B / sans GitHub App)

1. Dokploy → app → onglet **General** → copier **Webhook URL**
   (format : `https://dokploy.your.domain.com/api/deploy/XXXXX`)
2. GitHub → dépôt → Settings → Webhooks → **Add webhook**
   - Payload URL : l'URL webhook copiée
   - Content type : `application/json`
   - Secret : laisser vide (ou définir dans Dokploy)
   - Trigger : **Just the push event**

Désormais : push sur `main` → Dokploy construit et déploie automatiquement.

---

## 9. Journaux & monitoring

```
Dashboard Dokploy → App → Logs
```

Ou directement via Docker sur le serveur :

```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs -f backend
```

---

## Comparaison : Dokploy vs GitHub Actions SSH

| Critère | GitHub Actions + SSH | Dokploy |
|---|---|---|
| UI web pour logs/statut | ✗ (uniquement l'UI GitHub) | ✓ |
| Automatisation SSL | Manuelle (Certbot) | ✓ (Traefik) |
| Plusieurs apps sur un serveur | Complexe | ✓ |
| Logique CI/CD personnalisée | ✓ (flexible) | ✗ (build + start uniquement) |
| Coût en ressources (Dokploy lui-même) | aucun | ~200 Mo RAM |
| Dépendance GitHub | ✓ (Actions) | Optionnelle (le webhook suffit) |

---

## Pour aller plus loin

- [Documentation Dokploy](https://docs.dokploy.com)
- [Tesla Carview — déploiement SSH GitHub Actions](./02-deployment.en.md#github-actions-auto-deploy)
- [Configurer la Tesla API](./04-tesla-api.en.md)
