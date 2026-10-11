// Endometrial carcinoma resection (synoptic) - generator, fixtures and QMH element order.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { generate, snippetsFor } from '../src/engine.js';
import { loadAll } from '../src/registry.js';
import { derivedPromise, resolvedPromise } from '../generators/endometrial_carcinoma.js';
import { parseSynoptic } from '../src/synoptic.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(here, 'fixtures', 'endometrium');
const UPDATE = process.argv.includes('--update');
const registry = await loadAll();
const { schema, generator } = registry.endometrial_carcinoma;
const EX = schema.example.parts[0].values;

function run(patch = {}, options = {}) {
  const values = { ...EX, ...patch };
  const cs = { schemaId: 'endometrial_carcinoma', caseTitle: '', options: { ...schema.example.options, ...options }, parts: [{ label: 'A', values }] };
  const out = generate(schema, generator, cs);
  return { ...out, snippets: snippetsFor({ endometrial_carcinoma: registry.endometrial_carcinoma }, cs).filter((s) => s.active).map((s) => s.id).sort() };
}
// "Label: value" rows at every depth (myometrial depth / thickness / percentage are sub-items), wrapped lines rejoined.
const rows = (out) => Object.fromEntries(parseSynoptic(out.synoptic).filter((r) => r.label).map((r) => [r.label, r.value]));
// Fold the multi-line diagnosis (specimen line + "- " clauses, wrapped at 80 columns) back to the old one-line form.
function flat(d) {
  const clauses = [];
  for (const line of d.split('\n')) {
    if (line.startsWith('- ')) clauses.push(line.slice(2));
    else if (clauses.length) clauses[clauses.length - 1] += ` ${line.trim()}`;
    else clauses.push(line.trim()); // specimen line (may wrap without indent)
  }
  return clauses.length > 1 ? `${clauses[0]} - ${clauses.slice(1).join('; ')}` : clauses[0];
}
const info = (out) => out.issues.filter((i) => i.level === 'info').map((i) => i.message);
const figo = (out, yr) => info(out).find((m) => m.startsWith(`FIGO ${yr} (reference, not reported): `))?.slice(`FIGO ${yr} (reference, not reported): `.length);
const NO_MOL = { mmrIhc: 'Not performed', p53: 'Not performed', pole: 'Not performed', otherIhc: '' };

// Fixture patches (spec: docs/specs/endometrial-carcinoma.md).
const CASES = [
  ['01-endometrioid-ia2-nsmp', {}],
  ['02-serous-iicm-p53abn', { histType: 'Serous carcinoma', p53: 'Abnormal, Overexpression (strong, diffuse nuclear expression)', lvsi: 'Present, substantial (5 or more vessels)', pelvicExamined: '12', pelvicMacro: '0', pelvicMicro: '0', pelvicSentinel: false, additionalProcedures: ['Pelvic lymphadenectomy', 'Omentectomy'], additionalFindings: [], microDescription: '', otherIhc: '', vaginalMarginMm: '15' }],
  ['03-polyp-polemut-iam', { tumourSite: 'Endometrial polyp', tumourSiteDetail: '', myoInvasion: 'Not identified', noInvasionExtent: 'Tumour limited to an endometrial polyp (underlying endometrium and myometrium uninvolved)', depthMm: '', myoThicknessMm: '', macroDepthMm: '', macroMyoMm: '', pole: 'Mutated (specify)', poleDetail: 'P286R', pelvicExamined: '0', pelvicMacro: '', pelvicMicro: '', pelvicItc: '', pelvicSentinel: false, additionalProcedures: [], additionalFindings: [], microDescription: '' }],
  ['04-carcinosarcoma-iiic2ii-ivb', { histType: 'Carcinosarcoma (malignant mixed Mullerian tumor)', csSarcomatous: 'Heterologous, rhabdomyosarcoma', tumourNecrosis: 'Present', myoInvasion: 'Estimated 50% or greater myometrial invasion', depthMm: '14', myoThicknessMm: '18', paExamined: '6', paMacro: '1', paMicro: '0', paItc: '0', paEne: 'Present', paDepositMm: '9', pelvicExamined: '10', pelvicMacro: '2', pelvicMicro: '0', pelvicSentinel: false, pelvicEne: 'Not identified', pelvicDepositMm: '6', distantMets: ['Omentum'], additionalProcedures: ['Pelvic lymphadenectomy', 'Para-aortic lymphadenectomy', 'Omentectomy'], additionalFindings: [], microDescription: '', ...NO_MOL }],
  ['05-endometrioid-uterus-ovary-ia3', { otherInvolvement: ['Left ovary'], otherInvolvementDetail: '20 mm endometrioid carcinoma, FIGO grade 1, confined to the left ovary', ovarianSynchronous: true, adnexaMacro: 'The left ovary is enlarged (35 x 25 x 20 mm) by a solid tan tumour; the right adnexa and left tube are unremarkable', additionalFindings: [], microDescription: '', ...NO_MOL }],
  ['06-endocervical-glandular-only', { cervix: 'Endocervical glandular involvement only', mmrIhc: 'Requested; result to follow', p53: 'Requested; result to follow', pole: 'Not performed', otherIhc: '', additionalFindings: [], microDescription: '', peritonealFluid: 'Results pending' }]
];
const byName = Object.fromEntries(CASES);

