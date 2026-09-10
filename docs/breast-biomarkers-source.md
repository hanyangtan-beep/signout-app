# Breast biomarkers — source template (exact fields and logic)

Source: https://awiloqmh.github.io/CancerReportingTemplate/Biomarker-Breast-markers.html (Han's CancerReportingTemplate, "Breast biomarkers"; CAP Breast Biomarker template basis). Saved copy: `docs/reference/Biomarker-Breast-markers.html` (fetched 2026-09-10).

**Porting rule (user instruction 2026-09-10): the sign-out app's breast biomarker block must use these fields, option strings, output lines and pre-analytic logic exactly as they are here.** Do not rewrite into house prose; the only permitted change is the field-id naming used by the schema (map `A01` → `er` etc.) and British spelling is NOT applied to this block (the template text is reproduced verbatim).

## Fields (form ids, labels, options)

### `A01` — Estrogen receptor (ER) IHC (select)
- Cannot be determined
- Negative
- Positive (Allred score >2)
- Negative, Internal control cells present and stain as expected
- Negative, Internal control cells absent
- Negative, other (specify):
- Positive (>10% positive nuclei)
- Low Positive (1-10% positive nuclei)

### `A02` — ER intensity (select)
- Negative (0)
- Weak staining (1)
- Moderate staining (2)
- Strong staining (3)

### `A03` — ER positive nuclei (%) (Allred proportion score) (select)
- None (0)
- < 1% (1)
- 1-10% (2)
- 11-33% (3)
- 34-65% (4)
- 66-100% (5)

### `A04` — Progesterone receptor (PR) IHC (select)
- Cannot be determined
- Negative
- Positive (Allred score >2)
- Negative, Internal control cells present and stain as expected
- Negative, Internal control cells absent
- Negative, other (specify):
- Positive (>10% positive nuclei)

### `A05` — PR intensity (select)
- Negative (0)
- Weak staining (1)
- Moderate staining (2)
- Strong staining (3)

### `A06` — PR positive nuclei (%) (Allred proportion score) (select)
- None (0)
- < 1% (1)
- 1-10% (2)
- 11-33% (3)
- 34-65% (4)
- 66-100% (5)

### `A07` — HER2/neu oncoprotein IHC (select)
- Cannot be determined
- Negative for over-expression
- Equivocal for over-expression
- Positive for over-expression
- HER2-low (IHC 1+ or IHC 2+ & DISH-)
- HER2-ultra-low (faint/barely perceptible and incomplete staining in <10% of tumor cells without amplification on FISH)

### `A08` — HER2 IHC score (select)
- No membrane staining detected (0 / absent membrane staining)
- Membrane staining that is incomplete and is faint / barely perceptible and in less than or equal to 10% of tumor cells (0+ / with membrane staining)
- Incomplete membrane staining that is faint / barely perceptible and in greater than 10% of tumor cells (Score 1+)
- Weak to moderate complete membrane staining observed in greater than 10% of tumor cells (Score 2+)
- Less than or equal to 10% of the cancer has circumferential staining that is complete and intense (3+) (heterogeneous, but very limited in extent; consider results of additional samples) (Score 2+)
- Abundant cytoplasmic staining present, obscuring evaluation of membrane stain intensity (Score 2+)
- Circumferential membrane staining that is complete, intense, and in greater than 10% of tumor cells (Score 3+)

### `A09` — HER2/neu oncoprotein DISH (select)
- Cannot be determined
- Negative (HER2 gene is not amplified)
- Positive (HER2 gene is amplified)
- Negative (not amplified, Group 5 result)
- Negative, Group 2 ISH result (with IHC 0-2+)
- Negative, Group 3 ISH result (with IHC 0-1+)
- Negative, Group 4 ISH result (with IHC 0-2+)
- Positive (amplified, Group 1 result in greater than 10% of cell population)
- Positive, Group 2 ISH result (with IHC 3+)
- Positive, Group 3 ISH result (with IHC 2-3+)
- Positive, Group 4 ISH result (with IHC 3+)

