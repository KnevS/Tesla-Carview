# Raspberry Pi Speicher — Kein SD-Karten-Tod mehr

🌐 **Sprache / Language:** [EN](Raspberry-Pi-Storage) · [FR](FR-Raspberry-Pi-Storage) · [ES](ES-Raspberry-Pi-Storage) · [TR](TR-Raspberry-Pi-Storage) · [EL](EL-Home) · **DE**

---

SD-Karten und Dauerbetrieb — das geht auf Dauer schief. Diese Seite erklärt warum, welche Alternative für dich die richtige ist, und wie du sie in 20 Minuten einrichtest.

---

## Warum SD-Karten für Server ungeeignet sind

Moderne SD-Karten halten typischerweise **3.000–10.000 Schreibzyklen pro Speicherblock** aus. Das klingt viel, ist es aber nicht:

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
│     ├── Maximale Performance und Langlebigkeit gewünscht?
│     │     → Option B: NVMe SSD via M.2 HAT+ ⭐ (empfohlen)
│     └── Einfach & günstig, kein Basteln?
│           → Option A: USB-SSD (auch am Pi 5 hervorragend)
│
├── Raspberry Pi 4
│     ├── Homelab mit Gigabit-Netzwerk + vorhandenem Server?
│     │     → Option C: PXE-Netzwerkboot (kein lokaler Speicher nötig)
│     └── Normales Heimnetz?
│           → Option A: USB-SSD (einfachste Lösung)
│
└── Raspberry Pi 3 oder älter
      → Option A: USB-SSD (mit USB 2.0, langsamer als Pi 4/5)
        oder: Neueren Pi kaufen — Pi 4/5 ist die bessere Investition
```

---

## Option A: USB-SSD (Einfachste Lösung für alle Pi-Modelle)

**Was du brauchst:** Eine portable SSD oder eine 2,5″-SSD + USB-Adapter.

### Empfohlene Hardware (Stand 2025)

| Produkt | Preis ca. | Hinweis |
|---|---|---|
| Samsung T7 (500 GB) | ~55 € | Ausgezeichnet, aber am Pi 4: Quirk beachten (→ unten) |
| Crucial X6 (500 GB) | ~45 € | Zuverlässig, keine Quirks |
| WD My Passport SSD (500 GB) | ~50 € | Gut getestet unter Raspberry Pi OS |
| 2,5″ SATA SSD + UGREEN USB 3.0 Adapter | ~35–50 € | Sehr zuverlässig, empfohlen für Pi 4 |

> **Vorsicht bei Billig-Adaptern:** Manche No-Name USB-SATA-Adapter haben Probleme mit UASP am Pi 4. Marken-Adapter (UGREEN, Inateck) sind zuverlässiger.

### Schritt 1: OS auf die SSD schreiben

1. [Raspberry Pi Imager](https://www.raspberrypi.com/software/) herunterladen und installieren
2. SSD per USB an deinen normalen Computer anschließen
3. Imager öffnen:
   - **Gerät:** Raspberry Pi 4 oder 5 wählen
   - **Betriebssystem:** Raspberry Pi OS Lite (64-bit) — ohne Desktop, spart Ressourcen für Docker
   - **Speicher:** deine SSD
4. Das Zahnrad-Symbol (⚙️) klicken → vorab konfigurieren:
   - Hostname setzen (z.B. `tesla-pi`)
   - SSH aktivieren: Ja
   - WLAN-Zugangsdaten (falls kein Kabel)
   - Benutzername + Passwort setzen
5. **Schreiben** klicken — fertig in ca. 5 Minuten

### Schritt 2: USB-Boot am Pi 4 aktivieren (einmalig, Pi 5 überspringt das)

Der Pi 5 bootet ab Werk von USB. Der Pi 4 braucht eine einmalige Bootloader-Aktualisierung:

```bash
# Kurz von einer SD-Karte booten, dann:
sudo raspi-config
# → Advanced Options → Boot Order → USB Boot → Finish → Reboot
```

Danach: SD-Karte entfernen, SSD einstecken, Pi starten → bootet von SSD.

### Schritt 3: Samsung T7 Quirk am Pi 4 (falls nötig)

Falls der Pi 4 mit der Samsung T7 nicht bootet (hängt beim roten Blitz-Bildschirm):

```bash
# Diese Datei öffnen — alles in einer Zeile!
sudo nano /boot/firmware/cmdline.txt

