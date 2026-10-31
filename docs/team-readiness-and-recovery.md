# Team readiness and recovery

Prepare devices for fieldwork, manage invitations and recover access without losing team records.

## Daily work

- **Home → Before you go offline:** inspect cached account expiry, cached app, local sources, pending records, approximate site storage and the last backup download request. Check once in airplane mode before travel. Storage estimates cover the whole site, not just the signed-in account. This is a checklist, not a guarantee of available space or a verified backup.
- **Home → Unfinished visits:** resume a source's draft, including a linked correction or retest. Discard requires confirmation and removes that draft's notes, photos and audio, not saved visits. Close other app tabs before discarding. Older drafts may have no edit timestamp. Drafts remain device-only and are excluded from field backups.
- **Register/edit source:** a normalized matching name in the same village/district/state, or GPS coordinates within 30 metres, produces a warning. Nearby sources can be distinct; no automatic merge occurs. Warnings use available device records, so sync first.
- **Source → Visit plan:** replacing or cancelling a plan requires a reason. Prior plans and reasons stay in source history and backups. Only supervisors can change team plans. This replaces the plan, not one occurrence within a recurring plan. Existing reports continue to use current plans.
- **Supervisor overview:** workload shows current assignments, saved visits over the last 30 days and overdue sources. These counts are not worker performance attribution. Activity filters search the latest 200 events; new sync events identify affected sources. Older events may not.

## Invitations and account recovery

Hosted PostgreSQL installations with a public HTTPS origin support account recovery and invitations. Gmail configuration is required to send email. Closing public signup does not disable existing-account login, recovery or worker invitations:

- **Manage team → Manage invitations:** list up to 100 invitations issued/expired within the last 30 days, resend or revoke. Resending replaces the previous link. Email delivery failures require sending a new invitation; no mail is sent by merely opening the page. Worker roles and organisation scope remain enforced by the server.
- **Sign in → Forgot password?:** verified-email/password accounts receive a single-use, 30-minute link. The response does not disclose whether an eligible account exists. Unknown, disabled and Google accounts do not receive recovery mail. Google users continue with Google; accounts without verified email need a supervisor reset.
- Recovery changes the password and revokes existing server sessions. Previously cached offline access cannot be remotely erased; its existing expiry still applies.
- Email rate limits apply to signup, invitations and recovery. Requests need the configured same origin. Tokens are hashed in storage and removed from the recovery page address bar.

## Deployment prerequisite

Back up the hosted database, then run the existing migration tool with `DATABASE_URL` configured privately:

```sh
node scripts/migrate-postgres.mjs
```

The hosted schema includes `004-account-recovery.sql` for password-reset tokens and
`005-recovery-email.sql` for verifying recovery email on existing accounts. Apply
required migrations before deploying code that uses them; do not rerun individual
SQL files manually in place of the migration runner. Existing accounts and field
records are retained. SQLite installations use supervisor-managed accounts and
password resets. See the [environment reference](deployment/environment.md) for
private configuration; the command requires `DATABASE_URL` in its environment.

## Recovery email for existing username accounts

Open **Account settings** from the signed-in toolbar. Enter an email you own and your current JalRakshak password, then open the verification email within 30 minutes. Stay signed in to the same account and choose **Verify recovery email**. Your username and field records do not change. Existing verified email remains active until replacement is confirmed; old password-reset links are invalidated on replacement.

Google accounts continue managing access through Google. Local SQLite installations do not offer hosted recovery-email settings. Hosted status and confirmation do not depend on public signup or Gmail availability; sending a new verification email does require Gmail configuration. Verification requires a connection; no password or email draft is saved offline. If signed out when opening the link, sign in and reopen the email. Email delivery failure asks you to request a fresh link.

Pending verification tokens are hashed, account-bound, single-use and expire after 30 minutes. Changing the account password invalidates pending email verification. Request limits persist across failed password attempts. New requests supersede previous links; accounts cannot claim an email already used by another account.

After successful verification, a failed status refresh does not undo the change.
The page keeps the success confirmation, hides stale account details and offers
a reload action. Reload when connected to fetch the current account status.
