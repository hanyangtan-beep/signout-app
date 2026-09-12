# Appendix tumour resection — Built (Phase 12)

Template `appendix_carcinoma` (kind `cancer resection`, system GI). Built 2026-09-12 against
the saved QMH GI page `docs/reference/GI-Appendix.html`
(source: https://awiloqmh.github.io/CancerReportingTemplate/, Appendix carcinoma; AJCC 8th
edition staging). Placeholder retired from `templates/planned.json`.

## Decisions

- **Element order = the QMH page**, pinned by `tests/appendix.test.js`. The house exception
  stands: `- Tumour histology:` prints immediately after Histologic grade.
- **House renames on the pick-list** (documentation in the page body said "goblet cell
  carcinoid"; our option reads "Goblet cell adenocarcinoma", Tang / WHO grade select carries
  the group 1 / 2 / 3 wording, and the mixed-tumour option reads "...neoplasm (Mixed
  adenoneuroendocrine carcinoma)"). Copyright-sensitive verbatim prose is not copied.
- **Staging** `src/staging/appendix.js`. Extension ticks map to Tis / T1 / T2 / T3 / T4a / T4b
  with acellular-mucin rows alongside cellular tumour rows. LAMN confined by the muscularis
  propria relabels T1 / T2 reads as **pTis(LAMN)** per AJCC 8. N: NX on 0 examined, escalating
  bins 1 / 2-3 / 4-6 / 7+, and N1c when tumour deposits are entered with 0 involved nodes.
  M: intraperitoneal acellular mucin M1a, intraperitoneal metastasis M1b, extra-peritoneal M1c;
  AJCC RLV / stage group IV splits on M1b plus high grade.
- **Morphology module** `generators/appendix_morphology.js`: per-type microscopic sentences
  grounded in WHO 2019 (blue book wording via Pathology Outlines appendixmucinousneoplasm /
  appendixadenocarcinoma and PMC5801558 for the Tang A/B/C goblet grading), keyed on the
  exact schema option strings. The sentence prints in the derived `- Tumour histology:`
  paragraph only when a real invasive / neoplastic type is recorded (suppressed for pT0 after
  therapy and when the user typed notes).
- **Checks**: infiltrative extension with LAMN / HAMN type (re-report as invasive mucinous
  adenocarcinoma); acellular-mucin rows on non-mucinous types; Tang group without goblet type;
  T4b without adjacent-organ detail; proximal / mesenteric margin distances; LAMN at the
  proximal margin (further surgery discussed at MDT); tumour-deposits number entered without
  the "Present" row; nodal cross-checks.
- **Benign upgrade**: `generators/appendix.js` exports `UPGRADE_TO` (`to: appendix_carcinoma`).
  When the benign appendicectomy record shows LAMN / adenocarcinoma / goblet cell
  adenocarcinoma the part action bar offers "Upgrade this part", keeping the label and macro
  and seeding histType, grade (Not applicable for LAMN), size in mm, margins and addenda.

## Microscopy paragraph

Derived (no typed notes): grade + histType name, invasion clause from the deepest extension
tick, Tang wording for goblet cell adenocarcinoma, then the per-type morphology sentence.
