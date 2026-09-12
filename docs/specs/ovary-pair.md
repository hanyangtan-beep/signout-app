# Ovary pair — ovarian tumour frozen section + ovary / fallopian tube / peritoneum synoptic

Brief for the "Ovary pair" card in `docs/roadmap.md` (Next). Planned 2026-09-12 at the user's request; not yet pulled into Now. Follows the pair pattern in `frozen-section-scenarios.md` § "Staged frozen specimens (pairs)": the frozen part carries the intraoperative category, the synoptic part carries the definitive classification and stage, and the linked-part engine ("Stage this part") pre-fills one from the other.

Staging rule, fixed by the user 2026-09-12: **FIGO stage is Checks-only, never printed** (same as endometrium). The "most recent" FIGO staging for ovary, fallopian tube and peritoneum is the 2014 classification; the FIGO Cancer Report 2025 reproduces it unchanged (Renz M, Friedlander M, Berek JS. Cancer of the ovary, fallopian tube, and peritoneum: 2025 update. Int J Gynecol Obstet 2025;171(Suppl 1):6-35. doi:10.1002/ijgo.70282, PMC12411830). AJCC 8th pTNM prints only with the existing `printPTNM` case option, exactly as the endometrial template does.

## Sources

- QMH page: `https://awiloqmh.github.io/CancerReportingTemplate/GYN-Ovary.html`, "Primary tumors of the ovary, fallopian tube and peritoneum", last updated 14-Aug-2024, based on CAP Ovary, Fallopian Tube, or Peritoneum 1.5.0.0 (Jun 2023). Saved as `docs/reference/GYN-Ovary.html` (docs-only commit, 2026-09-12). `tools/import-qmh.js` mangles this page's labels (nested fieldsets); the element order below was taken from a text dump and is the order to assert in tests. CAP lists a Jun-2024 release of the same protocol; check the version number and note any element differences in this spec when the card is pulled.
- FIGO 2014 = FIGO Cancer Report 2025 Table (above). TNM equivalents printed in the same table: IA T1a, IB T1b, IC1–3 T1c1–3, IIA T2a, IIB T2b, IIIA1 T1/T2 N1, IIIA2 T3a2 N0/N1, IIIB T3b, IIIC T3c, IVB any T any N M1.
- AJCC Cancer Staging Manual 8th ed., chapter 55 (ovary, fallopian tube and primary peritoneal carcinoma): pN0(i+) ≤ 0.2 mm, pN1a ≤ 10 mm, pN1b > 10 mm, pM1a pleural effusion with positive cytology, pM1b parenchymal / extra-abdominal.
- WHO Classification of Female Genital Tumours, 5th ed. (2020): histotypes, borderline tumour terminology (micropapillary variant, microinvasion ≤ 5 mm, intraepithelial carcinoma), implants (non-invasive epithelial / desmoplastic; invasive implants = low-grade serous carcinoma), primary-site assignment for HGSC (tubal when STIC or tubal mucosal HGSC; ovarian when tubes free and examined entirely; tubo-ovarian when both involved and no STIC; peritoneal only when tubes and ovaries are grossly normal and microscopically free or minimally involved).
- Frozen section: no house example in `docs/reference/frozen-section-examples.md` — wording below is proposed (same status as the CNS scenario) and needs the user's confirmation on first fixture. Practice references for the category set and caveats: ISGyP / BAGP frozen-section practice (benign / borderline / malignant, "at least borderline", mucinous caveat, deferral), to be cited by DOI in this file when built.

## Part 1 — Frozen: ovarian / adnexal mass scenario (enrich, do not fork)

Keep the single `frozen_section` template; the existing scenario "Ovarian / adnexal mass" gains fields. Existing fixtures (Benign / Borderline / Malignant / Deferred with free `tumourType`) stay byte-identical when the new fields are unset.

Fields (group "Ovarian / adnexal mass", `showIf scenario = Ovarian / adnexal mass`):

