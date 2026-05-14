🌐 **Langue :** [EN](Legal-Content) · [DE](DE-Legal-Content) · **FR** · [ES](ES-Legal-Content) · [TR](TR-Legal-Content) · [EL](EL-Legal-Content)

---

# Contenu légal (Mentions légales, Confidentialité, CGU)

Si Tesla Carview est accessible publiquement (pas uniquement sur votre réseau local), vous pouvez être légalement tenu de fournir des mentions légales, une politique de confidentialité et des conditions d'utilisation — notamment selon le droit européen (RGPD/DSGVO).

---

## Est-ce pertinent pour moi ?

**J'utilise Tesla Carview uniquement sur mon réseau local (pas de domaine public) :**
→ Pas d'obligations légales. Ignorez cette page.

**J'ai un domaine public et je suis le seul à utiliser l'application :**
→ Risque faible, mais des mentions légales sont recommandées si vous êtes en Europe/UE.

**J'utilise Tesla Carview avec ma famille ou des amis (non commercial) :**
→ Vous devriez configurer les mentions légales et la politique de confidentialité par précaution.

**Je propose une démo publique ou l'inscription ouverte :**
→ Mentions légales, politique de confidentialité et CGU sont obligatoires dans l'UE.

---

## Où configurer le contenu légal

1. Connectez-vous en tant qu'**admin**
2. Allez dans **Admin → Contenu légal**
3. Vous verrez trois sections : **Mentions légales**, **Politique de confidentialité**, **Conditions d'utilisation**

---

## Remplir les modèles

Tesla Carview fournit des modèles avec des champs à remplir marqués `<<PLACEHOLDER>>`. Vous devez renseigner :

| Espace réservé | Quoi entrer |
|---|---|
| `<<NAME>>` | Votre nom légal complet |
| `<<STREET>>` | Votre rue et numéro |
| `<<CITY>>` | Votre ville et code postal |
| `<<COUNTRY>>` | Votre pays |
| `<<EMAIL>>` | Une adresse e-mail de contact |
| `<<PHONE>>` | Numéro de téléphone (obligatoire en Allemagne) |

> ⚠️ **L'application vous avertira** si des champs `<<PLACEHOLDER>>` restent non remplis. Ne passez pas en production sans compléter tous les espaces réservés.

---

## Versionnage et publication

Le contenu légal est versionné. Quand vous effectuez des modifications :
1. Modifiez le contenu dans l'éditeur
2. Cliquez sur **"Publier une nouvelle version"**
3. Les utilisateurs qui ont accepté une version précédente sont invités à accepter la nouvelle à leur prochaine connexion

Cela crée une piste d'audit montrant qui a accepté quelle version et quand.

---

## Contenu légal multilingue

Tesla Carview gère le contenu légal dans une langue principale (allemand par défaut pour les serveurs DE) et le reflète dans les autres langues. Si vous modifiez la version allemande, les autres langues se mettent à jour automatiquement.

Si vous avez besoin de traductions personnalisées, vous pouvez modifier chaque langue séparément.

---

## Exigences minimales RGPD pour la politique de confidentialité

Si vous êtes dans l'UE, votre politique de confidentialité doit préciser :
- Quelles données personnelles vous collectez (nom d'utilisateur, e-mail, données du véhicule, localisation)
- Pourquoi vous les collectez (usage personnel, journalisation privée)
- Combien de temps vous les conservez (jusqu'à la suppression du compte ou X années)
- Qui y a accès (uniquement vous en tant qu'admin)
- Les droits des utilisateurs (accès, suppression, rectification)
- Contact pour les demandes relatives aux données (votre e-mail)

Le modèle de Tesla Carview couvre tous ces points. Il suffit de renseigner vos coordonnées.

---

## Contact opérateur (distinct des mentions légales)

Pour les demandes commerciales ou de presse, vous pouvez configurer un e-mail de contact dans le pied de page :
- **Paramètres → Contact opérateur**
- Cet e-mail apparaît dans le pied de page de l'application et est distinct des mentions légales

Il est configuré dans le fichier d'environnement frontend (pas le `.env` principal) :
```bash
# /opt/tesla-carview/frontend/.env :
VITE_OPERATOR_CONTACT_EMAIL=contact@yourdomain.com
```
