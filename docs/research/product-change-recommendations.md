# Product change recommendations

This is a research branch. These recommendations are **not implementation in this PR**.

## P0 — scientifically necessary before any field use

1. **Disable the current demo classifier for real sensor data.** The pH 5.5/9.5, TDS 1,200, turbidity 10 and temperature status boundaries are unsupported demo heuristics. Do not silently replace them with BIS values.
2. **Replace field terminology.** For real EC V1, use `INVALID_MEASUREMENT`, `BASELINE_BUILDING`, `NO_EC_ANOMALY_OBSERVED`, `REPEAT_MEASUREMENT` and `FOLLOW_OFFICIAL_CONFIRMATION_WORKFLOW`. Keep MVP statuses only in explicit simulation mode until governance/scientific validation.
3. **Store raw measurement and metrology metadata.** EC (µS/cm), compensated EC at 25°C, raw temperature, algorithm/factor, EC-derived TDS if shown, device/probe ID, calibration/check record, operator, duplicates, stabilization, error/uncertainty and sample method.
4. **Require duplicates and fail closed.** Missing calibration, sensor fault, disagreement, NaN/out-of-range or unavailable channel must never become a normal result.
5. **Do not require nonexistent channels.** Real V1 is EC + temperature; pH/turbidity stay `NOT_CONNECTED`. Never fill them with simulation.
6. **Separate provenance and datasets.** Add `PUBLIC_DATA` to the existing origin model; prohibit demo values from pilot exports; only a traceable laboratory report can set `LAB_CONFIRMED`.
7. **Add sanitary inspection and official escalation context.** A sensor-only workflow is incomplete. Use the district-approved checklist and route rather than inventing a new lab referral.
8. **Remove/role-restrict public unconfirmed maps.** Exact source and provisional anomaly data require governance and should not imply official contamination.
9. **Establish calibration ownership.** Device assignment, check schedule, standards, expiry, out-of-service state, replacement and supervisor review must exist before enrollment.
10. **Obtain institutional approval and privacy/consent protocol.** No pilot source coordinates or community data go into a public/demo repository.

## P1 — necessary before the next hackathon demonstration

1. Reframe the opening copy to “offline measurement QA and early-warning research,” not general water-quality screening.
2. Put the detection-capability matrix into a concise, accessible “What this can/cannot measure” view.
3. Demonstrate V1 with only EC/conductivity and temperature; present pH/turbidity as simulated software channels only in a clearly separate legacy demo if retained.
4. Rename “Lab referral” in demo narration to “Prepare confirmation request” unless integrated with an authorized receiving laboratory.
5. Show Jhar-Jal and WQMIS in the ecosystem/architecture; explicitly state that JalRakshak is not a replacement.
6. Replace “Normal” map language for real data with “No EC anomaly observed”; retain laboratory status separately.
7. Make calibration status, repeated-reading agreement and data origin visible before result status.
8. Update the 90-second story so the scientific achievement is rejecting/confirming a stable reading and producing a traceable packet—not declaring the source condition.

## P2 — valuable after pilot evidence

- authorized export/interoperability with Jhar-Jal/WQMIS;
- source/season baseline visualization with transparent, validated rules;
- supervisor QA review and device fleet/calibration dashboard;
- chain-of-custody fields linked to official sample IDs;
- pH only after maintenance/usability and incremental-decision value are validated;
- purpose-built turbidity only after reference validation at low NTU;
- additional Jharkhand language based on user research;
- privacy-preserving aggregated programme analytics.

## Do not build

- potability or contaminant classification from EC/TDS;
- arsenic, fluoride, iron, lead, nitrate, microbial or pesticide claims without parameter-specific approved methods;
- ML anomaly detection before a reliable labelled longitudinal dataset exists;
- more generic IoT sensor channels to make the device appear comprehensive;
- a parallel official source registry, laboratory network or public contamination map;
- ESP32/Bluetooth integration before field discovery, benchtop/reference validation and calibration ownership are resolved;
- production government integration without written authorization and data-governance review.

## Screening-engine disposition

Do not change `src/domain/screening.ts` in this research PR because the app labels the rules and all data as demo/simulated. Before any real provider is enabled, the application must prevent those rules from running on `SENSOR` data. The rule audit and replacement decision model are in [scientific-basis.md](scientific-basis.md).

