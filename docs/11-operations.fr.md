# 🛠 Exploitation

> 🤖 *Cette traduction française est assistée par IA depuis [11-operations.en.md](11-operations.en.md). Corrections bienvenues via GitHub.*

> 🇩🇪 [Auf Deutsch lesen](11-operations.md) · 👤 [Manuel utilisateur](../frontend/src/handbook/handbook.en.md) · 🏠 [Sommaire de la doc](.)

Opérations quotidiennes pour les auto-hébergeurs : sauvegarde, restauration, maintenance, mode démo, mise à jour. Chaque action est **réservée à l'admin** et journalisée dans l'audit.

---

## 💾 Sauvegarde & restauration

### Créer une sauvegarde

**Via l'UI web (recommandé) :**

1. Connectez-vous en admin → **Admin → Gestion des données**
2. Carte « 💾 Sauvegarde & restauration complètes » → bouton **« ⬇ Backup erstellen »**
3. Un fichier JSON est téléchargé — nom de fichier `tesla-carview-backup-<slug>-YYYY-MM-DD.json`

Contenu : les 26 tables de la DB du tenant actif (véhicules, trajets + points GPS, sessions de charge, télémétrie, carnet de bord, intervalles d'entretien, utilisateurs, identifiants passkey, journaux d'audit, paramètres, tokens OAuth Tesla, Virtual Key, acceptations légales, historique de modifications de trajets). Exclus volontairement : `push_subscriptions` (spécifique au navigateur) et `refresh_tokens` (qui résident dans `master.db`).

> **Passkeys** : `passkey_credentials` est inclus dans la sauvegarde. Après restauration sur le **même serveur**, les passkeys enregistrées fonctionnent immédiatement — le `credential_id` est stocké côté serveur et le `user_id` est préservé par la restauration. Restaurer sur un autre serveur ou domaine nécessite de ré-enregistrer les passkeys (WebAuthn est lié au domaine).

**Via CLI / cron** (pour des stratégies de sauvegarde externes) :

```bash
# Sauvegarde directement les fichiers SQLite — atomique, sans arrêt du service
docker compose -f docker-compose.prod.yml exec backend sh -c \
  "sqlite3 /app/data/master.db '.backup /app/data/backup-$(date +%F).db'"
docker cp tesla-carview-backend:/app/data/. /path/to/backup/
```

Recommandé : stockez également la sauvegarde UI sur un disque externe — un fichier JSON unique par tenant est portable et versionable.

### Restaurer depuis une sauvegarde

**Cas d'usage :** nouveau système installé, ou l'ancien est embrouillé. Restaurez l'état précédent :

1. Lancez au moins une fois l'assistant d'installation (créer un compte admin)
2. Connectez-vous en admin → **Admin → Gestion des données → « ⬆ Backup wiederherstellen… »**
3. Choisissez le fichier JSON + tapez la confirmation `WIEDERHERSTELLEN`
4. « Jetzt wiederherstellen » → le serveur crée d'abord une **sauvegarde de sûreté de la `.db` courante** (chemin retourné dans le message de succès), puis vide toutes les tables et les remplit depuis le JSON, le tout dans **une seule transaction**, annulée en cas d'erreur
5. Déconnectez-vous + reconnectez-vous, terminé

### Couches de sécurité à la restauration

- Middleware `requireAdmin`
- La phrase de confirmation `WIEDERHERSTELLEN` doit être tapée exactement
- Sauvegarde au niveau fichier pré-restauration (`<dbname>_pre_restore_<timestamp>.db`)
- Intersection des colonnes : quand le schéma live a une colonne renommée, cette colonne est sautée plutôt que de tuer tout l'import
- Entrée d'audit pour chaque sauvegarde et chaque restauration

---

## 🌙 Maintenance nocturne

S'exécute quotidiennement entre **03:30 et 03:40 Europe/Berlin** (gestion DST via `Intl.DateTimeFormat`). S'arrête à chaque redémarrage du backend, revient avec 2 min de backoff.

### Ce qu'elle fait

| Où | Tâche |
|---|---|
| `master.db` | Supprimer les `refresh_tokens` expirés |
| `master.db` | Supprimer les états `oauth_pkce` > 24 h |
| `master.db` | Supprimer les invitations de tenant soft-revoquées > 30 j |
| `master.db` | `VACUUM` + `wal_checkpoint(TRUNCATE)` |
| chaque `tenant.db` | Supprimer les `audit_logs` > 180 j |
| chaque `tenant.db` | Supprimer les `user_invites` utilisés/expirés > 30 j |
| chaque `tenant.db` | `wal_checkpoint(TRUNCATE)` |
| chaque `tenant.db` | `VACUUM` uniquement quand la DB > 50 Mo |
| chaque `tenant.db` | Entrée d'audit `system_maintenance` avec les compteurs |

### Déclencher manuellement

