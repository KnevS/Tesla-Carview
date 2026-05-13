# Raspberry Pi: Choosing the right storage — no more SD card death

> 🇩🇪 [Auf Deutsch lesen](15-raspberry-pi-storage.md)

SD cards and 24/7 operation are a bad combination. This chapter explains **why**, which alternative suits your setup best, and how to get it running in 20 minutes.

---

## The problem: Why SD cards are unsuitable for servers

Modern SD cards typically survive **3,000–10,000 write cycles per storage block** — older cards even fewer. That sounds like a lot. It isn't.

| What writes to the SD card? | Frequency |
|---|---|
| Docker container logs | Multiple times per minute |
| SQLite database (trips, charging sessions) | Every poll cycle (every 30–60 s) |
| System logs (`/var/log`) | Continuously |
| OS swap file | Under memory pressure |

**Realistic outcome:** A typical SD card under Tesla Carview's write load lasts **3–18 months**, after which:
- Filesystem corruption → system won't boot
- Data lost (backups help, but the damage is done)
- Worst case: silent, undetected data corruption

> **Bottom line: SD card is fine for quick experiments. For permanent operation, always replace it.**

---

## Which option is right for me?

```
What Raspberry Pi do you have?
│
├── Raspberry Pi 5
│     ├── Want maximum performance and longevity?
│     │     → Option B: NVMe SSD via M.2 HAT+ ⭐ (recommended)
│     └── Simple & cheap, no assembly?
│           → Option A: USB SSD (excellent on Pi 5 too)
│
├── Raspberry Pi 4
│     ├── Homelab with Gigabit network + existing server?
│     │     → Option C: PXE network boot (no local storage needed)
│     └── Normal home network, no extra server?
│           → Option A: USB SSD (simplest solution)
│
└── Raspberry Pi 3 or older
      → Option A: USB SSD (USB 2.0, slower than Pi 4/5)
        or: Buy a newer Pi — Pi 4/5 is a better investment
```

---

## Option A: USB SSD (simplest solution for all Pi models)

**What you need:**
- A portable SSD **or** a 2.5″ SSD + USB adapter
- That's it

**Recommended hardware (2025):**

| Product | Approx. price | Notes |
|---|---|---|
| Samsung T7 (500 GB) | ~€55 | Excellent, but Pi 4 needs quirk workaround (→ below) |
| Crucial X6 (500 GB) | ~€45 | Reliable, no quirks |
| WD My Passport SSD (500 GB) | ~€50 | Well tested under Raspberry Pi OS |
| 2.5″ SATA SSD + UGREEN USB 3.0 adapter | ~€35–50 | Very reliable, recommended for Pi 4 |

> **Avoid cheap adapters:** Some no-name USB-SATA adapters have UASP (USB Attached SCSI Protocol) issues on the Pi 4. Brand-name adapters (UGREEN, Inateck) are more reliable.

### Step 1: Write OS to the SSD

