# Πρόσβαση από οπουδήποτε — χωρίς στατική IP

> 🤖 *Αυτή η ελληνική μετάφραση είναι υποστηριζόμενη από AI από το [README.en.md](README.en.md). Διορθώσεις ευπρόσδεκτες μέσω GitHub.*

> 🇩🇪 [Auf Deutsch lesen](14-network-access.md)

Αυτό το κεφάλαιο εξηγεί **βήμα-βήμα** πώς να κάνετε το Tesla Carview προσβάσιμο από οπουδήποτε — ακόμα και χωρίς σταθερή δημόσια διεύθυνση IP, ακόμα και πίσω από οικιακό router, ακόμα και σε οικιακή σύνδεση internet.

> **Δεν είστε ειδικός IT; Κανένα πρόβλημα.** Κάθε επιλογή περιλαμβάνει ακριβείς οδηγίες βήμα-βήμα που μπορείτε να ακολουθήσετε χωρίς προηγούμενη γνώση.

---

## Ποια επιλογή είναι κατάλληλη για μένα;

| Κατάσταση | Καλύτερη επιλογή |
|---|---|
| Οικιακό internet (router), η IP αλλάζει καθημερινά | [Επιλογή A: Cloudflare Tunnel](#option-a-cloudflare-tunnel-recommended-for-home-use) ή [Επιλογή B: DynDNS + Router](#option-b-dyndns--home-router) |
| Cable ή οπτική ίνα — **δεν μπορώ να ανοίξω θύρες** (CG-NAT) | [Επιλογή A: Cloudflare Tunnel](#option-a-cloudflare-tunnel-recommended-for-home-use) |
| Δικός μου διακομιστής / VPS σε hosting provider (netcup, Hetzner) | [Επιλογή C: VPS με στατική IP](#option-c-vps-at-a-hosting-provider-netcup-hetzner-contabo) |
| Διαθέσιμο δικό μου domain | [Επιλογή D: Δικό μου domain + DNS record](#option-d-own-domain-with-dns-record) |

---

## Το πρόβλημα με τις δυναμικές διευθύνσεις IP

Η οικιακή σας σύνδεση internet **δεν έχει σταθερή διεύθυνση IP** — το router λαμβάνει νέα καθημερινά (ή συχνότερα). Αυτό σημαίνει: αν πληκτρολογήσετε σήμερα `192.0.2.47` στην εφαρμογή, αύριο θα είναι λάθος.

Η λύση λέγεται **Dynamic DNS (DynDNS ή DDNS)**:
- Δεσμεύετε ένα σταθερό όνομα domain (π.χ. `my-tesla.duckdns.org`)
- Ένα μικρό πρόγραμμα (που τρέχει αυτόματα στο router ή τον διακομιστή) αναφέρει τη νέα IP κάθε φορά που αλλάζει
- Το όνομα domain σας δείχνει πάντα στην τρέχουσα IP — δεν χρειάζεται ποτέ να αλλάξετε κάτι χειροκίνητα

---

## Άλλο πρόβλημα: Καμία δημόσια IPv4 (CG-NAT)

Πολλές καλωδιακές συνδέσεις internet (π.χ. Vodafone, Virgin Media, ορισμένοι πάροχοι κινητής) δεν παρέχουν πλέον τη δική τους δημόσια διεύθυνση IPv4. Πολλοί πελάτες μοιράζονται μία IP. Αυτό λέγεται Carrier-Grade NAT (CG-NAT).

**Τεστ ανίχνευσης:** Πηγαίνετε στο [https://api4.my-ip.io/ip](https://api4.my-ip.io/ip) και συγκρίνετε την εμφανιζόμενη IP με την IP που δείχνει το router στη σελίδα κατάστασής του. Αν οι IPs είναι **διαφορετικές** → είστε πίσω από CG-NAT. Η Επιλογή B **δεν θα λειτουργήσει**.

Με CG-NAT, η **Επιλογή A (Cloudflare Tunnel)** είναι η μόνη λύση χωρίς πρόσθετο διακομιστή.

---

## Επιλογή A: Cloudflare Tunnel (συνιστάται για οικιακή χρήση)

**Τι είναι;** Το Cloudflare Tunnel δημιουργεί μια κρυπτογραφημένη εξερχόμενη σύνδεση από τον διακομιστή σας προς το internet — χωρίς άνοιγμα καμίας θύρας στο router. Το instance του Tesla Carview γίνεται προσβάσιμο μέσω του παγκόσμιου δικτύου της Cloudflare.

**Κόστος:** Δωρεάν.

**Απαιτήσεις:**
- Ένα domain (π.χ. `mydomain.com`) **ή** ένα δωρεάν subdomain (οδηγίες παρακάτω)
- Το domain πρέπει να διαχειρίζεται από την Cloudflare (δωρεάν βήμα)

### Βήμα 1: Αποκτήστε δωρεάν domain (αν δεν έχετε)

Χωρίς δικό σας domain, χρησιμοποιήστε το DuckDNS:
1. Πηγαίνετε στο [https://www.duckdns.org](https://www.duckdns.org) και συνδεθείτε με Google ή GitHub
2. Επιλέξτε όνομα, π.χ. `my-tesla` → παίρνετε `my-tesla.duckdns.org`
3. Σημειώστε το **token** σας (η μακριά αλφαριθμητική συμβολοσειρά που εμφανίζεται κάτω από το προφίλ σας)

Εναλλακτικά: Πάρτε ένα φθηνό domain από ~1$/χρόνο σε [Namecheap](https://www.namecheap.com), [Porkbun](https://www.porkbun.com) ή [inwx.de](https://www.inwx.de).

### Βήμα 2: Λογαριασμός Cloudflare + προσθήκη domain

1. Πηγαίνετε στο [https://dash.cloudflare.com](https://dash.cloudflare.com) → εγγραφή δωρεάν
2. Κλικ στο **"Add a Site"** και πληκτρολογήστε το domain σας
3. Επιλέξτε το **Free plan** (0€)
4. Η Cloudflare σας δείχνει δύο διευθύνσεις nameserver, π.χ.:
   ```
   alice.ns.cloudflare.com
   bob.ns.cloudflare.com
   ```
5. Πηγαίνετε στον καταχωρητή του domain σας (Namecheap, IONOS κ.λπ.) και εισάγετε αυτά **ως nameservers**
   - Στο Namecheap: Domain List → Manage → Nameservers → Custom DNS
   - Στο IONOS: Domains → το domain σας → Nameservers → Custom nameservers
6. Περιμένετε 10–30 λεπτά μέχρι η Cloudflare να επιβεβαιώσει: **"Nameservers updated"**

### Βήμα 3: Δημιουργία του tunnel

Στον διακομιστή σας (μέσω SSH ή terminal):

```bash
# Εγκατάσταση cloudflared
curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb \
  -o /tmp/cloudflared.deb
dpkg -i /tmp/cloudflared.deb

# Σύνδεση στον λογαριασμό Cloudflare (ανοίγει παράθυρο browser)
cloudflared tunnel login

# Δημιουργία του tunnel (επιλέξτε όποιο όνομα θέλετε)
cloudflared tunnel create tesla-carview

# Αυτό εμφανίζει: Tunnel ID (π.χ. "abc123-...") — σημειώστε το!
```

### Βήμα 4: Διαμόρφωση του tunnel

```bash
mkdir -p /etc/cloudflared
nano /etc/cloudflared/config.yml
```

Περιεχόμενο (αντικαταστήστε `YOUR_TUNNEL_ID` και `yourdomain.com`):

```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: /root/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: tesla.yourdomain.com
    service: http://localhost:80
  - service: http_status:404
```

Δημιουργία DNS record (η Cloudflare το κάνει αυτόματα):
```bash
cloudflared tunnel route dns tesla-carview tesla.yourdomain.com
```

### Βήμα 5: Εγκατάσταση ως service (ξεκινά αυτόματα μετά από επανεκκίνηση)

```bash
cloudflared service install
systemctl enable cloudflared
systemctl start cloudflared
```

**Έτοιμο!** Το Tesla Carview είναι τώρα προσβάσιμο στο `https://tesla.yourdomain.com` — με αυτόματο HTTPS, χωρίς port forwarding, χωρίς στατική IP.

---

## Επιλογή B: DynDNS + Οικιακό Router

> **Σημαντικό:** Λειτουργεί μόνο αν έχετε **δική σας δημόσια IPv4** διεύθυνση (όχι CG-NAT). Δοκιμάστε το πρώτα — [δείτε παραπάνω](#another-problem-no-public-ipv4-cg-nat).

**Τι είναι;** Το router σας αναφέρει αυτόματα τη νέα του διεύθυνση IP σε μια υπηρεσία DynDNS. Μπορείτε πάντα να φτάσετε το Tesla Carview κάτω από το ίδιο όνομα domain.

### Βήμα 1: Επιλέξτε υπηρεσία DynDNS και κάντε εγγραφή

**Συνιστάται: Dynu** (εντελώς δωρεάν, καμία μηνιαία επιβεβαίωση δεν απαιτείται)

1. Πηγαίνετε στο [https://www.dynu.com](https://www.dynu.com) → δημιουργήστε λογαριασμό
2. DDNS → Add → πληκτρολογήστε όνομα, π.χ. `my-tesla` → παίρνετε `my-tesla.freeddns.org`
3. Σημειώστε: **hostname**, **username**, **password** (κάτω από Control Panel → API Credentials)

**Εναλλακτικά: DuckDNS** (ακόμα πιο απλό, αλλά απαιτεί χειροκίνητη διαμόρφωση router)

1. [https://www.duckdns.org](https://www.duckdns.org) → σύνδεση → επιλέξτε subdomain
2. Update URL: `https://www.duckdns.org/update?domains=YOURNAME&token=YOURTOKEN&ip=`

### Βήμα 2: Διαμορφώστε το router σας

Για **FritzBox:**
1. Ανοίξτε το interface της FritzBox: [http://fritz.box](http://fritz.box)
2. **Internet → Sharing → DynDNS**
3. Επιλέξτε **"Use DynDNS"**
4. Συμπληρώστε:

   | Πεδίο | Τιμή Dynu |
   |---|---|
   | Πάροχος DynDNS | Καθορισμένος από χρήστη |
   | Update URL | `https://api.dynu.com/nic/update?hostname=<domain>&myip=<ipaddr>` |
   | Όνομα domain | `my-tesla.freeddns.org` |
   | Username | Dynu username |
   | Password | Dynu password |

5. **Apply** → η FritzBox δοκιμάζει τη σύνδεση → πράσινο τικ = λειτουργεί

Για **άλλους routers:** Αναζητήστε "Dynamic DNS" ή "DDNS" στις ρυθμίσεις του router — οι περισσότεροι σύγχρονοι routers το υποστηρίζουν με παρόμοια πεδία.

### Βήμα 3: Port forwarding

Ώστε η κίνηση από έξω να φτάνει στον διακομιστή σας:

1. **Internet → Sharing → Port Sharing** (FritzBox)
2. **New Port Sharing** → **Other Application**
3. Συμπληρώστε:

   | Πεδίο | Τιμή |
   |---|---|
   | Όνομα | Tesla Carview HTTPS |
   | Πρωτόκολλο | TCP |
   | Εξωτερική θύρα | 443 |
   | Προς συσκευή | IP του διακομιστή σας στο τοπικό δίκτυο (π.χ. `192.168.1.100`) |
   | Εσωτερική θύρα | 443 |

4. **Apply** και ενεργοποίηση

> **Συμβουλή:** Δώστε στον διακομιστή σας μια **σταθερή (στατική) τοπική IP** ώστε το port forwarding να μην "ξεστρατίζει". Στη FritzBox: Home Network → Network → η συσκευή σας → Always assign this IP.

### Βήμα 4: Διαμόρφωση Tesla Carview

Ανοίξτε το `/opt/tesla-carview/backend/.env` και ορίστε:

```bash
FRONTEND_URL=https://my-tesla.freeddns.org
```

Αποκτήστε πιστοποιητικό SSL μέσω Let's Encrypt:
```bash
certbot --nginx -d my-tesla.freeddns.org
```

**Έτοιμο!** Προσβάσιμο στο `https://my-tesla.freeddns.org`.

---

## Επιλογή C: VPS σε hosting provider (netcup, Hetzner, Contabo)

Ένα VPS (Virtual Private Server) είναι ένας μικρός ενοικιαζόμενος Linux διακομιστής σε data centre. Έχει πάντα **σταθερή, δημόσια διεύθυνση IPv4** — δεν χρειάζονται κόλπα DynDNS.

**Σύγκριση τιμών (2026):**

| Πάροχος | Προϊόν | Τιμή/μήνα | Specs | Σημειώσεις |
|---|---|---|---|---|
| [netcup](https://www.netcup.com/en/server/vps-lite) | **VPS nano G11s** ⭐ | **~3,08€** | 2 vCore · 2 GB RAM · 60 GB SSD | Φθηνότερο σημείο εκκίνησης, γερμανικό DC, απεριόριστο traffic — **συνιστάται για το TeslaView** |
| [netcup](https://www.netcup.eu) | VPS 1000 G11 | ~4,44€ | 2 vCore · 2 GB RAM · 40 GB SSD | Ελαφρώς μεγαλύτερο περιθώριο επιδόσεων |
| [Hetzner](https://www.hetzner.com) | CX22 | ~4,35€ | 2 vCPU · 4 GB RAM · 40 GB | Πολύ αξιόπιστος, Νυρεμβέργη/Falkenstein |
| [Contabo](https://contabo.com) | VPS S | ~5,99€ | 4 vCPU · 8 GB RAM · 100 GB | Πολύς χώρος για multi-tenant |
| [IONOS](https://www.ionos.com) | VPS S | ~1,00€ | 1 vCore · 1 GB RAM · 10 GB | Πρώτος μήνας φθηνός, μετά υψηλότερος |

> 💡 **Κωδικός έκπτωσης για netcup:** Μπορούμε να σας στείλουμε προσωπικό κωδικό έκπτωσης για το netcup κατόπιν αιτήματος. Στείλτε ένα σύντομο e-mail στο [rabatt-code-netcup@krische.com](mailto:rabatt-code-netcup@krische.com) με το θέμα "netcup TeslaView".

> **Γιατί VPS nano G11s για το TeslaView;** Το Tesla Carview χρησιμοποιεί ~150–200 MB RAM σε idle (backend + nginx + proxy). 2 GB RAM δίνουν άπλετο περιθώριο. Το 60 GB SSD έχει χώρο για πολλά χρόνια δεδομένων τηλεμετρίας (το SQLite μεγαλώνει ~500 MB/χρόνο για ένα ενεργό όχημα). 2 vCores εξασφαλίζουν ότι τα ερωτήματα εξαγωγής και μετάβασης δεν μπλοκάρουν τον poller.

### Setup στο netcup (παράδειγμα)

1. Εγγραφή στο [netcup.eu](https://www.netcup.eu)
2. **Server Control Panel (SCP)** → παραγγείλτε VPS → επιλέξτε Ubuntu 24.04
3. Αντιγράψτε τον κωδικό root από το e-mail επιβεβαίωσης
4. Ανοίξτε ένα terminal και συνδεθείτε:
   ```bash
   ssh root@YOUR-SERVER-IP
   ```
5. Εγκατάσταση Tesla Carview:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
   ```

Το setup script ρωτά για όνομα domain. Πληκτρολογήστε το domain σας (π.χ. `tesla.yourdomain.com`) — το Let's Encrypt και το nginx διαμορφώνονται αυτόματα.

### Δείξτε ένα domain στο VPS

Αν έχετε δικό σας domain, δημιουργήστε ένα **A record**:

```
tesla.yourdomain.com  →  A  →  YOUR-VPS-IP  →  TTL 300
```

Πώς να το κάνετε: [→ Επιλογή D παρακάτω](#option-d-own-domain-with-dns-record)

---

## Επιλογή D: Δικό σας domain με DNS record

Αν έχετε δικό σας domain (π.χ. `yourdomain.com`) και διακομιστή με **σταθερή IP** (VPS ή στατική οικιακή IP), όλα όσα χρειάζεστε είναι ένα DNS record.

### Τι είναι ένα A record;

Ένα **A record** λειτουργεί σαν εγγραφή τηλεφωνικού καταλόγου:
- Αριστερά είναι το όνομα: `tesla.yourdomain.com`
- Δεξιά είναι η διεύθυνση: `123.456.789.0` (η IP του διακομιστή σας)
- Κάθε browser που επισκέπτεται το `tesla.yourdomain.com` ενημερώνεται: "Η IP είναι `123.456.789.0`"

### Πώς να δημιουργήσετε ένα A record

**Στο Namecheap:**
1. Domain List → Manage → Advanced DNS → Add New Record
2. Τύπος: **A Record**, Host: `tesla`, Value: η IP του διακομιστή σας
3. Save All Changes

**Στο IONOS:**
1. Domains → το domain σας → DNS → Add record
2. Τύπος: **A**, Hostname: `tesla`, Destination: η IP του διακομιστή σας
3. Save

**Στο inwx.de:**
1. Domain management → DNS → Add record
2. Τύπος: **A**, Name: `tesla`, Content: η IP του διακομιστή σας, TTL: 300
3. Save

**Στο Hetzner DNS Console ([dns.hetzner.com](https://dns.hetzner.com)):**
1. Επιλέξτε ζώνη → Records → Add Record
2. Τύπος: **A**, Name: `tesla`, Value: η IP του διακομιστή σας
3. Add record

> **TTL** (Time to Live) καθορίζει πόσο διαρκεί το cache των DNS entries. Ορίστε 300 (5 λεπτά) κατά την αρχική εγκατάσταση ώστε τα σφάλματα να διορθώνονται γρήγορα. Μπορείτε να το αυξήσετε σε 3600 αργότερα.

### Επαλήθευση: Έχει διαδοθεί το DNS record;

```bash
# Δοκιμή από τον οικιακό σας υπολογιστή:
nslookup tesla.yourdomain.com
# ή
dig tesla.yourdomain.com
```

Ή online: [https://dnschecker.org](https://dnschecker.org) — δείχνει αν το record είναι ορατό παγκοσμίως.

### Δυναμική IP με δικό σας domain

Αν έχετε δικό σας domain αλλά όχι σταθερή IP, συνδυάστε και τις δύο προσεγγίσεις:

**Παραλλαγή 1: CNAME που δείχνει σε DuckDNS** (το router διατηρεί το DuckDNS ενημερωμένο αυτόματα)
```
tesla.yourdomain.com  →  CNAME  →  my-tesla.duckdns.org
```

**Παραλλαγή 2: Update script + cron job**
```bash
# Cron job που ενημερώνει την IP κάθε 5 λεπτά:
*/5 * * * * curl -s "https://www.duckdns.org/update?domains=my-tesla&token=YOURTOKEN&ip=$(curl -s https://api4.my-ip.io/ip)"
```

---

## Συνηθισμένα προβλήματα και λύσεις

### "Ο ιστότοπος δεν είναι προσβάσιμος" μετά την εγκατάσταση

1. **Περιμένετε 5–30 λεπτά** — οι εγγραφές DNS χρειάζονται χρόνο να διαδοθούν
2. **Δοκιμάστε πρώτα τοπικά:** Είναι το Tesla Carview προσβάσιμο στον διακομιστή;
   ```bash
   curl -I http://localhost
   ```
3. **Port forwarding του router:** Κλικ **Test** δίπλα στον κανόνα port sharing

### "Πιστοποιητικό μη έγκυρο" / σφάλματα HTTPS

```bash
# Επανέκδοση πιστοποιητικού Let's Encrypt:
certbot renew --force-renewal
systemctl restart nginx
```

### Το update URL του router δεν λειτουργεί

- Το router σας αντικαθιστά το `<ipaddr>` με την τρέχουσα IP — μην το συμπληρώνετε χειροκίνητα
- Δοκιμάστε το URL χειροκίνητα στον browser σας (αντικαταστήστε προσωρινά το `<ipaddr>` με την πραγματική σας IP)
- Έλεγχος: η κατάσταση του router δείχνει δημόσια IP; Μια διεύθυνση που αρχίζει με `10.x.x.x` ή `100.x.x.x` σημαίνει CG-NAT

### "Η IP μου αρχίζει με 100." ή "10."

Αυτό είναι **CG-NAT** — δείτε [Επιλογή A (Cloudflare Tunnel)](#option-a-cloudflare-tunnel-recommended-for-home-use), αυτή είναι η μόνη λύση χωρίς πρόσθετο διακομιστή.

### IPv6 αντί για IPv4

Νεότερες συνδέσεις internet (ειδικά οπτικής ίνας) δουλεύουν με **IPv6**. Αυτό λειτουργεί με τον ίδιο τρόπο — το router σας έχει σταθερή διεύθυνση IPv6 και δεν χρειάζεται DynDNS. Στο DNS record, χρησιμοποιήστε τύπο **AAAA** (IPv6) αντί για **A** (IPv4).

---

## Δέντρο αποφάσεων

```
Είστε πίσω από CG-NAT;  (Η IP αρχίζει με 100. ή το router δείχνει διαφορετική IP από αυτή του ipify.org)
  → ΝΑΙ:  Επιλογή A (Cloudflare Tunnel)
  → ΟΧΙ:
      Έχετε διακομιστή σε data centre;
        → ΝΑΙ:  Επιλογή C + D (VPS + DNS record)
        → ΟΧΙ (οικιακό δίκτυο):  Επιλογή B (DynDNS + router)
```

---

## Χρήσιμοι σύνδεσμοι

- [Τεκμηρίωση Cloudflare Tunnel](https://developers.cloudflare.com/tunnel/)
- [DuckDNS](https://www.duckdns.org/)
- [Dynu DDNS](https://www.dynu.com/)
- [netcup Community Tutorial: nginx Reverse Proxy](https://community.netcup.com/en/tutorials/how-to-setup-nginx-reverse-proxy)
- [Hetzner DNS Console](https://dns.hetzner.com)
- [dnschecker.org — επαλήθευση διάδοσης DNS](https://dnschecker.org)
- [ipify.org — ελέγξτε τη δημόσια IP σας](https://api4.my-ip.io/ip)

---

*→ Επιστροφή στο [02-deployment.en.md](02-deployment.en.md) | [Όλα τα docs](README.en.md)*
