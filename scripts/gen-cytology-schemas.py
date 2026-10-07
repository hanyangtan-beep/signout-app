#!/usr/bin/env python3
"""One-off writer for the six cytology schemas (kind: cytology). Re-run to regenerate."""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1] / 'schemas'

OPTIONS = [
    {"id": "includeHeader", "label": "Section headers (SPECIMEN / MICROSCOPIC EXAMINATION / DIAGNOSIS)", "type": "checkbox", "default": False},
    {"id": "macro", "label": "Generate the preparations line (received / processed as)", "type": "checkbox", "default": True},
]

def sel(id, label, options, default=None, **kw):
    f = {"id": id, "label": label, "type": "select", "options": options, "default": default if default is not None else options[0]}
    f.update(kw); return f

def txt(id, label, default="", **kw):
    f = {"id": id, "label": label, "type": "text", "default": default}; f.update(kw); return f

def numf(id, label, default="", **kw):
    f = {"id": id, "label": label, "type": "number", "default": default}; f.update(kw); return f

def chk(id, label, default=False, **kw):
    f = {"id": id, "label": label, "type": "checkbox", "default": default}; f.update(kw); return f

def multi(id, label, options, default=None, **kw):
    f = {"id": id, "label": label, "type": "multiselect", "options": options, "default": default or []}; f.update(kw); return f

def fna_preps(rinse_default="Blood-stained"):
    return [
        numf("smearsAir", "Air-dried smears", 2, group="Preparations"),
        numf("smearsAlc", "Alcohol-fixed smears", 2, group="Preparations"),
        sel("rinse", "Needle rinse", ["Blood-stained", "Pink", "Clear", "Turbid", "Brown (cyst fluid)", "None"], rinse_default, group="Preparations"),
        chk("lbc", "Liquid-based slide", False, group="Preparations"),
        numf("cytospin", "Cytospin slides", 1, group="Preparations"),
        numf("cellBlock", "Cell block slides", 1, group="Preparations"),
    ]

def fluid_preps(vol="", appearance_opts=None, appearance_default=None):
    appearance_opts = appearance_opts or ["Clear yellow", "Turbid yellow", "Blood-stained", "Haemorrhagic", "Pink", "Chylous", "Purulent", "Brown"]
    return [
        txt("volume", "Volume (ml)", vol, group="Preparations", placeholder="25"),
        sel("appearance", "Appearance", appearance_opts, appearance_default or appearance_opts[0], group="Preparations"),
        chk("lbc", "Liquid-based slide", False, group="Preparations"),
        numf("cytospin", "Cytospin slides", 2, group="Preparations"),
        numf("cellBlock", "Cell block slides", 1, group="Preparations"),
    ]

def adequacy_field(options, default, reasons, reason_show):
    return [
        sel("adequacy", "Adequacy", options, default, group="Adequacy"),
        sel("inadequacyReason", "Reason for inadequacy", reasons, reasons[0], group="Adequacy", showIf={"field": "adequacy", "is": reason_show}),
    ]

COMMON_TAIL = [
    {"id": "additionalFindings", "label": "Additional findings (free text, appended to microscopy)", "type": "textarea", "default": "", "group": "Microscopy", "placeholder": "e.g. Occasional groups of ciliated respiratory epithelial cells are also present"},
    {"id": "ancillary", "label": "Ancillary studies (same paragraph)", "type": "textarea", "default": "", "group": "Ancillary", "placeholder": "e.g. Immunostaining on the cell block shows the cells to be positive for TTF-1 and negative for p40"},
]

def base(id, name, short, organ, rank, aliases, noun, gen_fields, snippets, example, label=None):
    return {
        "id": id, "version": 1, "name": name, "shortName": short, "label": label or short.replace(" · ", " "), "organ": organ,
        "system": "Cytology", "kind": "cytology", "rank": rank, "aliases": aliases,
        "specimenNoun": noun, "maxParts": 4, "generator": "cytology",
        "source": "Cytology suite. Classification systems: Bethesda 2023 (thyroid), Milan 2nd ed 2023 (salivary), Paris System 2.0 (urine), International System for Serous Fluid Cytopathology (effusions), Sydney System (lymph node), Bethesda 2014 (cervical). Adequacy is assessed on the final preparations only.",
        "caseFields": [], "options": OPTIONS, "fields": gen_fields, "snippets": snippets, "example": example,
    }

