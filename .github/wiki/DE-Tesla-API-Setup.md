# Tesla API Setup

🌐 **Language / Sprache**

| | |
|---|---|
| 🇬🇧 **[English](Tesla-API-Setup)** | English version |
| 🇩🇪 **[Deutsch](DE-Tesla-API-Setup)** | Du bist hier |

---

Die Verbindung von Tesla Carview mit deinem Tesla-Konto erfordert einen **Tesla Developer Account** und eine **OAuth-Anwendung**. Dieser Prozess dauert etwa 20–30 Minuten und muss nur einmal durchgeführt werden.

---

## Überblick: Was passiert hier?

Tesla verwendet OAuth 2.0 — denselben Standard wie „Mit Google anmelden". Du erstellst eine App im Tesla Developer Portal, die eine **Client-ID** und ein **Client-Secret** bekommt. Tesla Carview nutzt diese, um mit deiner Genehmigung Zugriff auf deine Fahrzeugdaten anzufordern.

```
Tesla Developer Portal
  → App registrieren → Client-ID + Secret erhalten
  → In Tesla Carview eintragen
  → „Tesla-Konto verbinden" klicken
  → Tesla-Anmeldeseite öffnet sich
  → Du genehmigst den Zugriff
  → Tesla sendet Tokens an Tesla Carview
  → Daten fließen ✅
```

---

## Schritt 1: Tesla Developer Account erstellen

