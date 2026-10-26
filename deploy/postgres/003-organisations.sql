BEGIN;
SELECT pg_advisory_xact_lock(67420126);
CREATE TABLE IF NOT EXISTS organisations (id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT NOT NULL);
INSERT INTO organisations(id,name,created_at) VALUES('legacy','JalRakshak team',now()::text) ON CONFLICT DO NOTHING;
ALTER TABLE users ADD COLUMN IF NOT EXISTS organisation_id TEXT NOT NULL DEFAULT 'legacy' REFERENCES organisations(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_subject TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS users_verified_email ON users(email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_google_subject ON users(google_subject) WHERE google_subject IS NOT NULL;
ALTER TABLE records ADD COLUMN IF NOT EXISTS organisation_id TEXT NOT NULL DEFAULT 'legacy' REFERENCES organisations(id);
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS organisation_id TEXT NOT NULL DEFAULT 'legacy' REFERENCES organisations(id);
ALTER TABLE audit ADD COLUMN IF NOT EXISTS organisation_id TEXT NOT NULL DEFAULT 'legacy' REFERENCES organisations(id);
ALTER TABLE records DROP CONSTRAINT IF EXISTS records_pkey;
ALTER TABLE records ADD PRIMARY KEY(organisation_id,kind,id);
ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_pkey;
ALTER TABLE assignments ADD PRIMARY KEY(organisation_id,source_id);
DROP INDEX IF EXISTS sources_code;
CREATE UNIQUE INDEX IF NOT EXISTS organisation_source_code ON records (organisation_id,(body::jsonb ->> 'code')) WHERE kind='sources';
CREATE INDEX IF NOT EXISTS users_organisation ON users(organisation_id);
CREATE INDEX IF NOT EXISTS audit_organisation ON audit(organisation_id,id);
CREATE TABLE IF NOT EXISTS onboarding_tokens (
 token_hash TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('verify','invite','google-state','google-verified')),
 email TEXT NOT NULL, organisation_id TEXT REFERENCES organisations(id), inviter_id TEXT REFERENCES users(id),
 payload JSONB NOT NULL DEFAULT '{}', expires BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS onboarding_expiry ON onboarding_tokens(expires);
CREATE TABLE IF NOT EXISTS onboarding_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at BIGINT NOT NULL);
COMMIT;
