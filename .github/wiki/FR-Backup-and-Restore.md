# Sauvegarde & Restauration

Vos données (trajets, historique de recharge, journal de bord, paramètres) sont stockées dans des bases de données SQLite sur votre serveur. Des sauvegardes régulières vous protègent contre les pannes matérielles, les suppressions accidentelles ou les migrations vers un nouveau serveur.

---

🌐 **Language / Sprache / Langue / Idioma / Dil / Γλώσσα**

| | |
|---|---|
| 🇬🇧 **[English](Backup-and-Restore)** | English version |
| 🇩🇪 **[Deutsch](DE-Backup-and-Restore)** | Deutsche Version |
| 🇫🇷 **[Français](FR-Backup-and-Restore)** | Vous êtes ici |
| 🇪🇸 **[Español](ES-Backup-and-Restore)** | Versión en español |
| 🇹🇷 **[Türkçe](TR-Backup-and-Restore)** | Türkçe sürüm |
| 🇬🇷 **[Ελληνικά](EL-Backup-and-Restore)** | Ελληνική έκδοση |

---

## Que faut-il sauvegarder ?

| Données | Emplacement | Taille (typique) |
|---|---|---|
| Base de données principale | `/app/data/master.db` | ~1 Mo |
| Bases de données des tenants | `/app/data/tenants/*.db` | ~50 Mo par tenant (3 ans) |
| Configuration d'environnement | `/opt/tesla-carview/backend/.env` | Quelques Ko |
| Certificat SSL | `/etc/letsencrypt/` | Quelques Ko |

> Les images Docker et le code de l'application **n'ont pas besoin** d'être sauvegardés — ils peuvent être téléchargés à nouveau depuis GitHub à tout moment.

---

## Option 1 : Sauvegarde intégrée à l'application (recommandée pour la plupart des utilisateurs)

Tesla Carview dispose d'une fonction de sauvegarde intégrée :

1. Accédez à **Admin → Données → Sauvegarde**
2. Cliquez sur **Télécharger la sauvegarde**
3. Un fichier JSON contenant l'intégralité des 25 tables de la base de données est téléchargé
4. Conservez-le en lieu sûr (disque externe, stockage cloud, autre appareil)

**Restauration depuis une sauvegarde :**
1. Accédez à **Admin → Données → Restauration**
2. Téléversez le fichier JSON de sauvegarde
3. Saisissez la phrase de confirmation `RESTORE`
4. La restauration se termine en quelques secondes
5. Une sauvegarde de sécurité des données actuelles est automatiquement créée avant la restauration

---

## Option 2 : Script de sauvegarde automatisé

Pour des sauvegardes sans intervention manuelle, créez une tâche cron qui enregistre une copie quotidiennement :

```bash
# Créer le répertoire de sauvegarde
mkdir -p /opt/backups/tesla-carview

# Créer le script de sauvegarde
cat > /opt/backups/backup-tesla.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d-%H%M)
BACKUP_DIR="/opt/backups/tesla-carview"
DATA_DIR="/var/lib/docker/volumes/tesla_data/_data"

# Copier les bases de données
cp "$DATA_DIR/master.db" "$BACKUP_DIR/master-$DATE.db"
cp -r "$DATA_DIR/tenants" "$BACKUP_DIR/tenants-$DATE/"
cp "/opt/tesla-carview/backend/.env" "$BACKUP_DIR/env-$DATE.bak"

# Conserver uniquement les 14 derniers jours
find "$BACKUP_DIR" -name "*.db" -mtime +14 -delete
find "$BACKUP_DIR" -name "*.bak" -mtime +14 -delete
find "$BACKUP_DIR" -type d -name "tenants-*" -mtime +14 -exec rm -rf {} +

echo "Backup done: $DATE"
EOF

chmod +x /opt/backups/backup-tesla.sh

# Ajouter à cron (s'exécute tous les jours à 2h du matin)
echo "0 2 * * * root /opt/backups/backup-tesla.sh >> /var/log/tesla-backup.log 2>&1" > /etc/cron.d/tesla-backup
```

---

## Option 3 : Sauvegarde hors site (recommandée pour les données importantes)

Une sauvegarde sur le même serveur ne vous protège pas contre une panne du serveur. Copiez vos sauvegardes hors site :

### Vers un serveur SSH distant / NAS

```bash
# À ajouter à votre script de sauvegarde :
rsync -az /opt/backups/tesla-carview/ user@nas-ip:/backups/tesla-carview/
```

### Vers Hetzner Storage Box (peu coûteux, ~1 €/mois pour 100 Go)

```bash
# À ajouter à votre script de sauvegarde :
rsync -az /opt/backups/tesla-carview/ your-storagebox.your-storagebox.de:/backups/
```

### Vers un fournisseur cloud (Backblaze B2, AWS S3)

```bash
# Installez rclone (compatible avec la plupart des fournisseurs cloud) :
curl https://rclone.org/install.sh | sudo bash
rclone config  # Configuration interactive pour votre fournisseur cloud

# À ajouter au script de sauvegarde :
rclone sync /opt/backups/tesla-carview/ backblaze:my-bucket/tesla-carview/
```

---

## Migration vers un nouveau serveur

Lorsque vous changez de serveur (mise à niveau matérielle, changement de VPS) :

1. **Sur l'ancien serveur :** Téléchargez une sauvegarde complète via Admin → Données → Sauvegarde
2. **Sur le nouveau serveur :** Lancez le script d'installation : `curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash`
3. Connectez-vous à la nouvelle installation
4. Accédez à **Admin → Données → Restauration** → téléversez la sauvegarde
5. Mettez à jour votre enregistrement DNS pour pointer vers l'IP du nouveau serveur
6. Mettez à jour l'URI de redirection dans le portail développeur Tesla si votre domaine a changé

---

## Maintenance nocturne (automatique)

Tesla Carview exécute automatiquement une tâche de maintenance chaque nuit à 03h30 (fuseau horaire de Berlin) :

- Supprime les tokens expirés et les enregistrements orphelins
- WAL checkpoint (optimisation SQLite)
- VACUUM — récupère l'espace disque si une base de données dépasse 50 Mo
- Si `AUTO_UPDATE_ENABLED=true` : télécharge le dernier code et redémarre

Vous pouvez la déclencher manuellement :
- **Admin → Système → Lancer la maintenance maintenant**

Ou consulter le journal de maintenance :
- **Admin → Système → Journal de maintenance**

---

## Bonnes pratiques de sauvegarde

- **Règle 3-2-1 :** 3 copies, 2 types de stockage différents, 1 hors site
- Testez vos sauvegardes en effectuant une restauration réelle (utilisez la fonction de test Admin → Restauration)
- Conservez votre sauvegarde du fichier `.env` séparément et en sécurité (il contient des identifiants)
- Effectuez une sauvegarde avant toute mise à jour majeure ou modification de configuration