# Am Ende der Zeile anhängen (mit Leerzeichen davor):
usb-storage.quirks=04e8:4001:u

# Speichern (Ctrl+O, Enter, Ctrl+X), dann neu starten:
sudo reboot
```

Das deaktiviert UASP nur für die T7. Die Geschwindigkeit ist immer noch 5–10× besser als eine SD-Karte.

### Schritt 4: Tesla Carview installieren

```bash
curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
```

---

## Option B: NVMe-SSD am Raspberry Pi 5 (Beste Performance)

Der Pi 5 hat einen **PCIe-Anschluss**. Mit einem M.2 HAT bekommst du NVMe-Geschwindigkeiten von **400–900 MB/s** — verglichen mit ~20–90 MB/s bei SD-Karten.

### Benötigte Hardware

| Komponente | Empfehlung | Preis ca. |
|---|---|---|
| Raspberry Pi 5 (4 GB oder 8 GB) | — | ab 60 € |
| Offizielles **Raspberry Pi M.2 HAT+** | 2230 oder 2242 Formfaktor | ~15 € |
| **oder** Pimoroni NVMe BASE | Kompakter, kein Abstandshalter | ~20 € |
| **oder** Pineberry HatDrive Bottom | Liegt unter dem Pi | ~25 € |
| NVMe-SSD M.2 **2230 oder 2242** | WD SN350, Kingston NV2, Samsung PM991 | 25–60 € |

> **Formfaktor ist entscheidend:** Das offizielle M.2 HAT+ unterstützt nur **2230** und **2242** (kurze SSDs). Standard-2280-SSDs (die Langen) passen nicht. Drittanbieter-HATs unterstützen oft 2280 — vor dem Kauf prüfen.

### Schritt 1: Hardware zusammenbauen

1. SSD in den M.2-Slot schieben (schräg einführen, dann flach drücken)
2. Mit der mitgelieferten Schraube sichern
3. FFC-Flachbandkabel verbinden (HAT ↔ Pi 5 PCIe-Connector)
4. HAT auf GPIO-Header des Pi 5 stecken

### Schritt 2: OS auf NVMe schreiben

**Einfache Methode:** Von SD-Karte booten, dann auf NVMe schreiben:
```bash
sudo apt update && sudo apt install rpi-imager -y
rpi-imager
# NVMe SSD als Ziel wählen → schreiben
```

**Alternative:** USB-NVMe-Adapter an einem normalen Computer nutzen und Raspberry Pi Imager wie in Option A verwenden.

### Schritt 3: Boot-Reihenfolge setzen

```bash
sudo raspi-config
# → Advanced Options → Boot Order → NVMe/USB Boot
# → Finish → Reboot
```

SD-Karte entfernen → Pi bootet von NVMe.

### Schritt 4: PCIe Gen 3 aktivieren (optional)

Der Pi 5 betreibt PCIe standardmäßig in Gen 2 (~400 MB/s). Gen 3 (~900 MB/s) ist inoffiziell aber meist stabil:

```bash
sudo nano /boot/firmware/config.txt
# Am Ende hinzufügen:
dtparam=pciex1_gen=3
```

---

## Option C: PXE-Netzwerkboot (Für Homelab-Enthusiasten)

PXE-Boot bedeutet: der Pi hat **gar keinen lokalen Speicher** — er bootet komplett über das Netzwerk von einem zentralen Server. Gut wenn:
- Du mehrere Pis verwaltest
- Ein NAS (Synology, TrueNAS) oder Mini-PC im Netz vorhanden ist
- Du zentralisierte Backups und Updates bevorzugst

**Voraussetzungen:**
- Gigabit-Ethernet (WLAN ist zu langsam/unzuverlässig für PXE)
- Einen vorhandenen Server im Netz mit DHCP + TFTP + NFS
- Raspberry Pi 4 oder 5

Das vollständige Setup ist umfangreich — folge der offiziellen Raspberry Pi PXE-Dokumentation:
[Raspberry Pi PXE boot Dokumentation](https://www.raspberrypi.com/documentation/computers/remote-access.html#network-boot-your-raspberry-pi)

**Für wen ist PXE wirklich sinnvoll?** Nur wenn du bereits ein Homelab mit zentralem Storage betreibst. Für einen einzelnen Pi ist USB-SSD oder NVMe einfacher und genauso gut.

---

## Von SD-Karte auf SSD migrieren (ohne Datenverlust)

Läuft Tesla Carview bereits auf einer SD-Karte? Umziehen in ca. 20 Minuten ohne Datenverlust:

### Schritt 1: SD-Karte auf SSD klonen

```bash
# SSD per USB an den laufenden Pi anschließen
# Zieldisk ermitteln (erscheint meist als /dev/sda):
lsblk

