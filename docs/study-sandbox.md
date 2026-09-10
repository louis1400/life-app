# Study review without account sign-in

The Study sandbox runs the current Study HTML, CSS, reading UI and coursework
validation with isolated test records. It requires only Node 24; no npm install,
OpenAI login, Sites preview service, production database or account token.

```sh
node scripts/study-sandbox.mjs
```

Keep this server on `http://127.0.0.1:5178/study` for repeated iterations. It binds
only to loopback and refuses unknown Host headers. If an existing app server
already owns 5178, leave it running and use the file export instead of changing
ports or killing it. The sandbox reads current assets on every page load.

```sh
node scripts/study-sandbox.mjs --export
```

Open `output/study-sandbox.html` directly in a modern browser. It includes its
assets and Hume's public-domain text; no internet or server is required. Exports
are snapshots: regenerate after source edits. Browser-local test records persist
across reloads, with a visible warning if storage is unavailable. The two reset
buttons affect sandbox records only:

- **Start from zero:** no saved plans, readings, notes or sessions.
- **Week 2 · nothing done:** both courses set to week 2, no completed readings.

The sandbox uses a small D1 test double with the real `courseworkApi`. It is not
a production identity adapter. It never connects to hosted storage. Private Drive
file locators are removed from exports; external links show a local handoff
notice. PDF upload, Canvas synchronization, ChatGPT and private file access are
not simulated as successful. It does not test the integrated Home shell, real
sign-in, D1/R2 deployment, cross-device storage or external account integrations.

## Repeated checks

```sh
node --test tests/study-sandbox.test.mjs modules/study/tests/*.test.mjs
node tests/study-browser.mjs
```

The browser check requires installed Playwright and Chromium. A preinstalled
Playwright can be selected with `PLAYWRIGHT_MODULE`; no browser path or cloud
credentials are written to the app. CI provisions a pinned, isolated browser
installation and records desktop/mobile screenshots as a review artifact. The
test starts and closes its own ephemeral server and leaves 5178 untouched.

Test: no account screen → empty state → Enlightenment week 1 → Hume → Reading →
save notes → reload → recover notes → inspect external handoff. Check console,
unexpected network access and horizontal overflow at desktop and phone widths.

## Initial review finding

The existing UI is organized course → week → reading. It does not yet combine
all courses into one selected week or distinguish the current teaching week
from the earliest unfinished work. The sandbox makes that friction inspectable;
it does not claim to fix or replace the study experience.

Production access rules and publication are unchanged. Do not add sandbox scripts
to the production asset allowlist or replace hosted identity with the test owner.
