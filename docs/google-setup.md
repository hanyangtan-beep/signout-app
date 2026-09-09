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
4. Leave redirect URIs empty (the token flow uses a pop-up, no redirect).
5. Create and copy the client id (`…apps.googleusercontent.com`). There is no secret to keep.

## 4. In the app

1. Open the app → gear icon → paste the client id → Save settings.
2. Click **Sign in**, choose your account, accept the two permissions.
3. Enter an accession, draft a case, press **Save** (Cmd/Ctrl+S). The first save creates the `Sign-out cases` Sheet and the case Doc in the "Pathology reports" folder.

## Notes

- **drive.file scope** lets the app see only files it created. If the first save fails with `File not found` on the folder, Drive is refusing to place an app-created file into a folder the app cannot see. Switch *Drive scope* in Settings to `drive` (full access to your Drive, still only your own account) and sign in again.
- The Sheet id is cached in the browser after the first save. If you rename or move the Sheet, clear it by changing the sheet name in Settings and back.
- The Doc body is plain text with fixed headings (CLINICAL HISTORY, SPECIMEN, MACROSCOPIC DESCRIPTION, BLOCK KEY, MICROSCOPIC EXAMINATION, DIAGNOSIS). Saving again replaces the whole Doc body, so edit in the app, not in the Doc.
- A PHI guard warns before saving if free text looks like an HKID with check digit, an honorific plus name, a phone number, or a date of birth. Accession numbers such as `S25-00123` are not flagged.
