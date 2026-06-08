# Πρόσβαση Δικτύου — Χωρίς Στατική IP

> 🤖 *Αυτή η ελληνική μετάφραση είναι υποστηριζόμενη από AI από το [αγγλικό πρωτότυπο](Home). Διορθώσεις ευπρόσδεκτες μέσω GitHub.*

🌐 **Γλώσσα:** [EN](Network-Access) · [DE](DE-Network-Access) · [FR](FR-Network-Access) · [ES](ES-Network-Access) · [TR](TR-Network-Access) · **EL**

Το TeslaView τρέχει στον δικό σας διακομιστή — αλλά για να είναι προσβάσιμο από το διαδίκτυο (συμπεριλαμβανομένου από το Tesla σας), χρειάζεστε μια σταθερή, δημόσια προσβάσιμη διεύθυνση. Αυτή η σελίδα σας καθοδηγεί σε κάθε επιλογή, βήμα προς βήμα.

> **Δεν είστε ειδικός IT;** Ακολουθήστε αυτή τη σελίδα από πάνω προς τα κάτω. Κάθε επιλογή περιλαμβάνει ακριβείς οδηγίες χωρίς προαπαιτούμενες γνώσεις.

---

## Ποια επιλογή είναι σωστή για εμένα;

| Η κατάστασή σας | Καλύτερη επιλογή |
|---|---|
| Οικιακό διαδίκτυο (η IP αλλάζει καθημερινά) | [Επιλογή A: Cloudflare Tunnel](#επιλογή-a-cloudflare-tunnel-συνιστάται) ή [Επιλογή B: DynDNS + Router](#επιλογή-b-dyndns--οικιακός-router) |
| Καλώδιο / οπτική ίνα — **δεν μπορείτε να ανοίξετε ports** (CG-NAT) | [Επιλογή A: Cloudflare Tunnel](#επιλογή-a-cloudflare-tunnel-συνιστάται) |
| VPS / διακομιστής σε πάροχο hosting | [Επιλογή C: VPS με στατική IP](#επιλογή-c-vps-σε-πάροχο-hosting) |
| Έχετε δικό σας τομέα | [Επιλογή D: Δικός σας τομέας + εγγραφή DNS](#επιλογή-d-δικός-σας-τομέας-με-εγγραφή-dns) |

---

## Το πρόβλημα με το οικιακό διαδίκτυο

Η οικιακή σας σύνδεση στο διαδίκτυο λαμβάνει **νέα διεύθυνση IP κάθε μέρα** (ή και πιο συχνά). Αυτό σημαίνει ότι η διεύθυνση που εισάγετε σήμερα είναι λάθος αύριο.

**Το Dynamic DNS** το λύνει αυτό:
- Δεσμεύετε ένα σταθερό hostname (π.χ. `my-tesla.duckdns.org`)
- Ένα μικρό πρόγραμμα στον router ή στον διακομιστή σας αναφέρει αυτόματα κάθε νέα IP
- Το hostname σας πάντα δείχνει στην τρέχουσα IP — χωρίς χειροκίνητες ενημερώσεις

---

## Είστε πίσω από CG-NAT;

Πολλοί πάροχοι καλωδίου (Vodafone, Virgin Media και άλλοι) δεν δίνουν πλέον σε κάθε πελάτη τη δική του δημόσια IPv4. Πολλοί πελάτες μοιράζονται μία IP — αυτό είναι το **Carrier-Grade NAT (CG-NAT)**.

**Πώς να ελέγξετε:**
1. Επισκεφθείτε το [https://api4.my-ip.io/ip](https://api4.my-ip.io/ip) — σημειώστε την IP που εμφανίζεται
2. Ανοίξτε τη σελίδα κατάστασης του router σας — σημειώστε εκεί την WAN IP
3. Εάν οι δύο IPs είναι **διαφορετικές** → είστε πίσω από CG-NAT

Με CG-NAT, το port forwarding **δεν λειτουργεί**. Χρησιμοποιήστε την Επιλογή A (Cloudflare Tunnel) — δεν χρειάζεται ανοιχτές ports.

---

## Επιλογή A: Cloudflare Tunnel (Συνιστάται)

Το Cloudflare Tunnel δημιουργεί μια κρυπτογραφημένη εξερχόμενη σύνδεση από τον διακομιστή σας στο παγκόσμιο δίκτυο της Cloudflare. Δεν χρειάζεται port forwarding. Δωρεάν. Λειτουργεί πίσω από CG-NAT.

**Προαπαιτούμενα:** Έναν τομέα ή έναν δωρεάν υποτομέα (οδηγίες παρακάτω).

### Βήμα 1: Αποκτήστε έναν δωρεάν τομέα (εάν δεν έχετε)

Μεταβείτε στο [duckdns.org](https://www.duckdns.org), συνδεθείτε με Google ή GitHub, επιλέξτε ένα όνομα → λαμβάνετε π.χ. `my-tesla.duckdns.org` δωρεάν.

Ή αγοράστε έναν φθηνό τομέα (~$1/έτος) στο [Porkbun](https://www.porkbun.com), [Namecheap](https://www.namecheap.com) ή [inwx.de](https://www.inwx.de).

### Βήμα 2: Προσθέστε τον τομέα σας στο Cloudflare

1. Εγγραφείτε στο [dash.cloudflare.com](https://dash.cloudflare.com) — δωρεάν
2. Κάντε κλικ στο **"Add a Site"** → εισαγάγετε τον τομέα σας → **Free plan**
3. Το Cloudflare σας δείχνει δύο διευθύνσεις nameserver, π.χ.:
   ```
   alice.ns.cloudflare.com
   bob.ns.cloudflare.com
   ```
4. Μεταβείτε στον καταχωρητή τομέα σας και εισαγάγετε αυτές ως nameservers
5. Περιμένετε 10–30 λεπτά → το Cloudflare επιβεβαιώνει "Nameservers updated"

### Βήμα 3: Εγκατάσταση και διαμόρφωση του `cloudflared`

Στον διακομιστή σας (μέσω SSH):

```bash
# Download and install
curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb \
  -o /tmp/cloudflared.deb
dpkg -i /tmp/cloudflared.deb

# Log in (a browser link is shown — open it)
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create tesla-carview
# Note the Tunnel ID shown!
```

Δημιουργήστε το αρχείο διαμόρφωσης:

```bash
mkdir -p /etc/cloudflared
nano /etc/cloudflared/config.yml
```

Περιεχόμενο (αντικαταστήστε το `YOUR_TUNNEL_ID` και το `yourdomain.com`):

```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: /root/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: tesla.yourdomain.com
    service: http://localhost:80
  - service: http_status:404
```

Δημιουργήστε αυτόματα την εγγραφή DNS:

```bash
cloudflared tunnel route dns tesla-carview tesla.yourdomain.com
```

### Βήμα 4: Εγκατάσταση ως υπηρεσία συστήματος

```bash
cloudflared service install
systemctl enable cloudflared
systemctl start cloudflared
```

**Έτοιμοι.** Το TeslaView είναι τώρα προσβάσιμο στο `https://tesla.yourdomain.com` — με αυτόματο HTTPS, χωρίς ανοιχτές ports, χωρίς ανάγκη στατικής IP.

---

## Επιλογή B: DynDNS + Οικιακός Router

> **Σημαντικό:** Λειτουργεί μόνο εάν έχετε μια πραγματική δημόσια διεύθυνση IPv4. [Ελέγξτε πρώτα για CG-NAT](#είστε-πίσω-από-cg-nat).

### Βήμα 1: Εγγραφή σε υπηρεσία DynDNS

**Dynu** (δωρεάν, χωρίς απαίτηση μηνιαίας επιβεβαίωσης):
1. Μεταβείτε στο [dynu.com](https://www.dynu.com) → δημιουργήστε λογαριασμό → DDNS → Add
2. Εισαγάγετε ένα όνομα, π.χ. `my-tesla` → λαμβάνετε `my-tesla.freeddns.org`
3. Σημειώστε το hostname, το όνομα χρήστη και τον κωδικό πρόσβασής σας (Control Panel → API Credentials)

**DuckDNS** (ακόμη πιο απλό):
1. [duckdns.org](https://www.duckdns.org) → συνδεθείτε → επιλέξτε υποτομέα → σημειώστε το token σας

### Βήμα 2: Διαμόρφωση του router σας

**FritzBox:**
1. Ανοίξτε το [http://fritz.box](http://fritz.box) → **Internet → Sharing → DynDNS**
2. Επιλέξτε **"Use DynDNS"** και συμπληρώστε:

   | Πεδίο | Dynu | DuckDNS |
   |---|---|---|
   | Provider | User-defined | User-defined |
   | Update URL | `https://api.dynu.com/nic/update?hostname=<domain>&myip=<ipaddr>` | `https://www.duckdns.org/update?domains=YOURNAME&token=YOURTOKEN&ip=<ipaddr>` |
   | Domain | `my-tesla.freeddns.org` | `my-tesla.duckdns.org` |
   | Username | Όνομα χρήστη Dynu | — |
   | Password | Κωδικός πρόσβασης Dynu | — |

3. Κάντε κλικ στο **Apply** → πράσινο τικ = λειτουργεί

**Άλλοι routers:** Αναζητήστε "Dynamic DNS" ή "DDNS" στις ρυθμίσεις διαδικτύου/WAN.

### Βήμα 3: Port forwarding

Ώστε η εισερχόμενη κίνηση να φτάνει στον διακομιστή σας:

**FritzBox:** Internet → Sharing → Port Sharing → New Port Sharing → Other Application

| Πεδίο | Τιμή |
|---|---|
| Name | Tesla Carview |
| Protocol | TCP |
| External port | 443 |
| To device | Η τοπική IP του διακομιστή σας (π.χ. `192.168.1.100`) |
| Internal port | 443 |

> **Συμβουλή:** Δώστε στον διακομιστή σας μια σταθερή τοπική IP. Στο FritzBox: Home Network → Network → η συσκευή σας → Always assign this IP.

### Βήμα 4: Πιστοποιητικό SSL και διαμόρφωση TeslaView

```bash
# Set FRONTEND_URL in /opt/tesla-carview/backend/.env:
FRONTEND_URL=https://my-tesla.freeddns.org

# Get SSL certificate:
certbot --nginx -d my-tesla.freeddns.org
```

---

## Επιλογή C: VPS σε πάροχο Hosting

Ένα VPS (Virtual Private Server) είναι ένας μικρός νοικιασμένος διακομιστής Linux με μια **σταθερή, μόνιμη δημόσια IP**. Δεν χρειάζεται DynDNS, δεν χρειάζεται port forwarding.

**Σύγκριση τιμών (2025):**

| Πάροχος | Προϊόν | Τιμή/μήνα |
|---|---|---|
| [Hetzner](https://www.hetzner.com) | CX22 | ~€4.35 |
| [netcup](https://www.netcup.eu) | VPS 1000 G11 | ~€4.44 |
| [Contabo](https://contabo.com) | VPS S | ~€5.99 |

**Ρύθμιση (παράδειγμα: Hetzner):**
1. Εγγραφείτε → δημιουργήστε διακομιστή → επιλέξτε Ubuntu 24.04 → σημειώστε τη δημόσια IP
2. Συνδεθείτε με SSH: `ssh root@YOUR-SERVER-IP`
3. Εκτελέστε το script εγκατάστασης:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
   ```

Το script ζητά το όνομα τομέα σας και διαμορφώνει αυτόματα nginx + Let's Encrypt.

Στη συνέχεια κατευθύνετε έναν τομέα σε αυτό → [Επιλογή D](#επιλογή-d-δικός-σας-τομέας-με-εγγραφή-dns)

---

## Επιλογή D: Δικός σας τομέας με εγγραφή DNS

Εάν έχετε τον δικό σας τομέα και έναν διακομιστή με σταθερή IP, δημιουργήστε μια εγγραφή **A**:

**Τι είναι μια εγγραφή A;** Είναι μια καταχώρηση τηλεφωνικού καταλόγου: `tesla.yourdomain.com → 123.456.789.0`

**Στο Cloudflare DNS:**
DNS → Add record → Type: A, Name: `tesla`, IPv4: η IP του διακομιστή σας → Save

**Στο Namecheap:**
Domain List → Manage → Advanced DNS → Add New Record → A Record, Host: `tesla`, Value: η IP σας

**Στο IONOS:**
Domains → ο τομέας σας → DNS → Add record → A, Hostname: `tesla`, Destination: η IP σας

**Στο Hetzner DNS ([dns.hetzner.com](https://dns.hetzner.com)):**
Επιλέξτε ζώνη → Records → Add Record → A, Name: `tesla`, Value: η IP σας

> **TTL:** Ορίστε αρχικά 300 (5 λεπτά) — διευκολύνει τη διόρθωση σφαλμάτων. Αυξήστε σε 3600 αργότερα.

### Επαλήθευση διάδοσης

```bash
nslookup tesla.yourdomain.com
# or online: https://dnschecker.org
```

### Δυναμική IP με τον δικό σας τομέα

Εάν έχετε τον δικό σας τομέα αλλά δεν έχετε σταθερή IP:

**CNAME → DuckDNS** (ο router κρατά το DuckDNS ενημερωμένο):
```
tesla.yourdomain.com  →  CNAME  →  my-tesla.duckdns.org
```

---

## Δένδρο Απόφασης

```
Is your router IP different from what https://api4.my-ip.io/ip shows?
  YES (CG-NAT) → Option A: Cloudflare Tunnel
  NO:
    Do you have a server in a data centre?
      YES → Option C + D (VPS + DNS record)
      NO (home network):
        Do you have your own domain?
          YES → Option B (DynDNS) + Option D (DNS record)
          NO  → Option B with free subdomain (DuckDNS/Dynu)
```

---

## Συνηθισμένα Προβλήματα

### "Site not reachable" αμέσως μετά τη ρύθμιση

Το DNS χρειάζεται 5–30 λεπτά για να διαδοθεί. Δοκιμάστε πρώτα τοπικά:
```bash
curl -I http://localhost
```

### "Certificate invalid" / σφάλματα HTTPS

```bash
certbot renew --force-renewal
systemctl restart nginx
```

### Το URL ενημέρωσης DynDNS του router δεν λειτουργεί

Ο router σας αντικαθιστά αυτόματα το `<ipaddr>` — μην το συμπληρώσετε χειροκίνητα. Δοκιμάστε το URL σε έναν περιηγητή αντικαθιστώντας το `<ipaddr>` με την τρέχουσα IP σας.

### "Η WAN IP μου ξεκινά με 100. ή 10."

Αυτό είναι CG-NAT → χρησιμοποιήστε την [Επιλογή A (Cloudflare Tunnel)](#επιλογή-a-cloudflare-tunnel-συνιστάται).

### IPv6 / χωρίς IPv4

Οι νεότερες συνδέσεις οπτικής ίνας χρησιμοποιούν IPv6. Λειτουργεί το ίδιο — χρησιμοποιήστε εγγραφή **AAAA** αντί για **A** στο DNS. Ο router σας κρατά ένα σταθερό πρόθεμα IPv6 (δεν χρειάζεται DynDNS για IPv6 στις περισσότερες συνδέσεις).

---

## Χρήσιμοι Σύνδεσμοι

- [Cloudflare Tunnel docs](https://developers.cloudflare.com/tunnel/)
- [DuckDNS](https://www.duckdns.org/) — δωρεάν dynamic DNS
- [Dynu DDNS](https://www.dynu.com/) — δωρεάν, χωρίς μηνιαία επιβεβαίωση
- [dnschecker.org](https://dnschecker.org) — επαλήθευση διάδοσης DNS παγκοσμίως
- [api4.my-ip.io/ip](https://api4.my-ip.io/ip) — έλεγχος της δημόσιας IP σας

---

*→ [[EL-Installation]] | [[EL-Raspberry-Pi-Storage]] | [[EL-Home]]*
