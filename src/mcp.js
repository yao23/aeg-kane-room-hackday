// Minimal stdio MCP adapter for the Hack Day agent-native question intake.
import { createInterface } from 'node:readline';

const rawBackend = process.env.KANE_BACKEND || 'http://127.0.0.1:3000';
const token = process.env.KANE_AGENT_WRITE_TOKEN;
let backend;
try { backend = new URL(rawBackend); } catch { throw new Error('KANE_BACKEND must be a valid URL.'); }
const loopback = ['127.0.0.1', 'localhost', '::1', '[::1]'].includes(backend.hostname);
if (backend.protocol !== 'https:' && !(backend.protocol === 'http:' && loopback)) throw new Error('KANE_BACKEND must use HTTPS, except loopback HTTP for local development.');
if (!token) throw new Error('Set KANE_AGENT_WRITE_TOKEN to an authorized agent intake credential.');

const text = description => ({ type: 'string', description });
const tools = [{
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
  if (message.method === 'initialize') return output({ jsonrpc:'2.0', id:message.id, result:{ protocolVersion:'2025-11-25', capabilities:{tools:{}}, serverInfo:{name:'kane-room-hackday',version:'1.0.0'}, instructions:'ask_question creates a private draft only. Give the returned review URL to the human owner; do not claim publication or verification.' } });
  if (message.method === 'ping') return output({ jsonrpc:'2.0', id:message.id, result:{} });
  if (message.method === 'tools/list') return output({ jsonrpc:'2.0', id:message.id, result:{tools} });
  if (message.method !== 'tools/call' || message.params?.name !== 'ask_question') return output({ jsonrpc:'2.0', id:message.id, error:{code:-32601,message:'Method or tool not found'} });
  try {
    const res = await fetch(new URL('/api/agent/questions', backend), {
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
    output({ jsonrpc:'2.0', id:message.id, result:{content:[{type:'text',text:'Agent question intake unavailable. No draft or publication is claimed; retry only after checking the backend.'}], isError:true} });
  }
}
let chain=Promise.resolve();
const rl=createInterface({input:process.stdin,crlfDelay:Infinity});
rl.on('line',line=>{ chain=chain.then(async()=>{ let message; try{message=JSON.parse(line);}catch{return output({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Parse error'}});} await dispatch(message); }).catch(()=>output({jsonrpc:'2.0',id:null,error:{code:-32603,message:'Internal error'}})); });
