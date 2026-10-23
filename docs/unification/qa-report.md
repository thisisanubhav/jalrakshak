# Unified experience — QA evidence and release gate

Working branch: `feat/unified-field-experience`. Review date: 23 October 2026. Local verification only. No push, merge to remote main or deployment was performed.

**Status: implementation ready for browser review; final acceptance is NOT established.** The pending browser run must not be represented as passing. The successful browser evidence in `software-field-readiness.md` describes the previous implementation, not this revision.

## Executed checks

| Check | Result |
| --- | --- |
| Main baseline before implementation | 96 tests / 14 files passed |
| Release-QA prerequisite retained | 99 tests / 14 files passed after integration code changes |
| Expanded unit/persistence suite: `npm test` | 108 tests / 15 files passed |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm run build -- --webpack` | Passed; root and not-found routes statically prerendered |
| `npm audit --audit-level=low` | Zero vulnerabilities reported; initial sandbox DNS failure, successful network-enabled retry |
| Playwright `--list` | 31 cases discovered in five files. Listing is NOT execution; its JSON reports cases skipped |
| Current-branch real browser execution | Pending normal-terminal run |
| Current-branch PDF/CSV/screenshots visual inspection | Pending generated browser artifacts |

The added nine unit cases verify mixed-scope/source linkage filtering, lifecycle count/marker updates, latest eligible rather than latest raw observation, missing calibration exclusion, zero/missing/non-finite coordinates, idempotent demo reset, rollback on failure, training/legacy reset independence, and closed-state semantics.

The retained suite also covers repeatability, earlier-only comparisons, source/provenance eligibility, timestamp/calibration validation, lifecycle transitions and current-request linked evidence, schema migration, corrupt records, write conflicts, formula-safe CSV and simulated offline cache behavior. A Node service-worker harness is useful coverage, but is not a substitute for real offline browser execution.

## Browser release procedure

Run from the normal signed-in terminal in this workspace:

```sh
npx playwright test --config=playwright.release.config.ts
```

The production build is prepared locally. The runner starts a fresh loopback server on port 3217, uses Chromium sandboxing, one worker and zero retries, and preserves failure artifacts. Do not run two copies simultaneously. If application code changes, rebuild with `npm run build -- --webpack` first.

This Mac's agent process previously failed Chromium launch with macOS service/Mach-port permission errors. The same sandbox-enabled release runner worked from the normal user terminal for the previous release. No SIP/Gatekeeper/quarantine change, no browser `--no-sandbox` and no lowered assertion is authorized as a workaround. No new launch success is claimed here. The user has been asked to run the prepared suite.

Results: `test-results/release-results.json`; per-test artifacts: `test-results/release/`. Inspect actual statuses, not just process completion or case discovery. Browser tests must execute at the new application revision; old 25-test artifacts cannot certify this branch.

## Coverage to verify in that run

| Journey | Browser coverage |
| --- | --- |
| Register/edit → record → history → export | Existing field suite; full manual offline workflow and report scope |
| Anomaly → investigation → retest → outcome | Existing field/release suites; retained lifecycle unit regressions |
| Source map → history | New field map fallback and deterministic MapLibre tile-fixture tests, including keyboard popup opening |
| Metrics/filter integrity | New scope/count/filter/reset test; unit transition checks |
| Training isolation | New embedded screening save/refresh test, manual metric checks and legacy isolation; field-demo reset preservation |
| Offline refresh/reconnect | Retained field, EC and judge tests; new field-map fallback journey |
| Legacy route | Original screening, Experimental EC, mapping, demo and report tests retained |
| Responsive and bilingual | New six-tab matrix at 320/360/390/430/768/1440px in EN/HI; previous 375px checks retained |
| Export security/readability | Existing CSV formula/source-scope assertions and EN/HI print/PDF attachments; visual review still required |
| Errors/recovery | Existing missing/invalid input, duplicate, denied storage, native v5 upgrade and corrupt IndexedDB browser cases |

The six new browser cases are in `tests/e2e/unification.spec.ts`. The map marker test uses deterministic raster fixtures so tile-service availability does not decide its outcome; it still requires real browser WebGL and actual MapLibre controls. Offline map tests use the source list and never claim external tiles are cached.

## Known limitations and remaining work

- Current-branch offline refresh, visual responsiveness, keyboard marker behavior and generated print output remain unverified until the browser run completes.
- Full screen-reader/WCAG certification, exhaustive keyboard traversal, low-end Android performance and mobile print behavior are not established by these tests.
- Legacy migration/import and backup restoration UI are deliberately absent. Legacy data stays readable at `/?legacy=1`.
- Embedded training uses separate storage; legacy-only device/history records do not appear in its new empty simulator database.
- Charts show individual visit eligibility; each immutable visit card is the authoritative explanation of which earlier records formed its baseline. No connecting line asserts comparability.
- Mapping depends on WebGL and network tiles; source lists, evidence, investigations and reports are the offline alternative.
- There is no cloud synchronization, notification to an authority, physical measurement, safety certification, field validation or proven impact.

## Review decision

Keep any proposed PR draft until all 31 browser tests pass without retries, exported EN/HI PDFs and CSVs have been inspected, screenshot evidence supports the requested widths, and failures have been repaired and rerun. Use the [implementation report](implementation-report.md) for the proposed PR description and the [walkthrough](../submission/unified-demo-script.md) for demonstration steps.
