🌐 **Langue :** [EN](Configuration) · [DE](DE-Configuration) · **FR** · [ES](ES-Configuration) · [TR](TR-Configuration) · [EL](EL-Configuration)

---

# Configuration — Variables d'environnement

Tous les paramètres de Tesla Carview sont configurés via le fichier `.env` situé à `/opt/tesla-carview/backend/.env`.

Après toute modification du `.env`, redémarrez le backend :
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d --build backend
```

---

## Paramètres requis (indispensables au fonctionnement de l'application)

| Variable | Exemple | Description |
|---|---|---|
| `JWT_SECRET` | `some-random-64-char-string` | Clé secrète pour signer les tokens de connexion. Générez avec : `openssl rand -hex 32` |
| `TESLA_CLIENT_ID` | `abc123...` | Depuis le Tesla Developer Portal |
| `TESLA_CLIENT_SECRET` | `xyz789...` | Depuis le Tesla Developer Portal |
| `FRONTEND_URL` | `https://tesla.yourdomain.com` | L'URL publique de votre installation |
| `DATABASE_PATH` | `/app/data` | Où les bases de données sont stockées (ne pas modifier avec Docker) |

---

## Optionnels mais recommandés

| Variable | Par défaut | Description |
|---|---|---|
| `AUTO_UPDATE_ENABLED` | `false` | Définir à `true` pour les mises à jour automatiques nocturnes |
| `MFA_REQUIRED_FOR_NEW_USERS` | `false` | Forcer la configuration MFA pour tous les nouveaux comptes utilisateurs |
| `REGISTRATION_REQUIRES_INVITE` | `false` | Exiger un code d'invitation pour enregistrer un nouveau locataire |
| `POLL_INTERVAL_MS` | `60000` | Fréquence d'interrogation de l'API Tesla lorsque la voiture est active (ms) |
| `POLL_SLEEP_INTERVAL_MS` | `600000` | Intervalle d'interrogation quand la voiture est en veille (ms) |

---

## Tarif dynamique (prix de l'électricité)

| Variable | Description |
|---|---|
| `AWATTAR_ENABLED` | `true`/`false` — activer aWATTar (DE/AT, gratuit) |
| `TIBBER_TOKEN` | Votre token API Tibber (obtenez-le sur [developer.tibber.com](https://developer.tibber.com)) |

---

## Mode démo

| Variable | Par défaut | Description |
|---|---|---|
| `DEMO_ENABLED` | `false` | Activer le locataire démo public avec des données fictives |
| `DEMO_MAX_CONCURRENT` | `10` | Nombre maximum d'utilisateurs démo simultanés |
| `DEMO_LIFETIME_DAYS` | `14` | Durée de vie des comptes démo |

---

## Avancé / Fleet Telemetry

| Variable | Description |
|---|---|
| `FLEET_TELEMETRY_ENABLED` | `true`/`false` — activer le GPS en temps réel via Fleet Telemetry |
| `FLEET_TELEMETRY_PORT` | Port pour le serveur Fleet Telemetry (par défaut : 4443) |
| `VIRTUAL_KEY_PRIVATE_KEY_PATH` | Chemin vers le fichier de clé privée de la Virtual Key |

---

## Comment générer un JWT_SECRET sécurisé

```bash
openssl rand -hex 32
# Résultat : quelque chose comme a8f3e9b2c1d4...
# Copiez ceci dans votre fichier .env
```

---

## Vérifier votre configuration actuelle

```bash
# Afficher le .env actuel (attention au partage — contient des secrets) :
cat /opt/tesla-carview/backend/.env

# Vérifier quelles variables d'environnement le conteneur en cours voit :
docker compose -f /opt/tesla-carview/docker-compose.prod.yml exec backend env | grep -v PASSWORD | grep -v SECRET
```

---

## Référence complète

Pour une liste complète de toutes les variables d'environnement avec des descriptions détaillées, consultez la documentation technique :
[docs/10-configuration.en.md](https://github.com/KnevS/Tesla-Carview/blob/main/docs/10-configuration.en.md)
