# Shared HTTPS server with Docker

This package runs the existing multi-worker backend on one Docker server. It
does not create a hosting account, register a domain, or migrate local records.
Use a Linux server with Docker Engine and Compose v2, durable storage, and a
domain whose DNS points to that server. Permit inbound TCP 80/443 for the HTTPS
proxy. Keep SSH restricted to administrators. Do not publish application port
3000 or scale the app to independent replicas: this deployment uses one SQLite
database, not a distributed database.

For the complete app plus private Ollama and speech services, use the
[Docker AI runbook](docker-ai.md). The base stack below does not enable AI.

## First launch

On the server, check out the tested commit, copy `deploy/.env.example` to
`deploy/.env`, and set the real domain, its exact HTTPS origin, and a unique image
tag. Never put passwords or setup keys in the repository. From the repository root:

```sh
docker compose --env-file deploy/.env config --quiet
docker compose --env-file deploy/.env build app
docker compose --env-file deploy/.env up -d --wait
docker compose --env-file deploy/.env ps
```

Caddy obtains and renews the domain certificate and redirects HTTP to HTTPS.
Certificate issuance requires working DNS and reachable ports 80/443. The app
runs as a non-root user; its port is available only on the Compose network.
The configured `JALRAKSHAK_PUBLIC_ORIGIN` validates browser writes and ensures
session cookies are Secure behind the proxy. Caddy preserves the Host header.
Do not place an additional proxy in front without checking those assumptions.

Retrieve the initial setup key privately from the server:

```sh
docker compose --env-file deploy/.env exec app cat /app/private-data/setup-key.txt
```

Open the HTTPS address, enter the key, and create the supervisor account. Do not
paste the key into chat or logs. Once the supervisor exists, initial setup cannot
create another supervisor. Create workers, register/sync sources, and assign them.
Each worker opens the same HTTPS address and signs in on their own device.

## Persistence and backups

The `records` named volume contains the database, setup key, and backups. Restarting
or replacing containers preserves it. **Do not use `docker compose down --volumes`
on a real deployment**: that deletes its database and certificate volumes.

The backup service runs immediately after the app becomes healthy and every 24
hours after a successful backup, with a five-minute retry on failure. The existing
backup command checks SQLite integrity and retains the newest 30 verified copies.
Supervisor Manage team shows the latest successful backup. Check backup service
logs for failures. For an immediate copy:

```sh
docker compose --env-file deploy/.env exec app node scripts/backup-team.mjs
```

These copies share the server disk. Set up an encrypted copy to separate storage
before relying on the server for irreplaceable records; off-server backup is not
configured by this package. Unsynced browser records are not in server backups.

