# Life integration report

## Branch strategy

`integration/life-app` starts from GitHub `origin/main` (`e9b29e836a42fa3341f0ecda0c226f3011738de7`). The original feature branches remain unchanged.

| Module | Source | Integrated tip |
| --- | --- | --- |
| Groceries | `origin/codex/grocery-usage-tracker` | `d8b45d52d367ce21db4470f3d1fbab90682457ec` |
| Study | `study-site/main`, local `feature/study-coursework` | `83d82fce26eb90860cbb0ac57068e179943982e9` |
| Vault | `vault-site/feature/google-drive-storage`, local branch of the same name | `05c416ee23b7b77df99d2888076d76d75477e348` |

The latest work was spread across GitHub and three Sites repositories. The groceries Site tip (`16157766f48849a488ec82b3cbd698a1dedf5a91`) has an identical source tree to the GitHub grocery branch. The Study Site contains the newer coursework home, notes, progress, and session changes. Its full tree is retained unchanged under `modules/study`, with full merge ancestry. The older GitHub `origin/codex/enlightenment-readings` tip (`8e7b2e2689eab264e5926bf9ef85c1302ed7cea5`) is also retained as merge ancestry; the newer Sites tree supplies the module's contents.

Groceries and Vault use ordinary merges. Study uses a Git subtree to prevent its standalone application files from colliding with the shared root. The shell and adapters are a separate integration commit. Feature development can continue on each original branch and be merged forward. Do not merge the entire integration branch back into a standalone feature merely to obtain one feature change.

Configured remotes:

- `origin`: https://github.com/louis1400/life-app.git
- `study-site`: https://git.chatgpt-team.site/1f753f29-29a7-41b1-957d-330019fb4ead/appgprj_6a9eaf86424c8191bc4bc9af77497b82.git
- `groceries-site`: https://git.chatgpt-team.site/1f753f29-29a7-41b1-957d-330019fb4ead/appgprj_6a9eac7feb248191b4cb8201bb12d3e9.git
- `vault-site`: https://git.chatgpt-team.site/1f753f29-29a7-41b1-957d-330019fb4ead/appgprj_6a9eaf142db081919654614b1b6491ea.git

Sites remotes require a fresh repository credential from Sites. No credential is stored in these URLs or committed files.

Future integration, after fetching the relevant remote:

```sh
git switch integration/life-app
git merge --no-ff origin/codex/grocery-usage-tracker
git merge --no-ff vault-site/feature/google-drive-storage
git subtree merge --prefix=modules/study study-site/main
npm run db:local
npm test
npx tsc --noEmit
```

Repeat rendered browser checks after any merge. New Study assets or routes may need to be added to the explicit adapter allowlist in `lib/study.ts`.

## Merge conflicts and resolutions

The grocery merge was clean. Vault had 12 overlapping starter files; neither feature's business logic was discarded. Study was imported under its own directory.

| Conflicting file(s) | Resolution |
| --- | --- |
| `.gitignore` | Retained runtime, credential, dependency, and generated-output exclusions. |
| `.openai/hosting.json` | Kept the grocery Site identity and D1 declaration; included Vault's R2 binding. No deployment performed. |
| `README.md` | Saved original feature documentation separately and wrote integration instructions. |
| `app/globals.css` | Preserved feature CSS in route scopes; introduced common tokens and shell styling. Restored global Tailwind utility declarations. |
| `app/layout.tsx`, `app/page.tsx` | Shared layout and Home; original feature entry points moved to explicit module routes. |
| `db/schema.ts` | Exported both feature schemas, then added Study's existing schema. |
| `drizzle/meta/0000_snapshot.json`, `drizzle/meta/_journal.json` | Combined snapshots and ordered additive migrations without renaming the original SQL migrations. |
| `public/favicon.svg` | Retained the Life grocery icon as the common app icon. |
| `tests/rendered-html.test.mjs` | Retained grocery access and persistence checks, then added integrated routes and Study API checks. Vault's separate suite is retained. |
| `worker-configuration.d.ts` | Used the Vault configuration, which includes the storage binding needed by both modules. |

