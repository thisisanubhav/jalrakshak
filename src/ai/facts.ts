export function transcriptFacts(transcript: string): string[] {
  return transcript.split(/(?<=[.!?।])\s+|\n+/u).map(line=>line.trim()).filter(Boolean).slice(0,40);
}
// The model selects evidence; it cannot author new factual claims.
export function selectedFacts(facts: string[], selected: unknown, required: number[] = [], limit = 2000): string {
  if (!Array.isArray(selected) || !selected.length || selected.length > 40 || selected.some(index=>!Number.isInteger(index)||index<0||index>=facts.length) || new Set(selected).size !== selected.length) throw new Error('AI_INVALID_OUTPUT');
  const indexes=[...new Set([...required,...selected])].sort((a,b)=>a-b);
  const text=indexes.map(index=>facts[index]).join('\n');
  if (!text || text.length>limit) throw new Error('AI_INVALID_OUTPUT');
  return text;
}
