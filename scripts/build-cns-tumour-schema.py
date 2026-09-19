import json, collections

F = []
def f(**kw):
    F.append(kw)

CBD = 'Cannot be determined'
NP = 'Not performed'

# ---------------- specimen ----------------
f(id='specimenName', label='Specimen as received', type='text')
f(id='site', label='Tumour site', type='select', group='Specimen and procedure', default='Frontal lobe', options=[
    'Frontal lobe', 'Parietal lobe', 'Temporal lobe', 'Occipital lobe', 'Insula', 'Corpus callosum',
    'Basal ganglia', 'Thalamus', 'Brainstem', 'Cerebellum', 'Cerebellopontine angle', 'Fourth ventricle',
    'Lateral ventricle', 'Third ventricle', 'Pineal region', 'Sellar region', 'Sphenoidal ridge',
    'Spinal cord', 'Cauda equina', 'Other'])
f(id='siteOther', label='Tumour site (specify)', type='text', showIf={'field': 'site', 'is': 'Other'})
f(id='side', label='Side', type='select', group='Specimen and procedure', default='right', options=['', 'right', 'left', 'midline', 'bilateral'])
f(id='procedure', label='Procedure', type='select', group='Specimen and procedure', default='craniotomy and excision', options=[
    'craniotomy and excision', 'craniotomy and debulking', 'awake craniotomy and excision',
    'endoscopic transventricular excision', 'transsphenoidal excision', 'suboccipital craniectomy and excision',
    'laminectomy and excision', 'other'])
f(id='procedureOther', label='Procedure (specify)', type='text', showIf={'field': 'procedure', 'is': 'other'})
f(id='extent', label='Extent of resection as stated by the surgeon', type='select', group='Specimen and procedure', default='Not stated', options=[
    'Not stated', 'Gross total resection', 'Near-total resection', 'Subtotal resection', 'Partial resection / debulking'])
f(id='integrity', label='Specimen integrity', type='select', group='Specimen and procedure', default='Fragmented, received in pieces', options=[
    'Single intact mass', 'Fragmented, received in pieces', 'Multiple separately labelled fragments'])
f(id='specimenDims', label='Aggregate specimen size (mm)', type='text', group='Specimen and procedure', placeholder='45 x 35 x 20')
f(id='grossDetails', label='Further macroscopic detail', type='textarea', group='Specimen and procedure', default='',
  placeholder='Soft grey-tan tumour with areas of haemorrhage and necrosis')
f(id='blockKeyText', label='Block key', type='textarea', group='Specimen and procedure', default='', placeholder='A1-A6 tumour')

