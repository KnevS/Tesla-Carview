# Quickstart — Local development

> 🇩🇪 [Auf Deutsch lesen](01-quickstart.md)

This guide sets up a local development environment.
For production deployment, see [02-deployment.en.md](./02-deployment.en.md).

## Prerequisites

- **Node.js** 20 or newer
- **Git**

## 1. Clone the repository

```bash
git clone https://github.com/KnevS/Tesla-Carview.git
cd Tesla-Carview
```

## 2. Set up the backend

```bash
cd backend
cp .env.example .env
```

Adjust the `.env` — at minimum set `JWT_SECRET` to a long random value:

```bash
# generate a secure value:
openssl rand -hex 64
```

For Tesla API credentials see [04-tesla-api.en.md](./04-tesla-api.en.md).

```bash
npm install
npm run dev
# backend runs on http://localhost:3000
```

## 3. Set up the frontend

```bash
cd frontend
npm install
npm run dev
# frontend runs on http://localhost:5173
```

## 4. Setup wizard (first start)

When you first open http://localhost:5173 you are redirected automatically to **/setup**.

There you create your administrator account in the browser:
- choose a username
- set a strong password (≥ 12 characters)

Alternatively via the terminal assistant:
```bash
bash deploy/setup-wizard.sh
```

## 5. After logging in

1. Enable MFA under Settings (recommended)
2. Connect your Tesla vehicle: [04-tesla-api.en.md](./04-tesla-api.en.md)

## 6. Connect Tesla (optional for local testing)

Without Tesla API credentials the app runs fully but does not show real vehicle data.

For the real Tesla connection: [04-tesla-api.en.md](./04-tesla-api.en.md)
