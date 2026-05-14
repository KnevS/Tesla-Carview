# Configuration de l'API Tesla

La connexion de Tesla Carview à votre compte Tesla nécessite un **compte Tesla Developer** et une **application OAuth**. Cette procédure prend environ 20 à 30 minutes et n'est à effectuer qu'une seule fois.

---

🌐 **Language / Sprache / Langue / Idioma / Dil / Γλώσσα**

| | |
|---|---|
| 🇬🇧 **[English](Tesla-API-Setup)** | English version |
| 🇩🇪 **[Deutsch](DE-Tesla-API-Setup)** | Deutsche Version |
| 🇫🇷 **[Français](FR-Tesla-API-Setup)** | Vous êtes ici |
| 🇪🇸 **[Español](ES-Tesla-API-Setup)** | Versión en español |
| 🇹🇷 **[Türkçe](TR-Tesla-API-Setup)** | Türkçe sürüm |
| 🇬🇷 **[Ελληνικά](EL-Tesla-API-Setup)** | Ελληνική έκδοση |

---

## Vue d'ensemble : que se passe-t-il ici ?

Tesla utilise OAuth 2.0 — le même standard que « Se connecter avec Google ». Vous créez une application dans le portail développeur Tesla, qui reçoit un **Client ID** et un **Client Secret**. Tesla Carview les utilise pour demander l'accès aux données de votre véhicule avec votre autorisation.

```
Portail développeur Tesla
  → Enregistrer une app → obtenir Client ID + Secret
  → Saisir dans Tesla Carview
  → Cliquer sur "Connecter le compte Tesla"
  → La page de connexion Tesla s'ouvre
  → Vous approuvez l'accès
  → Tesla envoie les tokens à Tesla Carview
  → Les données arrivent ✅
```

---

## Étape 1 : Créer un compte Tesla Developer

1. Rendez-vous sur [developer.tesla.com](https://developer.tesla.com)
2. Connectez-vous avec votre compte Tesla habituel (celui que vous utilisez pour la voiture)
3. Acceptez les conditions d'utilisation développeur

---

## Étape 2 : Enregistrer votre application

1. Dans le portail développeur, cliquez sur **« Add New Application »**
2. Remplissez le formulaire :

   | Champ | Ce qu'il faut saisir |
   |---|---|
   | **Application Name** | N'importe quel nom descriptif, ex. « My Tesla Carview » |
   | **Description** | « Private self-hosted Tesla data logger » |
   | **Allowed Origin URL** | `https://tesla.votredomaine.com` |
   | **Redirect URI** | `https://tesla.votredomaine.com/api/auth/tesla/callback` |
   | **Application Type** | Web Application |

3. Sous **Scopes**, sélectionnez :
   - `vehicle_device_data` — pour lire l'état du véhicule
   - `vehicle_cmds` — pour envoyer des commandes (climatisation, verrouillage, etc.)
   - `vehicle_charging_cmds` — pour contrôler la recharge
   - `offline_access` — pour rester connecté sans se reconnecter toutes les heures

4. Cliquez sur **Save**

5. Notez votre **Client ID** et votre **Client Secret** — vous en aurez besoin à l'étape suivante

> ⚠️ **Gardez votre Client Secret privé.** Il doit être placé dans votre fichier `.env` et ne jamais être partagé ni intégré dans un dépôt git.

---

## Étape 3 : Configurer la clé virtuelle (pour les commandes)

La clé virtuelle est le mécanisme de sécurité de Tesla pour envoyer des commandes à la voiture. Sans elle, vous pouvez lire les données mais ne pouvez rien contrôler (pas de démarrage de la climatisation, pas de verrouillage/déverrouillage).

Tesla Carview génère automatiquement une clé. Il vous suffit de l'ajouter à votre voiture :

1. Dans Tesla Carview, accédez à **Paramètres → Clé virtuelle**
2. Copiez l'URL affichée (qui ressemble à `https://tesla.votredomaine.com/api/virtual-key/pair`)
3. Ouvrez cette URL dans le **navigateur Tesla de l'écran tactile de votre voiture** (pas depuis votre téléphone)
4. Appuyez sur **« Add key »** sur l'écran de la voiture
5. Confirmez depuis l'application Tesla sur votre téléphone (elle vous demande d'approuver la nouvelle clé)

Une fois la clé associée, les commandes (climatisation, verrouillage, etc.) fonctionneront depuis Tesla Carview.

---

## Étape 4 : Saisir les identifiants dans Tesla Carview

1. Accédez à **Admin → Système** dans Tesla Carview
2. Saisissez votre **Client ID** et votre **Client Secret**
3. Cliquez sur **Enregistrer**

Ou ajoutez-les directement dans le fichier `.env` :

```bash
nano /opt/tesla-carview/backend/.env
```

```env
TESLA_CLIENT_ID=your-client-id-here
TESLA_CLIENT_SECRET=your-client-secret-here
```

Puis redémarrez :
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d
```

---

## Étape 5 : Connecter votre compte Tesla

1. Dans Tesla Carview, accédez à **Tableau de bord → Connecter le compte Tesla** (ou à l'invite lors de la première connexion)
2. Cliquez sur **« Connect with Tesla »**
3. Vous êtes redirigé vers la page de connexion Tesla — connectez-vous avec votre compte Tesla
4. Tesla vous demande quel véhicule autoriser — sélectionnez votre voiture
5. Vous êtes redirigé vers Tesla Carview — la connexion est établie ✅

L'application interroge maintenant les données de votre véhicule toutes les 60 secondes lorsque la voiture est active, et suspend l'interrogation lorsque la voiture est garée et en veille (afin d'éviter de décharger la batterie).

---

## Problèmes courants

### « 403 Forbidden » sur tous les appels à l'API Tesla

Votre compte Tesla Developer est peut-être **suspendu ou soumis à une limitation de débit**. Cela se produit si :
- Trop d'appels API ont été effectués (throttling)
- Vos informations de facturation dans le portail développeur sont incomplètes
- Tesla a signalé le compte

Vérifiez sur [developer.tesla.com](https://developer.tesla.com) — si vous voyez un avis de facturation ou de suspension, résolvez d'abord ce problème.

### Le véhicule affiche « hors ligne » même en roulant

L'API Tesla a une limitation connue : certains véhicules plus récents (notamment ceux dont le VIN commence par XP7, comme la Model Y Juniper) ne renvoient pas de données GPS via l'endpoint standard. Tesla Carview utilise Fleet Telemetry pour ces véhicules. Cela est configuré automatiquement.

### Les commandes ne fonctionnent pas (« Virtual Key not paired »)

→ Recommencez l'étape 3 ci-dessus. Assurez-vous d'avoir ouvert l'URL de couplage dans le **navigateur Tesla** (pas depuis votre téléphone ou votre ordinateur).

### « Redirect URI mismatch »

L'URI de redirection dans le portail développeur Tesla doit **correspondre exactement** à ce que vous avez saisi — y compris `https://`, le bon domaine, et sans barre oblique finale.

---

## Fonctionnement de l'interrogation des données

Tesla Carview interroge votre véhicule toutes les 60 secondes par défaut lorsque la voiture est active. Lorsque la voiture est en veille (garée depuis plusieurs minutes), la fréquence d'interrogation est réduite à toutes les 10 minutes afin d'éviter de réveiller la voiture (ce qui déchargerait la batterie 12 V).

Vous pouvez ajuster l'intervalle d'interrogation dans le fichier `.env` :
```env
POLL_INTERVAL_MS=60000        # 60 secondes (défaut)
POLL_SLEEP_INTERVAL_MS=600000 # 10 minutes en veille
```
