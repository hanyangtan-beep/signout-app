"""Criteria text for the prostate biopsy reference galleries (schema `field.reference`).

Images are merged in by gen-prostate-reference.py from assets/reference/prostate/images.json,
matched on (field, group heading). Groups without a licensed image ship with text only.

Criteria follow the 2014 ISUP consensus (Epstein et al., Am J Surg Pathol 2016;40:244-52,
doi:10.1097/PAS.0000000000000530), the 2019 ISUP consensus (van Leenders et al.,
Am J Surg Pathol 2020;44:e87-e99, doi:10.1097/PAS.0000000000001497), the ISUP / Shah cribriform
definitions and the WHO Urinary and Male Genital Tumours 5th edition criteria as summarised in
Surintrspanont & Zhou, Pathologica 2023;115:41-56 (doi:10.32074/1591-951X-822).
Gallery text only: none of this is printed into a report.
"""

GRADE_GROUPS = ("Grade Group 1 = 3+3; 2 = 3+4; 3 = 4+3; 4 = score 8 (4+4, 3+5, 5+3); "
                "5 = score 9-10. On needle biopsy the highest pattern is included in the score "
                "whatever its extent; the 5% rule applies only to radical prostatectomy.")

PATTERN_GROUPS = [
    {"heading": "Pattern 3 - discrete, separate glands", "points": [
        "Individual glands are well formed and separate, each surrounded by stroma, however small or crowded",
        "Gland size varies; small, branching and atrophic-looking glands are still pattern 3",
        "Every lumen is circumscribed by a single layer of tumour cells with no shared walls",
        "Distinguish from: pattern 4, where glands lose their individual walls (fused) or lumina (poorly formed)"]},
    {"heading": "Pattern 4 - poorly formed, fused, cribriform or glomeruloid", "points": [
        "Poorly formed glands: cell clusters with no lumen or only an abortive one, more than an occasional focus, recognisable at the 10x objective",
        "Fused glands: chains or nests in which adjacent glands share walls and the stroma between them is lost",
        "Cribriform glands: a confluent sheet of tumour cells punched by multiple lumina, no intervening stroma or mucin",
        "Glomeruloid glands: an intraluminal cribriform tuft attached to the gland wall at one point, like a renal glomerulus",
        "Cribriform and glomeruloid growth are pattern 4 whatever their size or number"]},
    {"heading": "Pattern 5 - sheets, cords, single cells, comedonecrosis", "points": [
        "Solid sheets, nests or cylinders of tumour with no gland formation",
        "Single cells and single-file cords infiltrating stroma",
        "Solid nests pierced by rosette-like spaces still count as pattern 5, not cribriform pattern 4",
        "Unequivocal comedonecrosis within solid or cribriform masses is pattern 5, even when focal",
        "Distinguish from: crushed or cauterised pattern 3, inflammation and lymphocytes, and the granular cells of xanthoma or histiocytes"]},
    {"heading": "Borderline 3 vs 4 - favour the lower grade", "points": [
        "Occasional poorly formed or fused glands among well-formed glands are not enough for pattern 4",
        "Tangential sections through the edge of well-formed glands produce apparent poorly formed glands; look at the neighbouring planes",
        "Crush artefact and thick sections both fabricate fusion; where morphology is borderline or crushed, grade the lower pattern",
        "Distinguish from: adenosis (atypical adenomatous hyperplasia) and partial atrophy, which are benign crowded small glands with at least patchy basal cells"]},
]

