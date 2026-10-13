# JalRakshak — final submission presentation

Use this as the content source for a 6–7 slide Hack for Social Cause deck. Screenshots should come from the verified public deployment. Do not describe synthetic examples as field observations.

## Slide 1 — The problem

**Rural field measurements need trustworthy context, not another unsupported safety label.**

- A conductivity value is difficult to interpret when the source identity, repeated readings, device/probe, calibration metadata, sampling method, and prior visits are separated.
- Weak connectivity can force delayed or duplicate entry and make history hard to use at the source.
- EC cannot identify a contaminant or determine whether water is safe; any workflow must preserve that limitation.

Evidence boundary: Jal Jeevan Mission already defines community surveillance, FTK use, sanitary inspection, confirmation testing, and remedial action. JalRakshak explores a narrower measurement-quality and source-history gap. See the [JJM WQMS Framework](https://jaljeevanmission.gov.in/sites/default/files/guideline/WQMS-Framework.pdf) and the project’s [evidence review](../research/existing-water-quality-system.md).

Suggested visual: public **Home** or **Measurement capture** screenshot.

## Slide 2 — Existing system and the gap being tested

**Existing system**

- Community workers, Jal Sahiyas, sample collectors, VWSCs, laboratories, DWSD/PHED actors, Jhar-Jal, and WQMIS already have defined roles.
- FTK observations that require confirmation belong in the approved sample/laboratory pathway.
- Jhar-Jal and WQMIS already cover source/location records, field testing, reporting, and official follow-up functions.

**Narrow experimental gap**

- Capture duplicate instrument readings and context offline.
- Keep same-source history accessible at the point of measurement.
- Compare only compatible visits and package evidence for further investigation.

This differentiation is a hypothesis, not an institutional finding. Direct stakeholder validation remains pending. JalRakshak does not replace Jhar-Jal or WQMIS.

Suggested visual: the current-to-proposed workflow from [project summary](project-summary.md).

## Slide 3 — The software solution

```text
Source identity
      ↓
Repeated EC measurement
      ↓
Repeatability check
      ↓
Offline IndexedDB record
      ↓
Context-compatible source history
      ↓
Experimental change comparison
      ↓
CSV / investigation record
```

- Works without an account, backend, physical sensor, or continuous connectivity.
- Separates `SIMULATED`, `MANUAL_EXPERIMENT`, `SYNTHETIC_DEMO`, `REAL_SENSOR`, and `LAB_CONFIRMED` semantics.
- Fails closed for invalid, disagreeing, or insufficient measurements.
- Makes no water-safety or contaminant-detection conclusion.

Suggested visual: **Interactive Demo** scenario selection.

## Slide 4 — Live product

Demonstrate the four deterministic synthetic scenarios:

1. **Stable Measurements** — repeated readings agree and compatible source history is available.
2. **Measurement Disagreement** — 610 and 830 µS/cm require another reading; no source-level conclusion is produced.
3. **Insufficient History** — one visit produces “Baseline not established.”
4. **EC Change Observed** — the current record is compared transparently with the historical median under provisional rules.

Then show:

- comparable versus excluded history points;
- explicit `SYNTHETIC_DEMO` provenance;
- offline persistence;
- CSV and print/save-as-PDF investigation evidence.

Suggested visuals: **Measurement Disagreement**, **EC History**, and **Investigation Report**.

## Slide 5 — Technical architecture

- **Next.js 16 + React 19 + TypeScript** — responsive bilingual PWA.
- **Dexie / IndexedDB** — local-first stores for Screening Demo, Experimental EC, and isolated judge scenarios.
- **Service worker** — versioned application-shell caching and offline navigation.
- **Domain modules** — provider abstraction, validity, repeatability, cohort eligibility, history comparison, provenance, report, and export logic.
- **MapLibre** — source-map experience with a graceful network/tile fallback.
- **Browser-native exports** — hardened CSV and print-ready report without uploading local records.

```text
PWA UI → Domain validation → Measurement provider
      → IndexedDB → History/comparison → CSV/report
```

No production database, authentication service, government API, or physical sensor is required for the software-only prototype.

## Slide 6 — Impact and validation

**Demonstrated technical outcomes**

- Public HTTPS PWA with no authentication or hardware dependency.
- Offline capture, refresh recovery, history, and export.
- Deterministic and isolated scientific-behavior demonstrations.
- English/Hindi journeys and responsive mobile/desktop layouts.
- 61 unit tests and 16 browser tests at the Round 8 release; Round 9 verification is recorded in [final readiness](final-readiness.md).

**Expected benefits to validate, not achieved-impact claims**

- Fewer unusable readings because disagreement is caught at capture time.
- Better traceability of device, calibration, sampling, and provenance context.
- Faster retrieval of same-source history during investigation.
- Less loss or duplicate re-entry during connectivity interruptions.

Proposed metrics: proportion of visits with complete metadata; repeated-reading disagreement rate; time to retrieve prior visits; offline-save recovery; duplicate-entry rate; and whether history changes an approved next action.

Direct stakeholder and institutional validation: **PENDING**.

## Slide 7 — Roadmap, limits, and responsible AI use

**Current**

- Software-only experimental prototype.
- Synthetic judge scenarios and manual experimental entry.
- Local browser storage; no official submission or cloud backup.

**Next gates**

1. Interview field workers, coordinators, and laboratory professionals using the precommitted validation criteria.
2. Run a permissioned, small measurement-protocol study only if the workflow survives validation.
3. Evaluate interoperability and optional sensor integration only after the operational need is established.

**Limitations**

- No contaminant detection or drinking-water safety certification.
- No physical EC sensor or verified calibration.
- No official government integration or institutional endorsement.
- No direct stakeholder validation yet.

**AI-use disclosure**

AI coding assistance supported implementation, test drafting, documentation, and research organization. The project owner set product scope and release decisions; generated work was reviewed through source diff inspection, automated tests, browser QA, and citations to authoritative sources. No percentage is claimed without the competition form’s definition and owner confirmation. See [AI-use disclosure](ai-use-disclosure.md).
