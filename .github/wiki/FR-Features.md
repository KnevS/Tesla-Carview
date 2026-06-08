# Aperçu des fonctionnalités

🌐 **Language / Sprache**

| | |
|---|---|
| 🇬🇧 **[English](Features)** | English version |
| 🇩🇪 **[Deutsch](DE-Features)** | Deutsche Version |
| 🇫🇷 **[Français](FR-Features)** | Vous êtes ici |
| 🇪🇸 **[Español](ES-Features)** | Versión en español |
| 🇹🇷 **[Türkçe](TR-Features)** | Türkçe sürüm |
| 🇬🇷 **[Ελληνικά](EL-Features)** | Ελληνική έκδοση |

---

Tesla Carview couvre l'ensemble du cycle de vie de votre Tesla — du suivi de chaque trajet au contrôle du véhicule, en passant par la planification d'itinéraires et la gestion des coûts de recharge. Tout fonctionne sur votre propre serveur.

---

## Que propose Tesla Carview ?

| Module | Résumé |
|---|---|
| 📊 Tableau de bord | Statut en direct, statistiques, widget tarifaire, santé système |
| 🚗 Journal de bord | Trajets enregistrés automatiquement, export PDF conforme |
| ⚡ Recharge | Sessions, lieux, sync Monta, factures de coûts |
| 🔋 Batterie | Santé, dégradation, historique de portée |
| 🗺️ Planificateur | Routage OSRM, bornes de charge, envoi au Tesla |
| 🎮 Contrôle | Climatisation, serrures, recharge, OTA, recharge programmée |
| 📝 Carnet d'entretien | Historique maintenance, intervalles, rappels push |
| 💬 Grok Chat | Assistant IA xAI avec contexte véhicule |
| 📤 Export | CSV, JSON, factures PDF, sauvegarde complète |
| 🔐 Sécurité | Passkeys, MFA (TOTP), QR-SSO pour le navigateur Tesla |
| 🌍 Multilingue | DE · EN · FR · ES · TR · EL |
| 📱 PWA | Installable sur l'écran d'accueil, shell hors ligne |

---

## 📊 Tableau de bord

Le tableau de bord est votre vue centrale :
- **Statut en direct** — niveau de batterie, autonomie, localisation, état de recharge
- **Derniers trajets** — les 5 derniers avec distance et consommation
- **Statistiques mensuelles** — kilomètres, énergie, coûts de recharge
- **Widget tarifaire dynamique** — prix actuel (aWATTar DE/AT, Tibber) avec courbe 24 h et fenêtre de charge automatique
- **Intervalles de maintenance** — rappels TÜV, huile, liquide de frein, etc.
- **Santé système** — état de l'API Tesla, Fleet Telemetry, taille de la base de données

Le tableau de bord est entièrement personnalisable via **Paramètres → Lancer l'assistant**.

---

## 🚗 Trajets (Journal de bord)

Chaque trajet est enregistré automatiquement :
- Lieu de départ et d'arrivée (adresse + coordonnées GPS)
- Distance, durée, vitesse moyenne
- Consommation d'énergie (kWh et kWh/100 km)
- Niveau de batterie au départ/arrivée
- Classification du trajet (privé / domicile-travail / professionnel)

### Journal de bord conforme BMF
- Champs partenaire commercial et objet du trajet
- Numérotation séquentielle
- Fonction de verrouillage pour finaliser
- **Export PDF** en A4 paysage avec tous les champs obligatoires
- Fusion et fractionnement de trajets
- Création manuelle de trajets oubliés

---

## ⚡ Recharge

Toutes les sessions de recharge sont journalisées :
- Lieu (correspondance GPS avec les bornes enregistrées)
- Énergie ajoutée (kWh) et coût estimé
- Vitesse et durée de recharge
- Indicateur de charge à domicile (🏠) via intégration Monta

### Lieux de recharge
Définissez vos bornes habituelles dans **Paramètres → Lieux de recharge**.

### Intégration Monta
Disponible pour **tous les véhicules** — à configurer par véhicule dans **Paramètres → Profil du véhicule → Recharge à domicile** :

