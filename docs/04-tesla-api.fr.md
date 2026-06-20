# Configurer la Tesla Fleet API

> 🤖 *Cette traduction française est assistée par IA depuis [04-tesla-api.en.md](04-tesla-api.en.md). Corrections bienvenues via GitHub.*

> 🇩🇪 [Auf Deutsch lesen](04-tesla-api.md)

## Stratégie de source de données (Telemetry d'abord, polling en repli)

Depuis le passage au poller hybride (2026-05), Tesla Carview privilégie
**Fleet Telemetry (push)** par rapport au polling. Les deux chemins sont actifs, mais
le poller bascule automatiquement en mode heartbeat dès que Telemetry
diffuse pour un véhicule :

| Chemin | Latence | Coût | Prérequis |
|---|---|---|---|
| **1. Fleet Telemetry (push WebSocket)** | 1–5 s en direct | gratuit | Virtual Key approuvée + endpoint HTTPS + whitelisting Tesla par VIN |
| **2. Polling Fleet API (pull)** | 30 s en ligne / 5 min idle | budget $ par appel | Token OAuth uniquement |
| **3. Polling heartbeat** | 1×/h | minimal | Activé automatiquement quand Telemetry est actif pour un VIN |

Implémentation : `backend/src/services/poller.js`, serveur de streaming dans
`backend/src/services/fleetTelemetry.js`, indicateur de statut par VIN dans
Paramètres → ⚡ Connexion Tesla → 📡 Fleet Telemetry.

> Fleet Telemetry exige une approbation Tesla par **client ID applicatif**
> dans le Developer Portal. Sans approbation, l'API de configuration
> renvoie HTTP 404 — le chemin de polling en repli continue de fonctionner.

## Créer un compte Tesla Developer

1. Créez un compte sur https://developer.tesla.com
2. Créez une nouvelle application :
   - **Name** : Tesla Carview (ou ce que vous voulez)
   - **Allowed Origins** : `https://your-domain.com`
   - **Allowed Redirect URIs** : `https://your-domain.com/api/auth/callback`
3. Notez le **Client ID** et le **Client Secret**


---

## Enregistrement partenaire — automatique via l'assistant (recommandé)

Depuis la **v3.23.5**, vous **n'avez plus besoin d'enregistrer l'application
chez Tesla à la main avec `curl`**. L'assistant de configuration (Hub admin
→ 🛠️) s'en charge lui-même :

