🌐 **Langue :** [EN](Features) · [DE](DE-Features) · **FR** · [ES](ES-Features) · [TR](TR-Features) · [EL](EL-Features)

---

# Aperçu des fonctionnalités

Tesla Carview couvre l'ensemble du cycle de vie de votre Tesla — du suivi de chaque trajet au contrôle du véhicule en passant par la gestion des coûts de recharge.

---

## 📊 Tableau de bord

Le tableau de bord est votre vue d'ensemble centrale, affichant :
- **Statut du véhicule en temps réel** — niveau de batterie, autonomie, localisation, état de recharge
- **Trajets récents** — les 5 derniers trajets avec distance et consommation
- **Statistiques mensuelles** — distance, énergie utilisée, coût de recharge
- **Widget tarif dynamique** — prix de l'électricité actuel (aWATTar DE/AT, Tibber)
- **Intervalles de service** — rappels de maintenance à venir (contrôle technique, huile, liquide de frein, etc.)
- **Santé du système** — statut de connexion à l'API Tesla, Fleet Telemetry, taille de la base de données

Le tableau de bord se rafraîchit automatiquement toutes les 60 secondes lorsque vous avez l'onglet ouvert.

---

## 🚗 Trajets (Carnet de route)

Chaque trajet est automatiquement enregistré avec :
- Lieu de départ et d'arrivée (adresse + coordonnées GPS)
- Distance, durée, vitesse moyenne
- Consommation d'énergie (kWh et kWh/100 km)
- Niveau de batterie au départ/à l'arrivée
- Classification du type de trajet (privé / domicile-travail / professionnel)

### Carnet de route (conforme aux exigences légales)
Le carnet de route répond aux exigences légales françaises et européennes :
- Champs partenaire commercial et objet du trajet
- Numérotation séquentielle des trajets
- Fonction "Verrouiller" pour finaliser le carnet
- **Export PDF** au format A4 paysage avec tous les champs légalement requis
- Fusion et division de trajets pour les voyages multi-étapes
- Création manuelle de trajets pour les entrées oubliées

### Modification de la localisation GPS
Si un trajet a une adresse manquante ou incorrecte, vous pouvez la modifier directement :
- Cliquez sur un trajet → Modifier la localisation
- Entrez l'adresse manuellement ou faites glisser un repère sur la carte

---

## ⚡ Recharge

Toutes les sessions de recharge sont journalisées automatiquement :
- Localisation (correspondance GPS avec les stations de recharge enregistrées)
- Énergie ajoutée (kWh) et coût estimé
- Vitesse et durée de recharge
- Indicateur de recharge à domicile (🏠) via intégration Monta

### Stations de recharge
Définissez votre domicile et vos points de recharge habituels :
- **Paramètres → Stations de recharge** → Ajouter avec adresse + GPS + rayon
- Les sessions à cet emplacement sont automatiquement taguées
- Définissez un tarif par kWh par station pour le calcul des coûts

### Intégration Monta
Si vous utilisez Monta pour la recharge à domicile :
- Entrez votre clé API Monta dans les paramètres
- Les sessions Monta se synchronisent automatiquement avec les données kWh et coût correctes
- L'indicateur de recharge à domicile est défini automatiquement

### Calcul des coûts et facture PDF
Générez des factures PDF pour le remboursement (ex. pour votre employeur) :
- **Facturation → Générer une facture**
- Sélectionnez la plage de dates et incluez/excluez des sessions spécifiques
- PDF avec en-tête, tableau, totaux et champ de signature
- Généré entièrement côté client — aucune donnée ne quitte votre serveur

---

## 🔋 Batterie

Suivez la santé de votre batterie dans le temps :
- Courbe de dégradation (autonomie estimée vs. autonomie nominale)
- Compteur de cycles de charge
- Données historiques du niveau de charge
- Autonomie à différentes températures (comparaison hiver / été)

---

## 🎮 Contrôle du véhicule

