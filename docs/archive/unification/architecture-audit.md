> **Historical archive:** This document describes an earlier revision. Its workflow, deployment notes and test counts are not current. See the [current README](../../../README.md) and [field guide](../../field/daily-work.md).

# Architecture audit before unification

23 October 2026. Branch created from `origin/main` at `aeb2c63`. Baseline: 96 unit/integration tests pass. Main includes PR #10; PR #11 (`fe753cd`) remains a local/remote follow-up with validated chronology fixes and 99 unit / 25 browser tests. Incorporate that tested prerequisite locally before integration; this does not merge a remote PR.

## Architecture and evidence

Next.js App Router / React / TypeScript, Dexie IndexedDB, MapLibre, CSS atmospheric shell, Vitest and Playwright. `src/app/page.tsx` renders `FieldApp`; URL `?legacy=1` switches to `JalRakshakApp`. No backend/hardware is used by the primary flow. Providers contain simulated/manual implementations; hardware placeholders are not evidence of functioning sensor integration.

`FieldApp` holds locale, scope, tab, selected source and loaded snapshots; localStorage stores preferences and form drafts. `src/field/model.ts` owns validation/comparison/lifecycle rules, `store.ts` owns transactional writes, `demo.ts` builds four deterministic fixtures, `report.ts` scopes and escapes CSV. Forms reuse `evaluateECRepeatability` from `src/ec/measurement-quality.ts`. `FieldViews` presents evidence and print reports. `FieldChrome` and `globals.css` share the deployed atmospheric design. There is no field map or cross-source monitoring overview. The field trend omits failed readings without representative values and lacks adequate eligibility context.

`JalRakshakApp` owns legacy registration, simulation, results/referrals, map, history and dashboard state. `ExperimentalECMode` owns earlier device/calibration/manual EC workflows, chart, CSV and history. `InteractiveJudgeDemo` uses isolated legacy scenario snapshots and print reports. Legacy MapPanel directly consumes `WaterSource` and screening results, so it cannot safely receive new field records by type casting. Its DOM popup uses textContent; preserve that injection protection. Map tiles come from OpenStreetMap and are network-only. Legacy dashboard's counts concern simulated screening states; reuse layout patterns, not those calculations.

Existing `?legacy=1` workflows have browser evidence from prior Linux CI. PR #11 has 25 passing browser tests from both normal-terminal macOS and Linux CI, including manual/offline workflows and native migration. That evidence predates unification and cannot certify new integrations. Agent-launched Chromium is restricted on this Mac; the normal-terminal sandbox-enabled release runner is a verified safe execution path.

## Persistence differences and isolation

One `jalrakshak` Dexie database, additive versions 1–6:

| Tables | Records/provenance | Compatibility decision |
| --- | --- | --- |
| sources, tests, referrals | Legacy `sourceCode`, required coordinates, screening provenance and simulated sync bookkeeping; sources may belong to screening or experimental EC | Keep readable through legacy route; do not map IDs into field tables |
| ecDevices, ecMeasurements | Device/calibration records, visit IDs, MANUAL_EXPERIMENT/SIMULATED origins and legacy comparison schemas | No automatic import; incompatible calibration/analysis snapshots need explicit future review |
| judgeDemoScenarios | Legacy deterministic isolated scenario snapshots | Keep through training access and legacy route |
| fieldSources, fieldMeasurements, fieldInvestigations | `code`, optional coordinates, MANUAL_FIELD/SYNTHETIC_DEMO scope, saved comparisons and append-only lifecycle events | Source of truth for unified field workflow; no schema change needed |

Use a separate named Dexie database for embedded legacy screening training if its controller is reused. That prevents training resets and source browsing from touching historic legacy records or field evidence. Share components/domain code, not persistence identity. Field demo reset must transactionally delete only SYNTHETIC_DEMO field rows; manual rows and legacy tables remain untouched. Scope filtering is mandatory before metrics, maps, timelines or exports. Never relabel a simulated row as measured evidence.

No legacy migration is required for integration. Keep old IDs, chronology, and provenance untouched. No retirement of `?legacy=1` is proposed. A future import needs explicit preview, stable import identity, validation and rollback; absent that, legacy remains the recovery/read interface.

## Feature migration matrix

| Feature | Decision | Planned treatment |
| --- | --- | --- |
| Field source/edit/measurement/investigation/report workflow | Retain unchanged where possible | Primary foundation; six task tabs including Training & Demo |
| EC repeatability engine and field comparison snapshots | Retain unchanged | Single documented max(20 µS/cm, 5% of pair mean) rule; closest agreeing pair of three |
| MapLibre map lifecycle/worker/markers | Refactor into shared components | Generic presentation markers; separate legacy and field adapters, accessible text fallback |
| Source map | Reuse in main app | List/Map within Sources, valid coordinates only, investigation states not safety colours |
| Dashboard cards | Reuse layout pattern in main app | Derive scope-filtered field metrics; clickable source/investigation filters |
| EC chart | Refactor useful chart concepts | Chronological axis, units, broken paths around exclusions, missing-value symbols and accessible text evidence |
| Calibration metadata/tools | Reuse in main app | Existing field snapshot fields; explicit self-recorded calibration disclaimer and conditional third reading |
| Historical evidence/report utilities | Retain/refine | One field report, timeline linked events, safe CSV, browser Print / Save as PDF |
| Legacy pH/TDS/turbidity/temperature simulator | Keep in Training & Demo | Reuse controller/screens with shared outer chrome and isolated persistence, conspicuous synthetic label |
| Four field judge scenarios | Keep in Training & Demo | Guided three-minute steps, shared field UI, synthetic workspace and scoped reset |
| Earlier interactive EC judge demo | Keep in Training & Demo | Reuse existing component; separate scenario store remains isolated |
| Legacy EC device registry/history | Deprecate only after successful migration | Remains legacy-only; no duplicate field entry route |
| Legacy simulated sync | Keep legacy-only | Embedded training must not claim actual cloud sync |
| Legacy route | Retain unchanged default behaviour | Regression suite remains, no automatic data conversion |

## Risks and checks

- Preserve localStorage namespaces and restore logic; training must not overwrite the legacy draft or outer locale.
- Async scope reloads must not briefly show previous-workspace counts. Scope is validated in selectors even if the caller holds mixed data.
- Latest eligible measurement is not simply the newest reading: quality, calibration, temperature and source scope matter. Missing history is explicit.
- Multiple investigations on one source require deterministic marker priority (retest requested first, then open review/follow-up, then closed).
- Timeline events must reference only investigations/measurements of the selected source and scope. Excluded readings must not become connected eligible trend points.
- Reset only affects demo rows, with confirmation and safe failure handling; no manual deletion UI is needed.
- Service worker precaches root initial assets but not external tiles. Keep offline list/timeline/report fallback and avoid lazy-only code needed after offline refresh.
- Existing print CSS and map canvas controls need mobile/keyboard verification. Text labels, distinct shapes and evidence lists supplement marker colours.
- Existing English/Hindi labels and visual tokens are reused. New metric definitions and demo boundaries need translations; no fabricated impact statistics.

Run unit regressions, lint/typecheck/build, 25 retained browser tests plus dedicated unification journeys, widths 320/360/390/430/768/1440 in both languages, offline refresh/reconnection, map fallback, real/demo reset isolation, CSV and print checks. Browser checks not executed on this revision must remain explicitly pending.
