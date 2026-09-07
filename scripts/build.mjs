import {readFile, mkdir, writeFile} from 'node:fs/promises';
// Explicit allowlist: licensed readings and local files can never enter the bundle.
const paths = {'/index.html':'text/html; charset=utf-8','/styles.css':'text/css; charset=utf-8','/reader.js':'text/javascript; charset=utf-8','/hume-data.js':'text/javascript; charset=utf-8','/books/hume-dialogues-complete.txt':'text/plain; charset=utf-8'};
const assets = {};
for (const [path, type] of Object.entries(paths)) assets[path] = {type, body: await readFile(`dist${path}`, 'utf8')};
const api = await readFile('worker/readings.mjs', 'utf8');
const worker = `${api}\nconst assets = ${JSON.stringify(assets)};\nexport default {async fetch(request, env) {
 const url = new URL(request.url);
 if (url.pathname.startsWith('/api/')) return readingApi(request, env);
 if (!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed', {status:405});
 const asset = assets[url.pathname === '/' ? '/index.html' : url.pathname];
 if (!asset) return new Response('Not found', {status:404});
 return new Response(request.method === 'HEAD' ? null : asset.body, {headers:{'Content-Type':asset.type,'X-Content-Type-Options':'nosniff'}});
}};\n`;
await mkdir('dist/server', {recursive: true});
await mkdir('dist/.openai', {recursive: true});
await writeFile('dist/server/index.js', worker);
await writeFile('dist/.openai/hosting.json', await readFile('.openai/hosting.json'));
console.log('Built reading app with private PDF storage.');
