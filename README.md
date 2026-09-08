# Life app

A personal home for Study, Groceries, and Vault. The `integration/life-app` branch combines the existing features without replacing their source branches.

## Run locally

Use Node 22.13 or newer (tested with Node 24.19).

```sh
npm ci
npm run db:local
npm run dev -- --port 5178 --strictPort
```

Open <http://127.0.0.1:5178>. The development server uses an isolated local preview identity and local storage. It accepts loopback requests only; production still requires the platform's authenticated user header. Existing hosted data is not copied into this preview.

| Area | Route | Retained features |
| --- | --- | --- |
| Home | `/` | Module navigation, saved study session, selection and archive summaries |
| Study | `/study` | Coursework plans, reading progress, notes, resumable sessions, Hume reader |
| Groceries | `/groceries` | Original 13 products, persistent pack selection, estimated total, AH handoff |
| Stock tracking | `/groceries/stock` | Pack observations, usage estimates, refill drafts, undo |
| Vault | `/vault` | Search, collections, editing, uploads, Drive and capture setup |

The shared shell provides desktop navigation, mobile bottom navigation, and common design tokens. Study remains an intact embedded module so its feature branch can continue independently. `/stock` redirects to the new stock route.

## Checks

```sh
npm test
npx tsc --noEmit
```

The suite builds the combined Worker and runs 36 tests covering the original grocery, connector, archive, and study behavior, plus shared routes, persistence, access isolation, and the local preview boundary. Browser acceptance is separate; see the [integration report](docs/life-integration.md) for the flows inspected and external checks still blocked.

## Current boundaries

- Study's AI actions open ChatGPT. Some curriculum readings are explicitly unavailable in the source module.
- AH receives a selection through its own website; basket receipt and checkout are confirmed there. The legacy desktop extension keeps its original origin restrictions.
- New Vault saves require Google Drive configuration and account connection. The separate iPhone capture setup is retained; files captured directly to Drive do not automatically enter the app's archive index.
- Hosting metadata is inherited from the grocery Site. This integration has not been deployed, and existing hosted apps or data have not been changed.

## Feature development

See the [branch strategy, merge resolutions, architecture, and verification notes](docs/life-integration.md). Original feature documentation is preserved in [Groceries](docs/features/groceries.md), [Vault](docs/features/vault.md), and [Study](modules/study/README.md).

Catalog prices remain estimates from the original feature. Product image sources are recorded in `docs/product-image-sources.json`.
