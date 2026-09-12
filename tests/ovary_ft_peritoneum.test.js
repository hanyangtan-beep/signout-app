// Ovary / fallopian tube / peritoneum resection (synoptic) - generator, fixtures, QMH element order and the frozen link.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate, generateCase } from '../src/engine.js';
import { loadAll } from '../src/registry.js';
import { prefillFromFrozen, otherParts, findingText, gradeOf, suggestedPrimary } from '../generators/ovary_ft_peritoneum.js';
import { parseSynoptic } from '../src/synoptic.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(here, 'fixtures', 'ovary');
const UPDATE = process.argv.includes('--update');
const registry = await loadAll();
const { schema, generator } = registry.ovary_ft_peritoneum;
const EX = schema.example.parts[0].values;

function run(patch = {}, options = {}) {
  const values = { ...EX, ...patch };
  const cs = { schemaId: 'ovary_ft_peritoneum', caseTitle: '', options: { ...schema.example.options, ...options }, parts: [{ label: 'A', values }] };
  return generate(schema, generator, cs);
}
const rows = (out) => Object.fromEntries(parseSynoptic(out.synoptic).filter((r) => r.label).map((r) => [r.label, r.value]));
const flat = (d) => d.split('\n\n')[0].replace(/\n- /g, ' - ').replace(/\s+/g, ' ');
const info = (out) => out.issues.filter((i) => i.level === 'info').map((i) => i.message);
const warns = (out) => out.issues.filter((i) => i.level === 'warn').map((i) => i.message);
const errs = (out) => out.issues.filter((i) => i.level === 'error').map((i) => i.message);
const figo = (out) => info(out).find((m) => m.startsWith('FIGO 2014 (reference'))?.replace(/^.*: /, '');

// One-part cases: no other letters, no omentum, nodes as stated.
const SOLO = { otherParts: '', otherInvolvement: ['Not identified'], extrapelvicFocus: 'Not applicable', extrapelvicFocusMm: '', extrapelvicSite: '', nodesExamined: '', nodesSites: '', nodesMacro: '', nodesMicro: '', nodesItc: '', nodeDepositMm: '', nodeDepositSite: '', nodeMm: '', nodeSite: '', nodeEne: 'Not applicable', blockKeyText: '1-6 Ovarian tumour, including surface\n7 Fallopian tube, entirely embedded (SEE-FIM)', tubeMacro: '', ancillary: '' };
const NO_TUBE = { tubalMucosa: 'Not applicable / tubes not submitted', additionalFindings: [], integrityRT: 'Not applicable' };

