# Everyday UX improvements — 9 September 2026

Branch: `codex/ux-everyday-flows`, based on `integration/life-app` at `516eb76`.

## Changed journeys

- Home uses compact task entries, saved teaching weeks, an unfinished reading/session continuation, and the shared grocery quantities. It includes direct link capture. Its owner-scoped summary endpoint avoids returning all archive content merely to count items; module failures are independent.
- Quick capture saves a bookmark immediately to the displayed collection. Inbox is the initial destination. Additional metadata remains optional; Add details preserves the selected collection. Success and duplicate feedback link to the corresponding Vault item. Missing Drive connectivity is explained before the quick-save action becomes available.
- Vault opens an item's content, source link, notes, and metadata for viewing. Edit exposes the form. Closing a dirty form offers Keep editing or Discard changes. In-flight editor saves block dismissal, and a before-unload handler protects navigation where supported by the browser. Title, notes, and tags are expandable for new items. Collection suggestions apply only when requested.
- Drive controls are grouped under Storage settings, collapsed when connected and expanded when connection/setup is required.
- Study refreshes restore the scroll position, selected workspace tab, open disclosures, reading-panel scroll, focused field and caret. Actual route changes still start at the top. Returning sessions prioritize the saved ChatGPT conversation and reading; setup and brief-copy instructions are grouped in a disclosure. A conversation link can be saved directly in that setup area.
- Shopping list and At home use the same server-backed grocery queue events, with existing ownership and version checks. Home reads the same state. Views reload on window focus. At home provides the direct AH handoff; the existing extension is optional.
- The old browser-only shopping selection is preserved until the user imports it. The import shows the products and keeps the larger quantity for each product, using normal version-checked writes. The old value is removed only after a successful import and only if it has not changed in storage during the import. Failed or partial imports can be retried.
- The sticky grocery summary keeps the total and remaining delivery-minimum amount visible. Handoff explanations, price dates and exclusions are under Details. Usage-learning instructions are also collapsible.

## Validation

Production build and TypeScript check passed. The 39 tests comprise 31 root tests and 8 Study tests.

Focused regressions cover:

1. Actual Worker requests: saved teaching week, active reading and resume text, shopping quantities updated through the existing queue API, account isolation, and exclusion of full notes from the Home response.
2. Shopping client operations: the existing queue version is sent, conflicts are surfaced without automatic overwrite/replay, and AH receives the exact product/pack pairs.
3. Study renderer in a simulated document: coursework refresh preserves scroll, tab, disclosures and caret; route navigation resets scroll.

No live-browser, visual, phone, real Google Drive or AH acceptance tests were performed. Source and local runtime checks do not establish those results.

## Remaining boundaries

This is the agreed UX pass. It does not implement phone Apps Script ingestion into Vault, Vault backend conflict detection, atomic/reconciled Google Drive operations, or pagination for Study history. Quick capture uses the existing bookmark API and does not download source pages. Study still hands off conversations and readings to ChatGPT manually on first use.

No database schema change or hosted migration was required. Existing feature branches and hosting identity remain unchanged. This branch has not been deployed; the inherited hosting destination is still the original grocery Site.
