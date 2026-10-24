import { afterEach, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const directories: string[] = [];
afterEach(() => { for (const directory of directories.splice(0)) rmSync(directory, { recursive:true, force:true }); });
function check(status = 'expected', results = [{status:'passed'}], count = 45, errors: unknown[] = []) {
  const directory = mkdtempSync(join(tmpdir(), 'jalrakshak-ci-')); directories.push(directory);
  mkdirSync(join(directory, 'test-results'));
  const tests = Array.from({length:count}, () => ({title:'fixture',tests:[{status,results}]}));
  writeFileSync(join(directory,'test-results/release-results.json'), JSON.stringify({suites:[{specs:tests}],errors}));
  return spawnSync(process.execPath,[resolve('scripts/check-browser-results.mjs')],{cwd:directory,encoding:'utf8',env:{...process.env,GITHUB_STEP_SUMMARY:join(directory,'summary.md')}});
}
it('accepts all 45 cases passing once and reports exact count', () => { const result = check(); expect(result.status).toBe(0); expect(result.stdout).toContain('| 45 | 45 | 0 | 0 | 0 |'); });
it('rejects test discovery without execution', () => { expect(check('skipped',[]).status).toBe(1); });
it('rejects missing cases', () => { expect(check('expected',[{status:'passed'}],44).status).toBe(1); });
it('rejects failures and timeouts', () => { for(const status of ['failed','timedOut','interrupted']) expect(check('unexpected',[{status}]).status).toBe(1); });
it('rejects a retry even when the last attempt passes', () => { expect(check('flaky',[{status:'failed'},{status:'passed'}]).status).toBe(1); });
it('rejects runner errors despite passing test entries', () => { expect(check('expected',[{status:'passed'}],45,[{message:'teardown failed'}]).status).toBe(1); });
