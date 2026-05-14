# Configuration — Variables d'environnement

Tous les paramètres de Tesla Carview sont configurés via le fichier `.env` situé à `/opt/tesla-carview/backend/.env`.

Après toute modification du fichier `.env`, redémarrez le backend :
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d --build backend
```

---

🌐 **Language / Sprache / Langue / Idioma / Dil / Γλώσσα**

| | |
|---|---|
| 🇬🇧 **[English](Configuration)** | English version |
| 🇩🇪 **[Deutsch](DE-Configuration)** | Deutsche Version |
| 🇫🇷 **[Français](FR-Configuration)** | Vous êtes ici |
| 🇪🇸 **[Español](ES-Configuration)** | Versión en español |
| 🇹🇷 **[Türkçe](TR-Configuration)** | Türkçe sürüm |
| 🇬🇷 **[Ελληνικά](EL-Configuration)** | Ελληνική έκδοση |

---

## Paramètres obligatoires (requis pour le fonctionnement de l'application)

| Variable | Exemple | Description |
|---|---|---|
| `JWT_SECRET` | `some-random-64-char-string` | Clé secrète pour la signature des tokens de connexion. Générez-la avec : `openssl rand -hex 32` |
| `TESLA_CLIENT_ID` | `abc123...` | Fourni par le portail développeur Tesla |
| `TESLA_CLIENT_SECRET` | `xyz789...` | Fourni par le portail développeur Tesla |
| `FRONTEND_URL` | `https://tesla.votredomaine.com` | L'URL publique de votre installation |
| `DATABASE_PATH` | `/app/data` | Emplacement de stockage des bases de données (ne pas modifier dans Docker) |

---

## Paramètres optionnels mais recommandés

| Variable | Défaut | Description |
|---|---|---|
| `AUTO_UPDATE_ENABLED` | `false` | Définir à `true` pour des mises à jour automatiques nocturnes |
| `MFA_REQUIRED_FOR_NEW_USERS` | `false` | Imposer la configuration MFA pour tous les nouveaux comptes utilisateurs |
| `REGISTRATION_REQUIRES_INVITE` | `false` | Exiger un code d'invitation pour créer un nouveau tenant |
| `POLL_INTERVAL_MS` | `60000` | Fréquence d'interrogation de l'API Tesla quand la voiture est active (en ms) |
| `POLL_SLEEP_INTERVAL_MS` | `600000` | Intervalle d'interrogation quand la voiture est en veille (en ms) |

---

## Tarif dynamique (prix de l'électricité)

| Variable | Description |
|---|---|
| `AWATTAR_ENABLED` | `true`/`false` — activer aWATTar (DE/AT, gratuit) |
| `TIBBER_TOKEN` | Votre token API Tibber (à obtenir sur [developer.tibber.com](https://developer.tibber.com)) |

---

## Avancé / Fleet Telemetry

| Variable | Description |
|---|---|
| `FLEET_TELEMETRY_ENABLED` | `true`/`false` — activer le GPS en temps réel via Fleet Telemetry |
| `FLEET_TELEMETRY_PORT` | Port du serveur Fleet Telemetry (défaut : 4443) |
| `VIRTUAL_KEY_PRIVATE_KEY_PATH` | Chemin vers le fichier de clé privée de la clé virtuelle |

---

## Comment générer un JWT_SECRET sécurisé

```bash
openssl rand -hex 32
# Résultat : quelque chose comme a8f3e9b2c1d4...
# Copiez cette valeur dans votre fichier .env
```

---

## Vérifier votre configuration actuelle

```bash
# Afficher le fichier .env actuel (attention à ne pas partager le résultat — il contient des secrets) :
cat /opt/tesla-carview/backend/.env

# Vérifier les variables d'environnement vues par le conteneur en cours d'exécution :
docker compose -f /opt/tesla-carview/docker-compose.prod.yml exec backend env | grep -v PASSWORD | grep -v SECRET
```

---

## Référence complète

Pour la liste exhaustive de toutes les variables d'environnement avec des descriptions détaillées, consultez la documentation technique :
[docs/10-configuration.en.md](https://github.com/KnevS/Tesla-Carview/blob/main/docs/10-configuration.en.md)
