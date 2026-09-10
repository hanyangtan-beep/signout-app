# Frozen section — scenario extensions

Brief for the "Frozen section scenarios" card cluster in `docs/roadmap.md`. All changes extend the existing `frozen_section` template (scenario pick-list, scenario-specific fields, per-scenario diagnosis and microscopy wording). Existing scenarios (Margin, Lymph node, Parathyroid, Ovarian / adnexal mass, Nodule / mass, Other) keep byte-identical output.

House wording is taken from `docs/reference/frozen-section-examples.md` (verbatim quotes from past sign-outs, with session references). Where no house example exists the wording is proposed and marked *proposed* — confirm at sign-out before the fixture is frozen.

## Shared conventions (already in the template, keep)

- Macro: `(A) Received in a fresh state is … All embedded in 1 frozen block and subsequently converted to paraffin block.` (house variants seen: "All embedded in N frozen blocks, subsequently processed to paraffin." — keep the current form).
- Intraoperative block: grouped lines `(A)&(B) Negative for malignancy.` then `The frozen section diagnosis was phone reported at HHMM on DD/MM/YYYY to Dr X.`
- Paraffin microscopy opener: `(A) The paraffin section confirms the frozen section diagnosis. It shows …`; discordant and deferred variants exist.
- Diagnosis line: `(A) ORGAN, site, excision x frozen section - RESULT` (the `x frozen section` form is what the LIS copies; the current generator prints `, frozen section -` — card (e) below aligns it).

## (a) Breast sentinel lymph nodes — Size S

House examples: `frozen-section-examples.md` §1–2 (two sessions, negative and positive nodes, node counts).

Fields (scenario "Sentinel lymph node"): side (left / right), node label (SLN 1, SLN 2 …, non-SLN 1; free text), specimen appearance (fibroadipose tissue with N lymph nodes / one lymph node), nodes identified (number), largest node (cm), fat stripped (checkbox, default on), blocks; result Negative / Macrometastasis (> 2 mm) / Micrometastasis (0.2–2 mm) / Isolated tumour cells (deferred to paraffin) / Deferred; metastasis size (mm); post-neoadjuvant (checkbox → treatment effect line on paraffin).

Wording:

- Macro: `(A) 'Left SLN 1, excision', received fresh is a piece of fibroadipose tissue measuring 5 x 3 x 1 cm. Two lymph nodes are identified within, measuring approximately 1 cm and 0.5 cm across. The fatty tissue is stripped off. All embedded in 3 frozen blocks and subsequently converted to paraffin blocks.`
- Intraop: `(A)&(B) Negative for malignancy.` / `(B) Metastatic carcinoma, larger than 2 mm.`
- Paraffin microscopy: `(A) The paraffin sections confirm the frozen section diagnosis. They show fibroadipose tissue and two reactive lymph nodes. There is no evidence of malignancy.`; positive: `… one lymph node involved by metastatic carcinoma; the largest metastatic focus measures 4.4 mm. Extranodal extension is not identified.`; post-neoadjuvant adds `Treatment effect is present.`
- Diagnosis: `(A) LYMPH NODES, left SLN 1, excision x frozen section - NO EVIDENCE OF MALIGNANCY (0/2)`; `(B) LYMPH NODE, left SLN 2, excision x frozen section - METASTATIC CARCINOMA (1/1), largest focus 4.4 mm`.
- Checks: nodes positive ≤ nodes identified; macrometastasis requires size > 2 mm; micrometastasis 0.2–2 mm; "No lymph node tissue identified" line when nodes = 0.
- Snippet: ITC / micrometastasis explanation (AJCC 8th), auto when result is micrometastasis or ITC.

Accept: fixtures reproduce §2 left SLN 1 / SLN 2 wording (macro, intraop, microscopy, dx with counts); positive fixture prints size and treatment effect; existing "Lymph node" scenario output unchanged.

## (b) Bile duct and pancreatic duct margins — Size S

House example: §4 (bile duct margin: `Bile duct margin, frozen section: No evidence of malignancy.`; fuller variant with `Benign biliary epithelium and fibromuscular wall.`). Pancreatic duct / pancreatic neck margin: no house example — *proposed*.

