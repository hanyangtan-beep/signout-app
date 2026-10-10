# Liver transplant pair — native liver explant + donor liver time-zero biopsy

Brief for the two "Liver transplant pair" cards in `docs/roadmap.md` (Next). It was planned on 2026-10-09 at the user's request: "prepare a paired card for liver explant resection. Liver explants also come with a paired liver biopsy (from the donor, 'time zero'). Please also have a systematic way to evaluate them." Nothing here is built yet; the cards wait for the user to pull them.

**The pair.** A transplant case has two letters. (A) is the recipient's native liver, a total hepatectomy at transplant. (B) is the graft biopsy taken at time zero, either on the back table before implantation or after reperfusion. Each letter keeps its own form and its own diagnosis line. An explant containing hepatocellular carcinoma adds the existing `hcc` synoptic under the same letter (A), as a linked part. This is the frozen-to-synoptic link generalised ("Stage this part", `docs/specs/lung-pair.md`).

**Report-register rule** (`docs/new-template-brief.md` §3 item 2). The printed report states only what is seen and measured: nodule sizes, viable tumour, steatosis percentages and stage. The following never print and live in Checks, the criteria panels and code comments:
- Milan and UCSF status;
- steatosis, necrosis and fibrosis cut-offs;
- citations and sampling advice.

**Systematic evaluation in the app.** Each form opens with a text-only criteria panel ("Show criteria", like `raiPortal`) holding its checklist below, so the steps are visible beside the fields and never print. The donor pattern also reuses the Phase 62 Steatosis and Transplant photo galleries.

## Sources

