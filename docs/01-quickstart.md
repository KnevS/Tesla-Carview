# Quickstart – Lokale Entwicklung

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

Die `.env` öffnen und mindestens `JWT_SECRET` auf einen langen Zufallswert setzen:

```bash
# Sicheren Wert generieren:
openssl rand -hex 64
```

Fur Tesla-API-Zugangsdaten siehe [04-tesla-api.md](./04-tesla-api.md).

```bash
npm install
npm run dev
# Backend laeuft auf http://localhost:3000
```

Beim ersten Start wird das Admin-Passwort in der Konsole ausgegeben:
```
========================================================
  ERSTER START - Admin-Zugangsdaten:
  Benutzername : admin
  Passwort     : a3f2c1b9...
  Bitte sofort nach dem Login aendern!
========================================================
```

## 3. Frontend einrichten

```bash
cd frontend
npm install
npm run dev
# Frontend laeuft auf http://localhost:5173
```

## 4. Anmelden

1. http://localhost:5173 aufrufen
2. Mit `admin` und dem Passwort aus Schritt 2 anmelden
3. Passwort unter Einstellungen (⚙️) ändern
4. Optional: MFA einrichten (empfohlen) – siehe [03-authentication.md](./03-authentication.md)

## 5. Tesla verbinden (optional für lokale Tests)

Ohne Tesla-API-Zugangsdaten läuft die App, zeigt aber keine echten Fahrzeugdaten.
Daten können manuell über die REST-API eingespielt werden.

Fur die echte Tesla-Verbindung: [04-tesla-api.md](./04-tesla-api.md)