test('template metadata and registration', () => {
  assert.equal(schema.id, 'endometrial_carcinoma');
  assert.equal(schema.kind, 'cancer resection');
  assert.equal(schema.system, 'Gynae');
  assert.equal(schema.label, 'Endometrial Ca');
  assert.equal(schema.shortName, 'Uterus · cancer resection');
  assert.match(schema.source.url, /GYN-Endometrium\.html$/);
  assert.equal(schema.source.stagingProtocol, 'endometrium');
  assert.match(schema.source.capProtocol, /Endometrium 5\.1\.0\.0/);
  const manifest = JSON.parse(fs.readFileSync(new URL('../templates/manifest.json', import.meta.url), 'utf8'));
  assert.ok(manifest.templates.some((t) => t.id === 'endometrial_carcinoma' && t.kind === 'cancer resection'));
  const ids = new Set(schema.fields.map((f) => f.id));
  for (const id of ['histType', 'grade', 'myoInvasion', 'depthMm', 'myoThicknessMm', 'lvsi', 'cervix', 'serosa', 'otherInvolvement', 'ovarianSynchronous', 'pelvicPeritoneum', 'distantMets', 'pelvicExamined', 'paExamined', 'mmrIhc', 'p53', 'pole', 'promise', 'tnmOverride']) assert.ok(ids.has(id), `field ${id}`);
  assert.ok(schema.example.parts[0].values.histType);
});

