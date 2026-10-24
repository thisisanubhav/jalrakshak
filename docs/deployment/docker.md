# Shared HTTPS server with Docker

This package runs the existing multi-worker backend on one Docker server. It
does not create a hosting account, register a domain, or migrate local records.
Use a Linux server with Docker Engine and Compose v2, durable storage, and a
domain whose DNS points to that server. Permit inbound TCP 80/443 for the HTTPS
proxy. Keep SSH restricted to administrators. Do not publish application port
3000 or scale the app to independent replicas: this deployment uses one SQLite
database, not a distributed database.

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
