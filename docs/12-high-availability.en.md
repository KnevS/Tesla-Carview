# 🛡️ High Availability (HA) — architecture options

> 🇩🇪 [Auf Deutsch lesen](12-high-availability.md) · 🏠 [Docs index](.)

Tesla Carview ships as a **single-node deployment** on one Linux server or Raspberry Pi — perfectly fine for household self-hosting: fast, lightweight, cheap. For **commercial multi-vehicle / multi-tenant installations** with defined SLA requirements, a **high-availability (HA) setup** is available on request — designed per project, not part of the standard repo.

---

## When is HA worth it?

Rules of thumb. If any of these is "yes", an HA discussion makes sense:

- 🚛 **More than 5 vehicles** and/or multiple tenants in production → an outage hits many users at once
- 📑 **Tax-binding logbook** (BMF export) — data loss gets expensive fast
- ⏱ **Active Tesla commands** (preconditioning, charge schedule) must work 24/7
- 🛠 **Maintenance windows only outside German office hours**, no overnight risk allowed
- 📈 **Service levels promised to third parties** (fleet operators, company-car pools)

For private use with 1–2 vehicles, single-node + daily backup + restore workflow is plenty (see [11-operations.en.md](11-operations.en.md)).

---

## Possible HA topologies (teaser)

These options are feasible and can be delivered on request — the right choice depends on availability targets, budget, and existing infrastructure.

### Tier 1 — Warm standby (RTO ≈ 5 min, RPO ≈ 5 min)
- Second identical server at a second site
- Periodic SQLite backup replication (e.g. via `litestream` → S3-compatible object storage)
- DNS failover or floating IP for switchover
- **Pro:** cheap, simple, covers 95 % of failure scenarios
- **Caveat:** short data loss possible (seconds to a few minutes)

### Tier 2 — Active-active behind a load balancer (RTO < 1 min, RPO ≈ 0)
- Several backend containers behind an L7 load balancer (nginx/HAProxy/Traefik)
- SQLite replaced with server-side Postgres (or an sqlite-capable cluster like `rqlite`)
- Stateless backend (JWT-based, no session affinity needed)
- Shared object storage for backups and tenant migrations
- **Pro:** real failover without human intervention
- **Caveat:** more moving parts, higher operating cost

### Tier 3 — Geo-redundant (RTO < 1 min, RPO ≈ 0, regional outages covered)
- Tier 2 deployed in a second geographic region (e.g. Frankfurt + Berlin)
- Database with synchronous replication or quorum cluster (PostgreSQL Patroni, CockroachDB)
- Anycast DNS or global load balancer for cross-region routing
- **Pro:** survives a data centre outage
- **Caveat:** demanding setup; latency to the database across regions must be planned

### Tier 4 — Kubernetes-native multi-replica deployment
- Helm chart for backend + frontend + reverse proxy
- Horizontal Pod Autoscaler (HPA)
- PersistentVolume with replicated backend storage class (Longhorn, OpenEBS, Ceph)
- Sealed Secrets / External Secrets Operator for `.env` values
- **Pro:** integrates with an existing cloud / on-prem K8s platform
- **Caveat:** worth it only at ≥ 10 tenants or with an existing K8s landscape

---

## What's already HA-ready in the standard repo

Even without an explicit HA setup, the architecture is designed so that an upgrade doesn't break everything:

- **Stateless backend** — no session store required, horizontal scaling is straightforward (JWT + httpOnly refresh cookie)
- **Multi-tenant isolation** — every tenant DB separate, per-tenant backup/restore via `/api/data/backup` + `/restore` (see [11-operations.en.md](11-operations.en.md))
- **Maintenance overlay in the frontend** — users don't see an "error" during a container swap, they see a friendly update card
- **Audit log** — every security-relevant action recorded, forensic trail after a failover
- **Nightly maintenance** — DB vacuum, expired tokens, old audit logs are cleaned automatically
- **System-health endpoint** (`/api/system/health`) — directly usable as a Kubernetes liveness/readiness probe or in external monitoring (Uptime Kuma, Healthchecks.io, Statping)

---

## How to proceed if you need HA

1. **Clarify requirements** — RTO/RPO targets, number of tenants and vehicles, compliance (GDPR processing agreement, BMF retention)
2. **Pick a topology** — one of the tiers above or a project-specific blend
3. **Migration plan** — single-node → HA without data loss, possibly switching to Postgres first
4. **Operations hand-off** — runbooks, monitoring, on-call setup, incident playbooks
5. **Load tests** — failover drills, backup-restore rehearsals

These steps are planned individually with the operator in a customer project — no one-size-fits-all recipe in the repo.

---

## Contact / interest

Consulting and a concrete HA architecture on request. Contact paths are in the app footer (see `frontend/.env.example` for the operator address) and in [`AUTHORS`](../AUTHORS) and [`NOTICE.md`](../NOTICE.md).

---

## See also

- [02-deployment.en.md](02-deployment.en.md) — standard single-node deployment
- [05-security-architecture.en.md](05-security-architecture.en.md) — security model and threat model (the basis for HA requirements)
- [11-operations.en.md](11-operations.en.md) — backup, restore, maintenance — the building blocks HA sits on