### `A29` — Test type (select)
- Laboratory-developed test (QMH, HK).
- Food and Drug Administration (FDA) cleared (specify test / vendor):
- Laboratory-developed test, Non-U.S.-based health systems. [value: Laboratory-developed test (Non-U.S.-based health systems).]
- Laboratory-developed test, Health Canada Approved (specify test / vendor): [value: Laboratory-developed test (Health Canada Approved (specify test / vendor:).]
- Other (specify):
- `A16` — Ki67 proliferation index % (text)
- `A25` — Clustered heterogeneity (text)
- `A10` — Number of tumor cells counted (text)
- `A11` — Average HER2 signals (black) per cell (text)
- `A12` — Average CEP17 signals (red) per cell (text)
- `A13` — HER2/CEP17 ratio (text)
- `A26` — Cells with amplified signals (%) (text)
- `A14` — Other ISH abnormalities: Aneusomy (checkbox) (checkbox):     - Aneusomy
- `A15` — Other ISH abnormalities: Heterogeneous signals (checkbox) (checkbox):     - Heterogeneous signals
- `A28` — Cold ischemia time (min) (text)
- `A27` — Fixation time in buffered formalin (hours) (text)
- `A19` — Additional notes (textarea)

Notes:
- `A01`/`A04`: the first three options (Cannot be determined / Negative / Positive (Allred score >2)) are the legacy Allred set; the remaining options are the current ASCO/CAP set. Keep all of them.
- `A03`/`A06` value in parentheses is the Allred proportion score; `A02`/`A05` value in parentheses is the intensity score. Allred total = proportion + intensity (0, 2–8).
- `A14`/`A15` are checkboxes whose value text is printed when checked.

## Output layout (verbatim, each line printed only when its field is non-empty)

```
- Estrogen receptor: <A01>
  - Intensity: <A02>
  - Positive nuclei(%) : <A03>
- Progesterone receptor: <A04>
  - Intensity: <A05>
  - Positive nuclei(%) : <A06>
- HER2/neu oncoprotein IHC: <A07>
  - Score : <A08>
  - Clustered Heterogeneity : <A25>
- HER2 DISH : <A09>
  - Number of tumor cell counted : <A10>
  - Average number of HER2 signals (black) per cell : <A11>
  - Average number of CEP17 signals (red) per cell : <A12>
  - HER2/CEP17 ratio : <A13>
  - Percentage of Cells with Amplified HER2 Signals : <A26>
  - Other ISH abnormalities:
<A14 text if checked>
<A15 text if checked>
- Proliferation index Ki67 (%) : <A16>

- Cold ischemia time : <A28> min          | or, if blank: - Cold ischemic time is uncertain.
  - Optimal (<= 60 min).                  | if A28 <= 60
  - Prolonged intervals (> 60 min).       | if A28 > 60
- Fixation time in buffered formalin : <A27> hours   | or, if blank: - Formalin fixation time is uncertain.
  - Inadequate fixation (<6 hours).       | if A27 < 6
  - Optimal fixation (6-72 hours).        | if 6 <= A27 <= 72
  - Prolonged intervals (>72 hours).      | if A27 > 72

- Meet requirements specified in the latest version of the ASCO/CAP guidelines.
      | if A28 non-blank and A28 <= 60 and 6 <= A27 <= 72
- Given the uncertain cold ischaemia time and/or uncertain fixation time, please interpret the above results with caution.
      | else if A28 blank or A27 blank
- Given the suboptimal cold ischaemia time and/or suboptimal formalin fixation time, please interpret the above results with caution.
      | else if A28 > 60 or A27 < 6 or A27 > 72
- Test type : <A29>

- Additional notes:
  - <A19>
```

Followed by the methodology sentences (ER/PR sentence when A01 or A04 set; HER2 IHC sentence when A07 set; Dual ISH sentence when A09 set) and the conditional interpretive comments (ER internal controls absent; ER low positive; HER2 positive; HER2 negative / low / ultra-low; ISH Group 2, Group 3, Group 4). The exact strings and conditions are in the script below.

## Report-building script (verbatim from the page)

```javascript
function updateDescription (frm) 
{
    var Template = ""

if (frm.A01.value !== ""){
	Template += "- Estrogen receptor: " + frm.A01.value + "\n";
}

if (frm.A02.value !== ""){
	Template += "  - Intensity: " + frm.A02.value + "\n";
}

if (frm.A03.value !== ""){
	Template += "  - Positive nuclei(%) : " + frm.A03.value + "\n";
}

if (frm.A04.value !== ""){
	Template += "- Progesterone receptor: " + frm.A04.value + "\n";
}

if (frm.A05.value !== ""){
	Template += "  - Intensity: " + frm.A05.value + "\n";
}

if (frm.A06.value !== ""){
	Template += "  - Positive nuclei(%) : " + frm.A06.value + "\n";
}

if (frm.A07.value !== ""){
	Template += "- HER2/neu oncoprotein IHC: " + frm.A07.value + "\n";
}

if (frm.A08.value !== ""){
	Template += "  - Score : " + frm.A08.value + "\n";
}

if (frm.A25.value !== ""){
	Template += "  - Clustered Heterogeneity : " + frm.A25.value + "\n";
}

if (frm.A09.value !== ""){
	Template += "- HER2 DISH : " + frm.A09.value + "\n";
}

if (frm.A10.value !== ""){
	Template += "  - Number of tumor cell counted : " + frm.A10.value + "\n";
}

if (frm.A11.value !== ""){
	Template += "  - Average number of HER2 signals (black) per cell : " + frm.A11.value + "\n";
}

if (frm.A12.value !== ""){
	Template += "  - Average number of CEP17 signals (red) per cell : " + frm.A12.value + "\n";
}

if (frm.A13.value !== ""){
	Template += "  - HER2/CEP17 ratio : " + frm.A13.value + "\n";
}

if (frm.A26.value !== ""){
	Template += "  - Percentage of Cells with Amplified HER2 Signals : " + frm.A26.value + "\n";
}

if (document.getElementById("A14").checked || document.getElementById("A15").checked){
	Template += "  - Other ISH abnormalities: "  + "\n";
}

if (document.getElementById("A14").checked){
	Template += frm.A14.value + "\n";
}

if (document.getElementById("A15").checked){
	Template += frm.A15.value + "\n";
}

if (frm.A16.value !== ""){
	Template += "- Proliferation index Ki67 (%) : "+ frm.A16.value + "\n";
}

if (frm.A28.value !== ""){
	Template += "\n" + "- Cold ischemia time : " + frm.A28.value + " min";
} else {
		Template += "\n" + "- Cold ischemic time is uncertain." ;
}

if (frm.A28.value <= 60 && frm.A28.value !== ""){
		Template += "\n" + "  - Optimal (<= 60 min)." ;
}

if (frm.A28.value > 60  && frm.A28.value !== ""){
		Template += "\n" + "  - Prolonged intervals (> 60 min)." ;
}

if (frm.A27.value !== ""){
	Template += "\n" + "- Fixation time in buffered formalin : " + frm.A27.value + " hours";
}else {
		Template += "\n" + "- Formalin fixation time is uncertain." ;
}

if (frm.A27.value < 6  && frm.A27.value !== ""){
		Template += "\n" + "  - Inadequate fixation (<6 hours)." ;
}

if (frm.A27.value >= 6 && frm.A27.value <= 72 && frm.A27.value !== ""){
		Template += "\n" + "  - Optimal fixation (6-72 hours)." ;
}

if (frm.A27.value > 72  && frm.A27.value !== ""){
		Template += "\n" + "  - Prolonged intervals (>72 hours)." ;
}

if (frm.A28.value !== "" && frm.A28.value <= 60 && frm.A27.value >= 6 && frm.A27.value <= 72){
	Template += "\n" + "- Meet requirements specified in the latest version of the ASCO/CAP guidelines." + "\n"  ;
} else if (frm.A28.value == "" || frm.A27.value == ""){
	Template += "\n" + "- Given the uncertain cold ischaemia time and/or uncertain fixation time, please interpret the above results with caution." + "\n" ;
} else if (frm.A28.value > 60 || frm.A27.value < 6 || frm.A27.value > 72){
	Template += "\n" + "- Given the suboptimal cold ischaemia time and/or suboptimal formalin fixation time, please interpret the above results with caution." + "\n" ;
} 

if (frm.A29.value !== ""){
	Template += "- Test type : " + frm.A29.value + "\n";
}

if (frm.A19.value !== ""){
	Template += "\n" + "- Additional notes: " + "\n" + "  - " + frm.A19.value + "\n";
}

if (frm.A01.value + frm.A04.value !== ""){
	Template += "\n" + "Formalin-fixed paraffin embedded sections were assessed by IHC technique for ER and PR, using Novocastra ER (clone: 6F11) and Dako PR (clone: PgR636) with the Bond polymer refined detection system." + "\n";
}

if (frm.A07.value !== ""){
	Template += "\n" + "Formalin-fixed paraffin embedded sections were assessed by IHC technique for HER2, using Ventana monoclonal HER2/neu (4B5) with Ventana BenchMark ULTRA multimer detection system." + "\n";
}

if (frm.A09.value !== ""){
	Template += "\n" + "HER2 Dual ISH was performed on formalin-fixed paraffin embedded section with the Ventana INFORM HER2 Dual ISH DNA Probe Cocktail Assay on an automated system, and was examined by a pathologist under light microscopy." + "\n";
}

if (frm.A01.value == "Negative, Internal control cells absent"){
	Template += "\n" +  "No internal controls are present, but external controls are appropriately positive. If needed, testing another specimen that contains internal controls may be warranted for confirmation of ER status." + "\n";
}

if (frm.A01.value == "Low Positive (1-10% positive nuclei)"){
	Template += "\n" +  "The cancer in this sample has a low level (1-10%) of ER expression by IHC. There are limited data on the overall benefit of endocrine therapies for patients with low level (1-10%) ER expression, but they currently suggest possible benefit, so patients are considered eligible for endocrine treatment. There are data that suggest invasive cancers with these results are heterogeneous in both behavior and biology and often have gene expression profiles more similar to ER negative cancers." + "\n";
}

if (frm.A07.value == "Positive for over-expression" ||
	frm.A09.value == "Positive (HER2 gene is amplified)" ||
    frm.A09.value == "Positive (amplified, Group 1 result in greater than 10% of cell population)" ||
	frm.A09.value == "Positive, Group 2 ISH result (with IHC 3+)" ||
    frm.A09.value == "Positive, Group 3 ISH result (with IHC 2-3+)" ||
	frm.A09.value == "Positive, Group 4 ISH result (with IHC 3+)"){
	Template += "\n" +  "Patients with breast cancers that are HER2 IHC 3+ or IHC 2+/ISH amplified may be eligible for several therapies that disrupt HER2 signaling pathways."+ "\n";
}

if (frm.A07.value == "Negative for over-expression" ||
    frm.A07.value == "Equivocal for over-expression" ||
    frm.A07.value == "HER2-low (IHC 1+ or IHC 2+ & DISH-)" ||
	frm.A07.value == "HER2-ultra-low (faint/barely perceptible and incomplete staining in <10% of tumor cells without amplification on FISH)" ){
	Template += "\n" +  "Invasive breast cancers that test 'HER2-negative' (IHC 0, 1+ or 2+/ISH not-amplified) are more specifically considered 'HER2-negative for protein overexpression/gene amplification' since non-overexpressed levels of the HER2 protein may be present in these cases." + "\n" + "\n" + "Patients with breast cancers that are HER2 IHC 1+ or IHC 2+/ISH not-amplified may be eligible for a treatment that targets non-amplified/non-overexpressed levels of HER2 expression for cytotoxic drug delivery (IHC 0 results do not result in eligibility currently)."+ "\n";
}

if (frm.A09.value == "Negative, Group 2 ISH result (with IHC 0-2+)" || frm.A09.value == "Positive, Group 2 ISH result (with IHC 3+)"){
	Template += "\n" +  "This sample has a Group 2 HER2 ISH result (ratio greater than or equal to 2.0; less than 4.0 HER2 signals / cell). Evidence is limited on the efficacy of HER2-targeted therapy in the small subset of cases with HER2 / CEP17 ratio greater than or equal to 2.0 and an average HER2 copy number less than 4.0 / cell. In the first generation of adjuvant trastuzumab trials, patients in this subgroup who were randomized to the trastuzumab arm did not appear to derive an improvement in disease free or overall survival, but there were too few such cases to draw definitive conclusions. IHC expression for HER2 should be used to complement ISH and define HER2 status. If IHC result is not 3+ positive, it is recommended that the specimen be considered HER2 negative because of the low HER2 copy number by ISH and lack of protein overexpression."+ "\n";
}

if (frm.A09.value == "Negative, Group 3 ISH result (with IHC 0-1+)" || frm.A09.value == "Positive, Group 3 ISH result (with IHC 2-3+)"){
	Template += "\n" +  "This sample has a Group 3 HER2 ISH result (ratio less than 2.0; greater than or equal to 6.0 HER2 signals / cell). There are insufficient data on the efficacy of HER2-targeted therapy in cases with HER2 ratio less than 2.0 in the absence of protein overexpression because such patients were not eligible for the first generation of adjuvant trastuzumab clinical trials. When concurrent IHC results are negative (0 or 1+), it is recommended that the specimen be considered HER2 negative."+ "\n";
}

if (frm.A09.value == "Negative, Group 4 ISH result (with IHC 0-2+)" || frm.A09.value == "Positive, Group 4 ISH result (with IHC 3+)"){
	Template += "\n" +  "This sample has a Group 4 result (ratio less than 2.0; greater than or equal to 4.0 and less than 6.0 HER2 signals / cell). It is uncertain whether patients with greater than or equal to 4.0 and less than 6.0 average HER2 signals / cell and HER2 / CEP17 ratio less than 2.0 benefit from HER2 targeted therapy in the absence of protein overexpression (IHC 3+). If the specimen test result is close to the ISH ratio threshold for positive, there is a high likelihood that repeat testing will result in different results by chance alone. Therefore, when IHC results are not 3+ positive, it is recommended that the sample be considered HER2 negative without additional testing on the same specimen."+ "\n";
}
frm.holdtext.value = Template;
}

function CopyToClipboard() {
  /* Get the text field */
  var copyText = document.getElementById("holdtext");

  /* Select the text field */
  copyText.select();

  /* Copy the text inside the text field */
  document.execCommand("copy");

  /* Alert the copied text */
  alert("Report copied to clipboard");
}
```

## Implementation mapping (2026-09-10)

Implemented in `generators/breast_biomarkers.js` (`biomarkerReport(values)` = verbatim port of `updateDescription`; `biomarkerFields()` = the schema fields) and appended by `generators/breast.js` after the microscopy as "Biomarkers results are as follows:". Template ids → schema ids:

| Template | Schema id | Template | Schema id |
|---|---|---|---|
| A01 | `er` | A09 | `her2Dish` |
| A02 | `erIntensity` | A10 | `dishCells` |
| A03 | `erNuclei` | A11 | `dishHer2` |
| A04 | `pr` | A12 | `dishCep17` |
| A05 | `prIntensity` | A13 | `dishRatio` |
| A06 | `prNuclei` | A26 | `dishPctAmp` |
| A07 | `her2Ihc` | A14 | `dishAneusomy` (checkbox) |
| A08 | `her2Score` | A15 | `dishHeteroSignals` (checkbox) |
| A25 | `her2Hetero` | A16 | `ki67` |
| A28 | `coldIschemia` | A27 | `fixationTime` |
| A29 | `testType` | A19 | `bmNotes` |
