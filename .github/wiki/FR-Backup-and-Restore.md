🌐 **Langue :** [EN](Backup-and-Restore) · [DE](DE-Backup-and-Restore) · **FR** · [ES](ES-Backup-and-Restore) · [TR](TR-Backup-and-Restore) · [EL](EL-Backup-and-Restore)

---

# Sauvegarde et restauration

Vos données (trajets, historique de recharge, carnet de route, paramètres) résident dans des bases de données SQLite sur votre serveur. Des sauvegardes régulières protègent contre les pannes matérielles, les suppressions accidentelles ou la migration vers un nouveau serveur.

---

## Qu'est-ce qui doit être sauvegardé ?

| Données | Emplacement | Taille (typique) |
|---|---|---|
| Base de données principale | `/app/data/master.db` | ~1 Mo |
| Bases de données des locataires | `/app/data/tenants/*.db` | ~50 Mo par locataire (3 ans) |
| Configuration d'environnement | `/opt/tesla-carview/backend/.env` | Minuscule |
| Certificat SSL | `/etc/letsencrypt/` | Minuscule |

> Les images Docker et le code de l'application **n'ont pas besoin** d'être sauvegardés — ils peuvent être re-téléchargés depuis GitHub à tout moment.

---

## Option 1 : Sauvegarde intégrée (recommandée pour la plupart des utilisateurs)

Tesla Carview dispose d'une fonction de sauvegarde intégrée :

1. Allez dans **Admin → Data → Sauvegarde**
2. Cliquez sur **Télécharger la sauvegarde**
3. Un fichier JSON est téléchargé contenant les 25 tables de la base de données
4. Conservez-le en lieu sûr (disque externe, stockage cloud, autre appareil)

**Restaurer depuis une sauvegarde :**
1. Allez dans **Admin → Data → Restauration**
2. Téléversez le fichier JSON de sauvegarde
3. Tapez la phrase de confirmation `RESTORE`
4. La restauration se termine en quelques secondes
5. Une sauvegarde de sécurité des données actuelles est faite automatiquement avant la restauration

---

## Option 2 : Script de sauvegarde automatisé

Pour des sauvegardes sans intervention, créez une tâche cron qui enregistre une copie chaque jour :

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

# Garder uniquement les 14 derniers jours
find "$BACKUP_DIR" -name "*.db" -mtime +14 -delete
find "$BACKUP_DIR" -name "*.bak" -mtime +14 -delete
find "$BACKUP_DIR" -type d -name "tenants-*" -mtime +14 -exec rm -rf {} +

echo "Sauvegarde terminée : $DATE"
EOF

chmod +x /opt/backups/backup-tesla.sh

# Ajouter à cron (s'exécute chaque jour à 2h du matin)
echo "0 2 * * * root /opt/backups/backup-tesla.sh >> /var/log/tesla-backup.log 2>&1" > /etc/cron.d/tesla-backup
```

---

## Option 3 : Sauvegarde hors site (recommandée pour les données importantes)

Une sauvegarde sur le même serveur ne protège pas contre une panne du serveur. Copiez les sauvegardes hors site :

### Vers un serveur SSH distant / NAS

```bash
# Ajoutez à votre script de sauvegarde :
rsync -az /opt/backups/tesla-carview/ user@nas-ip:/backups/tesla-carview/
```

### Vers Hetzner Storage Box (économique, ~1 €/mois pour 100 Go)

```bash
# Ajoutez à votre script de sauvegarde :
rsync -az /opt/backups/tesla-carview/ your-storagebox.your-storagebox.de:/backups/
```

### Vers un fournisseur cloud (Backblaze B2, AWS S3)

```bash
# Installer rclone (prend en charge la plupart des fournisseurs cloud) :
curl https://rclone.org/install.sh | sudo bash
rclone config  # Configuration interactive de votre fournisseur cloud

# Ajouter au script de sauvegarde :
rclone sync /opt/backups/tesla-carview/ backblaze:my-bucket/tesla-carview/
```

---

## Migration vers un nouveau serveur

Lors d'un déménagement vers un nouveau serveur (mise à niveau matérielle, changement de VPS) :

1. **Sur l'ancien serveur :** Téléchargez une sauvegarde complète via Admin → Data → Sauvegarde
2. **Sur le nouveau serveur :** Lancez le script d'installation : `curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash`
3. Connectez-vous à la nouvelle installation
4. Allez dans **Admin → Data → Restauration** → téléversez la sauvegarde
5. Mettez à jour votre enregistrement DNS pour pointer vers la nouvelle IP du serveur
6. Mettez à jour l'URI de redirection dans le Tesla Developer Portal si votre domaine a changé

---

## Maintenance nocturne (automatique)

Tesla Carview exécute une tâche de maintenance automatique chaque nuit à 03h30 (fuseau horaire Berlin) :

- Supprime les tokens expirés et les enregistrements orphelins
- Checkpoint WAL (optimisation SQLite)
- VACUUM — récupère de l'espace disque si une base de données dépasse 50 Mo
- Si `AUTO_UPDATE_ENABLED=true` : récupère le dernier code et redémarre

Vous pouvez la déclencher manuellement :
- **Admin → Système → Lancer la maintenance maintenant**

Ou consulter le journal de maintenance :
- **Admin → Système → Journal de maintenance**

---

## Bonnes pratiques de sauvegarde

- **Règle 3-2-1 :** 3 copies, 2 types de stockage différents, 1 hors site
- Testez vos sauvegardes en les restaurant réellement (utilisez la fonction de test Admin → Restauration)
- Conservez votre sauvegarde du fichier `.env` séparément et en toute sécurité (il contient des identifiants)
- Sauvegardez avant toute mise à jour majeure ou modification de configuration
