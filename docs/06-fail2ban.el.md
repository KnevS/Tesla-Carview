# fail2ban — προστασία από brute-force

> 🤖 *Αυτή η ελληνική μετάφραση είναι υποστηριζόμενη από AI από το [README.en.md](README.en.md). Διορθώσεις ευπρόσδεκτες μέσω GitHub.*

> 🇩🇪 [Auf Deutsch lesen](06-fail2ban.md)

Το Tesla Carview χρησιμοποιεί το fail2ban για να μπλοκάρει αυτόματα επιτιθέμενους που μαντεύουν διαπιστευτήρια σύνδεσης ή εμφανίζουν άλλη ύποπτη δραστηριότητα.

## Πώς λειτουργεί

Το fail2ban διαβάζει τα logs του nginx και μπλοκάρει IPs μέσω iptables/nftables όταν ξεπεραστούν τα όρια.

## Έλεγχος εγκατάστασης

```bash
systemctl status fail2ban
fail2ban-client status
```

## Συνιστώμενη διαμόρφωση για Tesla Carview

### `/etc/fail2ban/jail.d/tesla-carview.conf`

```ini
[DEFAULT]
bantime  = 180        # μπλοκάρει την IP για 3 λεπτά
findtime = 60         # παράθυρο παρατήρησης: 1 λεπτό
maxretry = 3          # 3 αποτυχημένες προσπάθειες → μπλοκαρισμένο

[nginx-limit-req]
# ενεργοποιείται σε σφάλματα rate-limit του nginx (αποκρίσεις 429)
enabled  = true
port     = http,https
filter   = nginx-limit-req
logpath  = /var/log/nginx/error.log
maxretry = 3
findtime = 60
bantime  = 180

[nginx-tesla-login]
# ειδικά για το endpoint σύνδεσης — πιο αυστηρό
enabled  = true
port     = http,https
filter   = nginx-tesla-login
logpath  = /var/log/nginx/access.log
maxretry = 3
findtime = 60
bantime  = 600        # 10 λεπτά σε αποτυχίες σύνδεσης
```

### `/etc/fail2ban/filter.d/nginx-tesla-login.conf`

```ini
[Definition]
# ταιριάζει αποκρίσεις 401 στο endpoint σύνδεσης
failregex = ^<HOST> .* "POST /api/auth/login HTTP/\d" 401
ignoreregex =
```

### `/etc/fail2ban/filter.d/nginx-limit-req.conf`

```ini
[Definition]
# τυπικό φίλτρο για υπερβάσεις rate-limit του nginx
failregex = ^\d{4}/\d{2}/\d{2} \d{2}:\d{2}:\d{2} \[error\] .+limiting requests, excess:.+by zone.+client: <HOST>
ignoreregex =
```

## Ενεργοποίηση της διαμόρφωσης

```bash
# δημιουργήστε τα αρχεία config (όπως παραπάνω)
sudo systemctl reload fail2ban

# έλεγχος κατάστασης
sudo fail2ban-client status nginx-tesla-login
sudo fail2ban-client status nginx-limit-req

# χειροκίνητη άρση block μιας IP
sudo fail2ban-client set nginx-tesla-login unbanip 1.2.3.4

# log fail2ban σε πραγματικό χρόνο
tail -f /var/log/fail2ban.log
```

## Χρόνοι ban ανά σοβαρότητα

| Σενάριο | maxretry | findtime | bantime |
|---|---|---|---|
| Login 401 (3 αποτυχημένες προσπάθειες) | 3 | 60 s | 600 s (10 λεπτά) |
| Υπέρβαση rate limit | 3 | 60 s | 180 s (3 λεπτά) |
| SSH brute force | 5 | 600 s | 3600 s (1 ώρα) |

## Ειδοποίηση e-mail σε ban (προαιρετικό)

```ini
# στο /etc/fail2ban/jail.local
[DEFAULT]
destemail = your@email.com
sender    = fail2ban@your-domain.com
action    = %(action_mwl)s   # ban + mail + whois lookup
```

## Αλληλεπίδραση με το lockout επιπέδου εφαρμογής

Το Tesla Carview κλειδώνει λογαριασμούς μετά από 5 αποτυχημένες προσπάθειες **στο επίπεδο εφαρμογής** (15 λεπτά).

Το fail2ban προστατεύει **στο επίπεδο δικτύου**: η IP μπλοκάρεται προτού καν το αίτημα φτάσει στη διεργασία Node.js.

| Επίπεδο | Μηχανισμός | Trigger | Διάρκεια |
|---|---|---|---|
| Δίκτυο | fail2ban | 3× HTTP 401 σε 60 s | 10 λεπτά |
| Εφαρμογή | account lockout | 5× λάθος κωδικός | 15 λεπτά |

Οι δύο μηχανισμοί αλληλοσυμπληρώνονται: το fail2ban προστατεύει από brute-force σε πολλούς λογαριασμούς, το lockout επιπέδου εφαρμογής προστατεύει μεμονωμένους λογαριασμούς.