// Fixture patches (spec: docs/specs/ovary-pair.md, Part 3 fixtures list).
const CASES = [
  ['01-hgsc-tubo-ovarian-ic3', { ...SOLO, tumourSite: 'Right tubo-ovarian', ovarianSurface: 'Not identified', peritonealFluid: 'Malignant cells present', nodesExamined: '12', nodesSites: 'right pelvic 12', nodesMacro: '0', nodesMicro: '0', nodesItc: '0', nodeEne: 'Not applicable', otherParts: 'B) Lymph nodes, right pelvic, dissection - nodes 0/12', lvi: 'Not identified' }],
  ['02-hgsc-bilateral-nact-iiic', { procedures: ['Total hysterectomy and bilateral salpingo-oophorectomy', 'Omentectomy'], hysterectomyType: 'Abdominal', integrityRO: 'Capsule intact', integrityLO: 'Capsule intact', integrityRT: 'Serosa intact', integrityLT: 'Serosa intact', tumourSite: 'Bilateral tubo-ovarian', ovarianSurface: 'Present, bilateral', tumourSizeMm: '40', tumourDims: '40 x 30 x 25', weight: '', specimenDims: '', cutSurface: ['Solid areas', 'Necrosis'], tubeMacro: '', uterusMacro: 'The uterus with cervix measures 80 x 50 x 35 mm; the endometrium is thin and the myometrium is unremarkable; the serosa bears tumour nodules up to 15 mm', otherMacro: 'The omentum (250 x 150 x 20 mm) contains a firm cake up to 45 mm', blockKeyText: '1-4 Right ovarian tumour\n5-8 Left ovarian tumour\n9-10 Right fallopian tube, entirely embedded\n11-12 Left fallopian tube, entirely embedded\n13 Cervix\n14-15 Endometrium and myometrium\n16 Uterine serosa with tumour\n17-20 Omentum, tumour', otherParts: 'B) Omentum, omentectomy - metastatic, largest deposit 45 mm\nC) Lymph nodes, left pelvic, dissection - nodes 1/5, largest deposit 12 mm', tubalMucosa: 'Not involved (tubes examined entirely, SEE-FIM)', otherIhc: 'WT1 positive, PAX8 positive', otherInvolvement: ['Uterine serosa', 'Omentum'], extrapelvicFocus: 'Macroscopic, more than 2 cm', extrapelvicFocusMm: '45', extrapelvicSite: 'omentum', peritonealFluid: 'Not submitted / unknown', neoadjuvant: true, crs: 'CRS2 (moderate response)', crsSite: 'omentum', vaginalMargin: 'Uninvolved by carcinoma', vaginalMarginMm: '', parametrialMargin: 'Not applicable', nodesExamined: '5', nodesSites: 'left pelvic 5', nodesMacro: '1', nodesMicro: '0', nodesItc: '0', nodeDepositMm: '12', nodeDepositSite: 'left external iliac', nodeMm: '14', nodeSite: 'left external iliac', nodeEne: 'Not identified', additionalFindings: ['Adenomyosis'], ancillary: 'BRCA1/2 tumour testing requested; result to follow', additionalNotes: 'Interval debulking after three cycles of carboplatin and paclitaxel' }],
  ['03-serous-borderline-implants-cystectomy', { ...SOLO, ...NO_TUBE, procedures: ['Left ovarian cystectomy', 'Peritoneal biopsies'], integrityRO: 'Not applicable', integrityLO: 'Fragmented', tumourSite: 'Left ovary', ovarianSurface: 'Not identified', tumourSizeMm: '60', tumourDims: '60 x 45 x 30', weight: '45', specimenDims: '70 x 50 x 30', cutSurface: ['Unilocular cyst', 'Serous fluid', 'Papillary excrescences (inner surface)'], blockKeyText: '1-5 Cyst wall with papillary areas\n6 Pelvic peritoneal biopsy', otherParts: 'B) Peritoneum, pelvic, biopsy - non-invasive epithelial implant', histType: 'Serous borderline tumour', primarySite: 'Derive from the tumour site, tubal mucosa and STIC', lvi: 'Not identified', p53: 'Not performed', otherIhc: '', implants: 'Present, non-invasive epithelial (specify site)', implantsSite: 'pelvic peritoneum', otherInvolvement: ['Pelvic peritoneum'], peritonealFluid: 'Malignant cells not identified' }],
  ['04-mucinous-expansile-ia', { ...SOLO, tumourSite: 'Right ovary', ovarianSurface: 'Not identified', tumourSizeMm: '180', tumourDims: '180 x 150 x 110', weight: '1450', specimenDims: '185 x 155 x 110', cutSurface: ['Multilocular cyst', 'Mucinous contents', 'Solid areas'], histType: 'Mucinous adenocarcinoma', mucinousGrade: 'Low-grade, growth pattern-based (expansile growth, or infiltrative growth in 10% or less)', tubalMucosa: 'Not involved (representative sections)', lvi: 'Not identified', p53: 'Not performed', otherIhc: 'CK7 positive, CK20 focally positive, CDX2 negative, SATB2 negative, PAX8 negative', additionalFindings: [], peritonealFluid: 'Malignant cells not identified' }],
  ['05-endometrioid-g2-endometriosis-ic2', { ...SOLO, tumourSite: 'Left ovary', procedures: ['Left salpingo-oophorectomy'], integrityRO: 'Not applicable', integrityLO: 'Capsule intact', integrityRT: 'Not applicable', integrityLT: 'Serosa intact', ovarianSurface: 'Present, left', tumourSizeMm: '70', tumourDims: '70 x 55 x 50', weight: '160', specimenDims: '75 x 60 x 50', cutSurface: ['Chocolate-brown fluid', 'Solid areas'], histType: 'Endometrioid carcinoma', solidPct: '6-50% (architectural grade 2)', nuclearGrade: 'Nuclear grade 1-2 (mild to moderate atypia)', microDescription: 'The carcinoma arises in the wall of an endometriotic cyst with adjacent atypical endometriosis', tubalMucosa: 'Not involved (representative sections)', lvi: 'Not identified', p53: 'Normal (wild type)', otherIhc: 'ER positive, PR positive, WT1 negative, Napsin A negative; MMR proteins retained', additionalFindings: ['Endometriosis'], peritonealFluid: 'Malignant cells not identified' }],
  ['06-primary-peritoneal-hgsc-iib', { ...SOLO, procedures: ['Total hysterectomy and bilateral salpingo-oophorectomy', 'Peritoneal tumour debulking'], hysterectomyType: 'Abdominal', integrityRO: 'Capsule intact', integrityLO: 'Capsule intact', integrityRT: 'Serosa intact', integrityLT: 'Serosa intact', tumourSite: 'Primary peritoneum', ovarianSurface: 'Not identified', tubalSurface: 'Not identified', tumourSizeMm: '30', tumourDims: '', weight: '', specimenDims: '', cutSurface: [], uterusMacro: 'The uterus with cervix (70 x 45 x 30 mm) and both adnexa are grossly unremarkable; the rectovaginal peritoneum bears a 30 mm tumour nodule', blockKeyText: '1 Cervix\n2-3 Endometrium and myometrium\n4-5 Right adnexa, tube entirely embedded\n6-7 Left adnexa, tube entirely embedded\n8-11 Peritoneal tumour', tubalMucosa: 'Not involved (tubes examined entirely, SEE-FIM)', additionalFindings: [], otherInvolvement: ['Pelvic peritoneum', 'Rectal wall'], peritonealFluid: 'Malignant cells present', vaginalMargin: 'Uninvolved by carcinoma', parametrialMargin: 'Not applicable' }]
];
const byName = Object.fromEntries(CASES);