1. À l'étape **« Identifiants Tesla Fleet API »**, saisissez le Client ID +
   Client Secret (depuis le [portail développeur Tesla](https://developer.tesla.com)).
2. TeslaView affiche en dessous le **domaine détecté** de votre instance,
   pour une confirmation unique.
3. Cliquez sur **« 🔑 Enregistrer chez Tesla maintenant »** — ou simplement
   sur « Suivant », et l'assistant enregistre automatiquement.

En arrière-plan, le serveur obtient un jeton `client_credentials` et appelle
`POST /api/1/partner_accounts` avec votre domaine — exactement ce que ferait
un appel `curl` manuel. Le succès est mémorisé (`✓ Enregistré pour
<domaine>`) ; après un changement de domaine, l'assistant propose un
ré-enregistrement.

> Endpoint : `POST /api/fleet/partner/register`. Accessible aussi depuis
> Paramètres admin → ⚡ Connexion Tesla.

### Hygiène de sécurité

L'automatisation est conçue de sorte qu'aucun secret ne fuite et qu'aucune
mauvaise configuration ne puisse se glisser :

- **Le Client Secret ne quitte jamais le serveur.** Il est stocké chiffré
  dans `tenant_settings` (clé : `data/.encryption-key`), lu côté serveur et
  envoyé uniquement au point de terminaison de jetons de Tesla — jamais
  renvoyé au navigateur.
- **Le domaine n'est pas librement modifiable.** Le domaine d'exploitation
  (`FRONTEND_URL`) est toujours enregistré ; une valeur envoyée par le
  navigateur n'est qu'un repli si `FRONTEND_URL` est absent. Cela évite
  d'enregistrer un mauvais domaine par accident — Tesla le vérifie de toute
  façon en récupérant la clé publique sur
  `https://<domaine>/.well-known/appspecific/com.tesla.3p.public-key.pem`.
- **Administrateurs uniquement** peuvent déclencher l'enregistrement.
- **Idempotent.** Le rappeler est sans danger — Tesla met simplement à jour
  l'entrée existante.

> Si vous préférez `.env`, vous pouvez toujours y définir les identifiants
> (voir ci-dessous) — l'assistant les reprend automatiquement.

---

## Configurer le .env

```env
TESLA_CLIENT_ID=your-client-id
TESLA_CLIENT_SECRET=your-client-secret
TESLA_REDIRECT_URI=https://your-domain.com/api/auth/callback
TESLA_AUDIENCE=https://fleet-api.prd.na.vn.cloud.tesla.com
```

> **Régions** :
> - Amérique du Nord : `fleet-api.prd.na.vn.cloud.tesla.com`
> - Europe : `fleet-api.prd.eu.vn.cloud.tesla.com`
>
> Choisissez la région correspondant à la localisation de votre véhicule.

---

## Connecter un véhicule Tesla

Après vous être connecté à l'app, cliquez sur le lien **« Connecter Tesla »**
(ou directement : `https://your-domain.com/api/auth/tesla/login`).

Vous êtes redirigé vers la page de connexion Tesla. Après autorisation, le véhicule
est détecté automatiquement et la synchronisation démarre.

---

## Permissions (scopes OAuth)

| Scope | Usage |
|---|---|
| `openid` | Identité Tesla |
| `offline_access` | Refresh token (pas de reconnexion répétée) |
| `vehicle_device_data` | Lecture des données de trajet, état de charge, batterie |
| `vehicle_cmds` | Commandes véhicule (uniquement avec Virtual Key) |
| `vehicle_charging_cmds` | Commandes de charge |
| `vehicle_location` | Position GPS |

---

## Commandes véhicule (Virtual Key)

Pour les commandes telles que climatisation, klaxon ou portes, une **Virtual Key** supplémentaire est nécessaire.
Le proxy `tesla-http-proxy` signe les commandes cryptographiquement — Tesla n'accepte
que les commandes signées avec la clé appairée.

### Étapes de configuration

1. **Générer une paire de clés** :
   ```bash
   openssl ecparam -name prime256v1 -genkey -noout -out tesla_priv.pem
   openssl ec -in tesla_priv.pem -pubout -out tesla_pub.pem
   ```

2. **Servir la clé publique** à l'adresse :
   `https://your-domain.com/.well-known/appspecific/com.tesla.3p.public-key.pem`

3. **Installer `tesla-http-proxy`** et le démarrer :
   ```bash
   # télécharger le binaire depuis https://github.com/teslamotors/vehicle-command
   tesla-http-proxy -port 4443 -host 0.0.0.0 \
     -tls-key server.key -cert server.crt \
     -key-file tesla_priv.pem
   ```

4. **Enregistrer la Virtual Key sur le véhicule** via l'app (Paramètres → Virtual Key).

> **Important** : la clé privée (`tesla_priv.pem`) et la clé publique
> (`.well-known/…`) doivent rester appariées. Une nouvelle clé privée exige
> un nouvel appairage au véhicule.


---

## Intervalle de polling

Le poller intégré interroge la Tesla API :
- **Toutes les 30 secondes** quand le véhicule est actif (en roulage ou en charge)
- **Toutes les 5 minutes** quand le véhicule est endormi (statut 408)

Le poller **ne réveille pas le véhicule** — l'état de sommeil est respecté pour préserver la batterie.

Désactiver le poller (par ex. pour tests) : `ENABLE_POLLER=false` dans le `.env`.

---

## Spécificité des VIN XP7

Les véhicules dont le préfixe VIN est `XP7` (par ex. Model Y Juniper) ne supportent pas le
paramètre `?endpoints=…` sur `/vehicle_data`.

**Contournement** : appelez `/vehicle_data` sans le paramètre `endpoints` — il
renvoie `charge_state`, `climate_state` et `vehicle_state`.

Le GPS via `drive_state` n'est pas disponible pour ces véhicules à travers l'API REST ;
le GPS provient alors de Fleet Telemetry.