**UI :** Système → État du système → « 🌙 Nächtliche Wartung » → **« Jetzt ausführen »**.

**API :**
```bash
curl -X POST https://carview.example.com/api/system/maintenance-now \
  -H "Authorization: Bearer $ADMIN_JWT"
```

### Inspecter la dernière exécution

```bash
curl https://carview.example.com/api/system/maintenance-log \
  -H "Authorization: Bearer $ADMIN_JWT" | jq
```

Affiche jusqu'aux 50 dernières exécutions avec compteurs, durée et statut d'erreur.

---

## ⬆️ Mise à jour automatique (opt-in)

> ⚠️ **Désactivée par défaut.** L'activer signifie que votre système tire chaque nuit les nouveaux commits de `main` et reconstruit le conteneur. Vérifiez d'abord que `deploy/update.sh` s'exécute proprement sur votre setup.

### Activer

```bash
# backend/.env
AUTO_UPDATE_ENABLED=true
UPDATE_REPO_DIR=/opt/tesla-carview   # la valeur par défaut est exactement celle-ci, à ne surcharger que si différent
```

Puis redémarrer le backend :
```bash
docker compose -f docker-compose.prod.yml up -d --build backend
```

### Ce qui se passe la nuit

1. `git fetch origin main` dans le chemin de dépôt configuré
2. Compare `git rev-parse HEAD` à `origin/main`
3. Si différent : `bash deploy/update.sh` (timeout 10 min)
4. Pendant le rebuild, le frontend affiche automatiquement l'**overlay de maintenance** (voir `frontend/src/components/MaintenanceOverlay.vue`) avec des boutades Tesla — les utilisateurs s'en aperçoivent à peine
5. Le statut (hash local, hash remote, résultat de la mise à jour) atterrit dans le journal de maintenance

### Mise à jour manuelle à tout moment

```bash
cd /opt/tesla-carview
bash deploy/update.sh
```

---

## 🧪 Mode démo

Pour les **testeurs sans Tesla**. Si vous ne faites tourner ceci que pour vous-même, laissez désactivé.

### Activer

```bash
# backend/.env
DEMO_ENABLED=true
```

Redémarrer le backend. Un tenant additionnel avec slug `demo` et fichier DB `data/tenants/<uuid>.db` est créé au premier boot.

### Limites strictes (codées dans `routes/demo.js`)

| Constante | Défaut | Variable ENV | Signification |
|---|---|---|---|
| `MAX_ACTIVE_DEMO_USERS` | `200` | `MAX_ACTIVE_DEMO_USERS` | Testeurs simultanés. HTTP 503 quand plein. |
| `DEMO_SIGNUPS_PER_IP` | `2` / 24 h | `DEMO_SIGNUPS_PER_IP` | Au plus 2 inscriptions par IP sur une fenêtre de 24 h |
| `DEMO_LIFETIME_DAYS` | `2` | `DEMO_LIFETIME_DAYS` | Compte + toutes ses données supprimés après 2 j, aucun résidu |

Les trois sont surchargeables via variable d'environnement — pour une instance privée avec `DEMO_ENABLED=true`, envisagez `MAX_ACTIVE_DEMO_USERS=5` et `DEMO_LIFETIME_DAYS=1`.

### Ce que voient les testeurs

- La page de connexion affiche une carte bleue « 🧪 Tesla Carview ausprobieren — ohne Tesla » avec les places libres
- Un clic → l'utilisateur `tester-<hex>` est créé, connecté, un faux véhicule + 3 semaines d'historique sont semés
- Bandeau en haut de l'app : « Demo-Modus — Konto und Daten werden am DD.MM.YYYY automatisch gelöscht (X Tage übrig) »
- Les pages de confidentialité et CGU affichent automatiquement un **addendum testeur** (pas de SLA, pas de support, données factices, suppression après `DEMO_LIFETIME_DAYS` jours)
- Toutes les 30 min : un nouveau trajet factice par véhicule démo — pour que la démo paraisse vivante

### Nettoyage

- Toutes les 6 h, le cycle de vie démo s'exécute : les utilisateurs avec `expires_at < now` sont supprimés en une transaction, avec chaque table dépendante (véhicules, trajets, points GPS, charge, batterie, télémétrie, carnet de bord, codes MFA, journaux d'audit, lieux de charge, intervalles d'entretien)
- Le tenant démo lui-même reste — seules les données des testeurs sont effacées
- **Isolation** : le slug démo n'est **jamais** écrit dans `localStorage` — un testeur qui ferme l'onglet du navigateur et rouvre l'URL de production ne se retrouvera pas par accident dans le tenant démo

---

## 🛡️ Monitoring & auto-réparation

Une tâche cron (`/opt/monitoring/bin/heal.sh`) s'exécute toutes les 15 minutes et surveille les services principaux :

