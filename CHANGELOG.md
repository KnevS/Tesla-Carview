# Changelog

Alle relevanten Änderungen werden in dieser Datei dokumentiert.
Format folgt [Keep a Changelog](https://keepachangelog.com/de/1.0.0/).

> 🇬🇧 [Read in English](CHANGELOG.en.md)

---

## [v3.5.2] - 2026-06-06

### Hinzugefügt

- **OwnTracks-Self-Service für jeden Fahrer**: Bisher konnten nur Admins Geräte anlegen. Ab jetzt hat jeder eingeloggte Benutzer eine eigene Seite `/my-tracking` → „Mein GPS" in der Navigation, dort kann er für sein eigenes Smartphone ein Gerät anlegen und sieht den QR-Code zum Direkt-Scan. Vehicle-Auswahl ist auf Fahrzeuge gefiltert, die ihm in `vehicle_users` zugewiesen sind — er kann GPS nicht versehentlich auf ein fremdes Auto pushen. Bestehende Admin-Funktionalität im Wizard bleibt unverändert (Admin kann weiterhin für andere Fahrer Geräte vorbereiten und ihnen den QR-Code geben).
  - Backend-Berechtigungsmodell: `GET /api/owntracks/devices` zeigt für Fahrer nur eigene, für Admin alle. `POST /devices` forced bei Fahrer `user_id = req.user.sub` und prüft `vehicle_users`-Zuweisung — Admin kann frei wählen. `PATCH/DELETE` analog mit Owner-Check.
  - Neuer Endpoint `GET /api/owntracks/devices/:id/token` ermöglicht es Admin und Fahrer, den Token (und damit den QR-Code) eines existierenden Geräts erneut abzurufen — nicht nur einmalig nach Create. Praktisch wenn Admin ein Gerät für einen Fahrer anlegt und ihm den QR später per Chat schickt, oder wenn ein Fahrer sein Handy verloren/getauscht hat.

---

## [v3.5.1] - 2026-06-06

### Hinzugefügt

- **OwnTracks-App-Setup per QR-Code**: Statt URL/DeviceID/TrackerID manuell in der App eintippen, scannt der Endnutzer einen QR-Code mit der nativen iPhone-Kamera. Workflow: Kamera-App → QR-Code → „In OwnTracks öffnen" → Konfiguration importieren bestätigen → fertig. Im Wizard nach Device-Anlage wird der QR direkt angezeigt (420×420 px), darunter eingeklappt der manuelle Fallback (Webhook-URL + .otrc-Download).
  - Neue Routes (Token-basiert, kein JWT — Token in URL ist die Auth wie beim Webhook):
    - `GET /api/owntracks/config.otrc?token=<device_token>` — liefert die `_type: configuration`-JSON für die OwnTracks-App
    - `GET /api/owntracks/qr.png?token=<device_token>` — PNG mit `owntracks:///config?url=…`-Deep-Link, scannbar mit iOS/Android-Kamera
  - Konfiguration wird mit Hardware-tauglichen Defaults vorbelegt: `mode: 3` (HTTP), `monitoring: 1` (significant changes — akku-schonend), `locatorDisplacement: 200` (alle 200 m ein Punkt), `ignoreInaccurateLocations: 100` (GPS-Spikes >100 m verwerfen), `pubExtendedData: true` (Speed/Heading mitsenden).

### Geändert

- **Telemetry-View „Noch keine Daten"-Banner ist jetzt ehrlich**: Vorher zeigte die Telemetry-Seite "Telemetry läuft erst wenn der Poller das erste Mal vom Tesla antwortet bekommt" — was im Owner-API-Modus seit Tesla's 2026-Sperre eine falsche Hoffnung war (es kommt eben nie eine Antwort). Neuer Banner für Owner-Mode-Instanzen: erklärt die Tesla-Änderung, benennt beide Auswege (OwnTracks sofort verfügbar, Fleet API langfristig), verlinkt direkt auf den Einrichtungs-Assistenten und developer.tesla.com.

- **README mit Tesla-API-Status-Sektion**: Neuer Block ganz oben (DE+EN) erklärt offen den 2026er-Stand: Owner API tot, Fleet API einziger offizieller Weg (Wartezeit + Kosten), OwnTracks als kostenlose Sofort-Alternative für Fahrtenbuch-Use-Case. Tabelle mit allen Anbindungs-Optionen + was sie liefern. Keine falschen Erwartungen mehr für neue Selbsthoster.

---

## [v3.5.0] - 2026-06-06

### Hinzugefügt — Major: Datensouveräner KI-Chat by Default

- **Ollama als gebündelter Service im Compose-Stack**: Jede TeslaView-Installation enthält ab v3.5.0 automatisch einen lokalen LLM-Runtime — der KI-Chat funktioniert vollständig offline, Daten verlassen die eigene Instanz NIE. Kein externes Cloud-Konto mehr nötig.
  - Neuer Service `ollama` (`ollama/ollama:latest`) in `docker-compose.prod.yml` + `docker-compose.yml`. Kein Host-Port-Mapping — nur Backend-intern via `tesla-net` erreichbar.
  - Persistentes Named Volume `ollama_models` (1–20 GB je nach gepulltem Modell).
  - Konservatives Memory-Limit **2 GB Default** (anpassbar via `OLLAMA_MEMORY_LIMIT` ENV), CPU 1.5 Cores (`OLLAMA_CPU_LIMIT`). Modelle werden nach 5 Min Idle entladen (`OLLAMA_KEEP_ALIVE=5m`) um RAM auf kleinen Hosts freizugeben.
  - Backend bekommt `OLLAMA_URL=http://ollama:11434` als ENV-Default — Wizard-tenant_setting `ai.ollama_url` hat Vorrang falls externe Ollama-Instanz gewünscht.
  - **Deaktivieren** auf Hosts mit zu wenig RAM (< 4 GB): `COMPOSE_PROFILES=lite docker compose up -d` — Service wird nicht gestartet, Stack bleibt schlank. Oder im Wizard `KI-Provider = Aus`.

- **Wizard-Integration: Modell-Installation mit einem Klick**: Im Schritt „Externe APIs" → Ollama-Card erscheint nach erfolgreichem Verbindungs-Test eine neue Sektion „Modell installieren". Admin wählt aus kuratierter Liste mit Hardware-Empfehlungen je Eintrag (RAM, Disk, Geschwindigkeit, Hardware-Klasse), klickt „⬇ Installieren", sieht **live Progress-Bar mit MB/MB + Prozent** während der Pull läuft. Pull ist SSE-gestreamt — funktioniert auch bei Multi-GB-Modellen über langsame Verbindungen (Timeout 1h).
  - Neue Routes: `GET /api/grok/ollama-recommended` (kuratierte Liste), `POST /api/grok/ollama-pull` (SSE-Pull mit Progress).
  - Kuratierte Modelle: `llama3.2:1b` (Pi 4 4 GB), `qwen2.5:1.5b` (Pi 4 8 GB), `qwen2.5:3b` (Pi 5/VPS — empfohlen), `phi3:3.8b`, `llama3:8b`, `qwen2.5:7b`.

- **README mit ehrlicher Hardware-Tabelle**: Neue Sektion „System-Voraussetzungen" mit minimaler/empfohlener Hardware UND einer separaten „KI-Modus-Hardware-Tabelle" für Ollama mit realistischen tok/s-Erwartungen je Hardware-Klasse (Pi 4/5, VPS, GPU). Klare Anleitung wie Ollama deaktiviert wird falls Hardware nicht reicht. DE+EN.

### Hintergrund

Bis v3.4.27 war der KI-Chat ausschließlich über xAI Grok möglich — Cloud, jede Frage geht an US-Server. Verletzt das Datensouveränitäts-Prinzip von TeslaView. Mit v3.5.0 läuft KI **standardmäßig lokal**, Cloud-Mode (Grok) bleibt als optionale Alternative für Power-User mit Performance-Anspruch verfügbar.

---

## [v3.4.27] - 2026-06-06

### Hinzugefügt

- **Ollama als KI-Provider — datensouveräne Alternative zu Grok**: Bisher lief der KI-Chat ausschließlich über xAI Grok (Cloud, jede Frage geht an US-Server). Ab dieser Version kann jeder Admin im Einrichtungs-Wizard zwischen drei Providern wählen:
  - 🏠 **Ollama** (lokal): LLM läuft auf eigener Hardware via [Ollama](https://ollama.com). Modell-Empfehlungen je Hardware: Pi 4 → `llama3.2:1b`, Pi 5 → `qwen2.5:3b`, VPS → `llama3:8b`. Daten verlassen die Instanz NIE. Kostenlos (außer Strom).
  - ☁ **Grok / xAI** (Cloud): wie bisher, Fragen gehen an api.x.ai, pro-Token bezahlt mit Tagesbudget-Wächter.
  - ⊝ **Aus**: KI-Chat komplett deaktiviert.
  - Neue Provider-Abstraktion `services/aiService.js` dispatched anhand `ai.provider` tenant-setting. `services/ollamaService.js` mirror't die `streamChat`-Signatur von `grokService.js`, sodass die Routen blind delegieren — Frontend-Chat funktioniert für alle Provider identisch.
  - Backward-Compat: Bestandsinstallationen mit `xai.api_key` konfiguriert bleiben automatisch auf Grok, bis Admin aktiv umschaltet (Migrations-Default ohne explizites Setting).
  - Neue Routes: `GET /api/grok/ai-config`, `PUT /api/grok/ai-config`, `GET /api/grok/ai-health`, `GET /api/grok/ollama-health`. Bestehende `/api/grok/*`-URLs unverändert.
  - Admin-Wizard-Schritt „Externe APIs" zeigt jetzt die KI-Provider-Wahl vor der Grok-API-Key-Karte mit 3-Karten-Auswahl, Ollama-URL/Modell-Inputs, Verbindungs-Test mit Live-Modell-Liste und Hardware-spezifischen Empfehlungen.
  - Neue tenant_settings: `ai.provider`, `ai.ollama_url` (Default `http://localhost:11434`), `ai.ollama_model` (Default `qwen2.5:3b`).
  - i18n DE+EN.

---

## [v3.4.26] - 2026-06-06

### Hinzugefügt

- **TeslaView Mesh — Phase 1: Foundation**: Erster Schritt einer föderierten, privacy-preserving Schwarm-Intelligenz-Infrastruktur zwischen selbsthostenden TeslaView-Instanzen. Phase 1 ist reine Infrastruktur ohne aktive Datenübertragung — User-sichtbare Schwarm-Features folgen in Phase 2.
  - Neue Tabelle `mesh_contributions` in master.db (instance_uuid, topic, dimensions_key, metrics_json, sample_count, contributed_at). Generisches Schema für mehrere Topics + Dimensionen — kein Bind an einen konkreten Datentyp.
  - Neue tenant_settings-Keys: `mesh.enabled`, `mesh.optin.<topic>`, `mesh.hub_url`, `mesh.instance_uuid`. Default überall OFF — keine implizite Datenübertragung.
  - Neue Admin-Routes unter `/api/mesh/`: `status`, `optin`, `hub-url`, `contributions` (Delete-Stub). Hub-Side-Routes (POST contributions, GET aggregates) folgen in Phase 2 zusammen mit dem ersten konkreten Topic (range_curve).
  - Datenschutz-Garantien im Schema-Kommentar dokumentiert: Min-Group-Size ≥ 5 beim Lesen, instance_uuid ohne Personenbezug, kein Standort, kein VIN, opt-in pro Topic, jederzeit löschbar.
  - **Prinzip: föderiert ≠ extern.** Hub-URL ist konfigurierbar; im typischen Betrieb läuft der Hub auf einer der eigenen TeslaView-Instanzen (P2P-fähig). Niemals geht ein Datum an kommerzielle Drittanbieter (OpenAI, Anthropic, Google, Tesla, ChargeMap…).

### Geändert

- **`EditorialStatusBar.vue` Kommentar-Cleanup**: Hinweis auf externe Design-Inspiration aus dem Code-Kommentar entfernt — TeslaView ist eigenständig und referenziert keine externen Projekte mehr im Quelltext.

---

## [v3.4.25] - 2026-06-06

### Hinzugefügt

- **TCO-Cockpit (Total Cost of Ownership)**: Neue Seite `/tco` zeigt pro Fahrzeug die echten Gesamtkosten und den ehrlichen €/km-Wert — anders als reine Verbrauchs- oder Lade-Statistiken bezieht das TCO-Cockpit *alle* Posten ein:
  - **Wertverlust** = Anschaffungspreis − (Verkaufspreis falls verkauft, sonst geschätzter Restwert über 8 Jahre lineare Abschreibung auf 25%)
  - **Versicherung & Steuer** = jährlicher Betrag × Jahre seit Kauf
  - **Strom** = Summe der `charging_sessions.cost` (kommt schon aus Heimladen-Abrechnung oder Monta-Sync)
  - **Wartung, Reifen, Reparaturen** = neue Tabelle `service_records` mit Einzelposten (Datum, Kategorie, Kosten, Werkstatt, Notizen, optional km-Stand)
  4 KPI-Karten (€/km, Gesamt, Wertverlust, Strom) + Kostenaufschlüsselung mit Anteilen + Service-Records-CRUD + Stammdaten-Form (Anschaffung, Verkauf, Versicherung, Steuer, Initial-Kilometer). Admin-only Schreiben, Lesen für alle eingeloggten Nutzer.
  - Neue Spalten an `vehicles`: `purchase_price_eur`, `purchase_date`, `sale_price_eur`, `sale_date`, `insurance_eur_year`, `tax_eur_year`, `initial_odometer_km` — alle nullable.
  - Neue Tabelle `service_records` mit Kategorien `service|tires|repair|inspection|tuv|accessories|other`.
  - Neue Routes unter `/api/tco/vehicles/:id` (+ `/service-records[/:rid]`).
  - Navigation: Eintrag „📊 TCO-Cockpit" zwischen Abrechnung und Export.
  - i18n in DE+EN.

### Behoben

- **Deploy-Skript: `Container ... Error when allocating new name: Conflict`**: Der bisherige `docker compose up -d --pull always backend frontend` scheiterte intermittierend daran, den laufenden Container vor dem Recreate zu stoppen — Docker meldete „cannot remove container: container is running" und legte einen Random-Prefix-Container an. Der Deploy meldete trotzdem `success`, aber das neue Image lief nie. Neue Sequenz: `pull → stop → rm → up` plus Auto-Cleanup für etwaige Random-Prefix-Container aus vorherigen Deploys. Downtime steigt um ~10 Sekunden (sauberer Stop vor Recreate), dafür kein zerschossener Deploy mehr.

---

## [v3.4.24] - 2026-06-06

### Hinzugefügt

- **OwnTracks-Integration (Smartphone-GPS als Fleet-API-Alternative)**: Da Tesla seit 2026 sowohl die Owner API gegenüber Fleet API mit HTTP 401 abriegelt als auch Vehicle-Endpoints auf owner-api.teslamotors.com mit HTTP 412 schließt, bleibt ohne Fleet-API-Approval kein Weg zu GPS-Daten aus dem Fahrzeug. OwnTracks (https://owntracks.org) ist eine Open-Source-iOS+Android-App, die Location direkt an einen eigenen Webhook pushed — kein Drittanbieter, kein Cloud-Konto. Implementierung:
  - Neue Tabelle `owntracks_devices` in master.db (analog zu telegram_links — pre-auth-Token-Lookup nötig). Felder: tenant_id, vehicle_id, user_id, device_token (32 Byte base64url), label, default_trip_type, is_active, current_trip_id, stationary_since, last_ping_at.
  - Webhook `POST /api/owntracks/webhook?token=<token>` (ohne JWT, Token in URL). Auto-Trip-State-Machine: Speed >5 km/h ohne offenen Trip → neuer Trip mit `source='owntracks'` und virtuellem Start-Odometer (vom letzten Trip oder vehicles.odometer_km). Speed >5 km/h mit offenem Trip → Punkt in trip_points anhängen, Stationär-Timer zurücksetzen. Speed ≤5 km/h länger als 5 Minuten → Trip schließen, Distanz via Haversine aus allen Punkten neu berechnen, end_odometer_km = start_odometer + distanz.
  - Admin-CRUD `GET/POST/PATCH/DELETE /api/owntracks/devices`. POST gibt einmalig den Token + die vollständige Webhook-URL zurück.
  - Neuer Wizard-Step „Smartphone-GPS (OwnTracks)" nach dem Vehicles-Step im Admin-Setup. Übersichtsliste mit Pause-/Resume-/Delete-Buttons, Form für neues Gerät (Bezeichnung, Fahrzeug, Fahrer, Standard-Fahrtart), klar erklärter Hinweis-Text was OwnTracks ist und warum es nötig ist.
  - i18n vollständig in DE+EN.

---

## [v3.4.23] - 2026-06-06

### Behoben

- **Owner-API-Wahrheit im UI**: Post-Deploy-Verifikation von v3.4.22 zeigte: Tesla stellt zwar Token mit `audience: <fleet-api-url>` korrekt aus (Refresh OK), aber die Fleet API lehnt diese Token mit `HTTP 401 "invalid bearer token"` ab. Die beiden API-Ökosysteme sind seit 2026 komplett getrennt — der Community-Workaround „ownerapi → Fleet API URL" funktioniert nicht mehr. Konsequenz im UI: das grüne „✅ Owner API verbunden — Verbindung aktiv" wurde durch ein ehrliches „⚠️ Owner API verbunden, aber Tesla blockiert Vehicle-Daten" mit Erklärungstext ersetzt. System-Health-Banner zeigt jetzt einen neuen Check `tesla_api_mode`, der den Zustand sichtbar macht.

### Hinzugefügt

- **Owner API Pause/Resume-Toggle**: Admin-Wizard und Settings-Wizard haben jetzt einen Knopf, um die Owner-API-Verbindung zu pausieren ohne die Tokens zu löschen. Hintergedanke: falls Tesla die Owner API später wieder für Vehicle-Daten öffnet — oder falls jemand parallel Fleet OAuth einrichtet — kann die gespeicherte Konfiguration mit einem Klick reaktiviert werden. Neue Endpoints: `POST /api/auth/tesla/owner-api/pause`, `POST /api/auth/tesla/owner-api/resume`. Neue tenant_setting: `tesla.owner_api_paused` (default `false`). Im pausierten Zustand wirft `getAccessToken()` einen `OWNER_API_PAUSED`-Fehler, damit Poller und API-Routen sauber abbrechen statt unsinnig Tesla zu kontaktieren.

---

## [v3.4.22] - 2026-06-05

### Behoben

- **Owner-API-Vehicle-Endpoints lieferten HTTP 412**: Tesla hat `owner-api.teslamotors.com` für Fahrzeug-Endpoints (`/api/1/vehicles`, `/vehicle_data`) abgeschaltet — Antwort ist „Endpoint is only available on fleetapi". Owner-Mode-Tokens (aus `client_id=ownerapi`) sind aber weiterhin gültig und werden von der Fleet-API akzeptiert. Fix: `getApiBase()` routet alle Vehicle-Calls jetzt unabhängig vom Auth-Modus auf die Fleet-API-URL (`fleet-api.prd.eu.vn.cloud.tesla.com`). Zusätzlich schicken `connectOwnerToken()`, `exchangeOwnerCode()` und der Owner-Mode-Pfad in `refreshTokens()` jetzt explizit `audience: <fleet-api-url>` beim Token-Exchange mit, damit Tesla den Token von Anfang an für die Fleet-API ausstellt. Bestehende Owner-Mode-Tokens funktionieren ab Deploy ohne Re-Connect — sie werden beim nächsten Refresh automatisch mit korrekter Audience neu ausgestellt.

---

## [v3.4.21] - 2026-06-05

### Sicherheit

- **Security-Dependency-Updates (#107)**: Nightly Security-Routine. 0 offene Dependabot-Alerts, 0 Vulnerabilities im `npm audit` (Frontend 292 + Backend 386 Pakete). Lock-file-only Updates (semver-Ranges unverändert): `marked` 18.0.4 → 18.0.5 (patch, Frontend), `@aws-sdk/client-s3` 3.1061.0 → 3.1062.0 (patch, Backend), `protobufjs` 8.5.0 → 8.6.0 (minor, Backend). Zurückgehalten zur manuellen Prüfung: `express` 4 → 5 (breaking), `geoip-lite` (Engine-Mismatch Node 24).

---

## [v3.4.20] - 2026-06-04

### Behoben

- **QR-Code-Login im Tesla-Display hing in einer "Code abgelaufen"-Schleife**: Beim Cross-Device-Pair-Flow (Tesla-Display generiert QR, eingeloggtes Phone scannt und bestätigt) lief eine Race-Condition: Nach der Passkey-Confirm hat das Phone-Frontend in `PairLogin.vue` zusätzlich einen `GET /api/pair/poll/{token}` ausgeführt — der "Self-Auth"-Block für den Same-Device-Flow. Das Phone bekam den JWT, der Backend-Endpoint setzte `used_at` als consumed-Marker. Der parallel pollende Tesla-Display sah daraufhin `used_at != null` und bekam `status: 'expired'` zurück → Frontend zeigt "abgelaufen", User generiert neuen QR-Code, Race repetiert. Fix: das Phone macht den Self-Auth-Poll nur noch wenn `authStore.accessToken` leer ist (= dieser Browser hat noch keinen Login). Bei einem bereits eingeloggten Phone überlassen wir den JWT-Claim dem urspr. pollenden Gerät. Same-Device-Flow (ein einziger Browser macht init+confirm+poll) bleibt unverändert funktional, da dort `accessToken` vor dem Confirm leer ist.

---

## [v3.4.19] - 2026-06-04

### Behoben

- **Installer scheiterte bei Fremd-Klonen**: `deploy/setup.sh` setzte hart auf `docker compose pull` aus `ghcr.io/knevs/tesla-carview/{backend,frontend}:main`. Die GHCR-Pakete sind aktuell mit Visibility=`private` veröffentlicht — ein Downloader ohne GitHub-OAuth-Token bekam HTTP 404 ("not found" aus Sicht eines anonymen Aufrufers) und der Container-Start brach ab. Zwei robuste Fallbacks:
  - **`docker-compose.prod.yml`**: backend und frontend bekommen zusätzlich zur `image:`-Referenz einen `build:`-Block mit `context: ./backend` bzw. `./frontend`. Wenn der Pull aus GHCR fehlschlägt, baut Docker aus dem geklonten Source.
  - **`deploy/setup.sh`**: Pull-Step ist jetzt fehlertolerant (`pull || echo …`), gefolgt von einem expliziten `docker compose build --pull`. So funktioniert die Installation auch ohne öffentliches GHCR.
  - Side-Effect: Bei einem Raspberry Pi 3 mit ARMv7 dauert die Erstinstallation jetzt 5–10 Min länger (Vite-Build + npm ci), x86_64/arm64-Maschinen mit GHCR-Visibility=public pullen weiterhin sekundenschnell.

---

## [v3.4.18] - 2026-06-04

### Wartung

- **Frontend- und Backend-Lockfiles auf aktuellen `main` synchronisiert** (PR #106): Patch-/Minor-Bumps aus der nightly Security-Routine. Frontend: `axios` 1.16.1 → 1.17.0, `dompurify` 3.4.7 → 3.4.8. Backend: `axios` 1.16.1 → 1.17.0, `@aws-sdk/client-s3` 3.1057.0 → 3.1061.0 plus Patch-Bumps der `@aws-sdk/*`-Sub-Pakete. `npm audit` clean vor und nach dem Update, kein Major-Bump, kein Code im `src/`-Tree berührt. Bewusst zurückgestellt für manuelles Review: `express` 4.22.2 → 5.x (Breaking-Changes) und `geoip-lite@2.0.2` (verlangt Node ≥ 24, Container läuft Node 22 — kosmetische Warnung, kein Build-Fehler).

---

## [v3.4.17] - 2026-06-03

### Behoben

- **Tooltips blieben im Tesla-Fahrzeug-Browser offen**: Die globale `v-tooltip`-Direktive (`frontend/src/directives/tooltip.js`) hat bisher per `mouseenter`/`mouseleave` ein- und ausgeblendet. Auf Touch-Geräten (Tesla-Center-Display ist Touch-only) feuert `mouseleave` nach einem Tap nicht zuverlässig — der Tooltip blieb dauerhaft sichtbar und überlagerte andere UI-Elemente. Umstellung auf `pointerType`-gestützte Pointer-Events:
  - **Maus/Stift** (`pointerType === 'mouse' | 'pen'`): unverändert — `pointerenter` zeigt, `pointerleave` blendet aus
  - **Touch** (`pointerType === 'touch'`): Tap auf das Owner-Element toggelt den Tooltip; ein zweiter Tap oder ein Tap ausserhalb schliesst ihn; zusätzlich Auto-Hide nach 4 Sekunden als Safety-Net
  - **Tastatur**: `focus`/`blur` unverändert
  - Document-`pointerdown`-Listener in der capture-Phase damit der Tooltip dismisst bevor andere Handler den Event verarbeiten

---

## [v3.4.16] - 2026-06-03

### Aktualisiert

- **Backend-Docker-Image `node:20-alpine` → `node:22-alpine`** (PR #105): Node 22 (Active LTS) liefert mehr Prebuilt-Binaries für musl arm64, wodurch `better-sqlite3@12` und `argon2@0.44` seltener auf den `node-gyp`-Fallback fallen, der unter QEMU arm64 mit SIGILL (exit 132) crasht. Vorher blockierte dieser Crash zwei aufeinanderfolgende Deploys auf `main` (CI-Run [26806992094](https://github.com/KnevS/Tesla-Carview/actions/runs/26806992094)). Produktion (amd64) war nie betroffen; die Änderung betrifft ausschließlich den arm64-Image-Build für Raspberry-Pi-4/5-Setups. Kommentar in `.github/workflows/ci.yml` aktualisiert, damit nachvollziehbar bleibt, warum `arm/v7` weiterhin ausgeschlossen ist und welche Bedingungen unter `arm64` noch zu SIGILLs führen können. Nebeneffekt: Die `geoip-lite@2.0.2`-`EBADENGINE`-Warnung (verlangt Node ≥ 24, war reine Advisory) entfällt unter Node 22 ebenfalls nicht — bleibt also kosmetisch, hat aber keinen Einfluss auf Builds.

### Wartung

- **Frontend-Lockfile auf aktuellen `main` synchronisiert** (PR #104): Reine `npm update`-Patch-/Minor-Bumps in `frontend/package-lock.json` (Babel-Tools auf 7.29.7, `@typescript-eslint/*` 8.59.4 → 8.60.1, `@rollup/pluginutils` 5.3.0 → 5.4.0). `npm audit` clean vor und nach dem Update, keine Major-Bumps, kein Code im `frontend/`-Quelltree berührt. CI-`build`-Step der Reverse-Routine bestätigt grünen Vite-Build.

---

## [v3.4.15] - 2026-06-02

### Aktualisiert (Major-Dependencies)

- **`vue-router` 4.6.4 → 5.1.0** (PR #87): Frontend-Router auf neueste Major-Linie. Composition-API-Aufrufe (`useRouter`, `useRoute`, `router.push/replace`, `beforeEach`-Guards) sind weiter API-stabil — keine Code-Anpassungen nötig. Lokaler Build verifiziert, alle Vue-Files (Login, NavBar, Mobile-TabBar, Settings, PasswordReset, MfaVerify, Profile, Pair, Demo, TripsHeatmap) bauen ohne Warnings.
- **`@simplewebauthn/server` 10.0.1 → 13.3.1** (PR #88): WebAuthn-Library drei Major-Versionen hoch. Drei Stellen migriert:
  - `routes/passkey.js` register-verify — `verification.registrationInfo` jetzt mit geschachteltem `credential: {id, publicKey, counter}` statt Top-Level `credentialID/credentialPublicKey/counter`
  - `routes/passkey.js` login-verify + `routes/pair.js` confirm — Parameter `authenticator: {credentialID, credentialPublicKey, ...}` umbenannt zu `credential: {id, publicKey, counter, transports}`
  - `generateRegistrationOptions().excludeCredentials[].id` bleibt string — keine Änderung

### Doku

- **Handbook DE + EN**: neue Sektion `## 💬 Telegram-Bot` mit Einrichtungsschritten, vollständiger Befehlsliste, Inline-Button-Übersicht, Push-Quellen und Sicherheitshinweis zu `door_unlock`. Lücke bestand seit v3.3.3 (Bot-Einführung). Andere Handbook-Sprachen (fr, es, el, tr) folgen in einer dedizierten i18n-PR.

---

## [v3.4.14] - 2026-06-02

### Neu

- **Telegram-Befehlsmenü im Client sichtbar**: Beim Bot-Start wird jetzt `setMyCommands` aufgerufen, sodass alle 12 Befehle direkt im Telegram-Client erscheinen — beim Tippen von `/` als Vorschlagsliste und über den Menü-Button (▤) rechts neben dem Eingabefeld. Bisher musste man `/help` kennen, um die Befehle zu sehen. Jetzt sieht man sie alle mit Kurzbeschreibung + Emoji. Wird einmal pro Bot-Init gesetzt (kein Performance-Overhead), Fehler werden geschluckt damit ein temporäres Telegram-API-Problem den Bot nicht blockiert. Zusätzlich wird der Menü-Button-Typ explizit auf `commands` gesetzt (statt Default-Webapp), damit Tap darauf die Befehlsliste öffnet.

---

## [v3.4.13] - 2026-06-02

### Verbessert

- **Onboarding-Vorab-Hinweis im Setup-Wizard**: Bevor der Wizard nach Tesla-Werten fragt, erscheint ein gelb hervorgehobener Block mit den drei Tesla-spezifischen Vorbereitungen: (1) Developer-Account anlegen (Approval kann 1–3 Wochen dauern — leer lassen erlaubt, Felder später per `setup-wizard.sh` nachtragen), (2) Region NA/EU/Asia, (3) Virtual-Key-Setup-Hinweis mit Verweis auf `docs/04-tesla-api.md`.
- **README Quickstart-Section**: Beide Sprachversionen bekommen ganz oben einen Blockquote-Hinweis, dass die Tesla-Approval extern und zeitintensiv ist, aber die Installation parallel laufen kann. Verlinkt direkt auf `docs/04-tesla-api.md` für die Detailschritte.

Hintergrund: Neue Nutzer haben oft erst beim Wizard-Schritt 2 gemerkt, dass die Tesla-Approval Wochen dauert — die Setup-Zeit war damit gefühlt schlecht eingeschätzt. Mit dem Vorab-Hinweis weiß man von Anfang an: das App-Setup ist nicht der Engpass.

---

## [v3.4.12] - 2026-06-02

### Neu

- **Telegram `/clean all` — aggressiverer Chat-Cleanup**: Mit dem Argument `all` (oder `alle`) erweitert sich der Scan-Bereich von 200 auf bis zu 1500 Message-IDs rückwärts und ignoriert die Consecutive-Failure-Bremse. Praktisch für Chats mit langen User-Message-Blöcken am Stück (dort hätte der Default-Modus mit 25 Failures in Folge zu früh abgebrochen). Bestätigungstext bekommt den Hinweis, dass eigene User-Nachrichten Telegram-API-bedingt nicht via Bot löschbar sind — Anleitung zum manuellen Verlauf-Leeren in der Bestätigung mit drin.

---

## [v3.4.11] - 2026-06-02

### Behoben

- **Telegram „Aktualisieren"-Button antwortete mit „Fehler: Bad Request: message is not modified"**: Wenn sich seit dem letzten `/status`-Render nichts am Fahrzeugzustand geändert hatte, lehnte Telegram den `editMessageText` ab (identischer Text + identische Buttons). Der Catch-Block reichte das wörtlich als CallbackQuery-Antwort durch. Jetzt wird genau dieser Fall erkannt und still als „Bereits aktuell" beantwortet — alle anderen Fehler bleiben sichtbar.

### Neu

- **Telegram `/clean`**: Räumt alle Bot-Nachrichten der letzten ~48 Stunden aus dem Chat. Praktisch nach längerem Hin-und-her mit `/status`, `/classify` oder Notifications. Bot löscht zuerst die `/clean`-Message selbst, dann iteriert er 200 Message-IDs rückwärts und löscht alle Bot-eigenen Einträge (User-Messages bleiben unberührt, Telegram-API erlaubt Bots eh nur die eigenen). Bestätigungs-Popup verschwindet nach 4 Sekunden selbst, sodass der Chat wirklich leer wird. Im `/help`-Menü dokumentiert.

---

## [v3.4.10] - 2026-06-01

### Neu

- **User-Einladung mit Name + E-Mail-Versand**: Die Admin-Form unter `Benutzer → Einladungslink erstellen` akzeptiert jetzt einen optionalen Anzeigenamen und eine optionale E-Mail-Adresse. Wird die Checkbox „Link per E-Mail senden" aktiviert und SMTP ist im Mandanten konfiguriert (`tenant_settings.smtp.*`), schickt das Backend den Einladungslink direkt per `nodemailer` an die angegebene Adresse — der Admin muss den Link nicht mehr manuell weitergeben. Versendete Einladungen zeigen ein `✉ gesendet`-Badge in der Liste. Bei fehlendem SMTP gibt es eine klare Meldung; der Link bleibt zum manuellen Kopieren stehen.
- **Akzept-Flow übernimmt E-Mail**: `POST /api/user-invites/:token/accept` setzt die Invite-E-Mail beim Anlegen des Users in `users.email` (sofern vorhanden), sodass der neue Nutzer ohne extra Klick eine kontaktierbare Adresse hat.

### Technisch

- Schema: `user_invites` um `display_name`, `email` und `email_sent_at` erweitert (Migration + frisches CREATE TABLE).
- `routes/users.js POST /invite` validiert `display_name` (≤80) + `email` (RFC) + `send_email` (boolean) via zod. Audit-Log enthält `email`, `email_sent`, `email_error`.
- `routes/userInvites.js` (public): `validate` liefert `displayName` + `email`; `accept` reicht `email` an `createUser()` durch.

---

## [v3.4.9] - 2026-06-01

### Neu

- **Telegram `/classify` — Fahrt direkt im Chat klassifizieren**: Neuer Bot-Befehl zeigt die letzte beendete Fahrt mit Datum, Strecke und aktueller Markierung. Inline-Buttons 🏠 Privat / 💼 Geschäftlich / 🏢 Pendel setzen `trips.trip_type` sofort und schlagen automatisch die nächst-ältere Fahrt vor, sodass mehrere Fahrten in Reihe klassifiziert werden können. Finanzamt-gesperrte Fahrten (`locked_at IS NOT NULL`) werden übersprungen. Jede Änderung landet als `telegram_classify_trip` in `audit_logs` mit `trip_id`, alter und neuer Klassifikation. Ergänzt das `/help`-Menü.

---

## [v3.4.8] - 2026-06-01

### Neu

- **Telegram-Push für proaktive Events**: Ladung beendet, Service-Erinnerungen, Notification-Rules (SOC-Alarme, Geofence-Events) und neue Software-Versionen kommen jetzt zusätzlich zur WebPush-Notification auch im Telegram-Bot an. Beide Kanäle laufen parallel über `notifyService.notifyAllInTenant()` — wer keinen Telegram-Account verknüpft hat, sieht nur die Web-Push, wer beides nutzt, bekommt beides. Sentry-Alarm lief bereits über diesen Kanal (seit v3.3.3), war aber der einzige Trigger.
- **Software-Update-Erkennung mit Push**: Beim ersten Sync nach einer Firmware-Aktualisierung erkennt der DataSync die neue `car_version` und schickt eine Notification mit der Version. Beim allerersten Tracking eines Fahrzeugs wird die Push unterdrückt (sonst würde jede Bestandsversion eine Erinnerung auslösen).

### Refactored

- **Notification-Pipeline konsolidiert**: Die alte `services/notifications.js` (WebPush-only, fahrzeug-basiert via `push_subscriptions`) wurde gelöscht. `dataSync.js` und `serviceReminders.js` nutzen jetzt einheitlich `notifyService.notifyAllInTenant()`. Vorteil: jede Mutation, die historisch nur Web-Push triggerte, deckt automatisch alle konfigurierten Channels ab. Audit-Konsistenz für die Multi-Channel-Strategie.

---

## [v3.4.7] - 2026-06-01

### Neu

- **Telegram-Inline-Buttons unter `/status`**: Neun Schnell-Aktionen direkt im Chat statt Tippen — 🔒 Lock / 🔓 Unlock, ❄️ Klima an / aus, 🛡 Sentry an / aus, ⚡ Laden start / stop, ⟳ Aktualisieren. Klick triggert den passenden Tesla-Befehl via `apiProxyPost` (gleiche Pipeline wie Frontend-Control-View). Nach jeder Aktion wird der Status neu gerendert, sodass die Wirkung direkt sichtbar ist.
- **Confirm-Schritt für Unlock**: 🔓 Unlock ist die einzige sicherheitskritische Aktion — sie fragt vorher "⚠️ Wirklich entriegeln?" mit zwei Buttons (✅ Ja / ✖ Abbrechen). Ohne Bestätigung wird kein Command an Tesla geschickt.
- **Audit-Log pro Aktion**: Jede Telegram-Vehicle-Action (auch Fehlschläge) landet als `telegram_command` in `audit_logs` mit `vehicle_id`, `command`, `body` und `result/error`. Konsistenz-Pflicht für Mutations gewahrt.
- **`/help` erweitert**: Hinweis auf Inline-Buttons unter `/status`.

---

## [v3.4.6] - 2026-06-01

### Neu

- **Telegram-Info-Befehle**: Fünf neue Read-only-Befehle für den Bot — `/location` (aktueller Standort mit Google-Maps-Link aus der letzten Telemetry-Position), `/range` (Restreichweite + SOC + Stand aus `battery_snapshots`), `/today` (Tagesbilanz: Anzahl Fahrten, km, Anzahl Ladungen, kWh, Kosten — Tagesgrenze in Europe/Berlin), `/service` (nächste fällige Wartungsintervalle, mit "ueberfaellig"-Markierung), `/firmware` (aktuelle Software-Version + Vorgänger aus `firmware_versions`). Alle Befehle nutzen das MarkdownV2-Escape-Pattern aus v3.4.3.
- **Help-Text erweitert**: `/help` listet jetzt alle neun Befehle inklusive der neuen.

### Behoben

- **`/battery` zeigte "Letzte Ladung: –"**: Statt `charge_energy_added` heißt die Spalte in `charging_sessions` real `energy_added_kwh`. Stiller Bug (kein Crash, nur leere Anzeige). Jetzt richtige Spalte; auch `/today` greift korrekt darauf zu.

---

## [v3.4.5] - 2026-06-01

### Behoben

- **OFFLINE-Anzeige nach Auto-Deploy**: Bei jedem Backend-Restart kappte der Container den persistenten Tesla→Backend FleetTelemetry-WebSocket. Der Tesla baut die Verbindung erst beim nächsten State-Event neu auf (Fahrt, Wake, Ladung). In der Zwischenzeit hielt der Poller `vehicle.telemetry_last_signal_at` für aktuell und übersprang das Polling-Fallback — Fahrzeugkarte zeigte "OFFLINE · kein Signal", Fahrten- und Schlafmonitor-Daten alterten unbemerkt. Beim Boot wird `telemetry_last_signal_at` jetzt auf `NULL` zurückgesetzt; der Polling-Loop übernimmt damit sofort, bis der Stream wieder etabliert ist.

### Neu

- **Refresh-Button im EditorialStatusBar**: Notbremse für OFFLINE-Status. Klickt der Nutzer "⟳ Aktualisieren" wird ein einmaliger `vehicle_data`-Force-Poll ausgelöst (verbraucht 1 vom Tages-Cap). Die Antwort enthält den verbleibenden Cap-Stand, das Frontend zeigt "Aktualisiert ({day}/{dayMax} heute)" bzw. bei erschöpftem Cap "Tages-Cap erreicht — Pause bis morgen". Backend: neuer Endpoint `POST /api/commands/:vehicleId/refresh`, intern via neuer Export `forcePollVehicle()` aus `poller.js`.

---

## [v3.4.4] - 2026-06-01

### Behoben

- **Telegram-Befehle scheitern mit `no such column: is_active`**: `/status` und `/battery` lasen Fahrzeuge mit `SELECT * FROM vehicles WHERE is_active=1 LIMIT 3`, doch die `vehicles`-Tabelle hat keine `is_active`-Spalte (das Flag existiert nur auf `users`). Der Bot antwortete mit `❌ Fehler: no such column: is_active`. Beide Stellen verwenden jetzt `ORDER BY id LIMIT 3`. Das `bot.catch()` aus v3.4.3 verhindert weiterhin, dass ein einzelner Befehl den gesamten Bot lahmlegt — der `is_active`-Fehler war aber nutzersichtbar pro Befehl.

---

## [v3.4.3] - 2026-06-01

### Behoben

- **Telegram-Bot reagiert nicht auf Befehle**: `/status`, `/battery` und `/trips` erzeugten Nachrichten mit unescapeten `.`-Zeichen aus `toLocaleString('de-DE')` (Tausenderpunkt im Kilometerstand), `toFixed()` (Dezimalpunkt bei kWh/km) und `toLocaleDateString('de-DE')` (Trennzeichen im Datum). MarkdownV2 markiert `.` als reserviert, Telegram antwortet mit `400 Bad Request: can't parse entities`. Der Polling-Loop crasht beim ersten Versuch und reagiert ab da nicht mehr. Alle drei Stellen escapen die dynamischen Werte jetzt über `esc()`. Zusätzlich fängt ein globaler `bot.catch()` einzelne Handler-Fehler ab, damit ein Bug in einem Befehl nicht den ganzen Bot stumm schaltet.

---

## [v3.4.2] - 2026-05-30

### Behoben

- **Telegram-Bot stumm hinter Reverse-Proxy**: `initTelegramBot()` registrierte einen Webhook auf `FRONTEND_URL/api/telegram/webhook`, sobald kein dediziertes `TELEGRAM_WEBHOOK_URL` gesetzt war. Steht davor eine Auth-Middleware (z. B. Authelia), antwortet die Route mit 401 — Telegram konnte den Bot daher nicht erreichen, gleichzeitig blieb Long-Polling deaktiviert. Fallback auf `FRONTEND_URL` entfernt: ohne explizite `TELEGRAM_WEBHOOK_URL` läuft der Bot jetzt im Polling-Modus.

---

## [v3.4.1] - 2026-05-26

### Neu

- **Monta für alle Fahrzeuge**: Monta-Integration nicht mehr auf Dienstwagen beschränkt. Privatfahrzeuge sehen Heim-Ladesessions (🏠-Badge, Monta-Sync); Kostenabrechnung (PDF, Erstattungsvorlage, Betrag-Spalten) bleibt Dienstwagen vorbehalten.
- **Wizard-Restart-Button**: Abschluss-Seite des Admin-Setup-Assistenten bietet nach Telegram-Konfiguration eine In-App-Schaltfläche zum Container-Neustart inkl. 12-Sekunden-Countdown und automatischem Seitenreload.
- **Admin-Einstellungen**: Monitoring-, Backup- und Externe-API-Sektionen (OCM, HERE Maps) aus der System-Seite in Admin-Einstellungen verschoben (gehören inhaltlich dorthin).

### Behoben

- **Profil-Seite blank**: fehlender `usePrefsStore`-Import führte zu leerem Profil (Regression aus v3.4.0).
- **VAPID-Fehlermeldung**: technische Fehlermeldung `VAPID-Key nicht konfiguriert (Admin: .env setzen)` durch benutzerfreundlichen Text ersetzt (Profil + Einstellungen).
- **Telegram-Fehlermeldung**: gleicher Fix für nicht konfigurierten Telegram-Bot.
- **`generateVAPIDKeys is not a function`**: `web-push` ESM-Export liefert die Funktion auf `default`, nicht als Named-Export — Fallback-Muster behebt den Fehler beim Key-Generieren im Admin-UI.

### Technisch

- `POST /api/system/container-restart` — neuer Endpoint (Admin, audit-logged); sendet 200 bevor `process.exit(0)` nach 400 ms aufgerufen wird; Docker `restart: unless-stopped` startet den Container neu.
- `docker-compose.prod.yml`: `backend/src/routes/system.js` als Volume-Mount hinzugefügt (verhindert Überschreiben durch Image-Updates, analog zu `demo.js`).

---

## [v3.4.0] - 2026-05-25

### Neu - Admin-Konfiguration via UI

- Tesla Fleet-API Zugangsdaten via Admin-UI setzbar (kein .env-Bearbeiten mehr noetig)
- VAPID-Keys fuer Web Push direkt im Browser generierbar
- Telegram Bot Token via UI konfigurierbar
- Grok/xAI API Key via UI setzbar
- ABRP Global App-Key via UI setzbar
- Neuer configService.js: liest aus tenant_settings (DB), faellt auf .env zurueck

### Neu - Admin-Setup-Assistent

- AdminSetupWizard.vue: gefuehrt durch alle System-Konfigurationen
- Wizard-Split: Admin-Setup-Assistent (System) vs. persoenlicher Wizard (Nutzer)

### Geaendert

- Fahrerverwaltung aus Profil in Admin-Einstellungen verschoben
- Geofences aus Profil in Admin-Einstellungen verschoben

### Technisch

- teslaApi.js, telemetryConfig.js: DB vor .env fuer Tesla-Credentials
- notifications.js, serviceReminders.js: DB vor .env fuer VAPID
- grokService.js: DB vor .env fuer xAI-Key
- abrpService.js: DB vor .env fuer ABRP-Key
- telegramBot.js: liest Token beim Start aus tenant_settings

---

## [v3.3.3] — 2026-05-24

### Neu — Benachrichtigungen: Web Push + Telegram Bot

- **Zentraler Benachrichtigungs-Dispatcher** (`services/notifyService.js`) — ein einziger `notify()`-Aufruf sendet gleichzeitig an alle konfigurierten Kanäle (Web Push + Telegram). Jeder Kanal schlägt unabhängig fehl ohne den anderen zu blockieren.
- **Telegram-Bot** (`services/telegramBot.js`, `routes/telegram.js`):
  - Bot via `@BotFather` erstellen → `TELEGRAM_BOT_TOKEN` in `.env` setzen
  - **Verknüpfungsflow**: Einstellungen → Benachrichtigungen → Code erzeugen → `/start <CODE>` im Telegram
  - **Bot-Befehle**: `/status` (Batterie, km, Schloss), `/battery` (SoC-Details), `/trips` (letzte 5 Fahrten), `/unlink`, `/help`
  - **Webhook + Polling**: Webhook-Modus wenn `TELEGRAM_WEBHOOK_URL` gesetzt (empfohlen); automatischer Fallback auf Long-Polling
  - Multi-Tenant: Ein Bot für alle Mandanten; `chat_id → tenant_id + user_id` über master DB
- **Web Push** (`routes/notifications.js`, Service Worker bereits integriert):
  - Nutzerbasierte Subscriptions ergänzen die fahrzeugbasierten
  - VAPID-Keys einmalig generieren: `docker exec <backend> npx web-push generate-vapid-keys`
  - Pro Gerät abonnieren/deabonnieren; Test-Button sendet sofortige Benachrichtigung
  - iPhone/iPad: Benachrichtigungen werden automatisch auf der **Apple Watch** gespiegelt
- **Wächter-Modus-Alarm** — wenn der Wächter-Modus aktiviert wird während kein Nutzer anwesend ist, erscheint sofort ein `🚨 Wächter-Alarm — Fahrzeug möglicherweise berührt` auf allen Kanälen
- **Ereignis-Einstellungen** — pro Nutzer konfigurierbare Schalter für: Ladeende, Akku-Warnung, Wächter-Alarm, Neue Fahrt, Fahrtenbuch-Erinnerung
- **Einstellungs-UI** (`Settings.vue`) — neuer Abschnitt „🔔 Benachrichtigungen" mit Web-Push-Verwaltung, Telegram-Verknüpfungs-Assistent und Ereignis-Checkboxen
- **Datenbank** (`master-schema.sql`): neue Tabellen `telegram_links`, `telegram_link_codes`, `user_push_subscriptions`
- **`.env.example`** mit `TELEGRAM_BOT_TOKEN` und `TELEGRAM_WEBHOOK_URL`

---

## [v3.3.2] — 2026-05-24

### Neu
- **Fahrtenbuch — Im Tesla öffnen** (`Fahrtenbuch.vue`) — Neuer Button „🚗 Im Tesla öffnen" erstellt eine Pair-Session mit `redirect=/fahrtenbuch` und zeigt ein Modal mit QR-Code und direktem Link. Der Tesla-Browser öffnet die URL, der Nutzer authentifiziert sich per Passkey direkt im Tesla-Browser (WebAuthn/FIDO2) und landet sofort im Fahrtenbuch — kein separates Gerät zum QR-Scannen notwendig. Das Modal auf dem sendenden Gerät zeigt bei erfolgreicher Anmeldung einen Erfolgs-State.
- **Pair Self-Authentication** (`PairLogin.vue`) — Nach erfolgreicher Passkey-Bestätigung ruft das bestätigende Gerät (z. B. Tesla-Browser) sofort `/pair/poll/:token` auf, um seinen eigenen JWT und Refresh-Token-Cookie zu erhalten, und navigiert dann zum konfigurierten `redirectPath`. Bisher bestätigte `/pair/<token>` die Session nur für ein anderes Gerät, das pollt.
- **Pair-Sessions mit Weiterleitungspfad** (`backend/routes/pair.js`) — `/pair/init` akzeptiert jetzt den optionalen Query-Parameter `?redirect=<path>` (validiert: muss mit `/` beginnen, nicht `//`, max. 200 Zeichen). Wird in `pair_sessions.redirect_path` gespeichert (Spalte via `ALTER TABLE … ADD COLUMN` nachgerüstet) und von `/pair/info/:token` sowie `/pair/poll/:token` zurückgegeben.
- **Copy-Icon** (`lib/icons.js`) — Neues SVG-Icon `copy` (Zwischenablage) für alle `AppIcon`-Verwendungen verfügbar.

### Verbessert
- **PairLogin.vue** — Zeigt das konfigurierte Weiterleitungsziel vor der Authentifizierung an. Nach erfolgreicher Self-Auth erscheint eine pulsierende „Weiterleitung…"-Meldung vor der Navigation.

---

## [v3.3.1] — 2026-05-24

### Behoben
- **Ladestationen-Suche — stille Fehler behoben** — Alle Fehlerzustände (Adresse nicht gefunden, fehlender OpenChargeMap-API-Key, Netzwerkfehler) zeigen jetzt ein sichtbares, erklärendes Banner statt einer leeren Ergebnisliste. Bei fehlendem API-Key erscheint ein direkter Link zu Admin → System zur Konfiguration.
- **Geolokalisierungs-Fehlerbehandlung** — Verweigert der Browser den Standortzugriff, erscheint ein sichtbarer Fehlerstate statt stillschweigendem Abbruch.

### Navigation neu strukturiert
- **„Übersicht" → „Fahrzeug"** — Die erste Navigationsgruppe wird umbenannt und spiegelt klar ihren Inhalt wider (Live-Fahrzeugstatus).
- **„Auswertungen" bereinigt** — Automationen und Ladestationen entfernt; verbleiben nur Datenauswertungen: Fahrten, Fahrtenbuch, Laden, Energiebericht, Schlaf-Monitor, Klimastatistiken, Betriebsbuch, Abrechnung, Export.
- **Neue Gruppe „Planung"** — Routenplaner, Ladestationen, Automationen und Grok-KI hier zusammengeführt. Alle sind aktions- und zukunftsorientierte Tools.
- **„KI"-Gruppe entfällt** — Grok ist unter „Planung" logisch besser aufgehoben.
- Alle 6 Locales mit neuen Gruppenbezeichnungen aktualisiert (`group_vehicle`, `group_plan`).
- Handbuch in allen 6 Sprachen aktualisiert: neue Desktop-Navigationstabelle, aktualisierte Mobile-Tab-Bar-Beschreibung, neue eigenständige Abschnitte für Ladestationen-Suche und Automationen.

---

## [v3.3.0] — 2026-05-24

### Verbessert
- **Mobile UX — iPhone / Android** — NavBar wird auf kleinen Bildschirmen ausgeblendet; die bestehende MobileTabBar enthält jetzt in einem iOS-typischen Bottom-Sheet („Mehr") auch Settings, Handbuch, Fahrzeugauswahl und Logout. Safe-Area-Insets (`env(safe-area-inset-*)`) verhindern, dass Inhalte hinter Notch und Home-Indicator verschwinden. Settings-Sektionen sind auf Mobile beim ersten Aufruf standardmäßig zugeklappt, um endloses Scrollen zu vermeiden.
- **Touch-Targets nach HIG** — Climate-Keeper-Buttons, Sitzheizungs-Pads und Temperatur-±-Buttons sind auf Mobile per responsiven Tailwind-Klassen auf mindestens 44 × 44 px vergrößert. iOS-Formulareingaben werden auf `font-size: 16px` gezwungen, um den automatischen Zoom zu unterdrücken.
- **Bundle-Größe −57 %** — Alle 25+ View-Imports auf Lazy `() => import()` umgestellt. Schwere Vendor-Bibliotheken (Leaflet, Chart.js, jsPDF, vue-i18n, marked, DOMPurify) via Vite `manualChunks` in separat gecachte Chunks ausgelagert. Ergebnis: 2,3 MB → 1,0 MB roh, ~670 KB → ~257 KB gzip.
- **Leaflet-CSS Lazy-Loading** — `leaflet/dist/leaflet.css` ist nicht mehr Teil des globalen Bundles; es wird dynamisch innerhalb von `LocationHeatmap.vue` importiert, wenn die Karten-Ansicht erstmals besucht wird.

### Neu
- **Hygiene-Check-Skript** (`scripts/hygiene-check.sh`) — 7-stufiger Systemcheck: Docker, Node, Disk, npm audit (Frontend + Backend), Bundle-Größe, `.env`-Vollständigkeit, Docker-Container-Gesundheit, SQLite-Integrität und SSL-Zertifikats-Ablauf. Flags: `--fix` (Images automatisch bereinigen, `npm audit fix` ausführen), `--ci` (keine Farbe, Exit 1 bei Fehlern). Wird am Ende von `deploy/setup.sh` automatisch aufgerufen.
- **Nächtliche Hygiene-Automatisierung** — `nightlyMaintenance.js` führt jetzt jede Nacht um 03:30 Europe/Berlin Docker-Image-Bereinigung, npm audit (kritische Befunde werden in das Tenant-Audit-Log geschrieben) und Bundle-Größen-Check durch. Ergebnisse sichtbar unter Admin → System → Wartung.
- **CI-Sicherheitsgates** — GitHub Actions führt `npm audit --audit-level=high` für Frontend und Backend als blockierenden Merge-Gate aus. Bundle-Größe wird nach jedem Build gemessen (Warnung > 800 KB, Block > 1,5 MB); Ergebnisse erscheinen in der PR-Step-Summary.
- **Dependabot** — Automatische wöchentliche npm-Dependency-PRs für `/frontend` und `/backend`; monatliche GitHub-Actions-Updates. Patch/Minor-Updates werden gruppiert; Major-Updates als einzelne PRs zur manuellen Prüfung.

### CI / Infrastruktur
- **`chunkSizeWarningLimit: 800`** in `vite.config.js` — Vite warnt jetzt lokal, wenn ein Chunk 800 KB überschreitet, passend zur CI-Schwelle.

---

## [v3.2.0] — 2026-05-22

### Neu
- **CO₂-Vergleich im Energiebericht** — Neuer Abschnitt zeigt Tesla-CO₂-Verbrauch vs. Diesel-Äquivalent, eingesparte Tonnen CO₂ sowie den Strommix-Faktor des deutschen Netzes (0,38 kg/kWh). Pro Woche werden CO₂-Einsparungen im Trend-Chart eingeblendet.
- **Wetter-Verbrauchskorrelation** — Temperatur-Balkendiagramm im Energiebericht: Durchschnittsverbrauch in 6 Temperatur-Buckets (< −10 °C bis > 30 °C). Zeigt wie Kälte und Hitze den Verbrauch beeinflussen. Neuer Backend-Endpoint `GET /api/trips/weather-consumption`.
- **Firmware-Update-Tracker** — Neue Tabelle `firmware_versions` speichert automatisch jede neue Softwareversion des Fahrzeugs beim Sync. Verlauf aller Updates (Datum, Version, Installationsdauer) in Admin → System sichtbar.
- **Klimastatistiken** — Neue Seite `/climate` mit täglicher Auswertung: Klimaanlagennutzung (Stunden), Sitzheizung Fahrer/Beifahrer, Vorklimatisierungen, kältester/wärmster Tag. Datenerfassung läuft automatisch bei jedem Fahrzeug-Sync via `hvac_daily_stats`-Tabelle.
- **Community Benchmark** (opt-in) — Anonymer Verbrauchsvergleich mit anderen Tesla-Fahrern desselben Modells. Opt-in per Toggle; Beiträge werden als SHA-256-gehashte Instance-UUID gespeichert, nie als Klardaten. k-Anonymität: mindestens 3 Teilnehmer nötig. Bandbreite P25–P75 sichtbar. Jederzeit widerrufbar.

### Verbessert
- **Bundle-Cache-Busting repariert** — Vite-Entry-Bundle bekam immer den Namen `index-local.js` (kein `.git` im Docker-Build-Context), was vom nginx `immutable`-Cache für 1 Jahr eingefroren wurde. CI übergibt jetzt `GIT_HASH` als `--build-arg`; jeder Deploy erzeugt `index-<7charHash>.js` als neuen, eindeutigen Dateinamen.

---

## [v3.1.5] — 2026-05-18

### Sicherheit
- **Argon2id ersetzt bcrypt für Passwort-Hashes** — Neue Passwörter und Passwort-Änderungen verwenden jetzt Argon2id (t=3, m=64 MB, p=4 — OWASP-Empfehlung 2024). Bestehende bcrypt-Hashes bleiben gültig und werden beim nächsten erfolgreichen Login transparent migriert. Kein manuelles Eingreifen nötig.
- **Encryption-Key von Datenbankdateien trennbar** — Der AES-256-GCM-Schlüssel kann jetzt über `ENCRYPTION_KEY_B64` (Umgebungsvariable, außerhalb von `data/`) oder als Docker Secret übergeben werden. Bestehende `data/.encryption-key`-Installationen funktionieren weiterhin unverändert.
- **Refresh-Tokens bei Passwort-Änderung invalidiert** — Nach einer Passwort-Änderung werden alle aktiven Sessions des Benutzers sofort beendet. Ein zuvor gestohlener Refresh-Token überlebt das Passwort-Reset nicht mehr.
- **Refresh-Tokens bei Benutzer-Löschung / Deaktivierung invalidiert** — Wenn ein Admin einen Benutzer löscht oder deaktiviert, werden dessen aktive Sessions sofort beendet.
- **`Permissions-Policy`-Header ergänzt** — Browser sperren Kamera, Mikrofon, Geolocation, Payment, USB und Bluetooth für die App.

---

## [v3.1.4] — 2026-05-18

### Behoben
- **Passkey-Anmeldung nach Update auf simplewebauthn v10** — Vier Breaking-Changes in der Library-API wurden behoben: Challenge wird jetzt als base64url-String statt als Uint8Array in der DB gespeichert; `excludeCredentials[].id` muss ein String sein (kein Buffer); `credentialID` aus `registrationInfo` ist Uint8Array und wird korrekt konvertiert; der Parameter `authenticator` in `verifyAuthenticationResponse` wurde auf `credential` umbenannt (mit `publicKey` statt `credentialPublicKey`). Passkeys konnten seit dem v10-Upgrade weder registriert noch verwendet werden.
- **Passkey-Platzhalter im Legal-Viewer korrekt dargestellt** — `<<NAME>>` und ähnliche ungefüllte Platzhalter in Impressum / Datenschutz wurden durch den HTML-Parser zu `<>` verstümmelt. Fix: die `<<`-Zeichen werden vor dem Markdown-Render als HTML-Entities kodiert (`&lt;&lt;NAME&gt;&gt;`).

### Geändert
- **Vollbackup enthält jetzt `passkey_credentials`** — Die Tabelle fehlte bisher in `BACKUP_TABLES`. Passkeys überleben damit einen JSON-Restore auf demselben Server (WebAuthn ist domain-gebunden; ein Restore auf eine andere Domain erfordert weiterhin eine neue Registrierung).

---

## [v3.1.3] — 2026-05-17

### Neu
- **ICS-Kalenderexport im Routenplaner** — Geplante Routen können als `.ics`-Datei heruntergeladen und in beliebige Kalender-Apps importiert werden. Der Export enthält Abfahrt, Ankunft, Zwischenladestopps und einen Hinweis auf die Kalender-„Privat"-Einstellung für geteilte Kalender. Datenschutzklasse `CLASS:PRIVATE` wird automatisch gesetzt.
- **Verbesserter Reifendruck-View (TireMap)** — Neuer SVG-Fahrzeug-Top-Down-View mit farbkodierten Reifen (grün / gelb / rot) und Glow-Effekt je nach Drucklevel. Legende und Tooltip mit Volltext-Bezeichnung pro Reifen.
- **Layout-Toggle in der Fahrzeugsteuerung** — Nutzer können zwischen Kachel-Layout und kompakter Listenansicht wechseln. Einstellung wird per `localStorage` gespeichert.
- **Rekuperationsstatistik in Fahrtdetails** — Zeigt rückgewonnene kWh, Rekuperationsanteil in % und Netto-Verbrauch nach Rekuperation. Berechnung via SQLite `LEAD()`-Fensterfunktion auf `trip_points.power_kw < 0`.

### Verbessert
- **Touch-Dropdowns im Tesla-Infotainment-Browser** — `e.stopPropagation()` auf Trigger-Klick verhindert sofortiges Schließen durch den Document-Listener; `touch-action: manipulation` eliminiert 300 ms Tap-Verzögerung in NavGroup und LangSwitcher.
- **Setup: nginx optional** — `deploy/setup.sh` fragt zu Beginn nach dem Deployment-Modus (Direct / Proxy). Modus 2 überspringt nginx/certbot-Installation und -Konfiguration vollständig — kein Konflikt mehr mit bestehenden Reverse-Proxy-Setups (z. B. WireGuard + VPS-nginx).
- **`TESLA_AUTH_BASE` ergänzt** — Variable wird von `setup-wizard.sh` automatisch in die `.env` geschrieben und ist in `.env.example` dokumentiert. `telemetryConfig.js` hat jetzt einen Fallback-Wert für Bestandsinstallationen.

### CI / Infrastruktur
- **Docker-Images in CI vorgefertigt (GHCR)** — Backend- und Frontend-Images werden jetzt als Multi-Arch-Build (amd64/arm64/arm/v7) in GitHub Actions gebaut und nach `ghcr.io/knevs/tesla-carview` gepusht. Der Server führt nur noch `docker pull + up` aus — keine lokale Kompilierung (node-gyp / better-sqlite3) mehr. Deploy-Dauer: ~3 min statt 10–37 min.
- **Deploy via `workflow_run`** — Deploy startet erst nach erfolgreichem CI-Abschluss; garantiert, dass die GHCR-Images existieren, bevor der Server sie zieht.
- **GitHub Actions auf Node.js 24 aktualisiert** — `actions/checkout`, `actions/setup-node`, `actions/upload-artifact`, `docker/build-push-action` auf aktuelle Hauptversionen gehoben; Deprecation-Warnungen für Node.js 20 entfernt.

---

## [v3.1.2] — 2026-05-17

### Neu
- **SMTP / E-Mail-Konfiguration im Wizard und Admin-UI** — E-Mail-Versand (Nodemailer) wird direkt in Admin → System oder im Monitoring-Schritt des Setup-Wizards konfiguriert. Kein serverseitiges `msmtp` mehr nötig; alle SMTP-Parameter (Host, Port, Benutzer, Passwort, Absenderadresse) werden in der Tenant-Datenbank gespeichert. Ein Test-Mail-Button bestätigt den Versand sofort.
- **Anthropic-API-Key im Wizard und Admin-UI** — Der Key für das KI-gestützte autonome Monitoring (autofix-ai / Claude Haiku) kann jetzt in Admin → System → Monitoring oder im Monitoring-Schritt des Wizards eingetragen werden. Vorher war direkter Serverzugriff nötig.

### Sicherheit
- **Git-Historie bereinigt** — Instanzspezifische Betreiber-Identität, Firmenname aus Demo-Fixtures und interne Betriebsdokumentation wurden aus beiden Repository-Historien via `git filter-repo` entfernt. Alle instanzspezifischen Werte (Domain, Repo-Namen, E-Mail-Adressen, Docker-Volume-Name) liegen jetzt ausschließlich in der gitignorierten `heal.conf` — das öffentliche Repo enthält in keinem Commit persönliche Daten.

---

## [v3.1.1] — 2026-05-16

### Neu
- **Einheitenpräferenzen in allen Views** — `useUnits()` greift jetzt in allen 9 Ansichten (Dashboard, Fahrten, Fahrtdetail, Batterie, Energy-Report, Steuerung, Telemetry, Fahrtenbuch, Routenplaner); Distanz (km/mi), Temperatur (°C/°F) und Effizienz (kWh/100km, Wh/km, mi/kWh) richten sich nach den Nutzereinstellungen. Ausnahme: Fahrtenbuch-Odometerwerte bleiben aus rechtlichen Gründen (BMF/§31a EStG) immer in km.
- **Griechische Wiki-Seiten vervollständigt** — `EL-First-Login.md` neu erstellt (vollständige Übersetzung inkl. 16-Schritt-Wizard-Tabelle, MFA, QR-SSO-Tipp); `EL-Features.md` um Tarif-Widget-Abschnitt ergänzt; Sidebar und Home aktualisiert.

### Verbessert
- **Dynamische System-Hygiene (heal.sh + host-watch.sh)** — Selbstheilung übernimmt jetzt vollautomatische Betriebspflege: Swappiness wird proportional zur RAM-Größe berechnet und bei jedem Lauf geprüft/korrigiert; Swap-Flush wenn sicher (20%-Puffer); Container-Speicherlimits via `docker update` (Backend 30% RAM, Frontend/Nginx je 5% RAM); stündlich: Docker-Cleanup (dangling Images, Build-Cache > 24 h, anonyme Volumes), Journal-Vacuum (2% Disk), /tmp-Bereinigung (> 7 Tage). Alle Schwellwerte werden zur Laufzeit aus Host-Eigenschaften berechnet — kein hardcodierter Wert.
- **Host-Alerts privat** — Monitoring-Alerts werden per E-Mail versandt statt als öffentliche GitHub-Issues (verhindert Leakage privater Serverdaten).

---

## [v3.1.0] — 2026-05-16

### Neu
- **Vollständiger Onboarding-Wizard** — der In-App-Einstellungs-Assistent wurde von 8 Präferenz-Schritten auf 17 vollständige Setup-Schritte erweitert (Admins erhalten 6 kritische neue Schritte)
- **Tesla OAuth im Wizard** — Button öffnet Tesla-Login in Popup; PostMessage-Listener schließt das Fenster und aktualisiert den Status automatisch
- **Fahrzeug-Sync im Wizard** — Fahrzeuge werden direkt aus dem Assistenten heraus synchronisiert, mit Echtzeit-Feedback
- **Virtual-Key-Schritt** — Status aus `/telemetry/status`, Registrierungs-URL kopierbar + direkt öffnbar, Status-Refresh-Button
- **Fleet-Telemetry-Schritt** — pro Fahrzeug: farbige Status-Badges (live / idle / not_registered / approval_missing / error) + direkter Konfigurieren-Button
- **Strompreis-Schritt** — pro Fahrzeug konfigurierbar, wird beim finalen Confirm gespeichert
- **Legal-Check-Schritt** — scannt automatisch alle 18 Scope×Locale-Kombinationen auf `<<Platzhalter>>`; Link zum Editor bei offenen Punkten
- **i18n vollständig** — alle 6 Sprachen (DE/EN/FR/ES/TR/EL) mit je 63 neuen Schlüsseln für die Wizard-Schritte

### Schritt-Reihenfolge (Admin)
`Sprache → Tesla OAuth → Fahrzeuge → Virtual Key → Fleet Telemetry → Strompreis → Legal → Externe APIs → Monitoring → Design → Farbe → Einheiten → Dashboard → Navigation → Benachrichtigungen → Zusammenfassung`

---

## [v3.0.0] — 2026-05-15

### Major Milestone — Car Usability Management

Tesla Carview wächst mit v3.0 zum vollständigen **Car Usability Management**-System:
weit mehr als ein Datenlogger — eine ganzheitliche Plattform für Fahrzeugnutzung,
Betriebsführung, Kostenmanagement und Reiseplanung.

### Neu in v3.0
- **Plattform-Rebranding** — Tesla Carview wird zum Car Usability Management System; neue Beschreibung in allen Dokumenten und Sprachen
- **Demo-Sandbox** — öffentliche Testumgebung mit echtem UI und synthetischen Fahrzeugdaten; 2-Tage-Testaccount; erreichbar über `demo.teslaview.krische.com`
- **Benutzerverwaltung** — Self-Delete-Guard (eigener Account nicht löschbar), Löschen-Button klar als destruktive Aktion gekennzeichnet
- **Deploy-Pipeline** — Private-Overlay-Dateien werden vor `git pull` zurückgesetzt und danach automatisch wieder eingespielt; kein manueller Eingriff nötig

### Vollständig: alle Features aus v2.0–v2.4
Multi-Tenancy, Routenplaner mit SoC-aware Ladeplanung, Routenvermeidung (Valhalla), Passkey/WebAuthn + QR-SSO für Tesla-Browser, Einstellungs-Wizard, dynamisches Dashboard, Legal-Layer (Imprint/Datenschutz/AGB mit Akzept-Tracking), 6 Sprachen (DE/EN/FR/ES/TR/EL), Monitoring & Selbstheilung, OCM-Ladestation-Overlay, HERE Maps Verkehr, Sleep Monitor, Energy Report, Automationen, Betriebsbuch, Fahrtenbuch (BMF-konform), Kostenabrechnung, Web-Push, Verschlüsselung at rest.

---

## [v2.4.0] — 2026-05-15

### Neu
- **Routenvermeidung** — Routenplaner kann Autobahnen, Mautstraßen und Fähren meiden; Routing über Valhalla public API (OSRM unterstützt das nicht); Einstellung wird persistent im Browser gespeichert; bei Valhalla-Ausfall automatischer Fallback auf OSRM mit Hinweis
- **OpenChargeMap API-Key-Verwaltung** — OCM-Schlüssel direkt in Admin → System eintragen, einsehen (maskiert) und löschen; kein SSH-Zugang nötig; Toast-Hinweis bei fehlendem Key enthält Direkt-Link zu den Einstellungen; Registrierungs-Links direkt in der UI
- **Monitoring & Selbstheilung** — Cron-Job `heal.sh` prüft alle 15 min Container-Status und `/api/health`; bei Ausfall automatischer Neustart; optionaler E-Mail-Alert; Konfiguration (Alert-E-Mail, Selbstheilung an/aus) über Admin → System; Heal- und Security-Logs direkt in der Admin-UI einsehbar

### Verbessert
- **System-Health** — 8 Checks statt 5; OCM- und HERE-Maps-Status mit Live-HTTP-Probe; optionale Services erscheinen als `info`-Eintrag (gedimmt, kein Fehler wenn nicht konfiguriert), mit Direkt-Link „Einrichten →" zum API-Schlüssel-Abschnitt
- **update.sh** — stabiler Deploy-Ablauf: explizit Stop → Prune → Up statt `up --build` allein (verhindert Container-Name-Konflikte bei schnellen Redeploys)

---

## [v2.3.0] — 2026-05-14

### Neu
- **SoC-aware Ladeplanung** — Routenplaner plant intelligente Ladestopps mit Zeitschätzung; Abfahrts-SoC auto-befüllt aus Live-Fahrzeugdaten (Ad-hoc) oder manuell eingebar (geplante Abfahrt); konfigurierbarer Ziel-SoC am Zielort und Ladeziel je Ladestopp
- **Routenplaner-Layout** — linke Spalte scrollbar + sticky, Map bleibt immer sichtbar; Sektionsreihenfolge optimiert (Timing / Laden vor Wegpunkten)
- **Einstellungen kollabierbar** — alle 17 Sektionen der Einstellungsseite per Klick ein-/ausklappbar via SortableSection
- **Demo-Dienstfahrzeug** — Demo-Mandanten erhalten automatisch ein zweites Fahrzeug (category=company, Model 3) mit 15 Tagen Geschäftsreisen für die Abrechungs-Demo
- **Fahrzeugtechnik Demo-Daten** — DEMO-Fahrzeuge liefern plausible Fake-Telemetrie ohne Tesla-API-Aufruf
- **Standort-Heatmaps** — Leaflet-Kacheln laufen jetzt über den Backend-Tile-Proxy (kein CSP-Block mehr)
- **Abschnitte standardmäßig ausgeklappt** — neues localStorage-Profil: alle Sections auf allen Seiten initial expanded

### Verbessert
- **i18n** — neue SoC-Schlüssel (departureSocLabel, minArrivalSocLabel, chargeToLabel, chargeToTip) in allen 6 Sprachen (de/en/fr/es/tr/el)
- **SortableSection** — neues sortable-Prop versteckt Drag-Handle, wenn Sektion nicht umsortierbar ist

---

## [v2.2.0] — 2026-05-14

### Neu
- **QR-SSO-Login für Tesla-Browser** — Tesla-Display-Browser zeigt QR-Code; Nutzer scannt mit Smartphone, authentifiziert per Passkey/Face ID → Session wird automatisch auf den Tesla-Browser übertragen. Kein WebAuthn nötig im Tesla-Browser.
- **Routenplaner** — Kartenansicht korrigiert (Leaflet CSS jetzt statisch importiert), OSRM-Routing (echte Straßenrouten, kostenlos), Ladestation-Overlay via OpenChargeMap, Ankunfts-SoC-Schätzung aus eigenen Fahrtdaten, ABRP nur noch als optionaler Link
- **Einstellungs-Wizard** — 8-stufiger Wizard (Sprache, Design, Farbe, Einheiten, Dashboard-Karten, Navigation, Benachrichtigungen, Zusammenfassung), re-launchbar aus Einstellungen, Draft-Modus bis zur finalen Bestätigung
- **Dynamisches Dashboard** — Karten-Sichtbarkeit und -Reihenfolge aus Benutzerpräferenzen; serverseitig gespeichert (cross-device sync)
- **Präferenzen-API** — `GET/PATCH /api/users/me/preferences` (Partial-Merge), `users.preferences` JSON-Spalte pro Tenant, 800ms Debounce-Sync im Store

### Verbessert
- **Passkey-Login** — `/api/passkey/login-options` akzeptiert jetzt sowohl `tenantSlug` als auch `tenantId`
- **Neue Icons** — `qr-code`, `warning`, `fingerprint` in AppIcon-Bibliothek

---

## [v2.1.0] — 2026-05-14

### Neu
- **GitHub Wiki** — umfangreiches, laienverständliches Wiki mit 16 Seiten (Installation, Netzwerkzugang, Raspberry-Pi-Speicher, Sicherheit, Backup, Troubleshooting u.v.m.) Automatische Synchronisation aus dem Repo bei jedem Push
- **Tesla Model Y Favicon** — Seitenprofilsilhouette als App-Icon in allen Browsern, als PWA-Icon und iOS-Home-Screen-Icon (ersetzt Blitz-Platzhalter)
- **Netzwerk-Anleitung für Laien** (`docs/14-network-access`) — DynDNS, Cloudflare Tunnel, FritzBox-Setup, CG-NAT-Erkennung, VPS-Optionen mit Entscheidungsbaum
- **Raspberry-Pi-Speicher-Anleitung** (`docs/15-raspberry-pi-storage`) — USB-SSD, NVMe M.2 HAT+, PXE-Boot, Samsung-T7-Quirk-Fix, Migrationsleitfaden von SD-Karte
- **InfoTip-Komponente** — globale `<InfoTip text="…" />`-Komponente für Inline-Erläuterungen (ⓘ-Icon mit Hover-Tooltip)
- **Benutzerhandbuch Wiki-Hinweis** — alle 6 Sprachversionen des In-App-Handbuchs verweisen auf das GitHub Wiki
- **Eingeloggt-bleiben-Option** — „Remember me"-Checkbox im Login setzt 90-Tage-Session (statt 7 Tage Standard)

### Verbessert
- **Usability** — umfassende Tooltip-Abdeckung in Fahrtdetail, GrokChat, Fahrtenbuch, Logbuch, Benutzerverwaltung und weiteren Ansichten
- **Login-Seite** — für Tesla-Touchscreen optimiert (größere Eingabefelder, kein QR-Code-Umweg)
- **Favicon** — Ersetzte Lightning-Bolt-Platzhalter durch Tesla Model Y Silhouette

### Entfernt
- **QR-Pair-Login** — Komplettes Entfernen des QR-Code-basierten Geräte-Logins (technisch nicht sinnvoll; Tesla-Browser hat Touchscreen-Tastatur)

---

## [v2.0.0] — 2026-05-12

### Neu
- **Multi-Mandanten-Architektur** — vollständige Datenisolierung, eigene SQLite-DB pro Mandant
- **Einladungslinks** — neuer Mandant nur per Einladungslink (7 Tage, einmalig, mit optionaler Notiz)
- **Mandanten-Pseudonym** — datenschutzkonformer Login-Identifier statt Klarname, Admin-regenerierbar
- **Passwortloses sudo via SSH-Agent** — `pam_ssh_agent_auth` für deploy-sicheres Rechtekonzept
- **AES-256-GCM Encryption at rest** — Tesla-OAuth-Token, TOTP-Secrets, Virtual-Key per AES-GCM verschlüsselt
- **Audit-Log** — Admin-Viewer für sicherheitsrelevante Ereignisse (CSV-Export, DSGVO-konform)
- **Fleet Telemetry Primär** — WebSocket-Streaming als bevorzugte Datenquelle, spart >95 % API-Budget
- **Vollbackup + Restore** — JSON-Export aller Tabellen, sicherheits-aware Restore mit Vor-Backup
- **GitHub Actions CI/CD** — gitleaks, OWASP-Dependency-Check, Auto-Deploy via SSH

### Verbessert
- Poller schaltet bei aktivem Fleet-Telemetry auf 1×/h-Heartbeat
- Automatische Nacht-Wartung (WAL-Checkpoint, VACUUM, Auto-Update)
- Service-Worker + PWA-Auto-Update — kein manueller Browser-Reload mehr

---

## [v1.x] — Frühere Versionen

Die initiale Einzelmandanten-Version enthielt:
- Dashboard, Fahrten, Laden, Batterie, Technik-Telemetrie
- Fahrtenbuch (BMF-konform) inkl. PDF-Export
- Steuerung (Klima, Türen, Laden, Sentry, Navigation)
- Wartungsintervalle + Betriebsbuch
- Push-Benachrichtigungen (Web Push)
- Mehrsprachigkeit (DE/EN/FR/ES/TR/EL)
- aWattar + Tibber-Integration (Dynamischer Tarif)
- Installierbare PWA (iOS, Android, Tesla-Browser)

---

*Versionierung folgt [Semantic Versioning](https://semver.org/lang/de/). Breaking changes → Major, neue Features → Minor, Bugfixes → Patch.*