The Drive OAuth callback now returns to `/vault`; stock links lead to `/groceries/stock`. Original implementations otherwise remain behind wrappers. Study's original files are unchanged. No feature branch was collapsed, renamed, deleted, or force-pushed.

## Architecture and remaining issues

### Runtime and styling

Groceries and Vault share React, Vinext, Cloudflare, D1, and the same dependency versions. Their original CSS is scoped to the relevant module, including portalled dialogs. Home and navigation share typography, colors, spacing, and controls. Study is a same-origin iframe served from its existing assets, with a small style and hash-navigation bridge. This preserves the original reader and editing lifecycle, but also preserves its independent scrolling and internal navigation. A later React port can be considered separately.

The Study APIs delegate to the original handlers. Only known bundled assets are served. Curriculum links and explicitly missing readings are preserved; the integration does not invent course materials. Study's AI links still open ChatGPT instead of providing an in-app AI service.

### Persistence and deployment

The combined schema has five tables. Migrations add the grocery, archive, Drive-connection, and coursework tables without destructive SQL. They were applied to a fresh local D1 database. Applying these migrations to an existing hosted database and migrating data between the three old Sites have not been tested or performed. Each old Site has its own origin/storage, so existing notes, archive items, and browser-local grocery quantities do not automatically transfer.

The local preview injects an isolated development identity only for loopback requests with a loopback Host header. It replaces forged authentication headers and is excluded from the production build. Production handlers retain their original authenticated-user requirements. The checked-in local Wrangler configuration contains placeholder resource identifiers, not live credentials.

The root hosting metadata still identifies the grocery Site. Publishing it would replace that Site's app; a deployment destination and data migration need to be chosen before publishing. This branch has not been deployed.

### External services

- **Albert Heijn:** Exact products, quantity staging, estimates, stock observations, and the direct AH URL are preserved. Actual basket receipt requires AH's authenticated confirmation flow. The older desktop connector and its original permitted origin remain unchanged; it is not connected to localhost.
- **Google Drive:** OAuth needs client ID, client secret, a 64-character hexadecimal `TOKEN_KEY`, the matching `APP_ORIGIN`, and the user's account connection. The preview correctly reports the missing connection and retains form input on a failed save. These prerequisites are absent locally, so live saves, uploads, and Drive retrieval remain untested.
- **iPhone capture:** The existing Apps Script and Shortcut setup files are retained. The prior source still has setup/confirmation steps outstanding. Capturing directly into Drive does not create the D1 archive record; adding reconciliation would be a separate feature.
- **Coursework:** Explicit gaps for Armstrong (Moral Philosophy Week 7) and Caney (Week 8), and labels for alternative editions, remain visible.

## Verification record — 8 September 2026

Preview URL: `http://127.0.0.1:5178/`. Inspected desktop and 390 × 844 phone layouts in the browser.

Exercised:

- Home navigation, all three module routes, mobile bottom navigation, and saved-session continuation.
- Study week planning, reading progress, note and resume-field saving, reload persistence, session saving, session deep links, and the actual Hume reading text.
- Grocery quantity changes, totals below and above the estimated minimum, reload persistence, the generated AH product/quantity URL, stock observation recording, and undo.
- Vault searching, filtering, empty results, detail editing and persistence, collection views, setup information, and the expected error when trying to save without Drive connected.

The Vault interaction used a clearly titled **Integration preview · saved link** record created only in local D1. Study notes and grocery quantities used during inspection are local preview data. No hosted or real AH basket data was changed.

Supporting checks: the combined production build, 29 root tests (including the original archive integration tests), 7 original Study tests, and TypeScript checking passed. Archive service tests use mocks; they do not establish that a live Drive account is connected.

Browser checks covered the integrated local flows. Full external acceptance remains incomplete: a live Drive save/upload/retrieval, authenticated AH basket receipt, the desktop extension transfer, and iPhone capture-to-app visibility could not be established with the available connections. These are inherited boundaries, not silently successful states.
