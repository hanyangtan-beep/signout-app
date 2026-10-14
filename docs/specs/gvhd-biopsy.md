# GI and oral graft-versus-host disease biopsy

Phase 71 (user request and pulled by the user 2026-10-14; the user asked for oral mucosa to be included). Template `gvhd_biopsy`: "GI and oral graft-versus-host disease biopsy", short name "GI / oral · GVHD biopsy", menu label "GVHD", kind biopsy under GI, rank 64: last in the Small biopsy row and in the GI biopsies. Schema 2026.10, 34 fields and two case fields, written by `scripts/build-gvhd-schema.mjs` (the JSON is the artefact); generator `generators/gvhd_biopsy.js`. There was no menu placeholder. Morphology and sources: `docs/reference/gvhd_biopsy-morphology.md` (the NIH 2014 Pathology Working Group report, the gut GVHD review in Nat Rev Gastroenterol Hepatol 2018, PathologyOutlines and the oral chronic GVHD review cited there). Built in one batch with the lymphoma form (`docs/specs/lymphoma-node.md`).

## Card as pulled (word for word)

```text
### GI and oral graft-versus-host disease biopsy (user request and pulled by the user 2026-10-14)   Size: M
Why:        GVHD biopsies of the gut and the mouth open the colonic, gastric, duodenal or oral forms, none of which records apoptosis, crypt loss, an NIH category or a grade; the Dermatoses form covers the skin only.
Change:     new template `gvhd_biopsy` (GI, biopsy, menu label "GVHD", last in the Small biopsy row). Per part: site (oesophagus to rectum; buccal mucosa, lip with minor salivary glands, tongue, gingiva, palate), pieces and serial sections. Gut: crypt apoptosis (isolated, at least one per piece, numerous, exploding crypts), crypt loss, Paneth cell loss, eosinophils, chronic changes, viral change and the CMV stain, and basal apoptosis in oesophageal squamous mucosa. Mouth: lichenoid interface inflammation, exocytosis, apoptotic keratinocytes and satellitosis; in minor salivary glands periductal lymphocytic inflammation, exocytosis into ducts and acini, acinar loss, periductal fibrosis and the number of lobules. The NIH 2014 category is the qualifier, with the gut grade 1 to 4 from the crypt findings unless set; salivary gland changes read as chronic GVHD; the differential (CMV, mycophenolate, other drugs, infection, conditioning) prints as a sentence. Wording follows the house GI example and the Dermatoses form. Checks for the NIH criteria, superficial apoptosis, eosinophils and mycophenolate, CMV, fewer than five salivary lobules and a biopsy within 20 days of the transplant. Intake: a GI or oral biopsy line whose text or history names GVHD, graft-versus-host disease, an allogeneic or stem cell transplant or BMT comes here.
Untouched:  the colonic, gastric, duodenal, oesophageal, IBD and oral forms and their fixtures; the Dermatoses form's GVHD pattern.
Accept:     fixtures for likely GVHD in the colon (grade 2), possible GVHD with CMV, no GVHD in the duodenum and chronic GVHD in a lip biopsy with minor salivary glands; "Sigmoid colon, biopsy" with "BMT, diarrhoea ?GVHD" goes here, and without a GVHD or transplant word goes where it goes today.
Verify:     tests + browser (light)
Ship:       with batch (Phase 71)
Spec:       `docs/specs/gvhd-biopsy.md`; grounding `docs/reference/gvhd_biopsy-morphology.md`
```

## Case mix (aggregate counts only)

- GI GVHD biopsies number fewer than 10 parts in the 2021–2026 biopsy file, and there are none from the mouth. The house wording comes from those GI reports: "Serial sections show …", apoptosis in the basal crypt epithelium, "No viral cytopathic change or granuloma is seen" and "Please correlate with clinical findings".
- No request line in either export names GVHD or a transplant, so the clinical history decides the route.

## Routing and presets

