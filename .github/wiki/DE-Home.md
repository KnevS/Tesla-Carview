🌐 **Language / Sprache / Langue / Idioma / Dil / Γλώσσα**

| | |
|---|---|
| 🇬🇧 **[English](Home)** | English version |
| 🇩🇪 **[Deutsch](DE-Home)** | Du bist hier |
| 🇫🇷 **[Français](FR-Home)** | Version française |
| 🇪🇸 **[Español](ES-Home)** | Versión en español |
| 🇹🇷 **[Türkçe](TR-Home)** | Türkçe sürüm |
| 🇬🇷 **[Ελληνικά](EL-Home)** | Ελληνική έκδοση |

---

# Willkommen im Tesla Carview Wiki

**Tesla Carview** ist ein selbst gehosteter Daten-Logger und Steuerungs-App für Tesla-Fahrzeuge. Deine Daten bleiben auf deinem eigenen Server — keine Cloud, kein Drittanbieter-Zugriff.

---

## ⚖️ Lizenz — bitte zuerst lesen

Tesla Carview ist für **nicht-kommerzielle, private Nutzung** lizenziert.

Du darfst:
- ✅ Deine eigene Instanz für den persönlichen Gebrauch betreiben
- ✅ Den Code für deine eigene private Installation anpassen
- ✅ Das Projekt mit anderen teilen (mit Quellenangabe)

Du darfst **nicht**:
- ❌ Tesla Carview als bezahlten Dienst für andere betreiben
- ❌ Es kommerziell nutzen (Kundenprojekte, SaaS, Flottenmanagement gegen Entgelt)
- ❌ Copyright-Hinweise oder Quellenangaben entfernen

Vollständige Lizenzdetails: [Lizenz & Nutzungsrechte](License-and-Usage)

---

## 🗺️ Wo möchtest du starten?

### Ich bin neu — wo fange ich an?

→ **[Installationsanleitung](Installation)** — Schritt-für-Schritt-Einrichtung in 30 Minuten

### Tesla Carview läuft, aber ich kann es von außen nicht erreichen

→ **[Netzwerkzugang](Network-Access)** — DynDNS, Cloudflare Tunnel, FritzBox, VPS

### Meine Raspberry Pi SD-Karte stirbt immer wieder

→ **[Raspberry Pi Speicher](Raspberry-Pi-Storage)** — USB-SSD, NVMe, PXE-Boot

### Ich möchte mein Tesla-Konto verbinden

→ **[Tesla API Einrichtung](Tesla-API-Setup)** — Developer-Account, Tokens, Virtual Key

### Ich möchte alle Funktionen verstehen

→ **[Funktionsübersicht](Features)** — Dashboard, Fahrten, Laden, Steuerung und mehr

### Ich habe mehrere Benutzer oder möchte es für die Familie einrichten

→ **[Multi-Tenant & Benutzer](Multi-Tenant)** — Mandanten, Benutzer-Einladungen, Berechtigungen

### Etwas funktioniert nicht

→ **[Fehlerbehebung](Troubleshooting)** — Häufige Probleme und Lösungen

---

## 🔑 Auf einen Blick

| Merkmal | Details |
|---|---|
| **Plattform** | Linux-Server, Raspberry Pi, VPS |
| **Speicher** | SQLite (pro Mandant, keine externe DB notwendig) |
| **Authentifizierung** | Benutzername/Passwort, Passkeys, MFA (TOTP) |
| **API** | Tesla Fleet API (offiziell), Virtual Key für Befehle |
| **Sprachen** | DE, EN, FR, ES, TR, EL |
| **Lizenz** | Nicht-kommerzielle private Nutzung |

---

## 📂 Für IT-Experten

Dieses Wiki ist der geführte Einstiegspunkt. Wer lieber rohe Markdown-Dateien mit vollständigen technischen Details liest, findet alles im Repository:

| Ressource | Link |
|---|---|
| Technische Dokumentation (Übersicht) | [docs/README.md](https://github.com/KnevS/Tesla-Carview/blob/main/docs/README.md) |
| Alle Umgebungsvariablen | [docs/10-configuration.md](https://github.com/KnevS/Tesla-Carview/blob/main/docs/10-configuration.md) |
| Sicherheitsarchitektur | [docs/05-security-architecture.md](https://github.com/KnevS/Tesla-Carview/blob/main/docs/05-security-architecture.md) |
| Backup & Betrieb | [docs/11-operations.md](https://github.com/KnevS/Tesla-Carview/blob/main/docs/11-operations.md) |

---

*Dieses Wiki wird automatisch aus dem Repository generiert. Zuletzt aktualisiert: siehe [Commits](https://github.com/KnevS/Tesla-Carview/commits/main).*