**Explant**
- RCPath G050, dataset for liver resections and biopsies with carcinoma (2022): [RCPath G050](https://www.rcpath.org/static/cbae24ce-220c-4d9f-95c5b83dd1f0ad2b/Dataset-for-histopathological-reporting-of-liver-resection-specimens-and-liver-biopsies-for-primary-and-metastatic-carcinoma.pdf). It applies to total hepatectomy at transplant when tumour is present.
- [CAP Hepatocellular Carcinoma 4.2.0.0](https://documents.cap.org/protocols/Liver.HCC_4.2.0.0.REL_CAPCP.docx). The HCC morphology reference cites CAP 4.3.0.0 (`docs/reference/hcc-morphology.md`).
- [RCPA structured reporting protocol for HCC and cholangiocarcinoma](https://www.rcpa.edu.au/getattachment/563da6d5-cdf5-41b8-97e7-59ab70313ff4/Protocol-liver.aspx).
- [UCLA Health grossing guideline, total hepatectomy or transplant (2020)](https://www.uclahealth.org/sites/default/files/documents/Total%20Hepatectomy%20or%20Transplant%2007.23.20.pdf).
- Explant series and reviews: [Int J Hepatol 2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4933863/), [Hepat Mon 2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC5070563/), [Int J Organ Transplant Med 2017](https://pmc.ncbi.nlm.nih.gov/articles/PMC5347400/), [Exp Clin Transplant 2023](https://www.ectrx.org/detail/current/2023/21/10/0/820/0) and [World J Transplant 2026](https://www.wjgnet.com/2220-3230/full/v16/i2/115879.htm).
- UCSF criteria: [Yao 2002, Liver Transpl](https://onlinelibrary.wiley.com/doi/10.1053/jlts.2002.34892), restated in a [WJG review](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4806190/).

**Donor biopsy**
- [Banff consensus on steatosis in donor livers (Neil 2022, Hepatology)](https://pmc.ncbi.nlm.nih.gov/articles/PMC9299655/).
- [Clin Transplant Res 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12783007/) on features to evaluate in donor core biopsies.
- [AASLD Pathology Pearls: donor liver biopsies (2022)](https://www.aasld.org/liver-fellow-network/core-series/pathology-pearls/pathology-pearls-evaluation-donor-liver-biopsies).
- [UCLA frozen section reporting for liver allograft evaluation](https://www.uclahealth.org/sites/default/files/documents/Frozen%20section%20reporting%20for%20liver%20allograft.pdf).
- [CAP transplant pathology, chapter 3.1, liver donor organ evaluation](https://documents-cloud.cap.org/estore/pdf/PUB124_Transplant_Sample.pdf).
- [Sabry 2025, Int J Hepatol](https://pmc.ncbi.nlm.nih.gov/articles/PMC11991779/) on ischaemia-reperfusion injury (IRI) at time zero.
- [Banff 2016](https://onlinelibrary.wiley.com/doi/full/10.1111/ajt.13909) for the later biopsies the time-zero biopsy is compared against.

**House evidence: n.a.** The case-mix summaries count medical liver biopsies (155 parts in the five-year file, `docs/case-mix/biopsy-2021-2026.md`) and HCC resections (22, `docs/specs/specimen-intake.md`). They give no count of explants or donor biopsies, and the raw exports are not in this checkout. All wording below is proposed until a de-identified house explant and time-zero report are seen (open point 1).

## Systematic evaluation — native liver explant

**Gross**, in this order:
1. **Identify and measure.**
   - Hepatectomy at transplant is segments 1–8 ([RCPath G050](https://www.rcpath.org/static/cbae24ce-220c-4d9f-95c5b83dd1f0ad2b/Dataset-for-histopathological-reporting-of-liver-resection-specimens-and-liver-biopsies-for-primary-and-metastatic-carcinoma.pdf)).
   - Weigh it after opening the gallbladder and rinsing out the bile, and give three dimensions ([RCPath G050](https://www.rcpath.org/static/cbae24ce-220c-4d9f-95c5b83dd1f0ad2b/Dataset-for-histopathological-reporting-of-liver-resection-specimens-and-liver-biopsies-for-primary-and-metastatic-carcinoma.pdf)).
   - Describe adherent structures such as diaphragm ([UCLA](https://www.uclahealth.org/sites/default/files/documents/Total%20Hepatectomy%20or%20Transplant%2007.23.20.pdf)).
   - Fields: `weightG`, `dims`, `adherent`.
2. **Hilum before slicing.**
   - Submit one cassette en face with the portal vein, hepatic artery and common hepatic duct margins. Submit one with the hepatic vein margins, inked differentially ([UCLA](https://www.uclahealth.org/sites/default/files/documents/Total%20Hepatectomy%20or%20Transplant%2007.23.20.pdf)).
   - Record any thrombus in the portal vein, hepatic artery or hepatic veins, with colour, size and site ([UCLA](https://www.uclahealth.org/sites/default/files/documents/Total%20Hepatectomy%20or%20Transplant%2007.23.20.pdf)).
   - Record involvement of the main left or right portal vein or any of the three main hepatic veins, and the vessel diameter ([RCPath G050](https://www.rcpath.org/static/cbae24ce-220c-4d9f-95c5b83dd1f0ad2b/Dataset-for-histopathological-reporting-of-liver-resection-specimens-and-liver-biopsies-for-primary-and-metastatic-carcinoma.pdf)).
   - Fields: `hilum`, `thrombus`, `thrombusDetail`.
3. **Gallbladder and nodes.**
   - Measure the gallbladder; give contents, mucosa and stones; take a cystic duct shave and neck, body and fundus sections ([UCLA](https://www.uclahealth.org/sites/default/files/documents/Total%20Hepatectomy%20or%20Transplant%2007.23.20.pdf)).
   - Sampling a macroscopically normal gallbladder is optional ([RCPath G050](https://www.rcpath.org/static/cbae24ce-220c-4d9f-95c5b83dd1f0ad2b/Dataset-for-histopathological-reporting-of-liver-resection-specimens-and-liver-biopsies-for-primary-and-metastatic-carcinoma.pdf)).
   - Submit hilar nodes entirely ([UCLA](https://www.uclahealth.org/sites/default/files/documents/Total%20Hepatectomy%20or%20Transplant%2007.23.20.pdf)).
   - Fields: `gallbladder`, `nodesFound`.
4. **Slice.**
   - Slice horizontally, at right angles, for imaging correlation, as thin as possible and no more than 10 mm ([RCPath G050](https://www.rcpath.org/static/cbae24ce-220c-4d9f-95c5b83dd1f0ad2b/Dataset-for-histopathological-reporting-of-liver-resection-specimens-and-liver-biopsies-for-primary-and-metastatic-carcinoma.pdf)).
   - Slices of 0.5 cm are advised because thicker slices miss small lesions ([Int J Organ Transplant Med 2017](https://pmc.ncbi.nlm.nih.gov/articles/PMC5347400/)).
   - Describe the background as normal, bile-stained, nutmeg or fibrotic/cirrhotic ([RCPath G050](https://www.rcpath.org/static/cbae24ce-220c-4d9f-95c5b83dd1f0ad2b/Dataset-for-histopathological-reporting-of-liver-resection-specimens-and-liver-biopsies-for-primary-and-metastatic-carcinoma.pdf)).
   - Fields: `sliceMm`, `background`.
5. **Map every nodule against the imaging.**
   - Number each mass or prominent nodule. For each, give segment, size, description, distance from the capsule, margin and other nodules, necrosis (none or a percentage) with the viable dimension, and vascular invasion ([UCLA](https://www.uclahealth.org/sites/default/files/documents/Total%20Hepatectomy%20or%20Transplant%2007.23.20.pdf)).
   - When there are many: give full detail for the five largest, and the size range and location for the rest ([CAP 4.2.0.0](https://documents.cap.org/protocols/Liver.HCC_4.2.0.0.REL_CAPCP.docx)).
   - If the imaging lesions are not all found, the pathologist sees the specimen and the gross description says so ([UCLA](https://www.uclahealth.org/sites/default/files/documents/Total%20Hepatectomy%20or%20Transplant%2007.23.20.pdf)).
   - With no tumour and no lesion, state that serial slicing shows no mass or prominent nodule ([UCLA](https://www.uclahealth.org/sites/default/files/documents/Total%20Hepatectomy%20or%20Transplant%2007.23.20.pdf)).
   - Fields: `nodules` (up to 5 rows: number, segment, size mm, description, necrosis %, viable mm), `otherNodules`, `imagingMatch`.
6. **Sample.**
   - Tumour:
     - Take at least three tumour blocks, with all macroscopically distinct areas ([RCPath G050](https://www.rcpath.org/static/cbae24ce-220c-4d9f-95c5b83dd1f0ad2b/Dataset-for-histopathological-reporting-of-liver-resection-specimens-and-liver-biopsies-for-primary-and-metastatic-carcinoma.pdf)).
     - After treatment, submit a tumour of 20 mm or less entirely through its largest diameter, plus one section per further 10 mm ([RCPath G050](https://www.rcpath.org/static/cbae24ce-220c-4d9f-95c5b83dd1f0ad2b/Dataset-for-histopathological-reporting-of-liver-resection-specimens-and-liver-biopsies-for-primary-and-metastatic-carcinoma.pdf); the same rule is in [CAP 4.2.0.0](https://documents.cap.org/protocols/Liver.HCC_4.2.0.0.REL_CAPCP.docx)).
   - Nodules: sample any nodule appreciably larger than the background ([CAP 4.2.0.0](https://documents.cap.org/protocols/Liver.HCC_4.2.0.0.REL_CAPCP.docx)), and any that differs in colour, texture or appearance ([Int J Hepatol 2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4933863/)).
   - Background:
     - Take four background blocks: right lobe central and peripheral, left lobe central and peripheral ([UCLA](https://www.uclahealth.org/sites/default/files/documents/Total%20Hepatectomy%20or%20Transplant%2007.23.20.pdf)).
     - Take at least one background block as far from the tumour as possible ([RCPath G050](https://www.rcpath.org/static/cbae24ce-220c-4d9f-95c5b83dd1f0ad2b/Dataset-for-histopathological-reporting-of-liver-resection-specimens-and-liver-biopsies-for-primary-and-metastatic-carcinoma.pdf)).
   - Field: `blockKeyText`, as in `hcc`.

**Microscopy**, in this order:
1. **Background liver and cause.**
   - Stage the fibrosis with a named system and grade the activity ([CAP 4.2.0.0](https://documents.cap.org/protocols/Liver.HCC_4.2.0.0.REL_CAPCP.docx) recommends Ishak).
   - Confirm the pre-transplant cause or find another ([Int J Organ Transplant Med 2017](https://pmc.ncbi.nlm.nih.gov/articles/PMC5347400/)): ground-glass cells, steatohepatitis, duct lesions or loss, copper-associated protein, PAS-D globules and iron.
   - Fields: the shared `bg*` fields from `generators/liver_background.js`, plus `activity` and `causeFeatures`.
2. **Nodules.**
   - Regenerative nodule, low-grade or high-grade dysplastic nodule (LGDN, HGDN) or early HCC, using the International Working Party criteria ([CAP 4.2.0.0](https://documents.cap.org/protocols/Liver.HCC_4.2.0.0.REL_CAPCP.docx)).
   - LGDN against HGDN: portal tracts, N/C ratio, atypia and mitoses ([Hepat Mon 2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC5070563/)).
   - Glypican-3, HSP70 and glutamine synthetase help in detecting early HCC (`docs/reference/hcc-morphology.md`, ICCR).
   - Small cell and large cell change are named as such ([RCPath G050](https://www.rcpath.org/static/cbae24ce-220c-4d9f-95c5b83dd1f0ad2b/Dataset-for-histopathological-reporting-of-liver-resection-specimens-and-liver-biopsies-for-primary-and-metastatic-carcinoma.pdf)).
   - Fields: `lgdnCount`, `hgdnCount`, `cellChange`.
3. **Tumour.** "HCC" in `tumour` offers "Add HCC synoptic", which links the `hcc` part under (A). That part carries the following, with only viable tumour size used for staging:
   - type and the worst grade;
   - per-nodule necrosis in up to the five largest;
   - complete or incomplete necrosis;
   - satellitosis: smaller than the main tumour, within 2 cm and separated by non-tumour liver;
   - small or large vessel invasion and portal vein tumour thrombus;
   - nodes and pTNM.

   All of this is from [CAP 4.2.0.0](https://documents.cap.org/protocols/Liver.HCC_4.2.0.0.REL_CAPCP.docx).
4. **Incidental lesions.** Incidental HCC, cholangiocarcinoma and biliary intraepithelial neoplasia (BilIN), which has been found even in end-stage livers without biliary disease ([Int J Organ Transplant Med 2017](https://pmc.ncbi.nlm.nih.gov/articles/PMC5347400/)). Field: `incidental`.
5. **Vessels and hilum.** A bland, organising or tumour thrombus. Record whether macroscopic vascular invasion is confirmed microscopically ([RCPath G050](https://www.rcpath.org/static/cbae24ce-220c-4d9f-95c5b83dd1f0ad2b/Dataset-for-histopathological-reporting-of-liver-resection-specimens-and-liver-biopsies-for-primary-and-metastatic-carcinoma.pdf)). Field: `thrombusHisto`.
6. **Nodes and gallbladder.** Fields: `nodesHisto`, `gallbladderHisto`.
7. **Acute liver failure explants.** Give the extent and pattern of necrosis (submassive or massive), the zone, and the regeneration. The Phase 62 Hepatitis gallery shows massive necrosis. Fields: `necrosisPct`, `necrosisPattern`, shown when the gross is "massive necrosis".

**Checks, never printed**
- **Milan on explant.** Within Milan means a single tumour of 5 cm or less, or up to three nodules of 3 cm or less, without vascular invasion or extrahepatic spread ([World J Transplant 2026](https://www.wjgnet.com/2220-3230/full/v16/i2/115879.htm)).
- **UCSF.** A single tumour of 6.5 cm or less, or up to three nodules with the largest 4.5 cm or less and a total diameter of 8 cm or less ([Yao 2002](https://onlinelibrary.wiley.com/doi/10.1053/jlts.2002.34892)).
- **Necrotic nodules.** No source read says whether completely necrotic nodules count towards Milan on explant (n.a.). Checks show the status counted on viable nodules and on all nodules.
- **Complete response.** No viable tumour in any nodule gives "complete response", as [Exp Clin Transplant 2023](https://www.ectrx.org/detail/current/2023/21/10/0/820/0) uses the term.
- **Missing items:**
  - no weight or dimensions;
  - no background block;
  - slices over 10 mm;
  - more than five nodules without a size range for the rest;
  - an imaging mismatch not recorded;
  - HCC in the history or the nodule table but no linked synoptic ("Add HCC synoptic");
  - a portal vein tumour thrombus with the synoptic's vascular invasion not "large vessel".

## Systematic evaluation — donor liver time-zero biopsy

1. **Timing and handling.**
   - Donor assessment can be a frozen section at organ evaluation, a back-table or post-reperfusion time-zero biopsy, or a living-donor work-up biopsy ([CAP PUB124](https://documents-cloud.cap.org/estore/pdf/PUB124_Transplant_Sample.pdf)).
   - Post-reperfusion biopsies were taken about 2 or 3 h after portal reperfusion ([Sabry 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC11991779/)).
   - Tissue goes fresh and quickly, to avoid drying artefact ([Clin Transplant Res 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12783007/)). Do not use saline, air drying or an absorbent substrate ([UCLA FS](https://www.uclahealth.org/sites/default/files/documents/Frozen%20section%20reporting%20for%20liver%20allograft.pdf)).
   - Cut sections at 5–6 µm, because thinner sections overestimate large-droplet fat ([Banff 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9299655/)).
   - Fields: `dnTiming`, `dnDonor`.
2. **Adequacy.**
   - At least six portal tracts is the common standard ([Clin Transplant Res 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12783007/)).
   - Fields: the existing adequacy fields.
3. **Exclude malignancy first.** It makes the graft unsuitable ([Clin Transplant Res 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12783007/)). Field: `dnOther` (neoplasm).
4. **Steatosis, by the Banff three-step method.**
   - Steps: at low power, estimate the area occupied by fat; at about 20x, estimate the share of hepatocytes in that area with large-droplet fat; the high-power percentage of the low-power percentage is the total large-droplet fat ([Banff 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9299655/)).
   - Large-droplet fat is a single droplet that distends the cell and displaces the nucleus. Small-droplet fat is given separately and never added to it. True microvesicular steatosis (foamy cells) is rare and needs the correct term ([Banff 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9299655/)).
   - Fields: `dnLdfPct`, `dnSdfPct`, `dnMicro`, `dnFatZone`.
5. **Necrosis.**
   - It is usually focal, in zone 3 or under the capsule. Estimate it to the nearest 10% and give its location ([AASLD](https://www.aasld.org/liver-fellow-network/core-series/pathology-pearls/pathology-pearls-evaluation-donor-liver-biopsies)).
   - Address ischaemic necrosis specifically in deceased donors ([Clin Transplant Res 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12783007/)).
   - Fields: `dnNecrosisPct`, `dnNecrosisSite`.
6. **Ischaemia-reperfusion injury (post-reperfusion only).** Grades, all from [Sabry 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC11991779/):
   - None.
   - Minimal: sparse single sinusoidal neutrophils without hepatocyte loss.
   - Mild: sporadic hepatocyte detachment or acidophil bodies, with isolated neutrophils.
   - Moderate: clusters of more than five neutrophils, with or without hepatocyte loss.
   - Severe: zonal or confluent, usually perivenular, loss.

   Zonal necrosis without neutrophils is a donor ischaemic lesion, not reperfusion injury. Field: `dnIri`.
7. **Inflammation.**
   - Score portal and lobular inflammation separately. Minimal to mild non-specific inflammation is common, and moderate or more suggests underlying disease ([AASLD](https://www.aasld.org/liver-fellow-network/core-series/pathology-pearls/pathology-pearls-evaluation-donor-liver-biopsies)).
   - Fields: the existing `portalInfl` and lobular fields.
8. **Fibrosis.**
   - Stage as usual ([AASLD](https://www.aasld.org/liver-fellow-network/core-series/pathology-pearls/pathology-pearls-evaluation-donor-liver-biopsies)). Precise staging needs a trichrome ([CAP PUB124](https://documents-cloud.cap.org/estore/pdf/PUB124_Transplant_Sample.pdf)).
   - Fields: the existing stage fields.
9. **Other findings.**
   - Ballooned hepatocytes; iron, where zone 3 involvement suggests overload; lipofuscin; cholestasis ([Clin Transplant Res 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12783007/)).
   - Granulomas and amyloid ([AASLD](https://www.aasld.org/liver-fellow-network/core-series/pathology-pearls/pathology-pearls-evaluation-donor-liver-biopsies)); alpha-1 antitrypsin globules ([CAP PUB124](https://documents-cloud.cap.org/estore/pdf/PUB124_Transplant_Sample.pdf)).
   - Field: `dnOther`.
10. **Use as the baseline.** The time-zero biopsy is what lets preservation-reperfusion injury in the first 1–2 weeks be told apart from acute rejection ([Int J Organ Transplant Med 2017](https://pmc.ncbi.nlm.nih.gov/articles/PMC5347400/)). Preservation injury has a less dense infiltrate than TCMR and no endotheliitis ([CAP PUB124](https://documents-cloud.cap.org/estore/pdf/PUB124_Transplant_Sample.pdf)).

**Checks, never printed**
- **Large-droplet fat at 30% or more:**
  - a risk factor for short-term graft survival ([UCLA FS](https://www.uclahealth.org/sites/default/files/documents/Frozen%20section%20reporting%20for%20liver%20allograft.pdf));
  - over 33% raises the risk of post-transplant complications ([Clin Transplant Res 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12783007/));
  - over 60–66% gives reperfusion syndrome in most recipients ([Banff 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9299655/)).
- **Adequacy:** fewer than six portal tracts.
- **Necrosis:** 10% or more of diffuse necrosis may make a graft unsuitable. Up to 50% has been used successfully, especially from brain-dead donors ([Clin Transplant Res 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12783007/)).
- **Fibrosis:** Ishak 2 or more makes the graft less suitable ([Clin Transplant Res 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12783007/)).
- **Missing IRI grade:** a post-reperfusion biopsy without one.
- **Small-droplet fat with large-droplet fat blank:** "give large-droplet fat on its own" ([Banff 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9299655/)).

## Card 1 — donor pattern on `liver_biopsy` (enrich, do not fork)

**Pattern and fields**
- The pattern list gains "Donor (time zero)"; its fields are `dn*`, shown with `showIf pattern = Donor (time zero)`.
- Reused from the form: adequacy, `portalInfl` and lobular inflammation, fibrosis stage and iron.
- Galleries: Steatosis (droplet type) and Transplant (preservation-reperfusion injury), plus the criteria panel on `dnTiming`.

**Intake**
- The medical gate opens on donor, time zero, time-zero, post-reperfusion, implantation and back-table, pre-setting the pattern.
- Lines: "Liver, donor, time-zero biopsy", "Donor liver, wedge biopsy", "Liver graft, post-reperfusion biopsy".

**Printed wording (proposed)**
- Microscopy: "Sections show a wedge biopsy of donor liver taken after reperfusion, with 14 portal tracts. Large-droplet steatosis involves about 10% of the parenchyma and small-droplet steatosis about 20%. There is mild ischaemia-reperfusion injury, with scattered sinusoidal neutrophils and occasional acidophil bodies. There is no necrosis. The portal tracts show minimal inflammation. There is no fibrosis. No granuloma or neoplasm is seen."
- Line: "(B) LIVER, donor, time-zero biopsy - MILD ISCHAEMIA-REPERFUSION INJURY with LARGE-DROPLET STEATOSIS (10%) and NO FIBROSIS". This follows the house connectors (`docs/specs/diagnosis-connectors.md`).

**Fixtures** (`tests/fixtures/liver_biopsy/`)
- Post-reperfusion: mild IRI, large-droplet 10% and small-droplet 20%.
- Pre-implantation: large-droplet 40%. Checks show the three cut-offs as reference.
- Post-reperfusion: moderate IRI with 20% zone 3 necrosis.

**Accept**
- Intake top-1 for the three lines above with the pattern set.
- Existing liver fixtures byte-identical.

## Card 2 — `liver_explant` (new template) + the generalised pairing hook

**Template**
- Kind: benign resection.
- System: Hepatobiliary; menu label "Liver explant".
- Diagnosis head: from the specimen line, e.g. "LIVER, native, total hepatectomy".
- Generator: imports `generators/liver_background.js` for the background sentence and line, as `hcc` and `liver_lesion_biopsy` do.

**Intake**
- Opens on: explant, total hepatectomy, native liver, recipient hepatectomy, "at transplant".
- `hcc` loses "explant" as a procedure word, so an explant line opens `liver_explant` even under an HCC history (one deliberate `hcc` intake change, open point 3).
- Unchanged: a right hepatectomy under an HCC history stays on `hcc`, and "Liver allograft, biopsy" stays on `liver_biopsy`.

**Pairing hook**
- Today `pairedTemplates()` in `src/app.js` reads only `frozen_section`'s `PAIRED_TEMPLATE`. Generalise it: any generator may export `pairedTemplate(part)` (returning a template id or '') and `prefillPaired(values)`.
- The explant offers `hcc` when `tumour` is "Hepatocellular carcinoma". It pre-fills:
  - Total hepatectomy, segments 1–8, weight and dimensions;
  - tumour count and sizes from the nodule table;
  - the shared `bg*` values.
- When linked, `hcc` prints no macro or block key of its own, because the explant's cover the whole specimen. Unlinked `hcc` fixtures stay byte-identical.

**Printed wording (proposed)**
- Microscopy: "The liver shows established cirrhosis (Ishak stage 6/6) with mild interface and lobular activity. Ground-glass hepatocytes are present. Nodule 2 (segment 6, 12 mm) is a high-grade dysplastic nodule. The portal vein contains organising bland thrombus. Three hilar lymph nodes show reactive changes. The gallbladder shows chronic cholecystitis."
- Lines:
  - "(A) LIVER, native, total hepatectomy - CHRONIC HEPATITIS B with CIRRHOSIS (Ishak stage 6/6)";
  - "(A) LIVER, native, total hepatectomy - MASSIVE HEPATIC NECROSIS";
  - with HCC, the linked engine prints the `hcc` clauses under the explant's organ phrase, as for frozen pairs.

**Fixtures** (`tests/fixtures/liver_explant/`)
- 01: HBV cirrhosis without tumour, with bland portal vein thrombus and reactive nodes.
- 02: HBV cirrhosis with two HCC after TACE (one completely necrotic 20 mm, one viable 25 mm) and a linked `hcc` part. Checks: within Milan on viable nodules.
- 03: PSC with biliary cirrhosis and low-grade BilIN.
- 04: acute liver failure with massive necrosis.
- 05: the pair case, (A) explant plus (B) donor biopsy.

**Accept**
- Intake top-1 for "Native liver, total hepatectomy" and "Liver, explant".
- "Add HCC synoptic" links under (A) with the pre-fill.
- All `hcc` fixtures byte-identical.

## Where the sources disagree

- **Slice thickness:** no more than 10 mm ([RCPath G050](https://www.rcpath.org/static/cbae24ce-220c-4d9f-95c5b83dd1f0ad2b/Dataset-for-histopathological-reporting-of-liver-resection-specimens-and-liver-biopsies-for-primary-and-metastatic-carcinoma.pdf)), against 0.5 cm ([Int J Organ Transplant Med 2017](https://pmc.ncbi.nlm.nih.gov/articles/PMC5347400/); [Hepat Mon 2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC5070563/)) and 0.5–1 cm ([Int J Hepatol 2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4933863/)). The form records the interval and warns only above 10 mm.
- **Background blocks:**
  - four, right and left lobe, central and peripheral ([UCLA](https://www.uclahealth.org/sites/default/files/documents/Total%20Hepatectomy%20or%20Transplant%2007.23.20.pdf));
  - three right, two left, one caudate, one porta and one gallbladder ([Int J Hepatol 2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4933863/));
  - "a block" as far from the tumour as possible ([RCPath G050](https://www.rcpath.org/static/cbae24ce-220c-4d9f-95c5b83dd1f0ad2b/Dataset-for-histopathological-reporting-of-liver-resection-specimens-and-liver-biopsies-for-primary-and-metastatic-carcinoma.pdf)).
- **Steatosis cut-offs:**
  - 30% or more ([UCLA FS](https://www.uclahealth.org/sites/default/files/documents/Frozen%20section%20reporting%20for%20liver%20allograft.pdf));
  - mild under 30%, moderate 30–60%, severe over 60% ([CAP PUB124](https://documents-cloud.cap.org/estore/pdf/PUB124_Transplant_Sample.pdf));
  - over 33% ([Clin Transplant Res 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12783007/));
  - no defined cut-off, though 95% of surveyed centres take 33% or less as safe ([Banff 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9299655/)).
- **Necrosis:**
  - always to the nearest 10% ([AASLD](https://www.aasld.org/liver-fellow-network/core-series/pathology-pearls/pathology-pearls-evaluation-donor-liver-biopsies));
  - only when significant, over about 20%, with focal subcapsular necrosis not reported ([UCLA FS](https://www.uclahealth.org/sites/default/files/documents/Frozen%20section%20reporting%20for%20liver%20allograft.pdf)).
  - The form records the percentage whenever it is entered.
- **Small-droplet fat:**
  - report only when over 70% ([UCLA FS](https://www.uclahealth.org/sites/default/files/documents/Frozen%20section%20reporting%20for%20liver%20allograft.pdf));
  - may be given but never added to large-droplet fat ([Banff 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9299655/)).
- **UCSF single-tumour limit:** 6.5 cm in the original ([Yao 2002](https://onlinelibrary.wiley.com/doi/10.1053/jlts.2002.34892)), but one 2026 review gives 6 cm ([Gastroenterol Rep 2026](https://academic.oup.com/gastro/article/doi/10.1093/gastro/goag018/8503620)). The form uses the original.

## Size and split

- Two M cards, one batch:
  - Card 1, the donor pattern, first, because it has no engine change;
  - Card 2, the explant, second (one template and one engine hook).
- Verify: tests + browser (light).
- One deploy, and publish only when the user asks.
- Stop condition: if the house reports print Milan status or use another line form, stop and re-card before building.

## Open points for the user

1. A de-identified house explant report and time-zero report, to fix the wording and the diagnosis lines (no house count or example is available here).
2. Milan and UCSF status: Checks only (proposed, as FIGO for the ovary), or printed?
3. Should every explant line open `liver_explant` with the HCC synoptic linked under the same letter (proposed)? The alternative keeps HCC explants on `hcc` with explant fields added there.
4. Are donor livers also assessed by frozen section before implantation? If so, a frozen-section scenario reusing the donor fields goes into Later.
5. Should a non-tumour explant line add "no dysplastic nodule or malignancy"?
