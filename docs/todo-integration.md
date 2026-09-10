# To-do integration

The standalone To-do feature is now native at `/todo`, using the same Worker, D1 database, authentication, and shared navigation as the other Life modules. Home shows the open count, up to three recent open tasks, links into each editor, and an Add a task shortcut.

Retained behavior: compact quick entry, notes, open/completed tabs, editing, completion/reopening, deletion and undo. Labels are visible on status tabs. Controls accommodate touch input, the editor uses the existing accessible sheet, and undo notices sit above mobile navigation.

## Persistence and recovery

`todo_tasks` has an owner/task composite primary key. All reads and writes use the platform-authenticated owner, never a client-provided identity. Updates compare the current version; stale writes return a conflict with saved state. Replaying a confirmed state is idempotent. Deletion keeps a tombstone so transfer retries cannot resurrect a deleted task.

Temporary new-task and editor drafts use the existing owner-scoped, separate-per-tab draft store. A closed unsaved editor can be resumed or explicitly discarded. Conflict review preserves the draft and shows the current saved text; adopting a newer version requires an explicit choice and another Save. Authoritative tasks remain in D1.

## Existing task transfer

The standalone Site and the integrated Site were verified as private to the same sole owner. Their runtime user IDs differ. The standalone live database contained one task at inspection. Its ID, text, notes, completion/deletion state, version, and timestamps are staged in the **secret server environment variable** `TODO_IMPORT_SNAPSHOT`, with the verified integrated owner ID. No personal task content or owner ID is committed to source, migration SQL, or client assets.

The bounded importer runs after authentication on Home/To-do reads and before task writes. It imports only for the specified destination owner, uses one atomic D1 batch, and ignores existing IDs. Repeated loads cannot overwrite later edits or deletions. New accounts receive no seeded personal task.

The snapshot is prepared, not yet applied to the live integrated database: this version has not been published. On publication, schema migration 0006 creates the table, then the first authenticated owner visit to Home or To-do transfers the snapshot. After verifying the transferred row, `TODO_IMPORT_SNAPSHOT` can be removed. The original standalone app and its data remain untouched. This is a one-time transfer, not ongoing synchronization; refresh the snapshot before publication if the standalone task changes meanwhile.

## Verification

Production build, TypeScript, and all 47 automated tests pass. The combined Worker tests cover shared routes, actual SQL migrations, owner isolation, input/origin validation, create retry, stale update rejection, completion/reopening, deletion/undo, Home summaries without notes, transfer timestamps/state, repeat transfer, and recoverable storage failures. Existing Vault, groceries and Study tests also pass. Browser and phone interaction have not been tested in this change.
