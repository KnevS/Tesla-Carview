# 📚 Tesla Carview — Technische Dokumentation

> 🇬🇧 [Read in English](README.en.md) · 👤 [Benutzer-Handbuch (DE)](../frontend/src/handbook/handbook.de.md)

Diese Dokumentation richtet sich an **Self-Hoster, Administratoren und Entwickler**. Sie deckt Installation, Konfiguration, Betrieb und Architektur ab.

> **Benutzer der laufenden App** (Login, Fahrtenbuch, Steuerung, Berechtigungen, Demo, …) finden alles im **In-App-Handbuch** unter `/handbook` oder direkt in [`frontend/src/handbook/handbook.de.md`](../frontend/src/handbook/handbook.de.md). Die beiden Dokumente überschneiden sich an wenigen Punkten bewusst, verlinken sich aber jeweils zueinander.

---

## Inhaltsübersicht

### 🚀 Erstinbetriebnahme

| Doc | Inhalt |
|---|---|
| [01-quickstart.md](01-quickstart.md) | Schnellstart: Repo klonen, Backend + Frontend lokal starten |
| [02-deployment.md](02-deployment.md) | Produktiv-Deployment auf Linux-Server / Raspberry Pi mit Docker + nginx + Let's Encrypt |
| [07-setup-wizard.md](07-setup-wizard.md) | Interaktiver Konfigurations-Assistent (`deploy/setup-wizard.sh`) |
| [08-dokploy.md](08-dokploy.md) | Alternative: Deployment via Dokploy |

### ⚙️ Konfiguration

| Doc | Inhalt |
|---|---|
| [10-configuration.md](10-configuration.md) | **Alle Umgebungsvariablen** — Pflicht, Optional, Demo, Auto-Update |
| [04-tesla-api.md](04-tesla-api.md) | Tesla-Developer-Account anlegen, App registrieren, Scopes wählen |
| [09-tesla-api-usage.md](09-tesla-api-usage.md) | Tesla-API-Kosten, Quota, Tracking |

### 🛠 Betrieb

| Doc | Inhalt |
|---|---|
| [11-operations.md](11-operations.md) | **Backup & Restore**, **Nächtliche Wartung**, **Demo-Modus**, Auto-Update, System-Health, Logs |
| [12-high-availability.md](12-high-availability.md) | **HA-Architektur** (Teaser) — Warm-Standby, Aktiv-Aktiv, Geo-Redundanz, K8s. Auf Anfrage projektspezifisch umsetzbar. |

### 🔐 Sicherheit

| Doc | Inhalt |
|---|---|
| [03-authentication.md](03-authentication.md) | Authentifizierungs-Flow: JWT, Refresh-Token, MFA, Passkeys |
| [05-security-architecture.md](05-security-architecture.md) | Threat-Modell und alle Sicherheits-Massnahmen |
| [06-fail2ban.md](06-fail2ban.md) | Brute-Force-Schutz mit fail2ban einrichten |

---

## Wo gehört welche Information hin?

| Frage | Antwort |
|---|---|
| „Wie installiere ich Tesla Carview auf meinem Server?" | [02-deployment.md](02-deployment.md) |
| „Welche ENV-Variable steuert X?" | [10-configuration.md](10-configuration.md) |
| „Wie erstelle ich ein Backup?" | [11-operations.md](11-operations.md) |
| „Mein Tesla wird nicht angezeigt — was nun?" | [Benutzer-Handbuch → Fehlerbehebung](../frontend/src/handbook/handbook.de.md#-fehlerbehebung) |
| „Wie nutze ich das Fahrtenbuch für das Finanzamt?" | [Benutzer-Handbuch → BMF-Fahrtenbuch](../frontend/src/handbook/handbook.de.md#-fahrtenbuch-für-das-finanzamt-fahrtenbuch-bmf) |
| „Wie aktiviere ich MFA für meinen Account?" | [Benutzer-Handbuch → Sicherheit](../frontend/src/handbook/handbook.de.md#-sicherheit) |
| „Warum bekommen neue Konten MFA-Pflicht?" | [03-authentication.md](03-authentication.md) (Architektur) und [Benutzer-Handbuch → Sicherheit](../frontend/src/handbook/handbook.de.md#-sicherheit) (Anwender) |
| „Wie funktioniert der Demo-Modus technisch?" | [11-operations.md → Demo-Modus](11-operations.md#-demo-modus-aktivieren) |
| „Was wird im Audit-Log mitgeschrieben?" | [05-security-architecture.md](05-security-architecture.md) und UI unter `/admin/audit` |

---

## Verwandte Inhalte ausserhalb der Doku

- **`backend/.env.example`** — kommentierte Vorlage für die Backend-Konfiguration
- **`frontend/.env.example`** — Vorlage für den Footer-Kontakt (Build-Time)
- **`deploy/setup.sh`** — Vollautomatisches Server-Setup
- **`deploy/setup-wizard.sh`** — Interaktiver Assistent
- **`deploy/update.sh`** — Zero-Downtime-Update
- **`docker-compose.prod.yml`** — Produktiv-Stack mit Backend + Frontend + nginx