def ex(values, **case):
    c = {"caseTitle": "", "options": {"includeHeader": False, "macro": True}, "parts": [{"label": "A", "values": values}]}
    c.update(case); return c

def rom_snippet(id, cat_field, cat, text):
    return {"id": id, "label": f"Risk of malignancy: {cat.split('. ',1)[-1][:40]}", "auto": {"field": cat_field, "is": cat}, "text": text}

# ---------------------------------------------------------------- thyroid
BETH = ["I. Nondiagnostic", "II. Benign", "III. Atypia of undetermined significance", "IV. Follicular neoplasm", "V. Suspicious for malignancy", "VI. Malignant"]
thyroid_fields = [
    txt("specimenName", "Site (after 'Thyroid,')", "right lobe nodule", placeholder="right lobe nodule / isthmic nodule / left lobe, 1.8 cm nodule"),
    sel("procedure", "Procedure", ["Fine needle aspiration", "Ultrasound-guided fine needle aspiration"]),
    *fna_preps(),
    *adequacy_field(["Adequate", "Adequate, limited by low cellularity", "Inadequate"], "Adequate",
                    ["Cyst fluid only", "Virtually acellular specimen", "Obscuring blood", "Poor preservation and air-drying artefact", "Fewer than six groups of ten follicular cells"], "Inadequate"),
    sel("category", "Bethesda category (2023)", BETH, "II. Benign", group="Category"),
    sel("benignDx", "Benign diagnosis", ["Benign follicular nodule", "Colloid nodule", "Benign follicular nodule with cystic change", "Lymphocytic (Hashimoto) thyroiditis", "Granulomatous (subacute) thyroiditis", "Benign follicular nodule in a known multinodular goitre"], "Benign follicular nodule", group="Category", showIf={"field": "category", "is": "II. Benign"}),
    sel("ausSubtype", "AUS subtype", ["Nuclear atypia", "Other (architectural atypia)", "Other (oncocytic)", "Other (atypical lymphoid cells)", "Other (atypical cyst-lining cells)"], "Nuclear atypia", group="Category", showIf={"field": "category", "is": "III. Atypia of undetermined significance"}),
    sel("fnSubtype", "Follicular neoplasm subtype", ["Follicular neoplasm", "Oncocytic follicular neoplasm", "Follicular neoplasm with nuclear features suggestive of papillary carcinoma (NIFTP cannot be excluded)"], "Follicular neoplasm", group="Category", showIf={"field": "category", "is": "IV. Follicular neoplasm"}),
    sel("suspSubtype", "Suspicious for", ["Papillary thyroid carcinoma", "Medullary thyroid carcinoma", "Lymphoma", "Metastatic carcinoma", "Malignancy, type undetermined"], "Papillary thyroid carcinoma", group="Category", showIf={"field": "category", "is": "V. Suspicious for malignancy"}),
    sel("malignantDx", "Malignant diagnosis", ["Papillary thyroid carcinoma", "Medullary thyroid carcinoma", "Poorly differentiated thyroid carcinoma", "Anaplastic thyroid carcinoma", "Squamous cell carcinoma", "Lymphoma", "Metastatic carcinoma", "Other malignancy"], "Papillary thyroid carcinoma", group="Category", showIf={"field": "category", "is": "VI. Malignant"}),
    multi("features", "Cytological features", ["Abundant colloid", "Scant colloid", "Watery colloid", "Follicular cells in flat sheets", "Microfollicles", "Oncocytic (Hurthle) cells", "Lymphocytes", "Haemosiderin-laden macrophages", "Papillary architecture", "Nuclear enlargement and pallor", "Nuclear grooves", "Intranuclear pseudoinclusions", "Psammoma bodies", "Multinucleated giant cells", "Amyloid", "Plasmacytoid cells with salt-and-pepper chromatin", "Marked pleomorphism", "Necrosis", "Mitoses"], ["Abundant colloid", "Follicular cells in flat sheets", "Haemosiderin-laden macrophages"], group="Microscopy"),
    *COMMON_TAIL,
]
thyroid_snips = [
    rom_snippet("thyroid_rom_i", "category", BETH[0], "A nondiagnostic result (Bethesda I) carries an estimated risk of malignancy of 13% (5-20%). Repeat ultrasound-guided aspiration is suggested."),
    rom_snippet("thyroid_rom_iii", "category", BETH[2], "Atypia of undetermined significance (Bethesda III) carries an estimated risk of malignancy of 22% (13-30%). Repeat aspiration, molecular testing or diagnostic lobectomy may be considered according to clinical and sonographic correlation."),
    rom_snippet("thyroid_rom_iv", "category", BETH[3], "Follicular neoplasm (Bethesda IV) carries an estimated risk of malignancy of 30% (23-34%). Diagnostic lobectomy or molecular testing is suggested; distinction between follicular adenoma, follicular carcinoma and NIFTP requires histological examination of the excised nodule."),
    rom_snippet("thyroid_rom_v", "category", BETH[4], "Suspicious for malignancy (Bethesda V) carries an estimated risk of malignancy of 74% (67-83%). Surgical management is suggested."),
    {"id": "thyroid_molecular", "label": "Molecular testing available on cell block", "text": "Molecular testing on the cell block can be arranged on request."},
]
thyroid_example = ex({"specimenName": "right lobe nodule", "procedure": "Ultrasound-guided fine needle aspiration", "smearsAir": "2", "smearsAlc": "2", "rinse": "Blood-stained", "lbc": False, "cytospin": "1", "cellBlock": "1", "adequacy": "Adequate", "inadequacyReason": "Cyst fluid only", "category": "II. Benign", "benignDx": "Benign follicular nodule", "features": ["Abundant colloid", "Follicular cells in flat sheets", "Haemosiderin-laden macrophages"], "additionalFindings": "", "ancillary": ""})

