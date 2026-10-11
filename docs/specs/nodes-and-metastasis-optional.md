# Lymph nodes and distant metastasis — optional elements

Status: pulled by the user 2026-10-11 ("for large resections with staging, the microscopic examination always puts in 'Lymph nodes - Regional lymph nodes: None submitted (0 examined) / Distant metastasis - Distant metastasis: Not applicable' as a default, with the staging as NX. I would like these to be optional elements, with a checkbox to make them print … with staging omitting the N and M status unless it has a clear input"). Built 2026-10-11 (Phase 67).

## Rules

1. **Lymph nodes section.** Prints when a regional lymph node was examined, or when nodal disease is recorded without nodes: tumour deposits in colorectal and appendiceal carcinoma (pN1c), and internal mammary, infraclavicular or supraclavicular nodes in breast carcinoma. With no node examined the section is left out.
2. **Distant metastasis section.** Prints when a metastasis is recorded (pM1) or the printed value is anything other than "Not applicable", "Not identified" or blank. A named site and "Cannot be determined" always print. Since many templates default to "Not identified", that value counts as a negative.
3. **pN.** With no regional node examined the protocol still returns NX, so stage groups that treat NX as N0 (GIST, a lung wedge) still print. pN is left out of the printed pTNM in the synoptic block and on the diagnosis line. pNX still prints in three cases: nodes were examined but the involved count is missing (a real gap), the user typed it as a pTNM override, or a prior specimen supplied a node category (lung completion lobectomy). A prior pNX adds nothing.
4. **pM.** Unchanged: only pM1 prints. "pM0" and "pMX" are never printed.
5. **Footer option.** The case option "Print the lymph node and distant metastasis sections when none are recorded" (`printNodesMets`, default off) appears under the form in the 17 staging templates, next to the pTNM and stage-group options. When ticked, the placeholder sections print as before ("Regional lymph nodes: None submitted (0 examined)", "Distant metastasis: Not applicable"). It does not bring pNX back.
6. **Skin SCC and oral carcinoma.** These already printed nothing for a blank node count or "Not applicable", and still don't. With the option ticked, "None submitted (0 examined)" prints once 0 is entered, and "Not identified" prints once it is selected.
7. **Checks.** Unchanged. The notes "No regional lymph nodes submitted; pN not assigned." and their protocol equivalents still appear under Checks, so an unstaged N stays visible to the pathologist without printing in the report.

## Why a footer option

The other print toggles for staging ("Print the AJCC 8th edition pTNM block", "Print the AJCC stage group under the pTNM") already sit in the case footer, and a case option is saved with the case. A field in each template's lymph node group would add the same control to 17 forms. The option is per case, so it applies to every synoptic part in that case.

## Implementation

- `src/staging/index.js`: `deriveTNM` returns `noNodes` from the protocol's `N()` (`none: true` on the no-node branch) and leaves pN out of `tnm` when `noNodes`, the category is NX and there is no override. `showNodes(st, ctx)` and `showMets(st, ctx, value)` decide the two sections.
- `src/staging/*.js`: `none: true` on the no-node branch of `N()` in 16 protocols (lung only when no station was rejected; skin SCC and oral also on their unstaged-site branches).
- 17 generators gate the two sections; `schemas/_shared.json` defines `printNodesMets`; the 17 staging schemas list it after the pTNM or stage-group option and move to version 2026.10.
- Tests: `tests/nodes_mets_optional.test.js`. Unit tests in 17 files and the agreed examples in `docs/specs/synoptic-layout.md` (rule 9) were updated. Fifty golden fixtures were edited deliberately, with the reason in each `description`: 46 metastasis placeholders, 16 empty node sections and 22 pNX tokens were removed by exact string edits.
