# JalRakshak — unified three-minute demonstration

Use the local `feat/unified-field-experience` build. This is a proposed script; successful timing and browser operation on this revision await the release run in [QA evidence](../unification/qa-report.md). All demonstration source records are fictional. Do not describe the app as a water test or contamination detector.

## Preparation

1. Build locally with `npm run build -- --webpack`; start with `npm run start -- --hostname 127.0.0.1 --port 3001` if that port is free. Open `http://127.0.0.1:3001/`. No remote deployment is involved.
2. While online, let the production service worker install. Open Training & Demo → Software-only judge demo → Load four synthetic scenarios. Confirm DEMO-01 through DEMO-04 appear and the synthetic banner is visible.
3. For a clean rehearsal, use Reset software-only demo records, read and confirm its scope, then load again. Reset deletes synthetic field work only. Re-loading without reset preserves any follow-up edits.
4. Optional map rehearsal: edit DEMO-01 and enter fictional demonstration coordinates `23.3, 85.3`. The fixture does not assert a real water source at that location. These optional edits are unnecessary for the four deterministic evidence scenarios.
5. Disconnect networking after caching. Refresh once and confirm the sources remain. Map tiles are not guaranteed offline; use List View. Keep a downloaded report as a fallback presentation artifact, clearly labelled synthetic.

## Timed script

| Time | Action | Say |
| --- | --- | --- |
| 0:00–0:20 | Show the six tabs and synthetic workspace label | “JalRakshak preserves measurement quality and follow-up evidence for rural Jharkhand. It works without a connected device or backend. EC alone cannot establish drinking-water safety.” |
| 0:20–0:45 | Open DEMO-01 history: readings 610 and 614 µS/cm | “Independent readings agree under a provisional repeatability rule. That is consistency, not proof of accuracy or safety. Calibration and temperature context remain visible.” |
| 0:45–1:10 | Select DEMO-02: 610 and 830; inspect investigation | “Disagreement is retained. The operator can request a third reading or a new linked visit. Failed evidence is excluded; saving does not turn it into a passing record.” |
| 1:10–1:40 | Select DEMO-03 history and investigations | “Three eligible earlier visits provide a baseline. A repeatable later reading changes substantially. The explanation shows the baseline and provisional thresholds. This opens a follow-up question, not a contamination finding.” |
| 1:40–2:15 | Select DEMO-04; inspect timeline and timestamped event log | “A linked retest supports a persistent historical change. The operator plans laboratory testing, but the app sends no notification or sample. This synthetic example closes without confirmation, keeping the uncertainty explicit.” |
| 2:15–2:40 | Reports → select DEMO-04 → switch Hindi → Download source CSV / Print | “The report contains this source's readings, calibration context, comparisons and linked follow-up evidence. Synthetic provenance is disclosed. PDF is the browser's Print / Save as PDF facility.” |
| 2:40–3:00 | Return English if needed; Investigations overview → manual workspace | “Counts are drawn from stored records in this workspace. Synthetic work does not alter real histories or metrics. Offline records persist locally; there is no cloud backup claim.” |

## Optional longer walkthrough

- **Real field use:** Manual field records → Register source → Record Measurement. Enter legitimate existing EC readings, timestamp and instrument reference; add temperature and calibration metadata when known. Review repeatability, save, inspect the visit and any investigation. Software cannot physically obtain those readings.
- **Map:** Water Sources → Map View. Select a marker, open its history, and compare the text list. Marker colours represent follow-up states. Sources without coordinates remain in the list.
- **Investigation:** Choose Needs review → Retest requested, write an explanation/operator code, then Record linked retest. Its timestamp must follow the request. Complete review with supporting evidence; resolve only if the permitted evidence conditions hold, otherwise refer or close without confirmation.
- **Training:** Training & Demo → Legacy screening simulator. Its pH/TDS/turbidity/temperature values are simulated, stored separately and prominently labelled “SIMULATED DATA — NOT A REAL WATER TEST.” Interactive EC training preserves the earlier judge demonstration.
- **Legacy records:** Use the earlier-experiments link in Training or open `/?legacy=1`. Old records are not imported, relabelled or erased by the unified field application.

## Submission framing

The target beneficiaries are community field workers and supervisors in rural Jharkhand who need a record of measurements, exclusions and follow-up. The proposed benefit is continuity of evidence under intermittent connectivity; user research and achieved impact are not established.

[Jal Jeevan Mission WQMIS](https://ejalshakti.gov.in/WQMIS/) already supports official testing roles and reporting. JalRakshak neither replaces it nor integrates with it. See [the implementation report](../unification/implementation-report.md) for Jhar-Jal source limitations and [USGS measurement guidance](https://www.usgs.gov/publications/chapter-a63-specific-conductance) for scientific context. The prototype's tolerance and anomaly thresholds are not certified standards.

Suggested seven-slide outline: (1) proposed Jharkhand workflow problem, (2) field-worker journey, (3) software-only/offline architecture and provenance, (4) repeatability and historical comparison with limitations, (5) investigation/retest evidence, (6) synthetic demo plus verified QA and blockers, (7) future user validation and impact measurement plan. Never present synthetic scenarios as field results.
