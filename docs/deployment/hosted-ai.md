# Hosted AI with Groq

Set `GROQ_API_KEY` as a server-only Production secret in Vercel, then deploy code that includes the Groq adapter. A key selects Groq automatically; `JALRAKSHAK_AI_PROVIDER=local` explicitly retains Ollama/Whisper, and `disabled` turns AI off. Unknown provider settings fail closed. Never use a `NEXT_PUBLIC_` secret or commit a key.

The adapter uses `whisper-large-v3-turbo` for English/Hindi transcription and `openai/gpt-oss-20b` for structured evidence selection. It retains the existing validation, account checks and review-before-save workflow. Model text cannot replace measured values: only validated indices select recorded facts. Photos are not uploaded; requested captions can be included. No background AI jobs run.

## Free plan and data controls

Keep the Groq organisation on **Free**; do not add paid upgrades. The app cannot verify the account’s billing tier. Provider quotas are shared by the organisation; a 429 shows a usage-limit message, with no automatic retries or paid fallback. Application concurrency/rate limits are per server process, not a global serverless quota. Manual records remain available during limits or outages.

Review [Groq limits](https://console.groq.com/docs/rate-limits) and [data handling](https://console.groq.com/docs/your-data). Enable Zero Data Retention in Groq’s Data Controls if appropriate and verify the setting there. This app cannot guarantee that setting. Do not send unnecessary personal information. Audio is transmitted only on Transcribe; drafts and reports transmit selected text only on request. Both languages show the processing notice.

## Verify before rollout

Use a separate Preview deployment/database with fictional records. Supply a restricted test key privately to Preview if live inference is needed; do not copy production records. Test English/Hindi notes, a short recording in each language, source history and monthly reports. Confirm required readings remain unchanged; invalid model output must be rejected. Verify unauthenticated users and workers cannot request supervisor summaries, and revoked sessions cannot retrieve completed results.

Automated contract tests mock Groq, including quota/auth errors, malformed output and output bounds. They do not prove a real key is valid, available account models, transcription accuracy or account billing settings. A production secret cannot be verified by local mocked tests.

## Rotate or disable

Create a replacement at https://console.groq.com/keys, update the Vercel secret, redeploy, verify a fictional request, then revoke the old key. Set `JALRAKSHAK_AI_PROVIDER=disabled` and redeploy to stop all AI calls. The request timeout is 45 seconds, with no automatic retry; saved field records are not changed on failure.
