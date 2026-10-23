// Vulval carcinoma resection - Phase 77 (23 October 2026).
// Its own form (Gynae, "Vulva Ca"), in the QMH GYN-Vulva element order, staged on AJCC version 9 as CAP
// Vulva 5.1.0.0 lists it (the user chose version 9 on 2026-10-23; the QMH page prints the 8th edition).
// Sources: docs/reference/vulva-sources.md. Staging: tests/staging_vulva.test.js. Groin node criteria:
// tests/lymphnode_sln.test.js. Phase 78 (23 October 2026) adds the reference galleries, tested at the end of
// this file; their sources and licences are in docs/specs/vulval-carcinoma-gallery.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTemplate, loadManifest } from '../src/registry.js';
import { createCase, generate, isVisible } from '../src/engine.js';
import { parseIntake, matchParts, presetValues } from '../src/intake.js';
import * as gen from '../generators/vulval_carcinoma.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const FIX = path.join(here, 'fixtures', 'vulval_carcinoma');
const UPDATE = process.env.UPDATE_FIXTURES === '1';
const { schema } = await loadTemplate('vulval_carcinoma');
const manifest = await loadManifest();
const field = (id) => schema.fields.find((f) => f.id === id);
const EXAMPLE = schema.example.parts[0].values;
const OPTIONS = schema.example.options;
const runParts = (list, options = {}) => {
  const c = createCase(schema, list.length);
  c.options = { ...c.options, ...OPTIONS, includeHeader: false, ...options };
  list.forEach((v, i) => { c.parts[i].values = { ...c.parts[i].values, ...v }; });
  return generate(schema, gen, c);
};
const run = (values = {}, options = {}) => runParts([{ ...EXAMPLE, ...values }], options);
const para = (r) => (r.report.match(/- Tumour histology:\n {2}(.*)/) || [])[1] || '';
const messages = (r) => r.issues.map((i) => i.message).join(' | ');
const route = (line, history = '') => matchParts(parseIntake(line), history, manifest)[0];
const preset = (line, history = '') => {
  const parsed = parseIntake(line);
  return presetValues(schema, parsed.parts[0], matchParts(parsed, history, manifest)[0]);
};
const HPVA = 'Squamous cell carcinoma, HPV-associated';
const HPVI = 'Squamous cell carcinoma, HPV-independent';
const VAM = 'Vulvar aberrant maturation (VAM) / HPV-independent, p53-wild-type verruciform acanthotic VIN';

// ---------- metadata and menus ----------

test('vulva: Gynae cancer resection, labelled Vulva Ca, the QMH page saved, the placeholder gone', () => {
  assert.equal(schema.id, 'vulval_carcinoma');
  assert.equal(schema.system, 'Gynae');
  assert.equal(schema.kind, 'cancer resection');
  assert.equal(schema.label, 'Vulva Ca');
  assert.equal(schema.organ, 'VULVA');
  assert.equal(manifest.find((t) => t.id === 'vulval_carcinoma')?.label, 'Vulva Ca');
  assert.equal(schema.source.url, 'https://awiloqmh.github.io/CancerReportingTemplate/GYN-Vulva.html');
  assert.equal(schema.source.capProtocol, 'https://documents.cap.org/protocols/Vulva_5.1.0.0.REL_CAPCP.docx');
  assert.ok(fs.existsSync(path.join(root, schema.source.savedPage)));
  assert.ok(fs.existsSync(path.join(root, schema.source.grounding)));
  assert.ok(fs.existsSync(path.join(root, 'docs/reference/qmh/vulva.txt')));
  const planned = JSON.parse(fs.readFileSync(path.join(root, 'templates/planned.json'), 'utf8')).planned;
  assert.ok(!planned.some((t) => t.id === 'vulval_carcinoma' || t.qmh === 'GYN-Vulva'));
  assert.equal(schema.options.find((o) => o.id === 'printPTNM' || o.$use === 'printPTNM')?.label, 'Print the pTNM block (AJCC 9th edition)');
});

