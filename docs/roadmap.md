# Sign-out App — Roadmap

Live roadmap in the parsimonious format (`docs/roadmap-template.md`). Rules: only cards in **Next** get built; **Now** holds at most three cards (the current batch); ideas enter **Later** as one line; **Done** is one line per shipped item. Full build briefs for open items live in `docs/specs/`; the original phased plan is preserved in `docs/roadmap-history.md`.

State on 2026-09-10: 36 templates (10 small biopsy, 23 benign resection incl. LEEP, 1 frozen section, 2 synoptic cancer resections), 532 tests, published at `https://han-signout.pplx.app`.

---

## Done

Foundations and engine
- 2026-09-09 Repo, golden fixtures (16), `node --test` harness; legacy gastric + colonic polyp parity (27 tests).
- 2026-09-09 Schema engine: field types (select / grade / checkbox / number / text / multiselect), `showIf`, groups, presets, `partDefaults`, parts A–Z, single-part cases drop letters; British-spelling style layer.
- 2026-09-09 Google Drive store: OAuth redirect flow, Settings dialog, `Sign-out cases` Sheet + Doc per accession, Open dialog, PHI guard, Cmd+S; first real save verified 23:15 HKT.
- 2026-09-09 Published at han-signout.pplx.app; Google Cloud project `han-signout-app` set up.
- 2026-09-10 Case model: per-part templates, mixed-case assembly (`generateCase`), summary hooks, Same-as-previous / Reset, keyboard model, Open dialog case list.
- 2026-09-10 Template organisation: `system` / `kind` / `rank` / `aliases`, manifest + lazy loading, fixed Small biopsy row, pinned / recent Resections row, Cmd-K palette, grouped part selector.
- 2026-09-10 Snippets (`snippets[]` with auto rules → COMMENT block); generator `flags()`; `field.reference` photo galleries (CC BY, credited).
- 2026-09-10 Synoptic scaffold: `tools/import-qmh.js`, `src/staging/` (`deriveTNM`, AJCC 8th, y / m / r, override), hybrid mode with SYNOPTIC REPORT block, Checks panel, `synopticOnly`, version pinning.
- 2026-09-10 LIS macro / block key override: explicit per-block toggles, Use generated, Clear, "from LIS" tags (506 tests).
- 2026-09-10 Editable final report: per-block Edit / Done / Cancel / Revert, Revert edits, edits saved with the case and used by copy + Doc (514 tests).

