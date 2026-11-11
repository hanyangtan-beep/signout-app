// Cervical carcinoma resection - Phase 85 (11 November 2026).
// Its own form (Gynae, "Cervix Ca"), in the QMH GYN-Cervix element order, staged on AJCC version 9 as CAP
// Cervix 5.1.1.0 lists it (the house rule: AJCC version 9 when it exists; the QMH page prints the 8th edition).
// The form takes loop excisions and cones as well as trachelectomies, hysterectomies and exenterations; the
// margins offered follow the procedure. Wording follows the user's own cervical cone reports. Sources:
// docs/reference/cervix-sources.md. Spec: docs/specs/cervical-carcinoma.md. Staging: tests/staging_cervix.test.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTemplate, loadManifest } from '../src/registry.js';
import { createCase, generate, isVisible } from '../src/engine.js';
import { parseIntake, matchParts, presetValues } from '../src/intake.js';
import * as gen from '../generators/cervical_carcinoma.js';
import { UPGRADE_TO } from '../generators/leep.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const FIX = path.join(here, 'fixtures', 'cervical_carcinoma');
const UPDATE = process.env.UPDATE_FIXTURES === '1';
const { schema } = await loadTemplate('cervical_carcinoma');
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
const dxOf = (r) => r.report.slice(r.report.lastIndexOf('\n\n') + 2);
// Rows wrap at 80 characters with a two-space (row) or four-space (sub-row) hanging indent; rejoin them to match a whole row.
const flat = (r) => r.report.replace(/\n {4}(?=\S)/g, ' ').replace(/\n {2}(?!- )(?=\S)/g, ' ');
const { HPVA_SCC, HPVI_SCC, SCC_NOS, HPVA_ADENO, HSIL_ADJ, AIS_ADJ, PROC } = gen;
const GASTRIC = 'Adenocarcinoma, HPV-independent, gastric type';

// A radical hysterectomy for an HPV-associated squamous cell carcinoma: 28 mm, 9 mm deep, negative sentinel nodes.
const RHYST = {
  ...EXAMPLE, procedure: PROC.radicalHyst, additionalProcedures: ['Bilateral salpingo-oophorectomy'], hysterectomyType: 'Laparoscopic',
  tumourSite: ['Left superior (anterior) quadrant (12 to 3 o\'clock)'], tumourSiteOther: '', tumourSizeMm: '28', tumourDims: '28 x 20 x 12',
  specimenDims: '', orientation: '', lesionAppearance: 'Ulcerated tumour', lesionDims: '28 x 20', inking: '', radialSections: false, allEmbedded: false,
  blocks: '24', blockKeyText: '', histType: HPVA_SCC, adenoSubtype: '', sccPattern: 'Non-keratinising', grade: '', p16: 'Positive', doi: '', doiMm: '9',
  doiSite: '', stromaThird: 'Middle one-third', horizontal: 'Not applicable', horizontalBlocks: '', silva: '', extension: ['Not identified'],
  vaginalMargin: 'Uninvolved by invasive carcinoma', vaginalMarginMm: '15', vaginalMarginSite: '', radialMarginMm: '6', radialMarginSite: 'left parametrium',
  pelvicExamined: '4', pelvicSentinel: '4', pelvicMacro: '0', pelvicMicro: '0', pelvicItc: '0', adjacent: [HSIL_ADJ]
};

// ---------- metadata and menus ----------

test('cervix: Gynae cancer resection, labelled Cervix Ca, the QMH page saved, the placeholder gone', () => {
  assert.equal(schema.id, 'cervical_carcinoma');
  assert.equal(schema.system, 'Gynae');
  assert.equal(schema.kind, 'cancer resection');
  assert.equal(schema.label, 'Cervix Ca');
  assert.equal(schema.organ, 'CERVIX');
  assert.equal(manifest.find((t) => t.id === 'cervical_carcinoma')?.label, 'Cervix Ca');
  assert.equal(schema.source.url, 'https://awiloqmh.github.io/CancerReportingTemplate/GYN-Cervix.html');
  assert.equal(schema.source.capProtocol, 'https://documents.cap.org/documents/Cervix_5.1.1.0.REL_CAPCP.pdf');
  assert.ok(fs.existsSync(path.join(root, schema.source.savedPage)));
  assert.ok(fs.existsSync(path.join(root, schema.source.grounding)));
  assert.ok(fs.existsSync(path.join(root, 'docs/reference/qmh/cervix.txt')));
  const planned = JSON.parse(fs.readFileSync(path.join(root, 'templates/planned.json'), 'utf8')).planned;
  assert.ok(!planned.some((t) => t.id === 'cervical_carcinoma' || t.qmh === 'GYN-Cervix'));
  assert.equal(schema.options.find((o) => o.id === 'printPTNM' || o.$use === 'printPTNM')?.label, 'Print the pTNM block (AJCC 9th edition)');
});

test('cervix: the example sets every field, and every field sits in a group', () => {
  for (const f of schema.fields) {
    assert.ok(Object.hasOwn(EXAMPLE, f.id), `example sets ${f.id}`);
    assert.ok(f.group, `${f.id} has a group`);
  }
  const r = run();
  assert.deepEqual(r.issues.filter((i) => i.level !== 'info'), [], 'the example raises no warnings');
});

