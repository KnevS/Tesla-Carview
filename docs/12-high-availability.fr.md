# 🛡️ Haute disponibilité (HA) — options d'architecture

> 🤖 *Cette traduction française est assistée par IA depuis [12-high-availability.en.md](12-high-availability.en.md). Corrections bienvenues via GitHub.*

> 🇩🇪 [Auf Deutsch lesen](12-high-availability.md) · 🏠 [Sommaire de la doc](.)

Tesla Carview est livré comme un **déploiement mono-nœud** sur un serveur Linux ou Raspberry Pi unique — parfaitement adapté à l'auto-hébergement domestique : rapide, léger, économique. Pour les **installations commerciales multi-véhicules / multi-tenants** avec des exigences SLA définies, un **dispositif de haute disponibilité (HA)** est disponible sur demande — conçu sur mesure par projet, ne faisant pas partie du dépôt standard.

---

## Quand la HA en vaut-elle la peine ?

Règles de pouce. Si l'une des questions est « oui », une discussion HA a du sens :

- 🚛 **Plus de 5 véhicules** et/ou plusieurs tenants en production → une panne touche beaucoup d'utilisateurs en même temps
- 📑 **Carnet de bord contraignant fiscalement** (export BMF) — une perte de données coûte cher rapidement
- ⏱ **Commandes Tesla actives** (préconditionnement, planning de charge) doivent fonctionner 24/7
- 🛠 **Fenêtres de maintenance uniquement hors des heures de bureau allemandes**, aucun risque de nuit autorisé
- 📈 **Niveaux de service promis à des tiers** (opérateurs de flotte, pools de véhicules de société)

Pour un usage privé avec 1–2 véhicules, mono-nœud + sauvegarde quotidienne + flux de restauration suffit largement (voir [11-operations.en.md](11-operations.en.md)).

---

## Topologies HA possibles (teaser)

Ces options sont réalisables et peuvent être livrées sur demande — le bon choix dépend des objectifs de disponibilité, du budget et de l'infrastructure existante.

### Niveau 1 — Warm standby (RTO ≈ 5 min, RPO ≈ 5 min)
- Deuxième serveur identique sur un second site
- Réplication périodique de la sauvegarde SQLite (par ex. via `litestream` → stockage objet compatible S3)
- Bascule DNS ou IP flottante pour le changement
- **Pour :** bon marché, simple, couvre 95 % des scénarios de panne
- **Réserve :** courte perte de données possible (secondes à quelques minutes)

### Niveau 2 — Actif-actif derrière un load balancer (RTO < 1 min, RPO ≈ 0)
- Plusieurs conteneurs backend derrière un load balancer L7 (nginx/HAProxy/Traefik)
- SQLite remplacé par Postgres côté serveur (ou un cluster compatible sqlite comme `rqlite`)
- Backend stateless (basé JWT, pas d'affinité de session nécessaire)
- Stockage objet partagé pour les sauvegardes et migrations de tenants
- **Pour :** vraie bascule sans intervention humaine
- **Réserve :** plus de pièces mobiles, coût d'exploitation plus élevé

### Niveau 3 — Géo-redondant (RTO < 1 min, RPO ≈ 0, pannes régionales couvertes)
- Niveau 2 déployé dans une seconde région géographique (par ex. Francfort + Berlin)
- Base de données avec réplication synchrone ou cluster à quorum (PostgreSQL Patroni, CockroachDB)
- DNS Anycast ou load balancer global pour le routage inter-régions
- **Pour :** survit à la panne d'un centre de données
- **Réserve :** setup exigeant ; la latence vers la base à travers les régions doit être planifiée

### Niveau 4 — Déploiement multi-réplica natif Kubernetes
- Helm chart pour backend + frontend + reverse proxy
- Horizontal Pod Autoscaler (HPA)
- PersistentVolume avec classe de stockage backend répliquée (Longhorn, OpenEBS, Ceph)
- Sealed Secrets / External Secrets Operator pour les valeurs `.env`
- **Pour :** s'intègre avec une plateforme K8s cloud / on-prem existante
- **Réserve :** ne vaut le coup qu'à partir de ≥ 10 tenants ou avec un paysage K8s existant

---

## Ce qui est déjà prêt pour la HA dans le dépôt standard

Même sans setup HA explicite, l'architecture est conçue pour qu'une mise à niveau ne casse pas tout :

- **Backend stateless** — pas de store de session requis, la mise à l'échelle horizontale est directe (JWT + cookie refresh httpOnly)
- **Isolation multi-tenant** — chaque DB de tenant séparée, sauvegarde/restauration par tenant via `/api/data/backup` + `/restore` (voir [11-operations.en.md](11-operations.en.md))
- **Overlay de maintenance dans le frontend** — les utilisateurs ne voient pas d'« erreur » pendant un swap de conteneur, ils voient une carte de mise à jour amicale
- **Journal d'audit** — chaque action pertinente pour la sécurité enregistrée, piste forensique après une bascule
- **Maintenance nocturne** — vacuum DB, tokens expirés, vieux journaux d'audit nettoyés automatiquement
- **Endpoint de santé système** (`/api/system/health`) — directement utilisable comme sonde liveness/readiness Kubernetes ou dans un monitoring externe (Uptime Kuma, Healthchecks.io, Statping)

---

## Comment procéder si vous avez besoin de HA

1. **Clarifier les exigences** — objectifs RTO/RPO, nombre de tenants et de véhicules, conformité (accord de sous-traitance RGPD, rétention BMF)
2. **Choisir une topologie** — un des niveaux ci-dessus ou un mélange spécifique au projet
3. **Plan de migration** — mono-nœud → HA sans perte de données, éventuellement en passant d'abord à Postgres
4. **Transfert d'exploitation** — runbooks, monitoring, configuration d'astreinte, playbooks d'incident
5. **Tests de charge** — exercices de bascule, répétitions de sauvegarde-restauration

Ces étapes sont planifiées individuellement avec l'opérateur dans un projet client — pas de recette unique dans le dépôt.

---

## Contact / intérêt

Consultation et architecture HA concrète sur demande. Les voies de contact se trouvent dans le pied de page de l'app (voir `frontend/.env.example` pour l'adresse de l'opérateur) et dans [`AUTHORS`](../AUTHORS) et [`NOTICE.md`](../NOTICE.md).

---

## Voir aussi

- [02-deployment.en.md](02-deployment.en.md) — déploiement mono-nœud standard
- [05-security-architecture.en.md](05-security-architecture.en.md) — modèle de sécurité et modèle de menace (la base des exigences HA)
- [11-operations.en.md](11-operations.en.md) — sauvegarde, restauration, maintenance — les briques sur lesquelles la HA repose
