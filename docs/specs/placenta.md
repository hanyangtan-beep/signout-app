# Placenta — singleton and multiple pregnancy, on the user's wording

Status: **carded 2026-11-09, not built** (user request 2026-11-09: "my reports are rather simple so look at my previous reports to see how to write the template"). The two placenta cards in `docs/roadmap.md` (Next) point here for the wording.

Measure: the five-year biopsy file (January 2021 to 14 September 2026) holds 372 delivered placentas, all reported by the user. "Newest third" is the 124 most recent. Counts are aggregate; no case numbers or dates are kept, and counts under 10 read "fewer than 10". The 2024–2026 LIS export routes 99 cases (about 2 per cent) to `placenta` (`docs/case-mix-2026-09.md`).

## What changes

The Phase 4b form (2026-09-10) prints "The placenta weighs 480 g. Consists of a singleton placenta…", "…and contains three vessels", "The membranes are complete, translucent and marginally inserted", "The cut surfaces are unremarkable", "Representative sections in 4 blocks", a narrative microscopy and "PLACENTA, singleton, third trimester - NO SIGNIFICANT PATHOLOGY". None of these is the user's current wording. Twins are two parts, with no dividing-membrane or chorionicity field.

Kept: the template id, its intake routes (every placenta line already routes to `placenta`, twin and triplet lines included), the field ids that intake and pasted macroscopy fill (`weight`, `discSize`, `cordLength`, `cordDiameter`, `blocks`), the Amsterdam fields and "fetal" left unconverted (`src/style.js`).

## Singleton — macroscopy

Report order, defaults first:

1. "(Specimen received in formalin)" when received in formalin (32 of the newest 124).
2. The container label, "'Placenta'.", when given (39 of the newest 120 singletons).
3. "Specimen weighs 480 g." (63 of 124). Optional: "The trimmed weight of the placenta is N g." (21 reports in all).
4. "It consists of a singleton placenta with an eccentrically inserted umbilical cord." Centrally: "…with a centrally inserted umbilical cord." (eccentrically 74, centrally 40 of 124). Velamentous, after the cord sentence: "…; it is inserted into the extraplacental membranes, in keeping with velamentous insertion."
5. "The umbilical cord measures 45 cm long and 1.2 cm in diameter; its cut surface shows three vessels." (101 of 124). Two vessels: "…shows two vessels." Optional: "A false knot is seen N cm from the umbilical cord insertion site."
6. "The placental disc measures 18 x 16 x 2.5 cm."
7. Membranes, one of: "The placental membranes are smooth and show no loss of lustre." (default, 52 of the newest 120 singletons), "The placental membranes are smooth." (21), "The placental membranes are dull." (15), "The placental membranes are meconium-stained." (fewer than 10). The reports mostly spell it "luster"; the form prints the British "lustre".
8. Fragmented, optional: "The placental disc has been fragmented prior to submission, and completeness cannot be assessed."
9. Cut surface: "No significant retroplacental haematoma or infarct is seen." (92 of 120; the reports split "hematoma" and "haematoma", the form prints "haematoma"). A finding replaces it, with its size: "Focally, an infarcted area is seen within the placenta, measuring N cm across." / "Sectioning of the placenta shows several peripheral infarcts, the largest of which measures N cm across." / "Focal retroplacental haematoma is seen, measuring N x N cm in area."
10. "4 representative blocks." (99 of 124), then the key "(1) Umbilical cord. (2) Placental membranes. (3)&(4) Placental disc." (78 of 124). More blocks extend the disc range; a lesion block names the lesion ("(5) Infarct."). The three-block key "(1) Umbilical cord and membrane roll. (2)&(3) Placental disc." is an option.

## Singleton — microscopy

Two styles, chosen per case.

Checklist (default; 101 of the newest 124):

```
- Villitis:  Absent
- Chorioamnionitis:  Absent
- Funisitis:  Absent
- Additional notes:  Third trimester chorionic villi are seen. The umbilical cord
                     contains two arteries and one vein.
```

