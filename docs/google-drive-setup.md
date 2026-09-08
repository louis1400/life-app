# Google Drive storage setup

Implementation branch: `feature/google-drive-storage`.

The ChatGPT Google Drive connector is independent of the deployed website. Its credentials are not exported or reused. The archive keeps its existing private Sites sign-in and adds Google authorization only for file storage.

## What this branch implements

- An explicit Connect Google Drive button using Google's authorization-code flow and offline access.
- Scope: `https://www.googleapis.com/auth/drive.file` (app-created or explicitly selected files).
- A Life Archive folder identified by private app properties for this Site and user. No broad scan of existing Drive files or name-only folder selection.
- New uploads stored as original files in that folder. New links stored as readable `.bookmark.json` files containing the source URL, title, notes, tags, destinations and timestamps. They do not contain a downloaded copy of the linked webpage or video.
- D1 remains the searchable index and stores file IDs/account ownership. Existing R2 files and D1 bookmarks remain readable, editable and deletable. This branch does not migrate or delete existing data.
- Owner-bound, single-use OAuth states expire after ten minutes. Refresh grants are AES-GCM encrypted, authenticated to the owner ID, and never sent to the browser. Access tokens exist only while handling a request.
- Streamed Drive uploads/downloads, byte-range support, reconnect and disconnect controls, quota/access errors and compensation when a confirmed upload cannot be indexed.
- Deletion moves Drive artifacts to Trash before removing their index entry. Disconnect removes locally stored access and preserves files. Users can separately revoke the Google grant in Google Account settings.

## One-time Google configuration

1. Create or select a project in Google Cloud and enable the Google Drive API.
2. Configure the Google Auth Platform audience, branding and consent screen. For personal testing, add the intended Google account as a test user and declare the `drive.file` scope.
3. Create an OAuth client with application type **Web application**.
4. Register this exact authorized redirect URI for the current Site:

   `https://life-archive-vault.louis-nijholt.chatgpt.site/api/drive/callback`

   If the deployment origin changes, register its URI and update APP_ORIGIN together. The callback path must stay `/api/drive/callback`.

5. Configure these **server-side Sites environment variables** using the platform's secret/environment settings:

   | Variable | Value |
   | --- | --- |
   | `APP_ORIGIN` | `https://life-archive-vault.louis-nijholt.chatgpt.site` (no trailing slash) |
   | `GOOGLE_DRIVE_CLIENT_ID` | The web application's client ID |
   | `GOOGLE_DRIVE_CLIENT_SECRET` | The web application's client secret |
   | `GOOGLE_DRIVE_TOKEN_KEY` | 32 cryptographically random bytes encoded as 64 hexadecimal characters |

   Keep the token key stable and stored securely; replacing it makes stored grants unreadable until users reconnect. Never use `NEXT_PUBLIC_` variables for these values. `.env.example` documents the same keys; local `.env` is ignored.

6. After reviewing this branch, merge/save/deploy through the normal Sites workflow. Apply the new additive migration after the existing `0000` migration; never rewrite the already deployed `0000` SQL or metadata.
7. Open the archive, select **Connect Google Drive**, and choose the intended account. Google confirmation returns to the archive, which then shows the account email and a link to the folder.
8. Perform one live acceptance pass: save a small test file and a link, inspect them in Drive, download the file, reconnect, and delete the test items. Local tests use mocked Google endpoints; they do not validate a real Google grant or actual hosted callback routing.

Google OAuth testing-mode grants for external apps can expire after seven days for scopes such as Drive. Plan the appropriate consent-screen publishing status before relying on unattended access; a revoked or expired grant prompts reconnection.

## Verification commands

- `npx tsc --noEmit`
- `node --test tests/archive-integration.mjs`
- `npm run build`

The integration suite uses isolated D1/R2 databases and a mocked Google service. It checks authorization state/replay/expiry, encrypted grants, account binding, upload/download bytes, partial downloads, bookmark updates, quota and destination errors, post-upload index failure cleanup, access isolation, disconnect, and legacy file compatibility.

## Current boundaries

- No deployment, live OAuth setup, or real Drive migration is performed by committing this branch.
- Existing Drive content is not imported automatically, and edits made directly in Drive do not sync back into the index.
- For uploaded files, titles/tags/collections remain in the archive index; the original filename is preserved in Drive. Bookmarks carry their metadata in JSON as well.
- Drive and D1 cannot participate in a single atomic transaction. A lost response after Google's upload completion can leave an unindexed Drive file. An index failure after a remote metadata update can leave the bookmark/index temporarily out of sync. Do not claim exactly-once ingestion; durable reconciliation is a future extension.
- Files remain limited to 25 MB per archive upload. Resumable upload sessions are used to stream data, but client-side interrupted-upload resume is not implemented.
- Native iPhone Share-sheet capture, OCR, transcription, AI classification and routing into other life-app modules remain separate work.

## Primary references

- [Drive scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)
- [Google authorization-code flow](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Drive upload protocols](https://developers.google.com/workspace/drive/api/guides/manage-uploads)
- [OAuth refresh-token expiration](https://developers.google.com/identity/protocols/oauth2#expiration)
