# JalRakshak with private AI in Docker

This is an optional overlay for the [shared HTTPS deployment](docker.md). It runs
one app/SQLite database, Caddy, daily backups, Ollama and a CPU speech service.
There is no cloud inference, paid API or public deployment. Workers still review
all AI output. Manual records remain usable when AI is unavailable.

## Local startup

Install/start Docker Engine with Compose v2 (OrbStack or Docker Desktop on macOS).
Allow roughly 8 GB RAM and 15 GB free disk as a starting budget for builds, models
and records; actual capacity depends on usage. CPU inference is slower than the
native Mac GPU runtime. Do not run production AI on an undersized server without
measuring its response times. Leave the existing localhost:3000 service running
if needed: this stack uses its own database and https://localhost:3443.

From the repository root:

```sh
cp deploy/local-ai.env.example deploy/local-ai.env
# Every command must use the same env file / project name.
docker compose --env-file deploy/local-ai.env config --quiet
docker compose --env-file deploy/local-ai.env build app whisper
# Explicit initial downloads; internet is needed only for installation/updates.
docker compose --env-file deploy/local-ai.env run --rm ollama-pull
docker compose --env-file deploy/local-ai.env run --rm whisper-download
docker compose --env-file deploy/local-ai.env up -d --wait --wait-timeout 180
docker compose --env-file deploy/local-ai.env ps
```

Do not run model download jobs while their matching runtime is serving requests.
Ollama is pinned to 0.40.10 with qwen2.5:1.5b. Speech uses faster-whisper 1.2.1 and
a pinned multilingual small-model revision. Model weights persist in named volumes.
The first start fails health checks if models have not been downloaded. The app
has no AI startup dependency: missing AI must not prevent access to records.

Caddy issues a local CA certificate for localhost. Export that public CA:

```sh
docker compose --env-file deploy/local-ai.env cp https:/data/caddy/pki/authorities/local/root.crt /tmp/jalrakshak-local-ca.crt
```

For scripted verification, use `NODE_EXTRA_CA_CERTS=/tmp/jalrakshak-local-ca.crt`.
For browser use, deliberately trust this local development CA in your OS/browser,
or use a real HTTPS domain later. Do not disable TLS validation or upload the CA
private key. This package does not automatically change the Mac trust store.
Phones cannot reach these loopback bindings; device access requires a deliberate
network/domain setup with a trusted certificate.

Retrieve the setup key privately using `exec app cat /app/private-data/setup-key.txt`,
create the first supervisor, then add workers and assign sources. Never paste the
key into logs, commits or chat. The native app's accounts and records are not copied.

## Private services and failure behaviour

Only Caddy publishes host ports. Ollama and speech join an `internal: true` network
with the app; they have no host ports or external network route. The proxy and
backup service do not join the AI network. Explicit setup containers use a separate
network with internet access to download weights; they are removed after use.
Cloud mode is disabled. Speech runs without root and with a read-only filesystem;
recordings stay in memory. Do not expose ports 11434 or 8178 to users.

There are at most two in-flight app AI requests, one per account. Additional
requests receive a busy response. Ollama processes one generation at a time, and
speech accepts one transcription at a time. Requests time out rather than queue
indefinitely. These limits are an initial deployment choice, not a capacity claim.

Services use `restart: unless-stopped`; they restart after process failure or daemon
restart unless intentionally stopped. Health checks identify missing models or a
failed adapter. Docker does **not** restart a merely unhealthy but running process:
inspect logs and restart it explicitly. Docker itself must start at machine login
or host boot; sleeping/shutting down a Mac stops availability.

```sh
docker compose --env-file deploy/local-ai.env logs --tail 50 app ollama whisper backups
docker compose --env-file deploy/local-ai.env restart ollama whisper
docker compose --env-file deploy/local-ai.env up -d --wait --wait-timeout 180
```

If AI fails, retain manual notes and check service health. Stopping AI does not
stop the app or sync. Losing the app server stops shared sync; available offline
records remain in the worker's browser. AI does not run offline on the phone.

## Backups, restoration and updates

Use the database backup command from [Docker operations](docker.md#persistence-and-backups).
Copy a verified backup file out of the records volume to a separate disk/device.
A named volume or another folder on the same Mac is **not** an off-device backup.
The package cannot verify a second device exists until an operator supplies one.
Models can be downloaded again; the database, certificates and account credentials
need appropriate recovery planning. Unsynced browser records are excluded.

The automated smoke test exports a verified backup, restores it into a different
volume, clears sessions, starts a separate app, and checks login and assigned records.
It never replaces the original database. Follow [recovery instructions](team-local.md#backups-and-recovery)
for a real incident. Never overwrite a live database or use `down --volumes` on
real data.

Before an update, take and export a verified backup. Keep the previous checkout
and image tag, build the next tested version, and use `up -d --wait`. Stop only AI
before changing model files. Do not delete named volumes. Roll back to retained
images only after checking database compatibility. Re-run login, sync, AI and
backup checks after updates. On a future server use `compose.yaml` plus
`compose.ai.yaml`, real domain settings and persistent disks; no code change is
needed to the worker flow. Do not scale app replicas independently with SQLite.

## Automated verification

The existing GitHub Actions shared-server job now builds this actual overlay and
downloads its real models. It checks HTTPS sessions, worker assignment isolation,
three-account AI requests, factual history/monthly output, silence handling,
manual saves during AI outages, private networking, service restart/model persistence,
and a full application restore. The browser suite runs separately. These checks
use fictional data and are not a benchmark for a large field team.

References: [Ollama Docker](https://docs.ollama.com/docker),
[Docker internal networks](https://docs.docker.com/reference/compose-file/networks/),
[Compose health and restart behaviour](https://docs.docker.com/reference/compose-file/services/).
