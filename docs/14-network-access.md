# Von außen erreichbar — ohne statische IP

> 🇬🇧 [Read in English](14-network-access.en.md)

Dieses Kapitel erklärt **Schritt für Schritt**, wie du Tesla Carview von überall erreichbar machst — auch ohne feste öffentliche IP-Adresse, auch hinter einer FritzBox, auch im Heimnetz.

> **Kein IT-Profi? Kein Problem.** Jede Option enthält genaue Schrittanleitungen, die du ohne Vorkenntnisse befolgen kannst.

---

## Welche Option passt zu mir?

| Situation | Beste Option |
|---|---|
| Heimanschluss (FritzBox), IP wechselt täglich | [Option A: Cloudflare Tunnel](#option-a-cloudflare-tunnel-empfohlen-für-zuhause) oder [Option B: DynDNS + FritzBox](#option-b-dyndns--fritzbox) |
| Kabel- oder Glasfaseranschluss (Vodafone, O2 Kabel) — **kein eigenes Portöffnen möglich** | [Option A: Cloudflare Tunnel](#option-a-cloudflare-tunnel-empfohlen-für-zuhause) |
| Eigener Server / VPS bei Hoster (netcup, Hetzner) | [Option C: VPS mit statischer IP](#option-c-vps-bei-einem-hoster-netcup-hetzner-contabo) |
| Eigene Domain vorhanden | [Option D: Eigene Domain + DNS-Eintrag](#option-d-eigene-domain-mit-dns-eintrag) |

---

## Das Problem mit dynamischen IP-Adressen

Dein Internetanschluss zuhause hat **keine feste IP-Adresse** — der Router bekommt täglich (oder öfter) eine neue. Das bedeutet: wenn du heute `192.0.2.47` in die App einträgst, ist das morgen schon falsch.

Die Lösung heißt **Dynamic DNS (DynDNS oder DDNS)**:
- Du reservierst einen festen Domainnamen (z.B. `mein-tesla.duckdns.org`)
- Ein kleines Programm (läuft automatisch auf deinem Router oder Server) meldet jedes Mal die neue IP-Adresse
- Dein Domainname zeigt immer auf die aktuelle IP — du musst nie wieder etwas ändern

---

## Noch ein Problem: Kein öffentliches IPv4 (CG-NAT)

Viele Kabelanschlüsse (Vodafone Kabel, O2 Kabel, bestimmte Telekom-Tarife) haben seit einigen Jahren **gar keine eigene öffentliche IPv4-Adresse mehr**. Mehrere Kunden teilen sich eine IP. Das nennt sich Carrier-Grade NAT (CG-NAT).

**Erkennungstest:** Geh auf [https://www.wieistmeineip.de](https://www.wieistmeineip.de) und vergleiche die angezeigte IP mit der IP, die deine FritzBox unter `Internet → Online-Monitor` anzeigt. Sind die IPs **verschieden** → du bist hinter CG-NAT. Option B funktioniert dann **nicht**.

Bei CG-NAT ist **Option A (Cloudflare Tunnel)** die einzige Lösung ohne zusätzlichen Server.

---

## Option A: Cloudflare Tunnel (empfohlen für Zuhause)

**Was ist das?** Cloudflare Tunnel baut einen verschlüsselten Kanal von deinem Server nach außen — ohne dass du irgendeinen Port in deinem Router öffnen musst. Deine Tesla-Carview-Instanz wird über Cloudflares weltweites Netzwerk erreichbar.

**Kosten:** Kostenlos.

**Voraussetzungen:**
- Eine eigene Domain (z.B. `meinedomain.de`) **oder** eine kostenlose Subdomain (Anleitung folgt)
- Die Domain muss von Cloudflare verwaltet werden (kostenloser Schritt)

### Schritt 1: Kostenlose Domain besorgen (falls keine vorhanden)

Ohne eigene Domain nimmst du DuckDNS:
1. Geh zu [https://www.duckdns.org](https://www.duckdns.org) und melde dich mit Google/GitHub an
2. Wähle einen Namen, z.B. `mein-tesla` → du bekommst `mein-tesla.duckdns.org`
3. Notiere das **Token** (lange Buchstaben-Zahlen-Kombination unter deinem Profil)

Alternativ: Kostenlose `.de`-Domain bei [Freenom](https://www.freenom.com) oder günstig ab ~1€/Jahr bei [Namecheap](https://www.namecheap.com), [IONOS](https://www.ionos.de) oder [inwx.de](https://www.inwx.de).

### Schritt 2: Cloudflare Account + Domain eintragen

1. Geh zu [https://dash.cloudflare.com](https://dash.cloudflare.com) → kostenlos registrieren
2. Klick **„Add a Site"** und gib deine Domain ein
3. Wähle den **Free-Plan** (0€)
4. Cloudflare zeigt dir zwei Nameserver-Adressen, z.B.:
   ```
   alice.ns.cloudflare.com
   bob.ns.cloudflare.com
   ```
5. Geh zu deinem Domain-Anbieter (IONOS, Namecheap etc.) und trage diese **als Nameserver** ein
   - Bei IONOS: Domains → deine Domain → Nameserver → Eigene Nameserver
   - Bei Namecheap: Domain List → Manage → Nameservers → Custom DNS
6. Warte 10–30 Minuten bis Cloudflare bestätigt: **„Nameservers updated"**

> **DuckDNS-Nutzer:** DuckDNS lässt sich nicht direkt zu Cloudflare übertragen. Verwende stattdessen direkt `cloudflared` ohne eigene Domain — lies die [offizielle Anleitung für Tunnel ohne Domain](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/).

### Schritt 3: Tunnel erstellen

Auf deinem Server (SSH oder direkt):

```bash
# cloudflared installieren
curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb \
  -o /tmp/cloudflared.deb
dpkg -i /tmp/cloudflared.deb

# Am Cloudflare-Account anmelden (Browser öffnet sich)
cloudflared tunnel login

# Tunnel erstellen (Name frei wählbar)
cloudflared tunnel create tesla-carview

# Zeigt: Tunnel ID (z.B. "abc123-...") — merken!
```

### Schritt 4: Tunnel konfigurieren

```bash
mkdir -p /etc/cloudflared
nano /etc/cloudflared/config.yml
```

Inhalt (ersetze `DEINE_TUNNEL_ID` und `deinedomain.de`):

```yaml
tunnel: DEINE_TUNNEL_ID
credentials-file: /root/.cloudflared/DEINE_TUNNEL_ID.json

ingress:
  - hostname: tesla.deinedomain.de
    service: http://localhost:80
  - service: http_status:404
```

DNS-Eintrag anlegen (Cloudflare macht das automatisch):
```bash
cloudflared tunnel route dns tesla-carview tesla.deinedomain.de
```

### Schritt 5: Als Dienst einrichten (läuft automatisch nach Neustart)

```bash
cloudflared service install
systemctl enable cloudflared
systemctl start cloudflared
```

**Fertig!** Tesla Carview ist jetzt unter `https://tesla.deinedomain.de` erreichbar — mit automatischem HTTPS, ohne Portöffnen, ohne statische IP.

---

## Option B: DynDNS + FritzBox

> **Achtung:** Funktioniert nur wenn du eine **eigene öffentliche IPv4** hast (kein CG-NAT). Teste das vorher — [siehe oben](#noch-ein-problem-kein-öffentliches-ipv4-cg-nat).

**Was ist das?** Deine FritzBox meldet automatisch deine neue IP-Adresse an einen DynDNS-Dienst. Du erreichst dann Tesla Carview immer unter demselben Domainnamen.

### Schritt 1: DynDNS-Dienst wählen und anmelden

**Empfehlung: Dynu** (vollständig kostenlos, keine monatliche Bestätigung nötig)

1. Geh zu [https://www.dynu.com](https://www.dynu.com) → Account erstellen
2. DDNS → Add → gib einen Namen ein, z.B. `mein-tesla` → du bekommst `mein-tesla.freeddns.org`
3. Notiere: **Hostname**, **Benutzername**, **Passwort** (unter Control Panel → API Credentials)

**Alternative: DuckDNS** (noch einfacher, aber keine FritzBox-Direktintegration)

1. [https://www.duckdns.org](https://www.duckdns.org) → anmelden → Subdomain wählen
2. Update-URL: `https://www.duckdns.org/update?domains=DEINNAME&token=DEINTOKEN&ip=`

### Schritt 2: FritzBox konfigurieren

1. Öffne die FritzBox-Oberfläche: [http://fritz.box](http://fritz.box)
2. **Internet → Freigaben → DynDNS**
3. Haken setzen bei **„DynDNS benutzen"**
4. Ausfüllen:

   | Feld | Dynu-Wert | DuckDNS-Wert |
   |---|---|---|
   | DynDNS-Anbieter | Benutzerdefiniert | Benutzerdefiniert |
   | Update-URL | `https://api.dynu.com/nic/update?hostname=<domain>&myip=<ipaddr>` | `https://www.duckdns.org/update?domains=DEINNAME&token=DEINTOKEN&ip=<ipaddr>` |
   | Domainname | `mein-tesla.freeddns.org` | `mein-tesla.duckdns.org` |
   | Benutzername | Dynu-Benutzername | (egal, z.B. `nouser`) |
   | Kennwort | Dynu-Passwort | Dein DuckDNS-Token |

5. **Übernehmen** → FritzBox testet die Verbindung → grünes Häkchen = funktioniert

### Schritt 3: Portweiterleitung einrichten

Damit der Datenverkehr von außen deinen Server erreicht:

1. **Internet → Freigaben → Portfreigaben**
2. **Neue Portfreigabe** → **Andere Anwendung**
3. Ausfüllen:

   | Feld | Wert |
   |---|---|
   | Bezeichnung | Tesla Carview HTTPS |
   | Protokoll | TCP |
   | Port extern | 443 |
   | An Computer | IP deines Servers im Heimnetz (z.B. `192.168.178.100`) |
   | Port intern | 443 |

4. **Übernehmen** und aktivieren

> **Tipp:** Gib deinem Server im Heimnetz eine **feste (statische) IP** im lokalen Netz, damit die Portweiterleitung nicht „verrutscht". FritzBox → Heimnetz → Netzwerk → dein Gerät → IP-Adresse immer vergeben.

### Schritt 4: Tesla Carview konfigurieren

Öffne `/opt/tesla-carview/backend/.env` und setze:

```bash
FRONTEND_URL=https://mein-tesla.freeddns.org
```

SSL-Zertifikat per Let's Encrypt:
```bash
certbot --nginx -d mein-tesla.freeddns.org
```

**Fertig!** Erreichbar unter `https://mein-tesla.freeddns.org`.

---

## Option C: VPS bei einem Hoster (netcup, Hetzner, Contabo)

Ein VPS (Virtual Private Server) ist ein kleiner gemieteter Linux-Server im Rechenzentrum. Er hat immer eine **feste, öffentliche IPv4-Adresse** — keine DynDNS-Trickserei nötig.

**Preisvergleich (Stand 2026):**

| Anbieter | Produkt | Preis/Monat | Specs | Besonderheit |
|---|---|---|---|---|
| [netcup](https://www.netcup.com/de/server/vps-lite) | **VPS nano G11s** ⭐ | **~3,08€** | 2 vCore · 2 GB RAM · 60 GB SSD | Günstigster Einstieg, DE-Rechenzentrum, unlimitierter Traffic — **empfohlen für TeslaView** |
| [netcup](https://www.netcup.de) | VPS 1000 G11 | ~4,44€ | 2 vCore · 2 GB RAM · 40 GB SSD | Etwas mehr Leistungsreserve |
| [Hetzner](https://www.hetzner.com) | CX22 | ~4,35€ | 2 vCPU · 4 GB RAM · 40 GB | Sehr zuverlässig, Nürnberg/Falkenstein |
| [Contabo](https://contabo.com) | VPS S | ~5,99€ | 4 vCPU · 8 GB RAM · 100 GB | Viel Speicher für Multi-Tenant |
| [IONOS](https://www.ionos.de) | VPS S | ~1,00€ | 1 vCore · 1 GB RAM · 10 GB | Erstes Monat günstig, dann teurer |

> 💡 **Rabattcode für netcup:** Wir können dir auf Anfrage einen persönlichen Rabattcode für netcup zukommen lassen. Schreib einfach eine kurze E-Mail an [rabatt-code-netcup@krische.com](mailto:rabatt-code-netcup@krische.com) mit dem Betreff „netcup TeslaView".

> **Warum VPS nano G11s für TeslaView?** Tesla Carview benötigt im Idle ~150–200 MB RAM (Backend + nginx + Proxy). Mit 2 GB RAM ist reichlich Headroom vorhanden. Die 60 GB SSD bieten Platz für viele Jahre Telemetrie-Daten (SQLite wächst ca. 500 MB/Jahr bei aktivem Fahrzeug). 2 vCores sorgen dafür, dass Export- und Migrations-Queries den Poller nicht blockieren.

### Setup bei netcup (Beispiel)

1. Auf [netcup.de](https://www.netcup.de) registrieren
2. **Server Control Panel (SCP)** → VPS bestellen → Ubuntu 24.04 wählen
3. Root-Passwort aus der E-Mail kopieren
4. Terminal öffnen und einloggen:
   ```bash
   ssh root@DEINE-SERVER-IP
   ```
5. Tesla Carview installieren:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
   ```

Das Setup-Script fragt nach einem Domainnamen. Gib deine Domain ein (z.B. `tesla.meinedomain.de`) — Let's Encrypt und nginx werden automatisch eingerichtet.

### Domain auf den VPS zeigen lassen

Wenn du eine eigene Domain hast, lege einen **A-Record** an:

```
tesla.meinedomain.de  →  A  →  DEINE-VPS-IP  →  TTL 300
```

Wie das geht: [→ Option D unten](#option-d-eigene-domain-mit-dns-eintrag)

---

## Option D: Eigene Domain mit DNS-Eintrag

Wenn du eine eigene Domain hast (z.B. `meinedomain.de`) und einen Server mit **fester IP** (VPS oder statische Heimnetz-IP), ist der DNS-Eintrag das einzige, was du brauchst.

### Was ist ein A-Record?

Ein **A-Record** ist wie ein Telefonbuch-Eintrag:
- Links steht der Name: `tesla.meinedomain.de`
- Rechts steht die Nummer: `123.456.789.0` (deine Server-IP)
- Jeder Browser, der `tesla.meinedomain.de` aufruft, bekommt gesagt: „Die IP ist `123.456.789.0`"

### So richtest du den A-Record ein

**Bei IONOS:**
1. Domains → deine Domain → DNS → Eintrag hinzufügen
2. Typ: **A**, Hostname: `tesla`, Ziel: deine Server-IP
3. Speichern

**Bei Namecheap:**
1. Domain List → Manage → Advanced DNS → Add New Record
2. Typ: **A Record**, Host: `tesla`, Value: deine Server-IP
3. Save All Changes

**Bei inwx.de:**
1. Domainverwaltung → DNS → Eintrag hinzufügen
2. Typ: **A**, Name: `tesla`, Inhalt: deine Server-IP, TTL: 300
3. Speichern

**Bei Hetzner DNS Console ([dns.hetzner.com](https://dns.hetzner.com)):**
1. Zone auswählen → Records → Add Record
2. Type: **A**, Name: `tesla`, Value: deine Server-IP
3. Add record

> **TTL** (Time to Live) bestimmt, wie lange DNS-Einträge gecacht werden. Setze 300 (5 Minuten) bei Ersteinrichtung, damit Fehler schnell korrigierbar sind. Später kannst du auf 3600 erhöhen.

### Kontrolle: Hat der DNS-Eintrag sich verbreitet?

```bash
# Von deinem heimischen Computer aus testen:
nslookup tesla.meinedomain.de
# oder
dig tesla.meinedomain.de
```

Oder online: [https://dnschecker.org](https://dnschecker.org) — zeigt, ob der Eintrag weltweit sichtbar ist.

### Dynamische IP mit eigener Domain

Wenn du eine eigene Domain, aber keine feste IP hast, kombinierst du beides:

**Variante 1: CNAME auf DuckDNS** (FritzBox/DynDNS aktualisiert DuckDNS automatisch)
```
tesla.meinedomain.de  →  CNAME  →  mein-tesla.duckdns.org
```
Nachteil: Manche Mailserver oder Dienste mögen CNAME auf Apex-Domain nicht.

**Variante 2: Hetzner DNS + eigenes Update-Script**
```bash
# Cron-Job der alle 5 Minuten die IP aktualisiert:
*/5 * * * * curl -s "https://dns.hetzner.com/api/v1/records/RECORD_ID" \
  -H "Auth-API-Token: DEIN_TOKEN" \
  -H "Content-Type: application/json" \
  -X PUT -d "{\"value\":\"$(curl -s https://api4.my-ip.io/ip)\",\"ttl\":300,\"type\":\"A\",\"name\":\"tesla\",\"zone_id\":\"ZONE_ID\"}"
```

---

## Häufige Probleme und Lösungen

### „Seite nicht erreichbar" nach der Einrichtung

1. **Warte 5–30 Minuten** — DNS-Einträge brauchen Zeit zur Verbreitung
2. **Teste lokal zuerst:** Ist Tesla Carview auf dem Server erreichbar?
   ```bash
   curl -I http://localhost
   ```
3. **FritzBox-Portweiterleitung:** Klick auf **Testen** neben der Portfreigabe

### „Zertifikat ungültig" / „HTTPS-Fehler"

```bash
# Let's Encrypt Zertifikat neu ausstellen:
certbot renew --force-renewal
systemctl restart nginx
```

### FritzBox: Update-URL funktioniert nicht

- Die FritzBox ersetzt `<ipaddr>` durch die aktuelle IP — nicht selbst eintragen
- Teste die URL manuell im Browser (ersetze `<ipaddr>` temporär durch deine echte IP)
- Prüfe: Internet → DSL-Informationen → die angezeigte IP muss eine öffentliche sein (nicht `10.x.x.x` oder `100.x.x.x` — das wäre CG-NAT)

### „Ihre IP-Adresse beginnt mit 100." oder „10."

Das ist **CG-NAT** — sieh dir [Option A (Cloudflare Tunnel)](#option-a-cloudflare-tunnel-empfohlen-für-zuhause) an, das ist die einzige Lösung ohne zusätzlichen Server.

### IPv6 statt IPv4

Neuere FritzBox-Anschlüsse (besonders Glasfaser) arbeiten mit **IPv6**. Das funktioniert genauso — die FritzBox hat eine feste IPv6-Adresse und braucht kein DynDNS. Im DNS-Eintrag nimmst du dann statt **A** (IPv4) den Typ **AAAA** (IPv6).

---

## Zusammenfassung: Was wann nehmen?

```
Bist du hinter CG-NAT?  (IP beginnt mit 100. oder variiert täglich und FritzBox zeigt nicht dieselbe IP wie wieistmeineip.de)
  → JA:  Option A (Cloudflare Tunnel)
  → NEIN:
      Hast du einen Server im Rechenzentrum?
        → JA:  Option C + D (VPS + eigener DNS-Eintrag)
        → NEIN (Heimnetz):  Option B (DynDNS + FritzBox)
```

---

## Weiterführende Links

- [Cloudflare Tunnel Dokumentation](https://developers.cloudflare.com/tunnel/)
- [DuckDNS](https://www.duckdns.org/)
- [Dynu DDNS](https://www.dynu.com/)
- [netcup Community Tutorial: nginx Reverse Proxy](https://community.netcup.com/en/tutorials/how-to-setup-nginx-reverse-proxy)
- [Hetzner DNS Console](https://dns.hetzner.com)
- [dnschecker.org — DNS verbreitung prüfen](https://dnschecker.org)
- [wieistmeineip.de — eigene IP prüfen](https://www.wieistmeineip.de)

---

*→ Zurück zu [02-deployment.md](02-deployment.md) | [Alle Docs](README.md)*
