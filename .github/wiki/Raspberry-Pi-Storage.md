# Raspberry Pi Storage — No More SD Card Death

🌐 **Language:** **EN** · [DE](DE-Raspberry-Pi-Storage) · [FR](FR-Raspberry-Pi-Storage) · [ES](ES-Raspberry-Pi-Storage) · [TR](TR-Raspberry-Pi-Storage) · [EL](EL-Home)

SD cards and 24/7 server operation are a bad combination. This page explains why, and guides you to the right alternative for your setup — step by step.

---

## Why SD cards fail

Modern SD cards survive **3,000–10,000 write cycles per block**. That sounds like a lot. It isn't.

| What writes to the SD card? | How often? |
|---|---|
| Docker container logs | Multiple times per minute |
| SQLite database (trips, charging sessions) | Every 30–60 seconds |
| System logs (`/var/log`) | Continuously |
| OS swap | Under memory pressure |

**Realistic outcome:** Under Tesla Carview's write load, a typical SD card lasts **3–18 months**, then:
- Filesystem corruption → system won't boot
- Data lost (backups help, but the damage is done)
- Worst case: silent, undetected data corruption

> **Bottom line:** SD card is fine for a quick test. For permanent operation, always switch to SSD.

---

## Decision tree — which option suits you?

```
What Raspberry Pi do you have?
│
├── Raspberry Pi 5
│     ├── Want the best performance and longest life?
│     │     → Option B: NVMe SSD via M.2 HAT+ ⭐ recommended
│     └── Simple, cheap, no assembly?
│           → Option A: USB SSD (also excellent on Pi 5)
│
├── Raspberry Pi 4
│     ├── Homelab with Gigabit LAN + existing server?
│     │     → Option C: PXE network boot (no local storage at all)
│     └── Normal home network?
│           → Option A: USB SSD (simplest solution)
│
└── Raspberry Pi 3 or older
      → Option A: USB SSD (USB 2.0, slower than Pi 4/5)
        or: Upgrade to Pi 4/5 — better investment long-term
```

---

## Option A: USB SSD (simplest for all Pi models)

**What you need:** A portable SSD or a 2.5" SATA SSD + USB adapter.

### Recommended hardware (2025)

| Product | Approx. price | Notes |
|---|---|---|
| Samsung T7 (500 GB) | ~€55 | Great, but Pi 4 needs quirk fix (→ below) |
| Crucial X6 (500 GB) | ~€45 | Reliable, no quirks |
| WD My Passport SSD (500 GB) | ~€50 | Well tested on Raspberry Pi OS |
| 2.5" SATA SSD + UGREEN USB 3.0 adapter | ~€35–50 | Very reliable for Pi 4 |

> **Avoid cheap no-name USB-SATA adapters** — they often have UASP compatibility issues on Pi 4. Brand adapters (UGREEN, Inateck) are more reliable.

### Step 1: Write the OS to the SSD

