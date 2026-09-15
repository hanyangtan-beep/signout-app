# New template — scaffold and research brief

The two halves of building a template. `scripts/new-template.mjs` writes the boilerplate; a
research subagent fills the histology. Neither writes the printed wording — that is curated by
hand against the report-register rule.

## 1. Scaffold

```
node scripts/new-template.mjs <id> --system <S> --kind <K> \
     --name "Pancreatic biopsy" --label Pancreas --organ PANCREAS \
     [--short "Pancreas · biopsy"] [--rank 40] [--aliases "EUS-FNB,IPMN"] \
     [--generator <name>] [--qmh path/to/saved-page.html] [--force]
```

`--system` is one of GI, Hepatobiliary, GU, Gynae, Breast, Thoracic, Head and neck, Skin,
Cardiovascular, Lymphoid, Soft tissue, Endocrine, Frozen, Cytology. `--kind` is one of
`biopsy`, `benign resection`, `cancer resection`, `frozen`, `cytology`. `--label` is the short
header word and must be an organ, never a procedure or lesion name.

It writes `schemas/<id>.json`, `generators/<id>.js`, `tests/<id>.test.js`,
`tests/fixtures/<id>/`, and rebuilds the manifest. It refuses to overwrite an existing schema,
generator or test unless you pass `--force`.

What the kind changes:

- **benign resection / cancer resection** — adds the Macroscopy field group, the `macro` and
  `blockKey` exports wired to `letteredBlockKey`, the `macro` case option and a `blocks`
  `macroExtract` rule.
- **cancer resection** — adds the `source` block, the `synopticOnly` / `printPTNM` /
  `stageGroup` options, and `synoptic` / `validate` stubs. Note the engine calls `synoptic()`
  *instead of* `microscopy()`, so the narrative paragraph lives inside `synoptic` above the
  element list; the scaffold wires that for you.

With `--qmh` it runs `tools/import-qmh.js` over a saved CancerReportingTemplate page and leaves
`schemas/<id>.qmh-draft.json` beside the schema. Curate it into house field ids by hand, then
delete the draft.

Every `TODO` the scaffold leaves is a decision it could not make.

## 2. Research brief

Delegate the histology to one research subagent. Paste this, filling the brackets.

> Research the morphology of **[LESIONS]** in **[ORGAN] [SPECIMEN TYPE]** specimens, for a
> diagnostic reporting template.
>
> For each entity return: the defining architectural and cytological features as seen down the
> microscope; the grading or classification scheme in current use and the exact criteria that
> separate its tiers; the immunohistochemical panel that is actually run, with the expected
> pattern; and the features a report is expected to state (margins, depth, lymphovascular
> invasion, and so on).
>
> Sources must be authoritative — the WHO Classification of Tumours series, the CAP protocols,
> the Royal College of Pathologists datasets, the ICCR datasets, or peer-reviewed reviews.
> Every morphological statement must carry a markdown link to the exact URL it came from.
> Where sources disagree, say so rather than picking one. Where a value cannot be confirmed,
> write "n.a." — do not fill it from memory.
>
> Return one markdown report. Do not write code or touch the repository.
>
> [If a QMH page applies:] The element list is fixed by
> https://awiloqmh.github.io/CancerReportingTemplate/[PAGE] — research the morphology behind
> those elements, not a different element set.

Save the report to `docs/reference/<id>-morphology.md` and commit it. It is the grounding
record; the wording in it is a draft, not report text.

## 3. Curate

1. Fill the schema fields from the brief. Options come from the classification scheme, not from
   free text.
2. Write the generator's printed sentences yourself. **Report-register rule**: released-report
   prose describing only what is seen. No WHO citations, no "by definition", no exclusion
   logic, no sampling advice, no epidemiology, no prognostic commentary, no numeric thresholds
   you inferred rather than read. Grounding and source URLs go in code comments and the source
   doc — never in a printed sentence.
3. Replace the scaffold's placeholder assertions with the wording you actually want. The tests
   are the contract; a fixture that moves later means the output changed.
4. `npm test`, then `npm run release`.
