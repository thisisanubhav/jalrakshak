# Unified field experience — implementation report

Branch: `feat/unified-field-experience`. Local work only; GitHub publication is authorized but blocked by unavailable Git credentials and an integration write-permission error. Not pushed, merged remotely, or deployed. This report describes implemented code, not verified release acceptance. See [QA report](qa-report.md) for execution evidence and blockers.

## Review summary

The field workspace now provides one six-tab journey: Water Sources, Record Measurement, Measurement History, Investigations, Reports, and Training & Demo. It retains the existing atmospheric shell and field persistence model. Legacy functionality is reused through adapters and embedded training, rather than converting screening results into field measurements.

This branch started from `main` at `aeb2c63084797160a603f50bb8d7c32470dc2432`. It locally incorporates the existing PR #11 release-QA branch as a prerequisite, including three retest lifecycle corrections and its regression tests. If PR #11 remains unmerged, those changes also appear in this branch's diff against main. Reviewers should distinguish that prerequisite from the unification commits; no remote merge was performed.

## Features and reuse

| Area | Implementation | Verification boundary |
| --- | --- | --- |
| Water Sources | List/Map toggle; coordinate validation including zero; latest individually eligible visit; investigation/retest state; source-history shortcut; textual list when offline or WebGL/tiles fail | Summary selectors tested; browser marker/fallback journeys pending |
| Mapping | Extracted `SourceMap` from legacy MapPanel; field and legacy adapters keep their identity/status semantics; popup text uses textContent | No field-to-legacy ID casting or unsafe popup HTML |
| Investigations | Compact six-metric overview; clickable open/retest/follow-up/closed filters across sources; source/eligible-source shortcuts | Unit tests assert scope, source linkage and lifecycle changes |
| Manual EC | Existing repeatability engine retained; third reading appears when first pair disagrees (or draft third reading exists); explicit calibration metadata disclaimer | No new tolerance implementation; UI journey pending |
| History | Chronological SVG observations with EC units, numbered visits, excluded/missing crosses, accessible text; combined reverse-chronological measurement and investigation-event timeline | No trend line implies incompatible visits are comparable; saved comparisons remain authoritative |
| Reports | Existing source/workspace-scoped CSV and browser Print / Save as PDF retained; readable numeric precision in displayed facts | Existing export unit tests pass; new print output awaits browser inspection |
| Training | Embeds existing screening registration/simulator/results/map/history without its separate app shell; separate database/draft; disables its simulated sync effects | New browser flow tests persistence and isolation, but execution pending |
| Judge demonstrations | Four deterministic field scenarios use the field UI; explicit synthetic mode and transactional reset; earlier interactive EC judge component available in Training | Demo generation, scope isolation and rollback tested |
| Branding/localization | Existing FieldChrome, design classes and English/Hindi field labels reused; added translated labels/explanations; neutral shared header identity | Six-width EN/HI browser matrix pending |

The field chart reuses the legacy chart's presentation ideas (units, excluded observations, missing-value symbols and text evidence), not its legacy domain calculation. The original legacy chart remains intact. Overview cards reuse the visual pattern, not simulated dashboard counts. This avoids making unrelated legacy comparison schemas authoritative for new field records.

## Persistence and compatibility

No schema version, existing table, source identifier, measurement snapshot or comparison algorithm changed in this integration. Main database remains `jalrakshak`, Dexie version 6. The new embedded screening simulator uses `jalrakshak-screening-training` with the same additive database class; its localStorage draft key is `jalrakshak-training-flow-v1`. Historic legacy data/drafts remain in their existing locations. Earlier interactive judge scenarios remain in the synthetic `judgeDemoScenarios` table.

Manual and synthetic field rows retain their MANUAL_FIELD/SYNTHETIC_DEMO scopes. Overview and map selectors filter scope and source linkage themselves. Field reset transaction deletes only synthetic rows in the three field tables. Tests cover idempotence, preservation of manual records, rollback after a failed transaction, and reset independence from screening storage.

No legacy import is offered. Legacy EC device records, original screening dashboard, original EC history and existing records remain readable at `/?legacy=1`. No route retirement is proposed. An explicit reviewed import with provenance preservation and duplicate protection is future work.

Service-worker cache changes from v4 to v5 and includes the local MapLibre worker. Application code stays in initial imports for offline availability after installation. External map tiles are not precached; the UI says so. Browser verification of this revision is still required.

## Fixes and limitations

