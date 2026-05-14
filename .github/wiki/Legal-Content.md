# Legal Content (Imprint, Privacy, Terms)

If Tesla Carview is publicly accessible (not just on your local network), you may be legally required to provide an imprint (Impressum), privacy policy, and terms of use — especially under German/EU law (DSGVO/GDPR).

---

## Is this relevant for me?

**I only use Tesla Carview on my local network (no public domain):**
→ No legal requirements. Skip this page.

**I have a public domain and only I use the app:**
→ Low risk, but an imprint is recommended if you're in Germany/EU.

**I use Tesla Carview with family or friends (non-commercial):**
→ You should configure imprint and privacy policy to be safe.

---

## Where to configure legal content

1. Log in as **admin**
2. Go to **Admin → Legal Content**
3. You'll see three sections: **Imprint**, **Privacy Policy**, **Terms of Use**

---

## Filling in the templates

Tesla Carview provides templates with placeholder fields marked as `<<PLACEHOLDER>>`. You must fill in:

| Placeholder | What to enter |
|---|---|
| `<<NAME>>` | Your full legal name |
| `<<STREET>>` | Your street and house number |
| `<<CITY>>` | Your city and postal code |
| `<<COUNTRY>>` | Your country |
| `<<EMAIL>>` | A contact email address |
| `<<PHONE>>` | Phone number (required in Germany) |

> ⚠️ **The app will warn you** if any `<<PLACEHOLDER>>` fields remain unfilled. Do not go public without completing all placeholders.

---

## Versioning and publishing

Legal content is versioned. When you make changes:
1. Edit the content in the editor
2. Click **"Publish new version"**
3. Users who have accepted a previous version are asked to accept the new one on next login

This creates an audit trail showing who accepted which version and when.

---

## Multi-language legal content

Tesla Carview manages legal content in one primary language (German by default for DE servers) and mirrors to other languages. If you change the German version, the other languages update automatically.

If you need custom translations, you can edit each language separately.

---

## GDPR / DSGVO minimum requirements for the privacy policy

If you're in the EU, your privacy policy must state:
- What personal data you collect (username, email, vehicle data, location)
- Why you collect it (personal use, private logging)
- How long you retain it (until account deletion or X years)
- Who has access (only you as admin)
- User rights (access, deletion, correction)
- Contact for data inquiries (your email)

Tesla Carview's template covers all of these. Just fill in your contact details.

---

## Operator contact (separate from legal)

For commercial inquiries or press contact, you can configure a footer contact email:
- **Settings → Operator Contact**
- This appears in the app footer and is separate from the legal imprint

This is configured in the frontend environment file (not the main `.env`):
```bash
# /opt/tesla-carview/frontend/.env:
VITE_OPERATOR_CONTACT_EMAIL=contact@yourdomain.com
```
