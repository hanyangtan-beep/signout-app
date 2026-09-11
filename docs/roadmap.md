# Sign-out App — Roadmap

Live roadmap in the parsimonious format (`docs/roadmap-template.md`). Rules: only cards in **Next** get built; **Now** holds at most three cards (the current batch); ideas enter **Later** as one line; **Done** is one line per shipped item. Full build briefs for open items live in `docs/specs/`; the original phased plan is preserved in `docs/roadmap-history.md`.

State on 2026-09-11: 43 templates (10 small biopsy, 23 benign resection incl. LEEP, 1 frozen section, 3 synoptic cancer resections, 6 cytology), 604 tests, published at `https://han-signout.pplx.app`.

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

Synoptic cancer resections (3)
- 2026-09-10 Colon and rectum carcinoma resection (CAP 4.4.0.1, 62 fields, auto pTNM + stage, validation, auto comments; element order asserted against the QMH page).
- 2026-09-10 GIST resection (CAP 4.3.0.0 via `docs/reference/GI-GIST.html`, 52 fields; `src/staging/gist.js` — pT by size, gastric vs non-gastric AJCC 8th stage groups split by mitotic rate, Miettinen and Lasota 2006 risk table with insufficient-data cells; KIT / DOG1 / CD34 / SDHB, molecular line, complete-response wording; Checks and six auto comments; element order asserted against the saved page; 532 tests).
- 2026-09-11 Endometrial carcinoma resection (CAP 5.1.0.0 via `docs/reference/GYN-Endometrium.html`, 85 fields; `src/staging/endometrium.js` — AJCC 8th pT / pN / pM plus FIGO 2009 and FIGO 2023 with the IA3, IAm and IICm rules, shown only as `(reference, not reported)` info lines in Checks; pTNM block behind `printPTNM`; ProMisE class by precedence with override; six fixtures, element order against the saved page; 603 tests). Same day: maxParts 10; histotype-specific microscopy (`histologyText`) driven by new architecture / solid % / nuclear grade / differentiation / carcinosarcoma component / invasion pattern / necrosis fields (95 fields); grade defaults to derive from the histotype (endometrioid FIGO grade from solid % and nuclear grade, non-endometrioid types high grade, "Other" must be picked); fixtures regenerated deliberately (logged in the spec); 604 tests.

Cytology (6)
- 2026-09-11 Cytology suite: kind `cytology` / system Cytology, shared `generators/cytology.js`, schemas from `scripts/gen-cytology-schemas.py`. Thyroid FNA (Bethesda 2023, ROM per category), salivary gland FNA (Milan 2nd ed., ROM incl. IVa / IVb), lymph node FNA / EBUS-TBNA / EUS-FNA (Sydney L1–L5), serous effusions (TIS, ROM), urine (Paris 2.0, LGUN flag, no ROM line), cervical LBC / conventional (Bethesda 2014, HPV line). Preparations line (smears / cytospin / cell block / LBC) as the macro block; adequacy + findings + interpretation in one microscopy paragraph with cell-block IHC; house diagnosis line `ORGAN, site, procedure - DIAGNOSIS (System: category)`; auto ROM / management snippets; adequacy–category and feature–category Checks. No rapid on-site evaluation fields (not offered locally). 13 tests incl. 8 golden fixtures (`tests/fixtures/cytology/`). Spec: `docs/specs/cytology-suite.md`.

Docs
- 2026-09-10 Design suggestions, Google Drive set-up guide, case-mix analysis, breast biomarker source spec, Phase 4b brief, parsimonious roadmap template.
- 2026-09-11 Endometrial carcinoma — reference photo galleries: 77 CC BY / CC0 photomicrographs (24 open-access sources, legends checked, panel-cropped, ≤ 150 kB, credit + licence + URL under each) on `solidPct`, `nuclearGrade`, `histType`, `differentiation` and `invasionPattern`, with WHO-5th-ed criteria bullets per heading and a click-to-enlarge view; `tests/reference.test.js` extended (605 tests). Gaps (MELF vs LVSI mimic, LCNEC quality, G3 endometrioid vs serous side by side) listed in the spec; user's own Drive photos remain a Later card.

---

## Now

(empty)

---

## Next

Ordered. Each card is buildable as written; the spec file holds the full brief.

