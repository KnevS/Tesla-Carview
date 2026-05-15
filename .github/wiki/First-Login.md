# First Login & Tenant Setup

🌐 **Language:** **EN** · [DE](DE-First-Login) · [FR](FR-First-Login) · [ES](ES-First-Login) · [TR](TR-First-Login) · [EL](EL-Home)

After installation, this page walks you through the first time you open Tesla Carview.

---

## What is a "Tenant"?

Tesla Carview supports multiple isolated accounts on one server — called **tenants**. Each tenant has:
- Its own users and vehicles
- Its own database (data is completely separated)
- Its own settings and legal content

**For a single-user setup:** You have one tenant (created during installation). You don't need to think about tenants at all — the login page handles it automatically.

**For a family / small group:** Each person can have their own account under the same tenant. Or you can create separate tenants for complete isolation.

---

## Logging in for the first time

1. Open `https://tesla.yourdomain.com` in your browser
2. You'll see the login page

   If you only have **one tenant** on your server, the tenant field is hidden automatically — just enter your username and password.

   If you have **multiple tenants**, a dropdown appears to select which tenant to log into.

3. Enter your admin username and password (set during installation)
4. Check **"Stay signed in (90 days)"** — highly recommended, especially for the Tesla browser

5. Click **Sign in**

---

## The setup wizard

If this is the first time you've connected a Tesla account, a setup wizard guides you through:

1. **Connect Tesla Account** → See [Tesla API Setup](Tesla-API-Setup)
2. **Select Vehicle** → Choose which car to track
3. **Legal content** → Configure imprint/privacy (required if publicly accessible)
4. **Done!** → You're taken to the Dashboard

---

## Inviting other users

As admin, you can invite others to your tenant (family members, partner):

1. Go to **Admin → Users → Invite User**
2. Enter their email or username
3. They receive a link to create their own password
4. You can set which vehicles they can see and which actions they can take

See [Multi-Tenant & Users](Multi-Tenant) for the full details.

---

## Using Tesla Carview from the Tesla browser

The Tesla touchscreen has a built-in browser. You can use Tesla Carview directly from the car:

1. Open the browser on the Tesla touchscreen
2. Navigate to `https://tesla.yourdomain.com`
3. Log in with your username and password (check "Stay signed in" for 90 days)
4. Bookmark or add to home screen for quick access

> 💡 **QR SSO login tip:** Tap **"Sign in with smartphone"** on the login page. A QR code appears — scan it with your smartphone, confirm with Face ID or Touch ID → the Tesla browser logs in automatically, without typing a password or passkey directly in the car.

---

## Changing your password

1. Go to **Settings → Account**
2. Click **Change Password**
3. Enter your current password and the new one (minimum 12 characters)

---

## Setting up two-factor authentication (MFA)

For security, set up MFA with an authenticator app (Google Authenticator, Authy, Bitwarden):

1. Go to **Settings → Security**
2. Click **Set up Two-Factor Authentication**
3. Scan the QR code with your authenticator app
4. Enter the 6-digit code to confirm

After setup, you'll be asked for the code at every login (unless you use a passkey).

See [Security](Security) for more details on all auth options.
