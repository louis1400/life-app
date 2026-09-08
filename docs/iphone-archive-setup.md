# Save to Archive — first version

Share a URL from a website or social app, open one save screen, keep or change the suggested folder, optionally add a title/tags, and tap **Save link**. This version opens a browser screen; it is not a background save. It preserves links only, not downloaded videos, images, articles, or previews.

## One-time Google setup (easiest on your computer)

1. Open [a new Google Apps Script project](https://script.google.com/home/start) using **louisnijholt@gmail.com**. Name it **Save to Archive**.
2. Open [FIRST FILE — code for Code.gs](sandbox:/workspace/scratch/80857ab88be0/internet-archive/docs/COPY-INTO-Code.gs.txt). Copy all its text. If it downloads, open it in Notepad and press **Ctrl+A → Ctrl+C**. Return to Google Apps Script, select **Code.gs** on the left, click inside the editor, and press **Ctrl+A → Ctrl+V**. Click **Save**. If you already did this, continue to step 3.
3. In Google Apps Script, click the **+ beside Files** on the left and choose **HTML**. Name it **Capture**, with a capital C; Google adds `.html`. Open [SECOND FILE — code for Capture.html](sandbox:/workspace/scratch/80857ab88be0/internet-archive/docs/COPY-INTO-Capture.html.txt) and copy all its text. Return to Google Apps Script, click **Capture.html**, click inside its editor, and press **Ctrl+A → Ctrl+V**. Click **Save**. You should now see both **Code.gs** and **Capture.html** on the left.
4. Click **Deploy** at the top right, then **New deployment**. Click the gear beside **Select type** and choose **Web app**. Enter **Save to Archive** as the description. Set **Execute as: Me** and **Who has access: Only myself**. Click **Deploy**, then **Authorize access** if prompted, choose **louisnijholt@gmail.com**, and review/approve the Drive access request. Do not select public access. The code also checks your signed-in account.
5. Under **Web app → URL**, click **Copy**. This is the address ending in `/exec`, not the deployment ID. Save it in a note you can open on your iPhone or send it to yourself. Google creates this address during deployment, so it is the one value we cannot provide in advance. Open it on your iPhone in your usual browser and sign in with the same Google account. Verify that your Archive folders appear.

**You only need the two linked text files above. No other files, repository access, or terminal commands are needed.** Open the Web app address to test the screen; do not use the editor's Run button.

## One-time iPhone Shortcut setup

On your iPhone, open **Shortcuts / Opdrachten**, tap **+**, and use the name menu to name the shortcut **Save to Archive**. Have the Web app address from Google step 5 ready to copy. Add the actions below in this order using the action search:

1. In its Details, enable **Show in Share Sheet**. Accept **URLs**, **Safari Web Pages**, and **Text**. For no input, choose **Stop and Respond** with “Share a web link to this shortcut.”
2. Add **Get URLs from Input**, using **Shortcut Input**.
3. Add **Count** (items). Add **If** Count **is not** 1, then **Stop and Respond** with “Share one web link at a time.” End If.
4. Add **Get Item from List**: **First Item** from the output of **Get URLs from Input** (select that action's output explicitly).
5. Add **URL Encode**, encoding that first URL.
6. Add **Text**. Paste your Web app address from Google step 5, then type `?url=` immediately after `/exec`, with no spaces or line breaks. Place your cursor after the equals sign, tap **Select Variable** above the keyboard, and select the output of **URL Encode**. This inserts a variable bubble. Do not type “URL Encoded Text” as ordinary text.
7. Add **Open URLs**, using the preceding **Text** output. Tap **Done** to finish.

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

## If something does not match

| What you see | What to check |
|---|---|
| Capture file not found | The HTML file must be **Capture.html**, with a capital C. |
| Wrong account or sign-in error | Open the Web app address using **louisnijholt@gmail.com**. Keep deployment access set to Only myself. |
| Shared link is blank or broken | Insert the actual output variable from URL Encode after `?url=` in the Text action. |
| Shortcut is missing | Enable Show in Share Sheet, then look among the actions below the app icons in Apple's share sheet. |
| Changes are not appearing | After editing the Google code, use **Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy**. This preserves your existing address. |

The saving tests passed with a simulated Google Drive. Google authorization and iPhone sharing still need the live test above.

References: [Apple share-sheet shortcuts](https://support.apple.com/en-gb/guide/shortcuts/apd163eb9f95/ios), [Google web-app deployment](https://developers.google.com/apps-script/guides/web), [Google HTML-to-server communication](https://developers.google.com/apps-script/guides/html/communication).
