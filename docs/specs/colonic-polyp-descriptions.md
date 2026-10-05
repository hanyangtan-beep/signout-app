# Colonic polyp descriptions and malignant polyp levels (Phase 54)

Status: **built 2026-10-05**, at the user's request: "for colonic polyp biopsies, the descriptions
for TSA/SSL as well as high grade dysplasia are lacking. I also want an option for haggitt/kikuchi
staging in the polyps with adenocarcinoma."

Template `colonic_polyp` (schema version 2026.10), generator `generators/colonic.js`. Diagnosis
terms are unchanged except the new focal line; the microscopy of the sessile serrated lesion,
traditional serrated adenoma and every high grade dysplasia changes.

## Sources

- UK Bowel Cancer Screening Programme, guidance on reporting lesions:
  https://www.gov.uk/government/publications/bowel-cancer-screening-reporting-lesions/bowel-cancer-screening-guidance-on-reporting-lesions
  — high grade dysplasia is diagnosed on architecture (complex crowding and irregularity, cribriform
  and back-to-back glands, intraluminal papillary tufting), supplemented by cytology (loss of
  polarity with stratification through the full thickness, markedly enlarged nuclei with prominent
  nucleoli, atypical mitoses, prominent apoptosis); cytology alone suffices only on a small
  superficial biopsy. SSL features: dilated crypt bases, serration at the crypt bases, branched
  crypts, horizontal extension of the crypt bases, herniation through the muscularis mucosae; one
  characteristic crypt is enough; dysplasia in an SSL "may be low or high grade in degree". Haggitt
  levels for polypoid and Kikuchi levels (sm1 2%, sm2 8%, sm3 23% nodal metastasis) for sessile
  malignant polyps; depth and width of invasion "should also be recorded, in millimetres".
- US Multi-Society Task Force 2020, malignant colorectal polyps:
  https://www.asge.org/docs/default-source/default-document-library/endoscopic-recognition-and-management-strategies-for-malignant-colorectal-polyps-recommendations-of-the-us-multisociety-task-force-2020-november-gie3e4a55681d27683997ebff000074820c.pdf?sfvrsn=dc6d3d5d_0
  — Haggitt (head, neck, stalk, below the stalk) is most useful for pedunculated polyps, level 4
  carrying a high risk of nodal metastasis; Kikuchi sm1 1-3%, sm2 8% and sm3 23%, sm2 and sm3 taken
  as indications for surgery; for non-pedunculated polyps a depth of 1 mm or more is a high-risk
  feature. The report should give the histological type, grade, extent of invasion, stalk and
  mucosal margins and lymphovascular invasion, with specimen integrity, size, morphology and
  budding suggested.
- WHO 2019 serrated lesions review (J Pathol Transl Med 2020):
  https://www.jpatholtm.org/upload/pdf/jptm-2020-04-15.pdf — architecturally distorted serrated
  crypts (dilatation of the basal third, horizontal growth along the muscularis mucosae as L-shaped
  or inverted T-shaped crypts); SSL dysplasia of intestinal (adenomatous) type (elongated,
  pseudostratified, hyperchromatic nuclei) or serrated type (cuboidal cells, eosinophilic cytoplasm,
  vesicular nuclei); grading dysplasia in serrated lesions "is not recommended"; TSA with slit-like
  serrations, ectopic crypt foci (not exclusive to or essential for TSA) and intense eosinophilic
  cytoplasm with pencillate nuclei.
- Traditional serrated adenoma morphology: https://pmc.ncbi.nlm.nih.gov/articles/PMC7303981/ —
  filiform or villiform growth, slit-like or flat-top serration, ectopic crypt formation, abundant
  eosinophilic cytoplasm and pseudostratified pencillate nuclei.
- Malignant polyp risk factors, meta-analysis: https://pmc.ncbi.nlm.nih.gov/articles/PMC9072497/
- RCPath dataset for colorectal cancer (G049):
  https://www.rcpath.org/static/c8b61ba0-ae3f-43f1-85ffd3ab9f17cfe6/G049-Dataset-for-histopathological-reporting-of-colorectal-cancer.pdf
- Released reports in the 2021-2026 biopsy file and the 2024-2026 LIS export, measured by
  `analysis/colonic-polyp-profile.py` (counts only, nothing printed):
  - 60 conventional adenoma diagnoses with high grade dysplasia, every one with a lower-case "with";
    22 say "focal". Of the 47 with their microscopy, 30 describe the dysplasia as focal; the
    features named most are back-to-back glands (16), stratification through the full thickness
    (15), enlarged or rounded nuclei (14), mitoses (12) and prominent nucleoli (11);
  - SSL and TSA parts are few. SSL microscopy names basal dilatation or the crypt bases and
    intestinal-type dysplasia most often; TSA microscopy names eosinophilic cytoplasm, pencillate
    nuclei and villiform architecture in every report, ectopic crypts in most and slit-like
    serrations in over half;
  - 37 malignant polyp diagnoses; of the 30 with their microscopy, 15 give a Haggitt level, 15 the
    muscularis mucosae, 19 lymphovascular invasion and 11 a measurement in mm or um. Kikuchi is
    rarely used.

## As built — descriptions