Fields (scenario "Duct margin"): margin (common bile duct / common hepatic duct / proximal bile duct / distal bile duct / pancreatic neck (duct) margin / other named); specimen form (ring / shave / cuff), size; en face (checkbox); result Negative / Positive (invasive carcinoma) / High-grade dysplasia (BilIN-3 / PanIN-3) / Low-grade dysplasia / Atypical epithelium, deferred / Denuded epithelium (cannot assess); epithelium present (checkbox).

Wording:

- Macro: `(A) 'Bile duct margin', received fresh is a ring of tan coloured tissue measuring 0.8 cm across and 0.3 cm in thickness. All embedded en face in 1 frozen block and subsequently converted to paraffin block.`
- Intraop: `(A) Negative for malignancy.` / `(A) Invasive carcinoma present at the margin.` / `(A) High-grade dysplasia (BilIN-3) at the margin; no invasive carcinoma identified.` / `(A) Epithelium denuded; margin cannot be assessed for dysplasia. No invasive carcinoma identified.`
- Paraffin microscopy: `(A) The paraffin section confirms the frozen section diagnosis. It shows benign biliary epithelium and fibromuscular wall with peribiliary glands. There is no evidence of dysplasia or malignancy.`; pancreatic: `… pancreatic parenchyma with a duct lined by benign epithelium …`.
- Diagnosis: `(A) COMMON BILE DUCT, margin, excision x frozen section - NO EVIDENCE OF MALIGNANCY`; `(A) PANCREAS, neck margin, excision x frozen section - NO EVIDENCE OF MALIGNANCY`; positive `- INVASIVE ADENOCARCINOMA PRESENT AT MARGIN`.
- Checks: denuded epithelium + "Negative" → warning to use the cannot-assess wording; dysplasia grade requires epithelium present.
- Snippets: "reactive atypia adjacent to a stent" caveat; "peribiliary glands should not be mistaken for carcinoma" (off by default).

Accept: negative CBD fixture reproduces §4; pancreatic neck negative and CBD positive fixtures; cannot-assess variant.

## (c) Lung wedge / nodule — Size M

House example: §10 (LLL wedge with pleural nodule, adenocarcinoma; staple-line handling, parenchymal margin inked; multifocal, intrapulmonary node).

Fields (scenario "Lung wedge"): lobe / side; specimen (wedge / nodule / pleural nodule punch); size; staple line length (cm), staple line trimmed (checkbox, default on), parenchymal margin inked (checkbox, default on); nodule count, largest nodule (cm), distance to staple-line margin (cm), pleural involvement grossly (checkbox); blocks (frozen / permanent-only); result: Adenocarcinoma / Adenocarcinoma in situ or minimally invasive (deferred for extent) / Squamous cell carcinoma / Non-small cell carcinoma, not further classifiable on frozen / Small cell carcinoma / Carcinoid tumour / Metastatic carcinoma (morphology consistent with known primary — free text) / Granulomatous inflammation (necrotising / non-necrotising) / Organising pneumonia / Benign, no tumour identified / Deferred; margin status at frozen (negative / involved / close, distance); lymph node in wedge (checkbox → intrapulmonary node line).

Wording:

- Macro: `(B) 'Lung, left lower lobe wedge, excision', received fresh is a wedge of lung tissue measuring 6 x 2 x 1.5 cm with a curvilinear staple line measuring 6 cm. The staple line is trimmed off and the parenchymal margin inked black. Sectioning reveals a firm tan-white nodule measuring 0.8 cm across, 0.5 cm from the parenchymal margin. Representative sections of the nodule are embedded in 2 frozen blocks and subsequently converted to paraffin blocks; the remaining tissue is submitted for paraffin sections only.`
- Intraop: `(B) Adenocarcinoma. Parenchymal margin not involved.` / `(B) Non-small cell carcinoma; subtype deferred to paraffin sections.` / `(B) Necrotising granulomatous inflammation; no malignancy identified. Special stains to follow.` / `(B) Metastatic carcinoma, morphologically consistent with the known colorectal primary.`
- Paraffin microscopy: `(B) The paraffin sections confirm the frozen section diagnosis. They show adenocarcinoma in acinar and lepidic patterns, N cm, extending to the visceral pleura. The parenchymal margin is clear by 0.5 cm.`; granuloma: `… necrotising granulomas with multinucleated giant cells; Ziehl–Neelsen and Grocott stains are negative/pending.`
- Diagnosis: `(B) LUNG, left lower lobe, wedge excision x frozen section - ADENOCARCINOMA, parenchymal margin clear`; `- NON-SMALL CELL CARCINOMA, favour adenocarcinoma; see comment`; `- NECROTISING GRANULOMATOUS INFLAMMATION, no evidence of malignancy`; `- METASTATIC ADENOCARCINOMA, consistent with colorectal primary`.
- Checks: nodule distance to margin < 0.5 cm with "margin negative" → warning; SCLC / carcinoid → advise "diagnosis to be confirmed on paraffin with IHC" comment; metastatic → primary must be named.
- Snippets: "definitive subtyping and predominant pattern on paraffin", "PD-L1 / molecular on the resection specimen", "frozen artefact limits assessment of lepidic vs invasive".

