🌐 **Language / Sprache / Langue / Idioma / Dil / Γλώσσα**

| | |
|---|---|
| 🇬🇧 **[English](Home)** | English version |
| 🇩🇪 **[Deutsch](DE-Home)** | Deutsche Version |
| 🇫🇷 **[Français](FR-Home)** | Vous êtes ici |
| 🇪🇸 **[Español](ES-Home)** | Versión en español |
| 🇹🇷 **[Türkçe](TR-Home)** | Türkçe sürüm |
| 🇬🇷 **[Ελληνικά](EL-Home)** | Ελληνική έκδοση |

---

> ℹ️ **Note de langue :** Les sous-pages de ce wiki sont disponibles en **[anglais](Home)** et en **[allemand](DE-Home)**. La page d'accueil est entièrement traduite en français ; les pages de détail s'ouvrent en anglais.

# Bienvenue sur le Wiki Tesla Carview

**Tesla Carview** est une application de journalisation de données et de contrôle à hébergement autonome pour les véhicules Tesla. Vos données restent sur votre propre serveur — pas de cloud, pas d'accès tiers.

---

## ⚖️ Licence — à lire en premier

Tesla Carview est sous licence **usage privé non commercial uniquement**.

Vous pouvez :
- ✅ Faire fonctionner votre propre instance pour un usage personnel
- ✅ Modifier le code pour votre propre installation privée
- ✅ Partager le projet avec d'autres (avec attribution)

Vous ne pouvez **pas** :
- ❌ Exploiter Tesla Carview comme service payant pour d'autres
- ❌ L'utiliser commercialement (clients, SaaS, gestion de flotte rémunérée)
- ❌ Supprimer les mentions de copyright ou d'attribution

Détails complets de la licence : [Licence & Droits d'utilisation](License-and-Usage)

---

## 🗺️ Par où commencer ?

### Je suis nouveau — par où commencer ?

→ **[Guide d'installation](Installation)** — Configuration étape par étape en 30 minutes

### Tesla Carview fonctionne mais je ne peux pas y accéder de l'extérieur

→ **[Accès réseau](Network-Access)** — DynDNS, Cloudflare Tunnel, FritzBox, VPS

### Ma carte SD Raspberry Pi lâche sans cesse

→ **[Stockage Raspberry Pi](Raspberry-Pi-Storage)** — USB SSD, NVMe, démarrage PXE

### Je veux connecter mon compte Tesla

→ **[Configuration de l'API Tesla](Tesla-API-Setup)** — Compte développeur, tokens, Virtual Key

### Je veux comprendre toutes les fonctionnalités

→ **[Aperçu des fonctionnalités](Features)** — Tableau de bord, trajets, recharge, contrôles et plus

### J'ai plusieurs utilisateurs ou je veux configurer pour la famille

→ **[Multi-locataire & Utilisateurs](Multi-Tenant)** — Locataires, invitations, permissions

### Quelque chose ne fonctionne pas

→ **[Dépannage](Troubleshooting)** — Problèmes courants et solutions

---

## 🔑 En un coup d'œil

| Fonctionnalité | Détails |
|---|---|
| **Plateforme** | Serveur Linux, Raspberry Pi, VPS |
| **Stockage** | SQLite (par locataire, aucune base de données externe requise) |
| **Authentification** | Nom d'utilisateur/mot de passe, Passkeys, MFA (TOTP) |
| **API** | Tesla Fleet API (officielle), Virtual Key pour les commandes |
| **Langues** | DE, EN, FR, ES, TR, EL |
| **Licence** | Usage privé non commercial |

---

## 📂 Pour les experts informatiques

Ce wiki est le point d'entrée guidé. Si vous préférez lire du Markdown brut avec tous les détails techniques, tout se trouve dans le dépôt :

| Ressource | Lien |
|---|---|
| Index de la documentation technique | [docs/README.en.md](https://github.com/KnevS/Tesla-Carview/blob/main/docs/README.en.md) |
| Toutes les variables d'environnement | [docs/10-configuration.en.md](https://github.com/KnevS/Tesla-Carview/blob/main/docs/10-configuration.en.md) |
| Architecture de sécurité | [docs/05-security-architecture.en.md](https://github.com/KnevS/Tesla-Carview/blob/main/docs/05-security-architecture.en.md) |
| Sauvegarde & opérations | [docs/11-operations.en.md](https://github.com/KnevS/Tesla-Carview/blob/main/docs/11-operations.en.md) |

---

*Ce wiki est généré automatiquement depuis le dépôt. Dernière mise à jour : voir les [commits](https://github.com/KnevS/Tesla-Carview/commits/main).*