test('example case: low-grade endometrioid IA2 NSMP', () => {
  const out = run();
  assert.equal(out.specimens, 'Uterus with cervix and bilateral adnexa, total hysterectomy and bilateral salpingo-oophorectomy with sentinel lymph node biopsy');
  assert.ok(out.macro.startsWith('The specimen consists of an intact uterus with cervix (165 g, 92 x 58 x 44 mm)'));
  assert.equal(out.microscopy, out.synoptic, 'the synoptic is the microscopy block for synoptic templates');
  const r = rows(out);
  assert.equal(r['Tumour histology'], 'Sections show an endometrioid carcinoma with a predominantly glandular architecture of confluent, back-to-back glands lined by stratified columnar cells with elongated, mildly to moderately atypical nuclei; solid non-squamous growth makes up 5% or less of the tumour. There is squamous differentiation with morules and keratinising nests. Tumour necrosis is not seen. Myometrial invasion is by irregular infiltrative glands eliciting a stromal response.');
  assert.ok(out.synoptic.includes('- Myometrial invasion: Estimated less than 50% myometrial invasion\n  - Depth of myometrial invasion: 6 mm\n  - Myometrial thickness: 18 mm\n  - Percentage of myometrial invasion: 33%\n'));
  assert.equal(r['Mismatch repair (MMR) immunohistochemistry'], 'Intact nuclear expression of MLH1, PMS2, MSH2 and MSH6');
  assert.equal(r['Other immunohistochemistry'], 'ER and PR positive');
  assert.deepEqual([...new Set(parseSynoptic(out.synoptic).map((x) => x.section))], ['Specimen and tumour', 'Microscopic findings', 'Margins', 'Lymph nodes', 'Additional findings']);
  assert.ok(out.synoptic.startsWith('Specimen and tumour\n- Procedure: Total hysterectomy and bilateral salpingo-oophorectomy; sentinel\n  lymph node biopsy\n'));
  assert.ok(out.synoptic.includes('\n\nMicroscopic findings\n- Histologic type: Endometrioid carcinoma\n- Histologic grade: FIGO grade 1 (endometrioid carcinoma)\n- Tumour histology:\n  Sections show an endometrioid carcinoma with a predominantly glandular architecture'));
  // The tumour histology paragraph is prose on one line; every other line holds 80 columns.
  assert.equal(out.synoptic.split('\n').find((l) => (l.length > 80 && !/^ {2}(?!- )/.test(l)) || l.includes('\t')), undefined);
  assert.equal(r['Histologic grade'], 'FIGO grade 1 (endometrioid carcinoma)');
  assert.equal(r['Percentage of myometrial invasion'], '33%');
  assert.equal(r['Molecular classification'], 'No specific molecular profile (NSMP)');
  assert.equal(r['Pelvic lymph nodes'], '3 examined; 0 involved; includes sentinel lymph node(s)');
  assert.equal(out.diagnosis, [
    'UTERUS with CERVIX AND BILATERAL ADNEXA, total hysterectomy and bilateral',
    'salpingo-oophorectomy with sentinel lymph node biopsy',
    '- ENDOMETRIOID CARCINOMA, FIGO grade 1, invading less than half of the',
    '  myometrium',
    '- no lymphovascular space invasion; cervix and adnexa uninvolved',
    '- 0 of 3 pelvic lymph nodes involved',
    '- molecular class NSMP'
  ].join('\n'));
  assert.equal(flat(out.diagnosis), 'UTERUS with CERVIX AND BILATERAL ADNEXA, total hysterectomy and bilateral salpingo-oophorectomy with sentinel lymph node biopsy - ENDOMETRIOID CARCINOMA, FIGO grade 1, invading less than half of the myometrium; no lymphovascular space invasion; cervix and adnexa uninvolved; 0 of 3 pelvic lymph nodes involved; molecular class NSMP');
  assert.equal(figo(out, 2009), 'IA');
  assert.equal(figo(out, 2023), 'IA2 - invasion of less than half of the myometrium, non-aggressive histotype');
  assert.deepEqual(out.issues.filter((i) => i.level !== 'info'), []);
  assert.deepEqual(out.snippets, []);
});

test('FIGO stage never appears in the report; grade wording is the only FIGO mention', () => {
  for (const [, patch] of CASES) {
    for (const opts of [{}, { printPTNM: true }, { macro: false }]) {
      const out = run(patch, opts);
      const stripped = out.report.replace(/FIGO grade \d/g, '');
      assert.ok(!/FIGO/.test(stripped), `FIGO leaked into the report: ${stripped.match(/.{0,40}FIGO.{0,40}/)?.[0]}`);
      assert.ok(!/reference, not reported/.test(out.report));
    }
  }
});

test('printPTNM toggles the pTNM block and the diagnosis stage clause', () => {
  const off = run(byName['02-serous-iicm-p53abn']);
  assert.ok(!out2str(off).includes('AJCC'));
  const on = run(byName['02-serous-iicm-p53abn'], { printPTNM: true });
  assert.equal(rows(on)['pTNM'], 'pT1a pN0');
  assert.ok(on.synoptic.includes('\n\nPathological stage (AJCC 8th edition)\n- pTNM: pT1a pN0\n  - Stage group (if cM0): IA\n\nAdditional findings\n- None'));
  assert.ok(!off.synoptic.includes('Pathological stage'));
  assert.ok(on.diagnosis.endsWith('- molecular class p53abn\n- pT1a pN0 (AJCC 8th edition), stage IA (if cM0)'));
  function out2str(o) { return o.report; }
});

