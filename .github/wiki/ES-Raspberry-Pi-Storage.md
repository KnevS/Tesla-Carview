🌐 **Language / Sprache / Langue / Idioma / Dil / Γλώσσα**

| | |
|---|---|
| 🇬🇧 **[English](Raspberry-Pi-Storage)** | English version |
| 🇩🇪 **[Deutsch](DE-Raspberry-Pi-Storage)** | Deutsche Version |
| 🇫🇷 **[Français](FR-Raspberry-Pi-Storage)** | Version française |
| 🇪🇸 **[Español](ES-Raspberry-Pi-Storage)** | Estás aquí |
| 🇹🇷 **[Türkçe](TR-Raspberry-Pi-Storage)** | Türkçe sürüm |
| 🇬🇷 **[Ελληνικά](EL-Raspberry-Pi-Storage)** | Ελληνική έκδοση |

---

# Almacenamiento en Raspberry Pi — Fin de la muerte de las tarjetas SD

Las tarjetas SD y la operación de servidores 24/7 son una mala combinación. Esta página explica por qué y le guía hacia la alternativa correcta para su configuración — paso a paso.

---

## Por qué fallan las tarjetas SD

Las tarjetas SD modernas sobreviven **3.000–10.000 ciclos de escritura por bloque**. Parece mucho. No lo es.

| ¿Qué escribe en la tarjeta SD? | ¿Con qué frecuencia? |
|---|---|
| Registros de contenedores Docker | Varias veces por minuto |
| Base de datos SQLite (viajes, sesiones de carga) | Cada 30–60 segundos |
| Registros del sistema (`/var/log`) | Continuamente |
| Swap del SO | Bajo presión de memoria |

**Resultado real:** Bajo la carga de escritura de Tesla Carview, una tarjeta SD típica dura **3–18 meses**, luego:
- Corrupción del sistema de archivos → el sistema no arranca
- Datos perdidos (las copias de seguridad ayudan, pero el daño ya está hecho)
- En el peor caso: corrupción silenciosa e indetectada de datos

> **Conclusión:** La tarjeta SD está bien para una prueba rápida. Para operación permanente, cambie siempre a SSD.

---

## Árbol de decisión — ¿qué opción le conviene?

```
¿Qué Raspberry Pi tiene?
│
├── Raspberry Pi 5
│     ├── ¿Quiere el mejor rendimiento y mayor durabilidad?
│     │     → Opción B: SSD NVMe mediante M.2 HAT+ ⭐ recomendado
│     └── ¿Simple, barato, sin montaje?
│           → Opción A: SSD USB (excelente también en Pi 5)
│
├── Raspberry Pi 4
│     ├── ¿Homelab con LAN Gigabit + servidor existente?
│     │     → Opción C: Arranque PXE por red (sin almacenamiento local)
│     └── ¿Red doméstica normal?
│           → Opción A: SSD USB (solución más sencilla)
│
└── Raspberry Pi 3 o anterior
      → Opción A: SSD USB (USB 2.0, más lento que Pi 4/5)
        o: Actualice a Pi 4/5 — mejor inversión a largo plazo
```

---

## Opción A: SSD USB (la más sencilla para todos los modelos de Pi)

**Lo que necesita:** Un SSD portátil o un SSD SATA 2.5" + adaptador USB.

### Hardware recomendado (2025)

| Producto | Precio aproximado | Notas |
|---|---|---|
| Samsung T7 (500 GB) | ~€55 | Excelente, pero Pi 4 necesita corrección (→ abajo) |
| Crucial X6 (500 GB) | ~€45 | Fiable, sin problemas |
| WD My Passport SSD (500 GB) | ~€50 | Bien probado en Raspberry Pi OS |
| SSD SATA 2.5" + adaptador UGREEN USB 3.0 | ~€35–50 | Muy fiable para Pi 4 |

> **Evite los adaptadores USB-SATA de marcas desconocidas baratos** — a menudo tienen problemas de compatibilidad UASP en Pi 4. Los adaptadores de marca (UGREEN, Inateck) son más fiables.

### Paso 1: Escribir el SO en el SSD

