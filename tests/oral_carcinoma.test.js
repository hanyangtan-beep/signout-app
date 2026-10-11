// Oral cavity and oropharynx carcinoma resection (synoptic; AJCC 8th oral cavity, AJCC 9th
// HPV-associated oropharynx, no pTNM for a p16-negative oropharynx) - generator, staging
// boundaries, checks, intake and golden fixtures.
// Fixtures: tests/fixtures/oral_carcinoma/*.json (golden; --update only after a deliberate change).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createCase, generate } from '../src/engine.js';
import { loadAll, loadManifest } from '../src/registry.js';
import { parseSynoptic } from '../src/synoptic.js';
import { parseIntake, matchParts, presetValues } from '../src/intake.js';
import * as S from '../src/staging/oral.js';
import * as G from '../generators/oral_carcinoma.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(here, 'fixtures', 'oral_carcinoma');
const UPDATE = process.argv.includes('--update');
const registry = await loadAll();
const manifest = await loadManifest();
const t = registry.oral_carcinoma;
const { schema, generator } = t;
const EX = schema.example.parts[0].values;
const defaults = (s) => Object.fromEntries(s.fields.filter((f) => f.default !== undefined).map((f) => [f.id, f.default]));
const fieldOf = (id) => schema.fields.find((f) => f.id === id);

function run(patch = {}, options = {}) {
  const values = { ...defaults(schema), ...EX, ...patch };
  const cs = { schemaId: 'oral_carcinoma', caseTitle: '', options: { ...schema.example.options, ...options }, parts: [{ label: 'A', templateId: 'oral_carcinoma', values }] };
  return generate(schema, generator, cs);
}
const rows = (out) => Object.fromEntries(parseSynoptic(out.synoptic).filter((r) => r.label).map((r) => [r.label, r.value]));
const sections = (out) => [...new Set(parseSynoptic(out.synoptic).map((r) => r.section))];
const flat = (s) => String(s || '').replace(/\s+/g, ' ');
const flatDx = (out) => flat(out.diagnosis);
const msgs = (out, level) => out.issues.filter((i) => i.level === level).map((i) => i.message);
const tnm = (out) => rows(out)['pTNM'];

const IPSI = 'Ipsilateral (including midline)';
const ENE_MAJOR = 'Present, major (more than 2 mm from the capsule)';
// A p16-positive tonsil on a transoral resection: the AJCC 9th HPV-associated chapter.
const TONSIL = {
  specimenName: 'left tonsil', procedure: ['Transoral resection'], tumourSite: 'Palatine tonsil', laterality: 'Left',
  specimenDims: '40 x 30 x 20', lesionDims: '28 x 20 x 12', orientation: '', tumourSizeMm: '28', doiMm: '',
  histType: 'Squamous cell carcinoma, non-keratinising, HPV-associated', grade: '', p16: 'Positive', hgdMargin: ''
};
// Oral nodes: examined, involved, laterality, ENE and the largest deposit.
const oralNodes = (involved, side, ene, deposit, examined = '30') => ({
  procedure: ['Partial glossectomy', 'Neck dissection'], nodesExamined: examined, nodesInvolved: String(involved),
  nodeLaterality: side, ene, largestDepositMm: deposit, largestDepositSite: 'level II'
});
const hpvNodes = (involved, ene, examined = '20') => ({
  ...TONSIL, procedure: ['Transoral resection', 'Neck dissection'], nodesExamined: examined, nodesInvolved: String(involved),
  nodeLaterality: IPSI, ene, largestDepositMm: '20', largestDepositSite: 'level IIA'
});

const CASES = [
  // Card accept: the example, a left lateral tongue partial glossectomy, 18 mm, DOI 8 mm: pT2.
  ['oral-carcinoma-01-tongue-pt2', {}],
  // Card accept: a lower alveolus SCC on a segmental mandibulectomy with medullary bone invasion and
  // a neck dissection, one ipsilateral level IB node 22 mm with major ENE: pT4a pN2a.
  ['oral-carcinoma-02-mandible-pt4a-pn2a', {
    specimenName: 'right mandible', procedure: ['Segmental mandibulectomy', 'Neck dissection'], tumourSite: 'Lower alveolus and gingiva',
    laterality: 'Right', specimenDims: '80 x 45 x 35', lesionDims: '35 x 25 x 12', tumourSizeMm: '35', macroMarginMm: '8', macroMarginSite: 'posterior soft tissue',
    orientation: 'suture at the anterior bone cut', decalcified: true, blocks: '16', doiMm: '12',
    boneInvasion: 'Present', bonePattern: 'Infiltrative', boneLevel: 'Medullary (through the cortex)', pni: 'Present, extratumoural',
    closestMm: '8', closestSite: 'posterior soft tissue',
    nodesExamined: '28', nodesInvolved: '1', nodeLaterality: IPSI, ene: ENE_MAJOR, eneMm: '3',
    largestDepositMm: '22', largestDepositSite: 'level IB', nodeLevels: 'level IB 1/4, level IIA 0/6, level III 0/9, level IV 0/9'
  }],
  // Card accept: a p16-positive, HPV PCR-positive left tonsil SCC, 28 mm, two ipsilateral nodes
  // without ENE: pT2 pN1b (AJCC 9th).
  ['oral-carcinoma-03-tonsil-hpv-pt2-pn1b', {
    ...TONSIL, procedure: ['Transoral resection', 'Neck dissection'], hpvPcr: 'Positive', hpvPcrDetail: 'HPV 16',
    nodesExamined: '32', nodesInvolved: '2', nodeLaterality: IPSI, ene: 'Not identified', largestDepositMm: '25', largestDepositSite: 'level IIA'
  }],
  // A p16-negative tonsil SCC: no pTNM prints, and the check names the HPV-independent protocol.
  ['oral-carcinoma-04-tonsil-p16-negative', {
    ...TONSIL, specimenName: 'right tonsil', procedure: ['Tonsillectomy'], laterality: 'Right', tumourSizeMm: '15', lesionDims: '15 x 12 x 8',
    histType: 'Squamous cell carcinoma, conventional (keratinising)', grade: 'G2, moderately differentiated', p16: 'Negative'
  }]
];