test('template metadata and registration', () => {
  assert.equal(schema.id, 'ovary_ft_peritoneum');
  assert.equal(schema.kind, 'cancer resection');
  assert.equal(schema.system, 'Gynae');
  assert.equal(schema.label, 'Ovary / tube / peritoneum Ca');
  assert.match(schema.source.url, /GYN-Ovary\.html$/);
  assert.equal(schema.source.stagingProtocol, 'ovary');
  assert.equal(schema.generator, 'ovary_ft_peritoneum');
  assert.ok(registry.ovary_ft_peritoneum, 'registered');
});

test('example case: HGSC right tubo-ovarian with omentum, nodes and five other letters', () => {
  const out = run();
  const r = rows(out);
  assert.equal(r['Procedure'], 'Right salpingo-oophorectomy');
  assert.equal(r['Tumour site'], 'Right tubo-ovarian');
  assert.equal(r['Histologic grade'], 'Not applicable (high grade by definition)');
  assert.equal(r['Largest extrapelvic peritoneal focus'], 'Macroscopic, more than 2 cm (35 mm), omentum');
  assert.equal(r['Regional lymph nodes'], '9 examined; 2 involved');
  assert.equal(r['Largest metastatic deposit'], '12 mm, right external iliac');
  assert.ok(!('pTNM' in r), 'no stage without printPTNM');
  assert.match(out.synoptic, /^\(A\) Right ovary and fallopian tube, salpingo-oophorectomy\n/, 'part heading kept because other letters exist');
  assert.match(out.report, /^\(A\) Right ovary and fallopian tube, salpingo-oophorectomy\n\(B\) Ovary and fallopian tube, left, salpingo-oophorectomy\n\(C\) Omentum, omentectomy\n\(D\) Lymph nodes, right pelvic, dissection\n\(E\) Peritoneum, biopsies\n\(F\) Uterus and cervix, total hysterectomy\n/);
  const dx = out.diagnosis.split('\n\n');
  assert.equal(dx.length, 6);
  assert.equal(flat(dx[0]), '(A) OVARY AND FALLOPIAN TUBE, right, salpingo-oophorectomy - HIGH-GRADE SEROUS CARCINOMA, tubo-ovarian, 95 mm, ovarian surface involved; see synoptic report - involving the left ovary, left fallopian tube, uterine serosa and omentum; largest extrapelvic peritoneal focus 35 mm; peritoneal fluid positive for malignant cells; lymphovascular invasion present - 2 of 9 regional lymph nodes involved');
  assert.equal(dx[1], '(B) OVARY AND FALLOPIAN TUBE, left, salpingo-oophorectomy - INVOLVED BY HIGH-GRADE SEROUS CARCINOMA');
  assert.equal(dx[2], '(C) OMENTUM, omentectomy - METASTATIC HIGH-GRADE SEROUS CARCINOMA, largest deposit 35 mm');
  assert.equal(dx[3], '(D) LYMPH NODES, right pelvic, dissection - METASTATIC CARCINOMA IN 2 OF 9 LYMPH NODES, largest deposit 12 mm');
  assert.equal(dx[4], '(E) PERITONEUM, biopsies - NO EVIDENCE OF MALIGNANCY');
  assert.equal(dx[5], '(F) UTERUS AND CERVIX, total hysterectomy - SEROSAL INVOLVEMENT BY HIGH-GRADE SEROUS CARCINOMA; no endometrial or cervical lesion');
  assert.equal(figo(out), 'IIIC');
  assert.equal(errs(out).length, 0);
});

