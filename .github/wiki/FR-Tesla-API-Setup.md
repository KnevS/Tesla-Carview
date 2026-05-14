🌐 **Langue :** [EN](Tesla-API-Setup) · [DE](DE-Tesla-API-Setup) · **FR** · [ES](ES-Tesla-API-Setup) · [TR](TR-Tesla-API-Setup) · [EL](EL-Tesla-API-Setup)

---

# Configuration de l'API Tesla

Pour connecter Tesla Carview à votre compte Tesla, vous avez besoin d'un **compte développeur Tesla** et d'une **application OAuth**. Ce processus prend environ 20 à 30 minutes et ne doit être effectué qu'une seule fois.

---

## Vue d'ensemble : que se passe-t-il ici ?

Tesla utilise OAuth 2.0 — le même standard que "Se connecter avec Google". Vous créez une application dans le portail développeur Tesla, qui obtient un **Client ID** et un **Client Secret**. Tesla Carview les utilise pour accéder aux données de votre véhicule avec votre permission.

```
Portail développeur Tesla
  → Enregistrer l'app → obtenir Client ID + Secret
  → Saisir dans Tesla Carview
  → Cliquer "Connecter le compte Tesla"
  → Page de connexion Tesla s'ouvre
  → Vous approuvez l'accès
  → Tesla envoie les tokens à Tesla Carview
  → Les données circulent ✅
```

---

## Étape 1 : Créer un compte développeur Tesla

1. Allez sur [developer.tesla.com](https://developer.tesla.com)
2. Connectez-vous avec votre compte Tesla habituel (celui que vous utilisez pour la voiture)
3. Acceptez les conditions développeur

---

## Étape 2 : Enregistrer votre application

1. Dans le portail développeur, cliquez sur **"Add New Application"**
2. Remplissez le formulaire :

   | Champ | Quoi saisir |
   |---|---|
   | **Application Name** | N'importe quel nom descriptif, ex. "Mon Tesla Carview" |
   | **Description** | "Private self-hosted Tesla data logger" |
   | **Allowed Origin URL** | `https://tesla.votredomaine.com` |
   | **Redirect URI** | `https://tesla.votredomaine.com/api/auth/tesla/callback` |
   | **Application Type** | Web Application |

3. Sous **Scopes**, sélectionnez :
   - `vehicle_device_data` — pour lire l'état du véhicule
   - `vehicle_cmds` — pour envoyer des commandes (climatisation, serrures, etc.)
   - `vehicle_charging_cmds` — pour le contrôle de la recharge
   - `offline_access` — pour rester connecté sans se reconnecter toutes les heures

4. Cliquez **Save**

5. Notez votre **Client ID** et **Client Secret** — vous en aurez besoin à l'étape suivante

> ⚠️ **Gardez votre Client Secret confidentiel.** Il va dans votre fichier `.env` et ne doit jamais être partagé ni commité dans git.

---

## Étape 3 : Configurer la Virtual Key (pour les commandes)

La Virtual Key est le mécanisme de sécurité Tesla pour envoyer des commandes à la voiture. Sans elle, vous pouvez lire les données mais pas contrôler quoi que ce soit (pas de démarrage de la climatisation, pas de verrouillage/déverrouillage).

Tesla Carview génère automatiquement une clé. Il vous suffit de l'ajouter à votre voiture :

1. Dans Tesla Carview, allez dans **Paramètres → Virtual Key**
2. Copiez l'URL affichée (ressemble à `https://tesla.votredomaine.com/api/virtual-key/pair`)
3. Ouvrez cette URL dans le **navigateur Tesla sur l'écran tactile de votre voiture** (pas sur votre téléphone)
4. Appuyez sur **"Ajouter la clé"** sur l'écran de la voiture
5. Confirmez avec l'application Tesla sur votre téléphone (elle vous demande d'approuver la nouvelle clé)

Après le couplage, les commandes (climatisation, serrures, etc.) fonctionneront depuis Tesla Carview.

---

## Étape 4 : Saisir les identifiants dans Tesla Carview

1. Allez dans **Admin → Système** de Tesla Carview
2. Saisissez votre **Client ID** et **Client Secret**
3. Cliquez **Enregistrer**

Ou ajoutez-les directement au fichier `.env` :

```bash
nano /opt/tesla-carview/backend/.env
```

```env
TESLA_CLIENT_ID=votre-client-id-ici
TESLA_CLIENT_SECRET=votre-client-secret-ici
```

Puis redémarrez :
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d
```

---

## Étape 5 : Connecter votre compte Tesla

1. Dans Tesla Carview, allez dans **Tableau de bord → Connecter le compte Tesla** (ou l'invite à la première connexion)
2. Cliquez sur **"Se connecter avec Tesla"**
3. Vous êtes redirigé vers la page de connexion Tesla — connectez-vous avec votre compte Tesla
4. Tesla demande à quel véhicule accorder l'accès — sélectionnez votre voiture
5. Vous êtes redirigé vers Tesla Carview — la connexion est établie ✅

L'application interroge désormais les données de votre véhicule toutes les 60 secondes lorsque la voiture est active, et suspend l'interrogation lorsque la voiture est garée et en veille (pour éviter de vider la batterie).

---

## Problèmes courants

### "403 Forbidden" sur tous les appels à l'API Tesla

Votre compte développeur Tesla est peut-être **suspendu ou limité en débit**. Cela se produit si :
- Trop d'appels API ont été effectués (throttling)
- Vos informations de facturation dans le portail développeur sont incomplètes
- Tesla a marqué le compte

Vérifiez [developer.tesla.com](https://developer.tesla.com) — si vous voyez une notice de facturation ou de suspension, résolvez cela d'abord.

### Le véhicule affiche "hors ligne" même en conduisant

L'API Tesla a une limitation connue : certains véhicules récents (notamment ceux avec des VIN XP7 comme le Model Y Juniper) ne renvoient pas les données GPS via l'endpoint standard. Tesla Carview utilise Fleet Telemetry pour ces véhicules. C'est configuré automatiquement.

### Les commandes ne fonctionnent pas ("Virtual Key not paired")

→ Répétez l'étape 3 ci-dessus. Assurez-vous d'avoir ouvert l'URL de couplage dans le **navigateur Tesla** (pas sur votre téléphone ou ordinateur).

### "Redirect URI mismatch"

La Redirect URI dans le portail développeur Tesla doit **correspondre exactement** à ce que vous avez saisi — y compris `https://`, le bon domaine, et sans barre oblique finale.

---

## Comment fonctionne l'interrogation des données

Tesla Carview interroge votre véhicule toutes les 60 secondes par défaut lorsque la voiture est active. Lorsque la voiture est en veille (garée depuis plus de quelques minutes), l'interrogation ralentit à toutes les 10 minutes pour éviter de réveiller la voiture (ce qui décharge la batterie 12 V).

Vous pouvez ajuster l'intervalle d'interrogation dans le fichier `.env` :
```env
POLL_INTERVAL_MS=60000        # 60 secondes (défaut)
POLL_SLEEP_INTERVAL_MS=600000 # 10 minutes en veille
```
