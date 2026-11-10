# Soft tissue sarcoma resection synoptic

Built on 10 November 2026 (Phase 84) at the user's request: "build the soft tissue sarcoma resection template next. make sure liposarcoma is included." It builds the three sarcoma cards of benign batch 4 (user request 2026-09-24): the grade and staging module, the resection synoptic and liposarcoma. It replaces the menu placeholder for QMH MS-Soft tissue sarcoma (`templates/planned.json`). The sources, decisions and printed morphology sentences are in `docs/reference/soft-tissue-sources.md`; the intake rules are in `docs/specs/specimen-intake.md`.

## Scope

- One form, `soft_tissue_sarcoma` (Soft tissue, cancer resection, menu "Sarcoma"), for excisional biopsies and intralesional, marginal, wide and radical resections of a soft tissue sarcoma or an atypical lipomatous tumour, at every AJCC site group.
- Every type on the QMH list (the WHO 5th edition list CAP gives), with the liposarcomas in full.
- Not covered: core and incisional biopsies (they keep Generic), GIST (`gist_resection`), uterine sarcomas (a card of their own), bone sarcomas, and skin tumours such as dermatofibrosarcoma protuberans.

## Form

Groups in the QMH element order: Specimen and tumour, Macroscopy, Microscopic findings, Margins, Lymph nodes and metastasis, Additional findings, Molecular findings, Staging. The example sets every field.

- Tumour site (AJCC site group) is a field of its own, beside the typed site and side; the extent fields for the head and neck, the visceral organs and the orbit show for their group only.
- Tumour depth is the CAP multiselect (dermis, subcutis, deep fascia, intramuscular, intermuscular, bone, other).
- Histologic type is the QMH list. The liposarcoma rows show by type: the well-differentiated component, the size of the dedifferentiated component and heterologous differentiation for dedifferentiated liposarcoma; the hypercellular (round cell) areas (%) for myxoid liposarcoma.
- Histologic grade is FNCLCC, Not graded or Cannot be assessed (GX). Tumour differentiation is the QMH list with its scores; left blank, it follows the type. The mitotic count takes a unit (per 10 HPF at a 22 mm eyepiece, or per mm²), and necrosis an option with an optional percentage.
- Margins are typed one per line ("Deep: 2.2 (block 7)"), with a box for margins that cannot be assessed and the fascial envelope at the closest margin.
- Treatment effect takes the percentage of viable tumour, as QMH asks, and its features.
- MDM2 and DDIT3 / FUS FISH and other ancillary studies sit under Molecular findings.

## Report

- Macroscopic description and block key, then the synoptic in sections: Specimen and tumour, Microscopic findings, Margins, Lymph nodes and Distant metastasis (with an input, or when the case option asks for the negatives), Pathological stage (AJCC 8th edition), Additional findings; Ancillary studies print under Molecular findings.
- Microscopy is one Tumour histology paragraph: the type, the sentence for the type, the liposarcoma sentences and the typed immunohistochemistry. A typed note replaces it.
- The grade row prints the grade with its three scores under it: "Grade 3 (score 6 to 8, high grade)", then Tumour differentiation, Mitotic rate and Tumour necrosis, each with its score.
- The Surgical margin row names the closest margin ("Uninvolved by tumour (closest 2.3 mm, anterior margin)"), or the involved ones, and each typed line prints under it. A line that reads as neither clear, involved nor cannot be assessed prints as typed; when no line does, the summary row is left out.
- The diagnosis follows the user's reports: "SOFT TISSUE, right thigh tumour, wide excision:" over the type, "FNCLCC Grade 3" and the margin clause ("Resection margins clear", "Deep margin involved", "Margins cannot be assessed"), then the node count when nodes were examined. A retroperitoneal tumour reads "Left RETROPERITONEAL tumour, excision:"; a typed organ or specimen name leads instead.
- The treatment effect row always prints, "No known presurgical therapy" when none is recorded, as QMH has it.
- The stage group shows in Checks only.