test('cervix: the type list follows CAP and WHO; subtype, pattern and Silva show for their types only', () => {
  const types = field('histType').options;
  for (const t of [HPVA_SCC, HPVI_SCC, SCC_NOS, HPVA_ADENO, GASTRIC, 'Adenocarcinoma, HPV-independent, clear cell type',
    'Adenocarcinoma, HPV-independent, mesonephric type', 'Adenosquamous carcinoma', 'Small cell neuroendocrine carcinoma']) assert.ok(types.includes(t), t);
  assert.equal(isVisible(field('adenoSubtype'), { ...EXAMPLE, histType: HPVA_ADENO }), true);
  assert.equal(isVisible(field('adenoSubtype'), { ...EXAMPLE, histType: GASTRIC }), false);
  for (const t of [HPVA_SCC, HPVI_SCC, SCC_NOS]) assert.equal(isVisible(field('sccPattern'), { ...EXAMPLE, histType: t }), true, t);
  assert.equal(isVisible(field('sccPattern'), { ...EXAMPLE, histType: HPVA_ADENO }), false);
  assert.equal(isVisible(field('silva'), { ...EXAMPLE, histType: HPVA_ADENO }), true, 'Silva for HPV-associated adenocarcinoma');
  assert.equal(isVisible(field('silva'), { ...EXAMPLE, histType: GASTRIC }), false);
  assert.ok(field('adenoSubtype').options.includes('Invasive stratified mucin-producing carcinoma (iSMC)'));
  assert.deepEqual(field('p16').options, ['Positive', 'Negative', 'Not determined']);
  assert.deepEqual(field('doi').options, ['Not more than 3 mm', 'Greater than 3 mm but not more than 5 mm', 'Greater than 5 mm', 'Cannot be determined']);
});

test('cervix: the margins offered follow the procedure, in the QMH order', () => {
  const MARGINS = ['ecto', 'endo', 'vaginal', 'radial'];
  for (const procedure of field('procedure').options) {
    const v = { ...EXAMPLE, procedure };
    const shown = MARGINS.filter((m) => isVisible(field(`${m}Margin`), v));
    assert.deepEqual(shown, gen.marginsFor(v), procedure);
  }
  assert.deepEqual(gen.marginsFor({ procedure: PROC.cone }), ['ecto', 'endo', 'radial']);
  assert.deepEqual(gen.marginsFor({ procedure: PROC.radicalTrach }), ['endo', 'vaginal', 'radial']);
  assert.deepEqual(gen.marginsFor({ procedure: PROC.radicalHyst }), ['vaginal', 'radial']);
  assert.deepEqual(gen.marginsFor({ procedure: PROC.other }), ['ecto', 'endo', 'vaginal', 'radial']);
  // The precursor line shows only when HSIL or AIS is recorded in the adjacent epithelium.
  assert.equal(isVisible(field('ectoPrecursor'), EXAMPLE), false);
  assert.equal(isVisible(field('ectoPrecursor'), { ...EXAMPLE, adjacent: [HSIL_ADJ] }), true);
  assert.equal(isVisible(field('endoPrecursor'), { ...EXAMPLE, adjacent: [AIS_ADJ] }), true);
  assert.equal(isVisible(field('radialMarginMm'), { ...EXAMPLE, radialMargin: 'Involved by invasive carcinoma' }), false);
  assert.equal(isVisible(field('hysterectomyType'), RHYST), true);
  assert.equal(isVisible(field('hysterectomyType'), EXAMPLE), false);
});

// ---------- synoptic ----------

