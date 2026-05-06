# Tesla Fleet API einrichten

## Tesla Developer Account erstellen

1. Auf https://developer.tesla.com einen Account erstellen
2. Eine neue Application anlegen:
   - **Name**: Tesla Carview (oder beliebig)
   - **Allowed Origins**: `https://deine-domain.de`
   - **Allowed Redirect URIs**: `https://deine-domain.de/api/auth/callback`
3. **Client ID** und **Client Secret** notieren

## .env konfigurieren

```env
TESLA_CLIENT_ID=deine-client-id
TESLA_CLIENT_SECRET=dein-client-secret
TESLA_REDIRECT_URI=https://deine-domain.de/api/auth/callback
TESLA_AUDIENCE=https://fleet-api.prd.na.vn.cloud.tesla.com
```

> **Regionen**: Nordamerika = `fleet-api.prd.na.vn.cloud.tesla.com`,
> Europa = `fleet-api.prd.eu.vn.cloud.tesla.com`

## Tesla-Fahrzeug verbinden

Nach dem Login in der App auf den Link **"Tesla verbinden"** klicken
(oder direkt: `https://deine-domain.de/api/auth/tesla/login`).

Du wirst zur Tesla-Anmeldeseite weitergeleitet. Nach der Genehmigung
wird das Fahrzeug automatisch erkannt und die Synchronisation gestartet.

## Berechtigungen (OAuth Scopes)

| Scope | Zweck |
|---|---|
| `openid` | Tesla-Identity |
| `offline_access` | Refresh-Token (kein erneutes Login) |
| `vehicle_device_data` | Fahrtdaten, Ladestatus, Batterie lesen |
| `vehicle_cmds` | (optional) Fahrzeugbefehle |

## Polling-Intervall

Der eingebaute Poller fragt die Tesla-API ab:
- **Alle 30 Sekunden** wenn das Fahrzeug aktiv ist (fährt oder lädt)
- **Alle 5 Minuten** wenn das Fahrzeug schläft (Status 408)

Das Fahrzeug wird durch den Poller **nicht aufgeweckt** – der
Schlafstatus wird respektiert um den Akku zu schonen.

Poller deaktivieren (z.B. für Tests): `ENABLE_POLLER=false` in der `.env`.
