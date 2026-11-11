# Cervical carcinoma resection synoptic

Built on 11 November 2026 (Phase 85) at the user's request: "build the cervical carcinoma resection template". It builds the two cervix cards (user request 2026-11-11): the AJCC version 9 staging module and the resection synoptic, which takes cones and loop excisions as well as hysterectomies. It replaces the menu placeholder for QMH GYN-Cervix (`templates/planned.json`). The sources, the decisions and the departures from the QMH order are in `docs/reference/cervix-sources.md`; the saved page is `docs/reference/GYN-Cervix.html`.

## Scope

- One form, `cervical_carcinoma` (Gynae, cancer resection, menu "Cervix Ca"), for loop excisions (LEEP / LLETZ), cone biopsies, simple and radical trachelectomies, simple and radical hysterectomies and pelvic exenterations for an invasive cervical carcinoma.
- Every type on the CAP Cervix 5.1.1.0 list (WHO 5th edition names), typed HPV-associated, HPV-independent or NOS.
- Not covered: biopsies and curettings (`cervical_biopsy`), excisions for HSIL or AIS (`cervical_excision`, the LEEP form), endometrial carcinoma involving the cervix (`endometrial_carcinoma`), and vaginal and vulval carcinoma (`vulval_carcinoma`; the vagina keeps its placeholder).

## Form

Groups in the QMH element order: Specimen and tumour, Macroscopy, Microscopic findings, Margins, Additional findings, Lymph nodes and metastasis, Staging. The example sets every field.

- Procedure is the CAP list. Hysterectomy type shows for hysterectomies; the additional procedures (salpingo-oophorectomy, salpingectomy, oophorectomy, omentectomy, vaginal cuff resection) for hysterectomies, radical trachelectomies and exenterations; the organs removed for an exenteration.
- Tumour site is the four CAP quadrants or a typed site ("4 to 9 o'clock"). Size has a "minimum" box (tumour at a margin) and a reason when it cannot be measured.
- Macroscopy: specimen dimensions, orientation, the lesion (none, exophytic, ulcerated or endophytic, with its dimensions), inking, radial sectioning, blocks and the block key.
- Histologic type, then the subtype (HPV-associated adenocarcinoma: usual, mucinous, intestinal, signet-ring cell, iSMC, villoglandular, micropapillary) or the pattern (squamous cell carcinoma: keratinising, non-keratinising, basaloid, papillary, warty, verrucous, lymphoepithelioma-like). Silva pattern shows for HPV-associated adenocarcinoma only. Grade, p16 and other immunohistochemistry are optional.
- Depth of stromal invasion: the CAP categories or a measurement in mm (the measurement wins), with the site, a "minimum" box and a reason when it cannot be determined; the proportion of stroma (thirds); horizontal extent with the blocks involved ("6/11 (blocks 4 to 9)").
- Other tissue / organ involvement is the CAP list: corpus, each parametrium, the vagina by level, the adnexa by side, pelvic wall, bladder and rectal wall, bladder and bowel mucosa, omentum.
- Margins follow the procedure: ectocervical, endocervical and radial for loops, cones and simple trachelectomies; endocervical, vaginal cuff and radial for a radical trachelectomy; vaginal cuff and radial for hysterectomies and exenterations; all four for Other. Exenterations and Other add a box for the other margins. Each margin takes its status, location and distance; the intraepithelial neoplasia status shows when HSIL or AIS is ticked as adjacent.
- Nodes by region, pelvic and para-aortic: examined, sentinel, macrometastases, micrometastases, isolated tumour cells, sites, largest deposit and extranodal extension. Nodes sent as separate parts can be counted here.
- Distant metastasis is a multiselect: uterine serosa, adnexa, inguinal nodes, omentum, extrapelvic peritoneum, lung, liver, bone, other.
- HPV PCR (with the genotype) prints under Molecular findings. Adjacent epithelium: none, LSIL, HSIL, inflammation, AIS.
- Staging: m, r and y descriptors, the treatment effect after neoadjuvant therapy, and a pTNM override with its reason.

## Report

- Macroscopic description and block key, then the synoptic in sections: Specimen and tumour, Microscopic findings, Margins, Lymph nodes (when nodes were examined, or when the case option asks for the negatives), Distant metastasis (with a site, or with the option), Pathological stage (AJCC 9th edition, with the pTNM option), Additional findings.
- Depth prints the QMH band with the measurement: "Not more than 3 mm (deepest 1.9 mm, 7 o'clock)".
- Microscopy is one Tumour histology paragraph after Perineural invasion: the type and the site ("Sections of the cervix show involvement by HPV-associated adenocarcinoma, intestinal type, from 4 to 9 o'clock."), then the sentence for the pattern or subtype. A typed note replaces it. The sentences describe only what is seen; each is sourced in `docs/reference/cervix-sources.md`, and the types with no defined morphology print the type alone.
- One Surgical margins row names the tumour ("Uninvolved by invasive adenocarcinoma"), with a sub-row per margin giving the location, then the distance ("7 o'clock, 4.5 mm"), and the intraepithelial neoplasia status on the same sub-row.
- Lymph node rows read "16 examined (2 sentinel); 1 involved", with the macrometastases, micrometastases, isolated tumour cells, sites, largest deposit and extranodal extension under them.
- The diagnosis follows the user's cone reports: "CERVIX, cone biopsy:" over "- ADENOCARCINOMA, HPV-associated", "- Margins clear" and, with the option, "- pT1a1 (AJCC 9th edition)." Extension beyond the cervix joins the type ("involving the left parametrium"); an involved margin reads "Radial margin involved by invasive adenocarcinoma"; the node line reads "0 of 4 pelvic sentinel lymph nodes involved". A hysterectomy reads "UTERUS with CERVIX AND BILATERAL ADNEXA, radical hysterectomy and bilateral salpingo-oophorectomy:".
- The stage group, which matches FIGO 2018, shows in Checks only.

