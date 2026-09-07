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
  const catalogue = 'https://eur.on.worldcat.org/search?queryString=A%20New%20Modern%20Philosophy';
  const chapters = {18: {author:'Montesquieu',week:1},12:{author:'Isaac Newton',week:2},21:{author:'Émilie Du Châtelet',week:2}};
  function element(tag, content, className) { const e = document.createElement(tag); if(content !== undefined) e.textContent = content; if(className) e.className = className; return e; }
  function link(name, href) { const e = element('a', name); e.href = href; if(href.startsWith('https:')) { e.target = '_blank'; e.rel = 'noopener noreferrer'; } return e; }
  function paragraphs(value, parent = text) { for(const paragraph of value.split(/\n\s*\n/).filter(p => p.trim())) parent.append(element('p', paragraph)); }
  function showSources() {
    context.textContent = 'Enlightenment · Reading sources'; label.textContent = 'READING LIBRARY'; title.textContent = 'Sources & text licence'; note.textContent = 'Assignments checked against Canvas on 7 September 2026.';
    const box = element('div',undefined,'source-summary');
    box.append(element('h2','Reading assignments'));
    const list = element('ul');
    for(const [name,url] of [['Week 1: Hume Parts 1–3; anthology chapter 18',week1],['Week 2: Hume Parts 4–6; anthology chapters 12 and 21',week2]]) {const li=element('li');li.append(link(name,url));list.append(li);}
    box.append(list,element('h2','Hume’s complete text'),element('p','David Hume, Dialogues Concerning Natural Religion. Project Gutenberg ebook 4583. Produced by Col Choat; HTML version by Al Haines. The preface and all twelve parts are included. Text is reproduced from the source without summaries or modernization; its paragraph breaks are retained. This edition has no matching print-page numbering.'));
    box.append(link('Open the original ebook',source),element('h2','A New Modern Philosophy'),element('p','Eugene Marshall and Susanne Sreedhar (eds.), A New Modern Philosophy: The Inclusive Anthology of Primary Sources, first edition, Routledge, 2019. The assigned chapters are identified, but their text has not been added. A later edition or another translation has not been substituted.'));
    text.append(box);
    const licence=element('details',undefined,'licence');licence.append(element('summary','Project Gutenberg notice and full licence'));licence.append(element('div',book.notice+'\n\n'+book.licence,'source-text'));text.append(licence);
  }
  function showAnthology(number) {
    const chapter=chapters[number];context.textContent=`Week ${chapter.week} · Lecture reading`;label.textContent='A NEW MODERN PHILOSOPHY · 2019 EDITION';title.textContent=`Chapter ${number}`;note.textContent=chapter.author;
    const panel=element('section',undefined,'access-panel');panel.append(element('h2','Text still needed'),element('p','This chapter is assigned, but a copy has not been added to your reading library. You need access to the 2019 edition to read the exact selection here.'));
    const links=element('div',undefined,'resource-links');links.append(link('Check EUR catalogue',catalogue),link('Publisher’s book details',publisher));panel.append(links);text.append(panel);
    text.append(element('p','Eugene Marshall and Susanne Sreedhar (eds.), A New Modern Philosophy: The Inclusive Anthology of Primary Sources. Routledge, 2019.','citation'));
    text.append(link(`View Week ${chapter.week} assignment`,chapter.week===1?week1:week2));
  }
  function render() {
    if(!book) {text.replaceChildren(element('p','The book could not be loaded. Use the complete-text download above.','unavailable'));return;}
    let key=location.hash.slice(1)||'hume-1';
    if(!book.sections[key] && key!=='sources' && !/^anthology-(18|12|21)$/.test(key)) key='hume-1';
    text.replaceChildren();navigation.replaceChildren();
    document.querySelectorAll('.reading-link').forEach(a=>{if(a.hash==='#'+key)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    if(key==='sources') showSources();
    else if(key.startsWith('anthology-')) showAnthology(Number(key.split('-')[1]));
    else {
      const section=book.sections[key];title.textContent=section.title;label.textContent='DAVID HUME · DIALOGUES CONCERNING NATURAL RELIGION';
      const index=book.order.indexOf(key);const part=Number(key.split('-')[1]);context.textContent=part>=1&&part<=3?'Week 1 · Tutorial reading':part>=4&&part<=6?'Week 2 · Tutorial reading':'Enlightenment · Complete Hume text';
      note.textContent=key==='hume-preface'?'Pamphilus to Hermippus':'Original text · Complete book available';paragraphs(section.text);
      if(index>0)navigation.append(link('← '+book.sections[book.order[index-1]].title,'#'+book.order[index-1]));
      if(index<book.order.length-1)navigation.append(link(book.sections[book.order[index+1]].title+' →','#'+book.order[index+1]));
      else navigation.append(link('Sources & text licence','#sources'));
    }
    document.title=`${title.textContent} · Study · Life App`;
    document.getElementById('main-scroll').scrollTop=0;
    if(window.matchMedia('(max-width: 850px)').matches) {library.open=false;window.scrollTo(0,0);}
  }
  render();
  window.addEventListener('hashchange',()=>{render();document.getElementById('reading').focus({preventScroll:true});});
})();
