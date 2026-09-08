(() => {
  'use strict';
  const data = window.STUDY_CURRICULUM;
  const el = (tag, value, cls) => { const node = document.createElement(tag); if(value) node.textContent=value; if(cls) node.className=cls; return node; };
  const a = (title, href, cls) => { const node=el('a',title,cls); node.href=href; if(href.startsWith('https:')) { node.target='_blank'; node.rel='noopener noreferrer'; } return node; };
  const states={assigned:'Assigned text',alternative:'Alternative edition',manuscript:'Author manuscript',reprint:'Teaching reprint',missing:'Not collected'};
  function route(course,week) { return `#study-${course.id}-${week.number}`; }
  const missing=data.courses.flatMap(course=>course.weeks.flatMap(week=>week.readings.filter(r=>r.status==='missing').map(reading=>({course,week,reading}))));
  function card(r) {
    const item=el('section',null,'reading-card');
    const top=el('div',null,'reading-meta');top.append(el('span',r.kind),el('span',states[r.status],`reading-status ${r.status}`));
    item.append(top,el('h2',r.title),el('p',[r.author,r.scope].filter(Boolean).join(' · '),'reading-scope'));
    if(r.note)item.append(el('p',r.note,'edition-note'));
    if(r.check)item.append(el('p','Reference needs checking','check-note'));
    const actions=el('div',null,'reading-actions');
    if(r.route)actions.append(a('Read in app',r.route,'primary-action'));
    if(r.url)actions.append(a(r.route?'Open copy in Drive':'Open reading in Drive',r.url,r.route?'':'primary-action'));
    if(r.status==='missing')actions.append(el('span','Reading unavailable','missing-label'));
    item.append(actions);return item;
  }
  function sidebar() {
    const nav=document.getElementById('study-nav');
    nav.append(a('Still needed · '+missing.length,'#needed','reading-link needs-link'));
    for(const c of data.courses){
      const group=el('div',null,'course-group');group.append(el('p',c.name,'course-label'));
      for(const w of c.weeks){const link=a(`Week ${w.number}`,route(c,w),'reading-link week-link');const count=w.readings.filter(r=>r.status==='missing').length;if(count)link.append(el('span',`${count} missing`,'nav-gap'));group.append(link);}
      nav.append(group);
    }
  }
  function render(key) {
    const match=key.match(/^study-(enlightenment|moral)-([1-8])$/);
    if(key!=='needed'&&!match)return false;
    const text=document.getElementById('text');const article=document.getElementById('reading');article.classList.add('study-surface');
    document.getElementById('book-label').textContent='YOUR STUDY READINGS';
    const downloads=document.getElementById('hume-download');downloads.hidden=true;
    if(key==='needed') {
      document.getElementById('context').textContent='Study · Collection gaps';
      document.getElementById('section-title').textContent='Still needed';
      document.getElementById('section-note').textContent=`${missing.length} readings not collected · Last checked ${data.checked}`;
      for(const {course,week,reading} of missing){const section=el('section',null,'gap-group');section.append(a(`${course.name} · Week ${week.number}`,route(course,week),'week-return'),card(reading));text.append(section);}
      const checks=el('section',null,'reference-checks');checks.append(el('h2','Available, with reference questions'),el('p','These files are available to read. Their course references still need clarification.'));
      for(const c of data.courses)for(const w of c.weeks)for(const r of w.readings.filter(r=>r.check)){const p=el('p');p.append(a(`${c.name} · Week ${w.number} · ${r.author}`,route(c,w)));checks.append(p);}
      text.append(checks);
    } else {
      const course=data.courses.find(c=>c.id===match[1]);const week=course.weeks[Number(match[2])-1];
      document.getElementById('context').textContent=`${course.name} · ${course.code}`;
      document.getElementById('section-title').textContent=`Week ${week.number}`;
      document.getElementById('section-note').textContent=week.title;
      const weekNav=el('nav',null,'week-picker');weekNav.setAttribute('aria-label',`${course.name} weeks`);
      course.weeks.forEach(w=>{const link=a(String(w.number),route(course,w));link.setAttribute('aria-label',`Week ${w.number}`);if(w.number===week.number)link.setAttribute('aria-current','page');weekNav.append(link);});text.append(weekNav);
      const count=week.readings.filter(r=>r.status==='missing').length;
      const summary=el('p',count?`${count} required reading not collected. Available files are listed below.`:'A reading file is available for every item below. Check the edition notes before reading.',count?'week-summary has-gap':'week-summary');text.append(summary);
      week.readings.forEach(r=>text.append(card(r)));
      const sources=el('section',null,'week-sources');sources.append(el('h2','Preparation & sources'));
      const links=el('div',null,'reading-actions');
      if(week.preparation)links.append(a('Saved tutorial preparation',week.preparation));
      links.append(a('Official weekly assignment',week.source),a('Week folder in Drive',week.folder));
      if(week.tutorial)links.append(a('Tutorial in Canvas',week.tutorial));
      sources.append(links,el('p',`Checked against Canvas on ${data.checked}. Availability is the last verified collection state, not a live Drive check. Lectures and videos remain in Canvas. These labels do not track whether you have finished reading.`,'edition-note'));text.append(sources);
    }
    return true;
  }
  sidebar();window.STUDY={render};
})();
