> **Historical archive:** This document describes an earlier revision. Its workflow, deployment notes and test counts are not current. See the [current README](../../../README.md) and [field guide](../../field/daily-work.md).

# JalRakshak — final submission readiness

Status date: 13 October 2026 (Asia/Kolkata)

## Project identity

| Item | Status | Evidence |
|---|---|---|
| Project title | VERIFIED | JalRakshak |
| One-sentence description | VERIFIED | An offline-first measurement-quality and longitudinal conductivity monitoring companion. |
| Public application | VERIFIED | <https://jalrakshak-jharkhand.vercel.app> |
| Public source repository | VERIFIED | <https://github.com/thisisanubhav/jalrakshak> |
| Competition | REPORTED | Hack for Social Cause — MY Bharat |
| Target submission date | REPORTED | 27 October 2026 |

## Problem and target users

**VERIFIED PRODUCT POSITIONING:** JalRakshak records repeated experimental EC observations with source, device, calibration metadata, temperature, provenance, and history so measurement quality and source-level change can be inspected offline.

**INTENDED USER:** a trained field worker or researcher. Communities using a source are intended beneficiaries; accredited laboratories and official authorities retain confirmation and corrective-action responsibility.

**PENDING VALIDATION:** direct interviews with Jharkhand field workers, coordinators, and laboratory professionals have not occurred. Product desirability, maintenance ownership, and integration value are not proven.

## Software architecture

```text
Next.js / React bilingual PWA
          ↓
Validity + repeatability + comparison domain modules
          ↓
Provider contracts (simulated or manual only)
          ↓
Separate Dexie / IndexedDB stores
          ↓
Source history + accessible EC chart
          ↓
CSV + print/save-as-PDF investigation evidence
```

- **IMPLEMENTED:** responsive public UI, Screening Demo, manual Experimental EC, isolated Interactive Demo, IndexedDB persistence, versioned service worker, offline shell, history, CSV, print-ready report, English/Hindi, MapLibre fallback, and browser regression tests.
- **EXPERIMENTAL:** repeatability and historical-change rules, manual EC workflow, and all judge scenario values.
- **NOT IMPLEMENTED:** physical sensing, contaminant detection, safety certification, production cloud synchronization, authentication, official referral submission, or government integration.

## Release verification

| Check | Status | Result |
|---|---|---|
| PR #7 review | VERIFIED | No blocker/high release findings; merged as `e04a0bc5c0289d0f713a591c38201fc6cccd74a4`. |
| Production deployment | VERIFIED | Vercel deployment `dpl_5LWD2QaTQGk9pghmn6gghz92zvNY`, public alias returns the judge-demo build over HTTPS. |
| Production source | VERIFIED | Deployed from a clean checkout identical to merge commit `e04a0bc5c0289d0f713a591c38201fc6cccd74a4`. The direct CLI deployment metadata does not embed a Git SHA. |
| Unit tests | VERIFIED | 61/61 passing in 12 files at the Round 9 release gate. |
| Browser tests | VERIFIED | 16/16 passing against the public URL in isolated Chromium contexts. |
| Lint / typecheck / build | VERIFIED | Passing at the Round 9 release gate. |
| Dependency audit | VERIFIED | `npm audit --audit-level=high`: 0 vulnerabilities. |
| Public scenarios | VERIFIED | Stable, disagreement, insufficient-history, and EC-change flows pass. |
| Report | VERIFIED | Print-ready content assertions pass; Chromium generated a 223,713-byte A4 PDF buffer. |
| Offline | VERIFIED | Scenario/history/CSV survive offline refresh in deployed-URL Playwright testing. |
| Hindi | VERIFIED | Judge-demo and primary EC journeys pass browser tests. |
| Physical Android device | NOT VERIFIED | No physical Android device was available in this environment. |

## Production security and privacy

**VERIFIED:** HTTPS, CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, frame restrictions, and HSTS are present. The service worker is same-origin. The browser suite verifies the manifest, 192/512 icons, service-worker activation, and geolocation/storage failure handling.

**VERIFIED:** no production backend or account system receives local records. Synthetic demo data is fictional and marked `SYNTHETIC_DEMO`. Users are warned that clearing browser storage may delete local records and that coordinates/photos can be sensitive.

## Scientific limitations

- EC does not identify arsenic, fluoride, iron, lead, nitrate, pathogens, pesticides, or any other specific contaminant.
- EC does not establish drinking-water safety.
- “Repeatable” means the readings agree under a provisional software rule; it does not prove instrument accuracy.
- Calibration metadata records what the user entered; JalRakshak does not perform or verify calibration.
- A descriptive EC change is not proof of contamination or persistence.
- The software does not replace Jhar-Jal, WQMIS, approved FTKs, or accredited laboratories.

## Submission assets

- [Final presentation content](final-presentation.md)
- [Three-minute demonstration script](final-demo-script.md)
- [AI-assistance disclosure](../../submission/ai-use-disclosure.md)
- [Software-only architecture](architecture.md)
- [Feature matrix](feature-matrix.md)
- [Impact framework](impact-framework.md)
- [Limitations](limitations.md)
- [Final production screenshots](screenshots/)

## Remaining submission requirements

| Requirement | Status | Owner action |
|---|---|---|
| Competition form submission | PENDING | Enter team/identity/declaration details and submit manually. |
| AI-use percentage, only if requested | PENDING | Confirm the organizer’s definition and provide an owner-approved estimate. |
| Repository license | PENDING | GitHub currently reports no license; select one only after the owner makes the legal/licensing decision. |
| Physical Android check | PENDING / NON-BLOCKING | Run the documented PWA install/offline smoke test on a representative Android device if available. |
| Direct stakeholder validation | PENDING / DISCLOSED | Required before field or institutional use, not for demonstrating the software-only prototype. |

## Release conclusion

The public software-only prototype and its evidence package are technically ready for judge review. Administrative submission, team/identity declarations, any organizer-defined AI percentage, and the repository-license decision remain owner actions. No field-deployment readiness or social-impact outcome is claimed.
