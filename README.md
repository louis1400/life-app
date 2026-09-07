# Life App — reading

A first reading surface for the Life App. Open `dist/index.html` locally or serve the `dist` directory with any static web server. No dependency installation or build step is needed.

## Included

- The original full text of David Hume's *Dialogues Concerning Natural Religion*: preface and Parts 1–12.
- Week 1 opens Parts 1–3; Week 2 opens Parts 4–6.
- Exact assigned anthology chapters: Week 1, chapter 18 (Montesquieu); Week 2, chapters 12 (Newton) and 21 (Du Châtelet).
- Anthology chapters are explicitly marked as missing. No full text, replacement translation, or generated summary is presented for them.
- A full-text download, source references, and the Project Gutenberg licence.

Moral Philosophy is outside this initial reading selection, pending the user's confirmation.

## Content provenance

Hume: https://www.gutenberg.org/cache/epub/4583/pg4583-images.html

Assignments were checked against the Enlightenment Week 1 and Week 2 preparation pages on 2026-09-07. The anthology is the course's specified first edition (Routledge, 2019). The original text is not silently replaced with the 2023 edition.

`dist/books/hume-dialogues-complete.txt` retains the full source notice, text, and licence. `scripts/prepare-hume.py` generates the reader data from that file. Reproduce it with `python scripts/prepare-hume.py`.

No authentication credentials, student records, or commercial anthology text are bundled. The reader does not track reading progress or send reading activity to a server.
