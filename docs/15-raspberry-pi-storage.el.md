# Raspberry Pi: Επιλογή σωστού αποθηκευτικού χώρου — τέλος στο θάνατο της SD card

> 🤖 *Αυτή η ελληνική μετάφραση είναι υποστηριζόμενη από AI από το [README.en.md](README.en.md). Διορθώσεις ευπρόσδεκτες μέσω GitHub.*

> 🇩🇪 [Auf Deutsch lesen](15-raspberry-pi-storage.md)

Οι κάρτες SD και η λειτουργία 24/7 είναι κακός συνδυασμός. Αυτό το κεφάλαιο εξηγεί **γιατί**, ποια εναλλακτική ταιριάζει καλύτερα στο setup σας και πώς να το λειτουργήσετε σε 20 λεπτά.

---

## Το πρόβλημα: Γιατί οι κάρτες SD δεν είναι κατάλληλες για διακομιστές

Οι σύγχρονες κάρτες SD επιβιώνουν τυπικά **3.000–10.000 κύκλους εγγραφής ανά μπλοκ αποθήκευσης** — οι παλιότερες κάρτες ακόμα λιγότερους. Αυτό ακούγεται σαν πολλά. Δεν είναι.

| Τι γράφει στην κάρτα SD; | Συχνότητα |
|---|---|
| Logs Docker container | Πολλές φορές το λεπτό |
| Βάση SQLite (διαδρομές, sessions φόρτισης) | Κάθε κύκλο polling (κάθε 30–60 s) |
| Logs συστήματος (`/var/log`) | Συνεχώς |
| Αρχείο swap OS | Υπό πίεση μνήμης |

**Ρεαλιστικό αποτέλεσμα:** Μια τυπική κάρτα SD κάτω από το φορτίο εγγραφής του Tesla Carview διαρκεί **3–18 μήνες**, μετά:
- Διαφθορά συστήματος αρχείων → το σύστημα δεν εκκινεί
- Απώλεια δεδομένων (τα backups βοηθούν, αλλά η ζημιά έχει γίνει)
- Χειρότερο σενάριο: σιωπηλή, ανεντόπιστη διαφθορά δεδομένων

> **Συμπέρασμα: Η κάρτα SD είναι μια χαρά για γρήγορα πειράματα. Για μόνιμη λειτουργία, αντικαταστήστε την πάντα.**

---

## Ποια επιλογή είναι κατάλληλη για μένα;

```
Τι Raspberry Pi έχετε;
│
├── Raspberry Pi 5
│     ├── Θέλετε μέγιστες επιδόσεις και διάρκεια ζωής;
│     │     → Επιλογή B: NVMe SSD μέσω M.2 HAT+ ⭐ (συνιστάται)
│     └── Απλά & φθηνά, χωρίς συναρμολόγηση;
│           → Επιλογή A: USB SSD (εξαιρετικό και στο Pi 5)
│
├── Raspberry Pi 4
│     ├── Homelab με Gigabit δίκτυο + υπάρχοντα διακομιστή;
│     │     → Επιλογή C: PXE network boot (δεν χρειάζεται τοπικός αποθηκευτικός χώρος)
│     └── Κανονικό οικιακό δίκτυο, χωρίς πρόσθετο διακομιστή;
│           → Επιλογή A: USB SSD (απλούστερη λύση)
│
└── Raspberry Pi 3 ή παλιότερο
      → Δεν υποστηρίζεται πλέον (32-bit ARM). Το Tesla Carview
        απαιτεί Pi 4 ή 5 — δείτε Εγκατάσταση.
```

---

## Επιλογή A: USB SSD (απλούστερη λύση για όλα τα μοντέλα Pi)

**Τι χρειάζεστε:**
- Ένα portable SSD **ή** ένα 2,5″ SSD + USB adapter
- Αυτό είναι όλο

**Συνιστώμενο υλικό (2025):**

