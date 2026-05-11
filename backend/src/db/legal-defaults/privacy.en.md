# Privacy Policy

> This policy describes which personal data is processed when this **privately self-hosted** Tesla data-logger instance is used, on what legal basis and for what purpose. The General Data Protection Regulation (GDPR) and the German Federal Data Protection Act (BDSG) apply.

## 1. Controller

Controller within the meaning of Art. 4 (7) GDPR:

<<NAME>>
<<STREET>>
<<ZIP_CITY>>
<<COUNTRY>>
E-mail: <<EMAIL>>

## 2. Nature of processing

The application is operated **exclusively for private use** of the controller and their household. **No** processing of third-party data takes place; public registration is not possible.

All data remains **locally on the controller's own server**. There is **no** transfer to third parties — with two documented exceptions (Tesla, optional Monta), see section 5.

## 3. Data processed

| Data category | Purpose | Legal basis |
|---|---|---|
| Username, password hash, MFA secret, login history | Authentication & account protection | Art. 6 (1) (b) GDPR — performance of contract |
| Tesla account OAuth token | Access to the Tesla Fleet API for own vehicles | Art. 6 (1) (b) GDPR |
| Vehicle master data (VIN, model, year) | Vehicle management | Art. 6 (1) (b) GDPR |
| Trip data (GPS, speed, consumption) | Logbook, range and consumption analysis | Art. 6 (1) (a/b) GDPR |
| Charging sessions (energy, duration, cost, GPS) | Charging history, home charging cost statement | Art. 6 (1) (b) GDPR |
| Battery telemetry (SoC, temperature, voltage) | Degradation analysis | Art. 6 (1) (b) GDPR |
| Server logs (IP, user agent, timestamps, status codes) | Security, abuse prevention (fail2ban, rate limiting) | Art. 6 (1) (f) GDPR — legitimate interest |
| Audit log of security-relevant actions | Forensics in case of incidents | Art. 6 (1) (f) GDPR |

## 4. Retention

| Data category | Retention |
|---|---|
| Refresh tokens | 7 days rolling, then automatic deletion |
| Server logs (nginx) | 14 days rotated |
| Trip and charging data | indefinite — deletion / cleanup function available in the app |
| User account | until active deletion |

The controller can delete data at any time via the **"Data management"** function in the app.

## 5. Recipients / third country transfer

### 5.1 Tesla, Inc. (USA)

To query vehicle data and control the vehicle, the [Tesla Fleet API](https://developer.tesla.com) is used. API calls (incl. OAuth token, vehicle VIN, command parameters) are transmitted to Tesla, Inc. (3500 Deer Creek Road, Palo Alto, CA 94304, USA). There is no processor relationship per Art. 28 GDPR; Tesla acts as an independent controller. Transfer mechanism: **Standard Contractual Clauses** of the EU Commission and the **EU-US Data Privacy Framework**. Tesla privacy notice: [https://www.tesla.com/legal/privacy](https://www.tesla.com/legal/privacy).

### 5.2 Monta ApS (Denmark) — optional

If the Monta integration is enabled in settings, charging sessions are synced to the Monta Partner API for billing. Recipient: Monta ApS, Vesterbrogade 26, 1620 Copenhagen, Denmark. Processing in the EEA — no third-country transfer. Privacy: [https://monta.com/privacy](https://monta.com/privacy).

## 6. Cookies

The application uses **strictly necessary cookies only**:

- `refreshToken` (httpOnly, Secure, SameSite=Strict) — login session, 7-day validity
- `localStorage['locale']` — chosen language, only stored locally in the browser, never transmitted

**No** tracking, advertising or analytics cookies are used. Consent under § 25 TDDDG is therefore not required.

## 7. Hosting

The server hosting this instance is operated by the controller themselves (self-hosting) or with a hosting provider under a data processing agreement. The specific provider will be named on request.

## 8. Your rights as a data subject

You have, in particular, the following rights under Art. 15–22 GDPR:

- **Access** to data processed about you (Art. 15)
- **Rectification** of incorrect data (Art. 16)
- **Erasure** ("right to be forgotten", Art. 17) — to the extent permitted by law
- **Restriction** of processing (Art. 18)
- **Portability** in a structured, machine-readable format (Art. 20) — the app provides CSV/JSON export
- **Object** to processing based on legitimate interest (Art. 21)
- **Right to lodge a complaint** with a supervisory authority (Art. 77) — your local German state data protection authority is competent

Send requests by e-mail to <<EMAIL>>.

## 9. Security

The application implements technical and organisational measures per Art. 32 GDPR. Details: see the [Security Policy](https://github.com/KnevS/Tesla-Carview/blob/main/SECURITY.en.md) in the repository.

## 10. Changes to this policy

This policy may be amended when processing changes or the legal landscape changes. After every change you will be asked to re-confirm at your next login. Earlier versions are kept in the system as evidence.

Last updated: <<DATE>>