1. **Statut des conteneurs** — inspecte `docker inspect` pour `tesla-carview-backend`, `-frontend` et `-nginx` ; si un conteneur n'est pas dans l'état `running`, il est redémarré via `docker compose up -d <service>`.
2. **Endpoint de santé** — quand tous les conteneurs tournent, vérifie `GET /api/health` ; si la réponse n'est pas `{"status":"ok"}`, le conteneur backend est redémarré.
3. **Alerte e-mail** — après chaque redémarrage automatique, un e-mail de notification est envoyé à l'adresse configurée (si définie).
4. **Rotation des logs** — `/var/log/tcv-heal.log` est automatiquement tronqué aux 500 dernières lignes lorsqu'il dépasse 1 Mo.

**Configuration** (Admin → Système → Monitoring & auto-réparation) :

| Réglage | Description |
|---|---|
| Auto-réparation on/off | Clé DB `monitoring.heal_enabled` ; mis à `false`, la tâche cron sort immédiatement |
| E-mail d'alerte | Clé DB `monitoring.alert_email` ; vide = pas d'alerte |

**Endpoints API** (admin uniquement) :
- `GET /api/system/monitoring-config` — lit la configuration actuelle
- `PUT /api/system/monitoring-config` — sauvegarde la configuration
- `GET /api/system/monitoring-log?lines=50` — retourne les N dernières lignes des journaux heal et security

**Inspecter les logs manuellement :**
```bash
tail -50 /var/log/tcv-heal.log
tail -50 /var/log/security-check.log
```

**Entrée cron** (`/etc/cron.d/tesla-carview-monitoring`) :
```
*/15 * * * * root /opt/monitoring/bin/heal.sh >/dev/null 2>&1
```

---

## 📊 Santé du système d'un coup d'œil

UI : **Admin → Système** → l'admin voit une carte feu tricolore en haut. Endpoint backend : `GET /api/system/health` (admin uniquement). Vérifications :

| Vérification | Vert | Jaune | Rouge | Info (estompé) |
|---|---|---|---|---|
| Token OAuth Tesla | valide, > 7 j restants | < 7 j restants | expiré ou manquant | — |
| Virtual Key | créée | — | non créée | — |
| Fleet Telemetry | dernier point de donnée < 24 h | < 7 j | rien ou > 7 j | — |
| Poller Tesla | dernier poll < 60 min | < 1 j | — | — |
| DB du tenant | informatif — taille en Mo | — | — | — |
| Maintenance nocturne | dernière exécution < 25 h | — | — | — |
| OpenChargeMap | sonde live OK | — | sonde échouée (clé définie) | aucune clé configurée |
| HERE Maps | sonde live OK | — | sonde échouée (clé définie) | aucune clé configurée |

Les services optionnels (OCM, HERE) ne sont comptés comme erreurs que lorsqu'une clé est configurée mais que l'endpoint ne répond pas. Sans clé : statut `info`, estompé, sans effet sur la couleur globale du feu.

---

## 🔍 Consulter les journaux

**Logs des conteneurs :**
```bash
docker compose -f docker-compose.prod.yml logs -f --tail 200 backend
```

**Journal d'audit** (événements pertinents pour la sécurité par tenant) :
- UI : **Admin → Journal d'audit** avec filtres (action, user-id, date) et export CSV
- API : `GET /api/audit` (admin uniquement)

**Journal de maintenance** (dernières exécutions nocturnes) :
- UI : Système → « 🌙 Nächtliche Wartung » → détails
- API : `GET /api/system/maintenance-log` (admin uniquement)

---

## 🚨 Urgence : réinitialisation de la base de données

Quand tout brûle et que seul un redémarrage propre peut sauver :

```bash
# 1. Faites D'ABORD une sauvegarde (voir ci-dessus)
# 2. Arrêter les conteneurs
docker compose -f docker-compose.prod.yml down

# 3. Effacer le répertoire data — TOUTES LES DONNÉES PERDUES
# Les données vivent dans le bind-mount ./data (pas dans un volume Docker nommé !)
rm -rf ./data/master.db ./data/tenants/

# 4. Démarrer à neuf — l'assistant d'installation apparaît automatiquement
docker compose -f docker-compose.prod.yml up -d
```

> Depuis v2.0, les bases SQLite vivent sous `./data` en bind-mount (relatif au fichier Compose), **pas** dans un volume Docker nommé. `docker volume rm` n'a aucun effet sur cette configuration.

Pour restaurer une sauvegarde ensuite, terminez l'assistant d'installation avec un compte admin temporaire, connectez-vous, et utilisez le flux de restauration de l'UI.

---

## Voir aussi

- [01-quickstart.en.md](01-quickstart.en.md) — installation initiale
- [02-deployment.en.md](02-deployment.en.md) — déploiement en production
- [10-configuration.en.md](10-configuration.en.md) — toutes les variables d'environnement
- [05-security-architecture.en.md](05-security-architecture.en.md) — modèle de sécurité