# SD-Karte auf SSD klonen (Pi kann weiterlaufen):
sudo dd if=/dev/mmcblk0 of=/dev/sda bs=4M status=progress conv=fsync

# Partitionsgröße auf der SSD anpassen:
sudo parted /dev/sda resizepart 2 100%
sudo resize2fs /dev/sda2
```

### Schritt 2: Bootquelle wechseln

USB-Boot wie oben beschrieben (Option A, Schritt 2) aktivieren, dann SD-Karte entfernen.

### Schritt 3: Verifizieren

```bash
findmnt /
# Sollte /dev/sda2 oder nvme0n1p2 zeigen, NICHT mmcblk0p2
```

---

## Vergleich aller Optionen

| | SD-Karte | USB-SSD | NVMe (Pi 5) | PXE |
|---|---|---|---|---|
| **Lebensdauer** | ❌ Monate | ✅ Jahre | ✅ Jahre | ✅ Kein lokaler Verschleiß |
| **Einrichtungsaufwand** | ✅ Minimal | ✅ Gering | 🟡 Mittel (HAT montieren) | ❌ Hoch |
| **Kosten** | ✅ ~10 € | 🟡 ~35–60 € | 🟡 ~50–100 € | ✅ 0 € (wenn Server vorhanden) |
| **Lesegeschwindigkeit** | 20–90 MB/s | 200–500 MB/s | 400–900 MB/s | LAN-Geschwindigkeit |
| **Empfohlen für** | Testen | Pi 4 Dauerbetrieb | Pi 5 Dauerbetrieb | Homelab |

---

## Häufige Fragen

### Muss ich die SD-Karte ganz entfernen?

Pi 4: Nach dem Bootloader-Update kannst du die SD-Karte entfernen. Lässt du sie drin und ist sie leer oder nicht bootbar, bootet der Pi trotzdem von USB.

Pi 5: SD-Karte kann eingesteckt bleiben — der Pi bevorzugt nach Konfiguration trotzdem NVMe/USB.

### Wie groß soll die SSD sein?

**60–120 GB** reichen problemlos. Die SQLite-Datenbank wächst über Jahre auf ein paar Hundert MB. Größer zu kaufen kostet kaum mehr und gibt dem SSD-Controller mehr Raum für Wear-Leveling → längere Lebensdauer.

### Kann ich auch einen USB-Stick nehmen?

Technisch ja, aber **nicht empfohlen**. USB-Sticks haben meist kein Wear-Leveling — sie sterben noch schneller als SD-Karten. Der Preisunterschied zu einer günstigen SSD ist minimal.

### Was passiert bei Stromausfall?

SSDs sind robuster als SD-Karten bei Stromausfällen, aber keine Garantie. Für wichtige Daten: **regelmäßige Backups** über die Tesla Carview Admin-Oberfläche (`Admin → Daten → Backup`) oder das automatische Nightly-Backup einschalten.

---

## Nützliche Links

- [Raspberry Pi Imager Download](https://www.raspberrypi.com/software/)
- [Offizielle M.2 HAT+ Dokumentation](https://www.raspberrypi.com/documentation/accessories/m2-hat-plus.html)
- [Raspberry Pi PXE-Boot Dokumentation](https://www.raspberrypi.com/documentation/computers/remote-access.html#network-boot-your-raspberry-pi)
- [raspberry.tips: Pi 4 von USB-SSD booten (DE)](https://raspberry.tips/raspberrypi-tutorials/raspberry-pi-von-ssd-festplatte-booten)
- [raspberry.tips: Pi 5 NVMe Setup + Benchmarks (EN)](https://raspberry.tips/en/raspberrypi-tutorials/raspberry-pi-5-nvme-ssd-boot)

---

*Dieses Wiki wird automatisch aus dem Repository generiert. Zuletzt aktualisiert: siehe [Commits](https://github.com/KnevS/Tesla-Carview/commits/main).*
