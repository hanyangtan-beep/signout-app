# Speed: start-up, an offline copy and saves (2026-10-25)

User request, 2026-10-25: "I noticed that as the app had grown, it takes longer to load websites and save reports - how would you optimise this?", then "How would number 2. Work? I use multiple different computers", then "Add all 3 cards to the roadmap and build". Built the same day as Phase 79, as three cards: Faster start-up, Keep the app on the computer, Faster saves.

Untouched by all three: report text, every fixture, the templates, the Doc text and Sheet columns, and the sign-in gate.

## Measured before (Phase 78)

- Start-up: the app's code was 23 modules (527 kB, about 163 kB compressed) in import chains six deep. Only then did the app fetch the template list, then the planned list, then the template and its generator, each after the one before: about eight rounds of requests before the first report, 35 requests in all.
- On one machine over HTTP/2, with every response held back 200 ms (a far-away host with no nearby copy), the first report took 2.07 s (median of 5); at 100 ms, 1.46 s.
- The host lets the browser keep a file for an hour (`cache-control: public, max-age=3600`, with no ETag or Last-Modified to check it against later) and keeps no nearby copy (Cloudflare `cf-cache-status: BYPASS`). Every release also renamed every file (`?v=<build>`), so the first visit after a release downloaded everything again.
- A save of a case new to the tab made five Google calls, one after another: the whole Sheet, every saved case's JSON included (to find the Doc); the folder check; the Doc; the accession column (to find the row); the row. A re-save made three: the Doc, the accession column, the row. Open read the whole Sheet for its list, and again for the case picked.
- A Google sign-in lasts about an hour (`expires_in`). The first save after that went through Google's sign-in page and reloaded the app.

## Faster start-up

