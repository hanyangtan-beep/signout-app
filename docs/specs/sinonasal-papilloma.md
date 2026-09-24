# Sinonasal papilloma detail — brief

Extends `schemas/nasal_polyps.json` / `generators/sinonasal.js`. Carded 2026-09-11; not yet built.

## Types (WHO Head and Neck 5th)

| Type | Site (typical) | Histology sentence | Molecular comment | Malignant transformation |
| --- | --- | --- | --- | --- |
| Exophytic (fungiform) | Nasal septum | papillary fronds of non-keratinising squamous / transitional epithelium on fibrovascular cores | low-risk HPV (6 / 11) association; no testing needed | rare |
| Inverted | Lateral nasal wall, maxillary / ethmoid sinuses | endophytic ribbon-like epithelium with transmigrating neutrophils and intraepithelial microcysts, intact basement membrane | EGFR exon 20 mutations in most; no result field, comment only | about 5–10%, usually SCC |
| Oncocytic (cylindrical cell) | Lateral wall / sinuses | multilayered columnar oncocytic epithelium with intraepithelial mucous cysts and microabscesses | KRAS mutations; comment only | about 5–15% |

## Fields to add (all `showIf` lesion is a papilloma type)

`papillomaSite`, `papillomaExtent`, dysplasia (existing, plus "Squamous atypia, reactive"), `papillomaCarcinoma` (None / Carcinoma in situ / Invasive SCC arising in papilloma), `papillomaMitoses`, `papillomaSurgicalIntent`.

## Output

- Microscopy: one house sentence per type as in the roadmap card, then dysplasia / carcinoma clause, then "The lesion is received in fragments; margins cannot be assessed." when piecemeal.
- Diagnosis: `NASAL CAVITY, left, polypectomy - SINONASAL PAPILLOMA, INVERTED TYPE, no dysplasia`; `… with HIGH GRADE DYSPLASIA`; `… with CARCINOMA IN SITU`; invasive carcinoma → `SQUAMOUS CELL CARCINOMA ARISING IN INVERTED PAPILLOMA - see comment` and the handoff snippet.
- Snippets: `inverted_papilloma` (existing), `papilloma_molecular`, `papilloma_exophytic_hpv`, `papilloma_margin_fragmented`, `papilloma_carcinoma_handoff`.

## Checks

Carcinoma set with dysplasia None → error. Oncocytic type with the inverted follow-up snippet → warn. Papilloma type with "Allergic mucin" or "Fungal hyphae" also ticked → warn (dual pathology; confirm).

## Sources (to confirm at build)

WHO Classification of Head and Neck Tumours, 5th ed. (sinonasal papillomas); Udager AM et al., Cancer Res 2015 (EGFR in inverted papilloma); Udager AM et al., J Pathol 2016 (KRAS in oncocytic papilloma). Record URLs in this file when the card is built.
