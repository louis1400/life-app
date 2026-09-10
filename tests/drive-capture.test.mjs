import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const source = readFileSync(new URL('../integrations/drive-capture/Code.gs', import.meta.url), 'utf8');
function fixture(email = 'louisnijholt@gmail.com') {
  const items = [];
  let released = 0;
  const iterator = values => { let i = 0; return { hasNext: () => i < values.length, next: () => values[i++] }; };
  const folders = ['Inbox', 'Videos', 'Articles & links', 'My collection'].map((name, i) => ({
    getId: () => String(i), getName: () => name, isTrashed: () => false,
    getFiles: () => iterator(items.filter(f => f.folderId === String(i))),
    createFile(filename, content) {
      const file = { folderId: String(i), filename, content, description: '', trashed: false,
        getDescription() { return this.description; },
        setDescription(value) { this.description = value; },
        isTrashed() { return this.trashed; }, setTrashed(value) { this.trashed = value; },
        getId:()=> 'exported_file_123',getName:()=>filename,getMimeType:()=> 'text/plain',getSize:()=>content.length,getBlob:()=>({getDataAsString:()=>content}),getUrl: () => 'https://drive.google.com/file/d/test/view' };
      items.push(file); return file;
    }
  }));
  const context = vm.createContext({
    Session: { getActiveUser: () => ({ getEmail: () => email }) },
    DriveApp: { getFolderById: id => id === '1KpUo5LW2kAFgbLCeDcNW1PvK2aS_TCwj'
      ? { getFolders: () => iterator(folders) } : folders.find(f => f.getId() === id) },
    MimeType: { PLAIN_TEXT: 'text/plain' },
    Utilities: { DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
      computeDigest: (_, value) => [...createHash('sha256').update(value).digest()] },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => { released++; } }) }
  });
  vm.runInContext(source, context);
  return { context, items, released: () => released };
}

test('explicit folder overrides video suggestion and preserves tags and original URL', () => {
  const { context: c, items, released } = fixture();
  assert.equal(c.suggest_('https://youtu.be/example', c.folders_()), '1');
  const url = 'https://youtu.be/example?si=abc&t=20#chapter';
  c.saveBookmark({ url, folderId: '3', title: 'A lecture', tags: 'philosophy, watch later, philosophy' });
  assert.equal(items[0].folderId, '3');
  assert.ok(items[0].content.includes(url));
  assert.ok(items[0].content.includes('Tags: philosophy, watch later\n'));
  assert.equal(released(), 1);
});

test('retries do not create duplicates or silently replace earlier metadata', () => {
  const { context: c, items } = fixture();
  const input = { url: 'https://example.org/article', folderId: '2', tags: 'original' };
  assert.equal(c.saveBookmark(input).duplicate, false);
  assert.equal(c.saveBookmark({ ...input, tags: 'changed' }).duplicate, true);
  assert.equal(items.length, 1);
  assert.ok(items[0].content.includes('Tags: original'));
  c.saveBookmark({ ...input, folderId: '3' });
  assert.equal(items.length, 2);
});

test('rejects unauthorized users, outside folders, malformed links and excess tags before writes', () => {
  assert.throws(() => fixture('someone@example.com').context.saveBookmark({}), /signed in/);
  const { context: c, items } = fixture();
  assert.throws(() => c.saveBookmark({ url: 'https://example.org', folderId: 'outside' }), /Choose a folder/);
  for (const url of ['javascript:alert(1)', 'https://user:secret@example.org', 'https://example.org/one two', 'garbage']) {
    assert.throws(() => c.saveBookmark({ url, folderId: '0' }));
  }
  assert.throws(() => c.saveBookmark({ url: 'https://example.org', folderId: '0', tags: 'a'.repeat(81) }), /tags/);
  assert.equal(items.length, 0);
});

test('social posts stay undecided and lookalike video domains do not count as YouTube', () => {
  const { context: c } = fixture();
  assert.equal(c.suggest_('https://instagram.com/p/example', c.folders_()), '0');
  assert.equal(c.suggest_('https://youtube.com.evil.example/video', c.folders_()), '2');
  assert.equal(c.suggest_('https://example.org', c.folders_()), '2');
});


test('capture export retains the chosen folder and metadata without moving or modifying the source',()=>{
 const {context:c,items}=fixture();c.saveBookmark({url:'https://example.org/phone',title:'Phone find',folderId:'3',tags:'original, phone'});
 const before=JSON.stringify(items);const exported=JSON.parse(JSON.stringify(c.exportVaultCaptures()));
 assert.equal(exported.format,'life-archive/captures-v1');assert.equal(exported.records[0].folder,'My collection');assert.equal(exported.records[0].title,'Phone find');assert.deepEqual(exported.records[0].tags,['original','phone']);assert.equal(exported.records[0].driveFileId,'exported_file_123');assert.equal(JSON.stringify(items),before);
 assert.throws(()=>fixture('other@example.com').context.exportVaultCaptures(),/signed in/);
});
