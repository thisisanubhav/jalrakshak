BEGIN;
SELECT pg_advisory_xact_lock(67420126);
CREATE TABLE IF NOT EXISTS recovery_email_tokens (
 token_hash TEXT PRIMARY KEY,
 user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
 email TEXT NOT NULL,
 previous_email TEXT,
 password_version TEXT NOT NULL,
 expires BIGINT NOT NULL
);
COMMIT;