// ---------- registration and schema ----------

test('template is registered with the required metadata', () => {
  assert.ok(t, 'registry has oral_carcinoma');
  assert.equal(schema.system, 'Head and neck');
  assert.equal(schema.kind, 'cancer resection');
  assert.equal(schema.label, 'Oral cavity Ca');
  assert.ok(schema.shortName.includes('·'), 'shortName is "Organ · procedure"');
  assert.ok(manifest.some((m) => m.id === 'oral_carcinoma'), 'in the manifest');
});

test('schema option lists are the generator and staging lists', () => {
  assert.deepEqual(fieldOf('tumourSite').options, S.SITE_OPTIONS);
  assert.deepEqual(fieldOf('siteRegion').options, S.REGION_OPTIONS);
  assert.deepEqual(fieldOf('doi').options, S.DOI_OPTIONS);
  assert.deepEqual(fieldOf('adjacent').options, S.ORAL_ADJACENT);
  assert.deepEqual(fieldOf('hpvExtent').options, S.HPV_EXTENT);
  assert.deepEqual(fieldOf('boneInvasion').options, Object.values(S.BONE));
  assert.deepEqual(fieldOf('boneLevel').options, Object.values(S.BONE_LEVEL));
  assert.deepEqual(fieldOf('p16').options, Object.values(S.P16));
  assert.deepEqual(fieldOf('nodeLaterality').options, Object.values(S.NODE_LATERALITY));
  assert.deepEqual(fieldOf('histType').options, [...G.ORAL_TYPES, ...G.HPV_TYPES, ...G.NE_TYPES, ...G.OTHER_TYPES]);
  assert.deepEqual(fieldOf('procedure').options, G.PROCEDURES);
  assert.deepEqual(fieldOf('ene').options, G.ENE);
  assert.deepEqual(fieldOf('pni').options, G.PNI);
  assert.deepEqual(fieldOf('invasiveMargin').options, G.MARGIN_INV);
  assert.deepEqual(fieldOf('hgdMargin').options, G.MARGIN_HGD);
  assert.deepEqual(fieldOf('ihc').options, Object.keys(G.IHC_PHRASE));
  for (const type of fieldOf('histType').options) {
    // No morphology sentence for a type the pathologist has not named.
    if (G.OTHER_TYPES.includes(type) || /^Combined|cannot be determined/.test(type)) continue;
    const para = rows(run({ histType: type, grade: G.UNGRADED.includes(type) ? '' : 'G2, moderately differentiated' }))['Tumour histology'];
    assert.ok(para && para.split('. ').length >= 2, `${type} has a morphology sentence`);
  }
});

test('the example case renders every expected block', () => {
  const c = { ...JSON.parse(JSON.stringify(schema.example)), schemaId: schema.id };
  c.options = { ...c.options, includeHeader: true };
  const r = generate(schema, generator, c);
  assert.match(r.report, /SPECIMENS?:/);
  assert.match(r.report, /SYNOPTIC REPORT:/);
  assert.match(r.report, /DIAGNOSIS:/);
  assert.match(r.report, /MACROSCOPIC DESCRIPTION:/);
});

test('a multi-part case letters its specimens', () => {
  const r = generate(schema, generator, createCase(schema, 2));
  assert.match(r.specimens, /\(A\)/);
  assert.match(r.specimens, /\(B\)/);
});

// ---------- the example ----------

test('example: specimen, macroscopy, rows and diagnosis', () => {
  const c = run();
  assert.equal(c.specimens, 'Oral cavity, left lateral tongue, partial glossectomy');
  assert.equal(flat(c.macro), 'Received in formalin is a partial glossectomy specimen measuring 45 x 30 x 20 mm. The specimen is orientated: long suture lateral, short suture anterior. There is an ulcerated tumour in the left lateral tongue measuring 18 x 12 x 8 mm, 6 mm from the closest (deep) margin. The margins are inked. Representative sections are taken in 8 blocks.');
  const r = rows(c);
  assert.equal(r['Procedure'], 'Partial glossectomy');
  assert.equal(r['Tumour site'], 'Tongue (anterior two thirds), left');
  assert.equal(r['Tumour size'], '18 mm (greatest dimension)');
  assert.equal(r['Histologic type'], 'Squamous cell carcinoma, conventional (keratinising)');
  assert.equal(r['Histologic grade'], 'G2, moderately differentiated');
  assert.equal(r['Tumour histology'], 'The tumour is a moderately differentiated keratinising squamous cell carcinoma, invading to a depth of 8 mm. Infiltrating nests and cords of atypical squamous cells show intercellular bridges and focal keratinisation, with moderate nuclear pleomorphism, in a desmoplastic stroma.');
  assert.equal(r['Depth of invasion'], '8 mm');
  assert.equal(r['Tumour extent'], 'No extension beyond the primary site');
  assert.equal(r['Lymphovascular invasion'], 'Not identified');
  assert.equal(r['Perineural invasion'], 'Not identified');
  assert.equal(r['Invasive tumour'], 'All margins negative');
  assert.equal(r['Closest margin'], '6 mm (deep)');
  assert.equal(r['High grade dysplasia / carcinoma in situ'], 'Margins uninvolved');
  assert.equal(r['pTNM'], 'pT2');
  assert.ok(sections(c).includes('Pathological stage (AJCC 8th edition)'));
  assert.equal(flatDx(c), 'ORAL CAVITY, left lateral tongue, partial glossectomy - SQUAMOUS CELL CARCINOMA, moderately differentiated, 18 mm, invading to a depth of 8 mm; completely excised (closest margin 6 mm, deep); see synoptic report - pT2 (AJCC 8th edition)');
  assert.equal(run({}, { printPTNM: false }).synoptic.includes('pTNM'), false, 'printPTNM off drops the stage block');
});

