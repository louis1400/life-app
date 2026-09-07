# Life Archive

A private, mobile-friendly personal archive with durable D1 metadata and R2 file storage.

## Working features

- Add HTTP(S) bookmarks or upload files up to 25 MB.
- Edit titles, notes, tags, content types and multiple collections.
- Type and keyword rules suggest collections; unmatched items remain in Inbox.
- Search titles, URLs, notes, tags and extracted plain text (TXT/MD files under 500 KB).
- Preview supported image, audio and video files; download original bytes.
- Owner-scoped API access, duplicate URL checks and deletion.

## Current boundaries

Links are bookmarks, not downloaded webpage or video copies. Routing uses deterministic rules, not AI. Collections are internal archive views; other life-app modules are not connected. Native iPhone Share-sheet capture, OCR, transcription and semantic search are not implemented. No preloaded personal content.

## Development

Use the existing package scripts. `npm run db:generate` creates schema migrations, `npm run build` builds the Worker, `npx tsc --noEmit` checks types and `node --test tests/archive-integration.mjs` checks API persistence, file bytes, ranges, ownership and validation using isolated local D1/R2 storage.

Cloudflare declarations were generated with Wrangler against the built configuration. Bindings are declared in `.openai/hosting.json`. Platform authentication supplies the user ID; API requests require that identity and scope every record and file operation to it.