# ---------------- layer 1: integrated diagnosis ----------------
G1 = 'Layer 1 - Integrated diagnosis'
FAMILIES = [
    ('Adult-type diffuse gliomas', 'dxAdult', [
        'Astrocytoma, IDH-mutant',
        'Oligodendroglioma, IDH-mutant and 1p/19q-codeleted',
        'Glioblastoma, IDH-wildtype']),
    ('Paediatric-type diffuse low-grade gliomas', 'dxPaedLow', [
        'Diffuse astrocytoma, MYB- or MYBL1-altered',
        'Angiocentric glioma',
        'Polymorphous low-grade neuroepithelial tumour of the young',
        'Diffuse low-grade glioma, MAPK pathway-altered']),
    ('Paediatric-type diffuse high-grade gliomas', 'dxPaedHigh', [
        'Diffuse midline glioma, H3 K27-altered',
        'Diffuse hemispheric glioma, H3 G34-mutant',
        'Diffuse paediatric-type high-grade glioma, H3-wildtype and IDH-wildtype',
        'Infant-type hemispheric glioma']),
    ('Circumscribed astrocytic gliomas', 'dxCircumscribed', [
        'Pilocytic astrocytoma',
        'High-grade astrocytoma with piloid features',
        'Pleomorphic xanthoastrocytoma',
        'Subependymal giant cell astrocytoma',
        'Chordoid glioma',
        'Astroblastoma, MN1-altered']),
    ('Glioneuronal and neuronal tumours', 'dxGlioneuronal', [
        'Ganglioglioma',
        'Gangliocytoma',
        'Desmoplastic infantile ganglioglioma / desmoplastic infantile astrocytoma',
        'Dysembryoplastic neuroepithelial tumour',
        'Diffuse glioneuronal tumour with oligodendroglioma-like features and nuclear clusters',
        'Papillary glioneuronal tumour',
        'Rosette-forming glioneuronal tumour',
        'Myxoid glioneuronal tumour',
        'Diffuse leptomeningeal glioneuronal tumour',
        'Multinodular and vacuolating neuronal tumour',
        'Dysplastic cerebellar gangliocytoma (Lhermitte-Duclos disease)',
        'Central neurocytoma',
        'Extraventricular neurocytoma',
        'Cerebellar liponeurocytoma']),
    ('Ependymal tumours', 'dxEpendymal', [
        'Supratentorial ependymoma',
        'Supratentorial ependymoma, ZFTA fusion-positive',
        'Supratentorial ependymoma, YAP1 fusion-positive',
        'Posterior fossa ependymoma',
        'Posterior fossa ependymoma, group PFA',
        'Posterior fossa ependymoma, group PFB',
        'Spinal ependymoma',
        'Spinal ependymoma, MYCN-amplified',
        'Myxopapillary ependymoma',
        'Subependymoma']),
    ('Choroid plexus tumours', 'dxChoroid', [
        'Choroid plexus papilloma',
        'Atypical choroid plexus papilloma',
        'Choroid plexus carcinoma']),
    ('Medulloblastomas, molecularly defined', 'dxMedMol', [
        'Medulloblastoma, WNT-activated',
        'Medulloblastoma, SHH-activated and TP53-wildtype',
        'Medulloblastoma, SHH-activated and TP53-mutant',
        'Medulloblastoma, non-WNT/non-SHH']),
    ('Medulloblastomas, histologically defined', 'dxMedHist', [
        'Medulloblastoma, classic',
        'Medulloblastoma, desmoplastic/nodular',
        'Medulloblastoma with extensive nodularity',
        'Medulloblastoma, large cell / anaplastic']),
    ('Other CNS embryonal tumours', 'dxEmbryonal', [
        'Atypical teratoid/rhabdoid tumour',
        'Cribriform neuroepithelial tumour',
        'Embryonal tumour with multilayered rosettes',
        'CNS neuroblastoma, FOXR2-activated',
        'CNS tumour with BCOR internal tandem duplication',
        'CNS embryonal tumour']),
    ('Pineal tumours', 'dxPineal', [
        'Pineocytoma',
        'Pineal parenchymal tumour of intermediate differentiation',
        'Pineoblastoma',
        'Papillary tumour of the pineal region',
        'Desmoplastic myxoid tumour of the pineal region, SMARCB1-mutant']),
    ('Cranial and paraspinal nerve tumours', 'dxNerve', [
        'Schwannoma',
        'Neurofibroma',
        'Perineurioma',
        'Hybrid nerve sheath tumour',
        'Malignant melanotic nerve sheath tumour',
        'Malignant peripheral nerve sheath tumour',
        'Paraganglioma of the cauda equina']),
    ('Mesenchymal tumours involving the CNS', 'dxMesenchymal', [
        'Solitary fibrous tumour',
        'Meningioma',
        'Haemangioblastoma',
        'Haemangioma / vascular malformation',
        'Chordoma',
        'Chondrosarcoma',
        'Osteosarcoma',
        'Ewing sarcoma',
        'Intracranial mesenchymal tumour, FET-CREB fusion-positive',
        'CIC-rearranged sarcoma',
        'Primary intracranial sarcoma, DICER1-mutant',
        'Other mesenchymal tumour']),
    ('Melanocytic tumours', 'dxMelanocytic', [
        'Meningeal melanocytosis',
        'Meningeal melanocytoma',
        'Meningeal melanoma',
        'Meningeal melanomatosis']),
    ('Haematolymphoid tumours involving the CNS', 'dxHaem', [
        'Primary diffuse large B-cell lymphoma of the CNS',
        'Immunodeficiency-associated CNS lymphoma',
        'Lymphomatoid granulomatosis',
        'Intravascular large B-cell lymphoma',
        'MALT lymphoma of the dura',
        'Other low-grade B-cell lymphoma of the CNS',
        'Anaplastic large cell lymphoma',
        'T-cell and NK/T-cell lymphoma',
        'Erdheim-Chester disease',
        'Rosai-Dorfman disease',
        'Juvenile xanthogranuloma',
        'Langerhans cell histiocytosis',
        'Histiocytic sarcoma']),
    ('Germ cell tumours', 'dxGerm', [
        'Germinoma',
        'Embryonal carcinoma',
        'Yolk sac tumour',
        'Choriocarcinoma',
        'Teratoma, mature',
        'Teratoma, immature',
        'Teratoma with somatic-type malignancy',
        'Mixed germ cell tumour']),
    ('Tumours of the sellar region', 'dxSellar', [
        'Adamantinomatous craniopharyngioma',
        'Papillary craniopharyngioma',
        'Pituicytoma',
        'Granular cell tumour of the sellar region',
        'Spindle cell oncocytoma',
        'Pituitary neuroendocrine tumour (PitNET)',
        'Pituitary blastoma']),
    ('Metastatic tumour', 'dxMetastatic', [
        'Metastatic carcinoma',
        'Metastatic melanoma',
        'Metastatic sarcoma',
        'Metastatic tumour, type as specified']),
]
f(id='dxFamily', label='Tumour family', type='select', group=G1, default='Adult-type diffuse gliomas',
  options=[name for name, _, _ in FAMILIES] + ['Other / not listed'])
