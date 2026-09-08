(() => {
  'use strict';
  const book = window.HUME_BOOK;
  const text = document.getElementById('text');
  const title = document.getElementById('section-title');
  const label = document.getElementById('book-label');
  const context = document.getElementById('context');
  const note = document.getElementById('section-note');
  const navigation = document.getElementById('part-nav');
  const library = document.getElementById('library');
  const source = 'https://www.gutenberg.org/cache/epub/4583/pg4583-images.html';
  const week1 = 'https://canvas.eur.nl/courses/57822/pages/preparation-week-1?module_item_id=1657310';
  const week2 = 'https://canvas.eur.nl/courses/57822/pages/preparation-week-2?module_item_id=1657316';
  const publisher = 'https://www.routledge.com/A-New-Modern-Philosophy-The-Inclusive-Anthology-of-Primary-Sources/Marshall-Sreedhar/p/book/9781138484337';
  const catalogue = 'https://ebookcentral-proquest-com.eur.idm.oclc.org/lib/eur/detail.action?docID=5725896';
  const pages = {18:658,12:482,21:689};
  const saved = new Map();
  let storageError = '';
  let storageReady = false;
  const driveChapters={18:'https://drive.google.com/file/d/1RuCNJWf-xrIhyy2FZEs7YODs7Cl21HMf/view',12:'https://drive.google.com/file/d/1c8InCEmwDlZzI6b-PaxgAew9mZVMT5J8/view',21:'https://drive.google.com/file/d/1sMNoLHggEFOq8xfNF_QNj4afiGlc1Yze/view'};
  const chapters = {18: {author:'Montesquieu',week:1},12:{author:'Isaac Newton',week:2},21:{author:'Émilie Du Châtelet',week:2}};
  function element(tag, content, className) { const e = document.createElement(tag); if(content !== undefined) e.textContent = content; if(className) e.className = className; return e; }
  function link(name, href) { const e = element('a', name); e.href = href; if(href.startsWith('https:')) { e.target = '_blank'; e.rel = 'noopener noreferrer'; } return e; }
  function paragraphs(value, parent = text) { for(const paragraph of value.split(/\n\s*\n/).filter(p => p.trim())) parent.append(element('p', paragraph)); }
  function showSources() {
    context.textContent = 'Enlightenment · Reading sources'; label.textContent = 'READING LIBRARY'; title.textContent = 'Sources & text licence'; note.textContent = 'Assignments checked against Canvas on 8 September 2026. Edition details appear on each weekly reading.';
    const box = element('div',undefined,'source-summary');
    box.append(element('h2','Reading assignments'));
    const list = element('ul');
    for(const [name,url] of [['Week 1: Hume Parts 1–3; anthology chapter 18',week1],['Week 2: Hume Parts 4–6; anthology chapters 12 and 21',week2]]) {const li=element('li');li.append(link(name,url));list.append(li);}
    box.append(list,element('h2','Hume’s complete text'),element('p','David Hume, Dialogues Concerning Natural Religion. Project Gutenberg ebook 4583. Produced by Col Choat; HTML version by Al Haines. The preface and all twelve parts are included. Text is reproduced from the source without summaries or modernization; its paragraph breaks are retained. This edition has no matching print-page numbering.'));
    box.append(link('Open the original ebook',source),element('h2','A New Modern Philosophy'),element('p','Eugene Marshall and Susanne Sreedhar (eds.), A New Modern Philosophy: The Inclusive Anthology of Primary Sources, first edition, Routledge, 2019. The weekly lists open the collected chapter PDFs in Drive. Hume and Spinoza use labelled section-matched alternatives with boundary buffers. Each reading shows its assigned scope and saved edition. The original Week 1–2 PDF-import screens remain available through their existing links.'));
    text.append(box);
    const licence=element('details',undefined,'licence');licence.append(element('summary','Project Gutenberg notice and full licence'));licence.append(element('div',book.notice+'\n\n'+book.licence,'source-text'));text.append(licence);
  }
  function showAnthology(number) {
    const chapter=chapters[number];context.textContent=`Week ${chapter.week} · Lecture reading`;label.textContent='A NEW MODERN PHILOSOPHY · 2019 EDITION';title.textContent=`Chapter ${number}`;note.textContent=chapter.author;
    const panel=element('section',undefined,'access-panel');
    panel.append(element('h2',saved.get(number)?'Your saved chapter':'Read the assigned chapter'));
    const readingUrl = `https://ebookcentral-proquest-com.eur.idm.oclc.org/lib/eur/reader.action?docID=5725896&ppg=${pages[number]}`;
    const links=element('div',undefined,'resource-links');
    links.append(link('Open collected chapter in Drive',driveChapters[number]),link('Read through EUR',readingUrl));
    panel.append(links);
    if (saved.get(number)) {
      const open=link('Open saved PDF',`/api/readings/${number}/pdf`);open.target='_blank';open.rel='noopener';
      const download=link('Download saved PDF',`/api/readings/${number}/pdf?download=1`);download.setAttribute('download','');
      links.prepend(open,download);
      const frame=element('iframe',undefined,'pdf-reader');frame.title=`Chapter ${number}: ${chapter.author}`;frame.src=`/api/readings/${number}/pdf`;frame.setAttribute('sandbox','');
      panel.append(frame);
    } else panel.append(element('p','Your collected chapter is available in Drive above. You can optionally add a separate copy to the in-app PDF reader below.'));
    const form=element('form',undefined,'pdf-import');
    const fileLabel=element('label',saved.get(number)?'Replace chapter PDF':'Add chapter PDF');
    const input=element('input');input.type='file';input.accept='application/pdf,.pdf';input.id=`chapter-file-${number}`;input.required=true;fileLabel.htmlFor=input.id;
    const confirmLabel=element('label',undefined,'confirm-reading');const confirm=element('input');confirm.type='checkbox';confirm.required=true;
    confirmLabel.append(confirm,document.createTextNode(`This is chapter ${number} (${chapter.author}) from the 2019 edition.`));
    const button=element('button',saved.get(number)?'Replace saved PDF':'Save to my readings');button.type='submit';button.disabled=!storageReady;
    const status=element('p',storageError || (storageReady?'Saved privately to your account. Maximum 12 MB.':'Checking your saved readings…'),'import-status');status.setAttribute('role','status');
    form.append(fileLabel,input,confirmLabel,button,status);panel.append(form);text.append(panel);
    form.addEventListener('submit',async event=>{
      event.preventDefault();const file=input.files[0];if(!file)return;
      if(file.size>12*1024*1024){status.textContent='Choose a chapter PDF smaller than 12 MB.';return;}
      button.disabled=true;status.textContent='Saving your chapter…';
      try {
        if(new TextDecoder().decode(await file.slice(0,5).arrayBuffer())!=='%PDF-')throw new Error('Choose a valid PDF file.');
        const response=await fetch(`/api/readings/${number}`,{method:'PUT',headers:{'Content-Type':'application/pdf'},body:file});
        const result=await response.json();if(!response.ok)throw new Error(result.error || 'The PDF could not be saved.');
        saved.set(number,true);updateBadges();
        if(location.hash===`#anthology-${number}`){render();const message=document.querySelector('.import-status');if(message)message.textContent='Chapter saved. Open it here whenever you need it.';}
      }catch(error){status.textContent=error.message || 'Saving failed. Your selected file is still here; try again.';button.disabled=false;}
    });
    text.append(element('p','Eugene Marshall and Susanne Sreedhar (eds.), A New Modern Philosophy: The Inclusive Anthology of Primary Sources. Routledge, 2019.','citation'));
    text.append(link(`View Week ${chapter.week} assignment`,chapter.week===1?week1:week2));
  }
  function render() {
    if(!book) {text.replaceChildren(element('p','The book could not be loaded. Use the complete-text download above.','unavailable'));return;}
    let key=location.hash.slice(1)||'coursework';
    if(!book.sections[key] && key!=='sources' && key!=='needed' && key!=='coursework' && !/^session-(enlightenment|moral)-[1-8]-[0-9]+$/.test(key) && !/^study-(enlightenment|moral)-[1-8]$/.test(key) && !/^anthology-(18|12|21)$/.test(key)) key='coursework';
    if(key.startsWith('session-')&&!window.STUDY.isReading(key.slice(8)))key='coursework';
    text.replaceChildren();navigation.replaceChildren();
    document.getElementById('reading').classList.remove('study-surface');
    document.getElementById('hume-download').hidden=false;
    document.querySelectorAll('.reading-link').forEach(a=>{if(a.hash==='#'+key)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    if(window.STUDY.render(key)) {}
    else if(key==='sources') showSources();
    else if(key.startsWith('anthology-')) showAnthology(Number(key.split('-')[1]));
    else {
      const section=book.sections[key];title.textContent=section.title;label.textContent='DAVID HUME · DIALOGUES CONCERNING NATURAL RELIGION';
      const index=book.order.indexOf(key);const part=Number(key.split('-')[1]);context.textContent=part>=1&&part<=12?`Week ${Math.ceil(part/3)} · Tutorial reading`:'Enlightenment · Complete Hume text';
      if(part>=1&&part<=12)text.append(link('← Back to Week '+Math.ceil(part/3),'#study-enlightenment-'+Math.ceil(part/3)));
      note.textContent=key==='hume-preface'?'Pamphilus to Hermippus':'Original text · Complete book available';paragraphs(section.text);
      if(index>0)navigation.append(link('← '+book.sections[book.order[index-1]].title,'#'+book.order[index-1]));
      if(index<book.order.length-1)navigation.append(link(book.sections[book.order[index+1]].title+' →','#'+book.order[index+1]));
      else navigation.append(link('Sources & text licence','#sources'));
    }
    document.title=`${title.textContent} · Study · Life App`;
    document.getElementById('main-scroll').scrollTop=0;
    if(window.matchMedia('(max-width: 850px)').matches) {library.open=false;window.scrollTo(0,0);}
  }
  function updateBadges() {
    for(const number of Object.keys(chapters)) {
      const badge=document.querySelector(`[href="#anthology-${number}"] .needed`);
      if(badge)badge.textContent=saved.get(Number(number))?'Saved PDF':'Read online';
    }
  }
  async function loadSaved() {
    try {
      const response=await fetch('/api/readings',{cache:'no-store'});
      if(!(response.headers.get('content-type')||'').includes('application/json'))throw new Error('PDF saving is available in the hosted app. You can read through EUR now.');
      const result=await response.json();if(!response.ok)throw new Error(result.error || 'Saved readings are unavailable.');
      for(const row of result.readings)saved.set(row.chapter,row.saved);
      storageReady=true;
    } catch(error) {storageError=error.message || 'Saved readings are unavailable. Please reload to try again.';}
    updateBadges();
    if(location.hash.startsWith('#anthology-'))render();
  }
  updateBadges();render();loadSaved();
  window.addEventListener('courseworkchange',()=>render());
  window.addEventListener('hashchange',()=>{render();document.getElementById('reading').focus({preventScroll:true});});
})();
