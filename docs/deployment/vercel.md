# Vercel + Neon

The hosted app uses `DATABASE_URL` for PostgreSQL. Local and Docker installs retain SQLite when that variable is absent. Vercel refuses to fall back to local disk. The app and database run in Singapore (`sin1`). Git-triggered deployments remain disabled; deployments are explicit.

## Configure

- Connect separate Neon **Free** databases to Production and Preview; never connect tests to production.
- Set `JALRAKSHAK_SETUP_TOKEN` privately and separately for each environment.
- Set production `JALRAKSHAK_PUBLIC_ORIGIN=https://jalrakshak-jharkhand.vercel.app`.
- Keep all secrets server-only. `.vercelignore` excludes local environment files and private records.
- Apply schema changes explicitly with `node --env-file=<private-env-file> scripts/migrate-postgres.mjs`. This creates tables; it does not copy local records or accounts.
- Build/test a preview, then deploy production and verify the original domain alias. Create the supervisor using the private production setup key. There are no default accounts.

## Records and limits

Accounts, sessions, permissions and evidence live in PostgreSQL. Transactions serialize competing writes and reject stale revisions. Large sync batches use session-bound temporary chunks; snapshots stream as JSON. The existing 50 MB sync limit remains. Failed sync does not clear local work. Free provider quotas still apply; no paid upgrades are enabled by this project.

The device address changes when moving from localhost to the hosted domain. Local browser records do not move automatically. Keep a field backup and use the reviewed restore/sync workflow if migration is wanted; do not upload private records without the operator's decision.

## Recovery

The SQLite backup scheduler does not run on Vercel. The app reports hosted backup health as unverified instead of showing local backup results. Check recovery options and retention in the Neon dashboard, and retain encrypted field backups on separate storage. A provider restore is not a tested off-device backup. Before relying on irreplaceable records, rehearse PostgreSQL export/restore separately; do not restore over a running production database.

## Optional services

Ollama and speech containers are not deployed by Vercel. AI remains unavailable until compatible private hosting is arranged; manual notes and records work. Gmail credentials are not copied from the Mac automatically. Configure the server-only Gmail variables privately if automatic contact delivery is required; otherwise the contact page offers an email-app fallback.

## Verification

`JALRAKSHAK_TEST_POSTGRES` enables contract tests against an isolated localhost PostgreSQL server. They create and remove unique test schemas. CI provides PostgreSQL 17 for these tests and retains the SQLite/browser/Docker checks. Never point the test connection at real records.
