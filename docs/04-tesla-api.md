# Tesla Fleet API einrichten

> 🇬🇧 [Read in English](04-tesla-api.en.md)

## Datenquellen-Strategie (Telemetry-first, Polling als Fallback)

Seit der Hybrid-Poller-Umstellung (2026-05) priorisiert Tesla Carview
**Fleet Telemetry (Push)** über das Polling. Beide Pfade sind aktiv,
aber der Poller schaltet automatisch in den Heartbeat-Modus, sobald
Telemetry für ein Fahrzeug streamt:

| Pfad | Latenz | Kosten | Voraussetzung |
|---|---|---|---|
| **1. Fleet Telemetry (WebSocket Push)** | 1–5 Sek live | kostenlos | Approved Virtual Key + HTTPS-Endpoint + Tesla-Whitelisting der VIN |
| **2. Fleet API Polling (Pull)** | 30s online / 5min idle | $-Budget pro Call | Nur OAuth-Token |
| **3. Heartbeat-Polling** | 1×/h | minimal | Greift automatisch wenn Telemetry für eine VIN aktiv ist |

Implementierung: `backend/src/services/poller.js`, Streaming-Server in
`backend/src/services/fleetTelemetry.js`, Status-Indikator pro VIN in
Settings → ⚡ Tesla-Verbindung → 📡 Fleet Telemetrie.

> Fleet Telemetry erfordert Approval pro **Application-Client-ID** im
> Tesla Developer Portal. Ohne Approval liefert die Konfigurations-API
> HTTP 404 — der Fallback-Polling-Pfad funktioniert weiterhin.

## Tesla Developer Account erstellen

1. Auf https://developer.tesla.com einen Account erstellen
2. Eine neue Application anlegen:
   - **Name**: Tesla Carview (oder beliebig)
   - **Allowed Origins**: `https://deine-domain.de`
   - **Allowed Redirect URIs**: `https://deine-domain.de/api/auth/callback`
3. **Client ID** und **Client Secret** notieren


---

## Partner-Registrierung — automatisch über den Wizard (empfohlen)

Seit **v3.23.5** musst du die App **nicht mehr von Hand per `curl` bei Tesla
registrieren**. Der Einrichtungs-Assistent (Admin-Hub → 🛠️) erledigt das
selbst:

