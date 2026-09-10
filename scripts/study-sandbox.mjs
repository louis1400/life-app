import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = name => readFile(path.join(root, name), 'utf8');
const script = value => '<script>' + value.replace(/<\/script/gi, '<\\/script') + '</script>';
export async function sandboxHtml() {
  const [html, css, curriculum, hume, study, reader, api, adapter] = await Promise.all([
    'modules/study/dist/index.html', 'modules/study/dist/styles.css',
    'modules/study/dist/curriculum-data.js', 'modules/study/dist/hume-data.js',
    'modules/study/dist/study.js', 'modules/study/dist/reader.js',
    'modules/study/worker/coursework.mjs', 'scripts/study-sandbox-client.js'
  ].map(read));
  const data = JSON.parse(curriculum.replace(/^window.STUDY_CURRICULUM = /, '').replace(/;\s*$/, ''));
  // Preserve assignment metadata; exclude all private file locators from exports.
  for (const course of data.courses) for (const week of course.weeks) {
    week.folder = '#sandbox-resource-folder';
    if (week.preparation) week.preparation = '#sandbox-resource-preparation';
    for (const reading of week.readings) if (reading.url) reading.url = '#sandbox-resource-' + reading.id;
  }
  const banner = `<section id="sandbox-banner" aria-label="Test sandbox">
    <strong>Study test sandbox</strong><span>Current app screens · test data · no account connection</span>
    <div><button type="button" data-sandbox-reset="blank">Start from zero</button>
    <button type="button" data-sandbox-reset="catch-up">Week 2 · nothing done</button></div>
    <small id="sandbox-storage" role="status"></small>
  </section>
  <dialog id="sandbox-external"><h2 id="sandbox-external-name">External resource</h2>
    <p>This action leaves the study app for a reading file, Canvas or ChatGPT. External access is disabled here; this sandbox contains no private reading files or connected accounts.</p>
    <p>Hume’s public-domain text is available in the Reading tab. Other assigned texts must be checked separately in the real app.</p>
    <form method="dialog"><button>Back to studying</button></form></dialog>`;
  const sandboxCss = `#sandbox-banner{padding:16px;background:#12384a;color:white;display:flex;flex-wrap:wrap;gap:10px;align-items:center}#sandbox-banner div{display:flex;flex-wrap:wrap;gap:8px}#sandbox-banner button{background:white;color:#12384a;padding:9px 12px;border-radius:6px}#sandbox-banner small{flex-basis:100%;color:white}#sandbox-external{max-width:min(560px,90vw);padding:24px;border:1px solid #aaa;border-radius:12px}body{height:auto;min-height:100vh}#sandbox-banner{grid-column:1/-1}.sidebar{top:0} @media(min-width:851px){body{grid-template-rows:auto minmax(0,1fr);height:100vh}.sidebar,#main-scroll{height:auto;min-height:0}}`;
  const portableStudy = study.replaceAll('Progress and notes loaded · saves sync across devices', 'Test progress loaded · saved only in this browser')
    .replaceAll('Saved across devices', 'Saved in this test browser');
  const portableReader = reader.replace(/https:\/\/drive\.google\.com\/file\/d\/[^'"\s]+/g, 'https://example.invalid/test-reading');
  return html.replace(/<link rel="stylesheet" href="styles.css">/, '<style>' + css + '\n' + sandboxCss + '</style>')
    .replace(/\s*<script src="[^"]+" defer><\/script>/g, '')
    .replace('<body>', '<body>' + banner)
    .replace('</body>', [script('window.STUDY_CURRICULUM = ' + JSON.stringify(data)),script(hume),script(api.replace(/^export /gm, '')),script(adapter),script(portableStudy),script(portableReader),'</body>'].join('\n'))
    .replace('href="books/hume-dialogues-complete.txt"', 'href="#sandbox-resource-download"')
    .replace('<meta charset="utf-8">', '<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data:; connect-src \'none\'; font-src data:; base-uri \'none\'; form-action \'none\'">');
}

export async function startSandbox({port = 5178} = {}) {
  const server = createServer(async (req, res) => {
    const host = req.headers.host || '';
    if (!/^(127\.0\.0\.1|localhost):\d+$/.test(host)) {res.writeHead(403).end('Local sandbox only.'); return;}
    if (!['GET','HEAD'].includes(req.method)) {res.writeHead(405).end(); return;}
    if (!['/', '/study'].includes(req.url.split('?')[0])) {res.writeHead(404).end(); return;}
    try {const html = await sandboxHtml();res.writeHead(200, {'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(req.method === 'HEAD' ? undefined : html);}
    catch (error) {console.error(error);res.writeHead(500).end('Sandbox could not load.');}
  });
  await new Promise((resolve, reject) => {server.once('error', reject);server.listen(port, '127.0.0.1', resolve);});
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === '--export') {
    const destination = path.resolve(process.argv[3] || path.join(root, 'output/study-sandbox.html'));
    await mkdir(path.dirname(destination), {recursive:true});await writeFile(destination, await sandboxHtml());console.log(destination);
  } else {
    const server = await startSandbox();console.log('Study sandbox: http://127.0.0.1:5178/study (no sign-in; test data only)');
    for (const signal of ['SIGINT','SIGTERM']) process.once(signal, () => server.close());
  }
}
