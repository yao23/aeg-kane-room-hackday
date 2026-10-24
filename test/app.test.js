import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../src/server.js';

async function room(t) {
  const dir = mkdtempSync(join(tmpdir(), 'kane-room-test-'));
  const dataFile = join(dir, 'room.json');
  let server;
  async function start() {
    server = createApp({ dataFile });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    return `http://127.0.0.1:${server.address().port}`;
  }
  let base = await start();
  const request = (path, options) => fetch(base + path, options);
  const post = (path, fields, cookie, origin = base) => request(path, { method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: origin, Cookie: cookie || '' }, body: new URLSearchParams(fields) });
  async function guest() { const res = await request('/'); return res.headers.get('set-cookie').split(';')[0]; }
  t.after(async () => { await new Promise(resolve => server.close(resolve)); rmSync(dir, { recursive: true }); });
  return { request, post, guest, dataFile, restart: async () => { await new Promise(resolve => server.close(resolve)); base = await start(); } };
}
const question = { title: 'SYNTHETIC browser assertion question', author: 'Synthetic builder A', body: 'SYNTHETIC: Expected a heading; saw a loading state.', environment: 'Node 24; desktop; Kane 0.9.0', source: 'Synthetic local reproduction only', synthetic: 'yes' };

test('two builders preview, publish, reply, and revisit persistent public thread', async t => {
  const r = await room(t); const a = await r.guest(); const b = await r.guest();
  assert.notEqual(a, b);
  const before = JSON.parse(readFileSync(r.dataFile)).threads.length;
  const preview = await r.post('/questions/preview', question, a);
  assert.equal(preview.status, 200); assert.match(await preview.text(), /PREVIEW · SYNTHETIC/);
  assert.equal(JSON.parse(readFileSync(r.dataFile)).threads.length, before);
  const published = await r.post('/questions', question, a);
  assert.equal(published.status, 303); const path = published.headers.get('location');
  assert.match(await (await r.request(path)).text(), /Status: unanswered/);
  const reply = await r.post(path + '/replies', {author: 'Synthetic builder B', body: 'SYNTHETIC: try a stable visible assertion.', synthetic: 'yes'}, b);
  assert.equal(reply.status, 303);
  const html = await (await r.request(path)).text();
  for (const text of ['Status: discussion', 'Synthetic builder B', question.environment, question.source, 'Not official Kane support.']) assert.ok(html.includes(text));
  assert.match(await (await r.request('/')).text(), /1 reply/);
  assert.ok(!readFileSync(r.dataFile, 'utf8').includes(a.split('=')[1]), 'raw guest tokens never persist');
  await r.restart(); assert.match(await (await r.request(path)).text(), /Synthetic builder B/);
});

test('renders hostile community text as text with no script execution', async t => {
  const r = await room(t); const cookie = await r.guest();
  const payload = '<script>alert("x")</script><img src=x onerror=alert(1)>';
  const response = await r.post('/questions', {...question, title: payload, body: payload, author: payload, environment: payload, source: payload}, cookie);
  const page = await r.request(response.headers.get('location'));
  const html = await page.text();
  assert.ok(!html.includes(payload)); assert.match(html, /&lt;script&gt;/);
  assert.match(page.headers.get('content-security-policy'), /script-src 'none'/);
  assert.equal(page.headers.get('x-content-type-options'), 'nosniff');
});

test('rejects missing/foreign Origin, invalid forms, oversized input, and unknown routes', async t => {
  const r = await room(t); const cookie = await r.guest();
  assert.equal((await r.post('/questions', question, cookie, 'https://evil.example')).status, 403);
  assert.equal((await r.request('/questions', {method:'POST'})).status, 403);
  assert.equal((await r.post('/questions', {...question, title:''}, cookie)).status, 400);
  assert.equal((await r.post('/questions', {...question, body:'a'.repeat(4001)}, cookie)).status, 400);
  assert.equal((await r.post('/questions', {...question, body:'a'.repeat(25000)}, cookie)).status, 413);
  assert.equal((await r.request('/missing')).status, 404);
  assert.equal((await r.post('/threads/missing/replies', {author:'SYNTHETIC',body:'demo'}, cookie)).status, 404);
});

test('original guest records all outcomes, escalates, and preserves timeline after restart', async t => {
  const r = await room(t); const a = await r.guest(); const b = await r.guest();
  const response = await r.post('/questions', question, a); const path = response.headers.get('location');
  assert.equal((await r.post(path+'/outcomes', {status:'worked',note:'Pretend owner'}, b)).status, 403);
  assert.equal((await r.post(path+'/outcomes', {status:'official',note:'Invalid'}, a)).status, 400);
  assert.equal((await r.post(path+'/outcomes', {status:'worked',note:''}, a)).status, 400);
  for (const status of ['worked','failed','not_applicable','needs_kane_team']) {
    assert.equal((await r.post(path+'/outcomes', {status,note:`SYNTHETIC observed ${status}`}, a)).status, 303);
    const html = await (await r.request(path)).text();
    assert.ok(html.includes(`Status: ${status.replaceAll('_',' ')}`));
  }
  await r.post(path+'/replies', {author:'Synthetic B',body:'SYNTHETIC additional context'}, b);
  await r.restart();
  const html = await (await r.request(path)).text();
  assert.match(html, /Status: needs kane team/);
  assert.match(html, /does not notify Kane staff/);
  assert.equal(JSON.parse(readFileSync(r.dataFile)).threads.find(x=>path.endsWith(x.id)).events.length, 4);
  const ownerPage = await r.request(path, {headers:{Cookie:a}});
  assert.match(await ownerPage.text(), /Save outcome \/ escalation/);
});

test('demo fixture cannot be claimed and malformed storage fails visibly', async t => {
  const r = await room(t); const a = await r.guest();
  assert.equal((await r.post('/threads/synthetic-browser-question/outcomes', {status:'worked',note:'claim'}, a)).status, 403);
  const {writeFileSync} = await import('node:fs');
  const bad = join(tmpdir(), `kane-invalid-${Date.now()}.json`);
  t.after(()=>rmSync(bad,{force:true})); writeFileSync(bad,'not JSON');
  assert.throws(()=>createApp({dataFile:bad}), SyntaxError);
});

test('reply and outcome text remain escaped in public pages', async t => {
  const r = await room(t); const a = await r.guest();
  const response = await r.post('/questions', question, a); const path = response.headers.get('location');
  const hostile = '<img src=x onerror=alert(1)>';
  await r.post(path+'/replies', {author:'Synthetic B',body:hostile}, a);
  await r.post(path+'/outcomes', {status:'failed',note:hostile}, a);
  const html = await (await r.request(path)).text();
  assert.ok(!html.includes(hostile)); assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
});
