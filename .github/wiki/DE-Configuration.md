# Konfiguration — Umgebungsvariablen

🌐 **Sprache / Language:** [EN](Configuration) · [FR](FR-Configuration) · [ES](ES-Configuration) · [TR](TR-Configuration) · [EL](EL-Home) · **DE**

---

Alle Tesla Carview Einstellungen werden über die `.env`-Datei unter `/opt/tesla-carview/backend/.env` konfiguriert. Als Vorlage dient `backend/.env.example` im Repository.

Nach jeder Änderung an `.env` das Backend neu starten:
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d --build backend
```

---

## Pflicht-Variablen (müssen gesetzt sein, damit die App funktioniert)

| Variable | Beispiel | Beschreibung |
|---|---|---|
| `JWT_SECRET` | `openssl rand -hex 32` | Geheimer Schlüssel für JWT-Tokens. **Mindestens 32 Zeichen, kryptografisch zufällig.** Darf sich im laufenden Betrieb nicht ändern — sonst werden alle Sessions ungültig. |
| `TESLA_CLIENT_ID` | `abc123...` | Aus dem [Tesla Developer Portal](https://developer.tesla.com) |
| `TESLA_CLIENT_SECRET` | `xyz789...` | Aus dem Tesla Developer Portal |
| `TESLA_AUTH_BASE` | `https://auth.tesla.com/oauth2/v3` | Tesla OAuth Basis-URL — wird vom Setup-Wizard automatisch gesetzt; nur ändern wenn Tesla den Auth-Endpunkt ändert |
| `FRONTEND_URL` | `https://tesla.meinedomain.de` | Die öffentliche URL deiner Installation — wird für OAuth-Callback und Passkey-Registrierung benötigt |
| `RP_NAME` | `Tesla Carview` | Anzeigename in Passkey-Dialogen |
| `RP_ID` | `tesla.meinedomain.de` | Domain für WebAuthn (ohne Protokoll, muss zu `FRONTEND_URL` passen) |

---

## Optional, aber empfohlen

| Variable | Standard | Beschreibung |
|---|---|---|
| `AUTO_UPDATE_ENABLED` | `false` | Auf `true` setzen für nächtliche Auto-Updates (~03:30 Europe/Berlin) |
| `MFA_REQUIRED_FOR_NEW_USERS` | `false` | MFA-Pflicht für alle neuen Benutzerkonten erzwingen |
| `REGISTRATION_REQUIRES_INVITE` | `false` | Einladungscode für neue Tenant-Registrierungen verlangen |
| `POLL_INTERVAL_MS` | `60000` | Wie oft die Tesla API abgefragt wird wenn das Auto aktiv ist (ms) |
| `POLL_SLEEP_INTERVAL_MS` | `600000` | Abfrageintervall wenn das Auto schläft (ms) |

---

## Tesla Fleet API

| Variable | Standard | Beschreibung |
|---|---|---|
| `TESLA_REDIRECT_URI` | `${FRONTEND_URL}/api/auth/callback` | OAuth-Redirect-URI. Muss exakt im Tesla Developer Portal eingetragen sein. |
| `TESLA_API_HOST` | `fleet-api.prd.eu.vn.cloud.tesla.com` | Region-spezifischer Tesla-API-Endpoint. Nordamerika: `fleet-api.prd.na.vn.cloud.tesla.com` |
| `TESLA_PROXY_HOST` | `host.docker.internal:4443` | Adresse des `tesla-http-proxy` für signierte Fahrzeugbefehle |

---

## Web Push (Benachrichtigungen)

