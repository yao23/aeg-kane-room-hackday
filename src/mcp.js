// Minimal stdio MCP adapter for the Hack Day agent-native question intake.
import { createInterface } from 'node:readline';

const rawBackend = process.env.KANE_BACKEND || 'http://127.0.0.1:3000';
const token = process.env.KANE_AGENT_WRITE_TOKEN;
let backend;
try { backend = new URL(rawBackend); } catch { throw new Error('KANE_BACKEND must be a valid URL.'); }
const loopback = ['127.0.0.1', 'localhost', '::1', '[::1]'].includes(backend.hostname);
if (backend.protocol !== 'https:' && !(backend.protocol === 'http:' && loopback)) throw new Error('KANE_BACKEND must use HTTPS, except loopback HTTP for local development.');

const text = description => ({ type: 'string', description });
const tools = [{
  name: 'search_room',
  description: 'Search public Kane Room experience using a full English natural-language question. Returns ranked public threads and matched concepts. No model call is used.',
  inputSchema: {
    type: 'object',
    properties: { query: { ...text('Plain-English Kane problem or question.'), maxLength: 500 } },
    required: ['query'],
    additionalProperties: false
  },
  annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }
},{

  name: 'ask_question',
  description: 'Create a PRIVATE Kane Room question draft for human review. This never publishes directly. The server assigns Agent · UNVERIFIED · Agent submission provenance.',
  inputSchema: {
    type: 'object',
    properties: {
      title: { ...text('Specific Kane question title.'), maxLength: 160 },
      body: { ...text('What happened, what was expected, and what help is needed.'), maxLength: 4000 },
      author: { ...text('Display label for this agent; identity is not verified.'), maxLength: 60 },
      environment: { ...text('Public-safe version/platform/target context.'), maxLength: 1000 },
      source: { ...text('Public-safe source or reproduction summary.'), maxLength: 1000 }
    },
    required: ['title', 'body', 'author'],
    additionalProperties: false
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }
}];

const output = value => process.stdout.write(JSON.stringify(value) + '\n');
async function dispatch(message) {
  if (!message || message.jsonrpc !== '2.0' || typeof message.method !== 'string') return output({ jsonrpc:'2.0', id:message?.id ?? null, error:{ code:-32600, message:'Invalid Request' } });
  if (message.id === undefined) return;
  if (message.method === 'initialize') return output({ jsonrpc:'2.0', id:message.id, result:{ protocolVersion:'2025-11-25', capabilities:{tools:{}}, serverInfo:{name:'kane-room-hackday',version:'1.0.0'}, instructions:'Use search_room first with the user\'s full English question. If a relevant thread exists, reply_to_thread can create a private reply draft. If no useful public thread is found, ask_question can create a private question draft. Write tools require authorization and never publish directly.' } });
  if (message.method === 'ping') return output({ jsonrpc:'2.0', id:message.id, result:{} });
  if (message.method === 'tools/list') return output({ jsonrpc:'2.0', id:message.id, result:{tools} });
  if (message.method !== 'tools/call') return output({ jsonrpc:'2.0', id:message.id, error:{code:-32601,message:'Method or tool not found'} });
  if (message.params?.name === 'search_room') {
    try {
      const query = String(message.params?.arguments?.query || '').trim();
      const res = await fetch(new URL('/api/search?q=' + encodeURIComponent(query), backend), { redirect:'error', signal:AbortSignal.timeout(10000) });
      const data = await res.json();
      return output({ jsonrpc:'2.0', id:message.id, result:{content:[{type:'text',text:JSON.stringify(data)}], isError:!res.ok} });
    } catch {
      return output({ jsonrpc:'2.0', id:message.id, result:{content:[{type:'text',text:'Room search unavailable. No result is claimed.'}], isError:true} });
    }
  }
  if (!['ask_question','reply_to_thread'].includes(message.params?.name)) return output({ jsonrpc:'2.0', id:message.id, error:{code:-32601,message:'Tool not found'} });
  if (!token) return output({ jsonrpc:'2.0', id:message.id, result:{content:[{type:'text',text:'Agent write tools are unavailable because KANE_AGENT_WRITE_TOKEN is not configured.'}],isError:true} });
  try {
    const endpoint = message.params.name === 'ask_question' ? '/api/agent/questions' : '/api/agent/replies';
    const res = await fetch(new URL(endpoint, backend), {
      method:'POST',
      headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`},
      body:JSON.stringify(message.params?.arguments || {}),
      redirect:'error',
      signal:AbortSignal.timeout(10000)
    });
    const data = await res.json();
    if (data.review_url) data.review_url = new URL(data.review_url, backend).href;
    output({ jsonrpc:'2.0', id:message.id, result:{content:[{type:'text',text:JSON.stringify(data)}], isError:!res.ok} });
  } catch {
    output({ jsonrpc:'2.0', id:message.id, result:{content:[{type:'text',text:'Agent write intake unavailable. No draft or publication is claimed; retry only after checking the backend.'}], isError:true} });
  }
}
let chain=Promise.resolve();
const rl=createInterface({input:process.stdin,crlfDelay:Infinity});
rl.on('line',line=>{ chain=chain.then(async()=>{ let message; try{message=JSON.parse(line);}catch{return output({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Parse error'}});} await dispatch(message); }).catch(()=>output({jsonrpc:'2.0',id:null,error:{code:-32603,message:'Internal error'}})); });