- Sessile serrated lesion, a tick list "SSL features" (basal dilatation and serration into the
  crypt base ticked by default; horizontal growth, branching, herniation through the muscularis
  mucosae): "Sections show large intestinal mucosa with architecturally distorted serrated crypts,
  which show basal dilatation and serration extending into the crypt bases, in keeping with a
  sessile serrated lesion / adenoma." The lesion is flat more often than polypoid, so the sentence
  does not say "polypoid piece". Then "No cytological dysplasia is identified." or the dysplasia.
- Dysplasia in a serrated lesion, "Dysplasia type" (intestinal (adenomatous) by default; serrated;
  not specified): "There is a focus of low grade dysplasia of intestinal (adenomatous) type, with
  elongated, pseudostratified, hyperchromatic nuclei." / "… of serrated type, with cuboidal cells,
  eosinophilic cytoplasm and enlarged vesicular nuclei." High grade: "There is a focus of high grade
  dysplasia of intestinal (adenomatous) type, showing …". The house grades it, as the released
  reports do.
- Traditional serrated adenoma, "TSA features" (all four ticked by default): "Sections show a
  polypoid piece of large intestinal mucosa with villiform architecture, slit-like serrations and
  ectopic crypt foci, lined by tall columnar cells with abundant eosinophilic cytoplasm and
  pencillate nuclei, in keeping with a traditional serrated adenoma with low grade dysplasia." A
  high grade TSA ends "… in keeping with a traditional serrated adenoma." and adds the high grade
  sentence with its type.
- High grade dysplasia, "High grade features" (cribriform / back-to-back glands, loss of polarity,
  and enlarged nuclei with prominent nucleoli ticked by default; glandular crowding, papillary
  tufting, pleomorphism, increased mitoses, atypical mitoses, luminal necrosis): printed as
  ", showing cribriform and back-to-back glands, loss of polarity with full-thickness nuclear
  stratification and markedly enlarged nuclei with prominent nucleoli" after the high grade
  dysplasia, in the list's order. Nothing ticked prints the plain sentence. "At least high grade
  dysplasia" uses the same description before its invasion caveat.
- "Focal high grade dysplasia" (conventional adenomas with high grade dysplasia): the microscopy
  keeps the low grade sentence and adds "There is focal high grade dysplasia, showing …"; the
  diagnosis reads "TUBULAR ADENOMA with focal HIGH GRADE DYSPLASIA".
- Drafts saved before the change have none of the new values and print the defaults, as the
  generator's other late fields do.

## As built — malignant polyp levels

- Haggitt (Not applicable, Level 1 head, 2 neck, 3 stalk, 4 below the stalk, Not assessable) and
  Kikuchi (Not applicable, sm1 upper, sm2 middle, sm3 lower third, Not assessable) show only on a
  polypectomy or EMR / ESD with invasive carcinoma. Saved values are unchanged.
- The recorded level is the depth sentence, in place of "Invasion extends into the submucosa.":
  "Invasion extends into the submucosa at the neck of the polyp (Haggitt level 2)." / "Invasion is
  confined to the upper third of the submucosa (Kikuchi level sm1)." Both levels share one sentence
  ("(Haggitt level 2; Kikuchi level sm1)"). The old trailing "The invasion corresponds to …"
  sentence is gone. Invasion into the muscularis propria prints no level.
- Not assessable: "The Haggitt level cannot be assessed on this specimen." / "The Kikuchi level
  cannot be assessed, as muscularis propria is not represented."
- Depth and width of submucosal invasion (mm, optional): "The depth of submucosal invasion is
  0.8 mm and the width of invasion is 3.5 mm." The measurement stays in the microscopy.
- Diagnosis: "…, moderately differentiated; submucosal invasion (Haggitt level 2); margin clear
  (3 mm); no lymphovascular invasion."
- Adverse features: Haggitt level 4 and Kikuchi sm2 or sm3 now set the malignant polyp risk comment,
  whose list reads "(poor differentiation, lymphovascular invasion, high grade tumour budding, deep
  submucosal invasion, or a margin of less than 1 mm)". A measured depth alone does not set it:
  whether 1 mm matters turns on the polyp's configuration, which the form does not record.
- Intake: the request line fills the specimen kind (EMR, ESD, mucosal resection or submucosal
  dissection; polypectomy, snare, or a polyp on a line without "biopsy" gives Polypectomy); anything
  else keeps "Biopsy of mass" (docs/specs/specimen-intake.md).

## Not changed

- The diagnosis term "SESSILE SERRATED LESION / ADENOMA". UK guidance and most released reports use
  "SESSILE SERRATED LESION"; a switch is offered to the user, not made.
- Dysplasia in a serrated lesion stays graded low or high, as UK guidance and the released reports
  grade it, although WHO 2019 does not recommend grading it.
- No intramucosal adenocarcinoma option: 14 of the 37 released malignant polyp diagnoses use it, so
  it is a candidate for a later card.

## Tests

- New tests/colonic_polyp_descriptions.test.js (schema and visibility, SSL, TSA, high grade and
  focal wording, Haggitt and Kikuchi sentences and diagnosis, not assessable, muscularis propria,
  depth and width, adverse-feature flag, intake fill).
- Deliberate wording changes: tests/colonic_carcinoma.test.js (at least high grade description;
  Haggitt / Kikuchi sentence). Golden fixtures edited deliberately, reason in each description:
  tests/fixtures/colonic/03, 05, 06, 07 and 08 (microscopy lines only; diagnoses unchanged).
- Browser QA: "colonic polyp: serrated and high grade descriptions; Haggitt level on a pasted
  polypectomy".
