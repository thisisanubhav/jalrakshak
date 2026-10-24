import console from 'node:console';
import { readFileSync, appendFileSync } from 'node:fs';

const result = JSON.parse(readFileSync('test-results/release-results.json', 'utf8'));
const cases = [];
function visit(suite) {
  for (const spec of suite.specs ?? []) for (const test of spec.tests ?? []) cases.push({ title: spec.title, test });
  for (const child of suite.suites ?? []) visit(child);
}
visit(result);
const passed = cases.filter(({ test }) => test.status === 'expected' && test.results?.length === 1 && test.results[0].status === 'passed').length;
const skipped = cases.filter(({ test }) => test.status === 'skipped' || test.results?.at(-1)?.status === 'skipped').length;
const incomplete = cases.length - passed - skipped;
const errors = result.errors?.length ?? 0;
const summary = `## Playwright release verification\n\nCommit: ${process.env.GITHUB_SHA ?? 'local'}\n\n| Discovered | Passed once | Skipped | Failed/incomplete/retried | Runner errors |\n| --- | --- | --- | --- | --- |\n| ${cases.length} | ${passed} | ${skipped} | ${incomplete} | ${errors} |\n\nChromium sandbox enabled; zero retries. HTML report and failure screenshots/videos/traces are in the workflow artifact.\n`;
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
if (cases.length < 42 || passed !== cases.length || errors) {
  console.error('Release verification requires at least the 42 retained browser cases, all passing once, without skips or runner errors.');
  process.exitCode = 1;
}