test('FIGO stage never appears in the report; only the endometrioid grade says FIGO', () => {
  for (const [, patch] of CASES) {
    const out = run(patch, { printPTNM: true });
    assert.ok(!/FIGO(?! grade)/.test(out.report), `FIGO leaked: ${out.report.match(/.*FIGO.*/)?.[0]}`);
  }
  assert.match(rows(run(byName['05-endometrioid-g2-endometriosis-ic2']))['Histologic grade'], /^FIGO grade 2/);
});

test('printPTNM toggles the pTNM block and the stage clause', () => {
  const off = run(byName['01-hgsc-tubo-ovarian-ic3']);
  assert.ok(!off.synoptic.includes('pTNM'));
  assert.ok(!off.diagnosis.includes('AJCC'));
  const on = run(byName['01-hgsc-tubo-ovarian-ic3'], { printPTNM: true });
  assert.equal(rows(on)['pTNM'], 'pT1c3 pN0');
  assert.equal(rows(on)['Stage group (if cM0)'], 'IC3');
  assert.match(on.diagnosis, /- pT1c3 pN0 \(AJCC 8th edition\), stage IC3 \(if cM0\)/);
  assert.equal(figo(on), 'IC3');
});

test('02: bilateral post-NACT with omental cake and macrometastasis is ypT3c ypN1b, IIIC, with CRS row and y prefix', () => {
  const out = run(byName['02-hgsc-bilateral-nact-iiic'], { printPTNM: true });
  const r = rows(out);
  assert.equal(r['pTNM'], 'ypT3c ypN1b');
  assert.equal(r['Stage group (if cM0)'], 'IIIC');
  assert.equal(r['Chemotherapy response score'], 'CRS2 (moderate response), scored on the omentum');
  assert.equal(r['Hysterectomy type'], 'Abdominal');
  assert.equal(r['Ectocervical / vaginal cuff margin'], 'Uninvolved by carcinoma');
  assert.equal(r['Fallopian tube mucosa'], undefined, 'tubal mucosa prints in the histology paragraph, not as a row');
  assert.match(out.synoptic.replace(/\s+/g, ' '), /tubes are examined entirely \(SEE-FIM\) and the mucosa is not involved/);
  assert.match(flat(out.diagnosis), /^\(A\) UTERUS WITH CERVIX AND BILATERAL ADNEXA, total hysterectomy and bilateral salpingo-oophorectomy - HIGH-GRADE SEROUS CARCINOMA, tubo-ovarian, bilateral, 40 mm, ovarian surface involved; see synoptic report/);
  assert.match(out.diagnosis, /chemotherapy response score CRS2/);
  assert.equal(figo(out), 'IIIC');
});

test('03: serous borderline with non-invasive implants prints no stage, FIGO IIB in Checks only', () => {
  const out = run(byName['03-serous-borderline-implants-cystectomy'], { printPTNM: true });
  const r = rows(out);
  assert.equal(r['Histologic grade'], 'Not applicable (borderline tumour)');
  assert.equal(r['Implants'], 'Present, non-invasive epithelial (pelvic peritoneum)');
  // Borderline tumours are staged (CAP / AJCC 8th); as elsewhere the stage prints only when printPTNM is on.
  assert.equal(r['pTNM'], 'pT2b pNX');
  assert.ok(!('pTNM' in rows(run(byName['03-serous-borderline-implants-cystectomy']))), 'default options: no stage printed');
  assert.match(flat(out.diagnosis), /^\(A\) OVARY, left, cystectomy - SEROUS BORDERLINE TUMOUR, 60 mm, received fragmented; see synoptic report - non-invasive epithelial implants, pelvic peritoneum; involving the pelvic peritoneum/);
  assert.equal(figo(out), 'IIB');
});

test('04: unilateral expansile mucinous carcinoma is pT1a / IA with the metastasis-exclusion note', () => {
  const out = run(byName['04-mucinous-expansile-ia'], { printPTNM: true });
  const r = rows(out);
  assert.equal(r['Histologic grade'], 'Low grade, growth pattern-based (expansile growth or infiltrative growth in 10% or less)');
  assert.equal(r['pTNM'], 'pT1a pNX');
  assert.equal(r['Stage group (if cM0)'], 'IA');
  assert.match(out.synoptic, /Invasion is expansile \(confluent\)/);
  assert.ok(info(out).some((m) => /exclude a metastasis/.test(m)));
  assert.equal(figo(out), 'IA');
});