## Grade and staging

`src/staging/softtissue.js`, on the AJCC 8th edition (AJCC has no version 9 chapter for these sites).

- FNCLCC: differentiation 1 to 3, mitotic count 1 to 3 (fewer than 14, 14 to 28, more than 28 per 10 HPF at a 22 mm eyepiece; 0 to 5, 6 to 11, more than 11 per mm²), necrosis 0 to 2; a sum of 2 or 3 is grade 1, 4 or 5 grade 2, 6 to 8 grade 3. A missing score leaves the grade row out with a warning.
- The QMH mitotic cut-offs are per 10 HPF at a 22 mm eyepiece and 40x objective, not the original FNCLCC field; CAP's per mm² cut-offs sit beside them.
- The types CAP does not grade print Not graded, and the types high grade by definition print as high grade, with CAP's wording in Checks.
- pT by site group: the trunk and extremities and the retroperitoneum by size (50, 100 and 150 mm); the head and neck by size (20 and 40 mm) with T4a and T4b by invasion; the abdominal and thoracic visceral organs by extent; the orbit by size and invasion. Other and Not specified give pTX.
- pN from the involved node count. With no node examined pN is not printed, as CAP does not use pNX (Note K), and the stage group reads N0. pM1 prints when a distant site is ticked. The m, r and y descriptors print.
- A typed override replaces the derived categories; a T typed alone replaces the pT only, printed with the derived T and the reason ("pT2 [pathologist override; derived T3 - ...]").
- Stage groups for the trunk and extremities and the retroperitoneum, in Checks only: any T N1 M0 is IV on the trunk and extremities and IIIB in the retroperitoneum, as the AJCC table has it.

## Liposarcoma

- Atypical lipomatous tumour and well-differentiated liposarcoma are named by site. CAP (Note D): "Generally, the term well-differentiated liposarcoma has been used for groin/retroperitoneum and deep skeletal muscle tumors, due to their increased potential for de-differentiation, whereas atypical lipomatous tumor is preferred for superficial subcutaneous tumors with the same histology since these are generally cured by limited excision."
  - Checks warn on an atypical lipomatous tumour in the retroperitoneum, groin, mediastinum or paratesticular region, and on a well-differentiated liposarcoma that is only dermal or subcutaneous elsewhere.
  - A deep limb tumour gets an info, not a warning: the user's own reports name an intramuscular thigh tumour atypical lipomatous tumour.
  - With no depth ticked, an info gives the rule.
