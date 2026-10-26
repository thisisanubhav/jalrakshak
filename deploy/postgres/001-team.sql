BEGIN;
SELECT pg_advisory_xact_lock(67420126);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('worker','supervisor')), password TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1))
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS records (
  kind TEXT NOT NULL CHECK (kind IN ('sources','measurements','investigations')),
  id TEXT NOT NULL, source_id TEXT NOT NULL, body TEXT NOT NULL,
  PRIMARY KEY(kind,id)
);
CREATE TABLE IF NOT EXISTS assignments (
  source_id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS audit (
  id SERIAL PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, at TEXT NOT NULL, detail TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS attempts (
  username TEXT PRIMARY KEY, count INTEGER NOT NULL, since BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS records_source ON records(source_id);
CREATE INDEX IF NOT EXISTS assignments_worker ON assignments(user_id);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires);
CREATE UNIQUE INDEX IF NOT EXISTS sources_code ON records ((body::jsonb ->> 'code')) WHERE kind='sources';
COMMIT;
