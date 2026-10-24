import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

test('runner preserves failures and requires a real parsed final pass (synthetic CLI stub only)', t => {
  const dir = mkdtempSync(join(tmpdir(),'kane-runner-unit-')); t.after(()=>rmSync(dir,{recursive:true}));
  const bin = join(dir,'bin'); mkdirSync(bin);
  const fake = join(bin,'kane-cli');
  writeFileSync(fake, `#!/usr/bin/env node
// SYNTHETIC parser/exit-code unit-test stub. This is never judging evidence.
if (process.argv.includes('--version')) { console.log('SYNTHETIC-STUB'); process.exit(0); }
console.error('SYNTHETIC progress');
if(process.env.STUB_EVENT) console.log(process.env.STUB_EVENT);
process.exit(Number(process.env.STUB_EXIT || 0));
`); chmodSync(fake,0o755);
  const cases = [
    {code:7, event:'{"type":"run_end","status":"failed"}', expected:7},
    {code:9, event:'{"type":"run_end","status":"passed"}', expected:9},
    {code:0, event:'{"type":"run_end","status":"failed"}', expected:65},
    {code:0, event:'', expected:65},
    {code:0, event:'not JSON', expected:65},
    {code:0, event:'{"type":"run_end","status":"passed"}', expected:65},
    {code:0, event:'{"type":"run_end","status":"failed"}\n{"type":"run_end","status":"passed"}\n{"type":"test_md_done","overall_status":"passed"}', expected:65},
    {code:0, event:'{"type":"run_end","status":"passed"}\n{"type":"test_md_done","overall_status":"failed"}', expected:65},
    {code:0, event:'{"type":"run_end","status":"passed"}\n{"type":"test_md_done","overall_status":"passed"}', expected:0}
  ];
  for(const [index,c] of cases.entries()) {
    const out = join(dir,`case-${index}`);
    const run = spawnSync('bash',[resolve('scripts/kane-check.sh')],{encoding:'utf8',env:{...process.env,PATH:`${bin}:${process.env.PATH}`,EVIDENCE_DIR:out,STUB_EXIT:String(c.code),STUB_EVENT:c.event}});
    assert.equal(run.status,c.expected,run.stderr);
    const attempt = join(out,readdirSync(out)[0]);
    assert.equal(readFileSync(join(attempt,'cli-exit-code.txt'),'utf8').trim(),String(c.code));
    assert.match(readFileSync(join(attempt,'progress.log'),'utf8'),/SYNTHETIC progress/);
    assert.equal(JSON.parse(readFileSync(join(attempt,'result.json'))).status,c.expected===0?'PASS':'FAIL');
  }
});
