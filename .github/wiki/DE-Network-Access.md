# Netzwerkzugang — Ohne statische IP

🌐 **Language / Sprache**

| | |
|---|---|
| 🇬🇧 **[English](Network-Access)** | English version |
| 🇩🇪 **[Deutsch](DE-Network-Access)** | Du bist hier |

---

Tesla Carview läuft auf deinem eigenen Server — aber damit er aus dem Internet erreichbar ist (auch aus deinem Tesla heraus), brauchst du eine stabile, öffentlich zugängliche Adresse. Diese Seite erklärt Schritt für Schritt alle Möglichkeiten.

> **Kein IT-Profi? Kein Problem.** Jede Option enthält genaue Schrittanleitungen ohne Vorkenntnisse.

---

## Welche Option passt zu mir?

| Situation | Beste Option |
|---|---|
| Heimanschluss (IP wechselt täglich) | [Option A: Cloudflare Tunnel](#option-a-cloudflare-tunnel-empfohlen) oder [Option B: DynDNS + FritzBox](#option-b-dyndns--fritzbox) |
| Kabel-/Glasfaseranschluss — **Ports öffnen nicht möglich** (CG-NAT) | [Option A: Cloudflare Tunnel](#option-a-cloudflare-tunnel-empfohlen) |
| VPS / Server bei einem Hoster | [Option C: VPS mit statischer IP](#option-c-vps-bei-einem-hoster) |
| Eigene Domain vorhanden | [Option D: Eigene Domain + DNS-Eintrag](#option-d-eigene-domain-mit-dns-eintrag) |

---

## Das Problem mit dynamischen IP-Adressen

Dein Heimanschluss bekommt täglich (oder öfter) eine neue IP-Adresse. Das bedeutet: die Adresse, die du heute einträgst, ist morgen falsch.

**Dynamic DNS** löst das:
- Du reservierst einen festen Hostnamen (z.B. `mein-tesla.duckdns.org`)
- Ein kleines Programm auf deinem Router oder Server meldet automatisch jede neue IP
- Dein Hostname zeigt immer auf die aktuelle IP — keine manuellen Updates nötig

---

## Bist du hinter CG-NAT?

Viele Kabelanbieter (Vodafone Kabel, O2 Kabel, bestimmte Tarife) geben jedem Kunden keine eigene öffentliche IPv4-Adresse mehr. Mehrere Kunden teilen sich eine IP — das nennt sich **Carrier-Grade NAT (CG-NAT)**.

**Erkennungstest:**
1. Gehe zu [wieistmeineip.de](https://www.wieistmeineip.de) — notiere die angezeigte IP
2. Öffne deine FritzBox-Oberfläche → Internet → Online-Monitor — notiere die WAN-IP
3. Sind die IPs **verschieden** → du bist hinter CG-NAT

Bei CG-NAT funktioniert Portweiterleitung **nicht**. Verwende Option A (Cloudflare Tunnel) — er braucht keine offenen Ports.

---

## Option A: Cloudflare Tunnel (Empfohlen)

Cloudflare Tunnel erstellt eine verschlüsselte ausgehende Verbindung von deinem Server zu Cloudflares globalem Netzwerk. Keine Portweiterleitung nötig. Kostenlos. Funktioniert hinter CG-NAT.

**Voraussetzungen:** Eine Domain oder eine kostenlose Subdomain (Anleitung folgt).

### Schritt 1: Kostenlose Domain besorgen (falls keine vorhanden)

Gehe zu [duckdns.org](https://www.duckdns.org), melde dich mit Google oder GitHub an, wähle einen Namen → du bekommst z.B. `mein-tesla.duckdns.org` kostenlos.

Oder kaufe eine günstige Domain (~1 €/Jahr) bei [Namecheap](https://www.namecheap.com), [IONOS](https://www.ionos.de) oder [inwx.de](https://www.inwx.de).

### Schritt 2: Domain zu Cloudflare hinzufügen

1. Bei [dash.cloudflare.com](https://dash.cloudflare.com) registrieren — kostenlos
2. **„Add a Site"** klicken → Domain eingeben → **Free-Plan**
3. Cloudflare zeigt zwei Nameserver-Adressen, z.B.:
   ```
   alice.ns.cloudflare.com
   bob.ns.cloudflare.com
   ```
4. Bei deinem Domain-Registrar diese als Nameserver eintragen
5. 10–30 Minuten warten → Cloudflare bestätigt „Nameservers updated"

### Schritt 3: `cloudflared` installieren und konfigurieren

Auf deinem Server (per SSH):

```bash
# Herunterladen und installieren
curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb \
  -o /tmp/cloudflared.deb
dpkg -i /tmp/cloudflared.deb

# Am Cloudflare-Account anmelden (Browser-Link wird angezeigt — öffnen)
cloudflared tunnel login

# Tunnel erstellen
cloudflared tunnel create tesla-carview
# Tunnel-ID notieren!
```

Konfigurationsdatei erstellen:

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

DNS-Eintrag automatisch anlegen:

```bash
cloudflared tunnel route dns tesla-carview tesla.deinedomain.de
```

### Schritt 4: Als Systemdienst einrichten

```bash
cloudflared service install
systemctl enable cloudflared
systemctl start cloudflared
```

**Fertig.** Tesla Carview ist jetzt unter `https://tesla.deinedomain.de` erreichbar — mit automatischem HTTPS, ohne offene Ports, ohne statische IP.

---

## Option B: DynDNS + FritzBox

> **Wichtig:** Funktioniert nur wenn du eine echte öffentliche IPv4-Adresse hast. [Vorher CG-NAT prüfen](#bist-du-hinter-cg-nat).

### Schritt 1: DynDNS-Dienst auswählen und anmelden

**Empfehlung: Dynu** (kostenlos, keine monatliche Bestätigung nötig):
1. Gehe zu [dynu.com](https://www.dynu.com) → Account erstellen → DDNS → Add
2. Namen eingeben, z.B. `mein-tesla` → du bekommst `mein-tesla.freeddns.org`
3. Hostname, Benutzername und Passwort notieren (Control Panel → API Credentials)

**DuckDNS** (noch einfacher):
1. [duckdns.org](https://www.duckdns.org) → anmelden → Subdomain wählen → Token notieren

### Schritt 2: FritzBox konfigurieren

1. FritzBox-Oberfläche öffnen: [http://fritz.box](http://fritz.box)
2. **Internet → Freigaben → DynDNS**
3. Haken bei **„DynDNS benutzen"** setzen und ausfüllen:

   | Feld | Dynu | DuckDNS |
   |---|---|---|
   | DynDNS-Anbieter | Benutzerdefiniert | Benutzerdefiniert |
   | Update-URL | `https://api.dynu.com/nic/update?hostname=<domain>&myip=<ipaddr>` | `https://www.duckdns.org/update?domains=DEINNAME&token=DEINTOKEN&ip=<ipaddr>` |
   | Domainname | `mein-tesla.freeddns.org` | `mein-tesla.duckdns.org` |
   | Benutzername | Dynu-Benutzername | — |
   | Kennwort | Dynu-Passwort | — |

3. **Übernehmen** → grünes Häkchen = funktioniert

### Schritt 3: Portweiterleitung einrichten

**FritzBox:** Internet → Freigaben → Portfreigaben → Neue Portfreigabe → Andere Anwendung

| Feld | Wert |
|---|---|
| Bezeichnung | Tesla Carview HTTPS |
| Protokoll | TCP |
| Port extern | 443 |
| An Computer | IP deines Servers im Heimnetz (z.B. `192.168.178.100`) |
| Port intern | 443 |

> **Tipp:** Gib deinem Server eine feste lokale IP. FritzBox → Heimnetz → Netzwerk → dein Gerät → IP-Adresse immer vergeben.

### Schritt 4: SSL-Zertifikat und Tesla Carview konfigurieren

```bash
# FRONTEND_URL in /opt/tesla-carview/backend/.env setzen:
FRONTEND_URL=https://mein-tesla.freeddns.org

# SSL-Zertifikat holen:
certbot --nginx -d mein-tesla.freeddns.org
```

---

## Option C: VPS bei einem Hoster

Ein VPS (Virtual Private Server) ist ein kleiner gemieteter Linux-Server mit einer **festen, dauerhaften öffentlichen IP**. Kein DynDNS, keine Portweiterleitung nötig.

**Preisvergleich (Stand 2025):**

| Anbieter | Produkt | Preis/Monat |
|---|---|---|
| [Hetzner](https://www.hetzner.com) | CX22 | ~4,35 € |
| [netcup](https://www.netcup.de) | VPS 1000 G11 | ~4,44 € |
| [Contabo](https://contabo.com) | VPS S | ~5,99 € |

**Setup (Beispiel: Hetzner):**
1. Registrieren → Server erstellen → Ubuntu 24.04 wählen → öffentliche IP notieren
2. Per SSH einloggen: `ssh root@DEINE-SERVER-IP`
3. Setup-Skript ausführen:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
   ```

Das Skript fragt nach deinem Domainnamen und konfiguriert nginx + Let's Encrypt automatisch.

Dann Domain darauf zeigen lassen → [Option D](#option-d-eigene-domain-mit-dns-eintrag)

---

## Option D: Eigene Domain mit DNS-Eintrag

Wenn du eine eigene Domain und einen Server mit fester IP hast, erstelle einen **A-Record**:

**Was ist ein A-Record?** Ein Telefonbuch-Eintrag: `tesla.meinedomain.de → 123.456.789.0`

**Bei IONOS:**
Domains → deine Domain → DNS → Eintrag hinzufügen → Typ: A, Hostname: `tesla`, Ziel: deine Server-IP

**Bei Namecheap:**
Domain List → Manage → Advanced DNS → Add New Record → A Record, Host: `tesla`, Value: deine IP

**Bei inwx.de:**
Domainverwaltung → DNS → Eintrag hinzufügen → Typ: A, Name: `tesla`, Inhalt: deine IP, TTL: 300

**Bei Hetzner DNS ([dns.hetzner.com](https://dns.hetzner.com)):**
Zone auswählen → Records → Add Record → A, Name: `tesla`, Value: deine IP

> **TTL:** Setze 300 (5 Minuten) bei Ersteinrichtung — macht Fehler leicht korrigierbar. Später auf 3600 erhöhen.

### Ausbreitung prüfen

```bash
nslookup tesla.meinedomain.de
# oder online: https://dnschecker.org
```

---

## Entscheidungsbaum

```
Bist du hinter CG-NAT? (IP beginnt mit 100. oder FritzBox zeigt andere IP als wieistmeineip.de)
  JA → Option A: Cloudflare Tunnel
  NEIN:
    Hast du einen Server im Rechenzentrum?
      JA → Option C + D (VPS + DNS-Eintrag)
      NEIN (Heimnetz):
        Hast du eine eigene Domain?
          JA → Option B (DynDNS) + Option D (DNS-Eintrag)
          NEIN → Option B mit kostenloser Subdomain (DuckDNS/Dynu)
```

---

## Häufige Probleme

### „Seite nicht erreichbar" direkt nach dem Setup

DNS braucht 5–30 Minuten zur Ausbreitung. Zuerst lokal testen:
```bash
curl -I http://localhost
```

### „Zertifikat ungültig" / HTTPS-Fehler

```bash
certbot renew --force-renewal
systemctl restart nginx
```

### FritzBox DynDNS Update-URL funktioniert nicht

Die FritzBox ersetzt `<ipaddr>` automatisch — nicht selbst ausfüllen. URL im Browser testen, indem `<ipaddr>` durch die aktuelle echte IP ersetzt wird.

### „Meine WAN-IP beginnt mit 100. oder 10."

Das ist CG-NAT → [Option A (Cloudflare Tunnel)](#option-a-cloudflare-tunnel-empfohlen) verwenden.

### IPv6 / kein IPv4

Neuere Glasfaser-Anschlüsse verwenden IPv6. Funktioniert genauso — verwende einen **AAAA**-Record statt **A** im DNS.

---

## Nützliche Links

- [Cloudflare Tunnel Dokumentation](https://developers.cloudflare.com/tunnel/)
- [DuckDNS](https://www.duckdns.org/) — kostenloser Dynamic DNS
- [Dynu DDNS](https://www.dynu.com/) — kostenlos, keine monatliche Bestätigung
- [dnschecker.org](https://dnschecker.org) — DNS-Ausbreitung weltweit prüfen
- [wieistmeineip.de](https://www.wieistmeineip.de) — eigene IP prüfen

---

*Dieses Wiki wird automatisch aus dem Repository generiert. Zuletzt aktualisiert: siehe [Commits](https://github.com/KnevS/Tesla-Carview/commits/main).*