- `tools/build-lib.js` bundles `src/app.js` and the generators with esbuild, with code splitting (ES modules only; code shared between entry points goes into chunks, and `import()` starts a chunk of its own; [esbuild: splitting](https://esbuild.github.io/api/#splitting)). Start-up code is now 182 kB (64.7 kB compressed) in four files.
- The CNS modules (`cnswizard`, `cnspathway`, `cnsplates`, about 180 kB) load with `import()` when a CNS form first opens.
- A small script at the top of `index.html` preloads the app, its chunks, the template list, the planned list, the shared schema and the template the tab opens: its draft's templates (one per part), else Gastric biopsy. Module dependencies are listed one by one, as `modulepreload` requires ([MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/modulepreload)). The template list and planned list are fetched together.
- When the offline copy answers the tab, the script preloads nothing: the files are on the computer, and Chrome discards such preloads as a "cross-world service worker resource mismatch" and fetches twice, the reason Angular's build stopped emitting them alongside a service worker ([angular-cli commit d396324](https://github.com/angular/angular-cli/commit/d396324b4eb3b16640526a64365d953642bc7ca1)).
- The source tree stays unbundled, and `npm run qa` still drives it. esbuild documents an ordering caveat for code split across chunks, so the built-site QA (`tools/qa-dist.js`) writes every template's report, blank and with its example, from the source and from the build, and requires them to be identical (80 templates, both ways).

## Keep the app on the computer

- Every file is named by its content: `?v=` and the first 12 hex digits of its SHA-256. The release id is the hash of the file list, and `index.html` carries it as `data-build`. A release re-downloads only the files whose content changed.
- `src/sw.js` is a service worker, built to `sw.js` with the release in it. `sw-files.json` lists every file and its hash, what is stored on install (15 files, about 212 kB compressed: the page, the app, the template lists, Gastric biopsy, styles and icons), and what waits until it is viewed (the reference photographs, 43.7 MB).
- First open on a computer: the app loads from the host as before. Once the page has loaded, on the sign-in screen or in the workspace, the worker installs and stores the install files, then quietly stores the rest of the app and every template (about 3.6 MB) in the background. Photographs are stored as they are opened. Each file is checked against its hash before it is stored.
- Later opens: everything comes from the computer. The browser checks `sw.js`, one small request, each time the app opens, and the app asks again every hour while it is open.
- A release: only the changed files download, in the background. A tab stays on the release it opened with until New case or Save & new; then it reloads on the same template and shows the same note. So the first open after a release can still show the previous one, until the first New case. Once every tab of the app has been closed, the next open starts on the newest release already downloaded. The worker keeps the current and previous releases' files and deletes older ones.
- Nothing from another address is stored: no Google response, case, report, accession number or sign-in. Drafts stay in the tab's own storage, as before.
- Several computers: each keeps its own copy and nothing syncs between them; cases still move through Drive. A computer unused for weeks downloads only what changed since its last visit.
- Where it does not help: browsers that clear their data at log-off or when closed (the copy goes too, and the app loads from the host as before), private windows, browsers without service workers, and sandboxed frames such as a deploy preview, where the app starts without it.
- Recovery: open `https://han-signout.pplx.app/?nosw`. It removes the worker and its files and keeps the copy off in that browser; `?sw` turns it back on. Either way the page then reloads without the parameter.

## Faster saves

- A case new to the tab: four calls in three rounds. The accession and Doc id columns are read together in one `values.batchGet` (repeated ranges, returned in order; [Sheets API](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/batchGet)) alongside the folder check, then the Doc, then the row.
- A re-save: three calls in two rounds. The Doc is written while the row the session last saw is checked to still hold this accession, then the row is written. If the Sheet has been sorted, the row is looked up again. The row is still written only after the Doc.
- An accession already in the Sheet reuses its Doc; a Doc deleted in Drive is made again, and the row records the new one.
- Open lists cases from columns A to G, without the case JSON, and opening a case reads its one row.
- Sign-in: at New case or Save & new, a sign-in with less than 10 minutes left is renewed there and then, so a save does not stop for Google. Every redirect to Google names the signed-in account (`login_hint`), which Google uses to pick that account ([Google: OAuth 2.0 for client-side web applications](https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow)).

## Measured after (Phase 79)

| Same machine, HTTP/2, fonts blocked | Before | After |
|---|---|---|
| First report, each response held back 200 ms | 2.07 s | 1.07 s |
| First report, 100 ms | 1.46 s | 0.45 s |
| Requests to the first report | 35 | 15 |
| Google calls (rounds), saving a case new to the tab | 5 (5) | 4 (3) |
| Google calls (rounds), re-saving | 3 (3) | 3 (2) |

Opening the app again with the offline copy took 0.28 s at 200 ms and 0.25 s at 100 ms (median of 5), as nothing waits on the host. Before, a repeat visit relied on the browser's own copy, kept for an hour and emptied by every release. The built-site QA times start-up on its own server at 150 ms a request (median 0.57 to 0.68 s across runs, about four rounds, 13 requests).

## Checks

- `tests/swlogic.test.js`: which stored file answers a request, what a release still fetches, what is kept, and hashing as the build does.
- `tests/build.test.js`: the build into a temporary folder; every hash, the page's file map, the install list, the CNS chunks kept out of start-up, a release id that changes only with the files, and the preloads for a draft, for a fresh tab and where reading the service worker throws.
- `tests/drive_speed.test.js`: the calls and rounds of each save, the sorted-Sheet and missing-reply fallbacks, Doc reuse and re-creation, the Open list and the one-row open.
- `tests/gauth.test.js`: `login_hint` and when a sign-in is renewed.
- `tools/qa-dist.js` (`npm run qa:dist`, and a step of `npm run release` after the build): 80 templates the same as the source, start-up rounds, CNS loading, and the offline copy's first open, offline open, release, hand-over at New case, `?nosw` / `?sw`, its start on the sign-in screen (opened as `signout.localhost`, where the gate is on), and a start where reading it throws, with no console error or unused preload.
- `tools/qa-browser.js`: New case renews a sign-in near its end, for the same account, back on a blank case of the same template.
- Found after the first release, the same day: the copy started only after a sign-in, because the sign-in screen returned before the copy was started, and the gate is off on `localhost`, where the QA ran. The sign-in screen now starts it too, once the screen is up. The deploy preview then showed that in a sandboxed frame merely reading `navigator.serviceWorker` throws, which stopped start-up with "Failed to start"; every read is now guarded.