for name, fid, ents in FAMILIES:
    f(id=fid, label='Entity', type='select', group=G1, default=ents[0],
      showIf={'field': 'dxFamily', 'is': name},
      options=ents + ['Other entity in this family (specify)'])
f(id='dxOther', label='Integrated diagnosis (specify)', type='text', group=G1, default='',
  help='Used when the entity is not on the family list, or when the family is "Other / not listed".')
f(id='dxQualifier', label='Diagnostic qualifier', type='select', group=G1, default='', options=[
    '', 'NOS (not otherwise specified)', 'NEC (not elsewhere classified)', CBD, 'Pending further studies'])
f(id='dxQualifierDetail', label='Qualifier (specify)', type='text', group=G1, default='',
  showIf={'field': 'dxQualifier', 'is': [CBD, 'Pending further studies']})

# ---------------- layer 2: histopathological classification ----------------
G2 = 'Layer 2 - Histopathological classification'
f(id='histClass', label='Histopathological classification', type='select', group=G2, default='Glioblastoma', options=[
    '', 'Diffuse astrocytoma', 'Gemistocytic astrocytoma', 'Anaplastic astrocytoma', 'Glioblastoma',
    'Giant cell glioblastoma', 'Gliosarcoma', 'Epithelioid glioblastoma', 'Oligodendroglioma',
    'Anaplastic oligodendroglioma', 'Oligoastrocytoma', 'Anaplastic oligoastrocytoma',
    'Pilocytic astrocytoma', 'Pilomyxoid astrocytoma', 'Pleomorphic xanthoastrocytoma',
    'Anaplastic pleomorphic xanthoastrocytoma', 'Ependymoma', 'Papillary ependymoma', 'Clear cell ependymoma',
    'Tanycytic ependymoma', 'Anaplastic ependymoma', 'Not applicable', 'Other (specify)'])
f(id='histClassOther', label='Histopathological classification (specify)', type='text', group=G2, default='',
  showIf={'field': 'histClass', 'is': 'Other (specify)'})

# ---------------- layer 3: CNS WHO grade ----------------
G3 = 'Layer 3 - CNS WHO grade'
f(id='grade', label='CNS WHO grade', type='select', group=G3, default='From the findings', options=[
    'From the findings', 'CNS WHO grade 1', 'CNS WHO grade 2', 'CNS WHO grade 3', 'CNS WHO grade 4',
    'Pending', 'Not applicable', CBD, 'Other (specify)'])
f(id='gradeOther', label='CNS WHO grade (specify)', type='text', group=G3, default='',
  showIf={'field': 'grade', 'is': ['Other (specify)', CBD]})

# ---------------- microscopic findings ----------------
GM = 'Microscopic findings'
f(id='features', label='Histological features', type='multiselect', group=GM, default=[
    'Increased cellularity', 'Nuclear atypia', 'Mitoses', 'Microvascular proliferation', 'Necrosis with pseudopalisading'], options=[
    'Increased cellularity', 'Nuclear atypia', 'Mitoses', 'Microvascular proliferation',
    'Necrosis with pseudopalisading', 'Necrosis without pseudopalisading',
    'Rounded nuclei with perinuclear haloes', 'Delicate branching capillary network', 'Microcalcification',
    'Perivascular pseudorosettes', 'True ependymal rosettes', 'Biphasic pattern with Rosenthal fibres',
    'Eosinophilic granular bodies', 'Gemistocytic change', 'Multinucleated giant cells',
    'Sarcomatous spindle cell component', 'Infiltration of adjacent cortex', 'Secondary structures of Scherer'])
