export const kinds = ["Article", "Video", "GIF", "Meme", "Image", "Audio", "Document", "Link"] as const;
export const destinations = ["Reading", "Watch later", "Reactions", "Study", "Recipes", "Shopping", "Places"];
export type Item = { sourceFolder:string|null; sourceFileUrl:string|null; version:number; syncPending:boolean; syncError:string; id:string; title:string; url:string; kind:string; note:string; tags:string[]; destinations:string[]; fileName:string|null; mime:string|null; size:number; content:string; createdAt:string; updatedAt:string; hasFile:boolean; storage:"google-drive"|"legacy"|"external-drive"; driveUrl:string|null };
export function normalizeUrl(value:string) {
 if(!value.trim()) return "";
 const u=new URL(value.trim());
 if(!['http:','https:'].includes(u.protocol)||u.username||u.password) throw new Error("Use an http or https link without embedded credentials.");
 return u.href;
}
export function inferKind(url:string,name="",mime=""):string {
 const path=(url.split(/[?#]/)[0]+" "+name).toLowerCase();
 let host='';try{host=new URL(url).hostname;}catch{}
 if(mime==='image/gif'||/\.gif\b/.test(path)||/(^|\.)(giphy\.com|tenor\.com)$/.test(host))return 'GIF';
 if(mime.startsWith('video/')||/\.(mp4|mov|webm|m4v)\b/.test(path)||/(^|\.)(youtube\.com|youtu\.be|vimeo\.com|tiktok\.com)$/.test(host))return 'Video';
 if(mime.startsWith('image/')||/\.(jpg|jpeg|png|webp|heic)\b/.test(path))return 'Image';
 if(mime.startsWith('audio/'))return 'Audio';
 if(name||/\.pdf\b/.test(path))return 'Document';
 return 'Link';
}
export function suggest(kind:string,value:string){
 const text=value.toLowerCase(), result:string[]=[];
 if(kind==='Article')result.push('Reading');
 if(kind==='Video')result.push('Watch later');
 if(kind==='GIF'||kind==='Meme')result.push('Reactions');
 if(/\b(philosophy|hume|kant|ethics|lecture|course|filosofie|college|studie)\b/.test(text))result.push('Study');
 if(/\b(recipe|recipes|recept|recepten|ingredients|ingrediënten)\b/.test(text))result.push('Recipes');
 if(/\b(buy|shopping|product|kopen|winkel)\b/.test(text))result.push('Shopping');
 if(/\b(restaurant|travel|hotel|cafe|café|reizen)\b/.test(text))result.push('Places');
 return [...new Set(result)];
}
