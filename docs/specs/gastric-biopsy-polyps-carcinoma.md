# Gastric biopsy: polyps, adenomas, carcinoma types and biomarkers (Phase 57)

Status: **built 2026-10-07**, pulled by the user: "for gastric biopsy template, please also have the
option for different types of gastric polyp i.e. hyperplastic polyp, fundic gland polyp, as well as
different types of adenomas. I'd like you to also expand the section for carcinoma to include the
different types (according to WHO classification), as well as biomarkers (HER2 IHC, PD-L1, EBER and
Claudin 18.2, look at the QMH templates)".

Template `gastric_biopsy` (schema version 2026.10). The new logic is in `generators/gastric_lesions.js`,
which `generators/gastric.js` calls. Sources, criteria and links:
`docs/reference/gastric_biopsy-morphology.md`.

## House profile (aggregate, 2021–2026 exports)

- Of the gastric biopsy and polypectomy rows, fundic gland polyp (183) and hyperplastic polyp (122) lead
  the polyp lines. Adenomas of each type are uncommon.
- Helicobacter is named on 45 of 339 polyp and adenoma lines, so a polyp line carries no trailing
  "Helicobacter-negative".
- HER2 appears in 20 of 118 carcinoma microscopy texts but on only a handful of diagnosis lines, so the
  biomarkers print in the microscopy only.

## As built: fields

All fields are flat (no `group`), and every one has a default that prints nothing. Hidden values are
kept but never printed, and old drafts without the keys read exactly as before.

| Field | Shows | Options |
| --- | --- | --- |
| `polyp` (Polyp / adenoma), before `dysplasia` | always | None, hyperplastic polyp, fundic gland polyp, intestinal-type, foveolar-type, pyloric gland and oxyntic gland adenoma, inflammatory fibroid polyp |
| `caType` (WHO) | dysplasia is intramucosal carcinoma or malignancy present | Not specified, adenocarcinoma (subtype not assessable), tubular, papillary, poorly cohesive (signet-ring cell type, non-signet-ring cell type), mucinous, mixed, micropapillary, fundic-gland type, hepatoid, carcinoma with lymphoid stroma, adenosquamous, squamous cell, undifferentiated, sarcomatoid, large cell NEC, small cell NEC, MiNEN, Other (specify) |
| `caOther` | type is Other | free text |
| `caGrade` | adenocarcinoma, tubular, papillary | Not stated, well, moderately, poorly differentiated |
| `caLauren` | the adenocarcinoma family | Not stated, intestinal, diffuse, mixed, indeterminate |
| `her2` | carcinoma | Not performed, Pending, 0, 1+, 2+, 3+, cannot be determined |
| `her2Ish`, `her2Ratio`, `her2Copies` | HER2 2+ or cannot be determined | Not performed, Pending, not amplified, amplified, cannot be determined; ratio; average HER2 signals per cell |
| `eber` | carcinoma | Not performed, Pending, negative, positive, positive in background lymphoid cells only, cannot be determined |
| `mmr` | carcinoma | the colonic patterns plus Pending |
| `pdl1`, `pdl1Clone`, `pdl1Cps`, `pdl1Tps` | carcinoma | Not performed, Pending, Performed, cannot be determined; 22C3, 28-8, SP263, E1L3N; CPS; TPS |
| `claudin`, `claudin2`, `claudin3` | carcinoma | Not performed, Pending, positive, negative, cannot be determined; 2+ and 3+ percentages |

`polyp`, `her2`, `eber`, `pdl1` and `claudin` carry text-only reference panels. The cut-offs live
there and in the checks, never in a printed sentence.

## As built: printed wording

Microscopy (new bullets in place; everything else unchanged):

    - Polyp: Fundic gland polyp. Cystically dilated oxyntic glands are lined by parietal cells, chief cells and mucous foveolar cells.
    - Dysplasia / malignancy: Tubular adenocarcinoma, moderately differentiated, intestinal type (Lauren). Moderately formed tubules of atypical columnar epithelium alternate with cribriform and incomplete glands.
    - Biomarkers: HER2 (4B5) is equivocal (score 2+). HER2 dual ISH shows no amplification (HER2/CEP17 ratio 1.4; average 3.2 HER2 signals per cell). EBER in situ hybridisation is negative in the tumour cells. Immunohistochemistry shows retained nuclear expression of MLH1, PMS2, MSH2 and MSH6 in the tumour cells (mismatch repair proficient). PD-L1 (22C3) combined positive score is 5 (tumour proportion score 2%). Claudin 18.2 (43-14A) is positive, with moderate to strong membranous staining in 80% of tumour cells (2+ 30%, 3+ 50%).

