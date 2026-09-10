const COURSE_IDS = new Set(['enlightenment','moral']);
const statusValues = new Set(['not-started','in-progress','done']);
const MAX_BODY = 80000;
const cwJson = (data, status=200) => Response.json(data, {status,headers:{'Cache-Control':'private, no-store','Vary':'oai-authenticated-user-id'}});
export function validChatUrl(value) {
  if(value==='')return true;
  if(typeof value!=='string'||value.length>2000)return false;
  try {const u=new URL(value);return u.protocol==='https:'&&u.hostname==='chatgpt.com'&&!u.username&&!u.password&&!u.search&&!u.hash&&/^\/(?:c\/[a-zA-Z0-9-]+|g\/[a-zA-Z0-9-]+(?:\/project)?)\/?$/.test(u.pathname);}catch{return false;}
}
function validateEntry(id,data,readingIds) {
  if(!data||typeof data!=='object'||Array.isArray(data))return false;
  let allowed;
  if(id.startsWith('plan:')) {
    if(!COURSE_IDS.has(id.slice(5)))return false;
    allowed=['week','chatUrl'];if(!Number.isInteger(data.week)||data.week<1||data.week>8||!validChatUrl(data.chatUrl))return false;
  } else if(id.startsWith('reading:')) {
    if(!readingIds.has(id.slice(8)))return false;
    allowed=['progress','notes','resume','chatUrl'];
    if(!statusValues.has(data.progress)||!validChatUrl(data.chatUrl)||typeof data.notes!=='string'||data.notes.length>24000||typeof data.resume!=='string'||data.resume.length>4000)return false;
  } else if(/^week:(enlightenment|moral):[1-8]$/.test(id)) {
    allowed=['notes'];if(typeof data.notes!=='string'||data.notes.length>24000)return false;
  } else if(/^session:[a-f0-9-]{36}$/.test(id)) {
    allowed=['readingId','summary','questions','resume'];
    if(!readingIds.has(data.readingId))return false;
    for(const key of ['summary','questions','resume'])if(typeof data[key]!=='string'||data[key].length>8000)return false;
    if(!data.summary.trim()&&!data.questions.trim()&&!data.resume.trim())return false;
  } else return false;
  return Object.keys(data).every(k=>allowed.includes(k));
}
function dbFor(env) { return env.DB; }
export async function courseworkApi(request, env, readingIds) {
  const user=request.headers.get('oai-authenticated-user-id');if(!user)return cwJson({error:'Sign in to save and load your coursework.'},401);
  const db=dbFor(env);if(!db)return cwJson({error:'Coursework saving is not connected yet. Your edits will stay on this page until you can retry.'},503);
  const path=new URL(request.url).pathname;
  try {
    if(path==='/api/coursework'&&request.method==='GET') {
      const result=await db.prepare('SELECT entry_id, data, version, updated_at FROM coursework_entries WHERE owner_id = ? ORDER BY updated_at DESC LIMIT 1001').bind(user).all();
      if(result.results.length>1000)return cwJson({error:'Your coursework history is too large to load safely. No changes were made.'},503);
      const draftScope=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(user))),b=>b.toString(16).padStart(2,'0')).join('');
      return cwJson({draftScope,entries:result.results.map(r=>({id:r.entry_id,data:JSON.parse(r.data),version:r.version,updatedAt:r.updated_at}))});
    }
    const match=path.match(/^\/api\/coursework\/([^/]+)$/);if(!match)return cwJson({error:'Not found.'},404);
    if(request.method!=='PUT')return cwJson({error:'Method not allowed.'},405);
    if(request.headers.get('Origin')!==new URL(request.url).origin)return cwJson({error:'Save from the coursework page.'},403);
    if(!(request.headers.get('Content-Type')||'').startsWith('application/json'))return cwJson({error:'Expected coursework data.'},415);
    if(Number(request.headers.get('Content-Length'))>MAX_BODY)return cwJson({error:'This note is too long.'},413);
    const reader=request.body?.getReader();if(!reader)return cwJson({error:'No changes received.'},400);
    let size=0;const chunks=[];while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_BODY){await reader.cancel();return cwJson({error:'This note is too long.'},413);}chunks.push(value);}
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
    let payload,id;try{payload=JSON.parse(new TextDecoder().decode(bytes));id=decodeURIComponent(match[1]);}catch{return cwJson({error:'Invalid coursework data.'},400);}
    if(!Number.isInteger(payload?.version)||payload.version<0||!validateEntry(id,payload.data,readingIds))return cwJson({error:'Check the note, progress, week, or ChatGPT link and try again.'},400);
    const now=new Date().toISOString();const serialized=JSON.stringify(payload.data);let result;
    if(payload.version===0)result=await db.prepare('INSERT INTO coursework_entries (owner_id, entry_id, data, version, updated_at) VALUES (?, ?, ?, 1, ?) ON CONFLICT(owner_id, entry_id) DO NOTHING').bind(user,id,serialized,now).run();
    else result=await db.prepare('UPDATE coursework_entries SET data = ?, version = version + 1, updated_at = ? WHERE owner_id = ? AND entry_id = ? AND version = ?').bind(serialized,now,user,id,payload.version).run();
    if(result.meta.changes!==1)return cwJson({error:'This item changed on another device. Copy your unsaved text before reloading to review the latest version.'},409);
    return cwJson({entry:{id,data:payload.data,version:payload.version+1,updatedAt:now}});
  }catch(error){console.error('Coursework storage failed',error?.name??'Error');return cwJson({error:'Could not load or save coursework. Your edits are still on this page; retry when connected.'},503);}
}
