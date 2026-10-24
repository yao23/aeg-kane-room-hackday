import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { createApp } from '../src/server.js';
import { agentProvenance } from '../src/provenance.js';

async function room(t, initialState) {
  const agentToken = 'test-agent-write-token';
  const dir = mkdtempSync(join(tmpdir(), 'kane-room-test-'));
  const dataFile = join(dir, 'room.json');
  if (initialState) writeFileSync(dataFile, JSON.stringify(initialState));
  let server;
  async function start() {
    server = createApp({ dataFile, agentToken });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    return `http://127.0.0.1:${server.address().port}`;
  }
  let base = await start();
  const request = (path, options) => fetch(base + path, options);
  const post = (path, fields, cookie, origin = base) => request(path, { method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: origin, Cookie: cookie || '' }, body: new URLSearchParams(fields) });
  const agentPost = (body, token = agentToken) => request('/api/agent/questions', { method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  async function guest() { const res = await request('/'); return res.headers.get('set-cookie').split(';')[0]; }
  t.after(async () => { await new Promise(resolve => server.close(resolve)); rmSync(dir, { recursive: true }); });
  return { request, post, agentPost, guest, dataFile, agentToken, get base(){ return base; }, restart: async () => { await new Promise(resolve => server.close(resolve)); base = await start(); } };
}
const question = { title: 'SYNTHETIC browser assertion question', author: 'Synthetic builder A', body: 'SYNTHETIC: Expected a heading; saw a loading state.', environment: 'Node 24; desktop; Kane 0.9.0', source: 'Synthetic local reproduction only', synthetic: 'yes', contributorType: 'synthetic' };

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
  const reply = await r.post(path + '/replies', {contributorType: 'synthetic', author: 'Synthetic builder B', body: 'SYNTHETIC: try a stable visible assertion.', synthetic: 'yes'}, b);
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
  assert.equal((await r.post(path+'/outcomes', {contributorType:'synthetic',status:'worked',note:'Pretend owner'}, b)).status, 403);
  assert.equal((await r.post(path+'/outcomes', {contributorType:'synthetic',status:'official',note:'Invalid'}, a)).status, 400);
  assert.equal((await r.post(path+'/outcomes', {contributorType:'synthetic',status:'worked',note:''}, a)).status, 400);
  for (const status of ['worked','failed','not_applicable','needs_kane_team']) {
    assert.equal((await r.post(path+'/outcomes', {contributorType:'synthetic',status,note:`SYNTHETIC observed ${status}`}, a)).status, 303);
    const html = await (await r.request(path)).text();
    assert.ok(html.includes(`Status: ${status.replaceAll('_',' ')}`));
  }
  await r.post(path+'/replies', {contributorType:'synthetic',author:'Synthetic B',body:'SYNTHETIC additional context'}, b);
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
  assert.equal((await r.post('/threads/synthetic-browser-question/outcomes', {contributorType:'synthetic',status:'worked',note:'claim'}, a)).status, 403);
  const {writeFileSync} = await import('node:fs');
  const bad = join(tmpdir(), `kane-invalid-${Date.now()}.json`);
  t.after(()=>rmSync(bad,{force:true})); writeFileSync(bad,'not JSON');
  assert.throws(()=>createApp({dataFile:bad}), SyntaxError);
});

test('reply and outcome text remain escaped in public pages', async t => {
  const r = await room(t); const a = await r.guest();
  const response = await r.post('/questions', question, a); const path = response.headers.get('location');
  const hostile = '<img src=x onerror=alert(1)>';
  await r.post(path+'/replies', {contributorType:'synthetic',author:'Synthetic B',body:hostile}, a);
  await r.post(path+'/outcomes', {contributorType:'synthetic',status:'failed',note:hostile}, a);
  const html = await (await r.request(path)).text();
  assert.ok(!html.includes(hostile)); assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
});

function storedThread(r, path) {
  return JSON.parse(readFileSync(r.dataFile)).threads.find(t => path.endsWith(t.id));
}
const humanQuestion = { title: 'Contributor declaration check', author: 'Test display name', body: 'Safe test-only content; identity cannot be inferred from this text.', environment: 'Unchanged environment context', source: 'Unchanged source/evidence context' };