test('serous p53abn: IICm reference stage and p53abn snippet', () => {
  const out = run(byName['02-serous-iicm-p53abn']);
  assert.equal(rows(out)['Lymphovascular invasion'], 'Present, extensive / substantial (5 or more vessels)');
  assert.equal(rows(out)['Pelvic lymph nodes'], '12 examined; 0 involved');
  assert.equal(rows(out)['Tumour histology'].split('. ')[0], 'Sections show a serous carcinoma');
  assert.ok(flat(out.diagnosis).includes('SEROUS CARCINOMA, high grade, invading less than half of the myometrium; substantial lymphovascular space invasion'));
  assert.equal(figo(out, 2009), 'IA');
  assert.equal(figo(out, 2023), 'IICm - p53abn with myometrial invasion (aggressive histotype)');
  assert.deepEqual(out.snippets, ['endometrium_p53abn']);
});

test('POLEmut carcinoma confined to a polyp: IAm, no nodes', () => {
  const out = run(byName['03-polyp-polemut-iam']);
  assert.equal(rows(out)['Tumour site'], 'Endometrial polyp');
  assert.equal(rows(out)['Myometrial invasion'], 'Not identified; tumour limited to an endometrial polyp');
  assert.ok(rows(out)['Tumour histology'].startsWith('Sections show an endometrioid carcinoma with a predominantly glandular architecture'));
  assert.ok(!rows(out)['Tumour histology'].includes('Myometrial invasion is by'), 'no invasion-pattern sentence without myoinvasion');
  assert.equal(rows(out)['POLE status'], 'Mutated (P286R)');
  assert.equal(rows(out)['Molecular classification'], 'POLE-mutated carcinoma');
  assert.equal(rows(out)['Pelvic lymph nodes'], undefined, 'no lymph node section without nodes (Phase 67)');
  assert.ok(flat(out.diagnosis).includes('confined to an endometrial polyp; no lymphovascular space invasion; cervix and adnexa uninvolved; molecular class POLEmut'));
  assert.equal(figo(out, 2009), 'IA - nodes not assessed');
  assert.equal(figo(out, 2023), 'IAm - POLEmut confined to the corpus (non-aggressive histotype)');
  assert.deepEqual(out.snippets, ['endometrium_pole_mut']);
  const pt = run(byName['03-polyp-polemut-iam'], { printPTNM: true });
  assert.equal(rows(pt)['pTNM'], 'pT1a');
});

test('carcinosarcoma with para-aortic macrometastasis and omental deposit: IVB, MMR warning', () => {
  const out = run(byName['04-carcinosarcoma-iiic2ii-ivb'], { printPTNM: true });
  const r = rows(out);
  assert.equal(r['Histologic type'], 'Carcinosarcoma');
  assert.ok(out.synoptic.includes('Lymph nodes\n- Pelvic lymph nodes: 10 examined; 2 involved\n  - Macrometastasis (more than 2 mm): 2\n  - Largest metastatic deposit: 6 mm\n  - Extranodal extension: Not identified\n- Para-aortic lymph nodes: 6 examined; 1 involved\n  - Macrometastasis (more than 2 mm): 1\n  - Largest metastatic deposit: 9 mm\n  - Extranodal extension: Present'));
  assert.equal(r['Distant metastasis'], 'Omentum');
  assert.equal(r['Molecular classification'], 'Not performed');
  assert.equal(r['pTNM'], 'pT1b pN2a pM1');
  assert.ok(out.synoptic.includes('- pTNM: pT1b pN2a pM1\n  - Stage group: IVB'));
  assert.ok(out.diagnosis.includes('\n- CARCINOSARCOMA, high grade, invading half or more of the myometrium\n'));
  assert.ok(flat(out.diagnosis).includes('2 of 10 pelvic lymph nodes involved; 1 of 6 para-aortic lymph nodes involved; metastatic carcinoma in the omentum; pT1b pN2a pM1 (AJCC 8th edition), stage IVB'));
  assert.ok(!out.diagnosis.includes('molecular'));
  assert.ok(out.issues.some((i) => i.level === 'warn' && /MMR immunohistochemistry is not recorded/.test(i.message)));
  assert.equal(figo(out, 2009), 'IVB');
  assert.equal(figo(out, 2023), 'IVB - abdominal peritoneal metastasis beyond the pelvis');
  assert.deepEqual(out.snippets, ['endometrium_carcinosarcoma']);
  // without the omentum the para-aortic macrometastasis drives IIIC2ii
  const noOm = run({ ...byName['04-carcinosarcoma-iiic2ii-ivb'], distantMets: ['Not identified'] });
  assert.equal(figo(noOm, 2023), 'IIIC2ii - para-aortic macrometastasis');
  assert.equal(figo(noOm, 2009), 'IIIC2');
});