- **Véhicules privés** : les sessions Monta apparaissent comme charges à domicile (badge 🏠, détection automatique via l'ID du point de charge).
- **Véhicules de fonction** : en plus, facturation complète — récapitulatif mensuel, feuille PDF de remboursement, modèle pour l'employeur.

### Facturation & facture PDF
Générez des factures PDF pour remboursement (**Facturation → Créer une facture**) — entièrement côté client. Les fonctions de facturation sont réservées aux **véhicules de fonction**.

---

### Validation OwnTracks (v3.11.0)
Si vous utilisez OwnTracks pour le GPS, trois lignes de défense protègent vos données :
- **Validation Bluetooth** — un raccourci iOS signale « dans la Tesla » / « sortie », les trajets hors Tesla sont ignorés
- **Verrouillage de trajet** — un seul device actif par Tesla, évite les doublons
- **Pause manuelle** — frein d'urgence pour vacances en voiture de location, etc.

Configuration pas à pas dans le manuel sous `{#owntracks-validation}`.

---

## 🔋 Batterie — Tableau santé (Companion)

Six sections sur `/battery`, **entièrement local et purement statistique** (pas d'IA, pas de cloud sauf une seule requête météo pour le préconditionnement) :

**Phase 1 (à partir de v3.6.0) :**
- Historique d'autonomie (rated_range max glissant)
- Dégradation (première vs. dernière mesure, codée couleur)
- Courbe de charge (agrégat par plage SOC + nuage kW vs SOC initial)
- Efficacité vs. température extérieure (kWh/100 km par tranches de 5 °C)
- Décharge fantôme (perte de SOC/h à l'arrêt, filtrée autour des trajets/charges)
- Anomalies (live : sauts SOC/autonomie, efficacité aberrante)

**Phase 2 (à partir de v3.7.0) :**
- **Alertes Companion** — anomalies persistantes avec notification push unique et actions « Marquer comme vu / Rejeter »
- **Suggestion de préconditionnement** — push si température prévue <5 °C ou >30 °C à votre heure habituelle de départ, apprise des 30 derniers jours

Sources : `battery_snapshots`, `trips`, `charging_sessions`, plus un appel Open-Meteo unique pour le préconditionnement. Persistance dans `battery_anomalies` et `precondition_suggestions` avec contraintes UNIQUE (idempotent). Le moteur Companion tourne chaque nuit + toutes les 6 heures.

---

## 🗺️ Planificateur d'itinéraire

Planifiez vos trajets à l'avance et envoyez-les directement à la navigation Tesla :
- **Lieu de départ** — depuis le GPS du véhicule, du navigateur ou saisie manuelle
- **Recherche de destination** — géocodage Nominatim via proxy backend
- **Jusqu'à 5 étapes** intermédiaires
- **Routage OSRM** — moteur open-source, aucun compte requis
- **SoC estimé à l'arrivée** — basé sur votre consommation réelle
- **Overlay bornes** — stations de charge rapide (CCS, CHAdeMO, Tesla) via OpenChargeMap
- **Envoyer au Tesla** — un tap envoie la destination à la navigation du véhicule
- **Sauvegarder les itinéraires** — routes favorites pour un accès rapide
- **Repli ABRP** — lien optionnel vers A Better Route Planner

---

## 🎮 Contrôle du véhicule

- 🌡️ **Climatisation** — démarrer/arrêter, température, sièges chauffants, volant chauffant, modes Camp/Dog/Keep
- 🔓 **Serrures** — verrouiller/déverrouiller
- 💡 **Éclairage** — appels de phares, klaxon
- 🚪 **Coffre/frunk** — ouvrir
- 🪟 **Vitres** — ouvrir/fermer
- 🔌 **Recharge** — trappe, ampérage, démarrer/arrêter
- ⏰ **Recharge programmée** — fenêtre heures creuses
- 🔄 **Mises à jour OTA** — déclencher et surveiller
- 🎵 **Boombox** — sons boombox (si pris en charge)

---

## 📝 Carnet d'entretien

Documentez tous les événements de maintenance :
- Date, catégorie, coût, kilométrage, nom de l'atelier

### Intervalles et rappels
Configurez des intervalles récurrents (**Paramètres → Intervalles de maintenance**). Des notifications push sont envoyées 30 jours et 1 000 km avant chaque échéance.

---

## 💬 Grok Chat (Assistant IA)

Posez des questions sur vos données Tesla en langage naturel, alimenté par xAI Grok :
- Contexte de vos trajets, sessions de recharge et données véhicule
- Réponses en streaming mot par mot
- Historique des conversations sauvegardé
- Budget journalier configurable
- Requêtes via backend uniquement — jamais directement vers xAI

> Nécessite une clé API xAI (`XAI_API_KEY` dans `.env`). Obtenez-en une sur [console.x.ai](https://console.x.ai).

---

## 🔐 Sécurité & Authentification

### Passkeys (WebAuthn)
Connectez-vous avec Face ID, Touch ID ou une clé matérielle.

### MFA (TOTP)
Authentification à deux facteurs avec n'importe quelle application d'authentification.

### QR-SSO pour le navigateur Tesla
1. Le navigateur Tesla affiche un QR code (5 min de validité)
2. Scannez avec votre téléphone
3. Authentifiez-vous avec le passkey/Face ID de votre téléphone
4. La session Tesla est déverrouillée automatiquement

---

## 🧙 Assistant de configuration

Relançable depuis **Paramètres → Lancer l'assistant**.

**Étapes admin (première installation) :** langue → Tesla OAuth → véhicules → Virtual Key → Fleet Telemetry → prix électricité → mentions légales → APIs externes → monitoring (SMTP + Anthropic) → design → couleur → unités → tableau de bord → navigation → notifications → résumé

Les utilisateurs non-admin voient uniquement les étapes design, unités, tableau de bord, navigation, notifications et résumé.

---

## 🌡️ Tarif dynamique (aWATTar / Tibber)

- Prix actuel et courbe 24 h sur le tableau de bord
- **Fenêtre de charge automatique** — une pression programme la recharge sur la fenêtre de 4 h la moins chère

---

## 📱 PWA

Installez Tesla Carview sur votre écran d'accueil :
- **Android/Chrome bureau :** icône d'installation dans la barre d'adresse
- **iOS Safari :** Partager → « Sur l'écran d'accueil »
- **Navigateur Tesla :** Menu → « Sur l'écran d'accueil »

---

## 📤 Export & Sauvegarde

- Trajets, sessions de recharge, carnet d'entretien — CSV ou JSON
- **Sauvegarde complète** — JSON restaurable via **Admin → Gestion des données**

---

## 📅 ICS Calendar Export

Planned routes can be exported as `.ics` files and imported into any calendar application. `CLASS:PRIVATE` is set automatically. Available in the Route Planner after a route has been calculated.

---

## 🛞 Tire Pressure (TireMap)

Top-down car silhouette with color-coded tires: green (OK), yellow (outside recommendation), red (critical). Tooltip and legend included.

---

## ♻️ Recuperation Statistics

Trip detail: recovered kWh, recuperation share (%), net consumption after recuperation. Only shown when data is available.

---

## 🔲 Control Layout Toggle

Switch between tile layout and compact list view in Vehicle Control. Preference saved in `localStorage`.


## 💬 Pourquoi Telegram et pas WhatsApp / Signal ?

TeslaView utilise **Telegram + Web Push** comme canaux de notifications — gratuits, conformes aux ToS, sans compte tiers.

**Non implémenté et pourquoi :**
- **WhatsApp** : seulement via Meta Cloud API (compte Business + numéro pro vérifié + approbation de templates). Usage privé non prévu ; les bibliothèques non officielles sont une violation des ToS avec risque de bannissement.
- **Signal** : pas d'API officielle pour bots ; les forks auto-hébergés (signald) sont fragiles.
- **Threema** : API officielle existe, mais payante (~50 €/an).

Pour les utilisateurs déterminés à utiliser WhatsApp : *whatsapp-web.js* peut être ajouté soi-même. Nous ne le recommandons pas.