1. Download [Raspberry Pi Imager](https://www.raspberrypi.com/software/) and install it on your regular computer
2. Connect the SSD via USB to your regular computer
3. Open Imager:
   - **Device:** choose Raspberry Pi 4 or 5
   - **OS:** Raspberry Pi OS Lite (64-bit) — no desktop, more resources for Docker
   - **Storage:** your SSD
4. Click the ⚙️ gear icon → pre-configure:
   - Hostname: e.g. `tesla-pi`
   - Enable SSH: yes
   - Wi-Fi credentials (if not using Ethernet)
   - Username + password
5. Click **Write** — done in ~5 minutes

### Step 2: Enable USB boot on Pi 4 (one-time, Pi 5 skips this)

Pi 5 boots from USB out of the box. Pi 4 needs a one-time bootloader update:

```bash
# Boot from an SD card briefly, then run:
sudo raspi-config
# → Advanced Options → Boot Order → USB Boot → Finish → Reboot
```

Then: remove the SD card, plug in the SSD, power on → Pi boots from SSD.

### Step 3: Samsung T7 quirk fix for Pi 4 (if needed)

If your Pi 4 gets stuck with the Samsung T7 (flashing red LED, won't boot):

```bash
# Open this file — must remain a single line!
sudo nano /boot/firmware/cmdline.txt

# Append at the end of the line (space before it):
usb-storage.quirks=04e8:4001:u

# Save (Ctrl+O, Enter, Ctrl+X), then reboot:
sudo reboot
```

This disables UASP for the T7 only. Performance is still 5–10× better than an SD card.

### Step 4: Install Tesla Carview

```bash
curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
```

---

## Option B: NVMe SSD on Raspberry Pi 5 (best performance)

The Pi 5 has a **PCIe connector**. With an M.2 HAT you get NVMe speeds of **400–900 MB/s** — vs. ~20–90 MB/s for SD cards.

### Hardware you need

| Component | Recommendation | Approx. price |
|---|---|---|
| Raspberry Pi 5 (4 GB or 8 GB) | — | from €60 |
| Official **Raspberry Pi M.2 HAT+** | 2230 or 2242 form factor | ~€15 |
| **or** Pimoroni NVMe BASE | Compact, no spacers | ~€20 |
| **or** Pineberry HatDrive Bottom | Mounts under the Pi | ~€25 |
| NVMe SSD M.2 **2230 or 2242** | WD SN350, Kingston NV2, Samsung PM991 | €25–60 |

> **Form factor is critical:** The official M.2 HAT+ supports only **2230** and **2242** (short SSDs). Standard 2280 SSDs (the common long ones) don't fit. Third-party HATs often support 2280 — check before buying.

### Step 1: Assembly

1. Slide SSD into the M.2 slot at an angle, then press flat
2. Secure with the included screw
3. Connect the FFC ribbon cable (HAT ↔ Pi 5 PCIe connector)
4. Mount HAT onto the Pi 5 GPIO header

### Step 2: Write OS to the NVMe

**Easy method:** Boot from SD card, then write to NVMe from there:
```bash
sudo apt update && sudo apt install rpi-imager -y
rpi-imager
# Select NVMe SSD as target → write
```

**Alternative:** Use a USB-NVMe adapter on a regular computer and use Raspberry Pi Imager as in Option A.

### Step 3: Set boot priority

```bash
sudo raspi-config
# → Advanced Options → Boot Order → NVMe/USB Boot
# → Finish → Reboot
```

Remove SD card → Pi boots from NVMe.

### Step 4: Optional — enable PCIe Gen 3

Pi 5 defaults to Gen 2 (~400 MB/s). Gen 3 (~900 MB/s) is unofficial but usually stable:

```bash
sudo nano /boot/firmware/config.txt
# Add at end:
dtparam=pciex1_gen=3
```

---

## Option C: PXE Network Boot (for homelab enthusiasts)

PXE boot means the Pi has **no local storage at all** — it boots entirely over the network from a central server. Great when:
- You manage multiple Pis
- A NAS (Synology, TrueNAS) or mini PC is already on your network
- You prefer centralised backups and management

**Requirements:**
- Gigabit Ethernet (Wi-Fi is too slow/unreliable for PXE)
- An existing server on the network that can run DHCP + TFTP + NFS
- Raspberry Pi 4 or 5

### Quick setup overview

On the PXE server (Debian/Ubuntu):

```bash
sudo apt install dnsmasq nfs-kernel-server -y
sudo mkdir -p /srv/tftp /srv/nfs/rpi

# Add to /etc/exports:
echo "/srv/nfs/rpi *(rw,sync,no_subtree_check,no_root_squash)" | sudo tee -a /etc/exports
sudo exportfs -ra
```

**/etc/dnsmasq.conf** (proxy DHCP — works alongside your existing router):
```ini
port=0
dhcp-range=192.168.1.0,proxy
log-dhcp
enable-tftp
tftp-root=/srv/tftp
pxe-service=0,"Raspberry Pi Boot"
```

The full rootfs-copy and NFS configuration is extensive — follow the official guide:
[Raspberry Pi PXE boot documentation](https://www.raspberrypi.com/documentation/computers/remote-access.html#network-boot-your-raspberry-pi)

**Is PXE worth it for you?** Only if you already run a homelab with central storage. For a single Pi, USB SSD or NVMe is simpler and equally robust.

---

## Migrating from SD card to SSD (no data loss)

Already running Tesla Carview on an SD card? You can migrate in about 20 minutes without losing any data.

### Step 1: Clone the SD card to the SSD

```bash
# Connect SSD via USB to the running Pi
# Identify the target disk (usually /dev/sda):
lsblk

# Clone (Pi can keep running):
sudo dd if=/dev/mmcblk0 of=/dev/sda bs=4M status=progress conv=fsync

# Resize the partition to use the full SSD:
sudo parted /dev/sda resizepart 2 100%
sudo resize2fs /dev/sda2
```

### Step 2: Switch boot source

Enable USB boot as described in [Option A, Step 2](#step-2-enable-usb-boot-on-pi-4-one-time-pi-5-skips-this), then remove the SD card.

### Step 3: Verify

```bash
findmnt /
# Should show /dev/sda2 or nvme0n1p2, NOT mmcblk0p2
```

---

## Comparison

| | SD card | USB SSD | NVMe (Pi 5) | PXE |
|---|---|---|---|---|
| **Longevity** | ❌ Months | ✅ Years | ✅ Years | ✅ No local wear |
| **Setup effort** | ✅ Minimal | ✅ Low | 🟡 Medium (HAT assembly) | ❌ High |
| **Cost** | ✅ ~€10 | 🟡 ~€35–60 | 🟡 ~€50–100 | ✅ €0 (if server exists) |
| **Read speed** | 20–90 MB/s | 200–500 MB/s | 400–900 MB/s | LAN speed |
| **Recommended for** | Testing only | Pi 4 permanent use | Pi 5 permanent use | Homelabs |

---

## FAQ

### Can I leave the SD card in after switching to SSD?

Pi 4: Yes — if the SD card isn't bootable, the Pi ignores it and boots from USB.
Pi 5: Yes — after boot order configuration, NVMe/USB takes priority.

### How large should the SSD be?

60–120 GB is plenty. The Tesla Carview database grows to a few hundred MB over years. Buying slightly larger is cheap and gives the SSD controller more blocks for wear levelling → longer life.

### Can I use a USB flash drive instead?

Technically yes, but **not recommended**. Flash drives have no wear levelling — they die faster than SD cards. The price difference to a cheap SSD is minimal.

### What about power cuts?

SSDs are more resilient than SD cards during sudden power loss, but not immune. Use the built-in backup: **Admin → Data → Backup** regularly, or enable automated nightly backups.

---

## Useful Links

- [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
- [Official M.2 HAT+ documentation](https://www.raspberrypi.com/documentation/accessories/m2-hat-plus.html)
- [Raspberry Pi PXE boot guide](https://www.raspberrypi.com/documentation/computers/remote-access.html#network-boot-your-raspberry-pi)
- [raspberry.tips: Boot Pi 4 from USB SSD](https://raspberry.tips/en/raspberrypi-tutorials/boot-raspberry-pi-from-usb-ssd-flash-drive-pi-4-5)
- [raspberry.tips: Pi 5 NVMe setup + benchmarks](https://raspberry.tips/en/raspberrypi-tutorials/raspberry-pi-5-nvme-ssd-boot)

---

*→ [[Installation]] | [[Network-Access]] | [[Home]]*
