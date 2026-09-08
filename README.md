# Life App — Coursework

Phone-first coursework workspace for Enlightenment (FW-BA1102) and Moral Philosophy (FW-BA2202), Weeks 1–8.

## Main flow

Coursework → selected teaching week → reading → Study / Reading / Notes → saved session record → Continue studying.

- The home screen shows both courses, checked-off reading counts, and a route back to an unfinished reading or the most recent unfinished session.
- The teaching week is set explicitly per course. Calendar dates, holidays and lecture schedules are not inferred. The last-set date is visible so this does not silently pretend to be the current calendar week.
- Progress is explicitly Not started, In progress, or Done. Opening a text or ending a session never marks it Done.
- Reading notes, a resume bookmark, and an optional private ChatGPT conversation/project link are saved per reading. Week notes capture cross-reading connections; saved reading notes roll up into the week view.
- Session records hold what was covered, open questions and where to resume. Notes and records are user-authored; this app does not claim to automatically summarize conversations it cannot access.
- Unsaved form edits survive switching app views in the current page, and leaving the page triggers a warning. They are not durable until Save succeeds. Server-unavailable and conflict errors keep the form contents.
- Mobile uses Study / Reading / Notes tabs. Wider desktop layouts keep the reading pane alongside Study or Notes. Hume Dialogues has an inline primary-text reader; other texts open their collected Drive files.

## Current AI integration boundary

Study creates a reading-specific brief with assigned scope, edition caveats, saved notes and a resume point. It asks for direct explanations, optional quizzing and grounded citations. Copy the brief and open ChatGPT using the user's existing account. Save a private conversation or project link to return to it on another device.

The app does NOT embed an AI conversation, automatically attach private Drive files, retrieve ChatGPT history, or use Pro subscription access as API credit. Users currently attach the reading or use ChatGPT's connected Drive. The brief explicitly tells the assistant to verify text access before making source-specific claims. A seamless classroom integration remains unfinished.

Official documentation checked 8 September 2026:
- https://help.openai.com/en/articles/9039756-managing-billing-for-chatgpt-and-the-api-platform
- https://help.openai.com/en/articles/10169521-using-projects-in-chatgpt

## Materials and honesty

37 reading entries across 16 course weeks. Still needed: Armstrong (Moral Week 7) and Caney (Moral Week 8). The case studies do not replace these missing readings. See READINGS-STATUS.md. Alternatives, manuscripts and reference questions are labelled. Collection status is last-verified, not a live Drive check, and is independent of study completion. Lectures/videos remain in Canvas.

## Persistence and security

Sites-authenticated user identity scopes every D1 query and update. `coursework_entries` has a composite owner/item primary key. Saves use expected versions to reject stale cross-device overwrites. The schema is in `db/schema.ts`; generated schema-only migrations are in `drizzle/`. Provision logical D1 binding `DB` and apply migrations through the normal Sites release flow. Tables are never created at request time.

The API rejects missing identity, foreign-origin writes, unknown reading IDs, oversized data, unexpected fields, and non-ChatGPT conversation URLs. No browser storage is treated as authoritative. R2 `BUCKET` still isolates optional chapter PDF imports per user.

Private Sites dispatch must supply the trusted identity headers. Do not expose the Worker directly on a host accepting spoofed headers. Licensed reading bytes, student records and credentials are not bundled. Google Drive links retain Google's permissions.

## Development and release state

`npm run build` builds the Worker and explicit public-asset allowlist. `npm test` exercises coursework against the generated migration in real SQLite (Node 24), and checks the existing R2 privacy boundaries. `python scripts/prepare-curriculum.py` rebuilds curated curriculum data. `npx drizzle-kit generate` generates future schema migrations; applied migrations must not be rewritten.

The work is on `codex/enlightenment-readings`; no merge or deployment is included. Live cross-device persistence and responsive browser behavior have not yet been verified on a publication. Existing Sites identity and R2 binding are preserved; the next release requires the new D1 binding and migration.
