# Setup-Wizard – Erstkonfiguration

> 🇬🇧 [Read in English](07-setup-wizard.en.md)

Tesla Carview bietet zwei Wege zur **Erst-Installation** und einen In-App-Assistenten für die **laufende Einrichtung**.

---

## In-App-Assistenten {#settings-wizard}

Ab v3.4.0 gibt es **zwei getrennte Assistenten**:

### 1. Persönlicher Einstellungs-Assistent (`SettingsWizard.vue`)

Erscheint automatisch nach dem ersten Login und kann jederzeit über **Einstellungen → 🧙 Assistent starten** erneut aufgerufen werden. Für **alle Benutzer**.

| # | Schritt | Beschreibung |
|---|---------|-------------|
| 1 | **Willkommen** | Überblick |
| 2 | **Sprache** | App-Sprache wählen |
| 3 | **Design** | Design-Stil wählen (Glass, Cyberpunk, Minimal, Sport, Nevs-Edition) |
| 4 | **Akzentfarbe** | Akzentfarbe für Schaltflächen und Navigation |
| 5 | **Einheiten** | km/mi, °C/°F, kWh/100km etc. |
| 6 | **Dashboard** | Karten-Sichtbarkeit und Reihenfolge |
| 7 | **Navigation** | Navigationspunkte sortieren und ausblenden |
| 8 | **Benachrichtigungen** | Web Push abonnieren, Ereignisse auswählen |
| 9 | **Fertig** | Alle Einstellungen werden gespeichert |

### 2. Admin-Setup-Assistent (`AdminSetupWizard.vue`)

Erreichbar über **Admin-Hub → 🛠️ Setup-Assistent**. Nur für **Administratoren**. Führt durch alle System-Konfigurationen — kein SSH oder `.env`-Bearbeiten erforderlich.

| Schritt | Beschreibung |
|---------|-------------|
| **Tesla-Zugangsdaten** | Client-ID, Client-Secret, Audience über UI setzen (in DB gespeichert) |
| **Tesla OAuth** | Tesla-Konto verbinden (Popup → PostMessage-Rückkanal → Auto-Refresh) |
| **Fahrzeuge** | Fahrzeuge aus Tesla-Konto synchronisieren |
| **Virtual Key** | Registrierungs-URL anzeigen/kopieren; Status prüfen |
| **Fleet Telemetry** | Pro VIN konfigurieren; Statusanzeige |
| **Web Push (VAPID)** | VAPID-Keys direkt im Browser generieren oder manuell eingeben |
| **Telegram Bot** | Bot-Token konfigurieren (erfordert Server-Neustart) |
| **Strompreis** | Heimlade-Preis (€/kWh) pro Fahrzeug |
| **Externe APIs** | ABRP, Grok/xAI-Key konfigurieren |
| **Monitoring** | Selbstheilung + Alert-E-Mail konfigurieren |
| **Zusammenfassung** | Statusübersicht; Neustart-Hinweis wenn Telegram konfiguriert |

### Besonderheiten

- **Draft-Modus** (persönlicher Assistent): Änderungen werden erst beim letzten Schritt gespeichert
- **Sofort-Speichern** (Admin-Assistent): Zugangsdaten werden schrittweise in `tenant_settings` (DB) gespeichert
- **Tesla OAuth**: Popup-Fenster; schließt sich nach Anmeldung automatisch
- **VAPID-Generierung**: direkt im Browser ohne `docker exec`
- **Sprachschalter im Header** (alle Wizards): Jeder Wizard zeigt oben rechts einen kompakten 🌐-Schalter. Sprachwahl gilt sofort für alle Wizard-Texte; bei eingeloggten Usern wird die Wahl ins Profil übernommen. Beim Login wird automatisch die im Profil oder Tenant-Default gespeicherte Sprache angewendet.
- **Auto-Init beim Backend-Boot**: VAPID-Keys werden für jeden Mandanten automatisch generiert, falls weder in `tenant_settings` noch in der `.env` vorhanden. Push-Benachrichtigungen funktionieren dadurch sofort nach dem ersten Login — der entsprechende Wizard-Schritt zeigt direkt „✓ bereits eingerichtet (Auto)".
- **Wizard-Prefill** (`GET /api/system/wizard-prefill`): liefert dem Wizard beim Öffnen Defaults (Fleet-API-Audience aus Geo-IP, Alert-E-Mail = Admin-E-Mail, Strompreis-Default je Land) plus Status pro Schritt. Erledigte Schritte werden mit grünem Banner markiert und können direkt übersprungen werden; die Welcome-Übersicht zeigt „X von Y Schritten erledigt".

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
