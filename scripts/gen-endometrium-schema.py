#!/usr/bin/env python3
"""Writes schemas/endometrial_carcinoma.json. Re-runnable: edit here, not the JSON.

Element order and option wording follow the QMH GYN-Endometrium page (CAP Carcinoma and
Carcinosarcoma of the Endometrium 5.1.0.0, Dec-2024) saved at docs/reference/GYN-Endometrium.html.
No stage is printed by default; see docs/specs/endometrial-carcinoma.md.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

MAC = "Macroscopy"
HIST = "Histology and molecular"
EXT = "Extent of disease"
MARG = "Margins and lymph nodes"
OTHER = "Metastasis and other findings"


def field(id, label, type, group=None, **kw):
    f = {"id": id, "label": label, "type": type}
    if group:
        f["group"] = group
    for k, v in kw.items():
        if v is not None:
            f[k] = v
    return f


def sel(id, label, options, default, group, **kw):
    return field(id, label, "select", group, options=options, default=default, **kw)


def txt(id, label, group, **kw):
    return field(id, label, "text", group, **kw)


def area(id, label, group, **kw):
    return field(id, label, "textarea", group, **kw)


def num(id, label, group, **kw):
    return field(id, label, "number", group, **kw)


def chk(id, label, group, **kw):
    return field(id, label, "checkbox", group, default=False, **kw)


def multi(id, label, options, default, group, **kw):
    return field(id, label, "multiselect", group, options=options, default=default, **kw)


HIST_TYPES = [
    "Endometrioid carcinoma", "Serous carcinoma", "Clear cell carcinoma", "Dedifferentiated carcinoma",
    "Undifferentiated carcinoma", "Carcinosarcoma (malignant mixed Mullerian tumor)", "Mesonephric-like adenocarcinoma",
    "Squamous cell carcinoma, NOS", "Gastric (gastrointestinal)-type carcinoma",
    "Mixed cell carcinoma (specify types and percentages)", "Small cell neuroendocrine carcinoma",
    "Large cell neuroendocrine carcinoma", "Other (specify)",
]
GRADES = [
    "FIGO grade 1 (endometrioid carcinoma)", "FIGO grade 2 (endometrioid carcinoma)", "FIGO grade 3 (endometrioid carcinoma)",
    "High-grade (non-endometrioid carcinoma)", "Other (specify)", "Cannot be assessed",
]
MMR = ["Not performed", "Intact nuclear expression of MLH1, PMS2, MSH2 and MSH6", "Loss of nuclear MMR protein expression (specify)",
       "Subclonal loss of nuclear MMR protein expression (specify)", "Requested; result to follow", "Cannot be assessed (explain)"]
MSI = ["Not performed", "MSI-Stable (MSS)", "MSI-Low (MSI-L)", "MSI-High (MSI-H)", "Cannot be assessed (explain)"]
P53 = ["Not performed", "Normal (wild type) expression", "Abnormal, Overexpression (strong, diffuse nuclear expression)",
       "Abnormal, Null (lack of nuclear or cytoplasmic expression, internal positive control present)",
       "Abnormal, Cytoplasmic only (lacks nuclear expression)", "Subclonal abnormal (mutated)", "Requested; result to follow",
       "Cannot be determined (explain)"]
POLE = ["Not performed", "Wild-type", "Mutated (specify)", "Requested; result to follow", "Cannot be assessed (explain)"]
PROMISE = ["Derive from the results above", "POLE-mutated carcinoma", "Mismatch repair-deficient carcinoma", "p53-abnormal carcinoma",
           "No specific molecular profile (NSMP)", "Double classifier (explain)", "Not classified (testing incomplete)"]
MYO = ["Not identified", "Estimated less than 50% myometrial invasion", "Estimated 50% or greater myometrial invasion", "Cannot be assessed (explain)"]
LVSI = ["Not identified", "Present, focal (less than 5 vessels)", "Present, substantial (5 or more vessels)", "Present, extent not specified",
        "Equivocal (explain)", "Cannot be determined"]
INVOLVEMENT = [
    "Not identified", "Right ovary", "Left ovary", "Ovary (side not specified)", "Right fallopian tube", "Left fallopian tube",
    "Fallopian tube (side not specified)", "Vagina", "Right parametrium", "Left parametrium", "Parametrium (side not specified)",
    "Pelvic wall", "Bladder wall without mucosal involvement", "Bladder wall with mucosal involvement",
    "Bowel wall without mucosal involvement", "Bowel wall with mucosal involvement", "Omentum", "Other organs/tissue (specify)",
    "Cannot be determined (explain)",
]
DISTANT = ["Not identified", "Inguinal lymph node(s)", "Omentum", "Extrapelvic peritoneum", "Lung (specify)", "Liver (specify)",
           "Bone (specify)", "Other (specify)", "Cannot be determined"]
MARGIN = ["Uninvolved by carcinoma", "Involved by carcinoma", "Cannot be assessed", "Not applicable"]
LAT = ["Not applicable", "Right", "Left", "Bilateral", "Cannot be determined"]
ENE = ["Not applicable", "Not identified", "Present", "Cannot be determined"]
FLUID = ["Not submitted / unknown", "Negative for malignancy (NFM)", "Atypia of undetermined significance (AUS)",
         "Suspicious for malignancy (SFM)", "Malignant (MAL)", "Cannot be determined", "Results pending"]
PROCEDURES = ["Total hysterectomy and bilateral salpingo-oophorectomy", "Total hysterectomy", "Radical hysterectomy and bilateral salpingo-oophorectomy",
              "Radical hysterectomy", "Supracervical hysterectomy", "Other (specify)"]
EXTRA_PROCEDURES = ["Right salpingo-oophorectomy", "Left salpingo-oophorectomy", "Bilateral salpingectomy", "Omentectomy", "Peritoneal biopsies",
                    "Peritoneal washing", "Pelvic lymphadenectomy", "Para-aortic lymphadenectomy", "Sentinel lymph node biopsy"]
HYST_TYPE = ["Not specified", "Abdominal", "Vaginal", "Vaginal, laparoscopic-assisted", "Laparoscopic", "Laparoscopic, robotic-assisted", "Other (specify)"]
ADDITIONAL = ["Atypical hyperplasia / endometrial intraepithelial neoplasia (EIN)", "Endometrial polyp", "Leiomyomas", "Adenomyosis",
              "Endometriosis", "Other (specify)"]


def node_block(prefix, name):
    return [
        num(f"{prefix}Examined", f"{name} lymph nodes: number examined (0 if none submitted)", MARG),
        num(f"{prefix}Macro", f"{name}: number with macrometastasis (more than 2 mm)", MARG),
        num(f"{prefix}Micro", f"{name}: number with micrometastasis (more than 0.2 mm up to 2 mm)", MARG),
        num(f"{prefix}Itc", f"{name}: number with isolated tumour cells (0.2 mm or less)", MARG),
        sel(f"{prefix}Laterality", f"{name}: laterality of involved nodes", LAT, "Not applicable", MARG),
        num(f"{prefix}DepositMm", f"{name}: size of largest metastatic deposit (mm)", MARG),
        num(f"{prefix}NodeMm", f"{name}: size of largest involved node (mm)", MARG),
        sel(f"{prefix}Ene", f"{name}: extranodal extension", ENE, "Not applicable", MARG),
        chk(f"{prefix}Sentinel", f"{name}: sentinel lymph node(s) included", MARG),
    ]


fields = [
    txt("specimenName", "Specimen (blank = derived from the procedure)", None,
        placeholder="e.g. Uterus with cervix and bilateral adnexa, total hysterectomy and bilateral salpingo-oophorectomy"),
    # Macroscopy (QMH macro block: procedure, hysterectomy type, integrity, site, size)
    sel("procedure", "Procedure", PROCEDURES, PROCEDURES[0], MAC),
    txt("procedureOther", "Procedure (specify)", MAC, showIf={"field": "procedure", "is": "Other (specify)"}),
    multi("additionalProcedures", "Additional procedures", EXTRA_PROCEDURES, [], MAC),
    sel("hysterectomyType", "Hysterectomy type", HYST_TYPE, "Not specified", MAC),
    sel("specimenIntegrity", "Specimen integrity", ["Intact", "Opened", "Morcellated", "Other (specify)"], "Intact", MAC),
    num("weight", "Weight (g)", MAC),
    txt("dimensions", "Uterus dimensions (mm, e.g. 90 x 60 x 45)", MAC),
    num("cavityLengthMm", "Endometrial cavity length (mm)", MAC),
    sel("serosaMacro", "Serosa (macro)", ["Smooth and glistening", "Adhesions", "Tumour nodules", "Disrupted", "Other (specify)"], "Smooth and glistening", MAC),
    sel("tumourSite", "Tumour site", ["Endometrium", "Lower uterine segment", "Endometrial polyp", "Cannot be determined", "Other (specify)"], "Endometrium", MAC),
    txt("tumourSiteDetail", "Site detail (e.g. posterior wall and fundus)", MAC),
    sel("tumourGrowth", "Growth pattern (macro)", ["Polypoid", "Exophytic", "Flat, infiltrative", "Diffuse, filling the cavity", "Not grossly visible", "Cannot be determined"], "Polypoid", MAC),
    num("tumourSizeMm", "Tumour size: greatest dimension (mm)", MAC),
    txt("tumourDims", "Tumour size: all dimensions (mm x mm x mm)", MAC),
    txt("sizeCannot", "Tumour size cannot be determined (explain)", MAC),
    num("macroDepthMm", "Macro: depth of invasion (mm)", MAC),
    num("macroMyoMm", "Macro: myometrial thickness at that point (mm)", MAC),
    txt("cervixMacro", "Lower uterine segment and cervix (macro; blank = unremarkable)", MAC),
    txt("adnexaMacro", "Adnexa (macro; blank = unremarkable)", MAC, placeholder="e.g. right tube 50 x 5 mm and ovary 30 x 20 x 10 mm, left tube 48 x 5 mm and ovary 28 x 18 x 10 mm, all unremarkable"),
    txt("otherMacro", "Other macroscopic findings", MAC),
    area("blockKeyText", "Block key (one entry per line, e.g. \"1-4 Tumour, posterior wall, full thickness\")", MAC),
    # Histology and molecular (QMH: type, grade, MMR, MSI, p53, POLE, ProMisE)
    sel("histType", "Histologic type (WHO 5th edition)", HIST_TYPES, "Endometrioid carcinoma", HIST),
    txt("histTypeOther", "Histologic type (specify; types and percentages for a mixed carcinoma)", HIST,
        showIf={"field": "histType", "is": ["Mixed cell carcinoma (specify types and percentages)", "Other (specify)"]}),
    sel("grade", "Histologic grade", GRADES, "FIGO grade 1 (endometrioid carcinoma)", HIST,
        help="FIGO grading applies to endometrioid carcinoma; other histotypes are high grade by definition."),
    txt("gradeOther", "Grade (specify)", HIST, showIf={"field": "grade", "is": "Other (specify)"}),
    area("microDescription", "Microscopy: additional description (optional)", HIST,
         placeholder="e.g. squamous differentiation is present; a MELF pattern of invasion is noted"),
    sel("mmrIhc", "Mismatch repair (MMR) IHC", MMR, "Not performed", HIST),
    txt("mmrDetail", "MMR IHC: proteins lost / explain", HIST,
        showIf={"field": "mmrIhc", "is": ["Loss of nuclear MMR protein expression (specify)", "Subclonal loss of nuclear MMR protein expression (specify)", "Cannot be assessed (explain)"]}),
    sel("msi", "Microsatellite instability (MSI)", MSI, "Not performed", HIST),
    sel("p53", "p53 IHC", P53, "Not performed", HIST),
    txt("p53Detail", "p53: explain / subclonal pattern", HIST, showIf={"field": "p53", "is": ["Subclonal abnormal (mutated)", "Cannot be determined (explain)"]}),
    sel("pole", "POLE status", POLE, "Not performed", HIST),
    txt("poleDetail", "POLE: variant / explain", HIST, showIf={"field": "pole", "is": ["Mutated (specify)", "Cannot be assessed (explain)"]}),
    sel("promise", "Molecular classification (ProMisE)", PROMISE, "Derive from the results above", HIST,
        help="Derived with the ProMisE precedence: POLE mutation, then MMR deficiency, then abnormal p53; NSMP when all three are normal."),
    txt("promiseDetail", "Molecular classification: explain", HIST, showIf={"field": "promise", "is": "Double classifier (explain)"}),
    txt("otherIhc", "Other immunohistochemistry (e.g. ER and PR positive)", HIST),
    # Extent (QMH: myoinvasion, depth, thickness, %, adenomyosis, serosa, LUS, cervix, other organs, LVSI, PNI, fluid)
    sel("myoInvasion", "Myometrial invasion", MYO, "Estimated less than 50% myometrial invasion", EXT),
    txt("myoCannot", "Myometrial invasion cannot be assessed (explain)", EXT, showIf={"field": "myoInvasion", "is": "Cannot be assessed (explain)"}),
    num("depthMm", "Depth of myometrial invasion (mm)", EXT),
    num("myoThicknessMm", "Myometrial thickness (mm)", EXT),
    num("myoPercent", "Percentage of myometrial invasion (blank = derived from depth and thickness)", EXT),
    sel("adenomyosis", "Adenomyosis", ["Not identified", "Present, uninvolved by tumour", "Present, involved by tumour", "Cannot be determined"], "Not identified", EXT),
    sel("serosa", "Uterine serosa involvement", ["Not identified", "Present", "Cannot be determined"], "Not identified", EXT),
    sel("lus", "Lower uterine segment involvement", ["Not identified", "Present, superficial (non-invasive)", "Present, myoinvasion", "Cannot be determined"], "Not identified", EXT),
    sel("cervix", "Cervical stromal involvement", ["Not identified", "Cervical stromal invasion", "Endocervical glandular involvement only", "Cannot be determined", "Not applicable (cervix not submitted)"], "Not identified", EXT),
    num("cervixDepthMm", "Depth of cervical stromal invasion (mm)", EXT, showIf={"field": "cervix", "is": "Cervical stromal invasion"}),
    num("cervixThicknessMm", "Cervical stromal thickness (mm)", EXT, showIf={"field": "cervix", "is": "Cervical stromal invasion"}),
    multi("otherInvolvement", "Other tissue / organ involvement", INVOLVEMENT, ["Not identified"], EXT),
    txt("otherInvolvementDetail", "Other tissue / organ involvement: specify / explain", EXT),
    chk("ovarianSynchronous", "Ovarian tumour is low-grade endometrioid and disease is limited to the uterus and ovary (synchronous pattern)", EXT,
        help="With a low-grade endometrioid uterine tumour and an involved ovary this meets FIGO 2023 IA3 (reference only)."),
    sel("pelvicPeritoneum", "Pelvic peritoneum (biopsies / deposits)", ["Not submitted", "Not identified", "Present", "Cannot be determined"], "Not submitted", EXT),
    sel("lvsi", "Lymphovascular invasion", LVSI, "Not identified", EXT),
    txt("lvsiDetail", "LVSI: location / explain", EXT),
    sel("pni", "Perineural invasion", ["Not identified", "Present", "Cannot be determined"], "Not identified", EXT),
    sel("peritonealFluid", "Peritoneal / ascitic fluid", FLUID, "Not submitted / unknown", EXT),
    # Margins and nodes
    sel("vaginalMargin", "Ectocervical / vaginal cuff margin", MARGIN, "Uninvolved by carcinoma", MARG),
    num("vaginalMarginMm", "Ectocervical / vaginal cuff margin: closest distance (mm)", MARG, showIf={"field": "vaginalMargin", "is": "Uninvolved by carcinoma"}),
    sel("parametrialMargin", "Parametrial / paracervical margin", MARGIN, "Not applicable", MARG),
    num("parametrialMarginMm", "Parametrial / paracervical margin: closest distance (mm)", MARG, showIf={"field": "parametrialMargin", "is": "Uninvolved by carcinoma"}),
    *node_block("pelvic", "Pelvic"),
    *node_block("pa", "Para-aortic"),
    # Metastasis and other findings
    multi("distantMets", "Distant metastasis", DISTANT, ["Not identified"], OTHER),
    txt("distantDetail", "Distant metastasis: specify", OTHER),
    txt("tnmOverride", "Override derived pTNM (e.g. \"pT1b pN0\") - leave blank to accept the derived stage", OTHER),
    txt("tnmOverrideReason", "Reason for override", OTHER, showIf={"field": "tnmOverride", "truthy": True}),
    multi("additionalFindings", "Additional pathologic findings", ADDITIONAL, [], OTHER),
    txt("additionalFindingsOther", "Additional findings: specify", OTHER),
    area("additionalNotes", "Additional notes (appended to the microscopy)", OTHER),
]

snippets = [
    {"id": "endometrium_mmrd_lynch", "label": "MMR-deficient: methylation / Lynch work-up", "auto": {"flag": "mmrd"},
     "text": "The tumour shows loss of mismatch repair protein expression. Where MLH1 and PMS2 are lost, MLH1 promoter hypermethylation testing is recommended to distinguish sporadic from Lynch syndrome-associated deficiency; loss of MSH2, MSH6 or isolated PMS2, or unmethylated MLH1 loss, should prompt referral for genetic counselling and germline testing."},
    {"id": "endometrium_p53abn", "label": "p53-abnormal: high-risk molecular group", "auto": {"flag": "p53abn"},
     "text": "The tumour is p53-abnormal on immunohistochemistry and falls within the p53-abnormal (copy-number high) molecular group, which carries an adverse prognosis independent of histotype and stage; multidisciplinary discussion of adjuvant therapy is advised."},
    {"id": "endometrium_pole_mut", "label": "POLE-mutated: favourable prognosis", "auto": {"flag": "polemut"},
     "text": "The tumour harbours a pathogenic POLE exonuclease domain mutation and is classified as POLE-mutated (ultramutated), a group with an excellent prognosis irrespective of grade and histotype."},
    {"id": "endometrium_molecular_pending", "label": "Molecular testing pending: supplementary report", "auto": {"flag": "molecularPending"},
     "text": "Molecular testing is in progress; the final molecular classification will be issued as a supplementary report."},
    {"id": "endometrium_double_classifier", "label": "Multiple classifier: precedence explained", "auto": {"field": "promise", "is": "Double classifier (explain)"},
     "text": "The tumour shows more than one molecular classifying feature (multiple classifier). By WHO and ProMisE convention a pathogenic POLE mutation takes precedence over mismatch repair deficiency, which in turn takes precedence over abnormal p53; the tumour is assigned to the group stated above."},
    {"id": "endometrium_synchronous_ovary", "label": "Uterine and ovarian tumours: synchronous low-grade endometrioid", "auto": {"field": "ovarianSynchronous", "is": True},
     "text": "The uterine and ovarian tumours are both low-grade endometrioid carcinomas. With superficial or absent myometrial invasion, no lymphovascular space invasion and the ovarian tumour confined to the ovary, these are regarded as clonally related low-risk disease with a favourable outcome rather than as metastatic spread."},
    {"id": "endometrium_fluid_pending", "label": "Peritoneal fluid cytology reported separately", "auto": {"field": "peritonealFluid", "is": "Results pending"},
     "text": "The peritoneal washing is reported separately; please correlate."},
    {"id": "endometrium_carcinosarcoma", "label": "Carcinosarcoma: staged as carcinoma", "auto": {"field": "histType", "is": "Carcinosarcoma (malignant mixed Mullerian tumor)"},
     "text": "Carcinosarcoma is a biphasic tumour of metaplastic carcinoma and is staged and managed as a high-grade endometrial carcinoma; the carcinomatous and sarcomatous components, including any heterologous elements, are described above."},
]

EXAMPLE_VALUES = {
    "specimenName": "", "procedure": "Total hysterectomy and bilateral salpingo-oophorectomy", "procedureOther": "",
    "additionalProcedures": ["Sentinel lymph node biopsy"], "hysterectomyType": "Laparoscopic, robotic-assisted", "specimenIntegrity": "Intact",
    "weight": "165", "dimensions": "92 x 58 x 44", "cavityLengthMm": "45", "serosaMacro": "Smooth and glistening", "tumourSite": "Endometrium",
    "tumourSiteDetail": "posterior wall and fundus", "tumourGrowth": "Polypoid", "tumourSizeMm": "35", "tumourDims": "35 x 30 x 12", "sizeCannot": "",
    "macroDepthMm": "6", "macroMyoMm": "18", "cervixMacro": "", "adnexaMacro": "", "otherMacro": "",
    "blockKeyText": "1-4 Tumour, posterior wall, full thickness\n5 Tumour, fundus\n6 Anterior wall, full thickness\n7 Lower uterine segment\n8-9 Cervix, anterior and posterior\n10 Right fallopian tube and ovary\n11 Left fallopian tube and ovary\n12-13 Right pelvic sentinel lymph nodes (2)\n14 Left pelvic sentinel lymph node (1)",
    "histType": "Endometrioid carcinoma", "histTypeOther": "", "grade": "FIGO grade 1 (endometrioid carcinoma)", "gradeOther": "",
    "microDescription": "focal squamous differentiation is present",
    "mmrIhc": "Intact nuclear expression of MLH1, PMS2, MSH2 and MSH6", "mmrDetail": "", "msi": "Not performed",
    "p53": "Normal (wild type) expression", "p53Detail": "", "pole": "Wild-type", "poleDetail": "",
    "promise": "Derive from the results above", "promiseDetail": "", "otherIhc": "ER and PR positive",
    "myoInvasion": "Estimated less than 50% myometrial invasion", "myoCannot": "", "depthMm": "6", "myoThicknessMm": "18", "myoPercent": "",
    "adenomyosis": "Not identified", "serosa": "Not identified", "lus": "Not identified", "cervix": "Not identified", "cervixDepthMm": "", "cervixThicknessMm": "",
    "otherInvolvement": ["Not identified"], "otherInvolvementDetail": "", "ovarianSynchronous": False, "pelvicPeritoneum": "Not submitted",
    "lvsi": "Not identified", "lvsiDetail": "", "pni": "Not identified", "peritonealFluid": "Not submitted / unknown",
    "vaginalMargin": "Uninvolved by carcinoma", "vaginalMarginMm": "", "parametrialMargin": "Not applicable", "parametrialMarginMm": "",
    "pelvicExamined": "3", "pelvicMacro": "0", "pelvicMicro": "0", "pelvicItc": "0", "pelvicLaterality": "Not applicable", "pelvicDepositMm": "",
    "pelvicNodeMm": "", "pelvicEne": "Not applicable", "pelvicSentinel": True,
    "paExamined": "0", "paMacro": "", "paMicro": "", "paItc": "", "paLaterality": "Not applicable", "paDepositMm": "", "paNodeMm": "", "paEne": "Not applicable", "paSentinel": False,
    "distantMets": ["Not identified"], "distantDetail": "", "tnmOverride": "", "tnmOverrideReason": "",
    "additionalFindings": ["Atypical hyperplasia / endometrial intraepithelial neoplasia (EIN)", "Leiomyomas"], "additionalFindingsOther": "", "additionalNotes": "",
}

schema = {
    "id": "endometrial_carcinoma",
    "version": "2026.09",
    "name": "Endometrial carcinoma resection",
    "shortName": "Uterus · cancer resection",
    "label": "Endometrial Ca",
    "organ": "UTERUS",
    "system": "Gynae",
    "kind": "cancer resection",
    "rank": 42,
    "aliases": ["endometrium", "endometrial carcinoma", "endometrial cancer", "hysterectomy for carcinoma", "TAHBSO", "serous", "carcinosarcoma",
                "clear cell", "endometrioid", "ProMisE", "POLE", "MMR", "p53", "myometrial invasion", "LVSI", "synoptic", "CAP", "AJCC"],
    "specimenNoun": "resection",
    "maxParts": 3,
    "defaultParts": 1,
    "generator": "endometrial_carcinoma",
    "style": {"british": True},
    "source": {
        "template": "QMH Cancer Reporting Template - GYN-Endometrium",
        "url": "https://awiloqmh.github.io/CancerReportingTemplate/GYN-Endometrium.html",
        "capProtocol": "CAP Carcinoma and Carcinosarcoma of the Endometrium 5.1.0.0 (Dec-2024)",
        "staging": "AJCC 8th edition pTNM printed only with the printPTNM option; FIGO 2009 and FIGO 2023 derived for the Checks panel and never printed",
        "stagingProtocol": "endometrium",
        "savedPage": "docs/reference/GYN-Endometrium.html",
        "figo2023": "Berek JS et al. FIGO staging of endometrial cancer: 2023. Int J Gynecol Obstet 2023;162:383-394",
    },
    "caseFields": [],
    "options": [
        {"id": "includeHeader", "label": "Section headers (SPECIMEN / MICROSCOPIC EXAMINATION / SYNOPTIC REPORT / DIAGNOSIS)", "type": "checkbox", "default": False},
        {"id": "macro", "label": "Generate the macroscopic description and block key", "type": "checkbox", "default": True},
        {"id": "synopticOnly", "label": "Synoptic only (omit the narrative microscopy paragraph)", "type": "checkbox", "default": False},
        {"id": "printPTNM", "label": "Print the AJCC 8th edition pTNM block (FIGO is never printed)", "type": "checkbox", "default": False},
    ],
    "partDefaults": [],
    "fields": fields,
    "snippets": snippets,
    "example": {"caseTitle": "", "options": {"includeHeader": False, "macro": True, "synopticOnly": False, "printPTNM": False},
                "parts": [{"label": "A", "values": EXAMPLE_VALUES}]},
}

ids = [f["id"] for f in fields]
assert len(ids) == len(set(ids)), "duplicate field ids"
missing = [i for i in ids if i not in EXAMPLE_VALUES]
assert not missing, f"example lacks values for {missing}"

out = ROOT / "schemas" / "endometrial_carcinoma.json"
out.write_text(json.dumps(schema, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(f"wrote {out.relative_to(ROOT)} ({len(fields)} fields, {len(snippets)} snippets)")
