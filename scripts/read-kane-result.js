import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [dir, exitText] = process.argv.slice(2);
const cliExit = Number(exitText);
const lines = readFileSync(resolve(dir, 'run.ndjson'), 'utf8').split('\n').filter(Boolean);
const events = [];
let malformed = 0;
for (const line of lines) {
  try { events.push(JSON.parse(line)); } catch { malformed++; }
}
const ends = events.filter(e => e.type === 'run_end');
const final = ends.at(-1) || null;
const completion = events.filter(e => e.type === 'test_md_done').at(-1) || null;
const failedRunEnds = ends.filter(e => e.status !== 'passed').length;
const passed = cliExit === 0 && malformed === 0 && final?.status === 'passed' && failedRunEnds === 0 && completion?.overall_status === 'passed';
const result = {
  status: passed ? 'PASS' : 'FAIL', cliExit, malformedLines: malformed,
  runEndCount: ends.length, failedRunEndCount: failedRunEnds, finalRunEnd: final, testMdCompletion: completion,
  limitation: !final ? 'No final run_end was emitted. Do not claim a completed test.' : !completion ? 'No test_md_done was emitted. A partial flow is not a completed file.' : failedRunEnds ? 'At least one run_end did not pass; inspect every flow.' : null
};
writeFileSync(resolve(dir, 'result.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({status: result.status, cliExit, runEndCount: ends.length, finalStatus: final?.status || 'missing'}));
process.exitCode = passed ? 0 : 65;
