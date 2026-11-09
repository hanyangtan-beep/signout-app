# Placenta — singleton and multiple pregnancy, on the user's wording

Status: **carded 2026-11-09, not built** (user request 2026-11-09: "my reports are rather simple so look at my previous reports to see how to write the template"; user feedback the same day: "the histology of twin placentas is lacking, especially the dividing membrane"). The three placenta cards in `docs/roadmap.md` (Next) point here for the wording.

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

## Multiple pregnancy — form, macroscopy and diagnosis

The five-year file has 20 twin placentas (dichorionic diamniotic 11, monochorionic diamniotic fewer than 10) and no monoamniotic or triplet placenta. Every twin placenta arrived as one specimen.

Form: plurality "Singleton", "Twin" or "Triplet" on the same part. Twin I, II (and III) groups hold the cord (clips, length, diameter, vessels, insertion) and, when the discs are separate, the disc (size, optional weight). Findings carry a twin (I, II or both).

Macroscopy, twin:

1. Received, label and "Specimen weighs N g." as for a singleton.
2. "It consists of a twin placenta with a single cotyledon." or "It consists of a twin placenta with two discrete cotyledons."
3. "The umbilical cord with one clip is designated as twin I, and the umbilical cord with two clips is designated as twin II." (18 of 20).
4. "The umbilical cord of twin I measures N cm long and N cm in diameter, while that of twin II measures N cm long and N cm in diameter; their cut surfaces show three vessels." Velamentous or two vessels name the twin.
5. "A dividing membrane is noted approximately equidistantly between the umbilical cords." Optional: "The dividing membrane is thin." (fewer than 10 of 20). No report describes its opacity or attachment; the guidance gives two options: "The dividing membrane is thin and translucent, and moves over the placental surface." and "The dividing membrane is thick and opaque, and is tethered to the placental surface by a chorionic ridge."
6. Single disc: "The placental disc measures N x N x N cm." Separate discs: "The placental disc of twin I measures N x N x N cm, while that of twin II measures N x N x N cm."
7. Monochorionic fetal surface, optional (no report has it; RCPath G108 asks for it): "The umbilical cord insertions are N cm apart." "The vascular equator divides the disc into about N% for twin I and N% for twin II." "N arterio-arterial, N veno-venous and N arteriovenous anastomoses are seen on the fetal surface." or "No vascular anastomosis is seen on the fetal surface." "Laser coagulation sites are seen along the vascular equator."
8. Membranes and cut surface as for a singleton; a finding names its twin ("…in the placental disc of twin II, measuring N cm across.").
9. "9 representative blocks." keyed "(1) Umbilical cord, twin I. (2) Placental membranes, twin I. (3)-(4) Placental disc, twin I. (5) Umbilical cord, twin II. (6) Placental membranes, twin II. (7)-(8) Placental disc, twin II. (9) Dividing membrane." The dividing membrane block is in 17 of 20. Optional: "(10) T-zone." (the user's key; fewer than 10 of 20).

Microscopy, twin: sentences by default, as every twin report has them; the checklist stays available. This card prints the user's dividing membrane sentence, its layers only; the histology card (next section) fills it out.

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

Triplet: the same groups for triplets I, II and III (one, two and three clips), a dividing membrane for each pair (I/II, II/III, I/III) with chorion present or absent, and a chorionicity line for the set counted from them ("DICHORIONIC TRIAMNIOTIC TRIPLET PLACENTA", "TRICHORIONIC TRIAMNIOTIC TRIPLET PLACENTA"): chorion in all three membranes, trichorionic; one membrane without, dichorionic; none with chorion, monochorionic. There is no triplet report to copy, so the wording carries the twin sentences forward.

## Multiple pregnancy — histology and the dividing membrane

User feedback, 2026-11-09: "the histology of twin placentas is lacking, especially the dividing membrane". The user's twin microscopy gives the dividing membrane one sentence, its layers only (20 of 20; the T-zone is named in fewer than 10), and pools both twins in each sentence. No report describes what the chorion of the dividing membrane holds, the T-zone junction or how the twins compare. The guidance asks for all three: a dichorionic placenta is reported as two singleton placentas plus a description of the dividing membrane, and a monochorionic one describes the dividing membrane and compares the parenchyma supplying each twin (RCPath G108); each twin's cord and territory takes the singleton items, each dividing membrane is examined separately, and discordant inflammatory, vascular or maturation patterns between co-twins are recorded (Malaysian proforma, 2026).

### The dividing membrane

One group per dividing membrane (three in a triplet):

| Field | Options, default first | Prints |
|---|---|---|
| Sampled as | roll; T-zone; roll and T-zone (set from the block key) | which sentences follow |
| Layers | two amnions with chorion between them; two amnions and two chorions; two amnions without chorion; chorion with one amnion, the other detached; incomplete | "The dividing membrane consists of two layers of amnion with an intervening layer of chorion" / "…of two layers of amnion and two layers of chorion" / "…of two layers of amnion without an intervening chorion" / "The sampled dividing membrane consists of a fused chorionic layer with one layer of amnion, while the other amnion is detached" / "The sampled dividing membrane is incomplete, and its layers cannot be assessed" |
| In the chorion (chorion present) | atrophic villi and trophoblastic remnants, both ticked; vessel remnants; fibrinoid | "…containing atrophic villi and trophoblastic remnants" |
| Between the amnions (no chorion) | ticked | "…, with no trophoblast or atrophic villi between them" |
| T-zone (when sampled) | follows the layers: chorionic layers fused with the chorionic plate; two amnions over an uninterrupted chorionic plate; junction not in the section | "At the T-zone, the chorionic layers of the dividing membrane fuse with the chorionic plate, with atrophic villi and fibrinoid at the junction." / "At the T-zone, the two amnions separate over an uninterrupted chorionic plate, with no intervening chorion." / "The junction of the dividing membrane is not represented in the T-zone section." |
| Inflammation | none; twin I aspect; twin II aspect; both aspects | "Acute inflammation involves the twin I aspect of the dividing membrane." |

Dichorionic, roll only (the new default):

"The dividing membrane consists of two layers of amnion with an intervening layer of chorion containing atrophic villi and trophoblastic remnants. The overall findings are consistent with a dichorionic diamniotic twin placenta."

With a T-zone block, before the last sentence: "At the T-zone, the chorionic layers of the dividing membrane fuse with the chorionic plate, with atrophic villi and fibrinoid at the junction."

Monochorionic diamniotic:

"The dividing membrane consists of two layers of amnion without an intervening chorion, with no trophoblast or atrophic villi between them. The overall findings are consistent with a monochorionic diamniotic twin placenta."

With nothing ticked and no T-zone block, the paragraph is the user's one sentence ("…with an intervening layer of chorion, consistent with a dichorionic diamniotic twin placenta.").

Chorionicity is read from the membrane and feeds the diagnosis line and ", confirmed":

| Layers | T-zone | Prints | Diagnosis line |
|---|---|---|---|
| chorion between the amnions (one or two layers) | none, or chorion fused | "consistent with a dichorionic diamniotic twin placenta" | "- DICHORIONIC DIAMNIOTIC TWIN PLACENTA" |
| no chorion | none, or amnions over an uninterrupted plate | "consistent with a monochorionic diamniotic twin placenta" | "- MONOCHORIONIC DIAMNIOTIC TWIN PLACENTA" |
| one amnion detached | none | "compatible with a dichorionic diamniotic twin placenta" | "- Compatible with DICHORIONIC DIAMNIOTIC TWIN PLACENTA" |
| one amnion detached, or incomplete | chorion fused, or amnions over an uninterrupted plate | the T-zone decides, "consistent with" | as the T-zone |
| incomplete | none, or junction not in the section | "Chorionicity cannot be determined on the sampled dividing membrane." | "- DIAMNIOTIC TWIN PLACENTA, chorionicity indeterminate" |

Layers and T-zone that disagree print from the layers, and a Check flags them. No dividing membrane in a single disc gives no membrane paragraph and "- MONOCHORIONIC MONOAMNIOTIC TWIN PLACENTA".

### Each twin

- Combined (default, as the user writes): the sentences pool both twins when they agree and name the twin when they differ. Two sentences now name both twins: "The placental membranes of both twins show no chorioamnionitis." and "The chorionic villi of both twins are of the third trimester, and there is no evidence of villitis."
- By twin (option, for twins whose findings differ): "Twin I:" and "Twin II:" paragraphs, each in the singleton sentences or the singleton checklist, then the dividing membrane:

```
Twin I:
- Villitis:  Absent
- Chorioamnionitis:  Absent
- Funisitis:  Absent
- Additional notes:  Third trimester chorionic villi are seen. The umbilical cord
                     contains two arteries and one vein.

Twin II:
- Villitis:  Absent
- Chorioamnionitis:  Present, mild
- Funisitis:  Absent
- Additional notes:  Third trimester chorionic villi are seen. The umbilical cord
                     contains two arteries and one vein.

Dividing membrane:  Two layers of amnion with an intervening layer of chorion
                    containing atrophic villi and trophoblastic remnants,
                    consistent with a dichorionic diamniotic twin placenta.
```

- Every Amsterdam finding is recorded for its twin, as for a singleton; chorioamnionitis that reaches the dividing membrane adds the aspect sentence above.

### Monochorionic twins: the two territories

- Similar (default): "The villi of the two twin territories are of similar maturity and vascularity."
- Discordant: the less mature twin, optionally hydropic, and the other twin's villi: "The villi of the twin II territory are immature and hydropic, while those of twin I are mature and well vascularised." Diagnosis: "- DISCORDANT VILLOUS MATURATION, twin II territory less mature."
- The report states what is seen; a link to twin-to-twin transfusion or twin anaemia–polycythaemia sequence is the user's comment, not printed by default.

### Triplets

Each of the three dividing membranes takes the group above, and two triplets that share a chorion take the territory comparison. Printed: "The dividing membrane between triplets I and II consists of two layers of amnion without an intervening chorion, while those between triplets II and III and between triplets I and III each consist of two layers of amnion with an intervening layer of chorion containing atrophic villi and trophoblastic remnants. The overall findings are consistent with a dichorionic triamniotic triplet placenta."

## Checks (not printed)

Multiple pregnancy — form, macroscopy and diagnosis:

- A twin or triplet placenta with no dividing membrane block: the dividing membrane, as a roll or a T-zone section, is the sample that proves chorionicity (Best Practice No 178).
- The request states a chorionicity that differs from the dividing membrane.

Multiple pregnancy — histology and the dividing membrane:

- The layers and the T-zone point to different chorionicities.
- An amnion-only dividing membrane with two separate discs: a monochorionic diamniotic placenta is a single disc (PathologyOutlines).
- One amnion detached and no T-zone block: a dislodged amnion is a frequent artefact (Benirschke), and a properly oriented T section is the best sample to prove chorionicity (Best Practice No 178).
- A monochorionic placenta whose disc blocks are not keyed to each twin: the histology compares the parenchyma supplying each twin (RCPath G108).
- Twin-to-twin transfusion, twin anaemia–polycythaemia sequence, laser treatment or growth discordance in the history: sample each twin's territory, compare them, and record laser sites and whether the anastomoses are fully interrupted (RCPath G108).
- Monoamniotic twins: sections from any cord stricture, and a search for fetal vascular malperfusion in the parenchyma (APMIS 2018).
- Chorioamnionitis or funisitis in twin II but not twin I: the lower, presenting twin usually shows the stronger response (APMIS 2018); check the cord labels.
- Triplet membranes that cannot all be true (two pairs without chorion and the third with it).

## Intake

Every placenta line already routes to `placenta` (checked 2026-11-09: "Placenta", "Placenta, Placenta", "Others, Placenta, whole", "Placenta for section, Placenta", "Placenta, LSCS", "Twin placenta", "Triplet placenta"). The multiple-pregnancy card adds presets: "twin", "DCDA" or "MCDA" on the specimen line or in the history sets plurality twin and the stated chorionicity; "triplet" sets triplet.

## Tests (planned)

- `tests/placenta.test.js` strings change on purpose, by this request.
- New golden fixtures in `tests/fixtures/placenta/`: singleton with no significant pathology (checklist); singleton after LSCS with acute chorioamnionitis, funisitis and an infarct block; singleton in the sentence style; dichorionic diamniotic twins with separate discs; monochorionic diamniotic twins with a fused disc, fetal-surface anastomoses and a T-zone block; dichorionic twins with funisitis in twin I; a dichorionic triamniotic triplet placenta.
- Histology card fixtures: dichorionic diamniotic twins with the default chorion contents and a T-zone block; monochorionic diamniotic twins with discordant villous maturation in twin II; a roll with one amnion detached, without and then with a T-zone block ("compatible with", then "consistent with"); twins by twin in the checklist; an incomplete membrane with no T-zone block ("chorionicity indeterminate"). Unticking the chorion contents with no T-zone block prints the user's one sentence, and each Check fires on its case and stays silent on the default twins.
- The twin fixtures of the form card change in the histology card only in the dividing membrane paragraph and "of both twins", on purpose, with the reason in each fixture description.
- A case saved on the Phase 4b form (its example values) opens and prints without "undefined", empty sentences or the old wording.
- The placenta cases in `tests/fixtures/macro/cases.json` and `tests/fixtures/intake/cases.json` pass unchanged.

## Open points for the user

- "lustre" (British) rather than the reports' "luster".
- Checklist by default for a singleton, sentences for twins.
- The chorionicity line before the findings in a twin diagnosis.
- Triplet wording, which no report shows yet.
- "atrophic villi and trophoblastic remnants" ticked by default in a dichorionic dividing membrane.
- "of both twins" in the membrane and villous sentences.
- "- DISCORDANT VILLOUS MATURATION, twin II territory less mature." and "- DIAMNIOTIC TWIN PLACENTA, chorionicity indeterminate".
- The T-zone block stays optional (fewer than 10 of the 20 twins have one).

## Grounding

House wording comes from the user's reports, counted in aggregate. Chorionicity from the dividing membrane (two amnions with chorion between them in a dichorionic placenta, two amnions alone in a monochorionic diamniotic one, no dividing membrane in a monoamniotic one): https://www.pathologyoutlines.com/topic/placentatwins.html. Labelling the twin cords, and the dividing membrane as a roll or a T section, the T section being the best sample to prove chorionicity: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC1770400/.

Dividing membrane histology: a monochorionic diamniotic membrane is two amnions only, with a space between them and no vessel remnants, and its T section shows the chorion continuous over the placental surface with the amnions separating; a dichorionic membrane has remnants of villi and vessels in its four layers, its T section shows atrophic villi and trophoblastic remnants extending between the two chorionic membranes, its fetal surface a white ridge of fibrin, and an amnion dislodged from the chorion is a frequent artefact (Benirschke, Burton and Baergen, Pathology of the Human Placenta, chapter 25): http://link.springer.com/chapter/10.1007/978-3-642-23941-0_28.

Opposed layers of chorion in a dichorionic membrane and back-to-back amnion in a monochorionic one; membrane rolls; the T-zone ridge of fibrinoid in a dichorionic placenta and its absence in a monochorionic one; donor villi immature or hydropic and recipient villi mature and well vascularised in twin-to-twin transfusion; the stronger inflammatory response of the lower, presenting twin; stricture sections and fetal vascular malperfusion in monoamniotic twins (APMIS 2018): https://onlinelibrary.wiley.com/doi/10.1111/apm.12829.

Dichorionic: four thin layers, tethered by a chorionic ridge, a roll or a T-block as histological confirmation, and the report as two singleton placentas plus the dividing membrane. Monochorionic: two thin layers, mobile; the cord insertions and the distance between them, the shares, the anastomoses and laser sites; samples from each twin's territory and a histology that compares them (RCPath G108, September 2022): https://www.rcpath.org/static/ec614dfa-007c-4a93-8173cb202a071a72/a8b51280-edf3-4414-9197ab58d641bafd/G108-Tissue-pathway-for-histopathological-examination-of-the-placenta.pdf.

Each twin's cord and territory on the singleton items, each dividing membrane examined separately, and discordant patterns between co-twins recorded (Malaysian placental reporting guideline, Malays J Pathol 2026;48(2):203–227): https://www.mjpath.org.my/2026/v48n2/standardised-placental-pathology-reporting.pdf.

Twin anaemia–polycythaemia sequence: delayed villous maturation, often with hydrops, in donor territories, and accelerated maturation and increased fetal vascularity in recipient ones (Placenta, 2026): https://pubmed.ncbi.nlm.nih.gov/42097098/.
