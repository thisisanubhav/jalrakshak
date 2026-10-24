// Next may normalize the internal request hostname to localhost. Compare the
// browser Origin with the incoming Host, preserving the scheme and port.
export function publicOrigin(): URL | undefined {
  const configured=process.env.JALRAKSHAK_PUBLIC_ORIGIN;
  if(!configured)return undefined;
  const url=new URL(configured);
  if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new Error('JALRAKSHAK_PUBLIC_ORIGIN must be an HTTPS origin.');
  return url;
}
export function secureSessionCookie(request:Request):boolean {
  return !!publicOrigin() || new URL(request.url).protocol==='https:';
}
export function sameOrigin(request: Request): boolean {
  if (request.headers.get('sec-fetch-site') === 'cross-site') return false;
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (!origin || !host) return false;
  try {
    // Trust deployment configuration, never client-supplied forwarded headers.
    // The HTTPS proxy preserves Host; the app port is private to its network.
    const configured=publicOrigin();
    if(configured)return host===configured.host && origin===configured.origin;
    const url = new URL(request.url);
    const expected = new URL(`${url.protocol}//${host}`);
    return origin === expected.origin && ['http:', 'https:'].includes(expected.protocol);
  } catch { return false; }
}
