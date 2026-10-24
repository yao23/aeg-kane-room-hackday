import { mkdirSync, existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { dirname } from 'node:path';

export const statuses = ['unanswered', 'discussion', 'worked', 'failed', 'not_applicable', 'needs_kane_team'];
export function createStore(path) {
  mkdirSync(dirname(path), { recursive: true });
  let state = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : { threads: [fixture()] };
  if (!Array.isArray(state.threads)) throw new Error('Invalid store: threads must be an array');
  function save() {
    writeFileSync(`${path}.tmp`, JSON.stringify(state, null, 2), { mode: 0o600 });
    renameSync(`${path}.tmp`, path);
  }
  if (!existsSync(path)) save();
  return { all: () => state.threads, save };
}
function fixture() {
  const now = new Date().toISOString();
  return {
    id: 'synthetic-browser-question', title: 'SYNTHETIC: How do I share a reproducible Kane browser issue?',
    body: 'SYNTHETIC demo fixture. My sample browser flow stops before the final assertion. What public-safe context should I include so another builder can reproduce it?',
    author: 'Synthetic builder A', owner: null, synthetic: true,
    environment: 'SYNTHETIC environment: Node 24, local demo app, desktop browser',
    source: 'SYNTHETIC example; no real run or support guidance is claimed.',
    status: 'discussion', createdAt: now, updatedAt: now,
    replies: [{ id: 'synthetic-reply', author: 'Synthetic builder B', body: 'SYNTHETIC reply: describe the expected result, actual result, CLI version, and a safe minimal reproduction. Remove secrets before sharing.', createdAt: now }],
    events: []
  };
}
