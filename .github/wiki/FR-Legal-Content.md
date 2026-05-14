# Contenu juridique (Mentions légales, Politique de confidentialité, CGU)

Si Tesla Carview est accessible publiquement (pas uniquement sur votre réseau local), vous pouvez être légalement tenu de fournir des mentions légales, une politique de confidentialité et des conditions d'utilisation — en particulier selon le droit allemand et européen (DSGVO/RGPD).

---

🌐 **Language / Sprache / Langue / Idioma / Dil / Γλώσσα**

| | |
|---|---|
| 🇬🇧 **[English](Legal-Content)** | English version |
| 🇩🇪 **[Deutsch](DE-Legal-Content)** | Deutsche Version |
| 🇫🇷 **[Français](FR-Legal-Content)** | Vous êtes ici |
| 🇪🇸 **[Español](ES-Legal-Content)** | Versión en español |
| 🇹🇷 **[Türkçe](TR-Legal-Content)** | Türkçe sürüm |
| 🇬🇷 **[Ελληνικά](EL-Legal-Content)** | Ελληνική έκδοση |

---

## Cela me concerne-t-il ?

**J'utilise Tesla Carview uniquement sur mon réseau local (sans domaine public) :**
→ Aucune obligation légale. Vous pouvez ignorer cette page.

**J'ai un domaine public et je suis le seul utilisateur de l'application :**
→ Risque faible, mais des mentions légales sont recommandées si vous êtes en Allemagne ou dans l'UE.

**J'utilise Tesla Carview avec ma famille ou des amis (usage non commercial) :**
→ Vous devriez configurer des mentions légales et une politique de confidentialité par précaution.

---

## Où configurer le contenu juridique

1. Connectez-vous en tant qu'**administrateur**
2. Accédez à **Admin → Contenu juridique**
3. Vous verrez trois sections : **Mentions légales**, **Politique de confidentialité**, **Conditions d'utilisation**

---

## Remplir les modèles

Tesla Carview fournit des modèles avec des champs à compléter indiqués par `<<PLACEHOLDER>>`. Vous devez renseigner :

| Champ | Ce qu'il faut saisir |
|---|---|
| `<<NAME>>` | Votre nom légal complet |
| `<<STREET>>` | Votre rue et numéro |
| `<<CITY>>` | Votre ville et code postal |
| `<<COUNTRY>>` | Votre pays |
| `<<EMAIL>>` | Une adresse e-mail de contact |
| `<<PHONE>>` | Numéro de téléphone (obligatoire en Allemagne) |

> ⚠️ **L'application vous avertira** si des champs `<<PLACEHOLDER>>` restent non remplis. Ne rendez pas l'application publique sans avoir complété tous les champs.

---

## Gestion des versions et publication

Le contenu juridique est versionné. Lorsque vous apportez des modifications :
1. Modifiez le contenu dans l'éditeur
2. Cliquez sur **« Publier une nouvelle version »**
3. Les utilisateurs ayant accepté une version précédente seront invités à accepter la nouvelle lors de leur prochaine connexion

Cela crée une piste d'audit indiquant qui a accepté quelle version et à quelle date.

---

## Contenu juridique multilingue

Tesla Carview gère le contenu juridique dans une langue principale (l'allemand par défaut pour les serveurs DE) et le répercute dans les autres langues. Si vous modifiez la version allemande, les autres langues se mettent à jour automatiquement.

Si vous avez besoin de traductions personnalisées, vous pouvez modifier chaque langue séparément.

---

## Exigences minimales du RGPD / DSGVO pour la politique de confidentialité

Si vous êtes dans l'UE, votre politique de confidentialité doit indiquer :
- Quelles données personnelles vous collectez (nom d'utilisateur, e-mail, données du véhicule, localisation)
- Pourquoi vous les collectez (usage personnel, journalisation privée)
- Combien de temps vous les conservez (jusqu'à la suppression du compte ou X années)
- Qui y a accès (vous seul en tant qu'administrateur)
- Les droits des utilisateurs (accès, suppression, rectification)
- Un contact pour les demandes relatives aux données (votre adresse e-mail)

Le modèle de Tesla Carview couvre tous ces points. Il vous suffit de renseigner vos coordonnées.

---

## Contact de l'opérateur (distinct du contenu juridique)

Pour les demandes commerciales ou les contacts presse, vous pouvez configurer une adresse e-mail de contact dans le pied de page :
- **Paramètres → Contact de l'opérateur**
- Cette adresse apparaît dans le pied de page de l'application et est distincte des mentions légales

Cette configuration se fait dans le fichier d'environnement frontend (pas dans le fichier `.env` principal) :
```bash
# /opt/tesla-carview/frontend/.env :
VITE_OPERATOR_CONTACT_EMAIL=contact@votredomaine.com
```