test('low-grade endometrioid limited to uterus and ovary: IA3 with synchronous-ovary snippet', () => {
  const out = run(byName['05-endometrioid-uterus-ovary-ia3']);
  assert.equal(rows(out)['Other tissue / organ involvement'], 'Left ovary (20 mm endometrioid carcinoma, FIGO grade 1, confined to the left ovary)');
  assert.ok(flat(out.diagnosis).includes('involving the left ovary; cervix uninvolved'));
  assert.equal(figo(out, 2009), 'IIIA');
  assert.equal(figo(out, 2023), 'IA3 - low-grade endometrioid carcinoma limited to the uterus and ovary');
  assert.deepEqual(out.snippets, ['endometrium_synchronous_ovary']);
  const pt = run(byName['05-endometrioid-uterus-ovary-ia3'], { printPTNM: true });
  assert.equal(rows(pt)['pTNM'], 'pT3a pN0');
});

test('endocervical glandular involvement only stays stage I; pending molecular gives the conditional clause', () => {
  const out = run(byName['06-endocervical-glandular-only']);
  assert.equal(rows(out)['Cervical stromal involvement'], 'Endocervical glandular involvement only');
  assert.equal(rows(out)['Mismatch repair (MMR) immunohistochemistry'], 'Requested; result to follow');
  assert.equal(rows(out)['p53 immunohistochemistry'], 'Requested; result to follow');
  assert.equal(rows(out)['Molecular classification'], 'Not classified (testing incomplete)');
  assert.ok(flat(out.diagnosis).includes('endocervical glandular involvement only; adnexa uninvolved; 0 of 3 pelvic lymph nodes involved; molecular classification to follow'));
  assert.equal(figo(out, 2009), 'IA - endocervical glandular involvement only does not raise the stage');
  assert.equal(figo(out, 2023), 'IA2 - invasion of less than half of the myometrium, non-aggressive histotype; would become IICm if p53abn or IAm if POLEmut once the molecular class is confirmed');
  assert.deepEqual(out.snippets, ['endometrium_fluid_pending', 'endometrium_molecular_pending']);
  const pt = run(byName['06-endocervical-glandular-only'], { printPTNM: true });
  assert.equal(rows(pt)['pTNM'], 'pT1a pN0');
});