1. Download **Raspberry Pi Imager**: [https://www.raspberrypi.com/software/](https://www.raspberrypi.com/software/)
2. Connect the SSD via USB to your regular computer
3. Open Imager:
   - **Device:** choose Raspberry Pi 4 or 5
   - **OS:** Raspberry Pi OS Lite (64-bit) — no desktop, saves resources
   - **Storage:** your SSD
4. Click the gear icon (⚙️) → pre-configure:
   - Set hostname (e.g. `tesla-pi`)
   - Enable SSH
   - Enter Wi-Fi credentials (if not using Ethernet)
   - Set username + password
5. **Write** — done in about 5 minutes

### Step 2: Update the bootloader on Pi 4 (Pi 4 only, one-time)

The Pi 4 needs to be configured once to boot from USB. **The Pi 5 does this out of the box — skip this step.**

```bash
# Either: boot briefly from a regular SD card, then:
sudo raspi-config
# → Advanced Options → Boot Order → USB Boot → Finish → Reboot

# Or directly via EEPROM:
sudo rpi-eeprom-update -a
sudo reboot
```

Then: remove the SD card, plug in the SSD, power on the Pi → boots from SSD.

### Step 3: Samsung T7 quirk on Pi 4 (if needed)

If the Pi 4 won't boot with the Samsung T7 (stuck on the red lightning screen):

```bash
# Open /boot/firmware/cmdline.txt (must stay a single line!):
sudo nano /boot/firmware/cmdline.txt

# Append at the end of the line (with a space before it):
usb-storage.quirks=04e8:4001:u

# Save, reboot:
sudo reboot
```

This disables UASP for the T7 — performance is still 5–10× better than an SD card.

### Step 4: Install Tesla Carview

From here, proceed as described in [02-deployment.en.md](02-deployment.en.md):

```bash
curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
```

---

## Option B: NVMe SSD on Raspberry Pi 5 (best performance)

The Pi 5 has a **PCIe connector** — with the official M.2 HAT+ or a third-party adapter, you get NVMe speeds of **400–900 MB/s** (compare: SD card 20–90 MB/s).

**What you need:**

| Component | Recommendation | Approx. price |
|---|---|---|
| Raspberry Pi 5 (4 GB or 8 GB RAM) | — | from €60 |
| Official **Raspberry Pi M.2 HAT+** | 2230 or 2242 form factor | ~€15 |
| **or** Pimoroni NVMe BASE | Compact, no spacers needed | ~€20 |
| **or** Pineberry HatDrive Bottom | Mounts below the Pi | ~€25 |
| NVMe SSD M.2 2230 or 2242 | WD Green SN350, Kingston NV2, Samsung PM991 | €25–60 |

> **Check the form factor:** The M.2 HAT+ only supports **2230** and **2242** (short/medium SSDs). Standard 2280 SSDs (the long ones) don't fit the official HAT+ — but some third-party HATs do support them.

### Step 1: Assemble the hardware

1. Slide the SSD into the M.2 slot at an angle, then press flat
2. Secure with the included screw
3. Connect the FFC flat ribbon cable (HAT → Pi 5 PCIe connector)
4. Mount the HAT onto the Pi 5 GPIO header

### Step 2: Write OS to the NVMe SSD

**Variant A (easy):** Write from a running Pi OS directly to the NVMe:

```bash
# Boot Pi with SD card, then:
sudo apt update && sudo apt install rpi-imager -y
rpi-imager
# → Select NVMe SSD as target → write
```

**Variant B:** Write to the SSD using a USB-NVMe adapter on a regular computer (same as Option A).

### Step 3: Set boot order

```bash
sudo raspi-config
# → Advanced Options → Boot Order → NVMe/USB Boot
# → Finish → Reboot
```

Remove SD card, restart Pi → boots from NVMe.

### Step 4: Optimize PCIe speed (optional)

The Pi 5 runs PCIe in Gen 2 by default (~400 MB/s). Gen 3 (~900 MB/s) is possible but not officially supported:

```bash
# /boot/firmware/config.txt:
sudo nano /boot/firmware/config.txt

# For Gen 3 (at your own risk, usually stable):
dtparam=pciex1_gen=3
```

---

## Option C: PXE network boot (for homelab enthusiasts)

**What is it?** The Pi has no local storage at all. It boots **entirely over the network** from a central server. Ideal when:
- You manage multiple Pis
- A NAS (Synology, TrueNAS) or mini PC is already available as a server
- You prefer centralised backups and updates

**Requirements:**
- Gigabit Ethernet (no Wi-Fi — too slow and unreliable for PXE)
- A server on the network that can provide DHCP + TFTP (NAS, old PC, Pi 4)
- Raspberry Pi 4 or 5 (Pi 3 works with extra effort)

### Quick setup: PXE server with dnsmasq

On the server (Debian/Ubuntu or the NAS):

```bash
# Install dnsmasq
sudo apt install dnsmasq -y

# Create TFTP directory
sudo mkdir -p /srv/tftp/rpi

# Set up NFS root filesystem for the Pi:
sudo apt install nfs-kernel-server -y
sudo mkdir -p /srv/nfs/rpi

# /etc/exports:
echo "/srv/nfs/rpi *(rw,sync,no_subtree_check,no_root_squash)" | sudo tee -a /etc/exports
sudo exportfs -ra
```

**/etc/dnsmasq.conf** (proxy DHCP mode — works alongside your existing router):

```ini
port=0
dhcp-range=192.168.1.0,proxy
log-dhcp
enable-tftp
tftp-root=/srv/tftp
pxe-service=0,"Raspberry Pi Boot"
```

The full setup (rootfs copy, NFS configuration, Pi-side configuration) is extensive — follow the official Raspberry Pi PXE documentation:
[https://www.raspberrypi.com/documentation/computers/remote-access.html#network-boot-your-raspberry-pi](https://www.raspberrypi.com/documentation/computers/remote-access.html#network-boot-your-raspberry-pi)

**When is PXE truly worthwhile?** When you already run a homelab with centralised storage. For a single Pi, USB SSD or NVMe is simpler and just as good.

---

## Migrating from SD card to SSD (existing installation)

Already running Tesla Carview on an SD card and want to move to SSD? No problem — without data loss:

### Step 1: Clone SD card to SSD

```bash
# Connect SSD via USB to the running Pi
# Identify the target disk:
lsblk
# → SSD usually appears as /dev/sda

# Clone SD card to SSD (Pi can stay running):
sudo dd if=/dev/mmcblk0 of=/dev/sda bs=4M status=progress conv=fsync

# Resize the partition on the SSD to use all available space:
sudo parted /dev/sda resizepart 2 100%
sudo resize2fs /dev/sda2
```

### Step 2: Boot from SSD

Update bootloader as described above (Option A, Step 2), then remove SD card — SSD stays connected.

### Step 3: Verify

```bash
# Check that we booted from SSD:
findmnt /
# → should show /dev/sda2 or nvme0n1p2, NOT mmcblk0p2
```

---

## Quick comparison of all options

| | SD card | USB SSD | NVMe (Pi 5) | PXE |
|---|---|---|---|---|
| **Longevity** | ❌ Months | ✅ Years | ✅ Years | ✅ No local wear |
| **Setup effort** | ✅ Minimal | ✅ Low | 🟡 Medium (assemble HAT) | ❌ High |
| **Cost** | ✅ ~€10 | 🟡 ~€35–60 | 🟡 ~€50–100 | ✅ €0 (if server exists) |
| **Read speed** | 20–90 MB/s | 200–500 MB/s | 400–900 MB/s | LAN speed |
| **Recommended for** | Testing | Pi 4 permanent use | Pi 5 permanent use | Homelab |

---

## Frequently asked questions

### "Do I have to remove the SD card or can I leave it in?"

On Pi 4: After the bootloader update, the SD card can be removed. The Pi will then always boot from USB. If you leave it in and it's empty or not bootable, it still boots from USB.

On Pi 5: SD card can remain inserted — after configuration the Pi prefers NVMe/USB anyway.

### "How large should the SSD be?"

**60–120 GB** is plenty for Tesla Carview. The SQLite database grows to a few hundred MB over years. Buying larger costs barely more and gives the SSD controller more room for wear levelling → longer lifespan.

### "What about power cuts — do I lose data?"

SSDs and NVMe SSDs are more resilient than SD cards during power failures, but not immune. For important data: **regular backups** via the Tesla Carview admin interface (`Admin → Data → Backup`) or enable automatic nightly backups.

### "Can I use a USB flash drive instead of an SSD?"

Technically yes, but **not recommended**. USB flash drives typically have no wear levelling algorithms — they die even faster than SD cards. The price difference to a cheap SSD is minimal.

---

## Useful links

- [Raspberry Pi Imager download](https://www.raspberrypi.com/software/)
- [raspberry.tips: Boot Pi 4 from USB SSD (EN)](https://raspberry.tips/en/raspberrypi-tutorials/boot-raspberry-pi-from-usb-ssd-flash-drive-pi-4-5)
- [raspberry.tips: Pi 5 NVMe setup + benchmarks (EN)](https://raspberry.tips/en/raspberrypi-tutorials/raspberry-pi-5-nvme-ssd-boot)
- [Official Pi M.2 HAT+ documentation](https://www.raspberrypi.com/documentation/accessories/m2-hat-plus.html)
- [Raspberry Pi PXE boot documentation](https://www.raspberrypi.com/documentation/computers/remote-access.html#network-boot-your-raspberry-pi)
- [SD card lifespan calculator](https://raspberry.tips/en/calculate-raspberry-pi-sd-card-lifespan-test-now)

---

*→ Back to [02-deployment.en.md](02-deployment.en.md) | [Network access](14-network-access.en.md) | [All docs](README.en.md)*
