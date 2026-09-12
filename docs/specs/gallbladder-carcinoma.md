# Gallbladder carcinoma resection — Built (Phase 13)

Template `gallbladder_carcinoma` (kind `cancer resection`, system Hepatobiliary). Built
2026-09-12 against the saved QMH GI page `docs/reference/GI-Gallbladder.html`
(source: https://awiloqmh.github.io/CancerReportingTemplate/, Gallbladder carcinoma). The
placeholder is retired from `templates/planned.json`.

## Decisions

- **Element order = the QMH page**, pinned by `tests/gallbladder.test.js`. House exception:
  `- Tumour histology:` prints after the grade. The page's MiNEN option was normalised to
  British spelling ("tumour") and the stray leading space on the small-cell option removed.
- **Staging** `src/staging/gallbladder.js` (AJCC 8th). Wall-level ranks give T1a / T1b /
  T2a (peritoneal side) / T2b (hepatic side, planned deliberately ahead of this card) / T3
  (serosa perforation; liver or one adjacent organ); the main portal vein / hepatic artery
  row is evaluated before the organ rows and grades T4. Direct invasion of two or more
  organs grades T4 (the module counts the liver as one organ — see note below). N: 1-3 N1,
  ≥4 N2; 0 examined leaves pN unassigned. Stage table: I / IIA / IIB / IIIA / IIIB / IVA /
  IVB split on N2 and M1.
  - **Known divergence to review**: AJCC 8 read literally, "two or more extrahepatic organs"
    excludes the liver (covered by T3). The staging module currently counts the liver as one
    organ toward T4, i.e. liver + one extrahepatic organ prints pT4 rather than pT3. Pinned
    by `tests/staging-gallbladder.test.js`; revisit with the user before changing.
- **Size in cm.** The QMH gallbladder page records "Tumour size (Aggregate Size of all
  Invasive Foci) (cm)" in centimetres — unlike the other GI pages the schema keeps cm and the
  diagnosis prints e.g. "3.5 cm". Review whether to convert to mm at the next template review.
- **Treatment effect** strings are the house CAP TRG mixes (score 0-3, NOS variant); any
  response beyond "No known presurgical therapy" adds the y descriptor automatically.
- **Morphology module** `generators/gallbladder_morphology.js`: per-type WHO 2019 sentences
  (Pathology Outlines gallbladderipn for ICPN / ICTN; the biliary-tree synopsis at
  clinicalgate.com/tumors-of-the-biliary-tree-pathologic-features for the pancreatobiliary,
  intestinal, mucinous, clear-cell, signet-ring, adenosquamous and MCN wording; WHO NEN
  wording for LCNEC / SCNEC / MiNEN). Prints in the derived histology paragraph only for a
  real type (suppressed for pT0 and typed notes). `Adenocarcinoma` (unspecified) shares the
  biliary-type sentence.
- **Checks**: radial (hepatic-bed) margin required / assessable for T2b; simple cholecystectomy
  with invasion beyond the muscular layer → completion radical cholecystectomy note
  (incidental carcinoma); cystic duct margin involved → re-resection of the stump / bile duct;
  hepatic parenchymal margin "not applicable" on a radical resection; fewer than 6 nodes;
  ENE unrecorded with positive nodes; nodal cross-checks; score-0 response without the pT0
  extension tick.
- **Benign upgrade**: `generators/gallbladder.js` exports `UPGRADE_TO`
  (`to: gallbladder_carcinoma`) for adenocarcinoma / intracholecystic papillary neoplasm on
  the benign cholecystectomy record. Specimen name carries over; the map seeds the
  pancreatobiliary ? or ICPN type, cystic-duct high-grade BilIN, metastatic cystic node
  counts and the additional-findings ticks (stones, cholecystitis, metaplasia). Procedure
  seeds as simple cholecystectomy — promoted to radical by the user if the case is re-excised.

## Microscopy paragraph

Derived: grade + histType, the extension clause (hepatic-side / peritoneal-side wording
preserved), then the per-type morphology sentence; the diagnostic clause prints
"ADENOCARCINOMA, BILIARY TYPE …" style in the specimen diagnosis with size in cm.
