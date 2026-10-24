import { NextRequest, NextResponse } from 'next/server';
import { sameOrigin } from '@/team/origin';
import { teamStore, TeamError } from '@/team/server';
import { generateDraft, language, noteText, transcribe, visitEvidence, withAiSlot } from '@/ai/local';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
function reply(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
}
async function readInput(request: NextRequest) {
  const reader = request.body?.getReader();
  if (!reader) throw new TeamError(400, 'AI_INVALID_INPUT');
  const chunks: Uint8Array[] = []; let bytes = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    bytes += value.length;
    if (bytes > 2_600_000) { await reader.cancel(); throw new TeamError(413, 'AI_INVALID_AUDIO'); }
    chunks.push(value);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value;
  } catch { throw new TeamError(400, 'AI_INVALID_INPUT'); }
}
export async function POST(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  try {
    if (!sameOrigin(request)) throw new TeamError(403, 'AI_ORIGIN');
    const store = teamStore(), token = request.cookies.get('jalrakshak_session')?.value ?? '';
    const user = store.session(token);
    if (request.headers.get('x-jalrakshak-account') !== user.id) throw new TeamError(401, 'AI_ACCOUNT_CHANGED');
    const { action } = await context.params;
    if (!['transcribe', 'note', 'summary'].includes(action)) throw new TeamError(404, 'AI_INVALID_INPUT');
    if (action === 'summary' && user.role !== 'supervisor') throw new TeamError(403, 'AI_SUPERVISOR_ONLY');
    const input = await readInput(request), locale = language(input.language);
    return await withAiSlot(user.id, async () => {
      const evidence = action === 'summary' ? visitEvidence(store, user, input.visitId) : undefined;
      const result = action === 'transcribe' ? await transcribe(input.audio, locale)
        : await generateDraft(evidence?.evidence ?? { transcript: noteText(input.text) }, locale, action === 'summary');
      // A long-running model must not return evidence after logout/reassignment.
      const active = store.session(token);
      if (active.id !== user.id) throw new TeamError(401, 'AI_ACCOUNT_CHANGED');
      if (evidence && (active.role !== 'supervisor' || store.snapshot(active).revision !== evidence.revision)) throw new TeamError(409, 'AI_RECORDS_CHANGED');
      return reply({ ...result, ...(evidence ? { sourceId: evidence.sourceId, visitId: evidence.visitId, revision: evidence.revision } : {}) });
    });
  } catch (error) {
    return error instanceof TeamError ? reply({ error: error.message }, error.status) : reply({ error: 'AI_UNAVAILABLE' }, 503);
  }
}