test('05: endometrioid grade 2 with surface involvement is pT1c2 / IC2', () => {
  const out = run(byName['05-endometrioid-g2-endometriosis-ic2'], { printPTNM: true });
  const r = rows(out);
  assert.equal(r['Histologic grade'], 'FIGO grade 2 (endometrioid carcinoma)');
  assert.equal(r['pTNM'], 'pT1c2 pNX');
  assert.equal(figo(out), 'IC2');
  assert.match(flat(out.diagnosis), /ENDOMETRIOID CARCINOMA, FIGO grade 2, 70 mm, ovarian surface involved; see synoptic report/);
  assert.match(out.synoptic, /p53 shows a wild-type pattern/);
  // nuclear grade 3 upgrades by one
  assert.equal(gradeOf({ histType: 'Endometrioid carcinoma', solidPct: '6-50% (architectural grade 2)', nuclearGrade: 'Nuclear grade 3 (marked atypia in the majority of the tumour)' }).short, 'FIGO grade 3');
});

test('06: primary peritoneal HGSC with normal adnexa cannot be stage I; pelvic disease is pT2b / IIB', () => {
  const out = run(byName['06-primary-peritoneal-hgsc-iib'], { printPTNM: true });
  const r = rows(out);
  assert.equal(r['Tumour site'], 'Primary peritoneum');
  assert.equal(r['pTNM'], 'pT2b pNX');
  assert.equal(figo(out), 'IIB');
  assert.ok(info(out).some((m) => /Primary peritoneal carcinoma: stage cannot be I/.test(m)));
  assert.match(flat(out.diagnosis), /HIGH-GRADE SEROUS CARCINOMA, primary peritoneal, 30 mm; see synoptic report/);
  const noEvidence = run({ ...byName['06-primary-peritoneal-hgsc-iib'], otherInvolvement: ['Not identified'], peritonealFluid: 'Not submitted / unknown' }, { printPTNM: true });
  assert.equal(rows(noEvidence)['pTNM'], 'pTX pNX');
});

test('primary-site rule (WHO 5th) and the mismatch warning', () => {
  assert.equal(suggestedPrimary({ histType: 'High-grade serous carcinoma', tumourSite: 'Right ovary', tubalMucosa: 'Not involved (tubes examined entirely, SEE-FIM)', additionalFindings: [] }), 'ovary');
  assert.equal(suggestedPrimary({ histType: 'High-grade serous carcinoma', tumourSite: 'Right ovary', tubalMucosa: 'Not involved (representative sections)', additionalFindings: ['Serous tubal intraepithelial carcinoma (STIC)'] }), 'tube');
  assert.equal(suggestedPrimary({ histType: 'High-grade serous carcinoma', tumourSite: 'Right tubo-ovarian', tubalMucosa: 'Not involved (representative sections)', additionalFindings: [] }), 'tubo-ovarian');
  assert.equal(suggestedPrimary({ histType: 'Mucinous adenocarcinoma', tumourSite: 'Right ovary' }), null);
  const out = run({ primarySite: 'Ovary' });
  assert.ok(warns(out).some((m) => /WHO 5th rule suggests tubal/.test(m)), warns(out).join(' | '));
  assert.match(out.diagnosis, /HIGH-GRADE SEROUS CARCINOMA, ovarian, 95 mm/);
});