1. Gehe zu [developer.tesla.com](https://developer.tesla.com)
2. Melde dich mit deinem regulären Tesla-Konto an (dasselbe, das du für das Auto verwendest)
3. Entwickler-Nutzungsbedingungen akzeptieren

---

## Schritt 2: Anwendung registrieren

1. Im Developer Portal auf **„Add New Application"** klicken
2. Das Formular ausfüllen:

   | Feld | Was du eingeben sollst |
   |---|---|
   | **Application Name** | Beliebiger beschreibender Name, z.B. „Mein Tesla Carview" |
   | **Description** | „Private self-hosted Tesla data logger" |
   | **Allowed Origin URL** | `https://tesla.meinedomain.de` |
   | **Redirect URI** | `https://tesla.meinedomain.de/api/auth/callback` |
   | **Application Type** | Web Application |

3. Unter **Scopes** auswählen:
   - `vehicle_device_data` — zum Lesen des Fahrzeugstatus
   - `vehicle_cmds` — zum Senden von Befehlen (Klima, Schlösser, etc.)
   - `vehicle_charging_cmds` — für Ladesteuerung
   - `vehicle_location` — GPS-Standort
   - `offline_access` — verbunden bleiben ohne stündliches Neu-Einloggen

4. Auf **Save** klicken

5. **Client-ID** und **Client-Secret** notieren — diese brauchst du im nächsten Schritt

> **Client-Secret vertraulich halten.** Es gehört in deine `.env`-Datei und darf niemals geteilt oder in git committed werden.

---

## Schritt 3: Virtual Key einrichten (für Fahrzeugbefehle)

Der Virtual Key ist Teslas Sicherheitsmechanismus zum Senden von Befehlen ans Auto. Ohne ihn kannst du Daten lesen, aber nichts steuern (kein Klimastart, kein Ver-/Entriegeln).

Tesla Carview generiert einen Schlüssel automatisch. Du musst ihn nur deinem Auto hinzufügen:

1. In Tesla Carview zu **Einstellungen → Virtual Key** gehen
2. Die angezeigte URL kopieren (sieht aus wie `https://tesla.meinedomain.de/api/virtual-key/pair`)
3. Diese URL im **Tesla-Browser auf dem Touchscreen deines Autos** öffnen (nicht auf deinem Handy)
4. Auf dem Autobildschirm auf **„Add key"** tippen
5. Mit der Tesla-App auf deinem Handy bestätigen (sie fragt dich, den neuen Schlüssel zu genehmigen)

Nach dem Pairing funktionieren Befehle (Klima, Schlösser, etc.) aus Tesla Carview heraus.

---

## Schritt 4: Zugangsdaten in Tesla Carview eintragen

1. In Tesla Carview zu **Admin → System** gehen
2. **Client-ID** und **Client-Secret** eingeben
3. Auf **Speichern** klicken

Oder direkt in der `.env`-Datei:

```bash
nano /opt/tesla-carview/backend/.env
```

```env
TESLA_CLIENT_ID=deine-client-id-hier
TESLA_CLIENT_SECRET=dein-client-secret-hier
TESLA_REDIRECT_URI=https://tesla.meinedomain.de/api/auth/callback
```

Dann neu starten:
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d
```

---

## Schritt 5: Tesla-Konto verbinden

1. In Tesla Carview zu **Dashboard → Tesla-Konto verbinden** gehen (oder die Aufforderung beim ersten Login)
2. Auf **„Mit Tesla verbinden"** klicken
3. Du wirst zur Tesla-Anmeldeseite weitergeleitet — melde dich mit deinem Tesla-Konto an
4. Tesla fragt, welchem Fahrzeug der Zugriff gewährt werden soll — wähle dein Auto
5. Du wirst zurück zu Tesla Carview geleitet — die Verbindung ist hergestellt ✅

Die App fragt nun standardmäßig alle 30 Sekunden Fahrzeugdaten ab wenn das Auto aktiv ist, und wechselt in den Heartbeat-Modus wenn das Fahrzeug schläft (um die Batterie zu schonen).

---

## Datenquellen: Telemetry-first

Seit 2026-05 priorisiert Tesla Carview **Fleet Telemetry (Push-Daten)** gegenüber dem Polling:

| Pfad | Latenz | Kosten |
|---|---|---|
| **1. Fleet Telemetry (WebSocket Push)** | 1–5 Sek live | kostenlos |
| **2. Fleet API Polling (Pull)** | 30s aktiv / 5min idle | budgetpflichtig |
| **3. Heartbeat-Polling** | 1×/h | minimal |

> Fleet Telemetry erfordert eine Genehmigung pro Client-ID im Tesla Developer Portal. Ohne Genehmigung funktioniert der Fallback-Polling-Pfad weiterhin.

---

## Polling-Intervall anpassen

```env
POLL_INTERVAL_MS=60000        # 60 Sekunden (Standard)
POLL_SLEEP_INTERVAL_MS=600000 # 10 Minuten im Schlaf-Modus
```

---

## Häufige Probleme

### „403 Forbidden" bei allen Tesla API-Aufrufen

Dein Tesla Developer Account ist möglicherweise **gesperrt oder rate-limitiert**. Das passiert wenn:
- Zu viele API-Aufrufe gemacht wurden (Throttling)
- Deine Abrechnungsdaten im Developer Portal unvollständig sind
- Tesla das Konto markiert hat

Überprüfe [developer.tesla.com](https://developer.tesla.com) — wenn du eine Abrechnungs- oder Sperrbenachrichtigung siehst, löse das zuerst.

### Fahrzeug zeigt „offline" obwohl es fährt

Teslas API hat eine bekannte Einschränkung: Einige neuere Fahrzeuge (insbesondere mit XP7-VINs wie das Model Y Juniper) geben keine GPS-Daten über den Standard-Endpunkt zurück. Tesla Carview verwendet für diese Fahrzeuge Fleet Telemetry — das wird automatisch konfiguriert.

### Befehle funktionieren nicht („Virtual Key not paired")

→ Schritt 3 oben wiederholen. Stelle sicher, dass du die Pairing-URL im **Tesla-Browser** geöffnet hast (nicht auf deinem Handy oder Computer).

### „Redirect URI mismatch"

Die Redirect-URI im Tesla Developer Portal muss **exakt** übereinstimmen — einschließlich `https://`, der korrekten Domain und ohne abschließenden Schrägstrich.

---

## Siehe auch

- [Konfiguration](DE-Configuration) — Alle `.env`-Variablen für die Tesla API
- [Erster Login](DE-First-Login) — Tesla-Konto nach dem Setup verbinden
- [Fehlerbehebung](DE-Troubleshooting) — Tesla API Probleme lösen

---

*Dieses Wiki wird automatisch aus dem Repository generiert. Zuletzt aktualisiert: siehe [Commits](https://github.com/KnevS/Tesla-Carview/commits/main).*
