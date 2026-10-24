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
const passed = cliExit === 0 && malformed === 0 && final?.status === 'passed';
const result = {
  status: passed ? 'PASS' : 'FAIL', cliExit, malformedLines: malformed,
  runEndCount: ends.length, finalRunEnd: final,
  limitation: !final ? 'No final run_end was emitted. Do not claim a completed test.' : null
};
writeFileSync(resolve(dir, 'result.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({status: result.status, cliExit, runEndCount: ends.length, finalStatus: final?.status || 'missing'}));
process.exitCode = passed ? 0 : 65;