test('other-parts parser and finding vocabulary', () => {
  const v = { histType: 'High-grade serous carcinoma', otherParts: 'B) Ovary and fallopian tube, left, salpingo-oophorectomy - involved\n(C) Omentum, omentectomy: metastatic, largest deposit 35 mm\nD. Lymph nodes, right pelvic, dissection - nodes 2/9, largest deposit 12 mm\nE) Peritoneum, biopsies - negative\nF) Uterus and cervix, total hysterectomy - serosa\nG) Appendix, appendicectomy - nodes 0/3\nH) Lymph node, left pelvic, biopsy\nI) Fallopian tube, left, salpingectomy - STIC\nJ) Skin, abdominal wall, excision - endometriosis' };
  const parts = otherParts(v);
  assert.deepEqual(parts.map((p) => p.label), ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']);
  assert.equal(parts[1].specimen, 'Omentum, omentectomy');
  assert.equal(findingText(parts[0].finding, v), 'INVOLVED BY HIGH-GRADE SEROUS CARCINOMA');
  assert.equal(findingText(parts[1].finding, v), 'METASTATIC HIGH-GRADE SEROUS CARCINOMA, largest deposit 35 mm');
  assert.equal(findingText(parts[2].finding, v), 'METASTATIC CARCINOMA IN 2 OF 9 LYMPH NODES, largest deposit 12 mm');
  assert.equal(findingText(parts[3].finding, v), 'NO EVIDENCE OF MALIGNANCY');
  assert.equal(findingText(parts[4].finding, v), 'SEROSAL INVOLVEMENT BY HIGH-GRADE SEROUS CARCINOMA; no endometrial or cervical lesion');
  assert.equal(findingText(parts[5].finding, v), 'NO EVIDENCE OF MALIGNANCY IN 3 LYMPH NODES (0/3)');
  assert.equal(findingText(parts[6].finding, v), 'SEE SYNOPTIC REPORT');
  assert.equal(findingText(parts[7].finding, v), 'SEROUS TUBAL INTRAEPITHELIAL CARCINOMA');
  assert.equal(findingText(parts[8].finding, v), 'ENDOMETRIOSIS; no evidence of malignancy');
  assert.equal(findingText('fibroid, 30 mm', v), 'FIBROID, 30 mm');
  const out = run({ otherParts: 'H) Lymph node, left pelvic, biopsy\nA) Ovary - involved' });
  assert.ok(warns(out).some((m) => /Part H: no finding/.test(m)));
  assert.ok(errs(out).some((m) => /letter A is this part/.test(m)));
});

test('one-part case drops the (A) letters; typed other parts keep them', () => {
  const solo = run(byName['04-mucinous-expansile-ia']);
  assert.match(solo.report, /^Right ovary and fallopian tube, salpingo-oophorectomy\n/);
  assert.ok(!solo.report.includes('(A)'), solo.report.slice(0, 200));
  assert.match(flat(solo.diagnosis), /^OVARY AND FALLOPIAN TUBE, right, salpingo-oophorectomy - MUCINOUS ADENOCARCINOMA, low grade, 180 mm, capsule intact; see synoptic report/);
  const withB = run({ ...byName['04-mucinous-expansile-ia'], otherParts: 'B) Appendix, appendicectomy - negative' });
  assert.match(withB.report, /^\(A\) Right ovary and fallopian tube, salpingo-oophorectomy\n\(B\) Appendix, appendicectomy\n/);
  assert.match(withB.diagnosis, /\n\n\(B\) APPENDIX, appendicectomy - NO EVIDENCE OF MALIGNANCY$/);
});

test('macro option off removes the macro and block key; heading option prints the LIS headers', () => {
  const off = run({}, { macro: false });
  assert.ok(!off.report.includes('The specimen consists of'));
  assert.ok(!off.report.includes('(1-6)'));
  const hdr = run({}, { includeHeader: true });
  assert.match(hdr.report, /^SPECIMEN:\n/);
});

test('synoptic element order follows the QMH GYN-Ovary page (text-dump order; the importer cannot parse this page)', () => {
  // Element headings from analysis/qmh/ovary.txt in page order, mapped to our row labels.
  const QMH = ['Procedure', 'Hysterectomy type', 'Specimen integrity (right ovary)', 'Specimen integrity (left ovary)', 'Specimen integrity (right fallopian tube)', 'Specimen integrity (left fallopian tube)', 'Tumour site', 'Ovarian surface involvement', 'Fallopian tube surface involvement', 'Tumour size',
    'Histologic type', 'Histologic grade', 'Lymphovascular invasion', 'Largest extrapelvic peritoneal focus', 'Peritoneal / ascitic fluid', 'Chemotherapy response score', 'Other tissue / organ involvement',
    'Ectocervical / vaginal cuff margin', 'Parametrial / paracervical margin', 'Number examined', 'With metastasis more than 10 mm', 'With metastasis 10 mm or less', 'With isolated tumour cells only (0.2 mm or less)', 'Largest metastatic deposit', 'Largest involved lymph node', 'Extranodal extension',
    'Distant metastasis', 'pTNM'];
  const ours = Object.keys(rows(run(byName['02-hgsc-bilateral-nact-iiic'], { printPTNM: true })));
  let cursor = -1;
  for (const label of QMH) {
    const idx = ours.indexOf(label);
    assert.ok(idx > cursor, `${label} out of QMH order (index ${idx} after ${cursor}); rows: ${ours.join(' | ')}`);
    cursor = idx;
  }
  // House exceptions: Tumour histology directly after the grade; p53 as a row after LVI (endometrium convention).
  assert.equal(ours.indexOf('Tumour histology'), ours.indexOf('Histologic grade') + 1);
  assert.equal(ours.indexOf('p53 immunohistochemistry'), ours.indexOf('Lymphovascular invasion') + 1);
});

test('checks: node arithmetic, deposit sizes, implants on a carcinoma, CRS without neoadjuvant, override parse', () => {
  assert.ok(errs(run({ nodesExamined: '3', nodesMacro: '2', nodesMicro: '2' })).some((m) => /exceed the number examined/.test(m)));
  assert.ok(errs(run({ nodeDepositMm: '20', nodeMm: '15' })).some((m) => /larger than the largest involved node/.test(m)));
  assert.ok(errs(run({ implants: 'Present, non-invasive epithelial (specify site)' })).some((m) => /not a serous \/ seromucinous borderline/.test(m)));
  assert.ok(warns(run({ crs: 'CRS3 (marked response with no or minimal residual cancer)', neoadjuvant: false })).some((m) => /neoadjuvant box is unticked/.test(m)));
  assert.ok(errs(run({ tnmOverride: 'stage 3' })).some((m) => /could not be parsed/.test(m)));
  const ov = run({ tnmOverride: 'pT3b pN1a', tnmOverrideReason: 'largest focus 18 mm on re-measurement' }, { printPTNM: true });
  assert.match(rows(ov)['pTNM'], /^pT3b pN1a \[pathologist override; derived T3c\/N1b - largest focus 18 mm on re-measurement\]$/);
  assert.ok(warns(run({ ...byName['05-endometrioid-g2-endometriosis-ic2'], tumourSizeMm: '', tumourDims: '' })).some((m) => /Tumour size not recorded/.test(m)));
  assert.ok(errs(run({ histType: 'Serous borderline tumour', implants: 'Present, invasive' })).some((m) => /low-grade serous carcinoma by WHO 5th/.test(m)));
});

test('frozen link: prefillFromFrozen maps the ovarian scenario onto the synoptic values', () => {
  const fv = { scenario: 'Ovarian / adnexal mass', ovSide: 'Right', ovSpecimen: 'Salpingo-oophorectomy', ovReceived: 'Intact', ovSizeMm: '120', ovWeightG: '350', ovSurface: 'Excrescences or papillary projections', ovCut: ['Multilocular cyst', 'Solid areas'], ovType: 'high-grade serous carcinoma' };
  const p = prefillFromFrozen(fv);
  assert.deepEqual(p, { procedures: ['Right salpingo-oophorectomy'], tumourSite: 'Right ovary', integrityRO: 'Capsule intact', integrityLO: 'Not applicable', integrityRT: 'Serosa intact', integrityLT: 'Not applicable', tumourSizeMm: '120', weight: '350', ovarianSurface: 'Present, right', cutSurface: ['Multilocular cyst', 'Solid areas'], histType: 'High-grade serous carcinoma' });
  const cyst = prefillFromFrozen({ scenario: 'Ovarian / adnexal mass', ovSide: 'Left', ovSpecimen: 'Ovarian cystectomy', ovReceived: 'Fragmented (cystectomy or morcellated)', ovType: 'serous borderline tumour', ovSurface: 'Smooth' });
  assert.equal(cyst.procedures[0], 'Left ovarian cystectomy');
  assert.equal(cyst.integrityLO, 'Fragmented');
  assert.equal(cyst.integrityLT, 'Not applicable');
  assert.equal(cyst.histType, 'Serous borderline tumour');
  assert.equal(prefillFromFrozen({ scenario: 'Ovarian / adnexal mass', ovSide: 'Right', ovSpecimen: 'Oophorectomy', ovReceived: 'Opened by surgeon' }).integrityRO, 'Capsule ruptured, intraoperative (surgical spill)');
  assert.equal(prefillFromFrozen({ scenario: 'Ovarian / adnexal mass', ovSide: 'Right', ovSpecimen: 'Oophorectomy', ovReceived: 'Ruptured, capsule defect present on receipt' }).integrityRO, 'Capsule ruptured, preoperative or unknown timing');
  assert.equal(prefillFromFrozen({ scenario: 'Ovarian / adnexal mass', ovType: 'mucinous cystadenoma' }).histType, undefined, 'benign frozen types are not mapped');
  assert.deepEqual(prefillFromFrozen({ scenario: 'Margin' }), {});
  assert.deepEqual(prefillFromFrozen(null), {});
});

test('07 frozen -> synoptic pair: one diagnosis line per letter; the frozen line defers to the synoptic', () => {
  const fs_ = registry.frozen_section;
  const frozenValues = { ...Object.fromEntries(fs_.schema.fields.filter((f) => f.default !== undefined).map((f) => [f.id, f.default])), specimenName: 'Right ovary and fallopian tube', scenario: 'Ovarian / adnexal mass', ovSide: 'Right', ovSpecimen: 'Salpingo-oophorectomy', ovSizeMm: '120', ovWeightG: '350', ovSurface: 'Excrescences or papillary projections', ovCut: ['Solid areas', 'Necrosis'], ovaryResult: 'Malignant', ovType: 'high-grade serous carcinoma', ovBlocks: '2' };
  const patch = prefillFromFrozen(frozenValues);
  const synValues = { ...EX, ...SOLO, ...patch, tumourSite: 'Right tubo-ovarian', tumourDims: '', specimenDims: '', tubalMucosa: 'Involved by invasive carcinoma', otherParts: '', p53: 'Abnormal, Overexpression (strong, diffuse nuclear expression, more than 90%)', otherIhc: 'WT1 positive, PAX8 positive' };
  const cs = { caseTitle: '', options: { includeHeader: false, macro: true, printPTNM: false }, parts: [
    { label: 'A', templateId: 'frozen_section', values: frozenValues },
    { label: 'B', templateId: 'ovary_ft_peritoneum', values: synValues }
  ] };
  const out = generateCase({ frozen_section: fs_, ovary_ft_peritoneum: registry.ovary_ft_peritoneum }, cs);
  const dxLines = out.diagnosis.split('\n').filter((l) => /^\([A-Z]\)/.test(l));
  assert.equal(dxLines.length, 2, out.diagnosis);
  assert.equal(dxLines[0], '(A) OVARY AND FALLOPIAN TUBE, right, salpingo-oophorectomy x frozen section - HIGH-GRADE SEROUS CARCINOMA, see synoptic report');
  assert.match(dxLines[1], /^\(B\) OVARY AND FALLOPIAN TUBE, right, salpingo-oophorectomy$/);
  assert.match(out.diagnosis.replace(/\s+/g, ' '), /\(B\) OVARY AND FALLOPIAN TUBE, right, salpingo-oophorectomy - HIGH-GRADE SEROUS CARCINOMA, tubo-ovarian, 120 mm, ovarian surface involved; see synoptic report/);
  assert.match(out.report, /\(B\) Right ovary and fallopian tube, salpingo-oophorectomy\nSpecimen and tumour/, 'synoptic heading carries the letter in a two-part case');
  assert.match(out.report, /\n\(B\) The specimen consists of a right salpingo-oophorectomy specimen received intact \(350 g/, 'macro lettered');
  assert.match(out.report, /\n\(B1-6\) /, 'block key lettered');
  const file = path.join(FIX, '07-frozen-synoptic-pair.json');
  const current = { templateIds: ['frozen_section', 'ovary_ft_peritoneum'], frozenValues, synopticPatch: { ...SOLO, ...patch, tumourSite: 'Right tubo-ovarian', tumourDims: '', specimenDims: '', tubalMucosa: 'Involved by invasive carcinoma', otherParts: '', p53: synValues.p53, otherIhc: synValues.otherIhc }, options: cs.options, report: out.report, checks: out.issues };
  fs.mkdirSync(FIX, { recursive: true });
  if (UPDATE || !fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n'); return; }
  const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(out.report, saved.report, `${file} changed; re-run with --update only after a deliberate wording change`);
  assert.deepEqual(out.issues, saved.checks, `${file} checks changed`);
});

test('golden fixtures reproduce byte-for-byte', () => {
  fs.mkdirSync(FIX, { recursive: true });
  for (const [name, patch] of CASES) {
    const opts = /^0[26]/.test(name) ? { printPTNM: true } : {};
    const out = run(patch, opts);
    const file = path.join(FIX, `${name}.json`);
    const current = { templateId: 'ovary_ft_peritoneum', patch, options: opts, report: out.report, checks: out.issues };
    if (UPDATE || !fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n'); continue; }
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(out.report, saved.report, `${file} changed; re-run with --update only after a deliberate wording change`);
    assert.deepEqual(out.issues, saved.checks, `${file} checks changed`);
  }
});