- `ovSide` select: Right / Left / Bilateral (two parts is the normal LIS pattern; Bilateral only when one container).
- `ovSpecimen` select: Salpingo-oophorectomy / Oophorectomy / Ovarian cystectomy / Biopsy of ovarian mass / Adnexal mass, NOS.
- `ovReceived` select: Intact / Ruptured, capsule defect present on receipt / Fragmented (cystectomy or morcellated) / Opened by surgeon. Drives specimen integrity in the synoptic and the IC1 vs IC2 Check (rupture on receipt is not by itself "capsule ruptured before surgery" — the operative note decides; the Check says so).
- `ovSizeMm` number, `ovWeightG` number (optional).
- `ovSurface` select: Smooth / Excrescences or papillary projections / Adhesions / Not assessable.
- `ovCut` multiselect: Unilocular cyst / Multilocular cyst / Serous fluid / Mucinous contents / Sebaceous material and hair / Chocolate-brown fluid / Solid areas / Papillary excrescences (inner surface) / Necrosis / Haemorrhage / Torsion (haemorrhagic infarction).
- `ovBlocks` number: frozen blocks (default 1; macro sentence "Representative sections of the solid and papillary areas are embedded in N frozen blocks and subsequently converted to paraffin blocks." replaces the generic handling sentence when N ≥ 1).
- `ovaryResult` (existing) options become: Benign / Non-neoplastic / Borderline / Borderline, at least (invasion cannot be excluded) / Malignant / Malignant, favour metastatic / Deferred. Existing four values keep their current wording.
- `ovType` select (replaces free `tumourType` for this scenario; `tumourType` stays as "Other, specify"): serous cystadenoma or adenofibroma; mucinous cystadenoma; mature cystic teratoma; endometriotic cyst; follicular or corpus luteum cyst; fibroma / thecoma; Brenner tumour; struma ovarii; serous borderline tumour; mucinous borderline tumour; seromucinous borderline tumour; high-grade serous carcinoma; low-grade serous carcinoma; endometrioid carcinoma; clear cell carcinoma; mucinous carcinoma; carcinosarcoma; adult granulosa cell tumour; dysgerminoma; yolk sac tumour; immature teratoma; metastatic adenocarcinoma, favour gastrointestinal / appendiceal; metastatic carcinoma, primary not determined; lymphoma, favour; other (specify).
- `ovCaveat` multiselect (auto-ticked by rules, editable): Mucinous — heterogeneity and metastasis caveat; Borderline — invasion cannot be excluded on frozen; Necrotic / autolysed — limited assessment; Frozen artefact — deferred.

Wording (proposed, no house example):

- Intraoperative line: `(A) Benign; mucinous cystadenoma.` / `(A) Borderline tumour, serous type; no stromal invasion in the sections examined.` / `(A) At least borderline mucinous tumour; an invasive component cannot be excluded on frozen section.` / `(A) Malignant; high-grade carcinoma, favour high-grade serous carcinoma.` / `(A) Malignant; adenocarcinoma, favour metastatic from a gastrointestinal primary.` / `(A) Deferred to paraffin sections.`
- Mucinous caveat sentence (appended to the intraoperative block when `ovType` is mucinous or `ovCaveat` ticked): "Mucinous tumours are heterogeneous; the frozen section cannot exclude a higher-grade or invasive component, or a metastasis from a gastrointestinal primary. Final classification awaits paraffin sections."
- Phone line and paraffin correlation: unchanged (`The frozen section diagnosis was phone reported at HHMM on DD/MM/YYYY to Dr X.`; `(A) The paraffin section confirms the frozen section diagnosis. It shows …`; discordant / deferred variants as today).
- Diagnosis line: `(A) OVARY, right, salpingo-oophorectomy x frozen section - MUCINOUS CYSTADENOMA` / `… - SEROUS BORDERLINE TUMOUR` / `… - HIGH-GRADE SEROUS CARCINOMA, see synoptic report` once a linked synoptic part exists (the synoptic part then carries the definitive line; only one diagnosis line per letter).

Checks: mucinous or Brenner or teratoma with `ovaryResult` Malignant → info "consider metastasis; the linked synoptic asks for the primary-site assignment"; `ovReceived` Ruptured with Malignant / Borderline → info "IC1 (surgical spill) vs IC2 (rupture before surgery) is decided by the operative note; the synoptic asks"; `ovBlocks` > 3 → info; Deferred with no `ovCaveat` → warn "state the reason for deferral".

Emits for the engine: `ovSummary = { side, specimen, received, sizeMm, surface, result, type }` → synoptic pre-fill map below.

## Part 2 — `src/staging/ovary.js`

Pure module, same shape as `src/staging/endometrium.js`. Input (all optional, taken from the synoptic values):

