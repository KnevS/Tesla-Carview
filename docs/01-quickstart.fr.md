# Démarrage rapide — Développement local

> 🤖 *Cette traduction française est assistée par IA depuis [01-quickstart.en.md](01-quickstart.en.md). Corrections bienvenues via GitHub.*

> 🇩🇪 [Auf Deutsch lesen](01-quickstart.md)

Ce guide met en place un environnement de développement local.
Pour le déploiement en production, voir [02-deployment.en.md](./02-deployment.en.md).

## Prérequis

- **Node.js** 20 ou plus récent
- **Git**

## 1. Cloner le dépôt

```bash
git clone https://github.com/KnevS/Tesla-Carview.git
cd Tesla-Carview
```

## 2. Configurer le backend

```bash
cd backend
cp .env.example .env
```

Ajustez le `.env` — au minimum, définissez `JWT_SECRET` avec une valeur aléatoire longue :

```bash
# générer une valeur sécurisée :
openssl rand -hex 64
```

Pour les identifiants Tesla API, voir [04-tesla-api.en.md](./04-tesla-api.en.md).

```bash
npm install
npm run dev
# le backend tourne sur http://localhost:3000
```

## 3. Configurer le frontend

```bash
cd frontend
npm install
npm run dev
# le frontend tourne sur http://localhost:5173
```

## 4. Assistant d'installation (premier démarrage)

À la première ouverture de http://localhost:5173, vous êtes redirigé automatiquement vers **/setup**.

Vous y créez votre compte administrateur dans le navigateur :
- choisissez un nom d'utilisateur
- définissez un mot de passe fort (≥ 12 caractères)

Alternativement via l'assistant en terminal :
```bash
bash deploy/setup-wizard.sh
```

## 5. Après la connexion

1. Activez le MFA dans les Paramètres (recommandé)
2. Connectez votre véhicule Tesla : [04-tesla-api.en.md](./04-tesla-api.en.md)

## 6. Connecter Tesla (optionnel pour les tests locaux)

Sans identifiants Tesla API, l'app fonctionne entièrement mais n'affiche aucune donnée véhicule réelle.

Pour la vraie connexion Tesla : [04-tesla-api.en.md](./04-tesla-api.en.md)