Accept: fixture reproduces §10 macro elements (staple line trimmed, margin inked, nodule distance) and the paraffin opener; SCC, metastatic and granulomatous fixtures; multi-part case (pleural punch + wedge) prints the pleural part with `morphologically similar to the tumour in (B)`.

## (d) CNS lesion (stereotactic / open biopsy, smear + frozen) — Size M, *no house example*

The user asked for brain meningioma; past sessions hold no frozen-section report for CNS. Wording below is *proposed* — confirm before fixtures are frozen.

Fields (scenario "CNS lesion"): site (frontal / temporal / parietal / occipital / cerebellar / convexity dura / falx / sphenoid wing / sellar / spinal / other), preparation (smear only / frozen only / smear and frozen), pieces and size; result: Meningioma (favour WHO grade 1; grading deferred) / Glial neoplasm, high grade (favour glioblastoma) / Glial neoplasm, low grade / Glial neoplasm, grade deferred / Metastatic carcinoma (± consistent with known primary) / Lymphoma, favour (advise flow / fresh tissue) / Schwannoma / Pituitary adenoma (PitNET) / Reactive gliosis, no tumour / Necrotic tissue only, nondiagnostic / Lesional tissue present, classification deferred / Deferred; lesional tissue adequate for paraffin (checkbox); tissue reserved fresh for molecular / flow (checkbox).

Wording:

- Macro: `(A) 'Right frontal lesion', received fresh are three pieces of grey-tan soft tissue measuring up to 0.6 cm across. One piece is used for a smear preparation; the remainder is all embedded in 1 frozen block and subsequently converted to paraffin block.`
- Intraop: `(A) Meningioma.` / `(A) High-grade glial neoplasm.` / `(A) Metastatic carcinoma, consistent with the known lung primary.` / `(A) Lesional tissue present; atypical lymphoid infiltrate, favour lymphoma — fresh tissue reserved for flow cytometry.` / `(A) Reactive gliosis; no tumour identified in the tissue examined.`
- Paraffin microscopy: `(A) The paraffin section confirms the frozen section diagnosis. It shows a meningothelial neoplasm arranged in whorls with psammoma bodies; mitoses are not increased and there is no brain invasion in the tissue examined.` Grade and molecular lines belong to the final report, not the frozen.
- Diagnosis: `(A) BRAIN, right frontal, biopsy x frozen section - MENINGIOMA (grading and subtype on paraffin sections)`; `- HIGH-GRADE GLIAL NEOPLASM (classification on paraffin and molecular studies)`; `- METASTATIC CARCINOMA, consistent with lung primary`; `- NO TUMOUR IDENTIFIED, reactive gliosis`.
- Checks: smear-only with a frozen-specific result → warning; lymphoma favour + no fresh tissue reserved → warning; "nondiagnostic" → suggest the "further sampling advised" intraop line.
- Snippets: "WHO CNS5 integrated diagnosis to follow (IDH, 1p/19q, MGMT as indicated)", "grading of meningioma deferred to paraffin".

Accept: meningioma, high-grade glioma and metastasis fixtures; no change to existing scenarios.

## (e) Named-margin presets and `x frozen section` line form — Size S