- Failed readings with no representative value previously disappeared from the trend. They now remain visible as excluded/missing observations.
- Shared header no longer labels synthetic workspaces as manual records.
- Report fact formatting removes excessive floating-point digits without modifying stored measurements or CSV values.
- Map construction failure now reaches the existing fallback instead of escaping the component effect.
- Embedded screening cannot overwrite historic legacy drafts, sources or field evidence.
- Calibration omissions continue to exclude trusted comparisons without declaring otherwise valid readings invalid.

Awaiting follow-up means NEEDS_REVIEW, RETEST_COMPLETED or LAB_REFERRED; RETEST_REQUESTED is a separate count. Closed means RESOLVED or CLOSED_UNCONFIRMED. Counts concern investigations, except explicitly source-labelled metrics. Multiple investigations on one source have deterministic marker priority: requested retest, review, completed retest, lab referral, resolved, closed unconfirmed. These are workflow states, never safety classifications.

No production backend, paid API, connected hardware, AI integration, cloud sync or authority notification was added. No physical water test can be produced by software alone. Existing browser-storage eviction/loss risk remains; CSV is not a full restorable backup. Recovery UI, comprehensive screen-reader audit, field validation and official-system integration remain future work.

## Intended benefit and evidence

The proposed rural Jharkhand use is retaining measurements, uncertainty and follow-up decisions together despite intermittent connectivity. Intended users include community field workers and supervisors using legitimate existing measurements. This is a design hypothesis, not an observed adoption or impact claim.

The [DDWS WQMIS portal](https://ejalshakti.gov.in/WQMIS/) provides roles for public users, FTK users, departmental sample collectors and laboratories (rechecked during this work). JalRakshak is independent and sends it no records. Prior [submission context](../submission/software-field-submission.md) cites Jhar-Jal; its Play listing could not be retrieved again in this round, so no new competitive feature claim is made. [USGS specific-conductance guidance](https://www.usgs.gov/publications/chapter-a63-specific-conductance) covers measurement, calibration, maintenance and reporting; it does not validate this prototype's repeatability/anomaly thresholds.

Future evaluation should measure task completion, duplicate-entry frequency, missing evidence, retest linkage and time to documented outcome in consented usability sessions. No numerical target or achieved benefit is claimed.

## Suggested PR description

**Title:** Unify field maps, investigation monitoring and isolated training

Adds source maps, scoped investigation metrics, complete source timelines and a Training & Demo section to the existing software-only field workspace. Reuses MapLibre and legacy screening components while preserving legacy access and keeping manual, field-demo and screening-training persistence separate. No legacy data migration or schema upgrade is required.

Validation: 114 unit tests pass; lint, TypeScript, webpack production build and dependency audit pass (zero advisories returned). Linux CI now uses the sandbox-enabled release config with HTML/JSON and failure artifacts. The 31-test browser suite is discovered but execution is blocked before publication; export visual inspection remains pending. Local macOS testing is optional, never the required gate. **Keep the PR draft until those checks pass.** The diff includes the locally merged PR #11 prerequisite if it has not yet landed on main.

## Change navigation

- `src/field/overview.ts`, `unification.test.ts`: isolated metrics, eligibility and reset regression tests.
- `src/components/SourceMap.tsx`, `MapPanel.tsx`, `field/FieldMap.tsx`: shared map and adapters.
- `src/components/field/FieldApp.tsx`, `FieldOverview.tsx`, `FieldTraining.tsx`: unified journey.
- `src/components/JalRakshakApp.tsx`: isolated embedded simulator.
- `src/components/field/FieldViews.tsx`, `FieldForms.tsx`, `FieldChrome.tsx`: history/report/form/branding refinements.
- `src/field/demo.ts`, `i18n.ts`, `src/app/globals.css`, `public/sw-v2.js`: reset, translations, responsive styles, cache.
- `tests/e2e/unification.spec.ts`: six new browser journeys.

Each changed file is committed independently. Use `git log --oneline main..feat/unified-field-experience` for the full prerequisite and implementation history.

## Permanent CI verification update — 24 October 2026

The `verify` Actions job retains lint, TypeScript, unit tests and production build, installs Chromium/Linux dependencies and runs all release tests with zero retries and sandboxing enabled. Every PR to main triggers verification; branch pushes allow pre-PR validation. Reports and failure screenshots/videos/traces are uploaded for inspection. A tested result guard rejects skipped, incomplete, retried and failed runs and records exact counts in the Actions summary.

No CI run URL or browser pass result exists for this revision because both available publishing paths failed authentication/permission checks. See the [QA report](qa-report.md) for exact errors and the authorized correction loop. Restoring agent-visible repository/workflow write access is the remaining infrastructure prerequisite; the user is not required to run Playwright locally.
