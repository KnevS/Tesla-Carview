# Tesla Carview

Eine selbst gehostete Tesla-Datenlogger-Lösung ähnlich [TeslaLogger](https://teslalogger.de).

## Features

- **Dashboard** – Übersicht über Fahrzeugstatus, Verbrauch, letzte Fahrt
- **Fahrten** – GPS-Aufzeichnung, Verbrauch, Dauer, Strecke
- **Laden** – Ladevorgänge, Ladekurven, Kosten, Effizienz
- **Batterie** – Degradations-Tracking, Reichweite, Zellgesundheit
- **Betriebsbuch** – Notizen, Wartungen, Ereignisse zum Fahrzeug

## Tech Stack

| Bereich | Technologie |
|---|---|
| Frontend | Vue 3 + Vite + Pinia + Tailwind CSS |
| Backend | Node.js + Express |
| Datenbank | SQLite (via better-sqlite3) |
| API | Tesla Fleet API (OAuth2) |
| Charts | Chart.js |
| Karte | Leaflet.js |

## Schnellstart mit Docker

```bash
cp backend/.env.example backend/.env
# .env mit Tesla API Credentials befüllen
docker compose up -d
```

Die App ist dann erreichbar unter: http://localhost:5173

## Lokale Entwicklung

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Tesla Fleet API einrichten

1. Tesla Developer Account erstellen: https://developer.tesla.com
2. App registrieren und Client ID + Secret erhalten
3. Redirect URI setzen: `http://localhost:3000/api/auth/callback`
4. Credentials in `backend/.env` eintragen

## Projektstruktur

```
tesla-carview/
├── backend/           # Node.js + Express API
│   ├── src/
│   │   ├── routes/    # API-Routen
│   │   ├── services/  # Tesla API, DB-Services
│   │   └── db/        # Datenbank-Schema und Setup
│   └── package.json
├── frontend/          # Vue 3 App
│   ├── src/
│   │   ├── views/     # Seiten (Dashboard, Fahrten, etc.)
│   │   ├── components/# Wiederverwendbare Komponenten
│   │   ├── store/     # Pinia Stores
│   │   └── router/    # Vue Router
│   └── package.json
└── docker-compose.yml
```
