import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
inv=json.loads((root/'study-inventory.json').read_text())
def file(c,w,match):
 fs=[f for f in inv[f'{c}-{w}']['files'] if match in f['title']]
 assert len(fs)==1,(c,w,match)
 return fs[0]['url']
def row(author,title,scope,match=None,status='assigned',note='',kind='Reading',route=None,check=False):
 return dict(author=author,title=title,scope=scope,match=match,status=status,note=note,kind=kind,route=route,check=check)
enprep=[1657310,1657316,1657322,1657328,1657337,1657343,1657349,1657355]
moprep=[1655882,1655884,1655883,1655885,1655911,1655912,1655913,1655914]
motut=[1655899,1655900,1655901,1655902,1655907,1655908,1655909,1655910]
ens=[[] for _ in range(8)]
for w,author,ch in [(1,'Montesquieu',18),(2,'Newton',12),(2,'Du Châtelet',21),(3,'Berkeley',17),(4,'Reid',22),(6,'Rousseau',24),(7,'Kant',26),(8,'De Gouges',30),(8,'Cugoano',31),(8,'Wollstonecraft',32)]:
 ens[w-1].append(row(author,'A New Modern Philosophy',f'Chapter {ch} · 2019 edition',f'Chapter {ch}',kind='Lecture reading'))
ens[2].append(row('Hume','Of the Influencing Motives of the Will','Treatise II.iii.3 · part of anthology pp. 721–785','Influencing Motives',status='alternative',note='Complete section. Includes a little text before the assigned boundary. The PDF heading incorrectly says Book III; this is Book II.',kind='Lecture reading'))
ens[2].append(row('Hume','An Enquiry Concerning Human Understanding','Sections I–VIII · paragraphs 1–81','Hume-Week-3-Enquiry',status='alternative',note='Matched to the anthology sections and endpoint. Different edition; this is the primary text, not a summary.',kind='Lecture reading'))
ens[4].append(row('Spinoza','Emendation of the Intellect & Ethics','Anthology assignment: pp. 380–395','Spinoza-Week-5-focused',status='alternative',note='Includes Emendation §§1–17, Ethics Part I and Appendix, plus Part II preface, definitions and axioms. Complete surrounding sections provide a boundary buffer; not an exact page-for-page extract.',kind='Lecture reading'))
for w in range(1,9):
 if w<=4:
  lo=(w-1)*3+1; hi=w*3
  ens[w-1].append(row('Hume','Dialogues Concerning Natural Religion',f'Parts {lo}–{hi}',('Dialogues Parts' if w<3 else f'week-{w}-hume'),status='alternative',note='Complete assigned parts in a public-domain edition; print pagination differs.',kind='Tutorial reading',route=f'#hume-{lo}'))
 else:
  ens[w-1].append(row('Rousseau','Of the Social Contract',f'Book {w-4}',f'week-{w}-rousseau',status='alternative',note='G. D. H. Cole translation. The syllabus permits alternative translations; it recommends Quintin Hoare.',kind='Tutorial reading'))