### iPhone-friendly version of the app                    Size: M
Why:        the app is used from a phone between cases (user request 2026-09-11); today the layout only collapses to one column at 960 px, the two-row template bar, chip groups and the report pane were designed for a desktop width, and Google sign-in / Save have not been exercised on iOS Safari.
Change:     responsive pass at 390-430 px (iPhone 13-16 widths), no separate app: (1) sticky compact top bar with a single **Templates** sheet replacing the two button rows and the Search box; (2) form and report as two tabs (**Case** / **Report**) with a bottom action bar (Copy diagnosis, Copy full report, Save) instead of a side-by-side workspace; (3) chip groups wrap with 44 px touch targets, selects and inputs at 16 px to stop iOS zoom, part header actions collapse into a menu; (4) Compare photos panels one column, lightbox pinch-zoomable; (5) `viewport-fit=cover` + safe-area insets, `theme-color`, apple-touch-icon and a web-app manifest so **Add to Home Screen** opens full-screen; (6) Google sign-in and Drive Save / Open verified on iOS Safari (popup vs redirect flow — pick whichever works in standalone mode and record it in the spec); (7) clipboard copy verified on iOS (`navigator.clipboard.writeText` requires a user gesture).
Untouched:  report wording, schemas, generators, fixtures; desktop layout above 960 px unchanged.
Accept:     Playwright at 390x844 (iPhone 14 device profile) and 430x932: no horizontal scroll on any template; every chip / button ≥ 44 px tall; Case / Report tabs switch and the bottom bar copies the diagnosis; galleries open one column; existing desktop screenshots at 1300 px unchanged; manual check on the user's iPhone for sign-in, Save, Open and Copy, results recorded in the spec.
Stop:       no native app, no framework change, no service worker / offline cache in this card (Later if wanted); if iOS standalone mode breaks Google sign-in after two approaches, ship browser-tab mode and note it.
Verify:     tests + Playwright mobile profiles + manual iPhone check
Ship:       one deploy + publish
Spec:       `docs/specs/iphone-layout.md`

### Prostate biopsy — Gleason pattern reference galleries   Size: M
Why:        Gleason pattern 3 vs 4 (poorly formed / fused glands), pattern 4 vs 5, cribriform and intraductal carcinoma calls drive the Grade Group and are the commonest source of inter-observer disagreement; a picture beside the chip, as for endometrium, reduces mis-grading (user request 2026-09-11, citing Epstein).
Change:     `field.reference` galleries (existing mechanism, lightbox) on `primary` / `secondary` (shared gallery: pattern 3 discrete glands incl. small / branching / atrophic glands; pattern 4 poorly formed, fused, glomeruloid, cribriform; pattern 5 single cells, cords, sheets, solid nests, comedonecrosis; borderline 3-vs-4 pitfalls — tangential sectioning, crushed glands, adenosis / partial atrophy), `tertiary5` (minor pattern 5 vs a true secondary; the < 5 % rule), `cribriform` (large vs small cribriform, cribriform vs glomeruloid, cribriform vs fused), `idcp` (IDC-P vs invasive cribriform: basal cells, dense cribriform / solid, marked atypia, comedonecrosis; vs HGPIN), `category` (ASAP / HGPIN / atypical adenomatous hyperplasia / benign mimics — seminal vesicle, Cowper glands, nephrogenic adenoma). Criteria bullets from the 2014 and 2019 ISUP consensus papers (Epstein et al., Am J Surg Pathol 2016;40:244; van Leenders et al., Am J Surg Pathol 2020;44:e87), Epstein's Modern Pathology / AJSP updates and WHO Urinary and Male Genital Tumours 5th ed., each cited by DOI in the spec. Images: open-access CC BY / CC BY-SA / CC0 only, legends checked, panel-cropped, ≤ 150 kB, credit + licence + URL under each, in `assets/reference/prostate/`. Grade Group table (1 = 3+3, 2 = 3+4, 3 = 4+3, 4 = 8, 5 = 9-10) shown once at the top of the gallery.
Untouched:  report wording, Grade Group derivation, fixtures, other templates.
Accept:     `tests/reference.test.js` covers the new entries (file, caption, credit, licence, URL; ≥ 2 illustrated groups per field); source table and gaps in the spec; each of the five fields shows Compare photos in the browser; galleries open one column on mobile if the iPhone card has shipped.
Stop:       Epstein's own figures are almost all behind AJSP / Modern Pathology paywalls — they are the criteria source, not the image source; do not lift them. Use his open-access papers only where the licence is CC BY (check each on Europe PMC). If no licensed image exists for a pattern after a bounded search, ship criteria text and list it as a gap. No NC / ND; nothing AI-generated.
Verify:     tests + browser
Ship:       one deploy + publish
Spec:       `docs/specs/prostate-gleason-galleries.md`
Later:      the user's own photomicrographs from Drive (same card as endometrium).

