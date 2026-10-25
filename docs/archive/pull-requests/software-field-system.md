> **Historical archive:** This document describes an earlier revision. Its workflow, deployment notes and test counts are not current. See the [current README](../../../README.md) and [field guide](../../field/daily-work.md).

# Add software-only field workflow while retaining existing JalRakshak features

## Problem and resulting behavior

The existing default experience starts with simulated water screening and has no durable field investigation lifecycle. This change makes manual water-source records, measurement quality, historical comparison and follow-up the primary workflow, while preserving the existing Screening Demo, Experimental EC, map/dashboard and interactive judge demo under a secondary entry.

The field workspace reuses the deployed application's atmospheric gradient, cloud background, droplet branding, large hero, rounded cards and pill controls. Its task navigation prioritizes sources, measurements, history, investigations and reports. No hardware connection, paid service or production backend is required.

## Main changes

- Editable sources with village/district, optional GPS/photo and operator reference.
- Manual timestamped EC observations, repeatability checks, optional third reading and explicit comparison exclusions.
- Configurable provisional historical-change thresholds, saved analysis snapshots and previous-reading deltas.
- Investigations with append-only timestamped evidence, linked retests and validated referral/closure outcomes.
- English/Hindi source-scoped CSV and browser-print reports; four isolated synthetic scenarios including a complete follow-up.
- Additive Dexie v6 tables preserve legacy records. Atomic saves, duplicate protection, draft recovery and corrupted-data validation protect local evidence.
- Initial JS/CSS precaching, legacy reset/history/storage/CSV fixes, and compatible dependency security patches.
- Audit, sourced submission narrative, seven-slide outline, three-minute walkthrough and honest readiness documentation.

## Validation

- 96 unit/integration tests pass (baseline: 61).
- ESLint and TypeScript checks pass.
- Production build passes with `npm run build -- --webpack`; sandbox port restrictions block local Turbopack subprocesses.
- Dependency audit reports zero vulnerabilities after patching.
- Production localhost returns HTTP 200 and security headers.
- 23 Playwright tests are discovered: 16 retained regressions and 7 new field scenarios.
- Browser execution is locally blocked before assertions by macOS Chromium process registration. GitHub Actions runs the full browser suite on Linux; require it to pass before merging. Mobile/visual/PDF acceptance is not claimed from static checks.

## Boundaries and review notes

EC is not a contaminant detector or a drinking-water safety certificate. Thresholds and calibration metadata are provisional/self-recorded. Synthetic and manual field records remain separate. No authority is notified and no laboratory result is fabricated.

There is no remote backup, authentication, government integration or validated field impact. CSV is not a restorable backup; source edit history and richer recovery tooling remain future work. Existing production deployment is not changed by local work. Merging may trigger the repository's configured deployment automation.

Review the field state machine and persistence transactions first, then the UI/report consumers. New source and event tests cover migration, corruption, failed writes, missing inputs, chronology, duplicate saves, evidence requirements and export scoping. Earlier demo functionality remains available at `/?legacy=1`.

## Demo

Open the app, select **Software-only judge demo**, then **Load four synthetic scenarios**. Inspect DEMO-01 through DEMO-04. Select DEMO-04 in Reports to export the complete evidence chain. Preload the app online before offline demonstration; complete browser QA before presenting offline support as verified on a device.
