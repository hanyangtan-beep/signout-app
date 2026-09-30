# Google Drive set-up (one-time, about 10 minutes)

The app signs into Google in your browser and writes straight to your Drive. Nothing passes through a server, so the only thing to create is a public OAuth "web client" whose allowed origin is the app's URL. The app's permanent address is `https://han-signout.pplx.app`; the in-thread preview cannot be used as an origin.

## 1. Google Cloud project

1. Open [console.cloud.google.com](https://console.cloud.google.com/) with the same Google account that owns the "Pathology reports" folder.
2. Create a project (e.g. `signout-app`).
3. APIs & Services → Library → enable **Google Drive API** and **Google Sheets API**.

## 2. OAuth consent screen

1. APIs & Services → OAuth consent screen (Google Auth Platform → Branding/Audience in the new console).
2. User type **External**, app name `Sign-out`, your email as support and developer contact.
3. Audience → **Test users** → add your own Google account. Leave the app in *Testing*; it only ever needs to work for you, and testing mode avoids the verification process. (Testing-mode refresh consent every 7 days is not an issue here because the app only asks for an access token when you use it.)
4. Data access → Add scopes:
   - `https://www.googleapis.com/auth/drive.file`
   - `https://www.googleapis.com/auth/spreadsheets`
   - `openid`, `email` (for showing who is signed in)

## 3. OAuth client id

1. APIs & Services → Credentials → Create credentials → **OAuth client ID**.
2. Application type **Web application**, name `Sign-out web`.
3. **Authorised JavaScript origins**: `https://han-signout.pplx.app` (exactly, no trailing slash). Add `http://localhost:3000` too if you ever run it locally.
4. **Authorised redirect URIs**: `https://han-signout.pplx.app/` (with the trailing slash; it must equal the page URL exactly). Add `http://localhost:3000/` too for local runs.

   Why a redirect and not a pop-up: the pplx.app host sends `Cross-Origin-Opener-Policy: same-origin`, which breaks the Google Identity Services pop-up ("Popup window closed"). The app therefore uses the OAuth 2.0 implicit flow: Save or Open sends the whole tab to Google and back, the draft is kept in sessionStorage across the trip, and the interrupted action resumes automatically.
5. Create and copy the client id (`…apps.googleusercontent.com`). There is no secret to keep.

## 4. In the app

1. Open the app → gear icon → paste the client id → Save settings.
2. Click **Sign in**, choose your account, accept the two permissions.
3. Enter an accession, draft a case, press **Save** (Cmd/Ctrl+S). The first save creates the `Sign-out cases` Sheet and the case Doc in the "Pathology reports" folder.

## 5. Letting colleagues in

Each signed-in account works in its own Drive: the folder id in Settings is probed on first save, and an account that cannot write to it gets a folder of its own called "Pathology reports" with its own `Sign-out cases` Sheet inside it. Nobody sees anybody else's cases, and nothing needs to be shared.

Two things have to change: the Google project, because the app is in *Testing* and only listed test users may sign in, and the app's built-in allow-list, because the published build admits only the accounts on it (from 2026-09-30).

1. [console.cloud.google.com](https://console.cloud.google.com/) → project `signout-app` → **Google Auth Platform → Audience**.
2. Under **Test users**, click **Add users**, paste one Gmail address per line, Save. The address must be the exact account the colleague signs in with.
3. In the repo, run `node tools/allow-hash.mjs <address>` and paste the line it prints into `BUILT_IN_ALLOWED` in `src/gate.js`, then run the release gate and publish. The list holds salted SHA-256 digests, never the address, because the file is served to anyone: a reader cannot recover an address from it, though someone who already guesses one can check the guess. Case, dots and "+tags" in a Gmail address do not matter. Settings shows the list as fixed, and a signed-in account that is not on it sees "No access".
4. Tell them the address `https://han-signout.pplx.app`, and that Google will show an "unverified app" warning on first sign-in: **Advanced → Go to Sign-out (unsafe)**. That wording is Google's, not a fault in the app.

The gate reads the signed-in address from Drive (`about.get`, allowed under `drive.file`), so no extra permission is asked for. It runs in the browser, so it keeps strangers out of the workspace but is not a security boundary for the files themselves; the app's Visibility setting in Perplexity is the control the host enforces.

Limits worth knowing before you add anybody:

- Testing is capped at **100 test users**, and a test user consumes the quota once added ([Google Cloud console help](https://support.google.com/cloud/answer/15549945?hl=en)).
- A test user's authorisation **expires seven days after consent**, so each colleague re-approves the app weekly ([same page](https://support.google.com/cloud/answer/15549945?hl=en)). The exemption for identity-only scopes does not apply here because the app requests Drive and Sheets.
- Publishing the project **In production** removes the allowlist, so any Gmail account can sign in without being added — but an unverified project requesting the sensitive `spreadsheets` scope is capped at **100 users over the lifetime of the project, and the cap cannot be reset** ([OAuth app state overview](https://developers.google.com/identity/protocols/oauth2/production-readiness/overview)). Google states a personal-use app under 100 users need not be verified and that users may click through the warning ([when verification is not needed](https://support.google.com/cloud/answer/13464323?hl=en)).
- The cap and the warning both come from the scope mix. `spreadsheets` is **sensitive**; `drive.file` is **non-sensitive**; full `drive` is **restricted** ([Sheets API scopes](https://developers.google.com/workspace/sheets/api/scopes)). An app requesting only non-sensitive scopes has no cap and no warning screen.

## Notes

- **drive.file scope** lets the app see only files it created. If the first save fails with `File not found` on the folder, Drive is refusing to place an app-created file into a folder the app cannot see. Switch *Drive scope* in Settings to `drive` (full access to your Drive, still only your own account) and sign in again.
- The Sheet id is cached in the browser after the first save. If you rename or move the Sheet, clear it by changing the sheet name in Settings and back.
- The Doc body is plain text with fixed headings (CLINICAL HISTORY, SPECIMEN, MACROSCOPIC DESCRIPTION, BLOCK KEY, MICROSCOPIC EXAMINATION, DIAGNOSIS). Saving again replaces the whole Doc body, so edit in the app, not in the Doc.
- A PHI guard warns before saving if free text looks like an HKID with check digit, an honorific plus name, a phone number, or a date of birth. Accession numbers such as `S25-00123` are not flagged.


## Troubleshooting sign-in (learned 2026-09-09)

| Message | Cause | Fix |
| --- | --- | --- |
| `Popup window closed` | pplx.app sends `Cross-Origin-Opener-Policy: same-origin`, which kills the GIS pop-up | Fixed: the app uses the redirect flow |
| `403. That's an error. You do not have access to this page` | Google refuses OAuth inside embedded browsers: the preview panel in a Perplexity thread, or the Perplexity app's in-app browser | Open `https://han-signout.pplx.app` in a real browser tab (Comet, Safari, Chrome) |
| `No Google client id set` | Old cached JavaScript, or a blank/mistyped id saved in Settings | Fixed: the id ships with the app, blanks and malformed values are ignored, assets are cache-busted per build. Hard-reload once |
| `Error 401: invalid_client` | A mistyped client id in Settings | Clear the Settings field; the built-in id applies |
| `Error 400: redirect_uri_mismatch` right after adding the redirect URI | Google serves an already signed-in session a stale copy of the client settings; a fresh session sees the new one | Use a private window once, or sign out of Google and back in; the normal window catches up within about an hour |

First successful save: 2026-09-09 23:15 HKT, Sheet `Sign-out cases` and Doc created in the "Pathology reports" folder.
