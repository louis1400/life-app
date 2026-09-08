# Save to Archive — first version

Share a URL from a website or social app, open one save screen, keep or change the suggested folder, optionally add a title/tags, and tap **Save link**. This version opens a browser screen; it is not a background save. It preserves links only, not downloaded videos, images, articles, or previews.

## One-time Google setup (easiest on your computer)

1. Open [a new Google Apps Script project](https://script.google.com/home/start) using **louisnijholt@gmail.com**. Name it **Save to Archive**.
2. Replace `Code.gs` with the contents of `integrations/drive-capture/Code.gs` from this branch.
3. Use **+ → HTML**, name it **Capture**, and replace its contents with `integrations/drive-capture/Capture.html`.
4. Click **Deploy → New deployment → Web app**. Set **Execute as: Me** and **Who has access: Only myself**. Authorize the script to access your Google Drive. Do not select public access. The code also checks your signed-in account.
5. Copy the resulting **Web app URL** ending in `/exec`. Open it on your iPhone in your usual browser and sign in with the same Google account. Verify that your Archive folders appear.

The provided `appsscript.json` is an optional explicit manifest for script import/CLI workflows; the editor can infer the required scopes from the two files. No separate Google Cloud OAuth client is needed. Google requests Drive access because the script reads your existing folders and creates bookmark files. All writes in this implementation are limited to direct child folders of your Internet Archive.

## One-time iPhone Shortcut setup

Create a shortcut in Apple's **Shortcuts / Opdrachten** app named **Save to Archive**:

1. In its Details, enable **Show in Share Sheet**. Accept **URLs**, **Safari Web Pages**, and **Text**. For no input, choose **Stop and Respond** with “Share a web link to this shortcut.”
2. Add **Get URLs from Input**, using **Shortcut Input**.
3. Add **Count** (items). Add **If** Count **is not** 1, then **Stop and Respond** with “Share one web link at a time.” End If.
4. Add **Get Item from List**: **First Item** from the output of **Get URLs from Input** (select that action's output explicitly).
5. Add **URL Encode**, encoding that first URL.
6. Add **Text**. Type your complete Web app URL followed by `?url=`. Insert the **URL Encoded Text** variable immediately after the equals sign. It should look like `https://script.google.com/macros/s/YOUR_DEPLOYMENT/exec?url=[URL Encoded Text]`.
7. Add **Open URLs**, using the Text output.

Action labels may differ with iOS language/version. The shared URL must be URL-encoded so query parameters and fragments remain intact. Do not paste an unencoded shared link into the template.

## Try it

In YouTube, Safari, or another app, share a link, open the system share sheet (sometimes under **More**), then scroll down to **Save to Archive**. On the save screen:

- Keep the suggested folder or select any other direct child folder of Internet Archive.
- Optionally enter a title and comma-separated tags.
- Tap **Save link** and wait for confirmation. **Open saved link in Drive** opens the resulting text bookmark.

Try one YouTube link and one ordinary webpage. Override the suggested folder once and add two tags; verify the resulting Drive text file contains the original URL and those tags. Save the same link into the same folder again; it should say **Already saved**, with no extra copy.

## Behavior and limits

- Suggestions are defaults, never restrictions. YouTube/TikTok/Vimeo links suggest Videos; mixed-media social links suggest Inbox; other URLs suggest Articles & links. You choose before saving. The suggestion is calculated when the screen opens; changing the link in that screen does not change your folder selection.
- New direct child folders you create in Drive appear on the next screen load. Nested folder browsing is not included yet.
- Titles are optional; without one, the domain is used. Tags live in the bookmark text and Drive description, not as native Drive labels or a synced app index.
- Duplicate detection compares the exact trimmed URL within the chosen folder. Tracking parameters and URL variants remain distinct. A duplicate keeps existing title/tags; choosing another folder deliberately permits another copy.
- No source-page fetching happens, so private/social links can be recorded without assuming their content is accessible.
- This Google-hosted capture helper works independently of the earlier Sites OAuth integration. Captures do not appear in that site's database yet.
- Google browser sign-in may be required initially or after your session expires. This has not been tested on your phone.
- To stop access, disable the Apps Script deployment. Existing bookmarks stay in Drive.

## Verification performed by the builder

Run `node --test tests/drive-capture.test.mjs`. These tests use a simulated Google Drive, not a live Google deployment. Live authorization and iPhone sharing must still be checked after setup.

References: [Apple share-sheet shortcuts](https://support.apple.com/en-gb/guide/shortcuts/apd163eb9f95/ios), [Google web-app deployment](https://developers.google.com/apps-script/guides/web), [Google HTML-to-server communication](https://developers.google.com/apps-script/guides/html/communication).