# ---------------------------------------------------------------- salivary
MIL = ["I. Non-diagnostic", "II. Non-neoplastic", "III. Atypia of undetermined significance", "IVa. Benign neoplasm", "IVb. Salivary gland neoplasm of uncertain malignant potential", "V. Suspicious for malignancy", "VI. Malignant"]
salivary_fields = [
    txt("specimenName", "Site (after 'Salivary gland,')", "left parotid", placeholder="left parotid / right submandibular / left parotid tail nodule"),
    sel("procedure", "Procedure", ["Fine needle aspiration", "Ultrasound-guided fine needle aspiration"]),
    *fna_preps(),
    *adequacy_field(["Adequate", "Adequate, limited by low cellularity", "Inadequate"], "Adequate",
                    ["Virtually acellular specimen", "Obscuring blood", "Non-mucinous cyst contents only", "Normal salivary tissue only in a clinically discrete mass", "Poor preservation"], "Inadequate"),
    sel("category", "Milan category (2nd edition)", MIL, "IVa. Benign neoplasm", group="Category"),
    sel("nonNeoplasticDx", "Non-neoplastic diagnosis", ["Chronic sialadenitis", "Acute sialadenitis", "Granulomatous sialadenitis", "Lymphoepithelial cyst", "Reactive intraparotid lymph node", "Mucocele / mucus retention cyst", "Normal salivary gland tissue"], "Chronic sialadenitis", group="Category", showIf={"field": "category", "is": MIL[1]}),
    sel("benignNeoplasmDx", "Benign neoplasm", ["Pleomorphic adenoma", "Warthin tumour", "Basal cell adenoma", "Oncocytoma", "Lipoma", "Schwannoma", "Benign neoplasm, not further classifiable"], "Pleomorphic adenoma", group="Category", showIf={"field": "category", "is": MIL[3]}),
    sel("sumpDx", "SUMP subgroup", ["Cellular basaloid neoplasm", "Cellular oncocytic / oncocytoid neoplasm", "Cellular neoplasm with clear cell features", "Cellular neoplasm with myoepithelial differentiation", "Low grade mucinous neoplasm", "Epithelial neoplasm, not further classifiable"], "Cellular basaloid neoplasm", group="Category", showIf={"field": "category", "is": MIL[4]}),
    sel("suspDx", "Suspicious for", ["Carcinoma", "Lymphoma", "Metastatic carcinoma", "Malignancy, type undetermined"], "Carcinoma", group="Category", showIf={"field": "category", "is": MIL[5]}),
    sel("malignantDx", "Malignant diagnosis", ["Mucoepidermoid carcinoma, low grade", "Mucoepidermoid carcinoma, high grade", "Adenoid cystic carcinoma", "Acinic cell carcinoma", "Secretory carcinoma", "Salivary duct carcinoma", "Carcinoma ex pleomorphic adenoma", "Carcinoma, not further classifiable", "Lymphoma", "Metastatic squamous cell carcinoma", "Metastatic melanoma", "Other malignancy"], "Mucoepidermoid carcinoma, low grade", group="Category", showIf={"field": "category", "is": MIL[6]}),
    multi("features", "Cytological features", ["Chondromyxoid fibrillary matrix", "Myoepithelial cells", "Plasmacytoid cells", "Oncocytic cells in flat sheets", "Polymorphous lymphoid background", "Mucinous background", "Basaloid cells with hyaline globules", "Acinar cells", "Squamous and intermediate cells", "Mucous cells", "Cystic debris", "Lymphocytes", "Marked pleomorphism", "Necrosis", "Mitoses"], ["Chondromyxoid fibrillary matrix", "Myoepithelial cells", "Plasmacytoid cells"], group="Microscopy"),
    *COMMON_TAIL,
]
salivary_snips = [
    rom_snippet("salivary_rom_i", "category", MIL[0], "A non-diagnostic result (Milan I) carries an estimated risk of malignancy of 15%. Repeat ultrasound-guided aspiration is suggested."),
    rom_snippet("salivary_rom_iii", "category", MIL[2], "Atypia of undetermined significance (Milan III) carries an estimated risk of malignancy of 30%. Repeat aspiration or excision is suggested according to clinical and radiological correlation."),
    rom_snippet("salivary_rom_ivb", "category", MIL[4], "A salivary gland neoplasm of uncertain malignant potential (Milan IVb) carries an estimated risk of malignancy of 35%. Excision is suggested for definitive classification."),
    rom_snippet("salivary_rom_v", "category", MIL[5], "Suspicious for malignancy (Milan V) carries an estimated risk of malignancy of 83%. Surgical management is suggested."),
    {"id": "salivary_excision", "label": "Suggest excisional biopsy", "auto": {"field": "suspDx", "is": "Lymphoma"}, "text": "Suggest excisional biopsy for definitive diagnosis."},
]
salivary_example = ex({"specimenName": "left parotid", "procedure": "Ultrasound-guided fine needle aspiration", "smearsAir": "2", "smearsAlc": "2", "rinse": "Blood-stained", "lbc": False, "cytospin": "1", "cellBlock": "1", "adequacy": "Adequate", "inadequacyReason": "Virtually acellular specimen", "category": "IVa. Benign neoplasm", "benignNeoplasmDx": "Pleomorphic adenoma", "features": ["Chondromyxoid fibrillary matrix", "Myoepithelial cells", "Plasmacytoid cells"], "additionalFindings": "", "ancillary": ""})