// ---------- element order against the saved QMH pages ----------

// The output labels of a saved QMH page in its updateDescription() order, read by tools/import-qmh.js.
function qmhLabels(page) {
  const tool = fileURLToPath(new URL('../tools/import-qmh.js', import.meta.url));
  const file = fileURLToPath(new URL(`../docs/reference/${page}`, import.meta.url));
  const draft = JSON.parse(execFileSync(process.execPath, [tool, file], { encoding: 'utf8' }));
  return draft.fields.map((f) => f.outLabel).filter(Boolean).map((l) => l.replace(/\s+/g, ' ').trim());
}

// Each pair is [our synoptic label, the QMH output label it answers]. Rows the pages do not print
// (procedure, site, size, bone invasion, the frozen margins, nodes by level) are not in the lists;
// "Tumour histology" after the grade is the house exception every synoptic template uses. The page
// prints its distant metastasis sites after the nodes and before the pTNM block, as we do.
function assertPageOrder(out, page, pairs) {
  const qmh = qmhLabels(page);
  const labels = parseSynoptic(out.synoptic).map((r) => r.label).filter(Boolean);
  let ours = -1;
  let theirs = -1;
  for (const [label, qmhLabel] of pairs) {
    const i = labels.indexOf(label);
    const j = qmh.findIndex((l) => l.startsWith(qmhLabel));
    assert.ok(i >= 0, `${label} missing: ${labels}`);
    assert.ok(j >= 0, `${qmhLabel} not on ${page}`);
    assert.ok(i > ours, `${label} out of order`);
    assert.ok(j > theirs, `${qmhLabel} out of order on ${page}`);
    ours = i;
    theirs = j;
  }
  const at = (l) => labels.indexOf(l);
  assert.ok(at('Laterality') < at('Distant metastasis') && at('Distant metastasis') < at('pTNM'), 'distant metastasis between the nodes and pTNM');
}

const NODES = { ene: ENE_MAJOR, eneMm: '3', largestDepositMm: '22', largestDepositSite: 'level IB', largestNodeMm: '25', largestNodeSite: 'level IB', nodeLaterality: IPSI };
const TAIL = { bedMargin: 'Uninvolved by invasive carcinoma', distantMets: ['Not identified'], additionalNotes: 'Sections of the tonsillar bed are included.' };

test('synoptic element order follows the saved QMH pages', () => {
  const oral = run({ ...CASES[1][1], ...NODES, ...TAIL, wpoi: 'WPOI 1 to 4', lvi: 'Present' }, { printNodesMets: true });
  assertPageOrder(oral, 'HN-Lip-and-oral-cavity.html', [
    ['Histologic type', 'Histologic type (WHO 5e)'], ['Histologic grade', 'Histologic grade'], ['Depth of invasion', 'Depth of Invasion (DOI'],
    ['Tumour extent', 'Tumor extension'], ['Lymphovascular invasion', 'Lymphovascular invasion'], ['Perineural invasion', 'Perineural invasion'],
    ['Worst pattern of invasion', 'Worst pattern of invasion (WPOI)'], ['Invasive tumour', 'Surgical margins'], ['Tumour bed margins', 'Tumor bed margins'],
    ['Regional lymph nodes', 'Number of regional lymph nodes examined'], ['Extranodal extension', 'Extranodal extension (ENE)'],
    ['Size of largest metastatic deposit', 'Size of largest metastatic deposit'], ['Size of largest involved lymph node', 'Size of largest lymph node involved'],
    ['Laterality', 'Laterality'], ['pTNM', 'Primary tumor (pT)'], ['Additional notes', 'Additional notes']
  ]);
  const hpv = run({ ...CASES[2][1], ...NODES, ...TAIL, ene: 'Not identified', eneMm: '' }, { printNodesMets: true });
  assertPageOrder(hpv, 'HN-HPV-Oropharynx.html', [
    ['Histologic type', 'Histologic type (WHO 5e)'], ['Tumour extent', 'Tumor extent'], ['Lymphovascular invasion', 'Lymphatic and/on vascular invasion'],
    ['Perineural invasion', 'Perineural invasion'], ['HPV status by p16 immunohistochemistry', 'HPV status by p16 IHC'], ['HPV PCR', 'HPV by PCR'],
    ['Invasive tumour', 'Margin Status for Invasive Tumor'], ['Tumour bed margins', 'Tumor bed margin'],
    ['Regional lymph nodes', 'Number of regional lymph nodes examined'], ['Extranodal extension', 'Extranodal extension (ENE)'],
    ['Size of largest metastatic deposit', 'Size of largest metastatic deposit'], ['Size of largest involved lymph node', 'Size of largest lymph node involved'],
    ['Laterality', 'Laterality'], ['pTNM', 'Primary tumor (pT)'], ['Additional notes', 'Additional notes']
  ]);
  assert.deepEqual(sections(oral), ['Specimen and tumour', 'Microscopic findings', 'Margins', 'Lymph nodes', 'Distant metastasis', 'Pathological stage (AJCC 8th edition)', 'Additional findings']);
  assert.deepEqual(sections(hpv), ['Specimen and tumour', 'Microscopic findings', 'Margins', 'Lymph nodes', 'Distant metastasis', 'Pathological stage (AJCC 9th edition)', 'Additional findings']);
});

