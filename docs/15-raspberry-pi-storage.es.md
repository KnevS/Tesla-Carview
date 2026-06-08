# Raspberry Pi: Elegir el almacenamiento adecuado — se acabó la muerte de la tarjeta SD

> 🤖 *Esta traducción al español es asistida por IA desde [15-raspberry-pi-storage.en.md](15-raspberry-pi-storage.en.md). Correcciones bienvenidas vía GitHub.*

> 🇩🇪 [Auf Deutsch lesen](15-raspberry-pi-storage.md)

Las tarjetas SD y la operación 24/7 son una mala combinación. Este capítulo explica **por qué**, qué alternativa encaja mejor con tu setup y cómo ponerla en marcha en 20 minutos.

---

## El problema: por qué las tarjetas SD no son adecuadas para servidores

Las tarjetas SD modernas suelen sobrevivir **3.000–10.000 ciclos de escritura por bloque de almacenamiento** — las más antiguas incluso menos. Parece mucho. No lo es.

| ¿Qué escribe en la tarjeta SD? | Frecuencia |
|---|---|
| Logs de contenedores Docker | Varias veces por minuto |
| Base de datos SQLite (viajes, sesiones de carga) | Cada ciclo de poll (cada 30–60 s) |
| Logs del sistema (`/var/log`) | Continuamente |
| Archivo swap del SO | Bajo presión de memoria |

**Resultado realista:** Una tarjeta SD típica bajo la carga de escritura de Tesla Carview dura **3–18 meses**, tras lo cual:
- Corrupción del sistema de archivos → el sistema no arranca
- Datos perdidos (los backups ayudan, pero el daño está hecho)
- En el peor caso: corrupción de datos silenciosa y no detectada

> **Conclusión: la tarjeta SD está bien para experimentos rápidos. Para operación permanente, sustitúyela siempre.**

---

## ¿Qué opción es la adecuada para mí?

```
¿Qué Raspberry Pi tienes?
│
├── Raspberry Pi 5
│     ├── ¿Quieres máximo rendimiento y longevidad?
│     │     → Opción B: SSD NVMe vía M.2 HAT+ ⭐ (recomendada)
│     └── ¿Simple y barato, sin montaje?
│           → Opción A: SSD USB (excelente también en Pi 5)
│
├── Raspberry Pi 4
│     ├── ¿Homelab con red Gigabit + servidor existente?
│     │     → Opción C: arranque por red PXE (no se necesita almacenamiento local)
│     └── ¿Red doméstica normal, sin servidor extra?
│           → Opción A: SSD USB (la solución más sencilla)
│
└── Raspberry Pi 3 o más antigua
      → Opción A: SSD USB (USB 2.0, más lento que Pi 4/5)
        o: Compra una Pi más nueva — Pi 4/5 es mejor inversión
```

---

## Opción A: SSD USB (la solución más sencilla para todos los modelos de Pi)

**Qué necesitas:**
- Un SSD portátil **o** un SSD de 2,5″ + adaptador USB
- Eso es todo

**Hardware recomendado (2025):**

| Producto | Precio aprox. | Notas |
|---|---|---|
| Samsung T7 (500 GB) | ~55 € | Excelente, pero la Pi 4 necesita un workaround quirk (→ abajo) |
| Crucial X6 (500 GB) | ~45 € | Fiable, sin quirks |
| WD My Passport SSD (500 GB) | ~50 € | Bien probado bajo Raspberry Pi OS |
| SSD SATA de 2,5″ + adaptador USB 3.0 UGREEN | ~35–50 € | Muy fiable, recomendado para Pi 4 |

> **Evita adaptadores baratos:** Algunos adaptadores USB-SATA sin marca tienen problemas con UASP (USB Attached SCSI Protocol) en la Pi 4. Los adaptadores de marca (UGREEN, Inateck) son más fiables.

### Paso 1: Escribir el SO en el SSD

