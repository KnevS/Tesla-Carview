# Πρόσβαση Δικτύου — Χωρίς Στατική IP

🌐 **Language / Sprache / Langue / Idioma / Dil / Γλώσσα**

| | |
|---|---|
| 🇬🇧 **[English](Network-Access)** | English version |
| 🇩🇪 **[Deutsch](DE-Network-Access)** | Deutsche Version |
| 🇫🇷 **[Français](FR-Network-Access)** | Version française |
| 🇪🇸 **[Español](ES-Network-Access)** | Versión en español |
| 🇹🇷 **[Türkçe](TR-Network-Access)** | Türkçe sürüm |
| 🇬🇷 **[Ελληνικά](EL-Network-Access)** | Βρίσκεστε εδώ |

---

Το Tesla Carview εκτελείται στον δικό σας διακομιστή — αλλά για να είναι προσβάσιμο από το διαδίκτυο (συμπεριλαμβανομένου του Tesla σας), χρειάζεστε μια σταθερή, δημόσια προσβάσιμη διεύθυνση. Αυτή η σελίδα σας καθοδηγεί σε κάθε επιλογή, βήμα προς βήμα.

> **Δεν είστε ειδικός IT;** Ακολουθήστε αυτή τη σελίδα από πάνω προς τα κάτω. Κάθε επιλογή περιλαμβάνει ακριβείς οδηγίες χωρίς παραδοχές γνώσεων.

---

## Ποια επιλογή είναι κατάλληλη για μένα;

