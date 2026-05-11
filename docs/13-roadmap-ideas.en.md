# Roadmap ideas

> 🇩🇪 [Auf Deutsch lesen](13-roadmap-ideas.md)

A collection of feature ideas for future releases. Inspired by the usual
feature set in the Tesla data-tracker space (Teslamate, TeslaFi,
TeslaLogger, TeslaMate forks, ABRP Companion, Watt for Tesla, etc.) —
this list contains **functional descriptions only**, no UI layouts, no
copied text, no code snippets and no brand/name imports.

> **Legal note:** Functionality as such is generally not copyrightable
> under German and EU law (BGH I ZR 159/10 "Lottoblock", CJEU C-406/10
> "SAS Institute"); what *is* protected is concrete expression (code,
> text, graphic design). This document restricts itself to **what** apps
> in this space commonly do — Tesla Carview implements the **how**
> independently.

## Commonly seen in the space — candidates for Tesla Carview

### Energy & efficiency
- **Per-trip consumption vs. WLTP** for the model, as a delta indicator.
- **Eco-score per trip** derived from Wh/km vs. the car's own baseline
  (purely local, no cloud model).
- **Energy heatmap on the GPS line** of the trip: red = high consumption,
  green = regen recovery, yellow = constant cruise.
- **Elevation profile** per trip (from open-elevation or offline height
  tiles). Correlation consumption ↔ metres climbed.
- **Climate-energy split**: difference between drive-power and
  wheel-power when both are reported.

### Battery & charging
- **Capacity trend** (net kWh over time, regression on degradation,
  "SoH 90 % expected by ~MM/YYYY").
- **Recommended charging window** combining the existing tariff curve
  (aWattar / Tibber) with target SoC and planned departure time.
- **Loss estimate on fast charging** (paid kWh vs. kWh actually
  arriving in the battery) — for home billing and per DC-charger type.
- **Fast-charging curve comparison**: the current session against
  historical sessions at the same location / charger type as a line chart.
- **Phantom-drain tracker**: SoC delta while parked, broken down per
  location / season (Sentry-Mode cost estimate).

### Trips & logbook
- **Location heatmap** (complementary to the new activity heatmap):
  "where have I been often" on the map, without path lines.
- **Frequent-route detection** — when start/end is similar to an
  existing route, suggest a classification (commute vs. private) and
  the previously used purpose.
- **Trip replay**: play back the trip along the timeline with
  synchronised SoC, speed and climate values.
- **Geofence auto-classification**: polygons "Home", "Work", trips
  between them auto-tagged as `commute`.
- **Business-partner templates** (frequently visited
  partners/clients as a dropdown in the input field).

### Comfort & control
- **Preconditioning automation**: trigger climate X min before the next
  calendar event when the car is in range and plugged in.
- **Sentry-Mode smartness**: auto-off at the home point after X min,
  auto-on at hotel/parking.
- **Door behaviour**: at approach + phone-key + home-geofence,
  pocket-mode locking.
- **Dynamic charging limit**: target SoC inferred from tomorrow's
  schedule (optional calendar integration).

### Reports & analytics
- **Maintenance prediction** based on the km trend (linear extrapolation):
  "MOT due around DD.MM.YYYY at current usage". Half-implemented via
  service intervals.
- **Range realism per weather**: real consumption correlated with
  outside temperature (from `state.outside_temp`); forecast "at -5 °C
  a full battery is ~280 km today".
- **Annual report PDF**: a single-page visual with heatmap, top 5 routes,
  total kWh, total cost, CO₂ vs. diesel equivalent (locally computed,
  no cloud estimate).
- **CO₂ reporting mode**: per trip an estimated CO₂ figure using
  the German/EU grid mix as default (operator can override the
  g/kWh, e.g. for a PV share).

### System & multi-user
- **Family-sharing dashboard**: extra tab per vehicle showing "who drove
  when" — chart per driver per week (uses the existing `driver_id`).
- **Push-notification rules**: configurable triggers (e.g. "SoC < 20 %
  AND not at home" → reminder).
- **Outbound webhooks**: per-tenant target (Home Assistant, IFTTT, n8n)
  — trip end, charge end, maintenance due posted as JSON.
- **Read-only API tokens** for third-party analyses, with scope
  selection (trips only / charging only / battery only).

### Privacy & security (beyond what is in place)
- **GPS-fuzzing mode** per tenant: last-mile coordinates rounded to
  ~200 m so the exact home location is never persisted (relevant for
  multi-driver tenants).
- **Right-to-be-forgotten job**: trips older than N years are
  auto-anonymised (round GPS to 4 decimals, drop addresses), audit
  record retained.
- **WebAuthn step-up** for high-impact actions (backup download,
  tenant deletion) on top of the login passkey.

## Things deliberately NOT adopted from the space

- **External cloud sync** of vehicle data to a third-party dashboard.
  Conflicts with the self-hosting promise.
- **Proprietary export formats**. We keep CSV / JSON so data remains
  portable.
- **Identifying auto-statistics participation** (send anonymised trip
  data to a pool to compute model averages). May come as opt-in later,
  never as default.

## Suggested priority order

Ranked by value-per-effort:

1. **Geofence auto-classification** (small UI, daily-life impact)
2. **Per-trip consumption vs. WLTP** (one number, lots of value)
3. **Location heatmap** (same render path as the activity heatmap)
4. **Outbound webhooks** (opens the ecosystem)
5. **Range realism per weather** (needs 1–2 weeks of data first)
6. **Annual report PDF** (great marketing artefact)
7. **GPS-fuzzing mode** (relevant for company tenants)

All listed functions are **proposals, not commitments**. Each
implementation is done independently, without taking external code or
external text.
