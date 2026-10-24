import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomUUID, createHash, timingSafeEqual } from 'node:crypto';
import { createStore } from './store.js';
import { webProvenance, agentProvenance } from './provenance.js';
import { layout, home, thread, ask, agentDraft, esc } from './views.js';

class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const ownerHash = token => createHash('sha256').update(token).digest('hex');
function field(form, key, max, required = true) {
  const value = (form.get(key) || '').trim();
  if ((required && !value) || value.length > max) throw new HttpError(400, `${key} must be ${required ? '1' : '0'}–${max} characters.`);
  return value;
}
function jsonField(body, key, max, required = true) {
  const value = typeof body?.[key] === 'string' ? body[key].trim() : '';
  if ((required && !value) || value.length > max) throw new HttpError(400, `${key} must be ${required ? '1' : '0'}–${max} characters.`);
  return value;
}
async function readForm(req) {
  if (req.headers['content-type']?.split(';')[0] !== 'application/x-www-form-urlencoded') throw new HttpError(415, 'Submit a standard form.');
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 24000) throw new HttpError(413, 'Form is too large.');
    chunks.push(chunk);
  }
  return new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
}
async function readJson(req) {
  if (req.headers['content-type']?.split(';')[0] !== 'application/json') throw new HttpError(415, 'Submit application/json.');
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 24000) throw new HttpError(413, 'Request is too large.');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new HttpError(400, 'Invalid JSON.'); }
}
function webContribution(form) {
  try {
    return webProvenance({
      contributorType: form.has('contributorType') ? form.get('contributorType') : 'human',
      synthetic: form.get('synthetic') === 'yes'
    });
  } catch (error) {
    if (error instanceof TypeError) throw new HttpError(400, error.message);
    throw error;
  }
}
function questionFields(form) {
  const provenance = webContribution(form);
  return { title: field(form, 'title', 160), body: field(form, 'body', 4000), author: field(form, 'author', 60), environment: field(form, 'environment', 1000, false), source: field(form, 'source', 1000, false), synthetic: provenance.contributorType === 'synthetic', ...provenance };
}
function agentQuestionFields(body) {
  const allowed = new Set(['title', 'body', 'author', 'environment', 'source']);
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(k => !allowed.has(k))) throw new HttpError(400, 'Only title, body, author, environment, and source are accepted.');
  return {
    title: jsonField(body, 'title', 160),
    body: jsonField(body, 'body', 4000),
    author: jsonField(body, 'author', 60),
    environment: jsonField(body, 'environment', 1000, false),
    source: jsonField(body, 'source', 1000, false),
    synthetic: false,
    ...agentProvenance()
  };
}
function bearer(req, configured) {
  if (!configured) throw new HttpError(503, 'Agent question intake is not configured.');
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) throw new HttpError(401, 'Agent bearer token required.');
  const supplied = Buffer.from(auth.slice(7));
  const expected = Buffer.from(configured);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new HttpError(403, 'Agent bearer token rejected.');
}
export function createApp({ dataFile = resolve(process.env.DATA_DIR || 'data', 'room.json'), agentToken = process.env.KANE_AGENT_WRITE_TOKEN } = {}) {
  const store = createStore(dataFile);
  return createServer(async (req, res) => {
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'self'; script-src 'none'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('Cache-Control', 'no-store');
    const html = (status, body) => res.writeHead(status, {'Content-Type':'text/html; charset=utf-8'}).end(body);
    const json = (status, body) => res.writeHead(status, {'Content-Type':'application/json; charset=utf-8'}).end(JSON.stringify(body));
    const redirect = location => res.writeHead(303, { Location: location }).end();
    try {
      const path = new URL(req.url, 'http://localhost').pathname;
      let token = req.headers.cookie?.match(/(?:^|;\s*)kane_guest=([a-f0-9]{64})(?:;|$)/)?.[1];
      if (!token) {
        token = randomBytes(32).toString('hex');
        res.setHeader('Set-Cookie', `kane_guest=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${process.env.COOKIE_SECURE === '1' ? '; Secure' : ''}`);
      }
      const owner = ownerHash(token);
      if (req.method === 'POST' && path === '/api/agent/questions') {
        bearer(req, agentToken);
        const fields = agentQuestionFields(await readJson(req));
        const now = new Date().toISOString();
        const draft = { ...fields, id: randomUUID(), status: 'draft', createdAt: now, updatedAt: now };
        store.agentDrafts().push(draft); store.save();
        return json(201, {
          tool: 'ask_question',
          status: 'draft',
          draft_id: draft.id,
          review_url: `/agent-drafts/${draft.id}`,
          published: false,
          provenance: { contributorType: draft.contributorType, submissionPath: draft.submissionPath, verification: draft.verification },
          next_step: 'Give the review_url to the human owner. The draft remains private until a human opens that capability URL and explicitly publishes it.'
        });
      }
      if (req.method === 'POST') {
        const expected = `${process.env.COOKIE_SECURE === '1' ? 'https' : 'http'}://${req.headers.host}`;
        if (req.headers.origin !== expected) throw new HttpError(403, 'Form origin must match this room. Open the room and try again.');
        const form = await readForm(req);
        const publishDraft = path.match(/^\/agent-drafts\/([a-f0-9-]+)\/publish$/);
        if (publishDraft) {
          const index = store.agentDrafts().findIndex(d => d.id === publishDraft[1]);
          if (index < 0) throw new HttpError(404, 'Agent draft not found or already published.');
          const draft = store.agentDrafts()[index];
          const now = new Date().toISOString();
          const t = { ...draft, owner, status: 'unanswered', replies: [], events: [], createdAt: now, updatedAt: now };
          delete t.synthetic;
          store.all().push(t);
          store.agentDrafts().splice(index, 1);
          store.save();
          return redirect(`/threads/${t.id}`);
        }
        if (path === '/questions/preview') return html(200, ask(questionFields(form), true));
        if (path === '/questions') {
          const fields = questionFields(form);
          const now = new Date().toISOString();
          const t = { ...fields, id: randomUUID(), owner, status: 'unanswered', replies: [], events: [], createdAt: now, updatedAt: now };
          store.all().push(t); store.save();
          return redirect(`/threads/${t.id}`);
        }
        const outcome = path.match(/^\/threads\/([a-zA-Z0-9-]+)\/outcomes$/);
        if (outcome) {
          const t = store.all().find(t => t.id === outcome[1]);
          if (!t) throw new HttpError(404, 'Thread not found.');
          if (!t.owner || t.owner !== owner) throw new HttpError(403, 'Only the original guest browser can report an outcome or escalate this question.');
          const status = form.get('status');
          if (!['worked', 'failed', 'not_applicable', 'needs_kane_team'].includes(status)) throw new HttpError(400, 'Choose a supported outcome or escalation.');
          const note = field(form, 'note', 2000);
          const event = { status, note, ...webContribution(form), createdAt: new Date().toISOString() };
          t.events.push(event); t.status = status; t.updatedAt = event.createdAt;
          store.save();
          return redirect(`/threads/${t.id}#outcome`);
        }
        const match = path.match(/^\/threads\/([a-zA-Z0-9-]+)\/replies$/);
        const t = match && store.all().find(t => t.id === match[1]);
        if (!t) throw new HttpError(404, 'Thread not found.');
        const provenance = webContribution(form);
        const reply = { id: randomUUID(), author: field(form, 'author', 60), body: field(form, 'body', 4000), ...provenance, synthetic: provenance.contributorType === 'synthetic', createdAt: new Date().toISOString() };
        t.replies.push(reply); t.updatedAt = reply.createdAt;
        if (t.status === 'unanswered') t.status = 'discussion';
        store.save();
        return redirect(`/threads/${t.id}#discussion`);
      }
      if (req.method !== 'GET') throw new HttpError(405, 'Method not allowed.');
      if (path === '/style.css') return res.writeHead(200, {'Content-Type':'text/css'}).end(readFileSync(new URL('../public/style.css', import.meta.url)));
      if (path === '/health') return res.writeHead(200, {'Content-Type':'application/json'}).end('{"ok":true}');
      if (path === '/') return html(200, home(store.all()));
      if (path === '/ask') return html(200, ask());
      const draftMatch = path.match(/^\/agent-drafts\/([a-f0-9-]+)$/);
      if (draftMatch) {
        const draft = store.agentDrafts().find(d => d.id === draftMatch[1]);
        if (!draft) throw new HttpError(404, 'Agent draft not found or already published.');
        return html(200, agentDraft(draft));
      }
      const t = store.all().find(t => path === `/threads/${t.id}`);
      if (t) return html(200, thread(t, t.owner === owner));
      throw new HttpError(404, 'Page not found.');
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      if (status === 500) console.error('Room request failed; inspect local storage availability.');
      return html(status, layout('Request could not be completed', `<h1 class="form-title">Request could not be completed</h1><p class="error">${esc(status === 500 ? 'Something went wrong saving or loading this room. Please try again.' : error.message)}</p><a href="/">Back to community</a>`));
    }
  });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '127.0.0.1';
  createApp().listen(port, host, () => console.log(`Kane Room listening on http://${host}:${port}`));
}
