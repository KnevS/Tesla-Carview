🌐 **Langue :** [EN](First-Login) · [DE](DE-First-Login) · **FR** · [ES](ES-First-Login) · [TR](TR-First-Login) · [EL](EL-First-Login)

---

# Première connexion et configuration du locataire

Après l'installation, cette page vous guide lors de votre première ouverture de Tesla Carview.

---

## Qu'est-ce qu'un « locataire » ?

Tesla Carview prend en charge plusieurs comptes isolés sur un seul serveur — appelés **locataires**. Chaque locataire possède :
- Ses propres utilisateurs et véhicules
- Sa propre base de données (les données sont totalement séparées)
- Ses propres paramètres et contenus légaux

**Pour une installation mono-utilisateur :** Vous avez un locataire (créé pendant l'installation). Vous n'avez pas besoin de vous préoccuper des locataires du tout — la page de connexion gère cela automatiquement.

**Pour une famille / petit groupe :** Chaque personne peut avoir son propre compte sous le même locataire. Ou vous pouvez créer des locataires séparés pour une isolation complète.

---

## Se connecter pour la première fois

1. Ouvrez `https://tesla.votredomaine.com` dans votre navigateur
2. Vous verrez la page de connexion

   Si vous n'avez qu'**un seul locataire** sur votre serveur, le champ locataire est automatiquement masqué — saisissez simplement votre nom d'utilisateur et mot de passe.

   Si vous avez **plusieurs locataires**, une liste déroulante apparaît pour sélectionner le locataire.

3. Saisissez votre nom d'utilisateur admin et votre mot de passe (définis lors de l'installation)
4. Cochez **"Rester connecté (90 jours)"** — très recommandé, surtout pour le navigateur Tesla

5. Cliquez sur **Se connecter**

---

## L'assistant de configuration

Si c'est la première fois que vous connectez un compte Tesla, un assistant vous guide à travers :

1. **Connecter le compte Tesla** → Voir [Configuration de l'API Tesla](FR-Tesla-API-Setup)
2. **Sélectionner le véhicule** → Choisissez la voiture à suivre
3. **Contenus légaux** → Configurer les mentions légales/la politique de confidentialité (requis si accessible publiquement)
4. **Terminé !** → Vous êtes redirigé vers le tableau de bord

---

## Inviter d'autres utilisateurs

En tant qu'administrateur, vous pouvez inviter d'autres personnes dans votre locataire (membres de la famille, partenaire) :

1. Allez dans **Admin → Utilisateurs → Inviter un utilisateur**
2. Saisissez leur e-mail ou nom d'utilisateur
3. Ils reçoivent un lien pour créer leur propre mot de passe
4. Vous pouvez définir quels véhicules ils peuvent voir et quelles actions ils peuvent effectuer

Consultez [Multi-locataires et utilisateurs](FR-Multi-Tenant) pour tous les détails.

---

## Utiliser Tesla Carview depuis le navigateur Tesla

L'écran tactile Tesla intègre un navigateur. Vous pouvez utiliser Tesla Carview directement depuis la voiture :

1. Ouvrez le navigateur sur l'écran tactile Tesla
2. Naviguez vers `https://tesla.votredomaine.com`
3. Connectez-vous avec votre nom d'utilisateur et mot de passe (cochez "Rester connecté" pour 90 jours)
4. Ajoutez aux favoris ou à l'écran d'accueil pour un accès rapide

> 💡 **Astuce :** Le navigateur Tesla ne prend pas en charge les passkeys (empreinte digitale/reconnaissance faciale). Utilisez le nom d'utilisateur + mot de passe et cochez "Rester connecté" pour ne vous connecter qu'une seule fois.

---

## Changer votre mot de passe

1. Allez dans **Paramètres → Compte**
2. Cliquez sur **Changer le mot de passe**
3. Saisissez votre mot de passe actuel et le nouveau (minimum 12 caractères)

---

## Configurer l'authentification à deux facteurs (MFA)

Pour plus de sécurité, configurez la MFA avec une application d'authentification (Google Authenticator, Authy, Bitwarden) :

1. Allez dans **Paramètres → Sécurité**
2. Cliquez sur **Configurer l'authentification à deux facteurs**
3. Scannez le QR code avec votre application d'authentification
4. Saisissez le code à 6 chiffres pour confirmer

Après configuration, le code vous sera demandé à chaque connexion (sauf si vous utilisez un passkey).

Consultez [Sécurité](FR-Security) pour plus de détails sur toutes les options d'authentification.
