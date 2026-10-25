> **Historical archive:** This document describes an earlier revision. Its workflow, deployment notes and test counts are not current. See the [current README](../../../README.md) and [field guide](../../field/daily-work.md).

# Judge demo script (2–3 minutes)

## 0:00–0:20 — Position the product

Open <https://jalrakshak-jharkhand.vercel.app> and select **Explore Interactive Demo**.

Say: “JalRakshak is an offline measurement-quality and longitudinal conductivity companion. It does not determine whether water is safe.” Point out the synthetic-data notice.

## 0:20–0:55 — Repeatability before interpretation

Open **Stable Measurements**. Show the five repeatable visits, source history, and the descriptive “No unusual EC change observed” result. Explain that repeatable means internally consistent—not accurate or safe.

Return to scenarios and open **Measurement Disagreement**. Show 610 and 830 µS/cm, the request for a third reading, and the withheld source-level conclusion.

## 0:55–1:25 — History before conclusions

Open **Insufficient History**. Point out that one valid visit produces **Baseline not established**, never a normal or safety classification.

Open **EC Change Observed**. Show the historical median, absolute difference, percentage difference, and explicit provisional-rule disclosure. State that EC cannot identify the cause.

## 1:25–2:05 — Evidence, provenance, and offline behavior

Open **Generate investigation report**. Show source/device linkage, raw readings, calibration metadata state, `SYNTHETIC_DEMO` provenance, and the scientific limitation. Use **Print / Save as PDF** or export the scenario CSV.

Briefly disconnect the network or point out the local-storage indicator. The loaded scenario, history, report, and export remain usable after refresh because the snapshot is stored in a dedicated IndexedDB table.

## 2:05–2:30 — Existing product modes

Return home. Explain that **Screening Demo** is the original four-parameter simulated demonstration, while **Experimental EC** is the manual research workflow. They use separate records and semantics.

Close with: “The software is complete enough to test the workflow; direct stakeholder validation remains the gate before operational field use.”
