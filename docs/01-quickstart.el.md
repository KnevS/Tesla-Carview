# Quickstart — Τοπική ανάπτυξη

> 🤖 *Αυτή η ελληνική μετάφραση είναι υποστηριζόμενη από AI από το [README.en.md](README.en.md). Διορθώσεις ευπρόσδεκτες μέσω GitHub.*

> 🇩🇪 [Auf Deutsch lesen](01-quickstart.md)

Αυτός ο οδηγός στήνει ένα τοπικό περιβάλλον ανάπτυξης.
Για production deployment, δείτε το [02-deployment.en.md](./02-deployment.en.md).

## Προαπαιτούμενα

- **Node.js** 20 ή νεότερη έκδοση
- **Git**

## 1. Κλωνοποίηση του repository

```bash
git clone https://github.com/KnevS/Tesla-Carview.git
cd Tesla-Carview
```

## 2. Ρύθμιση του backend

```bash
cd backend
cp .env.example .env
```

Προσαρμόστε το `.env` — τουλάχιστον ορίστε το `JWT_SECRET` σε μια μακριά τυχαία τιμή:

```bash
# δημιουργία ασφαλούς τιμής:
openssl rand -hex 64
```

Για τα διαπιστευτήρια του Tesla API δείτε το [04-tesla-api.en.md](./04-tesla-api.en.md).

```bash
npm install
npm run dev
# το backend τρέχει στο http://localhost:3000
```

## 3. Ρύθμιση του frontend

```bash
cd frontend
npm install
npm run dev
# το frontend τρέχει στο http://localhost:5173
```

## 4. Setup wizard (πρώτη εκκίνηση)

Όταν ανοίξετε για πρώτη φορά το http://localhost:5173 ανακατευθύνεστε αυτόματα στο **/setup**.

Εκεί δημιουργείτε τον λογαριασμό διαχειριστή σας μέσα από τον browser:
- επιλέξτε ένα όνομα χρήστη
- ορίστε έναν ισχυρό κωδικό (≥ 12 χαρακτήρες)

Εναλλακτικά μέσω του βοηθού στο terminal:
```bash
bash deploy/setup-wizard.sh
```

## 5. Μετά τη σύνδεση

1. Ενεργοποιήστε MFA από τις Ρυθμίσεις (συνιστάται)
2. Συνδέστε το όχημα Tesla: [04-tesla-api.en.md](./04-tesla-api.en.md)

## 6. Σύνδεση Tesla (προαιρετικά για τοπική δοκιμή)

Χωρίς διαπιστευτήρια Tesla API η εφαρμογή τρέχει πλήρως αλλά δεν εμφανίζει πραγματικά δεδομένα οχήματος.

Για πραγματική σύνδεση Tesla: [04-tesla-api.en.md](./04-tesla-api.en.md)