| Η κατάστασή σας | Καλύτερη επιλογή |
|---|---|
| Οικιακό διαδίκτυο (IP αλλάζει καθημερινά) | [Επιλογή Α: Cloudflare Tunnel](#option-a-cloudflare-tunnel-recommended) ή [Επιλογή Β: DynDNS + Router](#option-b-dyndns--home-router) |
| Καλωδιακό / οπτικές ίνες — **δεν μπορείτε να ανοίξετε θύρες** (CG-NAT) | [Επιλογή Α: Cloudflare Tunnel](#option-a-cloudflare-tunnel-recommended) |
| VPS / διακομιστής σε πάροχο φιλοξενίας | [Επιλογή Γ: VPS με στατική IP](#option-c-vps-at-a-hosting-provider) |
| Έχετε τομέα | [Επιλογή Δ: Δικός τομέας + εγγραφή DNS](#option-d-own-domain-with-dns-record) |

---

## Το πρόβλημα με το οικιακό διαδίκτυο

Η οικιακή σύνδεσή σας στο διαδίκτυο λαμβάνει μια **νέα διεύθυνση IP κάθε μέρα** (ή συχνότερα). Αυτό σημαίνει ότι η διεύθυνση που εισάγετε σήμερα είναι λανθασμένη αύριο.

**Το Dynamic DNS** λύνει αυτό:
- Κρατάτε ένα σταθερό hostname (π.χ. `my-tesla.duckdns.org`)
- Ένα μικρό πρόγραμμα στον δρομολογητή ή διακομιστή σας αναφέρει αυτόματα κάθε νέα IP
- Το hostname σας πάντα δείχνει στην τρέχουσα IP — δεν απαιτούνται χειροκίνητες ενημερώσεις

---

## Βρίσκεστε πίσω από CG-NAT;

Πολλοί πάροχοι καλωδιακής (Vodafone, Virgin Media και άλλοι) δεν δίνουν πλέον σε κάθε πελάτη τη δική του δημόσια IPv4. Πολλοί πελάτες μοιράζονται μία IP — αυτό είναι **Carrier-Grade NAT (CG-NAT)**.

**Πώς να ελέγξετε:**
1. Επισκεφτείτε [https://api4.my-ip.io/ip](https://api4.my-ip.io/ip) — σημειώστε την IP που εμφανίζεται
2. Ανοίξτε τη σελίδα κατάστασης του δρομολογητή σας — σημειώστε την IP WAN εκεί
3. Εάν οι δύο IPs είναι **διαφορετικές** → βρίσκεστε πίσω από CG-NAT

Με CG-NAT, η προώθηση θύρας **δεν λειτουργεί**. Χρησιμοποιήστε την Επιλογή Α (Cloudflare Tunnel) — δεν χρειάζεται ανοιχτές θύρες.

---

## Επιλογή Α: Cloudflare Tunnel (Συνιστάται)

Το Cloudflare Tunnel δημιουργεί μια κρυπτογραφημένη εξερχόμενη σύνδεση από τον διακομιστή σας στο παγκόσμιο δίκτυο της Cloudflare. Δεν απαιτείται προώθηση θύρας. Δωρεάν. Λειτουργεί πίσω από CG-NAT.

**Απαιτήσεις:** Ένας τομέας ή ένας δωρεάν υποτομέας (οδηγίες παρακάτω).

### Βήμα 1: Αποκτήστε έναν δωρεάν τομέα (εάν δεν έχετε)

Μεταβείτε στο [duckdns.org](https://www.duckdns.org), συνδεθείτε με Google ή GitHub, επιλέξτε ένα όνομα → λαμβάνετε π.χ. `my-tesla.duckdns.org` δωρεάν.

Ή αγοράστε έναν φθηνό τομέα (~$1/χρόνο) στο [Porkbun](https://www.porkbun.com), [Namecheap](https://www.namecheap.com) ή [inwx.de](https://www.inwx.de).

### Βήμα 2: Προσθέστε τον τομέα σας στο Cloudflare

1. Εγγραφείτε στο [dash.cloudflare.com](https://dash.cloudflare.com) — δωρεάν
2. Κάντε κλικ στο **"Add a Site"** → εισαγάγετε τον τομέα σας → **Free plan**
3. Το Cloudflare σάς εμφανίζει δύο διευθύνσεις nameserver, π.χ.:
   ```
   alice.ns.cloudflare.com
   bob.ns.cloudflare.com
   ```
4. Μεταβείτε στον καταχωρητή τομέα σας και εισαγάγετε αυτά ως nameservers
5. Περιμένετε 10–30 λεπτά → το Cloudflare επιβεβαιώνει "Nameservers updated"

### Βήμα 3: Εγκαταστήστε και διαμορφώστε το `cloudflared`

Στον διακομιστή σας (μέσω SSH):

```bash
# Λήψη και εγκατάσταση
curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb \
  -o /tmp/cloudflared.deb
dpkg -i /tmp/cloudflared.deb

# Σύνδεση (εμφανίζεται ένας σύνδεσμος προγράμματος περιήγησης — ανοίξτε τον)
cloudflared tunnel login

# Δημιουργία tunnel
cloudflared tunnel create tesla-carview
# Σημειώστε το Tunnel ID που εμφανίζεται!
```

Δημιουργήστε αρχείο διαμόρφωσης:

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

Δημιουργήστε εγγραφή DNS αυτόματα:

```bash
cloudflared tunnel route dns tesla-carview tesla.yourdomain.com
```

### Βήμα 4: Εγκαταστήστε ως υπηρεσία συστήματος

```bash
cloudflared service install
systemctl enable cloudflared
systemctl start cloudflared
```

**Ολοκληρώθηκε.** Το Tesla Carview είναι τώρα προσβάσιμο στο `https://tesla.yourdomain.com` — με αυτόματο HTTPS, χωρίς ανοιχτές θύρες, χωρίς στατική IP.

---

## Επιλογή Β: DynDNS + Οικιακός Δρομολογητής

> **Σημαντικό:** Λειτουργεί μόνο εάν έχετε μια πραγματική δημόσια διεύθυνση IPv4. [Ελέγξτε για CG-NAT πρώτα](#are-you-behind-cg-nat).

### Βήμα 1: Εγγραφείτε σε μια υπηρεσία DynDNS

**Dynu** (δωρεάν, χωρίς μηνιαία επιβεβαίωση):
1. Μεταβείτε στο [dynu.com](https://www.dynu.com) → δημιουργήστε λογαριασμό → DDNS → Add
2. Εισαγάγετε ένα όνομα, π.χ. `my-tesla` → λαμβάνετε `my-tesla.freeddns.org`
3. Σημειώστε το hostname, το όνομα χρήστη και τον κωδικό (Control Panel → API Credentials)

**DuckDNS** (ακόμα απλούστερο):
1. [duckdns.org](https://www.duckdns.org) → συνδεθείτε → επιλέξτε υποτομέα → σημειώστε το token σας

### Βήμα 2: Διαμορφώστε τον δρομολογητή σας

**FritzBox:**
1. Ανοίξτε [http://fritz.box](http://fritz.box) → **Internet → Sharing → DynDNS**
2. Επιλέξτε **"Use DynDNS"** και συμπληρώστε:

   | Πεδίο | Dynu | DuckDNS |
   |---|---|---|
   | Provider | User-defined | User-defined |
   | Update URL | `https://api.dynu.com/nic/update?hostname=<domain>&myip=<ipaddr>` | `https://www.duckdns.org/update?domains=YOURNAME&token=YOURTOKEN&ip=<ipaddr>` |
   | Domain | `my-tesla.freeddns.org` | `my-tesla.duckdns.org` |
   | Username | Όνομα χρήστη Dynu | — |
   | Password | Κωδικός Dynu | — |

3. Κάντε κλικ στο **Apply** → πράσινο σύμβολο ελέγχου = λειτουργεί

**Άλλοι δρομολογητές:** Αναζητήστε "Dynamic DNS" ή "DDNS" στις ρυθμίσεις internet/WAN.

### Βήμα 3: Προώθηση θύρας

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

### Βήμα 4: Πιστοποιητικό SSL και διαμόρφωση Tesla Carview

```bash
# Ορίστε FRONTEND_URL στο /opt/tesla-carview/backend/.env:
FRONTEND_URL=https://my-tesla.freeddns.org

# Αποκτήστε πιστοποιητικό SSL:
certbot --nginx -d my-tesla.freeddns.org
```

---

## Επιλογή Γ: VPS σε Πάροχο Φιλοξενίας

Ένα VPS (Virtual Private Server) είναι ένας μικρός ενοικιαζόμενος διακομιστής Linux με **σταθερή, μόνιμη δημόσια IP**. Δεν απαιτείται DynDNS, δεν απαιτείται προώθηση θύρας.

**Σύγκριση τιμών (2025):**

| Πάροχος | Προϊόν | Τιμή/μήνα |
|---|---|---|
| [Hetzner](https://www.hetzner.com) | CX22 | ~€4.35 |
| [netcup](https://www.netcup.eu) | VPS 1000 G11 | ~€4.44 |
| [Contabo](https://contabo.com) | VPS S | ~€5.99 |

**Ρύθμιση (παράδειγμα: Hetzner):**
1. Εγγραφή → δημιουργία διακομιστή → επιλέξτε Ubuntu 24.04 → σημειώστε τη δημόσια IP
2. Σύνδεση μέσω SSH: `ssh root@YOUR-SERVER-IP`
3. Εκτελέστε το σενάριο ρύθμισης:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/KnevS/Tesla-Carview/main/deploy/setup.sh | bash
   ```

Το σενάριο ζητά το όνομα τομέα σας και διαμορφώνει αυτόματα nginx + Let's Encrypt.

Στη συνέχεια στρέψτε έναν τομέα σε αυτό → [Επιλογή Δ](#option-d-own-domain-with-dns-record)

---

## Επιλογή Δ: Δικός Τομέας με Εγγραφή DNS

Εάν έχετε δικό σας τομέα και έναν διακομιστή με σταθερή IP, δημιουργήστε μια **εγγραφή A**:

**Τι είναι μια εγγραφή A;** Είναι μια καταχώρηση τηλεφωνικού καταλόγου: `tesla.yourdomain.com → 123.456.789.0`

**Στο Cloudflare DNS:**
DNS → Add record → Type: A, Name: `tesla`, IPv4: IP διακομιστή σας → Save

**Στο Namecheap:**
Domain List → Manage → Advanced DNS → Add New Record → A Record, Host: `tesla`, Value: η IP σας

**Στο IONOS:**
Domains → ο τομέας σας → DNS → Add record → A, Hostname: `tesla`, Destination: η IP σας

**Στο Hetzner DNS ([dns.hetzner.com](https://dns.hetzner.com)):**
Επιλέξτε ζώνη → Records → Add Record → A, Name: `tesla`, Value: η IP σας

> **TTL:** Ορίστε 300 (5 λεπτά) αρχικά — κάνει εύκολη τη διόρθωση σφαλμάτων. Αυξήστε σε 3600 αργότερα.

### Επαλήθευση διάδοσης

```bash
nslookup tesla.yourdomain.com
# ή διαδικτυακά: https://dnschecker.org
```

### Δυναμική IP με δικό σας τομέα

Εάν έχετε τομέα αλλά όχι σταθερή IP:

**CNAME → DuckDNS** (ο δρομολογητής διατηρεί ενημερωμένο το DuckDNS):
```
tesla.yourdomain.com  →  CNAME  →  my-tesla.duckdns.org
```

---

## Δέντρο Αποφάσεων

```
Διαφέρει η IP του δρομολογητή σας από αυτό που εμφανίζει το https://api4.my-ip.io/ip;
  ΝΑΙ (CG-NAT) → Επιλογή Α: Cloudflare Tunnel
  ΟΧΙ:
    Έχετε διακομιστή σε κέντρο δεδομένων;
      ΝΑΙ → Επιλογή Γ + Δ (VPS + εγγραφή DNS)
      ΟΧΙ (οικιακό δίκτυο):
        Έχετε δικό σας τομέα;
          ΝΑΙ → Επιλογή Β (DynDNS) + Επιλογή Δ (εγγραφή DNS)
          ΟΧΙ  → Επιλογή Β με δωρεάν υποτομέα (DuckDNS/Dynu)
```

---

## Συνηθισμένα Προβλήματα

### "Η τοποθεσία δεν είναι προσβάσιμη" αμέσως μετά τη ρύθμιση

Το DNS χρειάζεται 5–30 λεπτά για διάδοση. Ελέγξτε τοπικά πρώτα:
```bash
curl -I http://localhost
```

### "Μη έγκυρο πιστοποιητικό" / Σφάλματα HTTPS

```bash
certbot renew --force-renewal
systemctl restart nginx
```

### Η διεύθυνση URL ενημέρωσης DynDNS του δρομολογητή δεν λειτουργεί

Ο δρομολογητής αντικαθιστά αυτόματα το `<ipaddr>` — μην το συμπληρώσετε χειροκίνητα. Δοκιμάστε τη διεύθυνση URL σε ένα πρόγραμμα περιήγησης αντικαθιστώντας το `<ipaddr>` με την πραγματική τρέχουσα IP σας.

### "Η WAN IP μου αρχίζει με 100. ή 10."

Αυτό είναι CG-NAT → χρησιμοποιήστε [Επιλογή Α (Cloudflare Tunnel)](#option-a-cloudflare-tunnel-recommended).

### IPv6 / χωρίς IPv4

Νεότερες συνδέσεις οπτικών ινών χρησιμοποιούν IPv6. Λειτουργεί το ίδιο — χρησιμοποιήστε μια εγγραφή **AAAA** αντί για **A** στο DNS. Ο δρομολογητής σας διατηρεί ένα σταθερό πρόθεμα IPv6 (δεν απαιτείται DynDNS για IPv6 στις περισσότερες συνδέσεις).

---

## Χρήσιμοι Σύνδεσμοι

- [Τεκμηρίωση Cloudflare Tunnel](https://developers.cloudflare.com/tunnel/)
- [DuckDNS](https://www.duckdns.org/) — δωρεάν δυναμικό DNS
- [Dynu DDNS](https://www.dynu.com/) — δωρεάν, χωρίς μηνιαία επιβεβαίωση
- [dnschecker.org](https://dnschecker.org) — επαλήθευση διάδοσης DNS παγκοσμίως
- [api4.my-ip.io/ip](https://api4.my-ip.io/ip) — ελέγξτε τη δημόσια IP σας

---

*→ [[Installation]] | [[Raspberry-Pi-Storage]] | [[Home]]*
