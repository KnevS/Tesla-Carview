# Architecture de sécurité

> 🤖 *Cette traduction française est assistée par IA depuis [05-security-architecture.en.md](05-security-architecture.en.md). Corrections bienvenues via GitHub.*

> 🇩🇪 [Auf Deutsch lesen](05-security-architecture.md)

## Modèle de menace

Cette application protège les données véhicule d'un utilisateur/foyer unique
sur un serveur auto-géré. Les menaces principales sont :

| Menace | Mitigation |
|---|---|
| Accès non autorisé à l'UI web | Authentification utilisateur avec JWT + MFA |
| Force brute sur la connexion | Rate limiting + verrouillage de compte |
| Détournement de session via XSS | Access token en RAM uniquement, pas de localStorage |
| Vol de cookie (CSRF) | `SameSite=Strict` + API JSON (pas de form submit) |
| Man-in-the-middle | TLS 1.3, HSTS, OCSP stapling |
| Clickjacking | `X-Frame-Options: DENY` + CSP `frame-src 'none'` |
| Fuite de données par compromission de la base | Hashs de mots de passe (Argon2id), hashs de tokens (SHA-256), codes MFA (bcrypt) **+ AES-256-GCM au repos** pour les tokens Tesla, secret MFA, clé privée Virtual-Key (voir « Chiffrement au repos » ci-dessous) |
| XSS stocké via markdown admin (pages légales) | `DOMPurify` avant `v-html`, allow-list de balises/attributs, schémas URL restreints à http(s)/mailto/tel |
| IDOR (l'utilisateur A lit les données de l'utilisateur B dans le même tenant) | Helpers `assertVehicleAccess`/`assertTripAccess`/`assertChargingAccess` sur chaque route mutante ; les admins voient tout au sein de leur tenant, les utilisateurs standard ne voient que les véhicules liés via `vehicle_users` |
| Détournement de la course au setup (un attaquant enregistre le premier admin) | Garde optionnelle `SETUP_TOKEN` (en-tête `X-Setup-Token`) + rate limit + check-then-write atomique |
| Énumération de tenants via la page de connexion | Pseudonymes au lieu de vrais noms sur la page de login (pool curé `adjectif-nom`) |
| Dépendances obsolètes | Activer les alertes Dependabot dans le dépôt |

## Chiffrement au repos (depuis 2026-05)

Chiffrement bidirectionnel (AES-256-GCM) pour les colonnes de la base dont le
backend a besoin du texte clair au runtime et qui ne peuvent donc pas être hashées :

| Donnée | Table.colonne | Format |
|---|---|---|
| Access token OAuth Tesla | `tokens.access_token` | `v1:iv:tag:ciphertext` |
| Refresh token OAuth Tesla | `tokens.refresh_token` | `v1:iv:tag:ciphertext` |
| Secret TOTP MFA | `users.mfa_secret` | `v1:iv:tag:ciphertext` |
| Clé privée Virtual-Key Tesla (PEM) | `virtual_key.private_key_pem` | `v1:iv:tag:ciphertext` |