# ---------------------------------------------------------------- urine
PAR = ["Non-diagnostic / unsatisfactory", "Negative for high grade urothelial carcinoma", "Atypical urothelial cells", "Suspicious for high grade urothelial carcinoma", "High grade urothelial carcinoma", "Other malignancy"]
urine_fields = [
    sel("specimenType", "Specimen", ["Voided urine", "Catheterised urine", "Bladder washing", "Ureteric washing (left)", "Ureteric washing (right)", "Renal pelvic washing (left)", "Renal pelvic washing (right)", "Ileal conduit urine"], "Voided urine"),
    txt("specimenName", "Further site detail (optional)", "", placeholder="e.g. neobladder"),
    *fluid_preps("30", ["Clear yellow", "Turbid yellow", "Blood-stained", "Haemorrhagic", "Pale", "Brown"], "Clear yellow"),
    *adequacy_field(["Satisfactory", "Satisfactory, limited by low cellularity", "Unsatisfactory"], "Satisfactory",
                    ["Fewer than ten urothelial cells per ten high-power fields", "Volume less than 25 ml", "Obscuring blood", "Obscuring inflammation", "Degenerate cells only", "Lubricant artefact"], "Unsatisfactory"),
    sel("category", "Paris System 2.0 category", PAR, PAR[1], group="Category"),
    chk("lgun", "Papillary fragments with fibrovascular cores (low grade urothelial neoplasm cannot be excluded)", False, group="Category", showIf={"field": "category", "is": PAR[1]}),
    sel("otherMalignancy", "Other malignancy", ["Squamous cell carcinoma", "Adenocarcinoma", "Small cell neuroendocrine carcinoma", "Metastatic carcinoma", "Lymphoma", "Other malignancy"], "Squamous cell carcinoma", group="Category", showIf={"field": "category", "is": PAR[5]}),
    multi("features", "Cytological features", ["Benign urothelial cells", "Umbrella cells", "Squamous cells", "Degenerated cells", "Inflammatory cells", "Red blood cells", "Polyomavirus (decoy) cells", "Urothelial tissue fragments", "Fibrovascular cores", "Crystals", "N:C ratio 0.7 or more", "Hyperchromasia", "Irregular nuclear membranes", "Coarse chromatin", "Necrotic background", "Mitoses"], ["Benign urothelial cells", "Squamous cells", "Inflammatory cells"], group="Microscopy"),
    *COMMON_TAIL,
]
urine_snips = [
    {"id": "urine_auc_followup", "label": "AUC: correlation and repeat sampling", "auto": {"field": "category", "is": PAR[2]}, "text": "Correlation with cystoscopic and radiological findings is advised, with repeat urine cytology as clinically indicated."},
    {"id": "urine_decoy", "label": "Polyomavirus (decoy) cells", "auto": {"field": "features", "is": "Polyomavirus (decoy) cells"}, "text": "The polyomavirus-infected (decoy) cells should not be mistaken for high grade urothelial carcinoma."},
    {"id": "urine_lgun_note", "label": "LGUN: histology needed", "auto": {"field": "lgun", "truthy": True}, "text": "Cytology cannot reliably distinguish low grade papillary urothelial neoplasms; correlation with cystoscopy and histological sampling is advised."},
]
urine_example = ex({"specimenType": "Voided urine", "specimenName": "", "volume": "30", "appearance": "Clear yellow", "lbc": False, "cytospin": "2", "cellBlock": "0", "adequacy": "Satisfactory", "inadequacyReason": PAR[0], "category": PAR[1], "lgun": False, "features": ["Benign urothelial cells", "Squamous cells", "Inflammatory cells"], "additionalFindings": "", "ancillary": ""})