### Prostate biopsy — inadequate core                    Size: S
Why:        cores with fibromuscular tissue only have no finding today.
Change:     per-part finding "Inadequate for diagnosis"; microscopy `Sections show a core of fibromuscular tissue only. No prostatic glandular tissue is present for assessment.`; dx `INADEQUATE FOR DIAGNOSIS - fibromuscular tissue only, no prostatic glands sampled`; excluded from cores-positive, listed in SUMMARY as "(C) inadequate"; optional repeat-sampling snippet.
Untouched:  existing prostate outputs and fixtures; Grade Group arithmetic.
Accept:     test: 3-part case with one inadequate core prints the line, SUMMARY says "1 of 2 cores positive … (C) inadequate"; example unchanged.
Verify:     tests only
Ship:       with batch
Spec:       `docs/specs/prostate-inadequate-core.md`

### Sinonasal papilloma detail (nasal polyps template)   Size: S
Why:        the template names inverted / exophytic papilloma with a dysplasia grade only; oncocytic type, the WHO 5th nomenclature, carcinoma ex papilloma and the molecular comment are missing.
Change:     `lesion` gains `Sinonasal papilloma, oncocytic`; papilloma-only fields: `papillomaSite` (nasal cavity / lateral wall / maxillary sinus / ethmoid / septum), `papillomaExtent` (fragments / involving surface only / involving bone-adjacent stroma), `papillomaDysplasia` reuses the existing grade with "Squamous atypia, reactive" added, `papillomaCarcinoma` (None / Carcinoma in situ / Invasive SCC arising in papilloma → refer to QMH head and neck synoptic), `papillomaMitoses` (none / basal only / suprabasal), `papillomaSurgicalIntent` (biopsy / piecemeal endoscopic excision / en bloc). Microscopy sentence per type in house form (`Sections show an exophytic papilloma … / a papilloma with endophytic (inverted) growth of thick, ribbon-like epithelium with transmigrating neutrophils and intraepithelial microcysts … / an oncocytic papilloma with multilayered columnar oncocytic epithelium and intraepithelial mucous cysts …`). Dx `NASAL CAVITY, left, polypectomy - SINONASAL PAPILLOMA, INVERTED TYPE, no dysplasia`; with carcinoma `… INVERTED TYPE WITH HIGH GRADE DYSPLASIA / CARCINOMA IN SITU` and the malignancy handoff. Snippets: existing inverted follow-up kept; new `papilloma_molecular` (inverted and oncocytic: EGFR exon 20 / KRAS respectively, offered only as a comment, no result field), `papilloma_exophytic_hpv` (low-risk HPV association, no testing needed), `papilloma_margin_fragmented` (piecemeal excision — margin status cannot be assessed; clinical follow-up advised), `papilloma_carcinoma_handoff` (report the carcinoma on the head and neck synoptic template). Checks: carcinoma set with dysplasia None → error; oncocytic type with the inverted follow-up snippet → warn (use oncocytic follow-up wording).
Untouched:  inflammatory polyp, fungal, granuloma and lymphoma paths; existing sinonasal fixtures except the papilloma example, which is re-captured with a reason.
Accept:     tests: inverted with high grade dysplasia prints the house sentence and dx; oncocytic case suggests the KRAS comment and not the EGFR one; carcinoma in situ appends the handoff snippet; fragmented excision adds the margin caveat; inflammatory polyp example unchanged byte-for-byte.
Verify:     tests + example load in the browser
Ship:       with batch
Spec:       `docs/specs/sinonasal-papilloma.md`

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

