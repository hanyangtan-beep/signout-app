# Inflammatory dermatoses — medical skin biopsy

Phase 68 (user request and pulled by the user 2026-10-11). Template `skin_inflammatory`: "Skin biopsy (inflammatory)", menu label "Dermatoses", in the Small biopsy row after Oral cavity. Morphology and sources: `docs/reference/skin_inflammatory-morphology.md` (RCPath G075, the NIH 2014 GVHD Pathology Working Group report and the dermatopathology literature cited there). The form replaces the "Inflammatory dermatoses" placeholder in `templates/planned.json`.

## Case mix (aggregate counts only)

- 2021–2026 biopsy export: 146 inflammatory skin parts and 23 skin infections, against 654 skin lesions. The lesions stay on Skin excision, Skin lesion and Skin cyst.
- A skin punch is a medical biopsy in 77% of punch parts on the biopsy export and 89% on the LIS export. An excision is a lesion in 90% and 91%. Incisional biopsies are split.
- On the LIS export, 91% of skin site lines are "Skin, <site>" and 96% carry no procedure word, so the clinical history decides the route.
- GVHD skin biopsies number fewer than 10 at any site over five years. GVHD is therefore a pattern on this form, not a form of its own.

## Routing and presets

- The form opens on a skin or scalp line with punch, biopsy or incisional, or with a rash-type history. A lesion word in the line or history (BCC, SCC, melanoma, naevus, keratosis, cyst, tumour, lesion, lump, mass and similar) keeps the excision forms unless a rash word is also present. Excision lines route as before.
- A bare "Skin, <site>, punch biopsy" opens this form. A bare "Skin, <site>" or a bare shave asks.
- Presets fill the site from either line form, the procedure, and the GVHD pattern when the history names GVHD, an allogeneic or stem cell / bone marrow transplant. To make this possible, intake passes the request history to the presets (`applyFill(schema, part, values, history)`). Rows are held in memory only.

## Report

- **Diagnosis line:** "SKIN, <site>, punch biopsy - <PATTERN or ENTITY>".
  - A pattern prints with " (please see description)".
  - With certainty on Auto, an entity the histology defines prints alone. One that needs the clinical picture follows its pattern with "in keeping with", for example "SPONGIOTIC DERMATITIS, in keeping with ALLERGIC CONTACT DERMATITIS".
  - Pemphigus, pemphigoid, dermatitis herpetiformis and linear IgA disease print alone only with their own positive deposit on direct immunofluorescence.
  - Certainty can be set by hand.
  - Eosinophils name themselves after the pattern: "SPONGIOTIC DERMATITIS with EOSINOPHILS".
  - No pattern gives "NO SIGNIFICANT HISTOLOGICAL ABNORMALITY".
- **Microscopy:**
  - It opens "Sections show a piece of skin down to the <depth>." It then describes the epidermis and the dermis or subcutis for the pattern, the infiltrate, special stains (PASD, mucin, organisms) and direct immunofluorescence.
  - Negative reagents are listed for the immunobullous deposits only.
  - Closing sentences, in order: notes, overall features, differential, an optional "no evidence of malignancy", and "Please correlate with clinical findings."
- **GVHD:** the NIH 2014 final categories ("Likely GVHD", "Possible GVHD", "Not GVHD") are the qualifiers:
  - Likely: "INTERFACE DERMATITIS, likely ACUTE GRAFT-VERSUS-HOST DISEASE (Lerner grade II)".
  - Possible: "…possible…", with the pointer and the differential.
  - Not GVHD: "NO EVIDENCE OF GRAFT-VERSUS-HOST DISEASE".
  - Chronic GVHD names its pattern in brackets (lichen planus-like, morphoea-like or lichen sclerosus-like) and is not Lerner-graded.
  - The Lerner grade reads from the features ticked (I basal vacuolar change, II apoptotic keratinocytes, III subepidermal clefts, IV separation of the epidermis). It can be set by hand or left "Not graded", and prints with Likely GVHD only.

## Checks

- **Info:**
  - No PASD on a spongiotic or psoriasiform pattern.
  - A blistering disease without direct immunofluorescence.
  - Pityrosporum folliculitis without yeasts, or Demodex folliculitis without mites.
  - Possible GVHD without a differential.
  - A Lerner grade set by hand that differs from the features.
- **Warning:**
  - Dermatophytosis without a positive PASD.
  - An immunofluorescence-defined disease with a different deposit.
  - "Other" deposits without a description.
  - A panniculitis on sections that do not reach the subcutis.
  - The perivascular pattern with a band-like, interstitial or diffuse infiltrate.
  - Likely acute GVHD without apoptotic cells recorded.

## Not built (Later)

- GI graft-versus-host disease on gastric, duodenal and colonic biopsies (NIH 2014 categories and a modified Lerner grade; research in §20.9 of the reference document).
- Reference images for the inflammatory patterns. The form's reference panels are text only.
- Alopecia on horizontal sections (follicle counts and ratios).