| Προϊόν | Τιμή περίπου | Σημειώσεις |
|---|---|---|
| Samsung T7 (500 GB) | ~55€ | Εξαιρετικό, αλλά το Pi 4 χρειάζεται quirk workaround (→ παρακάτω) |
| Crucial X6 (500 GB) | ~45€ | Αξιόπιστο, χωρίς ιδιορρυθμίες |
| WD My Passport SSD (500 GB) | ~50€ | Καλά δοκιμασμένο κάτω από Raspberry Pi OS |
| 2,5″ SATA SSD + UGREEN USB 3.0 adapter | ~35–50€ | Πολύ αξιόπιστο, συνιστάται για Pi 4 |

> **Αποφύγετε φθηνά adapters:** Ορισμένα no-name USB-SATA adapters έχουν προβλήματα UASP (USB Attached SCSI Protocol) στο Pi 4. Επώνυμα adapters (UGREEN, Inateck) είναι πιο αξιόπιστα.

### Βήμα 1: Γράψτε το OS στο SSD

1. Κατεβάστε το **Raspberry Pi Imager**: [https://www.raspberrypi.com/software/](https://www.raspberrypi.com/software/)
2. Συνδέστε το SSD μέσω USB στον κανονικό σας υπολογιστή
3. Ανοίξτε το Imager:
   - **Συσκευή:** επιλέξτε Raspberry Pi 4 ή 5
   - **OS:** Raspberry Pi OS Lite (64-bit) — χωρίς desktop, εξοικονομεί πόρους
   - **Αποθήκευση:** το SSD σας
4. Κλικ στο εικονίδιο γραναζιού (⚙️) → προδιαμόρφωση:
   - Ορίστε hostname (π.χ. `tesla-pi`)
   - Ενεργοποιήστε SSH
   - Εισάγετε διαπιστευτήρια Wi-Fi (αν δεν χρησιμοποιείτε Ethernet)
   - Ορίστε username + password
5. **Γράψτε** — έτοιμο σε περίπου 5 λεπτά

### Βήμα 2: Ενημερώστε τον bootloader στο Pi 4 (μόνο Pi 4, μία φορά)

Το Pi 4 χρειάζεται να διαμορφωθεί μία φορά για να εκκινεί από USB. **Το Pi 5 το κάνει out of the box — παρακάμψτε αυτό το βήμα.**

```bash
# Είτε: εκκινήστε σύντομα από κανονική κάρτα SD, μετά:
sudo raspi-config
# → Advanced Options → Boot Order → USB Boot → Finish → Reboot

# Ή απευθείας μέσω EEPROM:
sudo rpi-eeprom-update -a
sudo reboot
```

Στη συνέχεια: αφαιρέστε την κάρτα SD, συνδέστε το SSD, ανάψτε το Pi → εκκινεί από SSD.

### Βήμα 3: Ιδιορρυθμία Samsung T7 στο Pi 4 (αν χρειάζεται)

Αν το Pi 4 δεν εκκινεί με το Samsung T7 (κολλάει στην κόκκινη οθόνη με τον κεραυνό):

```bash
# Ανοίξτε το /boot/firmware/cmdline.txt (πρέπει να παραμείνει μία γραμμή!):
sudo nano /boot/firmware/cmdline.txt

# Προσθέστε στο τέλος της γραμμής (με κενό πριν):
usb-storage.quirks=04e8:4001:u

# Αποθηκεύστε, reboot:
sudo reboot
```

Αυτό απενεργοποιεί το UASP για το T7 — οι επιδόσεις είναι ακόμα 5–10× καλύτερες από κάρτα SD.

### Βήμα 4: Εγκαταστήστε Tesla Carview

Από εδώ, προχωρήστε όπως περιγράφεται στο [02-deployment.en.md](02-deployment.en.md):

```bash
curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
```

---

## Επιλογή B: NVMe SSD σε Raspberry Pi 5 (βέλτιστες επιδόσεις)

Το Pi 5 έχει έναν **σύνδεσμο PCIe** — με το επίσημο M.2 HAT+ ή adapter τρίτου κατασκευαστή, παίρνετε ταχύτητες NVMe **400–900 MB/s** (συγκρίνετε: κάρτα SD 20–90 MB/s).

**Τι χρειάζεστε:**

| Εξάρτημα | Σύσταση | Τιμή περίπου |
|---|---|---|
| Raspberry Pi 5 (4 GB ή 8 GB RAM) | — | από 60€ |
| Επίσημο **Raspberry Pi M.2 HAT+** | form factor 2230 ή 2242 | ~15€ |
| **ή** Pimoroni NVMe BASE | Συμπαγές, δεν χρειάζονται spacers | ~20€ |
| **ή** Pineberry HatDrive Bottom | Στερεώνεται κάτω από το Pi | ~25€ |
| NVMe SSD M.2 2230 ή 2242 | WD Green SN350, Kingston NV2, Samsung PM991 | 25–60€ |

> **Ελέγξτε το form factor:** Το M.2 HAT+ υποστηρίζει μόνο **2230** και **2242** (κοντά/μέτρια SSDs). Τα τυπικά SSDs 2280 (τα μακριά) δεν χωρούν στο επίσημο HAT+ — αλλά μερικά HATs τρίτων τα υποστηρίζουν.

### Βήμα 1: Συναρμολογήστε το υλικό

1. Σύρετε το SSD στην υποδοχή M.2 υπό γωνία, μετά πιέστε επίπεδα
2. Ασφαλίστε με την παρεχόμενη βίδα
3. Συνδέστε το επίπεδο καλώδιο κορδέλας FFC (HAT → σύνδεσμος PCIe του Pi 5)
4. Στερεώστε το HAT στον GPIO header του Pi 5

### Βήμα 2: Γράψτε το OS στο NVMe SSD

**Παραλλαγή A (εύκολη):** Γράψτε από ένα ενεργό Pi OS απευθείας στο NVMe:

```bash
# Εκκινήστε το Pi με κάρτα SD, μετά:
sudo apt update && sudo apt install rpi-imager -y
rpi-imager
# → Επιλέξτε NVMe SSD ως στόχο → γράψτε
```

**Παραλλαγή B:** Γράψτε στο SSD χρησιμοποιώντας USB-NVMe adapter σε κανονικό υπολογιστή (ίδιο με την Επιλογή A).

### Βήμα 3: Ορίστε τη σειρά εκκίνησης

```bash
sudo raspi-config
# → Advanced Options → Boot Order → NVMe/USB Boot
# → Finish → Reboot
```

Αφαιρέστε την κάρτα SD, επανεκκινήστε το Pi → εκκινεί από NVMe.

### Βήμα 4: Βελτιστοποιήστε την ταχύτητα PCIe (προαιρετικά)

Το Pi 5 τρέχει PCIe σε Gen 2 από προεπιλογή (~400 MB/s). Το Gen 3 (~900 MB/s) είναι δυνατό αλλά δεν υποστηρίζεται επίσημα:

```bash
# /boot/firmware/config.txt:
sudo nano /boot/firmware/config.txt

# Για Gen 3 (με δική σας ευθύνη, συνήθως σταθερό):
dtparam=pciex1_gen=3
```

---

## Επιλογή C: PXE network boot (για ενθουσιώδεις homelab)

**Τι είναι;** Το Pi δεν έχει καθόλου τοπικό αποθηκευτικό χώρο. Εκκινεί **εξ ολοκλήρου μέσω του δικτύου** από έναν κεντρικό διακομιστή. Ιδανικό όταν:
- Διαχειρίζεστε πολλαπλά Pis
- Είναι ήδη διαθέσιμο ένα NAS (Synology, TrueNAS) ή mini PC ως διακομιστής
- Προτιμάτε κεντρικά backups και ενημερώσεις

**Απαιτήσεις:**
- Gigabit Ethernet (όχι Wi-Fi — πολύ αργό και αναξιόπιστο για PXE)
- Διακομιστής στο δίκτυο που μπορεί να παρέχει DHCP + TFTP (NAS, παλιός PC, Pi 4)
- Raspberry Pi 4 ή 5

### Γρήγορη εγκατάσταση: διακομιστής PXE με dnsmasq

Στον διακομιστή (Debian/Ubuntu ή το NAS):

```bash
# Εγκατάσταση dnsmasq
sudo apt install dnsmasq -y

# Δημιουργήστε κατάλογο TFTP
sudo mkdir -p /srv/tftp/rpi

# Ρυθμίστε NFS root filesystem για το Pi:
sudo apt install nfs-kernel-server -y
sudo mkdir -p /srv/nfs/rpi

# /etc/exports:
echo "/srv/nfs/rpi *(rw,sync,no_subtree_check,no_root_squash)" | sudo tee -a /etc/exports
sudo exportfs -ra
```

**/etc/dnsmasq.conf** (λειτουργία proxy DHCP — λειτουργεί παράλληλα με το υπάρχον router):

```ini
port=0
dhcp-range=192.168.1.0,proxy
log-dhcp
enable-tftp
tftp-root=/srv/tftp
pxe-service=0,"Raspberry Pi Boot"
```

Η πλήρης εγκατάσταση (αντιγραφή rootfs, διαμόρφωση NFS, διαμόρφωση από πλευράς Pi) είναι εκτεταμένη — ακολουθήστε την επίσημη τεκμηρίωση PXE του Raspberry Pi:
[https://www.raspberrypi.com/documentation/computers/remote-access.html#network-boot-your-raspberry-pi](https://www.raspberrypi.com/documentation/computers/remote-access.html#network-boot-your-raspberry-pi)

**Πότε αξίζει πραγματικά το PXE;** Όταν ήδη τρέχετε homelab με κεντρικό αποθηκευτικό χώρο. Για ένα μεμονωμένο Pi, USB SSD ή NVMe είναι απλούστερο και εξίσου καλό.

---

## Μετάβαση από κάρτα SD σε SSD (υπάρχουσα εγκατάσταση)

Τρέχει ήδη Tesla Carview σε κάρτα SD και θέλετε να μεταβείτε σε SSD; Κανένα πρόβλημα — χωρίς απώλεια δεδομένων:

### Βήμα 1: Κλωνοποιήστε την κάρτα SD στο SSD

```bash
# Συνδέστε το SSD μέσω USB στο τρέχον Pi
# Εντοπίστε τον δίσκο στόχο:
lsblk
# → το SSD εμφανίζεται συνήθως ως /dev/sda

# Κλωνοποίηση κάρτας SD σε SSD (το Pi μπορεί να παραμείνει σε λειτουργία):
sudo dd if=/dev/mmcblk0 of=/dev/sda bs=4M status=progress conv=fsync

# Αλλαγή μεγέθους του partition στο SSD ώστε να χρησιμοποιεί όλο τον διαθέσιμο χώρο:
sudo parted /dev/sda resizepart 2 100%
sudo resize2fs /dev/sda2
```

### Βήμα 2: Εκκίνηση από SSD

Ενημερώστε τον bootloader όπως περιγράφεται παραπάνω (Επιλογή A, Βήμα 2), στη συνέχεια αφαιρέστε την κάρτα SD — το SSD παραμένει συνδεδεμένο.

### Βήμα 3: Επαλήθευση

```bash
# Ελέγξτε ότι εκκινήσαμε από SSD:
findmnt /
# → θα πρέπει να δείχνει /dev/sda2 ή nvme0n1p2, ΟΧΙ mmcblk0p2
```

---

## Γρήγορη σύγκριση όλων των επιλογών

| | Κάρτα SD | USB SSD | NVMe (Pi 5) | PXE |
|---|---|---|---|---|
| **Διάρκεια ζωής** | ❌ Μήνες | ✅ Χρόνια | ✅ Χρόνια | ✅ Χωρίς τοπική φθορά |
| **Προσπάθεια setup** | ✅ Ελάχιστη | ✅ Χαμηλή | 🟡 Μέτρια (συναρμολόγηση HAT) | ❌ Υψηλή |
| **Κόστος** | ✅ ~10€ | 🟡 ~35–60€ | 🟡 ~50–100€ | ✅ 0€ (αν υπάρχει διακομιστής) |
| **Ταχύτητα ανάγνωσης** | 20–90 MB/s | 200–500 MB/s | 400–900 MB/s | Ταχύτητα LAN |
| **Συνιστάται για** | Δοκιμές | Μόνιμη χρήση Pi 4 | Μόνιμη χρήση Pi 5 | Homelab |

---

## Συχνές ερωτήσεις

### "Πρέπει να αφαιρέσω την κάρτα SD ή μπορώ να την αφήσω μέσα;"

Στο Pi 4: Μετά την ενημέρωση bootloader, η κάρτα SD μπορεί να αφαιρεθεί. Το Pi θα εκκινεί τότε πάντα από USB. Αν την αφήσετε μέσα και είναι κενή ή μη bootable, εκκινεί ακόμα από USB.

Στο Pi 5: Η κάρτα SD μπορεί να παραμείνει εισαγμένη — μετά τη διαμόρφωση το Pi προτιμά ούτως ή άλλως NVMe/USB.

### "Πόσο μεγάλο πρέπει να είναι το SSD;"

**60–120 GB** είναι αρκετά για το Tesla Carview. Η βάση SQLite μεγαλώνει σε μερικές εκατοντάδες MB στο πέρας ετών. Η αγορά μεγαλύτερου κοστίζει ελάχιστα παραπάνω και δίνει στον SSD controller περισσότερο χώρο για wear levelling → μεγαλύτερη διάρκεια ζωής.

### "Τι γίνεται με τις διακοπές ρεύματος — χάνω δεδομένα;"

Τα SSDs και NVMe SSDs είναι πιο ανθεκτικά από τις κάρτες SD κατά τη διάρκεια διακοπών ρεύματος, αλλά όχι άτρωτα. Για σημαντικά δεδομένα: **τακτικά backups** μέσω της admin interface του Tesla Carview (`Admin → Data → Backup`) ή ενεργοποιήστε αυτόματα νυχτερινά backups.

### "Μπορώ να χρησιμοποιήσω USB flash drive αντί για SSD;"

Τεχνικά ναι, αλλά **δεν συνιστάται**. Τα USB flash drives συνήθως δεν έχουν αλγόριθμους wear levelling — πεθαίνουν ακόμα πιο γρήγορα από τις κάρτες SD. Η διαφορά τιμής με ένα φθηνό SSD είναι ελάχιστη.

---

## Χρήσιμοι σύνδεσμοι

- [Λήψη Raspberry Pi Imager](https://www.raspberrypi.com/software/)
- [raspberry.tips: Boot Pi 4 from USB SSD (EN)](https://raspberry.tips/en/raspberrypi-tutorials/boot-raspberry-pi-from-usb-ssd-flash-drive-pi-4-5)
- [raspberry.tips: Pi 5 NVMe setup + benchmarks (EN)](https://raspberry.tips/en/raspberrypi-tutorials/raspberry-pi-5-nvme-ssd-boot)
- [Επίσημη τεκμηρίωση Pi M.2 HAT+](https://www.raspberrypi.com/documentation/accessories/m2-hat-plus.html)
- [Τεκμηρίωση Raspberry Pi PXE boot](https://www.raspberrypi.com/documentation/computers/remote-access.html#network-boot-your-raspberry-pi)
- [Υπολογιστής διάρκειας ζωής κάρτας SD](https://raspberry.tips/en/calculate-raspberry-pi-sd-card-lifespan-test-now)

---

*→ Επιστροφή στο [02-deployment.en.md](02-deployment.en.md) | [Πρόσβαση δικτύου](14-network-access.en.md) | [Όλα τα docs](README.en.md)*