1. Im Schritt **„Tesla Fleet-API Zugangsdaten"** Client ID + Client Secret
   eintragen (aus dem [Tesla Developer Portal](https://developer.tesla.com)).
2. TeslaView zeigt darunter die **erkannte Domain** deiner Instanz zur
   einmaligen Bestätigung an.
3. Auf **„🔑 Jetzt bei Tesla registrieren"** klicken — oder einfach „Weiter",
   dann registriert der Wizard automatisch.

Im Hintergrund holt der Server ein `client_credentials`-Token und ruft
`POST /api/1/partner_accounts` mit deiner Domain auf — exakt das, was sonst
ein manueller `curl`-Aufruf täte. Erfolg wird gemerkt (》✓ Registriert für
`<domain>`《); bei einem Domain-Wechsel bietet der Wizard eine erneute
Registrierung an.

> Endpoint: `POST /api/fleet/partner/register`. Auch über
> Admin-Einstellungen → ⚡ Tesla-Verbindung erreichbar.

### Sicherheits-Hygiene

Die Automatik ist bewusst so gebaut, dass dabei keine Geheimnisse leaken
oder Fehlkonfigurationen entstehen können:

- **Das Client Secret verlässt nie den Server.** Es wird verschlüsselt in
  `tenant_settings` gespeichert (Schlüssel: `data/.encryption-key`),
  serverseitig gelesen und ausschließlich an Teslas Token-Endpoint
  geschickt — niemals an den Browser zurückgegeben.
- **Die Domain ist nicht frei wählbar.** Registriert wird immer die
  Betriebs-Domain (`FRONTEND_URL`); ein vom Browser mitgeschickter Wert
  dient nur als Fallback, falls `FRONTEND_URL` fehlt. Das verhindert, dass
  versehentlich eine falsche Domain registriert wird — Tesla verifiziert
  sie ohnehin, indem es den Public-Key unter
  `https://<domain>/.well-known/appspecific/com.tesla.3p.public-key.pem`
  abruft.
- **Nur Admins** können die Registrierung auslösen.
- **Idempotent.** Ein erneuter Aufruf ist gefahrlos — Tesla aktualisiert
  einfach den vorhandenen Eintrag.

> Wer lieber per `.env` arbeitet, kann die Credentials weiterhin dort setzen
> (siehe unten) — der Wizard übernimmt sie dann automatisch.

---

## .env konfigurieren

```env
TESLA_CLIENT_ID=deine-client-id
TESLA_CLIENT_SECRET=dein-client-secret
TESLA_REDIRECT_URI=https://deine-domain.de/api/auth/callback
TESLA_AUDIENCE=https://fleet-api.prd.na.vn.cloud.tesla.com
```

> **Regionen**:
> - Nordamerika: `fleet-api.prd.na.vn.cloud.tesla.com`
> - Europa: `fleet-api.prd.eu.vn.cloud.tesla.com`
>
> Wähle die Region passend zum Standort deines Fahrzeugs.

---

## Tesla-Fahrzeug verbinden

Nach dem Login in der App auf den Link **"Tesla verbinden"** klicken
(oder direkt: `https://deine-domain.de/api/auth/tesla/login`).

Du wirst zur Tesla-Anmeldeseite weitergeleitet. Nach der Genehmigung
wird das Fahrzeug automatisch erkannt und die Synchronisation gestartet.

---

## Berechtigungen (OAuth Scopes)

| Scope | Zweck |
|---|---|
| `openid` | Tesla-Identity |
| `offline_access` | Refresh-Token (kein erneutes Login) |
| `vehicle_device_data` | Fahrtdaten, Ladestatus, Batterie lesen |
| `vehicle_cmds` | Fahrzeugbefehle (nur mit Virtual Key) |
| `vehicle_charging_cmds` | Lade-Befehle |
| `vehicle_location` | GPS-Standort |

---

## Fahrzeugbefehle (Virtual Key)

Für Befehle wie Klimaanlage, Hupen oder Türen ist zusätzlich ein **Virtual Key** nötig.
Der Proxy `tesla-http-proxy` signiert die Befehle kryptografisch – Tesla akzeptiert nur
Befehle, die mit dem gepairten Schlüssel signiert sind.

### Setup-Schritte

1. **Schlüsselpaar generieren**:
   ```bash
   openssl ecparam -name prime256v1 -genkey -noout -out tesla_priv.pem
   openssl ec -in tesla_priv.pem -pubout -out tesla_pub.pem
   ```

2. **Öffentlichen Schlüssel bereitstellen** unter:
   `https://deine-domain.de/.well-known/appspecific/com.tesla.3p.public-key.pem`

3. **`tesla-http-proxy` installieren** und starten:
   ```bash
   # Binary von https://github.com/teslamotors/vehicle-command herunterladen
   tesla-http-proxy -port 4443 -host 0.0.0.0 \
     -tls-key server.key -cert server.crt \
     -key-file tesla_priv.pem
   ```

4. **Virtual Key am Fahrzeug registrieren** über die App (Einstellungen → Virtual Key).

> **Wichtig**: Der Private Key (`tesla_priv.pem`) und der öffentliche Schlüssel
> (`.well-known/…`) müssen dauerhaft übereinstimmen. Ein neuer Private Key erfordert
> eine neue Pairing-Aktion am Fahrzeug.


---

## Polling-Intervall

Der eingebaute Poller fragt die Tesla-API ab:
- **Alle 30 Sekunden** wenn das Fahrzeug aktiv ist (fährt oder lädt)
- **Alle 5 Minuten** wenn das Fahrzeug schläft (Status 408)

Das Fahrzeug wird durch den Poller **nicht aufgeweckt** – der Schlafstatus wird
respektiert um den Akku zu schonen.

Poller deaktivieren (z.B. für Tests): `ENABLE_POLLER=false` in der `.env`.

---

## XP7-VIN Besonderheit

Fahrzeuge mit VIN-Präfix `XP7` (z.B. Model Y Juniper) unterstützen den
`?endpoints=…`-Parameter bei `/vehicle_data` nicht.

**Workaround**: `/vehicle_data` ohne `endpoints`-Parameter aufrufen –
gibt `charge_state`, `climate_state` und `vehicle_state` zurück.

GPS via `drive_state` ist bei diesen Fahrzeugen über die REST-API nicht verfügbar;
GPS kommt stattdessen aus Fleet Telemetry.
