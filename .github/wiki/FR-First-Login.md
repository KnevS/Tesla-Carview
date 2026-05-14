# Première connexion et configuration du tenant

Après l'installation, cette page vous guide lors de votre premier accès à Tesla Carview.

---

🌐 **Language / Sprache / Langue / Idioma / Dil / Γλώσσα**

| | |
|---|---|
| 🇬🇧 **[English](First-Login)** | English version |
| 🇩🇪 **[Deutsch](DE-First-Login)** | Deutsche Version |
| 🇫🇷 **[Français](FR-First-Login)** | Vous êtes ici |
| 🇪🇸 **[Español](ES-First-Login)** | Versión en español |
| 🇹🇷 **[Türkçe](TR-First-Login)** | Türkçe sürüm |
| 🇬🇷 **[Ελληνικά](EL-First-Login)** | Ελληνική έκδοση |

---

## Qu'est-ce qu'un « tenant » ?

Tesla Carview prend en charge plusieurs comptes isolés sur un seul serveur — appelés **tenants**. Chaque tenant possède :
- Ses propres utilisateurs et véhicules
- Sa propre base de données (les données sont totalement séparées)
- Ses propres paramètres et contenu juridique

**Pour une utilisation individuelle :** Vous disposez d'un seul tenant (créé lors de l'installation). Vous n'avez pas à vous préoccuper des tenants — la page de connexion s'en charge automatiquement.

**Pour une famille ou un petit groupe :** Chaque personne peut avoir son propre compte au sein du même tenant. Ou vous pouvez créer des tenants séparés pour une isolation complète.

---

## Se connecter pour la première fois

1. Ouvrez `https://tesla.votredomaine.com` dans votre navigateur
2. La page de connexion s'affiche

   Si votre serveur ne comporte qu'**un seul tenant**, le champ tenant est masqué automatiquement — saisissez simplement votre nom d'utilisateur et votre mot de passe.

   Si vous avez **plusieurs tenants**, une liste déroulante apparaît pour sélectionner celui dans lequel vous souhaitez vous connecter.

3. Saisissez votre nom d'utilisateur et votre mot de passe administrateur (définis lors de l'installation)
4. Cochez **« Rester connecté (90 jours) »** — fortement recommandé, notamment pour le navigateur Tesla

5. Cliquez sur **Se connecter**

---

## L'assistant de configuration

Si vous connectez un compte Tesla pour la première fois, un assistant vous guide à travers les étapes suivantes :

1. **Connecter le compte Tesla** → Voir [Configuration de l'API Tesla](Tesla-API-Setup)
2. **Sélectionner le véhicule** → Choisir la voiture à suivre
3. **Contenu juridique** → Configurer les mentions légales et la politique de confidentialité (requis si l'application est accessible publiquement)
4. **Terminé !** → Vous êtes dirigé vers le tableau de bord

---

## Inviter d'autres utilisateurs

En tant qu'administrateur, vous pouvez inviter d'autres personnes dans votre tenant (membres de la famille, partenaire) :

1. Accédez à **Admin → Utilisateurs → Inviter un utilisateur**
2. Saisissez leur adresse e-mail ou leur nom d'utilisateur
3. Ils reçoivent un lien pour créer leur propre mot de passe
4. Vous pouvez définir quels véhicules ils peuvent voir et quelles actions ils peuvent effectuer

Consultez [Multi-Tenant & Utilisateurs](Multi-Tenant) pour tous les détails.

---

## Utiliser Tesla Carview depuis le navigateur Tesla

L'écran tactile Tesla dispose d'un navigateur intégré. Vous pouvez utiliser Tesla Carview directement depuis la voiture :

1. Ouvrez le navigateur sur l'écran tactile Tesla
2. Accédez à `https://tesla.votredomaine.com`
3. Connectez-vous avec votre nom d'utilisateur et votre mot de passe (cochez « Rester connecté » pour 90 jours)
4. Ajoutez un marque-page ou ajoutez à l'écran d'accueil pour un accès rapide

> 💡 **Conseil :** Le navigateur Tesla ne prend pas en charge les clés d'accès (connexion par empreinte digitale ou reconnaissance faciale). Utilisez votre nom d'utilisateur et votre mot de passe, et cochez « Rester connecté » pour ne vous connecter qu'une seule fois.

---

## Modifier votre mot de passe

1. Accédez à **Paramètres → Compte**
2. Cliquez sur **Modifier le mot de passe**
3. Saisissez votre mot de passe actuel et le nouveau (minimum 12 caractères)

---

## Configurer l'authentification à deux facteurs (MFA)

Pour plus de sécurité, configurez la MFA avec une application d'authentification (Google Authenticator, Authy, Bitwarden) :

1. Accédez à **Paramètres → Sécurité**
2. Cliquez sur **Configurer l'authentification à deux facteurs**
3. Scannez le code QR avec votre application d'authentification
4. Saisissez le code à 6 chiffres pour confirmer

Une fois configurée, le code vous sera demandé à chaque connexion (sauf si vous utilisez une clé d'accès).

Consultez [Sécurité](Security) pour plus de détails sur toutes les options d'authentification.
