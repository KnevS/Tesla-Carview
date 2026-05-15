# Installationsanleitung

🌐 **Sprache / Language:** [EN](Installation) · [FR](FR-Installation) · [ES](ES-Installation) · [TR](TR-Installation) · [EL](EL-Home) · **DE**

---

> **Zeitaufwand:** ~30 Minuten | **Schwierigkeitsgrad:** Einsteigerfreundlich

Diese Anleitung führt dich durch eine vollständige Tesla Carview Installation von Grund auf.

---

## Was du vorher brauchst

Bevor du irgendeinen Befehl eingibst, stelle sicher, dass du Folgendes hast:

- [ ] Einen Linux-Server, VPS oder Raspberry Pi (siehe [Hardware-Optionen](#hardware-optionen) unten)
- [ ] Einen Domainnamen, der auf deinen Server zeigt — ODER du planst DynDNS / Cloudflare Tunnel zu nutzen ([→ Netzwerkzugang](DE-Network-Access))
- [ ] Einen Tesla Developer Account ([→ Tesla API Setup](DE-Tesla-API-Setup))
- [ ] SSH-Zugang zu deinem Server (oder Tastatur + Bildschirm am Pi)

---

## Hardware-Optionen

### Option 1: Raspberry Pi (Heimserver)
Ideal für: persönlichen Einsatz zuhause, geringe Kosten (~60–120 € gesamt)

| Modell | RAM | Empfohlener Speicher |
|---|---|---|
| Raspberry Pi 5 (empfohlen) | 4 GB oder 8 GB | NVMe SSD via M.2 HAT+ |
| Raspberry Pi 4 | 4 GB | USB SSD |
| Raspberry Pi 3 | 1 GB | USB SSD (langsamer) |

> **Wichtig:** Verwende keine SD-Karte für den Dauerbetrieb. Sie wird unter der Schreiblast von Tesla Carview innerhalb weniger Monate ausfallen. Siehe [Raspberry Pi Speicher](DE-Raspberry-Pi-Storage) für eine 20-Minuten-Lösung.

### Option 2: VPS bei einem Hosting-Anbieter
Ideal für: 24/7 Verfügbarkeit, keine Hardware zu verwalten, einfaches Setup

| Anbieter | Monatliche Kosten | Hinweise |
|---|---|---|
| [Hetzner](https://www.hetzner.com) CX22 | ~4,35 € | Empfohlen, sehr zuverlässig |
| [netcup](https://www.netcup.eu) VPS 1000 | ~4,44 € | Deutsche Rechenzentren |
| [Contabo](https://contabo.com) VPS S | ~5,99 € | Viel Speicher |

Ein VPS hat eine **feste öffentliche IP-Adresse** — kein DynDNS-Setup nötig.

---

## Schritt 1: Server vorbereiten

Verbinde dich per SSH mit deinem Server (oder öffne ein Terminal auf dem Pi):

```bash
ssh root@DEINE-SERVER-IP
```

Stelle sicher, dass das System aktuell ist:

```bash
apt update && apt upgrade -y
```

---

## Schritt 2: Domain auf deinen Server zeigen lassen

Tesla Carview **benötigt HTTPS** (Teslas API funktioniert nur über sichere Verbindungen). Das bedeutet, du brauchst eine Domain mit einem gültigen SSL-Zertifikat.

**Ich habe einen VPS mit fester IP:**
→ Gehe zu deinem Domain-Registrar und erstelle einen A-Record:
```
tesla.meinedomain.de  →  A  →  DEINE-VPS-IP
```
Warte 5–30 Minuten auf die DNS-Ausbreitung, dann weiter.

**Ich bin zuhause ohne feste IP:**
→ Siehe [Netzwerkzugang](DE-Network-Access) — richte zuerst DynDNS oder Cloudflare Tunnel ein, dann komme hierher zurück.

**Ich habe gar keine Domain:**
→ Hole dir eine kostenlose Subdomain bei [DuckDNS.org](https://www.duckdns.org) (z.B. `mein-tesla.duckdns.org`) — kostenlos und funktioniert mit Let's Encrypt.

---

## Schritt 3: Setup-Skript ausführen

Dieser einzelne Befehl lädt den interaktiven Setup-Wizard herunter und startet ihn:

```bash
curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
```

Der Wizard stellt dir eine Reihe von Fragen:

| Frage | Was du eingeben sollst |
|---|---|
| Domainname | `tesla.meinedomain.de` oder `mein-tesla.duckdns.org` |
| Admin-Benutzername | Beliebiger Name (z.B. dein Vorname, `admin`) |
| Admin-Passwort | Ein starkes Passwort (min. 12 Zeichen) |
| Tenant-Name | Wie deine Installation heißen soll (z.B. „Mein Tesla") |
| HTTPS aktivieren | Ja (immer — erforderlich für Tesla API) |

Das Skript erledigt dann automatisch:
1. Docker, nginx, certbot, fail2ban installieren
2. Let's Encrypt SSL-Zertifikat für deine Domain holen
3. nginx mit Sicherheits-Headern konfigurieren
4. Alle Docker-Container starten
5. Datenbank einrichten

**Das dauert 5–10 Minuten.**

---

## Schritt 4: Erster Login

Öffne deinen Browser und gehe zu `https://tesla.meinedomain.de`

Du solltest die Tesla Carview Anmeldeseite sehen. Gib den Admin-Benutzernamen und das Passwort ein, das du in Schritt 3 gesetzt hast.

> **Tipp:** Aktiviere „Angemeldet bleiben (90 Tage)" auf der Login-Seite, damit du dein Passwort nicht jedes Mal eingeben musst — besonders praktisch beim Zugriff aus dem Tesla-Browser.

---

## Schritt 5: Tesla-Konto verbinden

Nach dem Login siehst du eine Aufforderung, dein Tesla-Konto zu verbinden. Befolge die Anweisungen in [Tesla API Setup](DE-Tesla-API-Setup).

---

## Schritt 6: Fertig!

Deine Tesla Carview Installation läuft. Die App beginnt automatisch, die Fahrzeugdaten abzurufen.

Was du als nächstes tun kannst:
- **Fahrzeug einrichten** → Dashboard → Fahrzeug hinzufügen
- **Benachrichtigungen konfigurieren** → Einstellungen → Push-Benachrichtigungen
- **Familienmitglieder einladen** → Admin → Benutzer → Einladen
- **Ladestandort einrichten** → Einstellungen → Ladestandorte

---

## Updates einspielen

Tesla Carview kann sich automatisch aktualisieren. Aktiviere es in den Einstellungen:

```bash
# In /opt/tesla-carview/backend/.env:
AUTO_UPDATE_ENABLED=true
```

Oder manuell aktualisieren:

```bash
cd /opt/tesla-carview
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

---

## Probleme bei der Installation

**„Permission denied" beim Ausführen des Skripts**
→ Stelle sicher, dass du als `root` arbeitest. Führe zuerst `sudo su` aus.

**„Domain not found" bei certbot**
→ Dein DNS hat sich noch nicht ausgebreitet. Warte 10–30 Minuten und versuche es erneut. Prüfe mit: `nslookup tesla.meinedomain.de`

**Container starten nicht**
→ Logs prüfen: `docker compose -f /opt/tesla-carview/docker-compose.prod.yml logs`

**Weitere Hilfe** → [Fehlerbehebung](DE-Troubleshooting) | [Issue öffnen](https://github.com/KnevS/Tesla-Carview/issues)

---

*Dieses Wiki wird automatisch aus dem Repository generiert. Zuletzt aktualisiert: siehe [Commits](https://github.com/KnevS/Tesla-Carview/commits/main).*
