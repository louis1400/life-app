import index from "../modules/study/dist/index.html?raw";
import styles from "../modules/study/dist/styles.css?raw";
import study from "../modules/study/dist/study.js?raw";
import reader from "../modules/study/dist/reader.js?raw";
import curriculum from "../modules/study/dist/curriculum-data.js?raw";
import hume from "../modules/study/dist/hume-data.js?raw";
import book from "../modules/study/dist/books/hume-dialogues-complete.txt?raw";

const data = JSON.parse(curriculum.replace(/^window.STUDY_CURRICULUM = /, "").replace(/;\s*$/, ""));
export const readingIds = new Set<string>(data.courses.flatMap((c: { weeks: { readings: { id: string }[] }[] }) => c.weeks.flatMap(w => w.readings.map(r => r.id))));

// Keep upstream Study sources intact. The bridge only adapts its frame and navigation.
const bridge = `<style>
:root{--blue:#254edb;--nav:#172b4d;--ink:#14213c;--line:#dce2ee}
body{background:#f4f6fb}.sidebar .brand{display:none}.sidebar{padding-top:18px}
.toolbar{background:#fff}.course-panel{border-radius:12px}.primary-action{border-radius:7px}
.study-surface h1{font-family:Arial,sans-serif;font-weight:650;letter-spacing:-1px}
@media(min-width:851px){body{grid-template-columns:225px minmax(0,1fr)}.sidebar{width:auto}main{margin-left:0}.study-surface{max-width:1100px;padding:2rem 3rem 4rem}}
</style><script>
function shareRoute(){parent.postMessage({type:'life-study-route',hash:location.hash},location.origin)}
addEventListener('hashchange',shareRoute);addEventListener('load',shareRoute);
if(location.hostname==='127.0.0.1'||location.hostname==='localhost'){
  new MutationObserver(()=>{for(const node of document.querySelectorAll('.sync-state span,.save-status')){
    if(node.textContent==='Progress and notes loaded · saves sync across devices')node.textContent='Progress and notes loaded · local preview';
    if(node.textContent==='Saved across devices')node.textContent='Saved on this computer';
  }}).observe(document,{subtree:true,childList:true,characterData:true});
}
</script>`;

const assets: Record<string, [string, string]> = {
  "": ["text/html", index.replace(/(src|href)="(?!#|https?:)([^"]+)"/g, '$1="/study/content/$2"').replace("</head>", bridge + "</head>")],
  "styles.css": ["text/css", styles],
  "study.js": ["text/javascript", study],
  "reader.js": ["text/javascript", reader],
  "curriculum-data.js": ["text/javascript", curriculum],
  "hume-data.js": ["text/javascript", hume],
  "books/hume-dialogues-complete.txt": ["text/plain", book],
};
export function studyAsset(path: string) {
  const asset = assets[path];
  return asset ? new Response(asset[1], { headers: { "Content-Type": asset[0] + "; charset=utf-8", "X-Content-Type-Options": "nosniff", "Cache-Control": "no-cache" } }) : new Response("Not found", { status: 404 });
}