# ---------------------------------------------------------------- effusion
TISC = ["Non-diagnostic", "Negative for malignancy", "Atypia of undetermined significance", "Suspicious for malignancy", "Malignant"]
effusion_fields = [
    sel("specimenType", "Specimen", ["Pleural fluid", "Peritoneal (ascitic) fluid", "Pericardial fluid", "Peritoneal washing", "Pelvic washing"], "Pleural fluid"),
    txt("specimenName", "Side / site", "right", placeholder="right / left / Douglas pouch"),
    *fluid_preps("50"),
    *adequacy_field(["Adequate", "Adequate, limited by low cellularity", "Inadequate"], "Adequate",
                    ["Virtually acellular specimen", "Fewer than ten cells", "Degenerate cells only", "Obscuring blood"], "Inadequate"),
    sel("category", "International System category", TISC, TISC[1], group="Category"),
    sel("malignantType", "Type of malignancy", ["Metastatic adenocarcinoma", "Metastatic squamous cell carcinoma", "Metastatic small cell neuroendocrine carcinoma", "Metastatic carcinoma, type undetermined", "Mesothelioma", "Lymphoma", "Metastatic melanoma", "Metastatic sarcoma", "Malignancy, type undetermined"], "Metastatic adenocarcinoma", group="Category", showIf={"field": "category", "is": [TISC[3], TISC[4]]}),
    sel("favourPrimary", "Favoured primary", ["Not stated", "Consistent with lung primary", "Consistent with breast primary", "Consistent with ovarian / tubal serous carcinoma", "Consistent with gastric primary", "Consistent with colorectal primary", "Consistent with pancreaticobiliary primary", "Consistent with the known primary", "Primary site undetermined"], "Not stated", group="Category", showIf={"field": "category", "is": TISC[4]}),
    multi("features", "Cytological features", ["Reactive mesothelial cells", "Lymphocyte-predominant", "Neutrophils", "Macrophages", "Eosinophils", "Blood", "Three-dimensional clusters", "Papillary clusters", "Foreign cell population", "Signet-ring cells", "Vacuolated cytoplasm", "Mucin", "Prominent nucleoli", "Psammoma bodies", "Necrosis", "Mitoses"], ["Reactive mesothelial cells", "Lymphocyte-predominant", "Macrophages"], group="Microscopy"),
    *COMMON_TAIL,
]
effusion_snips = [
    {"id": "effusion_rom_aus", "label": "AUS: risk and repeat sampling", "auto": {"field": "category", "is": TISC[2]}, "text": "Atypia of undetermined significance carries an estimated risk of malignancy of approximately 66% in the International System for Serous Fluid Cytopathology. Repeat sampling with cell block for immunocytochemistry is suggested if the effusion reaccumulates."},
    {"id": "effusion_nfm_history", "label": "Negative with known malignancy", "text": "A negative result does not exclude malignancy; repeat sampling is suggested if clinically indicated."},
    {"id": "effusion_meso_caveat", "label": "Mesothelioma: tissue confirmation", "auto": {"field": "malignantType", "is": "Mesothelioma"}, "text": "Tissue biopsy is advised for confirmation of mesothelioma and assessment of invasion."},
]
effusion_example = ex({"specimenType": "Pleural fluid", "specimenName": "right", "volume": "50", "appearance": "Blood-stained", "lbc": False, "cytospin": "2", "cellBlock": "1", "adequacy": "Adequate", "inadequacyReason": "Virtually acellular specimen", "category": "Malignant", "malignantType": "Metastatic adenocarcinoma", "favourPrimary": "Consistent with lung primary", "features": ["Reactive mesothelial cells", "Foreign cell population", "Three-dimensional clusters", "Vacuolated cytoplasm", "Prominent nucleoli"], "additionalFindings": "", "ancillary": "Immunostaining on the cell block shows the malignant cells to be positive for TTF-1, napsin A and BerEP4 and negative for calretinin and WT1, while the mesothelial cells show the converse pattern"})