Small-biopsy templates (10)
- 2026-09-09 Prostate biopsy (12-core map, Gleason → Grade Group, SUMMARY); IBD series (Nancy index, UC vs Crohn's summary).
- 2026-09-10 Duodenal (Marsh–Oberhuber auto); oesophageal (squamous + columnar, EoE threshold, Barrett's context); endometrial and LEEP ports; breast core (B1–B5c, WHO 6th; biomarker block ported verbatim from the QMH template, 17 tests); cervical biopsies (LAST two-tier, AIS, ECC, 8 tests); lung / bronchial (WHO 5th, NSCC favour statement, PD-L1 / molecular hook; mixed adenocarcinoma patterns via `multiselect`); gastric IM subtype + OLGA / OLGIM + Sydney presets + reference gallery (8 tests); colonic polyp at-least-HGD and carcinoma block (13 tests).

Benign resection templates (23) and frozen section (1)
- 2026-09-10 LEEP (from the legacy app), lymph node (reusable part), placenta, gallbladder, thyroid benign, parathyroid, appendix, uterus benign, ovarian cyst, skin cyst, skin excision with mm margins, breast excision / cavity shaves, TURP, TURBT, tonsils / adenoids, benign soft tissue, nasal polyps, skin small lesions, aortic valve / aorta (SCVP grading), stoma, liver benign, jaw cysts, salivary benign.
- 2026-09-10 Frozen section: scenario pick-lists, grouped intraoperative lines, block handling, frozen–paraffin correlation, INTRAOPERATIVE CONSULTATION block.

Synoptic cancer resections (2)
- 2026-09-10 Colon and rectum carcinoma resection (CAP 4.4.0.1, 62 fields, auto pTNM + stage, validation, auto comments; element order asserted against the QMH page).
- 2026-09-10 GIST resection (CAP 4.3.0.0 via `docs/reference/GI-GIST.html`, 52 fields; `src/staging/gist.js` — pT by size, gastric vs non-gastric AJCC 8th stage groups split by mitotic rate, Miettinen and Lasota 2006 risk table with insufficient-data cells; KIT / DOG1 / CD34 / SDHB, molecular line, complete-response wording; Checks and six auto comments; element order asserted against the saved page; 532 tests).

Docs
- 2026-09-10 Design suggestions, Google Drive set-up guide, case-mix analysis, breast biomarker source spec, Phase 4b brief, parsimonious roadmap template.

---

## Now

(empty — nothing in build this turn)

---

## Next

Ordered. Each card is buildable as written; the spec file holds the full brief.

### Prostate biopsy — inadequate core                    Size: S
Why:        cores with fibromuscular tissue only have no finding today.
Change:     per-part finding "Inadequate for diagnosis"; microscopy `Sections show a core of fibromuscular tissue only. No prostatic glandular tissue is present for assessment.`; dx `INADEQUATE FOR DIAGNOSIS - fibromuscular tissue only, no prostatic glands sampled`; excluded from cores-positive, listed in SUMMARY as "(C) inadequate"; optional repeat-sampling snippet.
Untouched:  existing prostate outputs and fixtures; Grade Group arithmetic.
Accept:     test: 3-part case with one inadequate core prints the line, SUMMARY says "1 of 2 cores positive … (C) inadequate"; example unchanged.
Verify:     tests only
Ship:       with batch
Spec:       `docs/specs/prostate-inadequate-core.md`

### Fallopian tube — ectopic pregnancy                   Size: M
Why:        formulaic Gynae resection seen in the case mix; user supplied a model report.
Change:     new template `fallopian_tube_ectopic` (Gynae, benign resection, reusable part): macro builder, block key `(1) Uninvolved fallopian tube. (2)&(3) Haemorrhagic tubal tissue with distension.`, microscopy with villi / trophoblast / rupture / epithelium, mandatory GTN sentence, dx `LEFT FALLOPIAN TUBE, salpingectomy - ECTOPIC TUBAL PREGNANCY` with variants; snippets for no-villi and persistent trophoblast.
Untouched:  uterus benign template; house `fetal` spelling.
Accept:     fixture from the user's example reproduces macro / block key / microscopy / dx; no-villi variant prints the hCG comment; appears in Resections browse under Gynae.
Verify:     tests + browser (light)
Ship:       with batch
Spec:       `docs/specs/fallopian-tube-ectopic.md`

### Nasopharyngeal biopsy                                Size: M
Why:        local NPC work-up has no template.
Change:     new small-biopsy template `nasopharyngeal_biopsy` (header "NPC"): site / adequacy, benign pick-list with `NASOPHARYNX, biopsy - NO EVIDENCE OF MALIGNANCY`, WHO 5th NPC subtypes with IHC + EBER sentence, lymphoma / granulomatous / post-RT options, three snippets.
Untouched:  Small biopsy row order for existing templates (NPC appended).
Accept:     benign and non-keratinising undifferentiated fixtures; EBER-pending snippet auto-ticks when EBER is "pending"; visible in the Small biopsy row.
Verify:     tests + browser (light)
Ship:       with batch
Spec:       `docs/specs/nasopharyngeal-biopsy.md`

### Open Google Doc button                               Size: S
Why:        the Doc link only appears as small text in the status bar after a save in this session; a saved case should be one click from its Doc at all times.
Change:     an **Open Doc** button in the header actions (next to Save) that opens `caseState.drive.docUrl` in a new tab. Enabled as soon as the case has a Doc (saved now, or reopened from the Sheet, which already restores `drive.docId` / `docUrl`). When the accession is typed but the case has not been opened from the Sheet, the button looks the Doc up by normalised accession in `Sign-out cases` (one Sheet read) and opens it, or offers Save when no row exists. Tooltip shows "Saved HH:MM" / "Edited since save" so it is clear whether the Doc is current.
Untouched:  save / open flow, Sheet columns, status bar link (kept).
Accept:     button disabled on a new unsaved case; enabled after Save and after Open; `drive.js` lookup-by-accession unit test (row found → url; not found → null); browser: click opens a new tab on the doc URL.
Verify:     tests + browser (light)
Ship:       with batch
Spec:       card is the spec

### Peritoneal nodule biopsy                             Size: M
Why:        peritoneal / omental nodules sampled at laparoscopy or laparotomy are a recurring small specimen with a short list of answers (reactive mesothelial hyperplasia, peritoneal loose body, metastatic carcinoma, endometriosis, granuloma) and no template; the diagnosis line and IHC sentence are formulaic.
Change:     new template `peritoneal_nodule` (GI, kind biopsy, header "Peritoneum"; aliases omentum, peritoneal nodule, loose body, mesothelial, deposit, implant): specimen builder (site pick-list — parietal peritoneum, omentum, mesentery, pelvic peritoneum, pouch of Douglas, diaphragm, serosa of named organ — plus procedure biopsy / excision; multi-part for several nodules); diagnosis pick-list with fixed narrative and dx lines — **reactive mesothelial hyperplasia** (florid / papillary variant, no invasion sentence), **peritoneal loose body** (laminated hyalinised fibrous tissue ± central fat necrosis / calcification, "consistent with an infarcted and detached appendix epiploica"), **metastatic carcinoma** (adenocarcinoma / serous / mucinous / signet-ring / squamous / other, with IHC sentence and a favoured-primary statement; "metastatic carcinoma, see comment" when primary uncertain), **endometriosis** (glands + stroma ± haemosiderin), **endosalpingiosis**, **fat necrosis**, **fibrous adhesion / fibrosis**, **granulomatous inflammation** (foreign-body / suture, keratin, necrotising with AFB / fungal stains pending), **splenosis**, **deciduosis**, **well-differentiated papillary mesothelial tumour**, **mesothelioma** (points to a Comment recommending full work-up); IHC field group with mesothelial (calretinin, WT1, D2-40, CK5/6) vs epithelial (BerEP4, MOC31, claudin-4) markers and site markers (CK7 / CK20, CDX2, SATB2, PAX8, GATA3, TTF-1, ER / PR) printed in one paragraph with microscopy; mesothelioma work-up extras BAP1 / MTAP; snippets for "no evidence of malignancy in this sample; sampling caveat", "correlate with imaging and clinical findings for the primary site", "stains pending", and "reactive mesothelial proliferation — features favouring reactive over neoplastic".
Untouched:  frozen section template (peritoneal nodules remain a frozen scenario there); colon and GIST synoptics; Small biopsy row order for existing templates (Peritoneum appended, reachable via More / palette).
Accept:     fixtures for reactive mesothelial hyperplasia, peritoneal loose body and metastatic colorectal adenocarcinoma (CK20 / CDX2 / SATB2 positive, CK7 negative) reproduce the house wording; single-part output has no "(A)"; multi-nodule case prints one dx line per part; sampling-caveat snippet auto-ticks for benign categories when the request mentions malignancy; visible in the palette under GI.
Verify:     tests + browser (light)
Ship:       with batch
Spec:       card is the spec

### Frozen section scenarios                             Size: L → split; five cards, two batches
Why:        the frozen template covers generic margin / node / parathyroid / ovary / nodule; the recurring services in the case mix — breast sentinel nodes, bile duct and pancreatic duct margins, lung wedges, head-and-neck named margins, CNS biopsies — each need their own fields, phone-line wording and paraffin correlation. Past sign-outs supply house wording for SLN, bile duct, lung wedge and head-and-neck margins (`docs/reference/frozen-section-examples.md`, 10 scenarios with session references); none exists for CNS / meningioma, so that card is marked proposed.
Split into:
  (a) Breast sentinel lymph nodes (S): side, node labels, nodes found, fat stripped, macro / micro / ITC / deferred, metastasis size, post-neoadjuvant treatment effect; dx `LYMPH NODES, left SLN 1, excision x frozen section - NO EVIDENCE OF MALIGNANCY (0/2)`; node-arithmetic and size Checks.
  (b) Bile duct and pancreatic duct margins (S): CBD / CHD / pancreatic neck, ring or shave, en face; negative / invasive / BilIN-3 or PanIN-3 / denuded cannot-assess; stent-atypia and peribiliary-gland caveats.
  (c) Lung wedge / nodule (M): staple line trimmed, parenchymal margin inked, nodule size and distance, pleura; adenocarcinoma and variants, SCC, NSCC-NOS deferred, small cell, carcinoid, metastatic (primary named), necrotising / non-necrotising granulomatous inflammation, organising pneumonia, benign; margin Checks; subtype-on-paraffin snippets.
  (d) CNS lesion (M, proposed wording): smear and/or frozen; meningioma, high- / low-grade glial neoplasm, metastasis, favour lymphoma (fresh tissue reserved), schwannoma, PitNET, reactive gliosis, nondiagnostic; WHO CNS5 deferred snippet.
  (e) Named-margin presets and line form (S): oral tongue 5 / 6, oropharynx 7, nasal ala Rm A–D + deep, maxillectomy custom; grouped `(A)-(G) Negative for malignancy.`; diagnosis joiner ` x frozen section - ` (deliberate fixture change, logged).
Untouched:  frozen–paraffin correlation model, LIS override, existing scenario wording except the joiner in (e); all other templates.
Accept:     per-card fixtures reproduce the quoted house lines (SLN §2, bile duct §4, lung §10, tongue §6, nasal ala §5 of the examples file); CNS fixtures from the proposed wording; template still one entry ("Frozen") in the Resections row.
Verify:     tests + browser (light) per batch
Ship:       two batches — (a)+(b)+(e), then (c)+(d); one publish each
Spec:       `docs/specs/frozen-section-scenarios.md`

### Gastric carcinoma resection (synoptic)              Size: L → split before building
Why:        highest-volume cancer resection after colon.
Split into: (a) save QMH page + importer draft + `src/staging/gastric.js` rules with boundary tests (M); (b) schema + generator + synoptic block + Checks (M); (c) fixtures against the QMH page element order + docs (S).
Spec:       `docs/specs/synoptic-next-templates.md`

---

## Later

One line each; card them before building.

- Synoptic templates after stomach: prostate (radical) with Gleason arithmetic validation; breast with Nottingham validation; endometrium. (`docs/specs/synoptic-next-templates.md`)
- "Upgrade part": benign template → matching cancer resection carrying macro, block key and shared fields (needs the target templates first).
- Frozen section: time received / slides dispatched fields (only if wanted in the report rather than the LIS log).
- Frozen section: discordance summary across cases (needs a Sheet query).
- Settings → Templates: per-user hide / show toggles; pins and recents synced through Drive.
- Snippet library editable as Markdown; favourites and recently used.
- Case queue joined to the TAT priority Sheet (due dates in the Open dialog).
- Analytics over `Sign-out cases`: H. pylori rate, adenoma detection, Grade Group distribution, IM prevalence.
- Perplexity workflows over Drive: rewrite a draft Doc in house style, check a synoptic against CAP, weekly signed-case summary.
- Diff view for edited blocks (generated vs edited) using `out.generated`.
- iPad layout; shared look with PathExam.
- Optional public schema set (no PHI) for colleagues.
- Small fixes to verify and card: TURP `≤` rendering as `<=`; flag snippets marking every part rather than the triggering part; LAR example block key still using colon wording.

---

## Parked

- Phase 2 leftovers "one-time Google Cloud set-up" and "first real save" — superseded; both verified 2026-09-09.
- Hernia sac, haemorrhoids, products of conception templates — 0–3 documents in the case mix; add only if they appear on the TAT list.

---

## Deployment and reference

- Published: `https://han-signout.pplx.app` (site id `50c90ba7-8e5b-49c2-8462-5db64121e8d4`). Flow: `deploy_website` then `publish_website` with the existing site id, once per batch.
- Drive: Sheet `Sign-out cases` `1KZBenmjudy1_TRqpoyTqvvxMaktgvzcjVmsJePH6ivk`; folder "Pathology reports" `1IDOdz37IQJaYDX7PVFlqB7VFzyfiNXMM`; OAuth client `834072849408-kerfr1jhg6nc05h3dpk0965juj3b9379.apps.googleusercontent.com` (secret not stored here).
- Repo seams: `src/engine.js` (`generateCase`, `mergeLis`, edits overlay, `out.source` / `out.generated`), `src/docformat.js` (`buildDocText`, PHI guard), `src/staging/`, `templates/manifest.json` via `scripts/build-manifest.mjs`, `tools/import-qmh.js`.
- QA harness: `pplx-tool js_repl`, static server on 8790 serving `dist/`, Playwright 1360×900; report blocks `#report-blocks .block`; case details `#meta-details`; theme `#theme-toggle`.
- Guards: golden fixtures in `tests/fixtures/` byte-identical unless a card says otherwise; `git status --short tests/fixtures` must be empty before commit.

## Risks

- Wording drift → golden fixtures on every run.
- OAuth friction → consent screen stays in Testing with one test user; widen to `drive` scope only if `drive.file` cannot place the Doc.
- Preview iframe limits → sign-in and storage are tested on the published URL, not the in-thread preview.
- PHI on personal Drive → accession-only guard; no names or HKIDs entered.
- Staging rule errors → unit tests per pT / pN boundary; edition stamped on output.
- Scope creep in synoptics → import QMH pages only when needed.
