import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

test('coursework refresh preserves scroll, Notes tab, disclosures and caret; route changes reset scroll',()=>{
  const listeners=new Map(),nodes=new Map();let selected='tab-Study',details,field,panel;
  const element=()=>({id:'',scrollTop:0,open:false,attributes:{},classList:{remove(){},add(){}},append(){},replaceChildren(){},setAttribute(k,v){this.attributes[k]=v;},getAttribute(k){return this.attributes[k]??null;},removeAttribute(k){delete this.attributes[k];},focus(options){assert.equal(options.preventScroll,true);document.activeElement=this;}});
  for(const id of ['text','section-title','book-label','context','section-note','part-nav','library','main-scroll','reading','hume-download'])nodes.set(id,element());
  const text=nodes.get('text');
  text.querySelectorAll=selector=>selector==='details'?[details]:selector==='input,textarea,select,button,a'?[field]:[];
  text.querySelector=selector=>selector==='.panel-Reading'?panel:null;
  text.contains=node=>node===field;
  const document={activeElement:null,getElementById:id=>nodes.get(id),querySelectorAll:()=>[],querySelector:selector=>selector==='.session-tabs [aria-selected="true"]'?nodes.get(selected):null,createElement:element};
  const window={scrollY:0,scrollTo(x,y){this.scrollY=y;},matchMedia:()=>({matches:true}),addEventListener:(name,fn)=>listeners.set(name,fn),HUME_BOOK:{sections:{},order:[]},STUDY:{isReading:()=>true,render(){
    selected='tab-Study';
    for(const id of ['tab-Study','tab-Reading','tab-Notes'])nodes.set(id,{id,click(){selected=id;}});
    details={open:false,querySelector:()=>({textContent:'Finish this session'})};
    field=element();field.setAttribute('data-draft-field','reading:enlightenment-1-0:notes');field.selectionStart=0;field.selectionEnd=0;field.setSelectionRange=function(start,end){this.selectionStart=start;this.selectionEnd=end;};
    panel={scrollTop:0};return true;
  }}};
  const location={hash:'#session-enlightenment-1-0'};
  vm.runInNewContext(readFileSync(new URL('../dist/reader.js',import.meta.url),'utf8'),{window,document,location,fetch:async()=>Response.json({readings:[]}),Map});
  nodes.get('main-scroll').scrollTop=600;window.scrollY=280;panel.scrollTop=170;details.open=true;selected='tab-Notes';document.activeElement=field;field.selectionStart=3;field.selectionEnd=8;const oldField=field;
  listeners.get('courseworkchange')();
  assert.equal(nodes.get('main-scroll').scrollTop,600);assert.equal(window.scrollY,280);assert.equal(panel.scrollTop,170);assert.equal(selected,'tab-Notes');assert.equal(details.open,true);
  assert.notEqual(field,oldField);assert.equal(document.activeElement,field);assert.equal(field.selectionStart,3);assert.equal(field.selectionEnd,8);
  location.hash='#study-enlightenment-2';listeners.get('hashchange')();
  assert.equal(nodes.get('main-scroll').scrollTop,0);assert.equal(window.scrollY,0);assert.equal(nodes.get('library').open,false);
});
