# Pancreatic carcinoma resection — all pancreatectomies (Phase 52)

Template `pancreas_carcinoma` (kind `cancer resection`, system Hepatobiliary), renamed
"Pancreatic carcinoma resection", schema version 2026.10. Built 2026-09-17 as the pancreatic
half of the Whipple pair (with `ampulla_carcinoma`; both share `generators/_whipple.js`) and
extended 2026-10-03, at the user's request, from pancreatoduodenectomy to the other
pancreatectomies. This file also records the house departures shared by the pair (the
`whipple-pair.md` file the ampulla generator used to cite was never written).

## Sources

- CAP Protocol for the Examination of Specimens From Patients With Carcinoma of the Pancreas
  (Exocrine), version 4.3.0.0 (June 2025):
  https://documents.cap.org/documents/New-Cancer-Protocols-June-2025/Panc.Exo_4.3.0.0.REL_CAPCP.pdf
  — element order, procedure list, margins, regional nodes for body and tail (common hepatic
  artery, coeliac axis, splenic artery, splenic hilum), extension to the spleen or adrenal not
  changing pT, and the 12-node recommendation for pancreatoduodenectomy.
- RCPath G091, Dataset for histopathological reporting of carcinomas of the pancreas, ampulla
  of Vater and common bile duct:
  https://www.rcpath.org/static/34910231-c106-4629-a2de9e9ae6f87ac1/G091-Dataset-for-histopathological-reporting-of-carcinomas-of-the-pancreas-ampulla-of-Vater-and-common-bile-duct.pdf
  — left pancreatectomy with or without the spleen; transection margin and anterior and
  posterior surfaces painted and sagittal slicing; total pancreatectomy sliced axially in the
  head and sagittally in the body and tail; node stations 8 to 11.
- ICCR Carcinoma of the Exocrine Pancreas, 1st edition:
  https://www.iccr-cancer.org/wp-content/uploads/2025/08/ICCR-Pancreas-1st-edn-v1-bookmark.pdf
  — procedures including distal and total pancreatectomy, extended resections, splenic and
  splenic-vessel invasion; no node minimum established for distal pancreatectomy.
- Sahakyan, Verbeke et al. 2021, distal pancreatectomy margins:
  https://pmc.ncbi.nlm.nih.gov/articles/PMC8677636/ — the posterior (dissection) margin is
  the one most often involved.
- Jiang et al. 2026, distal pancreatectomy grossing:
  https://www.xiahepublishing.com/2835-3315/CSP-2026-00001 — transection margin, splenic
  vessels and spleen documented.
- House QMH pancreas template:
  https://awiloqmh.github.io/CancerReportingTemplate/GI-Pancreas.html — the procedure list
  includes enucleation and partial pancreatectomy; partial pancreatectomy reports proximal and
  distal pancreatic parenchymal margins and other margins; enucleation reports the pancreatic
  parenchymal margin and other margins. The margin labels follow this page.

## Operations

`procedure` options, in order: Pancreaticoduodenectomy (Whipple resection), Pylorus-preserving
pancreaticoduodenectomy, Distal pancreatectomy, Total pancreatectomy, Central pancreatectomy,
Excisional biopsy (enucleation), Other, Not specified.

`_whipple.js` maps each option to an operation (`procedureKind`): `pd`, `total`, `distal`,
`central` or `enucleation`. Other and Not specified stay `pd`, which is what the template
reported before. The two CAP "Partial pancreatectomy" options (body, tail) are retired from the
list; a saved draft that still holds one reads as `distal` and prints its old wording.

| Operation | Specimen line opens with | Margins (print order) | Node stations shown |
|---|---|---|---|
| Pancreatoduodenectomy | Pancreas and duodenum | neck, bile duct, uncinate, posterior surface, proximal, distal, other | 8, 12, 13, 14, 17 |
| Total pancreatectomy | Pancreas, duodenum and spleen (or Pancreas and duodenum) | bile duct, uncinate, posterior surface, proximal, distal, other | all |
| Distal pancreatectomy | Pancreas and spleen (or Pancreas) | proximal pancreatic parenchymal, posterior surface, other | 8, 9, 10, 11 |
| Central pancreatectomy | Pancreas | proximal and distal pancreatic parenchymal, other | 8, 11 |
| Enucleation | Pancreas | pancreatic parenchymal, other | 8 |