VAPID-Keys werden für Push-Benachrichtigungen benötigt (z.B. „Laden abgeschlossen"). Ohne diese Variablen funktionieren Pushes nicht, der Rest der App läuft normal.

| Variable | Standard | Beschreibung |
|---|---|---|
| `VAPID_PUBLIC_KEY` | — | Public Key, generierbar mit `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | — | Private Key (gleichzeitig erzeugt) |
| `VAPID_CONTACT` | `mailto:noreply@example.com` | Kontakt-URI für Push-Service (idealerweise eigene E-Mail) |

---

## Dynamischer Stromtarif

| Variable | Beschreibung |
|---|---|
| `AWATTAR_ENABLED` | `true`/`false` — aWATTar aktivieren (DE/AT, kostenlos, kein API-Key nötig) |
| `TIBBER_TOKEN` | Dein Tibber API-Token (erhältlich unter [developer.tibber.com](https://developer.tibber.com)) |

---

## Demo-Modus

| Variable | Standard | Beschreibung |
|---|---|---|
| `DEMO_ENABLED` | `false` | Demo-Mandant mit Fake-Daten aktivieren — zeigt „Demo starten"-Button auf der Login-Seite |
| `DEMO_MAX_CONCURRENT` | `10` | Maximale gleichzeitig aktive Demo-Nutzer |
| `DEMO_LIFETIME_DAYS` | `14` | Wie lange Demo-Accounts existieren |

---

## Erweitert / Fleet Telemetry

Fleet Telemetry liefert **Echtzeit-GPS und Telemetriedaten**, die direkt vom Auto an den Server gesendet werden — statt die Tesla API jede Minute abzufragen. Für die meisten Installationen optional, bei neueren Tesla-Modellen empfohlen oder erforderlich.

**Wann Fleet Telemetry wichtig wird:**
- Neuere Modelle (z.B. Model Y Juniper, VINs mit XP7-Prefix) geben über die normale Polling-API keine GPS-Daten mehr zurück — Fleet Telemetry ist dann der einzige Weg, Live-Standortdaten zu erhalten.
- Bei älteren Modellen ist es ein optionales Upgrade: weniger API-Last, schnellere Daten, Echtzeit-Positionsaktualisierungen.

**Voraussetzungen:**
1. Der Virtual Key muss zuerst gepairt sein (siehe [Tesla API Setup](DE-Tesla-API-Setup#schritt-3-virtual-key-für-befehle-einrichten))
2. Fleet Telemetry muss **für deine Client-ID im [Tesla Developer Portal](https://developer.tesla.com) genehmigt** werden — das ist ein eigener Genehmigungsschritt zusätzlich zum normalen API-Zugang. Antrag unter deinen App-Einstellungen stellen.

| Variable | Beschreibung |
|---|---|
| `FLEET_TELEMETRY_ENABLED` | `true`/`false` — Echtzeit-GPS via Fleet Telemetry aktivieren |
| `FLEET_TELEMETRY_PORT` | Port für Fleet Telemetry Server (Standard: 4443) |
| `VIRTUAL_KEY_PRIVATE_KEY_PATH` | Pfad zur Virtual-Key-Privat-Key-Datei |

---

## Betrieb & Performance

| Variable | Standard | Beschreibung |
|---|---|---|
| `PORT` | `3000` | TCP-Port des Backend-HTTP-Servers (im Container) |
| `ENABLE_POLLER` | `true` | Wenn `false`: kein zyklisches Tesla-API-Polling |
| `NODE_ENV` | `production` | Standard-Produktiv-Setup |

---

## Sicheren JWT_SECRET generieren

```bash
openssl rand -hex 32
# Ausgabe: z.B. a8f3e9b2c1d4...
# Diesen Wert in die .env-Datei kopieren
```

---

## Aktuelle Konfiguration prüfen

```bash
# Aktuelle .env ansehen (Vorsicht beim Teilen — enthält Secrets):
cat /opt/tesla-carview/backend/.env

# Welche Umgebungsvariablen der laufende Container sieht:
docker compose -f /opt/tesla-carview/docker-compose.prod.yml exec backend env | grep -v PASSWORD | grep -v SECRET
```

---

## Minimal-Setup Schnellreferenz

```bash
# backend/.env (Pflicht)
JWT_SECRET=$(openssl rand -hex 32)
TESLA_CLIENT_ID=…
TESLA_CLIENT_SECRET=…
FRONTEND_URL=https://tesla.meinedomain.de
RP_NAME="Tesla Carview"
RP_ID=tesla.meinedomain.de

# Optional, aber empfohlen
VAPID_PUBLIC_KEY=…
VAPID_PRIVATE_KEY=…
VAPID_CONTACT=mailto:du@example.com
```

Nach dem Speichern: `docker compose -f docker-compose.prod.yml up -d --build backend`

---

## In-App-Konfiguration (Admin → Admin-Einstellungen)

Einige Einstellungen erfordern keine `.env`-Änderungen — sie werden direkt in der Admin-Oberfläche konfiguriert und in der Datenbank gespeichert. Diese Einstellungen überstehen Updates und erfordern keinen Container-Neustart.

| Einstellung | Ort | Hinweis |
|---|---|---|
| SMTP / E-Mail-Versand | Admin → Admin-Einstellungen → E-Mail | Host, Port, Benutzer, Passwort, Absender — inkl. Test-Mail-Button |
| OpenChargeMap API-Key | Admin → Admin-Einstellungen → Externe APIs | Ladestation-Overlay im Routenplaner — kostenlos, Registrierung unter [openchargemap.io/site/develop](https://openchargemap.io/site/develop#api) |
| HERE Maps API-Key | Admin → Admin-Einstellungen → Externe APIs | Echtzeit-Verkehr im Routenplaner — kostenloses Kontingent (250 k Req/Monat), Registrierung unter [developer.here.com](https://developer.here.com) |
| xAI API-Key | Admin → Admin-Einstellungen → Externe APIs | Grok Chat KI-Assistent |
| Anthropic API-Key | Admin → Admin-Einstellungen → Monitoring | KI-gestützter Autofix (Claude Haiku) — siehe unten |
| Selbstheilung (Heal) | Admin → Admin-Einstellungen → Monitoring | Automatischen Container-Neustart aktivieren/deaktivieren |
| Alert-E-Mail-Adresse | Admin → Admin-Einstellungen → Monitoring | Wohin Monitoring-Alerts gesendet werden |
| Monta-Zugangsdaten | Einstellungen → Fahrzeugprofil → Heimladen | Pro Fahrzeug: Client ID, Client Secret, Charge-Point-ID — für alle Fahrzeugkategorien verfügbar |
| Strompreis pro kWh | Einstellungen → Fahrzeugprofil oder Setup-Wizard | Energiekosten pro Fahrzeug für Ladekosten-Berechnung |

Alle oben genannten Einstellungen können auch während des **Setup-Wizards** konfiguriert werden — kein direkter Serverzugriff nötig.

### Wofür ist der Anthropic API-Key?

Tesla Carview enthält ein zweistufiges Selbstheilungs-Monitoring, das automatisch auf dem Server läuft:

- **Stufe 1 — Regelbasierter Autofix** (alle 20 Minuten): Behandelt bekannte, deterministische Probleme — gestoppte Container neu starten, volle Disks leeren, Dateirechte korrigieren. Kein KI-Key nötig, immer aktiv.
- **Stufe 2 — KI-Autofix** *(optional)*: Greift, wenn Stufe 1 das Problem nicht lösen kann. Schickt das Fehler-Log an Claude Haiku (Anthropic) und lässt einen Fix vorschlagen oder direkt anwenden — als leistungsfähiger Fallback für unbekannte Probleme.

> **Stufe 2 ist vollständig optional und kann einfach weggelassen werden.** Das System heilt sich mit Stufe 1 allein zuverlässig selbst — für die meisten Installationen reicht das völlig aus. Wer keinen Anthropic-Key einträgt, erhält stattdessen bei unlösbaren Problemen eine E-Mail-Benachrichtigung.

Key beantragen unter [console.anthropic.com](https://console.anthropic.com) (pay-per-use, Claude Haiku ist sehr günstig — typisch wenige Cent pro Monat für gelegentliche Autofix-Aufrufe).

---

## Vollständige Referenz

Eine vollständige Liste aller Umgebungsvariablen mit detaillierten Beschreibungen findest du in der technischen Dokumentation:
[docs/10-configuration.en.md](https://github.com/KnevS/Tesla-Carview/blob/main/docs/10-configuration.en.md)

---

## Siehe auch

- [Installationsanleitung](DE-Installation) — Erstmaliges Deployment
- [Erster Login](DE-First-Login) — Setup-Wizard nach der Installation
- [Backup & Wiederherstellung](DE-Backup-and-Restore) — Daten sichern

---

*Dieses Wiki wird automatisch aus dem Repository generiert. Zuletzt aktualisiert: siehe [Commits](https://github.com/KnevS/Tesla-Carview/commits/main).*
