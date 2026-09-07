"""Build reader data from the unabridged, locally retained Gutenberg text."""
from pathlib import Path
import json
import re

root = Path(__file__).resolve().parents[1]
source = (root / 'dist/books/hume-dialogues-complete.txt').read_text(encoding='utf-8')
assert '[Truncated]' not in source, 'Source was truncated during retrieval'
start = source.index('PAMPHILUS TO HERMIPPUS\n')
end = source.index('*** END OF THE PROJECT GUTENBERG EBOOK')
matches = list(re.finditer(r'^PART (\d+)\s*$', source[start:end], re.MULTILINE))
assert [int(m.group(1)) for m in matches] == list(range(1, 13)), 'Expected all twelve parts'
sections = {'hume-preface': {'title': 'Preface', 'text': source[start + len('PAMPHILUS TO HERMIPPUS'):start + matches[0].start()].strip()}}
for i, match in enumerate(matches):
    stop = start + matches[i+1].start() if i+1 < len(matches) else end
    sections[f'hume-{i+1}'] = {'title': f'Part {i+1}', 'text': source[start+match.end():stop].strip()}
    assert len(sections[f'hume-{i+1}']['text']) > 1000
notice_end = source.index('*** START OF THE PROJECT GUTENBERG EBOOK')
book = {'source': 'https://www.gutenberg.org/cache/epub/4583/pg4583-images.html', 'order': list(sections), 'sections': sections, 'notice': source[:notice_end].strip(), 'licence': source[end:].strip()}
payload = json.dumps(book, ensure_ascii=False).replace('<', '\\u003c')
(root / 'dist/hume-data.js').write_text('window.HUME_BOOK = ' + payload + ';\n',encoding='utf-8')
print(f'Prepared preface and {len(matches)} parts from {len(source):,} characters; retained full notice and licence.')
