# Sentinel node staging criteria (Phase 76, 23 October 2026)

User request (2026-10-23): on Lymph node excision, for sentinel lymph nodes, add the breast criteria for isolated tumour cells, micrometastasis, macrometastasis and extranodal extension (breast is the most common, then melanoma), looking to the QMH breast carcinoma template; add an option for treatment effect; and update the frozen section sentinel node.

Sources and the points each one settles: `docs/reference/sentinel-node-sources.md`. Nothing from them prints: criteria sit in the "Show criteria" panel, the option labels and Checks.

## Lymph node excision (`lymph_node`, version 2026.10)

- **Staging criteria**: Not applied (default) / Breast carcinoma / Melanoma, after the procedure. Choosing the procedure "Sentinel lymph node biopsy" sets Breast; a value the pasted request set is kept. The field carries the criteria panel, shared word for word with the frozen form's result field.
- With the criteria **Not applied** every report reads exactly as before (tests/lymphnode.test.js unchanged). Hidden criteria fields never print, whatever they hold.
- **Result** gains "Isolated tumour cells". "Positive nodes" is relabelled "Nodes involved" and also shows for isolated tumour cells.
- **Extranodal extension**: Not identified (stored "Absent", so saved cases open unchanged) / Present / Cannot be determined. **Extranodal extent** (Not stated / 2 mm or less / More than 2 mm) shows when extension is present on any metastasis.

### Breast carcinoma

| Field | Shows | Prints |
|---|---|---|
| Size category: From the largest deposit (default) / Macrometastasis / Micrometastasis | Metastatic carcinoma | "the largest deposit measuring 8 mm (macrometastasis)"; with no size, "involved by metastatic carcinoma (micrometastasis)". From the deposit: more than 2 mm macro, more than 0.2 mm micro, 0.2 mm or less none (Checks asks). Diagnosis clause "largest deposit 8 mm (macrometastasis)" or "micrometastasis" |
| Isolated tumour cells (result) | — | "The lymph node contains isolated tumour cells, the largest cluster measuring 0.1 mm." and the stains; diagnosis "ISOLATED TUMOUR CELLS ONLY (1/2)", the nodes holding them over the nodes examined |
| Presurgical therapy: No known presurgical therapy (default) and the four CAP answers | Negative, isolated tumour cells, metastatic carcinoma | Response: "There is evidence of response to presurgical therapy." and "; treatment effect present". No definite response: "There is no definite evidence of response to presurgical therapy." Fibrous scarring: "There is fibrous scarring in keeping with treatment effect, with no residual metastatic carcinoma." and "NO RESIDUAL METASTATIC CARCINOMA (0/1); fibrous scarring in keeping with treatment effect". No scarring: "No fibrous scarring or histiocytic aggregates are seen." |
| Extranodal extent | Extension present | "Extranodal extension is present, extending more than 2 mm beyond the lymph node capsule." and "extranodal extension present (more than 2 mm)" |

Checks (Breast): a chosen category against the deposit (macro 2 mm or less, micro more than 2 mm warn; micro 0.2 mm or less is right only for more than 200 cells); a deposit of 0.2 mm or less with no category (choose isolated tumour cells or micrometastasis); no size and no category; extension present with no extent; isolated tumour cells larger than 0.2 mm; isolated tumour cells are pN0(i+), counted as examined, not positive; a melanoma result; a therapy answer that contradicts the result.

### Melanoma

- **Location in the node**: Not stated / Subcapsular / Intraparenchymal / Subcapsular and intraparenchymal, for metastatic malignant melanoma. Prints "involved by metastatic malignant melanoma in the subcapsular sinus, the largest deposit measuring 0.4 mm." and the diagnosis clause "subcapsular".
- No size category prints. Checks: isolated tumour cells chosen (no such category; any tumour cells make the node positive); no deposit size (nearest 0.1 mm); no location; a carcinoma result.

## Frozen section sentinel node (`frozen_section`, version 2026.10)

- Result labels: "Isolated tumour cells only (0.2 mm or less and fewer than 200 cells)", "Micrometastasis (more than 0.2 mm to 2 mm, or more than 200 cells)", "Macrometastasis (more than 2 mm)", with the criteria panel. The stored values and the Phase 9 wording are unchanged (tests/frozen_sln.test.js).
- **Extranodal extent** (Not stated / 2 mm or less / More than 2 mm) for extension present on a micro- or macrometastasis: "with extranodal extension (more than 2 mm)" in the paraffin text and the diagnosis. An information check asks for it on a breast node.
- **Presurgical therapy** gains "Presurgical therapy, no metastasis and no scarring"; the chips read as in the Lymph node form. No scarring adds ", with no fibrous scarring or histiocytic aggregates" to the paraffin text; fibrous scarring now also words the diagnosis "NO RESIDUAL METASTATIC CARCINOMA, with fibrous scarring in keeping with treatment effect (0/2)". A therapy answer that contradicts the frozen result warns.
- **Melanoma** (site "Skin (melanoma)"): any category picked prints "Metastatic malignant melanoma, 0.4 mm (1 of 2 lymph nodes)." intraoperatively, "involved by metastatic malignant melanoma (0.4 mm)" in the paraffin text and "METASTATIC MALIGNANT MELANOMA, largest deposit 0.4 mm (1/2)"; an information check explains, and the breast category checks do not fire. The "Add breast synoptic" prompt now shows for breast nodes only.
- **Hand-off to the breast synoptic**: the therapy answer now maps to the synoptic's own LN treatment effect options (until now it was copied as it stood and matched none); "Cannot be assessed" becomes "Cannot be determined"; the extent fills "ENE extent" ("1 node, greater than 2 mm"). `slnSummary` adds `eneExtent` only when extension is present and its extent chosen.

## Intake

Sentinel lines (`sentinel`, `SLN`) on the Lymph node form always carry the criteria, so the procedure's linked default cannot override a "Not applied":

1. Melanoma anywhere in the request (line, other lines, history): Melanoma.
2. The line names the breast or axilla: Breast ("\baxill", so "maxillary" does not count).
3. The line names a pelvic, obturator, iliac, para-aortic, groin, inguinal, neck, level, cervical, submandibular, submental or parotid region: Not applied.
4. The other lines of the request, then the history: a breast operation gives Breast; a uterine, cervical, adnexal, vulval, vaginal, oral or penile one gives Not applied.
5. Otherwise Breast.

Measured on both exports (aggregate, no history in the exports): 179 sentinel lines open the Lymph node form; 150 open on Breast and 29 (pelvic, groin and uterine-operation lines) on Not applied. No line names melanoma. Routes are unchanged across all 21,482 parts. Lines that are not sentinel nodes (axillary dissections among them) are not filled and stay Not applied; the criteria can be chosen by hand.

## Not changed

- The breast synoptic's own node fields and wording; the vulval and head and neck sentinel nodes, which have no criteria of their own here.
- Tests: tests/lymphnode_sln.test.js (golden reports `tests/fixtures/lymph_node_sln/01-05`), tests/frozen_sln_criteria.test.js; browser QA "sentinel node".