- The biomarkers follow the QMH page order (HER2, DISH, EBER, MMR, PD-L1, claudin 18.2).
- Requested tests merge into one sentence: "HER2, PD-L1 and claudin 18.2 immunohistochemistry have been
  requested (results to follow)."
- Biomarkers print only with a carcinoma.

Diagnosis: the lesion leads, then the background clauses that are recorded, joined by "; ".

    STOMACH, body, biopsy - FUNDIC GLAND POLYP
    STOMACH, body, biopsy - HYPERPLASTIC POLYP; HELICOBACTER ASSOCIATED CHRONIC ACTIVE GASTRITIS; mild INTESTINAL METAPLASIA (incomplete)
    STOMACH, body, biopsy - INTESTINAL-TYPE ADENOMA with LOW GRADE DYSPLASIA; CHRONIC GASTRITIS, inactive, Helicobacter-negative; moderate INTESTINAL METAPLASIA
    STOMACH, body, biopsy - PYLORIC GLAND ADENOMA with INTRAMUCOSAL TUBULAR ADENOCARCINOMA, well differentiated
    STOMACH, body, biopsy - POORLY COHESIVE CARCINOMA, signet-ring cell type, diffuse type (Lauren); HELICOBACTER ASSOCIATED CHRONIC ACTIVE GASTRITIS

- An indefinite grade prints ", INDEFINITE FOR DYSPLASIA". An untyped "Malignancy present" under a
  polyp prints "; MALIGNANCY PRESENT".
- An untyped carcinoma keeps the legacy line (fixture 07 is unchanged).

## Checks

- An intestinal-type or foveolar-type adenoma without a low or high grade: review.
- An oxyntic gland adenoma with a dysplasia grade: review, since it shows no more than mild atypia.
- An inflammatory fibroid polyp with dysplasia: for reference.
- A carcinoma without a type: for reference. Other without text: to fix.
- A Lauren mismatch (poorly cohesive and intestinal; tubular or papillary and diffuse): review.
- HER2:
  - 2+ without ISH: for reference.
  - ISH result without a ratio: review.
  - A ratio on the wrong side of 2.0 for the result chosen: review.
- PD-L1: CPS missing, or outside 0–100, and TPS over 100: to fix.
- Claudin 18.2:
  - 2+ and 3+ adding up to more than 100%: to fix.
  - Positive with a total under 75%, or negative at 75% or more: review.
- Biomarkers recorded without a carcinoma: for reference.

## Joiner fix (fixture 03 edited deliberately)

The legacy Helicobacter branch ran its first extra on with a space, so with no ulcer the line read
"HELICOBACTER ASSOCIATED CHRONIC ACTIVE GASTRITIS moderate INTESTINAL METAPLASIA". The other branches
printed "; with ULCER".

The rules now:
- Intestinal metaplasia, atrophy and dysplasia open their own clause after "; ".
- "with ULCER" attaches to an active or Helicobacter gastritis.
- After the inactive phrase the ulcer reads "; ULCER".

Only `tests/fixtures/gastric/03-hp-active-im-complete-atrophy.json` changed: its diagnosis and
description were edited by hand. The other fixtures are byte-identical. The OLGA test that had pinned the
run-on now expects the joiner.

## Reversible choices

- PD-L1 prints the CPS and clone without a positive or negative label (QMH groups at CPS 10; the drug
  labels differ).
- Polyp lines carry no trailing ", Helicobacter-negative".
- Biomarkers stay in the microscopy only.
- Intestinal-type and foveolar-type adenoma keep their names, although WHO 6th folds them into gastric
  dysplasia.
- QMH's MSI fragment analysis, CEP17 signals, cells counted, cold ischaemia and fixation times are not
  carried.
