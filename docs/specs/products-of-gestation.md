# Products of gestation on the endometrial form

Status: **built 2026-09-24** (benign batch 2). The card in `docs/roadmap.md` is the spec; this note records what was built and where it departs from the card. Routing counts are in `docs/specs/specimen-intake.md` under "Benign batch 2 routing and pre-fill".

## As built

- `endometrial_biopsy` gains four specimen types after the endometrial ones: "Tissue mass", "Tissue mass, per vaginam", "Uterus, suction evacuation" and "Uterus, evacuation of retained products of gestation". Endometrial output is unchanged: the 8,781-combination output matrix is identical apart from the intended conception line below.
- A products-of-gestation part shows seven fields: chorionic villi, their appearance, villitis, gestational trophoblastic disease, decidua, hypersecretory endometrium and foetal parts. The villous fields appear only when villi are present. The endometrial fields (amount, endocervix, phase detail, hyperplasia, carcinoma, MMR) are hidden, and stale values in them do not print.
- The microscopy is the house checklist: "- Chorionic villi", then its sub-items indented three spaces, then "- Decidua: …", "- Hypersecretory endometrium: …" and "- Foetal parts: …". Additional notes follow the checklist.
- Diagnosis: the head comes from the specimen type ("TISSUE MASS, per vaginam", "UTERUS, suction evacuation"). The line after the head is:
  - villi present: "PRODUCTS OF GESTATION confirmed", "Consistent with PARTIAL HYDATIDIFORM MOLE" or "COMPLETE HYDATIDIFORM MOLE";
  - implantation-site trophoblast without villi: "IMPLANTATION-SITE TROPHOBLAST WITHOUT CHORIONIC VILLI";
  - no villi: foetal parts give "PRODUCTS OF GESTATION confirmed", then decidua gives "DECIDUA only", then hypersecretory endometrium gives "HYPERSECRETORY ENDOMETRIUM only", and otherwise "NO PRODUCTS OF GESTATION IDENTIFIED".
- Checks panel:
  - error when the villi are not recorded;
  - warning when there are no villi, no implantation-site trophoblast and no foetal parts: an ectopic pregnancy should be suspected and the result communicated promptly;
  - warning for a hydatidiform mole: communicate urgently if the diagnosis was not expected.
- Comments: the partial and complete mole comments (p57KIP2 and ploidy or genotyping; serial hCG and referral) are suggested automatically. The no-villi comment is offered in the snippet list and never added automatically.
- Endometrial curettings with villi (the existing gestational path) now read "PRODUCTS OF GESTATION confirmed", replacing "PRODUCTS OF CONCEPTION (CHORIONIC VILLI PRESENT)". No golden fixture carried the old line.
- 2026-10-05 (user request): an endometrial gestational line now ends "; no evidence of gestational trophoblastic disease" instead of "; no evidence of hyperplasia, gestational trophoblastic disease or malignancy", and the endometrial types gain "Endometrial aspirate" as the default; fixture 04 was regenerated deliberately. See `docs/specs/cervical-polyps-endometrial-aspirates.md`.

## Departures from the card

- "confirmed" prints in lower case. Of the 101 released lines that read PRODUCTS OF GESTATION, 49 add "confirmed", always in lower case, and 52 print the phrase bare.
- A part without villi reads "DECIDUA only", which is how 29 of the 150 gestational parts now on the form were released. Four more name decidua another way. The no-villi comment is therefore offered rather than printed.
- The microscopy is the checklist rather than a narrative sentence, because the released gestational reports use the checklist.
- The printed type reads "per vaginam". Request lines that say "per vagina", "PV" or "passed" route to it.
- The mole lines carry no "; see comment", because the released mole lines have none. The comment still follows the diagnosis.
- Foetal parts and implantation-site trophoblast also confirm an intrauterine gestation, as the RCPath tissue pathway (section 11.5) states.
- Intake uses a hard exclude list (haematoma, subdural, extradural, abscess, soft tissue, breast, placenta). Singular "product of gestation" forms match too.

## Grounding

RCPath, Tissue pathways for gynaecological pathology, V3, February 2023, sections 11.4 to 11.6: https://www.rcpath.org/static/94763195-0982-40ed-bbc79ca92370e9ac/Tissue-pathways-for-gynaecological-pathology.pdf. House wording comes from the released reports, counted only in aggregate (`docs/case-mix/benign-resections-2021-2026.md`).

## Tests

`tests/products_of_gestation.test.js` and four golden fixtures in `tests/fixtures/products_of_gestation/`:

- a tissue mass per vaginam with villi;
- a suction evacuation without villi;
- an evacuation with a partial mole;
- endometrial curettings with villi.

The intake fixture adds one four-part gestational request.
