# Authentification & MFA

> 🤖 *Cette traduction française est assistée par IA depuis [03-authentication.en.md](03-authentication.en.md). Corrections bienvenues via GitHub.*

> 🇩🇪 [Auf Deutsch lesen](03-authentication.md)

## Flux de connexion

```
[Navigateur]  POST /api/auth/login  { username, password }

  Cas A : pas de MFA
  <-- { accessToken, user }
  redirection vers le tableau de bord

  Cas B : MFA activé
  <-- { requiresMfa: true, tempToken }  (valide 5 min)
  redirection vers la saisie MFA

  POST /api/auth/mfa/verify  { tempToken, code }
  <-- { accessToken, user }
  redirection vers le tableau de bord
```

## Concept de tokens

| Token | Stockage | Validité | Usage |
|---|---|---|---|
| **Access token** | Mémoire JS (Pinia) | 15 minutes | Requêtes API en en-tête `Bearer` |
| **Refresh token** | Cookie httpOnly | 7 jours | Obtenir un nouvel access token |
| **Temp token** | Mémoire JS | 5 minutes | Uniquement pour la vérification MFA |

**Pourquoi pas localStorage ?** localStorage est lisible par JavaScript et donc vulnérable au XSS.
L'access token en mémoire disparaît à la fermeture de l'onglet, le cookie httpOnly non.
Le cookie de refresh ne peut pas être lu par JavaScript.

## Configurer le MFA

### En tant qu'utilisateur

1. Ouvrez **Paramètres** (⚙️)
2. Cliquez sur **« Activer le MFA »**
3. Scannez le QR code avec une app d'authentification :
   - [Google Authenticator](https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2) (Android/iOS)
   - [Authy](https://authy.com/) (Android/iOS/Desktop, avec sauvegarde)
   - [1Password](https://1password.com/) (TOTP intégré)
   - [Bitwarden](https://bitwarden.com/) (TOTP intégré)
4. Saisissez le code à 6 chiffres affiché
5. **Sauvegardez les 10 codes de secours** (affichés une seule fois !)
   - Conservez-les dans un gestionnaire de mots de passe
   - Ou imprimez-les et rangez-les en lieu sûr

### Codes de secours

- Chaque code est **à usage unique**
- Format : `XXXX-XXXX` (8 caractères hex avec tiret)
- À saisir à la place du code TOTP quand vous n'avez pas accès à l'app
- Compteur de codes restants visible dans les paramètres
- Une fois épuisés : désactivez le MFA et reconfigurez-le

## Créer un utilisateur (admin)

Seuls les utilisateurs ayant le rôle `admin` peuvent créer de nouveaux utilisateurs :

```bash
# directement via l'API (mot de passe ≥ 12 caractères) :
curl -X POST https://your-domain.com/api/users \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"username": "karin", "password": "strongPassword123!", "role": "user"}'
```

## Passkeys (sans mot de passe)

Tesla Carview prend en charge les passkeys WebAuthn/FIDO2 comme alternative aux mots de passe :

1. Ouvrez **Paramètres → Passkeys**
2. Cliquez sur **« + Ajouter une passkey »** — la boîte de dialogue du navigateur s'ouvre
3. Confirmez avec Face ID, Touch ID ou une clé de sécurité
4. Désormais : choisissez **« Se connecter avec passkey »** sur la page de connexion

Les passkeys sont résistantes au phishing et ne nécessitent aucun mot de passe.

## Connexion SSO via QR (pour le navigateur de l'écran Tesla)

Le navigateur intégré aux écrans Tesla ne supporte pas WebAuthn/Face ID.
Avec le flux d'appairage par QR, vous pouvez tout de même vous connecter via Passkey/Face ID :

```
[Navigateur Tesla]            [Smartphone]
  ouvrir la page de login
  « Se connecter avec smartphone »
  afficher QR code ──────────── scanner
  (sondage toutes les 2 s)      ouvrir /pair/{token}
                                appuyer sur « Confirmer avec passkey »
                                Face ID / Touch ID ✓
                                POST /api/pair/confirm/{token}
  session confirmée ◄──────────
  recevoir JWT
  ouvrir le tableau de bord
```

**Étape par étape :**

1. Dans le navigateur Tesla, appuyez sur **« Se connecter avec smartphone »**
2. Un QR code apparaît (valide 5 minutes)
3. Scannez le QR code avec la caméra de votre smartphone
4. `https://your-domain.com/pair/{token}` s'ouvre sur le téléphone
5. Appuyez sur **« Confirmer avec passkey »** → Face ID / Touch ID
6. Le navigateur Tesla se connecte automatiquement

**Propriétés de sécurité :**
- Token : valeur aléatoire 256 bits, indevinable
- TTL : 5 minutes, usage unique
- Périmètre du tenant : le token n'est valide que pour votre propre tenant
- La passkey sur le smartphone vérifie l'identité côté serveur

**Prérequis :** Au moins une passkey doit être enregistrée au préalable sur le smartphone (Paramètres → Passkeys).

## Exigences sur le mot de passe

- Au moins **12 caractères**
- Au plus 256 caractères
- Pas d'autres exigences sur les classes de caractères (la longueur compte plus que la complexité)
- Recommandation : une phrase de passe de 4+ mots aléatoires
