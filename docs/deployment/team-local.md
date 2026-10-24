# Multi-worker field workspace

The home page is the team workspace. Workers see only sources assigned to them;
supervisors can see all sources, create accounts, reassign sources, reset passwords
and disable accounts. Workers registering a new source receive its assignment.
Server-side authorization protects every records and management request.

## Local start and initial setup

Use Node 22.16+ (Node 24 LTS recommended), `npm ci`, `npm run build -- --webpack`,
then `npm run start -- --hostname 127.0.0.1 --port 3000`.

Open `http://localhost:3000` consistently in the same browser. On first access the
server creates a random setup key in `private-data/setup-key.txt` with owner-only
permissions. Enter that key in the setup form and choose your supervisor username
and a password of at least 12 characters. There are no default production accounts.
The key cannot create another initial supervisor after setup finishes. Alternatively
set `JALRAKSHAK_SETUP_TOKEN` before starting the server.

The supervisor creates worker accounts under **Manage team**. Share credentials
privately. Register sources and **Sync now**, then assign each source to its worker.
Workers sign in with their own accounts and sync before and after visits.

## Offline records and synchronization

Each account has its own IndexedDB database and form-draft keys. A worker can
continue in the same trusted browser offline after signing in online. Cached access
expires after 12 hours; signing in to a new device requires a connection. This is
not encryption at rest: anyone controlling the browser profile/device may inspect
its local storage. Use separate trusted devices or OS/browser profiles.

**Save locally** retains work on the current device. Saved records upload automatically
after four seconds while the app is open and online, on reconnect, and on a 30-second
retry timer. The pending count counts changed source, measurement and investigation
records (not visits). **Sync now** remains available. Unfinished forms are never uploaded.
Automatic upload pauses during team management and conflict review. It does not pull
remote changes into an unfinished form; use Sync now to refresh shared records. A network connection indicator alone does not mean work was synced.
A successful sync is explicitly confirmed. A stale server revision blocks the
entire submission; another worker's data is never silently overwritten. Independent
workers' source sets do not conflict. Lost-response retries of identical data are
idempotent. Saved measurement snapshots and existing investigation events cannot
be rewritten through sync.

On a conflict, automatic sync pauses. **Review sync conflict** compares the previous
snapshot, device records and current shared records. Independent changes combine;
overlapping source fields require explicit choices. Saved measurement snapshots and
already-saved investigation events cannot be overwritten. Reassigned source records
cannot be restored to a worker without authorization. The original device data is
saved in account-specific recovery storage before any resolution request. **Download
latest recovery backup** exports it in the normal field backup format. Older recovery
copies are retained in the account's IndexedDB teamState table. Browser data clearing
still removes these copies; export them if needed. A stale server revision or local
edit during resolution aborts replacement; refresh the comparison and review again.

Reassignment and disabled-account restrictions apply at the next server request.
Previously downloaded records cannot be remotely erased while a device is offline.
Automatic sync requires the app to be open; it does not run after the browser closes.

## Backups and recovery

**Backup & device** downloads saved records visible to the current account,
including source photos and investigation history. It excludes accounts, drafts,
legacy records and training data. JSON files are unencrypted and limited to 50 MB.
Restore previews new record counts, skips identical records and refuses conflicting
IDs/codes. All writes commit together or roll back. Restored team records still
need **Sync now** and pass server assignment checks.

The shared SQLite database defaults to `private-data/team.sqlite`. Override it with
`JALRAKSHAK_TEAM_DB` on a persistent local disk. Run `npm run backup:team` to make a
consistent SQLite backup while the server is running. This includes password hashes,
accounts, assignments, sessions, audit records and synced field data; keep it private
and copy it to separate storage. Unsynced device changes require device backups.

For server recovery, stop the server first, preserve the current database and its
`-wal`/`-shm` companions, and restore the selected backup to a **new** path. Point
`JALRAKSHAK_TEAM_DB` at that path. Remove rows from `sessions` in the recovered copy
before restarting so restored sessions cannot be reused. Verify accounts and record
counts before resuming field work. Never copy a live database file as a substitute
for the SQLite backup command.

Existing device-only records are preserved at `/personal`. Export a field JSON
backup there, then restore it explicitly while signed into the appropriate team
account. Legacy screening/EC records remain in their original tables and are not
converted into field evidence. Practice tools remain separate from real records.

## Multiple physical devices

Localhost is for local use and verification. Other devices need one shared HTTPS
address, a continuously running Node server, and durable disk storage. Configure a
reverse proxy to preserve the request origin and terminate HTTPS. Do not run this
SQLite configuration on an ephemeral/serverless filesystem or several independent
server instances. No Vercel deployment or hosting changes were made.

The SQLite audit log records authenticated actors for sync, account and assignment
changes. EC records support measurement tracking and follow-up; they do not certify
water safety or identify contaminants. Physical measurements must come from an
appropriate instrument and workflow.

## Scheduled local backups (macOS)

Run `npm run backup:schedule` once to install the `local.jalrakshak.backup` login
agent. It runs at 18:00 local time daily and at agent load/login. The computer must
be on and the user logged in; launchd coalesces calendar events missed during sleep
when the computer wakes. No remote backup or Vercel service is involved.

Each run makes a consistent SQLite copy, verifies integrity and the required tables,
then atomically publishes it and updates `private-data/backups/status.json`. Only
after success are older scheduled copies pruned to the latest 30. Backup directories
are private (0700) and files are owner-only (0600). Supervisor **Manage team** shows
the last successful backup time and record count; a stale timestamp needs attention.
Logs are in `private-data/backup-logs/`. These backups only include synced records.

Check the schedule: `launchctl print gui/$(id -u)/local.jalrakshak.backup`.
Run immediately: `npm run backup:team`.
Disable: `launchctl bootout gui/$(id -u)/local.jalrakshak.backup`.
To prevent reloading at login, remove its plist from `~/Library/LaunchAgents/` after
disabling it. Reinstall the schedule if the repository or Node installation moves.
Copy backups to another disk to protect against loss of this computer.

## Backup health

Supervisors can open **Dashboard → Backup & device** or **Manage team** to check
backup health. The server checks the latest verified backup metadata and confirms
that the named copy still exists with the expected size. A copy older than 26 hours
is overdue. A newer failed attempt is shown separately and never replaces the last
successful backup. Missing, failed and unreadable metadata are not shown as healthy.
Refresh requires a server connection; the display includes its check time.

Backup-time checks open the copied SQLite database, verify integrity and foreign
keys, and read the required tables. This is not a full application restore drill,
nor proof of an off-device copy. Follow the recovery procedure above to verify a
separate restored instance. The health API is supervisor-only and omits file paths,
credentials and record contents. If disk permissions or disk exhaustion prevent
writing failure metadata, the prior backup will eventually become overdue; inspect
the backup job logs to diagnose the cause. The panel does not install a scheduler.