# ---------------------------------------------------------------- lymph node / EBUS
SYD = ["L1. Inadequate / non-diagnostic", "L2. Benign", "L3. Atypical cells of undetermined significance", "L4. Suspicious for malignancy", "L5. Malignant"]
ln_fields = [
    txt("specimenName", "Site (after 'Lymph node,')", "right cervical level II", placeholder="right cervical level II / station 7 / station 4R / left axilla"),
    sel("procedure", "Procedure", ["Fine needle aspiration", "Ultrasound-guided fine needle aspiration", "EBUS-TBNA", "EUS-FNA"], "Fine needle aspiration"),
    *fna_preps(),
    *adequacy_field(["Adequate", "Adequate, limited by low cellularity", "Inadequate"], "Adequate",
                    ["Virtually acellular specimen", "Blood only", "Bronchial epithelial cells and cartilage only", "Poor preservation", "Necrotic material only"], "Inadequate"),
    sel("category", "Sydney System category", SYD, SYD[1], group="Category"),
    sel("benignDx", "Benign diagnosis", ["Reactive lymphoid population", "Granulomatous inflammation, non-necrotising", "Granulomatous inflammation, necrotising", "Suppurative inflammation", "Anthracosis with reactive lymphoid population", "Necrotising lymphadenitis"], "Reactive lymphoid population", group="Category", showIf={"field": "category", "is": SYD[1]}),
    sel("suspDx", "Suspicious for", ["Metastatic carcinoma", "Lymphoma", "Metastatic melanoma", "Malignancy, type undetermined"], "Metastatic carcinoma", group="Category", showIf={"field": "category", "is": SYD[3]}),
    sel("malignantDx", "Malignant diagnosis", ["Metastatic adenocarcinoma", "Metastatic squamous cell carcinoma", "Metastatic small cell neuroendocrine carcinoma", "Metastatic non-small cell carcinoma, not further classifiable", "Metastatic nasopharyngeal carcinoma", "Metastatic papillary thyroid carcinoma", "Metastatic carcinoma, type undetermined", "Metastatic melanoma", "Lymphoma, favour", "Hodgkin lymphoma, favour", "Other malignancy"], "Metastatic squamous cell carcinoma", group="Category", showIf={"field": "category", "is": SYD[4]}),
    sel("favourPrimary", "Favoured primary", ["Not stated", "Consistent with lung primary", "Consistent with head and neck primary", "Consistent with nasopharyngeal primary", "Consistent with breast primary", "Consistent with thyroid primary", "Consistent with gastrointestinal primary", "Consistent with the known primary", "Primary site undetermined"], "Not stated", group="Category", showIf={"field": "category", "is": SYD[4]}),
    multi("features", "Cytological features", ["Polymorphous lymphoid population", "Lymphoglandular bodies", "Tingible-body macrophages", "Epithelioid granulomas", "Multinucleated giant cells", "Necrosis", "Suppurative inflammation", "Anthracotic macrophages", "Bronchial epithelial cells and cartilage", "Monotonous small lymphoid population", "Monotonous medium to large lymphoid population", "Cohesive epithelial clusters", "Keratinisation", "Papillary architecture", "Nuclear grooves", "Intranuclear pseudoinclusions", "Marked pleomorphism", "Mitoses"], ["Polymorphous lymphoid population", "Lymphoglandular bodies", "Tingible-body macrophages"], group="Microscopy"),
    *COMMON_TAIL,
]
ln_snips = [
    {"id": "ln_excision", "label": "Suggest excisional biopsy", "auto": {"field": "category", "is": [SYD[2], SYD[3]]}, "text": "Suggest excisional biopsy for definitive diagnosis."},
    {"id": "ln_lymphoma_excision", "label": "Lymphoma favoured: excision for classification", "auto": {"field": "malignantDx", "is": ["Lymphoma, favour", "Hodgkin lymphoma, favour"]}, "text": "Excisional biopsy is suggested for definitive classification of the lymphoma."},
    {"id": "ln_granuloma_afb", "label": "Granuloma: mycobacterial culture", "auto": {"field": "benignDx", "is": ["Granulomatous inflammation, non-necrotising", "Granulomatous inflammation, necrotising"]}, "text": "Correlation with mycobacterial culture and clinical findings is advised; stains for acid-fast bacilli and fungi are pending / negative."},
    {"id": "ln_ebus_staging", "label": "Negative node: does not exclude metastasis", "auto": {"field": "category", "is": SYD[1]}, "text": "A negative nodal aspirate does not exclude metastatic disease; correlation with imaging is advised."},
]
ln_example = ex({"specimenName": "station 7", "procedure": "EBUS-TBNA", "smearsAir": "2", "smearsAlc": "2", "rinse": "Blood-stained", "lbc": False, "cytospin": "1", "cellBlock": "1", "adequacy": "Adequate", "inadequacyReason": "Virtually acellular specimen", "category": "L5. Malignant", "malignantDx": "Metastatic adenocarcinoma", "favourPrimary": "Consistent with lung primary", "features": ["Polymorphous lymphoid population", "Anthracotic macrophages", "Bronchial epithelial cells and cartilage", "Cohesive epithelial clusters", "Prominent nucleoli"], "additionalFindings": "", "ancillary": "Immunostaining on the cell block shows the tumour cells to be positive for TTF-1 and CK7 and negative for p40"})

