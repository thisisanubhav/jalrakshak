# Enforce current retest evidence and strengthen release verification

An investigation could accept an old retest for a new request, record completion before the measurement, or resolve using an earlier stable visit despite a newer anomalous retest. The state machine now rejects those transitions, preserves the current event history on failure, and requires resolution to cite the latest reviewed, repeatable, historically stable retest from the latest request.

## Changes

- Three regression tests reproduce the investigation defects before their respective fixes.
- Expand existing browser coverage to all four synthetic outcomes, English/Hindi PDF and CSV attachments, reconnect persistence, and screenshots at 320, 375, 390 and 768 px.
- Add two browser cases for manually entered historical anomalies, mixed real/demo isolation, formula-safe exports, native IndexedDB v5-to-v6 migration and corrupt-record retention.
- Add a release runner with Chromium sandboxing enabled, zero retries, a dedicated port, fresh server startup and JSON evidence.
- Replace stale readiness claims with revision-specific CI evidence and explicit outstanding release gates.

## Validation

- 99 unit/integration tests in 14 files pass after the fixes (baseline: 96).
- ESLint, TypeScript, webpack production build and dependency audit pass; zero vulnerabilities reported.
- Historical merged code: Linux CI passed 23 browser tests without retries on `58fdbf4`; post-merge `aeb2c63` workflow also passed.
- Current local code: 25 browser tests are present. The attempted run failed before the first application assertion at macOS Chromium launch; 24 tests did not run. Both sandboxed headless-shell and full Chromium launch probes failed. No system security settings were weakened.
- New PDFs, CSVs and mobile screenshots have not been generated or visually reviewed in this session. The older CI pass does not validate these new changes.

## Review and compatibility

Review `src/field/model.ts` and its regression tests first. Stricter validation also runs during stored-event replay: previously accepted inconsistent histories will surface the existing corruption warning rather than being rewritten or deleted. Schema v6 remains unchanged, but a recovery/import UI is still missing.

The current browser suite and visual report gates must pass before release approval. EC safety limitations and synthetic labeling remain unchanged. No new runtime dependency or backend was added.

```bash
npm run build -- --webpack
npx playwright test --config=playwright.release.config.ts
```

Inspect `test-results/release-results.json` and PDF/CSV/PNG attachments under `test-results/release/`. Do not interpret skipped/discovered tests as passed. See [the readiness evidence and limitations](../submission/software-field-readiness.md).

This is a prepared summary only. No follow-up PR was opened and no commits were pushed, merged or deployed during this QA round.