Station 8 shows for every operation; a station left blank never prints.

- **Spleen** (`spleen`): asked for distal and total pancreatectomy only — "Included
  (splenectomy)" or "Not included (spleen-preserving)". It names the organs, the operation
  ("distal pancreatectomy and splenectomy", "spleen-preserving distal pancreatectomy"), the
  synoptic Procedure value ("Distal pancreatectomy with splenectomy", "Distal pancreatectomy,
  spleen-preserving") and shows the spleen measurements and weight.
- **Other margin** (`otherMargin`, `otherMarginName`): prints under its typed name (for
  example "Splenic vein transection margin") in the synoptic and the diagnosis.
- **Additionally resected organs or structures** (`extendedResection`): vein segment, coeliac
  axis, common hepatic artery, left adrenal gland, stomach, colon, left kidney, other. Prints
  as one row after Procedure when ticked.
- **Origin** (periampullary assignment) shows and is checked only for a pancreatoduodenectomy,
  or a total pancreatectomy whose site includes the head or uncinate process.
- **Macro**: the Whipple macro is unchanged. The other operations name the specimen, the
  pancreas (and duodenum, bile duct and gastric cuff for a total, the spleen when taken), then
  the inking and slicing per RCPath G091, the tumour, the duct dilatation (bile duct only when
  the head is taken) and a node sentence: stations dissected separately (total), splenic hilar
  and peripancreatic (distal with splenectomy), peripancreatic (distal without; central and
  enucleation only when nodes were examined).
- **Diagnosis head**: the organs are upper-cased whole, so "PANCREAS, DUODENUM AND SPLEEN, …"
  keeps its comma.

## Checks

- Required margins follow the operation: neck (pancreatoduodenectomy); uncinate
  (pancreatoduodenectomy and total); proximal pancreatic parenchymal (distal and central);
  distal pancreatic parenchymal (central); pancreatic parenchymal (enucleation).
- Fewer than 12 nodes warns only when the head is taken (pancreatoduodenectomy and total); no
  minimum is set for the other operations.
- A tumour site in the head with a distal pancreatectomy warns.
- Splenic invasion recorded with a preserved spleen warns.
- An unnamed other margin, or an unspecified "Other" additional resection, warns.
- Staging is unchanged: pT1-pT3 follow size alone, and extension to the spleen, splenic
  vessels, adrenal, colon or kidney now raises the same "does not alter pT" note as the other
  extrapancreatic sites.

## Intake

- Routing: lines naming distal, left, subtotal, central, total pancreatectomy, enucleation,
  RAMPS or the pancreatic body and tail reach the template; `procedure` and `spleen` are filled
  by ordered maps (total before central before enucleation before distal; spleen-preserving
  before spleen).
- **Deliberate change**: `specimenName` is now filled from the whole LIS line when it has a
  comma, so the diagnosis head reads as requested. Before, only the middle piece of the line
  was kept (for example "whipple specimen"). A line without a comma keeps the generated name.

## House departures shared with the ampulla template

- The "- Tumour histology:" paragraph follows "- Histologic grade:" (all synoptic templates).
- Treatment-effect strings are the house CAP TRG variants (score 0-3); any response adds the y
  descriptor.
- Margin distances are in mm; tumour size stays in cm as in the protocol; British spelling.

## Tests and fixtures

`tests/pancreas_carcinoma.test.js` pins the operations, margins, macro, checks and form
visibility; new golden fixtures `tests/fixtures/whipple/pancreas-04` to `pancreas-08` (distal
with splenectomy, spleen-preserving distal, total with splenectomy, central, enucleation). The
pancreatoduodenectomy fixtures are unchanged. `tests/intake.test.js` pins the routing and the
fills.

## Limitations

- The frozen-section margin prefill still maps to the Whipple margins (neck, bile duct); a
  frozen pancreatic transection margin is not yet carried to a distal pancreatectomy.
- An en bloc resection line naming a colectomy routes on the clinical history; without a
  pancreatic history it goes to the colorectal template.
- The house diagnosis form for pancreatic resections (dash lines, lower-case organ joins) is
  not yet adopted; the template keeps the synoptic diagnosis used by the Whipple pair.
