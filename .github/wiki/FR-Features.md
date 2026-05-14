# Vue d'ensemble des fonctionnalités

Tesla Carview couvre l'intégralité du cycle de vie de votre Tesla — du suivi de chaque trajet au contrôle de la voiture en passant par la gestion des coûts de recharge.

---

🌐 **Language / Sprache / Langue / Idioma / Dil / Γλώσσα**

| | |
|---|---|
| 🇬🇧 **[English](Features)** | English version |
| 🇩🇪 **[Deutsch](DE-Features)** | Deutsche Version |
| 🇫🇷 **[Français](FR-Features)** | Vous êtes ici |
| 🇪🇸 **[Español](ES-Features)** | Versión en español |
| 🇹🇷 **[Türkçe](TR-Features)** | Türkçe sürüm |
| 🇬🇷 **[Ελληνικά](EL-Features)** | Ελληνική έκδοση |

---

## 📊 Tableau de bord

Le tableau de bord est votre vue d'ensemble centrale, affichant :
- **État du véhicule en temps réel** — niveau de batterie, autonomie, localisation, état de recharge
- **Trajets récents** — les 5 derniers trajets avec distance et consommation
- **Statistiques mensuelles** — distance, énergie consommée, coût de recharge
- **Widget de tarif dynamique** — prix de l'électricité en temps réel (aWATTar DE/AT, Tibber)
- **Intervalles d'entretien** — rappels de maintenance à venir (contrôle technique, huile, liquide de frein, etc.)
- **Santé du système** — statut de la connexion API Tesla, Fleet Telemetry, taille de la base de données

Le tableau de bord se rafraîchit automatiquement toutes les 60 secondes lorsque l'onglet est ouvert.

---

## 🚗 Trajets (Journal de bord)

Chaque trajet est automatiquement enregistré avec :
- Lieu de départ et d'arrivée (adresse + coordonnées GPS)
- Distance, durée, vitesse moyenne
- Consommation d'énergie (kWh et kWh/100 km)
- Niveau de batterie au départ et à l'arrivée
- Classification du type de trajet (privé / domicile-travail / professionnel)

### Journal de bord (conforme BMF)
Le journal de bord répond aux exigences du fisc allemand (Finanzamt/BMF) :
- Champs pour le partenaire commercial et l'objet du trajet
- Numérotation séquentielle des trajets
- Fonction de « verrouillage » pour clôturer le journal
- **Export PDF** au format A4 paysage avec tous les champs légalement requis
- Fusion et division des trajets pour les voyages à étapes multiples
- Création manuelle de trajets pour les entrées oubliées

### Modification de la localisation GPS
Si un trajet comporte une adresse manquante ou incorrecte, vous pouvez la modifier directement :
- Cliquez sur un trajet → Modifier la localisation
- Saisissez l'adresse manuellement ou déplacez une épingle sur la carte

---

## ⚡ Recharge

Toutes les sessions de recharge sont enregistrées automatiquement :
- Lieu (associé par GPS aux lieux de recharge enregistrés)
- Énergie ajoutée (kWh) et coût estimé
- Vitesse et durée de la recharge
- Indicateur de recharge à domicile (🏠) via l'intégration Monta

### Lieux de recharge
Définissez votre domicile et vos points de recharge habituels :
- **Paramètres → Lieux de recharge** → Ajouter avec adresse + GPS + rayon
- Les sessions à cet emplacement sont automatiquement identifiées
- Définissez un tarif par kWh pour chaque lieu afin de calculer les coûts

### Intégration Monta
Si vous utilisez Monta pour la recharge à domicile :
- Saisissez votre clé API Monta dans les paramètres
- Les sessions Monta se synchronisent automatiquement avec les données de kWh et de coût correctes
- L'indicateur de recharge à domicile est défini automatiquement

### Calcul des coûts et facture PDF
Générez des factures PDF pour le remboursement (ex. par votre employeur) :
- **Facturation → Générer une facture**
- Sélectionnez la plage de dates et incluez/excluez des sessions spécifiques
- PDF avec en-tête, tableau, totaux et champ de signature
- Génération entièrement côté client — aucune donnée ne quitte votre serveur

---

## 🔋 Batterie

Suivez l'état de votre batterie au fil du temps :
- Courbe de dégradation (autonomie estimée vs. autonomie nominale)
- Compteur de cycles de charge
- Historique du niveau de charge
- Autonomie à différentes températures (comparaison hiver / été)

