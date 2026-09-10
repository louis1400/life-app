// Temporary device drafts only. Confirmed product data remains in the server database.
export type DraftStore<T>={read:()=>T|null;write:(value:T)=>boolean;clear:()=>void};
export async function draftStore<T>(slot:string):Promise<DraftStore<T>>{
 const response=await fetch('/api/session',{cache:'no-store'});
 if(!response.ok)throw Error(response.status===401?'Sign in to recover your draft.':'Draft recovery is unavailable. Try again.');
 const {draftScope}=await response.json() as {draftScope:string};
 const prefix='life:draft:'+draftScope+':'+slot+':';
 // Separate tabs never overwrite one another's drafts. Recovery considers all copies.
 const key=prefix+crypto.randomUUID();
 let recoveredKey:string|null=null,recoveredRaw:string|null=null;
 return {
  read(){let best:{value:T;at:number}|null=null;for(let n=0;n<localStorage.length;n++){const candidate=localStorage.key(n)!;if(!candidate.startsWith(prefix))continue;try{const raw=localStorage.getItem(candidate)!;const record=JSON.parse(raw);if((!best||record.at>best.at)){best=record;recoveredKey=candidate;recoveredRaw=raw;}}catch{}}return best?.value??null;},
  write(value){try{localStorage.setItem(key,JSON.stringify({at:Date.now(),value}));if(recoveredKey&&localStorage.getItem(recoveredKey)===recoveredRaw){localStorage.removeItem(recoveredKey);recoveredKey=null;}return true;}catch{return false;}},
  clear(){try{localStorage.removeItem(key);if(recoveredKey&&localStorage.getItem(recoveredKey)===recoveredRaw)localStorage.removeItem(recoveredKey);}catch{}}
 };
}
// Files are kept in IndexedDB because localStorage cannot hold upload bytes.
export async function draftFile(key:string,file?:File|null):Promise<File|null>{
 return new Promise((resolve,reject)=>{
  const opening=indexedDB.open('life-draft-files',1);
  opening.onupgradeneeded=()=>opening.result.createObjectStore('files');
  opening.onerror=()=>reject(opening.error);
  opening.onsuccess=()=>{const db=opening.result,tx=db.transaction('files',file===undefined?'readonly':'readwrite'),store=tx.objectStore('files');
   const request=file===undefined?store.get(key):file===null?store.delete(key):store.put(file,key);let result:File|null=null;
   request.onsuccess=()=>{result=file===undefined?(request.result||null):file||null;};
   tx.oncomplete=()=>{db.close();resolve(result);};tx.onerror=()=>{db.close();reject(tx.error);};
  };
 });
}
