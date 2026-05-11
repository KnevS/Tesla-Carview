# Quickstart – Lokale Entwicklung

> 🇬🇧 [Read in English](01-quickstart.en.md)

Diese Anleitung richtet eine lokale Entwicklungsumgebung ein.
Für das Produktiv-Deployment lies [02-deployment.md](./02-deployment.md).

## Voraussetzungen

- **Node.js** 20 oder neuer
- **Git**

## 1. Repository klonen

```bash
git clone https://github.com/KnevS/Tesla-Carview.git
cd Tesla-Carview
```

## 2. Backend einrichten

```bash
cd backend
cp .env.example .env
```

Die `.env` anpassen – mindestens `JWT_SECRET` auf einen langen Zufallswert setzen:

```bash
# Sicheren Wert generieren:
openssl rand -hex 64
```

Für Tesla-API-Zugangsdaten siehe [04-tesla-api.md](./04-tesla-api.md).

```bash
npm install
npm run dev
# Backend läuft auf http://localhost:3000
```

## 3. Frontend einrichten

```bash
cd frontend
npm install
npm run dev
# Frontend läuft auf http://localhost:5173
```

## 4. Setup-Wizard (erster Start)

Beim ersten Öffnen von http://localhost:5173 wirst du automatisch auf **/setup** weitergeleitet.

Dort legst du im Browser deinen Administrator-Account an:
- Benutzername wählen
- Sicheres Passwort setzen (mind. 12 Zeichen)

Alternativ über den Terminal-Assistenten:
```bash
bash deploy/setup-wizard.sh
```

## 5. Nach dem Login

1. MFA unter Einstellungen aktivieren (empfohlen)
2. Tesla-Fahrzeug verbinden: [04-tesla-api.md](./04-tesla-api.md)

## 6. Tesla verbinden (optional für lokale Tests)

Ohne Tesla-API-Zugangsdaten läuft die App vollständig, zeigt aber keine echten Fahrzeugdaten.

Für die echte Tesla-Verbindung: [04-tesla-api.md](./04-tesla-api.md)
