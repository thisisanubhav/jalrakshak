# Local voice notes and visit summaries

AI is optional. Manual notes, measurement checks, assignments and review decisions
continue to work without it. No paid API or public deployment is required.

## Worker flow

Open **Tests → Record Measurement → Voice notes & AI draft**. Choose English or
Hindi and record up to 60 seconds. Stop recording before leaving the form. The
recording stays in this account's browser storage until **Transcribe recording**
is selected. Play it back, edit the transcript, then either use the transcript
directly or choose **Draft observation note**. Review the editable result before
adding it to the visit's existing notes. Nothing is submitted automatically.
The model selects relevant transcript sentences; the app copies the selected
sentences verbatim rather than accepting newly invented prose. Original wording
and language are preserved. You can still edit the result yourself.

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
evidence for the full record. Unsynced local changes are not included. Source,
date, readings, quality/comparison flags and the beginning of the recorded note
are always retained. AI selects additional evidence; it cannot generate new facts.

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
Docker can run the complete private AI stack with the optional
[AI deployment overlay](../deployment/docker-ai.md). The base Docker app remains
usable without AI. The native startup command above is separate from Docker.

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
- Speech recognition can mistranscribe or invent words; evidence selection can omit
  context. Human review is required. Neither certifies water safety or identifies
  contaminants. Drafts use original wording; they are not automatic translations.
- CI tests use deterministic provider responses, not downloaded models. Tests cover
  permissions, stale sessions/evidence, audio validation, offline recording recovery,
  manual fallback and explicit use before saving. Real local model smoke checks are
  separate from the automated browser suite.

Provider contracts: [Ollama generation API](https://docs.ollama.com/api/generate),
[Ollama local-only mode](https://docs.ollama.com/faq),
[faster-whisper](https://github.com/SYSTRAN/faster-whisper).

## Source history and monthly drafts

Supervisors can open **Tests → History → AI source history summary**, or
**Dashboard → Reports → Monthly reports → AI monthly report draft**.
Sync before generating. Expand the panel, generate, edit, check the evidence,
and confirm review to download a text file. Editing clears that confirmation.
These temporary drafts never save records, change reviews, or certify water safety.
Leaving the view or changing report filters clears the draft; download it first.

History considers the selected source's latest 10 synced visits and latest five
investigations, with shortened notes. Monthly drafts retain computed totals for
all matching synced records and consider up to 10 latest reviewed visit notes.
Monthly filters match the report controls. Server calendar boundaries apply to
AI totals; the device report may differ across time zones or before synchronization.
Current schedule plans are used, as in the monthly report. Evidence-source buttons
open full source histories. Highlights are selective, not a complete history.

Both endpoints require supervisor sessions and use server evidence, not submitted
client totals. A changed snapshot or expired session during inference rejects the
result. The model can select supplied facts only; aggregate totals are retained
regardless of its selection. Existing local-model configuration is sufficient.