// ---------- oral cavity pT (AJCC 8th, CAP 4.3.0.0) ----------

test('oral pT: size and depth of invasion at every boundary', () => {
  const T = (size, doi) => tnm(run({ tumourSizeMm: String(size), doiMm: String(doi) })).split(' ')[0];
  // pT1 <= 2 cm and DOI <= 5 mm; pT2 <= 2 cm with DOI > 5 mm, or > 2 to 4 cm with DOI <= 10 mm;
  // pT3 > 2 to 4 cm with DOI > 10 mm, or > 4 cm with DOI <= 10 mm; pT4a > 4 cm with DOI > 10 mm.
  assert.equal(T(20, 5), 'pT1');
  assert.equal(T(20, 5.1), 'pT2');
  assert.equal(T(15, 12), 'pT2', 'a small tumour stays pT2 however deep');
  assert.equal(T(21, 10), 'pT2');
  assert.equal(T(21, 10.1), 'pT3');
  assert.equal(T(40, 10.1), 'pT3');
  assert.equal(T(41, 10), 'pT3');
  assert.equal(T(41, 10.1), 'pT4a');
  assert.equal(tnm(run({ tumourSizeMm: '15', doi: 'Less than 1 mm', doiMm: '' })), 'pT1');
});

test('oral pT: an "at least" depth stages only when no deeper reading could change it', () => {
  const floor7 = run({ tumourSizeMm: '30', doi: 'At least (mm)', doiMm: '7' });
  assert.equal(tnm(floor7), 'pTX');
  assert.ok(msgs(floor7, 'warn').includes('Depth of invasion is at least 7 mm; with a tumour of 30 mm the pT could be higher than T2, so it is not assigned.'));
  assert.equal(rows(floor7)['Depth of invasion'], 'At least 7 mm');
  assert.equal(tnm(run({ tumourSizeMm: '30', doi: 'At least (mm)', doiMm: '12' })), 'pT3');
  assert.equal(tnm(run({ tumourSizeMm: '15', doi: 'At least (mm)', doiMm: '6' })), 'pT2');
  const cannot = run({ doi: 'Cannot be determined (explain)', doiMm: '', doiNote: 'tangential sections' });
  assert.equal(tnm(cannot), 'pTX');
  assert.ok(msgs(cannot, 'warn').includes('Depth of invasion is not a measurement; pT is not assigned.'));
});

test('oral pT: bone and adjacent structures', () => {
  const alveolus = { tumourSite: 'Lower alveolus and gingiva', tumourSizeMm: '15', doiMm: '4' };
  const medullary = run({ ...alveolus, boneInvasion: 'Present', bonePattern: 'Infiltrative', boneLevel: 'Medullary (through the cortex)' });
  assert.equal(tnm(medullary), 'pT4a');
  assert.ok(flatDx(medullary).includes('invading to a depth of 4 mm; medullary bone invasion; completely excised'));
  assert.equal(rows(medullary)['Tumour extent'], 'No other adjacent structure involved', 'the extent row does not contradict the bone row');
  const cortical = run({ ...alveolus, boneInvasion: 'Present', bonePattern: 'Erosive', boneLevel: 'Cortical (superficial erosion only)' });
  assert.equal(tnm(cortical), 'pT1', 'superficial erosion alone is not pT4');
  assert.ok(flatDx(cortical).includes('; cortical bone erosion;'));
  const noLevel = run({ ...alveolus, boneInvasion: 'Present' });
  assert.equal(tnm(noLevel), 'pT1');
  assert.ok(msgs(noLevel, 'warn').includes('Record the level of bone invasion: medullary invasion (through the cortex) is pT4a; superficial cortical erosion by a gingival primary is not.'));
  const sinus = run({ tumourSite: 'Upper alveolus and gingiva', specimenName: 'left maxilla', procedure: ['Partial maxillectomy'], adjacent: ['Maxillary sinus'] });
  assert.equal(tnm(sinus), 'pT4a');
  assert.equal(rows(sinus)['Tumour extent'], 'Invades the maxillary sinus');
  assert.ok(flatDx(sinus).startsWith('ORAL CAVITY, left maxilla, partial maxillectomy - SQUAMOUS CELL CARCINOMA'));
  assert.equal(tnm(run({ adjacent: ['Skin of the face'] })), 'pT4a');
  for (const s of S.ORAL_T4B) assert.equal(tnm(run({ adjacent: [s] })), 'pT4b', s);
  assert.ok(flatDx(run({ adjacent: ['Encases the internal carotid artery'] })).includes('; encasing the internal carotid artery;'));
});

// ---------- oral cavity pN (AJCC 8th, with ENE) ----------

