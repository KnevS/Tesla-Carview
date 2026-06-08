# 📚 Tesla Carview — Documentation technique

> 🤖 *Cette traduction française est assistée par IA depuis [README.en.md](README.en.md). Corrections bienvenues via GitHub.*

> 🇩🇪 [Auf Deutsch lesen](README.md) · 👤 [Manuel utilisateur (EN)](../frontend/src/handbook/handbook.en.md)

Cette documentation s'adresse aux **auto-hébergeurs, administrateurs et développeurs**. Elle couvre l'installation, la configuration, l'exploitation et l'architecture.

> Les **utilisateurs de l'application en production** (connexion, carnet de bord, commandes, permissions, démo, …) trouveront tout dans le **manuel intégré à l'application** sur `/handbook` ou directement dans [`frontend/src/handbook/handbook.en.md`](../frontend/src/handbook/handbook.en.md). Les deux documents se recoupent volontairement sur quelques sujets mais se renvoient toujours l'un à l'autre.

---

## Sommaire

### 🚀 Installation initiale

| Doc | Sujet |
|---|---|
| [01-quickstart.en.md](01-quickstart.en.md) | Démarrage rapide : cloner le dépôt, lancer backend + frontend en local |
| [02-deployment.en.md](02-deployment.en.md) | Déploiement en production sur un serveur Linux / Raspberry Pi avec Docker + nginx + Let's Encrypt |
| [14-network-access.en.md](14-network-access.en.md) | **Accessible depuis n'importe où** sans IP fixe — DynDNS, FritzBox, Cloudflare Tunnel, VPS, domaine personnel |
| [15-raspberry-pi-storage.en.md](15-raspberry-pi-storage.en.md) | **Stockage Raspberry Pi** — remplacer la carte SD par un SSD USB, HAT+ NVMe, boot réseau PXE |
| [07-setup-wizard.en.md](07-setup-wizard.en.md) | Assistant de configuration interactif (`deploy/setup-wizard.sh`) |
| [08-dokploy.en.md](08-dokploy.en.md) | Alternative : déploiement via Dokploy |

### ⚙️ Configuration

| Doc | Sujet |
|---|---|
| [10-configuration.en.md](10-configuration.en.md) | **Toutes les variables d'environnement** — requises, optionnelles, démo, mise à jour automatique |
| [04-tesla-api.en.md](04-tesla-api.en.md) | Créer un compte développeur Tesla, enregistrer l'app, choisir les scopes |
| [09-tesla-api-usage.en.md](09-tesla-api-usage.en.md) | Tesla API : coût, quota, suivi |

### 🛠 Exploitation

| Doc | Sujet |
|---|---|
| [11-operations.en.md](11-operations.en.md) | **Sauvegarde & restauration**, **maintenance nocturne**, **mode démo**, mise à jour automatique, santé du système, journaux |
| [12-high-availability.en.md](12-high-availability.en.md) | **Architecture HA** (teaser) — warm standby, actif-actif, géo-redondant, K8s. Livré sur projet à la demande. |

### 🔐 Sécurité

| Doc | Sujet |
|---|---|
| [03-authentication.en.md](03-authentication.en.md) | Flux d'authentification : JWT, refresh token, MFA, passkeys |
| [05-security-architecture.en.md](05-security-architecture.en.md) | Modèle de menace et toutes les mesures de sécurité |
| [06-fail2ban.en.md](06-fail2ban.en.md) | Protection contre les attaques par force brute avec fail2ban |

---

## Où trouver chaque information ?

| Question | Réponse |
|---|---|
| « Comment installer Tesla Carview sur mon serveur ? » | [02-deployment.en.md](02-deployment.en.md) |
| « Quelle variable d'environnement contrôle X ? » | [10-configuration.en.md](10-configuration.en.md) |
| « Comment créer une sauvegarde ? » | [11-operations.en.md](11-operations.en.md) |
| « Ma Tesla n'apparaît pas — que faire ? » | [Manuel utilisateur → Dépannage](../frontend/src/handbook/handbook.en.md#-troubleshooting) |
| « Comment utiliser le carnet de bord pour le fisc ? » | [Manuel utilisateur → Carnet BMF](../frontend/src/handbook/handbook.en.md#-logbook-for-the-tax-office-bmf-compliant-fahrtenbuch-bmf) |
| « Comment activer le MFA pour mon compte ? » | [Manuel utilisateur → Sécurité](../frontend/src/handbook/handbook.en.md#-security) |
| « Pourquoi les nouveaux comptes exigent-ils le MFA ? » | [03-authentication.en.md](03-authentication.en.md) (architecture) et [Manuel utilisateur → Sécurité](../frontend/src/handbook/handbook.en.md#-security) (côté utilisateur) |
| « Comment fonctionne le mode démo en interne ? » | [11-operations.en.md → Mode démo](11-operations.en.md#-demo-mode) |
| « Qu'est-ce qui est consigné dans le journal d'audit ? » | [05-security-architecture.en.md](05-security-architecture.en.md) et l'UI sur `/admin/audit` |

---

## Contenus liés en dehors de la documentation

- **`backend/.env.example`** — modèle commenté pour la configuration du backend
- **`frontend/.env.example`** — modèle pour le contact du pied de page (au build)
- **`deploy/setup.sh`** — installation serveur entièrement automatisée
- **`deploy/setup-wizard.sh`** — assistant interactif
- **`deploy/update.sh`** — mise à jour sans interruption
- **`docker-compose.prod.yml`** — stack de production avec backend + frontend + nginx
