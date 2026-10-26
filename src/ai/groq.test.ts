import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/ai/[action]/route';
import { TeamStore } from '@/team/server';
import { generateDraft, transcribe } from './local';
import { hostedAiEnabled } from './groq';
import { pcmWav } from './audio';
import { aiError } from './client';
const state = vi.hoisted(() => ({ store: undefined as unknown }));
vi.mock('@/team/server', async original => ({ ...await original<typeof import('@/team/server')>(), teamStore: () => state.store }));
const stores: TeamStore[] = [];
beforeEach(() => { vi.stubEnv('GROQ_API_KEY', 'fictional-test-key'); vi.stubEnv('JALRAKSHAK_AI_PROVIDER', 'groq'); });
afterEach(() => { stores.splice(0).forEach(s => s.sql.close()); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
const answer = (selected: unknown = [1]) => Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ selected }) } }] });
it('uses a fixed HTTPS destination and bounded structured selection without changing required evidence', async () => {
  const fetch = vi.fn(async () => answer()); vi.stubGlobal('fetch', fetch);
  const facts = ['EC: 600 / 602', 'पंप का प्लेटफ़ॉर्म टूटा है।'];
  const result = await generateDraft(facts, 'hi', true, [0]);
  expect(result.text).toBe(facts.join('\n'));
  const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
  expect(init.redirect).toBe('error'); expect(init.cache).toBe('no-store');
  expect(init.headers).toMatchObject({ Authorization: 'Bearer fictional-test-key' });
  const body = JSON.parse(init.body as string);
  expect(body.response_format.json_schema.strict).toBe(true);
  expect(body.messages[0].content).toContain('untrusted evidence');
  expect(body.messages[0].content).toContain('Hindi');
  expect(body.max_completion_tokens).toBe(1024);
  expect(body.messages[1].content).not.toContain('fictional-test-key');
});
it.each(['en', 'hi'] as const)('sends bounded WAV with the selected %s language to Whisper', async language => {
  const fetch = vi.fn(async () => Response.json({ text: 'Recorded observation.' })); vi.stubGlobal('fetch', fetch);
  const wav = Buffer.from(await pcmWav(new Float32Array(1600)).arrayBuffer()).toString('base64');
  expect((await transcribe(wav, language)).text).toBe('Recorded observation.');
  const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe('https://api.groq.com/openai/v1/audio/transcriptions');
  const form = init.body as FormData;
  expect(form.get('model')).toBe('whisper-large-v3-turbo'); expect(form.get('language')).toBe(language);
  expect((form.get('file') as File).type).toBe('audio/wav');
  await expect(transcribe('invalid', language)).rejects.toThrow('AI_INVALID_AUDIO'); expect(fetch).toHaveBeenCalledTimes(1);
});
it('rejects fabricated facts, out-of-range selections, duplicates and excessive summary entries', async () => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  for (const selected of [['Safe water'], [99], [1, 1], [], [0, 1, 2, 3, 4]]) {
    fetch.mockResolvedValueOnce(answer(selected));
    await expect(generateDraft(['one', 'two', 'three', 'four', 'five'], 'en', true)).rejects.toThrow('AI_INVALID_OUTPUT');
  }
  fetch.mockResolvedValueOnce(Response.json({ choices: [{ finish_reason: 'length', message: { content: '{"selected":[0]}' } }] }));
  await expect(generateDraft(['one'], 'en', false)).rejects.toThrow('AI_INVALID_OUTPUT');
});
it.each([[429, 'AI_QUOTA'], [401, 'AI_NOT_CONFIGURED'], [403, 'AI_NOT_CONFIGURED'], [500, 'AI_UNAVAILABLE']])('handles provider %s without retries or leaking response bodies', async (status, error) => {
  const fetch = vi.fn(async () => new Response('private provider detail', { status: Number(status) })); vi.stubGlobal('fetch', fetch);
  await expect(generateDraft(['one'], 'en', false)).rejects.toThrow(String(error)); expect(fetch).toHaveBeenCalledTimes(1);
});
it('bounds responses and handles malformed JSON, null and network errors safely', async () => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  for (const response of [new Response('x'.repeat(65_000)), new Response('not json')]) {
    fetch.mockResolvedValueOnce(response); await expect(generateDraft(['one'], 'en', false)).rejects.toThrow('AI_UNAVAILABLE');
  }
  fetch.mockResolvedValueOnce(Response.json(null)); await expect(generateDraft(['one'], 'en', false)).rejects.toThrow('AI_INVALID_OUTPUT');
  fetch.mockRejectedValueOnce(new Error('sensitive network details')); await expect(generateDraft(['one'], 'en', false)).rejects.toThrow('AI_UNAVAILABLE');
});
it('honours explicit local/disabled mode and fails closed for missing keys or unknown providers', async () => {
  vi.stubEnv('JALRAKSHAK_AI_PROVIDER', ''); expect(hostedAiEnabled()).toBe(true);
  vi.stubEnv('JALRAKSHAK_AI_PROVIDER', 'local'); expect(hostedAiEnabled()).toBe(false);
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  for (const provider of ['disabled', 'unknown']) {
    vi.stubEnv('JALRAKSHAK_AI_PROVIDER', provider); await expect(generateDraft(['one'], 'en', false)).rejects.toThrow('AI_NOT_CONFIGURED');
  }
  vi.stubEnv('JALRAKSHAK_AI_PROVIDER', 'groq'); vi.stubEnv('GROQ_API_KEY', '');
  await expect(generateDraft(['one'], 'en', false)).rejects.toThrow('AI_NOT_CONFIGURED'); expect(fetch).not.toHaveBeenCalled();
});
it('preserves account, role, origin and logout protections with hosted inference', async () => {
  const store = new TeamStore(':memory:'); stores.push(store); state.store = store;
  const admin = store.createUser(null, 'admin', 'Admin', 'private-test-password', 'supervisor');
  const worker = store.createUser(admin, 'worker', 'Worker', 'private-test-password', 'worker');
  const session = store.login(worker.username, 'private-test-password');
  vi.stubEnv('JALRAKSHAK_PUBLIC_ORIGIN', '');
  const request = (action: string, token = session.token, account = worker.id, origin = 'http://localhost:3000') => POST(new NextRequest(`http://localhost:3000/api/ai/${action}`, {
    method: 'POST', headers: { host: 'localhost:3000', origin, cookie: `jalrakshak_session=${token}`, 'x-jalrakshak-account': account }, body: JSON.stringify({ text: 'Observed damage.', language: 'en' }),
  }), { params: Promise.resolve({ action }) });
  const fetch = vi.fn(async () => answer([0])); vi.stubGlobal('fetch', fetch);
  expect((await request('note', '')).status).toBe(401);
  expect((await request('note', session.token, 'other')).status).toBe(401);
  expect((await request('note', session.token, worker.id, 'https://other.invalid')).status).toBe(403);
  for (const action of ['summary', 'history', 'monthly']) expect((await request(action)).status).toBe(403);
  expect(fetch).not.toHaveBeenCalled();
  const before = store.snapshot(worker); expect((await request('note')).status).toBe(200); expect(store.snapshot(worker)).toEqual(before);
  fetch.mockImplementation(async () => { store.logout(session.token); return answer([0]); });
  expect((await request('note')).status).toBe(401);
});
it('explains exhausted quotas in both languages', () => {
  expect(aiError(new Error('AI_QUOTA'), false)).toContain('usage limit');
  expect(aiError(new Error('AI_QUOTA'), true)).toContain('सीमा');
});
