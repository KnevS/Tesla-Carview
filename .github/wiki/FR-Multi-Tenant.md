# Multi-Tenant & Utilisateurs

Tesla Carview prend en charge plusieurs comptes isolés (« tenants ») sur un seul serveur — idéal pour les familles, ou si vous souhaitez offrir le service à des proches dans le cadre de la licence non commerciale.

---

🌐 **Language / Sprache / Langue / Idioma / Dil / Γλώσσα**

| | |
|---|---|
| 🇬🇧 **[English](Multi-Tenant)** | English version |
| 🇩🇪 **[Deutsch](DE-Multi-Tenant)** | Deutsche Version |
| 🇫🇷 **[Français](FR-Multi-Tenant)** | Vous êtes ici |
| 🇪🇸 **[Español](ES-Multi-Tenant)** | Versión en español |
| 🇹🇷 **[Türkçe](TR-Multi-Tenant)** | Türkçe sürüm |
| 🇬🇷 **[Ελληνικά](EL-Multi-Tenant)** | Ελληνική έκδοση |

---

## Comprendre les tenants

Imaginez les tenants comme des appartements séparés dans le même immeuble :
- Chaque tenant possède ses propres **utilisateurs**, **véhicules** et **données**
- Les tenants ne peuvent pas accéder aux données des autres
- Un seul serveur, plusieurs environnements isolés

**Dans quels cas avez-vous besoin de plusieurs tenants ?**
- Une famille avec deux propriétaires de Tesla souhaitant des données séparées
- Vous et un ami partagez un serveur
- Vous souhaitez tester une seconde configuration sans toucher aux données de production

**Dans quels cas un seul tenant suffit-il ?**
- Vous et votre partenaire partagez une Tesla
- Vous avez plusieurs Tesla mais souhaitez centraliser toutes les données
- Utilisation individuelle

---

## La base de données principale et les bases de données des tenants

Tesla Carview utilise deux types de bases de données :

| Base de données | Emplacement | Contenu |
|---|---|---|
| `master.db` | `/app/data/master.db` | Liste des tenants, tokens utilisateurs, état OAuth |
| `{tenant-uuid}.db` | `/app/data/tenants/` | Toutes les données véhicule et utilisateur d'un tenant |

Les données de chaque tenant sont complètement isolées au niveau des fichiers.

---

## Créer un nouveau tenant

### Option 1 : Auto-inscription (si activée)

Les utilisateurs peuvent créer leur propre tenant sur `https://tesla.votredomaine.com/register` :
1. Remplir le nom du tenant, le slug (identifiant court compatible URL), le nom d'utilisateur admin et le mot de passe
2. Accepter les conditions
3. Terminé — un nouveau tenant isolé est créé

**Restreindre l'auto-inscription avec des codes d'invitation :**
Dans `.env` :
```env
REGISTRATION_REQUIRES_INVITE=true
```
Créez ensuite des codes d'invitation dans **Admin → Invitations → Créer un code d'invitation** et partagez le lien.

### Option 2 : Via l'administrateur (sans auto-inscription)

Si l'auto-inscription est désactivée, vous (en tant qu'admin) créez les tenants directement via l'API ou en activant temporairement l'inscription.

---

## Gérer les utilisateurs au sein d'un tenant

### Rôles utilisateurs

| Rôle | Ce qu'il peut faire |
|---|---|
| **Admin** | Tout — véhicules, utilisateurs, paramètres, gestion des données |
| **Utilisateur** | Consulter les données des véhicules assignés, créer des entrées dans le journal de bord |

Les administrateurs peuvent définir des autorisations supplémentaires par utilisateur, au-delà du rôle de base :

| Autorisation | Valeur par défaut pour les utilisateurs |
|---|---|
| Peut modifier les véhicules | Non |
| Peut ajouter des véhicules | Non |
| MFA obligatoire | Oui (configurable) |

### Inviter des utilisateurs

En tant qu'administrateur, invitez d'autres personnes dans votre tenant :
1. **Admin → Utilisateurs → Inviter un utilisateur**
2. Saisissez leur adresse e-mail (ou générez simplement un lien sans e-mail)
3. Définissez leurs autorisations initiales
4. Ils cliquent sur le lien et définissent leur mot de passe

### Assigner des véhicules aux utilisateurs

Un utilisateur ne peut voir que les véhicules qui lui sont assignés :
1. **Admin → Utilisateurs** → cliquez sur un utilisateur
2. Sous « Véhicules » → assignez les véhicules qu'il peut voir
3. Les modifications prennent effet immédiatement (aucune déconnexion nécessaire)

---

## Pseudonymes des tenants

Pour des raisons de confidentialité, les tenants sont identifiés par un **pseudonyme** (ex. « brave-eagle ») sur la page de connexion — pas par le vrai nom du tenant. Cela empêche la page de connexion de révéler qui gère ce serveur.

Vous pouvez modifier le pseudonyme :
- **Admin → Paramètres → Tenant → Modifier le pseudonyme**

---

## Supprimer un tenant

La suppression d'un tenant est une opération irréversible qui nécessite une confirmation :
1. **Admin → Données → Supprimer le tenant**
2. Saisissez la phrase de confirmation
3. Une sauvegarde est automatiquement créée avant la suppression

---

## Statut du tenant

Les tenants peuvent être suspendus sans être supprimés :
- **Admin → Tenants → Suspendre**
- Les tenants suspendus ne peuvent pas se connecter
- Les données sont conservées

---

## Limites techniques (serveur unique)

| Ressource | Limite pratique |
|---|---|
| Nombre de tenants | Aucune limite stricte (SQLite passe bien à l'échelle) |
| Véhicules par tenant | Aucune limite stricte |
| Utilisateurs par tenant | Aucune limite stricte |
| Taille de la base de données par tenant | ~50 Mo pour 3 ans de données (valeur typique) |

Tesla Carview n'est pas conçu pour un usage SaaS multi-tenant à grande échelle — il est destiné à un usage privé ou familial. Consultez [Licence & Utilisation](License-and-Usage) pour connaître ce qui est autorisé.
