import test from 'node:test';
import assert from 'node:assert/strict';
import { terms, searchThreads } from '../src/search.js';

const now='2026-10-24T12:00:00.000Z';
const threads=[
  {
    id:'browser', title:'How do I share a reproducible Kane browser issue?',
    body:'My browser flow stops before the final assertion. What context should I include?',
    environment:'Node 24, Kane CLI 0.9.0, desktop browser',
    source:'Public-safe reproduction summary',
    status:'discussion', updatedAt:now,
    replies:[{body:'Share the expected result, actual result, CLI version, and a safe minimal reproduction.'}],
    events:[]
  },
  {
    id:'credit', title:'OpenAI event credit issue',
    body:'My event credits are missing after setup.',
    environment:'Hack Day account',
    source:'User report',
    status:'unanswered', updatedAt:now, replies:[], events:[]
  }
];

test('English normalization maps common natural-language variants to stable concepts',()=>{
  const normalized=terms('The browser step finished successfully and the whole test passed after clicking.');
  for(const term of ['browser','completion','pass','test','click']) assert.ok(normalized.includes(term), term);
  assert.ok(!normalized.includes('the'));
});

test('full English natural-language Kane question retrieves related public experience',()=>{
  const q="I'm new to Kane CLI. A browser step finished successfully—does that mean the whole test passed? What minimum evidence should I share to diagnose it?";
  const result=searchThreads(threads,q);
  assert.equal(result.results[0].id,'browser');
  assert.ok(result.results[0].matched_terms.length >= 3);
  assert.ok(result.results[0].matched_terms.includes('browser'));
  assert.ok(result.results[0].matched_terms.includes('test'));
  assert.ok(result.results[0].matched_terms.includes('share'));
});

test('search ranks a specific unrelated experience when its concepts are present',()=>{
  const result=searchThreads(threads,'Why are my OpenAI Hack Day event credits missing?');
  assert.equal(result.results[0].id,'credit');
});

test('irrelevant English question does not create a false match',()=>{
  const result=searchThreads(threads,'How do I tune a database replication protocol for lunar telemetry?');
  assert.deepEqual(result.results,[]);
});
