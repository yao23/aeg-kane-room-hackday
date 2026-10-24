import { mkdirSync, existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { dirname } from 'node:path';
import { webProvenance } from './provenance.js';

export const statuses = ['unanswered', 'discussion', 'worked', 'failed', 'not_applicable', 'needs_kane_team'];
export function createStore(path) {
  mkdirSync(dirname(path), { recursive: true });
  let state = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : { threads: [fixture()], agentDrafts: [], agentReplyDrafts: [] };
  if (!Array.isArray(state.threads)) throw new Error('Invalid store: threads must be an array');
  let upgraded = false;
  if (!Array.isArray(state.agentDrafts)) { state.agentDrafts = []; upgraded = true; }
  if (!Array.isArray(state.agentReplyDrafts)) { state.agentReplyDrafts = []; upgraded = true; }
  const seeded = state.threads.find(t => t.id === 'synthetic-browser-question' && t.synthetic === true);
  const legacySeedReply = seeded?.replies?.find(r => r.id === 'synthetic-reply' && r.contributorType === undefined);
  if (legacySeedReply) { Object.assign(legacySeedReply, { synthetic: true, ...webProvenance({ contributorType: 'synthetic' }) }); upgraded = true; }
  function save() {
    writeFileSync(`${path}.tmp`, JSON.stringify(state, null, 2), { mode: 0o600 });
    renameSync(`${path}.tmp`, path);
  }
  for (const t of state.threads) {
    for (const contribution of [t, ...t.replies, ...(t.events || [])]) {
      if (contribution.synthetic === true && contribution.contributorType === undefined) {
        Object.assign(contribution, webProvenance({ contributorType: 'synthetic' }));
        upgraded = true;
      }
    }
  }
  if (!existsSync(path) || upgraded) save();
  return { all: () => state.threads, agentDrafts: () => state.agentDrafts, agentReplyDrafts: () => state.agentReplyDrafts, save };
}
function fixture() {
  const now = new Date().toISOString();
  return {
    id: 'synthetic-browser-question', title: 'SYNTHETIC: How do I share a reproducible Kane browser issue?',
    body: 'SYNTHETIC demo fixture. My sample browser flow stops before the final assertion. What public-safe context should I include so another builder can reproduce it?',
    author: 'Synthetic builder A', owner: null, synthetic: true, ...webProvenance({ contributorType: 'synthetic' }),
    environment: 'SYNTHETIC environment: Node 24, local demo app, desktop browser',
    source: 'SYNTHETIC example; no real run or support guidance is claimed.',
    status: 'discussion', createdAt: now, updatedAt: now,
    replies: [{ id: 'synthetic-reply', synthetic: true, ...webProvenance({ contributorType: 'synthetic' }), author: 'Synthetic builder B', body: 'SYNTHETIC reply: describe the expected result, actual result, CLI version, and a safe minimal reproduction. Remove secrets before sharing.', createdAt: now }],
    events: []
  };
}
