import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { organizationInput, starterOrganizations } from '../lib/organizations/model.ts';
import { INSERT_ORGANIZATION, UPDATE_ORGANIZATION } from '../lib/organizations/sql.ts';

test('watchlist accepts the starters and rejects unsafe links and invalid writes',()=>{
  for (const starter of starterOrganizations) assert.equal(organizationInput.safeParse(starter).success,true);
  for (const patch of [{url:'javascript:alert(1)'},{url:'data:text/html,hello'},{name:' '},{status:'Unknown'},{version:-1},{notes:'x'.repeat(6001)},{user_id:'another-user'}]) {
    assert.equal(organizationInput.safeParse({...starterOrganizations[0],...patch}).success,false);
  }
});

test('watchlist persistence isolates users, preserves archived starters and rejects stale updates',()=>{
  const db=new DatabaseSync(':memory:');
  try {
    const migration=readdirSync('drizzle').filter(path=>path.endsWith('.sql')).map(path=>readFileSync('drizzle/'+path,'utf8')).find(sql=>sql.includes('CREATE TABLE `organization_watchlist`'));
    assert.ok(migration,'Generated watchlist migration must be checked in');db.exec(migration);
    const seed=starterOrganizations[0];
    const insert=user=>db.prepare(INSERT_ORGANIZATION).run(user,seed.id,seed.name,seed.url,seed.reason,seed.notes,seed.nextStep,seed.status,0);
    const update=(user,version,archived)=>db.prepare(UPDATE_ORGANIZATION).run(seed.name,seed.url,seed.reason,'Updated notes',seed.nextStep,'Researching',archived,user,seed.id,version);
    assert.equal(insert('a').changes,1);assert.equal(insert('a').changes,0);assert.equal(insert('b').changes,1);
    assert.equal(update('a',1,1).changes,1);assert.equal(update('a',1,0).changes,0);
    assert.equal(insert('a').changes,0);
    const a=db.prepare('SELECT * FROM organization_watchlist WHERE user_id=?').get('a');
    const b=db.prepare('SELECT * FROM organization_watchlist WHERE user_id=?').get('b');
    assert.equal(a.archived,1);assert.equal(a.notes,'Updated notes');assert.equal(a.version,2);
    assert.equal(b.archived,0);assert.equal(b.notes,seed.notes);assert.equal(b.version,1);
    assert.equal(update('a',2,0).changes,1);assert.equal(update('unknown',1,0).changes,0);
    assert.equal(db.prepare('SELECT archived FROM organization_watchlist WHERE user_id=?').get('a').archived,0);
  } finally {db.close();}
});
