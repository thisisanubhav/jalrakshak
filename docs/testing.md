# Sample data and test cases

Use fictional data in a separate local installation or isolated preview database.
Never point automated tests at production or reuse real user records.

## Included sample data

| File | Purpose |
| --- | --- |
| [sources.csv](samples/sources.csv) | Three fictional sources for bulk-import practice across two states. Coordinates are intentionally blank. |
| [Source import template](../src/field/source-import.ts) | The template downloaded by the application's import screen. |
| [Synthetic scenarios](../src/demo/scenarios.ts) | Deterministic stable, disagreement, insufficient-history and changed-reading scenarios. These use the legacy judge-demo model, not the current field-backup format. |
| [Field test fixtures](../src/field/field.test.ts) | Programmatically created field sources, visits and investigation records. |
| [Onboarding browser fixtures](../tests/e2e/onboarding.spec.ts) | Mocked email and Google verification responses; no real mail or Google login. |

To try the CSV, create an isolated supervisor account, open source bulk import,
choose `docs/samples/sources.csv`, review the three valid rows and confirm.
Importing it creates ordinary field sources in that test workspace; it is **not**
automatically put in training mode. Do not sync it into a real organisation.
Importing it again should flag duplicate codes rather than overwrite records.
Blank coordinates produce area context where available, not exact GPS pins.

No production accounts, passwords, email tokens or real field observations are
included. The application does not automatically seed the CSV into a database.

## Automated checks

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

`npm test` runs Vitest. PostgreSQL-specific tests require
`JALRAKSHAK_TEST_POSTGRES` pointing to a disposable localhost database; without it
those cases are skipped. CI supplies PostgreSQL and runs them. Test counts can
change: use the workflow results for the exact tested commit.

Focused sample-import validation:

```bash
npm test -- src/field/import-recurrence.test.ts src/field/locations.test.ts
```

### Browser and shared-server release checks

[GitHub Actions](../.github/workflows/ci.yml) is the required browser release path.
It runs `npx playwright test --config=playwright.release.config.ts` after a production
build, with Chromium sandboxing, one worker and zero retries. The results checker
rejects skipped, retried or failing browser cases. Reports and failure evidence are
uploaded as workflow artifacts.

The release configuration starts an isolated server on port 3217 and stores its
SQLite database under `test-results/`. Leave `PLAYWRIGHT_BASE_URL` unset unless
deliberately targeting a separate disposable test server; setting it disables the
managed local test server. Never use the live site as a test base URL.

The shared-server job additionally checks Docker HTTPS, sessions, permissions,
persistent data, SQLite backup restoration, private AI services, multiple workers,
outages and restart recovery. It cleans up its test containers and volumes.

## Coverage and acceptance cases

| Case | Expected result | Automated coverage |
| --- | --- | --- |
| Save a worker visit offline, reconnect and sync | Saved evidence survives reload and reaches the authorised team | `tests/e2e/team.spec.ts`, `mobile-drafts.spec.ts` |
| Access another worker's source or another organisation | Server denies access; existing records remain unchanged | `src/team/server.test.ts`, `postgres.test.ts` |
| Concurrent edits / lost response | Stale edits conflict; identical retries do not duplicate evidence | `src/team/merge.test.ts`, `postgres.test.ts` |
| Supervisor review, correction and linked retest | Review attribution and evidence history are preserved | `tests/e2e/operations.spec.ts`, `src/team/operations.test.ts` |
| Import valid CSV, then duplicate/invalid CSV | Preview accepts valid rows and flags invalid/duplicate rows | `src/field/import-recurrence.test.ts`, `locations.test.ts` |
| Restore encrypted backup with wrong/correct password | Wrong password fails; valid restore preserves existing data | `src/field/backup-encryption.test.ts`, `tests/e2e/backup.spec.ts` |
| English/Hindi navigation and mobile drafts/photos | Selected language and saved evidence remain usable | `tests/e2e/language-fonts.spec.ts`, `mobile-drafts.spec.ts` |
| Monthly report filters and schedule totals | Counts reflect selected records and date rules | `src/field/monthly-report.test.ts`, `tests/e2e/monthly-backup.spec.ts` |
| Email signup and worker invitations | One-use tokens; organisation and worker role cannot be changed | `src/team/postgres.test.ts`, `tests/e2e/onboarding.spec.ts` |
| Google callback verification | Reject incorrect state, issuer, audience, nonce and unverified email | `src/team/google.test.ts` |
| AI malformed output, quota or outage | Clear failure; manual records remain available and measurements unchanged | `src/ai/groq.test.ts`, `local.test.ts`, `tests/e2e/ai.spec.ts` |
| ESP32 stale or reused samples | Invalid capture is rejected; simulator stays separate | `src/sensors/esp32.test.ts`, `monitor.test.ts`, `tests/e2e/esp32.spec.ts` |

These are acceptance targets and pointers to related coverage, not a claim that
every provider or physical device is exercised by every test run.

## Manual deployment checks

On a separate preview environment with fictional data, verify actual Gmail delivery,
the Google redirect and verified-email form, and live Groq transcription/drafts in
both languages. Test two organisations and an invited worker. Check mobile layout,
offline save/reconnect, and download/restore on the intended browser/device.

Mocked tests cannot verify provider credentials, email delivery, model availability,
real sensor calibration, or drinking-water safety. A passing software suite does not
replace a physical field validation or a separate PostgreSQL restore drill.
