# Αποθηκευτικός χώρος Raspberry Pi — Τέλος στον θάνατο της κάρτας SD

> 🤖 *Αυτή η ελληνική μετάφραση είναι υποστηριζόμενη από AI από το [αγγλικό πρωτότυπο](Home). Διορθώσεις ευπρόσδεκτες μέσω GitHub.*

🌐 **Γλώσσα:** [EN](Raspberry-Pi-Storage) · [DE](DE-Raspberry-Pi-Storage) · [FR](FR-Raspberry-Pi-Storage) · [ES](ES-Raspberry-Pi-Storage) · [TR](TR-Raspberry-Pi-Storage) · **EL**

Οι κάρτες SD και η λειτουργία διακομιστή 24/7 είναι κακός συνδυασμός. Αυτή η σελίδα εξηγεί γιατί και σας οδηγεί στη σωστή εναλλακτική για τη ρύθμισή σας — βήμα προς βήμα.

---

## Γιατί αποτυγχάνουν οι κάρτες SD

Οι σύγχρονες κάρτες SD επιβιώνουν **3.000–10.000 κύκλους εγγραφής ανά block**. Αυτό ακούγεται πολύ. Δεν είναι.

| Τι γράφει στην κάρτα SD; | Πόσο συχνά; |
|---|---|
| Logs Docker container | Πολλές φορές ανά λεπτό |
| Βάση δεδομένων SQLite (διαδρομές, συνεδρίες φόρτισης) | Κάθε 30–60 δευτερόλεπτα |
| Logs συστήματος (`/var/log`) | Συνεχώς |
| Swap λειτουργικού | Υπό πίεση μνήμης |

**Ρεαλιστικό αποτέλεσμα:** Υπό το φόρτο εγγραφής του TeslaView, μια τυπική κάρτα SD διαρκεί **3–18 μήνες**, μετά:
- Διαφθορά συστήματος αρχείων → το σύστημα δεν εκκινεί
- Απώλεια δεδομένων (τα backups βοηθούν, αλλά η ζημιά έχει γίνει)
- Χειρότερη περίπτωση: σιωπηλή, μη ανιχνεύσιμη διαφθορά δεδομένων

> **Συμπέρασμα:** Η κάρτα SD είναι ΟΚ για γρήγορη δοκιμή. Για μόνιμη λειτουργία, μεταβείτε πάντα σε SSD.

---

## Δένδρο απόφασης — ποια επιλογή σας ταιριάζει;

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

## Επιλογή A: USB SSD (απλούστερο για όλα τα μοντέλα Pi)

**Τι χρειάζεστε:** Έναν φορητό SSD ή έναν 2.5" SATA SSD + αντάπτορα USB.

### Συνιστώμενο υλικό (2025)

| Προϊόν | Περίπου τιμή | Σημειώσεις |
|---|---|---|
| Samsung T7 (500 GB) | ~€55 | Εξαιρετικό, αλλά το Pi 4 χρειάζεται διόρθωση quirk (→ παρακάτω) |
| Crucial X6 (500 GB) | ~€45 | Αξιόπιστο, χωρίς quirks |
| WD My Passport SSD (500 GB) | ~€50 | Καλά δοκιμασμένο στο Raspberry Pi OS |
| 2.5" SATA SSD + UGREEN USB 3.0 αντάπτορας | ~€35–50 | Πολύ αξιόπιστο για Pi 4 |

> **Αποφύγετε φθηνούς no-name αντάπτορες USB-SATA** — συχνά έχουν προβλήματα συμβατότητας UASP στο Pi 4. Οι επώνυμοι αντάπτορες (UGREEN, Inateck) είναι πιο αξιόπιστοι.

### Βήμα 1: Γράψτε το λειτουργικό στον SSD