### Frozen section scenarios (unstaged)                  Size: L → split; three cards, one batch
Why:        the frozen template covers generic margin / node / parathyroid / ovary / nodule; the recurring services — breast sentinel nodes, bile duct and pancreatic duct margins, head-and-neck named margins — need their own fields, phone-line wording and paraffin correlation. Past sign-outs supply house wording (`docs/reference/frozen-section-examples.md`, 10 scenarios with session references). Frozen specimens whose final report carries AJCC staging (lung wedge, and the resections the SLN / duct-margin results feed into) are planned as paired cards below, after the "Frozen → staged final" engine card.
Split into:
  (a) Breast sentinel lymph nodes (S): side, node labels, nodes found, fat stripped, macro / micro / ITC / deferred, metastasis size, post-neoadjuvant treatment effect; dx `LYMPH NODES, left SLN 1, excision x frozen section - NO EVIDENCE OF MALIGNANCY (0/2)`; node-arithmetic and size Checks. Emits a structured `nodeSummary` (examined / positive / largest focus / ENE) for the breast synoptic to consume.
  (b) Bile duct and pancreatic duct margins (S): CBD / CHD / pancreatic neck, ring or shave, en face; negative / invasive / BilIN-3 or PanIN-3 / denuded cannot-assess; stent-atypia and peribiliary-gland caveats. Emits `marginSummary` for the pancreas / bile duct synoptics.
  (e) Named-margin presets and line form (S): oral tongue 5 / 6, oropharynx 7, nasal ala Rm A–D + deep, maxillectomy custom; grouped `(A)-(G) Negative for malignancy.`; diagnosis joiner ` x frozen section - ` (deliberate fixture change, logged).
Untouched:  frozen–paraffin correlation model, LIS override, existing scenario wording except the joiner in (e); all other templates.
Accept:     per-card fixtures reproduce the quoted house lines (SLN §2, bile duct §4, tongue §6, nasal ala §5 of the examples file); template still one entry ("Frozen") in the Resections row.
Verify:     tests + browser (light)
Ship:       one batch, one publish
Spec:       `docs/specs/frozen-section-scenarios.md`

### Gastric carcinoma resection (synoptic)              Size: L → split before building
Why:        highest-volume cancer resection after colon.
Split into: (a) save QMH page + importer draft + `src/staging/gastric.js` rules with boundary tests (M); (b) schema + generator + synoptic block + Checks (M); (c) fixtures against the QMH page element order + docs (S).
Spec:       `docs/specs/synoptic-next-templates.md`

### Linked synoptic part (Stage / Upgrade this part)      Size: M
Why:        some frozen specimens are the staging specimen — a lung wedge that turns out to be carcinoma is staged on the wedge and a later completion lobectomy adds nodes and residual-tumour findings; SLN frozen results feed pN in the breast resection; duct-margin frozens feed margin status in the pancreas / bile duct synoptics. Today the frozen template ends at the paraffin correlation and has no staging block, and a later specimen cannot reference an earlier one.
Change:     (1) **Stage this part** on a frozen part whose paraffin result is malignant: adds a linked synoptic part with the same letter (e.g. B → B, "staging") using the paired cancer template, pre-filled from the frozen fields (laterality / lobe / site, tumour size, distance to margin, pleural involvement, node counts); the final report prints SPECIMENS, INTRAOPERATIVE CONSULTATION, MACRO, BLOCK KEY, MICROSCOPIC EXAMINATION (paraffin confirms …), SYNOPTIC REPORT, DIAGNOSIS, COMMENT, with one diagnosis line per letter carrying both the frozen suffix and the stage: `(B) LUNG, left lower lobe, wedge excision x frozen section - ADENOCARCINOMA, acinar predominant, 0.8 cm; parenchymal margin clear; pT1a pNX (AJCC 8th edition)`. (2) **Related prior specimen** case fields (accession, date, procedure, pT / pN / tumour type / size; optional one-Sheet-read lookup by accession from `Sign-out cases`) so a completion or definitive resection reports residual tumour and nodes and prints a combined stage line — `Pathological stage: pT1a (prior wedge resection S26-01234) pN0 (0/8, this lobectomy)` — with an auto comment: "Staging is based on the prior wedge resection (S26-01234) together with the lymph nodes from this completion lobectomy" (wording proposed; confirm). (3) Staging module accepts partial input (`pT` from prior, `pN` from current) and marks the origin of each category. (4) The same mechanism serves benign resections: **Upgrade this part** on a benign template whose `neoplasia` field is set to a carcinoma / neoplasm option adds the paired cancer synoptic under the same letter, carrying macro, block key and shared fields (size, margins, node) — first consumers appendix and gallbladder below; this absorbs the Later "Upgrade part" line.
Untouched:  existing frozen scenarios and fixtures; colon and GIST synoptics; save / open flow (the lookup is read-only).
Accept:     unit tests for pre-fill mapping, combined-stage assembly and origin tags; a wedge → lobectomy fixture pair; browser: Stage this part appears only when the paraffin result is malignant and a paired template exists.
Verify:     tests + browser (light)
Ship:       with the Lung pair below (the first consumer); the Upgrade path ships with the Appendix pair
Depends on: Frozen section scenarios (unstaged); pairs consume it
Spec:       `docs/specs/frozen-section-scenarios.md` (section "Staged frozen specimens")

