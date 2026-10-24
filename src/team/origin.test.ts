import { afterEach, expect, test, vi } from 'vitest';
import { sameOrigin, secureSessionCookie } from './origin';
afterEach(()=>vi.unstubAllEnvs());
test('hosted HTTPS accepts its canonical origin behind a private HTTP proxy and secures cookies',()=>{
  vi.stubEnv('JALRAKSHAK_PUBLIC_ORIGIN','https://water.example');
  const request=new Request('http://app:3000/api/team/login',{headers:{host:'water.example',origin:'https://water.example'}});
  expect(sameOrigin(request)).toBe(true);expect(secureSessionCookie(request)).toBe(true);
  for(const headers of [
    {host:'water.example',origin:'http://water.example'},
    {host:'evil.example',origin:'https://water.example'},
    {host:'water.example',origin:'https://evil.example'},
    {host:'water.example',origin:'https://water.example','sec-fetch-site':'cross-site'},
  ])expect(sameOrigin(new Request(request.url,{headers}))).toBe(false);
});
test('forwarded headers cannot authorize a foreign origin or enable secure cookies on local HTTP',()=>{
  vi.stubEnv('JALRAKSHAK_PUBLIC_ORIGIN','');
  const request=new Request('http://localhost:3000/api/team/login',{headers:{host:'localhost:3000',origin:'https://evil.example','x-forwarded-host':'evil.example','x-forwarded-proto':'https'}});
  expect(sameOrigin(request)).toBe(false);expect(secureSessionCookie(request)).toBe(false);
});
test('invalid deployment origins fail closed',()=>{
  for(const origin of ['http://water.example','https://water.example/path','https://user:secret@water.example','https://water.example?query=1','not-a-url']){
    vi.stubEnv('JALRAKSHAK_PUBLIC_ORIGIN',origin);
    expect(sameOrigin(new Request('http://app:3000',{headers:{host:'water.example',origin:'https://water.example'}}))).toBe(false);
  }
});
test('uses the incoming host when Next normalizes the internal hostname', () => {
  expect(sameOrigin(new Request('http://localhost:3217/api/team/setup', {headers:{host:'127.0.0.1:3217',origin:'http://127.0.0.1:3217'}}))).toBe(true);
});
test('rejects missing, foreign, cross-site, wrong scheme and wrong port origins', () => {
  for (const origin of ['', 'null', 'https://evil.example', 'https://localhost:3217', 'http://localhost:3218']) {
    expect(sameOrigin(new Request('http://localhost:3217/api/team/setup', {headers:{host:'localhost:3217',origin}}))).toBe(false);
  }
  expect(sameOrigin(new Request('http://localhost:3217/api/team/setup', {headers:{host:'localhost:3217',origin:'http://localhost:3217','sec-fetch-site':'cross-site'}}))).toBe(false);
});
