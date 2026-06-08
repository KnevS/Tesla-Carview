# Assistant d'installation — configuration initiale

> 🤖 *Cette traduction française est assistée par IA depuis [07-setup-wizard.en.md](07-setup-wizard.en.md). Corrections bienvenues via GitHub.*

> 🇩🇪 [Auf Deutsch lesen](07-setup-wizard.md)

Tesla Carview propose deux chemins pour l'**installation initiale** et un assistant intégré à l'app pour la **configuration en continu**.

---

## Assistants intégrés à l'app {#settings-wizard}

À partir de v3.4.0, il y a **deux assistants distincts** :

### 1. Assistant des paramètres personnels (`SettingsWizard.vue`)

Apparaît automatiquement après la première connexion et peut être ré-ouvert à tout moment via **Paramètres → 🧙 Lancer l'assistant**. Disponible pour **tous les utilisateurs**.

| # | Étape | Description |
|---|------|-------------|
| 1 | **Bienvenue** | Vue d'ensemble |
| 2 | **Langue** | Sélection de la langue de l'app |
| 3 | **Design** | Choix du style de design (Glass, Cyberpunk, Minimal, Sport, Nevs-Edition) |
| 4 | **Couleur d'accent** | Couleur d'accent pour boutons et navigation |
| 5 | **Unités** | km/mi, °C/°F, kWh/100km etc. |
| 6 | **Tableau de bord** | Visibilité et ordre des cartes |
| 7 | **Navigation** | Tri et masquage des éléments de navigation |
| 8 | **Notifications** | S'abonner au Web Push, sélectionner les types d'événements |
| 9 | **Terminé** | Tous les réglages sont sauvegardés |

### 2. Assistant d'installation Admin (`AdminSetupWizard.vue`)

Accessible via **Admin Hub → 🛠️ Assistant d'installation**. **Admins uniquement.** Guide à travers toute la configuration système — sans édition SSH ou `.env`.

| Étape | Description |
|------|-------------|
| **Identifiants Tesla** | Définir Client-ID, Client-Secret, Audience via l'UI (stocké en base) |
| **OAuth Tesla** | Connecter le compte Tesla (popup → callback PostMessage → rafraîchissement auto) |
| **Véhicules** | Synchroniser les véhicules depuis le compte Tesla |
| **Virtual Key** | Afficher/copier l'URL d'enregistrement ; vérifier le statut |
| **Fleet Telemetry** | Configurer par VIN ; affichage du statut |
| **Web Push (VAPID)** | Générer les clés VAPID directement dans le navigateur ou saisir manuellement |
| **Telegram Bot** | Configurer le token du bot (nécessite un redémarrage du serveur) |
| **Tarif d'électricité** | Définir le tarif de charge domestique (€/kWh) par véhicule |
| **APIs externes** | Configurer ABRP, clé Grok/xAI |
| **Monitoring** | Auto-réparation + e-mail d'alerte |
| **Résumé** | Vue d'ensemble du statut ; avertissement de redémarrage si Telegram a été configuré |

### Remarques

- **Mode brouillon** (assistant personnel) : les changements ne sont sauvegardés qu'à la dernière étape
- **Sauvegarde immédiate** (assistant admin) : les identifiants sont sauvegardés étape par étape dans `tenant_settings` (DB)
- **OAuth Tesla** : fenêtre popup ; se ferme automatiquement après la connexion
- **Génération VAPID** : directement dans le navigateur — pas besoin de `docker exec`
- **Sélecteur de langue dans l'en-tête** (chaque assistant) : chaque assistant affiche un sélecteur 🌐 compact en haut à droite. Choisir une langue s'applique instantanément à tous les textes de l'assistant ; pour les utilisateurs connectés, le choix est persisté dans le profil. À la connexion, la langue stockée dans le profil ou la valeur par défaut du tenant est appliquée automatiquement.
- **Auto-init au boot du backend** : les clés VAPID sont générées automatiquement par tenant dès que ni `tenant_settings` ni le `.env` n'en fournissent. Les notifications push fonctionnent donc dès la première connexion — l'étape correspondante de l'assistant affiche « ✓ déjà configuré (Auto) ».
- **Pré-remplissage de l'assistant** (`GET /api/system/wizard-prefill`) : quand l'assistant s'ouvre, il demande au backend des valeurs par défaut (audience Fleet API par Geo-IP, e-mail d'alerte = e-mail admin, tarif d'électricité par pays) plus un statut par étape. Les étapes déjà terminées sont marquées d'une bannière verte et peuvent être sautées directement ; l'écran d'accueil affiche « X sur Y étapes déjà faites ».
---

Tesla Carview offre deux chemins pour la configuration initiale.

## Assistant web (recommandé)

Au premier démarrage, l'app détecte automatiquement qu'aucun compte administrateur n'existe
et redirige le navigateur vers **/setup**.

### Étapes

1. **Bienvenue** — vue d'ensemble du système
2. **Créer un compte administrateur** — choisissez un nom d'utilisateur et un mot de passe fort
3. **Terminé** — redirection vers la page de connexion

L'assistant web sur `/setup` n'est accessible que tant qu'aucun admin n'existe.
Ensuite, la page est verrouillée automatiquement.

## Assistant terminal

```bash
bash deploy/setup-wizard.sh
```

Demande interactivement :

| Paramètre | Description | Exemple |
|---|---|---|
| URL publique | URL complète de l'application | `https://tesla.example.com` |
| Tesla Client-ID | Depuis le portail Tesla Developer | `abc123...` |
| Tesla Client-Secret | Depuis le portail Tesla Developer | `xyz456...` |
| Chemin de la base | Fichier SQLite | `./data/tesla-carview.db` |
| E-mail | Pour Let's Encrypt | `admin@example.com` |
| Clés VAPID | Pour Web Push (optionnel) | laisser vide = désactivé |

Le script écrit tout dans `backend/.env` et règle les permissions du fichier sur `600` (lisible uniquement par le propriétaire).

## Modifier la configuration plus tard

```bash
# relancer l'assistant terminal (écrase le .env) :
bash deploy/setup-wizard.sh

# ou éditer directement :
nano /opt/tesla-carview/backend/.env

# puis redémarrer les conteneurs :
docker compose -f docker-compose.prod.yml up -d
```

## Tous les paramètres

Liste complète des variables d'environnement dans `backend/.env.example` :

| Variable | Requis | Description |
|---|---|---|
| `PORT` | – | Port du backend (par défaut : 3000) |
| `JWT_SECRET` | ✓ | Chaîne aléatoire ≥ 64 caractères |
| `FRONTEND_URL` | ✓ | URL publique de l'app |
| `TESLA_CLIENT_ID` | ✓* | Client ID Tesla Fleet API |
| `TESLA_CLIENT_SECRET` | ✓* | Client secret Tesla Fleet API |
| `TESLA_REDIRECT_URI` | ✓* | URL de callback OAuth |
| `TESLA_AUDIENCE` | – | Région API Tesla (par défaut : NA) |
| `DB_PATH` | – | Chemin du fichier SQLite |
| `ENABLE_POLLER` | – | Poller de données véhicule on/off |
| `ADMIN_EMAIL` | – | E-mail pour Let's Encrypt |
| `VAPID_PUBLIC_KEY` | – | Clé publique Web Push |
| `VAPID_PRIVATE_KEY` | – | Clé privée Web Push |

*Requis uniquement si un véhicule Tesla doit être connecté.

## Générer les clés VAPID

```bash
npx web-push generate-vapid-keys
```