test('cervix: one Tumour histology paragraph carries the type, site and morphology', () => {
  assert.equal(para(run()), 'Sections of the cervix show involvement by HPV-associated adenocarcinoma, intestinal type, from 4 to 9 o\'clock. '
    + 'Infiltrating glands are lined by atypical intestinal-type epithelium with goblet cells.');
  assert.equal(para(runParts([RHYST])), 'Sections of the cervix show involvement by HPV-associated squamous cell carcinoma with a non-keratinising pattern, '
    + 'in the left superior (anterior) quadrant. Infiltrating nests and sheets of atypical squamous cells show intercellular bridges but no keratin pearls.');
  assert.match(para(run({ histType: GASTRIC, adenoSubtype: '', silva: '', p16: 'Negative', tumourSiteOther: '6 o\'clock' })),
    /^Sections of the cervix show involvement by HPV-independent adenocarcinoma, gastric type, at 6 o'clock\. Infiltrating glands are lined by columnar cells with abundant clear to pale eosinophilic cytoplasm/);
  assert.match(para(run({ ihcOther: 'the tumour cells are positive for CK7 and CEA' })), /goblet cells\. The tumour cells are positive for CK7 and CEA\.$/);
  assert.equal(para(run({ histologyNotes: 'Free text replaces the paragraph' })), 'Free text replaces the paragraph.');
});

test('cervix: depth, proportion, horizontal extent and the blocks involved, as the user reports them', () => {
  const r = run();
  assert.match(r.report, /\n- Depth of stromal invasion: Not more than 3 mm \(deepest 1\.9 mm, 7 o'clock\)\n- Depth of stromal invasion \(proportion\): Superficial one-third\n/);
  assert.match(r.report, /\n- Horizontal extent of stromal invasion: Estimated as greater than 7 mm\n {2}- Number of blocks involved: 6\/11 \(blocks 4 to 9\)\n/);
  assert.equal(gen.depthText({ doi: '', doiMm: '4' }), 'Greater than 3 mm but not more than 5 mm (deepest 4 mm)');
  assert.equal(gen.depthText({ doi: 'Greater than 5 mm', doiMm: '' }), 'Greater than 5 mm');
  assert.equal(gen.depthText({ doi: '', doiMm: '2.5', doiAtLeast: true }), 'Not more than 3 mm (at least 2.5 mm)');
  assert.equal(gen.depthText({ doi: 'Cannot be determined', doiMm: '2', doiReason: 'Tangential sectioning' }), 'Cannot be determined (tangential sectioning)');
  assert.match(run({ horizontal: 'Specify (mm)', horizontalMm: '9' }).report, /\n- Horizontal extent of stromal invasion: 9 mm\n/);
});

test('cervix: margins print under one Surgical margins line, location then distance', () => {
  const r = run();
  assert.match(r.report, /\n- Surgical margins: Uninvolved by invasive adenocarcinoma\n {2}- Ectocervical margin: 7 o'clock, 4\.5 mm\n {2}- Endocervical \/ lower uterine segment margin: 9 o'clock, 2\.6 mm\n {2}- Radial \(circumferential\) margin: 7 o'clock, 3\.3 mm\n/);
  const inv = run({ endoMargin: 'Involved by invasive carcinoma', endoMarginSite: '9 o\'clock', endoMarginMm: '' });
  assert.match(inv.report, /\n- Surgical margins: Involved by invasive adenocarcinoma\n/);
  assert.match(inv.report, /\n {2}- Endocervical \/ lower uterine segment margin: Involved, 9 o'clock\n/, 'the line above names the tumour');
  assert.match(run({ ectoMarginMm: '', ectoMarginSite: '' }).report, /\n {2}- Ectocervical margin: Uninvolved\n/);
  const prec = flat(run({ adjacent: [AIS_ADJ], endoPrecursor: 'Involved by AIS', endoPrecursorSite: '12 o\'clock' }));
  assert.match(prec, /\n {2}- Endocervical \/ lower uterine segment margin: 9 o'clock, 2\.6 mm; involved by AIS, 12 o'clock\n/);
  assert.match(prec, /\n {2}- Ectocervical margin: 7 o'clock, 4\.5 mm; uninvolved by intraepithelial neoplasia\n/);
  const rh = runParts([RHYST]);
  assert.match(rh.report, /\n- Surgical margins: Uninvolved by invasive carcinoma\n {2}- Vaginal cuff margin: 15 mm; uninvolved by intraepithelial neoplasia\n {2}- Radial \(circumferential\) margin: left parametrium, 6 mm\n/);
  const cannot = flat(run({ radialMargin: 'Cannot be assessed', radialMarginSite: 'cautery artefact', radialMarginMm: '' }));
  assert.match(cannot, /\n- Surgical margins: Uninvolved by invasive adenocarcinoma; radial margin cannot be assessed\n/);
  assert.match(cannot, /\n {2}- Radial \(circumferential\) margin: Cannot be assessed \(cautery artefact\)\n/);
});

test('cervix: pelvic and para-aortic nodes, the metastasis line and pTNM; the stage group stays in Checks', () => {
  const r = runParts([RHYST]);
  assert.match(r.report, /\nLymph nodes\n- Pelvic lymph nodes: 4 examined \(sentinel\); none involved\n/);
  assert.match(r.report, /\nPathological stage \(AJCC 9th edition\)\n- pTNM: pT1b2 pN0\(sn\)\n/);
  assert.doesNotMatch(r.report, /FIGO|Stage group|\bIB2\b/);
  assert.ok(r.issues.some((i) => i.level === 'info' && i.message === 'Stage group, AJCC 9th edition, matching FIGO 2018 (reference, not reported): IB2'));
  const pos = runParts([{ ...RHYST, pelvicExamined: '14', pelvicSentinel: '2', pelvicMacro: '2', pelvicMicro: '1', pelvicSites: 'left obturator',
    pelvicDepositMm: '8', pelvicEne: 'Present', paExamined: '5', paMacro: '0', paMicro: '0', paItc: '1' }]);
  assert.match(pos.report, /\n- Pelvic lymph nodes: 14 examined \(2 sentinel\); 3 involved\n {2}- Macrometastasis \(more than 2 mm\): 2 nodes\n {2}- Micrometastasis \(more than 0\.2 mm to 2 mm\): 1 node\n {2}- Site\(s\) with positive lymph nodes: Left obturator\n {2}- Size of largest metastatic deposit: 8 mm\n {2}- Extranodal extension: Present\n- Para-aortic lymph nodes: 5 examined; none involved\n {2}- Isolated tumour cells only: 1 node\n/);
  assert.match(pos.report, /- pTNM: pT1b2 pN1a\n/);
  const adnexa = runParts([{ ...RHYST, extension: ['Right ovary'], distantMets: ['Not identified'] }]);
  assert.match(adnexa.report, /\nDistant metastasis\n- Distant metastasis: Adnexa\n/, 'never "Not identified" beside a pM1');
  assert.match(adnexa.report, /- pTNM: pT1b2 pN0\(sn\) pM1\n/);
  assert.match(messages(adnexa), /AJCC version 9 makes adnexal or uterine serosal involvement pM1 \(stage IVB\); FIGO 2018 does not stage it as IV/);
  const off = run({}, { printPTNM: false });
  assert.doesNotMatch(off.report, /pT1a1/);
  assert.doesNotMatch(run().report, /\nLymph nodes\n/, 'a cone with no nodes prints no node section');
});

test('cervix: the QMH element order, with the documented departures', () => {
  // The order the QMH page prints its report in (updateDescription in the saved page).
  const html = fs.readFileSync(path.join(root, 'docs/reference/GYN-Cervix.html'), 'utf8');
  const fn = html.slice(html.indexOf('function updateDescription'));
  const all = [...fn.matchAll(/"(?:\\n)?"?\s*\+?\s*"?- ([A-Za-z0-9 ,/()-]+?):? ?"/g)].map((m) => m[1].trim());
  const qmh = all.slice(0, all.indexOf('Additional notes') + 1);
  const want = ['Procedure', 'Hysterectomy type', 'Tumor site', 'Tumor size', 'Histologic type', 'Histologic grade', 'p16 immunohistochemistry',
    'Depth of stromal invasion', 'Depth of stromal invasion (proportion)', 'Horizontal extent of stromal invasion', 'Silva pattern of invasion',
    'Other tissue/ organ involvement', 'Lymphovascular invasion', 'Perineural invasion', 'Surgical margins', 'Pelvic lymph nodes examination (all)',
    'Para-aortic lymph nodes examination (all)', 'Distant metastasis', 'Additional pathologic findings', 'Others (specify)', 'Additional notes'];
  const seen = want.map((w) => qmh.indexOf(w));
  assert.ok(seen.every((i) => i >= 0), `QMH labels found: ${qmh.join(' / ')}`);
  assert.deepEqual([...seen].sort((a, b) => a - b), seen, 'the saved QMH page prints in this order');
  assert.ok(qmh.indexOf('Tumor histology and immunohistochemical studies') < qmh.indexOf('Histologic type'), 'QMH opens the section with the histology heading');
  const ours = {
    Procedure: 'Procedure', 'Hysterectomy type': 'Hysterectomy type', 'Tumor site': 'Tumour site', 'Tumor size': 'Tumour size',
    'Histologic type': 'Histologic type', 'Histologic grade': 'Histologic grade', 'p16 immunohistochemistry': 'p16 immunohistochemistry',
    'Depth of stromal invasion': 'Depth of stromal invasion', 'Depth of stromal invasion (proportion)': 'Depth of stromal invasion (proportion)',
    'Horizontal extent of stromal invasion': 'Horizontal extent of stromal invasion', 'Silva pattern of invasion': 'Silva pattern of invasion',
    'Other tissue/ organ involvement': 'Other tissue / organ involvement', 'Lymphovascular invasion': 'Lymphovascular invasion',
    'Perineural invasion': 'Perineural invasion', 'Surgical margins': 'Surgical margins', 'Pelvic lymph nodes examination (all)': 'Pelvic lymph nodes',
    'Para-aortic lymph nodes examination (all)': 'Para-aortic lymph nodes', 'Distant metastasis': 'Distant metastasis',
    'Additional pathologic findings': 'Additional pathologic findings', 'Others (specify)': 'Other findings', 'Additional notes': 'Additional notes'
  };
  const r = runParts([{ ...RHYST, histType: HPVA_ADENO, adenoSubtype: 'Usual type', sccPattern: '', silva: 'Pattern C', grade: 'G2: Moderately differentiated',
    paExamined: '3', paSentinel: '0', distantMets: ['Lung'], additionalFindings: 'Adenomyosis', additionalNotes: 'Block 12 is sent for HPV genotyping' }]);
  const labels = r.report.split('\n').filter((l) => /^- [^:]+:/.test(l)).map((l) => l.slice(2, l.indexOf(':')));
  const expected = want.map((w) => ours[w]);
  // Departure 1: the Tumour histology paragraph follows perineural invasion (the user's cone reports) instead of opening the section.
  expected.splice(expected.indexOf('Perineural invasion') + 1, 0, 'Tumour histology');
  // Departure 2: the pTNM block follows Distant metastasis; the FIGO stage is not printed (Checks only).
  expected.splice(expected.indexOf('Distant metastasis') + 1, 0, 'pTNM');
  // Departure 3: sentinel nodes are counted within the pelvic and para-aortic rows, not as rows of their own.
  assert.deepEqual(labels, expected);
  assert.doesNotMatch(r.report, /FIGO Stage|sentinel lymph nodes examination/i);
});

test('cervix: HPV PCR prints under MOLECULAR FINDINGS with the genotype', () => {
  const r = runParts([{ ...RHYST, hpvPcr: 'High-risk HPV detected', hpvGenotype: 'HPV 18' }], { includeHeader: true });
  assert.match(r.report, /\nMOLECULAR FINDINGS:\nHPV testing\n- HPV PCR: High-risk HPV detected \(HPV 18\)\n\nDIAGNOSIS:/);
  assert.doesNotMatch(run({}, { includeHeader: true }).report, /MOLECULAR FINDINGS/);
});

// ---------- specimen line and diagnosis ----------

test('cervix: specimen line and diagnosis, as the user writes them', () => {
  const r = run();
  assert.match(r.report, /^Cervix, cone biopsy\n/);
  assert.equal(dxOf(r), 'CERVIX, cone biopsy:\n- ADENOCARCINOMA, HPV-associated\n- Margins clear\n- pT1a1 (AJCC 9th edition).');
  assert.equal(dxOf(runParts([RHYST])), 'UTERUS with CERVIX AND BILATERAL ADNEXA, radical hysterectomy and bilateral\nsalpingo-oophorectomy:\n'
    + '- SQUAMOUS CELL CARCINOMA, HPV-associated\n- Margins clear\n- 0 of 4 pelvic sentinel lymph nodes involved\n- pT1b2 pN0(sn) (AJCC 9th edition).');
  const name = (v) => gen.specimenName({ values: { ...EXAMPLE, ...v } });
  assert.equal(name({ procedure: PROC.loop }), 'Cervix, LEEP');
  assert.equal(name({ procedure: PROC.simpleTrach }), 'Cervix, trachelectomy');
  assert.equal(name({ procedure: PROC.radicalTrach }), 'Cervix, radical trachelectomy');
  assert.equal(name({ procedure: PROC.other, procedureOther: 'top-hat endocervical excision' }), 'Cervix, top-hat endocervical excision');
  assert.equal(name({ procedure: PROC.simpleHyst, additionalProcedures: ['Right salpingo-oophorectomy', 'Omentectomy'] }),
    'Uterus with cervix and right adnexa, simple hysterectomy and right salpingo-oophorectomy with omentectomy');
  assert.equal(name({ procedure: PROC.radicalHyst, additionalProcedures: ['Bilateral salpingectomy'] }), 'Uterus with cervix and bilateral fallopian tubes, radical hysterectomy and bilateral salpingectomy');
  assert.equal(name({ procedure: PROC.exent, exenterationOrgans: 'uterus, cervix, vagina and bladder' }), 'Pelvic exenteration (uterus, cervix, vagina and bladder)');
  assert.equal(name({ specimenName: 'Cervix, LLETZ (stitch at 12)' }), 'Cervix, LLETZ (stitch at 12)', 'a typed name is kept');
  // Extension, margins and nodes in the diagnosis.
  const ext = dxOf(runParts([{ ...RHYST, extension: ['Right parametrium', 'Vagina, upper two-thirds'], pelvicExamined: '16', pelvicSentinel: '0', pelvicMacro: '1', pelvicEne: 'Present' }]));
  assert.match(ext, /\n- SQUAMOUS CELL CARCINOMA, HPV-associated, involving the right parametrium and\n {2}the upper two-thirds of the vagina\n/);
  assert.match(ext, /\n- 1 of 16 pelvic lymph nodes involved; extranodal extension present\n- pT2b pN1a \(AJCC 9th edition\)\.$/);
  assert.match(dxOf(runParts([{ ...RHYST, extension: ['Right parametrium', 'Left parametrium'] }])), /, involving both parametria\n/);
  assert.match(dxOf(run({ radialMargin: 'Involved by invasive carcinoma', radialMarginSite: '7 o\'clock', radialMarginMm: '' })), /\n- Radial margin involved by invasive adenocarcinoma\n/);
  assert.match(dxOf(run({ adjacent: [AIS_ADJ], endoPrecursor: 'Involved by AIS', endoPrecursorSite: '12 o\'clock' })), /\n- Margins clear of invasive adenocarcinoma; AIS at the endocervical margin\n/);
  assert.match(dxOf(run({ ectoMargin: 'Cannot be assessed', endoMargin: 'Cannot be assessed', radialMargin: 'Cannot be assessed' })), /\n- Margins cannot be assessed\n/);
  assert.match(dxOf(runParts([{ ...RHYST, pelvicExamined: '2', pelvicSentinel: '2', pelvicItc: '1' }])), /\n- 0 of 2 pelvic sentinel lymph nodes involved; isolated tumour cells in 1 node\n- pT1b2 pN0\(i\+\)\(sn\)/);
  assert.match(dxOf(runParts([{ ...RHYST, histType: 'Carcinosarcoma (malignant mixed Mullerian tumour)', sccPattern: '' }])), /\n- CARCINOSARCOMA\n/);
  assert.match(dxOf(runParts([{ ...RHYST, histType: SCC_NOS }])), /\n- SQUAMOUS CELL CARCINOMA\n/, '", NOS" is dropped');
  // Two parts: lettered heads.
  const two = runParts([EXAMPLE, { ...RHYST }]);
  assert.match(two.report, /\n\(A\) CERVIX, cone biopsy:\n/);
  assert.match(two.report, /\n\(B\) UTERUS with CERVIX AND BILATERAL ADNEXA, radical hysterectomy/);
});

// ---------- checks ----------

test('cervix: checks for the type, p16 and HPV testing', () => {
  assert.ok(run({ histType: '' }).issues.some((i) => i.level === 'error' && i.message === 'Histologic type not recorded.'));
  assert.ok(run({ procedure: '' }).issues.some((i) => i.level === 'error' && i.message === 'Procedure not recorded.'));
  assert.match(messages(run({ p16: 'Negative' })), /p16 negative with an HPV-associated type/);
  assert.match(messages(runParts([{ ...RHYST, histType: HPVI_SCC }])), /p16 positive with an HPV-independent type/);
  assert.match(messages(runParts([{ ...RHYST, histType: SCC_NOS, p16: '' }])), /Squamous cell carcinoma, NOS: p16 immunohistochemistry or HPV testing separates/);
  assert.doesNotMatch(messages(runParts([{ ...RHYST, histType: SCC_NOS, p16: 'Positive' }])), /separates HPV-associated/);
  assert.match(messages(runParts([{ ...RHYST, histType: HPVI_SCC, p16: 'Negative', hpvPcr: 'High-risk HPV detected' }])), /High-risk HPV detected with an HPV-independent type/);
  assert.match(messages(run({ hpvPcr: 'High-risk HPV not detected' })), /High-risk HPV not detected in an HPV-associated carcinoma/);
  assert.match(messages(run({ silva: '' })), /Silva pattern of invasion not recorded/);
});

test('cervix: checks for depth, size, horizontal extent and the visible lesion', () => {
  assert.match(messages(run({ doiMm: '4' })), /The depth category chosen \(Not more than 3 mm\) does not match the measurement \(4 mm is "Greater than 3 mm but not more than 5 mm"\)/);
  assert.match(messages(run({ doi: '', doiMm: '' })), /Depth of stromal invasion not recorded: pT1a1, pT1a2 and pT1b need it\./);
  assert.match(messages(runParts([{ ...RHYST, tumourSizeMm: '' }])), /Tumour size not recorded: pT1b1 to pT1b3 and pT2a1 \/ pT2a2 need it\./);
  assert.doesNotMatch(messages(runParts([{ ...RHYST, tumourSizeMm: '', sizeReason: 'fragmented' }])), /Tumour size not recorded/);
  const r = run();
  assert.ok(r.issues.some((i) => i.level === 'info' && /^Horizontal extent over 7 mm: it no longer changes the category/.test(i.message)));
  assert.ok(r.issues.some((i) => i.level === 'info' && i.message === 'Stage group, AJCC 9th edition, matching FIGO 2018 (reference, not reported): IA1 if the regional nodes are negative (no lymph nodes examined)'));
  assert.match(messages(run({ lvi: 'Present' })), /Lymphovascular invasion does not change the category/);
  const visible = run({ lesionAppearance: 'Exophytic tumour', lesionDims: '8 x 6', tumourSizeMm: '8' });
  assert.match(visible.report, /- pTNM: pT1b1\n/);
  assert.match(messages(visible), /A macroscopically visible tumour is pT1b whatever the depth/);
});

test('cervix: checks for extension, margins and the nodes', () => {
  assert.match(messages(runParts([{ ...RHYST, extension: [] }])), /Other tissue \/ organ involvement not recorded: the parametrium and the vagina set pT2\./);
  assert.match(messages(run({ ectoMargin: 'Involved by invasive carcinoma', ectoMarginSite: '', ectoMarginMm: '' })), /Ectocervical margin involved: give the location\./);
  assert.match(messages(run({ adjacent: [HSIL_ADJ], ectoPrecursor: 'Involved by HSIL (CIN 2-3)', ectoPrecursorSite: '' })), /Ectocervical margin involved by intraepithelial neoplasia: give the location\./);
  const over = runParts([{ ...RHYST, pelvicExamined: '2', pelvicSentinel: '2', pelvicMacro: '2', pelvicMicro: '1' }]);
  assert.ok(over.issues.some((i) => i.level === 'error' && /the node counts add up to 3, more than the 2 examined/.test(i.message)));
  assert.ok(runParts([{ ...RHYST, pelvicSentinel: '6' }]).issues.some((i) => i.level === 'error' && /6 sentinel nodes is more than the 4 examined/.test(i.message)));
  assert.ok(runParts([{ ...RHYST, pelvicExamined: '', pelvicSentinel: '', pelvicMacro: '1' }]).issues.some((i) => i.level === 'error' && /node counts are recorded but no node is examined/.test(i.message)));
  assert.match(messages(runParts([{ ...RHYST, pelvicExamined: '10', pelvicSentinel: '0', pelvicMicro: '1', pelvicDepositMm: '4', pelvicEne: 'Not identified' }])), /the largest deposit \(4 mm\) is a macrometastasis, but none is counted/);
  assert.match(messages(runParts([{ ...RHYST, pelvicExamined: '10', pelvicSentinel: '0', pelvicMacro: '1', pelvicDepositMm: '1.5', pelvicEne: 'Not identified' }])), /a macrometastasis is counted, but the largest deposit is 1\.5 mm/);
  assert.match(messages(runParts([{ ...RHYST, pelvicExamined: '10', pelvicSentinel: '0', pelvicMacro: '1' }])), /Pelvic: extranodal extension not recorded\./);
  assert.match(messages(runParts([{ ...RHYST, pelvicExamined: '', pelvicSentinel: '' }])), /No lymph nodes are recorded with a radical procedure, so pN is not assigned\. Nodes sent as separate parts can be counted here, all parts together\./);
  assert.match(messages(runParts([{ ...RHYST, extension: ['Left fallopian tube'], distantMets: ['Not identified'] }])), /Distant metastasis is "Not identified", but adnexa is recorded as involved/);
  assert.match(messages(run({ tnmOverride: 'pT1a2 pNX' })), /pTNM override has no reason\./);
  assert.match(messages(run({ postTherapy: true })), /After neoadjuvant therapy \(y\): record the treatment effect\./);
});

// ---------- intake ----------

test('cervix intake: excisions with a carcinoma history and radical operations open the form; biopsies and HSIL excisions do not', () => {
  assert.equal(route('(A) Cervix, cone biopsy (stitch at 12 o\'clock)', 'adenocarcinoma on biopsy').templateId, 'cervical_carcinoma');
  assert.equal(route('(A) Cervix, LLETZ', 'SCC on punch biopsy').templateId, 'cervical_carcinoma');
  assert.equal(route('(A) Uterus, radical hysterectomy').templateId, 'cervical_carcinoma');
  assert.equal(route('(A) Wertheim\'s hysterectomy').templateId, 'cervical_carcinoma');
  assert.equal(route('(A) Cervix, radical trachelectomy', 'SCC cervix').templateId, 'cervical_carcinoma');
  assert.equal(route('(A) Uterus and cervix, total hysterectomy', 'Ca cervix IA1 on cone').templateId, 'cervical_carcinoma');
  assert.equal(route('(A) Pelvic exenteration', 'recurrent cervical carcinoma').templateId, 'cervical_carcinoma');
  assert.equal(route('(A) Pelvic exenteration', 'rectal cancer').templateId, 'generic', 'an exenteration for another cancer');
  assert.equal(route('(A) Cervix, LEEP', 'HSIL').templateId, 'cervical_excision', 'an HSIL excision stays on the LEEP form');
  assert.equal(route('(A) Cervix, cone biopsy', 'CIN 3, ?invasion').templateId, 'cervical_biopsy', 'a query is not a carcinoma history');
  assert.equal(route('(A) Cervix, biopsy', 'SCC cervix').templateId, 'cervical_biopsy', 'a biopsy stays on the biopsy form');
  assert.equal(route('(A) Endocervical curettings', 'SCC cervix').templateId, 'cervical_biopsy');
  assert.equal(route('(A) Uterus, radical hysterectomy', 'endometrial carcinoma').templateId, 'endometrial_carcinoma');
  assert.equal(route('(A) Uterus and cervix, total hysterectomy', 'post-menopausal bleeding, carcinoma on pipelle').templateId, 'endometrial_carcinoma');
  assert.equal(route('(A) Uterus and bilateral adnexa, TAHBSO', 'endometrial carcinoma').templateId, 'endometrial_carcinoma');
  assert.equal(route('(A) Right pelvic lymph nodes', 'cervical cancer').templateId, 'lymph_node');
  assert.equal(route('(A) Cervix, frozen section', 'SCC').templateId, 'frozen_section');
});

test('cervix intake: procedure, adnexa and orientation from the line', () => {
  assert.deepEqual(preset('(A) Cervix, cone biopsy (stitch at 12 o\'clock)', 'adenocarcinoma on biopsy'), { procedure: 'Cone biopsy', orientation: 'stitch at 12 o\'clock' });
  assert.deepEqual(preset('(A) Cervix, LLETZ', 'SCC on punch biopsy'), { procedure: 'Loop excision (LEEP / LLETZ)' });
  assert.deepEqual(preset('(A) Uterus, cervix and bilateral adnexa, radical hysterectomy and BSO', 'Ca cervix IB1'),
    { procedure: 'Radical hysterectomy', additionalProcedures: ['Bilateral salpingo-oophorectomy'] });
  assert.equal(preset('(A) Cervix, radical trachelectomy', 'SCC cervix').procedure, 'Radical trachelectomy');
  assert.equal(preset('(A) Uterus and cervix, total hysterectomy', 'Ca cervix IA1 on cone').procedure, 'Simple hysterectomy');
  assert.equal(preset('(A) Total pelvic exenteration', 'carcinoma of the cervix').procedure, 'Pelvic exenteration');
});

// ---------- upgrade from the LEEP form ----------

test('upgrade: a LEEP or cone with invasive carcinoma ticked maps to the synoptic', () => {
  assert.equal(UPGRADE_TO.to, 'cervical_carcinoma');
  assert.equal(UPGRADE_TO.label, 'Upgrade this part');
  assert.ok(UPGRADE_TO.when({ specimenType: 'LEEP', squamous: 'Squamous cell carcinoma', glandular: 'Negative' }));
  assert.ok(UPGRADE_TO.when({ specimenType: 'Cone biopsy', squamous: 'Negative', glandular: 'Adenocarcinoma, HPV-associated' }));
  assert.ok(!UPGRADE_TO.when({ specimenType: 'LEEP', squamous: 'HSIL (CIN III)', glandular: 'Negative' }), 'not for HSIL');
  assert.ok(!UPGRADE_TO.when({ specimenType: 'Endocervical curettings', squamous: 'Squamous cell carcinoma', glandular: 'Negative' }), 'not for curettings');
  const m = UPGRADE_TO.map({ specimenType: 'LEEP', orientation: 'cut at 12 o\'clock', blocks: '12', squamous: 'Squamous cell carcinoma', positions: '4 to 7 o\'clock',
    lsilBackground: 'Present', p16: 'Block positive', sccType: 'Non-keratinising', invasionDepth: '2.2', horizontalExtent: '5', lvi: 'Not identified', glandular: 'Negative',
    ectoMargin: 'Involved by HSIL', ectoPositions: '8 o\'clock', endoMargin: 'Not assessable (denuded / cautery artefact)', endoPositions: '', deepMargin: 'Clear',
    clearance: '1.5', clearanceMargin: 'Deep stromal', benign: 'Chronic cervicitis', additionalNotes: '' });
  assert.deepEqual(m, {
    procedure: 'Loop excision (LEEP / LLETZ)', orientation: 'cut at 12 o\'clock', blocks: '12', tumourSite: ['Other (specify)'], tumourSiteOther: '4 to 7 o\'clock',
    histType: HPVA_SCC, sccPattern: 'Non-keratinising', doiMm: '2.2', horizontal: 'Specify (mm)', horizontalMm: '5', lvi: 'Not identified', p16: 'Positive',
    adjacent: ['Low-grade squamous intraepithelial lesion (CIN 1)', HSIL_ADJ, 'Inflammation'], ectoPrecursor: 'Involved by HSIL (CIN 2-3)', ectoPrecursorSite: '8 o\'clock',
    endoMargin: 'Cannot be assessed', endoMarginSite: 'denuded / cautery artefact', radialMarginMm: '1.5'
  });
  const a = UPGRADE_TO.map({ specimenType: 'Top-hat endocervical excision', squamous: 'Negative', glandular: 'Adenocarcinoma, HPV-independent (gastric type)', p16: 'Negative', endoMargin: 'Involved by AIS', endoPositions: '1 o\'clock', deepMargin: 'Involved' });
  assert.equal(a.procedure, 'Other (specify)');
  assert.equal(a.procedureOther, 'Top-hat endocervical excision');
  assert.equal(a.histType, GASTRIC);
  assert.equal(a.radialMargin, 'Involved by invasive carcinoma');
  assert.deepEqual(a.adjacent, [AIS_ADJ]);
  assert.equal(UPGRADE_TO.map({ specimenType: 'LEEP', squamous: 'Squamous cell carcinoma', p16: 'Not performed' }).histType, SCC_NOS, 'no p16, no HPV status');
  assert.equal(UPGRADE_TO.map({ specimenType: 'LEEP', squamous: 'Squamous cell carcinoma', glandular: 'Adenocarcinoma, HPV-associated' }).histType, undefined, 'both ticked: the type is left to the pathologist');
  // Every mapped value is a field of the synoptic, with an option it offers.
  for (const out of [m, a]) {
    for (const [k, val] of Object.entries(out)) {
      const f = field(k);
      assert.ok(f, k);
      if (f.options) for (const x of [].concat(val)) assert.ok(f.options.includes(x), `${k}: ${x}`);
    }
  }
  // The mapped part renders cleanly on the synoptic.
  const r = runParts([{ ...schema.fields.reduce((o, f) => ({ ...o, [f.id]: EXAMPLE[f.id] }), {}), ...Object.fromEntries(Object.keys(EXAMPLE).map((k) => [k, ''])),
    adjacent: [], extension: [], distantMets: [], additionalProcedures: [], tumourSite: [], ...m }]);
  assert.doesNotMatch(r.report, /undefined|\[object|NaN/);
  assert.match(r.report, /- pTNM: pT1a1\n/);
});

// ---------- golden reports ----------

// Written on first run, compared after; edit deliberately (UPDATE_FIXTURES=1 rewrites).
const CASES = [
  ['01-cone-hpva-adenocarcinoma-pt1a1', 'cone biopsy with an HPV-associated adenocarcinoma of intestinal type, 1.9 mm deep and more than 7 mm wide, Silva pattern A, margins clear with distances, no nodes, pT1a1, the example', [EXAMPLE]],
  ['02-radical-hysterectomy-scc-pt1b2-sentinel', 'radical hysterectomy and bilateral salpingo-oophorectomy for an ulcerated HPV-associated non-keratinising squamous cell carcinoma, 28 mm and 9 mm deep, adjacent HSIL, margins clear, four negative pelvic sentinel nodes, pT1b2 pN0(sn)', [RHYST]],
  ['03-radical-trachelectomy-parametrium-pn1a', 'radical trachelectomy for an HPV-independent gastric-type adenocarcinoma involving the left parametrium with lymphovascular invasion, radial margin involved, one pelvic macrometastasis with extranodal extension, pT2b pN1a', [{
    ...RHYST, procedure: PROC.radicalTrach, additionalProcedures: [], hysterectomyType: 'Not specified', tumourSite: ['Right inferior (posterior) quadrant (6 to 9 o\'clock)'],
    tumourSizeMm: '19', tumourDims: '19 x 15 x 11', lesionAppearance: 'Endophytic / infiltrative tumour', lesionDims: '19 x 15', blocks: '20', histType: GASTRIC,
    sccPattern: '', p16: 'Negative', doiMm: '11', stromaThird: 'Deep one-third', lvi: 'Present', extension: ['Left parametrium'],
    endoMargin: 'Uninvolved by invasive carcinoma', endoMarginSite: '', endoMarginMm: '12', vaginalMarginMm: '9', radialMargin: 'Involved by invasive carcinoma',
    radialMarginSite: 'left parametrium', radialMarginMm: '', pelvicExamined: '16', pelvicSentinel: '2', pelvicMacro: '1', pelvicSites: 'left external iliac',
    pelvicDepositMm: '6', pelvicEne: 'Present', adjacent: ['None identified']
  }]]
];
for (const [name, description, parts] of CASES) {
  test(`golden: ${name}`, () => {
    const r = runParts(parts);
    const file = path.join(FIX, `${name}.json`);
    const current = { description, templateId: 'cervical_carcinoma', options: OPTIONS, values: parts, report: r.report, checks: r.issues };
    if (UPDATE || !fs.existsSync(file)) {
      fs.mkdirSync(FIX, { recursive: true });
      fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n');
    }
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(r.report, saved.report, `${file} changed; re-run with UPDATE_FIXTURES=1 only after a deliberate wording change`);
    assert.deepEqual(r.issues, saved.checks, `${file} checks changed`);
    assert.doesNotMatch(r.report, /undefined|\[object|NaN|\S {2,}/);
  });
}