mos=[
[row('Rachels','The Challenge of Cultural Relativism','Assigned: 10th edition (2023), pp. 14–31','Rachels',status='alternative',note='Saved: 9th edition (2019). Exact assigned-edition equivalence has not been verified.',check=True),row('Aristotle','Nicomachean Ethics','Book II · assigned edition: Chicago, 2012','Aristotle',status='alternative',note='Saved: W. D. Ross translation. Different from the assigned edition.')],
[row('Kant','Groundwork of the Metaphysics of Morals','Ethical Theory (2013), pp. 485–498','Groundwork'),row('Kant','The Metaphysics of Morals','Assigned reference: Gregor (2013), pp. 429–431','On Lying',status='alternative',note='Saved: On Lying in an earlier Gregor edition, Akademie 6:429–431. Treating the course page numbers as Akademie numbers is an inference. Stop before On Avarice. Assignment match needs confirmation.',check=True)],
[row('Bentham','Of the Principle of Utility','Chapter I','Bentham',status='alternative',note='Complete chapter; public-domain edition, different pagination.'),row('Mill','What Utilitarianism Is','Utilitarianism, Chapter II','Mill',status='alternative',note='Complete chapter; public-domain edition, different pagination.')],
[row('Scanlon','Contractualism and Utilitarianism','Assigned pp. 593–607','Scanlon',note='Saved from Ethical Theory (2013). Canvas names the 1982 volume but gives the reprint’s page range. Title and assigned pages match; source citation needs confirmation.',check=True),row('Collins','Care Ethics: The Four Key Claims','Complete article','Collins',status='manuscript',note='Complete author manuscript; pagination differs from the published article.')],
[row('Korsgaard','Interacting with Animals: A Kantian Account','Complete chapter (2011)','Korsgaard',status='manuscript',note='55-page Harvard PDF including cover and notes. Published pp. 91–118 differ from Canvas’s pp. 204–222; assigned title matches.',check=True)],
[row('Sagoff','Animal Liberation and Environmental Ethics: Bad Marriage, Quick Divorce','Complete article (1984)','Sagoff',status='reprint',note='Complete teaching reprint; primary text.')],
[row('Armstrong','Half Earth and Beyond','Global Justice and the Biodiversity Crisis (2024), Chapter 6, pp. 110–135',status='missing',note='No complete reading file collected. The case study below is available, but does not replace this chapter.')],
[row('Caney','Climate Change and the Duties of the Advantaged','2010 · pp. 203–228',status='missing',note='No complete reading file collected. The case study below does not replace the article. DOI: 10.1080/13698230903326331')]
]
cases=['The Taiji Whale Museum','Predator Free New Zealand','The Half Earth Proposal','Climate Negotiations']
for w in range(5,9):mos[w-1].append(row('',cases[w-5],f'Case study {w-4}','Reading requirements',kind='Case study',note='Full case text is included in the saved preparation file.'))
titles_en=['The Concept of Enlightenment & Religious Toleration','French Materialism','British Empiricism','Scottish Enlightenment','German Enlightenment','French Revolution and Early Critics','Kant','Modern Debates']
titles_mo=['Metaethics and Virtue Ethics','Deontology','Utilitarianism','Contractualism, Care Ethics and Ubuntu Ethics','Environmental Ethics and Animal Ethics','Biocentrism, Ecocentrism and Wild Animal Ethics','Biodiversity Crisis and Global Justice','Climate Ethics and Future Generations']
data={'checked':'8 September 2026','courses':[]}
for cid,name,code,canvas,rows,titles,preps in [('enlightenment','Enlightenment','FW-BA1102',57822,ens,titles_en,enprep),('moral','Moral Philosophy','FW-BA2202',54558,mos,titles_mo,moprep)]:
 course=dict(id=cid,name=name,code=code,canvas=f'https://canvas.eur.nl/courses/{canvas}',weeks=[])
 for w,rs in enumerate(rows,1):
  for i,r in enumerate(rs):
   r['id']=f'{cid}-{w}-{i}';match=r.pop('match');r['url']=file(cid,w,match) if match else None
  week=dict(number=w,title=titles[w-1],folder=inv[f'{cid}-{w}']['folder'],source=f'https://canvas.eur.nl/courses/{canvas}/modules/items/{preps[w-1]}',readings=rs)
  if cid=='moral':week.update(preparation=file(cid,w,'Reading requirements'),tutorial=f'https://canvas.eur.nl/courses/{canvas}/modules/items/{motut[w-1]}')
  course['weeks'].append(week)
 data['courses'].append(course)
(root/'dist/curriculum-data.js').write_text('window.STUDY_CURRICULUM = '+json.dumps(data,ensure_ascii=False,indent=2)+';\n')
print('Prepared 2 courses, 16 weeks,',sum(len(w['readings']) for c in data['courses'] for w in c['weeks']),'reading entries.')