---

## 🎮 Contrôle du véhicule

Contrôlez votre Tesla directement depuis l'application :
- 🌡️ **Climatisation** — démarrer/arrêter, régler la température, chauffage des sièges, chauffage du volant
- 🔓 **Verrouillage** — verrouiller/déverrouiller les portes
- 💡 **Éclairage** — faire clignoter les phares, klaxon
- 🚪 **Coffre/frunk** — ouvrir le coffre et le frunk
- 🔌 **Recharge** — ouvrir/fermer la prise de charge, régler les ampères, démarrer/arrêter la recharge
- 🔄 **Mises à jour logicielles** — déclencher et surveiller les mises à jour OTA
- ⏰ **Recharge programmée** — définir des plages de recharge aux heures creuses
- 🎵 **Boombox à distance** — déclencher des sons boombox (selon les modèles)
- 🌬️ **Mode climatisation** — définir les modes camping/chien/maintien
- 🪟 **Vitres** — ouvrir/fermer les vitres

> Les commandes nécessitent que la **clé virtuelle** soit couplée. Voir [Configuration de l'API Tesla](Tesla-API-Setup#step-3-set-up-the-virtual-key-for-commands).

---

## 📝 Journal d'entretien (Carnet de bord)

Enregistrez tous les événements de maintenance :
- Date, catégorie (entretien / réparation / pneumatique / contrôle / note)
- Coût, kilométrage
- Description et pièces jointes
- Intervenant (nom du garage)

### Intervalles d'entretien et rappels
Configurez des rappels de maintenance récurrents :
- **Paramètres → Intervalles d'entretien** → Ajouter un intervalle (ex. « Contrôle technique dans 2 ans », « Liquide de frein tous les 2 ans »)
- Notifications push 30 jours avant et 1 000 km avant chaque échéance
- Le tableau de bord affiche les prochains entretiens sous forme de carte d'aperçu

---

## 📤 Export

Exportez toutes vos données :
- **Trajets** — CSV ou JSON
- **Sessions de recharge** — CSV ou JSON
- **Journal d'entretien** — CSV
- **Sauvegarde complète** — JSON (toutes les tables), importable pour la restauration

---

## 🔔 Notifications push

Recevez une notification dans votre navigateur lorsque :
- La recharge est terminée
- Un intervalle d'entretien approche
- Une mise à jour logicielle est disponible

Les notifications fonctionnent sur ordinateur (Chrome, Firefox, Edge) et mobile (Android Chrome, iOS Safari avec raccourci sur l'écran d'accueil).

**Configuration :** Paramètres → Notifications push → Activer les notifications

---

## 📱 PWA (Progressive Web App)

Tesla Carview fonctionne comme une PWA — vous pouvez l'installer sur votre écran d'accueil :

- **Android/Chrome bureau :** Appuyez sur l'icône d'installation dans la barre d'adresse
- **iOS Safari :** Appuyez sur Partager → « Sur l'écran d'accueil »
- **Navigateur Tesla :** Appuyez sur le menu → « Ajouter à l'écran d'accueil »

La PWA installée fonctionne hors ligne pour les pages mises en cache et reçoit les notifications comme une application native.

---

## 🌡️ Tarif dynamique (aWATTar / Tibber)

Si vous disposez d'un tarif d'électricité dynamique :
- Connectez aWATTar (DE/AT, sans clé API) ou Tibber (clé API dans les paramètres)
- Le tableau de bord affiche le prix actuel et un graphique des prix sur 24 heures
- **Définition automatique de la plage de recharge** — d'un seul clic, la recharge programmée est réglée sur la fenêtre de 4 heures la moins chère dans les 24 prochaines heures

---

## 🌍 Multilingue

L'application est entièrement traduite en :
🇩🇪 Allemand · 🇬🇧 Anglais · 🇫🇷 Français · 🇪🇸 Espagnol · 🇹🇷 Turc · 🇬🇷 Grec

La langue est déterminée par :
1. Le paramètre de votre profil utilisateur (priorité absolue)
2. La langue par défaut du tenant
3. La langue de votre navigateur

---

## 🌙 Mode maintenance

L'application affiche automatiquement une fenêtre « maintenance » lorsque le backend est inaccessible (redémarrage après une mise à jour). Elle affiche des citations Tesla en allemand et en anglais, un compte à rebours, et vérifie toutes les 3 secondes si le backend est revenu — puis disparaît dès que c'est le cas.
