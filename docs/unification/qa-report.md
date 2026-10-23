# Unified experience — QA evidence and release gate

Working branch: `feat/unified-field-experience`. Review date: 24 October 2026. Local verification only. Publishing the branch was authorized but blocked by GitHub credentials; no remote merge or deployment was performed.

**Status: implementation ready for browser review; final acceptance is NOT established.** The pending browser run must not be represented as passing. The successful browser evidence in `software-field-readiness.md` describes the previous implementation, not this revision.

## Executed checks

| Check | Result |
| --- | --- |
| Main baseline before implementation | 96 tests / 14 files passed |
| Release-QA prerequisite retained | 99 tests / 14 files passed after integration code changes |
| Expanded unit/persistence suite: `npm test` | 114 tests / 16 files passed (108 existing plus six CI-accounting regressions) |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm run build -- --webpack` | Passed; root and not-found routes statically prerendered |
| `npm audit --audit-level=low` | Zero vulnerabilities reported; initial sandbox DNS failure, successful network-enabled retry |
| Playwright `--list` | 31 cases discovered in five files. Listing is NOT execution; its JSON reports cases skipped |
| Current-branch real browser execution | Blocked before CI launch: Git authentication and integration write permission |
| Current-branch PDF/CSV/screenshots visual inspection | Pending generated browser artifacts |

The added nine unit cases verify mixed-scope/source linkage filtering, lifecycle count/marker updates, latest eligible rather than latest raw observation, missing calibration exclusion, zero/missing/non-finite coordinates, idempotent demo reset, rollback on failure, training/legacy reset independence, and closed-state semantics.

The retained suite also covers repeatability, earlier-only comparisons, source/provenance eligibility, timestamp/calibration validation, lifecycle transitions and current-request linked evidence, schema migration, corrupt records, write conflicts, formula-safe CSV and simulated offline cache behavior. A Node service-worker harness is useful coverage, but is not a substitute for real offline browser execution.

## Required browser verification: GitHub-hosted Linux CI

`.github/workflows/ci.yml` runs on every pull request targeting `main`, pushes to `main` or `feat/unified-field-experience`, and manual workflow dispatch. Branch-push execution allows verification before creating the final PR. The stable `verify` job remains; unit tests, lint, TypeScript and production build are preserved.

The runner uses Ubuntu, Node 22, `npm ci`, and `npx playwright install --with-deps chromium`, then executes `npx playwright test --config=playwright.release.config.ts`. Chromium sandboxing stays enabled, retries are zero and workers are limited to one. No security setting is relaxed.

HTML and JSON reporters are enabled. The artifact `playwright-release-<run-id>-<attempt>` contains `playwright-report/` and `test-results/`, including failure screenshots, videos, traces and generated report evidence. It is retained for 14 days and uploaded on both success and failure after the browser step, unless the run is cancelled. The result guard emits exact counts to the job summary and fails if fewer than 31 cases execute, any case is skipped/failed/retried/incomplete, or runner errors occur. Six fixture-based unit tests validate that accounting; these fixtures are not browser pass evidence.

The agent's review loop is: publish the feature branch → inspect run jobs and exact SHA/counts → download failure artifacts → repair actual defects without weakening assertions → commit/push corrections → inspect the new run. Create or update the PR once required checks pass; respect existing branch protections and approval requirements. Repository settings were not changed to bypass protection or grant an autonomous workflow write token.

### Current publication blocker

- `git push -u origin feat/unified-field-experience` failed: `could not read Username for 'https://github.com': Device not configured`.
- `gh auth status` reports the configured credential invalid, including outside the filesystem sandbox.
- The connected GitHub integration can read repository metadata, but `create_branch` returned **403 Resource not accessible by integration**. Repository-level metadata showing push permission does not grant the integration's token write access.
- No Linux run was triggered for this revision. **Run URL: unavailable. Browser cases: 31 discovered, 0 verified passes, application failures unknown.** This is an authentication blocker, not a browser or application failure.

Restore agent-visible GitHub authentication capable of repository contents/workflow-file writes and PR operations. Do not paste credentials into chat. No request to run local tests is needed. Once access is restored, the authorized push/CI/fix loop can proceed.

### Optional local fallback

A developer may run `npm run build -- --webpack` followed by `npx playwright test --config=playwright.release.config.ts` from a supported normal terminal. This is optional, not the required release gate. The macOS agent Chromium launch restriction is an environment limitation; it does not require further local attempts or weakened protections.

Results live at `test-results/release-results.json`; the HTML report is `playwright-report/index.html`. Old 25-test artifacts and `--list` discovery cannot certify this revision.

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