- `sites`: set from Tumour site (right ovary, left ovary, right tube, left tube, tubo-ovarian variants, primary peritoneum).
- `capsule`: intact / ruptured before surgery / surgical spill / cannot be determined; `surface`: ovarian or tubal surface involvement present.
- `washings`: malignant / negative / atypical / not submitted.
- `pelvic`: none / uterus-tubes-ovaries implants or extension (IIA) / other pelvic intraperitoneal tissue (IIB).
- `extrapelvic`: none / microscopic / macroscopic ≤ 20 mm / macroscopic > 20 mm; `liverSpleenCapsule` boolean.
- `nodes`: examined, positive, largestDepositMm, itcOnly.
- `distant`: none / pleural effusion positive / parenchymal liver or spleen / extra-abdominal organ / inguinal or extra-abdominal nodes / transmural bowel.
- `primaryPeritoneal` boolean (Tumour site = Primary peritoneum).

Output:

- `pT`: T1a (one ovary or tube, capsule intact, no surface, washings negative), T1b (both), T1c1 / T1c2 / T1c3, T2a, T2b, T3a2 (microscopic extrapelvic ± nodes), T3b, T3c (includes liver / spleen capsule); TX when the primary is unassessable; primary peritoneal carcinoma cannot be T1 (Check). Precedence: highest applicable; T1c sub-categories in order c3 > c2 > c1 only when nothing higher applies (surface involvement with pelvic extension is T2, not T1c2).
- `pN`: NX / N0 / N0(i+) (ITC ≤ 0.2 mm only) / N1a (largest deposit ≤ 10 mm) / N1b (> 10 mm). Extranodal extension recorded but does not change N.
- `pM`: M1a (pleural effusion with positive cytology) / M1b (parenchymal metastases, extra-abdominal organs, inguinal or extra-abdominal nodes, transmural bowel) / not applicable. Liver / spleen capsule only is T3c, not M1b (Check when both ticked).
- `figo2014(stage)`: I A/B/C1-3, IIA/IIB, IIIA1(i)/(ii) (positive retroperitoneal nodes only, no extrapelvic peritoneal disease — from T1/T2 N1), IIIA2, IIIB, IIIC, IVA, IVB. Shown as Checks info "FIGO 2014 (reference, not reported; FIGO Cancer Report 2025 reproduces the 2014 table): IIIA1(ii) - positive retroperitoneal lymph nodes only, largest deposit more than 10 mm". Never printed.
- `stageGroup` (AJCC 8th, mirrors FIGO) for the pTNM block only when `printPTNM` is on; the block prints `pT1c2 pN0 (0/14) pM not applicable (AJCC 8th edition)` in the existing house form.

Boundary tests: deposit exactly 10 mm (N1a); peritoneal focus exactly 20 mm (IIIB); positive washings with IIB disease (stays IIB, washings noted); nodes positive with microscopic extrapelvic disease (IIIA2 not IIIA1); liver capsule (IIIC) vs liver parenchyma (IVB); bilateral tubo-ovarian with intact capsules and no surface (IB); primary peritoneal with only pelvic disease (IIB, no T1); ITC-only nodes (N0(i+), stage from T).

## Part 3 — Synoptic schema `ovary_ft_peritoneum` + generator

Kind synoptic cancer resection (rank after endometrial carcinoma). Element order follows the QMH page exactly; headings in the house synoptic style (leading `-` bullets, sentence-case headings, `synoptic-layout.md`). QMH order:

Gross: Procedure (multiselect, QMH list incl. omentectomy, peritoneal biopsies, debulking, washing, pleurocentesis) → Hysterectomy type (showIf hysterectomy) → Specimen integrity per organ (right ovary, left ovary, right tube, left tube: Intact / Capsule ruptured / Fragmented / Not applicable / Cannot be determined) → Morcellated specimen (organ) → Tumour site (QMH list incl. tubo-ovarian variants and Primary peritoneum) → Ovarian surface involvement (Not identified / Present / Cannot be determined) → Fallopian tube surface involvement → Tumour size (greatest dimension mm per involved site; "Cannot be determined").