test('ProMisE derivation: POLE > MMR > p53; NSMP only when both intact and normal', () => {
  const base = { mmrIhc: 'Intact nuclear expression of MLH1, PMS2, MSH2 and MSH6', p53: 'Normal (wild type) expression', pole: 'Wild-type', promise: 'Derive from the results above' };
  assert.equal(derivedPromise(base), 'No specific molecular profile (NSMP)');
  assert.equal(derivedPromise({ ...base, pole: 'Mutated (specify)', mmrIhc: 'Loss of nuclear MMR protein expression (specify)', p53: 'Abnormal, Null (complete absence of nuclear expression)' }), 'POLE-mutated carcinoma');
  assert.equal(derivedPromise({ ...base, mmrIhc: 'Loss of nuclear MMR protein expression (specify)', p53: 'Abnormal, Null (complete absence of nuclear expression)' }), 'Mismatch repair-deficient carcinoma');
  assert.equal(derivedPromise({ ...base, p53: 'Abnormal, Null (complete absence of nuclear expression)' }), 'p53-abnormal carcinoma');
  assert.equal(derivedPromise({ ...base, pole: 'Not performed' }), 'No specific molecular profile (NSMP)');
  assert.equal(derivedPromise({ ...base, mmrIhc: 'Requested; result to follow' }), 'Not classified (testing incomplete)');
  assert.equal(derivedPromise({ mmrIhc: 'Not performed', p53: 'Not performed', pole: 'Not performed' }), 'Not performed');
  assert.equal(resolvedPromise({ ...base, promise: 'Double classifier (explain)' }), 'Double classifier (explain)');
  const mmrd = run({ mmrIhc: 'Loss of nuclear MMR protein expression (specify)', mmrDetail: 'MLH1 and PMS2', otherIhc: '' });
  assert.equal(rows(mmrd)['Mismatch repair (MMR) immunohistochemistry'], 'Loss of nuclear MMR protein expression (MLH1 and PMS2)');
  assert.equal(rows(mmrd)['Molecular classification'], 'Mismatch repair-deficient carcinoma');
  assert.ok(mmrd.diagnosis.endsWith('\n- molecular class MMRd'));
  assert.deepEqual(mmrd.snippets, ['endometrium_mmrd_lynch']);
  assert.equal(figo(mmrd, 2023), 'IA2 - invasion of less than half of the myometrium, non-aggressive histotype');
});

test('macro option; the synoptic block replaces the narrative microscopy in the report', () => {
  const noMacro = run({}, { macro: false });
  assert.equal(noMacro.macro, ''); assert.equal(noMacro.blockKey, '');
  const out = run({}, { includeHeader: true });
  assert.equal(out.microscopy, out.synoptic);
  assert.equal(out.microscopyHeading, 'MICROSCOPIC EXAMINATION AND SYNOPTIC REPORT');
  assert.ok(out.report.includes('MICROSCOPIC EXAMINATION AND SYNOPTIC REPORT:\nSpecimen and tumour\n- Procedure:'));
  assert.ok(!out.report.includes('MICROSCOPIC EXAMINATION:'));
  assert.ok(!schema.options.some((o) => o.id === 'synopticOnly'));
  assert.ok(!('synopticOnly' in schema.example.options));
});

test('synoptic element order follows the saved QMH GYN-Endometrium page', () => {
  const tool = fileURLToPath(new URL('../tools/import-qmh.js', import.meta.url));
  const page = fileURLToPath(new URL('./fixtures/qmh/GYN-Endometrium.html', import.meta.url));
  const draft = JSON.parse(execFileSync(process.execPath, [tool, page], { encoding: 'utf8' }));
  assert.equal(draft.source.page, 'GYN-Endometrium.html');
  assert.match(fs.readFileSync(page, 'utf8'), /Endometrium 5\.1\.0\.0/);
  const MAP = {
    'Histologic type': 'Histologic type', 'Histologic grade': 'Histologic grade', 'MMR status': 'Mismatch repair (MMR) immunohistochemistry', p53: 'p53 immunohistochemistry', 'POLE status': 'POLE status',
    'Myometrial invasion': 'Myometrial invasion', 'Depth of myometrial invasion (mm)': 'Depth of myometrial invasion', 'Myometrial thickness (mm)': 'Myometrial thickness', 'Percentage of myometrial invasion (%)': 'Percentage of myometrial invasion',
    Adenomyosis: 'Adenomyosis', 'Uterine serosa involvement': 'Uterine serosa involvement', 'Lower uterine segment involvement': 'Lower uterine segment involvement', 'Cervical stromal involvement': 'Cervical stromal involvement',
    'Other tissue/ organ involvement': 'Other tissue / organ involvement', 'Lymphovascular invasion': 'Lymphovascular invasion', 'Perineural invasion': 'Perineural invasion', 'Peritoneal/ascitic fluid': 'Peritoneal / ascitic fluid',
    'Ectocervical/vaginal cuff margin': 'Ectocervical / vaginal cuff margin', 'Parametrial/paracervical margin': 'Parametrial / paracervical margin', 'Number of regional lymph nodes examined': 'Pelvic lymph nodes'
  };
  const seen = new Set();
  const qmh = draft.fields.map((f) => (f.outLabel || f.label).trim()).filter((l) => MAP[l] && !seen.has(l) && seen.add(l));
  assert.ok(qmh.length >= 18, `mapped QMH elements: ${qmh.length}`);
  const ours = Object.keys(rows(run(byName['04-carcinosarcoma-iiic2ii-ivb'], { printPTNM: true })));
  let cursor = -1;
  for (const label of qmh) {
    const idx = ours.indexOf(MAP[label]);
    assert.ok(idx > cursor, `${MAP[label]} out of QMH order (index ${idx} after ${cursor})`);
    cursor = idx;
  }
  // The single agreed exception: Tumour histology sits directly after Histologic grade, ahead of the MMR element.
  assert.equal(ours.indexOf('Tumour histology'), ours.indexOf('Histologic grade') + 1);
  assert.equal(ours.indexOf('Mismatch repair (MMR) immunohistochemistry'), ours.indexOf('Tumour histology') + 1);
});

