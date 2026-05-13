# Raspberry Pi: Speicher richtig wählen — kein SD-Karten-Tod mehr

> 🇬🇧 [Read in English](15-raspberry-pi-storage.en.md)

SD-Karten und Dauerbetrieb — das geht auf Dauer schief. Dieses Kapitel erklärt **warum**, welche Alternative für dich die richtige ist, und wie du sie in 20 Minuten einrichtest.

---

## Das Problem: Warum SD-Karten für Server ungeeignet sind

Moderne SD-Karten halten typischerweise **3.000–10.000 Schreibzyklen pro Speicherblock** aus — ältere Karten noch weniger. Das klingt viel, ist es aber nicht:

| Was schreibt auf die SD-Karte? | Häufigkeit |
|---|---|
| Docker-Container-Logs | Mehrmals pro Minute |
| SQLite-Datenbank (Fahrten, Ladevorgänge) | Bei jedem Poll (alle 30–60 s) |
| System-Logs (`/var/log`) | Dauerhaft |
| Betriebssystem-Swapfile | Bei Speicherdruck |

**Realistisches Ergebnis:** Eine normale SD-Karte hält unter Tesla Carview-Last oft **3–18 Monate**, dann:
- Dateisystem korrupt → System bootet nicht mehr
- Daten weg (Backups helfen, aber der Schaden ist da)
- Im schlimmsten Fall: unbemerkt stille Datenverfälschung

> **Fazit: SD-Karte ist für schnelles Ausprobieren okay. Für den Dauerbetrieb immer ersetzen.**

---

## Welche Option passt zu mir?

```
Welchen Raspberry Pi hast du?
│
├── Raspberry Pi 5
│     ├── Möchtest du maximale Performance und Langlebigkeit?
│     │     → Option B: NVMe SSD via M.2 HAT+ ⭐ (empfohlen)
│     └── Einfach & günstig, kein Basteln?
│           → Option A: USB-SSD (auch am Pi 5 hervorragend)
│
├── Raspberry Pi 4
│     ├── Homelab mit Gigabit-Netzwerk + vorhandenem Server?
│     │     → Option C: PXE-Netzwerkboot (kein lokaler Speicher nötig)
│     └── Normales Heimnetz, kein extra Server?
│           → Option A: USB-SSD (einfachste Lösung)
│
└── Raspberry Pi 3 oder älter
      → Option A: USB-SSD (mit USB 2.0, deutlich langsamer als Pi 4/5)
        oder: Neueren Pi kaufen — Pi 4/5 ist die bessere Investition
```

---

## Option A: USB-SSD (einfachste Lösung für alle Pi-Modelle)

**Was brauchst du:**
- Eine portable SSD **oder** eine 2,5″-SSD + USB-Adapter
- Das war's

**Empfohlene Hardware (Stand 2025):**

| Produkt | Preis ca. | Hinweis |
|---|---|---|
| Samsung T7 (500 GB) | ~55€ | Ausgezeichnet, aber am Pi 4: Quirk beachten (→ unten) |
| Crucial X6 (500 GB) | ~45€ | Zuverlässig, keine Quirks |
| WD My Passport SSD (500 GB) | ~50€ | Gut getestet unter Raspberry Pi OS |
| 2,5″ SATA SSD + UGREEN USB 3.0 Adapter | ~35–50€ | Sehr zuverlässig, empfohlen für Pi 4 |

> **Vorsicht bei Billig-Adaptern:** Manche No-Name USB-SATA-Adapter haben Probleme mit UASP (USB Attached SCSI Protocol) am Pi 4. Marken-Adapter (UGREEN, Inateck) sind zuverlässiger.

### Schritt 1: OS auf die SSD schreiben

