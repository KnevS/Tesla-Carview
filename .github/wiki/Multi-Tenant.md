# Multi-Tenant & Users

🌐 **Language:** **EN** · [DE](DE-Multi-Tenant) · [FR](FR-Multi-Tenant) · [ES](ES-Multi-Tenant) · [TR](TR-Multi-Tenant) · [EL](EL-Home)

Tesla Carview supports multiple isolated accounts ("tenants") on a single server — perfect for families, or if you want to offer the service to close friends under the non-commercial license.

---

## Understanding tenants

Think of tenants like separate apartments in the same building:
- Each tenant has their own **users**, **vehicles**, and **data**
- Tenants cannot see each other's data
- One server, multiple isolated environments

**When do you need multiple tenants?**
- Family with two Tesla owners who want separate data
- You and a friend share a server
- Testing a second configuration without touching production data

**When is one tenant enough?**
- You and your partner share one Tesla
- You have multiple Teslas but want all data in one place
- Solo use

---

## The master database vs. tenant databases

Tesla Carview uses two types of databases:

| Database | Location | Contains |
|---|---|---|
| `master.db` | `/app/data/master.db` | Tenant list, user tokens, OAuth state |
| `{tenant-uuid}.db` | `/app/data/tenants/` | All vehicle & user data for one tenant |

Each tenant's data is completely isolated at the file level.

---

## Creating a new tenant

### Option 1: Self-registration (if enabled)

Users can register their own tenant at `https://tesla.yourdomain.com/register`:
1. Fill in tenant name, slug (short URL-safe identifier), admin username, and password
2. Accept terms
3. Done — a new isolated tenant is created

**Restrict self-registration with invite codes:**
In `.env`:
```env
REGISTRATION_REQUIRES_INVITE=true
```
Then create invite codes in **Admin → Invites → Create Invite Code** and share the link.

### Option 2: Via admin (no self-registration needed)

If self-registration is disabled, you (as admin) create tenants directly via the API or by enabling registration temporarily.

---

## Managing users within a tenant

### User roles

| Role | What they can do |
|---|---|
| **Admin** | Everything — vehicles, users, settings, data management |
| **User** | View data for assigned vehicles, create logbook entries |

Admins set per-user permissions beyond the basic role:

| Permission | Default for users |
|---|---|
| Can edit vehicles | No |
| Can add vehicles | No |
| MFA required | Yes (configurable) |

### Inviting users

As admin, invite others to your tenant:
1. **Admin → Users → Invite User**
2. Enter their email (or just generate a link without email)
3. Set their initial permissions
4. They click the link and set their password

### Assigning vehicles to users

A user can only see vehicles they're assigned to:
1. **Admin → Users** → click a user
2. Under "Vehicles" → assign which vehicles they can see
3. Changes take effect immediately (no logout needed)

---

## Tenant pseudonyms

For privacy, tenants are identified by a **pseudonym** (e.g., "brave-eagle") on the login page — not by the real tenant name. This prevents the login page from revealing who runs this server.

You can change the pseudonym:
- **Admin → Settings → Tenant → Change Pseudonym**

---

## Deleting a tenant

Tenant deletion is a destructive operation and requires confirmation:
1. **Admin → Data → Delete Tenant**
2. Type the confirmation phrase
3. A backup is created automatically before deletion

---

## Tenant status

Tenants can be suspended without deletion:
- **Admin → Tenants → Suspend**
- Suspended tenants cannot log in
- Data is preserved

---

## Technical limits (single server)

| Resource | Practical limit |
|---|---|
| Number of tenants | No hard limit (SQLite scales well) |
| Vehicles per tenant | No hard limit |
| Users per tenant | No hard limit |
| Database size per tenant | ~50 MB for 3 years of data (typical) |

Tesla Carview is not designed for large-scale multi-tenant SaaS use — it's for private/family use. See [License & Usage](License-and-Usage) for what's allowed.
