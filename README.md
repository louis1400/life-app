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

## AH browser connection

Install the personal Chrome/Edge connector using **Connect Albert Heijn** in
the refill panel. It uses the AH session in that desktop browser. The app
reports a connection only after the extension observes AH's signed-in control.
The sign-in in a ChatGPT cloud browser is separate from this installation.

Choose explicit quantities, review the transfer, and prepare the AH basket.
The connector visits each exact product, checks its existing quantity, and adds
only missing packs. It preserves other products and never reduces quantities.
Quantities are checked again after a completed page reload. A failed or
ambiguous click stops the transfer; a later manual retry reads quantities again.
Disconnect stops further additions and leaves already added items intact.

The source and installation details are in
[`extensions/ah-connector/README.md`](extensions/ah-connector/README.md).
Run `python scripts/package-ah-connector.py` after connector or catalog edits
and before the production build. This refreshes the downloadable ZIP.

The AH page controls and signed-in access were inspected on 7 September 2026.
The connector orchestration has automated tests for origin restrictions,
exact products, duplicate prevention, lost acknowledgements and disconnects.
A real desktop extension installation and a user-approved transfer are still
needed to validate the complete connection. AH can change its page structure.

Delivery booking, final checkout and order confirmation happen on AH. No
orders, payments or recurring delivery jobs are created by this app. Never
infer spending authorization from a usage estimate. Unattended orders will
need explicit quantities, spending limits, delivery preferences and a proven
account integration.

## Development

This is a React / Vinext application targeting a Cloudflare Worker with D1 storage. Node 22.13 or newer is required; Node 22.18 or newer runs the TypeScript model tests without a loader.

- Install: `npm run install:ci`
- Development: `npm run dev`
- Schema migrations: `npm run db:generate`
- Production build: `npm run build`
- Usage and concurrency checks: `node --experimental-strip-types --test tests/groceries.test.mjs`
- Connector checks: `node --test tests/ah-connector.test.mjs`

The local development server does not fabricate a logged-in user. Persistent APIs require the trusted platform `oai-authenticated-user-id` header. The hosted dispatcher authenticates visitors; a local trusted harness can supply a test identity.

Runtime data and credentials are never committed. `.openai/hosting.json` declares the Site identity and logical D1 binding; Sites provisions and applies migrations on deployment. `package-lock.json` pins the starter dependencies.

## Data provenance

Catalog prices were checked on AH product pages on 7 September 2026. Prices are estimates, exclude additional delivery charges and deposits, and do not imply real-time stock or promotional pricing. Product images and source URLs are documented in `docs/product-image-sources.json`; the images belong to their respective rights holders and are used here to identify the selected products.
