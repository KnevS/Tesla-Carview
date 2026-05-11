# Disclaimer

> 🇩🇪 [Auf Deutsch lesen](DISCLAIMER.md)

> ⚠️ This document is **not legal advice**. It summarises standard clauses
> that apply alongside the [LICENSE](LICENSE). The English license text in
> `LICENSE` is authoritative in case of dispute.

## Provided "as is"

The software is provided **"as is"**, without any warranty of any kind.
To the maximum extent permitted by applicable law, the licensor disclaims
all liability for damages arising from the use, behaviour or provision of
the software, on any legal basis.

Under German law, liability is preserved only in cases where the law
mandates it:

- Intent (Section 276 BGB)
- Gross negligence (Section 276 BGB)
- Injury to life, body or health (Section 309 No. 7a BGB)
- Mandatory liability under the German Product Liability Act (ProdHaftG)

Because this software is provided **free of charge and noncommercial**, the
gift-liability rule of **Section 521 BGB** applies in addition: the donor
is only liable for intent and gross negligence.

## Operator responsibility

Anyone installing and/or self-hosting Tesla Carview accepts full responsibility for:

1. **Operating the server** — OS, patches, backups, firewall, physical
   security, availability.
2. **Tesla API compliance** — the [Tesla Developer Terms of Service](https://developer.tesla.com/terms),
   selecting the correct API region, rate limits, tariff obligations,
   security of your own `Client ID` / `Client Secret`.
3. **Data protection** — GDPR/EU compliance, a correct legal notice (German §5 DDG),
   informing users of your own instance, fulfilling access, deletion and
   correction rights.
4. **Configuration** — strong `JWT_SECRET`, enabled MFA, no publicly
   reachable test credentials, keeping the app up to date.
5. **Third-party contracts** — Monta integration, hosting provider, TLS
   certificates.

The licensor does **not** act as the operator of your instance and does not
take responsibility for configuration, data or damages arising from
operation by third parties.

## Tesla trademarks

"Tesla", "Model Y", "Fleet API" and similar terms are trademarks of
Tesla, Inc. This software is **not an official Tesla product** and is not
affiliated with Tesla, Inc. or any of its subsidiaries. Tesla trademarks
are used purely for descriptive purposes and no rights to those trademarks
are claimed.

## Third-party software licenses

Tesla Carview uses many open-source libraries (npm packages). Their
respective licenses — mostly MIT, Apache-2.0, BSD-2/3-Clause — are listed
in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Every redistribution of Tesla Carview must include this list so that the
attribution obligations of the third-party licenses are met.

## No advice, no fitness warranty

The software, its documentation and any hints contained in it (in particular
about Tesla API access, taxes/billing, maintenance or security) are **not
advice in a legal, tax, technical or vehicle-related sense**. Anyone making
decisions based on data displayed by the app accepts the risk alone.
