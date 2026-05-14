🌐 **Langue :** [EN](Multi-Tenant) · [DE](DE-Multi-Tenant) · **FR** · [ES](ES-Multi-Tenant) · [TR](TR-Multi-Tenant) · [EL](EL-Multi-Tenant)

---

# Multi-locataires et utilisateurs

Tesla Carview prend en charge plusieurs comptes isolés ("locataires") sur un seul serveur — parfait pour les familles, ou si vous souhaitez offrir le service à des amis proches dans le cadre de la licence non commerciale.

---

## Comprendre les locataires

Imaginez les locataires comme des appartements séparés dans le même immeuble :
- Chaque locataire a ses propres **utilisateurs**, **véhicules** et **données**
- Les locataires ne peuvent pas voir les données des autres
- Un seul serveur, plusieurs environnements isolés

**Quand avez-vous besoin de plusieurs locataires ?**
- Famille avec deux propriétaires de Tesla qui veulent des données séparées
- Vous et un ami partagez un serveur
- Tester une seconde configuration sans toucher aux données de production

**Quand un seul locataire suffit-il ?**
- Vous et votre partenaire partagez une seule Tesla
- Vous avez plusieurs Tesla mais voulez toutes les données au même endroit
- Usage solo

---

## La base de données principale vs. les bases de données des locataires

Tesla Carview utilise deux types de bases de données :

| Base de données | Emplacement | Contient |
|---|---|---|
| `master.db` | `/app/data/master.db` | Liste des locataires, tokens utilisateurs, état OAuth |
| `{tenant-uuid}.db` | `/app/data/tenants/` | Toutes les données véhicule et utilisateur d'un locataire |

Les données de chaque locataire sont complètement isolées au niveau des fichiers.

---

## Créer un nouveau locataire

### Option 1 : Auto-inscription (si activée)

Les utilisateurs peuvent enregistrer leur propre locataire sur `https://tesla.yourdomain.com/register` :
1. Remplissez le nom du locataire, le slug (identifiant court compatible URL), le nom d'utilisateur admin et le mot de passe
2. Acceptez les conditions
3. Terminé — un nouveau locataire isolé est créé

**Restreindre l'auto-inscription avec des codes d'invitation :**
Dans `.env` :
```env
REGISTRATION_REQUIRES_INVITE=true
```
Ensuite, créez des codes d'invitation dans **Admin → Invitations → Créer un code d'invitation** et partagez le lien.

### Option 2 : Via l'admin (sans auto-inscription)

Si l'auto-inscription est désactivée, vous (en tant qu'admin) créez des locataires directement via l'API ou en activant temporairement l'inscription.

---

## Gérer les utilisateurs au sein d'un locataire

### Rôles des utilisateurs

| Rôle | Ce qu'ils peuvent faire |
|---|---|
| **Admin** | Tout — véhicules, utilisateurs, paramètres, gestion des données |
| **Utilisateur** | Consulter les données des véhicules assignés, créer des entrées dans le carnet de route |

Les admins définissent des permissions par utilisateur au-delà du rôle de base :

| Permission | Par défaut pour les utilisateurs |
|---|---|
| Peut modifier les véhicules | Non |
| Peut ajouter des véhicules | Non |
| MFA requis | Oui (configurable) |

### Inviter des utilisateurs

En tant qu'admin, invitez d'autres personnes à votre locataire :
1. **Admin → Utilisateurs → Inviter un utilisateur**
2. Entrez leur adresse e-mail (ou générez simplement un lien sans e-mail)
3. Définissez leurs permissions initiales
4. Ils cliquent sur le lien et définissent leur mot de passe

### Assigner des véhicules aux utilisateurs

Un utilisateur ne peut voir que les véhicules qui lui sont assignés :
1. **Admin → Utilisateurs** → cliquez sur un utilisateur
2. Sous "Véhicules" → assignez les véhicules qu'ils peuvent voir
3. Les modifications prennent effet immédiatement (pas besoin de se déconnecter)

---

## Pseudonymes des locataires

Pour la confidentialité, les locataires sont identifiés par un **pseudonyme** (ex. "brave-eagle") sur la page de connexion — pas par le vrai nom du locataire. Cela empêche la page de connexion de révéler qui gère ce serveur.

Vous pouvez changer le pseudonyme :
- **Admin → Paramètres → Locataire → Changer le pseudonyme**

---

## Supprimer un locataire

La suppression d'un locataire est une opération destructive et nécessite une confirmation :
1. **Admin → Data → Supprimer le locataire**
2. Tapez la phrase de confirmation
3. Une sauvegarde est créée automatiquement avant la suppression

---

## Statut du locataire

Les locataires peuvent être suspendus sans suppression :
- **Admin → Locataires → Suspendre**
- Les locataires suspendus ne peuvent pas se connecter
- Les données sont préservées

---

## Limites techniques (serveur unique)

| Ressource | Limite pratique |
|---|---|
| Nombre de locataires | Pas de limite fixe (SQLite évolue bien) |
| Véhicules par locataire | Pas de limite fixe |
| Utilisateurs par locataire | Pas de limite fixe |
| Taille de la base de données par locataire | ~50 Mo pour 3 ans de données (typique) |

Tesla Carview n'est pas conçu pour une utilisation SaaS multi-locataires à grande échelle — il est destiné à un usage privé/familial. Voir [Licence et droits d'utilisation](FR-License-and-Usage) pour ce qui est autorisé.
