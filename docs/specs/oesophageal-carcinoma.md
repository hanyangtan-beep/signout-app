# Oesophageal carcinoma resection — Built (Phase 12)

Template `oesophageal_carcinoma` (kind `cancer resection`, system GI). Built 2026-09-12 against the
saved QMH GI page `docs/reference/GI-Esophagus.html`
(source: https://awiloqmh.github.io/CancerReportingTemplate/, Oesophageal carcinoma — CAP
Esophagus 4.2.0.1 (Jun 2022) core + optional elements, with the Japanese Classification of
Esophageal Cancer 12e (2024) SM / JES annotations on the same page).
Placeholder retired from `templates/planned.json` and the GI picker row.

## Decisions

- **Element order = the QMH page**, pinned by `tests/oesophageal.test.js` through
  `tools/import-qmh.js`. One deliberate exception, agreed template-wide: the
  `- Tumour histology:` summary paragraph prints directly after the grade (the page holds the
  prose block further down).
- **Staging** `src/staging/oesophagus.js`, AJCC 8th edition oesophagus chapter, wired through
  `deriveTNM(values, 'oesophagus')`:
  - **Two pathological tables.** Squamous cell carcinoma (plus basaloid / spindle cell /
    verrucous SCC, adenosquamous, neuroendocrine and undifferentiated carcinomas — the last
    two grade as G3 by definition) and adenocarcinoma (plus mixed adenocarcinoma-neuroendocrine
    types) stage on different tables in stage I / II. Grade feeds the table (G1 / G2 / G3 / GX);
    for pT3 N0 squamous cases the **tumour zone** also decides: lower oesophagus / EGJ / cardia
    any grade → IIA; upper or middle thoracic G1 → IIA, G2-3 or grade / zone unknown → IIB.
  - **One shared ypTNM table** after neoadjuvant therapy (`treatmentEffect` not "No known…"
    triggers the y descriptor): ypT0-2 N0 I; ypT3 N0 II; ypT0-2 N1 IIIA; ypT3 N1 / T0-3 N2 /
    T4a N0 IIIB; ypT4a N1-2 / NX, T4b N0-2, any N3 IVA; M1 IVB. Histology, grade and zone are
    ignored there, per AJCC 8e.
  - **pT from the tumour-extension pick-list**: T0 / Tis (HGD-CIS) / T1a (lamina propria,
    muscularis mucosae) / T1b (submucosa) / T2 / T3 (adventitia) / T4a (serosa [visceral
    peritoneum]; typed pleura, pericardium, azygos vein, diaphragm or peritoneum) / T4b (typed
    aorta, vertebral body or airway). Direct invasion typed without naming a structure resolves
    to TX with a Checks note (unrecognised detail defaults to T4b on the synonym matcher).
  - **pN bins** 1-2 N1, 3-6 N2, ≥7 N3; examined 0 / involved blank → NX with the same notes as
    the gastric protocol.
  - `M1_SITES` (non-regional lymph node, liver, other site) force stage IVB.
  - NETs (G1-3 well-differentiated) are not AJCC-staged on this chapter; the pick-list offers
    them and staging falls back without a group.
- **EGJ rule fields.** `Relationship of tumour to the oesophagogastric junction (EGJ)` and the
  tumour-centre distance mirror the WHO / AJCC EGJ rule verbatim from the page (midpoint
  entirely tubular vs distal + involving EGJ vs at EGJ vs ≤2 cm into the cardia); the synoptic
  prints the chosen wording with "(tumour centre N mm proximal / distal to the EGJ)" appended.
- **Submucosal invasion.** One `smDepth` select with combined thresholds (0.2 mm or less / more
  than 0.2 to 0.5 mm / more than 0.5 mm / exact depth / cannot be determined) plus `smExtent`
  (SM1-3, SM3 flagged as not applicable to endoscopic resections), both gated on
  `tumourExtension = submucosa`. The page carries different numeric cut-offs for SCC (0.2 mm)
  and adenocarcinoma (0.5 mm); the combined field labels the thresholds in the label text
  instead of splitting by histology.
- **Treatment effect + Mandard TRG.** The CAP 0-3 score options print verbatim (British
  spelling); the Mandard 1994 TRG select is `showIf`-gated on treatment being present and flows
  into the diagnosis as "…; Mandard TRG 3".
- **Margins.** Oesophagectomy / oesophagogastrectomy cases print Proximal / Distal (nine-option
  dysplasia-aware list) and Radial; endoscopic resections swap in the Mucosal / Deep margin
  pair, like the gastric HM / VM swap.
- **Macro parsing** reads oesophagus length, attached stomach / cardia cuff and tumour
  dimensions via the shared concept set with `near` anchors (`oesophag|esophag`,
  `stomach|gastric|cardia`).
- House name / diagnosis style: head "OESOPHAGUS, middle thoracic, oesophagectomy", "- " bullets,
  pTNM only with `printPTNM`, stamped (AJCC 8th edition), stage "(if cM0)" when pM is not
  recorded.
- **Histological detail (user-requested enrichment, house departures from the page).**
  - The `- Tumour histology:` paragraph gains a per-type morphology sentence after the opener
    (`generators/oesophageal_morphology.js`): grade-varying for SCC and adenocarcinoma (keratin
    pearls / intercellular bridges / gland development in desmoplastic stroma) and fixed
    sentences for basaloid, spindle cell and verrucous SCC, mucinous adenocarcinoma, signet-ring,
    adenosquamous, mucoepidermoid, adenoid cystic, undifferentiated, lymphoepithelioma-like, the
    neuroendocrine carcinomas, NETs and the mixed types. High-grade dysplasia / pT0 stay at the
    opener alone. Types with nothing truthful to say (Other / cannot be determined) skip the
    sentence rather than fabricate one. Mucinous adenocarcinoma and signet-ring (poorly cohesive)
    were added to the histologic-type list.
  - Structured extras after `trg`: tumour budding (ITBCC Bd1-3, `showIf` an adenocarcinoma
    type), retraction artefact, background Barrett mucosa (adds "arising in Barrett mucosa"
    to the diagnosis for adenocarcinoma), HER2 (IHC 0-3+ / ISH results), PD-L1 CPS, and MMR
    immunohistochemistry (retained / per-protein loss patterns). Recorded values print as
    items and combine into an "Immunohistochemistry: …" sentence inside the same paragraph
    (house style: microscopy and IHC in one paragraph).
  - The biopsy pair gains differentiation-graded sentences: `squamousDiff` and `adenocaDiff`
    selects (gated on the carcinoma options) turn the one-line cancer sentences into
    well / moderately / poorly differentiated variants; blank keeps the original sentence.

## Checks (validate())

Node census (examined required, involved required once examined > 0, involved ≤ examined);
extracapsular-spread audit on node-positive cases; margin-status requirements per procedure with
distance prompts; T4 adjacent-structures prompt naming the T4a / T4b set; CIS-with-nodes
caution; score-0-therapy-without-ypT0 caution; TRG prompt on treated cases; EGJ-relationship
prompt on distal / EGJ / cardia sites.

### Checks (added with the enrichment)

Budding recorded on a non-adenocarcinoma type; Barrett mucosa recorded on a non-adenocarcinoma
type.

## Tests

18 oesophagus-pinned tests (9 staging boundary / table tests in `tests/staging-oesophagus.test.js`,
9 wording-pinned generator tests in `tests/oesophageal.test.js`) plus 19 detail tests in
`tests/oesophageal-detail.test.js` covering the morphology table, structured fields, the IHC
sentence and biopsy differentiation. Suite: 797.