### Lung pair — wedge frozen + lung carcinoma synoptic    Size: L → split; build as one batch
Why:        the user's worked example — staged wedge resections followed by completion lobectomy. Needs the frozen lung scenario and the QMH lung page together.
Source:     https://awiloqmh.github.io/CancerReportingTemplate/Thorax-Lung.html (JS-rendered; save as `docs/reference/Thorax-Lung.html`, run `tools/import-qmh.js`).
Split into:
  (a) Frozen lung wedge scenario (M): staple line trimmed, parenchymal margin inked, nodule size and distance, pleura; adenocarcinoma and variants, SCC, NSCC-NOS deferred, small cell, carcinoid, metastatic (primary named), necrotising / non-necrotising granulomatous inflammation, organising pneumonia, benign; margin Checks; subtype-on-paraffin snippets. House wording §10 of the examples file.
  (b) `src/staging/lung.js` (M): AJCC 8th pT by invasive size (1 / 2 / 3 / 4 / 5 / 7 cm cut-offs, T1mi, AIS Tis), pleural invasion (PL1–2 → T2, PL3 → T3), separate nodules same lobe (T3) / different ipsilateral lobe (T4), main bronchus / atelectasis rules, pN by station, pM1a / b / c; stage groups; boundary tests. Lepidic-only size excluded from invasive size with a Check.
  (c) Lung carcinoma resection schema + generator (L): CAP lung elements in the QMH printed order — procedure (wedge / segmentectomy / lobectomy / bilobectomy / pneumonectomy / completion lobectomy), site, size (total and invasive), histologic type WHO 5th with adenocarcinoma predominant pattern and percentages, grade (IASLC three-tier for non-mucinous adenocarcinoma), visceral pleura (PL0–3), STAS, LVI, margins (bronchial / vascular / parenchymal / pleural with distance), treatment effect, nodes by station with N1 / N2 split, pTNM + stage, ancillary (PD-L1, molecular requested); Checks; Related prior specimen support for completion lobectomy (residual tumour none / present, combined stage line).
  (d) Fixtures + docs (S): element order asserted against the saved page; wedge-staged fixture, completion-lobectomy fixture with prior accession, lobectomy-primary fixture; README; card → Done.
Untouched:  colon / GIST synoptics; frozen scenarios other than lung.
Accept:     wedge frozen → Stage this part → synoptic prints pT with stage and the combined diagnosis line; completion lobectomy prints residual tumour, node counts and the combined stage line referencing the prior accession; boundary tests all pass.
Verify:     tests + browser (light)
Ship:       one batch with the engine card, one publish
Depends on: Frozen → staged final