# ---------------------------------------------------------------- cervical
CERV = ["Negative for intraepithelial lesion or malignancy", "Atypical squamous cells of undetermined significance (ASC-US)", "Atypical squamous cells, cannot exclude HSIL (ASC-H)", "Low grade squamous intraepithelial lesion (LSIL)", "High grade squamous intraepithelial lesion (HSIL)", "HSIL with features suspicious for invasion", "Squamous cell carcinoma", "Atypical glandular cells (AGC)", "Atypical glandular cells, favour neoplastic", "Endocervical adenocarcinoma in situ (AIS)", "Adenocarcinoma", "Other malignant neoplasm"]
cervical_fields = [
    sel("preparation", "Preparation", ["Liquid-based cytology", "Conventional smear"], "Liquid-based cytology"),
    txt("specimenName", "Further detail (optional)", "", placeholder="e.g. vault (post hysterectomy)"),
    sel("adequacy", "Adequacy", ["Satisfactory", "Satisfactory, transformation zone component absent", "Satisfactory, partially obscured", "Unsatisfactory"], "Satisfactory", group="Adequacy"),
    sel("obscuringFactor", "Obscured by", ["Inflammation", "Blood", "Inflammation and blood", "Air-drying artefact"], "Inflammation", group="Adequacy", showIf={"field": "adequacy", "is": "Satisfactory, partially obscured"}),
    sel("inadequacyReason", "Reason", ["Scant squamous cellularity", "Obscuring blood", "Obscuring inflammation", "Poor preservation", "Specimen rejected (unlabelled / broken)"], "Scant squamous cellularity", group="Adequacy", showIf={"field": "adequacy", "is": "Unsatisfactory"}),
    sel("interpretation", "Interpretation (Bethesda 2014)", CERV, CERV[0], group="Category"),
    sel("glandularOrigin", "Glandular cell origin", ["Not otherwise specified", "Endocervical", "Endometrial", "Extrauterine"], "Not otherwise specified", group="Category", showIf={"field": "interpretation", "is": [CERV[7], CERV[8], CERV[10]]}),
    multi("features", "Organisms and non-neoplastic findings", ["Trichomonas vaginalis", "Fungal organisms consistent with Candida", "Shift in flora suggestive of bacterial vaginosis", "Actinomyces", "Herpes simplex virus changes", "Reactive changes (inflammation)", "Reactive changes (repair)", "Reactive changes (IUD)", "Atrophy", "Endometrial cells (45 or older)", "Glandular cells post hysterectomy", "Koilocytes"], [], group="Microscopy"),
    sel("hpv", "HPV test", ["Not performed", "Negative for high-risk HPV", "Positive for HPV 16", "Positive for HPV 18", "Positive for other high-risk HPV types", "Positive for HPV 16 and other high-risk types", "Pending"], "Not performed", group="Ancillary"),
    *COMMON_TAIL,
]
cervical_snips = [
    {"id": "cervical_colposcopy", "label": "Colposcopy referral", "auto": {"field": "interpretation", "is": [CERV[2], CERV[4], CERV[5], CERV[6], CERV[7], CERV[8], CERV[9], CERV[10], CERV[11]]}, "text": "Referral for colposcopy is advised."},
    {"id": "cervical_ascus_hpv", "label": "ASC-US: HPV triage", "auto": {"field": "interpretation", "is": CERV[1]}, "text": "Reflex high-risk HPV testing or repeat cytology in 6 to 12 months is advised according to the local screening guideline."},
    {"id": "cervical_tz_absent", "label": "TZ absent: routine recall", "auto": {"field": "adequacy", "is": "Satisfactory, transformation zone component absent"}, "text": "The absence of a transformation zone component does not by itself warrant early repeat; routine recall is suggested."},
    {"id": "cervical_endometrial_cells", "label": "Endometrial cells 45+: correlation", "auto": {"field": "features", "is": "Endometrial cells (45 or older)"}, "text": "Benign-appearing endometrial cells in a woman aged 45 or older; clinical correlation with menstrual history and endometrial sampling as indicated is advised."},
]
cervical_example = ex({"preparation": "Liquid-based cytology", "specimenName": "", "adequacy": "Satisfactory", "obscuringFactor": "Inflammation", "inadequacyReason": "Scant squamous cellularity", "interpretation": CERV[0], "glandularOrigin": "Not otherwise specified", "features": ["Reactive changes (inflammation)"], "hpv": "Negative for high-risk HPV", "additionalFindings": "", "ancillary": ""})

