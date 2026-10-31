# Organisation signup

Hosted PostgreSQL installations can offer email verification and Google sign-in. Each new supervisor creates an isolated organisation. Workers join through a supervisor's email invitation. The existing team remains in the `legacy` organisation; no existing account or field record is deleted.

## Enable after migration

1. Back up the PostgreSQL database and apply all migrations with `node scripts/migrate-postgres.mjs`. Migration 003 scopes records, assignments and source-code uniqueness by organisation.
2. Configure `JALRAKSHAK_PUBLIC_ORIGIN` to the site's HTTPS origin and `JALRAKSHAK_ALLOW_SIGNUP=1` to allow new public organisation registrations. Leave the flag unset to close public registration; existing Google accounts, password recovery, recovery-email settings and supervisor-issued invitations continue to work with their configured providers.
3. Email verification/invitations use the existing `JALRAKSHAK_GMAIL_USER` and secret `JALRAKSHAK_GMAIL_APP_PASSWORD`. Links expire after 30 minutes. Public email sending has persistent hourly limits (three per address, 100 overall).
4. For Google, configure `GOOGLE_CLIENT_ID` and secret `GOOGLE_CLIENT_SECRET`. Register exactly `https://YOUR-HOST/api/onboarding/google/callback` as the OAuth web client's redirect URI. Request only openid, email and profile. Configure Google's audience/test users before testing; release to the intended audience only when ready.
5. Deploy, then test with two separate organisations and an invited worker. Check records, accounts, assignments and reports cannot cross organisation boundaries.

The initial setup-key flow remains available for the original private team. SQLite installations retain private team setup and do not expose public onboarding.

## Account flow

Email signup: request link → verify email → enter name, unique username, password and organisation → supervisor workspace. Google signup verifies identity first and then asks for the organisation and username. Returning Google users sign in directly. Google identities are not automatically linked to existing password accounts with matching emails; those users must use their existing login.

Manage team → Invite a worker → email link → worker chooses name, unique username and password. The server fixes the organisation and worker role; an invitation cannot create a supervisor. Invitations become unusable if the inviting supervisor loses active supervisor access.

Each email belongs to one account, and usernames are globally unique. Google-created accounts have no user-chosen password; use Google to sign in. Supervisors can reset passwords for accounts within their organisation using the existing controls.

No Google access or refresh tokens are stored. Only the verified account identifier and email are retained. OAuth uses PKCE, nonce, browser-bound state and signed ID-token validation. One-use verification tokens are stored as hashes. Signup does not grant Gmail or Drive access.

Before releasing publicly, test real email delivery and Google redirects on the deployed HTTPS origin. Automated tests use isolated records and signed test tokens; they do not replace provider-console verification.