## Staging

`src/staging/cervix.js`, on AJCC version 9 (the QMH page prints the 8th edition; version 9 is the house rule).

- pT1a1 stromal invasion 3 mm or less, pT1a2 more than 3 to 5 mm, pT1b1 more than 5 mm deep and 20 mm or less, pT1b2 more than 20 to 40 mm, pT1b3 more than 40 mm. A macroscopically visible tumour is pT1b on its size whatever the depth, with a Checks note. Horizontal extent and lymphovascular invasion do not change the category; extension to the corpus is disregarded.
- pT2a1 / pT2a2 the upper two-thirds of the vagina (40 mm), pT2b the parametrium, pT3a the lower third of the vagina, pT3b the pelvic wall, pT4 the bladder or rectal mucosa. A bladder or rectal wall without the mucosa is pT2 with a note; a missing size or depth gives the category with "(subcategory cannot be determined)".
- pN1mi / pN1a pelvic, pN2mi / pN2a para-aortic (micrometastasis more than 0.2 to 2 mm, macrometastasis more than 2 mm); isolated tumour cells pN0(i+), grouped with pN0; "(sn)" when every node examined is a sentinel node. pN is not printed when no node was examined.
- pM1: inguinal nodes, intraperitoneal disease, distant organs and, under version 9, the uterine serosa and the adnexa (from either list), with the FIGO 2018 difference in Checks.
- An override takes the version 9 subcategories ("pT1b2 pN0", "pT2a1 pN2mi"); it needs a T and an N, so a T alone is typed with pNX ("pT1a2 pNX").
- Stage group (AJCC Table 10, matching FIGO 2018) in Checks only, with FIGO IIIC1p / IIIC2p when nodes are involved; with no node examined, the group the tumour would have with negative nodes.

## Checks

Errors for a missing procedure or type, for node or sentinel counts above the number examined and for node counts with no node examined. Warnings for a missing size or depth when the category needs it, a depth category that contradicts the measurement, p16 against the type, missing extent in a hysterectomy or radical procedure, an involved margin, or intraepithelial neoplasia at a margin, without its location, a deposit size against the metastasis counts, a missing treatment effect after neoadjuvant therapy and an override without a reason. Infos for horizontal extent over 7 mm and lymphovascular invasion in pT1a (they do not change the category), a NOS type without p16 or HPV testing, HPV PCR against the type, a missing Silva pattern, missing extranodal extension, a pM1 site beside "Not identified", a radical procedure without nodes, the staging notes and the stage group.

## Upgrade from the LEEP form

The LEEP form (`cervical_excision`) offers "Upgrade this part" when an invasive squamous cell carcinoma or adenocarcinoma is ticked; endocervical curettings are not offered it. The part switches to this form in place, carrying over the procedure (a top-hat excision as Other), orientation, blocks, lesion positions as the site, type (a squamous cell carcinoma is HPV-associated when p16 is block positive, otherwise NOS), pattern, depth, horizontal extent, lymphovascular invasion, p16, the margins with their HSIL, AIS or cautery positions, the closest clearance, the adjacent HSIL, AIS, LSIL and inflammation, other findings and the notes. `generators/leep.js` only gains the upgrade map, so the LEEP form's outputs do not change.

## Intake

Loops, cones and LLETZ with a carcinoma named in the line or the history open the form (a query, "?invasion" or "in situ" does not count); radical hysterectomies, trachelectomies and Wertheim hysterectomies open it on the line alone; simple hysterectomies and exenterations need a cervical carcinoma named. Endometrial, ovarian, vulval, vaginal, rectal and bladder carcinomas, biopsies, curettings, polyps, nodes, cytology and frozen sections keep their forms. The procedure, the salpingo-oophorectomies, bilateral salpingectomy, omentectomy and a stitch at 12 o'clock are preset. Across the two exports no part changes route.

## Tests

- `tests/cervical_carcinoma.test.js`: metadata and the placeholder, the example, the type list and its dependent fields, margins by procedure, the histology paragraph, depth and horizontal extent, margins, nodes and pTNM, the QMH order with its departures, HPV PCR, the specimen line and diagnosis, the Checks, intake routes and presets, the upgrade map, and three golden reports in `tests/fixtures/cervical_carcinoma/`: a cone with an HPV-associated adenocarcinoma of intestinal type (pT1a1), a radical hysterectomy with an HPV-associated squamous cell carcinoma and four negative sentinel nodes (pT1b2 pN0(sn)), and a radical trachelectomy with a gastric-type adenocarcinoma involving the parametrium and a pelvic macrometastasis (pT2b pN1a).
- `tests/staging_cervix.test.js`: every depth and size cut-off, the visible lesion, T2 to T4, pN, the (sn) suffix, pM1 for the adnexa and serosa, the stage groups, the Checks line and the override.
- `tools/qa-browser.js` (kept in the QA script): a pasted cone biopsy under an adenocarcinoma history opens the form with the procedure and stitch; a 1.9 mm HPV-associated adenocarcinoma prints its depth band, margins and pT1a1 with the option, and the stage group shows in Checks only; a LEEP with a squamous cell carcinoma upgrades in place.

## Open points

- FIGO stage is not printed; it shows in Checks and can be typed in Additional notes.
- No reference gallery yet.