test('oral pN: count, laterality, ENE and the largest deposit', () => {
  const N = (patch) => tnm(run(patch)).split(' ')[1];
  assert.equal(N(oralNodes(0, '', '')), 'pN0');
  assert.equal(N(oralNodes(1, IPSI, 'Not identified', '30')), 'pN1');
  assert.equal(N(oralNodes(1, IPSI, ENE_MAJOR, '30')), 'pN2a', 'ENE in a node of 3 cm or less');
  assert.equal(N(oralNodes(1, IPSI, 'Present, minor (2 mm or less from the capsule)', '12')), 'pN2a', 'minor ENE counts');
  assert.equal(N(oralNodes(1, IPSI, 'Not identified', '31')), 'pN2a');
  assert.equal(N(oralNodes(1, IPSI, 'Not identified', '60')), 'pN2a');
  assert.equal(N(oralNodes(3, IPSI, 'Not identified', '40')), 'pN2b');
  assert.equal(N(oralNodes(1, 'Contralateral', 'Not identified', '20')), 'pN2c');
  assert.equal(N(oralNodes(2, 'Bilateral', 'Not identified', '20')), 'pN2c');
  assert.equal(N(oralNodes(1, IPSI, 'Not identified', '61')), 'pN3a');
  assert.equal(N(oralNodes(1, IPSI, ENE_MAJOR, '31')), 'pN3b');
  assert.equal(N(oralNodes(3, IPSI, ENE_MAJOR, '20')), 'pN3b', 'multiple nodes, any with ENE');
  assert.equal(N(oralNodes(1, 'Contralateral', ENE_MAJOR, '10')), 'pN3b', 'a single contralateral node with ENE');
  assert.equal(N({}), undefined, 'no nodes submitted: pN is left out (Phase 67)');
  const one = run(oralNodes(1, IPSI, ENE_MAJOR, '22'));
  assert.ok(flatDx(one).includes('- 1 of 30 regional lymph nodes involved; extranodal extension present (major)'));
  assert.equal(rows(one)['Regional lymph nodes'], '30 examined; 1 involved');
  assert.equal(rows(one)['Size of largest metastatic deposit'], '22 mm, level II');
});

// ---------- oropharynx: HPV-associated (AJCC 9th) and p16-negative ----------

test('HPV-associated pT: size, the lingual epiglottis and T4 structures', () => {
  const T = (patch) => tnm(run({ ...TONSIL, ...patch })).split(' ')[0];
  assert.equal(T({ tumourSizeMm: '20' }), 'pT1');
  assert.equal(T({ tumourSizeMm: '21' }), 'pT2');
  assert.equal(T({ tumourSizeMm: '40' }), 'pT2');
  assert.equal(T({ tumourSizeMm: '41' }), 'pT3');
  assert.equal(T({ tumourSizeMm: '15', hpvExtent: ['Lingual surface of the epiglottis'] }), 'pT3');
  for (const s of S.HPV_T4) assert.equal(T({ tumourSizeMm: '15', hpvExtent: [s] }), 'pT4', s);
  const tonsil = run(TONSIL);
  assert.ok(sections(tonsil).includes('Pathological stage (AJCC 9th edition)'));
  assert.equal(rows(tonsil)['Depth of invasion'], undefined, 'no depth row on the oropharynx');
  assert.equal(rows(tonsil)['High grade dysplasia / carcinoma in situ'], undefined);
  assert.deepEqual(msgs(tonsil, 'error'), []);
  assert.deepEqual(msgs(tonsil, 'warn'), []);
});

test('HPV-associated pN: the node count, ENE, and six nodes for pN0', () => {
  const N = (patch) => tnm(run(patch)).split(' ')[1];
  const few = run(hpvNodes(0, '', '5'));
  assert.equal(N(hpvNodes(0, '', '5')), 'pNX');
  assert.ok(msgs(few, 'warn').includes('A minimum of 6 lymph nodes is required to assign pN0 status (AJCC 9th edition); fewer were examined.'));
  assert.equal(N(hpvNodes(0, '', '6')), 'pN0');
  assert.equal(N(hpvNodes(1, 'Not identified')), 'pN1a');
  assert.equal(N(hpvNodes(2, 'Not identified')), 'pN1b');
  assert.equal(N(hpvNodes(4, 'Not identified')), 'pN1b');
  assert.equal(N(hpvNodes(5, 'Not identified')), 'pN2');
  assert.equal(N(hpvNodes(1, ENE_MAJOR)), 'pN2');
  assert.equal(N(hpvNodes(4, ENE_MAJOR)), 'pN2');
  assert.equal(N(hpvNodes(5, ENE_MAJOR)), 'pN3');
  const undetermined = run(hpvNodes(2, 'Cannot be determined'));
  assert.equal(tnm(undetermined).split(' ')[1], 'pN1b');
  assert.ok(msgs(undetermined, 'warn').includes('Extranodal extension cannot be determined; the category without definitive extranodal extension is given.'));
});

