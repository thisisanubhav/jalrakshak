BEGIN;
SELECT pg_advisory_xact_lock(67420126);
ALTER TABLE onboarding_tokens DROP CONSTRAINT IF EXISTS onboarding_tokens_kind_check;
ALTER TABLE onboarding_tokens ADD CONSTRAINT onboarding_tokens_kind_check CHECK(kind IN ('verify','invite','google-state','google-verified','reset'));
COMMIT;
