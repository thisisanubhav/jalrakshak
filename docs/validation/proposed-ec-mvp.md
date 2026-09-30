# Proposed minimum EC product — only if validation supports GO

This is a design boundary, not an implementation plan or GO decision.

```text
REGISTER OR MATCH OFFICIAL SOURCE
  ↓
SELECT ASSIGNED DEVICE / PROBE
  ↓
VERIFY IN-DATE CALIBRATION / CHECK
  ├─ fail → OUT OF SERVICE; no measurement result
  └─ pass
       ↓
RECORD SANITARY + RAINFALL / SOURCE CONTEXT
  ↓
FOLLOW SOURCE-SPECIFIC FLUSH / SAMPLE PROCEDURE
  ↓
MEASURE RAW EC + TEMPERATURE
  ↓
WAIT FOR STABILITY
  ↓
RINSE / REPEAT INDEPENDENT MEASUREMENT
  ↓
CHECK AGREEMENT
  ├─ disagree → optional third reading → unresolved = INVALID
  └─ agree
       ↓
SAVE OFFLINE WITH DEVICE + CALIBRATION LINEAGE
  ↓
COMPARE ONLY WITH VALID, CONTEXT-COMPATIBLE SOURCE HISTORY
  ↓
BASELINE BUILDING / NO UNUSUAL CHANGE OBSERVED / CHANGE NEEDS VERIFICATION
  ↓
AUTHORIZED SUPERVISOR FOLLOWS EXISTING OFFICIAL PROCEDURE
```

## Essential screens only

1. Source match/register with official-ID check.
2. Device and calibration/check gate.
3. Context and sanitary-inspection link.
4. Guided Reading 1 / stability / Reading 2 / agreement.
5. Measurement-quality result and offline save.
6. Same-source visit history with season/method/provenance.
7. Supervisor review and export/confirmation packet.

## Explicit non-features

- no safe/unsafe/potable/contaminated result;
- no contaminant identification;
- no generic percentage alarm;
- no pH/turbidity simulation in field mode;
- no public anomaly map;
- no independent laboratory referral authority;
- no device recommendation or hardware implementation in this round.

## Value proposition to validate

The minimum product earns its place only if it reduces measurement ambiguity or record loss and supports a decision without creating parallel entry. If users need the capability inside Jhar-Jal/WQMIS, the correct product may be an integration/specification rather than a standalone application.

