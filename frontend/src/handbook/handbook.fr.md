# 📖 Manuel Tesla Carview

> ℹ️ **Note pour les administrateurs et self-hosters :** Ce manuel couvre l'app du point de vue utilisateur. L'installation, les variables d'environnement, la sauvegarde/restauration, la maintenance nocturne et l'activation du mode démo sont documentés dans la **documentation technique** du dossier [`docs/`](https://github.com/KnevS/Tesla-Carview/blob/main/docs/README.en.md) (en anglais), en particulier [10-configuration](https://github.com/KnevS/Tesla-Carview/blob/main/docs/10-configuration.en.md) et [11-operations](https://github.com/KnevS/Tesla-Carview/blob/main/docs/11-operations.en.md).
>
> 📚 **Nouveau sur Tesla Carview ?** Le **[Wiki GitHub](https://github.com/KnevS/Tesla-Carview/wiki)** propose une introduction guidée : installation pas à pas, accès réseau sans IP fixe (DynDNS, Cloudflare Tunnel), stockage Raspberry Pi (SSD au lieu de carte SD) — rédigé pour les non-informaticiens.

Version 2.1 · Auto-hébergé · Multi-locataire

## 🌟 Aperçu {#overview}

Tesla Carview est une application **auto-hébergée** d'enregistrement de données pour véhicules Tesla. Toutes les données restent exclusivement sur votre propre serveur — aucun cloud, aucun partage de données. L'application est entièrement **responsive** et fonctionne sur **iPhone/iPad (Safari)**, smartphones Android ainsi que sur les navigateurs de bureau.

**Fonctionnalités en bref :**

- 🚗 **Carnet de bord** — Trajets GPS, consommation, catégorisation des trajets
- ⚡ **Recharge** — Sessions de recharge avec coûts, détection de l'emplacement par GPS
- 🔋 **Batterie** — Suivi de la dégradation, historique d'autonomie, courbe de charge, efficacité vs température, décharge fantôme, détection d'anomalies (Companion Phase 1, statistique pure, local)
- 📊 **Tableau de bord** — Statistiques, vue mensuelle, dernières activités
- 🎮 **Commandes** — Climatisation, portes, lumières — directement depuis l'application
- 📝 **Carnet d'entretien** — Entretiens, réparations, coûts avec date
- 📤 **Export** — CSV/JSON pour toutes les données, sauvegarde complète au format ZIP
- 🔔 **Notifications push** — Notifications navigateur pour la fin de recharge, l'alarme Sentry, la batterie faible, etc. ; avec boutons d'action (démarrer la clim, trouver une borne, plus tard), regroupement par tag (les mises à jour de charge se remplacent) et miroir automatique vers iPhone/Apple Watch
- 📱 **Optimisé mobile** — Pleinement utilisable sur iPhone/iPad (Safari), Android et bureau

## 🔀 Ordre de tri {#sort-order}

Toutes les listes contenant des entrées chronologiques (trajets, sessions de recharge, entrées du carnet d'entretien, facturation, événements d'audit, liste des utilisateurs, versions des textes légaux) disposent d'un **bouton de tri** en haut à droite. Un clic alterne entre :

- ↓ **Plus récents d'abord** (par défaut)
- ↑ **Plus anciens d'abord**

L'ordre choisi est **enregistré par vue dans votre navigateur** (`localStorage`) et persiste après rechargement et fermeture de l'onglet — vous pouvez le régler différemment pour chaque liste (par exemple carnet de bord « plus récents d'abord », liste utilisateurs « dernière connexion en bas »).

## ⚠️ Statut de l'API Tesla en 2026 {#tesla-api-2026}

En mai/juin 2026, Tesla a fermé l'Owner API non officielle pour les endpoints véhicule. Les utilisateurs qui s'appuyaient sur le workaround communautaire (refresh token du compte Tesla) reçoivent désormais **HTTP 401 « invalid bearer token »** au lieu des données véhicule. Tesla Carview en tire deux conclusions claires :

### Trois sources de données en un coup d'œil

| Source | Ce que tu obtiens | Effort de configuration | Coût |
| --- | --- | --- | --- |
| **Tesla Fleet API** | Batterie, climatisation, GPS en direct, TPMS, commandes | Approbation app sur [developer.tesla.com](https://developer.tesla.com), délai semaines à mois | souvent 0 €/mois — Tesla accorde un crédit de 10 $ gratuit par compte, couvre l'usage privé typique avec une voiture + télémétrie streaming. Au-delà, à l'usage. |
| **OwnTracks** (smartphone) | Trace GPS, détection des trajets, distance | ~5 min dans l'assistant + installation app | gratuit |
| **Saisie manuelle** | Données de base sans API (le carnet de bord fonctionne) | < 1 min dans l'assistant | gratuit |

**Important :** les trois voies peuvent fonctionner en parallèle — OwnTracks te donne immédiatement un carnet de bord GPS complet, la saisie manuelle évite d'attendre la synchronisation Tesla, la Fleet API ajoute plus tard les données batterie et climat.

### Configuration OwnTracks (recommandée, immédiatement disponible) {#owntracks-setup}

1. **Assistant admin** → étape « GPS smartphone (OwnTracks) » → « Ajouter un nouvel appareil » → choisir étiquette, véhicule, conducteur.
2. **Scanner le code QR** : après création, un code QR s'affiche. Le scanner **avec l'appareil photo natif de l'iPhone** (PAS avec l'app OwnTracks !) → « Ouvrir dans OwnTracks » → confirmer l'importation de la configuration.
3. Régler l'**accès à la position sur « Toujours »** dans les réglages iOS → OwnTracks. Sinon pas de GPS en arrière-plan.
4. Dès que le conducteur dépasse 5 km/h, un trajet démarre automatiquement. 5 minutes d'arrêt y mettent fin.

**Pour les utilisateurs sans droits admin** : chaque conducteur a sa propre page sous « 📱 Mon GPS » pour ajouter un appareil + scanner le QR — pas besoin de l'aide de l'admin.

### Saisie manuelle de véhicule {#manual-vehicle}

Dans l'étape « Véhicules » de l'assistant, deux cartes côte à côte : « ☁ Sync Tesla (cloud) » et « ✍ Saisie manuelle ». La variante manuelle :

- Fonctionne sans accès à l'API Tesla
- Champs : étiquette (obligatoire), plaque d'immatriculation, VIN (optionnel — VIN synthétique « MANUAL… » sinon), modèle, compteur initial
- L'utilisateur créateur est automatiquement ajouté comme conducteur → peut immédiatement enregistrer un appareil OwnTracks dessus
- Le compteur initial est aussi écrit dans le champ compteur actuel — le calcul TCO fonctionne dès le premier jour

### Cockpit TCO (coût total de possession) {#tco-cockpit}

Sous `/tco`, tu vois le coût total réel par véhicule et une valeur €/km honnête. Quatre cartes KPI :

- **Coût par km** — coût total ÷ km parcourus
- **Coût total** — somme de toutes les rubriques
- **Dépréciation** — achat − prix de vente (ou valeur résiduelle estimée : dépréciation linéaire sur 8 ans jusqu'à 25 %)
- **Coût électricité** — depuis les sessions de charge

Ventilation détaillée en dessous avec les parts + CRUD des entrées de maintenance (inspection, pneus, réparation, contrôle technique, accessoires, autre) + formulaire de données de base (prix/date d'achat, vente, assurance, taxe véhicule, km initial).

### Assistant IA : Ollama ou Grok {#ai-provider}

Dans l'assistant admin → « API externes » → fournisseur IA :

- **🏠 Ollama** (par défaut, souverain en données) : LLM local exécuté sur ton propre matériel. Recommandations de modèle par classe matérielle (Pi 4 : `llama3.2:1b`, Pi 5 : `qwen2.5:3b`, VPS : `llama3:8b`). Installation du modèle depuis l'assistant via barre de progression SSE. **Les données ne quittent JAMAIS l'instance.**
- **☁ Grok** (cloud) : API xAI Grok — plus rapide, mais chaque requête va vers les serveurs US. Clé API xAI requise, garde-fou de budget journalier intégré.
- **⊝ Désactivé** : chat IA complètement désactivé.

Sur des hôtes avec < 4 Go de RAM, désactiver Ollama via `docker-compose.override.yml` avec `services.ollama.profiles: [disabled]`.

### Mon GPS — libre-service pour les conducteurs {#my-gps}

Chaque utilisateur connecté a sa propre page sur `/my-tracking` (« 📱 Mon GPS » dans la navigation) :

- Liste des appareils OwnTracks **propres** (le conducteur ne voit que les siens, l'admin tous)
- Code QR pour la configuration directe, récupérable à tout moment (plus de problème de token perdu)
- Sélection de véhicule filtrée sur les véhicules avec droits d'accès — pas d'envoi GPS accidentel vers d'autres voitures

## 🔋 Tableau santé batterie (Companion Phase 1) {#battery-health}

Depuis v3.6.0, `/battery` propose six sections qui répondent honnêtement aux questions clés sur la batterie — **pure statistique, sans IA, sans fuite de données** :

1. **Historique d'autonomie** — courbe glissante du rated_range max.
2. **Dégradation** — écart entre première et dernière mesure, codé couleur (vert <5 %, jaune <10 %, rouge ≥10 %).
3. **Courbe de charge** — puissance moyenne de pic groupée en quatre plages de SOC (0-20 %, 20-50 %, 50-80 %, 80-100 %) et nuage kW vs SOC de départ. Des valeurs plus faibles au-dessus de 80 % sont normales (tapering) ; les anomalies entre 20-50 % peuvent évoquer un problème BMS.
4. **Efficacité vs température extérieure** — kWh/100 km par tranches de 5 °C, à partir de vos trajets. Rend visible la pénalité hivernale.
5. **Décharge fantôme** — perte de SOC par heure à l'arrêt. Exclut les fenêtres de trajet et de charge. Médiane + moyenne en haut, top-10 d'événements en tableau. >1 %/h est notable (sentry, mises à jour, préconditionnement).
6. **Anomalies** — sauts SOC >10 % hors trajet/charge, sauts d'autonomie >30 km, efficacité hors normes (>35 ou <7 kWh/100km).

**Sources** : `battery_snapshots`, `trips`, `charging_sessions` — tout dans votre SQLite. Aucun appel externe, aucun cloud, aucun modèle. Le calcul tourne côté serveur dans `backend/src/routes/battery.js`.

**Sélecteur de véhicule** : toutes les sections réagissent au véhicule sélectionné.

### Companion Phase 2 (à partir de v3.7.0) {#companion-phase-2}

Deux nouvelles sections sur `/battery`, toutes deux à partir de vos données existantes :

- **Alertes Companion** : anomalies persistantes. Le moteur Companion tourne chaque nuit (dans l'hygiène `nightlyMaintenance`) et toutes les 6 heures — chaque nouvelle anomalie est notifiée une fois (Web Push + Telegram si lié). Chaque alerte propose « ✓ Marquer comme vu » et « ✕ Rejeter ».
- **Suggestion de préconditionnement** : si la température prévue pour demain à votre heure de départ habituelle (apprise des trajets des 30 derniers jours) est inférieure à 5 °C ou supérieure à 30 °C, une suggestion push arrive avec la raison précise. Source météo : [Open-Meteo](https://open-meteo.com/) — gratuit, sans compte.

**Flux de données entièrement local** : l'appel météo est la seule requête externe (uniquement lat/lon, pas de compte). Les anomalies et suggestions arrivent dans deux nouvelles tables `battery_anomalies` et `precondition_suggestions` (idempotent via contrainte UNIQUE).

**Phase 3 (feuille de route)** : chat companion approfondi via Ollama — toujours local.

## 📋 Prérequis {#requirements}

### Serveur

- Serveur Linux (x86_64, ARM64 ou ARMv7) avec au moins 1 Go de RAM
- Docker + Docker Compose (installés par le script de configuration)
- Domaine accessible publiquement + certificat TLS (requis par l'API Tesla)
- Le port 443 (HTTPS) doit être accessible depuis l'extérieur

### Compte Tesla Developer

- Inscription sur `developer.tesla.com`
- Créer une application → noter le Client ID et le Client Secret
- URL de callback : `https://<votre-domaine>/api/auth/callback`
- Pour les commandes véhicule : demander l'accès à la Fleet API (gratuit, 1 à 3 jours ouvrés)

## 🚀 Installation {#installation}

Le script d'installation installe tout automatiquement : Docker, nginx, TLS, tesla-http-proxy.

```bash
# En tant que root sur le serveur cible :
curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash

# Le script demande de manière interactive :
# → Domaine (ex. carview.monserveur.fr)
# → Tesla Client ID et Client Secret
# → URI de redirection Tesla
# → JWT Secret (généré automatiquement)
```

> **Alternative : configuration manuelle**
>
> Copiez `.env.example` → `.env` et adaptez toutes les valeurs. Puis : `docker compose -f docker-compose.prod.yml up -d`

## ⚙️ Configuration initiale dans le navigateur {#first-setup}

1. **Ouvrir le navigateur** — Ouvrez `https://<votre-domaine>/setup` — vous serez redirigé automatiquement.
2. **Créer un locataire** — Choisissez un nom de locataire (ex. « Famille Martin ») et un identifiant court (ex. « martin »). L'identifiant court est requis lors de la connexion — notez-le.
3. **Créer le compte administrateur** — Définissez un nom d'utilisateur et un mot de passe. Le mot de passe doit comporter au moins 12 caractères. Recommandation : une phrase de passe de 4 mots.
4. **Assistant de configuration** — Après la première connexion, l'assistant démarre automatiquement et vous guide à travers toutes les étapes critiques (voir ci-dessous).

## 🧙 Assistant de configuration {#settings-wizard}

Après la première connexion, l'**assistant de configuration** s'ouvre automatiquement. Il peut être relancé à tout moment via **Paramètres → Lancer l'assistant**.

**Pour les admins**, l'assistant guide à travers 16 étapes dans le bon ordre de dépendance :

| Étape | Description |
|-------|-------------|
| **Langue** | Choisir la langue de l'app |
| **Tesla OAuth** | Connecter le compte Tesla — bouton ouvre un popup qui se ferme après la connexion |
| **Véhicules** | Synchroniser les véhicules depuis le compte Tesla |
| **Clé virtuelle** | Afficher et copier le lien d'enregistrement pour le smartphone |
| **Fleet Telemetry** | Activer le suivi GPS par véhicule |
| **Prix de l'électricité** | Prix de recharge à domicile (€/kWh) par véhicule |
| **Vérification légale** | Scan automatique des espaces réservés ouverts dans les textes juridiques |
| **APIs externes** | OCM, HERE Maps, Grok/xAI |
| **Monitoring** | Auto-guérison + e-mail d'alerte |
| **Design → Résumé** | Préférences ; toutes les modifications sont enregistrées à la dernière étape |

> **Conseil :** Chaque étape peut être ignorée — l'assistant peut être relancé à tout moment.

> **🌐 Sélecteur de langue :** Chaque assistant affiche un sélecteur de langue compact en haut à droite. La langue stockée dans le profil utilisateur ou la valeur par défaut du locataire est appliquée automatiquement à la connexion ; le sélecteur permet de changer la langue en cours d'assistant sans le quitter.

## 🔑 Configurer une Virtual Key {#virtual-key}

Pour les commandes véhicule (ouverture des portes, climatisation, etc.), une Virtual Key doit être enregistrée sur le véhicule. Cela n'est nécessaire que pour les véhicules récents (`vehicle_command_protocol_required: true`).

1. Vérifiez que **tesla-http-proxy** fonctionne :

   ```bash
   systemctl status tesla-http-proxy
   ```

2. Sur l'iPhone, ouvrez dans Safari : `https://tesla.com/_ak/<votre-domaine>`
3. L'application Tesla demande « Autoriser cette app ? » → confirmez
4. Restez à portée Bluetooth du véhicule — la clé est acceptée en moins de 30 secondes
5. Vérifiez sous **Paramètres → Connexion véhicule → Statut Virtual Key**

## ⚡ Lieux de recharge & coûts {#charging-locations}

Les lieux de recharge sont détectés automatiquement par GPS et associés à un prix au kWh.

**Détection automatique GPS** — Si un lieu de recharge est configuré avec des coordonnées GPS et un rayon (200 m par défaut), le bon emplacement est détecté automatiquement au démarrage de la recharge et le prix/kWh enregistré est appliqué.

**Créer un lieu de recharge** — Sous **Recharge → Lieux** : saisissez nom, type (Domicile/Bureau/Public), prix/kWh, coordonnées GPS et rayon de détection.

**Ajuster les coûts manuellement** — Dans la liste de recharge : cliquez sur une session → modifier les coûts. Les coûts peuvent aussi être mis à 0 (ex. recharge gratuite).

**✕ Marquer une recharge comme gratuite** — Dans l'**historique des recharges**, chaque session a un petit bouton *« ✕ gratuit »*. Les recharges marquées ainsi apparaissent grisées avec le badge *« gratuit »* et sont **automatiquement exclues du décompte de recharge à domicile** — aussi bien des résumés mensuels que de l'analyse individuelle.

Cas typique : recharge sur le lieu de travail, payée par l'employeur, qui ne doit pas figurer dans le décompte personnel. Le bouton *« ↩ payant »* permet d'annuler le marquage à tout moment.

## 🔐 Sécurité {#security}

- 🔑 **Passkey / WebAuthn** — Connexion sans mot de passe avec empreinte digitale, Face ID ou clé matérielle
- 📱 **Connexion QR pour la voiture** — Jeton à usage unique (60 s) créé dans les paramètres, scannable avec le navigateur Tesla ou un autre appareil — pas de saisie de mot de passe dans la voiture
- 📱 **TOTP MFA** — Authentification à deux facteurs avec une application authenticator
- 🛡️ **Verrouillage de compte** — Le compte est verrouillé pendant 15 min après 5 tentatives échouées
- 🍪 **Refresh token** — Cookie httpOnly, valable 7 jours, rotation automatique
- 📋 **Journal d'audit** — Toutes les connexions, modifications et événements de sécurité sont enregistrés
- 🔒 **HTTPS + HSTS** — TLS 1.2/1.3, HSTS, OCSP-Stapling, en-têtes sécurisés

**Réglages de sécurité recommandés :**

- Activer la MFA (TOTP) après la première connexion
- Configurer une passkey pour la connexion sans mot de passe
- Effectuer régulièrement des sauvegardes (export)
- Mot de passe fort : au moins 16 caractères ou phrase de passe de 4 mots

**MFA forcée pour les nouveaux utilisateurs.** Les nouveaux comptes sont créés par défaut avec l'option `MFA-obligatoire` — à la première connexion l'application redirige automatiquement l'utilisateur vers **`/mfa/setup`** et ne le laisse passer qu'après la configuration TOTP. Les administrateurs peuvent désactiver ou réactiver l'obligation dans la fiche utilisateur (**Admin → Utilisateurs**). Les comptes admin ne sont pas obligés d'activer la MFA, mais c'est fortement recommandé.

## 🏢 Multi-locataires {#multitenancy}

Tesla Carview prend en charge plusieurs locataires entièrement isolés sur une même instance. Chaque locataire dispose de sa propre base de données — un locataire ne peut jamais voir les données d'un autre.

**Créer des locataires (lien d'invitation)** — Les nouveaux locataires ne peuvent s'enregistrer que via un **lien d'invitation**. Un administrateur génère le lien sous **Admin → Utilisateurs → Créer un lien d'invitation** et peut y joindre une **note** facultative (par ex. « pour Jean Dupont, société XY ») afin de retrouver l'invitation plus tard. Le lien est valable 7 jours et utilisable une seule fois. Sans lien valide, `/register` est verrouillé. Les invitations existantes peuvent être **réémises** (même note, nouveau jeton), **bloquées** (restent visibles mais inutilisables) ou **supprimées** définitivement.

**Plusieurs véhicules par locataire** — Tous les véhicules d'un compte Tesla sont importés automatiquement lors de la synchronisation. Sous **Paramètres → Connexion Tesla → 🔄 Synchroniser les véhicules**, la synchronisation peut être déclenchée manuellement à tout moment — utile lorsqu'un nouveau véhicule a été ajouté au compte. On change de véhicule en haut à droite de la barre de navigation.

**Connexion avec l'identifiant locataire** — Avec plusieurs locataires, un champ « locataire » apparaît à la connexion. Avec un seul locataire, il est détecté automatiquement.

**Gestion des utilisateurs** — Les administrateurs peuvent créer d'autres utilisateurs au sein de leur locataire et leur attribuer des véhicules sous **Admin → Utilisateurs**. Trois droits peuvent être ajustés par utilisateur :

- **Modifier les véhicules** — Autorise l'utilisateur à modifier les données de base du véhicule (nom, immatriculation, couleur, tarif électricité, configuration Monta). Par défaut pour les nouveaux utilisateurs : désactivé.
- **Ajouter des véhicules** — Autorise l'utilisateur à synchroniser de nouveaux véhicules depuis le compte Tesla. Par défaut : désactivé.
- **MFA obligatoire** — Force la configuration TOTP à la première connexion (voir Sécurité ci-dessus). Par défaut pour les nouveaux utilisateurs : activé.

Les administrateurs disposent implicitement de ces trois droits — les cases à cocher sont masquées pour les comptes admin. L'en-tête de la page de gestion des utilisateurs affiche également une **carte de tâches** orange dès qu'un utilisateur actif (non admin) n'a aucun véhicule attribué — avec des boutons rapides pour attribuer un véhicule ou accorder le droit « Ajouter des véhicules ».

**Pseudonyme de locataire (protection des données)** — La page de connexion publique **n'affiche pas** votre vrai nom de locataire, mais un pseudonyme aléatoire de type `adjectif-nom` comme `brave-eagle` ou `quiet-otter`. Ainsi, personne ne peut voir de l'extérieur quelle personne ou société utilise cette instance auto-hébergée.

- Le pseudonyme est **attribué automatiquement** à la création du locataire.
- Consultez-le sous **Paramètres → 🔐 Pseudonyme du locataire**.
- Le bouton **« Régénérer »** en attribue un nouveau ; l'ancien part dans un historique et ne sera plus suggéré par hasard.
- **À retenir.** Avec plusieurs locataires, le pseudonyme est votre unique identifiant lors de la connexion — notez-le à côté du mot de passe dans votre gestionnaire de mots de passe. Sans sauvegarde, le perdre signifie repartir d'un environnement vide.
- Le **slug interne** et le nom réel restent dans la base et restent visibles aux administrateurs — seule la page de connexion est anonymisée.

## 💾 Sauvegarde {#backup}

**Export manuel** — Sous **Export** : CSV ou JSON pour les trajets et sessions de recharge, ainsi qu'une sauvegarde complète au format ZIP.

**Sauvegarde automatique (serveur)** — Les bases SQLite se trouvent dans le répertoire bind-mount `./data` (relatif au fichier Compose, normalement `/opt/tesla-carview/data`). Pour des sauvegardes automatiques côté serveur :

```bash
# Sauvegarde quotidienne à 3 h (crontab -e) :
0 3 * * * cp /opt/tesla-carview/data/master.db /opt/tesla-carview/data/tenants/*.db /backup/
```

La **sauvegarde complète intégrée** (Admin → Gestion des données → « Backup erstellen ») exporte les 26 tables en JSON, y compris les identifiants de clés d'accès (passkeys). Après restauration sur le même serveur, les passkeys enregistrées fonctionnent immédiatement.

> ⚠️ **Important avant suppression**
>
> Effectuez toujours un export avant de supprimer des données. Les données supprimées ne peuvent pas être restaurées.

## ⚡ Configuration de la Tesla Developer API {#tesla-api}

Tesla Carview communique via la **Tesla Fleet API** officielle. Vous avez besoin d'un compte Tesla Developer gratuit et d'une application enregistrée.

### Étape 1 – Créer un compte développeur

1. Rendez-vous sur `developer.tesla.com` et identifiez-vous avec votre compte Tesla.
2. Acceptez les Developer Terms of Service.
3. Cliquez sur **Create Application**.

### Étape 2 – Configurer l'application

1. **Application Name :** nom au choix, par ex. *Tesla Carview*
2. **Description :** courte description (obligatoire)
3. **Allowed Origin :** votre URL publique, par ex.

   ```
   https://carview.example.com
   ```

4. **Redirect URI :** URL de callback de l'application :

   ```
   https://carview.example.com/api/auth/callback
   ```

5. **Scopes (requis) :** `vehicle_device_data`, `vehicle_cmds`, `vehicle_charging_cmds`, `vehicle_location`, `openid`, `offline_access`
6. ⚠ `vehicle_location` est obligatoire pour le suivi GPS (Fleet Telemetry)

### Étape 3 – Noter les identifiants

Après création, vous obtenez :

- **Client ID** — chaîne au format UUID
- **Client Secret** — affiché une seule fois, copiez-le immédiatement et stockez-le en lieu sûr

```env
TESLA_CLIENT_ID=abc123def456...
TESLA_CLIENT_SECRET=tsl_secret_...
```

Saisissez ces valeurs dans le fichier `.env` ou indiquez-les dans l'assistant de configuration interactif.

### Étape 4 – Demander l'accès Fleet API (pour les commandes)

Pour que les commandes véhicule (climatisation, portes, recharge) fonctionnent, votre application doit être enregistrée comme *partenaire* chez Tesla. Cela se fait une fois via :

```
POST https://fleet-api.prd.na.vn.cloud.tesla.com/api/1/partner_accounts
```

Le script d'installation effectue cette étape automatiquement si `FRONTEND_URL` est défini. Sinon, faites-le manuellement via Postman ou curl. L'activation prend 1 à 3 jours ouvrés.

### Étape 5 – Connexion dans Tesla Carview

1. Après connexion : **Paramètres → Connexion Tesla → Reconnecter Tesla**
2. Vous serez redirigé vers Tesla et devrez vous y identifier et autoriser l'application.
3. Après redirection : **Paramètres → 🔄 Synchroniser les véhicules**
4. Tous les véhicules du compte Tesla apparaissent dans l'application.

### Étape 6 – Activer la Fleet Telemetry (suivi GPS)

Sur les véhicules récents (par ex. Model Y à partir de 2024, VIN XP7), les données GPS arrivent exclusivement via **Fleet Telemetry** — pas via l'API REST. Deux étapes uniques sont nécessaires :

1. **Enregistrer l'application chez Tesla** — Paramètres → Fleet Telemetry → cliquez sur *« 🔑 Enregistrer l'application chez Tesla »*. Une seule fois.
2. **Demander l'accès Fleet Telemetry** — Si l'étape suivante échoue avec « HTTP 404 », Tesla n'a pas encore activé l'endpoint. Contactez alors le Tesla Developer Support (voir ci-dessous).
3. **Activer la télémétrie** — Paramètres → Fleet Telemetry → cliquez sur *« 📡 Activer la télémétrie »*. Configure le véhicule pour qu'il diffuse GPS, vitesse et données de batterie.

**Demande d'accès Fleet Telemetry au Tesla Support**

Si l'étape 2 échoue avec un 404, envoyez la demande suivante via le formulaire Tesla Developer Support (`developer.tesla.com/dashboard → Support Inquiry`) :

```
Subject: Fleet Telemetry Access Request – Self-Hosted App for Personal Use

Hello Tesla Developer Support,

I am requesting approval for fleet_telemetry_config access for a
self-hosted application used exclusively for personal purposes
(own vehicle, single user).

Context:
- App name: MyCarviewApp
- Client ID: a1b2c3d4-0000-0000-0000-e5f6a7b8c9d0
- Hosting: self-hosted on private infrastructure
- User scope: single user (vehicle owner)
- Vehicle VIN: 5YJ3E1EA1NF000000

Current status:
- OAuth, polling, charging control, and vehicle commands work.
- fleet_telemetry_config returns HTTP 404.

Use case:
Personal monitoring of my own vehicle (location, charging state,
drive state) via my self-hosted backend. No third-party access,
no commercial use, no data sharing.

Could you please review and enable fleet_telemetry_config?

Thank you
```

⚠ Remplacez le Client ID et le VIN par vos propres valeurs. Tesla répond généralement en quelques jours.

### Comprendre les coûts de l'API

**Important d'abord :** Tesla accorde un **crédit gratuit de 10 $ par compte et par mois** (état 2026) — suffisant pour **un véhicule avec Fleet Telemetry + quelques commandes/réveils par jour**. En usage privé typique, la facture Fleet API tombe à **0 €**. Au-delà, paiement à l'usage : Streaming 150 000 signaux = 1 $, Commandes 1 000 = 1 $, Polling 500 requêtes = 1 $, Réveils 50 = 1 $ (action la plus chère). Sans Fleet Telemetry, l'app interroge en arrière-plan :

| État | Intervalle | Appels/jour |
|------|-----------|-------------|
| En conduite | 30 s | jusqu'à 2 880 |
| En ligne, à l'arrêt | 10 min | jusqu'à 144 |
| Hors ligne / en veille | 45 min | jusqu'à 32 |
| Avec Fleet Telemetry | Heartbeat 1 h | 24 |

**Plafond journalier :** 80 appels/véhicule/jour par défaut, puis pause jusqu'à minuit.

**Réduire les coûts :** configurer Fleet Telemetry (streaming au lieu de polling, ~5 $/mois hors crédit gratuit, 0 $ avec crédit), activer une limite mensuelle dans Paramètres → Connexion Tesla. **En pratique : un véhicule + télémétrie streaming = Fleet API quasi gratuite.**

## 🔌 Intégration Monta (recharge domicile & facturation) {#monta}

Tesla Carview peut récupérer les données de recharge directement depuis votre **wallbox Monta**. L'intégration est disponible pour **tous les véhicules** :

- **Véhicules privés** : les sessions Monta sont affichées comme informations de recharge (badge 🏠 dans l'historique, détection de la wallbox domicile).
- **Véhicules de fonction** : en plus, la facturation complète est disponible — récapitulatif mensuel, feuille PDF de remboursement et modèle de décompte pour l'employeur.

> ℹ️ Les fonctions de facturation (PDF, modèle de remboursement) sont réservées aux véhicules de la catégorie **Véhicule de fonction**. Les données de recharge Monta sont disponibles pour tous les véhicules.

### Étape 1 – Créer une clé API Monta

1. Connectez-vous à **Monta** (app ou web : `portal.monta.com`).
2. Allez dans **Paramètres → API**.
3. Cliquez sur **Créer une clé API** et copiez la clé (elle commence par `monta_`).

La clé n'est visible qu'une seule fois — saisissez-la immédiatement dans Tesla Carview.

### Étape 2 – Trouver l'ID du point de recharge

1. Dans le portail Monta : sélectionnez **Points de recharge → Mes équipements**.
2. L'**ID du point de recharge** se trouve dans la vue de détail (format : `cp_12345`).
3. Alternative : l'appel API `GET /api/v1/charge-points` renvoie tous les points de recharge avec leurs IDs.

### Étape 3 – Saisie dans Tesla Carview

1. Allez dans **Paramètres → Profil du véhicule**.
2. Saisissez le **prix de l'électricité wallbox (€/kWh)** — par ex. `0.34` (base de facturation pour les véhicules de fonction).
3. Ajoutez l'**ID du point de recharge Monta** et la **clé API Monta**.
4. Cliquez sur **Enregistrer**.

### Détection de la wallbox domestique

Lorsqu'un **identifiant Charge-Point Monta** est configuré sur le véhicule, toutes les sessions retournées par la synchronisation sont par définition des recharges à la wallbox domestique. L'application marque automatiquement les sessions locales correspondantes comme **recharges à domicile** et affiche un badge 🏠 dans la liste de recharge ainsi qu'un marqueur 🏠 dans la facturation. Ce drapeau sert également de signal fiable « domicile vs. extérieur » dans le décompte mensuel — indépendant de la correspondance par GPS, ce qui permet de classer correctement une session même si le véhicule ne fournit pas de position GPS pendant la recharge.

### Utiliser la facturation

- Allez dans **Facturation** dans la navigation.
- Choisissez le mois souhaité — toutes les recharges à domicile sont listées.
- Les recharges gratuites (par ex. chez l'employeur) peuvent être marquées dans l'historique avec **✕ gratuit** — elles seront alors exclues du décompte.
- Avec **Exporter en PDF**, vous obtenez un décompte prêt à signer.

## 📝 Carnet d'entretien {#logbook}

Utilisez le **carnet d'entretien** pour documenter tout ce qui touche au fonctionnement du véhicule : entretien, réparations, changements de pneus, contrôles techniques, accidents et notes libres. Chaque entrée reçoit automatiquement :

- **Date et heure** — réglées par défaut sur « maintenant » lors de la création ; les entrées rétroactives ou planifiées sont possibles.
- **Auteur** — l'utilisateur connecté est enregistré comme auteur et affiché à côté de chaque entrée sous la forme **👤 nom d'utilisateur**. Les entrées antérieures à cette fonctionnalité apparaissent comme « 👤 inconnu ».
- **Catégorie et champs facultatifs** — kilométrage à la date, coût, description libre.

Cela permet de retrouver plus tard qui a saisi quelle note ou quel entretien — utile dans les locataires comportant plusieurs utilisateurs actifs.

## 🚀 Hub d'apps (à partir de v3.9.0) {#app-hub}

`/launcher` propose une **liste sélectionnée d'apps web** qui tournent dans le navigateur Tesla et que Tesla ne propose PAS nativement :

- **Audio (service public)** — ARD Audiothek, Deutschlandfunk en direct
- **Monde VE** — GoingElectric, electrive, OpenChargeMap, A Better Routeplanner
- **Messagerie** — Telegram Web, Signal (Tesla n'a pas de chat natif)
- **Savoir** — Wikipedia

**Critères d'inclusion** : gratuit, sécurisé (HTTPS), pas d'installation forcée depuis l'app store, respectueux de la vie privée, **pas de doublon natif Tesla** (Spotify, Apple Music, jeux, cartes, streaming sont volontairement absents — Tesla les propose déjà).

**Audio dans les haut-parleurs Tesla** : transite par Bluetooth depuis votre téléphone comme d'habitude — pas de configuration.

**Liste blanche admin** : sous `/admin?tab=launcher`, un admin peut masquer des apps par locataire, p. ex. si vous ne voulez pas afficher Telegram Web. La liste est persistée dans `tenant_settings` sous `launcher.disabled_slugs`.

## 📍 Saisie manuelle d'emplacement (sans GPS) {#manual-location}

Si votre Tesla ne fournit pas de GPS (typique des VIN XP7 sans Fleet Telemetry, ou lors de coupures), vous pouvez saisir l'emplacement de charge et les adresses de trajet à la main :

- **Emplacement de charge** — cliquez sur le nom d'emplacement dans la liste des charges pour ouvrir l'éditeur en ligne. Trois voies : sélectionner un emplacement défini (le tarif / la position sont hérités), saisir un nom libre, ou entrer des coordonnées lat/lon (auto-association avec les emplacements définis dans le rayon configuré, 200 m par défaut).
- **Adresses de trajet** — sous `Détail du trajet → ✎ Modifier` : adresses de départ et d'arrivée en texte libre, plus lat/lon optionnelles pour la carte.

Chaque champ modifiable comporte une infobulle expliquant à quoi il sert, quand l'utiliser et ce qui se passe à l'enregistrement.

### Résolution automatique d'adresse à partir de v3.8.0 {#auto-geocode}

Quand un trajet ou une session de charge a **des coordonnées GPS mais pas de texte d'adresse**, TeslaView remplit l'adresse automatiquement en arrière-plan :

- **Déclencheur live** : juste après chaque fin de trajet OwnTracks et chaque insert de session de charge, un lookup inverse fire-and-forget s'exécute.
- **Backfill nocturne** : jusqu'à 60 anciens enregistrements par locataire sont traités chaque nuit.
- **À la demande admin** : `POST /api/system/geocode-backfill` (espace admin) déclenche un run immédiat avec une `limit` configurable.

**Source** : [Nominatim/OpenStreetMap](https://nominatim.openstreetmap.org) — gratuit, sans compte, sans clé API. Souverain en données (OSM Foundation, UE).

**Cache local** : chaque lookup atterrit dans `geocode_cache` (arrondi à 4 décimales ~11 m) et est ensuite disponible pour tout autre trajet/session au même endroit sans nouvel appel externe. La limite de 1 requête/seconde de Nominatim est strictement respectée.

## 🎮 Commande véhicule étendue {#control-extended}

La page **Commande** est désormais proche du périmètre de l'application mobile Tesla :

| Domaine | Fonctions |
|---|---|
| Climat | Marche/arrêt, température cible, précondition max-défrost, **modes climate keeper** (off / maintien / 🐶 chien / ⛺ camp), chauffage du volant |
| Sièges | 5 sièges (conducteur, passager, arrière G/M/D) × 4 niveaux de chauffage |
| Carrosserie | Portes, mode sentinelle, actionneur du coffre avant et arrière, ouvrir/fermer toutes les fenêtres, feux & klaxon |
| Charge | Démarrage/arrêt, curseur de limite, **curseur d'ampérage (5–48 A)**, trappe de charge ouvrir/fermer |
| Boombox | 9 sons Tesla pré-installés via les haut-parleurs externes (uniquement véhicules équipés ; voiture à l'arrêt) |
| Programmation de départ | Heure quotidienne, optionnellement lun–ven — Tesla démarre la préconditionnement env. 20–30 min avant ; le véhicule doit être branché |
| Charge heures creuses | Heure de début de charge fixe pour tarifs dynamiques (Tibber, aWattar, tarif heures creuses). Contrairement à la programmation de départ, la voiture ne **calcule pas à rebours** — l'heure est le départ, pas l'heure d'arrivée prête. La charge continue jusqu'à atteindre la limite. |
| Mise à jour logicielle | Statut (disponible / téléchargement / installation / planifiée), « Installer maintenant » planifie avec un décalage d'1 min, « Annuler » supprime une installation planifiée |

Remarques :
- Les commandes nécessitent une **Virtual Key** active et un `tesla-http-proxy` en cours d'exécution (voir Démarrage rapide).
- Lorsque la voiture dort, les commandes sont refusées — appuyez d'abord sur « ☀️ Réveil » (~30 s).
- Le climate keeper ne fonctionne que si la climatisation était active lorsque le conducteur quitte la voiture.

## 📜 Gestion des contenus juridiques {#legal-admin}

Sous **Admin → Contenus juridiques**, l'administrateur gère mentions légales, politique de confidentialité et conditions d'utilisation. Trois points sont importants :

- **Maintenir la langue par défaut, les autres suivent** — Le mode de synchronisation est activé par défaut : vous éditez la version allemande et les cinq autres locales reflètent le même texte octet-pour-octet. Le frontend affiche alors un bandeau bleu (« actuellement maintenu uniquement en allemand »). Le mode de synchronisation peut être désactivé par édition pour entretenir une seule locale individuellement.
- **L'incrément de version met à jour la date automatiquement** — Lorsque vous cochez « Incrémenter la version » à l'enregistrement, le backend écrit d'abord la date du jour dans la ligne « Stand : » / « Last updated : » / « Dernière mise à jour » du corps, puis seulement après incrémente la version. Ainsi, chaque version majeure porte automatiquement la bonne date sans que vous ayez à entretenir cette ligne à la main. Les corrections de corps simples sans incrément laissent la date inchangée.
- **Suivi des acceptations** — Chaque incrément force tous les utilisateurs actifs à accepter à nouveau confidentialité et conditions — le modal d'acceptation bloque la connexion jusque-là. Les acceptations sont stockées dans la base de données du locataire par utilisateur + version + IP + horodatage, en conformité RGPD.

## 🔧 Intervalles d'entretien {#service-intervals}

Sous **Paramètres → Intervalles d'entretien** vous définissez par véhicule des tâches récurrentes (CT, révision, liquide de frein, changement de pneus saisonnier, filtre habitacle, balais d'essuie-glace, climatisation). Chaque entrée a un **intervalle de temps** (mois), un **intervalle km**, ou les deux. « Créer les valeurs par défaut » remplit une liste typique pour Tesla.

L'app calcule « échéance dans X jours / Y km » et affiche les éléments en retard ou bientôt dus en haut du tableau de bord. Un **rappel push quotidien** (Web-Push) se déclenche lorsque l'échéance est < 30 jours ou < 1 000 km. Anti-spam : chaque push marque l'entrée comme notifiée ; un nouveau rappel n'arrive qu'après un « Fait » ou un report de 30 jours. « Fait » fixe automatiquement la date du jour et le kilométrage actuel.

## 📋 Journal d'audit {#audit-log}

Sous **Admin → Journal d'audit** les administrateurs voient tous les événements pertinents pour la sécurité : connexions (réussies + échouées), verrouillages, configuration MFA, changements de droits, commandes Tesla, acceptations RGPD, création d'utilisateurs. Filtrable par action, ID utilisateur et plage de dates. Les actions sont codées en couleur (rouge pour les échecs, bleu pour l'auth, violet pour l'admin). Le bloc détails ouvre le JSON. L'**export CSV** livre l'ensemble filtré prêt pour Excel (point-virgule, BOM) — adapté aux demandes RGPD ou aux analyses post-incident. Les données sont isolées par locataire.

## 📄 Décompte PDF {#pdf-billing}

Le bouton **« 📄 PDF erzeugen »** dans **Facturation** produit une feuille A4 signable : en-tête avec entreprise, véhicule et période ; tableau des sessions avec le marqueur 🏠 pour les recharges à domicile détectées par Monta ; totaux (sessions / kWh / montant) ; lignes de signature. La génération a lieu entièrement dans le navigateur via `jsPDF` — les données de charge ne quittent jamais votre machine.

## 💸 Prix dynamique de l'électricité {#dynamic-tariff}

Si vous êtes sur un tarif dynamique (Tibber, aWattar HOURLY, EPEX-Spot), configurez un fournisseur sous **Paramètres → API prix électricité** :

| Fournisseur | Jeton API | Base de prix |
|---|---|---|
| **aWattar** (DE/AT) | non requis — public | Prix spot EPEX, optionnellement + supplément en ct/kWh |
| **Tibber** (DE/SE/NO/NL/…) | jeton depuis developer.tibber.com | Prix final particulier, taxes incluses |

Le tableau de bord affiche alors un **widget tarif** avec le prix actuel, une courbe 24h et la recommandation « fenêtre 4h la moins chère ». Un clic sur **« 🚗 Planifier la charge sur la fenêtre la moins chère »** écrit le début de cette fenêtre directement dans `set_scheduled_charging` du véhicule actif. Les prix sont mis en cache 30 minutes. Sans fournisseur configuré le widget reste masqué et aucune requête sortante n'est émise.

## 📒 Carnet de bord pour le fisc (conforme BMF allemand) {#fahrtenbuch-bmf}

Le carnet de bord génère un PDF reconnu par les administrations fiscales allemandes en tant que carnet de bord électronique selon les règles BMF. Le même flux est utile dans tout pays où il faut séparer kilométrage privé et professionnel.

**Étape par étape :**

1. **Classer chaque trajet** — un clic sur le badge de type bascule entre Privé → Professionnel → Trajet domicile-travail.
2. **Pour les trajets professionnels remplir les deux champs** (obligatoires BMF) :
   - **Partenaire commercial** — qui avez-vous visité ?
   - **Motif** — raison professionnelle.
3. **Choisir le mois** dans le filtre en haut.
4. **Cliquer sur « 📄 Finanzamt-PDF »** — produit un document A4 paysage avec numérotation continue, kilométrage au début et à la fin de chaque trajet, distances, origine → destination, partenaire et motif.

**Protection anti-manipulation** — après l'export les trajets inclus sont automatiquement verrouillés contre les modifications. Les trajets verrouillés affichent une icône 🔒. Les corrections effectuées avant l'export sont enregistrées dans un **historique des modifications** par trajet.

**Saisie manuelle** — si un trajet manque, utilisez **« + Manuell »** pour le saisir entièrement. Obligatoire : heure de début et de fin. Les entrées manuelles portent un badge ✍.

**Fusionner des trajets consécutifs** — quand la télémétrie a divisé un trajet en deux (bref arrêt, coupure GPS), cliquez sur **« Mit nächster zusammenführen »** sur le premier trajet.

## 🗓️ Heatmap d'activité {#trips-heatmap}

Au-dessus de l'aperçu mensuel dans le carnet de bord vous trouverez une **heatmap calendaire de tous les trajets** :

- **Filtre du haut** : choisir la granularité — `Année`, `Mois`, `Semaine` ou `Tout`. Pour `Année/Mois/Semaine` un second sélecteur permet de choisir la période exacte.
- **Luminosité** par jour selon les kilomètres parcourus ; cellule sombre = aucun trajet, vert clair = beaucoup.
- **Survol** d'un jour : info-bulle avec date + nombre de trajets + kilomètres totaux.
- **Clic** sur un jour non vide : ouvre la liste des trajets filtrée sur cette date — utile pour répondre rapidement à « qu'ai-je fait ce jour-là ? ».
- Le pied de page montre la légende et le total cumulé du filtre actif.

Source de données : les mêmes trajets que le carnet de bord BMF — la heatmap est une pure visualisation, elle n'écrit rien.

## 📱 Utilisation sur smartphone et dans la Tesla (installation PWA) {#mobile-tesla-install}

Tesla Carview est une **PWA** (Progressive Web App) — installable comme une application native, sans App Store ni Google Play. Fonctionne sur iPhone, iPad, Android, dans le navigateur du véhicule Tesla et sur tout Chromium de bureau.

**Smartphone Android / Tesla / Chrome / Edge :**
1. Ouvrez l'app dans le navigateur, connectez-vous.
2. Une bannière « Carview als App installieren » apparaît en bas → tapotez **Installieren**.
3. L'icône apparaît sur l'écran d'accueil. Un tapotement ouvre l'app en plein écran, sans barre de navigateur.

**iPhone / iPad (Safari) :**
1. Ouvrez l'app dans Safari, connectez-vous.
2. Bouton **Partager** → **« Sur l'écran d'accueil »** → Ajouter.
3. L'icône apparaît sur l'écran d'accueil comme une app native.

**Dans l'écran Tesla :**
- Dans le véhicule : ouvrez le navigateur, entrez votre URL Carview.
- L'app s'adapte à la taille de l'écran Tesla. En affichage étroit, le carnet de bord bascule automatiquement en vue cartes avec de grandes zones tactiles.
- Astuce : le bouton **« ◫ Karten »** force la vue compacte même sur les grands écrans.

**Recommandation :** Ajoutez Carview en favori dans le navigateur Tesla — Tesla affiche les favoris directement dans l'accès rapide du navigateur. Pour saisir des notes de voyage lors d'une courte pause, c'est plus rapide que de retaper l'URL à chaque fois.

### 🚗 Ouvrir le journal de bord directement dans le navigateur Tesla {#tesla-direct}

Le bouton **« 🚗 Ouvrir dans Tesla »** en haut du journal de bord simplifie l'accès depuis le navigateur Tesla :

1. Ouvrez **Analyses → Journal de bord** dans Carview sur votre téléphone ou ordinateur.
2. Cliquez sur **« 🚗 Ouvrir dans Tesla »**.
3. Une fenêtre apparaît avec un **QR code** et une **URL directe** (ex. `https://votre-app.example.com/pair/abc123…`).
4. Dans la Tesla, ouvrez le navigateur et entrez l'URL — ou scannez le QR avec une caméra si disponible.
5. Le navigateur Tesla ouvre une page d'authentification Passkey. Appuyez sur **« Confirmer avec Passkey »** et authentifiez-vous.
6. Après authentification réussie, le navigateur Tesla est connecté et navigue directement vers le journal de bord.

La session est valide **5 minutes**. Le cookie refresh-token maintient la session **7 jours**. L'URL du journal est mémorisable dans les favoris rapides du navigateur Tesla.

**Fonctionne pour tout véhicule** — le journal et la saisie manuelle ne nécessitent pas de connexion à l'API Tesla. Les conducteurs d'autres marques peuvent utiliser la saisie manuelle et exporter un PDF conforme.

### 📲 Navigation iPhone : barre d'onglets

Sur iPhone et autres smartphones, Tesla Carview affiche une **barre d'onglets style iOS natif** en bas de l'écran :

- **4 onglets rapides** — Tableau de bord, Trajets, Recharge, Commandes toujours accessibles
- **Bouton « Plus »** → ouvre un volet inférieur avec toutes les autres sections (Carnet, Batterie, Grok, Admin …)
- **Dynamic Island / Home Indicator** correctement pris en compte
- L'onglet actif est marqué d'un petit indicateur

Dans le design **Nevs-Edition**, la barre d'onglets adopte la teinte pétrole.

## 🗺️ Planificateur de route {#route-planner}

Le planificateur calcule des itinéraires de conduite et affiche les bornes de recharge rapide en chemin.

**Calculer un itinéraire** — Entrez les adresses de départ et d'arrivée. Via « + Arrêt intermédiaire », vous pouvez ajouter autant d'étapes que vous le souhaitez et les réorganiser par glisser-déposer.

**Options d'évitement** — Trois boutons bascule près du champ destination :
- **Autoroutes** — l'itinéraire emprunte les routes nationales et départementales
- **Voies à péage** — les sections à péage sont contournées
- **Ferries** — aucune traversée en ferry dans l'itinéraire

Les options sont sauvegardées dans le navigateur. Le routage utilise Valhalla (openstreetmap.de) ; en cas d'indisponibilité, repli automatique sur OSRM avec notification toast.

**Bornes de recharge** — Superchargeurs et CCS le long du trajet. Nécessite une clé API OpenChargeMap gratuite dans Admin → System → Clés API externes. La recherche utilise correctement le rayon sélectionné (5/10/25/50 km), affiche les noms et adresses des stations, prend en charge le filtre DC uniquement et indique les types de connecteurs, le nombre de points de charge et la compatibilité Tesla.

**Trafic en temps réel** — Avec une clé HERE Maps configurée, le trafic actuel est intégré à l'estimation du temps de trajet.

**Planification de la recharge** — En activant la planification SoC (entrez le niveau de batterie), le planificateur calcule des arrêts de recharge optimaux avec estimation du temps et vérifie si l'autonomie est suffisante pour chaque tronçon.

## 🟢 État du système (admin) {#system-health}

Sous **System**, les administrateurs voient une carte en feux tricolores avec huit contrôles :

- **Token OAuth Tesla** — connecté ? quand expire-t-il ?
- **Virtual Key** — créée ? (requise pour les commandes signées)
- **Fleet Telemetry** — quand est arrivé le dernier point ?
- **Poller Tesla** — quand l'app a-t-elle interrogé le véhicule pour la dernière fois ?
- **DB du locataire** — taille de la base
- **Maintenance nocturne** — horodatage du dernier passage automatique
- **OpenChargeMap** — sonde HTTP live (grisé si pas de clé configurée)
- **HERE Maps** — sonde HTTP live (grisé si pas de clé configurée)

Vert (tout va bien), jaune (attention, ex. token bientôt expiré) ou rouge (action requise). Les services optionnels (OCM, HERE) ne comptent comme erreur que si une clé est configurée mais l'endpoint ne répond pas.

**Monitoring & auto-réparation** — En dessous la carte Monitoring avec deux paramètres :
- **Auto-réparation activée/désactivée** — Un cron automatique vérifie toutes les 15 minutes si tous les containers tournent et si `/api/health` répond. Les services défaillants sont automatiquement redémarrés.
- **E-mail d'alerte** — Si une adresse e-mail est configurée, une notification est envoyée après chaque redémarrage avec horodatage et nombre de services redémarrés.

Le journal heal et le journal security-check (50 dernières entrées) sont directement consultables dans cette carte et actualisables à tout moment via « Actualiser les logs ».

## 💬 Grok Chat {#grok}

**Grok Chat** intègre la conversation xAI directement dans Tesla Carview. Posez des questions en langage naturel sur vos trajets, données de recharge et statistiques du véhicule.

**Contexte** : Quand le bouton données véhicule (icône tachymètre) est actif, le chat envoie votre dernier trajet, dernière recharge et kilométrage comme contexte. Désactivez-le pour des questions générales.

**Nouveau chat** : Cliquez sur **+ Nouveau chat** dans la barre latérale. Tapez votre question et appuyez sur Entrée ou Envoyer. Le texte s'affiche en streaming.

**Navigateur Tesla** : Sur petit écran (< 768 px), la barre latérale se replie en haut. Entrée vocale via Web Speech API (navigateur Tesla V12+).

**Budget journalier** : Par défaut **100 centimes/jour**. L'utilisation est affichée en haut de la barre latérale.

**Confidentialité** : Les requêtes passent par le backend — jamais directement depuis votre navigateur vers xAI.

## 🌍 Comparaison CO₂ {#co2}

La **comparaison CO₂** dans le Rapport Énergie montre l'impact environnemental de votre conduite :

- **CO₂ Tesla** — Calculé à partir de votre consommation et du mix électrique allemand (0,38 kg CO₂/kWh). La valeur réelle est inférieure si vous chargez avec du solaire ou de l'énergie verte.
- **Équivalent diesel** — Quantité de CO₂ qu'une voiture similaire à 7 l/100 km (2,65 kg CO₂/l) aurait produite.
- **Tonnes économisées** — La différence entre Tesla et diesel.

Les valeurs sont calculées pour la période sélectionnée (4/8/12 semaines) et affichées par semaine dans le graphique de tendance sous forme de barre verte.

## 🌡️ Consommation météo {#weather-consumption}

La **corrélation consommation-météo** montre comment la température extérieure influence votre consommation. Le diagramme à barres regroupe tous les trajets en 6 plages de température (< −10 °C à > 30 °C). Les couleurs passent de vert (efficace) à rouge (inefficace).

## ❄️ Statistiques climatiques {#climate-stats}

La page **Statistiques climatiques** (`/climate`) affiche l'utilisation quotidienne du système climatique :

- **Climatisation** — Heures par période
- **Sièges chauffants conducteur/passager** — Jours d'utilisation
- **Préconditionements** — Nombre de démarrages via app ou planning
- **Jour le plus froid/chaud** — Températures extrêmes

Les données sont collectées **automatiquement à chaque synchronisation**. Dans le graphique quotidien : 🪑 = siège chauffant actif, 🔄 = préconditionnement.

## 📦 Suivi des mises à jour firmware {#firmware}

Le **suivi firmware** dans Admin → Système affiche toutes les versions logicielles détectées sur votre véhicule : version actuelle, historique (date, durée d'installation) et nombre total de mises à jour.

## 🌍 Benchmark Communauté {#community-benchmark}

Le **Benchmark Communauté** (dans le Rapport Énergie) permet une comparaison anonyme de consommation avec d'autres conducteurs Tesla du même modèle.

**Principes de confidentialité :** valeurs agrégées uniquement (kWh/100 km), instance stockée comme hash SHA-256, minimum 3 participants requis (k-anonymat), révocable à tout moment.

**Participer :** activer le toggle, puis cliquer sur « Contribuer les données ». Une fois ≥ 3 participants pour votre modèle, vous voyez la moyenne, P25, P75 et votre position.

## 🎨 Design & Thèmes {#design-themes}

Tesla Carview propose **5 styles de design** et **6 couleurs d'accentuation** — tout enregistré localement, sans rechargement serveur.

### Styles de design

| Design | Caractère |
|---|---|
| ✨ **Premium Glass** | Doux, élégant, glassmorphisme avec backdrop blur |
| ⚡ **Cyberpunk-Tesla** | Lueur néon, lignes nettes, monospace marqué |
| ◻ **Minimal Swiss** | Beaucoup d'espace, épuré, chiffres au premier plan |
| ▰ **Sport / Performance** | Anguleux, audacieux, esthétique tachymètre |
| ◈ **Nevs-Edition** | Tech-éditorial, accent pétrole, typographie Bricolage Grotesque |

**Nevs-Edition** est le seul style avec sa propre suite typographique : *Bricolage Grotesque* pour les titres, *Manrope* comme police de corps et *JetBrains Mono* pour les labels. Il inclut également une fine **barre de statut** au-dessus de la NavBar affichant les données du véhicule en temps réel (niveau de batterie, rapport, odomètre, dernier signal de sync).

### Couleurs d'accentuation

6 couleurs : Rouge Tesla, Bleu électrique, Vert énergie, Violet, Coucher de soleil, Bleu glacé — combinables librement avec n'importe quel style.

Changer : **Paramètres → Design & Couleurs**.

## 🔧 Dépannage {#troubleshooting}

**Le véhicule ne renvoie pas de données GPS**
Les Tesla récentes (VIN XP7, par ex. Model Y Juniper) ne fournissent pas de `drive_state` via l'API REST. Le suivi GPS passe par Fleet Telemetry. Vérifiez que tesla-http-proxy fonctionne et que la Virtual Key est enregistrée.

**La connexion ne fonctionne pas après la mise à jour**
Lors d'une mise à jour vers la v2.0 (multi-locataire), un identifiant de locataire est requis à la connexion. L'identifiant de la base migrée est « default ». Saisissez-le dans le champ de connexion ou cliquez sur « Choisir le locataire ».

**La connexion Tesla échoue (401)**
Le token OAuth Tesla a expiré. Allez dans Paramètres → Connexion Tesla et reconnectez votre compte Tesla. Vérifiez que `TESLA_CLIENT_ID` et `TESLA_CLIENT_SECRET` sont corrects dans `.env`.

**Les commandes véhicule échouent**
Vérifiez : 1) tesla-http-proxy fonctionne (`systemctl status tesla-http-proxy`) 2) La Virtual Key est enregistrée sur le véhicule (Paramètres → Connexion véhicule) 3) Le véhicule est en ligne (pas en veille).

**Pas de données de télémétrie / GPS manquant**
Fleet Telemetry exige deux étapes : (1) enregistrer l'application chez Tesla (Paramètres → « 🔑 Enregistrer l'application »), (2) activer la télémétrie (Paramètres → « 📡 Activer la télémétrie »). Si l'étape 2 échoue avec un HTTP 404, demandez l'accès `fleet_telemetry_config` au Tesla Developer Support — un modèle est fourni dans le manuel sous « Étape 6 ». De plus, `vehicle_location` doit être activé dans les scopes de l'application sur `developer.tesla.com`.

**Le backend ne démarre pas**
Vérifiez les logs : `docker logs tesla-carview-backend`. Causes fréquentes : variables `.env` manquantes (`JWT_SECRET`, `TESLA_CLIENT_ID`), erreurs de migration de base.

## ❤️ Si l'application a de la valeur pour vous {#donations}

Tesla Carview est gratuite et sans publicité **pour un usage privé en auto-hébergement** (licence : PolyForm Noncommercial 1.0.0 — la revente commerciale et l'hébergement SaaS pour des tiers ne sont pas autorisés). Si vous souhaitez donner en retour, ces organisations apprécieront votre soutien.

- **[Aktion Deutschland Hilft](https://www.aktion-deutschland-hilft.de/de/spenden/)** — Alliance d'organisations humanitaires pour une aide d'urgence rapide et efficace dans le monde entier.
- **[Lebenshilfe Rems-Murr](https://www.lebenshilfe-rems-murr.de/)** — Soutien, accompagnement et inclusion pour les personnes en situation de handicap dans le district de Rems-Murr.
- **[Radio 7 Drachenkinder](https://www.radio7.de/aktionen/drachenkinder)** — Aide aux enfants gravement malades de la région — finance thérapies, sorties et souhaits.

100 % de votre don va directement à l'organisation. Nous ne voyons ni le montant ni vos données.