test('web question defaults to human/web/unverified and ignores spoofed path and verification', async t => {
  const r = await room(t); const a = await r.guest();
  const response = await r.post('/questions', {...humanQuestion, submissionPath:'agent', verification:'verified'}, a);
  assert.equal(response.status, 303); const path = response.headers.get('location');
  const saved = storedThread(r, path);
  assert.equal(saved.contributorType, 'human'); assert.equal(saved.submissionPath, 'web'); assert.equal(saved.verification, 'unverified');
  assert.equal(saved.environment, humanQuestion.environment); assert.equal(saved.source, humanQuestion.source);
  assert.match(await (await r.request(path)).text(), /Human · UNVERIFIED · Web submission/);
  const form = await (await r.request('/ask')).text();
  assert.match(form, /<option value="human" selected>Human report · unverified<\/option>/);
  // No classification based on User-Agent or question text.
  const forgedClient = await r.request('/questions', {method:'POST', redirect:'manual', headers:{'Content-Type':'application/x-www-form-urlencoded',Origin:new URL(response.url).origin,Cookie:a,'User-Agent':'Example automation agent'},body:new URLSearchParams(humanQuestion)});
  assert.equal(forgedClient.status,303);
  assert.equal(storedThread(r,forgedClient.headers.get('location')).contributorType,'human');
});

test('web reply defaults to human/web even on a synthetic thread, without inheriting provenance', async t => {
  const r = await room(t); const a = await r.guest(); const path='/threads/synthetic-browser-question';
  const reply = await r.post(path+'/replies', {author:'Test display name',body:'Agent-like or SYNTHETIC text is not a declaration.',submissionPath:'agent',verification:'verified'}, a);
  assert.equal(reply.status,303);
  const saved = storedThread(r,path).replies.at(-1);
  assert.equal(saved.contributorType,'human'); assert.equal(saved.submissionPath,'web'); assert.equal(saved.verification,'unverified'); assert.equal(saved.synthetic,false);
  const page=await (await r.request(path)).text();
  assert.match(page, /Human · UNVERIFIED · Web submission/);
  assert.match(page, /<option value="human" selected>Human report · unverified<\/option>/);
  assert.doesNotMatch(page, /name="synthetic" value="yes" checked/);
});

test('synthetic seed, explicit sample selector, and legacy test checkbox use synthetic/test', async t => {
  const r = await room(t); const a=await r.guest();
  const seed=storedThread(r,'/threads/synthetic-browser-question');
  for (const contribution of [seed,...seed.replies]) {
    assert.equal(contribution.contributorType,'synthetic'); assert.equal(contribution.submissionPath,'test'); assert.equal(contribution.verification,'unverified');
  }
  assert.match(await (await r.request('/threads/synthetic-browser-question')).text(), /Synthetic · UNVERIFIED · Test fixture/);
  for (const fields of [{contributorType:'synthetic'},{synthetic:'yes'},{contributorType:'agent',synthetic:'yes'}]) {
    const response=await r.post('/questions',{...humanQuestion,...fields},a);
    assert.equal(response.status,303);
    const saved=storedThread(r,response.headers.get('location'));
    assert.equal(saved.contributorType,'synthetic'); assert.equal(saved.submissionPath,'test'); assert.equal(saved.verification,'unverified');
  }
});

test('web agent declarations survive preview and restart, render self-declared on questions and replies', async t => {
  const r=await room(t); const a=await r.guest();
  const fields={...humanQuestion,contributorType:'agent',submissionPath:'agent',verification:'verified'};
  const preview=await r.post('/questions/preview',fields,a);
  assert.equal(preview.status,200); const previewHtml=await preview.text();
  assert.match(previewHtml,/Agent \(self-declared\) · UNVERIFIED · Web submission/);
  assert.match(previewHtml,/<option value="agent" selected>Agent report · unverified<\/option>/);
  const response=await r.post('/questions',fields,a); const path=response.headers.get('location');
  assert.equal(response.status,303);
  assert.equal((await r.post(path+'/replies',{author:'Test display name',body:'Safe declaration test',contributorType:'agent',submissionPath:'agent'},a)).status,303);
  await r.restart();
  const saved=storedThread(r,path);
  for(const contribution of [saved,...saved.replies]) {
    assert.equal(contribution.contributorType,'agent'); assert.equal(contribution.submissionPath,'web'); assert.equal(contribution.verification,'unverified');
  }
  const html=await (await r.request(path)).text();
  assert.equal((html.match(/Agent \(self-declared\) · UNVERIFIED · Web submission/g)||[]).length,2);
  assert.match(await (await r.request('/')).text(), /Agent \(self-declared\) · UNVERIFIED · Web submission/);
});

