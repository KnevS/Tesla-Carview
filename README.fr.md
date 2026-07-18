# ⚡ Tesla Carview

[![Version](https://img.shields.io/badge/version-v3.17.0-E31937?style=flat-square)](CHANGELOG.md)
[![License](https://img.shields.io/badge/License-PolyForm_Noncommercial-blue?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Raspberry_Pi_%7C_Linux_%7C_VPS-lightgrey?style=flat-square)](docs/02-deployment.en.md)

> 🇩🇪 [Deutsch](README.md) · 🇬🇧 [English](README.en.md) · 🇪🇸 [Español](README.es.md) · 🇹🇷 [Türkçe](README.tr.md) · 🇬🇷 [Ελληνικά](README.el.md) · 🇺🇦 [Українська](README.uk.md)
>
> 📋 [Changelog](CHANGELOG.md) · 📚 [Documentation](docs/README.en.md) (en anglais)
>
> 🤖 *Les traductions FR/ES/TR/EL/UK sont assistées par IA à partir des versions DE/EN. La documentation technique détaillée dans `docs/` n'est pour l'instant disponible qu'en anglais (`docs/*.en.md`). Corrections bienvenues via GitHub.*

> **© 2026 Sven Krische** · Sous licence [PolyForm Noncommercial 1.0.0](LICENSE) · [AUTHORS](AUTHORS) · [NOTICE](NOTICE.md)
> Conception, architecture et implémentation originales par Sven Krische ([@KnevS](https://github.com/KnevS)).

**Car Usability Management** — auto-hébergé, sans cloud, sans tiers.
Des traces GPS et du carnet de bord à la planification d'itinéraires avec horaires de recharge et historique de maintenance :
toutes les données du véhicule restent sur votre propre serveur.

Fonctionne sur : **serveurs Linux** (x86_64), **Raspberry Pi 3/4/5** (ARM64/ARMv7), développement local.

<!-- Operator-Hinweis im Footer / Footer note for operators:
     Wer Tesla Carview selbst hostet, kann die eigenen Kontaktdaten
     ueber frontend/.env (siehe frontend/.env.example) einsetzen.
     Self-hosters can configure their own footer contact via the .env. -->


---

## ⚠ Important — État de l'API Tesla en 2026

Tesla a fermé l'**Owner API non officielle** pour les endpoints véhicule entre mai et juin 2026. Le contournement communautaire jusqu'alors courant (connexion via un refresh token de compte Tesla, appel de `/api/1/vehicles/{id}/vehicle_data`) renvoie désormais **HTTP 401 « invalid bearer token »** — le contournement est mort et aucun correctif ne peut le ressusciter.

Pour les données véhicule en direct (batterie, climatisation, TPMS, flux de télémétrie), il n'existe **qu'une seule voie officielle** : la **Fleet API** Tesla avec validation de l'application via [developer.tesla.com](https://developer.tesla.com/). Le délai d'attente actuel est de **plusieurs semaines à plusieurs mois**.

**💡 Quota gratuit Tesla — un usage privé typique coûte 0 €/mois :** Tesla offre **10 USD de crédit gratuit par compte et par mois** — généralement suffisant pour couvrir le flux de télémétrie d'un véhicule et les commandes quotidiennes. Au-delà, facturation à l'usage (150 000 signaux stream = 1 USD, 1 000 commandes = 1 USD, 50 wake-ups = 1 USD). TeslaView est entièrement prêt — dès que votre application est approuvée, toutes les fonctions sont actives immédiatement. L'attente est uniquement du côté de Tesla ; TeslaView lui-même reste toujours gratuit.

**Ce que TeslaView fournit toujours sans validation Fleet API :**

| Connexion | Source de données | Ce que vous obtenez | Mise en place |
|---|---|---|---|
| **OwnTracks** (recommandé, immédiat) | Smartphone du conducteur | Trajets, trace GPS, distance, vitesse | Étape 5 de l'assistant, ~5 min |
| **Tesla Fleet OAuth** | Cloud Tesla | Batterie, climatisation, TPMS, le tout via polling | Validation Fleet API requise |
| **Tesla Fleet Telemetry** | Tesla → push WebSocket | Flux en direct | Fleet API + Virtual Key + **enregistrement de l'app en 1 clic dans l'assistant** (v3.23.5) |
| **Tesla Owner API** | Cloud Tesla | ❌ **bloquée en 2026** | — |
| **Intégration Monta** | Cloud Monta | Coût de recharge à domicile pour la facturation de véhicules de fonction | Clé API dans l'assistant |

**Concrètement pour les nouvelles installations sans validation Fleet :** activez OwnTracks — vous obtenez un carnet de bord GPS conforme à la législation, une heatmap des trajets, un suivi des distances, une attribution automatique du conducteur. Les valeurs manquantes de batterie/climatisation ne sont pas strictement nécessaires pour un carnet de bord professionnel classique.

---

## Fonctionnalités

| Domaine | Description |
|---|---|
| **Tableau de bord** | Statistiques globales, dernier trajet, graphique mensuel des distances |
| **Trajets** | Trace GPS sur carte, consommation, vitesse, SoC dans le temps |
| **Données de trajet** (v3.37.0) | Analyse tabulaire par trajet : durée, distance, consommation, vitesse et puissance en min/max/moy — triable, avec cartes de synthèse et export CSV |
| **Carte de chaleur** (v3.41.0) | Carte de chaleur géographique avec quatre couches activables : trajets (densité départ/arrivée), sessions de charge, points de charge définis et itinéraires (en lignes) — plage temporelle réglable, couleurs de couche personnalisables, sans plugin cartographique externe |
| **Analyse par zones** (v3.39.0) | Analyser le détail du trajet par zones : plages de vitesse, zones propres (géorepérages/lieux de charge) ou section libre — valeurs en tableau + mise en évidence sur la carte, repères (Vmax, puissance max, régénération, arrêts) |
| **Planificateur de charge** (v3.42.0) | Créneaux de charge les moins chers avant le départ à partir du tarif dynamique (aWattar/Tibber) : à partir de la charge cible, de la capacité de la batterie, de la puissance de charge et de l'heure de départ, il choisit les heures les moins chères — avec coût, durée de charge et économie par rapport à une charge immédiate. Simple analyse de la courbe de prix, sans accès au véhicule |
| **Répartition voiture de fonction** (v3.43.0) | Répartit la charge à domicile entre usage professionnel/privé et l'exporte en PDF de remboursement — forfait (§ 3 Nr. 50 EStG allemand, 30/70 €) ou quote-part km (part professionnelle × coût de charge à domicile). Voitures de fonction uniquement, en allemand |
| **Charge sur surplus solaire** (v3.44.0) | Charger uniquement avec le surplus solaire : lit le surplus depuis Home Assistant et en déduit le courant de charge recommandé — « Appliquer » règle le courant et démarre/arrête (Fleet API). Entièrement local, sans cloud |
| **Fiscalité voiture de fonction** (v3.45.0) | Règle du 1 % vs. méthode du carnet de bord pour l'avantage en nature — avec taux VE dépendant de la date (0,25 %/0,5 %/1 %, plafond du prix catalogue selon la date d'acquisition). Calcul indicatif, voitures de fonction uniquement, en allemand |
| **Certificat SoH** (v3.46.0) | Certificat de santé de la batterie en PDF pour restitution de leasing/revente — autonomie à 100 %, taux de dégradation, prévision jusqu'à 80 %, SoH en % en option. Estimation statistique, sans garantie |
| **Carnet de bord infalsifiable** (v3.47.0) | Chaque modification d'un trajet est inscrite dans une chaîne de hachage chaînée et signée HMAC — l'historique des modifications ne peut être altéré discrètement (GoBD). Vérification d'intégrité + mention dans le PDF fiscal |
| **Recharge** | Sessions de recharge avec coût, association de l'emplacement de recharge basée sur GPS, sessions gratuites marquables |
| **Emplacements de recharge** | Points définissables avec rayon GPS, prix/kWh, détection automatique |
| **Battery / Battery-Health Companion** | Phase 1 (v3.6.0) : historique d'autonomie, dégradation, courbe de recharge, efficacité selon la température extérieure, phantom drain, anomalies — uniquement des statistiques issues de vos propres données. Phase 2 (v3.7.0) : alertes persistantes d'anomalies via push + suggestions de préconditionnement en cas de gel/forte chaleur (Open-Meteo) |
| **App hub** (v3.9.0) | Applications web sélectionnées pour le navigateur Tesla : ARD Audiothek, Deutschlandfunk Live, GoingElectric, OpenChargeMap, Telegram Web, Wikipedia, ABRP — gratuites, sans compte obligatoire, **délibérément sans doublons** des applications natives Tesla. Liste blanche admin par tenant. Les admins ajoutent leurs propres web apps (v3.40.0). |
| **Nearby** (v3.13.0) | POI autour de vous (café, toilettes, aire de jeux, **geocaches**, supermarché, points de vue…) via OpenStreetMap Overpass. Sélecteur de source : position actuelle du véhicule / session de recharge active / dernier trajet. Cache local de 24 heures |
| **Spots de recharge avec limite automatique** (v3.12.0) | Gérez les bornes à la maison/au travail/fréquentes : nom, GPS, rayon, tarif, limite de charge souhaitée. À l'arrivée → commande Tesla `set_charge_limit` (Fleet API) ou rappel push en repli |
| **Validation OwnTracks** (v3.11.0) | Trois lignes de défense contre les enregistrements parasites : validation Bluetooth via raccourci iOS, verrou de trajet par véhicule, bascule de pause manuelle — empêche les trajets d'autopartage ou les enregistrements en double avec 2 appareils ou plus de polluer le carnet de bord |
| **Adresse avant les coordonnées** (v3.10.0) | Toutes les listes et vues de détail privilégient l'adresse ; lat/lon uniquement en repli (4 décimales, ~11 m) |
| **Géocodage automatique** (v3.8.0) | Les trajets/sessions de recharge avec GPS mais sans adresse sont automatiquement résolus via Nominatim/OSM — hook en direct + backfill nocturne + déclencheur admin, mis en cache localement pendant 24 heures
| **Tech** | Télémétrie en direct : TPMS, flux de puissance, climatisation, état de charge |
| **Commandes** | Commandes véhicule : climatisation, climate-keeper (chien/camp), chauffages des sièges (5 sièges × 4 niveaux), chauffage du volant, portes, frunk/coffre, vitres, mode sentinelle, recharge incl. slider d'ampérage et trappe de recharge, planification de départ, boombox, mise à jour logicielle, navigation (Virtual Key requise) |
| **Planificateur d'itinéraire** | Planificateur d'itinéraire interactif avec arrêts de recharge tenant compte du SoC, incl. estimation du temps de recharge ; SoC de départ (en direct ou manuel), SoC cible et cible de recharge configurables ; météo (Open-Meteo), trafic (HERE Maps), radars (OpenStreetMap) le long de l'itinéraire ; vue carte avec proxy de tuiles |
| **Carnet de bord** | Fahrtenbuch électronique conforme BMF : classification, partenaire commercial, motif, colonnes de compteur, numérotation continue dans le PDF, verrouillage après export, saisie manuelle, fusion/scission de trajets |
| **Facturation** | Sessions de recharge à domicile et intégration Monta pour tous les véhicules ; relevé de coûts (PDF, modèle de remboursement) pour véhicules de fonction |
| **Carnet d'entretien** | Maintenance, réparations, pneus, contrôles techniques avec coût |
| **Export** | Export CSV/JSON/**PDF** pour trajets et recharges, sauvegarde complète ; carnet de bord PDF prêt à imprimer avec date, distance, énergie, SOC |
| **Intervalles d'entretien** | Tâches d'entretien récurrentes par véhicule (contrôle technique, pneus, liquide de frein, …) avec intervalles temporels et kilométriques + rappels push quotidiens |
| **Journal d'audit** | Visualiseur admin pour les événements de sécurité avec filtres et export CSV (compatible RGPD) |
| **Tarif dynamique** | Intégration aWattar (DE/AT) et Tibber : courbe de prix sur 24 h sur le tableau de bord, planification de recharge en un clic sur la fenêtre de 4 h la moins chère |
| **PDF de remboursement** | PDF signable pour le remboursement de la recharge à domicile (côté client, pas de cloud) |
| **Notifications** | Web Push + Telegram + **e-mail** en parallèle lors de fin de recharge, seuils SOC, geofence et rappels d'entretien — chaque canal configurable individuellement |
| **Bot Telegram** | Bot 1:1 complet avec boutons inline : `/status` (avec boutons lock/climatisation/sentinelle/recharge + confirmation déverrouillage), `/battery`, `/range`, `/location` (lien Maps), `/today`, `/trips`, `/classify` (étiqueter un trajet), `/service`, `/firmware`, `/clean` — plus push proactifs pour fin de recharge, alertes sentinelle, rappels d'entretien et nouvelles versions de firmware. Journal d'audit pour chaque action véhicule. Voir [« Pourquoi Telegram, pas WhatsApp / Signal ? »](#pourquoi-telegram-pas-whatsapp--signal) ci-dessous |
| **Manuel utilisateur** | Guide complet lisible directement dans l'application |
| **Design et thèmes** | 5 styles de design (Glass, Cyber, Minimal, Sport, **Nevs-Edition**) + 6 couleurs d'accent, le tout stocké localement ; Nevs-Edition avec sa propre typographie Bricolage Grotesque et barre de statut en direct |
| **Paramètres** | Toutes les sections sont repliables et réordonnables individuellement (glisser-déposer) |
| **Navigation** | Entrées de navigation triables et masquables individuellement |
| **Mobile / Tesla** | PWA installable pour iPhone/iPad (Safari), Android, le navigateur embarqué Tesla et desktop. Barre d'onglets inférieure de style iOS (4 onglets rapides + bottom sheet « Plus »). Vue carte compacte dans le carnet de bord sur écrans étroits. |
| **Bilan CO₂** | Page dédiée comparant le CO₂ économisé par rapport à un véhicule thermique équivalent (6,5 l/100 km), équivalents en arbres/an et allers-retours Francfort–Majorque, méthodologie transparente. Également hebdomadaire dans l'Energy Report. |
| **Rapport hebdomadaire** | Chaque lundi à 07:00 automatique : km, consommation, coût de recharge, tendance vs semaine précédente — par push, Telegram et e-mail |
| **Consommation selon météo** | Corrélation de consommation par tranche de température (< −10 °C à > 30 °C) dans l'Energy Report — montre comment le froid et la chaleur affectent l'autonomie |
| **Statistiques climatiques** | Utilisation quotidienne de la clim (heures), chauffage des sièges, nombre de préconditionnements, jour le plus froid/le plus chaud |
| **Suivi firmware** | Enregistre automatiquement chaque nouvelle version logicielle du véhicule avec historique et nombre de jours installés |
| **Community Benchmark** | Comparaison anonyme et opt-in de la consommation avec d'autres conducteurs du même modèle ; k-anonymat, hash SHA-256, conforme RGPD |
| **État du système** | Carte de feu tricolore (token Tesla, Virtual Key, Fleet Telemetry, poller, DB) — vert/jaune/rouge en un coup d'œil |
| **Auto-test opérationnel** (v3.32) | Auto-test admin sous **Système** : à la demande et automatiquement chaque semaine lors de la maintenance nocturne, il vérifie la sécurité et l'intégrité des sauvegardes — couverture MFA, clé de chiffrement, secrets critiques, activité du journal d'audit, intégrité SQLite, ainsi que la fraîcheur et l'intégrité de la dernière sauvegarde — sous forme de rapport tricolore. Pur diagnostic, sans IA |
| **Heatmap d'activité** | Heatmap calendaire de tous les trajets (Année/Mois/Semaine/Tout), un clic mène à la liste des trajets du jour |
| **Pseudonyme de tenant** | Confidentialité : la page de connexion affiche un pseudonyme aléatoire `adjectif-nom` à la place du vrai nom de tenant, régénérable par l'admin |
| **Fleet Telemetry first** | Streaming WebSocket comme source de données préférée (validation Tesla requise). Lorsqu'il est actif → le poller passe à un heartbeat 1×/h, économisant >95 % du budget API. Sinon polling API en repli |
| **Enregistrement Tesla en 1 clic** (v3.23.5) | L'assistant enregistre votre app chez Tesla lui-même (`partner_accounts`) — sans terminal, sans `curl`. Saisissez Client ID + Secret, confirmez le domaine, enregistrez. Le secret reste côté serveur, le domaine = `FRONTEND_URL` (infalsifiable). Prérequis pour Fleet Telemetry |
| **Chiffrement au repos** | AES-256-GCM pour les tokens OAuth Tesla, le secret TOTP MFA, la clé privée Virtual Key. Hash + comparaison à temps constant pour les tokens de réinitialisation de mot de passe. Clé générée automatiquement dans `data/.encryption-key` |
| **PWA auto-actualisée** | Le service worker détecte les déploiements et recharge automatiquement — pas besoin de `Ctrl+Shift+R`, y compris pour la PWA iOS |

---

## Aperçu

Captures d'écran en direct depuis l'instance de démonstration, actualisées chaque jour à 04:45 :

<table>
  <tr>
    <td><img src="https://www.teslaview.krische.com/shots/desktop/dashboard.png" alt="Dashboard" /></td>
    <td><img src="https://www.teslaview.krische.com/shots/desktop/trips.png" alt="Trips" /></td>
    <td><img src="https://www.teslaview.krische.com/shots/desktop/charging.png" alt="Charging" /></td>
  </tr>
  <tr>
    <td align="center"><em>Tableau de bord</em></td>
    <td align="center"><em>Trajets</em></td>
    <td align="center"><em>Recharge</em></td>
  </tr>
  <tr>
    <td><img src="https://www.teslaview.krische.com/shots/desktop/routes.png" alt="Route planner" /></td>
    <td><img src="https://www.teslaview.krische.com/shots/desktop/telemetry.png" alt="Telemetry" /></td>
    <td><img src="https://www.teslaview.krische.com/shots/desktop/settings.png" alt="Settings" /></td>
  </tr>
  <tr>
    <td align="center"><em>Planificateur d'itinéraire</em></td>
    <td align="center"><em>Télémétrie</em></td>
    <td align="center"><em>Paramètres</em></td>
  </tr>
</table>

📸 Démo en direct : **[demo.teslaview.krische.com](https://demo.teslaview.krische.com)** · [Vue mobile](https://www.teslaview.krische.com/shots/mobile/dashboard.png) · [Toutes les captures](https://www.teslaview.krische.com/#screens)

### Bot Telegram

Liez votre compte sous *Paramètres → Telegram* et utilisez le bot directement sur iPhone/Android :

<table>
  <tr>
    <td width="33%"><img src="https://www.teslaview.krische.com/shots/mobile/telegram-status.png" alt="/status with inline buttons" /></td>
    <td width="33%"><img src="https://www.teslaview.krische.com/shots/mobile/telegram-notification.png" alt="Push notification" /></td>
    <td width="33%"><img src="https://www.teslaview.krische.com/shots/mobile/telegram-classify.png" alt="Classify a trip" /></td>
  </tr>
  <tr>
    <td align="center"><em>/status avec boutons inline</em></td>
    <td align="center"><em>Notification push</em></td>
    <td align="center"><em>Classifier un trajet</em></td>
  </tr>
</table>

Commandes : `/status`, `/battery`, `/range`, `/location`, `/today`, `/trips`, `/classify`, `/service`, `/firmware`, `/clean`, `/help`, `/unlink`. Boutons inline sous `/status` pour verrouillage/déverrouillage (avec confirmation), climatisation, sentinelle, recharge. Notifications push pour fin de recharge, alertes sentinelle, rappels d'entretien et mises à jour logicielles — en parallèle avec Web Push.

[Voir tous les mockups Telegram ↗](https://www.teslaview.krische.com/#telegram)

#### Pourquoi Telegram, pas WhatsApp / Signal ?

On nous pose souvent la question — résumé court :

| Service | Auto-hébergeable ? | API bot privée ? | Utilisé ici |
|---|---|---|---|
| **Telegram** | API Bot entièrement ouverte, BotFather est gratuit, aucun risque pour le compte | ✅ Oui | ✅ **Oui, canal principal** |
| **WhatsApp** | Uniquement via Meta Cloud API (compte Business + numéro professionnel vérifié + validation de templates). L'usage privé avec votre propre numéro n'est **pas prévu**. Les bibliothèques non officielles (whatsapp-web.js, baileys) sont une **violation des CGU** et entraînent des bannissements de compte. | ❌ Pas pour les utilisateurs privés | ❌ **Non** — délibérément non implémenté |
| **Signal** | Pas de serveur bot officiel, pas d'API webhook. Les forks auto-hébergés (signald) sont fragiles et régulièrement bloqués par Signal. | ❌ Non | ❌ **Non** |
| **Threema** | API REST officielle pour entreprises — mais payante (~50 €/an pour un compte gateway) | ⚠ Oui, commercial | ❌ Non implémenté (payant) |
| **Web Push** (PWA) | Standard navigateur, fonctionne directement sur iPhone/Android, sans compte, sans serveur tiers au-delà du service push du navigateur | ✅ Oui | ✅ **Oui, canal principal** |

**Conclusion :** Telegram + Web Push couvrent ensemble les canaux les plus importants — pas de coûts tiers, pas de violations des CGU, pas de tracking. WhatsApp serait techniquement possible, mais la mise en place (construction professionnelle avec le processus de validation de Meta) contredit la nature auto-hébergée de TeslaView. Si vous voulez vraiment WhatsApp : des solutions de pont comme *whatsapp-web.js* peuvent être ajoutées par les utilisateurs avancés eux-mêmes — nous ne le recommandons pas.

---

## Architecture multi-tenant (depuis la v2.0)

Depuis la v2.0, Tesla Carview prend en charge **plusieurs tenants** avec une isolation complète des données :

- Chaque tenant a sa propre base de données SQLite
- Nouveaux tenants uniquement via **lien d'invitation** avec **note** optionnelle (Admin → Utilisateurs → Créer un lien d'invitation, valide 7 jours, à usage unique) ; les invitations peuvent être réémises, révoquées en douceur ou supprimées
- **Plusieurs véhicules** par tenant : synchronisation via Paramètres → 🔄 Synchroniser les véhicules
- **Gestion des utilisateurs** par tenant (rôles, attribution de véhicule, verrouillage) avec permissions fines : `Modifier les véhicules`, `Ajouter des véhicules`, `MFA requis` par utilisateur
- **MFA obligatoire pour les nouveaux comptes** — le garde du routeur redirige vers la configuration TOTP jusqu'à ce que la MFA soit active
- **Carte de tâches admin** liste les utilisateurs actifs sans véhicule attribué avec des actions en un clic
- **Les entrées du carnet de bord conservent leur auteur** et l'affichent à côté de chaque entrée
- **Authentification par Passkey** (Touch ID, Face ID, Windows Hello, FIDO2)
- **Réinitialisation de mot de passe** via lien généré par l'admin
- **Détection de wallbox à domicile via Monta** (correspondance d'ID de point de charge → marqueur 🏠 dans la liste de recharge et la facturation)
- **Sessions de recharge gratuites** : marquables dans l'historique de recharge, exclues de la facturation
- **Bump de version sur les pages légales** écrit automatiquement la date du jour dans la ligne « Stand: » avant l'incrément

---

## Configuration système requise

| Composant | Minimum | Recommandé | Remarque |
|---|---|---|---|
| **CPU** | 1 cœur | 2+ cœurs | Pi 5 / VPS / x86 — ARM64 + AMD64 pris en charge |
| **RAM** | 2 Go | 4+ Go | avec Ollama : 4+ Go requis (modèle 1B), 8+ Go pour les modèles 3B |
| **Disque** | 2 Go | 10+ Go | avec Ollama : 1 à 20 Go supplémentaires par modèle |
| **OS** | Compatible Docker | Debian/Ubuntu/Pi OS | systemd recommandé |
| **Internet** | non | DSL+ | pour l'API Tesla + pulls d'images GHCR + téléchargements de modèles Ollama |

### Tableau matériel pour le mode IA (Ollama local)

Si vous souhaitez utiliser le chat IA local et souverain (Ollama, activé par défaut) :

| Matériel | Modèle recommandé | RAM | tok/s (inference) | Utilisable pour |
|---|---|---|---|---|
| Pi 4 (4 Go) | `llama3.2:1b` | ~1,5 Go | 4–6 | Q&R simples, latence perceptible |
| Pi 4 (8 Go) | `qwen2.5:1.5b` | ~1,8 Go | 3–5 | meilleur, toujours lent |
| Pi 5 (8 Go) | `qwen2.5:3b` | ~3 Go | 4–6 | valeur par défaut recommandée |
| VPS (4 vCPU / 8 Go) | `qwen2.5:3b` | ~3 Go | 8–12 | confortable |
| VPS / workstation (16 Go+) | `llama3:8b` | ~6,5 Go | 5–8 | très bon, un peu plus lent |
| GPU (8+ Go VRAM) | `llama3:8b` ou similaire | selon le modèle | 30–80+ | qualité entreprise |

**Désactivez Ollama** si votre matériel ne peut pas le faire tourner — créez un `docker-compose.override.yml` avec :
```yaml
services:
  ollama:
    profiles: [disabled]
```
Puis `docker compose up -d` sans Ollama. Ou plus simple : dans l'assistant, réglez `AI provider = Off`. Alternative cloud : `AI provider = Grok` (clé API xAI requise, les données vont dans le cloud).

## Démarrage rapide

> **⏳ Préparation côté Tesla (peut s'exécuter en parallèle de l'installation) :**
> Utiliser la Fleet API Tesla implique d'enregistrer une application sur [developer.tesla.com](https://developer.tesla.com/). **La validation par Tesla peut prendre 1 à 3 semaines.** L'installation elle-même fonctionne sans elle — chaque fonctionnalité non Tesla est immédiatement disponible, et vous pouvez ajouter les identifiants Tesla plus tard via `bash deploy/setup-wizard.sh`. Voir [docs/04-tesla-api.en.md](docs/04-tesla-api.en.md) pour les étapes et la configuration de la Virtual Key.

### Raspberry Pi / serveur Linux (recommandé)

```bash
# En tant que root sur la machine cible :
curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
```

Le script détecte automatiquement l'architecture (x86_64, ARM64, ARMv7) et installe tout.

### Développement local

```bash
git clone https://github.com/KnevS/Tesla-Carview.git
cd Tesla-Carview

# Backend
cd backend
cp .env.example .env
# ajustez .env (JWT_SECRET est obligatoire !)
npm install && npm run dev

# Frontend (deuxième terminal)
cd frontend && npm install && npm run dev
```

→ ouvrez le navigateur : **http://localhost:5173**
→ au premier démarrage, vous êtes automatiquement redirigé vers l'assistant de configuration

### Configuration uniquement (sans installation)

```bash
bash deploy/setup-wizard.sh
```

Assistant interactif pour : domaine, identifiants API Tesla, e-mail, Web Push.

---

## Configuration initiale (assistant web)

Au premier démarrage, l'application redirige automatiquement vers **/setup**.
Vous pouvez y créer le nom du tenant et le compte administrateur dans le navigateur.

Étapes recommandées après la connexion :
1. Connecter le véhicule Tesla (Paramètres → Tesla)
2. Enregistrer la Virtual Key sur le véhicule (Paramètres → Virtual Key)
3. Activer la MFA (Paramètres → Authentification à deux facteurs)
4. Configurer les emplacements de recharge

Le **manuel utilisateur** est disponible directement dans l'application à `/handbook`.

---

## Commandes véhicule et Virtual Key

Une **Virtual Key** est requise pour les commandes véhicule (climatisation, portes, klaxon, etc.).
La Virtual Key permet à l'application d'envoyer des commandes signées directement au véhicule.

**Prérequis** : un [`tesla-http-proxy`](https://github.com/teslamotors/vehicle-command) en cours d'exécution sur le serveur.

```bash
# démarrer le proxy (exemple — ajustez les chemins) :
tesla-http-proxy -port 4443 -host 0.0.0.0 \
  -tls-key /etc/tesla-proxy/server.key \
  -cert /etc/tesla-proxy/server.crt \
  -key-file /etc/tesla-proxy/tesla_priv.pem
```

La clé publique doit être accessible à `/.well-known/appspecific/com.tesla.3p.public-key.pem`
sur le domaine de l'application afin que le véhicule puisse vérifier la clé.


---

## Intégration Monta (optionnelle)

Tesla Carview prend en charge la synchronisation optionnelle avec [Monta](https://monta.com) — un service de gestion de recharge pour VE. L'intégration est disponible pour **tous les véhicules** :

- **Véhicules privés** : les sessions de recharge Monta sont affichées dans la vue de facturation comme des recharges à domicile (badge 🏠, détection automatique de la wallbox).
- **Véhicules de fonction** : en plus, facturation complète des coûts — vue mensuelle, feuille de remboursement PDF signable, modèle de facturation pour l'employeur.

Configuration par véhicule dans les paramètres (Profil du véhicule → Recharge à domicile) :
- **Monta Client ID** + **Client Secret** (OAuth2, Partner API)
- **Charge Point ID** (filtre les sessions vers un point de charge spécifique)
- **Prix de l'électricité de la wallbox** (€/kWh, base de facturation pour les véhicules de fonction)

La synchronisation s'exécute manuellement via **Facturation → Sync Monta**.


---

## Sécurité

- JWT (access token 15 min, refresh token 7 jours en cookie httpOnly)
- **MFA TOTP** (Google Authenticator, Authy, 1Password, etc.)
- **Passkeys** (WebAuthn, connexion sans mot de passe)
- **10 codes de secours** (hashés bcrypt, à usage unique)
- **Verrouillage de compte** après 5 tentatives échouées (15 min)
- **fail2ban** blocage IP après 3 connexions échouées (10 min)
- **HTTPS** avec TLS 1.2/1.3, HSTS, OCSP stapling
- En-têtes **CSP, X-Frame-Options, Permissions-Policy**
- **Rate limiting** sur les endpoints de connexion et d'API
- **Journal d'audit** de toutes les actions sensibles à la sécurité
- **Suppression des données** avec avertissement de sauvegarde et texte de confirmation

---

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | Vue 3 + Vite + Pinia + Tailwind CSS + Chart.js + Leaflet |
| Backend | Node.js 20 + Express + SQLite (better-sqlite3) |
| Auth | JWT + bcrypt + TOTP (otpauth) + WebAuthn (@simplewebauthn) |
| Données Tesla | Tesla Fleet API (OAuth2) + Fleet Telemetry (WebSocket) |
| Multi-tenancy | Bases SQLite séparées par tenant, master DB pour les données globales |
| Déploiement | Docker Compose + nginx + Let's Encrypt |
| Plateformes | linux/amd64 · linux/arm64 · linux/arm/v7 |

---

## Structure du projet

```
tesla-carview/
├── backend/
│   ├── src/
│   │   ├── db/            # schema + DB initialisation (master-schema.sql)
│   │   ├── middleware/    # auth.js (multi-tenant JWT), security.js, validate.js
│   │   ├── routes/        # auth, setup, register, passkey, password-reset,
│   │   │                  # users, vehicles, trips, charging, data-management, …
│   │   └── services/      # teslaApi, poller (multi-tenant), dataSync (GPS), …
│   └── .env.example       # configuration template
├── frontend/
│   └── src/
│       ├── views/         # Login, Register, Setup, Dashboard, Trips,
│       │                  # Settings (Passkey), UserManagement, DataManagement,
│       │                  # Handbook, PasswordReset, …
│       ├── components/    # NavBar (admin links, handbook), StatCard
│       ├── store/         # auth.js (passkey, tenant), index.js
│       └── router/        # routes with admin guard
├── deploy/
│   ├── setup.sh                  # fully automated server setup
│   ├── setup-wizard.sh           # interactive configuration assistant
│   ├── nginx-host.conf.template  # nginx config (HTTPS, TLS hardening)
│   └── update.sh                 # zero-downtime update
├── docs/                  # detailed guides
├── docker-compose.yml          # development
└── docker-compose.prod.yml     # production
```

---

## Variables d'environnement importantes (.env)

| Variable | Description | Exemple |
|---|---|---|
| `JWT_SECRET` | Clé secrète pour JWT (≥ 32 caractères, aléatoire) | `openssl rand -hex 32` |
| `TESLA_CLIENT_ID` | Client ID de l'app Tesla Developer | `abc123…` |
| `TESLA_CLIENT_SECRET` | Secret de l'app Tesla Developer | `secret…` |
| `FRONTEND_URL` | URL publique de l'application (pour le callback OAuth + passkeys) | `https://carview.example.com` |
| `RP_NAME` | Nom affiché dans les dialogues passkey | `Tesla Carview` |
| `RP_ID` | Domaine pour WebAuthn (sans protocole) | `carview.example.com` |

---

## Documentation

Tesla Carview est livré avec deux niveaux de documentation distincts :

### 👤 Pour les utilisateurs de l'application

Manuel intégré à l'application à `/handbook` dans l'application en cours d'exécution — ou lisez-le directement à [`frontend/src/handbook/handbook.en.md`](frontend/src/handbook/handbook.en.md). Sujets : tableau de bord, trajets, recharge, carnet de bord conforme BMF, commandes véhicule, intervalles d'entretien, mode démo, installation mobile, dépannage côté utilisateur.

### 🛠 Pour les auto-hébergeurs et administrateurs

Documentation technique dans le dossier [`docs/`](docs/README.en.md) :

| Document | Contenu |
|---|---|
| [📚 Index de la doc](docs/README.en.md) | Carte de chaque document technique |
| [Quickstart](docs/01-quickstart.en.md) | Environnement de développement local |
| [Déploiement](docs/02-deployment.en.md) | Déploiement serveur + Raspberry Pi |
| [Authentification et MFA](docs/03-authentication.en.md) | Système de connexion, MFA, passkeys |
| [Tesla Fleet API](docs/04-tesla-api.en.md) | Configurer un compte Tesla Developer |
| [Architecture de sécurité](docs/05-security-architecture.en.md) | Modèle de menace, toutes les mesures |
| [fail2ban](docs/06-fail2ban.en.md) | Configurer la protection brute-force |
| [Assistant de configuration](docs/07-setup-wizard.en.md) | Assistant de configuration interactif |
| [Déploiement Dokploy](docs/08-dokploy.en.md) | Plateforme de déploiement alternative |
| [Quota de l'API Tesla](docs/09-tesla-api-usage.en.md) | Coût de l'API et suivi |
| **[🔧 Configuration (ENV)](docs/10-configuration.en.md)** | Toutes les variables d'environnement — requises, optionnelles, démo, auto-update |
| **[🛠 Opérations](docs/11-operations.en.md)** | Sauvegarde/restauration, maintenance nocturne, mode démo, auto-update, logs |
| **[🛡️ Haute disponibilité (HA)](docs/12-high-availability.en.md)** | Options d'architecture pour les configurations critiques SLA (teaser, sur demande) |

---

## Mises à jour

```bash
bash deploy/update.sh
```

---

## Contribuer

Les contributions sont les bienvenues ! Lisez d'abord les [Lignes directrices de contribution](CONTRIBUTING.md), puis choisissez une [good first issue](https://github.com/KnevS/Tesla-Carview/labels/good%20first%20issue) ou ouvrez directement une pull request.

---

## Licence

[**PolyForm Noncommercial 1.0.0**](LICENSE) — licence logicielle non commerciale de [polyformproject.org](https://polyformproject.org).

**Autorisé :** usage personnel, auto-hébergement (y compris pour la famille/le foyer), modifications, redistribution gratuite sous les mêmes conditions, usage par des organisations caritatives, des institutions éducatives et de recherche publique.

**Interdit :** vendre le logiciel, l'exploiter comme service payant (SaaS) pour des tiers, tout usage commercial, sous-licencier.

Toute redistribution doit inclure le texte complet de la licence et le `Required Notice` de copyright. Le logiciel est fourni « tel quel », sans garantie — détails dans [LICENSE](LICENSE).

### 📜 Divulgation d'antériorité (Prior-Art Disclosure)

Toutes les procédures techniques documentées dans ce dépôt — en particulier le **Battery-Health Companion** (phases 1+2), la **validation OwnTracks via déclencheur Bluetooth** avec verrou de trajet par véhicule, la **limite de charge automatique par emplacement géofencé**, le **hub d'applications web sélectionnées pour le navigateur Tesla**, la **recherche de POI autour d'une session de recharge via OSM Overpass**, le **géocodage inverse automatique avec cache local**, la **stratégie UI privilégiant l'adresse**, et la **détection d'anomalies à plusieurs étages avec recommandations push** — sont publiquement publiées à la date du commit Git correspondant et constituent un « prior art » au sens du droit des brevets et des marques.

Cette divulgation vise à empêcher des dépôts ultérieurs de propriété intellectuelle par des tiers sur les mêmes procédures.

Les hashs Git et les horodatages de commit sont vérifiables cryptographiquement et horodatés indépendamment par GitHub.

---

## ❤️ Soutien

Tesla Carview est gratuit et sans publicité **pour un usage privé et auto-hébergé dans votre propre foyer** (voir [LICENSE](LICENSE) et [PolyForm Noncommercial 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0/)). La revente commerciale, l'hébergement SaaS pour des tiers ou l'intégration dans des produits commerciaux ne sont **pas** autorisés.

Si le programme a de la valeur à vos yeux, les organisations à but non lucratif
suivantes seront heureuses de votre soutien direct :

| Organisation | Description |
|---|---|
| **Aktion Deutschland Hilft** | Alliance d'organisations humanitaires pour une aide aux catastrophes rapide et efficace dans le monde entier |
| **Lebenshilfe Rems-Murr** | Soutien, accompagnement et inclusion des personnes handicapées dans la région du Rems-Murr |
| **Radio 7 Drachenkinder** | Aide aux enfants gravement malades dans la région — finance thérapies et souhaits |

> **100 % de votre don va directement à l'organisation. Nous ne voyons ni le montant ni vos données.**

Accessible dans l'application via le lien **❤ Soutien** dans le pied de page de chaque page, ou directement à `/support`.
