import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

// CI owns this server and local database. For interactive work, keep using the
// normal dev command on 5178; this check deliberately fails if that port is busy.
const origin = 'http://127.0.0.1:5178';
const server = spawn(process.execPath, ['scripts/run.mjs', 'dev', '--port', '5178', '--strictPort'], {
  cwd: new URL('../', import.meta.url),
  detached: process.platform !== 'win32',
  stdio: ['ignore', 'pipe', 'pipe'],
});
let output = '', exited = false, spawnError;
server.stdout.on('data', data => { output = (output + data).slice(-16000); });
server.stderr.on('data', data => { output = (output + data).slice(-16000); });
server.on('error', error => { spawnError = error; });
server.on('exit', () => { exited = true; });
const request = path => fetch(origin + path, { signal: AbortSignal.timeout(5000) });

try {
  // Wait for our child to announce readiness before making requests, so a
  // different server already on 5178 can never make this check pass.
  const deadline = Date.now() + 60000;
  while (!output.includes('Local:')) {
    if (spawnError) throw spawnError;
    if (exited) throw new Error('Development server exited before it was ready.');
    if (Date.now() >= deadline) throw new Error('Development server did not become ready within 60 seconds.');
    await delay(200);
  }
  for (const path of ['/', '/todo', '/study', '/groceries', '/groceries/stock', '/vault', '/capture', '/capture/setup', '/study/content']) {
    const response = await request(path);
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get('content-type') || '', /text\/html/, path);
    const html = await response.text();
    assert.match(html, /<html/i, path);
    assert.doesNotMatch(html, /Internal Server Error|Error:.*SQLITE_ERROR/, path);
    console.log('OK', path);
  }
  for (const path of ['/api/session', '/api/home', '/api/todo', '/api/groceries', '/api/coursework', '/api/items']) {
    const response = await request(path);
    assert.equal(response.status, 200, path);
    const data = await response.json();
    if (path === '/api/home') {
      for (const module of ['todo', 'study', 'groceries', 'vault']) assert.ok(data[module], `Home ${module} must load`);
    }
    console.log('OK', path);
  }
  console.log('Startup and local persistence checks passed. Browser interaction is a separate acceptance gate.');
} catch (error) {
  console.error(output);
  throw error;
} finally {
  if (server.pid) {
    const stop = signal => {
      try {
        if (process.platform === 'win32') server.kill(signal);
        else process.kill(-server.pid, signal);
      } catch (error) { if (error.code !== 'ESRCH') throw error; }
    };
    stop('SIGTERM');
    for (let attempt = 0; !exited && attempt < 25; attempt++) await delay(200);
    stop('SIGKILL');
  }
}
