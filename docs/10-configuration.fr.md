# 🔧 Configuration

> 🤖 *Cette traduction française est assistée par IA depuis [10-configuration.en.md](10-configuration.en.md). Corrections bienvenues via GitHub.*

> 🇩🇪 [Auf Deutsch lesen](10-configuration.md) · 👤 [Manuel utilisateur](../frontend/src/handbook/handbook.en.md) · 🏠 [Sommaire de la doc](.)

Toutes les variables d'environnement qui contrôlent Tesla Carview. La plupart vivent dans `backend/.env` (voir `backend/.env.example` comme modèle). Les entrées marquées **(requis)** doivent être définies ; toutes les autres ont une valeur par défaut raisonnable.

---

## 🔐 Requis

| Variable | Description | Exemple |
|---|---|---|
| `JWT_SECRET` | Clé secrète pour JSON Web Tokens. **≥ 32 caractères, cryptographiquement aléatoire.** | `openssl rand -hex 32` |
| `TESLA_CLIENT_ID` | Client ID depuis le [Tesla Developer Portal](https://developer.tesla.com) | `abc123…` |
| `TESLA_CLIENT_SECRET` | Client secret depuis le Tesla Developer Portal | `secret…` |
| `FRONTEND_URL` | URL HTTPS publique de l'app — utilisée pour le callback OAuth et l'enregistrement de passkey | `https://carview.example.com` |
| `RP_NAME` | Nom affiché dans les dialogues passkey | `Tesla Carview` |
| `RP_ID` | Domaine pour WebAuthn (sans protocole, **doit correspondre à** `FRONTEND_URL`) | `carview.example.com` |

> ⚠️ `JWT_SECRET` ne doit **pas changer** au runtime, sinon toutes les sessions deviennent invalides. Changer `RP_ID` invalide toutes les passkeys existantes — les utilisateurs doivent se ré-enregistrer.

---

## ⚡ Tesla Fleet API

| Variable | Défaut | Description |
|---|---|---|
| `TESLA_REDIRECT_URI` | `${FRONTEND_URL}/api/auth/callback` | URI de redirection OAuth. Doit être saisi exactement dans le Tesla Developer Portal. |
| `TESLA_API_HOST` | `fleet-api.prd.eu.vn.cloud.tesla.com` | Endpoint Tesla API régional (NA : `…na.vn.cloud.tesla.com`). |
| `TESLA_PROXY_HOST` | `host.docker.internal:4443` | Adresse de `tesla-http-proxy` pour les commandes véhicule signées. |

Étapes détaillées : [04-tesla-api.en.md](04-tesla-api.en.md) (compte développeur, enregistrement de l'app, scopes) et [09-tesla-api-usage.en.md](09-tesla-api-usage.en.md) (coût / quota).

---

## 🔔 Web Push (notifications)

Les clés VAPID sont requises pour les notifications « charge terminée » et les rappels de maintenance. Sans elles, les notifications push ne fonctionneront pas — tout le reste continue de fonctionner.

| Variable | Défaut | Description |
|---|---|---|
| `VAPID_PUBLIC_KEY` | — | Clé publique, générer via `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | — | Clé privée (même générateur) |
| `VAPID_CONTACT` | `mailto:noreply@example.com` | URI de contact pour le service push (idéalement votre propre e-mail) |

---

## 🧪 Bac à sable démo

| Variable | Défaut | Description |
|---|---|---|
| `DEMO_ENABLED` | `false` | Quand `true` : un tenant démo séparé avec slug `demo` est créé au boot. La page de connexion affiche un bouton « 🚀 Demo starten ». Limites strictes : 1 inscription par IP par 24 h, max. 10 testeurs simultanés, chaque compte vit 14 jours. |

Détails d'exploitation + sécurité : [11-operations.en.md → Mode démo](11-operations.en.md#demo-mode). Les testeurs voient automatiquement un addendum aux pages de confidentialité / CGU documentant la suppression inconditionnelle après 14 jours.

---

## ⬆️ Mise à jour automatique

| Variable | Défaut | Description |
|---|---|---|
| `AUTO_UPDATE_ENABLED` | `false` | Quand `true` : un cron nocturne vers 03:30 Europe/Berlin exécute `git fetch origin main` et lance `deploy/update.sh` sur un nouveau commit. Provoque un bref redémarrage de conteneur — l'overlay de maintenance le couvre dans l'UI. |
| `UPDATE_REPO_DIR` | `/opt/tesla-carview` | Chemin de l'arbre de travail git sur lequel l'auto-updater opère. |

Recommandé : lancez `deploy/update.sh` manuellement quelques fois, prenez vos repères, puis activez.

---

## ⚙️ Exploitation & performance

| Variable | Défaut | Description |
|---|---|---|
| `PORT` | `3000` | Port TCP du serveur HTTP backend (dans le conteneur). |
| `DB_PATH` | `/app/data/tesla-carview.db` | Chemin de la base legacy — migrée comme tenant `default` au premier boot, puis inutilisée. |
| `ENABLE_POLLER` | `true` | Quand `false` : pas de polling Tesla API cyclique (par ex. pour des réplicas en lecture dédiés). |
| `TESLA_DAILY_CAP` | `30` | Nombre max d'appels `vehicle_data` par véhicule par jour. Persisté en DB — survit aux redémarrages de conteneur. |
| `TESLA_MONTHLY_CAP` | `400` | Nombre max d'appels `vehicle_data` par véhicule par mois. Le polling s'arrête automatiquement lorsque la limite est atteinte. |
| `NODE_ENV` | `production` | Configuration de production standard. `development` active le comportement dev-server. |

---

## 🌐 Frontend (`frontend/.env`)

Intégré dans le bundle au **moment du build**. Changer les valeurs nécessite un rebuild.

| Variable | Défaut | Description |
|---|---|---|
| `VITE_FOOTER_EMAIL` | `''` | E-mail de contact dans le pied de page. Vide = bloc masqué. |
| `VITE_FOOTER_ABOUT_DE` | `''` | URL de la page « à propos de moi » (variante allemande). |
| `VITE_FOOTER_ABOUT_EN` | `''` | URL de la page « à propos de moi » (variante anglaise). |
| `VITE_FOOTER_LINKEDIN_URL` | `''` | Profil LinkedIn de l'opérateur. |

Le fichier est dans `.gitignore`. `frontend/.env.example` est le modèle commité dans le dépôt.

---

## 🖥️ Configuration via l'UI Admin (depuis v3.4.0)

Depuis v3.4.0, la plupart des secrets n'ont plus besoin d'être ajoutés manuellement au `.env`. L'**Assistant d'installation Admin** (Admin Hub → 🛠️) vous guide à chaque étape.

**Contexte technique — pattern DB-avant-env :**
`configService.js` lit chaque valeur d'abord depuis `tenant_settings` (la base SQLite du tenant), puis se replie sur `.env`. Les configurations `.env` existantes continuent de fonctionner sans modification ; une fois qu'une valeur est définie via l'UI, la valeur DB prévaut.

| Réglage | Chemin UI | Variable de repli `.env` |
|---------|---------|--------------------------|
| Tesla Client-ID | Admin Hub → 🛠️ → Identifiants Tesla | `TESLA_CLIENT_ID` |
| Tesla Client-Secret | Admin Hub → 🛠️ → Identifiants Tesla | `TESLA_CLIENT_SECRET` |
| Tesla Audience | Admin Hub → 🛠️ → Identifiants Tesla | `TESLA_AUDIENCE` |
| VAPID Public Key | Admin Hub → 🛠️ → Web Push | `VAPID_PUBLIC_KEY` |
| VAPID Private Key | Admin Hub → 🛠️ → Web Push | `VAPID_PRIVATE_KEY` |
| VAPID Contact | Admin Hub → 🛠️ → Web Push | `VAPID_CONTACT` |
| Telegram Bot Token | Admin Hub → 🛠️ → Telegram | `TELEGRAM_BOT_TOKEN` |
| xAI / Grok API Key | Admin Hub → 🛠️ → APIs externes | `XAI_API_KEY` |
| ABRP Global App Key | Admin Hub → 🛠️ → APIs externes | `ABRP_API_KEY` |

> **Générer les clés VAPID :** Cliquez sur « 🔑 Générer nouveau » dans l'Assistant d'installation Admin — pas besoin de `docker exec`.

> **Telegram Bot :** Nécessite un redémarrage du conteneur après que le token est défini pour la première fois (`docker compose … up -d --build backend`). L'assistant affiche un avis.

---

## Référence rapide : configuration minimale

```bash
# backend/.env (requis)
JWT_SECRET=$(openssl rand -hex 32)
TESLA_CLIENT_ID=…
TESLA_CLIENT_SECRET=…
FRONTEND_URL=https://carview.example.com
RP_NAME="Tesla Carview"
RP_ID=carview.example.com

# Optionnel mais recommandé
VAPID_PUBLIC_KEY=$(npx web-push generate-vapid-keys | grep Public | awk '{print $3}')
VAPID_PRIVATE_KEY=…
VAPID_CONTACT=mailto:you@example.com

# Démo uniquement si vous voulez inviter des testeurs
# DEMO_ENABLED=true

# Mise à jour automatique uniquement après avoir compris le flux de mise à jour
# AUTO_UPDATE_ENABLED=true
```

Après sauvegarde : `docker compose -f docker-compose.prod.yml up -d --build backend` — le backend lit `.env` au boot.

---

## Voir aussi

- [02-deployment.en.md](02-deployment.en.md) — premier déploiement + nginx + Let's Encrypt
- [07-setup-wizard.en.md](07-setup-wizard.en.md) — assistant de configuration interactif
- [11-operations.en.md](11-operations.en.md) — quotidien : sauvegarde, restauration, maintenance, démo