Contrôlez votre Tesla directement depuis l'application :
- 🌡️ **Climatisation** — démarrer/arrêter, régler la température, chauffage des sièges, chauffage du volant
- 🔓 **Verrouillage** — verrouiller/déverrouiller les portes
- 💡 **Lumières** — flasher les feux, klaxon
- 🚪 **Coffre/capot** — ouvrir le coffre et le frunk
- 🔌 **Recharge** — ouvrir/fermer le port de charge, régler les ampères, démarrer/arrêter
- 🔄 **Mises à jour logicielles** — déclencher et surveiller les mises à jour OTA
- ⏰ **Recharge programmée** — définir des plages de recharge aux heures creuses
- 🎵 **Boombox à distance** — déclencher des sons boombox (là où c'est supporté)
- 🌬️ **Mode climatisation** — définir le mode camping/chien/maintien
- 🪟 **Vitres** — ouvrir/fermer les vitres

> Les commandes nécessitent que la **Virtual Key** soit appairée. Voir [Configuration de l'API Tesla](FR-Tesla-API-Setup#%C3%A9tape-3--configurer-la-virtual-key-pour-les-commandes).

---

## 📝 Carnet d'entretien

Journalisez tous les événements de maintenance :
- Date, catégorie (entretien / réparation / pneus / inspection / note)
- Coût, kilométrage
- Description et pièces jointes
- Qui a effectué le travail (nom du garage)

### Intervalles de service et rappels
Configurez des rappels de maintenance récurrents :
- **Paramètres → Intervalles de service** → Ajouter un intervalle (ex. "Contrôle technique dans 2 ans", "Liquide de frein tous les 2 ans")
- Notifications push 30 jours avant et 1 000 km avant chaque intervalle
- Le tableau de bord affiche les services à venir sous forme de carte d'aperçu

---

## 📤 Export

Exportez toutes vos données :
- **Trajets** — CSV ou JSON
- **Sessions de recharge** — CSV ou JSON
- **Carnet d'entretien** — CSV
- **Sauvegarde complète** — JSON (toutes les tables), importable pour restauration

---

## 🔔 Notifications push

Soyez notifié dans votre navigateur quand :
- La recharge est terminée
- Un intervalle de service approche
- Une mise à jour logicielle est disponible

Les notifications fonctionnent sur ordinateur (Chrome, Firefox, Edge) et mobile (Android Chrome, iOS Safari avec raccourci écran d'accueil).

**Configuration :** Paramètres → Notifications push → Activer les notifications

---

## 📱 PWA (Progressive Web App)

Tesla Carview fonctionne comme une PWA — vous pouvez l'installer sur votre écran d'accueil :

- **Android/Chrome desktop :** Tapez l'icône d'installation dans la barre d'adresse
- **iOS Safari :** Partager → "Ajouter à l'écran d'accueil"
- **Navigateur Tesla :** Menu → "Ajouter à l'écran d'accueil"

La PWA installée fonctionne hors ligne pour les pages mises en cache et reçoit des notifications comme une application native.

---

## 🌡️ Tarif dynamique (aWATTar / Tibber)

Si vous avez un tarif d'électricité dynamique :
- Connectez aWATTar (DE/AT, aucune clé API nécessaire) ou Tibber (clé API dans les paramètres)
- Le tableau de bord affiche le prix actuel et le graphique des prix sur 24 heures
- **Définir automatiquement la plage de recharge** — un clic configure la recharge programmée sur la fenêtre de 4 heures la moins chère dans les 24 prochaines heures

---

## 🌍 Multilingue

L'application est entièrement traduite en :
🇩🇪 Allemand · 🇬🇧 Anglais · 🇫🇷 Français · 🇪🇸 Espagnol · 🇹🇷 Turc · 🇬🇷 Grec

La langue est déterminée par :
1. Le paramètre de votre profil utilisateur (prioritaire)
2. La langue par défaut du locataire
3. La langue de votre navigateur

---

## 🧪 Mode démo

Activez optionnellement un mode démo pour que d'autres puissent essayer l'application sans vrai Tesla :
- `DEMO_ENABLED=true` dans `.env`
- Des trajets et historiques de recharge fictifs sont générés automatiquement
- Les comptes démo expirent après 14 jours
- La limitation par IP empêche les abus

---

## 🌙 Mode maintenance

L'application affiche automatiquement une superposition "maintenance" quand le backend est inaccessible (redémarrage après mises à jour). Elle affiche des citations Tesla en allemand/anglais, un compte à rebours, et interroge le backend toutes les 3 secondes jusqu'à ce qu'il soit de retour — puis disparaît.