House examples: §5–9 (nasal ala Rm A–D + deep; oral tongue 5- and 6-margin sets; oropharynx 7-margin set; sinonasal / maxillary sets; soft-tissue margins). Diagnosis lines use `SITE, margin, resection x frozen section - NO EVIDENCE OF MALIGNANCY`.

Change: multi-part presets for the Margin scenario — "Oral tongue (5)", "Oral tongue (6)", "Oropharynx (7)", "Nasal ala BCC (Rm A–D + deep)", "Maxillectomy (custom count)" — each preset creates the parts with names filled and the tissue description defaulted (`cauterised mucosa` / `skeletal muscle` for deep); diagnosis-line procedure word per part (`excision` / `resection`); the joiner becomes ` x frozen section - ` for every frozen diagnosis line (fixture change, deliberate — record in `docs/roadmap-history.md`); grouped intraop line `(A)-(G) Negative for malignancy.` when all negative.

Accept: tongue 5-margin fixture reproduces §6 lines; nasal ala fixture reproduces §5 lines (with `Skin, nasal ala, margin ("Rm A")` naming); existing frozen fixtures updated once with a stated reason.

## Order and shipping

Build order: (a) SLN, (b) duct margins, (e) presets and line form as one unstaged batch; (c) lung wedge ships inside the Lung pair and (d) CNS inside the CNS pair (see "Staged frozen specimens" below).

## Staged frozen specimens (pairs)

Some frozen specimens are also the AJCC staging specimen, or their result feeds a category in a later synoptic. These are planned as pairs with the matching QMH resection template, after an engine card ("Frozen → staged final") that provides:

1. **Stage this part** — a frozen part with a malignant paraffin result gains a linked synoptic part under the same letter, pre-filled from the frozen fields. Pre-fill map (frozen → synoptic): laterality / lobe / site → tumour site; largest nodule size → tumour size (invasive size still entered); distance to staple-line margin → parenchymal margin distance; pleural involvement grossly → visceral pleura prompt; nodes identified / positive / largest focus / ENE (`nodeSummary`) → regional lymph nodes; duct-margin result (`marginSummary`) → margin status line. Diagnosis line per letter: `(B) LUNG, left lower lobe, wedge excision x frozen section - ADENOCARCINOMA, acinar predominant, 0.8 cm; parenchymal margin clear; pT1a pNX (AJCC 8th edition)`.
2. **Related prior specimen** — case-level fields: accession, date, procedure, tumour type, size, pT, pN (optional lookup by accession from the `Sign-out cases` Sheet, read-only). The staging module accepts a partial input and tags each category with its origin. Combined stage line: `Pathological stage: pT1a (prior wedge resection S26-01234) pN0 (0/8, this lobectomy)`. Auto comment (proposed): "Staging is based on the prior wedge resection (S26-01234) together with the lymph nodes from this completion lobectomy." Residual tumour in the completion specimen: `Residual carcinoma: not identified` / `present, N mm, at the previous staple line`.

Pairs and their QMH pages (`https://awiloqmh.github.io/CancerReportingTemplate/`):

| Frozen scenario | Feeds | Synoptic template (QMH page) | Roadmap |
| --- | --- | --- | --- |
| Lung wedge / nodule (c) | pT, margins, pleura; completion lobectomy adds pN and residual tumour | Lung carcinoma resection (`Thorax-Lung.html`) | Next — Lung pair |
| Breast sentinel lymph nodes (a) | pN (ITC / micro / macro, ENE, count) | Breast carcinoma resection (`BREAST-Cancers.html`, `BREAST-DCIS.html`) | Next — Breast pair |
| Bile duct / pancreatic duct margins (b) | margin status | Pancreas (`GI-Pancreas.html`), distal extrahepatic and perihilar bile ducts | Later — Pancreatobiliary pair |
| Named margins (e) | margin status and distances | Lip and oral cavity (`HN-Lip and oral cavity.html`), nasal cavity / sinuses | Later — Head-and-neck pair |
| CNS lesion (d) | WHO CNS5 grade / integrated diagnosis (no AJCC) | `CNS-Meningioma.html`, `CNS-Common_gliomas_and_ependymomas.html` | Later — CNS pair |

Order: unstaged frozen batch (a)+(b)+(e) → engine card with the Lung pair → Breast pair → gastric synoptic as already planned → Later pairs.
