# Sinonasal papilloma detail — brief

Extends `schemas/nasal_polyps.json` / `generators/sinonasal.js`. Carded 2026-09-11; re-carded against the released reports and pulled by the user on 2026-09-27 (Phase 45).

## Measure (released reports, aggregate only)

Counted by `analysis/sinonasal-papilloma-profile.py` (gitignored scratch) with fixed vocabularies — no accession, site description, case text or patient field leaves the sandbox. A part counts when its diagnosis names a papilloma and its specimen line or diagnosis names a sinonasal site.

| | Five-year biopsy file (2021 – 2026-09-14) | LIS export (2024 – 2026-09) |
| --- | --- | --- |
| Papilloma parts (cases) | 17 (13) | 4 (4) |
| Inverted | 10 | 2 |
| Oncocytic | 3 | 2 |
| Exophytic | 1 | 0 |
| Untyped ("SCHNEIDERIAN PAPILLOMA") | 3 | 0 |

- Diagnosis wording: "SINONASAL PAPILLOMA, INVERTED TYPE" in 11 of 12 inverted lines (2 after "In keeping with"); "SINONASAL PAPILLOMA, ONCOCYTIC SUBTYPE" in 5 of 5; "SINONASAL PAPILLOMA, EXOPHYTIC TYPE" in 1 of 1.
- None of the 21 lines names dysplasia or carcinoma, closes on "no evidence of …", or says "see comment". None of the 21 parts, diagnosis or microscopy, mentions recurrence, transformation, follow-up, margins, EGFR, KRAS or HPV.
- Microscopy (15 of the 17 five-year parts carry lettered microscopy). Inverted (8 with microscopy): "Sections show polypoid pieces of mucosal tissue lined by …" (4), "An endophytic growth of round epithelial nests with smooth contour is seen." (4), "… hyperplastic with transmigrating neutrophils and neutrophilic microabscesses" (3), "The features are those of a sinonasal papilloma, inverted type." (3), "No high grade cytological atypia or invasion is identified." (3). The lining after "lined by" is "respiratory type to transitional type" (2) or "squamous type epithelium" (2). Oncocytic (3 with microscopy): "Sections show a papillary epithelial proliferation … mixed exophytic and endophytic growth. It is lined by multilayered pseudostratified to columnar oncocytic epithelium [with] abundant eosinophilic cytoplasm and small uniform nuclei. Numerous intraepithelial mucin-filled microcysts and neutrophilic microabscesses are present. No destructive stromal invasion is present. No dysplasia or malignancy is seen." (2 of 3). The single exophytic report uses the terms exophytic, papillary, fibrovascular, hyperplastic, squamous and neutrophils.
- Routing, by specimen line alone: 7 of the 21 open the form (6 five-year, 1 export) and 14 open Generic — a punch, biopsy or curetting line takes the resection-kind penalty (10), the line names no site word the form knows (3), or it ties with Skin excision (1). Not in this card; Later has the line.

## Printed wording

Microscopy, per type (the epithelium field changes the inverted lining; one fragment gives "a polypoid piece"; a biopsy drops "polypoid"):

| Type | Paragraph | Negative sentence |
| --- | --- | --- |
| Inverted | Sections show polypoid pieces of mucosal tissue lined by respiratory type to transitional type epithelium. An endophytic growth of round epithelial nests with smooth contour is seen. The epithelium is hyperplastic with transmigrating neutrophils and neutrophilic microabscesses. The features are those of a sinonasal papilloma, inverted type. | No high grade cytological atypia or invasion is identified. |
| Oncocytic | Sections show a papillary epithelial proliferation with mixed exophytic and endophytic growth. It is lined by multilayered pseudostratified to columnar oncocytic epithelium with abundant eosinophilic cytoplasm and small uniform nuclei. Numerous intraepithelial mucin-filled microcysts and neutrophilic microabscesses are present. The features are those of a sinonasal papilloma, oncocytic subtype. | No destructive stromal invasion is present. No dysplasia or malignancy is seen. |
| Exophytic | Sections show polypoid pieces of mucosal tissue with an exophytic papillary growth of epithelium over fibrovascular cores. The papillae are lined by hyperplastic squamous to transitional type epithelium with scattered mucous cells and transmigrating neutrophils. The features are those of a sinonasal papilloma, exophytic type. | No high grade cytological atypia or invasion is identified. |