test('invalid contributor declarations are rejected on preview, publication, replies, and outcomes', async t => {
  const r=await room(t); const a=await r.guest();
  const response=await r.post('/questions',humanQuestion,a); const path=response.headers.get('location');
  for (const invalid of ['', 'official', 'Human', '<script>alert(1)</script>']) {
    for (const route of ['/questions/preview','/questions']) assert.equal((await r.post(route,{...humanQuestion,contributorType:invalid,synthetic:'yes'},a)).status,400);
    assert.equal((await r.post(path+'/replies',{author:'Test',body:'Safe test',contributorType:invalid},a)).status,400);
    assert.equal((await r.post(path+'/outcomes',{status:'worked',note:'Safe test',contributorType:invalid},a)).status,400);
  }
  const saved=storedThread(r,path);
  assert.equal(saved.replies.length,0); assert.equal(saved.events.length,0);
  assert.equal(JSON.parse(readFileSync(r.dataFile)).threads.length,2);
});

test('outcomes carry their own web declaration independently of the question', async t => {
  const r=await room(t); const a=await r.guest();
  const response=await r.post('/questions',question,a); const path=response.headers.get('location');
  for (const [fields,type,submissionPath] of [[{},'human','web'],[{contributorType:'agent',submissionPath:'agent'},'agent','web'],[{contributorType:'synthetic'},'synthetic','test']]) {
    assert.equal((await r.post(path+'/outcomes',{status:'worked',note:'Safe outcome test',verification:'verified',...fields},a)).status,303);
    const event=storedThread(r,path).events.at(-1);
    assert.equal(event.contributorType,type); assert.equal(event.submissionPath,submissionPath); assert.equal(event.verification,'unverified');
  }
  const html=await (await r.request(path)).text();
  for (const label of ['Human · UNVERIFIED · Web submission','Agent (self-declared) · UNVERIFIED · Web submission','Synthetic · UNVERIFIED · Test fixture']) assert.ok(html.includes(label));
});

test('legacy unmarked records render safely; only explicit synthetic metadata and known seed migrate', async t => {
  const now=new Date().toISOString();
  const legacy={id:'legacy',title:'Legacy declaration test',body:'Agent or SYNTHETIC wording must not classify identity.',author:'Legacy display name',environment:'old environment',source:'old source',synthetic:false,status:'worked',createdAt:now,updatedAt:now,replies:[{id:'old-reply',author:'Old display name',body:'Safe old content',createdAt:now}],events:[{status:'worked',note:'Safe old observation',createdAt:now}]};
  const synthetic={...legacy,id:'synthetic-browser-question',synthetic:true,replies:[{id:'synthetic-reply',author:'Synthetic builder B',body:'Synthetic seeded reply',createdAt:now},{id:'explicit-sample',synthetic:true,author:'Synthetic',body:'Explicit sample',createdAt:now},{id:'unmarked-reply',author:'Legacy display name',body:'Not explicitly marked synthetic',createdAt:now}],events:[]};
  const r=await room(t,{threads:[legacy,synthetic]});
  const html=await (await r.request('/threads/legacy')).text();
  assert.equal((html.match(/Human · UNVERIFIED · Legacy\/Web submission/g)||[]).length,3);
  assert.match(await (await r.request('/')).text(),/Human · UNVERIFIED · Legacy\/Web submission/);
  assert.ok(!('contributorType' in storedThread(r,'/threads/legacy')));
  const upgraded=storedThread(r,'/threads/synthetic-browser-question');
  for (const contribution of [upgraded,...upgraded.replies.slice(0,2)]) {
    assert.equal(contribution.contributorType,'synthetic'); assert.equal(contribution.submissionPath,'test'); assert.equal(contribution.verification,'unverified');
  }
  assert.ok(!('contributorType' in upgraded.replies[2]),'unmarked replies do not inherit thread provenance');
});

test('future agent helper assigns fixed server metadata without trusting body fields', () => {
  assert.deepEqual(agentProvenance({contributorType:'human',submissionPath:'web',verification:'verified'}), {contributorType:'agent',submissionPath:'agent',verification:'unverified'});
  const first=agentProvenance(); first.verification='verified';
  assert.equal(agentProvenance().verification,'unverified');
});


