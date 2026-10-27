# Deployment guide

JalRakshak supports a hosted PostgreSQL application and a local/private SQLite team.
Use the guide matching your deployment; the older demo architecture in
`docs/archive/` does not describe the current backend.

| Deployment | Database | Start here |
| --- | --- | --- |
| Local Node.js | SQLite on local disk | [Setup and environment](environment.md), [team setup and recovery](team-local.md) |
| Vercel | PostgreSQL on Neon | [Vercel + Neon](vercel.md) |
| Private Docker server | SQLite on a persistent volume by default | [Docker HTTPS](docker.md) |
| Hosted AI | Groq API | [Hosted AI configuration](hosted-ai.md) |
| Private AI | Ollama + faster-whisper | [Docker AI](docker-ai.md), [local AI](../field/local-ai.md) |

## Hosted release sequence

1. Validate changes with GitHub Actions using isolated databases and records.
2. Keep production credentials in the hosting environment. Never copy them into
   frontend code, examples, test fixtures or Git.
3. Before a schema change, back up the database and apply the tracked PostgreSQL
   migrations explicitly. Database migration does not copy local browser records.
4. Deploy the reviewed version. Git-triggered Vercel deployments are disabled in
   this repository, so a merge alone does not deploy the application.
5. Check the production alias, sign-in, sync and configured service capabilities.
   Check actual email/Google/AI flows privately with operator-approved test data.
6. Verify post-merge CI and the relevant restore procedure. A same-database copy
   is not an independent off-device backup.

The current hosted URL is https://jalrakshak-jharkhand.vercel.app/.
Public organisation signup is available only on configured PostgreSQL installations;
local SQLite uses the private initial-supervisor flow. See [organisation signup](../organisation-signup.md).

## Review checklist

- [Environment variables and setup](environment.md)
- [Technical design and diagrams](../technical-design.md)
- [Sample data and test cases](../testing.md)
- [MIT licence](../../LICENSE)
