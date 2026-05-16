# Setup-Wizard – Erstkonfiguration

> 🇬🇧 [Read in English](07-setup-wizard.en.md)

Tesla Carview bietet zwei Wege zur **Erst-Installation** und einen In-App-Assistenten für die **laufende Einrichtung**.

---

## In-App-Einstellungs-Assistent {#settings-wizard}

Nach dem ersten Login erscheint automatisch der **Einstellungs-Assistent** (für Admins mit 17 Schritten, für normale Nutzer mit 9 Schritten). Er kann jederzeit über **Einstellungen → Assistent starten** erneut geöffnet werden.

### Admin-Schritte (in Reihenfolge)

| # | Schritt | Beschreibung |
|---|---------|-------------|
| 1 | **Sprache** | App-Sprache auswählen |
| 2 | **Tesla OAuth** | Tesla-Konto verbinden (Popup → PostMessage-Rückkanal → Auto-Refresh) |
| 3 | **Fahrzeuge** | Fahrzeuge aus Tesla-Konto synchronisieren |
| 4 | **Virtual Key** | Registrierungs-URL anzeigen/kopieren; Status prüfen |
| 5 | **Fleet Telemetry** | Pro VIN konfigurieren; Statusanzeige (live/idle/ausstehend/Fehler) |
| 6 | **Strompreis** | Heimlade-Preis (€/kWh) pro Fahrzeug; für Kostenberechnung |
| 7 | **Legal-Check** | Scan auf `<<Platzhalter>>` in allen 18 Scope×Locale-Einträgen |
| 8 | **Externe APIs** | OCM-, HERE- und Grok/xAI-Keys konfigurieren |
| 9 | **Monitoring** | Selbstheilung + Alert-E-Mail konfigurieren |
| 10–15 | **Präferenzen** | Design, Farbe, Einheiten, Dashboard, Navigation, Benachrichtigungen |
| 16 | **Zusammenfassung** | Alle Änderungen prüfen und gemeinsam speichern |

### Besonderheiten

- **Draft-Modus**: Alle Änderungen werden erst beim letzten Schritt ("Speichern & Anwenden") übernommen
- **Überspringen**: Jeder Schritt kann übersprungen werden
- **Tesla OAuth**: Öffnet ein Popup-Fenster; nach erfolgreicher Anmeldung schließt sich das Popup automatisch und der Status im Wizard aktualisiert sich via `postMessage`
- **Strompreis**: Wird pro Fahrzeug gesetzt und beim Confirm via `PUT /api/vehicles/:id` gespeichert
- **Legal-Check**: Liest `/api/legal/admin/all` und sucht nach dem Muster `/<<[^>]+>>/g`

---

Tesla Carview bietet zwei Wege zur Erstkonfiguration.

## Web-Wizard (empfohlen)

Beim ersten Start erkennt die App automatisch, dass noch kein Administrator-Account existiert,
und leitet den Browser auf **/setup** weiter.

### Schritte

1. **Willkommen** – Überblick über das System
2. **Administrator-Konto anlegen** – Benutzername und sicheres Passwort setzen
3. **Fertig** – Weiterleitung zum Login

Der Web-Wizard ist unter `/setup` nur erreichbar, solange noch kein Admin existiert.
Danach wird die Seite automatisch gesperrt.

## Terminal-Wizard

```bash
bash deploy/setup-wizard.sh
```

Fragt interaktiv:

| Parameter | Beschreibung | Beispiel |
|---|---|---|
| Öffentliche URL | Vollständige URL der Anwendung | `https://tesla.example.com` |
| Tesla Client-ID | Aus dem Tesla Developer Portal | `abc123...` |
| Tesla Client-Secret | Aus dem Tesla Developer Portal | `xyz456...` |
| Datenbank-Pfad | SQLite-Datei | `./data/tesla-carview.db` |
| E-Mail | Für Let's Encrypt | `admin@example.com` |
| VAPID Keys | Für Web-Push (optional) | leer lassen = deaktiviert |

Das Script schreibt alles in `backend/.env` und setzt die Dateirechte auf `600` (nur Eigentümer lesbar).

## Konfiguration später ändern

```bash
# Terminal-Wizard erneut ausführen (überschreibt .env):
bash deploy/setup-wizard.sh

# Oder direkt bearbeiten:
nano /opt/tesla-carview/backend/.env

# Danach Container neu starten:
docker compose -f docker-compose.prod.yml up -d
```

## Alle Parameter

Vollständige Liste aller Umgebungsvariablen in `backend/.env.example`:

| Variable | Pflicht | Beschreibung |
|---|---|---|
| `PORT` | – | Backend-Port (Standard: 3000) |
| `JWT_SECRET` | ✓ | Zufälliger String ≥ 64 Zeichen |
| `FRONTEND_URL` | ✓ | Öffentliche URL der App |
| `TESLA_CLIENT_ID` | ✓* | Tesla Fleet API Client-ID |
| `TESLA_CLIENT_SECRET` | ✓* | Tesla Fleet API Client-Secret |
| `TESLA_REDIRECT_URI` | ✓* | OAuth-Callback-URL |
| `TESLA_AUDIENCE` | – | Tesla API Region (Standard: NA) |
| `DB_PATH` | – | Pfad zur SQLite-Datei |
| `ENABLE_POLLER` | – | Fahrzeugdaten-Poller an/aus |
| `ADMIN_EMAIL` | – | E-Mail für Let's Encrypt |
| `VAPID_PUBLIC_KEY` | – | Web-Push Public Key |
| `VAPID_PRIVATE_KEY` | – | Web-Push Private Key |

*Nur erforderlich wenn Tesla-Fahrzeug verbunden werden soll.

## VAPID-Keys generieren

```bash
npx web-push generate-vapid-keys
```