### Breast pair — SLN frozen + breast carcinoma synoptic   Size: L → split; build as one batch
Why:        SLN frozen results (card (a) above) feed pN; the breast biomarker block already exists in the breast core template and is reused.
Source:     https://awiloqmh.github.io/CancerReportingTemplate/BREAST-Cancers.html and BREAST-DCIS.html (save both; importer).
Split into:  (a) `src/staging/breast.js` — pT by invasive size (T1mi / a / b / c, T2, T3, T4a–d), pN with ITC / micro / macro, ENE, N1mi, post-neoadjuvant yp, pM; anatomic stage groups (prognostic stage as a Later add); boundary tests (M). (b) schema + generator — invasive type, Nottingham grade with score arithmetic Check, size, DCIS extent and grade, LVI, margins per face with distance (reuse the breast excision margin walker), nodes (consumes `nodeSummary` from the SLN part or a Related prior SLN accession), treatment effect (RCB inputs), biomarkers via the existing block (L). (c) fixtures against the QMH order + docs (S).
Untouched:  breast core template and its biomarker block; breast benign excision.
Accept:     same-case SLN part fills pN automatically; prior-accession SLN fills pN with origin tag; Nottingham arithmetic Check fires on mismatched score.
Verify:     tests + browser (light)
Ship:       one batch, one publish
Depends on: Frozen → staged final; Frozen section scenarios (a)

### Appendix pair — appendicectomy + appendix cancer synoptic   Size: L → split; build as one batch
Why:        appendiceal neoplasms are found incidentally in appendicectomies reported on the benign template; its `neoplasia` field currently ends in "- see comment" with a placeholder snippet. The QMH appendix page gives the CAP element set.
Source:     https://awiloqmh.github.io/CancerReportingTemplate/GI-Appendix.html (JS-rendered; save as `docs/reference/GI-Appendix.html`, run `tools/import-qmh.js`). Neuroendocrine tumours use the separate `Endocrine-Appendix-NET.html` page (own card in Later).
Split into:
  (a) `src/staging/appendix.js` (M): AJCC 8th appendix carcinoma — pTis(LAMN) confined to muscularis propria (acellular mucin rules), pT3 into subserosa / mesoappendix, pT4a serosal or acellular mucin on serosa, pT4b adjacent organs; pN1a / 1b / 1c (tumour deposits), pM1a (intraperitoneal acellular mucin) / 1b (intraperitoneal cellular) / 1c (extraperitoneal); stage groups with the grade split (G1 vs G2–3) for stage IVA / IVB; boundary tests. Goblet cell adenocarcinoma staged as carcinoma with its three-tier grade.
  (b) Schema + generator (M): elements in the QMH printed order — procedure (appendicectomy / right hemicolectomy / other), tumour site, size, histologic type (LAMN / HAMN / mucinous adenocarcinoma / adenocarcinoma NOS / goblet cell adenocarcinoma / signet-ring cell / other), grade (three-tier for mucinous with signet-ring rules; goblet cell Tang / WHO grade), extent including acellular vs cellular mucin location, perforation, margins (proximal / mesenteric / radial), LVI / PNI, nodes and deposits, treatment effect, pTNM + stage, MMR / molecular hook; Checks (mucin location vs pT, LAMN with invasive features → HAMN / carcinoma prompt, perforation wording). Upgrade this part from the appendicectomy template carries serosa, perforation, mesoappendix, margins and block key.
  (c) Fixtures + docs (S): element order against the saved page; LAMN pTis(LAMN) fixture, LAMN with acellular mucin on serosa (pT4a, pM1a) fixture, goblet cell adenocarcinoma fixture, upgrade fixture from a benign appendicectomy; README; card → Done. Benign appendix fixtures unchanged; the `neoplasm_template` snippet retired in favour of the upgrade.
Untouched:  benign appendicectomy wording; colon synoptic; staging API.
Accept:     benign template → Upgrade this part → synoptic prefilled and stage derived; boundary tests pass; palette shows "Appendix · cancer resection" under GI.
Verify:     tests + browser (light)
Ship:       one batch, one publish
Depends on: Linked synoptic part