Micro: Histologic type (WHO 5th list as printed on the page; the two typos "carcinomaa" / "carcinomae" corrected; "Malignant Brenner tumour"; mixed types with percentages) → Histologic grade, one system per type with the others hidden: WHO G1–G3/GX (generic), FIGO grade 1–3 (endometrioid; reuse the endometrium `solidPct` logic and nuclear-atypia upgrade rule), Silverberg 1–3 (mucinous, optional), growth-pattern grade low / high (mucinous: expansile vs > 10 % infiltrative), 2-tier / 3-tier (immature teratoma), "Not applicable — high grade by definition" (HGSC, clear cell, carcinosarcoma, undifferentiated, SCCHT), "Not applicable" (borderline, sex cord-stromal other than SLCT) → Lymphovascular invasion → Perineural invasion (+, hidden by default) → p53 IHC (+; wild type / abnormal overexpression / null / cytoplasmic / subclonal; prints in the microscopy-IHC paragraph, house one-paragraph rule) → Implants (borderline serous / seromucinous only: Not applicable / Not sampled / Not identified / Present, non-invasive epithelial / Present, non-invasive desmoplastic / Indeterminate; "invasive implant" is not an option — reclassify as LGSC with a Check) → Largest extrapelvic peritoneal focus (Microscopic / Macroscopic ≤ 2 cm / Macroscopic > 2 cm / Cannot be determined) → Peritoneal / ascitic fluid (QMH list) → Pleural fluid (+) → Chemotherapy Response Score (HGSC after neoadjuvant chemotherapy: No known presurgical therapy / CRS1 / CRS2 / CRS3 / Cannot be determined; scored on omentum, site field) → Other tissue / organ involvement (QMH list incl. omentum, bladder / rectal wall vs mucosa, parametrium sides, pelvic wall, vagina; each entry may carry a part letter so the per-letter diagnosis lines print) → Margins (hysterectomy only: vaginal cuff, parametrial) → Regional lymph nodes (examined; with metastasis > 10 mm; ≤ 10 mm; ITC only; largest deposit mm and site; largest involved node mm and site; extranodal extension) → Distant metastasis (QMH list) → FIGO stage: **Checks-only** → pTNM AJCC 8th (printed only with `printPTNM`; derived, with the existing override field) → Additional findings (STIC, endometriosis, endosalpingiosis, other) → Ancillary (BRCA1/2 germline or tumour testing requested / HRD / MMR IHC / POLE — requested / pending / result; QMH prints this as a note) → Additional notes.

Extra fields not on the QMH page (needed for the diagnosis line and the primary-site rule, house additions flagged in the spec): `primarySite` select — Ovary / Fallopian tube / Tubo-ovarian / Peritoneum / Undesignated, with a derived suggestion from Tumour site + STIC + tubal mucosal involvement (WHO 5th rule above) and a Check when the pick disagrees; `neoadjuvant` boolean (drives CRS visibility and the `y` prefix).

