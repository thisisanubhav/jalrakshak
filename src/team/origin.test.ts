import { expect, test } from 'vitest';
import { sameOrigin } from './origin';
test('uses the incoming host when Next normalizes the internal hostname', () => {
  expect(sameOrigin(new Request('http://localhost:3217/api/team/setup', {headers:{host:'127.0.0.1:3217',origin:'http://127.0.0.1:3217'}}))).toBe(true);
});
test('rejects missing, foreign, cross-site, wrong scheme and wrong port origins', () => {
  for (const origin of ['', 'null', 'https://evil.example', 'https://localhost:3217', 'http://localhost:3218']) {
    expect(sameOrigin(new Request('http://localhost:3217/api/team/setup', {headers:{host:'localhost:3217',origin}}))).toBe(false);
  }
  expect(sameOrigin(new Request('http://localhost:3217/api/team/setup', {headers:{host:'localhost:3217',origin:'http://localhost:3217','sec-fetch-site':'cross-site'}}))).toBe(false);
});
