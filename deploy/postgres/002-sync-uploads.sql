BEGIN;
SELECT pg_advisory_xact_lock(67420126);
CREATE TABLE IF NOT EXISTS sync_uploads (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), session_hash TEXT NOT NULL,
  parts INTEGER NOT NULL CHECK(parts BETWEEN 1 AND 256), bytes INTEGER NOT NULL DEFAULT 0,
  expires BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS sync_parts (
  upload_id TEXT NOT NULL REFERENCES sync_uploads(id) ON DELETE CASCADE,
  part INTEGER NOT NULL, body TEXT NOT NULL, PRIMARY KEY(upload_id,part)
);
CREATE INDEX IF NOT EXISTS sync_uploads_expiry ON sync_uploads(expires);
COMMIT;