**Sources de clé (priorité) :**
1. `ENCRYPTION_KEY_B64` (variable d'environnement, 32 octets encodés en base64) — recommandé ; réside hors de `data/`. Générer : `openssl rand -base64 32`
2. `/run/secrets/encryption_key` (secret Docker, 32 octets bruts)
3. `data/.encryption-key` (fichier, mode 0600) — repli et installations existantes ; généré automatiquement au premier démarrage.

**Important :** La clé doit être incluse dans votre sauvegarde. Sans elle, les connexions Tesla, les configurations MFA et les Virtual Keys sont définitivement perdus.

générée au premier démarrage du backend. **Incluez-la dans votre sauvegarde** — sans
la clé, les connexions Tesla, configurations MFA et Virtual-Keys sont irrécupérables.

Hashage à sens unique (SHA-256 + `timingSafeEqual`) pour les tokens aléatoires
qui ne sont que vérifiés, jamais rejoués :

| Donnée | Méthode |
|---|---|
| Refresh tokens de session | SHA-256, valeur brute uniquement dans le cookie httpOnly |
| Tokens de réinitialisation de mot de passe | SHA-256, dans `tenant_settings` |

Implémentation : `backend/src/services/cryptoService.js`.

## Frontière de confiance du tenant

Le modèle multi-tenant traite un tenant comme **un groupe de confiance** :

- Chaque tenant a une base SQLite isolée (pas de lecture inter-tenant possible).
- Au sein d'un tenant, le rôle **admin** voit chaque véhicule et les données de chaque utilisateur —
  nécessaire pour administrer le tenant (attribution des véhicules, génération de liens de réinitialisation,
  gestion des acceptations légales, etc.).
- Les comptes **user** standard ne voient que les véhicules qui leur sont liés via la table
  `vehicle_users(vehicle_id, user_id)`. Les helpers IDOR dans
  `backend/src/middleware/vehicleAccess.js` appliquent cela sur chaque endpoint
  de trajet, charge et véhicule.

**Recommandation pour foyers multi-conducteurs / entreprises :**

- Si tous les conducteurs se font pleinement confiance (un foyer, flotte familiale) :
  mettez tout le monde dans un tenant, attribuez chaque véhicule à chaque utilisateur via
  `vehicle_users`. Pratique.
- Si les conducteurs ne doivent PAS voir les GPS / entrées de Fahrtenbuch des autres
  (employés indépendants, séparation pertinente sur le plan fiscal entre privé et
  professionnel par conducteur) : donnez à chaque conducteur **son propre tenant**,
  enregistrez chaque véhicule dans le tenant correspondant. Les gardes IDOR
  appliquent alors la frontière.

Il n'y a volontairement aucun modèle de permissions fin par attribut
au sein d'un tenant — cette complexité est repoussée à la frontière du tenant.

## Flux d'authentification

```
                    HTTPS
Navigateur  <-----------------  nginx (terminaison TLS)
                                   |
                              Réseau Docker
                                   |
                              Backend Express
                                   |
                              Base SQLite
```

### Cycle de vie des tokens

```
Login       --> access token (15 min, RAM)  +  cookie refresh (7 j, httpOnly)
Requête API --> Authorization: Bearer <access-token>
401         --> POST /api/auth/refresh  (cookie envoyé automatiquement)
                --> nouveau access token + nouveau cookie refresh (rotation)
Logout      --> suppression du refresh token en base + effacement du cookie
```

### Pourquoi pas localStorage ?

```
localStorage :  lisible par JavaScript    -->  XSS peut voler le token
Mémoire (RAM) : uniquement l'onglet actif -->  XSS ne peut pas persister le token
Cookie httpOnly : non lisible depuis JS   -->  XSS ne peut pas lire le cookie
```

## Hashage de mot de passe

**Argon2id** (depuis v3.1.5, recommandation OWASP 2024) :
- Paramètres : t=3 itérations, m=65536 (64 Mo RAM), p=4 threads
- Memory-hard : le brute force GPU/ASIC est significativement plus coûteux que bcrypt
- Chaque hash contient un sel aléatoire (protection rainbow-table)
- Comparaison timing-safe via `argon2.verify()`

**Migration :** Les hashs bcrypt existants (12 rounds) sont remplacés de manière
transparente par Argon2id à la prochaine connexion réussie. Les deux formats
sont acceptés pendant la période de transition.

## TOTP MFA

- **Algorithme** : HMAC-SHA1 (RFC 4226)
- **Période** : 30 secondes
- **Tolérance** : ±1 période (dérive d'horloge jusqu'à 60 s autorisée)
- **Chiffres** : 6
- **Secret** : 20 octets aléatoires (entropie 160 bits)

## Configuration TLS nginx

```nginx
# protocoles
ssl_protocols TLSv1.2 TLSv1.3;

# session tickets off = la perfect forward secrecy est préservée
# même si la clé serveur est compromise plus tard
ssl_session_tickets off;

# HSTS : le navigateur cache HTTPS pendant 2 ans
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

## Content Security Policy (CSP)

```
default-src 'self'          # tout uniquement depuis notre propre domaine
script-src  'self'          # pas de JS inline, pas d'eval()
style-src   'self' 'unsafe-inline'  # Tailwind a besoin de styles inline
img-src     'self' data: https://*.tile.openstreetmap.org  # tuiles de carte
connect-src 'self'          # uniquement notre API
object-src  'none'          # pas de Flash, pas de lecteur PDF
frame-src   'none'          # pas d'iframe
```

**Permissions-Policy** (depuis v3.1.5) — verrouille les API navigateur que l'app n'utilise pas :
```
camera=(), microphone=(), geolocation=(), payment=(),
usb=(), bluetooth=(), display-capture=()
```

## Schéma de base (tables pertinentes pour la sécurité)

```sql
users
  password_hash  -- Argon2id (les anciens hashs bcrypt migrent à la connexion)
  mfa_secret     -- encodé base32 (secret TOTP)
  locked_until   -- horodatage de verrouillage

refresh_tokens
  token_hash     -- SHA-256 du token original
  expires_at     -- expire automatiquement

mfa_backup_codes
  code_hash      -- bcrypt, 10 rounds
  used           -- usage unique

audit_logs
  action         -- par ex. login_success, mfa_enabled, password_changed
  ip_address     -- pour analyse forensique
```

## Recommandations après déploiement

1. **Changez immédiatement le mot de passe admin** (Paramètres → Mot de passe)
2. **Activez le MFA** pour tous les utilisateurs
3. **Conservez les codes de secours en sécurité** (gestionnaire de mots de passe)
4. **Sauvegardez la base régulièrement** (voir [02-deployment.en.md](./02-deployment.en.md))
5. **Authentification SSH par clé** au lieu d'un mot de passe sur le serveur
6. **Activez les alertes Dependabot** dans le dépôt GitHub
7. **Inspectez régulièrement les journaux** : `docker logs tesla-carview-backend`
