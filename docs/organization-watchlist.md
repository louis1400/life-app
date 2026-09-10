# Organization watchlist

Feature branch: `codex/organization-watchlist`, based on `codex/verified-baseline`. The baseline is newer than the integration branch and is still awaiting browser acceptance.

The Work navigation item opens `/organizations`. The initial entries are Nederlandse Basketball Bond and Erasmus Universiteit Rotterdam. Each account has its own persisted entries, including reason for interest, vacancy URL, notes, next step, status and archive state. Archived starter entries stay archived on reload. Saving checks the version so concurrent changes cannot silently overwrite an entry. Failed saves retain the open draft.

The page records the requested current context: student, 16–32 hours per week, bachelor’s expected in 2027. It is a manual employer watchlist; it does not fetch vacancies, claim eligibility or send alerts. The profile is currently display-only and will need updating when circumstances change.

Official careers sources checked on 10 September 2026:
- NBB: https://basketball.nl/bondsorganisatie/vacatures/
- Erasmus University: https://www.eur.nl/werken-bij-eur/vacatures/overzicht

## Verification

Run `npm run check`, `npm run db:local`, and `npm run test:startup`. The startup check includes the new page and API. Focused tests cover input validation, unsafe URLs, per-user isolation, stale writes, archive/restore and repeatable seeding against the generated migration.

Browser acceptance: open Work, inspect both organizations, add a disposable organization, edit its notes and next step, change its status, reload, archive and restore it. Test on desktop and a narrow phone viewport. Check keyboard navigation, unsaved changes, console errors and neighboring module navigation.

Local inspection after dependencies and migrations are ready: `npm run dev -- --port 5178 --strictPort`, then http://127.0.0.1:5178/organizations on that computer. Reuse the running server.

In the authoring environment the supervised browser service is unavailable and the network dependency installation was interrupted. The offline cache lacks required locked packages. Build, startup and browser acceptance must not be treated as passed on that basis. No production deployment is part of this branch.