test('vulva: the example sets every field, and every field sits in a group', () => {
  for (const f of schema.fields) {
    assert.ok(Object.hasOwn(EXAMPLE, f.id), `example sets ${f.id}`);
    assert.ok(f.group, `${f.id} has a group`);
  }
  assert.equal(EXAMPLE.grade, '', 'grade is optional (CAP Note E; ICCR does not recommend grading)');
  const r = run();
  assert.deepEqual(r.issues.filter((i) => i.level !== 'info'), [], 'the example raises no warnings');
});

test('vulva: the type list follows CAP; the morphology pattern shows for squamous cell carcinoma only', () => {
  const types = field('histType').options;
  for (const t of [HPVA, HPVI, 'Squamous cell carcinoma, NOS', 'Basal cell carcinoma, NOS', 'Paget disease, extramammary (invasive)',
    'Adenocarcinoma of anogenital mammary-like glands', 'Phyllodes tumour, malignant']) assert.ok(types.includes(t), t);
  const pattern = field('pattern');
  assert.deepEqual(pattern.options, ['Keratinising', 'Non-keratinising', 'Basaloid', 'Warty', 'Verrucous']);
  assert.equal(isVisible(pattern, { ...EXAMPLE, histType: HPVA }), true);
  assert.equal(isVisible(pattern, { ...EXAMPLE, histType: 'Squamous cell carcinoma, NOS' }), true);
  assert.equal(isVisible(pattern, { ...EXAMPLE, histType: 'Basal cell carcinoma, NOS' }), false);
  assert.equal(isVisible(field('doiMm'), { ...EXAMPLE, histType: 'Phyllodes tumour, malignant' }), false, 'no depth for a phyllodes tumour');
  // p53: the two wild-type and four abnormal patterns (Alsolami et al. 2026); p16: block-type or not.
  const p53 = field('p53').options.filter((o) => !['Other (specify)', 'Not performed'].includes(o));
  assert.equal(p53.filter((o) => /^Wild-type/.test(o)).length, 2);
  assert.equal(p53.filter((o) => /^Abnormal/.test(o)).length, 4);
  assert.deepEqual(field('p16').options, ['Block-type positive', 'Negative', 'Patchy, non-block-type', 'Other (specify)', 'Not performed']);
  assert.ok(field('adjacent').options.includes(VAM), 'the CAP term for the third precursor');
});

// ---------- synoptic ----------

test('vulva: one Tumour histology paragraph carries the type, pattern, depth, morphology and immunohistochemistry', () => {
  assert.equal(para(run()), 'The tumour is an HPV-independent squamous cell carcinoma with a keratinising pattern, invading to a depth of 4.5 mm. '
    + 'Infiltrating nests and cords of atypical squamous cells show abundant eosinophilic cytoplasm, intercellular bridges and keratin pearls. '
    + 'On immunohistochemistry, p16 is negative and p53 shows an abnormal pattern of basal overexpression.');
  const ofPattern = (p) => para(run({ histType: HPVA, pattern: p, p16: 'Block-type positive', p53: 'Wild-type pattern' }));
  assert.match(ofPattern('Basaloid'), /HPV-associated squamous cell carcinoma with a basaloid pattern, .* lie in a desmoplastic stroma, with little keratinisation\. On immunohistochemistry, p16 shows diffuse block-type staining and p53 shows a wild-type pattern\.$/);
  assert.match(ofPattern('Warty'), /koilocytic atypia, multinucleation and prominent keratinisation\./);
  assert.match(ofPattern('Non-keratinising'), /intercellular bridges but no keratin pearls\./);
  assert.match(para(run({ pattern: 'Verrucous', p53: 'Wild-type pattern' })), /^The tumour is an HPV-independent squamous cell carcinoma with a verrucous pattern, .* Well-differentiated squamous epithelium /);
  assert.match(para(run({ p53: 'Wild-type, mid-epithelial (basal sparing) pattern' })), /p53 shows a wild-type, mid-epithelial pattern with basal sparing\.$/);
  assert.match(para(run({ p16: 'Not performed', p53: 'Not performed' })), /keratin pearls\.$/, 'no stains, no stain sentence');
  assert.equal(run().report.includes('- p16'), false, 'p16 and p53 print in the paragraph, not as rows');
});