REFERENCE_TEXT = {
    "primary": {
        "title": "Gleason patterns 3, 4 and 5",
        "intro": "Grade what is present at the 10x objective. Pattern 3 keeps individual glands; pattern 4 loses either the separate wall (fused, cribriform) or the lumen (poorly formed); pattern 5 abandons gland formation altogether.",
        "columns": 2,
        "groups": PATTERN_GROUPS,
        "noteTop": GRADE_GROUPS,
    },
    "secondary": {
        "title": "Gleason patterns 3, 4 and 5",
        "intro": "The secondary pattern is the second most common pattern. On needle biopsy a higher pattern is recorded as the secondary grade however little of it there is.",
        "columns": 2,
        "groups": PATTERN_GROUPS,
    },
    "tertiary5": {
        "title": "Minor (tertiary) pattern 5",
        "intro": "The 2019 ISUP consensus prefers 'minor' to 'tertiary'. On needle biopsy a minor high-grade pattern is not a tertiary grade: it is taken into the score as the secondary pattern whatever its extent.",
        "columns": 3,
        "groups": [
            {"heading": "Minor pattern 5 on needle biopsy", "points": [
                "A small focus of sheets, cords, single cells or comedonecrosis against a background of pattern 3 or 4",
                "On biopsy it enters the score: 60% pattern 4, 36% pattern 3, 4% pattern 5 is reported as 4+5 = 9, Grade Group 5",
                "Record it so that a patient is not offered active surveillance on the strength of the majority pattern"]},
            {"heading": "Pattern 5 as a true secondary grade", "points": [
                "Pattern 5 is the second most common pattern by area, not a minor focus",
                "Score directly as 3+5 = 8 or 4+5 = 9; no separate minor-pattern statement is needed"]},
            {"heading": "The 5% rule (resections only)", "points": [
                "In a radical prostatectomy the highest pattern must reach 5% of the tumour to be taken as the secondary grade",
                "Below 5% the score uses the primary and secondary patterns and the minor pattern is given in a comment",
                "60% pattern 3, 37% pattern 4, 3% pattern 5 is 3+4 = 7 with minor pattern 5; 60% / 30% / 10% is 3+5 = 8"]},
        ],
        "note": "Do not apply the 5% rule to a needle biopsy.",
    },
    "cribriform": {
        "title": "Cribriform pattern 4",
        "intro": "Cribriform growth carries a worse outcome than poorly formed or fused pattern 4, so it is stated separately in Gleason score 7 and 8 cancers. Where basal cell stains are not available, 'cribriform glands present' covers both invasive cribriform carcinoma and IDC-P.",
        "columns": 3,
        "groups": [
            {"heading": "Cribriform: the ISUP definition", "points": [
                "A confluent sheet of contiguous tumour cells with multiple lumina, easily seen at the 10x objective",
                "No stroma and no mucin separating the individual or fused glandular structures",
                "Transluminal bridging with a dense cell mass filling at least half the lumen",
                "Most of the cells inside the gland are out of contact with stroma"]},
            {"heading": "Large vs small cribriform", "points": [
                "Large cribriform glands are the ones with the consistent adverse outcome data",
                "Thresholds in use: diameter at least twice an adjacent benign gland, or above 0.25 mm, or more than twelve lumina",
                "No threshold is adopted by WHO; report cribriform growth as present rather than sizing it in the report"]},
            {"heading": "Not cribriform", "points": [
                "Glomeruloid glands: the tuft is attached to the gland wall at a single point (still pattern 4)",
                "Fused glands where stroma or vessels still run between the lumina",
                "Mucinous fibroplasia (collagenous micronodules), where the bridging is by stroma and mucin",
                "Partial bridging only, or a clear peripheral luminal space around more than half the circumference"]},
        ],
    },
    "idcp": {
        "title": "Intraductal carcinoma of the prostate",
        "intro": "IDC-P is a malignant proliferation filling and expanding pre-existing ducts and acini, with basal cells retained. It is not given a Gleason grade of its own; when it stands alone in a biopsy, grade nothing and say so.",
        "columns": 3,
        "groups": [
            {"heading": "IDC-P: essential criteria", "points": [
                "An expansile proliferation within the pre-existing duct-acinar system, the ducts usually distended well beyond neighbouring benign glands",
                "Lumen-spanning solid, dense cribriform or comedo growth, or loose cribriform / micropapillary growth with enlarged pleomorphic nuclei",
                "Residual basal cells, at least in part, shown by p63 or 34betaE12 where the distinction changes the report",
                "Almost always beside high-grade invasive carcinoma; IDC-P alone occurs in well under 1% of biopsies"]},
            {"heading": "IDC-P vs invasive cribriform carcinoma", "points": [
                "Invasive cribriform carcinoma has no basal cells; IDC-P retains at least a partial layer",
                "The distinction is not reliable on H&E: an apparently invasive cribriform or comedonecrotic focus may prove intraductal on staining",
                "When the invasive component is graded, an associated cribriform focus is pattern 4 and a solid or comedonecrotic one is pattern 5"]},
            {"heading": "IDC-P vs high grade PIN", "points": [
                "HGPIN keeps the architecture of the native gland: tufting, micropapillary, flat or loose cribriform growth without duct expansion",
                "IDC-P shows atypia beyond HGPIN - marked nuclear enlargement and pleomorphism, dense cribriform or solid growth, or necrosis",
                "Cribriform HGPIN is no longer recognised as an entity; a cribriform intraductal proliferation is reported as IDC-P or as atypical",
                "The 'nuclei six times benign' rule has been dropped from WHO; read it as markedly enlarged and pleomorphic"]},
        ],
    },
    "category": {
        "title": "Benign, HGPIN, ASAP and adenocarcinoma",
        "intro": "Carcinoma needs the architecture, the cytology and the absent basal cell layer together. Where a small focus is suspicious but falls short, ASAP is the honest answer.",
        "columns": 3,
        "groups": [
            {"heading": "Benign", "points": [
                "Glands are lobular, with papillary infoldings and undulating luminal borders",
                "A basal cell layer is present, patchy on H&E and continuous on p63 / 34betaE12",
                "Nuclei are small and uniform; nucleoli are inconspicuous",
                "Corpora amylacea are common; crystalloids are not"]},
            {"heading": "HGPIN", "points": [
                "Pre-existing large glands lined by crowded, stratified cells with enlarged nuclei and prominent nucleoli",
                "Tufting, micropapillary or flat growth; the gland keeps its native size and contour",
                "Basal cells remain, though they may be discontinuous",
                "Distinguish from: IDC-P (duct expansion, dense cribriform or solid growth, necrosis, marked pleomorphism)"]},
            {"heading": "ASAP", "points": [
                "A small focus of crowded glands, atypical but too few, too distorted or too poorly preserved to be called carcinoma",
                "Basal cell stain equivocal, negative in a focus too small to trust, or lost on the recut",
                "Descriptive alternative: 'atypical glands suspicious for but not diagnostic of adenocarcinoma'",
                "Do not assign a Gleason score to ASAP"]},
            {"heading": "Adenocarcinoma", "points": [
                "Infiltrative small glands between benign glands, or any of the pattern 4 / 5 architectures",
                "Enlarged nuclei with prominent nucleoli, amphophilic cytoplasm and a sharp luminal border",
                "No basal cells on p63 / 34betaE12; AMACR is usually positive but does not stand alone",
                "Supporting features: perineural invasion, mucinous fibroplasia, glomerulations, intraluminal crystalloids, blue mucin"]},
            {"heading": "Benign mimics of carcinoma", "points": [
                "Adenosis (atypical adenomatous hyperplasia): a lobular cluster of small glands with pale cytoplasm and patchy basal cells",
                "Partial atrophy: crowded pale glands with scant cytoplasm, nuclei reaching the luminal surface, basal cells retained",
                "Seminal vesicle / ejaculatory duct: lipofuscin pigment, marked degenerative nuclear atypia without mitoses",
                "Cowper glands: lobules of bland mucinous acini beside skeletal muscle",
                "Nephrogenic adenoma: small tubules with hobnail cells and basement membrane thickening, PAX8 positive",
                "Basal cell hyperplasia: solid or cribriform nests of basal cells, p63 positive throughout"]},
        ],
    },
}
