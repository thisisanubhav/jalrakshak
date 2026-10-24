import { fieldAccountId } from '@/field/workspace';
export async function aiRequest(action: 'transcribe' | 'note' | 'summary' | 'history' | 'monthly', data: Record<string, unknown>, signal: AbortSignal) {
  const account = fieldAccountId();
  if (!account) throw new Error('AI_SIGN_IN');
  const response = await fetch(`/api/ai/${action}`, { method: 'POST', cache: 'no-store',
    headers: { 'Content-Type': 'application/json', 'X-Jalrakshak-Account': account },
    body: JSON.stringify(data), signal: AbortSignal.any([signal, AbortSignal.timeout(125_000)]),
  });
  const result = await response.json();
  if (fieldAccountId() !== account) throw new Error('AI_ACCOUNT_CHANGED');
  if (!response.ok) throw new Error(result.error ?? 'AI_UNAVAILABLE');
  if (typeof result.text !== 'string' || !result.text.trim() || result.text.length > 2000) throw new Error('AI_INVALID_OUTPUT');
  return result as { text: string; model?: string; sourceId?: string; visitId?: string; revision?: string; basis?: string; references?: { sourceId: string; label: string }[] };
}
export function aiError(error: unknown, hi: boolean) {
  const key = error instanceof Error ? error.message : '';
  if (key === 'AI_SIGN_IN' || key === 'AI_ACCOUNT_CHANGED') return hi ? 'फिर से साइन इन करें। आपका मसौदा सुरक्षित है।' : 'Sign in again. Your draft is preserved.';
  if (key === 'AI_SYNC_VISIT' || key === 'AI_RECORDS_CHANGED') return hi ? 'पहले टीम रिकॉर्ड सिंक करें, फिर दोबारा कोशिश करें।' : 'Sync team records, then try again.';
  if (key === 'AI_BUSY') return hi ? 'AI व्यस्त है। थोड़ी देर बाद कोशिश करें।' : 'Local AI is busy. Try again shortly.';
  if (key === 'AI_NOT_CONFIGURED' || key === 'AI_LOCAL_ONLY') return hi ? 'स्थानीय AI अभी सेट नहीं है। मैन्युअल नोट्स उपलब्ध हैं।' : 'Local AI is not configured. Manual notes remain available.';
  if (key === 'AI_INVALID_AUDIO') return hi ? '60 सेकंड तक की रिकॉर्डिंग इस्तेमाल करें।' : 'Use a recording up to 60 seconds long.';
  if (key === 'AI_INVALID_OUTPUT') return hi ? 'उपयोगी मसौदा नहीं मिला। मूल नोट जाँचें और दोबारा कोशिश करें।' : 'No usable draft returned. Check the original and try again.';
  return hi ? 'AI उपलब्ध नहीं है। मसौदा रखें और दोबारा कोशिश करें, या मैन्युअल नोट लिखें।' : 'AI is unavailable. Keep your draft and retry, or enter notes manually.';
}
