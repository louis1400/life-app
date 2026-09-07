# life-app · Albert Heijn connector

This personal Chrome/Edge extension connects the refill list at
https://life-app-louis.louis-nijholt.chatgpt.site to the AH account signed in
at https://www.ah.nl in the same desktop browser.

## Install

1. Download the connector ZIP from life-app and extract it to a permanent folder.
2. Open Chrome's or Edge's Extensions → Manage extensions page.
3. Turn on Developer mode, choose **Load unpacked**, and select the extracted
   folder that contains `manifest.json`.
4. Reload life-app, click **Connect Albert Heijn**, and sign in directly on AH
   if necessary. Return to life-app and click **Connect Albert Heijn** again.
5. Add your chosen quantities to the refill list. Choose **Review refill
   transfer**, inspect the quantities, then **Prepare AH basket**.

Keep both tabs open while the transfer runs. The connector visits the exact
selected products and clicks their visible add/increase buttons. It tops up to
a minimum quantity, includes any packs already in the basket, and never lowers
quantities or removes other products. Check the complete basket, current prices,
delivery availability, and final total at AH before confirming an order there.
The refill list remains in life-app after a transfer.

## Access and limitations

- Permissions are limited to this exact life-app origin and `www.ah.nl`.
- AH passwords, authentication tokens and cookies are not read, exported or
  stored by this extension. Sign-in happens directly at AH in the user's browser.
- No access is requested for `login.ah.nl`, other websites, browsing history,
  cookies, network interception, clipboard, or downloads.
- This browser's connection switch is saved in extension storage. The AH tab
  reference and latest transfer result are kept in browser-session storage.
- **Disconnect** stops further additions and disables the connection. It
  leaves the AH session and any already added products intact.
- The connector has no checkout, payment, delivery booking, order editing or
  background scheduling operation. A transfer always starts from a user review.
- A normal basket with an **Online bestellen** button is required. An order in
  editing mode or an unfamiliar page stops the transfer.
- Each requested quantity must be an integer from 1 to 99, matching AH's
  inspected quantity control. Long transfers stop after four minutes.
- Ambiguous clicks are not retried. After interruption, check the basket and
  start a new transfer; quantities are read again before any further additions.
- AH can change its pages or require sign-in/verification. Complete prompts
  directly at AH. No challenge, login or checkout controls are automated.
- This is a personal, unofficial browser integration. The authenticated page
  controls were inspected on 7 September 2026. The packaged extension still
  requires a real installation and a user-approved transfer to validate it end
  to end. It does not run in mobile Safari or the ChatGPT cloud browser.

## Source and packaging

The source is in `extensions/ah-connector/` in the life-app repository. Run
`python scripts/package-ah-connector.py` from the repository root after any
change. This regenerates `catalog.js` from the app's chosen catalog and writes
the deterministic ZIP to `public/downloads/life-app-ah-connector.zip`.

Chrome references:
- https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world
- https://developer.chrome.com/docs/extensions/develop/concepts/messaging
- https://developer.chrome.com/docs/extensions/reference/api/scripting
