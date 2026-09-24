# Diagnosis connectors — lower-case "with" in every template

User request, built 2026-09-24: "Do both of them", in reply to "switch the duodenal template (or all templates) to lower-case "with"". This follows the colonic polyp change of the same day ("TUBULAR ADENOMA with LOW GRADE DYSPLASIA", 8b6581a). The reason is the same: each capitalised term codes separately in SNOMED.

## Rule

- Between capitalised terms the connector is lower case: "TUBULAR ADENOMA with LOW GRADE DYSPLASIA", "UTERUS with CERVIX AND BILATERAL ADNEXA".
- An article after it is lower case too: "ADENOCARCINOMA with a LEPIDIC PATTERN", "with an ...".
- The qualifier phrases are never in capitals. They take sentence case when they open a clause (at the start of the block or a line, or after "- "): "In keeping with", "Consistent with", "Compatible with". After a comma they are lower case: "METASTATIC ADENOCARCINOMA, consistent with LUNG PRIMARY".
- "WITHOUT" and "AND" are left as they are.

## Evidence

Counts only, from the released diagnoses: the 2021-2026 biopsy export (9325), the 2024-2026 LIS export (4546) and the 2021-2026 frozen export (598).

| Pattern | Biopsy | LIS | Frozen |
|---|---|---|---|
| Capitalised term, "with", capitalised term: lower : UPPER | 1543 : 30 | 390 : 15 | 6 : 2 |
| "ADENOMA(S) with LOW / HIGH GRADE DYSPLASIA": lower : UPPER | 1218 : 21 | 300 : 13 | — |

- The qualifier phrases occur 998 times across the three exports, and none of them is in capitals.
- Opening a clause, they are in sentence case 669 times and lower case 20 times.
- After a comma, they are in lower case 251 times and sentence case 0 times.

## Where it applies

- The rule is `houseConnectors()` in `src/style.js`, called once in `generateCase` (`src/engine.js`). It runs after each part's line, the linked-pair head and the case summary have been assembled. It runs before the LIS merge and before typed edits.
- It changes the printed diagnosis only. Option labels, generator strings and saved values are not changed, so no saved case is orphaned. British spelling works in the same way.
- A typed edit of the diagnosis block prints as typed.
- The macroscopic, microscopy and comment blocks are not touched. A sweep of every template found capital "WITH" only in the diagnosis.
- Sentence-case mode (`uppercaseDx: false`) is unchanged.
- Entity names that contain "with" follow the rule too, for example "NON-INVASIVE FOLLICULAR THYROID NEOPLASM with PAPILLARY-LIKE NUCLEAR FEATURES (NIFTP)". None of the three exports has a released NIFTP line to compare against.

## Before, by template

A single-option sweep at 455861f found capital "WITH" in the diagnosis of 25 templates. "CONSISTENT WITH" appeared in two of them, lymph node FNA and effusion cytology. After the change the same sweep finds none. Examples of the old output:

- "DUODENAL MUCOSA WITH NO SIGNIFICANT HISTOLOGICAL ABNORMALITY"
- "ACUTE APPENDICITIS WITH PERIAPPENDICITIS"
- "BRONCHIAL MUCOSA WITH SQUAMOUS METAPLASIA"
- "UTERUS WITH CERVIX AND BILATERAL ADNEXA"
- "METASTATIC ADENOCARCINOMA, CONSISTENT WITH LUNG PRIMARY"

## Tests

- `tests/house_connectors.test.js` has three parts:
  - unit cases for the rule, covering lower case, the article, the qualifier by position, and WITHOUT and AND left as they are;
  - a sweep of every template and every single option value, which asserts that no capital "WITH", capital qualifier or capital article reaches the diagnosis;
  - a typed edit printing as typed.
- The expectations in 17 test files were updated line by line.
- Browser check: "a pasted frozen sentinel node prints its side, or none with a Checks prompt; "with" is lower case" (duodenal adenoma).

## Fixtures changed deliberately

The reason is recorded in each fixture's new `description`. Each was regenerated through its own test's `--update` path, which now keeps an existing description, and each diff was checked to contain only the connector:

- breast_ca/05: "NO SPECIAL TYPE with MEDULLARY PATTERN"
- cytology/04 and 05: ", consistent with LUNG PRIMARY"
- endometrium/01-06 and ovary/02, 06: "UTERUS with CERVIX"

The agreed example in `docs/specs/synoptic-layout.md` was updated to match.

## Not changed

- "WITHOUT" still prints in capitals in six templates, for example "ENDOMETRIAL HYPERPLASIA WITHOUT ATYPIA" and "UTERUS WITHOUT CERVIX".
- The released reports write "ENDOMETRIAL HYPERPLASIA without atypia" (9 of 9), with the negated term in lower case as well. That is a different rule, so it is recorded in Later.
