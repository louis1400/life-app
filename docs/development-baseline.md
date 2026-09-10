# Development baseline

## Source reconciliation — 10 September 2026

The Sites repository's `main` at `d12aa1ec981fa55fc81bd7f59b2b63aa55a9c86c` contains the UX PR commit `1cb474596762c03f0fe05e725fb4e95ec64494a4`, the publication merge `3ac720bce42d57d010510b0d623966070824c2fe`, Vault recovery improvements, and integrated To-do. GitHub's `integration/life-app` at `516eb76d3070b6d698a42e1ea33842bcc1246d6b` predates this work. GitHub `main` still contains only the initial README.

`codex/verified-baseline` proposes the current Sites source plus CI and startup checks. It is a candidate, not a browser-approved release. Preserve the original Sites history; where GitHub receives a source snapshot, compare its complete Git tree with the tested checkout rather than assuming matching commit IDs.

After acceptance, use GitHub `integration/life-app` as the shared development base, with feature branches and separate worktrees created from it. Keep one integration owner responsible for shared navigation, Home aggregation, migration ordering, and synchronizing the same accepted source to Sites. Do not start new integrated features from the old standalone branches. Those branches remain available as history and for explicitly standalone work.

## One inspection route

The existing published app is https://life-app-louis.louis-nijholt.chatgpt.site. Publication and saved source are separate: the existing UX publication does not establish that the later Vault and To-do changes are live.

For ordinary local development, retain one checkout, local database, and `npm run dev -- --port 5178 --strictPort` server across edits. The local route is http://127.0.0.1:5178. It is only usable from the machine running that server. Preview data uses an isolated development identity; production identity rules remain unchanged.

Managed Work browser QA uses the platform's supervised preview when available. Its internal address is not a user-facing preview. In this session that service has no available daemon, so interactive and visual verification could not be performed. Direct local startup and HTTP checks are the available fallback; they do not execute client interactions or establish console cleanliness or responsive layout quality.

## Automated gate

`.github/workflows/checks.yml` runs on pull requests and pushes to `main`, `integration/life-app`, and this candidate branch. It uses the pinned Node version and existing npm lockfile, with read-only repository permissions and no application secrets or deployment step.

1. Install the locked dependencies.
2. Build, run all regression tests, and check TypeScript with `npm run check`.
3. Apply all checked-in migrations to an isolated local D1 database.
4. Run `npm run test:startup` against a real development server. It checks all module pages, capture routes, API reads, and non-null Home summaries, then stops only its own server.

The existing regression suite checks persistence, stale writes, account isolation, retries, draft recovery, transfer behavior, and shared summaries. Startup checks cover missing routes, missing local schema, and failure to boot. GitHub's `Build, tests, types and startup` check should become a required merge check once its first successful hosted run is confirmed; adding this workflow alone does not configure a ruleset.

## Browser acceptance before integration or publication

Use disposable preview records and check desktop and phone layouts:

- Home: navigate to each module and return; check loading/error feedback and summaries.
- To-do: add a task, edit notes, reload, complete/reopen, delete/undo, and recover an unsaved draft.
- Groceries: change quantities, reload, verify the same counts in Home and At home, and inspect the AH handoff target without submitting an order.
- Study: set the teaching week, save notes and a session, return through Continue studying, and verify tab/scroll restoration.
- Vault/capture: inspect disconnected-service feedback and retained drafts; check open/edit behavior and dirty-form recovery. Real OAuth, Drive writes, and iPhone Share Sheet behavior require separate external acceptance.
- Check navigation, browser console errors, clipping, horizontal overflow, and mobile controls.

Do not mark browser acceptance as passed based on HTTP responses or the recorded earlier publication. Keep the candidate unmerged while this explicit gate is outstanding. Integration and publication are separate steps; the latter must preserve existing hosted data and respect the staged To-do transfer described in `todo-integration.md`.

## Validation record

The current source passes the production build, TypeScript, 39 root tests and 8 Study tests. All seven local database migrations applied successfully. The new startup check passes nine page routes and six API routes. Browser and phone acceptance remain unverified because the supervised preview service is unavailable. The workflow's GitHub run is a separate result from these local checks.
