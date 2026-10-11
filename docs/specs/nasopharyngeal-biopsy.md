# Nasopharyngeal biopsy template

Build brief moved verbatim from the phased roadmap on 2026-09-10. The card in `docs/roadmap.md` carries the acceptance criteria; this file carries the full specification.

**Nasopharyngeal biopsy** (added 2026-09-10) — small-biopsy template (`nasopharyngeal_biopsy`, header label "NPC") for the local NPC work-up. Per-part site (left / right fossa of Rosenmüller, roof, posterior wall, bilateral) and adequacy (lymphoid tissue only vs surface epithelium present). Benign: reactive lymphoid hyperplasia, chronic nasopharyngitis with lymphoid follicles, surface respiratory / squamous epithelium, adenoid remnant, Tornwaldt cyst; dx `NASOPHARYNX, biopsy - NO EVIDENCE OF MALIGNANCY`. Carcinoma: WHO 5th nasopharyngeal carcinoma subtypes (non-keratinising undifferentiated / differentiated, keratinising squamous cell carcinoma, basaloid squamous cell carcinoma), fragments involved, LVI / PNI, the IHC + EBER sentence (CK / p63 or p40 positive, EBER ISH positive in tumour cells) and a plasma EBV DNA / staging correlation comment. Other: atypical lymphoid infiltrate → lymphoma work-up flag (IHC recommended, EBER), nasopharyngeal papillary adenocarcinoma, salivary-type tumours, granulomatous inflammation (TB / AFB stain), post-radiotherapy changes and recurrent NPC wording. Snippets: EBER pending, lymphoma work-up, radiological / clinical correlation for a negative biopsy in a patient with raised plasma EBV DNA.

## Built (2026-09-12, Phase 10)

- `schemas/nasopharyngeal_biopsy.json` (biopsy, system Head and neck, rank 11, label `NPC`) + `generators/nasopharyngeal.js`; listed in `templates/manifest.json` and loaded by generator id `nasopharyngeal`.
- Benign default reads `NASOPHARYNX, biopsy - REACTIVE LYMPHOID HYPERPLASIA`: benign findings stand alone since Phase 66 (docs/specs/trailing-negatives.md), and a blank finding reads `NO EVIDENCE OF MALIGNANCY`.
- All 15 finding options print as specced: 5 benign, 2 granulomatous (stain outcomes in microscopy and diagnosis), WHO 5th NPC subtypes (IHC + EBER single-sentence form), papillary adenocarcinoma, salivary gland-type, free-text other.
- EBER pending: microscopy says the ISH was ordered and auto-ticks the `npc_eber_pending` addendum snippet (flag gated to carcinoma / atypical-lymphoid findings so benign defaults never tick it). Carcinoma auto-ticks `npc_ebv_staging`; atypical lymphoid infiltrate auto-ticks `npc_lymphoma_workup`; `npc_negative_correlation` is manual.
- Recurrence setting prefixes `PERSISTENT / RECURRENT` and adds post-radiotherapy change wording; post-RT surveillance benign reports end `no evidence of recurrent carcinoma`.
- Multi-part reports keep `(A)/(B)` labels on every block and append `SUMMARY: ... in (A); ... in (B).`; single-part reports stay unlabelled.
- 14 unit tests pin all wordings (`tests/nasopharyngeal.test.js`); picker tests updated for the new Small biopsy row entry and the planned.json removal.