### Gallbladder pair — cholecystectomy + gallbladder cancer synoptic   Size: M → split; build as one batch
Why:        gallbladder carcinoma is mostly incidental on cholecystectomy; the benign template's `neoplasia` field ("Adenocarcinoma – see comment", "High grade dysplasia (BilIN-3)", ICPN) has no staging follow-through.
Source:     https://awiloqmh.github.io/CancerReportingTemplate/GI-Gallbladder.html (JS-rendered; save as `docs/reference/GI-Gallbladder.html`, run `tools/import-qmh.js`).
Split into:
  (a) `src/staging/gallbladder.js` (S): AJCC 8th — pTis, pT1a lamina propria / pT1b muscular, pT2a peritoneal side / pT2b hepatic side, pT3 serosa or liver or one adjacent organ, pT4 portal vein / hepatic artery / two or more organs; pN1 (1–3) / pN2 (≥ 4); stage groups; boundary tests including the T2a / T2b side rule.
  (b) Schema + generator (M): QMH order — procedure (simple / extended cholecystectomy with liver bed / with bile duct), tumour site (fundus / body / neck / cystic duct; hepatic vs peritoneal side), size, histologic type (adenocarcinoma NOS, biliary / intestinal / mucinous / signet-ring / adenosquamous / squamous / undifferentiated; ICPN with associated invasive carcinoma), grade, extent, LVI / PNI, margins (cystic duct, liver bed, other with distances), cystic duct node and other nodes, associated lesions (BilIN, ICPN, stones, chronic cholecystitis), pTNM + stage, Checks (hepatic-side pT2b needs liver bed margin; cystic duct margin involved → advise re-resection comment; incidental finding statement). Upgrade this part from the cholecystectomy template carries received state, stones, mucosa, cystic node and margin.
  (c) Fixtures + docs (S): element order against the saved page; incidental pT1b fixture, pT2b hepatic-side fixture with cystic node, upgrade fixture from a benign cholecystectomy; README; card → Done. Benign gallbladder fixtures unchanged; `gallbladder_cancer_template` snippet retired.
Untouched:  benign cholecystectomy wording; bile duct synoptics stay in the Later pancreatobiliary pair.
Accept:     benign template → Upgrade this part → synoptic prefilled and stage derived; T2a / T2b boundary tests pass; palette shows "Gallbladder · cancer resection" under Hepatobiliary.
Verify:     tests + browser (light)
Ship:       one batch, one publish
Depends on: Linked synoptic part

---

## Later

One line each; card them before building.

