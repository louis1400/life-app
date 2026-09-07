# Life Archive

A private, mobile-friendly personal archive. This feature branch uses Google Drive for new internet artifacts and D1 for the searchable index. Existing R2 uploads remain accessible.

## Features

- Save HTTP(S) bookmarks and upload original files up to 25 MB to a dedicated Life Archive folder in Google Drive.
- Connect/reconnect/disconnect a Google account; keep grants encrypted on the server.
- Edit titles, notes, tags, content types and multiple collections.
- Type and keyword rules suggest collections; unmatched items remain in Inbox.
- Search titles, URLs, notes, tags and extracted plain text (TXT/MD files under 500 KB).
- Preview supported image, audio and video files; download original bytes.
- Owner-scoped API access, duplicate URL checks and deletion (Drive artifacts go to Trash).

## Setup and branch status

See [Google Drive setup](docs/google-drive-setup.md) for the exact Google OAuth configuration, server environment keys, migration and verification steps. The chat's Google Drive connector does not automatically authorize this website. The feature remains on `feature/google-drive-storage` until reviewed and deployed.

## Current boundaries

Links preserve bookmarks, not downloaded webpage or video copies. Routing uses deterministic rules. Collections are internal views; other life-app modules are not connected. Native iPhone Share-sheet capture, OCR, transcription and semantic search are not implemented. Existing files are not migrated automatically.

## Development

Use the existing package scripts. `npm run db:generate` creates schema migrations, `npm run build` builds the Worker, `npx tsc --noEmit` checks types, and `node --test tests/archive-integration.mjs` checks the Google integration with isolated local D1/R2 and mocked Google endpoints.

Logical bindings are declared in `.openai/hosting.json`. Platform authentication supplies the user ID; the server scopes every record and file operation to that identity. Google OAuth authorizes storage only and does not replace Sites sign-in.
