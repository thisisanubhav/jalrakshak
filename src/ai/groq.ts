import { TeamError } from '@/team/server';

// Fixed endpoints: never forward credentials to a caller-selected URL.
export function hostedAiEnabled() {
  const provider = process.env.JALRAKSHAK_AI_PROVIDER;
  if (provider === 'disabled') throw new TeamError(503, 'AI_NOT_CONFIGURED');
  if (provider && !['local', 'groq'].includes(provider)) throw new TeamError(503, 'AI_NOT_CONFIGURED');
  return provider === 'groq' || (!provider && !!process.env.GROQ_API_KEY?.trim());
}
async function request(path: 'chat/completions' | 'audio/transcriptions', body: string | FormData) {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) throw new TeamError(503, 'AI_NOT_CONFIGURED');
  try {
    const response = await fetch(`https://api.groq.com/openai/v1/${path}`, {
      method: 'POST', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(45_000),
      headers: { Authorization: `Bearer ${key}`, ...(typeof body === 'string' ? { 'Content-Type': 'application/json' } : {}) }, body,
    });
    if (!response.ok) {
      await response.body?.cancel();
      if (response.status === 429) throw new TeamError(429, 'AI_QUOTA');
      if (response.status === 401 || response.status === 403) throw new TeamError(503, 'AI_NOT_CONFIGURED');
      throw new Error('provider unavailable');
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error('empty');
    const chunks: Uint8Array[] = []; let bytes = 0;
    try {
      while (true) {
        const part = await reader.read(); if (part.done) break;
        bytes += part.value.length;
        if (bytes > 64_000) throw new Error('oversized');
        chunks.push(part.value);
      }
    } finally { await reader.cancel(); reader.releaseLock(); }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (error) {
    if (error instanceof TeamError) throw error;
    // Never expose provider response bodies, credentials or submitted evidence.
    throw new TeamError(503, 'AI_UNAVAILABLE');
  }
}
export async function groqTranscribe(form: FormData) {
  form.set('model', 'whisper-large-v3-turbo');
  const result = await request('audio/transcriptions', form);
  if (typeof result?.text !== 'string' || !result.text.trim() || result.text.length > 2000) throw new TeamError(502, 'AI_INVALID_OUTPUT');
  return { text: result.text.trim() };
}
export async function groqSelect(facts: string[], system: string, summary: boolean) {
  const model = 'openai/gpt-oss-20b';
  const result = await request('chat/completions', JSON.stringify({
    model, stream: false, temperature: 0, reasoning_effort: 'low', max_completion_tokens: 4096,
    messages: [{ role: 'system', content: system }, { role: 'user', content: JSON.stringify(facts.map((text, index) => ({ index, text }))) }],
    response_format: { type: 'json_schema', json_schema: { name: 'evidence_selection', strict: true,
      schema: { type: 'object', properties: { selected: { type: 'array', minItems: 1, maxItems: summary ? 4 : facts.length, items: { type: 'integer', enum: facts.map((_, index) => index) } } }, required: ['selected'], additionalProperties: false } } },
  }));
  try {
    const choice = result?.choices?.[0];
    if (choice?.finish_reason !== 'stop' || choice.message?.refusal) throw new Error();
    const output = JSON.parse(choice.message.content);
    if (!Array.isArray(output.selected) || output.selected.length > (summary ? 4 : 40)) throw new Error();
    return { selected: output.selected as unknown, model };
  } catch { throw new TeamError(502, 'AI_INVALID_OUTPUT'); }
}
