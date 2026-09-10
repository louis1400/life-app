// Run with PLAYWRIGHT_MODULE pointing to an installed Playwright entrypoint,
// or with `playwright` installed normally. CI provisions its own browser.
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import {startSandbox,sandboxHtml} from '../scripts/study-sandbox.mjs';
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const server = await startSandbox({port:0});
const origin = 'http://127.0.0.1:' + server.address().port;
let browser;
await mkdir('output/study-browser', {recursive:true});
try {
  browser = await chromium.launch({headless:true});
  for (const width of [1440,390]) {
    const context = await browser.newContext({viewport:{width,height:900}});
    const page = await context.newPage();
    const errors = [], external = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', msg => {if(msg.type()==='error')errors.push(msg.text());});
    await context.route('**/*', route => {
      if(new URL(route.request().url()).origin!==origin){external.push(route.request().url());return route.abort();}
      return route.continue();
    });
    page.on('dialog', dialog => dialog.accept());
    await page.goto(origin+'/study');
    await page.getByText('Test progress loaded · saved only in this browser',{exact:true}).waitFor();
    assert.equal(await page.getByRole('link',{name:'Open this week',exact:true}).count(),2);
    await page.getByRole('button',{name:'Start from zero',exact:true}).click();
    await page.getByRole('button',{name:'Set week',exact:true}).first().waitFor();
    assert.equal(await page.getByRole('button',{name:'Set week',exact:true}).count(),2);
    const course = page.locator('.course-panel').filter({has:page.getByRole('heading',{name:'Enlightenment',exact:true})});
    await course.locator('summary').filter({hasText:'Browse all weeks'}).click();
    await course.getByRole('link',{name:/Week 1 ·/}).click();
    await page.getByRole('heading',{name:'Week 1',exact:true}).waitFor();
    await page.screenshot({path:`output/study-browser/week-1-${width}.png`,fullPage:true});
    const hume = page.locator('.reading-card').filter({has:page.getByRole('heading',{name:'Dialogues Concerning Natural Religion',exact:true})});
    await hume.getByRole('link',{name:'Study this reading',exact:true}).click();
    await page.getByRole('tab',{name:'Reading',exact:true}).click();
    await page.locator('.inline-reading').first().waitFor({state:'visible'});
    await page.getByRole('tab',{name:'Notes',exact:true}).click();
    const notes = page.getByRole('tabpanel',{name:'Notes',exact:true});
    await notes.getByLabel('Your notes',{exact:true}).fill('Sandbox smoke test: reconstruct the first argument.');
    await notes.getByRole('button',{name:'Save',exact:true}).click();
    await notes.getByText('Saved in this test browser',{exact:true}).waitFor();
    await page.reload();
    await page.getByText('Test progress loaded · saved only in this browser',{exact:true}).waitFor();
    await page.getByRole('tab',{name:'Notes',exact:true}).click();
    assert.equal(await page.getByLabel('Your notes',{exact:true}).inputValue(),'Sandbox smoke test: reconstruct the first argument.');
    await page.getByRole('tab',{name:'Study',exact:true}).click();
    await page.getByRole('link',{name:'Open ChatGPT',exact:true}).click();
    await page.getByRole('dialog').waitFor({state:'visible'});
    await page.getByRole('button',{name:'Back to studying',exact:true}).click();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    assert.equal(overflow,false,'Unexpected horizontal overflow');
    await page.screenshot({path:`output/study-browser/session-${width}.png`,fullPage:true});
    assert.deepEqual(errors,[],'Browser errors');
    assert.deepEqual(external,[],'Unexpected external requests');
    await context.close();
    console.log(`PASS ${width}px: blank start, week one, Hume reading, saved notes after reload, external handoff, layout, console`);
  }
  const portablePath = path.resolve('output/study-sandbox.html');
  await writeFile(portablePath,await sandboxHtml());
  const portable = await browser.newContext();
  const page = await portable.newPage();
  const errors = [];
  page.on('pageerror',error=>errors.push(error.message));
  await portable.setOffline(true);
  await page.goto(pathToFileURL(portablePath).href + '#session-enlightenment-1-1');
  await page.getByText('Test progress loaded · saved only in this browser',{exact:true}).waitFor();
  await page.getByRole('tab',{name:'Notes',exact:true}).click();
  const notes = page.getByRole('tabpanel',{name:'Notes',exact:true});
  await notes.getByLabel('Your notes',{exact:true}).fill('Portable offline note');
  await notes.getByRole('button',{name:'Save',exact:true}).click();
  await notes.getByText('Saved in this test browser',{exact:true}).waitFor();
  await page.reload();
  await page.getByText('Test progress loaded · saved only in this browser',{exact:true}).waitFor();
  await page.getByRole('tab',{name:'Notes',exact:true}).click();
  assert.equal(await page.getByLabel('Your notes',{exact:true}).inputValue(),'Portable offline note');
  assert.deepEqual(errors,[]);
  await portable.close();
  console.log('PASS portable file: no server, offline, saved notes survive reload');
} finally {
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
}