For recovery, stop the app and backup service. Preserve the current volume, restore
a verified backup to a separate volume, remove its saved sessions, and verify it
before replacing the production volume. Follow [team recovery](team-local.md#backups-and-recovery).
Never overwrite a running SQLite database or upload the entire private-data folder
into an image. The Docker build uses an allowlist that excludes private data,
environment files, Git history and local browser reports.

## Updates and rollback

Take a verified backup before each update. Keep the previous commit and image tag.
Check out the next tested commit, change the image tag in `deploy/.env`, then build
and start with the commands above. Only the app and backup containers need the new
image. Never delete volumes as part of an update.

To roll back code, restore the previous checkout and image tag and run
`docker compose --env-file deploy/.env up -d --no-build --wait`.
Code rollback does not roll back records; check database compatibility before
rolling back across a schema change.

## Existing local data

This deployment starts with its own empty database. Existing localhost accounts,
records and offline drafts remain on the computer. Export and verify device JSON
backups before changing addresses. A device JSON import transfers saved evidence,
not accounts or assignments. A full server migration uses a verified SQLite backup
with a planned cutover so two servers cannot accept competing edits. Migration is
a separate deliberate step; this package does not copy real records automatically.

## Verification

GitHub Actions builds the actual image, starts an isolated Compose project on
loopback ports, and verifies HTTPS with the test Caddy CA trusted only by the test
process. It checks login, Secure/HttpOnly cookies, rejected foreign origins, worker
permissions, records surviving restart, backup restore integrity and logout.
The regular unit and sandboxed browser release suites run alongside it.

After a real deployment, verify certificate validity, sign-in from a second device,
assignment access, offline save/reconnect, review handoff and an external backup
restore before starting a field pilot. No public deployment is implied by passing
the local or CI checks. Vercel Git deployments remain disabled.

References: [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting),
[Caddy proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy),
[Compose startup health checks](https://docs.docker.com/compose/how-tos/startup-order/).

## Privacy and security release gate (25 October 2026)

Operator supplied by the owner: Anubhav Harsh Sinha, India; public contact
`sinhaanubhavharsh@gmail.com`. `/privacy` describes current processing and `/terms`
is explicitly a draft for review, not a final agreement or an acceptance mechanism.
Both are linked from sign-in and the app and cached for offline access.

Owner decisions: field-record and inactive-account retention remain undecided;
automatic deletion is disabled. No separate backup destination exists yet.
These are open release requirements, not completed compliance controls.

Implemented controls include salted scrypt passwords, server-side assignment and
supervisor checks, origin validation, 12-hour session expiry, revocation, bounded
request parsing, single-process request throttling, and private Docker AI services.
The rate limits reset on process restart and are not shared across replicas: add
trusted proxy/provider rate and connection limits before public hosting. Do not
trust client-provided forwarded-IP headers as an identity or throttling key.

Field backup downloads optionally use AES-256-GCM, a random 16-byte salt and
12-byte nonce, and PBKDF2-SHA256 with 600,000 iterations. Passwords are not stored
or recoverable. Existing plain JSON downloads and recovery downloads remain
unencrypted. This option does not encrypt SQLite, automatic server backups,
browser storage, or files already downloaded. Use device/server disk encryption
and establish a separate encrypted backup destination with a tested restore.
The default server backup task retains 30 verified copies on the same volume.

After successful sign-out, an explicit typed-username confirmation can remove that
account's browser database, drafts and preferences. Server records, other accounts,
other devices and downloaded files are not deleted. A persistent removal marker
blocks stale tabs from reopening that database until a server-authenticated sign-in.
A device owner or same-origin script can alter browser storage; this is not a
cryptographic device lock. Use trusted locked devices, and never promise remote
revocation can erase a disconnected device. Close other app tabs before cleanup.

### Access, correction and deletion requests

1. Receive requests through the published privacy address. Never request passwords,
   full backups or identity documents by ordinary email.
2. Verify the requester through an appropriate existing account/organisation
   channel, identify the records and other people's interests, and log the request
   privately with an owner and status. Do not commit personal requests to Git.
3. Review applicable law and evidence-retention duties. Provide a scoped export
   excluding other workers' data, password hashes, session tokens and setup keys.
4. Use correction/review history for field-evidence corrections. A complete server
   deletion/anonymisation workflow is NOT implemented: ordinary sync deliberately
   rejects deletion. Do not promise immediate or automatic erasure.
5. Before server deletion is implemented, design a deletion ledger/tombstones that
   prevent stale offline devices or backup restores from resurrecting erased data.
   Include accounts, audit references, all device copies, voice/photo drafts,
   recovery copies and backup expiry. Obtain an explicit retention decision first.
6. Communicate the outcome and any justified limitations; document completion.

### Incident response

The operator coordinates incident response. Record discovery time, affected
systems and evidence without spreading sensitive data. Isolate the affected
service, revoke affected sessions/credentials, preserve protected forensic copies,
and determine the exposure and impacted people. Assess notification duties under
applicable law with qualified advice; do not apply a universal 72-hour user-email
rule. Notify relevant parties where required, restore from a verified clean copy,
validate access isolation and document prevention work. Do not erase evidence or
notify users automatically before assessing the incident.

### Licence and external-service review

Regenerate `docs/deployment/dependency-inventory.json` using
`node scripts/license-inventory.mjs > docs/deployment/dependency-inventory.json`.
This records package-lock metadata, not legal clearance. Review actual shipped
artefacts and preserve required notices/source availability. The lockfile includes
libvips/sharp components labelled LGPL-3.0-or-later, Lightning CSS components
labelled MPL-2.0, and caniuse-lite labelled CC-BY-4.0, as well as permissive licences.
The project's MIT licence does not replace dependency licences.

Also review Docker base images, Ollama, the exact Qwen model/tag, faster-whisper and
its model weights, map data/tiles, the government district directory, screenshots,
fonts and artwork. Record versions and retain upstream notices before distribution.
No trademark clearance or DMCA registration has been performed. A legal review of
the JalRakshak name and final terms remains an owner action.

Maps contact `tile.openstreetmap.org`; disclose network metadata and viewed-area
requests. Do not bulk-download its tiles for offline use. Consult the current
OSMF privacy and tile policies. No analytics/ad SDK is currently included; adding
one requires a new data-flow and consent assessment, not just editing a banner.

Do not mark production readiness complete until retention, server deletion design,
off-device backups, host encryption, legal/licence review and the real hosting
provider's processing/incident arrangements are resolved.
