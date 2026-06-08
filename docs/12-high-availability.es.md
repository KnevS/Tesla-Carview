# 🛡️ Alta disponibilidad (HA) — opciones de arquitectura

> 🤖 *Esta traducción al español es asistida por IA desde [12-high-availability.en.md](12-high-availability.en.md). Correcciones bienvenidas vía GitHub.*

> 🇩🇪 [Auf Deutsch lesen](12-high-availability.md) · 🏠 [Índice de docs](.)

Tesla Carview se entrega como un **despliegue de un único nodo** en un servidor Linux o Raspberry Pi — perfectamente adecuado para self-hosting doméstico: rápido, ligero, barato. Para **instalaciones comerciales multi-vehículo / multi-tenant** con requisitos de SLA definidos, hay disponible un **setup de alta disponibilidad (HA)** bajo petición — diseñado por proyecto, no forma parte del repo estándar.

---

## ¿Cuándo vale la pena HA?

Reglas generales. Si alguna de estas es "sí", tiene sentido una conversación sobre HA:

- 🚛 **Más de 5 vehículos** y/o varios tenants en producción → una caída afecta a muchos usuarios a la vez
- 📑 **Libro de viajes con relevancia fiscal** (exportación BMF) — la pérdida de datos sale cara rápido
- ⏱ **Comandos Tesla activos** (preacondicionamiento, programación de carga) deben funcionar 24/7
- 🛠 **Ventanas de mantenimiento sólo fuera del horario de oficina alemán**, sin riesgo permitido durante la noche
- 📈 **Niveles de servicio prometidos a terceros** (gestores de flotas, pools de coches de empresa)

Para uso privado con 1–2 vehículos, un único nodo + backup diario + flujo de restore es más que suficiente (ver [11-operations.en.md](11-operations.en.md)).

---

## Topologías HA posibles (teaser)

Estas opciones son factibles y se pueden entregar bajo petición — la elección correcta depende de los objetivos de disponibilidad, el presupuesto y la infraestructura existente.

### Tier 1 — Warm standby (RTO ≈ 5 min, RPO ≈ 5 min)
- Un segundo servidor idéntico en un segundo sitio
- Replicación periódica del backup SQLite (p. ej. vía `litestream` → almacenamiento de objetos compatible con S3)
- DNS failover o IP flotante para el cambio
- **Pro:** barato, simple, cubre el 95 % de los escenarios de fallo
- **Aviso:** posible pérdida de datos breve (segundos a unos minutos)

### Tier 2 — Activo-activo detrás de un load balancer (RTO < 1 min, RPO ≈ 0)
- Varios contenedores backend detrás de un load balancer L7 (nginx/HAProxy/Traefik)
- SQLite sustituido por Postgres del lado del servidor (o un clúster compatible con SQLite como `rqlite`)
- Backend stateless (basado en JWT, no se necesita afinidad de sesión)
- Almacenamiento de objetos compartido para backups y migraciones de tenants
- **Pro:** failover real sin intervención humana
- **Aviso:** más piezas en movimiento, mayor coste operativo

### Tier 3 — Geo-redundante (RTO < 1 min, RPO ≈ 0, cubre caídas regionales)
- Tier 2 desplegado en una segunda región geográfica (p. ej. Frankfurt + Berlín)
- Base de datos con replicación síncrona o clúster por quórum (PostgreSQL Patroni, CockroachDB)
- DNS anycast o load balancer global para enrutamiento cross-region
- **Pro:** sobrevive a la caída de un centro de datos
- **Aviso:** setup exigente; la latencia a la base de datos entre regiones debe planificarse

### Tier 4 — Despliegue multi-réplica nativo de Kubernetes
- Helm chart para backend + frontend + reverse proxy
- Horizontal Pod Autoscaler (HPA)
- PersistentVolume con clase de almacenamiento de backend replicada (Longhorn, OpenEBS, Ceph)
- Sealed Secrets / External Secrets Operator para los valores de `.env`
- **Pro:** integra con una plataforma K8s existente cloud / on-prem
- **Aviso:** sólo vale la pena con ≥ 10 tenants o con un panorama K8s existente

---

## Qué ya está listo para HA en el repo estándar

Incluso sin un setup HA explícito, la arquitectura está diseñada para que un upgrade no rompa todo:

- **Backend stateless** — no se necesita session store, el escalado horizontal es directo (JWT + cookie refresh httpOnly)
- **Aislamiento multi-tenant** — cada BD de tenant separada, backup/restore por tenant vía `/api/data/backup` + `/restore` (ver [11-operations.en.md](11-operations.en.md))
- **Overlay de mantenimiento en el frontend** — los usuarios no ven un "error" durante un intercambio de contenedor, ven una tarjeta amistosa de update
- **Log de auditoría** — toda acción relevante para seguridad queda registrada, rastro forense tras un failover
- **Mantenimiento nocturno** — VACUUM de BD, tokens caducados, logs de auditoría antiguos se limpian automáticamente
- **Endpoint de salud del sistema** (`/api/system/health`) — directamente utilizable como sonda liveness/readiness de Kubernetes o en monitorización externa (Uptime Kuma, Healthchecks.io, Statping)

---

## Cómo proceder si necesitas HA

1. **Clarificar requisitos** — objetivos RTO/RPO, número de tenants y vehículos, compliance (acuerdo de tratamiento RGPD, retención BMF)
2. **Elegir una topología** — uno de los tiers anteriores o una mezcla específica del proyecto
3. **Plan de migración** — un único nodo → HA sin pérdida de datos, posiblemente pasando primero a Postgres
4. **Traspaso de operaciones** — runbooks, monitorización, setup de on-call, playbooks de incidentes
5. **Pruebas de carga** — ensayos de failover, ensayos de backup-restore

Estos pasos se planifican individualmente con el operador en un proyecto de cliente — no hay una receta única en el repo.

---

## Contacto / interés

Consultoría y arquitectura HA concreta bajo petición. Las vías de contacto están en el pie de la app (ver `frontend/.env.example` para la dirección del operador) y en [`AUTHORS`](../AUTHORS) y [`NOTICE.md`](../NOTICE.md).

---

## Véase también

- [02-deployment.en.md](02-deployment.en.md) — despliegue estándar de un único nodo
- [05-security-architecture.en.md](05-security-architecture.en.md) — modelo de seguridad y de amenazas (base de los requisitos HA)
- [11-operations.en.md](11-operations.en.md) — backup, restore, mantenimiento — los bloques de construcción sobre los que se apoya HA
