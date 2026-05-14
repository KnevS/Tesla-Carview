🌐 **Idioma:** [EN](Raspberry-Pi-Storage) · [DE](DE-Raspberry-Pi-Storage) · [FR](FR-Raspberry-Pi-Storage) · **ES** · [TR](TR-Raspberry-Pi-Storage) · [EL](EL-Raspberry-Pi-Storage)

---

# Almacenamiento Raspberry Pi — Adiós a la muerte de las tarjetas SD

Las tarjetas SD y el funcionamiento como servidor 24/7 son mala combinación. Esta página explica por qué, y te guía a la alternativa correcta para tu configuración — paso a paso.

---

## Por qué fallan las tarjetas SD

Las tarjetas SD modernas aguantan **3.000–10.000 ciclos de escritura por bloque**. Parece mucho. No lo es.

| ¿Qué escribe en la tarjeta SD? | ¿Con qué frecuencia? |
|---|---|
| Logs de contenedores Docker | Varias veces por minuto |
| Base de datos SQLite (viajes, sesiones de carga) | Cada 30–60 segundos |
| Logs del sistema (`/var/log`) | Continuamente |
| Swap del SO | Bajo presión de memoria |

**Resultado realista:** Bajo la carga de escritura de Tesla Carview, una tarjeta SD típica dura **3–18 meses**, luego:
- Corrupción del sistema de archivos → el sistema no arranca
- Datos perdidos (las copias de seguridad ayudan, pero el daño está hecho)
- En el peor caso: corrupción silenciosa no detectada

> **En resumen:** La tarjeta SD está bien para una prueba rápida. Para uso permanente, pasa siempre a un SSD.

---

## Árbol de decisión — ¿qué opción te conviene?

```
¿Qué Raspberry Pi tienes?
│
├── Raspberry Pi 5
│     ├── ¿Quieres el mejor rendimiento y mayor durabilidad?
│     │     → Opción B: SSD NVMe via M.2 HAT+ ⭐ recomendado
│     └── ¿Simple, barato, sin montaje?
│           → Opción A: SSD USB (también excelente en Pi 5)
│
├── Raspberry Pi 4
│     ├── ¿Homelab con LAN Gigabit + servidor existente?
│     │     → Opción C: Arranque por red PXE (sin almacenamiento local)
│     └── ¿Red doméstica normal?
│           → Opción A: SSD USB (solución más sencilla)
│
└── Raspberry Pi 3 o anterior
      → Opción A: SSD USB (USB 2.0, más lento que Pi 4/5)
        o: Actualiza a Pi 4/5 — mejor inversión a largo plazo
```

---

## Opción A: SSD USB (el más sencillo para todos los modelos Pi)

**Lo que necesitas:** Un SSD portátil o un SSD SATA 2,5" + adaptador USB.

### Hardware recomendado (2025)

| Producto | Precio aprox. | Notas |
|---|---|---|
| Samsung T7 (500 GB) | ~55 € | Excelente, pero Pi 4 necesita un ajuste (→ abajo) |
| Crucial X6 (500 GB) | ~45 € | Fiable, sin quirks |
| WD My Passport SSD (500 GB) | ~50 € | Bien probado en Raspberry Pi OS |
| SSD SATA 2,5" + adaptador USB 3.0 UGREEN | ~35–50 € | Muy fiable para Pi 4 |

> **Evita los adaptadores USB-SATA sin marca** — suelen tener problemas de compatibilidad UASP en Pi 4. Los adaptadores de marca (UGREEN, Inateck) son más fiables.

### Paso 1: Grabar el SO en el SSD

