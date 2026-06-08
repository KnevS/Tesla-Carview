# Idées de feuille de route

> 🤖 *Cette traduction française est assistée par IA depuis [13-roadmap-ideas.en.md](13-roadmap-ideas.en.md). Corrections bienvenues via GitHub.*

> 🇩🇪 [Auf Deutsch lesen](13-roadmap-ideas.md)

Une collection d'idées de fonctionnalités pour les versions futures. Inspirée du
panel habituel de fonctionnalités dans l'espace des trackers de données Tesla
(Teslamate, TeslaFi, TeslaLogger, forks TeslaMate, ABRP Companion, Watt for Tesla, etc.) —
cette liste contient **uniquement des descriptions fonctionnelles**, pas de maquettes UI, pas de
texte copié, pas d'extraits de code et pas d'imports de marque/nom.

> **Note juridique :** La fonctionnalité en tant que telle n'est généralement pas
> protégeable par le droit d'auteur en droit allemand et européen (BGH I ZR 159/10 « Lottoblock »,
> CJUE C-406/10 « SAS Institute ») ; ce qui *est* protégé, c'est l'expression concrète
> (code, texte, design graphique). Ce document se limite à **ce que** font couramment les
> applications de cet espace — Tesla Carview implémente le **comment** indépendamment.

## Couramment vu dans l'espace — candidats pour Tesla Carview

### Énergie & efficacité
- **Consommation par trajet vs WLTP** pour le modèle, sous forme d'indicateur de delta.
- **Eco-score par trajet** dérivé de Wh/km vs la propre baseline de la voiture
  (purement local, pas de modèle cloud).
- **Heatmap d'énergie sur la trace GPS** du trajet : rouge = forte consommation,
  vert = récupération par régénération, jaune = vitesse constante.
- **Profil d'élévation** par trajet (depuis open-elevation ou tuiles d'altitude offline).
  Corrélation consommation ↔ mètres grimpés.
- **Répartition énergie climat** : différence entre puissance moteur et puissance
  aux roues quand les deux sont reportées.

### Batterie & charge
- **Tendance de capacité** (kWh net dans le temps, régression sur la dégradation,
  « SoH 90 % attendu vers ~MM/YYYY »).
- **Fenêtre de charge recommandée** combinant la courbe tarifaire existante
  (aWattar / Tibber) avec le SoC cible et l'heure de départ planifiée.
- **Estimation des pertes en charge rapide** (kWh payés vs kWh effectivement
  arrivant dans la batterie) — pour la facturation domestique et par type de chargeur DC.
- **Comparaison de courbes de charge rapide** : la session courante par rapport aux
  sessions historiques au même lieu / type de chargeur, sous forme de graphique linéaire.
- **Tracker de phantom-drain** : delta de SoC en stationnement, ventilé par
  lieu / saison (estimation du coût Sentry Mode).

### Trajets & carnet de bord
- **Heatmap de localisation** (complémentaire à la nouvelle heatmap d'activité) :
  « où ai-je été souvent » sur la carte, sans lignes de chemin.
- **Détection de trajets fréquents** — quand le départ/arrivée est similaire à
  un itinéraire existant, suggérer une classification (domicile-travail vs privé)
  et l'objet précédemment utilisé.
- **Replay de trajet** : rejouer le trajet le long de la timeline avec
  les valeurs synchronisées de SoC, vitesse et climat.
- **Auto-classification par géofence** : polygones « Domicile », « Travail », trajets
  entre eux automatiquement tagués `commute`.
- **Modèles de partenaires d'affaires** (partenaires/clients fréquemment visités
  comme menu déroulant dans le champ de saisie).

### Confort & contrôle
- **Automatisation du préconditionnement** : déclencher la climatisation X min avant le prochain
  événement de calendrier quand la voiture est à portée et branchée.
- **Intelligence Sentry Mode** : auto-off au point domicile après X min,
  auto-on à l'hôtel/parking.
- **Comportement des portes** : à l'approche + phone-key + géofence domicile,
  verrouillage en mode poche.
- **Limite de charge dynamique** : SoC cible inféré du planning de demain
  (intégration calendrier optionnelle).

### Rapports & analytique
- **Prédiction d'entretien** basée sur la tendance km (extrapolation linéaire) :
  « contrôle technique dû vers DD.MM.YYYY au rythme actuel ». À moitié implémenté via
  les intervalles d'entretien.
- **Réalisme d'autonomie par météo** : consommation réelle corrélée à la
  température extérieure (depuis `state.outside_temp`) ; prévision « à -5 °C
  une batterie pleine fait ~280 km aujourd'hui ».
- **PDF de rapport annuel** : une seule page visuelle avec heatmap, top 5 itinéraires,
  kWh totaux, coût total, CO₂ vs équivalent diesel (calculé localement,
  pas d'estimation cloud).
- **Mode reporting CO₂** : par trajet, une estimation CO₂ utilisant
  le mix électrique allemand/UE par défaut (l'opérateur peut surcharger
  les g/kWh, par ex. pour une part PV).

### Système & multi-utilisateur
- **Tableau de bord de partage familial** : onglet supplémentaire par véhicule montrant
  « qui a conduit quand » — graphique par conducteur par semaine (utilise le `driver_id` existant).
- **Règles de notifications push** : déclencheurs configurables (par ex. « SoC < 20 %
  ET pas à la maison » → rappel).
- **Webhooks sortants** : cible par tenant (Home Assistant, IFTTT, n8n)
  — fin de trajet, fin de charge, entretien dû postés en JSON.
- **Tokens API en lecture seule** pour analyses tierces, avec sélection de scope
  (trajets seulement / charges seulement / batterie seulement).

### Vie privée & sécurité (au-delà de ce qui est en place)
- **Mode GPS-flou** par tenant : coordonnées du dernier kilomètre arrondies à
  ~200 m pour que l'emplacement exact du domicile ne soit jamais persisté (pertinent pour
  les tenants multi-conducteurs).
- **Job droit à l'oubli** : les trajets plus vieux que N années sont
  auto-anonymisés (arrondi GPS à 4 décimales, suppression d'adresses), enregistrement
  d'audit conservé.
- **Step-up WebAuthn** pour les actions à fort impact (téléchargement de sauvegarde,
  suppression de tenant) en plus de la passkey de login.

## Choses délibérément NON adoptées de l'espace

- **Synchronisation cloud externe** des données véhicule vers un tableau de bord tiers.
  Conflit avec la promesse d'auto-hébergement.
- **Formats d'export propriétaires**. Nous gardons CSV / JSON pour que les données restent
  portables.
- **Participation à des auto-statistiques identifiantes** (envoyer des données de trajet
  anonymisées à un pool pour calculer des moyennes de modèles). Peut venir plus tard
  en opt-in, jamais en défaut.

## Ordre de priorité suggéré

Classé par rapport valeur/effort :

1. **Auto-classification par géofence** (petite UI, impact quotidien)
2. **Consommation par trajet vs WLTP** (un chiffre, beaucoup de valeur)
3. **Heatmap de localisation** (même chemin de rendu que la heatmap d'activité)
4. **Webhooks sortants** (ouvre l'écosystème)
5. **Réalisme d'autonomie par météo** (a besoin d'abord de 1–2 semaines de données)
6. **PDF de rapport annuel** (excellent artefact marketing)
7. **Mode GPS-flou** (pertinent pour les tenants entreprises)

Toutes les fonctions listées sont des **propositions, pas des engagements**. Chaque
implémentation est faite indépendamment, sans reprendre de code externe ou
de texte externe.