test('agent-native ask_question creates a private fixed-provenance draft and requires human publish', async t => {
  const r = await room(t); const human = await r.guest();
  const before = JSON.parse(readFileSync(r.dataFile)).threads.length;
  const payload = {
    title: 'Agent-native Kane question',
    author: 'Codex helper',
    body: 'I need help interpreting a Kane completion event.',
    environment: 'Kane 0.9.0; synthetic test environment',
    source: 'Public-safe agent summary only'
  };
  const created = await r.agentPost(payload);
  assert.equal(created.status, 201);
  const result = await created.json();
  assert.equal(result.tool, 'ask_question');
  assert.equal(result.status, 'draft');
  assert.equal(result.published, false);
  assert.deepEqual(result.provenance, { contributorType: 'agent', submissionPath: 'agent', verification: 'unverified' });
  assert.match(result.review_url, /^\/agent-drafts\/[a-f0-9-]+$/);
  let state = JSON.parse(readFileSync(r.dataFile));
  assert.equal(state.threads.length, before, 'agent draft must not enter public threads');
  assert.equal(state.agentDrafts.length, 1);
  assert.equal(state.agentDrafts[0].contributorType, 'agent');
  assert.equal(state.agentDrafts[0].submissionPath, 'agent');
  assert.equal(state.agentDrafts[0].verification, 'unverified');
  assert.doesNotMatch(await (await r.request('/')).text(), /Agent-native Kane question/);

  const review = await r.request(result.review_url);
  const reviewHtml = await review.text();
  assert.equal(review.status, 200);
  assert.match(reviewHtml, /PRIVATE DRAFT/);
  assert.match(reviewHtml, /Agent · UNVERIFIED · Agent submission/);
  assert.match(reviewHtml, /Publish agent question/);

  await r.restart();
  assert.match(await (await r.request(result.review_url)).text(), /Agent-native Kane question/);
  const published = await r.post(result.review_url + '/publish', {}, human);
  assert.equal(published.status, 303);
  const threadPath = published.headers.get('location');
  assert.match(threadPath, /^\/threads\//);
  state = JSON.parse(readFileSync(r.dataFile));
  assert.equal(state.agentDrafts.length, 0);
  assert.equal(state.threads.length, before + 1);
  const saved = storedThread(r, threadPath);
  assert.equal(saved.contributorType, 'agent');
  assert.equal(saved.submissionPath, 'agent');
  assert.equal(saved.verification, 'unverified');
  assert.ok(saved.owner, 'human publishing browser becomes the outcome owner');
  const page = await (await r.request(threadPath)).text();
  assert.match(page, /Agent · UNVERIFIED · Agent submission/);
  assert.equal((await r.request(result.review_url)).status, 404);
});

test('agent-native question intake rejects missing or wrong auth and provenance spoofing', async t => {
  const r = await room(t);
  const payload = { title:'Safe title', author:'Agent', body:'Safe body', environment:'', source:'' };
  const noAuth = await r.request('/api/agent/questions', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
  assert.equal(noAuth.status, 401);
  assert.equal((await r.agentPost(payload, 'wrong-token')).status, 403);
  for (const extra of [
    { contributorType:'human' },
    { submissionPath:'web' },
    { verification:'verified' },
    { published:true },
    { synthetic:true }
  ]) assert.equal((await r.agentPost({...payload, ...extra})).status, 400);
  const state = JSON.parse(readFileSync(r.dataFile));
  assert.equal(state.agentDrafts.length, 0);
});

test('agent-native question intake validates JSON and never accepts direct public mode', async t => {
  const r = await room(t);
  const malformed = await r.request('/api/agent/questions', { method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${r.agentToken}`}, body:'{' });
  assert.equal(malformed.status, 400);
  const wrongType = await r.request('/api/agent/questions', { method:'POST', headers:{'Content-Type':'text/plain',Authorization:`Bearer ${r.agentToken}`}, body:'x' });
  assert.equal(wrongType.status, 415);
  assert.equal((await r.agentPost({title:'',author:'Agent',body:'Body'})).status, 400);
  assert.equal((await r.agentPost({title:'Title',author:'Agent',body:'a'.repeat(4001)})).status, 400);
});


test('public English natural-language search finds related experience and excludes private agent drafts', async t => {
  const r = await room(t);
  const q = "I'm new to Kane CLI. A browser step finished successfully—does that mean the whole test passed? What evidence should I share?";
  const api = await r.request('/api/search?q=' + encodeURIComponent(q));
  assert.equal(api.status, 200);
  const data = await api.json();
  assert.ok(data.results.some(x => x.id === 'synthetic-browser-question'));
  assert.ok(data.results.find(x => x.id === 'synthetic-browser-question').matched_terms.length >= 3);
  const page = await r.request('/search?q=' + encodeURIComponent(q));
  const html = await page.text();
  assert.equal(page.status, 200);
  assert.match(html, /How do I share a reproducible Kane browser issue/);
  assert.match(html, /Matched:/);

  const privateDraft = await r.agentPost({title:'PRIVATE lunar database draft',author:'Agent',body:'replication telemetry protocol',environment:'private',source:''});
  assert.equal(privateDraft.status,201);
  const hidden = await (await r.request('/api/search?q=' + encodeURIComponent('lunar database replication telemetry'))).json();
  assert.ok(!hidden.results.some(x => x.title.includes('PRIVATE lunar database draft')));

  const irrelevant = await (await r.request('/api/search?q=' + encodeURIComponent('quantum gardening protocol orchids'))).json();
  assert.deepEqual(irrelevant.results, []);
});

test('MCP search_room accepts a full English question and does not require write token', async t => {
  const r = await room(t);
  const child = spawn(process.execPath, ['src/mcp.js'], {
    cwd: new URL('..', import.meta.url).pathname,
    env: { ...process.env, KANE_BACKEND:r.base, KANE_AGENT_WRITE_TOKEN:'' },
    stdio:['pipe','pipe','pipe']
  });
  t.after(()=>child.kill());
  let id=0;
  const pending=new Map();
  createInterface({input:child.stdout}).on('line',line=>{
    const msg=JSON.parse(line); pending.get(msg.id)?.(msg); pending.delete(msg.id);
  });
  function rpc(method,params={}) {
    const next=++id;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('MCP timeout')),5000);
      pending.set(next,msg=>{clearTimeout(timer);resolve(msg);});
      child.stdin.write(JSON.stringify({jsonrpc:'2.0',id:next,method,params})+'\n');
    });
  }
  await rpc('initialize',{});
  const listed=await rpc('tools/list');
  assert.deepEqual(listed.result.tools.map(x=>x.name),['search_room','ask_question']);
  const called=await rpc('tools/call',{name:'search_room',arguments:{query:'Does a finished browser step mean the whole Kane test passed? What evidence should I share?'}});
  assert.equal(called.result.isError,false);
  const data=JSON.parse(called.result.content[0].text);
  assert.ok(data.results.some(x=>x.id==='synthetic-browser-question'));
  const ask=await rpc('tools/call',{name:'ask_question',arguments:{title:'x',author:'y',body:'z'}});
  assert.equal(ask.result.isError,true);
});

test('MCP ask_question tool creates the same private agent draft and returns absolute review URL', async t => {
  const r = await room(t);
  const child = spawn(process.execPath, ['src/mcp.js'], {
    cwd: new URL('..', import.meta.url).pathname,
    env: { ...process.env, KANE_BACKEND:r.base, KANE_AGENT_WRITE_TOKEN:r.agentToken },
    stdio:['pipe','pipe','pipe']
  });
  t.after(()=>child.kill());
  let id=0;
  const pending=new Map();
  createInterface({input:child.stdout}).on('line',line=>{
    const msg=JSON.parse(line);
    pending.get(msg.id)?.(msg);
    pending.delete(msg.id);
  });
  function rpc(method,params={}) {
    const next=++id;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('MCP timeout')),5000);
      pending.set(next,msg=>{clearTimeout(timer);resolve(msg);});
      child.stdin.write(JSON.stringify({jsonrpc:'2.0',id:next,method,params})+'\n');
    });
  }
  const init=await rpc('initialize',{});
  assert.equal(init.result.serverInfo.name,'kane-room-hackday');
  const listed=await rpc('tools/list');
  assert.deepEqual(listed.result.tools.map(x=>x.name),['search_room','ask_question']);
  const called=await rpc('tools/call',{name:'ask_question',arguments:{title:'MCP draft',author:'Codex test',body:'Need help with Kane completion evidence.'}});
  assert.equal(called.result.isError,false);
  const data=JSON.parse(called.result.content[0].text);
  assert.equal(data.status,'draft');
  assert.equal(data.published,false);
  assert.ok(data.review_url.startsWith(r.base+'/agent-drafts/'));
  const state=JSON.parse(readFileSync(r.dataFile));
  assert.equal(state.agentDrafts.length,1);
  assert.equal(state.agentDrafts[0].submissionPath,'agent');
  assert.doesNotMatch(await (await r.request('/')).text(),/MCP draft/);
});