f(id='mitoses', label='Mitoses (per 10 high-power fields)', type='number', group=GM, default='')
f(id='ki67', label='Ki-67 proliferation index (%)', type='number', group=GM, default='')
f(id='ihc', label='Immunohistochemistry', type='multiselect', group=GM, default=['GFAP positive', 'OLIG2 positive'], options=[
    'GFAP positive', 'GFAP negative', 'OLIG2 positive', 'OLIG2 negative', 'SOX10 positive',
    'Synaptophysin positive', 'Synaptophysin negative', 'NeuN positive', 'EMA positive with dot-like staining',
    'S100 positive', 'CD34 positive', 'INI1 retained', 'INI1 lost', 'Neurofilament highlights entrapped axons',
    'CD20 positive', 'CD3 positive', 'Pan-cytokeratin positive', 'TTF-1 positive', 'Melan-A positive'])
f(id='ihcOther', label='Further immunohistochemistry', type='text', group=GM, default='',
  placeholder='H3 K27M positive; L1CAM positive')
f(id='histologyNotes', label='Tumour histology (typed; overrides the generated paragraph)', type='textarea', group=GM, default='')
f(id='treatmentEffect', label='Treatment effect', type='select', group=GM, default='No known presurgical therapy', options=[
    'No known presurgical therapy', 'Not identified', 'Present', CBD])
f(id='necroticPct', label='Necrotic tumour (%)', type='number', group=GM, default='',
  showIf={'field': 'treatmentEffect', 'is': 'Present'})
f(id='treatmentDetail', label='Treatment effect (specify)', type='text', group=GM, default='',
  showIf={'field': 'treatmentEffect', 'is': ['Present', CBD]})

# ---------------- layer 4: molecular information ----------------
G4 = 'Layer 4 - Molecular information'
f(id='molStatus', label='Molecular studies', type='select', group=G4, default='Reported', options=[
    'Reported', 'Sent, result pending', 'Not performed'])
f(id='idhBranch', label='IDH status', type='select', group=G4, default='IDH-wildtype', options=[
    'IDH-mutant', 'IDH-wildtype', 'Not applicable'], showIf={'field': 'molStatus', 'is': 'Reported'})
POSNEG = [NP, 'Negative', 'Positive', CBD]
f(id='idh1R132H', label='IDH1 R132H (immunohistochemistry)', type='select', group=G4, default='Negative',
  options=POSNEG, showIf={'field': 'molStatus', 'is': 'Reported'})
f(id='idhSeq', label='IDH1 / IDH2 sequencing', type='select', group=G4, default=NP,
  options=[NP, 'No mutation detected', 'Mutation detected (specify)', CBD], showIf={'field': 'molStatus', 'is': 'Reported'})
f(id='idhSeqDetail', label='IDH mutation (specify)', type='text', group=G4, default='',
  placeholder='IDH1 p.R132C', showIf={'field': 'idhSeq', 'is': 'Mutation detected (specify)'})
# IDH-mutant branch
MUT = {'field': 'idhBranch', 'is': 'IDH-mutant'}
f(id='atrx', label='ATRX (immunohistochemistry)', type='select', group=G4, default=NP,
  options=[NP, 'Intact nuclear expression', 'Loss of nuclear expression', CBD], showIf=MUT)
f(id='p53', label='p53 (immunohistochemistry)', type='select', group=G4, default=NP, options=[
    NP, 'Normal (wild-type pattern)', 'Abnormal (mutated pattern)', 'Abnormal, overexpression in over 90% of nuclei',
    'Abnormal, null pattern', 'Abnormal, cytoplasmic staining only', CBD], showIf=MUT)
f(id='codel', label='1p/19q (FISH)', type='select', group=G4, default=NP, options=[
    NP, 'No deletion detected', '1p/19q codeletion detected', '1p deletion only', '19q deletion only',
    'Polysomy (specify)', 'Other (specify)', CBD], showIf=MUT)
f(id='codelDetail', label='1p/19q (specify)', type='text', group=G4, default='',
  showIf={'field': 'codel', 'is': ['Polysomy (specify)', 'Other (specify)']})
