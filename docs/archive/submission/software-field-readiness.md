> **Historical archive:** This document describes an earlier revision. Its workflow, deployment notes and test counts are not current. See the [current README](../../../README.md) and [field guide](../../field/daily-work.md).

# Software-field release readiness and verification

Verification date: 23 October 2026. Working branch: `feat/software-field-system`.

## Release assessment

**Ready for review as a software-only hackathon prototype, with the tested browser workflow and exports verified. Not field-validated or certified for drinking-water safety.** The follow-up fixes and QA changes remain local; no push, merge or deployment was performed during this round.

The normal-terminal release run passed **25 browser tests, zero failures, zero skips and zero retries**, in 27.97 seconds. The JSON report was read directly, its embedded artifacts extracted, both six-page PDF reports rendered and inspected, and all four CSVs parsed. The three new investigation regression tests also pass within the 99-test unit/integration suite.

## Revision and evidence provenance

- Tested checkout: `1b89cd6d0ec86eb50908c1aee27c4db4786dc847`; subsequent changes in this review only update documentation.
- Production build ID present during artifact review: `RHXCNvTi8RhOZ8DhOuQ1y`.
- User launched `npx playwright test --config=playwright.release.config.ts` in the normal macOS terminal. Run start: `2026-10-23T17:45:05.418Z`.
- Read report: `test-results/release-results.json`; SHA-256 `78009f83364646b4c183f3fc0d0c1e6a7a740ff09584ae246b0dc2cebe81c432`.
- Attachments are embedded as base64 in that JSON. Review copies and rendered pages are under `test-results/release-review/`. These ignored files can be overwritten/deleted by future test runs; retain them separately for release evidence.
- Historical [pre-merge CI on 58fdbf4](https://github.com/thisisanubhav/jalrakshak/actions/runs/39992981200) passed 96 unit tests and 23 browser tests without retries. [Post-merge CI on aeb2c63](https://github.com/thisisanubhav/jalrakshak/actions/runs/39993744211) also passed. Those runs do not substitute for verification of the follow-up changes.
- Production Vercel deployment was not validated in this QA round.

## Final verification results

| Check | Observed result |
| --- | --- |
| Baseline before QA | 96 unit/integration tests in 14 files, lint and TypeScript passed |
| Regression reproduction | Three tests failed before their fixes: stale retest reuse, completion preceding measurement, resolution with superseded stable evidence |
| Final `npm test` | **99 tests in 14 files passed** |
| `npm run lint` / `npm run typecheck` | Passed |
| `npm run build -- --webpack` | Passed; production root page prerendered |
| `npm audit --audit-level=moderate` | Zero reported vulnerabilities |
| Normal-terminal browser run | **25 passed, 0 failed, 0 skipped, 0 flaky**, retries disabled |
| Offline browser operations | Source registration/edit, manual recording, investigation/retest/closure, reload and report export passed with the browser context offline |
| Reconnection and persistence | Field workflow retained exactly two measurements; manual anomaly case retained exactly four; legacy offline/reconnection tests also passed |
| Synthetic scenarios | All four explicit count/outcome checks passed; DEMO-04 exported with full follow-up |
| Mobile | Five screens × English/Hindi × 320/375/390/768 px: overflow/label assertions passed; 40 screenshot artifacts captured |
| PDF | Both six-page reports rendered; all 12 pages visually reviewed; five measurement timestamps and final closure confirmed in extracted text |
| CSV | Four files parsed; every row has five columns; intended scope, Unicode and formula escaping verified |
| Migration/corruption | Native browser IndexedDB v5-to-v6 preservation and corrupt-data retention/retry test passed, alongside unit migration/rollback tests |

No new runtime dependency or backend was added. A PDF renderer was installed only in an isolated temporary tooling directory for artifact inspection.

## Safe Chromium launch resolution

Chromium still cannot launch from this agent's macOS execution process: sandboxed headless shell exits before page creation with power-notification/DNS registration errors, SIGTRAP and cleanup `EPERM`; the supported full Chromium channel similarly failed with SIGABRT. Earlier attempts also reported `bootstrap_check_in ... MachPortRendezvousServer ... error 141`. The first release-runner attempt additionally hit an occupied port; the runner now uses dedicated port 3217 and refuses stale server reuse.

**The safe execution path is verified:** the same release runner succeeds from the normal signed-in user terminal with `chromiumSandbox: true`. This isolates the remaining restriction to the agent launch environment, rather than requiring an application/browser downgrade or weakened security. No SIP, Gatekeeper, quarantine, certificate verification or macOS security setting was disabled, and no `--no-sandbox` workaround was introduced. See [Playwright browser channels](https://playwright.dev/docs/browsers) and [Chromium sandbox launch options](https://playwright.dev/docs/api/class-browsertype#browser-type-launch-option-chromium-sandbox).

The earlier agent run failed before the first assertion and left 24 tests unexecuted; that failed attempt is not counted as passing. It was superseded by the inspected successful normal-terminal report.

## Bugs fixed

1. **Stale evidence could complete a later retest request.** Completion now requires a linked measurement taken at or after the most recent request. The regression confirms rejection preserves the current request/event history.
2. **Completion could precede the cited measurement.** An event cannot cite a measurement with a later timestamp. The regression confirms the investigation remains `RETEST_REQUESTED`.
3. **Older stable evidence could override a newer anomalous retest.** Resolution now requires the explicitly selected, latest reviewed retest from the current request to be repeatable and historically stable. Regression checks reject both superseded stable evidence and newer anomalous evidence as grounds for resolution.

These checks also apply during stored-event replay. Previously accepted inconsistent histories may now show the existing corruption warning; they are not rewritten or deleted. No schema change was introduced. Recovery/import tooling is still absent.

Earlier fixes remain intact: reset isolation, earlier-only historical baselines, zero-median anomaly handling, storage-error reporting, CSV formula protection, submission deduplication, comparison validation, dropdown accessible names and dependency advisory patches. Prior browser test date/selector/save-wait defects were corrected before the successful Linux CI run.

## Export and visual inspection

The English and Hindi DEMO-04 PDFs each contain six pages. Every page was rendered and inspected: headings, source details, all five measurement records, calibration metadata, historical comparisons, retest links, all five investigation events and the closure disclaimer are present. Hindi glyphs render legibly. No clipped content or missing evidence was observed. Cards span page breaks; fields remain readable.

| CSV artifact | Rows including header | Checks |
| --- | --- | --- |
| `demo-report-en.csv` | 187 | Five measurements, five events, DEMO-04 only, English labels |
| `demo-report-hi.csv` | 187 | Same record scope/counts, Hindi labels preserved |
| `manual-source.csv` | 97 | Edited source location, disagreement/retest/closure evidence, manual scope |
| `manual-anomaly.csv` | 137 | Four manually entered measurements, anomaly investigation, no demo records; formula-like note begins with an apostrophe and retains embedded quotes/newline/Hindi |

All CSV rows parse into five columns. No unescaped formula-leading cells were found in these fixtures. Unit tests additionally cover whitespace/control prefixes, quotes and numeric negative values. This is not certification across every spreadsheet application's import behavior.

Forty screen overviews were inspected across the four widths and two languages, with the complete 320px measurement forms inspected in detail. Labels and controls fit and Hindi text is readable. Full-page captures preserve the scroll position of the sticky header, so header placement in these images is not a top-of-page viewport assertion. The captured investigation overview uses DEMO-01's empty state; it does not visually certify every populated investigation form. Registration/edit flows are exercised by browser tests but are not included in this screenshot matrix.

Minor non-blocking polish remains: some raw floating-point tolerance values display long decimals (for example `30.650000000000002`); long navigation words can wrap awkwardly at intermediate widths; full reports are lengthy. These do not change stored values, decisions or exported record scope. No application code was changed after reviewing the successful artifacts.

## Coverage boundaries and remaining release work

- All 25 automated browser tests passed, including the original 23 retained/expanded cases and two release-specific cases for manual anomalies, real/demo isolation, formula-safe CSV, native migration and corruption handling.
- Basic labels, keyboard focus, horizontal overflow and existing contrast checks pass. This is **not** a full WCAG or screen-reader audit.
- Real offline behavior was tested with Chromium's network disabled after initial loading. Low-end Android performance, actual device storage pressure/eviction, airplane-mode networking and long-lived profile upgrades still need physical-device acceptance.
- Denied IndexedDB/localStorage and corruption are covered. Recovery from a transient full-storage/quota condition while preserving an unfinished form is not fully verified end-to-end.
- Independent Hindi terminology, measurement-method review and field usability validation remain outstanding. Synthetic fixtures are not field evidence or measured impact.
- A production Vercel smoke test is still required after an explicitly approved deployment.

## Product boundaries

The primary `/` journey remains entirely software-only: editable sources, manual EC records, repeatability validation, saved historical comparisons, investigations, linked retests and bilingual reports. Earlier Screening Demo, Experimental EC, map/dashboard and judge-demo functionality remain available at `/?legacy=1`.

EC cannot establish drinking-water safety or identify contaminants. Thresholds are provisional screening rules; calibration metadata and device/probe identity are operator-entered. No laboratory result is fabricated and no external authority is notified.

There is no authenticated synchronization, remote backup, government integration or paid service. Local storage is not tamper-proof/encrypted and can be lost through clearing, eviction or device loss. CSV is not a restorable backup and omits photos. Source edits lack full revision history; unsaved photos must be reselected after refresh. Temperature uses an envelope rather than validated compensation. No automatic follow-up reminders exist.

## Reproduce and review

```bash
npm test
npm run lint
npm run typecheck
npm run build -- --webpack
npm audit --audit-level=moderate
npx playwright test --config=playwright.release.config.ts
```

Use the normal user terminal for browser execution on this Mac. Omit `PLAYWRIGHT_BASE_URL` to test this checkout using the fresh production server at `http://127.0.0.1:3217`. Preserve the JSON and embedded attachments before rerunning. Do not interpret test discovery as execution.

The prepared [follow-up PR summary](../pull-requests/release-readiness-qa.md) is local only. Obtain explicit approval before pushing, merging or deploying.

For the demonstration, preload online, choose **Software-only judge demo → Load four synthetic scenarios**, inspect DEMO-01 through DEMO-04, then export DEMO-04 under Reports. The [three-minute walkthrough and seven-slide outline](software-field-submission.md) remain available. Verify the actual demonstration device offline before presenting.
