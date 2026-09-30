# Draft field SOP: EC/temperature measurement and official escalation

**Status:** Research draft for pilot design. Not authorized for deployment. It must be reviewed by Jharkhand DWSD/local laboratory staff, a qualified water-quality professional and the selected meter manufacturer.

**Purpose:** obtain repeatable electrical-conductivity (EC) and temperature measurements that may identify non-specific change at a known source. This procedure does not certify drinking-water safety and does not detect a named contaminant.

## Roles and prerequisites

- Only a trained, authorized worker conducts the visit.
- A named supervisor owns device assignment, calibration review and escalation.
- Follow the district’s approved sanitary-survey, FTK, sample-collection and laboratory procedures wherever they are more specific than this draft.
- Do not test when the device/check standard is expired, damaged, outside its check tolerance or missing required metadata.
- Do not mix demo records with field records.

The JJM framework places FTK surveillance with trained community members and sends concerning results to the laboratory pathway ([JJM WQMS Framework](https://jaljeevanmission.gov.in/sites/default/files/guideline/WQMS-Framework.pdf)). USGS guidance underpins the EC calibration, rinse, immersion, equilibration and documentation steps below ([USGS specific-conductance method](https://doi.org/10.3133/tm9A6.3)).

## Equipment

- EC/conductivity meter with temperature measurement and documented compensation;
- in-date conductivity check standard appropriate to expected range;
- clean rinse water specified by the manufacturer, clean labelled sample container if indirect measurement is used, and waste container;
- lint-free tissue only where the manufacturer permits blotting;
- gloves and other site-specific protective equipment;
- official FTK/H2S materials and laboratory sample containers only when the authorized protocol calls for them;
- phone/app plus paper fallback and supervisor/laboratory contacts.

## Before leaving for the site

1. Confirm assignment, source ID, intended sampling point and permission.
2. Inspect meter, probe, cable, battery and container for damage or residue.
3. Confirm device/probe serial number, check-standard value, lot and expiry.
4. Perform the manufacturer/quality-plan calibration or verification. Record time, standard temperature, expected value, observed value and pass/fail.
5. If the check fails, clean and repeat once according to the manufacturer. If it still fails, mark the device **OUT OF SERVICE**; do not create a water status.
6. Confirm the app is in **FIELD / SENSOR** mode and shows no simulated channels.

US EPA and USGS procedures require calibration/verification and recorded instrument QA rather than assuming a powered-on sensor is accurate ([EPA field-instrument SOP](https://19january2021snapshot.epa.gov/quality/standard-operating-procedure-calibration-field-instruments-temperature-pH-dissolved-oxygen_.html), [USGS](https://doi.org/10.3133/tm9A6.3)).

## At the source: identify and inspect

1. Match the durable source ID. Do not create a second source because spelling/location differs; flag identity uncertainty for supervisor review.
2. Record source type, village, sampling point, coordinates, date/time, operator, recent rainfall/season and whether the source was recently repaired, disinfected or unused.
3. Conduct the **approved sanitary inspection**. Note visible damage, standing water, drainage, nearby waste/latrine risks, unusual colour/odour, low flow and unsafe access. Observations can trigger official action but do not identify a contaminant.
4. Photograph only when permission and data policy allow it. Do not capture people or private premises unnecessarily.

WHO recommends preventive risk management and sanitary inspection for small supplies rather than relying on endpoint tests alone ([WHO small-supply guidelines](https://www.who.int/publications/i/item/9789240088740)).

## Sample / direct measurement

Use the source-specific procedure approved by the local laboratory. The following is a conservative draft for EC only:

### Flowing tap or handpump

1. Remove attachments only if authorized.
2. Run/pump until stagnant water is displaced and field conditions (temperature/EC) stabilize; record the flush duration or number of pump strokes chosen in the pilot protocol.
3. Prefer a clean flowing sample or a freshly filled clean container where the probe can be fully immersed without touching the sides/bottom.

### Well or other non-flowing source

1. Do not lean into or enter an unsafe structure.
2. Use only the approved clean sampling device and defined sampling depth/location.
3. Do not lower an unapproved electronic assembly into a source.

### Container measurement

1. Use a clean container dedicated to water measurement.
2. Rinse the container and probe with sample water as specified by the instrument/quality plan; discard rinse away from the source.
3. Fill a fresh aliquot. Avoid touching the inside, probe cell or sample with hands.

USGS recommends sample-water rinsing, fresh aliquots, full immersion, removal of air bubbles and keeping sensors off container sides/bottom ([field procedures](https://pubs.usgs.gov/of/2000/ofr00-213/manual_eng/pdf_file/ofr00-213_eng.pdf)). Lab-bound microbiological/chemical samples require their own sterile/preserved containers and must **not** be collected by improvising from this EC procedure.

## Measurement

1. Rinse/prepare the probe per the device procedure.
2. Immerse the complete sensing cell and temperature element. Do not rest it on the container.
3. Gently move/swirl only as instructed to remove bubbles; avoid sediment disturbance.
4. Wait for temperature and EC to stabilize using the pilot’s defined stability criterion; record raw EC, temperature, compensated EC at 25°C and elapsed stabilization time.
5. Remove/rinse the probe, replace with a fresh aliquot where applicable, and repeat.
6. Compare the two independent readings.
7. If disagreement exceeds the pilot tolerance, inspect for bubbles/fouling, rinse and take a third reading. Do not average an unresolved instrument/sample problem into a reassuring result.
8. If readings remain unstable or the meter errors, record **INVALID MEASUREMENT**, take no classification action and notify the supervisor.

Do not present more precision than the validated meter supports. Store raw values but display rounded values according to validated resolution.

## Result and decision

1. **Calibration or measurement invalid:** no water conclusion; service/check device and repeat the visit.
2. **Baseline not established:** save as `BASELINE_BUILDING`; continue the approved FTK/sanitary/lab schedule.
3. **No validated EC anomaly:** say “No conductivity anomaly observed in this measurement.” Never say safe, potable or contaminant-free.
4. **Possible anomaly:** repeat after cleaning/rinsing; check source events and device QA. If persistent, notify the named supervisor and follow the approved FTK/laboratory path.
5. **Sanitary inspection or approved FTK concern:** follow official escalation even if EC is unchanged.
6. **Immediate physical danger or suspected acute event:** stop sampling, keep people away only within the worker’s authority, and contact the designated DWSD/public-health emergency route. Do not improvise public-health advice.

The official JJM workflow sends concerning field results for laboratory testing and official remedial action ([WQMS Framework, section 9.1](https://jaljeevanmission.gov.in/sites/default/files/guideline/WQMS-Framework.pdf)).

## Confirmation sample / referral packet

Only an authorized collector follows the laboratory’s container, preservation, volume, transport and chain-of-custody requirements. The packet should contain:

- official source/sample ID and sampling point;
- collector, date/time and coordinates;
- sanitary inspection and reason for follow-up;
- raw and compensated EC duplicates, temperature and QA/calibration record;
- relevant approved FTK result with kit lot/expiry;
- requested laboratory parameters selected by the responsible official/lab—not inferred by JalRakshak;
- receiving laboratory, custody events and receipt time.

Creating a packet is not a laboratory referral completion or a confirmed result.

## After test

1. Rinse, clean and store the probe exactly as the manufacturer requires.
2. Dispose of FTK reagents/sample waste according to the approved kit/lab procedure; do not pour reagents into the source.
3. Review required fields and provenance before save.
4. Save locally if offline; retain the paper fallback/reference number.
5. Sync only to the authorized pilot backend/export path. Reconcile duplicates by immutable visit/sample ID.
6. At day end, perform and record the required verification check. Quarantine records if post-check failure suggests drift, pending supervisor review.

## Safety

- Never taste water as a test.
- Do not enter wells, tanks, treatment enclosures, steep banks, floodwater, mine drainage or electrically unsafe areas.
- Keep electronics and charging equipment away from wet energized infrastructure.
- Wear required PPE; wash hands; cover wounds; avoid splashes and direct contact with visibly polluted water.
- Work in pairs where site access, wildlife, traffic, weather or personal safety warrants it.
- Stop during lightning, flooding or unsafe crowd/site conditions.
- Do not tell the community a source is safe or contaminated. Use the authorized communication script and laboratory-confirmed information.

## Supervisor quality review

Daily/weekly review should check calibration pass rate, duplicate precision, missing metadata, source-ID conflicts, improbable jumps, repeated device failures, overdue confirmation packets and sync reconciliation. Any threshold or anomaly rule change must be versioned, approved and applied prospectively.

