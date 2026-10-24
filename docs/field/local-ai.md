# Local voice notes and visit summaries

AI is optional. Manual notes, measurement checks, assignments and review decisions
continue to work without it. No paid API or public deployment is required.

## Worker flow

Open **Tests → Record Measurement → Voice notes & AI draft**. Choose English or
Hindi and record up to 60 seconds. Stop recording before leaving the form. The
recording stays in this account's browser storage until **Transcribe recording**+is selected. Play it back, edit the transcript, then either use the transcript
directly or choose **Draft observation note**. Review the editable result before
adding it to the visit's existing notes. Nothing is submitted automatically.

Recording works offline in supported browsers on localhost or HTTPS. Permission
denial leaves typing available. Transcription and drafting need a signed-in team
account and access to the local application server and its AI services. Reconnect
and retry explicitly; reconnecting does not upload audio automatically.

Voice drafts survive reload in the same account/source/form. They are not in team
sync or exported backups. Save the visit to retain the reviewed text; the temporary
voice draft is then cleared. Delete an unwanted recording with **Delete recording**.
Browser storage clearing or eviction removes voice drafts. Navigating away during
recording stops the microphone and discards the unfinished recording.

## Supervisor flow

Open **Dashboard → Investigations → Visit review queue**. Expand **AI visit summary**
on a visit and select **Summarize visit**. Sync the visit first. Summaries use the
server's saved readings, quality/comparison results, notes, photo captions and
linked follow-up. Images are not analysed. Recent history is bounded; open the source
evidence for the full record. Unsynced local changes are not included.

Edit the draft, optionally add it to the review note, and separately choose and save
the review decision. AI never approves a visit. A changed server snapshot or expired
session during generation rejects the result. Summary drafts are temporary and are
discarded when leaving the review form unless copied into a saved review note.

## Local setup on macOS

Install Ollama and uv, then obtain a multilingual faster-whisper model. A cached
`Systran/faster-whisper-base` model is detected automatically by `npm run ai:local`.
To download it once (internet is needed for installation, not inference):

```sh
brew install ollama uv
uv run --python 3.12 --with huggingface-hub python -c "from huggingface_hub import snapshot_download; print(snapshot_download('Systran/faster-whisper-base'))"
```

For another downloaded model, set `JALRAKSHAK_WHISPER_MODEL` to its directory.
Use a multilingual model, not an English-only `.en` model. Accuracy varies with
accent, background noise and model size; always review the transcript.

Add these server-only settings to `.env.local` (never `NEXT_PUBLIC_*`):

```dotenv
JALRAKSHAK_OLLAMA_URL=http://127.0.0.1:11434
JALRAKSHAK_WHISPER_URL=http://127.0.0.1:8178
JALRAKSHAK_AI_MODEL=qwen2.5:1.5b
```

Start the companion services, then download the text model in a second terminal:

```sh
npm run ai:local
# In a second terminal, once Ollama is listening:
OLLAMA_HOST=127.0.0.1:11434 ollama pull qwen2.5:1.5b
```

Restart the JalRakshak app after configuring its environment. `npm run ai:local`
runs both services in the foreground; Ctrl+C stops them. It does not create a login
agent or auto-start them after reboot. The app shows a retry/manual-entry message
when a companion service is stopped. Text models are stored under
`private-data/ai-models/ollama`; speech models remain in the local Hugging Face cache.

The supplied companion launcher targets a native local Node app. The existing
Docker app remains usable without AI; it does not automatically start these host
services. Containerized or shared-network AI needs separate private-network wiring.
Never expose unauthenticated model ports to workers or the internet.

## Boundaries and verification

- Inference stays on the configured local service. Ollama starts with
  `OLLAMA_NO_CLOUD=1`; the speech service loads an existing model with network access
  disabled. Audio is processed in memory, not retained by the speech server.
- AI API requests require the team session, matching account and same origin.
  Only supervisors can request a visit summary. The server selects stored evidence;
  a client cannot supply another account's record body for summarization.
- Requests and audio are bounded; at most two app AI requests run concurrently,
  with one per account and a two-minute provider timeout. Invalid output produces
  an error rather than a fabricated success. Generated text is displayed as text.
- Model output remains untrusted: it can omit, mistranscribe or invent information.
  Human review is required. It does not certify water safety or identify contaminants.
- CI tests use deterministic provider responses, not downloaded models. Tests cover
  permissions, stale sessions/evidence, audio validation, offline recording recovery,
  manual fallback and explicit use before saving. Real local model smoke checks are
  separate from the automated browser suite.

Provider contracts: [Ollama generation API](https://docs.ollama.com/api/generate),
[Ollama local-only mode](https://docs.ollama.com/faq),
[faster-whisper](https://github.com/SYSTRAN/faster-whisper).