f(id='cdkn2a', label='CDKN2A / CDKN2B (FISH or copy number)', type='select', group=G4, default=NP,
  options=[NP, 'No homozygous deletion detected', 'Homozygous deletion detected', 'Hemizygous loss detected', CBD], showIf=MUT)
# IDH-wildtype branch
WT = {'field': 'idhBranch', 'is': 'IDH-wildtype'}
f(id='h3k27me3', label='H3 trimethylated K27 (immunohistochemistry)', type='select', group=G4, default=NP,
  options=[NP, 'Retained nuclear expression', 'Loss of nuclear expression', CBD], showIf=WT)
f(id='h3g34w', label='H3 G34W (immunohistochemistry)', type='select', group=G4, default=NP, options=POSNEG, showIf=WT)
f(id='h3seq', label='H3 mutation (sequencing)', type='select', group=G4, default=NP, options=[
    NP, 'No mutation detected', 'H3 K27M detected', 'H3 G34R/V detected', 'Other mutation (specify)', CBD], showIf=WT)
f(id='h3seqDetail', label='H3 mutation (specify)', type='text', group=G4, default='',
  showIf={'field': 'h3seq', 'is': 'Other mutation (specify)'})
f(id='braf', label='BRAF V600E', type='select', group=G4, default=NP,
  options=[NP, 'Not detected', 'Detected', CBD], showIf=WT)
f(id='chr710', label='Chromosome 7 / 10 (FISH)', type='select', group=G4, default=NP, options=[
    NP, 'No change detected', 'Combined gain of chromosome 7 and loss of chromosome 10', 'Gain of chromosome 7 only',
    'Loss of chromosome 10 only', CBD], showIf=WT)
f(id='egfr', label='EGFR amplification', type='select', group=G4, default=NP,
  options=[NP, 'Not amplified', 'Amplified', CBD], showIf=WT)
# both branches
f(id='tert', label='TERT promoter', type='select', group=G4, default=NP,
  options=[NP, 'No mutation detected', 'Mutation detected (specify)', CBD], showIf={'field': 'molStatus', 'is': 'Reported'})
f(id='tertDetail', label='TERT promoter mutation (specify)', type='text', group=G4, default='', placeholder='C228T',
  showIf={'field': 'tert', 'is': 'Mutation detected (specify)'})
f(id='molOthers', label='Other molecular studies', type='text', group=G4, default='',
  placeholder='MGMT promoter methylated', showIf={'field': 'molStatus', 'is': 'Reported'})

# ---------------- additional findings ----------------
GA = 'Additional findings'
f(id='additionalFindings', label='Additional findings', type='multiselect', group=GA, default=[], options=[
    'Adjacent brain parenchyma with reactive gliosis', 'Infiltration of the overlying cortex',
    'Leptomeningeal involvement by tumour', 'Dura involved by tumour', 'Bone involved by tumour',
    'Previous surgical site changes', 'Radiation-induced vascular change', 'Other (specify)'])
f(id='additionalDetail', label='Additional findings (specify)', type='text', group=GA, default='',
  showIf={'field': 'additionalFindings', 'is': 'Other (specify)'})
f(id='additionalNotes', label='Additional notes', type='textarea', group=GA, default='')

schema = collections.OrderedDict()
schema['id'] = 'cns_tumour'
schema['version'] = '2026.09'
schema['name'] = 'Gliomas and ependymomas (WHO CNS5) resection'
schema['shortName'] = 'Brain · cancer resection'
schema['label'] = 'Glioma'
schema['organ'] = 'BRAIN'
schema['system'] = 'CNS'
schema['kind'] = 'cancer resection'
schema['layout'] = {'macroGroups': ['Specimen and procedure'], 'macroFields': ['specimenName'], 'pack': True}
schema['rank'] = 61
schema['aliases'] = ['glioma resection', 'glioblastoma', 'GBM', 'astrocytoma', 'oligodendroglioma', 'ependymoma',
                     'craniotomy', 'debulking', 'IDH', 'CNS WHO', 'integrated diagnosis', 'medulloblastoma']