SCHEMAS = [
    base("thyroid_fna", "Thyroid FNA (Bethesda 2023)", "Thyroid · FNA", "Thyroid", 610, ["thyroid fna", "bethesda", "thyroid nodule aspirate"], "aspirate", thyroid_fields, thyroid_snips, thyroid_example),
    base("salivary_fna", "Salivary gland FNA (Milan)", "Salivary gland · FNA", "Salivary gland", 620, ["salivary fna", "milan", "parotid fna", "submandibular fna"], "aspirate", salivary_fields, salivary_snips, salivary_example),
    base("lymph_node_fna", "Lymph node FNA / EBUS-TBNA (Sydney)", "Lymph node · FNA", "Lymph node", 630, ["lymph node fna", "ebus-tbna", "tbna", "eus fna", "sydney system", "mediastinal node"], "aspirate", ln_fields, ln_snips, ln_example),
    base("effusion_cytology", "Effusion cytology (International System)", "Serous fluid · cytology", "Serous fluid", 640, ["pleural fluid", "ascitic fluid", "peritoneal fluid", "pericardial fluid", "washing", "effusion", "tis"], "fluid specimen", effusion_fields, effusion_snips, effusion_example, label="Effusion"),
    base("urine_cytology", "Urine cytology (Paris System 2.0)", "Urine · cytology", "Urine", 650, ["urine", "paris system", "bladder washing", "ureteric washing", "voided urine"], "fluid specimen", urine_fields, urine_snips, urine_example),
    base("cervical_cytology", "Cervical cytology (Bethesda 2014)", "Cervix · cytology", "Cervix", 660, ["pap smear", "cervical smear", "lbc", "thinprep", "cervical cytology", "nilm"], "cervical sample", cervical_fields, cervical_snips, cervical_example, label="Cervical smear"),
]

# cervical_cytology.json is hand-edited since Phase 55 (2026-10-07): per-category description lists, help and
# two reference galleries live only in the JSON. Never regenerate it from here; edit it by exact string replacement.
HAND_EDITED = {"cervical_cytology"}
for s in SCHEMAS:
    if s["id"] in HAND_EDITED:
        print("skipped", s["id"], "(hand-edited since Phase 55)")
        continue
    (ROOT / f"{s['id']}.json").write_text(json.dumps(s, indent=2, ensure_ascii=False) + "\n")
    print("wrote", s["id"], len(s["fields"]), "fields")
