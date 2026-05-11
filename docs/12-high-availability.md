# 🛡️ Hochverfügbarkeit (HA) — Architektur-Optionen

> 🇬🇧 [Read in English](12-high-availability.en.md) · 🏠 [Doku-Übersicht](.)

Tesla Carview läuft standardmäßig als **Single-Node-Deployment** auf einem einzelnen Linux-Server oder Raspberry Pi — das ist für Eigennutzung im Haushalt mehr als ausreichend, schnell, schlank, günstig. Für **gewerblich genutzte Mehr-Fahrzeug-/Mehr-Mandanten-Installationen** mit definierten SLA-Anforderungen ist ein **Hochverfügbarkeits-Setup (HA)** auf Wunsch möglich — wird projektspezifisch architektiert und ist nicht Teil des Standard-Repos.

---

## Wann lohnt sich HA?

Faustregeln. Wenn auch nur eine Antwort „ja" ist, lohnt sich ein HA-Gespräch:

- 🚛 **Mehr als 5 Fahrzeuge** und/oder mehrere Mandanten produktiv → ein Ausfall trifft viele Nutzer gleichzeitig
- 📑 **Steuerlich verbindliches Fahrtenbuch** (BMF-Export) — Datenverlust kann teuer werden
- ⏱ **Aktive Tesla-Befehle** (Vorklimatisieren, Ladeplan) sollen rund um die Uhr funktionieren
- 🛠 **Wartungsfenster nur außerhalb deutscher Bürozeiten**, kein nächtliches Risiko erlaubt
- 📈 **Service-Levels gegenüber Dritten zugesagt** (Flottenbetreiber, Dienstwagen-Pools)

Für reine Privat-Nutzung mit 1–2 Fahrzeugen ist Single-Node + tägliches Backup + Restore-Workflow völlig ausreichend (siehe [11-operations.md](11-operations.md)).

---

## Mögliche HA-Topologien (Teaser)

Diese Optionen sind machbar und auf Anfrage umsetzbar — die konkrete Wahl hängt von Verfügbarkeits-Zielen, Budget und vorhandener Infrastruktur ab.

### Stufe 1 — Warm-Standby (RTO ≈ 5 min, RPO ≈ 5 min)
- Zweiter identischer Server an einem zweiten Standort
- Periodische SQLite-Backup-Replikation (z. B. via `litestream` → S3-kompatibler Object-Storage)
- DNS-Failover oder Floating IP für die Umschaltung
- **Vorteil:** günstig, einfach, deckt 95 % der Ausfall-Szenarien
- **Caveat:** kurzer Daten-Verlust möglich (Sekunden bis wenige Minuten)

### Stufe 2 — Aktiv-Aktiv hinter Load-Balancer (RTO < 1 min, RPO ≈ 0)
- Mehrere Backend-Container hinter einem L7-Load-Balancer (nginx/HAProxy/Traefik)
- SQLite ersetzt durch Server-Postgres (oder einen sqlite-fähigen Cluster wie `rqlite`)
- Stateless Backend (JWT-basiert, kein Session-Affinity nötig)
- Shared Object Storage für Backups + Tenant-Migrations
- **Vorteil:** echter Failover ohne menschlichen Eingriff
- **Caveat:** mehr bewegliche Teile, höhere Betriebskosten

### Stufe 3 — Geo-redundant (RTO < 1 min, RPO ≈ 0, regionale Ausfälle abgedeckt)
- Stufe 2 zusätzlich in einer zweiten geografischen Region (z. B. Frankfurt + Berlin)
- Datenbank mit synchroner Replikation oder Quorum-Cluster (PostgreSQL Patroni, CockroachDB)
- Anycast-DNS oder Global Load-Balancer für regions-übergreifendes Routing
- **Vorteil:** überlebt Rechenzentrums-Ausfall
- **Caveat:** anspruchsvolles Setup; Latenz zur Datenbank über Regionen muss eingeplant werden

### Stufe 4 — Kubernetes-natives Multi-Replica-Deployment
- Helm-Chart für Backend + Frontend + Reverse-Proxy
- Horizontal Pod Autoscaler (HPA)
- PersistentVolume mit replizierter Backend-Storage-Klasse (Longhorn, OpenEBS, Ceph)
- Sealed Secrets / External Secrets Operator für `.env`-Werte
- **Vorteil:** integriert in vorhandene Cloud-/On-Prem-K8s-Plattform
- **Caveat:** lohnt erst ab ≥ 10 Mandanten oder bestehender K8s-Landschaft

---

## Was im Standard-Repo bereits HA-tauglich ist

Auch ohne explizites HA-Setup wurde die Architektur so geschnitten, dass ein Upgrade nicht alles umwerfen muss:

- **Stateless Backend** — kein Session-Store nötig, Skalierung problemlos (JWT + httpOnly-Refresh-Cookie)
- **Multi-Tenant-Isolation** — jede Tenant-DB getrennt, Backup/Restore pro Tenant über `/api/data/backup` + `/restore` (siehe [11-operations.md](11-operations.md))
- **Maintenance-Overlay im Frontend** — User sehen kein „Fehler" während eines Container-Wechsels, sondern eine freundliche Update-Karte
- **Audit-Log** — alle sicherheitsrelevanten Aktionen protokolliert für Forensik nach einem Failover
- **Nächtliche Hygiene** — DB-Vacuum, abgelaufene Tokens, alte Audit-Logs werden automatisch bereinigt
- **System-Health-Endpoint** (`/api/system/health`) — direkt geeignet als Probe für Kubernetes Liveness/Readiness oder externes Monitoring (Uptime Kuma, Healthchecks.io, Statping)

---

## Vorgehen bei HA-Bedarf

1. **Anforderungen klären** — RTO/RPO-Ziele, Anzahl Mandanten und Fahrzeuge, Compliance-Auflagen (DSGVO-Vertragsverarbeitung, BMF-Aufbewahrung)
2. **Topologie-Auswahl** — eine der Stufen oben oder eine projektspezifische Mischform
3. **Migrations-Plan** — Single-Node → HA ohne Datenverlust, ggf. zuerst auf Postgres umstellen
4. **Betriebs-Übergabe** — Runbooks, Monitoring, On-Call-Setup, Notfall-Playbooks
5. **Lasttests** — Failover-Übungen, Backup-Restore-Drills

Diese Schritte werden im Kundenprojekt mit dem Betreiber individuell durchgeplant — kein Standard-Rezept aus dem Repo.

---

## Kontakt / Interesse

Beratung und konkrete HA-Architektur auf Anfrage. Kontakt-Wege stehen im Footer der App (siehe `frontend/.env.example` für die Operator-Adresse) bzw. unter [`AUTHORS`](../AUTHORS) und [`NOTICE.md`](../NOTICE.md).

---

## Siehe auch

- [02-deployment.md](02-deployment.md) — Standard-Single-Node-Deployment
- [05-security-architecture.md](05-security-architecture.md) — Sicherheits-Modell und Threat-Model (Basis für HA-Anforderungen)
- [11-operations.md](11-operations.md) — Backup, Restore, Wartung — die Grundbausteine, auf denen HA aufsetzt
