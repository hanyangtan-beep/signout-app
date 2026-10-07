# Cervical cytology cell descriptions and reference gallery (Phase 55)

Status: **built 2026-10-07**, pulled by the user: "i feel like the cytological descriptions for
cervical cytology could be much better. please do research, and also prepare a reference gallery."

Template `cervical_cytology` (schema version 2026.10), generator `generators/cytology.js` (cervical
section). The other five cytology templates are unchanged; their fixtures (01–06) are byte-identical.
Criteria, sources and image credits: `docs/reference/cervical_cytology-morphology.md`.

`schemas/cervical_cytology.json` is hand-edited from this phase on. `scripts/gen-cytology-schemas.py`
skips it, and its own copy of the cervical fields is out of date (it still offers Koilocytes).

## Problem

Before this phase the microscopy named the Bethesda category and nothing else ("Atypical squamous
cells of undetermined significance are present."). Koilocytes sat among the organisms, so an LSIL
could be signed without its defining change, and there was no way to say what the abnormal cells
looked like.

## As built — fields

All new fields sit after `glandularOrigin` in the Category group. Each list shows only for its
category; hidden values are kept but never printed. Defaults fill fresh parts only.

| Field | Shows for | Default ticks |
| --- | --- | --- |
| `extent` (Occasional / A few / Scattered / Numerous) | ASC-US, ASC-H, LSIL, HSIL, HSIL-inv, SCC | Scattered |
| `ascusFeatures` | ASC-US | mild nuclear enlargement, slightly raised N:C ratio, mild hyperchromasia |
| `aschFeatures` | ASC-H | immature metaplastic-type cells, single cells, small groups, high N:C ratio, hyperchromasia |
| `lsilFeatures` | LSIL | koilocytosis, nuclear enlargement, hyperchromasia, irregular outlines, binucleation |
| `hsilFeatures` | HSIL, HSIL-inv | single cells, syncytial aggregates, high N:C ratio, hyperchromasia, irregular membranes, coarse chromatin |
| `invasionFeatures` | HSIL-inv | tumour diathesis |
| `sccFeatures` | SCC | single cells, syncytial aggregates, high N:C ratio, coarse chromatin, prominent nucleoli, tumour diathesis |
| `agcFeatures` | AGC and AGC favour neoplastic, origin not endometrial | crowded sheets and strips, nuclear overlap, enlarged nuclei, mild hyperchromasia |
| `agcEndometrialFeatures` | AGC and AGC favour neoplastic, origin endometrial | small groups, enlarged nuclei, mild hyperchromasia, vacuolated cytoplasm |
| `aisFeatures` | AIS | crowded sheets and strips, feathering, elongated pseudostratified nuclei, hyperchromasia, mitoses, apoptotic bodies |
| `adenoFeatures` | Adenocarcinoma | three-dimensional clusters, enlarged pleomorphic nuclei, prominent nucleoli |

Every list carries help text with the Bethesda 2014 criteria (sizes against an intermediate,
metaplastic or endocervical nucleus). The organisms list `features` loses Koilocytes and gains
cytomegalovirus changes, lymphocytic (follicular) cervicitis, reactive changes (radiation), keratotic
changes and tubal metaplasia, with help text.

## As built — wording

Microscopy order: adequacy sentence → cell description → organisms and findings → additional
findings → ancillary → HPV → closing interpretation. Defaults print (adequacy sentence omitted):

- ASC-US: "Scattered atypical squamous cells show mild nuclear enlargement, a slightly raised
  nuclear-to-cytoplasmic ratio and mild hyperchromasia. The changes are insufficient in degree or
  extent for a definitive interpretation of a squamous intraepithelial lesion."
- ASC-H: "Scattered small immature squamous cells of metaplastic type, present singly and in small
  groups, show a high nuclear-to-cytoplasmic ratio and hyperchromasia. The changes are insufficient
  for a definitive interpretation, but a high grade squamous intraepithelial lesion cannot be
  excluded."
- LSIL: "Scattered squamous cells of superficial and intermediate type show sharply defined
  perinuclear cavitation (koilocytosis), with nuclear enlargement, hyperchromasia, slightly irregular
  nuclear outlines and binucleation. Features are those of a low grade squamous intraepithelial
  lesion."
- HSIL: "Scattered small immature squamous cells, present singly and in syncytial aggregates, show a
  high nuclear-to-cytoplasmic ratio, hyperchromasia, irregular nuclear membranes and coarsely granular
  chromatin. Features are those of a high grade squamous intraepithelial lesion." HSIL-inv adds
  "There is also a granular necrotic (tumour) diathesis." and closes "… with features suspicious for
  invasion."
- SCC: "Scattered malignant squamous cells, present singly and in syncytial aggregates, show a high
  nuclear-to-cytoplasmic ratio, coarsely clumped chromatin and prominent nucleoli. The background
  shows a granular necrotic (tumour) diathesis. Features are those of squamous cell carcinoma."
- AGC: "Atypical glandular cells are present in crowded sheets and strips. The cells show nuclear
  overlap, enlarged nuclei and mild hyperchromasia. The atypia exceeds reactive change but falls short
  of adenocarcinoma in situ or invasive adenocarcinoma." Endocervical origin names "endocervical
  adenocarcinoma in situ"; endometrial and extrauterine origins fall short "of adenocarcinoma".
  Favour neoplastic closes "The features are suspicious for, but fall short of, …".
- AGC, endometrial: "Atypical endometrial cells are present in small groups. The cells show scant,
  vacuolated cytoplasm, with slightly enlarged nuclei and mild hyperchromasia. …"
- AIS: "Abnormal endocervical cells are present in crowded sheets and strips, with peripheral
  feathering. The cells show elongated pseudostratified nuclei, hyperchromasia, mitotic figures and
  apoptotic bodies. Features are those of endocervical adenocarcinoma in situ."
- Adenocarcinoma: "Malignant glandular cells are present in three-dimensional clusters. The cells
  show enlarged pleomorphic nuclei and prominent nucleoli. Features are those of {origin}
  adenocarcinoma." (origin from `glandularOrigin`; NOS prints "adenocarcinoma").

The extent word leads the squamous sentence only; with every tick removed the old category sentence
returns. Each organism or finding prints one descriptive sentence, in option order, for example
"Trichomonas vaginalis is present, as pear-shaped cyanophilic organisms with eccentric nuclei and
eosinophilic cytoplasmic granules." Released prose only: no sizes, thresholds or sampling advice.

## As built — diagnosis line

- Cytomegalovirus joins the NILM organism suffix ("; cellular changes consistent with cytomegalovirus").
- HSIL-inv reads "HIGH GRADE SQUAMOUS INTRAEPITHELIAL LESION, with FEATURES SUSPICIOUS FOR INVASION (HSIL)".
- Adenocarcinoma and Other malignant neoplasm print no abbreviation tag.

## Checks

- An abnormal category with no description ticked → warning (the microscopy names the category only).
- HSIL-inv with no invasion feature ticked → warning.
- Koilocytes still ticked (a draft saved before 7 October 2026) outside LSIL → warning; under LSIL
  the legacy tick prints koilocytosis once.
- ASC-H, HSIL, HSIL-inv or SCC with a negative high-risk HPV result → warning (was ASC-H and HSIL).
- Glandular cells post hysterectomy with adequacy "Satisfactory" (transformation zone present) → warning.
- Removed: "LSIL without koilocytes".

## Drafts saved before this phase

The new fields are absent from old drafts, so nothing is added: the category sentence prints as
before, with the no-description Check. A legacy Koilocytes tick prints "Koilocytes are present."
outside LSIL and raises its Check.

## Galleries

- Interpretation: "Bethesda 2014 categories", nine groups (NILM, ASC-US, ASC-H, LSIL, HSIL,
  squamous cell carcinoma, AGC and its mimics, endocervical AIS, adenocarcinoma), three columns.
- Findings: "Organisms and non-neoplastic findings", twelve groups.
- 40 photos in `assets/reference/cervical_cytology/` (one shown in both galleries), each under
  150 kB, CC0 / CC BY / CC BY-SA / public domain only; credits and licences under each photo.

## Tests

- `tests/cervical_cytology_descriptions.test.js`: wording per category, invasion, AGC/AIS/adenocarcinoma
  by origin, legacy drafts, hidden lists, Koilocytes, organisms, Checks, visibility and defaults,
  galleries (every file used, size cap, licence allow-list).
- `tests/cytology.test.js`: the ROSE regex is now `/on-site|\bROSE\b/i` ("rosettes" matched the old
  one); the NILM microscopy string was updated on purpose.
- Fixtures 07 and 08 (`tests/fixtures/cytology/`) were regenerated on purpose: their abnormal
  categories now print a cell description. Each fixture `description` says so. Fixtures 01–06 are
  unchanged.
- Browser QA: a pasted LBC opens the form; HSIL follows its chips and extent; the negative-HPV Check;
  the endometrial AGC list; both galleries open with every photo loaded.
