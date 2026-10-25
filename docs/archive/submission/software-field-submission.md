> **Historical archive:** This document describes an earlier revision. Its workflow, deployment notes and test counts are not current. See the [current README](../../../README.md) and [field guide](../../field/daily-work.md).

# JalRakshak: software-only field submission

Revision: 23 October 2026. This document describes the feature branch, not the currently published deployment. Earlier submission documents and screenshots describe the pre-transformation prototype. No deployment, official integration, or field validation is implied.

## Problem and beneficiaries

A useful software contribution is to preserve the chain from an operator-entered measurement to repeatability review, comparable historical evidence, an investigation, a repeat visit, and a documented outcome. The intended users are community field workers, Jal Sahiya/VWSC participants, NGO field teams and supervisors working with existing measurement records or available instruments in rural Jharkhand. This is a proposed user fit, not a verified adoption claim.

Jharkhand already has Jhar-Jal. Its publisher describes handpump and sanitary surveys, discharge measurements and FTK/H2S testing. JalRakshak must complement that work, not claim to invent digital water-source records. Source: [Jharkhand Space Applications Center's JHARJAL listing](https://play.google.com/store/apps/details?id=com.e.jharkhand_drinking_water_dwsd), checked 23 October 2026.

The national WQMIS portal has public, FTK, sample-collector/departmental and laboratory roles and reporting for testing and remedial action. JalRakshak neither replaces nor sends data to it. Source: [DDWS WQMIS](https://ejalshakti.gov.in/WQMIS/), checked 23 October 2026. The portal returned empty/zero dashboard values during this review; these are not used as evidence of coverage or performance.

The field-workflow limitation addressed here is a design hypothesis: fragmented local notes can make it harder to distinguish a questionable measurement from a persistent change and to retain the follow-up evidence. No claim is made that Jhar-Jal lacks these capabilities or that this problem affects a measured fraction of Jharkhand villages. Interviews and workflow comparisons remain necessary.

## Why software alone helps

The application accepts manually entered readings from an existing meter, paper log or other legitimate measurement record. It checks consistency, records limitations, compares compatible visits and tracks follow-up entirely in the browser. It requires no ESP32, connected sensor, Bluetooth pairing, API key, paid service or backend. Software cannot physically measure water; real measurements still need a legitimate external origin. Synthetic fixtures exercise the workflow without any instrument.

## Implemented product

- Primary navigation: Water Sources, Record Measurement, Measurement History, Investigations, Reports.
- Sources: identifier/name, village/district/location, category, optional paired GPS, optional image up to 1 MB, operator code, creation and edit times. Editing uses optimistic concurrency checks.
- Manual visits: explicit timestamp, two/three EC readings, optional temperature, instrument label, optional device/probe IDs, calibration date/reference and notes.
- Quality: finite ranges and timestamps are validated. Disagreement is saved as disagreement with an investigation; the optional third reading is evaluated without changing prior records.
- Analysis: eligible earlier visits only; baseline median and previous eligible reading; absolute and percentage deltas; saved rule and comparison snapshots; visible exclusions.
- Investigations: Needs review → Retest requested → Retest completed → Laboratory referral / Resolved / Closed without confirmation, with allowed repeat-request paths. Every change has an operator, timestamp and explanation.
- Retest completion requires a linked measurement after the request. Persistent-change assessment requires an anomalous linked retest. Resolution requires a reviewed repeatable stable retest and explicit assessment. Closure is never a drinking-water safety conclusion.
- Reports: selected source/workspace only, complete readings, quality, metadata, rule/comparison snapshots and event history; English/Hindi CSV and browser Print / Save as PDF.
- Legacy Experimental EC, map, simulated screening and original judge scenarios remain available under “Earlier experimental & screening demos”. No existing records are converted into field evidence.

## Methodology and limits

Repeated readings agree if their difference is at most max(20 µS/cm, 5% of their mean). If the first pair disagrees, a third reading can identify the closest agreeing pair. If no pair agrees, disagreement remains. These inherited prototype tolerances require bench/field validation; they are not regulatory acceptance criteria. Repeatability is not accuracy.

Trusted comparison requires repeatability, calibration date plus reference metadata, known temperature, the same source, origin, instrument/device/probe identity and sampling method, and temperature within the configured envelope. A missing calibration reference or temperature excludes comparison but does not invalidate otherwise valid numeric readings. Calibration metadata is self-recorded and is not independent verification.

Default investigation rules require at least three earlier eligible visits, a change of at least 100 µS/cm AND 25% from their median, within a 2°C temperature envelope. Operators can change those rules; each saved visit preserves the settings used. A zero median uses the absolute threshold alone and leaves percentage undefined. Rules are provisional screening heuristics, not medical, contaminant-specific or regulatory limits.

Conductivity depends on dissolved ionic substances and temperature. The software records raw EC; it does not silently temperature-compensate or convert EC into contaminant concentrations. Source: [USGS specific conductance explanation](https://nrtwq.usgs.gov/ca/constituents/view/00095). Measurement practice requires calibration, maintenance and proper reporting; see [USGS National Field Manual, 2019, Chapter A6.3](https://www.usgs.gov/publications/chapter-a63-specific-conductance). These sources do not validate JalRakshak's thresholds. Inference for this product: EC alone cannot certify drinking-water safety or identify a particular contaminant.

## Architecture and local data

Next.js/React renders a client field workspace. Pure TypeScript field validation and comparisons reuse the existing repeatability engine. Dexie schema v6 adds fieldSources, fieldMeasurements and fieldInvestigations beside the untouched v1–5 stores. Transactions save a visit and its automatically opened investigation together. Idempotency keys prevent retry duplication. Evidence transitions validate the expected last event to prevent stale overwrites.

Field records carry MANUAL_FIELD or SYNTHETIC_DEMO scope. Source lookup, retest linking, comparisons, reports and demo loading enforce scope separation. Synthetic fixtures have fixed IDs and dates, load transactionally and never overwrite a loaded scenario's follow-up edits.

The service worker caches the application shell and its initial JavaScript/CSS. Maps still need network tiles. Core field operations do not call a server. Draft persistence errors are visible; saved records are never reset automatically. On read, malformed records, quality flags, comparison snapshots or evidence transitions block the field view with a recovery warning. There is no automatic repair or import UI yet.

Local data can be lost when browser storage is cleared, evicted or the device is lost. There is no remote backup, authentication, multi-device collaboration, encrypted vault or official notification. Reports may contain location/photos/operator references: use nonpersonal operator codes and only fictional data for public demonstrations. CSV is an evidence export, not a full restorable backup; photographs are not embedded in CSV.

## Original contribution and evidence honesty

The contribution in this branch is a manual field-first workflow plus an append-only application evidence lifecycle, snapshot-based comparisons, source-scoped bilingual reporting and a deterministic complete follow-up example. Domain logic is reusable and transparent. Existing open-source libraries provide UI, storage and mapping; no novel scientific detection method is claimed.

The demonstration is synthetic. Automated tests establish behavior for specified examples, not performance in a rural deployment. There are no invented government statistics, stakeholder endorsements, testimonials, avoided illnesses, reduced turnaround times or impact figures. Institutional validation remains pending.

## Impact measurement plan

With an authorized pilot and agreed protocol, measure:

1. Proportion of visits with two independent readings and complete context.
2. Proportion of disagreeing visits receiving a documented retest.
3. Proportion of investigations with timestamped outcome evidence.
4. Time from review request to repeat visit and outcome (report missing follow-ups separately).
5. Offline save/refresh success, duplicate rate, storage failures and export completeness.
6. Agreement with an independently reviewed reference procedure; do not equate EC agreement with potability.

Record denominators, exclusions and attrition. Compare to a documented existing workflow only after consent and baseline collection. Do not set outcome claims in advance. Interview users about workload, Hindi terminology, reporting compatibility and whether this duplicates tools they already use.

## Three-minute demonstration

Preparation: on the local production build, open the app online once and allow the service worker to finish installing. Open “Software-only judge demo” and load four synthetic scenarios. Keep these records ready; optionally rehearse turning the browser offline. A cold first-ever load cannot work without previously cached software. Browser QA remains a release gate documented in the readiness report.

- **0:00–0:20:** Introduce Jharkhand field follow-up. Point to the synthetic-data banner and the EC limitation. State that no hardware connection or government notification occurs.
- **0:20–0:45 — Scenario 1:** Select DEMO-01 in Measurement History. Show readings 610/614 and their repeatable result. Explain that a single visit cannot establish a baseline.
- **0:45–1:10 — Scenario 2:** Select DEMO-02. Show 610/830, disagreement and third-reading guidance. Open Investigations; optionally request a retest with operator DEMO and a short reason. The failed record is preserved.
- **1:10–1:40 — Scenario 3:** Select DEMO-03. Show three earlier compatible visits, 1018/1022 on the current visit, median/delta and provisional thresholds. Open Investigations and show Needs review. This is an investigation prompt, not contamination proof.
- **1:40–2:25 — Scenario 4:** Select DEMO-04 in Investigations. Walk through review, retest request, linked 1020/1024 readings, persistent-change assessment, recorded referral intention and closure without confirmation. Explain that the app did not send a sample or receive a laboratory result.
- **2:25–2:50:** Switch to Reports, retain DEMO-04, switch to Hindi, download the scoped CSV and open Print / Save as PDF. Show notes and the timestamped evidence chain.
- **2:50–3:00:** Conclude with the useful software task: preserve measurement quality and follow-up evidence offline. State that pilot validation and device/browser QA remain before field release.

The fourth fixture is pre-completed for a repeatable three-minute walkthrough. To demonstrate live editing, use DEMO-03 to request a retest, record a new visit after the request, mark it completed with linked evidence, then close without confirmation or refer for testing. Resolution requires the stricter evidence conditions described above.

## Seven-slide presentation outline

1. **Problem and user:** rural Jharkhand field teams need a traceable measurement-to-follow-up record; label the workflow-gap hypothesis and intended users.
2. **Existing ecosystem:** Jhar-Jal and WQMIS already support public water work. Cite their official pages; position this prototype as a local complementary measurement-quality tool.
3. **Software-only solution:** source → manual readings → quality → compatible history → investigation → retest → outcome. No ESP32, paid API or sensor connection.
4. **Explainable methodology:** pair tolerance, optional third reading, exclusions, three-visit median, dual thresholds, zero baseline. Prominent “not drinking-water safety” boundary.
5. **Working demonstration:** four synthetic scenarios, complete evidence log, Hindi, local CSV/PDF; separate implemented behavior from browser QA pending in this environment.
6. **Engineering and validation:** versioned additive storage, atomic writes, retry protection, migration/corruption tests, service-worker cache test. Quote only current verified counts from software-field-readiness.md.
7. **Impact and next steps:** authorized stakeholder pilot, measurement-quality and follow-up metrics, usability/reference-method validation; no fabricated field impact. End with a specific validation request rather than a claim of deployment readiness.

## Future work

Validate the method and Hindi copy with field users; verify low-end Android behavior, storage pressure, long histories and print layouts; add audited recovery/import and backup, instrument/compensation metadata, reviewed threshold profiles, source edit history and richer evidence attachments. Government integration, authentication, cloud synchronization, laboratory result ingestion and hardware integration are not implemented or required for this software-only prototype.