1. Κατεβάστε το [Raspberry Pi Imager](https://www.raspberrypi.com/software/) και εγκαταστήστε το στον κανονικό υπολογιστή σας
2. Συνδέστε τον SSD μέσω USB στον κανονικό υπολογιστή σας
3. Ανοίξτε τον Imager:
   - **Device:** επιλέξτε Raspberry Pi 4 ή 5
   - **OS:** Raspberry Pi OS Lite (64-bit) — χωρίς desktop, περισσότεροι πόροι για Docker
   - **Storage:** ο SSD σας
4. Κάντε κλικ στο εικονίδιο ⚙️ → προ-διαμορφώστε:
   - Hostname: π.χ. `tesla-pi`
   - Ενεργοποίηση SSH: ναι
   - Διαπιστευτήρια Wi-Fi (εάν δεν χρησιμοποιείτε Ethernet)
   - Όνομα χρήστη + κωδικός πρόσβασης
5. Κάντε κλικ στο **Write** — έτοιμο σε ~5 λεπτά

### Βήμα 2: Ενεργοποίηση USB boot στο Pi 4 (μία φορά, το Pi 5 το παραλείπει)

Το Pi 5 εκκινεί από USB out of the box. Το Pi 4 χρειάζεται μια εφάπαξ ενημέρωση bootloader:

```bash
# Boot from an SD card briefly, then run:
sudo raspi-config
# → Advanced Options → Boot Order → USB Boot → Finish → Reboot
```

Στη συνέχεια: αφαιρέστε την κάρτα SD, συνδέστε τον SSD, ενεργοποιήστε → το Pi εκκινεί από SSD.

### Βήμα 3: Διόρθωση quirk για Samsung T7 σε Pi 4 (εάν χρειάζεται)

Εάν το Pi 4 σας κολλάει με τον Samsung T7 (αναβοσβήνει κόκκινο LED, δεν εκκινεί):

```bash
# Open this file — must remain a single line!
sudo nano /boot/firmware/cmdline.txt

# Append at the end of the line (space before it):
usb-storage.quirks=04e8:4001:u

# Save (Ctrl+O, Enter, Ctrl+X), then reboot:
sudo reboot
```

Αυτό απενεργοποιεί το UASP μόνο για τον T7. Η απόδοση είναι ακόμα 5–10× καλύτερη από μια κάρτα SD.

### Βήμα 4: Εγκατάσταση TeslaView

```bash
curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
```

---

## Επιλογή B: NVMe SSD σε Raspberry Pi 5 (καλύτερη απόδοση)

Το Pi 5 διαθέτει **σύνδεσμο PCIe**. Με ένα M.2 HAT λαμβάνετε ταχύτητες NVMe **400–900 MB/s** — έναντι ~20–90 MB/s για κάρτες SD.

### Υλικό που χρειάζεστε

| Στοιχείο | Σύσταση | Περίπου τιμή |
|---|---|---|
| Raspberry Pi 5 (4 GB ή 8 GB) | — | από €60 |
| Επίσημο **Raspberry Pi M.2 HAT+** | Φόρμα 2230 ή 2242 | ~€15 |
| **ή** Pimoroni NVMe BASE | Συμπαγές, χωρίς spacers | ~€20 |
| **ή** Pineberry HatDrive Bottom | Στερεώνεται κάτω από το Pi | ~€25 |
| NVMe SSD M.2 **2230 ή 2242** | WD SN350, Kingston NV2, Samsung PM991 | €25–60 |

> **Η φόρμα είναι κρίσιμη:** Το επίσημο M.2 HAT+ υποστηρίζει μόνο **2230** και **2242** (κοντοί SSDs). Οι τυπικοί SSDs 2280 (οι κοινοί μακριοί) δεν χωρούν. Τα HATs τρίτων κατασκευαστών συχνά υποστηρίζουν 2280 — ελέγξτε πριν αγοράσετε.

### Βήμα 1: Συναρμολόγηση

1. Σύρετε τον SSD στη θύρα M.2 υπό γωνία, μετά πιέστε επίπεδο
2. Ασφαλίστε με την παρεχόμενη βίδα
3. Συνδέστε το ribbon cable FFC (HAT ↔ σύνδεσμος PCIe Pi 5)
4. Στερεώστε το HAT στην κεφαλή GPIO του Pi 5

### Βήμα 2: Γράψτε το λειτουργικό στο NVMe

**Εύκολη μέθοδος:** Εκκινήστε από κάρτα SD, στη συνέχεια γράψτε στο NVMe από εκεί:
```bash
sudo apt update && sudo apt install rpi-imager -y
rpi-imager
# Select NVMe SSD as target → write
```

**Εναλλακτικά:** Χρησιμοποιήστε έναν αντάπτορα USB-NVMe σε έναν κανονικό υπολογιστή και χρησιμοποιήστε το Raspberry Pi Imager όπως στην Επιλογή A.

### Βήμα 3: Ρύθμιση προτεραιότητας εκκίνησης

```bash
sudo raspi-config
# → Advanced Options → Boot Order → NVMe/USB Boot
# → Finish → Reboot
```

Αφαιρέστε την κάρτα SD → το Pi εκκινεί από NVMe.

### Βήμα 4: Προαιρετικό — ενεργοποίηση PCIe Gen 3

Το Pi 5 από προεπιλογή είναι Gen 2 (~400 MB/s). Το Gen 3 (~900 MB/s) είναι ανεπίσημο αλλά συνήθως σταθερό:

```bash
sudo nano /boot/firmware/config.txt
# Add at end:
dtparam=pciex1_gen=3
```

---

## Επιλογή C: PXE Network Boot (για homelab enthusiasts)

Το PXE boot σημαίνει ότι το Pi **δεν έχει καθόλου τοπικό αποθηκευτικό χώρο** — εκκινεί εξ ολοκλήρου μέσω δικτύου από έναν κεντρικό διακομιστή. Εξαιρετικό όταν:
- Διαχειρίζεστε πολλαπλά Pis
- Ένα NAS (Synology, TrueNAS) ή ένας mini PC είναι ήδη στο δίκτυό σας
- Προτιμάτε κεντρικά backups και διαχείριση

**Προαπαιτούμενα:**
- Gigabit Ethernet (το Wi-Fi είναι πολύ αργό/αναξιόπιστο για PXE)
- Έναν υπάρχοντα διακομιστή στο δίκτυο που μπορεί να τρέξει DHCP + TFTP + NFS
- Raspberry Pi 4 ή 5

### Γρήγορη επισκόπηση ρύθμισης

Στον διακομιστή PXE (Debian/Ubuntu):

```bash
sudo apt install dnsmasq nfs-kernel-server -y
sudo mkdir -p /srv/tftp /srv/nfs/rpi

# Add to /etc/exports:
echo "/srv/nfs/rpi *(rw,sync,no_subtree_check,no_root_squash)" | sudo tee -a /etc/exports
sudo exportfs -ra
```

**/etc/dnsmasq.conf** (proxy DHCP — λειτουργεί παράλληλα με τον υπάρχοντα router σας):
```ini
port=0
dhcp-range=192.168.1.0,proxy
log-dhcp
enable-tftp
tftp-root=/srv/tftp
pxe-service=0,"Raspberry Pi Boot"
```

Η πλήρης διαμόρφωση αντιγραφής rootfs και NFS είναι εκτενής — ακολουθήστε τον επίσημο οδηγό:
[Raspberry Pi PXE boot documentation](https://www.raspberrypi.com/documentation/computers/remote-access.html#network-boot-your-raspberry-pi)

**Αξίζει το PXE για εσάς;** Μόνο εάν τρέχετε ήδη ένα homelab με κεντρικό αποθηκευτικό χώρο. Για ένα μεμονωμένο Pi, το USB SSD ή το NVMe είναι απλούστερο και εξίσου ανθεκτικό.

---

## Μετεγκατάσταση από κάρτα SD σε SSD (χωρίς απώλεια δεδομένων)

Τρέχετε ήδη TeslaView σε κάρτα SD; Μπορείτε να μεταναστεύσετε σε περίπου 20 λεπτά χωρίς να χάσετε δεδομένα.

### Βήμα 1: Κλωνοποιήστε την κάρτα SD στον SSD

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

### Βήμα 2: Αλλάξτε την πηγή εκκίνησης

Ενεργοποιήστε το USB boot όπως περιγράφεται στην [Επιλογή A, Βήμα 2](#βήμα-2-ενεργοποίηση-usb-boot-στο-pi-4-μία-φορά-το-pi-5-το-παραλείπει), στη συνέχεια αφαιρέστε την κάρτα SD.

### Βήμα 3: Επαλήθευση

```bash
findmnt /
# Should show /dev/sda2 or nvme0n1p2, NOT mmcblk0p2
```

---

## Σύγκριση

| | Κάρτα SD | USB SSD | NVMe (Pi 5) | PXE |
|---|---|---|---|---|
| **Διάρκεια ζωής** | ❌ Μήνες | ✅ Χρόνια | ✅ Χρόνια | ✅ Καμία τοπική φθορά |
| **Προσπάθεια ρύθμισης** | ✅ Ελάχιστη | ✅ Χαμηλή | 🟡 Μεσαία (συναρμολόγηση HAT) | ❌ Υψηλή |
| **Κόστος** | ✅ ~€10 | 🟡 ~€35–60 | 🟡 ~€50–100 | ✅ €0 (αν υπάρχει διακομιστής) |
| **Ταχύτητα ανάγνωσης** | 20–90 MB/s | 200–500 MB/s | 400–900 MB/s | Ταχύτητα LAN |
| **Συνιστάται για** | Μόνο δοκιμές | Μόνιμη χρήση Pi 4 | Μόνιμη χρήση Pi 5 | Homelabs |

---

## FAQ

### Μπορώ να αφήσω την κάρτα SD μέσα αφού αλλάξω σε SSD;

Pi 4: Ναι — εάν η κάρτα SD δεν είναι bootable, το Pi την αγνοεί και εκκινεί από USB.
Pi 5: Ναι — μετά τη διαμόρφωση σειράς εκκίνησης, το NVMe/USB έχει προτεραιότητα.

### Πόσο μεγάλος πρέπει να είναι ο SSD;

60–120 GB είναι αρκετά. Η βάση δεδομένων του TeslaView αναπτύσσεται σε μερικές εκατοντάδες MB μέσα σε χρόνια. Η αγορά ελαφρώς μεγαλύτερου είναι φθηνή και δίνει στον ελεγκτή SSD περισσότερα blocks για wear levelling → μεγαλύτερη διάρκεια ζωής.

### Μπορώ να χρησιμοποιήσω ένα USB flash drive αντί;

Τεχνικά ναι, αλλά **δεν συνιστάται**. Τα flash drives δεν έχουν wear levelling — πεθαίνουν πιο γρήγορα από τις κάρτες SD. Η διαφορά τιμής με έναν φθηνό SSD είναι ελάχιστη.

### Τι γίνεται με τις διακοπές ρεύματος;

Οι SSDs είναι πιο ανθεκτικοί από τις κάρτες SD κατά την αιφνίδια απώλεια ρεύματος, αλλά όχι ανοσοι. Χρησιμοποιήστε το ενσωματωμένο backup: **Admin → Data → Backup** τακτικά, ή ενεργοποιήστε αυτοματοποιημένα νυχτερινά backups.

---

## Χρήσιμοι Σύνδεσμοι

- [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
- [Official M.2 HAT+ documentation](https://www.raspberrypi.com/documentation/accessories/m2-hat-plus.html)
- [Raspberry Pi PXE boot guide](https://www.raspberrypi.com/documentation/computers/remote-access.html#network-boot-your-raspberry-pi)
- [raspberry.tips: Boot Pi 4 from USB SSD](https://raspberry.tips/en/raspberrypi-tutorials/boot-raspberry-pi-from-usb-ssd-flash-drive-pi-4-5)
- [raspberry.tips: Pi 5 NVMe setup + benchmarks](https://raspberry.tips/en/raspberrypi-tutorials/raspberry-pi-5-nvme-ssd-boot)

---

*→ [[EL-Installation]] | [[EL-Network-Access]] | [[EL-Home]]*
