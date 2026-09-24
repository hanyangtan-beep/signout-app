# Fallopian tube — ectopic pregnancy template

Status: **built 2026-09-24** (benign batch 2, the last card; pulled into Now by the user). This note records what was built and where it departs from the brief, which is kept unchanged at the end. Routing counts are in `docs/specs/specimen-intake.md` under "Benign batch 2 routing and pre-fill".

## As built

- New template `fallopian_tube_ectopic`: label "Ectopic", Gynae, kind benign resection, rank 50, listed after "Ovarian cyst" in the Gynae browse row. The side (Left, Right, Not stated) and the procedure (Salpingectomy, Partial salpingectomy, Salpingotomy, Tubal contents) sit in the case column.
- A salpingectomy or partial salpingectomy shows the tube fields: dimensions, tube length, luminal distension and its site, serosa, rupture site and fimbrial end. A salpingotomy or tubal contents shows the fragments in aggregate instead. Cut surface, foetal parts, a separate blood clot, the block count and the sampling apply to all four.
- Macroscopy, as in the contributed example (fixture 01): "Received in formalin is a distended segment of tubal tissue measuring 4 x 2 x 2 cm. A segment of left fallopian tube is identified measuring 5 cm long, and its lumen is distended, up to 2 cm across. The cut surface of the fallopian tube tissue shows extensive blood clot within the tubal lumen, as well as spongy material. The area of haemorrhage extends to the serosal surface. No foetal parts are grossly identified. 3 representative blocks." A salpingotomy opens "Received in formalin are fragments of haemorrhagic tissue".
- Block key: one entry per line, "(1) Uninvolved fallopian tube." then "(2)&(3) Haemorrhagic tubal tissue with distension.", with "&" for a pair and "-" for a run. A separate clot takes the last block, "(A1)" lettering appears only in a multi-letter case, and a typed key is normalised.
- Microscopy: chorionic villi (present, degenerate or not identified), implantation-site trophoblast, haemorrhage, wall disruption, the tubal epithelium and pre-existing disease (chronic salpingitis, salpingitis isthmica nodosa, endometriosis). It closes "There is no evidence of gestational trophoblastic neoplasia or other malignancies."
- Diagnosis:
  - "Left FALLOPIAN TUBE, salpingectomy - ECTOPIC TUBAL PREGNANCY", or "ECTOPIC TUBAL PREGNANCY with RUPTURE" when the serosa is ruptured or the wall disrupted;
  - "PRODUCTS OF GESTATION WITHIN THE TUBAL LUMEN" when chosen;
  - "PRODUCTS OF GESTATION, consistent with ECTOPIC TUBAL PREGNANCY" on a salpingotomy or tubal contents;
  - "(HAEMORRHAGE AND) IMPLANTATION-SITE TROPHOBLAST, consistent with ECTOPIC TUBAL PREGNANCY" without villi;
  - "NO CHORIONIC VILLI OR TROPHOBLAST IDENTIFIED; see comment".
  - Pre-existing tubal disease adds a lower-case clause each.
- Three comments are suggested automatically (ticked and tagged "suggested"; the user can untick them): no villi (operative findings and serial serum hCG), salpingotomy (persistent trophoblast, serial hCG until negative) and hydatidiform change (p57KIP2, ploidy or genotyping). Checks: villi not recorded (error), both clot options ticked, no villi, trophoblast or foetal parts, and a suspected mole.
- Spelling: every branch prints "foetal" and no output contains "fetal". Only the placenta keeps the Amsterdam "fetal", and the `src/style.js` and `tests/engine.test.js` comments now say so.
- The pending placeholder is removed from `templates/planned.json` (60 left).

## Departures from the brief

- The wording follows the contributed model report, not the brief's paraphrase of it: no container label, "No foetal parts are grossly identified." (the card's Accept line said "are identified"), "3 representative blocks" and "other malignancies".
- The diagnosis head is "Left FALLOPIAN TUBE", the house form in 5 of the 8 released ectopic parts, not "LEFT FALLOPIAN TUBE".
- "PRODUCTS OF GESTATION" replaces the brief's "PRODUCTS OF CONCEPTION" (house wording), and clauses are joined by semicolons (`docs/specs/diagnosis-connectors.md`).
- The salpingotomy and tubal-contents line is new: the brief had no diagnosis for a specimen without a tube.
- The comments are suggested automatically rather than picked by hand.
- The closing sentence keeps the model's "gestational trophoblastic neoplasia". Released reports usually say "no evidence of gestational trophoblastic disease" (87 to 1 across the biopsy file, 4 of 5 released ectopic reports); the user kept the model's wording on 2026-09-24.
- Intake: a line that names only the tube stays on the tube form of `uterus_benign`, even with an ectopic history, a line that names the ovary stays on `ovarian_cyst`, and uterine contents with "?ectopic" stay on Generic "choose".