- The diagnosis of an atypical lipomatous tumour or a well-differentiated liposarcoma carries no FNCLCC grade, as the user writes it; the grade rows still print in the synoptic.
- Dedifferentiated liposarcoma prints "DEDIFFERENTIATED LIPOSARCOMA arising from adjacent WELL DIFFERENTIATED LIPOSARCOMA" when the well-differentiated component is present (the user's wording), with the size of the dedifferentiated component and heterologous differentiation under the type.
- Myxoid liposarcoma prints its hypercellular (round cell) areas under the type, in the paragraph and in the diagnosis ("MYXOID LIPOSARCOMA with 10% hypercellular (round cell) areas"). Above 5% the differentiation score is 3 (high-grade myxoid liposarcoma) unless another is picked.
- Pleomorphic, epithelioid pleomorphic and myxoid pleomorphic liposarcoma are on the list.
- Molecular findings: Checks ask for MDM2 on an atypical lipomatous tumour or a well-differentiated or dedifferentiated liposarcoma and for DDIT3 / FUS on a myxoid liposarcoma (CAP, Note D, Table 1), and warn when a result contradicts the type or MDM2 is amplified in a pleomorphic liposarcoma.
- WHO 6th edition (2026), in Checks only, as the printed list stays WHO 5th as QMH and CAP give it: a dedifferentiated liposarcoma at 4 or fewer mitoses per 10 HPF, and an atypical lipomatous tumour or well-differentiated liposarcoma at 5 or more, raise an info on the new threshold; "low-grade dedifferentiation" typed in a note raises an info that the term is no longer used.

## Checks

Errors for a missing procedure or type and for more involved nodes than examined. Warnings for a missing site group, size, extent, margin, involved node count, extranodal extension, treatment effect, viable percentage or override reason; for an unnamed other type or site; for an incomplete FNCLCC score or a necrosis percentage that contradicts the option; for the liposarcoma naming and the molecular contradictions above. Infos for a site group of Other or Not specified (pTX), a mitotic count near a cut-off, the types CAP does not grade or that are high grade by definition, MPNST and solitary fibrous tumour grading, preresection therapy and grading, the types AJCC staging does not suit (CAP, Note F), the liposarcoma advice, a margin line printed as typed, a treatment effect without therapy, multifocal tumours and the stage group.

## Upgrade from the benign form

The benign soft tissue form offers "Upgrade this part" when Atypical lipomatous tumour or Sarcoma is the diagnosis and the procedure is not a biopsy. The part switches to the sarcoma form in place, carrying over the specimen name, organ (blank for SOFT TISSUE), site, clinical label ("tumour" when blank), the site group read from the site words, the specimen dimensions (cm to mm), cut surface, depth (dermal, subcutaneous, intramuscular), blocks, immunohistochemistry, MDM2 and, for an atypical lipomatous tumour, the type. The benign form's outputs do not change.

## Intake

Excisions and resections that name a sarcoma, a liposarcoma type or an atypical lipomatous tumour in the line or the history open the form, with the procedure, site group, site and clinical label preset. Biopsies, cores and aspirates, lipomas, bone, uterus, GIST, skin, breast, lymph nodes and margins keep their forms. Across the two exports, fewer than 10 parts change route, all into the new form; no other part changes.

## Tests

- `tests/soft_tissue_sarcoma.test.js`: metadata, menus, the example, two parts, the FNCLCC rows, an incomplete grade, therapy, the liposarcoma types, retroperitoneal naming, MDM2, the CAP naming and WHO 6th edition Checks, CAP Note F, margins, nodes and pTNM, the override, the QMH order with its six departures, intake routes and presets, the upgrade map, and five golden reports in `tests/fixtures/soft_tissue_sarcoma/`: a grade 3 undifferentiated pleomorphic sarcoma of the thigh (pT3), the same type of the knee after preoperative radiotherapy (ypT2, 10% viable tumour), a retroperitoneal dedifferentiated liposarcoma arising from a well-differentiated liposarcoma with MDM2 amplified (pT3), a myxoid liposarcoma of the thigh with 10% hypercellular areas and DDIT3 rearranged (grade 2, pT2), and an atypical lipomatous tumour of the thigh with MDM2 amplified (pT3, with the CAP Note F info).
- `tests/staging_softtissue.test.js`: the FNCLCC sums and cut-offs, the QMH differentiation scores, every size cut-off, the extent rules, pN, the descriptors and every stage group.
- `tests/softtissue.test.js` passes unchanged: the benign outputs do not change.
- `tools/qa-browser.js` (kept in the QA script): a pasted thigh wide excision under a sarcoma history opens the form on Wide resection and Trunk and extremities; a grade 3 undifferentiated pleomorphic sarcoma prints its grade, margins and pT2 with the option, and the stage group shows in Checks only; a benign atypical lipomatous tumour excision upgrades in place with its depth, site group and MDM2.

## Open points

- The printed type list stays WHO 5th edition until QMH and CAP move to the 6th.
- The form records the viable percentage (QMH), where CAP Note H expresses the response as the non-viable percentage.
- A well-differentiated liposarcoma of a deep limb tumour is left to the pathologist, with an info only.
- No reference image gallery yet.