Grade sentences replace the negative sentence: low grade "Low grade dysplasia is present." plus the type's invasion negative; high grade "High grade dysplasia is present." plus the invasion negative; carcinoma "Invasive squamous cell carcinoma arising in the papilloma is present (see comment)."

Diagnosis: `SINONASAL PAPILLOMA, INVERTED TYPE` / `SINONASAL PAPILLOMA, EXOPHYTIC TYPE` / `SINONASAL PAPILLOMA, ONCOCYTIC SUBTYPE` (the house word; WHO 5th says "oncocytic type"); `with LOW GRADE DYSPLASIA` / `with HIGH GRADE DYSPLASIA` when graded; `SQUAMOUS CELL CARCINOMA ARISING IN SINONASAL PAPILLOMA, INVERTED TYPE - SEE COMMENT` for a carcinoma, which ticks the QMH head and neck template comment. The fungal, mucin, ulceration and lymphoid clauses follow as before. A benign papilloma line has no closer and no "see comment".

Snippets: `inverted_papilloma` (recurrence / malignant transformation follow-up) stays in the list but is no longer ticked by default; `malignant_template` is also ticked by a carcinoma arising in a papilloma.

## Dropped from the 2026-09-11 card

- Fields `papillomaSite`, `papillomaExtent`, `papillomaMitoses` and `papillomaSurgicalIntent`: the site already comes from the specimen text, and none is used in the 21 released reports.
- "Squamous atypia, reactive" and a separate carcinoma in situ option: no released use; high grade dysplasia covers carcinoma in situ in the two-tier head and neck grade.
- Snippets `papilloma_molecular`, `papilloma_exophytic_hpv`, `papilloma_margin_fragmented` and `papilloma_carcinoma_handoff`, the EGFR / KRAS / HPV comments and the transformation rates: none appears in the 21 released reports, and the report-register rule excludes aetiological and prognostic commentary. The existing `malignant_template` comment is the handoff.
- The three checks: they guarded fields and snippets that are no longer added.

## Grounding (not printed)

- Nomenclature — WHO Classification of Tumours, Head and Neck Tumours, 5th ed.: "Sinonasal papilloma, inverted type", "oncocytic type", "exophytic type" ([WHO Blue Books structure page](https://whobluebooks.iarc.who.int/structures/head-and-neck-tumours/); Thompson LDR, Bishop JA, Head Neck Pathol 2022;16:1–18, [PMC9018924](https://pmc.ncbi.nlm.nih.gov/articles/PMC9018924/)).
- Morphology — inverted: squamous, transitional or ciliated columnar epithelium with downward growth of rounded, anastomosing nests within an intact basement membrane and intraepithelial neutrophils with microabscesses; oncocytic: inverted and exophytic growth of pseudostratified columnar cells with abundant granular eosinophilic cytoplasm and frequent microcysts; exophytic: broad branching fronds of squamous epithelium around fibrovascular cores (Udager AM, McHugh JB et al., Head Neck Pathol 2017;11:269–277, [PMC5550400](https://pmc.ncbi.nlm.nih.gov/articles/PMC5550400/); Xu B, [PathologyOutlines — Sinonasal papilloma](https://www.pathologyoutlines.com/topic/nasalsinonasalpapilloma.html)).
- Molecular background, for the record only — EGFR mutations in 88% of inverted papillomas and 77% of associated carcinomas, absent from exophytic and oncocytic types (Udager AM et al., Cancer Res 2015;75:2600–2606, [PubMed 25931286](https://pubmed.ncbi.nlm.nih.gov/25931286/)); KRAS mutations in 51 of 51 oncocytic papillomas and 5 of 5 associated carcinomas (Udager AM et al., J Pathol 2016;239:394–398, [Deep Blue 2027.42/133586](https://deepblue.lib.umich.edu/handle/2027.42/133586)); low-risk HPV 6 / 11 in exophytic papillomas (PMC9018924).
