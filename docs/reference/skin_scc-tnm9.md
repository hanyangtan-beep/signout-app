# Skin SCC — UICC TNM 9th edition for trunk and limbs

Phase 41, 2026-09-25. Trunk and limb sites on `skin_scc` stage on the UICC TNM 9th edition; head and neck sites stay on AJCC 8th.

## Sources

- UICC: the 9th edition was published in 2025, and UICC recommends it take effect from 1 January 2026 — https://www.uicc.org/what-we-do/sharing-knowledge/tnm/publications-and-resources
- RCPath recommendation on tumour staging systems (October 2025): TNM 9 for invasive SCC in patients diagnosed on or after 1 January 2026; "pathology reports should always indicate which version (UICC or AJCC) and which edition (8 or 9) of TNM is being used" — https://www.rcpath.org/static/5629269d-8b35-4918-b17b4f2d84f665f8/bcc64d62-3671-470f-bbbc8b8cbf57c025/RCPath-TNM-9-Statement.pdf
- RCPath Appendix A, UICC TNM 9 pathological staging of primary cutaneous carcinoma (V3, 061125): pT, pN, M, stage groups, and the deep invasion and perineural invasion definitions — https://www.rcpath.org/static/22a3c502-b300-4132-b0e0b93d104dd64f/Squamous-cellTNM9.pdf
- Int J Cancer review of the 9th edition (9 June 2026), Table 1: carcinoma of skin, and of skin of the head and neck, unchanged in T, N, M and stage; clarifications only (perineural and deep invasion); the vermilion border and commissure (C00.0–2, C00.6, C44.0) allocated to skin — https://pmc.ncbi.nlm.nih.gov/articles/PMC13432304/
- AJCC current staging system 2026: cutaneous carcinoma of the head and neck is still version 8 — https://www.facs.org/media/c5ik5tkr/ajcc-current-staging-system-2026.pdf
- CAP Cutaneous Carcinoma of the Head and Neck v1.2.0.0 (April 2026), AJCC 8th, the basis of the QMH page — https://www.cap.org/wp-content/uploads/protocols/HN.Skin_Cutaneous_1.2.0.0.REL_CAPCP.pdf?download=true

## What the app does

- Trunk and limbs print "UICC 9th edition" in the stage heading and the diagnosis clause; the site list group reads "Trunk and limbs (UICC 9th)".
- Perineural invasion, RCPath TNM 9 wording: "tumour cells within the nerve sheath of a nerve lying deeper than the dermis or measuring 0.1 mm or larger in calibre or involvement of five or more nerves per section, without foramen or skull base invasion or transgression". The first two criteria were already applied. The third is the tick box `pniFiveNerves` ("Five or more nerves involved in a section"), shown on trunk and limb sites (and on Other / Not specified with the trunk and limbs region) when perineural invasion is "Present" or "Present, less than 0.1 mm in calibre". A tick makes pT3 and prints "Nerves involved: Five or more in a section" under perineural invasion, and "five or more nerves in a section" in the diagnosis clause.
- The nerve count is not applied to head and neck sites (AJCC 8th has no such criterion) or to the BWH class (nerve 0.1 mm or more only). A tick left behind by a changed site or calibre neither stages nor prints.
- Unchanged: the 20 and 40 mm size cut-offs, deep invasion (beyond the subcutaneous fat, or more than 6 mm from the granular layer), the bone categories, pN (30 and 60 mm, no ENE term) and contralateral nodes as pM1.
- Engine: `showIf` gains `any` (one member passing), which nests with `all`.