- Two spaces after each colon; a wrapped line hangs under the value, as the reports wrap it.
- Values: "Absent" or "Present", with an optional qualifier after a comma. Chorioamnionitis: focal, mild, moderate, severe, subchorionitis. Funisitis: focal, mild, within the vein, within an artery, with extension into the cord substance. In the checklist reports villitis is always "Absent"; chorioamnionitis is present in 44 of 131 and funisitis in 29.
- Additional notes: the villous maturity ("Third trimester chorionic villi are seen." by default; second trimester, immature, mature), the cord vessels ("The umbilical cord contains two arteries and one vein."), then any positive Amsterdam finding as a sentence, then free text.

Sentences (the fuller form of 20 reports, most of them recent):

"The umbilical cord contains three patent vessels with no evidence of vasculitis or funisitis. The extraplacental membranes show no significant inflammation. The chorionic villi show appropriate development for third trimester gestation. There is no acute or chronic villitis or intervillositis. No viral inclusions are seen. There are no features of fetal or maternal vascular malperfusion. Maternal vessels show appropriate transformation for the gestational age. There is no chronic deciduitis or retroplacental haemorrhage."

Each Amsterdam field (maternal and fetal inflammatory response with stage, villitis with grade, MVM, FVM, villous maturation, meconium, intervillous thrombi) replaces its negative with the finding.

## Singleton — diagnosis

The user's line layout (278 of the 372 reports, 86 of the newest 124), as the Hirschsprung biopsy form prints it:

```
PLACENTA:
- NO SIGNIFICANT PATHOLOGY.
```

- Head: "PLACENTA" (300 of 372), with the delivery from the specimen line when given ("PLACENTA, LSCS:" 21, "PLACENTA, resection:" 12, "PLACENTA, normal spontaneous delivery:" 11, others fewer than 10 each). In a multi-part case the head takes its part letter, "(A) PLACENTA:".
- One finding per line, ";" between lines and "." after the last: "- Acute CHORIOAMNIONITIS;" "- Mild acute FUNISITIS."
- Vocabulary, most used first: NO SIGNIFICANT PATHOLOGY; CHORIOAMNIONITIS and FUNISITIS with "Acute", "Mild", "Early", "Moderate" or "Severe" before them; "Perivillous FIBRIN DEPOSITION"; "Focal INFARCT"; "Retroplacental HAEMATOMA"; "CHORANGIOSIS"; "VILLITIS"; "Acute SUBCHORIONITIS". Free text covers the rest.

## Multiple pregnancy

The five-year file has 20 twin placentas (dichorionic diamniotic 11, monochorionic diamniotic fewer than 10) and no monoamniotic or triplet placenta. Every twin placenta arrived as one specimen.

Form: plurality "Singleton", "Twin" or "Triplet" on the same part. Twin I, II (and III) groups hold the cord (clips, length, diameter, vessels, insertion) and, when the discs are separate, the disc (size, optional weight). Findings carry a twin (I, II or both).

Macroscopy, twin:

1. Received, label and "Specimen weighs N g." as for a singleton.
2. "It consists of a twin placenta with a single cotyledon." or "It consists of a twin placenta with two discrete cotyledons."
3. "The umbilical cord with one clip is designated as twin I, and the umbilical cord with two clips is designated as twin II." (18 of 20).
4. "The umbilical cord of twin I measures N cm long and N cm in diameter, while that of twin II measures N cm long and N cm in diameter; their cut surfaces show three vessels." Velamentous or two vessels name the twin.
5. "A dividing membrane is noted approximately equidistantly between the umbilical cords." Optional: "The dividing membrane is thin."
6. Single disc: "The placental disc measures N x N x N cm." Separate discs: "The placental disc of twin I measures N x N x N cm, while that of twin II measures N x N x N cm."
7. Membranes and cut surface as for a singleton; a finding names its twin ("…in the placental disc of twin II, measuring N cm across.").
8. "9 representative blocks." keyed "(1) Umbilical cord, twin I. (2) Placental membranes, twin I. (3)-(4) Placental disc, twin I. (5) Umbilical cord, twin II. (6) Placental membranes, twin II. (7)-(8) Placental disc, twin II. (9) Dividing membrane." The dividing membrane block is in 17 of 20. Optional: "(10) T-zone (placenta under the dividing membrane)."

