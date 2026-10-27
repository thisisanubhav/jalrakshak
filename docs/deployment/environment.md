# Setup and environment reference

Use Node.js 22.16+ (Node 24 recommended), npm and Git. No external service is required for a local SQLite team.

## Local setup

```bash
npm ci
cp .env.example .env.local
npm run build
npm run start -- --hostname 127.0.0.1 --port 3000
```

Open http://localhost:3000 consistently. On first access, read the generated
`private-data/setup-key.txt` privately and create the first supervisor account.
Use a password of at least 12 characters. Create workers in **Manage team**.
For development, use `npm run dev` instead of build/start.

Next.js loads `.env.local`; standalone Node scripts require explicit
`--env-file=.env.local` or exported environment variables. Restart the server
after changes. Never commit credentials or use a `NEXT_PUBLIC_` prefix for secrets.

## Application settings

| Variable | Purpose / default | Secret? |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection URL; required on Vercel. Unset/blank selects SQLite elsewhere. | Yes |
| `JALRAKSHAK_TEAM_DB` | SQLite file; **omit** to use `private-data/team.sqlite`. Do not set an empty path. | No |
| `JALRAKSHAK_BACKUP_DIR` | SQLite backup folder; **omit** to use `private-data/backups`. | No |
| `JALRAKSHAK_SETUP_TOKEN` | Initial supervisor setup key. Required for hosted setup; local installs generate a private file when unset. | Yes |
| `JALRAKSHAK_PUBLIC_ORIGIN` | Hosted HTTPS origin, e.g. `https://your-app.example`; no path/query. Omit for HTTP localhost. | No |
| `JALRAKSHAK_ALLOW_SIGNUP` | `1` enables public onboarding with PostgreSQL and a configured HTTPS origin; unset disables it. | No |
| `GOOGLE_CLIENT_ID` | Google OAuth web client ID; keep configured server-side. | No |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret. | Yes |
| `JALRAKSHAK_GMAIL_USER` | Sending Gmail account for contact, verification and invitation mail. | Private configuration |
| `JALRAKSHAK_GMAIL_APP_PASSWORD` | Gmail app password, entered privately; not the account password. | Yes |
| `GROQ_API_KEY` | Hosted transcription and evidence drafting. | Yes |
| `JALRAKSHAK_AI_PROVIDER` | `groq`, `local`, or `disabled`. Unset chooses Groq if a key exists, otherwise local services. | No |
| `JALRAKSHAK_OLLAMA_URL` | Private Ollama base URL; no local text AI without a configured service/model. | No |
| `JALRAKSHAK_WHISPER_URL` | Private speech-service base URL. | No |
| `JALRAKSHAK_AI_MODEL` | Installed Ollama model name. Groq uses models fixed in the adapter. | No |
| `JALRAKSHAK_WHISPER_MODEL` | Optional downloaded multilingual model path used by the local speech launcher. | No |

Do not reuse production secrets in CI. Free provider quotas and account settings
remain the operator's responsibility; the app cannot enforce a provider billing plan.

## Hosted PostgreSQL and public signup

1. Create separate production and test/preview databases. Set `DATABASE_URL`,
   `JALRAKSHAK_SETUP_TOKEN`, and `JALRAKSHAK_PUBLIC_ORIGIN` privately on the host.
2. Back up any existing database, then apply the tracked migrations:
   `node --env-file=.env.local scripts/migrate-postgres.mjs`.
   Use a private environment file pointing at the intended database; never use a test runner for migration.
3. Configure Gmail for email verification/invitations and/or Google for Google signup.
   Register exactly `<HTTPS origin>/api/onboarding/google/callback` in the Google web OAuth client.
4. Set `JALRAKSHAK_ALLOW_SIGNUP=1` only after migrations and provider setup, then deploy.
5. Verify `/api/onboarding/capabilities`, complete a real email/Google flow, and check two
   separate organisations cannot access one another's records.

SQLite uses private-team setup and does not provide public organisation signup.
Google-created users sign in through Google; existing password accounts are not
automatically linked by matching email.

## Other configuration files

- [Vercel + Neon](vercel.md): hosted backend, migration and recovery.
- [Docker](docker.md): `deploy/.env.example` covers hostname, image tag and proxy ports.
  Compose passes its configured variables to containers; creating `.env.local` alone does not configure Docker.
- [Local AI](../field/local-ai.md) and [Docker AI](docker-ai.md): service/model setup and `deploy/local-ai.env.example`.
- [Hosted AI](hosted-ai.md): Groq setup, quotas and rotation.
- [Tests and sample data](../testing.md): test-only variables and isolation rules.

The historical `NEXT_PUBLIC_SYNC_ENDPOINT` and `NEXT_PUBLIC_DEMO_MODE` entries are
not used by the current application and have been removed from the example.