test('grade derives from the histotype by default; explicit picks override', () => {
  const g2 = run({ solidPct: '6-50% (architectural grade 2)' });
  assert.equal(rows(g2)['Histologic grade'], 'FIGO grade 2 (endometrioid carcinoma)');
  assert.ok(rows(g2)['Tumour histology'].includes('solid non-squamous growth makes up 6-50% of the tumour'));
  assert.ok(flat(g2.diagnosis).includes('ENDOMETRIOID CARCINOMA, FIGO grade 2,'));
  assert.ok(g2.issues.some((i) => i.level === 'info' && /derived: FIGO grade 2 .*architectural grade 2\), nuclear grade 1-2/.test(i.message)));
  const g3 = run({ solidPct: '6-50% (architectural grade 2)', nuclearGrade: 'Nuclear grade 3 (marked atypia in the majority of the tumour)' });
  assert.equal(rows(g3)['Histologic grade'], 'FIGO grade 3 (endometrioid carcinoma)');
  assert.ok(rows(g3)['Tumour histology'].includes('markedly pleomorphic, hyperchromatic nuclei with prominent nucleoli (nuclear grade 3)'));
  assert.ok(g3.issues.some((i) => /raised by one for grade 3 nuclei/.test(i.message)));
  const cc = run({ histType: 'Clear cell carcinoma' });
  assert.equal(rows(cc)['Histologic grade'], 'High-grade (non-endometrioid carcinoma)');
  assert.ok(cc.diagnosis.includes('CLEAR CELL CARCINOMA, high grade'));
  assert.ok(rows(cc)['Tumour histology'].startsWith('Sections show a clear cell carcinoma. The tumour shows an admixture of tubulocystic, papillary and solid patterns'));
  assert.ok(cc.issues.some((i) => i.level === 'info' && /clear cell carcinoma is high grade by definition/.test(i.message)));
  const other = run({ histType: 'Other (specify)', histTypeOther: 'Adenosquamous carcinoma' });
  assert.equal(rows(other)['Histologic grade'], 'Cannot be assessed');
  assert.ok(other.issues.some((i) => i.level === 'error' && /pick it explicitly/.test(i.message)));
  const picked = run({ grade: 'FIGO grade 3 (endometrioid carcinoma)' });
  assert.equal(rows(picked)['Histologic grade'], 'FIGO grade 3 (endometrioid carcinoma)');
  assert.ok(flat(picked.diagnosis).includes('FIGO grade 3,'));
  assert.ok(picked.issues.some((i) => i.level === 'warn' && /differs from the grade derived/.test(i.message)));
  const dd = run({ histType: 'Dedifferentiated carcinoma', ddLowGrade: 'FIGO grade 2 endometrioid carcinoma' });
  assert.ok(rows(dd)['Tumour histology'].includes('a FIGO grade 2 endometrioid carcinoma component is sharply juxtaposed with an undifferentiated component'));
  assert.equal(rows(dd)['Histologic grade'], 'High-grade (non-endometrioid carcinoma)');
});