test('vulva: depth of invasion by the FIGO 2021 method, the conventional measurement beside it, the method in Comment', () => {
  const r = run();
  assert.match(r.report, /\n- Depth of invasion: 4\.5 mm \(conventional method: 5 mm\)\n/);
  assert.match(r.report, /\nDepth of invasion is measured by the FIGO 2021 method\.\n?$/);
  const cannot = run({ doi: 'Cannot be determined', doiMm: '', doiConventionalMm: '', doiReason: 'tangential sectioning' });
  assert.match(cannot.report, /\n- Depth of invasion: Cannot be determined \(tangential sectioning\)\n/);
  assert.doesNotMatch(cannot.report, /FIGO 2021 method/);
});

test('vulva: margins print one row per lesion present', () => {
  const r = run();
  assert.match(r.report, /\n- Invasive carcinoma, peripheral margin: Uninvolved \(closest 9 mm, 3 o'clock\)\n/);
  assert.match(r.report, /\n- Invasive carcinoma, deep margin: Uninvolved \(closest 6 mm\)\n/);
  assert.match(r.report, /\n- Squamous precursor lesion \(dVIN\): Uninvolved/);
  assert.doesNotMatch(r.report, /Paget disease:/);
  const none = run({ adjacent: ['Lichen sclerosus'] });
  assert.doesNotMatch(none.report, /Squamous precursor lesion/, 'no precursor, no precursor margin row');
  const both = run({ adjacent: ['HSIL (VIN 3)', 'Differentiated VIN (dVIN)', VAM] });
  assert.match(both.report, /\n- Squamous precursor lesion \(HSIL, dVIN and VAM \/ HPVi \(p53wt\) vaVIN\):/);
  const paget = run({ adjacent: ['Paget disease (intraepithelial)'], pagetMargin: 'Involved', pagetMarginSite: '3 o\'clock' });
  assert.match(paget.report, /\n- Paget disease: Involved \(3 o'clock\)\n/);
});

test('vulva: nodes and pTNM; the stage group stays in Checks', () => {
  const r = run();
  assert.match(r.report, /\n- Regional lymph nodes:/);
  assert.match(r.report, /\nPathological stage \(AJCC 9th edition\)\n- pTNM: pT1b pN0\(sn\)\n/);
  assert.doesNotMatch(r.report, /FIGO stage|Stage group|\bIB\b/);
  assert.ok(r.issues.some((i) => i.level === 'info' && /^Stage group, AJCC 9th edition, matching FIGO 2021 \(reference, not reported\): IB$/.test(i.message)));
  const off = run({}, { printPTNM: false });
  assert.doesNotMatch(off.report, /pT1b/);
  const m1 = run({ distantMets: ['External iliac lymph node(s)'] });
  assert.match(m1.report, /\n- Distant metastasis: External iliac lymph node\(s\)/);
  assert.match(m1.report, /pT1b pN0\(sn\) pM1/);
});

test('vulva: the QMH element order, with the documented departures', () => {
  // The order the QMH page prints its report in (updateDescription in the saved page).
  const html = fs.readFileSync(path.join(root, 'docs/reference/GYN-Vulva.html'), 'utf8');
  const fn = html.slice(html.indexOf('function updateDescription'));
  const all = [...fn.matchAll(/"(?:\\n)?"?\s*\+?\s*"?- ([A-Za-z0-9 ,/()-]+?):? ?"/g)].map((m) => m[1].trim());
  const qmh = all.slice(0, all.indexOf('Additional notes'));
  const want = ['Procedure', 'Tumor site', 'Tumor size', 'Tumor focality', 'Tumor histology and immunohistochemical studies',
    'Histologic grade', 'Depth of invasion', 'Tumor border', 'Other tissue/ organ involvement', 'Lymphatic and / or Vascular Invasion',
    'Perineural invasion', 'Surgical margins for invasive tumor, peripheral', 'Surgical margins for invasive tumor, deep',
    'Lymph nodes examination', 'Distant metastasis', 'Additional pathologic findings'];
  const seen = want.map((w) => qmh.indexOf(w));
  assert.ok(seen.every((i) => i >= 0), `QMH labels found: ${qmh.join(' / ')}`);
  assert.deepEqual([...seen].sort((a, b) => a - b), seen, 'the saved QMH page prints in this order');
  const ours = {
    Procedure: 'Procedure', 'Tumor site': 'Tumour site', 'Tumor size': 'Tumour size', 'Tumor focality': 'Tumour focality',
    'Tumor histology and immunohistochemical studies': 'Tumour histology', 'Histologic grade': 'Histologic grade',
    'Depth of invasion': 'Depth of invasion', 'Tumor border': 'Tumour border', 'Other tissue/ organ involvement': 'Other tissue / organ involvement',
    'Lymphatic and / or Vascular Invasion': 'Lymphovascular invasion', 'Perineural invasion': 'Perineural invasion',
    'Surgical margins for invasive tumor, peripheral': 'Invasive carcinoma, peripheral margin',
    'Surgical margins for invasive tumor, deep': 'Invasive carcinoma, deep margin',
    'Lymph nodes examination': 'Regional lymph nodes', 'Distant metastasis': 'Distant metastasis',
    'Additional pathologic findings': 'Adjacent epithelium'
  };
  const r = run({ grade: 'G2, moderately differentiated', distantMets: ['Pelvic lymph node(s)'], additionalFindings: 'Seborrhoeic keratosis' });
  const labels = r.report.split('\n').filter((l) => /^- [^:]+:/.test(l)).map((l) => l.slice(2, l.indexOf(':')));
  const expected = want.map((w) => ours[w]);
  // Departure 1: the histologic type prints as its own row before the paragraph.
  expected.splice(expected.indexOf('Tumour histology'), 0, 'Histologic type');
  // Departure 2: p16 and p53 print inside the paragraph (no rows); 3: HPV testing under Molecular findings.
  // Departure 4: one precursor margin row for the lesions present, after the invasive carcinoma margins.
  expected.splice(expected.indexOf('Invasive carcinoma, deep margin') + 1, 0, 'Squamous precursor lesion (dVIN)');
  // Departure 5: the pTNM block follows Distant metastasis; FIGO stage is not printed.
  expected.splice(expected.indexOf('Distant metastasis') + 1, 0, 'pTNM');
  expected.push('Other findings');
  assert.deepEqual(labels, expected);
  assert.match(para(r), /On immunohistochemistry, p16/);
  assert.doesNotMatch(r.report, /- HPV PCR/);
  const hpv = run({ hpvPcr: 'High-risk HPV not detected' });
  assert.ok(hpv.report.indexOf('- HPV PCR: High-risk HPV not detected') > hpv.report.indexOf('- Other findings') || hpv.report.indexOf('- HPV PCR') > hpv.report.indexOf('- Adjacent epithelium'),
    'HPV testing prints after the synoptic, under Molecular findings');
});

test('vulva: HPV PCR prints under MOLECULAR FINDINGS with the genotype', () => {
  const r = run({ histType: HPVA, pattern: 'Basaloid', p16: 'Block-type positive', p53: 'Wild-type pattern', hpvPcr: 'High-risk HPV detected', hpvGenotype: 'HPV 16' }, { includeHeader: true });
  assert.match(r.report, /\nMOLECULAR FINDINGS:\nHPV testing\n- HPV PCR: High-risk HPV detected \(HPV 16\)\n\nDIAGNOSIS:/);
  assert.doesNotMatch(run({ hpvPcr: 'Not performed' }, { includeHeader: true }).report, /MOLECULAR FINDINGS/);
});

// ---------- specimen line and diagnosis ----------

test('vulva: specimen line and diagnosis', () => {
  const r = run();
  assert.match(r.report, /^Vulva, left labium majus, wide excision\n/m);
  const dx = r.report.slice(r.report.indexOf('VULVA, left labium majus, wide excision'));
  assert.match(dx, /^VULVA, left labium majus, wide excision\n- SQUAMOUS CELL CARCINOMA, HPV-INDEPENDENT, 24 mm, invading to a depth of\n {2}4\.5 mm; completely excised \(closest margin 6 mm, deep\); see synoptic report\n- 0 of 2 sentinel lymph nodes involved\n- pT1b pN0\(sn\) \(AJCC 9th edition\)\n- Background differentiated VIN \(dVIN\) and lichen sclerosus\n/);
  assert.equal(gen.specimenName({ values: { ...EXAMPLE, specimenName: 'Vulva', procedure: 'Radical vulvectomy', laterality: 'Midline', tumourSite: ['Clitoris'] } }),
    'Vulva, clitoris (midline), radical vulvectomy', 'a typed name that only repeats the organ is dropped');
  assert.equal(gen.specimenName({ values: { ...EXAMPLE, specimenName: '', tumourSite: [], laterality: 'Right', procedure: 'Partial vulvectomy' } }), 'Vulva, right, partial vulvectomy');
  const involved = run({ deepMargin: 'Involved', deepMarginMm: '', deepMarginSite: '' });
  assert.match(involved.report, /\n- Invasive carcinoma, deep margin: Involved\n/);
  assert.match(involved.report, /; invasive carcinoma involves the deep margin; see synoptic report\n/);
  const phyllodes = run({ histType: 'Phyllodes tumour, malignant', doiMm: '', doiConventionalMm: '', p16: 'Not performed', p53: 'Not performed' });
  assert.doesNotMatch(phyllodes.report, /pT\d|AJCC 9th|FIGO 2021 method|Invasive carcinoma, /);
  assert.match(phyllodes.report, /\n- Tumour, peripheral margin:/);
  assert.match(messages(phyllodes), /Phyllodes tumours are outside the CAP vulva protocol, which points to its breast phyllodes protocol: no pTNM is printed\./);
});

// ---------- checks ----------

test('vulva: checks for p16, p53 and HPV testing against the type', () => {
  assert.match(messages(run({ histType: HPVA, pattern: 'Basaloid', p16: 'Negative', p53: 'Wild-type pattern' })), /p16/);
  assert.match(messages(run({ histType: HPVA, pattern: 'Basaloid', p16: 'Block-type positive', p53: 'Abnormal, null' })), /p53/);
  assert.match(messages(run({ histType: HPVI, p16: 'Block-type positive', p53: 'Wild-type pattern' })), /p16/);
  assert.match(messages(run({ histType: HPVI, hpvPcr: 'High-risk HPV detected' })), /HPV/);
  assert.match(messages(run({ histType: HPVA, pattern: 'Basaloid', p16: 'Block-type positive', p53: 'Wild-type pattern', hpvPcr: 'High-risk HPV not detected' })), /HPV/);
  const clean = run({ histType: HPVA, pattern: 'Basaloid', p16: 'Block-type positive', p53: 'Wild-type pattern', hpvPcr: 'High-risk HPV detected' });
  assert.deepEqual(clean.issues.filter((i) => i.level !== 'info'), []);
});

test('vulva: checks for depth, size and the nodes', () => {
  assert.match(messages(run({ doiConventionalMm: '3' })), /conventional/i, 'a conventional depth smaller than the FIGO 2021 depth');
  assert.match(messages(run({ doiMm: '' })), /[Dd]epth of invasion/);
  assert.match(messages(run({ tumourSizeMm: '' })), /size/i);
  const noNodes = run({ nodesExamined: '', nodesSentinel: '', nodeSampling: '' });
  assert.match(messages(noNodes), /Invasion of more than 1 mm: CAP asks for regional lymph node evaluation\. No nodes are recorded, so pN is not assigned\./);
  assert.doesNotMatch(messages(run({ doiMm: '0.8', doiConventionalMm: '1', tumourSizeMm: '15', nodesExamined: '', nodesSentinel: '', nodeSampling: '' })), /CAP asks for regional lymph node evaluation/);
  const over = run({ nodesExamined: '2', nodes2to5: '3' });
  assert.ok(over.issues.some((i) => i.level === 'error'), 'more involved nodes than examined');
  assert.match(messages(run({ nodesExamined: '12', nodesSentinel: '', nodeSampling: 'Lymphadenectomy', nodes2to5: '1', largestDepositMm: '9' })), /largest deposit/i,
    'a 9 mm deposit with no node counted over 5 mm');
  assert.doesNotMatch(messages(run({ nodesExamined: '12', nodesSentinel: '', nodeSampling: 'Lymphadenectomy', nodes2to5: '1', largestDepositMm: '5' })), /size band/i,
    '5.0 mm is the top of the 2-5 mm band');
});

// ---------- intake ----------

test('vulva intake: excisions and vulvectomies with a carcinoma cue open the form; biopsies and benign excisions do not', () => {
  assert.equal(route('(A) Vulva, radical vulvectomy').templateId, 'vulval_carcinoma');
  assert.equal(route('(A) Vulva, radical local excision').templateId, 'vulval_carcinoma');
  assert.equal(route('(A) Left labium majus, wide local excision', 'SCC vulva').templateId, 'vulval_carcinoma');
  assert.equal(route('(A) Right hemivulvectomy', 'vulval carcinoma').templateId, 'vulval_carcinoma');
  assert.equal(route('(A) Vulva, left, wide local excision', 'lichen sclerosus').templateId, 'generic', 'a benign excision stays where it opened');
  assert.equal(route('(A) Vulva, excision').templateId, 'generic', 'no carcinoma cue');
  assert.equal(route('(A) Vulva, biopsy').templateId, 'cervical_biopsy');
  assert.equal(route('(A) Vulva, punch biopsy', 'SCC vulva').templateId, 'cervical_biopsy', 'a vulval biopsy stays on the biopsy form');
  assert.equal(route('(A) Bartholin cyst, excision').templateId, 'generic');
});

test('vulva intake: procedure, side, site and name from the line', () => {
  assert.deepEqual((({ procedure, laterality }) => ({ procedure, laterality }))(preset('(A) Vulva, radical vulvectomy')),
    { procedure: 'Radical vulvectomy', laterality: 'Not specified' });
  const wle = preset('(A) Left labium majus, wide local excision', 'SCC vulva');
  assert.equal(wle.procedure, 'Wide excision');
  assert.equal(wle.laterality, 'Left');
  assert.equal(wle.specimenName, 'Left labium majus');
  assert.deepEqual(wle.tumourSite, ['Labium majus']);
  const hemi = preset('(A) Right hemivulvectomy', 'vulval carcinoma');
  assert.equal(hemi.procedure, 'Partial vulvectomy');
  assert.equal(hemi.laterality, 'Right');
});

test('vulva intake: groin nodes in a vulval case open the lymph node form on the vulval criteria', () => {
  const parsed = parseIntake('Clinical history: vulval SCC\n\nSpecimen:\n(A) Vulva, wide local excision\n(B) Left groin sentinel lymph node\n(C) Right inguinal lymph nodes, dissection');
  const m = matchParts(parsed, parsed.history, manifest);
  assert.deepEqual(m.map((x) => x.templateId), ['vulval_carcinoma', 'lymph_node', 'lymph_node']);
});

// ---------- golden reports ----------

// Written on first run, compared after; edit deliberately (UPDATE_FIXTURES=1 rewrites).
const CASES = [
  ['01-hpvi-scc-dvin-sentinel', 'HPV-independent keratinising squamous cell carcinoma with dVIN and lichen sclerosus, wide excision, negative left groin sentinel nodes, pT1b pN0(sn), the example', [EXAMPLE]],
  ['02-hpva-basaloid-hsil-pt1a', 'HPV-associated basaloid squamous cell carcinoma with HSIL (VIN 3) at the lateral margin, block-type p16, wild-type p53, high-risk HPV detected, pT1a with no nodes', [{
    ...EXAMPLE, histType: HPVA, pattern: 'Basaloid', specimenName: 'Right labium minus', procedure: 'Local excision', laterality: 'Right',
    tumourSite: ['Labium minus'], tumourSizeMm: '12', specimenDims: '30 x 18 x 6', lesionDims: '12 x 9', macroMarginMm: '5', macroMarginSite: 'medial',
    doiMm: '0.8', doiConventionalMm: '1.2', p16: 'Block-type positive', p53: 'Wild-type pattern', adjacent: ['HSIL (VIN 3)'],
    precursorMargin: 'Involved', precursorMarginMm: '', precursorMarginSite: 'lateral', peripheralMarginMm: '4', peripheralMarginSite: 'medial',
    deepMarginMm: '3', nodeSampling: '', nodesExamined: '', nodesSentinel: '', hpvPcr: 'High-risk HPV detected', hpvGenotype: 'HPV 16'
  }]],
  ['03-radical-vulvectomy-groin-n1c', 'radical vulvectomy with a right inguinofemoral lymphadenectomy, HPV-independent keratinising carcinoma into the lower vagina, lymphovascular invasion, extranodal extension, pT2 pN1c', [{
    ...EXAMPLE, specimenName: '', procedure: 'Radical vulvectomy', laterality: 'Midline', tumourSite: ['Labium majus', 'Clitoris'], tumourSizeMm: '45',
    specimenDims: '110 x 80 x 30', lesionDims: '45 x 30', macroMarginMm: '8', macroMarginSite: 'posterior', doiMm: '7', doiConventionalMm: '8',
    extension: ['Vagina, lower one-third'], lvi: 'Present', p53: 'Abnormal, null', precursorMarginMm: '6', precursorMarginSite: 'posterior',
    peripheralMarginMm: '7', peripheralMarginSite: 'posterior', deepMarginMm: '2', nodeSampling: 'Lymphadenectomy', nodesExamined: '14',
    nodesSentinel: '', nodesOver5: '1', nodes2to5: '1', nodesMicro: '0', nodesItc: '0', largestDepositMm: '9', nodeSites: ['Right inguinal', 'Right femoral'],
    nodeFindings: ['Extranodal extension']
  }]]
];
for (const [name, description, parts] of CASES) {
  test(`golden: ${name}`, () => {
    const r = runParts(parts);
    const file = path.join(FIX, `${name}.json`);
    const current = { description, templateId: 'vulval_carcinoma', options: OPTIONS, values: parts, report: r.report, checks: r.issues };
    if (UPDATE || !fs.existsSync(file)) {
      fs.mkdirSync(FIX, { recursive: true });
      fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n');
    }
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(r.report, saved.report, `${file} changed; re-run with UPDATE_FIXTURES=1 only after a deliberate wording change`);
    assert.deepEqual(r.issues, saved.checks, `${file} checks changed`);
    assert.doesNotMatch(r.report, /undefined|\[object|NaN| {3,}/);
  });
}

// Reference galleries - Phase 78 (user request 2026-10-23). Every photograph is of a vulval lesion: the user left
// out stand-ins from other sites, so the node panel is criteria only. ExpertPath topics are links, never images.
// Sources and licences: docs/specs/vulval-carcinoma-gallery.md.
const GALLERIES = {
  histType: ['Vulval carcinoma types', 6, 10], doi: ['Depth of invasion: three measurements', 3, 5],
  growthPattern: ['Tumour border', 2, 4], precursorMargin: ['Squamous precursors at a margin', 3, 6],
  pagetMargin: ['Paget disease at a margin', 1, 1], nodeSampling: ['Regional lymph nodes (AJCC version 9)', 4, 0],
  p16: ['p16 patterns', 3, 5], p53: ['p53 patterns', 6, 7]
};
const REUSED = ['vulva_scc_keratinising.jpg', 'paget_he_vulva.jpg', 'vulva_hsil_basaloid.jpg', 'dvin_basal_atypia.jpg', 'p53_basal_dvin.jpg',
  'p16_mosaic.jpg', 'p53_scattered.jpg', 'p53_mid_epithelial.jpg', 'p53_basal.jpg', 'p53_diffuse.jpg', 'p53_null.jpg', 'p53_cytoplasmic.jpg'];
const jpegSize = (buf) => {
  for (let i = 2; i < buf.length - 8;) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1];
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
};
test('galleries: eight panels of vulval images with open licences, credits and ExpertPath links', async () => {
  const { schema: cervical } = await loadTemplate('cervical_biopsy');
  const cervicalImages = new Map();
  for (const f of cervical.fields) for (const g of f.reference?.groups || []) for (const im of g.images || []) cervicalImages.set(im.src, im);
  const used = new Set();
  for (const [id, [title, groups, photos]] of Object.entries(GALLERIES)) {
    const ref = field(id).reference;
    assert.equal(ref.title, title, `${id} panel title`);
    assert.equal(ref.groups.length, groups, `${id} group count`);
    const images = ref.groups.flatMap((g) => g.images || []);
    assert.equal(images.length, photos, `${id} photo count`);
    for (const g of ref.groups) {
      assert.ok(g.points?.length, `${id}: ${g.heading} has points`);
      for (const l of g.links || []) assert.ok(l.label.startsWith('ExpertPath: ') && l.url.startsWith('https://app.expertpath.com/document/'), `${id}: ${l.label}`);
    }
    if (ref.groups.some((g) => g.links?.length)) assert.match(ref.note, /own ExpertPath login/, `${id} says the ExpertPath pages need a login`);
    for (const im of images) {
      used.add(im.src);
      assert.match(im.caption, /: .+ \((H&E|p16 immunostain|p53 immunostain|diagram)\)\.$/, `${im.src} caption form`);
      assert.match(im.license, /^CC(0| BY| BY-SA) /, `${im.src} licence`);
      const name = path.basename(im.src);
      if (im.src.startsWith('assets/reference/lower_genital/')) {
        assert.ok(REUSED.includes(name), `${name} is one of the vulval cervical biopsy photographs`);
        assert.deepEqual(im, cervicalImages.get(im.src), `${name} keeps its cervical biopsy caption and credit`);
      } else {
        assert.ok(im.src.startsWith('assets/reference/vulval_carcinoma/'), `${im.src} folder`);
        assert.match(im.license, /^CC BY [24]\.0$/, `${im.src} licence`);
        assert.match(im.url, /^https:\/\/pmc\.ncbi\.nlm\.nih\.gov\/articles\/PMC\d+\/$/, `${im.src} source URL`);
        assert.match(im.credit, /^.+ et al\., .+ (19|20)\d\d, Fig \d+(, panel [A-Za-z])? \(cropped\)$|, full figure$/, `${im.src} credit`);
        const buf = fs.readFileSync(path.join(root, im.src));
        const size = jpegSize(buf);
        assert.ok(buf.length <= 150 * 1024 && size && size.w <= 900 && size.h <= 900, `${im.src} is a JPEG of 900 px and 150 kB or less`);
      }
    }
  }
  const folder = fs.readdirSync(path.join(root, 'assets/reference/vulval_carcinoma')).map((n) => `assets/reference/vulval_carcinoma/${n}`);
  assert.deepEqual(folder.filter((s) => !used.has(s)), [], 'every vulval carcinoma photograph is used');
  assert.equal(folder.length, 22, 'new photographs');
  assert.equal([...used].filter((s) => s.includes('/lower_genital/')).length, REUSED.length, 'reused photographs');
  // Headings follow the options they illustrate.
  for (const id of ['histType', 'growthPattern', 'p16', 'p53']) {
    for (const g of field(id).reference.groups) assert.ok(field(id).options.includes(g.heading), `${id}: "${g.heading}" is an option`);
  }
  assert.deepEqual(field('precursorMargin').reference.groups.slice(1).map((g) => g.heading), field('adjacent').options.slice(2, 4));
  assert.equal(field('pagetMargin').reference.groups[0].heading, 'Paget disease (intraepithelial)');
  // The p53 panel is the cervical biopsy one under this form's option names.
  const cp53 = cervical.fields.find((f) => f.id === 'p53').reference.groups;
  assert.deepEqual(field('p53').reference.groups.map((g) => [g.points, g.images]), cp53.map((g) => [g.points, g.images]));
  // The node panel holds the AJCC version 9 categories as text.
  const nodeText = field('nodeSampling').reference.groups.flatMap((g) => g.points).join(' ');
  for (const pn of ['pN0(i+)', 'pN1mi', 'pN1a', 'pN1b', 'pN1c', 'pN2']) assert.ok(nodeText.includes(pn), `node panel has ${pn}`);
  assert.match(field('nodeSampling').reference.note, /No openly licensed photograph/);
  assert.match(field('doiMm').help, /deepest adjacent dysplastic, tumour-free rete ridge \(or the nearest dysplastic rete peg\)/);
  // Captions and criteria never print.
  const r = runParts([EXAMPLE]);
  for (const id of Object.keys(GALLERIES)) {
    const ref = field(id).reference;
    for (const t of [ref.intro, ...ref.groups.flatMap((g) => [...g.points, ...(g.images || []).map((im) => im.caption)])]) {
      assert.ok(!r.report.includes(t), `"${t.slice(0, 60)}" reached the report`);
    }
  }
});
