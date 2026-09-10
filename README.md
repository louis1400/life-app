# Life app

A personal home for To-do, Study, Groceries, and Vault. See [the development baseline](docs/development-baseline.md) for the current source, review gates, and shared inspection route.

## Run locally

Use Node 24.19.0, pinned in `.node-version` for local development and CI.

```sh
npm ci
npm run db:local
npm run dev -- --port 5178 --strictPort
```

Open <http://127.0.0.1:5178>. The development server uses an isolated local preview identity and local storage. It accepts loopback requests only; production still requires the platform's authenticated user header. Existing hosted data is not copied into this preview.

| Area | Route | Retained features |
| --- | --- | --- |
| Home | `/` | Quick capture, open tasks, saved current weeks, session continuation, shared list summary |
| To-do | `/todo` | Quick add, task notes, open/done lists, edit, delete, undo, recovered drafts |
| Study | `/study` | Coursework plans, reading progress, notes, resumable sessions, Hume reader |
| Groceries | `/groceries` | Original 13 products, shared saved quantities, estimated total, AH handoff |
| Stock tracking | `/groceries/stock` | Pack observations, usage estimates, shared shopping list, undo |
| Vault | `/vault` | Search, collections, editing, uploads, Drive and capture setup |

The shared shell provides desktop navigation, mobile bottom navigation, and common design tokens. Study remains an embedded module; its refresh and returning-session behavior is improved in the UX branch. `/stock` redirects to the new stock route.

## Checks

```sh
npm run check
npm run db:local
npm run test:startup
```

`check` builds the combined Worker, runs 47 regression tests, and checks TypeScript. `test:startup` starts its own server on 5178, checks nine pages and six API routes against the migrated local database, then stops that server. Run it before starting an interactive preview; it intentionally fails if 5178 is already occupied. GitHub Actions runs these checks on PRs and pushes to the baseline branches. These checks do not replace browser acceptance or enforce branch protection by themselves.

See [the UX change record](docs/ux-improvements.md) for the latest flows, legacy-list import, and focused regression checks.

## Current boundaries

- Study's AI actions open ChatGPT. Some curriculum readings are explicitly unavailable in the source module.
- AH receives a selection through its own website; basket receipt and checkout are confirmed there. The legacy desktop extension keeps its original origin restrictions.
- New Vault saves require Google Drive configuration and account connection. The separate iPhone capture setup is retained; older files captured directly to Drive can be imported into the app's archive index; see [Vault reliability](docs/vault-reliability.md).
- The integrated app has a live publication. The newer Vault reliability and To-do changes are saved separately and await publication.
- The standalone To-do task is staged for an owner-scoped transfer on the first authenticated Home or To-do load after publication. The standalone app remains independent; see [To-do integration](docs/todo-integration.md).

## Feature development

See the [branch strategy, merge resolutions, architecture, and verification notes](docs/life-integration.md). Original feature documentation is preserved in [Groceries](docs/features/groceries.md), [Vault](docs/features/vault.md), and [Study](modules/study/README.md).

Catalog prices remain estimates from the original feature. Product image sources are recorded in `docs/product-image-sources.json`.
