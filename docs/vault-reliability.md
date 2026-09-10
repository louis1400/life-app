# Vault reliability and capture

Implements priorities 1–3 from the independent review of 9 September 2026.

## What changed

- Vault mutations compare saved versions. A stale edit or deletion is rejected without overwriting newer work. The editor retains the draft and shows the latest saved details for an explicit decision.
- Creates carry stable request IDs and content fingerprints. Same-link insertion is checked atomically in SQLite, including concurrent requests. A changed retry is rejected.
- D1 records intended changes before Drive writes. File bytes are staged in R2. Failed operations remain visible as pending and are retried from Vault. Pending items cannot receive another mutation until the current operation finishes. Deletion leaves a private tombstone for retry safety and excludes it from normal lists and counts.
- Each new Drive upload reserves its file ID before sending bytes. Recovery checks the same file and its archive marker. Lost acknowledgements therefore do not create another artifact. See [Google's upload guidance](https://developers.google.com/workspace/drive/api/guides/manage-uploads).
- Quick capture distinguishes sign-in, setup, disconnected, checking, and unavailable states. Temporary text drafts are owner-scoped on the device; Vault file selections use IndexedDB. Separate draft copies protect parallel tabs. Confirmed records remain server-backed. Explicit discard and successful saves clear the relevant draft.
- Study recovers unfinished reading notes and session records on the same device, retaining their original server versions so recovery does not bypass conflict protection.
- `/capture` is the shared phone entry point. New saves go through the same Vault API. It includes a copyable URL prefix and Share Sheet setup instructions.
- Earlier Apps Script captures can be exported as metadata and explicitly imported in Vault. Titles, tags, source URLs, original folder names, and original Drive file links are retained. Original files are neither moved nor modified. Imported entries are marked external; edits and deletion affect the index only.
- `/capture/setup` provides the exact update files for the older Apps Script page and the steps to add its export button.

## Boundaries

This is an existing-Site edit. Changes are saved for review; publication requires a publishing request. The iPhone shortcut and independently deployed Apps Script cannot be changed from this checkout. Their one-time setup is inside the app. Earlier captures are imported by the user, not silently scanned from Drive.

Temporary drafts are device-local, subject to browser storage availability, and do not constitute cross-device synchronization or backup. A browser-storage error is visible; attached bytes must be selected again when recovery cannot retain them. Existing local study edits from a page loaded before this update cannot be recovered retroactively.

Drive recovery uses a ten-minute operation lease and bounded upstream requests. Retry controls remain available after lease expiry if a Worker is interrupted. Google Drive and D1 are not one transaction. A D1 failure before a staged file is indexed can leave an unreferenced R2 staging object; it is retained rather than risking deletion after an ambiguous database acknowledgement. Staging cleanup after a confirmed successful upload is best-effort. No claim of unlimited background retries or automatic synchronization of direct Drive edits is made.

## Verification

Focused integration tests cover lost upload acknowledgements, staged-byte access, same-request replay, concurrent URL deduplication, stale edits and deletes, pending-operation recovery, account isolation, legacy imports, and preserving original Drive files. Draft tests cover interrupted work, account separation, parallel tabs, and clearing only the recovered copy. Existing grocery, coursework, connector and rendered Worker tests are retained.

Live Google OAuth, real Drive writes, and an actual iPhone shortcut were not exercised. Migrations 0004 and 0005 are additive and preserve existing schema history.
