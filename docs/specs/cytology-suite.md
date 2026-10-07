# Cytology suite — build record

Shipped 2026-09-11. Six templates, kind `cytology`, system Cytology, one shared generator (`generators/cytology.js`). Schemas are written by `scripts/gen-cytology-schemas.py` (re-run it after editing; do not hand-edit the JSON). Exception: `cervical_cytology.json` is hand-edited since Phase 55 (2026-10-07) and the script skips it; see `docs/specs/cervical-cytology-descriptions.md`. No rapid on-site evaluation fields: the service does not offer ROSE, so adequacy is assessed on the final preparations only.

## Templates

| id | Classification | Category tag | ROM line |
| --- | --- | --- | --- |
| `thyroid_fna` | Bethesda 2023 (I–VI) | `(Bethesda II: Benign)` | I 13% (5–20), II 4% (2–7), III 22% (13–30), IV 30% (23–34), V 74% (67–83), VI 97% (97–100) |
| `salivary_fna` | Milan 2nd edition (I, II, III, IVa, IVb SUMP, V, VI) | `(Milan IVb: SUMP)` | I 15%, II 11%, III 30%, IVa < 3%, IVb 35%, V 83%, VI 98% |
| `lymph_node_fna` | Sydney System L1–L5; procedures FNA / US-FNA / EBUS-TBNA / EUS-FNA | `(Sydney System L5: Malignant)` | none (staging caveat snippet for L2) |
| `effusion_cytology` | International System (ND / NFM / AUS / SFM / MAL) | `(TIS: Malignant)` | ND 17%, NFM 21%, AUS 66%, SFM 82%, MAL 99% |
| `urine_cytology` | Paris System 2.0 (ND / NHGUC / AUC / SHGUC / HGUC / Other); LGUN as a flag under NHGUC | `(Paris System: NHGUC)` | none by design — Paris 2.0 gives ranges, not point estimates; follow-up snippet for AUC instead |
| `cervical_cytology` | Bethesda 2014; LBC or conventional; HPV result line | `(NILM)` / `(HSIL)` | none; colposcopy / co-test snippets |

## Report shape

- SPECIMENS: `Thyroid, right lobe nodule, ultrasound-guided fine needle aspiration`; fluids `Pleural fluid, right`; urine `Urine, voided` / `Ureteric washing, left`; cervix `Cervix, liquid-based cytology`.
- MACROSCOPIC DESCRIPTION (preparations line, toggle `macro`): `Received are two air-dried and two alcohol-fixed smears and a needle rinse (blood-stained), processed as cytospin (1 slide) and cell block (1 block).`; fluids `Received is 50 ml of blood-stained fluid, processed as …`; cervix `Received is one liquid-based cytology vial, processed as one slide.`
- MICROSCOPIC EXAMINATION, one paragraph: preparations + adequacy → features (background / architecture first, then `<cells> with <nuclear features>`) → cell-block IHC → interpretation (`Features are those of a benign follicular nodule.` / `There is no evidence of malignancy.`). Nondiagnostic / unsatisfactory drops the interpretation and states the reason: `… are inadequate for evaluation (cyst fluid only), showing only haemosiderin-laden macrophages.`
- DIAGNOSIS: `THYROID, right lobe nodule, ultrasound-guided fine needle aspiration - BENIGN FOLLICULAR NODULE (Bethesda II: Benign)`; organ lead upper case, site and procedure lower case, diagnosis upper case, tag in parentheses. Organism names keep Latin case (`; Trichomonas vaginalis`).
- COMMENT: auto snippets keyed to the category (ROM line and, where the system gives one, a management line — repeat aspiration, excision, colposcopy, cystoscopic correlation); the EBUS/staging caveat only for L2.

## Checks

- Adequacy inadequate / unsatisfactory with a diagnostic category, or nondiagnostic category with adequate material → error.
- PTC nuclear features ticked under Bethesda II → warning; HGUC without the required nuclear criteria (N:C ≥ 0.7 plus hyperchromasia / irregular membranes / coarse chromatin) → warning; malignant categories without a stated type → warning; cervical HSIL/ASC-H with negative HPV → warning (Phase 55 adds HSIL-inv and SCC, and the cervical description Checks in `docs/specs/cervical-cytology-descriptions.md`).

## Sources

- Bethesda 2023 ROM: Ali SZ et al., Thyroid 2023; summary table in [JCTP review](https://www.xiahepublishing.com/2771-165X/JCTP-2023-00005).
- Milan 2nd edition ROM: [JMSH review of MSRSGC](https://jmsh.ac.in/articles/the-milan-system-for-reporting-salivary-gland-cytopathology-msrsgc-for-assessment-of-diagnostic-accuracy-of-fine-needle-aspiration-cytology-and-malignancy-risk-stratification-in-salivary-gland-lesions).
- International System for serous fluid ROM: [PMC11451941](https://pmc.ncbi.nlm.nih.gov/articles/PMC11451941/).
- Paris System 2.0 categories and ROHM ranges: American Society of Cytopathology bulletin (no point ROM used).
- House wording: salivary FNA example in the user's Drive drafts (`SALIVARY GLAND, left submandibular, fine needle aspiration: - ATYPICAL LYMPHOID PROLIFERATION`; `Suggest excisional biopsy for definitive diagnosis.`).

## Untouched

Histology templates, frozen section, synoptic staging, fixtures under `tests/fixtures/gastric` and `colonic`.