test('extent without myoinvasion: FIGO 2023 IA1 basis from the microscopic pick, not the macro site', () => {
  const POLYP = 'Tumour limited to an endometrial polyp (underlying endometrium and myometrium uninvolved)';
  const BOTH = 'Tumour in an endometrial polyp and the underlying endometrium';
  const base = { myoInvasion: 'Not identified', depthMm: '', myoThicknessMm: '', macroDepthMm: '', macroMyoMm: '' };
  const a = run({ ...base });   // default pick
  assert.equal(rows(a)['Myometrial invasion'], 'Not identified; tumour confined to the endometrium');
  assert.match(a.report, /FIGO grade 1, confined to the endometrium/);
  assert.ok(a.issues.some((i) => /FIGO 2023 \(reference, not reported\): IA1 - non-aggressive histotype limited to the endometrium/.test(i.message)));
  const b = run({ ...base, tumourSite: 'Endometrial polyp', noInvasionExtent: POLYP });
  assert.equal(rows(b)['Myometrial invasion'], 'Not identified; tumour limited to an endometrial polyp');
  assert.match(b.report, /confined to an endometrial polyp\n/);
  assert.ok(b.issues.some((i) => /IA1 - non-aggressive histotype limited to an endometrial polyp/.test(i.message)));
  assert.ok(!b.issues.some((i) => /macroscopic Tumour site/i.test(i.message)), 'macro and micro agree: no cross-check flag');
  const c = run({ ...base, tumourSite: 'Endometrial polyp', noInvasionExtent: BOTH });
  assert.equal(rows(c)['Myometrial invasion'], 'Not identified; tumour in an endometrial polyp and the underlying endometrium');
  assert.match(c.report.replace(/\s+/g, ' '), /confined to an endometrial polyp and the underlying endometrium /);
  assert.ok(c.issues.some((i) => /IA1 - non-aggressive histotype limited to the endometrium/.test(i.message)), 'polyp plus endometrium stages as endometrium');
  const d = run({ ...base, tumourSite: 'Endometrium', noInvasionExtent: POLYP });
  assert.ok(d.issues.some((i) => i.level === 'warn' && /macroscopic Tumour site is not "Endometrial polyp"/.test(i.message)));
  const e = run({ ...base, tumourSite: 'Endometrial polyp' });
  assert.ok(e.issues.some((i) => i.level === 'info' && /state whether the underlying endometrium is involved/.test(i.message)));
  const f = run({ ...base, noInvasionExtent: 'Cannot be determined' });
  assert.equal(rows(f)['Myometrial invasion'], 'Not identified; extent cannot be determined');
  assert.match(f.report, /FIGO grade 1, no myometrial invasion\n/);
  assert.ok(f.issues.some((i) => i.level === 'warn' && /IA1 basis is left open/.test(i.message)));
  const g = run({ myoInvasion: 'Estimated less than 50% myometrial invasion', noInvasionExtent: POLYP });
  assert.equal(rows(g)['Myometrial invasion'], 'Estimated less than 50% myometrial invasion', 'hidden pick is ignored once there is myoinvasion');
});

test('golden fixtures reproduce byte-for-byte', () => {
  fs.mkdirSync(FIX, { recursive: true });
  for (const [name, patch] of CASES) {
    // 04 used to exercise the retired synopticOnly option; it now runs with defaults (synoptic layout, 2026-09).
    const opts = name.startsWith('02') ? { printPTNM: true } : {};
    const out = run(patch, opts);
    const file = path.join(FIX, `${name}.json`);
    // A deliberate edit's reason lives in the fixture's description; --update keeps it.
    const kept = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')).description : undefined;
    const current = { ...(kept ? { description: kept } : {}), templateId: 'endometrial_carcinoma', patch, options: opts, report: out.report, checks: out.issues };
    if (UPDATE || !fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n'); continue; }
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(out.report, saved.report, `${file} changed; re-run with --update only after a deliberate wording change`);
    assert.deepEqual(out.issues, saved.checks, `${file} checks changed`);
  }
});
