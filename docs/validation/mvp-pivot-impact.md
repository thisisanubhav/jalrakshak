# Current MVP impact if the EC pivot is validated

Review only; no application changes in Round 4. The current MVP remains a clearly labelled simulation while H1–H10 are untested.

## KEEP

| Capability | Why |
|---|---|
| Offline IndexedDB persistence and idempotent sync abstraction | Directly reusable if H4/H8 are supported; valuable architecture even though the workflow need is unvalidated. |
| Source registration and stable UUID/source code | Required for same-source history, subject to mapping official IDs and stronger deduplication. |
| Geolocation with manual fallback | Useful context when authorized; requires privacy/access control for field data. |
| Source history | Structural prerequisite for repeated visits; presentation must become measurement/context history. |
| Per-measurement provenance and `NOT_CONNECTED` capability | Strong safeguard against simulating missing hardware channels. Extend origins to `PUBLIC_DATA` and rename `SENSOR` to `REAL_SENSOR` if implemented. |
| English/Hindi localization architecture | Reusable after terminology is validated with users. |
| PWA shell, large controls, accessibility foundations | Relevant to field operation; actual device/offline usability still needs direct testing. |
| Duplicate-save/referral and sync protections | Reusable integrity mechanisms. |
| Sensor-provider abstraction | Can isolate a future instrument provider, but should remain unused until GO. |

## MODIFY only after GO

| Current capability | Required direction |
|---|---|
| Four measurement cards | Replace real-field view with raw EC, compensated EC at 25°C, temperature-as-context, reading sequence, stability and agreement. |
| `NORMAL_SCREENING / RETEST / LAB_REFERRAL` | For real data, use measurement-quality/descriptive states; “no EC anomaly observed” is not safety. Keep demo states only in simulation. |
| Screening engine | Do not run provisional four-parameter rules on real data. A future comparison module must be separate, versioned and evidence-gated. |
| Result screen | Lead with calibration/check, duplicate agreement, comparability and next approved action—not coloured water status. |
| Lab referral | Reframe as an evidence/confirmation packet linked to an official sample ID; creation is not official acceptance or lab confirmation. |
| Map | Avoid red/amber/green contamination-like semantics. Show visit/source coverage or access-controlled measurement-quality context. |
| Dashboard | Shift from status counts to incomplete QA, device/check health, visits needing review and official follow-up. |
| Sync language | Identify the authorized receiving system and prevent duplicate government entry. Demo acknowledgement is not integration. |
| Source history | Separate sampling points, seasons, methods and origins; show raw visits/context before any baseline. |

## REMOVE from a future real-field mode

- simulated pH and turbidity values;
- temperature as an independent water-quality trigger;
- general “water quality screening” or multi-parameter detector framing;
- unsupported pH/TDS/turbidity/temperature referral bands;
- public unconfirmed status maps;
- any normal/safe implication from a low or stable EC reading.

Do not necessarily delete the current judge demo immediately. Isolate it as a historical software prototype with explicit `SIMULATED` provenance until the validation decision determines whether it still serves a communication purpose.

## DEFER

- ESP32/Bluetooth or any sensor integration;
- anomaly thresholds;
- pH/turbidity hardware;
- production WQMIS/Jhar-Jal integration;
- public or programme analytics;
- laboratory result management;
- ML/AI and predictions.

## Current safety assessment

The application already states that readings and rules are simulated/provisional and supports measurement-level provenance. It should therefore remain unchanged during direct validation. Enabling any real sensor provider before implementing the P0 controls from Round 3 would be unsafe.

