# life-app

A personal app for everyday life. The first module tracks household essentials and learns replenishment needs for Albert Heijn deliveries.

## Working now

- The 13 exact AH products selected by the owner, with original product links, pack sizes, and local product images.
- Unknown consumption and stock stay unknown. Nothing is ordered automatically.
- Record a fresh pack opening and its finish date. A pack already in use does not create a full-pack measurement.
- Single-use noodle packets learn consumption cadence from repeated usage dates instead of time spent eating a packet.
- Record unopened spare packs, view tentative refill estimates, and maintain an explicit draft refill list.
- Undo the latest active update for each product, including its effect on measurements and stock.
- D1-backed history scoped to the signed-in platform user. Mutations use idempotency keys and optimistic concurrency.

## Next: AH ordering integration

AH checkout is not connected. Product links open the actual AH catalog; life-app does not modify an AH account, book slots, or submit orders. Integration feasibility still needs account authentication, delivery availability, order confirmation and payment-flow validation. Never infer spending authorization from a usage estimate. Before enabling unattended orders, implement spending limits, exact-product/substitution rules, order reconciliation, failure alerts and a pause control.

## Development

This is a React / Vinext application targeting a Cloudflare Worker with D1 storage. Node 22.13 or newer is required; Node 22.18 or newer runs the TypeScript model tests without a loader.

- Install: `npm run install:ci`
- Development: `npm run dev`
- Schema migrations: `npm run db:generate`
- Production build: `npm run build`
- Usage and concurrency checks: `node --experimental-strip-types --test tests/groceries.test.mjs`

The local development server does not fabricate a logged-in user. Persistent APIs require the trusted platform `oai-authenticated-user-id` header. The hosted dispatcher authenticates visitors; a local trusted harness can supply a test identity.

Runtime data and credentials are never committed. `.openai/hosting.json` declares the Site identity and logical D1 binding; Sites provisions and applies migrations on deployment. `package-lock.json` pins the starter dependencies.

## Data provenance

Catalog prices were checked on AH product pages on 7 September 2026. Prices are estimates, exclude additional delivery charges and deposits, and do not imply real-time stock or promotional pricing. Product images and source URLs are documented in `docs/product-image-sources.json`; the images belong to their respective rights holders and are used here to identify the selected products.