- A GI or oral line (the site words in `match.site`) comes here when the line, the case prefix or the clinical history meets `match.gate` (GVHD, aGVHD, cGVHD, GVH, graft-versus-host, an allogeneic transplant, HSCT, BMT, PBSCT, a stem cell, bone marrow or haematopoietic cell transplant), unless `match.exclude` names a polyp, polypectomy, mass, tumour, growth, carcinoma, EMR, ESD, a resection or excision, leukoplakia, erythroplakia, dysplasia or a frozen section. A bias of 5 makes a gated line confident over the organ forms, whose site words it shares. A liver transplant history does not gate.
- Presets: the site from an ordered map ("Stomach, antrum" is the gastric antrum, "Lower lip" is the lip), the detail from the line with the site, procedure, GVHD and transplant words removed ("D2", "Lower", "Random"; "post BMT" and "?acute GVHD" are not details), punch or incisional biopsy, and minor salivary glands "Included" for a lip or minor salivary gland line.
- Routing compare against the Phase 70 build over every specimen line in both exports (13,882 lines): no line changes route. With a history, probe lines change as intended: colon, duodenum, stomach, oesophagus, terminal ileum, rectum, lip, buccal mucosa, tongue, palate and minor salivary gland lines with GVHD or transplant histories open the form; a sigmoid biopsy for diarrhoea, a polypectomy, leukoplakia, lichen planus, a ?Sjögren lip biopsy, a skin punch (Dermatoses) and a liver biopsy keep their forms.

## Report

- Specimen: "Sigmoid colon, biopsy", "Duodenum, D2, biopsy", "Lip, lower, biopsy"; several parts are lettered.
- Microscopy opens "Serial sections show …" with the pieces and the mucosa (colonic, duodenal, gastric antral, oesophageal squamous, squamous mucosa with underlying minor salivary glands). Gut: apoptosis in words ("Apoptotic bodies are seen in the basal crypt epithelium of every piece."), exploding crypts in the bowel, crypt or gland dropout, crypt changes, Paneth cells, other features, the lamina propria and eosinophils. Oesophagus: basal apoptosis, exocytosis, atrophy. Mouth: lichenoid interface inflammation, exocytosis, apoptotic keratinocytes with satellitosis; minor salivary glands: the lobules present and their changes. Then viral cytopathic change and granulomas, CMV immunohistochemistry and other stains, the overall features by category, the differential as a sentence, and the optional closing lines ("There is no evidence of dysplasia or malignancy.", "Please correlate with clinical findings.").
- Diagnosis: the findings, then the NIH 2014 category as the qualifier: "- CRYPT APOPTOSIS AND CRYPT DROPOUT, likely GRAFT-VERSUS-HOST DISEASE (grade 2)."; "possible … (please see description)"; "- NO EVIDENCE OF GRAFT-VERSUS-HOST DISEASE." With nothing to name, the category stands alone. Salivary gland changes read as chronic: "- LICHENOID MUCOSITIS AND LYMPHOCYTIC SIALADENITIS, likely CHRONIC GRAFT-VERSUS-HOST DISEASE." CMV prints its own line by site ("- CYTOMEGALOVIRUS COLITIS."; oesophagitis, gastritis, duodenitis, enteritis, proctitis, and infection in the mouth), as do other viral change and a typed additional diagnosis.
- Grade (small bowel and colon, with Likely GVHD only): read from the crypt findings unless set: 1 apoptosis without crypt loss, exploding crypts included; 2 individual crypt loss; 3 contiguous crypt loss; 4 extensive loss with denudation. The stomach, oesophagus and mouth are not graded.
- Phase: "Not stated" prints "graft-versus-host disease"; acute or chronic prints as chosen.

## Checks

- Error: a typed site left blank.
- Warning: Likely GVHD without gut apoptosis, or without oral or salivary changes; apoptotic debris limited to the surface; increased eosinophils with mycophenolate in the history or the case field; CMV near the apoptotic cells with Likely GVHD; fewer than five salivary lobules; salivary changes with the phase set to acute; a biopsy within 20 days of the transplant (from "day +14" in the history or the case field); a grade that the crypt findings do not support.
- Info: Possible GVHD without a differential; increased eosinophils without a drug history; apoptosis with no CMV stain; the salivary lobules not counted; the phase in the gut and in the oral mucosa alone; fewer than eight serial sections.

## Tests and fixtures

- `tests/gvhd_biopsy.test.js` (19 tests), with four golden fixtures in `tests/fixtures/gvhd_biopsy/`: likely GVHD in the colon (grade 2), possible GVHD with CMV, no GVHD in the duodenum, and chronic GVHD in a lip biopsy with minor salivary glands.
- The Small biopsy row and the GI biopsies gain "GVHD" last (`tests/picker.test.js`, `tests/hirschsprung_biopsy.test.js` and `tests/peritoneal_nodule.test.js` changed deliberately; no other order moved).
- Browser QA: "?GVHD" opens the form on the gut fields; grade 2 from crypt dropout; Possible hides the grade and asks for the differential; a lip opens on the oral and salivary fields with the chronic line.

## Not built

- Reference galleries: the form has none yet.
- Liver GVHD; skin GVHD stays a pattern on the Dermatoses form.
- An "Upper GI, biopsies" line that names no organ opens Generic.