Microscopy, twin: sentences by default, as every twin report has them; the checklist stays available.

"Sections of both umbilical cords show two arteries and one vein with no funisitis. The placental membranes show no chorioamnionitis. The chorionic villi are of the third trimester, and there is no evidence of villitis. The dividing membrane consists of two layers of amnion with an intervening layer of chorion, consistent with a dichorionic diamniotic twin placenta."

- Monochorionic diamniotic: "…two layers of amnion without an intervening chorion, consistent with a monochorionic diamniotic twin placenta."
- Partly detached membrane: "The sampled dividing membrane consists of a fused chorionic layer with one layer of amnion, while the other amnion is detached; the findings are compatible with a dichorionic diamniotic twin placenta."
- A finding names its twin: "Neutrophilic infiltrates are noted within the chorionic plate vessels of twin I, in keeping with early acute funisitis."

Diagnosis, twin:

```
PLACENTA:
- DICHORIONIC DIAMNIOTIC TWIN PLACENTA, confirmed;
- Early acute FUNISITIS, twin I.
```

- The chorionicity line comes first. ", confirmed" prints when the request states the chorionicity (13 of the 20 twin diagnoses say "confirmed"); the partly detached membrane gives "- Compatible with DICHORIONIC DIAMNIOTIC TWIN PLACENTA".
- Findings follow with their twin: "- VELAMENTOUS INSERTION of the umbilical cord, twin II.", "- Focal INFARCT, twin II.", "- Umbilical cord of twin II with one artery and one vein."

Triplet: the same groups for triplets I, II and III (one, two and three clips), dividing membranes between each pair and a chorionicity line for the set ("DICHORIONIC TRIAMNIOTIC TRIPLET PLACENTA", "TRICHORIONIC TRIAMNIOTIC TRIPLET PLACENTA"). There is no triplet report to copy, so the wording carries the twin sentences forward.

## Checks (not printed)

- A twin or triplet placenta with no dividing membrane block: the dividing membrane, as a roll or a T-zone section, is the sample that proves chorionicity (Best Practice No 178).
- The request states a chorionicity that differs from the dividing membrane.

## Intake

Every placenta line already routes to `placenta` (checked 2026-11-09: "Placenta", "Placenta, Placenta", "Others, Placenta, whole", "Placenta for section, Placenta", "Placenta, LSCS", "Twin placenta", "Triplet placenta"). The multiple-pregnancy card adds presets: "twin", "DCDA" or "MCDA" on the specimen line or in the history sets plurality twin and the stated chorionicity; "triplet" sets triplet.

## Tests (planned)

- `tests/placenta.test.js` strings change on purpose, by this request.
- New golden fixtures in `tests/fixtures/placenta/`: singleton with no significant pathology (checklist); singleton after LSCS with acute chorioamnionitis, funisitis and an infarct block; singleton in the sentence style; dichorionic diamniotic twins with separate discs; monochorionic diamniotic twins with a fused disc and a T-zone block; dichorionic twins with funisitis in twin I; a dichorionic triamniotic triplet placenta.
- A case saved on the Phase 4b form (its example values) opens and prints without "undefined", empty sentences or the old wording.
- The placenta cases in `tests/fixtures/macro/cases.json` and `tests/fixtures/intake/cases.json` pass unchanged.

## Open points for the user

- "lustre" (British) rather than the reports' "luster".
- Checklist by default for a singleton, sentences for twins.
- The chorionicity line before the findings in a twin diagnosis.
- Triplet wording, which no report shows yet.

## Grounding

House wording comes from the user's reports, counted in aggregate. Chorionicity from the dividing membrane (two amnions with chorion between them in a dichorionic placenta, two amnions alone in a monochorionic diamniotic one, no dividing membrane in a monoamniotic one): https://www.pathologyoutlines.com/topic/placentatwins.html. Labelling the twin cords, and the dividing membrane as a roll or a T section, the T section being the best sample to prove chorionicity: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC1770400/.
