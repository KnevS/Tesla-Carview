# License & Usage Rights

Tesla Carview is open source — but with important restrictions on how it may be used.

---

## What the license says in plain language

Tesla Carview is licensed for **non-commercial, private use only**.

### ✅ You MAY:

- **Run your own instance** for personal use (tracking your own Tesla)
- **Run an instance for your family** (spouse, children, parents) — non-commercial household use
- **Run an instance for a small private group of friends** — as long as nobody pays for access and you receive no compensation
- **Modify the code** for your own private installation
- **Fork the repository** and contribute improvements back
- **Share the project** with others, with clear attribution to the original author

### ❌ You may NOT:

- **Charge money for access** to your instance (no subscription fees, no access fees)
- **Use it as part of a paid service** (no SaaS, no "Tesla tracking as a service")
- **Offer it to commercial customers** (no fleet management for businesses, no enterprise use)
- **Remove or obscure copyright notices** or attribution
- **Sell modified versions** of the software
- **Use it for commercial fleet management** (managing vehicles for a business)

---

## What counts as "commercial"?

**Not commercial (allowed):**
- You track your own Tesla
- Your partner/children use your instance to track the family car
- 3–5 close friends share a server you all split the hosting costs on equally (at-cost, no profit)

**Commercial (not allowed):**
- You charge a monthly fee for friends/customers to use your instance
- You offer Tesla tracking as part of a paid app or subscription
- Your employer pays you to manage a fleet with this software
- You build a business around this software

**Grey areas → ask first.** Open a GitHub issue or contact the author.

---

## Attribution requirements

If you run a public instance or share a modified version, you must:

1. Keep the copyright notice in the `LICENSE` file
2. Keep the `AUTHORS` file and `NOTICE.md` intact
3. Add your own name/changes to `AUTHORS` if you made significant modifications
4. Link back to the original repository: `https://github.com/KnevS/Tesla-Carview`

---

## Tesla's terms of service

Using Tesla Carview connects to Tesla's official Fleet API. By using Tesla Carview, you also agree to:
- [Tesla's API Terms of Service](https://developer.tesla.com/docs/fleet-api/using-the-api/terms-of-service)
- Tesla's fair use policy for API calls

Responsible API usage is built into Tesla Carview (sleep detection, rate limiting), but you are responsible for compliance with Tesla's terms.

---

## Privacy considerations for self-hosters

If you grant access to others (family, friends), you should:
- Configure an imprint and privacy policy (→ [Legal Content](Legal-Content))
- Tell users what data is collected and stored
- Provide a way for users to request data deletion (**Admin → Data → Delete User Data**)
- Be aware that vehicle location and charging data is personal information under GDPR/DSGVO

---

## Contributing to the project

Contributions are welcome! By submitting code:
- You agree that your contribution will be licensed under the same terms
- Your name will be added to the AUTHORS file with your permission
- Please sign off commits: `git commit -s`

See [CONTRIBUTING.md](https://github.com/KnevS/Tesla-Carview/blob/main/CONTRIBUTING.md) for the full contribution guide.

---

## Full license text

The complete license is in the repository: [LICENSE](https://github.com/KnevS/Tesla-Carview/blob/main/LICENSE)

Questions about licensing? Open an issue or contact the author at the email in the repository's `AUTHORS` file.