schema['match'] = {
    'site': ['brain', 'cerebral', 'cerebellum', 'frontal lobe', 'parietal lobe', 'temporal lobe', 'occipital lobe',
             'thalamus', 'brainstem', 'fourth ventricle', 'lateral ventricle', 'pineal', 'spinal cord', 'cauda equina'],
    'procedure': ['craniotomy', 'excision', 'resection', 'debulking', 'craniectomy', 'laminectomy'],
    'clinical': ['glioma', 'glioblastoma', 'astrocytoma', 'oligodendroglioma', 'ependymoma', 'medulloblastoma',
                 'brain tumour resection'],
    'fill': [{'field': 'specimenName', 'from': 'detail'}, {'field': 'procedure', 'from': 'options'},
             {'field': 'site', 'from': 'options'}]
}
schema['macroExtract'] = {
    'specimenDims': {'concept': 'specimenDims', 'unit': 'mm', 'label': True},
    'blockKeyText': {'concept': 'blockKey'}
}
schema['specimenNoun'] = 'resection'
schema['maxParts'] = 6
schema['defaultParts'] = 1
schema['generator'] = 'cns_tumour'
schema['style'] = {'british': True}
schema['source'] = {
    'template': 'QMH Cancer Reporting Template - CNS (Common gliomas and ependymomas)',
    'url': 'https://awiloqmh.github.io/CancerReportingTemplate/CNS-Common_gliomas_and_ependymomas.html',
    'name': 'WHO Classification of Tumours of the Central Nervous System, 5th edition (2021); CAP Tumors of the Brain and Spinal Cord 1.0.0.1',
    'staging': 'None. CNS tumours are not staged by AJCC; the CNS WHO grade carries the prognostic weight and prints in Layer 3.',
    'grading': 'CNS WHO grade, proposed from the entity and the recorded morphology and molecular results, and overridable in Layer 3.'
}
schema['caseFields'] = [{'id': 'imaging', 'label': 'Imaging / clinical', 'placeholder': 'Right frontal ring-enhancing mass', 'help': 'Optional; not printed.'}]
schema['options'] = [
    {'$use': 'includeHeader', 'label': 'Section headers (SPECIMEN / MICROSCOPIC EXAMINATION AND SYNOPTIC REPORT / DIAGNOSIS)'},
    {'id': 'macro', 'label': 'Generate the macroscopic description and block key', 'type': 'checkbox', 'default': True}
]
schema['partDefaults'] = []
schema['fields'] = F
schema['snippets'] = [
    {'id': 'cns_tumour_pending', 'label': 'Integrated diagnosis to follow', 'auto': {'flag': 'molecularPending'},
     'text': 'Molecular studies have been requested; the integrated diagnosis and CNS WHO grade will be issued in a supplementary report.'},
    {'id': 'cns_tumour_mgmt', 'label': 'MGMT testing', 'auto': {'flag': 'highGradeGlioma'},
     'text': 'MGMT promoter methylation testing has been requested; the result will be issued in a supplementary report.'},
    {'id': 'cns_tumour_mdt', 'label': 'Neuro-oncology meeting', 'auto': {'flag': 'highGradeGlioma'},
     'text': 'The case has been referred to the neuro-oncology multidisciplinary meeting.'}
]
schema['example'] = {
    'caseTitle': '',
    'options': {'includeHeader': False, 'macro': True},
    'parts': [{'label': 'A', 'values': {}}]
}
vals = {}
for fl in F:
    d = fl.get('default')
    vals[fl['id']] = d if d is not None else ''
vals.update({
    'specimenName': 'Brain, right frontal tumour',
    'specimenDims': '45 x 35 x 20',
    'grossDetails': 'The cut surface is soft and grey-tan with areas of haemorrhage and yellow necrosis',
    'blockKeyText': 'A1-A6 tumour',
    'dxFamily': 'Adult-type diffuse gliomas',
    'dxAdult': 'Glioblastoma, IDH-wildtype',
    'histClass': 'Glioblastoma',
    'mitoses': '9',
    'ki67': '25',
    'idhBranch': 'IDH-wildtype',
    'idh1R132H': 'Negative',
    'tert': 'Mutation detected (specify)',
    'tertDetail': 'C228T',
    'chr710': 'Combined gain of chromosome 7 and loss of chromosome 10',
    'egfr': 'Amplified',
    'h3k27me3': 'Retained nuclear expression'
})
schema['example']['parts'][0]['values'] = vals

with open('schemas/cns_tumour.json', 'w') as fh:
    json.dump(schema, fh, indent=1, ensure_ascii=False)
    fh.write('\n')
print('fields', len(F))