1. Descargue [Raspberry Pi Imager](https://www.raspberrypi.com/software/) e instálelo en su computadora habitual
2. Conecte el SSD mediante USB a su computadora habitual
3. Abra Imager:
   - **Dispositivo:** elija Raspberry Pi 4 o 5
   - **SO:** Raspberry Pi OS Lite (64 bits) — sin escritorio, más recursos para Docker
   - **Almacenamiento:** su SSD
4. Haga clic en el icono ⚙️ → preconfigurar:
   - Nombre de host: p. ej. `tesla-pi`
   - Activar SSH: sí
   - Credenciales Wi-Fi (si no usa Ethernet)
   - Nombre de usuario + contraseña
5. Haga clic en **Escribir** — listo en ~5 minutos

### Paso 2: Activar el arranque USB en Pi 4 (una sola vez; Pi 5 omite este paso)

Pi 5 arranca desde USB de fábrica. Pi 4 necesita una actualización única del bootloader:

```bash
# Arranque brevemente desde una tarjeta SD, luego ejecute:
sudo raspi-config
# → Advanced Options → Boot Order → USB Boot → Finish → Reboot
```

Luego: retire la tarjeta SD, conecte el SSD, enciéndalo → la Pi arranca desde el SSD.

### Paso 3: Corrección del Samsung T7 para Pi 4 (si es necesario)

Si su Pi 4 se queda colgada con el Samsung T7 (LED rojo parpadeante, no arranca):

```bash
# Abra este archivo — ¡debe permanecer en una sola línea!
sudo nano /boot/firmware/cmdline.txt

# Añada al final de la línea (con un espacio antes):
usb-storage.quirks=04e8:4001:u

# Guarde (Ctrl+O, Enter, Ctrl+X) y reinicie:
sudo reboot
```

Esto desactiva UASP solo para el T7. El rendimiento sigue siendo 5–10× mejor que una tarjeta SD.

### Paso 4: Instalar Tesla Carview

```bash
curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
```

---

## Opción B: SSD NVMe en Raspberry Pi 5 (mejor rendimiento)

La Pi 5 tiene un **conector PCIe**. Con un HAT M.2 obtiene velocidades NVMe de **400–900 MB/s** — frente a ~20–90 MB/s de las tarjetas SD.

### Hardware necesario

| Componente | Recomendación | Precio aproximado |
|---|---|---|
| Raspberry Pi 5 (4 GB u 8 GB) | — | desde €60 |
| **Raspberry Pi M.2 HAT+** oficial | Factor de forma 2230 o 2242 | ~€15 |
| **o** Pimoroni NVMe BASE | Compacto, sin separadores | ~€20 |
| **o** Pineberry HatDrive Bottom | Se monta debajo de la Pi | ~€25 |
| SSD NVMe M.2 **2230 o 2242** | WD SN350, Kingston NV2, Samsung PM991 | €25–60 |

> **El factor de forma es crítico:** El M.2 HAT+ oficial solo admite **2230** y **2242** (SSDs cortos). Los SSDs 2280 estándar (los largos habituales) no caben. Los HATs de terceros a menudo admiten 2280 — compruébelo antes de comprar.

### Paso 1: Montaje

1. Deslice el SSD en la ranura M.2 en ángulo, luego presiónelo hacia abajo
2. Fíjelo con el tornillo incluido
3. Conecte el cable de cinta FFC (HAT ↔ conector PCIe de la Pi 5)
4. Monte el HAT en el cabezal GPIO de la Pi 5

### Paso 2: Escribir el SO en el NVMe

**Método sencillo:** Arranque desde la tarjeta SD, luego escriba en el NVMe desde allí:
```bash
sudo apt update && sudo apt install rpi-imager -y
rpi-imager
# Seleccione el SSD NVMe como destino → escribir
```

**Alternativa:** Use un adaptador USB-NVMe en una computadora habitual y use Raspberry Pi Imager como en la Opción A.

### Paso 3: Configurar la prioridad de arranque

```bash
sudo raspi-config
# → Advanced Options → Boot Order → NVMe/USB Boot
# → Finish → Reboot
```

Retire la tarjeta SD → la Pi arranca desde NVMe.

### Paso 4: Opcional — activar PCIe Gen 3

La Pi 5 usa Gen 2 por defecto (~400 MB/s). Gen 3 (~900 MB/s) no es oficial pero suele ser estable:

```bash
sudo nano /boot/firmware/config.txt
# Añada al final:
dtparam=pciex1_gen=3
```

---

## Opción C: Arranque PXE por red (para entusiastas del homelab)

El arranque PXE significa que la Pi **no tiene almacenamiento local en absoluto** — arranca completamente por la red desde un servidor central. Ideal cuando:
- Gestiona varias Pis
- Un NAS (Synology, TrueNAS) o mini PC ya está en su red
- Prefiere copias de seguridad y gestión centralizadas

**Requisitos:**
- Ethernet Gigabit (el Wi-Fi es demasiado lento/poco fiable para PXE)
- Un servidor existente en la red que pueda ejecutar DHCP + TFTP + NFS
- Raspberry Pi 4 o 5

### Descripción general de la configuración

En el servidor PXE (Debian/Ubuntu):

```bash
sudo apt install dnsmasq nfs-kernel-server -y
sudo mkdir -p /srv/tftp /srv/nfs/rpi

# Añada a /etc/exports:
echo "/srv/nfs/rpi *(rw,sync,no_subtree_check,no_root_squash)" | sudo tee -a /etc/exports
sudo exportfs -ra
```

**/etc/dnsmasq.conf** (DHCP proxy — funciona junto con su router existente):
```ini
port=0
dhcp-range=192.168.1.0,proxy
log-dhcp
enable-tftp
tftp-root=/srv/tftp
pxe-service=0,"Raspberry Pi Boot"
```

La copia completa del rootfs y la configuración NFS son extensas — siga la guía oficial:
[Documentación de arranque PXE de Raspberry Pi](https://www.raspberrypi.com/documentation/computers/remote-access.html#network-boot-your-raspberry-pi)

**¿Vale la pena PXE para usted?** Solo si ya tiene un homelab con almacenamiento central. Para una sola Pi, el SSD USB o NVMe es más sencillo e igualmente robusto.

---

## Migrar de tarjeta SD a SSD (sin pérdida de datos)

¿Ya ejecuta Tesla Carview en una tarjeta SD? Puede migrar en unos 20 minutos sin perder ningún dato.

### Paso 1: Clonar la tarjeta SD en el SSD

```bash
# Conecte el SSD mediante USB a la Pi en funcionamiento
# Identifique el disco de destino (normalmente /dev/sda):
lsblk

# Clonar (la Pi puede seguir funcionando):
sudo dd if=/dev/mmcblk0 of=/dev/sda bs=4M status=progress conv=fsync

# Redimensionar la partición para usar todo el SSD:
sudo parted /dev/sda resizepart 2 100%
sudo resize2fs /dev/sda2
```

### Paso 2: Cambiar la fuente de arranque

Active el arranque USB como se describe en [Opción A, Paso 2](#paso-2-activar-el-arranque-usb-en-pi-4-una-sola-vez-pi-5-omite-este-paso), luego retire la tarjeta SD.

### Paso 3: Verificar

```bash
findmnt /
# Debería mostrar /dev/sda2 o nvme0n1p2, NO mmcblk0p2
```

---

## Comparación

| | Tarjeta SD | SSD USB | NVMe (Pi 5) | PXE |
|---|---|---|---|---|
| **Durabilidad** | ❌ Meses | ✅ Años | ✅ Años | ✅ Sin desgaste local |
| **Esfuerzo de instalación** | ✅ Mínimo | ✅ Bajo | 🟡 Medio (montaje del HAT) | ❌ Alto |
| **Costo** | ✅ ~€10 | 🟡 ~€35–60 | 🟡 ~€50–100 | ✅ €0 (si el servidor existe) |
| **Velocidad de lectura** | 20–90 MB/s | 200–500 MB/s | 400–900 MB/s | Velocidad de LAN |
| **Recomendado para** | Solo pruebas | Pi 4 uso permanente | Pi 5 uso permanente | Homelabs |

---

## Preguntas frecuentes

### ¿Puedo dejar la tarjeta SD después de cambiar al SSD?

Pi 4: Sí — si la tarjeta SD no es arrancable, la Pi la ignora y arranca desde USB.
Pi 5: Sí — después de configurar el orden de arranque, NVMe/USB tiene prioridad.

### ¿Qué tamaño debe tener el SSD?

60–120 GB es más que suficiente. La base de datos de Tesla Carview crece a unos cientos de MB a lo largo de los años. Comprar uno ligeramente más grande es barato y da al controlador del SSD más bloques para el nivelado de desgaste → mayor durabilidad.

### ¿Puedo usar una unidad flash USB en su lugar?

Técnicamente sí, pero **no se recomienda**. Las unidades flash no tienen nivelado de desgaste — se deterioran más rápido que las tarjetas SD. La diferencia de precio con un SSD barato es mínima.

### ¿Qué pasa con los cortes de luz?

Los SSDs son más resistentes que las tarjetas SD ante la pérdida repentina de alimentación, pero no son inmunes. Use la copia de seguridad integrada: **Admin → Datos → Copia de seguridad** regularmente, o active las copias de seguridad automáticas nocturnas.

---

## Enlaces útiles

- [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
- [Documentación oficial del M.2 HAT+](https://www.raspberrypi.com/documentation/accessories/m2-hat-plus.html)
- [Guía de arranque PXE de Raspberry Pi](https://www.raspberrypi.com/documentation/computers/remote-access.html#network-boot-your-raspberry-pi)
- [raspberry.tips: Arrancar Pi 4 desde SSD USB](https://raspberry.tips/en/raspberrypi-tutorials/boot-raspberry-pi-from-usb-ssd-flash-drive-pi-4-5)
- [raspberry.tips: Configuración NVMe de Pi 5 + benchmarks](https://raspberry.tips/en/raspberrypi-tutorials/raspberry-pi-5-nvme-ssd-boot)

---

*→ [[Installation]] | [[Network-Access]] | [[Home]]*
