# Cervical polyps and endometrial aspirates (Phase 53)

Status: **built 2026-10-05**, at the user's request: "improve description for cervical polyp
(usually they are endocervical polyps), in which case the diagnosis line should also say
'endocervical polyp'. you may also want to include decidual polyps. for endometrial aspirates, I
prefer for it to say endometrial aspirate in the diagnosis line too, rather than seeming to default
to 'curettings' each time. not all aspirates are performed by pipelle biopsy. also, I dont think it
is necessary to follow the main diagnosis with 'no evidence of hyperplasia or malignancy' as it is
repetitive and already implied."

Templates `cervical_biopsy` and `endometrial_biopsy` (schema version 2026.10), with a routing
change to `cervical_excision` (2026.10). The hysterectomy form (`generators/uterus.js`) is
unchanged and still closes its endometrial clause with "no evidence of hyperplasia or malignancy".

## Sources

- PathologyOutlines, Cervix — Endocervical polyp:
  https://www.pathologyoutlines.com/topic/cervixendocervpolyp.html — polypoid fibrovascular core
  with thick-walled vessels, endocervical glands (often cystic), squamous metaplasia, surface
  erosion and chronic inflammation.
- Decidual polyps of the cervix, a clinicopathological series:
  https://pmc.ncbi.nlm.nih.gov/articles/PMC9158793/ — stromal decidualisation (abundant
  eosinophilic cytoplasm, well-defined cell borders), with surface erosion and inflammation in
  most; seen in pregnancy and with progestogens.
- Released reports in the 2021-2026 biopsy file and the 2024-2026 LIS export, measured by
  `analysis/cervix-endometrium-profile.py` (counts only, nothing printed):
  - cervical polyps are signed out "ENDOCERVICAL POLYP" in the large majority, mostly with nothing
    after it; decidual and endometrial polyps are a small minority; the commonest exact head is
    "CERVIX, POLYPECTOMY". Their microscopy names glands, columnar epithelium, a fibrovascular
    stroma, inflammation and dilated or cystic glands most often, and almost always ends on no
    malignancy;
  - endometrial heads name an aspiration or an aspirate in most parts, curettings rarely and
    Pipelle almost never; a benign phase or polyp line rarely carries a trailing negative.

## As built — cervical polyps

- Two fields follow the specimen name when the type is "Cervical polyp": Polyp type (Endocervical
  polyp, the default; Decidual polyp; Endometrial polyp) and Polyp features (cystically dilated
  glands and chronic inflammation ticked by default; thick-walled vessels, squamous metaplasia,
  surface erosion). The biopsy tissue picker no longer shows for a polyp.
- Microscopy opens on the polyp itself:
  - endocervical: "Sections show a polypoid piece of tissue composed of endocervical glands, some
    cystically dilated, lined by mucinous columnar epithelium and set in a fibrovascular stroma with
    a chronic inflammatory infiltrate.";
  - decidual: the stroma "replaced by sheets of decidualised cells with abundant eosinophilic
    cytoplasm, well-defined cell borders and bland round nuclei", then scattered endocervical
    glands;
  - endometrial: "irregularly spaced endometrial-type glands … set in a fibrous stroma with
    thick-walled vessels";
  - a surface sentence follows when squamous metaplasia or erosion is ticked. The biopsy sentences
    ("The squamous epithelium shows normal maturation and no CIN is seen", "The endocervical glands
    are unremarkable") are not printed on a polyp; the closing negative stays.
- Diagnosis: "CERVIX, polypectomy - ENDOCERVICAL POLYP" (or DECIDUAL POLYP, ENDOMETRIAL POLYP), with
  no trailing negative. A lesion comes first ("… (LSIL / CIN I AND HPV EFFECT); ENDOCERVICAL
  POLYP"); a second benign finding follows the type. A benign pick that repeats the type
  ("Endocervical polyp", or "Decidual change" on a decidual polyp) is dropped.
- A biopsy with "Endocervical polyp" as its benign finding keeps the biopsy line; its sentence now
  describes the polypoid fragment.

## As built — endometrial aspirates

- Specimen types: Endometrial aspirate (new, the default and the first part's default), Endometrial
  curettings, Endometrial biopsy (replaces "Endometrial biopsy (Pipelle)"), Hysteroscopic biopsy,
  Endometrial polypectomy, then the four products-of-gestation types. Help: "Aspirate covers
  Pipelle and the other suction samplers." A saved draft holding the retired Pipelle option prints
  as an aspirate.
- Specimen line "Endometrium, aspirate"; diagnosis head "ENDOMETRIUM, aspirate" (or curettings,
  biopsy, hysteroscopic biopsy, polypectomy). The example case is now an aspirate.
- Diagnosis: a benign line ends with its finding ("ENDOMETRIUM, aspirate - PROLIFERATIVE
  ENDOMETRIUM"; "… ENDOMETRIAL POLYP; background proliferative endometrium"; "… (scanty sample)").
  "; no evidence of atypia or malignancy" after hyperplasia without atypia is dropped too. Kept:
  "; no evidence of invasive carcinoma in the fragments examined" after atypical hyperplasia, and
  "; no evidence of gestational trophoblastic disease" on a gestational part (it was "; no evidence
  of hyperplasia, gestational trophoblastic disease or malignancy"). The microscopy keeps its
  closing negatives.

## Intake

Recorded in `docs/specs/specimen-intake.md` ("Cervical polyps and endometrial aspirates").

## Tests and fixtures

- New: tests/cervical_polyps_endometrial_aspirates.test.js.
- Deliberate updates: tests/cervical.test.js (polyp head, microscopy and diagnosis),
  tests/endometrial_cycle_phases.test.js (no trailing negative), tests/products_of_gestation.test.js
  (type list and default, the gestational clause, the intake fills).
- Golden fixture regenerated deliberately through the test's --update path, with the reason in its
  `description`: tests/fixtures/products_of_gestation/04-curettings-chorionic-villi.json (diagnosis
  line only). The intake fixture is unchanged.

## Limitations

- A polyp's site words are kept as written; a line that repeats the procedure among them (for
  example "polyp at 12 o'clock") prints it in the head, which the pathologist edits.
- "ENDOMETRIUM, aspirate" follows the form's head pattern; the released heads also use
  "ENDOMETRIUM, ASPIRATION" and "ENDOMETRIAL ASPIRATE". A different head is a one-line change if
  preferred.