## Grounding

RCPath, Tissue pathways for gynaecological pathology, V3, February 2023: section 10.2.4 (record the length and diameter, any rupture and the contents; sample the dilated portion, the non-dilated tube and any separate clot; document foetal tissue), section 10.3.3 (an implantation site, villi or foetal parts confirm an ectopic gestation; document pre-existing pathology) and section 11.1 (exclusion of gestational trophoblastic disease): https://www.rcpath.org/static/94763195-0982-40ed-bbc79ca92370e9ac/Tissue-pathways-for-gynaecological-pathology.pdf. NICE NG126 for the salpingotomy comment (serum hCG at 7 days, then weekly until negative): https://www.nice.org.uk/guidance/ng126/chapter/Management-of-tubal-ectopic-pregnancy. House forms were counted only in aggregate over the 8 released ectopic parts. The quotations sit in the generator's header comment and are never printed.

## Tests

`tests/fallopian_tube_ectopic.test.js` (19 tests) and four golden fixtures in `tests/fixtures/fallopian_tube_ectopic/`:

- 01, the contributed example (left salpingectomy, degenerate villi, haemorrhage to the serosa);
- 02, a left salpingectomy with no villi (the hCG comment and the Checks prompt);
- 03, a ruptured left salpingectomy;
- 04, a right salpingotomy.

`tests/formlayout.test.js` (packed forms 25 to 26) and `tests/picker.test.js` (the Gynae browse row gains "Ectopic") were updated deliberately. One browser check was added to `tools/qa-browser.js` (34 in all).

## Build brief (2026-09-10)

Build brief moved verbatim from the phased roadmap on 2026-09-10. The card in `docs/roadmap.md` carries the acceptance criteria; this file carries the full specification.

**Fallopian tube — ectopic pregnancy** (added 2026-09-10) — salpingectomy / salpingotomy for tubal ectopic (`fallopian_tube_ectopic`, Gynae, benign resection; reusable as a part in a uterus or adnexal case). Macroscopy: side, procedure (salpingectomy / partial salpingectomy / salpingotomy / tubal contents), tube length and maximal luminal distension, site of distension (ampulla / isthmus / fimbria / interstitial), rupture (serosal defect / haemorrhage to the serosal surface), cut surface (blood clot, spongy or villous material), foetal parts (house spelling `foetal`, as in the user's model report and released microscopy; corrected 2026-09-24), fimbria present, block count → `Received in formalin labelled 'Left fallopian tube' is a distended segment of fallopian tube measuring 5 cm in length, the lumen distended to 2 cm across (4 x 2 x 2 cm overall). The cut surface shows blood clot and spongy material within the lumen; the haemorrhage extends to the serosal surface. No foetal parts are identified. Three representative blocks.` Block key `(1) Uninvolved fallopian tube. (2)&(3) Haemorrhagic tubal tissue with distension.` Microscopy: chorionic villi (viable / degenerate / not identified — with the trophoblast-only and implantation-site caveats), intermediate trophoblast / implantation site, intraluminal haemorrhage, wall disruption / rupture, tubal epithelium (unremarkable / chronic salpingitis / salpingitis isthmica nodosa / endometriosis), background tube; mandatory closing sentence `There is no evidence of gestational trophoblastic neoplasia or other malignancy.` Diagnosis `LEFT FALLOPIAN TUBE, salpingectomy - ECTOPIC TUBAL PREGNANCY` (ruptured qualifier when applicable), with variants `PRODUCTS OF CONCEPTION WITHIN THE TUBAL LUMEN` and, when villi are absent, `HAEMORRHAGE AND IMPLANTATION-SITE TROPHOBLAST, consistent with tubal ectopic pregnancy` or `NO CHORIONIC VILLI OR TROPHOBLAST IDENTIFIED - see comment` with the hCG follow-up / persistent trophoblast comment. Snippets: no villi identified (clinical correlation and serial hCG), salpingotomy (residual trophoblast possible), hydatidiform change flag (p57 / ploidy). Contributed example report (2026-09-10) kept as the fixture.
