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

# ---------------- layers 1-4, shared with the biopsy template ----------------
# The four QMH layers, the two house microscopy extras and treatment effect live in
# schemas/_cns_layers.json (scripts/build-cns-layers.py) so that generators/cns_biopsy.js
# reports the same tumour with the same fields. Re-run that builder after editing them.
LAYERS = json.load(open('schemas/_cns_layers.json'))['groups']
def use(*names):
    for n in names:
        F.extend(LAYERS[n])

use('layer1', 'layer2', 'layer3', 'features')
f(id='ki67', label='Ki-67 proliferation index (%)', type='number', group='Microscopic findings', default='')
use('ihc')
f(id='histologyNotes', label='Tumour histology (typed; overrides the generated paragraph)', type='textarea', group='Microscopic findings', default='')
use('treatment', 'layer4')

# ---------------- meningioma ----------------
# A meningioma named in Layer 1 is graded on its own criteria, not on the glioma items: the mitotic
# count in 1.6 mm2, the five soft criteria, brain invasion, frank anaplasia, and the TERT / CDKN2A/B
# markers. Without this block the form could name a meningioma and then had nothing to grade it on.
# The same group serves the biopsy template; see scripts/build-cns-layers.py.
MENINGIOMA_GATE = [{'field': 'dxFamily', 'is': 'Mesenchymal tumours involving the CNS'},
                   {'field': 'dxMesenchymal', 'is': 'Meningioma'}]
for item in LAYERS['meningioma']:
    item = dict(item)
    item['showIf'] = {'all': MENINGIOMA_GATE + ([item['showIf']] if 'showIf' in item else [])}
    F.append(item)

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
