import { db } from '@/lib/archive-server';
import { getEvents } from '@/db/groceries';
import { PRODUCTS } from '@/lib/groceries/catalog';
import { stateFor } from '@/lib/groceries/model';
import { studyCourses } from '@/lib/study';
import type { HomeOverview } from '@/lib/home';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
type StudyRow={entry_id:string;week:number|null;progress:string|null;resume:string|null;updated_at:string};
export async function GET(request:Request){
  const owner=request.headers.get('oai-authenticated-user-id');if(!owner)return json({error:'Sign in to open your overview.'},401);
  const results=await Promise.allSettled([
    (async()=>{
      const {results:rows}=await db().prepare("SELECT entry_id,json_extract(data,'$.week') AS week,json_extract(data,'$.progress') AS progress,json_extract(data,'$.resume') AS resume,updated_at FROM coursework_entries WHERE owner_id=? AND (entry_id LIKE 'plan:%' OR entry_id LIKE 'reading:%') ORDER BY updated_at DESC").bind(owner).all<StudyRow>();
      const {results:sessions}=await db().prepare("SELECT json_extract(s.data,'$.readingId') AS reading_id,json_extract(s.data,'$.resume') AS resume FROM coursework_entries s LEFT JOIN coursework_entries r ON r.owner_id=s.owner_id AND r.entry_id='reading:'||json_extract(s.data,'$.readingId') WHERE s.owner_id=? AND s.entry_id LIKE 'session:%' AND COALESCE(json_extract(r.data,'$.progress'),'not-started')!='done' ORDER BY s.updated_at DESC LIMIT 1").bind(owner).all<{reading_id:string;resume:string}>();
      const byId=new Map(rows.map(row=>[row.entry_id,row]));
      const all=studyCourses.flatMap(c=>c.weeks.flatMap(w=>w.readings));
      const active=all.find(r=>r.id===sessions[0]?.reading_id)||all.find(r=>r.id===rows.find(row=>row.progress==='in-progress')?.entry_id.slice(8));
      return {courses:studyCourses.map(course=>{const week=course.weeks.find(w=>w.number===byId.get('plan:'+course.id)?.week);return {id:course.id,name:course.name,week:week?.number??null,title:week?.title??null,total:week?.readings.length??0,done:week?.readings.filter(r=>byId.get('reading:'+r.id)?.progress==='done').length??0};}),resume:active?{title:active.title,href:'/study#session-'+active.id,note:sessions[0]?.resume||byId.get('reading:'+active.id)?.resume||''}:null};
    })(),
    (async()=>{const events=await getEvents(owner);return PRODUCTS.reduce((sum,p)=>{const count=stateFor(p.id,events).queuePacks;return {packs:sum.packs+count,total:sum.total+p.priceCents*count};},{packs:0,total:0});})(),
    (async()=>{const {results:counts}=await db().prepare('SELECT COUNT(*) AS count FROM archive_items WHERE owner=?').bind(owner).all<{count:number}>();const {results:latest}=await db().prepare('SELECT id,title FROM archive_items WHERE owner=? ORDER BY created_at DESC LIMIT 1').bind(owner).all<{id:string;title:string}>();return {count:counts[0]?.count??0,latest:latest[0]??null};})(),
  ]);
  const overview:HomeOverview={study:results[0].status==='fulfilled'?results[0].value:null,groceries:results[1].status==='fulfilled'?results[1].value:null,vault:results[2].status==='fulfilled'?results[2].value:null};
  for(const result of results)if(result.status==='rejected')console.error('Home summary unavailable',result.reason);
  return json(overview);
}
