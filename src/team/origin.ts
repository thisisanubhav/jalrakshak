// Next may normalize the internal request hostname to localhost. Compare the
// browser Origin with the incoming Host, preserving the scheme and port.
export function sameOrigin(request: Request): boolean {
  if (request.headers.get('sec-fetch-site') === 'cross-site') return false;
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (!origin || !host) return false;
  try {
    const url = new URL(request.url);
    const expected = new URL(`${url.protocol}//${host}`);
    return origin === expected.origin && ['http:', 'https:'].includes(expected.protocol);
  } catch { return false; }
}
