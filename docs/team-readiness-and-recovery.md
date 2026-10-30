# Team readiness and recovery

This update builds on the workflow guidance in PR #32.

## Daily work

- **Home → Before you go offline:** inspect cached account expiry, cached app, local sources, pending records, approximate site storage and the last backup download request. Check once in airplane mode before travel. Storage estimates cover the whole site, not just the signed-in account. This is a checklist, not a guarantee of available space or a verified backup.
- **Home → Unfinished visits:** resume a source's draft, including a linked correction or retest. Discard requires confirmation and removes that draft's notes, photos and audio, not saved visits. Close other app tabs before discarding. Older drafts may have no edit timestamp. Drafts remain device-only and are excluded from field backups.
- **Register/edit source:** a normalized matching name in the same village/district/state, or GPS coordinates within 30 metres, produces a warning. Nearby sources can be distinct; no automatic merge occurs. Warnings use available device records, so sync first.
- **Source → Visit plan:** replacing or cancelling a plan requires a reason. Prior plans and reasons stay in source history and backups. Only supervisors can change team plans. This replaces the plan, not one occurrence within a recurring plan. Existing reports continue to use current plans.
- **Supervisor overview:** workload shows current assignments, saved visits over the last 30 days and overdue sources. These counts are not worker performance attribution. Activity filters search the latest 200 events; new sync events identify affected sources. Older events may not.

## Invitations and account recovery

Hosted PostgreSQL installations with signup, public HTTPS origin and Gmail configured support these features:

- **Manage team → Manage invitations:** list up to 100 invitations issued/expired within the last 30 days, resend or revoke. Resending replaces the previous link. Email delivery failures require sending a new invitation; no mail is sent by merely opening the page. Worker roles and organisation scope remain enforced by the server.
- **Sign in → Reset password by email:** verified-email/password accounts receive a single-use, 30-minute link. The response does not disclose whether an eligible account exists. Unknown, disabled and Google accounts do not receive recovery mail. Google users continue with Google; accounts without verified email need a supervisor reset.
- Recovery changes the password and revokes existing server sessions. Previously cached offline access cannot be remotely erased; its existing expiry still applies.
- Email rate limits apply to signup, invitations and recovery. Requests need the configured same origin. Tokens are hashed in storage and removed from the recovery page address bar.

## Deployment prerequisite

Back up the hosted database, then run the existing migration tool with `DATABASE_URL` configured privately:

```sh
node scripts/migrate-postgres.mjs
```

Migration `004-account-recovery.sql` permits password-reset tokens. Apply it **before** releasing this application version. It does not alter existing accounts or field records. No new environment variables are required. SQLite installations retain supervisor-managed accounts and password resets.

This task does not apply migrations to production, merge a PR or deploy.

## Recovery email for existing username accounts

Open **Account settings** from the signed-in toolbar. Enter an email you own and your current JalRakshak password, then open the verification email within 30 minutes. Stay signed in to the same account and choose **Verify recovery email**. Your username and field records do not change. Existing verified email remains active until replacement is confirmed; old password-reset links are invalidated on replacement.

Google accounts continue managing access through Google. Local SQLite installations and hosts without signup/email configuration show that hosted account settings are unavailable. Verification requires a connection; no password or email draft is saved offline. If signed out when opening the link, sign in and reopen the email. Email delivery failure asks you to request a fresh link.

Deployments must back up PostgreSQL and apply `005-recovery-email.sql` using the existing migration runner before releasing this feature. Pending verification tokens are hashed, account-bound, single-use and expire after 30 minutes. Changing the account password invalidates pending email verification. Request limits persist across failed password attempts. New requests supersede previous links; accounts cannot claim an email already used by another account. No production migration or email attachment is performed by opening a PR.
