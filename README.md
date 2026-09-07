# Life App — reading

A reading surface for the Life App. Hume and EUR links work when serving `dist` locally. Private chapter storage runs through the Sites Worker and R2 binding. Build with `npm run build`; run the storage boundary checks with `npm test`. No third-party dependencies are required.

## Included

- The original full text of David Hume's *Dialogues Concerning Natural Religion*: preface and Parts 1–12.
- Week 1 opens Parts 1–3; Week 2 opens Parts 4–6.
- Exact assigned anthology chapters: Week 1, chapter 18 (Montesquieu); Week 2, chapters 12 (Newton) and 21 (Du Châtelet).
- Anthology chapters open the correct first-edition selections through EUR Ebook Central. Each chapter supports adding its licensed PDF and opening it inside the app.
- PDFs are stored in R2 under a hash of the Sites-authenticated user ID. They survive sessions and are only returned to that same account. Uploaded PDFs are not committed or bundled.
- A full-text download, source references, and the Project Gutenberg licence.

Moral Philosophy is outside this initial reading selection, pending the user's confirmation.

## Content provenance

Hume: https://www.gutenberg.org/cache/epub/4583/pg4583-images.html

Assignments were checked against the Enlightenment Week 1 and Week 2 preparation pages on 2026-09-07. The anthology is the course's specified first edition (Routledge, 2019). The original text is not silently replaced with the 2023 edition.

`dist/books/hume-dialogues-complete.txt` retains the full source notice, text, and licence. `scripts/prepare-hume.py` generates the reader data from that file. Reproduce it with `python scripts/prepare-hume.py`.

No authentication credentials, student records, or commercial anthology text are bundled. The reader does not track reading progress. It sends selected chapter PDFs to private storage only when the user saves them.

## Exact anthology acquisition

Use EUR's institutional link: https://ebookcentral-proquest-com.eur.idm.oclc.org/lib/eur/detail.action?docID=5725896

Verified on 2026-09-07: unlimited institutional reading access; 279 pages available for non-expiring chapter PDF downloads. Download and print require a separate Ebook Central sign-in. This branch does not automate registration or scrape the licensed reader.

| Week | Chapter | Author | Ebook Central start position |
| --- | --- | --- | --- |
| 1 | 18 | Montesquieu | 658 |
| 2 | 12 | Isaac Newton | 482 |
| 2 | 21 | Émilie Du Châtelet | 689 |

These are Ebook Central reader positions, not print-page numbers. Select the named chapter under the book's table of contents and use its Download PDF action. Add that file under the matching chapter in the app. The app validates PDF format and requires confirmation of the chapter and edition; it does not claim to automatically verify the document's contents.

## Deployment and privacy

This branch changes the site from static-only output to a Worker with logical R2 binding `BUCKET`. Keep the existing Sites project ID and owner-only access policy. No deployment is part of this branch update. The generated Worker includes only an explicit allowlist of existing public assets; PDF bytes stay in R2.

Deploy behind Sites dispatch, which supplies trusted identity headers. Do not expose this Worker directly on another host that accepts client-supplied identity headers. All reading API operations require identity, writes require the same origin, upload bodies are capped at 12 MB, and PDF responses prohibit caching. R2 errors are reported without discarding the selected file. Actual Ebook Central PDFs still need to be imported after account sign-in.

The R2 implementation follows the [Cloudflare Workers API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/). Live storage and browser PDF rendering still need verification after deployment; current checks exercise the API with an in-memory R2 test double.