- Synoptic templates after stomach and the lung / breast pairs: prostate (radical) with Gleason arithmetic validation. (`docs/specs/synoptic-next-templates.md`; endometrium carded in Next)
- Appendix NET (`Endocrine-Appendix-NET.html`) and other GI NET pages (stomach, duodenum / ampulla, jejunum–ileum, colon, pancreas) as a NET family sharing one staging module and the WHO grade (Ki-67 / mitotic) Check.
- Pancreatobiliary pair: duct-margin frozen (Frozen section scenarios (b)) + Pancreas (`GI-Pancreas.html`), distal extrahepatic and perihilar bile duct synoptics (`GI-Distal Extrahepatic bile ducts.html`, `GI-Perhilar bile ducts.html`); frozen `marginSummary` feeds margin status; card after the lung pair proves the pattern.
- Head-and-neck pair: named-margin presets (Frozen section scenarios (e)) + Lip and oral cavity synoptic (`HN-Lip and oral cavity.html`; DOI, WPOI, margins from the frozen parts) and nasal cavity / sinuses.
- CNS pair: frozen / smear CNS scenario (meningioma, gliomas, metastasis, favour lymphoma, PitNET, reactive gliosis — proposed wording, no house example) + `CNS-Meningioma.html` and `CNS-Common_gliomas_and_ependymomas.html` (WHO CNS5 grade and integrated molecular diagnosis rather than AJCC staging).
- Templates beyond the QMH list (each a card before building; sources are CAP / WHO / ISHLT / Banff / Bethesda, not the QMH site):
  - Reference images for scoring components (M, engine; build with the first medical-biopsy template): each scored option (Banff i0–i3, t, v, g, ptc, cg, ci / ct, ah; MEST-C M / E / S / T / C; Ishak stages; NAS steatosis / ballooning / inflammation; ISHLT 0R–3R) carries an optional `refImages` list; the field shows a small image icon that opens a side panel with the photomicrograph, the scoring definition and the licence line, so the score can be checked against a picture at the moment of reporting. Two image sources: (1) the user's own photomicrographs uploaded to a Drive folder `Sign-out reference images/<template>/<field>/<option>.jpg` (PHI-free, no licence needed; app lists the folder on sign-in and caches thumbnails); (2) openly licensed images (CC BY / CC BY-SA / CC0 — Wikimedia Commons, open-access CC BY papers, PEIR / other CC atlases) shipped in `public/ref/` with `public/ref/credits.json` (author, source, licence, URL) printed under each image; (3) ExpertPath (`app.expertpath.com`, subscription; login saved in the user's browser) — images picked case by case in the user's browser session and saved into the same Drive folder as source (1), never into the app bundle, credited "ExpertPath, © [author / year], personal reference use"; subject to the ExpertPath terms of use, which are checked and recorded in the spec before the first image is saved; no bulk download. Never AI-generated histology; no image without a credit line; images are never written into the report. Fixtures assert every `refImages` entry resolves to a file or Drive path and has a credit.
  - Medical biopsies with scoring systems (L each; each includes sourcing its reference images per component, with gaps left for the user's own photos): renal biopsy (Banff 2022 for transplant; Oxford MEST-C for IgA; ISN/RPS for lupus; glomerular / tubulointerstitial / vascular compartments with light, IF and EM blocks in one report), liver biopsy (Ishak and METAVIR fibrosis / activity, NAFLD activity score, transplant RAI, iron and copper stain hooks), heart transplant biopsy (ISHLT ACR grade, pAMR). Scores are entered as components and the grade derived with arithmetic Checks, the same pattern as staging.
  - Lymph node for lymphoma (L): WHO-HAEM5 diagnosis with an IHC panel table (marker / result / pattern), flow-cytometry correlation sentence, clonality and FISH hooks; house style keeps microscopy and IHC in one paragraph with the table only in the synoptic block.
  - Inflammatory dermatoses (M): pattern-based (spongiotic, psoriasiform, lichenoid / interface, vasculopathic, granulomatous, bullous, panniculitis) with level and depth, DIF hooks and a clinicopathological-correlation comment; extends the skin small lesions template.
- Frozen section: time received / slides dispatched fields (only if wanted in the report rather than the LIS log).
- Frozen section: discordance summary across cases (needs a Sheet query).
- Settings → Templates: per-user hide / show toggles; pins and recents synced through Drive.
- Snippet library editable as Markdown; favourites and recently used.
- Case queue joined to the TAT priority Sheet (due dates in the Open dialog).
- Analytics over `Sign-out cases`: H. pylori rate, adenoma detection, Grade Group distribution, IM prevalence.
- Perplexity workflows over Drive: rewrite a draft Doc in house style, weekly signed-case summary (the synoptic-vs-CAP check is folded into the review card below).

### Perplexity report review with readiness score       Size: L → carded early; build near the end
Why:        once drafted, the final report should get an independent read before signing — every element present, macro / micro / synoptic / diagnosis not contradicting each other, staging appropriate, wording in house style — with a score that says whether it is fit to sign. Wait until most templates are populated and the Doc / Sheet layout is stable.
Change:     Perplexity reads the saved case (Sheet `case_json` + Doc text) and runs seven checks — completeness, macro ↔ micro ↔ synoptic reconciliation, staging re-derivation via the app's own staging module (`node tools/restage.js`), diagnosis line ↔ body, ancillary follow-through, house style, redrafts that change structure not words — and writes a review Doc (`<accession> — review`: score, band, findings with quoted sentence and fix, reconciliation table) plus Sheet columns `review_score / review_band / review_at / review_url`; the app shows the badge in the Open dialog and beside Open Doc. Readiness score 0–100 with bands Ready to sign ≥ 90 / Minor edits / Reconcile before signing / Not ready, blocking findings cap the score at 49; rubric versioned in the spec. Triggers: on demand ("review S26-01234" or a Review with Perplexity button that opens a prefilled thread) and an optional evening sweep of `ready` cases.
Untouched:  case Doc content (review never edits it; changes are applied in the app so they save with the case); PHI guard.
Accept:     rubric run over 20 signed cases with weights adjusted before bands are shown; a seeded inconsistent case (macro 4.5 cm vs synoptic 2.5 cm; pT2 printed with 6 cm) is caught as blocking; a clean case scores ≥ 90; review Doc and Sheet columns written without altering existing columns.
Verify:     tests for `tools/restage.js` and the Sheet-column append; three real cases reviewed by hand against the output
Ship:       one publish for the badge; the review itself is a Perplexity workflow, not app code
Depends on: most templates populated; staging modules for the templates in scope; Sheet layout frozen
Spec:       `docs/specs/report-review.md`

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
