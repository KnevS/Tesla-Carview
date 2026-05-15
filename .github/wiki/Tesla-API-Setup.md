# Tesla API Setup

🌐 **Language:** **EN** · [DE](DE-Tesla-API-Setup) · [FR](FR-Tesla-API-Setup) · [ES](ES-Tesla-API-Setup) · [TR](TR-Tesla-API-Setup) · [EL](EL-Home)

Connecting Tesla Carview to your Tesla account requires a **Tesla Developer account** and an **OAuth application**. This process takes about 20–30 minutes and only needs to be done once.

---

## Overview: What happens here?

Tesla uses OAuth 2.0 — the same standard used by "Login with Google". You create an app in Tesla's developer portal, which gets a **Client ID** and **Client Secret**. Tesla Carview uses these to request access to your vehicle data with your permission.

```
Tesla Developer Portal
  → Register App → get Client ID + Secret
  → Enter in Tesla Carview
  → Click "Connect Tesla Account"
  → Tesla login page opens
  → You approve access
  → Tesla sends tokens to Tesla Carview
  → Data flows ✅
```

---

## Step 1: Create a Tesla Developer account

1. Go to [developer.tesla.com](https://developer.tesla.com)
2. Sign in with your regular Tesla account (the same one you use for the car)
3. Accept the developer terms

---

## Step 2: Register your application

1. In the developer portal, click **"Add New Application"**
2. Fill in the form:

   | Field | What to enter |
   |---|---|
   | **Application Name** | Anything descriptive, e.g. "My Tesla Carview" |
   | **Description** | "Private self-hosted Tesla data logger" |
   | **Allowed Origin URL** | `https://tesla.yourdomain.com` |
   | **Redirect URI** | `https://tesla.yourdomain.com/api/auth/tesla/callback` |
   | **Application Type** | Web Application |

3. Under **Scopes**, select:
   - `vehicle_device_data` — for reading vehicle state
   - `vehicle_cmds` — for sending commands (climate, locks, etc.)
   - `vehicle_charging_cmds` — for charging control
   - `offline_access` — to stay connected without re-logging in every hour

4. Click **Save**

5. Note down your **Client ID** and **Client Secret** — you'll need them in the next step

> ⚠️ **Keep your Client Secret private.** It goes in your `.env` file and should never be shared or committed to git.

---

## Step 3: Set up the Virtual Key (for commands)

The Virtual Key is Tesla's security mechanism for sending commands to the car. Without it, you can read data but not control anything (no climate start, no locking/unlocking).

Tesla Carview generates a key automatically. You just need to add it to your car:

1. In Tesla Carview, go to **Settings → Virtual Key**
2. Copy the URL shown (looks like `https://tesla.yourdomain.com/api/virtual-key/pair`)
3. Open that URL in the **Tesla browser on your car's touchscreen** (not your phone)
4. Tap **"Add key"** on the car's screen
5. Confirm with your Tesla app on your phone (it asks you to approve the new key)

After pairing, commands (climate, locking, etc.) will work from Tesla Carview.

---

## Step 4: Enter the credentials in Tesla Carview

1. Go to **Admin → System** in Tesla Carview
2. Enter your **Client ID** and **Client Secret**
3. Click **Save**

Or add them directly to the `.env` file:

```bash
nano /opt/tesla-carview/backend/.env
```

```env
TESLA_CLIENT_ID=your-client-id-here
TESLA_CLIENT_SECRET=your-client-secret-here
```

Then restart:
```bash
docker compose -f /opt/tesla-carview/docker-compose.prod.yml up -d
```

---

## Step 5: Connect your Tesla account

1. In Tesla Carview, go to **Dashboard → Connect Tesla Account** (or the prompt on first login)
2. Click **"Connect with Tesla"**
3. You're redirected to Tesla's login page — log in with your Tesla account
4. Tesla asks which vehicle to grant access to — select your car
5. You're redirected back to Tesla Carview — the connection is established ✅

The app now polls your vehicle data every 60 seconds while the car is active, and suspends polling when the car is parked and asleep (to avoid draining the battery).

---

## Common problems

### "403 Forbidden" on all Tesla API calls

Your Tesla developer account may be **suspended or rate-limited**. This happens if:
- Too many API calls were made (throttling)
- Your billing information in the developer portal is incomplete
- Tesla has flagged the account

Check [developer.tesla.com](https://developer.tesla.com) — if you see a billing or suspension notice, resolve that first.

### Vehicle shows "offline" even when driving

Tesla's API has a known limitation: some newer vehicles (especially those with XP7 VINs like the Model Y Juniper) don't return GPS data via the standard endpoint. Tesla Carview uses Fleet Telemetry for those vehicles. This is configured automatically.

### Commands don't work ("Virtual Key not paired")

→ Repeat Step 3 above. Make sure you opened the pairing URL in the **Tesla browser** (not your phone or computer).

### "Redirect URI mismatch"

The Redirect URI in the Tesla Developer Portal must **exactly match** what you entered — including `https://`, the correct domain, and no trailing slash.

---

## How data polling works

Tesla Carview polls your vehicle every 60 seconds by default when the car is active. When the car is sleeping (parked for more than a few minutes), polling slows down to every 10 minutes to avoid waking the car (which drains the 12V battery).

You can adjust the polling interval in the `.env` file:
```env
POLL_INTERVAL_MS=60000        # 60 seconds (default)
POLL_SLEEP_INTERVAL_MS=600000 # 10 minutes when sleeping
```