Generator `generators/ovary_ft_peritoneum.js`: SPECIMENS (per letter), MACRO (per letter, reusing `adnexaSentence` and the uterus generator's sided sizes for the hysterectomy part), BLOCK KEY, MICROSCOPIC EXAMINATION (one paragraph incl. p53 / WT1 / PAX8 / ER / PR / Napsin A / HNF1β lines the user enters in the IHC field), SYNOPTIC REPORT in the order above, DIAGNOSIS, COMMENT. Diagnosis lines, house form:

- `(A) OVARY AND FALLOPIAN TUBE, right, salpingo-oophorectomy - HIGH-GRADE SEROUS CARCINOMA, tubo-ovarian, 95 mm, ovarian surface involved; see synoptic report`
- `(B) OVARY AND FALLOPIAN TUBE, left, salpingo-oophorectomy - INVOLVED BY HIGH-GRADE SEROUS CARCINOMA`
- `(C) OMENTUM, omentectomy - METASTATIC HIGH-GRADE SEROUS CARCINOMA, largest deposit 35 mm`
- `(D) LYMPH NODES, right pelvic, dissection - METASTATIC CARCINOMA IN 2 OF 9 LYMPH NODES, largest deposit 12 mm`
- `(E) PERITONEUM, biopsies - NO EVIDENCE OF MALIGNANCY`
- `(F) UTERUS AND CERVIX, total hysterectomy - SEROSAL INVOLVEMENT BY HIGH-GRADE SEROUS CARCINOMA; no endometrial or cervical lesion`
- Borderline: `(A) OVARY, left, cystectomy - SEROUS BORDERLINE TUMOUR, 60 mm, capsule intact, no implants identified (peritoneal biopsies not submitted)`; FIGO for borderline tumours is derived for reference only (same Checks line) — the diagnosis never prints a stage.
- pTNM block only with `printPTNM`: `Pathological stage (AJCC 8th edition): pT3c pN1b pM not applicable`.

Checks (in addition to the staging module's): mucinous carcinoma → info "exclude metastasis (bilateral, < 10 cm, surface involvement, nodular / infiltrative pattern, signet ring cells favour metastasis); CK7 / CK20 / SATB2 / CDX2 / PAX8"; HGSC with STIC not recorded → info "state STIC status; primary-site assignment depends on it"; carcinosarcoma / HGSC with grade selected → err; implants Present with Histologic type not borderline serous / seromucinous → err; `washings` Malignant with borderline tumour → info "IC3 applies to borderline tumours only when malignant cells are stated; report as atypical, borderline tumour cells if that is what is seen"; CRS with no neoadjuvant flag → warn; nodes: positive > examined → err (existing arithmetic helper); deposit size > largest node size → err.

Cross-part behaviour: the synoptic lives on the primary tumour part; other parts (contralateral adnexa, uterus, omentum, peritoneal biopsies, nodes) are ordinary parts whose letter and organ are picked in "Other tissue / organ involvement", nodes and distant lists so their diagnosis lines are generated — no second synoptic. Washings / ascitic fluid: enter the result in the synoptic; if the fluid is a separate accession (cytology), enter "Malignant cells present (see C26-…)" free text — the existing cytology templates are not linked in this card.

Engine (Stage this part) pre-fill map, frozen → synoptic: `ovSide` + `ovSpecimen` → Procedure and Tumour site; `ovReceived` → Specimen integrity (that side) and the IC1 / IC2 prompt; `ovSizeMm` → Tumour size; `ovSurface` Excrescences → Ovarian surface involvement prompt (not auto-set); `ovType` → Histologic type (frozen favoured type pre-selected, editable); frozen result and paraffin correlation → INTRAOPERATIVE CONSULTATION block as today.

## Part 4 — Fixtures, tests, docs

Fixtures (`tests/fixtures/ovary/`): 01 HGSC right tubo-ovarian, capsule intact, washings positive, nodes 0/12 → T1c3 N0, FIGO IC3 in Checks; 02 HGSC bilateral with omentum > 2 cm and node deposit 12 mm, post-NACT CRS2 → ypT3c ypN1b, IIIC; 03 serous borderline with non-invasive implants, cystectomy → no stage printed, FIGO reference IIB in Checks (implants on pelvic peritoneum); 04 mucinous carcinoma, expansile, 180 mm, unilateral, capsule intact → T1a, IA, metastasis-exclusion info; 05 endometrioid carcinoma FIGO grade 2 arising in endometriosis, surface involvement → T1c2, IC2; 06 primary peritoneal HGSC with normal adnexa → T2b/T3x, IIB/IIIx per inputs and the "cannot be T1" Check; 07 frozen → synoptic pair (right SO frozen "malignant, favour HGSC" then linked synoptic) asserting the pre-fill and the single diagnosis line per letter. Element-order test against `docs/reference/GYN-Ovary.html` (text-dump order, since the importer fails on this page). Staging boundary tests as listed in Part 2. Golden byte-for-byte test as for endometrium. Existing frozen fixtures byte-identical.

Docs: this file gains the built wording, the CAP version check, the frozen-section practice citations by DOI, and a "Fixtures regenerated deliberately" log; README template count 44 → 45 (one new synoptic; the frozen template stays one entry); roadmap card → Done.

## Size and split

L → build as one batch with the engine card if it has not shipped, otherwise as the second consumer after the Lung pair. Split: (a) frozen scenario enrichment (S), (b) `src/staging/ovary.js` + boundary tests (M), (c) schema + generator (L), (d) fixtures + docs (S). One deploy + publish. Stop conditions: if the QMH page order and the current CAP release disagree, the QMH order is kept and the difference logged; no printable FIGO line in this card; no cytology-accession linking; no reference galleries (Later, same mechanism as endometrium — candidates: serous borderline vs LGSC, mucinous expansile vs infiltrative, HGSC vs endometrioid, clear cell patterns, implants).

## Open points for the user (confirm when pulling the card)

1. Frozen wording has no house example — the intraoperative lines above are proposals.
2. `primarySite` and `neoadjuvant` are house additions not on the QMH page; agree the diagnosis-line form (organ, side, procedure - TYPE, site assignment, size, surface; "see synoptic report").
3. Whether omentum / node / peritoneal-biopsy parts should print their own diagnosis lines (proposed yes, as above) or fold into one line under the primary letter.
