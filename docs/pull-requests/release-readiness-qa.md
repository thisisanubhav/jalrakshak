# Enforce current retest evidence and strengthen release verification

An investigation could accept an old retest for a new request, record completion before the measurement, or resolve using an earlier stable visit despite a newer anomalous retest. The state machine now rejects those transitions, preserves the current event history on failure, and requires resolution to cite the latest reviewed, repeatable, historically stable retest from the latest request.

## Changes

- Three regression tests reproduce the investigation defects before their respective fixes.
- Expand existing browser coverage to all four synthetic outcomes, English/Hindi PDF and CSV attachments, reconnect persistence, and screenshots at 320, 375, 390 and 768 px.
- Add two browser cases for manually entered historical anomalies, mixed real/demo isolation, formula-safe exports, native IndexedDB v5-to-v6 migration and corrupt-record retention.
- Add a release runner with Chromium sandboxing enabled, zero retries, a dedicated port, fresh server startup and JSON evidence.
- Replace stale readiness claims with revision-specific CI evidence, inspected local release results and remaining real-device acceptance limits.

## Validation

- 99 unit/integration tests in 14 files pass after the fixes (baseline: 96).
- ESLint, TypeScript, webpack production build and dependency audit pass; zero vulnerabilities reported.
- Historical merged code: Linux CI passed 23 browser tests without retries on `58fdbf4`; post-merge `aeb2c63` workflow also passed.
- Current code at `1b89cd6`: **25 browser tests passed with zero failures, skips or retries** in 27.97 seconds from the normal macOS terminal. The saved JSON results were inspected directly. Chromium sandboxing stayed enabled; no system security settings changed. Launching from the agent process remains restricted.
- Rendered and visually inspected all 12 pages of the English/Hindi reports. Both contain the five DEMO-04 measurements and complete five-event follow-up log, with readable Hindi glyphs and no observed clipped evidence.
- Parsed all four CSV attachments: consistent five-column rows, correct source/scope isolation, Unicode preserved and formula-like input escaped. Reviewed 40 mobile screen overviews and complete 320px measurement forms; overflow assertions passed at 320/375/390/768 px.
- Subsequent changes only document these results; application code is unchanged from the tested checkout.

## Review and compatibility

Review `src/field/model.ts` and its regression tests first. Stricter validation also runs during stored-event replay: previously accepted inconsistent histories will surface the existing corruption warning rather than being rewritten or deleted. Schema v6 remains unchanged, but a recovery/import UI is still missing.

Automated browser and report-review gates are satisfied for this checkout. Physical low-end Android acceptance, transient quota recovery, a full accessibility audit, independent terminology/method review and production deployment verification remain outstanding. Minor display polish includes long floating-point decimals, navigation wrapping and lengthy reports. EC safety limitations and synthetic labeling remain unchanged. No new runtime dependency or backend was added.

```bash
npm run build -- --webpack
npx playwright test --config=playwright.release.config.ts
```

Inspect `test-results/release-results.json`; PDF/CSV/PNG attachments are embedded in the JSON and were extracted to `test-results/release-review/`. Do not interpret skipped/discovered tests as passed. See [the readiness evidence and limitations](../submission/software-field-readiness.md).

This is a prepared summary only. No follow-up PR was opened and no commits were pushed, merged or deployed during this QA round.