1. Descarga **Raspberry Pi Imager**: [https://www.raspberrypi.com/software/](https://www.raspberrypi.com/software/)
2. Conecta el SSD por USB a tu ordenador habitual
3. Abre Imager:
   - **Device:** elige Raspberry Pi 4 o 5
   - **OS:** Raspberry Pi OS Lite (64-bit) — sin escritorio, ahorra recursos
   - **Storage:** tu SSD
4. Haz clic en el icono del engranaje (⚙️) → preconfigura:
   - Define el hostname (p. ej. `tesla-pi`)
   - Activa SSH
   - Introduce credenciales Wi-Fi (si no usas Ethernet)
   - Define usuario + contraseña
5. **Write** — listo en unos 5 minutos

### Paso 2: Actualizar el bootloader en la Pi 4 (sólo Pi 4, una sola vez)

La Pi 4 necesita configurarse una vez para arrancar desde USB. **La Pi 5 lo hace de fábrica — sáltate este paso.**

```bash
# Bien: arranca brevemente desde una tarjeta SD normal, luego:
sudo raspi-config
# → Advanced Options → Boot Order → USB Boot → Finish → Reboot

# O directamente vía EEPROM:
sudo rpi-eeprom-update -a
sudo reboot
```

Luego: retira la tarjeta SD, enchufa el SSD, enciende la Pi → arranca desde SSD.

### Paso 3: Quirk del Samsung T7 en la Pi 4 (si es necesario)

Si la Pi 4 no arranca con el Samsung T7 (se queda en la pantalla del rayo rojo):

```bash
# Abre /boot/firmware/cmdline.txt (¡debe quedar en una sola línea!):
sudo nano /boot/firmware/cmdline.txt

# Añade al final de la línea (con un espacio delante):
usb-storage.quirks=04e8:4001:u

# Guarda, reinicia:
sudo reboot
```

Esto desactiva UASP para el T7 — el rendimiento sigue siendo 5–10× mejor que el de una SD.

### Paso 4: Instalar Tesla Carview

A partir de aquí, sigue como se describe en [02-deployment.en.md](02-deployment.en.md):

```bash
curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
```

---

## Opción B: SSD NVMe en Raspberry Pi 5 (mejor rendimiento)

La Pi 5 tiene un **conector PCIe** — con el M.2 HAT+ oficial o un adaptador de terceros, consigues velocidades NVMe de **400–900 MB/s** (compara: tarjeta SD 20–90 MB/s).

**Qué necesitas:**

| Componente | Recomendación | Precio aprox. |
|---|---|---|
| Raspberry Pi 5 (4 GB u 8 GB RAM) | — | desde 60 € |
| **Raspberry Pi M.2 HAT+** oficial | formato 2230 o 2242 | ~15 € |
| **o** Pimoroni NVMe BASE | compacto, sin espaciadores | ~20 € |
| **o** Pineberry HatDrive Bottom | se monta bajo la Pi | ~25 € |
| SSD NVMe M.2 2230 o 2242 | WD Green SN350, Kingston NV2, Samsung PM991 | 25–60 € |

> **Comprueba el factor de forma:** El M.2 HAT+ sólo soporta **2230** y **2242** (SSDs cortos/medios). Los SSDs estándar 2280 (los largos) no encajan en el HAT+ oficial — pero algunos HATs de terceros sí los soportan.

### Paso 1: Montar el hardware

1. Desliza el SSD en el slot M.2 en ángulo, luego presiónalo plano
2. Asegúralo con el tornillo incluido
3. Conecta el cable plano FFC (HAT → conector PCIe de la Pi 5)
4. Monta el HAT sobre el header GPIO de la Pi 5

### Paso 2: Escribir el SO en el SSD NVMe

**Variante A (sencilla):** Escribe desde una Pi OS en ejecución directamente al NVMe:

```bash
# Arranca la Pi con tarjeta SD, luego:
sudo apt update && sudo apt install rpi-imager -y
rpi-imager
# → Selecciona el SSD NVMe como destino → write
```

**Variante B:** Escribe al SSD usando un adaptador USB-NVMe en un ordenador normal (igual que la Opción A).

### Paso 3: Definir el orden de arranque

```bash
sudo raspi-config
# → Advanced Options → Boot Order → NVMe/USB Boot
# → Finish → Reboot
```

Retira la tarjeta SD, reinicia la Pi → arranca desde NVMe.

### Paso 4: Optimizar la velocidad PCIe (opcional)

La Pi 5 ejecuta PCIe en Gen 2 por defecto (~400 MB/s). Gen 3 (~900 MB/s) es posible pero no está soportado oficialmente:

```bash
# /boot/firmware/config.txt:
sudo nano /boot/firmware/config.txt

# Para Gen 3 (bajo tu propia responsabilidad, normalmente estable):
dtparam=pciex1_gen=3
```

---

## Opción C: Arranque por red PXE (para entusiastas del homelab)

**¿Qué es?** La Pi no tiene almacenamiento local en absoluto. Arranca **completamente por red** desde un servidor central. Ideal cuando:
- Gestionas varias Pis
- Ya tienes disponible un NAS (Synology, TrueNAS) o un mini PC como servidor
- Prefieres backups y actualizaciones centralizados

**Requisitos:**
- Gigabit Ethernet (sin Wi-Fi — demasiado lento e inestable para PXE)
- Un servidor en la red que pueda proporcionar DHCP + TFTP (NAS, PC antiguo, Pi 4)
- Raspberry Pi 4 o 5 (la Pi 3 funciona con esfuerzo adicional)

### Setup rápido: servidor PXE con dnsmasq

En el servidor (Debian/Ubuntu o el NAS):

```bash
# Instalar dnsmasq
sudo apt install dnsmasq -y

# Crear el directorio TFTP
sudo mkdir -p /srv/tftp/rpi

# Configurar el sistema de archivos raíz NFS para la Pi:
sudo apt install nfs-kernel-server -y
sudo mkdir -p /srv/nfs/rpi

# /etc/exports:
echo "/srv/nfs/rpi *(rw,sync,no_subtree_check,no_root_squash)" | sudo tee -a /etc/exports
sudo exportfs -ra
```

**/etc/dnsmasq.conf** (modo proxy DHCP — funciona junto a tu router existente):

```ini
port=0
dhcp-range=192.168.1.0,proxy
log-dhcp
enable-tftp
tftp-root=/srv/tftp
pxe-service=0,"Raspberry Pi Boot"
```

El setup completo (copia del rootfs, configuración NFS, configuración del lado de la Pi) es extenso — sigue la documentación oficial de PXE de Raspberry Pi:
[https://www.raspberrypi.com/documentation/computers/remote-access.html#network-boot-your-raspberry-pi](https://www.raspberrypi.com/documentation/computers/remote-access.html#network-boot-your-raspberry-pi)

**¿Cuándo vale la pena PXE de verdad?** Cuando ya operas un homelab con almacenamiento centralizado. Para una única Pi, SSD USB o NVMe es más simple e igual de bueno.

---

## Migrar de tarjeta SD a SSD (instalación existente)

¿Ya ejecutas Tesla Carview en una tarjeta SD y quieres pasar a SSD? Sin problema — sin pérdida de datos:

### Paso 1: Clonar la SD al SSD

```bash
# Conecta el SSD vía USB a la Pi en marcha
# Identifica el disco destino:
lsblk
# → el SSD suele aparecer como /dev/sda

# Clona la SD al SSD (la Pi puede seguir funcionando):
sudo dd if=/dev/mmcblk0 of=/dev/sda bs=4M status=progress conv=fsync

# Redimensiona la partición del SSD para usar todo el espacio disponible:
sudo parted /dev/sda resizepart 2 100%
sudo resize2fs /dev/sda2
```

### Paso 2: Arrancar desde el SSD

Actualiza el bootloader como se describió arriba (Opción A, Paso 2), luego retira la SD — el SSD permanece conectado.

### Paso 3: Verificar

```bash
# Comprueba que arrancamos desde el SSD:
findmnt /
# → debería mostrar /dev/sda2 o nvme0n1p2, NO mmcblk0p2
```

---

## Comparativa rápida de todas las opciones

| | Tarjeta SD | SSD USB | NVMe (Pi 5) | PXE |
|---|---|---|---|---|
| **Longevidad** | ❌ Meses | ✅ Años | ✅ Años | ✅ Sin desgaste local |
| **Esfuerzo de setup** | ✅ Mínimo | ✅ Bajo | 🟡 Medio (montar HAT) | ❌ Alto |
| **Coste** | ✅ ~10 € | 🟡 ~35–60 € | 🟡 ~50–100 € | ✅ 0 € (si existe servidor) |
| **Velocidad de lectura** | 20–90 MB/s | 200–500 MB/s | 400–900 MB/s | velocidad LAN |
| **Recomendado para** | Pruebas | Pi 4 uso permanente | Pi 5 uso permanente | Homelab |

---

## Preguntas frecuentes

### "¿Tengo que quitar la tarjeta SD o puedo dejarla puesta?"

En la Pi 4: Tras la actualización del bootloader, la SD se puede quitar. La Pi siempre arrancará entonces desde USB. Si la dejas y está vacía o no es booteable, también arranca desde USB.

En la Pi 5: La SD puede permanecer insertada — tras la configuración la Pi prefiere NVMe/USB de todas formas.

### "¿De qué tamaño debe ser el SSD?"

**60–120 GB** es más que suficiente para Tesla Carview. La base de datos SQLite crece a unos cientos de MB a lo largo de años. Comprar uno más grande cuesta apenas más y da al controlador del SSD más espacio para wear levelling → mayor vida útil.

### "¿Qué pasa con los cortes de luz — pierdo datos?"

Los SSDs y SSDs NVMe son más resistentes que las tarjetas SD ante cortes de luz, pero no inmunes. Para datos importantes: **backups regulares** vía la interfaz de admin de Tesla Carview (`Admin → Datos → Backup`) o activa backups nocturnos automáticos.

### "¿Puedo usar un pendrive USB en lugar de un SSD?"

Técnicamente sí, pero **no recomendado**. Los pendrives USB normalmente no tienen algoritmos de wear levelling — mueren incluso más rápido que las tarjetas SD. La diferencia de precio con un SSD barato es mínima.

---

## Enlaces útiles

- [Descarga de Raspberry Pi Imager](https://www.raspberrypi.com/software/)
- [raspberry.tips: Arrancar Pi 4 desde SSD USB (EN)](https://raspberry.tips/en/raspberrypi-tutorials/boot-raspberry-pi-from-usb-ssd-flash-drive-pi-4-5)
- [raspberry.tips: Setup NVMe en Pi 5 + benchmarks (EN)](https://raspberry.tips/en/raspberrypi-tutorials/raspberry-pi-5-nvme-ssd-boot)
- [Documentación oficial del Pi M.2 HAT+](https://www.raspberrypi.com/documentation/accessories/m2-hat-plus.html)
- [Documentación de arranque PXE de Raspberry Pi](https://www.raspberrypi.com/documentation/computers/remote-access.html#network-boot-your-raspberry-pi)
- [Calculadora de vida útil de tarjetas SD](https://raspberry.tips/en/calculate-raspberry-pi-sd-card-lifespan-test-now)

---

*→ Volver a [02-deployment.en.md](02-deployment.en.md) | [Acceso de red](14-network-access.en.md) | [Todos los docs](README.en.md)*
