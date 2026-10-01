# Provisional EC measurement experiment

**Not a production SOP, regulatory method or water-safety classifier.** Use only after qualified review, local authorization and device-specific validation. This protocol records experimental repeatability; it does not prescribe a universal anomaly threshold.

## 1. Device identification

Record device ID, probe ID, model, firmware, measurement range/resolution, unit, compensation setting, last service and assigned custodian. Confirm the device is not marked out of service.

## 2. Calibration/check

Record calibration/check ID, standard value, lot, expiry, standard temperature, observed pre-check value, tolerance source and pass/fail. Do not measure field water after a failed check. The acceptance limit must be predeclared from the validated quality plan/manufacturer/reference method—not invented during the visit.

## 3. Source identification

Match the approved durable source ID and exact sampling point. Record source type, location according to privacy policy, recent repair/disinfection/downtime and whether identity is uncertain. Do not create a duplicate source to bypass uncertainty.

## 4. Observation and sanitary context

Complete the approved sanitary inspection. Record recent rainfall/season, flooding, unusual flow/appearance/odour, nearby risks and other events without inferring a contaminant.

## 5. Source conditioning / sample

Use the locally approved source-specific flushing/pumping procedure. Record duration/strokes/flow context. For container measurement, use the defined clean container, rinse sequence and fresh aliquot. A procedure for a monitoring well cannot be copied blindly to a community handpump or tap.

## 6. Temperature and raw EC

For every reading retain:

- raw EC and unit;
- water temperature in °C;
- temperature-compensated EC at 25°C;
- compensation method/coefficient;
- timestamp and sampling point.

If a TDS estimate is calculated later, retain the conversion factor and label it derived. Do not replace raw EC.

## 7. Reading 1 and stabilization

Fully immerse the sensing cell/temperature element, remove bubbles as instructed and keep the probe off container surfaces. Observe until the preregistered stability condition is met. Store the reading series or stabilization time, not only the final number.

## 8. Reading 2

Remove and rinse the probe according to the plan. Use a fresh aliquot or repeat the approved direct-measurement sequence. Stabilize independently and record sequence 2.

## 9. Agreement check

Compare readings using a tolerance established during bench/reference validation. Do not borrow a professional-instrument criterion without showing that the selected device and field method meet it.

- Agreement: continue.
- Disagreement: inspect for bubbles, immersion, contamination, flow and transcription/unit errors; clean/rinse and take Reading 3.
- Persistent disagreement: `INVALID_UNSTABLE`; no historical/anomaly interpretation.

USGS professional programmes often use stability bands and site calibration checks, illustrating the principle rather than establishing JalRakshak’s future tolerance ([USGS example](https://pubs.usgs.gov/publication/ofr20261005/full)).

## 10. Measurement quality status

Allowed experimental states:

- `VALID_BASELINE_CANDIDATE`
- `INVALID_CALIBRATION`
- `INVALID_UNSTABLE`
- `INVALID_SENSOR_ERROR`
- `INVALID_SOURCE_IDENTITY`
- `VALID_CONTEXT_NOT_COMPARABLE` (for a valid reading taken under materially different source/season/method conditions)

No state means safe, unsafe or contaminated.

## 11. Historical context

Only compare records with the same source and sampling point, compatible method/device treatment, valid QA and relevant seasonal/operational context. Display raw visits and context before any aggregate. Do not mix simulated, public or laboratory data into sensor baseline calculations.

## 12. Descriptive outcome

Until a rule is validated:

- “Measurement saved; baseline still being established.”
- “Measurements agree within the experimental quality rule.”
- “Measurements did not agree; no comparison was made.”
- “This visit differs from earlier measurements; cause is unknown and verification is required.”

## 13. Escalation

A difference first triggers measurement verification and context review. Any sanitary-inspection or approved FTK concern follows its official procedure regardless of EC. Only the authorized supervisor decides whether to collect a confirmation sample, and the receiving laboratory selects appropriate analyses. Package source, sampling point, visit, raw/compensated readings, QA, sanitary context and official sample ID.

## 14. Post-check and quarantine

Perform the required post-use/end-day standard check. If it fails, quarantine affected visits since the last passing check for supervisor review; do not silently correct or retain a reassuring status. Record cleaning, maintenance and disposition.

