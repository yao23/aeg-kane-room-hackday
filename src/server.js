import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore } from './store.js';
import { layout, home, thread } from './views.js';

export function createApp({ dataFile = resolve(process.env.DATA_DIR || 'data', 'room.json') } = {}) {
  const store = createStore(dataFile);
  return createServer((req, res) => {
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'self'; script-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    let path;
    try { path = new URL(req.url, 'http://localhost').pathname; } catch { res.writeHead(400).end(); return; }
    if (req.method !== 'GET') { res.writeHead(405).end('Method not allowed'); return; }
    if (path === '/style.css') { res.writeHead(200, {'Content-Type':'text/css'}).end(readFileSync(new URL('../public/style.css', import.meta.url))); return; }
    let html = path === '/' ? home(store.all()) : null;
    const t = store.all().find(t => path === `/threads/${t.id}`);
    if (t) html = thread(t);
    if (path === '/health') { res.writeHead(200, {'Content-Type':'application/json'}).end('{"ok":true}'); return; }
    res.writeHead(html ? 200 : 404, {'Content-Type':'text/html; charset=utf-8'}).end(html || layout('Not found', '<h1>Page not found</h1><a href="/">Back to community</a>'));
  });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '127.0.0.1';
  createApp().listen(port, host, () => console.log(`Kane Room listening on http://${host}:${port}`));
}