1. Lade den **Raspberry Pi Imager** herunter: [https://www.raspberrypi.com/software/](https://www.raspberrypi.com/software/)
2. SSD per USB an deinen normalen Computer anschließen
3. Imager öffnen:
   - **Gerät:** Raspberry Pi 4 oder 5 wählen
   - **Betriebssystem:** Raspberry Pi OS Lite (64-bit) — ohne Desktop, spart Ressourcen
   - **Speicher:** deine SSD
4. Zahnrad-Symbol (⚙️) → vorab konfigurieren:
   - Hostname setzen (z.B. `tesla-pi`)
   - SSH aktivieren
   - WLAN-Daten eintragen (falls kein Kabel)
   - Benutzername + Passwort setzen
5. **Schreiben** — fertig in ca. 5 Minuten

### Schritt 2: Bootloader am Pi 4 aktualisieren (nur Pi 4, einmalig)

Der Pi 4 muss einmalig so konfiguriert werden, dass er von USB booten kann. **Der Pi 5 kann das ab Werk — diesen Schritt überspringen.**

```bash
# Entweder: kurz von einer normalen SD-Karte booten und dann:
sudo raspi-config
# → Advanced Options → Boot Order → USB Boot → Finish → Reboot

# Oder direkt per EEPROM:
sudo rpi-eeprom-update -a
sudo reboot
```

Danach: SD-Karte entfernen, SSD einstecken, Pi starten → bootet von SSD.

### Schritt 3: Samsung T7 Quirk am Pi 4 (falls nötig)

Falls der Pi 4 mit der Samsung T7 nicht bootet (hängt beim roten Blitz-Bildschirm):

```bash
# /boot/firmware/cmdline.txt öffnen (alles in einer Zeile!):
sudo nano /boot/firmware/cmdline.txt

# Am Ende der Zeile anhängen (mit Leerzeichen davor):
usb-storage.quirks=04e8:4001:u

# Speichern, neu starten:
sudo reboot
```

Das deaktiviert UASP für die T7 — die Geschwindigkeit ist immer noch 5–10× besser als eine SD-Karte.

### Schritt 4: Tesla Carview installieren

Ab hier ganz normal wie in [02-deployment.md](02-deployment.md) beschrieben:

```bash
curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
```

---

## Option B: NVMe-SSD am Raspberry Pi 5 (beste Performance)

Der Pi 5 hat einen **PCIe-Anschluss** — mit dem offiziellen M.2 HAT+ oder einem Drittanbieter-Adapter bekommst du NVMe-Geschwindigkeiten von **400–900 MB/s** (zum Vergleich: SD-Karte 20–90 MB/s).

**Was brauchst du:**

| Komponente | Empfehlung | Preis ca. |
|---|---|---|
| Raspberry Pi 5 (4 GB oder 8 GB RAM) | — | ab 60€ |
| Offizielles **Raspberry Pi M.2 HAT+** | 2230 oder 2242 Formfaktor | ~15€ |
| **oder** Pimoroni NVMe BASE | Kompakter, kein Abstandshalter nötig | ~20€ |
| **oder** Pineberry HatDrive Bottom | Liegt unter dem Pi | ~25€ |
| NVMe-SSD M.2 2230 oder 2242 | WD Green SN350, Kingston NV2, Samsung PM991 | 25–60€ |

> **Formfaktor beachten:** Das M.2 HAT+ unterstützt nur **2230** und **2242** (kurze/mittellange SSDs). Standard-2280-SSDs (die Langen) passen nicht auf das HAT+ — wohl aber auf manche Drittanbieter-HATs.

### Schritt 1: Hardware zusammenbauen

1. SSD in den M.2-Slot schieben (schräg einführen, dann flach drücken)
2. Mit der mitgelieferten Schraube sichern
3. FFC-Flachbandkabel verbinden (HAT → Pi 5 PCIe-Connector)
4. HAT auf GPIO-Header des Pi 5 stecken

### Schritt 2: OS auf NVMe-SSD schreiben

**Variante A (einfach):** Mit dem Raspberry Pi Imager direkt von einem laufenden Pi OS auf die NVMe schreiben:

```bash
# Pi mit SD-Karte starten, dann:
sudo apt update && sudo apt install rpi-imager -y
rpi-imager
# → NVMe SSD als Ziel wählen → schreiben
```

**Variante B:** SSD mit USB-NVMe-Adapter an einem normalen Computer beschreiben (wie bei Option A).

### Schritt 3: Boot-Reihenfolge setzen

```bash
sudo raspi-config
# → Advanced Options → Boot Order → NVMe/USB Boot
# → Finish → Reboot
```

SD-Karte entfernen, Pi neu starten → bootet von NVMe.

### Schritt 4: PCIe-Geschwindigkeit optimieren (optional)

Der Pi 5 betreibt PCIe standardmäßig in Gen 2 (~400 MB/s). Gen 3 (~900 MB/s) ist möglich, aber nicht offiziell unterstützt:

```bash
# /boot/firmware/config.txt:
sudo nano /boot/firmware/config.txt

# Für Gen 3 (auf eigenes Risiko, meist stabil):
dtparam=pciex1_gen=3
```

---

## Option C: PXE-Netzwerkboot (für Homelab-Enthusiasten)

**Was ist das?** Der Pi hat überhaupt kein lokales Speichermedium. Er bootet **komplett über das Netzwerk** von einem zentralen Server. Ideal wenn:
- Du mehrere Pis verwaltest
- Ein NAS (Synology, TrueNAS) oder Mini-PC als Server vorhanden ist
- Du zentralisierte Backups und Updates magst

**Voraussetzungen:**
- Gigabit-Ethernet (kein WLAN — zu langsam und unzuverlässig für PXE)
- Einen Server im Netz der DHCP + TFTP liefern kann (NAS, alter PC, Pi 4)
- Raspberry Pi 4 oder 5 (Pi 3 funktioniert mit etwas mehr Aufwand)

### Kurzanleitung: PXE-Server mit dnsmasq

Auf dem Server (Debian/Ubuntu oder dem NAS):

```bash
# dnsmasq installieren
sudo apt install dnsmasq -y

# TFTP-Verzeichnis anlegen
sudo mkdir -p /srv/tftp/rpi

# Pi OS rootfs auf den Server kopieren (per NFS bereitstellen):
sudo apt install nfs-kernel-server -y
sudo mkdir -p /srv/nfs/rpi

# /etc/exports:
echo "/srv/nfs/rpi *(rw,sync,no_subtree_check,no_root_squash)" | sudo tee -a /etc/exports
sudo exportfs -ra
```

**/etc/dnsmasq.conf** (Proxy-DHCP-Modus — der Pi kommt zusätzlich zu deinem Router):

```ini
port=0
dhcp-range=192.168.178.0,proxy
log-dhcp
enable-tftp
tftp-root=/srv/tftp
pxe-service=0,"Raspberry Pi Boot"
```

Das vollständige Setup (rootfs-Kopie, NFS-Konfiguration, Pi-seitige Konfiguration) ist umfangreich — folge der offiziellen Raspberry Pi PXE-Dokumentation:
[https://www.raspberrypi.com/documentation/computers/remote-access.html#network-boot-your-raspberry-pi](https://www.raspberrypi.com/documentation/computers/remote-access.html#network-boot-your-raspberry-pi)

**Für wen ist PXE wirklich sinnvoll?** Wenn du bereits ein Homelab mit zentralem Storage betreibst. Für einen einzelnen Pi ist USB-SSD oder NVMe einfacher und genauso gut.

---

## Von SD-Karte auf SSD migrieren (bestehende Installation)

Du hast Tesla Carview bereits auf einer SD-Karte laufen und möchtest auf SSD umziehen? Kein Problem — ohne Datenverlust:

### Schritt 1: SD-Karte auf SSD klonen

```bash
# SSD per USB an den laufenden Pi anschließen
# Zieldisk ermitteln:
lsblk
# → SSD erscheint meist als /dev/sda

# SD-Karte auf SSD klonen (Pi muss laufen bleiben):
sudo dd if=/dev/mmcblk0 of=/dev/sda bs=4M status=progress conv=fsync

# Danach Partitionsgröße auf der SSD anpassen:
sudo parted /dev/sda resizepart 2 100%
sudo resize2fs /dev/sda2
```

### Schritt 2: Von SSD booten

Bootloader-Update wie oben beschrieben (Option A, Schritt 2), dann SD-Karte entfernen, SSD bleibt eingesteckt.

### Schritt 3: Verifizieren

```bash
# Prüfen ob von SSD gebootet wird:
findmnt /
# → sollte /dev/sda2 oder nvme0n1p2 zeigen, NICHT mmcblk0p2
```

---

## Schnell-Vergleich aller Optionen

| | SD-Karte | USB-SSD | NVMe (Pi 5) | PXE |
|---|---|---|---|---|
| **Lebensdauer** | ❌ Monate | ✅ Jahre | ✅ Jahre | ✅ Kein lokaler Verschleiß |
| **Einrichtungsaufwand** | ✅ Minimal | ✅ Gering | 🟡 Mittel (HAT montieren) | ❌ Hoch |
| **Kosten** | ✅ ~10€ | 🟡 ~35–60€ | 🟡 ~50–100€ | ✅ 0€ (wenn Server vorhanden) |
| **Lesegeschwindigkeit** | 20–90 MB/s | 200–500 MB/s | 400–900 MB/s | LAN-Geschwindigkeit |
| **Empfohlen für** | Testen | Pi 4 Dauerbetrieb | Pi 5 Dauerbetrieb | Homelab |

---

## Häufige Fragen

### „Muss ich die SD-Karte ganz entfernen oder kann ich sie lassen?"

Beim Pi 4: Nach dem Bootloader-Update kann die SD-Karte entfernt werden. Der Pi bootet dann von USB. Lässt du sie drin und ist sie leer oder nicht bootbar, wird trotzdem von USB gebootet.

Beim Pi 5: SD-Karte kann eingesteckt bleiben — der Pi bevorzugt nach Konfiguration trotzdem NVMe/USB.

### „Wie groß soll die SSD sein?"

Für Tesla Carview reichen **60–120 GB** problemlos. Die SQLite-Datenbank wächst über Jahre auf ein paar Hundert MB. Größer zu kaufen kostet kaum mehr und gibt dem SSD-Controller mehr Raum für Wear-Leveling → längere Lebensdauer.

### „Was ist mit Stromausfall — verliere ich Daten?"

SSDs und NVMe-SSDs sind robuster als SD-Karten bei Stromausfällen, aber keine Garantie. Für wichtige Daten: **regelmäßige Backups** über die Tesla Carview Admin-Oberfläche (`Admin → Daten → Backup`) oder das automatische Nightly-Backup einschalten.

### „Kann ich auch einen USB-Stick nehmen statt SSD?"

Technisch ja, aber **nicht empfohlen**. USB-Sticks haben meist keine Wear-Leveling-Algorithmen — sie sterben noch schneller als SD-Karten. Der Preisunterschied zu einer günstigen SSD ist minimal.

---

## Weiterführende Links

- [Raspberry Pi Imager Download](https://www.raspberrypi.com/software/)
- [raspberry.tips: Pi 4 von USB-SSD booten (DE)](https://raspberry.tips/raspberrypi-tutorials/raspberry-pi-von-ssd-festplatte-booten)
- [raspberry.tips: Pi 5 NVMe Setup + Benchmarks (EN)](https://raspberry.tips/en/raspberrypi-tutorials/raspberry-pi-5-nvme-ssd-boot)
- [Offizielle Pi M.2 HAT+ Dokumentation](https://www.raspberrypi.com/documentation/accessories/m2-hat-plus.html)
- [Raspberry Pi PXE-Boot Dokumentation](https://www.raspberrypi.com/documentation/computers/remote-access.html#network-boot-your-raspberry-pi)
- [SD-Karten Lebensdauer Berechner](https://raspberry.tips/en/calculate-raspberry-pi-sd-card-lifespan-test-now)

---

*→ Zurück zu [02-deployment.md](02-deployment.md) | [Netzwerkzugang](14-network-access.md) | [Alle Docs](README.md)*