test('oropharynx without a positive p16: no pTNM, and the checks say why', () => {
  for (const p16 of ['Negative', 'Cannot be determined']) {
    const out = run({ ...TONSIL, histType: 'Squamous cell carcinoma, conventional (keratinising)', grade: 'G2, moderately differentiated', p16 });
    assert.equal(tnm(out), undefined, `${p16}: no pTNM`);
    assert.ok(!sections(out).some((s) => /^Pathological stage/.test(s)), `${p16}: no stage block`);
    assert.ok(!/\(AJCC/.test(out.diagnosis), `${p16}: no stage line`);
    assert.ok(msgs(out, 'warn').includes('p16 is not positive: HPV-independent oropharyngeal carcinoma is staged on the HPV-independent oropharynx and hypopharynx protocol; no pTNM is assigned here.'));
  }
  const unrecorded = run({ ...TONSIL, histType: 'Squamous cell carcinoma, conventional (keratinising)', grade: 'G2, moderately differentiated', p16: '' });
  assert.ok(msgs(unrecorded, 'error').includes('Record p16 immunohistochemistry: a positive result stages an oropharyngeal carcinoma as HPV-associated (AJCC 9th edition).'));
  const typed = run({ ...TONSIL, histType: 'Squamous cell carcinoma, conventional (keratinising)', grade: 'G2, moderately differentiated', p16: 'Negative', tnmOverride: 'pT2 pN1', tnmOverrideReason: 'test' });
  assert.ok(msgs(typed, 'warn').includes('No pTNM prints for an oropharyngeal carcinoma without a positive p16; the typed pTNM is not used.'));
  assert.equal(tnm(typed), undefined);
});

test('diagnosis wording: HPV status, margins, bone, perineural and lymphovascular invasion', () => {
  const hpv = run({ ...TONSIL, hpvPcr: 'Positive', hpvPcrDetail: 'HPV 16' });
  assert.equal(flatDx(hpv), 'OROPHARYNX, left tonsil, transoral resection - SQUAMOUS CELL CARCINOMA, NON-KERATINISING, HPV-ASSOCIATED, 28 mm; p16 and HPV PCR positive; completely excised (closest margin 6 mm, deep); see synoptic report - pT2 (AJCC 9th edition)');
  assert.equal(rows(hpv)['HPV PCR'], 'Positive (HPV 16)');
  assert.ok(flatDx(run({ ...TONSIL })).includes('28 mm; p16 positive; completely excised'));
  assert.ok(flatDx(run({ invasiveMargin: 'Margin(s) involved by invasive tumour (specify)', invasiveInvolvedDetail: 'deep', closestMm: '', closestSite: '' })).includes('; invasive carcinoma involves the deep margin; see synoptic report'));
  assert.ok(flatDx(run({ invasiveMargin: 'Cannot be assessed', closestMm: '', closestSite: '' })).includes('; margins cannot be assessed; see synoptic report'));
  const hgd = run({ hgdMargin: 'Involved by high grade dysplasia / carcinoma in situ (specify)', hgdDetail: 'anterior mucosal' });
  assert.ok(flatDx(hgd).includes('completely excised (closest margin 6 mm, deep); high grade dysplasia involves the anterior mucosal margin; see synoptic report'));
  assert.equal(rows(hgd)['High grade dysplasia / carcinoma in situ'], 'Involved (anterior mucosal)');
  assert.ok(flatDx(run({ lvi: 'Present' })).includes('8 mm; lymphovascular invasion present; completely excised'));
  const nerve = run({ pni: 'Present, intraneural (size of nerve)', pniNerveMm: '1.2' });
  assert.ok(flatDx(nerve).includes('8 mm; perineural invasion present (intraneural); completely excised'));
  assert.equal(rows(nerve)['Perineural invasion'], 'Present, intraneural (nerve 1.2 mm in diameter)');
  const mets = run({ distantMets: ['Lung'] });
  assert.ok(flatDx(mets).includes('- distant metastasis: lung - pT2 pM1 (AJCC 8th edition)'));
  assert.equal(rows(run({ histType: 'Verrucous carcinoma', grade: '' }))['Histologic grade'], undefined, 'verrucous carcinoma is not graded');
  const nec = run({ histType: 'Neuroendocrine carcinoma, small cell type', grade: '', ihc: ['Synaptophysin positive', 'INSM1 positive'] });
  assert.ok(flatDx(nec).includes('- NEUROENDOCRINE CARCINOMA, SMALL CELL TYPE, 18 mm, invading to a depth of 8 mm;'));
  assert.ok(rows(nec)['Tumour histology'].endsWith('The tumour cells express synaptophysin and INSM1.'));
});

// ---------- checks ----------

test('checks: the errors', () => {
  const E = (p) => msgs(run(p), 'error');
  assert.ok(E({ histType: '' }).includes('Histologic type is required.'));
  assert.ok(E({ tumourSite: '' }).includes('Tumour site is required: it chooses the staging system (AJCC 8th oral cavity, AJCC 9th HPV-associated oropharynx).'));
  assert.ok(E({ tumourSite: 'Other (specify)', tumourSiteOther: 'lip commissure', siteRegion: '' }).includes('Choose the region for this site: oral cavity or oropharynx.'));
  assert.ok(E({ ...TONSIL, p16: 'Negative' }).includes('An HPV-associated type is recorded but p16 is not positive.'));
  assert.ok(E({ tumourSizeMm: '' }).includes('pT cannot be assigned: record the tumour size (greatest dimension).'));
  assert.ok(E({ doiMm: '' }).includes('Record the depth of invasion (mm): the oral cavity pT needs it.'));
  assert.ok(E(oralNodes(3, IPSI, 'Not identified', '10', '2')).includes('More lymph nodes involved than examined.'));
  assert.ok(E({ nodesExamined: '12', nodesInvolved: '' }).includes('Number of involved lymph nodes is required when nodes are examined.'));
  const involved = E(oralNodes(1, IPSI, '', ''));
  assert.ok(involved.includes('Extranodal extension is required for involved nodes: it decides pN.'));
  assert.ok(involved.includes('Size of the largest metastatic deposit is required: pN turns on 30 mm and 60 mm.'));
  assert.ok(!E({ ...hpvNodes(1, 'Not identified'), largestDepositMm: '' }).some((m) => /largest metastatic deposit/.test(m)), 'no deposit size needed for the HPV pN');
});

test('checks: the warnings', () => {
  const W = (p) => msgs(run(p), 'warn');
  assert.ok(W({ grade: '' }).includes('Histologic grade is not recorded.'));
  assert.deepEqual(W({ ...TONSIL, grade: '' }), [], 'HPV-associated carcinoma is not graded');
  assert.ok(W({ ...TONSIL, histType: 'Squamous cell carcinoma, conventional (keratinising)', grade: 'G2, moderately differentiated' }).includes('p16 is positive: choose the HPV-associated type.'));
  assert.ok(W({ histType: 'Squamous cell carcinoma, non-keratinising, HPV-associated', grade: '' }).includes('HPV-associated types are listed for the oropharynx; this is an oral cavity site.'));
  assert.ok(W({ ...TONSIL, hpvPcr: 'Negative' }).includes('p16 positive with a negative HPV PCR: check the HPV status.'));
  assert.ok(W({ tumourSizeMm: '6', doiMm: '8' }).includes('Depth of invasion (8 mm) is greater than the tumour size (6 mm); check the measurements.'));
  assert.ok(W({ invasiveMargin: 'Margin(s) involved by invasive tumour (specify)', closestMm: '', closestSite: '' }).includes('Name the margin involved by invasive tumour.'));
  assert.ok(W({ hgdMargin: '' }).includes('Record the margin status for high grade dysplasia / carcinoma in situ.'));
  assert.ok(W({ hgdMargin: 'Involved by high grade dysplasia / carcinoma in situ (specify)' }).includes('Name the margin involved by high grade dysplasia.'));
  assert.ok(W(oralNodes(1, '', 'Not identified', '10')).includes('Laterality of the involved nodes is not recorded; they are staged as ipsilateral.'));
  assert.ok(W(oralNodes(1, 'Bilateral', 'Not identified', '10')).includes('Bilateral nodal involvement needs at least two involved nodes.'));
  assert.ok(W({ ...oralNodes(1, IPSI, ENE_MAJOR, '10'), eneMm: '1.5' }).includes('Extranodal extension of 1.5 mm does not match "Present, major (more than 2 mm from the capsule)".'));
  assert.ok(W({ histType: 'Other histologic type not listed (specify)', grade: '' }).includes('Histologic type "Other" needs specifying.'));
  assert.ok(W({ distantMets: ['Other (specify)'] }).includes('Distant metastasis "Other" needs specifying.'));
  assert.deepEqual(W({}), [], 'the example is clean');
});

// ---------- intake ----------

test('intake: oral and oropharyngeal cancer resections come here; biopsies and benign lines do not', () => {
  const route = (line, history = '') => matchParts(parseIntake(`(A) ${line}`), history, manifest)[0];
  assert.equal(route('Tongue, left lateral, partial glossectomy', 'SCC tongue').templateId, 'oral_carcinoma');
  assert.equal(route('Oral cavity, left lateral tongue, partial glossectomy').templateId, 'oral_carcinoma', 'glossectomy opens the gate alone');
  assert.equal(route('Right buccal mucosa, wide local excision', 'SCC').templateId, 'oral_carcinoma');
  assert.equal(route('Hard palate, palatectomy', 'carcinoma').templateId, 'oral_carcinoma');
  assert.equal(route('Right mandible, segmental mandibulectomy', 'SCC lower alveolus').templateId, 'oral_carcinoma');
  assert.equal(route('Left maxillectomy', 'SCC upper alveolus').templateId, 'oral_carcinoma');
  assert.equal(route('Left tonsil, TORS', 'p16 positive SCC').templateId, 'oral_carcinoma');
  assert.equal(route('Left tonsil, tonsillectomy', 'SCC left tonsil').templateId, 'oral_carcinoma');
  assert.equal(route('Right buccal mucosa and cheek skin, composite resection', 'SCC buccal mucosa').templateId, 'oral_carcinoma');
  assert.equal(route('Left hemiglossectomy and neck dissection', 'SCC').templateId, 'oral_carcinoma', 'the primary with its neck is still the primary');
  // "Ca" is the request-form shorthand; a mandibulectomy or maxillectomy opens the gate on its own
  // (13 of the 14 such parts in the five-year file and both in the export were squamous cell
  // carcinoma) unless the request names a benign jaw lesion.
  assert.equal(route('Tongue, excision', 'Ca tongue').templateId, 'oral_carcinoma');
  assert.equal(route('Left tonsil, tonsillectomy', 'Ca tonsil').templateId, 'oral_carcinoma');
  assert.equal(route('Right mandible, segmental mandibulectomy').templateId, 'oral_carcinoma', 'mandibulectomy opens the gate alone');
  assert.equal(route('Left maxilla, partial maxillectomy').templateId, 'oral_carcinoma', 'maxillectomy opens the gate alone');
  for (const history of ['ameloblastoma', 'osteoradionecrosis', 'odontogenic keratocyst', 'fibrous dysplasia']) {
    assert.notEqual(route('Right mandible, segmental mandibulectomy', history).templateId, 'oral_carcinoma', history);
  }
  assert.notEqual(route('Left maxillectomy', 'Ca maxillary sinus').templateId, 'oral_carcinoma');
  // Not here: biopsies, benign lines, sinonasal primaries.
  assert.equal(route('Tongue, left lateral, biopsy', 'SCC').templateId, 'oral_biopsy');
  assert.equal(route('Base of tongue, biopsy', 'p16 positive').templateId, 'oral_biopsy');
  assert.equal(route('Tongue, excision', 'squamous papilloma').templateId, 'oral_biopsy');
  assert.equal(route('Right mandible, segmental mandibulectomy', 'ameloblastoma').templateId, 'jaw_cyst');
  assert.notEqual(route('Left maxillectomy', 'maxillary sinus SCC').templateId, 'oral_carcinoma');
  for (const [line, history] of [['Left tonsil, tonsillectomy', 'OSA'], ['Right tonsil, tonsillectomy', 'asymmetric tonsil ?malignancy'], ['LEFT TONSIL', '']]) {
    const m = route(line, history);
    assert.equal(m.templateId, 'tonsils', `${line} | ${history}`);
    assert.ok(!(m.candidates || []).some((c) => c.id === 'oral_carcinoma'), `${line} | ${history}: not a candidate`);
  }
});

test('intake: a neck dissection is a lymph node part, and the node form does not repeat "dissection"', () => {
  const route = (line, history = '') => matchParts(parseIntake(`(B) ${line}`), history, manifest)[0];
  for (const line of ['Left neck dissection, levels I-IV', 'Neck dissection, left levels I-V']) {
    const m = route(line, 'SCC tongue');
    assert.equal(m.templateId, 'lymph_node', line);
    assert.equal(m.role, 'lymph_node', line);
  }
  const parsed = parseIntake('(B) Left neck dissection, levels I-IV');
  const node = registry.lymph_node;
  const values = { ...defaults(node.schema), ...presetValues(node.schema, parsed.parts[0], matchParts(parsed, 'SCC tongue', manifest)[0]), nodesTotal: '24' };
  const out = generate(node.schema, node.generator, { schemaId: 'lymph_node', caseTitle: '', options: { ...(node.schema.example?.options || {}) }, parts: [{ label: 'B', templateId: 'lymph_node', values }] });
  assert.ok(out.specimens.includes('left neck dissection, levels I-IV'), out.specimens);
  assert.ok(!/dissection, levels I-IV, dissection/i.test(out.specimens + out.diagnosis), 'the procedure is not said twice');
  assert.equal(route('Skin, neck, excision', 'BCC').templateId, 'skin_excision', 'a neck skin excision stays on the skin forms');
});

test('intake: presets from the request line', () => {
  const preset = (line, history = 'SCC') => {
    const parsed = parseIntake(`(A) ${line}`);
    return presetValues(schema, parsed.parts[0], matchParts(parsed, history, manifest)[0]);
  };
  assert.deepEqual(preset('Tongue, left lateral, partial glossectomy'), { laterality: 'Left', specimenName: 'Tongue, left lateral', tumourSite: 'Tongue (anterior two thirds)', procedure: ['Partial glossectomy'] });
  assert.deepEqual(preset('Right mandible, segmental mandibulectomy'), { laterality: 'Right', specimenName: 'Right mandible', tumourSite: 'Lower alveolus and gingiva', procedure: ['Segmental mandibulectomy'] });
  assert.deepEqual(preset('Hard palate, palatectomy'), { laterality: 'Not specified', specimenName: 'Hard palate', tumourSite: 'Hard palate', procedure: ['Palatectomy'] });
  assert.equal(preset('Left tonsil, TORS', 'p16 positive SCC').tumourSite, 'Palatine tonsil');
});

// ---------- block key ----------

test('block key: typed lines are lettered; the macroscopy option drops it', () => {
  assert.equal(flat(run({ blockKeyText: '1 Tumour\n2 Deep margin\n3 Anterior margin' }).blockKey), '(1) Tumour. (2) Deep margin. (3) Anterior margin.');
  assert.equal(run({}, { macro: false }).macro, '');
});

// ---------- golden fixtures ----------

test('golden fixtures reproduce byte-for-byte', () => {
  fs.mkdirSync(FIX, { recursive: true });
  for (const [name, patch, opts = {}] of CASES) {
    const out = run(patch, opts);
    const file = path.join(FIX, `${name}.json`);
    // A deliberate edit's reason lives in the fixture's description; --update keeps it.
    const kept = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')).description : undefined;
    const current = { ...(kept ? { description: kept } : {}), templateId: 'oral_carcinoma', patch, options: opts, report: out.report, checks: out.issues };
    if (UPDATE || !fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n'); continue; }
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(out.report, saved.report, `${file} changed; re-run with --update only after a deliberate wording change`);
    assert.deepEqual(out.issues, saved.checks, `${file} checks changed`);
  }
});

test('golden fixtures: the card accept cases stage as the card says', () => {
  const byName = Object.fromEntries(CASES.map(([n, p]) => [n, run(p)]));
  assert.equal(tnm(byName['oral-carcinoma-01-tongue-pt2']), 'pT2');
  assert.equal(tnm(byName['oral-carcinoma-02-mandible-pt4a-pn2a']), 'pT4a pN2a');
  assert.equal(tnm(byName['oral-carcinoma-03-tonsil-hpv-pt2-pn1b']), 'pT2 pN1b');
  assert.equal(tnm(byName['oral-carcinoma-04-tonsil-p16-negative']), undefined);
  for (const n of ['oral-carcinoma-01-tongue-pt2', 'oral-carcinoma-02-mandible-pt4a-pn2a', 'oral-carcinoma-03-tonsil-hpv-pt2-pn1b']) assert.deepEqual(byName[n].issues, [], `${n} is clean`);
  assert.deepEqual(msgs(byName['oral-carcinoma-04-tonsil-p16-negative'], 'warn').length, 1);
});
