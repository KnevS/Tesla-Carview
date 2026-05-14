🌐 **Idioma:** [EN](Backup-and-Restore) · [DE](DE-Backup-and-Restore) · [FR](FR-Backup-and-Restore) · **ES** · [TR](TR-Backup-and-Restore) · [EL](EL-Backup-and-Restore)

---

# Backup y restauración

Tus datos (viajes, historial de carga, libro de registros, ajustes) residen en bases de datos SQLite en tu servidor. Los backups regulares protegen contra fallos de hardware, eliminaciones accidentales o migración a un nuevo servidor.

---

## ¿Qué necesita hacerse backup?

| Datos | Ubicación | Tamaño (típico) |
|---|---|---|
| Base de datos maestra | `/app/data/master.db` | ~1 MB |
| Bases de datos de inquilinos | `/app/data/tenants/*.db` | ~50 MB por inquilino (3 años) |
| Configuración de entorno | `/opt/tesla-carview/backend/.env` | Mínimo |
| Certificado SSL | `/etc/letsencrypt/` | Mínimo |

> Las imágenes Docker y el código de la app **no** necesitan backup — se pueden volver a descargar desde GitHub en cualquier momento.

---

## Opción 1: Backup integrado en la app (recomendado para la mayoría)

Tesla Carview tiene una función de backup integrada:

1. Ve a **Admin → Data → Backup**
2. Haz clic en **Descargar backup**
3. Se descarga un archivo JSON con las 25 tablas de la base de datos
4. Guárdalo en un lugar seguro (disco externo, almacenamiento en la nube, otro dispositivo)

**Restaurar desde backup:**
1. Ve a **Admin → Data → Restaurar**
2. Sube el archivo JSON de backup
3. Escribe la frase de confirmación `RESTORE`
4. La restauración se completa en segundos
5. Se hace automáticamente un backup de seguridad de los datos actuales antes de restaurar

---

## Opción 2: Script de backup automatizado

Para backups sin intervención, crea un cron job que guarde una copia diaria:

```bash
# Crear directorio de backup
mkdir -p /opt/backups/tesla-carview

# Crear script de backup
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

echo "Backup completado: $DATE"
EOF

chmod +x /opt/backups/backup-tesla.sh

# Añadir a cron (se ejecuta diariamente a las 2 AM)
echo "0 2 * * * root /opt/backups/backup-tesla.sh >> /var/log/tesla-backup.log 2>&1" > /etc/cron.d/tesla-backup
```

---

## Opción 3: Backup externo (recomendado para datos importantes)

Un backup en el mismo servidor no protege contra un fallo del servidor. Copia los backups a un lugar externo:

### A un servidor SSH remoto / NAS

```bash
# Añadir a tu script de backup:
rsync -az /opt/backups/tesla-carview/ user@nas-ip:/backups/tesla-carview/
```

### A Hetzner Storage Box (económico, ~1 €/mes por 100 GB)

```bash
# Añadir a tu script de backup:
rsync -az /opt/backups/tesla-carview/ your-storagebox.your-storagebox.de:/backups/
```

### A un proveedor cloud (Backblaze B2, AWS S3)

```bash
# Instalar rclone (soporta la mayoría de proveedores cloud):
curl https://rclone.org/install.sh | sudo bash
rclone config  # Configuración interactiva para tu proveedor cloud

# Añadir al script de backup:
rclone sync /opt/backups/tesla-carview/ backblaze:mi-bucket/tesla-carview/
```

---

## Migrar a un nuevo servidor

Al mudarse a un nuevo servidor (actualización de hardware, cambio de VPS):

1. **En el servidor antiguo:** Descarga un backup completo via Admin → Data → Backup
2. **En el nuevo servidor:** Ejecuta el script de instalación: `curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash`
3. Inicia sesión en la nueva instalación
4. Ve a **Admin → Data → Restaurar** → sube el backup
5. Actualiza tu registro DNS para apuntar a la IP del nuevo servidor
6. Actualiza el Redirect URI en el Tesla Developer Portal si tu dominio cambió

---

## Mantenimiento nocturno (automático)

Tesla Carview ejecuta una tarea de mantenimiento automática cada noche a las 03:30 (zona horaria Berlin):

- Elimina tokens expirados y registros huérfanos
- Checkpoint WAL (optimización SQLite)
- VACUUM — recupera espacio en disco si una base de datos supera los 50 MB
- Si `AUTO_UPDATE_ENABLED=true`: descarga el último código y reinicia

Puedes activarlo manualmente:
- **Admin → Sistema → Ejecutar mantenimiento ahora**

O ver el log de mantenimiento:
- **Admin → Sistema → Log de mantenimiento**

---

## Buenas prácticas de backup

- **Regla 3-2-1:** 3 copias, 2 tipos de almacenamiento diferentes, 1 fuera del sitio
- Prueba tus backups restaurándolos realmente (usa la función de prueba de Admin → Restaurar)
- Guarda tu backup del archivo `.env` de forma separada y segura (contiene credenciales)
- Haz backup antes de cualquier actualización importante o cambio de configuración
