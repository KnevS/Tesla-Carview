🌐 **Language / Sprache / Langue / Idioma / Dil / Γλώσσα**

| | |
|---|---|
| 🇬🇧 **[English](Backup-and-Restore)** | English version |
| 🇩🇪 **[Deutsch](DE-Backup-and-Restore)** | Deutsche Version |
| 🇫🇷 **[Français](FR-Backup-and-Restore)** | Version française |
| 🇪🇸 **[Español](ES-Backup-and-Restore)** | Estás aquí |
| 🇹🇷 **[Türkçe](TR-Backup-and-Restore)** | Türkçe sürüm |
| 🇬🇷 **[Ελληνικά](EL-Backup-and-Restore)** | Ελληνική έκδοση |

---

# Copia de seguridad y restauración

Sus datos (viajes, historial de carga, libro de servicio, ajustes) residen en bases de datos SQLite en su servidor. Las copias de seguridad periódicas protegen contra fallos de hardware, eliminaciones accidentales o la migración a un nuevo servidor.

---

## ¿Qué necesita respaldo?

| Datos | Ubicación | Tamaño (típico) |
|---|---|---|
| Base de datos maestra | `/app/data/master.db` | ~1 MB |
| Bases de datos de los tenants | `/app/data/tenants/*.db` | ~50 MB por tenant (3 años) |
| Configuración del entorno | `/opt/tesla-carview/backend/.env` | Mínimo |
| Certificado SSL | `/etc/letsencrypt/` | Mínimo |

> Las imágenes Docker y el código de la aplicación **no** necesitan respaldo — pueden volver a descargarse desde GitHub en cualquier momento.

---

## Opción 1: Copia de seguridad integrada en la aplicación (recomendada para la mayoría de los usuarios)

Tesla Carview tiene una función de copia de seguridad integrada:

1. Vaya a **Admin → Datos → Copia de seguridad**
2. Haga clic en **Descargar copia de seguridad**
3. Se descarga un archivo JSON que contiene las 25 tablas de la base de datos
4. Guárdelo en un lugar seguro (disco externo, almacenamiento en la nube, otro dispositivo)

**Restaurar desde la copia de seguridad:**
1. Vaya a **Admin → Datos → Restaurar**
2. Cargue el archivo JSON de la copia de seguridad
3. Escriba la frase de confirmación `RESTORE`
4. La restauración se completa en segundos
5. Se realiza automáticamente una copia de seguridad de los datos actuales antes de restaurar

---

## Opción 2: Script de copia de seguridad automatizado

Para copias de seguridad sin intervención manual, cree un trabajo cron que guarde una copia diariamente:

```bash
# Crear directorio de copia de seguridad
mkdir -p /opt/backups/tesla-carview

# Crear script de copia de seguridad
cat > /opt/backups/backup-tesla.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d-%H%M)
BACKUP_DIR="/opt/backups/tesla-carview"
DATA_DIR="/var/lib/docker/volumes/tesla_data/_data"

# Copiar bases de datos
cp "$DATA_DIR/master.db" "$BACKUP_DIR/master-$DATE.db"
cp -r "$DATA_DIR/tenants" "$BACKUP_DIR/tenants-$DATE/"
cp "/opt/tesla-carview/backend/.env" "$BACKUP_DIR/env-$DATE.bak"

# Conservar solo los últimos 14 días
find "$BACKUP_DIR" -name "*.db" -mtime +14 -delete
find "$BACKUP_DIR" -name "*.bak" -mtime +14 -delete
find "$BACKUP_DIR" -type d -name "tenants-*" -mtime +14 -exec rm -rf {} +

echo "Copia de seguridad completada: $DATE"
EOF

chmod +x /opt/backups/backup-tesla.sh

# Añadir al cron (se ejecuta diariamente a las 2 AM)
echo "0 2 * * * root /opt/backups/backup-tesla.sh >> /var/log/tesla-backup.log 2>&1" > /etc/cron.d/tesla-backup
```

---

## Opción 3: Copia de seguridad externa (recomendada para datos importantes)

Una copia de seguridad en el mismo servidor no protege contra fallos del servidor. Copie las copias de seguridad a un lugar externo:

### En un servidor SSH remoto / NAS

```bash
# Añada a su script de copia de seguridad:
rsync -az /opt/backups/tesla-carview/ user@nas-ip:/backups/tesla-carview/
```

### En Hetzner Storage Box (económico, ~1€/mes por 100 GB)

```bash
# Añada a su script de copia de seguridad:
rsync -az /opt/backups/tesla-carview/ your-storagebox.your-storagebox.de:/backups/
```

### En un proveedor de nube (Backblaze B2, AWS S3)

```bash
# Instale rclone (compatible con la mayoría de proveedores de nube):
curl https://rclone.org/install.sh | sudo bash
rclone config  # Configuración interactiva para su proveedor de nube

# Añada al script de copia de seguridad:
rclone sync /opt/backups/tesla-carview/ backblaze:my-bucket/tesla-carview/
```

---

## Migrar a un nuevo servidor

Al trasladarse a un nuevo servidor (actualización de hardware, cambio de VPS):

1. **En el servidor antiguo:** Descargue una copia de seguridad completa mediante Admin → Datos → Copia de seguridad
2. **En el nuevo servidor:** Ejecute el script de instalación: `curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash`
3. Inicie sesión en la nueva instalación
4. Vaya a **Admin → Datos → Restaurar** → cargue la copia de seguridad
5. Actualice su registro DNS para que apunte a la IP del nuevo servidor
6. Actualice el Redirect URI en el Portal de Desarrolladores de Tesla si su dominio ha cambiado

---

## Mantenimiento nocturno (automático)

Tesla Carview ejecuta una tarea de mantenimiento automática cada noche a las 03:30 (zona horaria de Berlín):

- Elimina tokens caducados y registros huérfanos
- WAL checkpoint (optimización de SQLite)
- VACUUM — recupera espacio en disco si una base de datos supera los 50 MB
- Si `AUTO_UPDATE_ENABLED=true`: obtiene el código más reciente y reinicia

Puede activarlo manualmente:
- **Admin → Sistema → Ejecutar mantenimiento ahora**

O ver el registro de mantenimiento:
- **Admin → Sistema → Registro de mantenimiento**

---

## Buenas prácticas de copia de seguridad

- **Regla 3-2-1:** 3 copias, 2 tipos de almacenamiento diferentes, 1 copia externa
- Pruebe sus copias de seguridad restaurando realmente una (use la función de prueba de Admin → Restaurar)
- Guarde la copia de seguridad de su archivo `.env` por separado y de forma segura (contiene credenciales)
- Realice una copia de seguridad antes de cualquier actualización importante o cambio de configuración