1. Descarga [Raspberry Pi Imager](https://www.raspberrypi.com/software/) e instálalo en tu ordenador
2. Conecta el SSD via USB a tu ordenador
3. Abre Imager:
   - **Dispositivo:** elige Raspberry Pi 4 o 5
   - **SO:** Raspberry Pi OS Lite (64 bits) — sin escritorio, más recursos para Docker
   - **Almacenamiento:** tu SSD
4. Haz clic en el icono ⚙️ → preconfigurar:
   - Hostname: ej. `tesla-pi`
   - Activar SSH: sí
   - Credenciales Wi-Fi (si no usas Ethernet)
   - Usuario + contraseña
5. Haz clic en **Write** — listo en ~5 minutos

### Paso 2: Activar arranque USB en Pi 4 (único, Pi 5 omite esto)

Pi 5 arranca desde USB de serie. Pi 4 necesita una actualización única del bootloader:

```bash
# Arranca brevemente desde una tarjeta SD, luego ejecuta:
sudo raspi-config
# → Advanced Options → Boot Order → USB Boot → Finish → Reboot
```

Luego: retira la tarjeta SD, conecta el SSD, enciende → la Pi arranca desde el SSD.

### Paso 3: Arreglo del Samsung T7 para Pi 4 (si es necesario)

Si tu Pi 4 se queda colgada con el Samsung T7 (LED rojo parpadeando, no arranca):

```bash
# Abre este archivo — ¡debe permanecer en una sola línea!
sudo nano /boot/firmware/cmdline.txt

# Añade al final de la línea (con un espacio antes):
usb-storage.quirks=04e8:4001:u

# Guarda (Ctrl+O, Enter, Ctrl+X), luego reinicia:
sudo reboot
```

Esto deshabilita UASP solo para el T7. El rendimiento sigue siendo 5–10× mejor que una tarjeta SD.

### Paso 4: Instalar Tesla Carview

```bash
curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
```

---

## Opción B: SSD NVMe en Raspberry Pi 5 (mejor rendimiento)

El Pi 5 tiene un **conector PCIe**. Con un M.2 HAT obtienes velocidades NVMe de **400–900 MB/s** — frente a ~20–90 MB/s de las tarjetas SD.

### Hardware que necesitas

| Componente | Recomendación | Precio aprox. |
|---|---|---|
| Raspberry Pi 5 (4 GB o 8 GB) | — | desde 60 € |
| **Raspberry Pi M.2 HAT+** oficial | Factor de forma 2230 o 2242 | ~15 € |
| **o** Pimoroni NVMe BASE | Compacto, sin separadores | ~20 € |
| **o** Pineberry HatDrive Bottom | Se monta bajo la Pi | ~25 € |
| SSD NVMe M.2 **2230 o 2242** | WD SN350, Kingston NV2, Samsung PM991 | 25–60 € |

> **El factor de forma es crítico:** El M.2 HAT+ oficial solo soporta **2230** y **2242** (SSDs cortos). Los SSDs 2280 estándar (los largos comunes) no caben. Los HATs de terceros suelen soportar 2280 — compruébalo antes de comprar.

### Paso 1: Montaje

1. Desliza el SSD en el slot M.2 en ángulo, luego presiona hacia abajo
2. Fija con el tornillo incluido
3. Conecta el cable FFC (HAT ↔ conector PCIe del Pi 5)
4. Monta el HAT en el header GPIO del Pi 5

### Paso 2: Grabar el SO en el NVMe

**Método fácil:** Arranca desde la tarjeta SD, luego graba en el NVMe desde allí:
```bash
sudo apt update && sudo apt install rpi-imager -y
rpi-imager
# Selecciona el SSD NVMe como destino → grabar
```

**Alternativa:** Usa un adaptador USB-NVMe en un ordenador normal y usa Raspberry Pi Imager como en la Opción A.

### Paso 3: Establecer prioridad de arranque

```bash
sudo raspi-config
# → Advanced Options → Boot Order → NVMe/USB Boot
# → Finish → Reboot
```

Retira la tarjeta SD → la Pi arranca desde el NVMe.

### Paso 4: Opcional — activar PCIe Gen 3

Pi 5 usa Gen 2 por defecto (~400 MB/s). Gen 3 (~900 MB/s) es no oficial pero generalmente estable:

```bash
sudo nano /boot/firmware/config.txt
# Añade al final:
dtparam=pciex1_gen=3
```

---

## Opción C: Arranque PXE por red (para entusiastas del homelab)

El arranque PXE significa que la Pi **no tiene almacenamiento local** — arranca completamente por la red desde un servidor central. Ideal cuando:
- Gestionas varias Pis
- Un NAS (Synology, TrueNAS) o mini PC ya está en tu red
- Prefieres copias de seguridad y gestión centralizadas

**Requisitos:**
- Ethernet Gigabit (Wi-Fi es demasiado lento/poco fiable para PXE)
- Un servidor existente en la red que pueda ejecutar DHCP + TFTP + NFS
- Raspberry Pi 4 o 5

### Resumen de configuración rápida

En el servidor PXE (Debian/Ubuntu):

```bash
sudo apt install dnsmasq nfs-kernel-server -y
sudo mkdir -p /srv/tftp /srv/nfs/rpi

# Añadir a /etc/exports:
echo "/srv/nfs/rpi *(rw,sync,no_subtree_check,no_root_squash)" | sudo tee -a /etc/exports
sudo exportfs -ra
```

**/etc/dnsmasq.conf** (proxy DHCP — funciona junto a tu router existente):
```ini
port=0
dhcp-range=192.168.1.0,proxy
log-dhcp
enable-tftp
tftp-root=/srv/tftp
pxe-service=0,"Raspberry Pi Boot"
```

La copia completa del rootfs y la configuración NFS son extensas — sigue la guía oficial:
[Documentación de arranque por red Raspberry Pi](https://www.raspberrypi.com/documentation/computers/remote-access.html#network-boot-your-raspberry-pi)

**¿Vale la pena PXE para ti?** Solo si ya tienes un homelab con almacenamiento central. Para una sola Pi, SSD USB o NVMe es más sencillo e igualmente robusto.

---

## Migrar de tarjeta SD a SSD (sin pérdida de datos)

¿Ya tienes Tesla Carview en una tarjeta SD? Puedes migrar en unos 20 minutos sin perder datos.

### Paso 1: Clonar la tarjeta SD al SSD

```bash
# Conecta el SSD via USB a la Pi en funcionamiento
# Identifica el disco destino (generalmente /dev/sda):
lsblk

# Clonar (la Pi puede seguir funcionando):
sudo dd if=/dev/mmcblk0 of=/dev/sda bs=4M status=progress conv=fsync

# Redimensionar la partición para usar todo el SSD:
sudo parted /dev/sda resizepart 2 100%
sudo resize2fs /dev/sda2
```

### Paso 2: Cambiar la fuente de arranque

Activa el arranque USB como se describe en [Opción A, Paso 2](#paso-2-activar-arranque-usb-en-pi-4-%C3%BAnico-pi-5-omite-esto), luego retira la tarjeta SD.

### Paso 3: Verificar

```bash
findmnt /
# Debe mostrar /dev/sda2 o nvme0n1p2, NO mmcblk0p2
```

---

## Comparativa

| | Tarjeta SD | SSD USB | NVMe (Pi 5) | PXE |
|---|---|---|---|---|
| **Durabilidad** | ❌ Meses | ✅ Años | ✅ Años | ✅ Sin desgaste local |
| **Esfuerzo de instalación** | ✅ Mínimo | ✅ Bajo | 🟡 Medio (montaje HAT) | ❌ Alto |
| **Coste** | ✅ ~10 € | 🟡 ~35–60 € | 🟡 ~50–100 € | ✅ 0 € (si existe servidor) |
| **Velocidad de lectura** | 20–90 MB/s | 200–500 MB/s | 400–900 MB/s | Velocidad LAN |
| **Recomendado para** | Solo pruebas | Pi 4 uso permanente | Pi 5 uso permanente | Homelabs |

---

## Preguntas frecuentes

### ¿Puedo dejar la tarjeta SD puesta después de cambiar al SSD?

Pi 4: Sí — si la tarjeta SD no es arrancable, la Pi la ignora y arranca desde USB.
Pi 5: Sí — después de configurar el orden de arranque, NVMe/USB tiene prioridad.

### ¿Qué tamaño debe tener el SSD?

60–120 GB es más que suficiente. La base de datos de Tesla Carview crece hasta unos cientos de MB a lo largo de los años. Comprar algo más grande es barato y da al controlador del SSD más bloques para el nivelado de desgaste → vida más larga.

### ¿Puedo usar un pendrive USB en su lugar?

Técnicamente sí, pero **no recomendado**. Los pendrives no tienen nivelado de desgaste — mueren más rápido que las tarjetas SD. La diferencia de precio con un SSD barato es mínima.

### ¿Qué pasa con los cortes de luz?

Los SSDs son más resistentes que las tarjetas SD ante una pérdida de alimentación repentina, pero no inmunes. Usa la copia de seguridad integrada: **Admin → Data → Backup** regularmente, o activa las copias de seguridad nocturnas automáticas.

---

## Enlaces útiles

- [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
- [Documentación oficial M.2 HAT+](https://www.raspberrypi.com/documentation/accessories/m2-hat-plus.html)
- [Guía de arranque PXE Raspberry Pi](https://www.raspberrypi.com/documentation/computers/remote-access.html#network-boot-your-raspberry-pi)
- [raspberry.tips: Arrancar Pi 4 desde SSD USB](https://raspberry.tips/en/raspberrypi-tutorials/boot-raspberry-pi-from-usb-ssd-flash-drive-pi-4-5)
- [raspberry.tips: NVMe Pi 5 + benchmarks](https://raspberry.tips/en/raspberrypi-tutorials/raspberry-pi-5-nvme-ssd-boot)

---

*→ [[ES-Installation]] | [[ES-Network-Access]] | [[ES-Home]]*
