# Software-field readiness and verification

Date: 23 October 2026. Branch: `feat/software-field-system`. Baseline: `f739749`. No changes have been pushed, merged or deployed. Every changed file was committed separately, including subsequent fixes, as requested.

## Assessment

**Implemented software prototype; not yet release-certified or field-validated.** The new core domain/persistence/export behavior passes automated tests. The production build passes using webpack. Browser-level offline, mobile, accessibility and PDF-layout acceptance remains blocked by this environment, so the final acceptance criteria are not all verified. Do not present the branch as a fully validated field deployment.

The public Vercel deployment was not changed. The web retrieval tool could not access it during this task; local HTTP verification is not verification of the live deployment.

## Retained functionality

- Original screening simulation, referrals, map/dashboard, source records and history.
- Experimental manual EC entry, device/calibration metadata, repeatability, comparison and CSV.
- Original synthetic judge scenarios and print reports.
- English/Hindi dictionaries, IndexedDB data/migrations, manifest, MapLibre worker handling and security headers.

These features are accessible from the secondary legacy entry. Bluetooth/ESP32 providers remain unimplemented placeholders and are not used by the primary journey.

## Added functionality

- Field-first navigation with editable source registration, district, optional GPS/image and operator codes.
- Manual readings with explicit timestamps, optional temperature/device/probe IDs and per-visit calibration snapshots.
- Comparison explanations, previous-visit deltas, configurable provisional thresholds and immutable saved analysis snapshots.
- Investigations, linked retests, timestamped operator evidence, validated transitions, referral intentions and explicit closure without confirmation.
- Separate manual/synthetic field scopes with atomic saves, retry keys, optimistic concurrency, safe additive v6 schema and corruption detection.
- Draft recovery for source text, measurements and follow-up forms; unsaved photo files must be reselected after refresh.
- Selected-source bilingual CSV and browser print/PDF report; four deterministic software-only follow-up scenarios.
- Initial shell JS/CSS precaching for first offline refresh after installation.

## Bugs and security findings fixed

1. Screening reset deleted EC sources with no visits; it now respects their scope.
2. Legacy history counted later visits; comparisons now use earlier timestamps.
3. Zero median suppressed anomalies; absolute threshold handles zero baselines.
4. Legacy draft writes could crash on storage failures; failures are visible.
5. CSV formula escaping now accounts for whitespace/control prefixes and retains numeric negatives.
6. Measurement retry identities survive draft refresh; transaction tests prevent duplicate records/investigations.
7. Stored quality flags and comparison snapshots are validated before display; failed/corrupt evidence is not silently promoted or erased.
8. Next.js and Vite/Vitest dependency advisories were confirmed with npm audit and fixed within existing dependency ranges. The final lockfile installs Next.js 16.4.3 and Vitest 4.1.12; npm audit reports zero vulnerabilities.

## Verification evidence

| Check | Result |
| --- | --- |
| Baseline `npm test` | 61 tests passed |
| Baseline lint / typecheck | Passed |
| Final `npm test` | 96 tests in 14 files passed |
| Final `npm run lint` | Passed |
| Final `npm run typecheck` | Passed |
| `npm run build -- --webpack` | Production build passed; root page prerendered |
| Default Turbopack build | Environment blocked PostCSS subprocess port binding (`EPERM`); no production build configuration was changed |
| `npm audit --audit-level=moderate` after patches | Zero reported vulnerabilities |
| Local HTTP smoke check | HTTP 200; CSP, nosniff, DENY, referrer and permissions headers present |
| Browser suite discovery | 23 tests in 3 files: 16 preserved, 7 new |
| Existing browser baseline | All 16 failed at browser launch, before application assertions |
| New browser attempt | First test failed at launch; 6 not run with max-failures=1 |
| Browser fallback | Installed Chrome also failed; Superset host service unavailable; no connected browser exposed |

The concrete launch failure is macOS `bootstrap_check_in ... MachPortRendezvousServer ... error 141`; process cleanup also reported `EPERM`. This is an environment failure, not a passing or failing application assertion. Browser tests must be run on an unrestricted machine/CI before a release claim.

The 35 added unit/integration cases cover invalid/missing readings and dates, absent calibration/temperature, chronology and zero baselines, source validation, third-reading handling, scopes, configurable rules, migrations, failed-write rollback, concurrent duplicate saves, stale edits, investigation evidence requirements, persistent/non-reproduced changes, corruption, formula injection, translation parity, deterministic demos and a worker-cache harness that serves the shell/initial assets with network disabled. A simulated service-worker harness is not a substitute for browser/device offline verification.

## Release gates and limitations

- Run all 23 Playwright tests, including offline refresh, linked retests, Hindi, 320px overflow, keyboard/labels and report printing. Resolve any application failures that become visible after browser launch works.
- Visually inspect the printed PDF and mobile UI. Browser Print / Save as PDF depends on the platform; no standalone PDF library/download endpoint is implemented.
- Test low-end Android performance, font rendering, browser storage quota/eviction and upgrades in a persistent real browser profile.
- Obtain independent measurement-method and Hindi terminology review. Thresholds are unvalidated provisional heuristics; calibration is recorded metadata, not verified accuracy.
- No physical measurement, contamination detection, safety certificate, lab results, external notifications, authenticated sync, government integration or paid service exists.
- Source metadata is editable with concurrency checks but no full source-edit revision history. Measurements and investigation events are immutable through the application; local browser storage is not tamper-proof or encrypted.
- CSV contains the selected source's evidence but is not a restorable backup; photos are omitted from CSV. No recovery/import UI exists. Saved data can be lost by browser clearing/eviction or device loss.
- Raw EC comparisons use a temperature envelope, not a validated compensation model. Instrument identity is operator-entered; optional IDs weaken assurance of device continuity. No automatic scheduling or investigation reminder delivery exists.
- Real-world usability, stakeholder validation, institutional fit and impact remain unproven. Synthetic fixtures and tests are not field evidence.

## Review and reproduction

```bash
npm ci
npm test
npm run lint
npm run typecheck
npm run build -- --webpack
npm run test:e2e:ci
npm audit --audit-level=moderate
```

Use normal `npm run build` on a host where Turbopack can create its subprocesses. Run the production server with `npm run start` and open the localhost URL. The primary field workspace is `/`; earlier demos are `/?legacy=1`.

For the demonstration choose **Software-only judge demo → Load four synthetic scenarios**. Inspect sources DEMO-01 through DEMO-04, then choose Reports with DEMO-04 selected. See [the timed walkthrough and seven-slide outline](software-field-submission.md). Preload online before attempting offline use.

## File and commit review

The changes are grouped under `src/field/` (model/store/fixtures/export/translations/tests), `src/components/field/` (UI/forms/reports/drafts), additive database schema, app entry/styles/metadata, service worker, narrowly scoped legacy fixes, browser tests, documentation and the dependency lockfile. No new runtime library or backend was added.

To inspect every per-file commit and the full change set:

```bash
git log --reverse --oneline f739749..HEAD
git diff --stat f739749..HEAD
git status --short
```

The audit was committed first (`f26cfd5`), followed by field contracts (`33b0b04`), additive storage (`758d2d4`), atomic field persistence (`42422c8`), UI/data/report/test commits and the security lockfile (`4a9d5fd`). The current branch contains all work; production is unchanged.
