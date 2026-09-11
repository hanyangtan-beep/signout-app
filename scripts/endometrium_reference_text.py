"""Criteria text for the endometrial carcinoma reference galleries (schema `field.reference`).

Images are merged in by gen-endometrium-schema.py from assets/reference/endometrium/images.json,
matched on (field, group heading). Groups without a licensed image ship with text only.
Criteria follow WHO Classification of Tumours, Female Genital Tumours, 5th edition (2020).
"""

REFERENCE_TEXT = {
    "solidPct": {
        "title": "Architectural grade: solid non-squamous growth",
        "intro": "Estimate the proportion of solid growth in the non-squamous, non-morular component. Squamous morules and keratinising nests are excluded from the solid count.",
        "groups": [
            {"heading": "5% or less (architectural grade 1)", "points": [
                "Well-formed, confluent back-to-back glands with little intervening stroma",
                "Cribriform, villoglandular or papillary areas still count as glandular",
                "Solid non-squamous sheets, if any, make up 5% or less",
                "Distinguish from: atypical hyperplasia / EIN (no confluence, no stromal loss, no invasion)"]},
            {"heading": "6-50% (architectural grade 2)", "points": [
                "Glands remain but solid non-squamous nests or sheets form more than 5% and up to half of the tumour",
                "Count only solid areas without gland lumina or squamous features",
                "Grade 3 nuclei in the majority of the tumour raise this to FIGO grade 3",
                "Distinguish from: squamous morules (bland, syncytial, often central) which do not count"]},
            {"heading": "More than 50% (architectural grade 3)", "points": [
                "Solid growth dominates; residual glands are few and often abortive",
                "Nuclei may still be endometrioid (elongated, stratified); marked atypia throughout should prompt exclusion of serous carcinoma (p53, ER, PTEN)",
                "Distinguish from: undifferentiated / dedifferentiated carcinoma (monotonous discohesive sheets with no gland formation, loss of PAX8 / ER)"]},
        ],
        "note": "FIGO grade = architectural grade, raised by one when grade 3 nuclei occupy the majority of the tumour (WHO 5th ed).",
    },
    "nuclearGrade": {
        "title": "Nuclear grade",
        "intro": "Assess the predominant nuclear appearance, not the worst focus. Notable nuclear atypia in the majority of the tumour raises the architectural grade by one.",
        "groups": [
            {"heading": "Nuclear grade 1-2 (mild to moderate atypia)", "points": [
                "Elongated, cigar-shaped or oval nuclei with even chromatin and small nucleoli",
                "Nuclear stratification and pseudostratification within glands",
                "Mitoses usually few to moderate",
                "Distinguish from: reactive / secretory change with vacuoles and bland nuclei"]},
            {"heading": "Nuclear grade 3 (marked atypia in the majority of the tumour)", "points": [
                "Rounded, enlarged and pleomorphic nuclei with coarse chromatin and prominent eosinophilic nucleoli",
                "Loss of polarity, frequent and atypical mitoses",
                "In a glandular tumour, grade 3 nuclei throughout should prompt exclusion of serous carcinoma (abnormal p53, diffuse p16, loss of ER) before raising the grade",
                "Distinguish from: focal bizarre nuclei in an otherwise low-grade tumour (does not upgrade)"]},
        ],
    },
    "histType": {
        "title": "Histologic type (WHO 5th edition)",
        "intro": "All non-endometrioid carcinomas are high grade by definition and take no FIGO grade. Confirm the type with the minimum immunohistochemistry needed; molecular class does not replace histotype.",
        "columns": 3,
        "groups": [
            {"heading": "Endometrioid carcinoma", "points": [
                "Glands resembling proliferative endometrium, confluent or cribriform, often villoglandular",
                "Squamous, mucinous, secretory or ciliated differentiation may be present",
                "ER / PR positive, wild-type p53 in most; PTEN loss common",
                "Distinguish from: serous (marked atypia, slit-like spaces, abnormal p53) and clear cell carcinoma"]},
            {"heading": "Serous carcinoma", "points": [
                "Complex papillae with cellular budding and slit-like glandular spaces; scalloped luminal borders",
                "Marked nuclear atypia and pleomorphism, hobnail cells, macronucleoli, brisk mitoses, cherry-red nucleoli",
                "Abnormal p53 (overexpression or null), diffuse p16, ER often reduced or lost; may arise in a polyp or as serous EIC",
                "Distinguish from: FIGO grade 3 endometrioid and villoglandular endometrioid (bland nuclei, wild-type p53)"]},
            {"heading": "Clear cell carcinoma", "points": [
                "Tubulocystic, papillary and solid patterns, often mixed; papillae with hyalinised, sometimes eosinophilic cores",
                "Polygonal cells with clear or eosinophilic cytoplasm, hobnail nuclei, intraluminal eosinophilic globules",
                "Napsin A, HNF1-beta and AMACR positive; ER and PR usually negative; p53 wild-type in most",
                "Distinguish from: secretory endometrioid carcinoma (bland, ER positive) and Arias-Stella reaction"]},
            {"heading": "Dedifferentiated carcinoma", "points": [
                "Low-grade (FIGO grade 1 or 2) endometrioid carcinoma abutting an undifferentiated component, often with abrupt transition",
                "Undifferentiated part: sheets of monotonous discohesive cells, no gland formation, often rhabdoid or myxoid areas",
                "Loss of PAX8, ER and PR and of SWI/SNF proteins (ARID1A, ARID1B, SMARCA4) in the undifferentiated component; frequently MMR deficient",
                "Distinguish from: FIGO grade 3 endometrioid (solid areas retain PAX8 / ER and cohesion)"]},
            {"heading": "Undifferentiated carcinoma", "points": [
                "Solid sheets of small to intermediate, monotonous, discohesive cells with no glandular or squamous differentiation",
                "Brisk mitoses, geographic necrosis, lymphoid infiltrate; may show rhabdoid cells",
                "Focal keratin / EMA only; PAX8, ER and PR negative; frequent SWI/SNF loss and MMR deficiency",
                "Distinguish from: lymphoma, high-grade endometrial stromal sarcoma, neuroendocrine carcinoma, epithelioid leiomyosarcoma"]},
            {"heading": "Carcinosarcoma (malignant mixed Mullerian tumor)", "points": [
                "Biphasic: high-grade carcinoma (usually serous or endometrioid) and high-grade sarcoma, with sharp or intimate admixture",
                "Homologous sarcoma: high-grade spindle cell sarcoma NOS; heterologous: rhabdomyosarcoma (eosinophilic rhabdomyoblasts), chondrosarcoma, osteosarcoma, liposarcoma",
                "Staged and graded as a carcinoma; report the components and their proportions",
                "Distinguish from: adenosarcoma (low-grade), endometrioid carcinoma with spindle cell areas (low grade, keratin positive), undifferentiated carcinoma"]},
            {"heading": "Mesonephric-like adenocarcinoma", "points": [
                "Mixture of tubular, ductal, papillary, glomeruloid, solid and spindle patterns; small tubules with dense eosinophilic luminal secretions",
                "Nuclei often vesicular with grooves or overlapping, resembling papillary thyroid carcinoma; mild to moderate atypia",
                "GATA3, TTF1 (often mutually exclusive), CD10 luminal; ER and PR negative, wild-type p53; KRAS mutation",
                "Distinguish from: endometrioid carcinoma (ER positive) and serous / clear cell carcinoma"]},
            {"heading": "Squamous cell carcinoma, NOS", "points": [
                "Pure squamous differentiation with keratinisation or intercellular bridges, no glandular component",
                "Requires exclusion of cervical squamous carcinoma (no cervical primary, no connection) and of an endometrioid carcinoma with extensive squamous differentiation",
                "Often arises in pyometra, cervical stenosis or ichthyosis uteri; HPV negative in most",
                "Distinguish from: endometrioid carcinoma with squamous differentiation (any glandular element)"]},
            {"heading": "Gastric (gastrointestinal)-type carcinoma", "points": [
                "Glands with abundant pale or foamy mucinous cytoplasm, distinct cell borders and basal nuclei, gastric-pyloric or intestinal (goblet cell) phenotype",
                "Deceptively bland glands may show marked cytological atypia elsewhere",
                "MUC6, HIK1083, CDX2 or CK20 positive; ER and PR negative; frequent abnormal p53",
                "Distinguish from: endometrioid carcinoma with mucinous differentiation (ER positive, endometrioid glands elsewhere) and metastatic gastrointestinal carcinoma"]},
            {"heading": "Mixed cell carcinoma (specify types and percentages)", "points": [
                "Two or more distinct WHO types, each recognisable on morphology (supported by IHC), each making up at least 5%",
                "Most often endometrioid with serous or clear cell; state the types and percentages",
                "Grade follows the highest-grade component (non-endometrioid components make the tumour high grade)",
                "Distinguish from: a single tumour with variable architecture (e.g. serous with glandular areas)"]},
            {"heading": "Small cell neuroendocrine carcinoma", "points": [
                "Sheets, nests and trabeculae of small cells with scant cytoplasm, fine granular chromatin, absent nucleoli and nuclear moulding",
                "Extensive necrosis, crush artefact, brisk mitoses and apoptosis",
                "Synaptophysin, chromogranin, CD56 or INSM1 positive (dot-like keratin); may be admixed with endometrioid carcinoma",
                "Distinguish from: undifferentiated carcinoma, lymphoma, high-grade endometrial stromal sarcoma"]},
            {"heading": "Large cell neuroendocrine carcinoma", "points": [
                "Organoid nests, trabeculae or sheets with peripheral palisading and rosettes; large cells with ample cytoplasm and prominent nucleoli",
                "Vesicular chromatin, frequent mitoses, geographic necrosis",
                "Diffuse neuroendocrine marker expression (synaptophysin, chromogranin, INSM1) is required; often part of a mixed tumour",
                "Distinguish from: FIGO grade 3 endometrioid or undifferentiated carcinoma (focal, weak neuroendocrine staining does not qualify)"]},
        ],
    },
    "differentiation": {
        "title": "Endometrioid variants and differentiation",
        "intro": "Variant features do not change the type or, on their own, the grade. Recognising them prevents misdiagnosis as a non-endometrioid carcinoma.",
        "columns": 3,
        "groups": [
            {"heading": "Squamous differentiation", "points": [
                "Morules: bland syncytial nests within gland lumina, often with central necrosis; or keratinising squamous nests and pearls",
                "Excluded from the solid non-squamous count",
                "Distinguish from: solid endometrioid growth (glandular nuclei, no squamous features)"]},
            {"heading": "Mucinous differentiation", "points": [
                "Columnar cells with abundant intracytoplasmic mucin, often endocervical-like, in a tumour with endometrioid architecture elsewhere",
                "ER / PR positive; wild-type p53",
                "Distinguish from: gastric-type carcinoma (ER negative, MUC6) and endocervical adenocarcinoma"]},
            {"heading": "Secretory change", "points": [
                "Subnuclear and supranuclear cytoplasmic vacuoles resembling early secretory endometrium",
                "Bland nuclei, low mitotic rate; may be seen with progestogen therapy",
                "Distinguish from: clear cell carcinoma (hobnail nuclei, hyalinised cores, Napsin A)"]},
            {"heading": "Ciliated cells", "points": [
                "Glands lined by cells with apical cilia and eosinophilic cytoplasm",
                "Commonly low grade; a diagnosis of carcinoma still rests on confluent growth or invasion",
                "Distinguish from: ciliated (tubal) metaplasia in hyperplasia"]},
            {"heading": "Sex cord-like elements", "points": [
                "Cords, trabeculae or small tubules of bland cells resembling ovarian sex cord tumour, merging with endometrioid glands",
                "Inhibin usually negative (keratin positive), unlike true sex cord elements",
                "Distinguish from: uterine tumour resembling ovarian sex cord tumour (UTROSCT), endometrial stromal sarcoma with sex cord elements"]},
            {"heading": "Spindle cell (sarcomatoid) areas", "points": [
                "Low-grade spindle cells merging with the glands or squamous nests, uniform nuclei, few mitoses; keratin positive",
                "Distinguish from: carcinosarcoma (high-grade, discrete sarcoma with marked atypia and necrosis)"]},
            {"heading": "Corded and hyalinised (CHEC) pattern", "points": [
                "Cords and single cells within hyalinised or myxoid stroma, sometimes with osteoid; merges with low-grade endometrioid glands and squamous morules",
                "Low-grade nuclei; often nuclear beta-catenin (CTNNB1 mutation); usually young patients",
                "Distinguish from: carcinosarcoma (high-grade components) and mixed Mullerian tumours"]},
        ],
    },
    "invasionPattern": {
        "title": "Patterns of myometrial invasion",
        "intro": "Measure depth from the endomyometrial junction to the deepest invasive gland. Invasion into adenomyosis is not myoinvasion; MELF is prone to being missed and mistaken for lymphovascular invasion.",
        "columns": 3,
        "groups": [
            {"heading": "Infiltrative glands with stromal response", "points": [
                "Irregular, angulated glands or nests in myometrium with desmoplastic, oedematous or inflammatory stroma",
                "Most common pattern; depth is usually easy to measure",
                "Distinguish from: carcinoma in adenomyosis (endometrial stroma around the glands, rounded contour, no stromal reaction)"]},
            {"heading": "Broad pushing (expansile) front", "points": [
                "Smooth, broad tumour-myometrium interface without stromal reaction; can be underestimated as no invasion",
                "Compare with adjacent normal endomyometrial junction to gauge depth",
                "Distinguish from: exophytic tumour compressing but not invading the myometrium"]},
            {"heading": "MELF (microcystic, elongated and fragmented) pattern", "points": [
                "Microcystic and elongated glands lined by flattened or eosinophilic, sometimes squamoid cells, fragmenting into single cells and small clusters",
                "Fibromyxoid, inflamed stroma with neutrophils; typically at the invasive front of low-grade endometrioid carcinoma",
                "Associated with lymphovascular invasion and lymph node micrometastasis; fragmented cells mimic histiocytes or LVSI (keratin and CD68 help)",
                "Distinguish from: true lymphovascular invasion (endothelium-lined space, CD31 / D2-40)"]},
            {"heading": "Adenomyosis-like (irregular islands without stromal response)", "points": [
                "Rounded or irregular tumour islands deep in myometrium lacking any stromal reaction and lacking endometrial stroma",
                "Counts as invasion; depth is measured to the deepest island",
                "Distinguish from: carcinoma colonising adenomyosis (residual endometrial stroma or benign glands at the periphery, CD10 stroma)"]},
            {"heading": "Diffusely infiltrative single cells and cords", "points": [
                "Single cells, cords and small nests permeating between muscle fibres, often with minimal stromal response",
                "May be underrecognised at low power; keratin highlights the extent",
                "Distinguish from: MELF (microcystic glands and fibromyxoid stroma) and undifferentiated carcinoma"]},
        ],
    },
}
