// generators/appendix_carcinoma.js — wording-pinned tests for the appendiceal tumour
// resection synoptic template (QMH GI-Appendix page, AJCC 8th edition). Assertions are
// inline exact strings; any wording change is deliberate and edits this file.
import test from 'node:test';
import assert from 'node:assert/strict';
import { generate } from '../src/engine.js';
import schema from '../schemas/appendix_carcinoma.json' with { type: 'json' };
import * as gen from '../generators/appendix_carcinoma.js';

const run = (c) => generate(schema, gen, c);
const flat = (t) => t.replace(/\s+/g, ' ');
const part = (over = {}) => ({ label: 'A', templateId: 'appendix_carcinoma', values: { ...schema.example.parts[0].values, ...over } });
const runP = (over, options = schema.example.options) => run({ case: schema.example.case, parts: [part(over)], options });

test('schema shape: metadata key order, layout and field census', () => {
  assert.equal(schema.kind, 'cancer resection');
  assert.equal(schema.system, 'GI');
  assert.equal(schema.defaultParts, 1);
  assert.equal(schema.version, '2026.09');
  assert.equal(schema.source.stagingProtocol, 'appendix');
  assert.deepEqual(Object.keys(schema).slice(0, 11), ['id', 'version', 'name', 'shortName', 'label', 'organ', 'system', 'kind', 'layout', 'rank', 'aliases']);
  assert.deepEqual(schema.layout, { macroGroups: ['Specimen and tumour'], macroFields: ['specimenName'], pack: true });
  assert.deepEqual(schema.fields.filter((f) => f.type === 'multiselect').map((f) => f.id), ['tumourSite', 'tumourExtension', 'distantMets', 'additionalFindings']);
  assert.equal(schema.fields[0].id, 'specimenName');
  assert.equal(schema.fields[schema.fields.length - 1].id, 'additionalNotes');
  assert.ok(schema.options.some((o) => o.id === 'macro' && o.default === true));
  assert.ok(schema.options.some((o) => o.id === 'printPTNM' && o.default === false));
  // WHO 2019 appendix histologic types in the QMH page order ('goblet cell carcinoid' is
  // the house-renamed goblet cell adenocarcinoma).
  const types = schema.fields.find((f) => f.id === 'histType').options;
  assert.equal(types.length, 15);
  assert.ok(types.includes('Goblet cell adenocarcinoma'));
  assert.ok(!types.some((t) => /carcinoid/i.test(t)));
  for (const t of ['Adenocarcinoma', 'Mucinous adenocarcinoma', 'Low-grade appendiceal mucinous neoplasm', 'High-grade appendiceal mucinous neoplasm', 'Signet-ring cell carcinoma (poorly cohesive carcinoma)', 'Large cell neuroendocrine carcinoma', 'Mixed neuroendocrine-non-neuroendocrine neoplasm (Mixed adenoneuroendocrine carcinoma)', 'Medullary carcinoma', 'Adenosquamous carcinoma', 'Undifferentiated carcinoma']) assert.ok(types.includes(t), t);
  const ext = schema.fields.find((f) => f.id === 'tumourExtension').options;
  assert.equal(ext.length, 12);
  assert.ok(ext.includes('pTis') === false);
  assert.ok(ext.includes('Acellular mucin invades the visceral peritoneum (serosa)'));
  const ids = new Set(schema.fields.map((f) => f.id));
  for (const k of Object.keys(schema.example.parts[0].values)) assert.ok(ids.has(k), `example key ${k} is a field`);
});

test('example report: pinned wording (appendectomy, T2 N0)', () => {
  const out = runP({});
  assert.equal(out.issues.filter((i) => i.level === 'error').length, 0);
  const r = out.report;
  assert.ok(r.startsWith('Appendix, distal half of the appendix, appendectomy'));
  assert.ok(r.includes('Received in formalin is an appendectomy specimen measuring 60 x 8 x 8 mm. The appendix measures 60 mm in length and the attached mesoappendix measures 45 x 25 x 5 mm.'));
  assert.ok(r.includes('There is a tumour in the distal half of the appendix measuring 20 x 15 x 12 mm.'));
  assert.ok(r.includes('(1-4) Tumour with mesoappendix.\n(5) Base margin.'));
  assert.ok(r.includes('- Procedure: Appendectomy'));
  assert.ok(r.includes('- Tumour site: Distal half of appendix'));
  assert.ok(r.includes('- Tumour size: 20 x 15 x 12 mm (greatest dimension 20 mm)'));
  assert.ok(r.includes('- Histologic type: Adenocarcinoma'));
  assert.ok(r.includes('- Histologic grade: G2, moderately differentiated'));
  assert.ok(r.includes('- Tumour deposits: Not identified'));
  assert.ok(r.includes('- Tumour extension: Tumour invades muscularis propria'));
  assert.ok(r.includes('- Lymphovascular invasion: Not identified'));
  assert.ok(r.includes('- Proximal margin: Uninvolved by invasive carcinoma, 15 mm'));
  assert.ok(r.includes('- Mesenteric margin: Uninvolved by invasive carcinoma, 3 mm'));
  assert.ok(r.includes('- Regional lymph nodes: 12 examined; 0 involved'));
  assert.ok(r.includes('- Distant metastasis: Not applicable'));
  assert.ok(r.includes('- pTNM: pT2 pN0'));
  assert.ok(r.includes('- Stage group (if cM0): I'));
  assert.ok(r.includes('- Appendicitis'));
  assert.ok(r.includes('APPENDIX, distal half of the appendix, appendectomy'));
  assert.ok(r.includes('- ADENOCARCINOMA, moderately differentiated, 20 mm, invading the muscularis\n  propria; other margins clear (closest 3 mm); see synoptic report'));
  assert.ok(r.includes('- 0 of 12 regional lymph nodes involved'));
  assert.ok(r.includes('pT2 pN0 (AJCC 8th edition), stage I (if cM0)'));
});

test('deepest extension tick governs; acellular mucin rows phrase as mucin', () => {
  const out = runP({
    histType: 'Mucinous adenocarcinoma',
    grade: 'G3, poorly differentiated',
    tumourExtension: ['Tumour invades submucosa', 'Acellular mucin invades the visceral peritoneum (serosa)']
  });
  const r = flat(out.report);
  assert.ok(r.includes('The tumour is a poorly differentiated mucinous adenocarcinoma, acellular mucin extending to the visceral peritoneum (serosa).'));
  assert.ok(r.includes('- Tumour extension: Tumour invades submucosa and Acellular mucin invades the visceral peritoneum'));
  assert.ok(r.includes('- pTNM: pT4a pN0'));
  assert.ok(r.includes('- Stage group (if cM0): IIB'));
});

test('T4b detail interpolates into the extension phrase and synoptic line', () => {
  const out = runP({
    tumourExtension: ['Tumour invades muscularis propria', 'Tumour directly invades adjacent organs or structures (specify)'],
    extensionDetail: 'caecal wall'
  });
  const r = flat(out.report);
  assert.ok(r.includes('directly invading the caecal wall.'));
  assert.ok(r.includes('Tumour directly invades adjacent organs or structures (caecal wall)'));
  assert.ok(r.includes('- pTNM: pT4b pN0'));
  assert.ok(r.includes('- Stage group (if cM0): IIC'));
});

test('LAMN confined by the muscularis propria is pTis(LAMN)', () => {
  const out = runP({
    histType: 'Low-grade appendiceal mucinous neoplasm',
    grade: 'Not applicable',
    tumourExtension: ['Acellular mucin invades submucosa', 'Acellular mucin invades muscularis propria']
  });
  const r = flat(out.report);
  assert.ok(r.includes('The tumour is a low-grade appendiceal mucinous neoplasm, acellular mucin extending into the muscularis propria.'));
  assert.ok(r.includes('villous to flat proliferation of mucinous epithelium shows abundant apical mucin, elongated nuclei and low-grade nuclear atypia'));
  assert.ok(r.includes('- Histologic grade: G2, moderately differentiated') === false, 'no grade line when Not applicable');
  assert.ok(r.includes('- pTNM: pTis(LAMN) pN0'));
  assert.ok(r.includes('- Stage group (if cM0): 0'));
  assert.ok(r.includes('LOW-GRADE APPENDICEAL MUCINOUS NEOPLASM, 20 mm, acellular mucin extending into the muscularis propria; other margins clear (closest 3 mm); see synoptic report'));
  assert.ok(r.includes('pTis(LAMN) pN0 (AJCC 8th edition), stage 0 (if cM0)'));
});

test('goblet cell adenocarcinoma: Tang group prints and grades G3 for stage IVB', () => {
  const out = runP({
    histType: 'Goblet cell adenocarcinoma',
    grade: 'Not applicable',
    gobletGrade: 'Tang / WHO group 3 (high grade)',
    distantMets: ['Intraperitoneal metastasis only (including peritoneal mucinous deposits containing tumour cells) (specify)'],
    distantDetail: 'omentum'
  });
  const r = flat(out.report);
  assert.ok(r.includes('- Goblet cell adenocarcinoma group: Tang / WHO group 3 (high grade)'));
  assert.ok(r.includes('The tumour is a goblet cell adenocarcinoma, Tang group C (WHO grade 3, high grade), invading the muscularis propria.'));
  assert.ok(r.includes('only focal goblet-cell morphology (Tang group C).'));
  assert.ok(r.includes('- Distant metastasis: Intraperitoneal metastasis only (including peritoneal mucinous deposits containing tumour cells) (omentum)'));
  assert.ok(r.includes('- pTNM: pT2 pN0 pM1b'));
  assert.ok(r.includes('- Stage group: IVB'));
});

test('tumour deposits without positive nodes grade pN1c', () => {
  const out = runP({
    nodesExamined: 0,
    nodesInvolved: '',
    tumourDeposits: 'Present (specify number)',
    tumourDepositsN: 3
  });
  const r = flat(out.report);
  assert.ok(r.includes('- Regional lymph nodes: None submitted (0 examined)'));
  assert.ok(r.includes('- Tumour deposits: Present, n = 3'));
  assert.ok(r.includes('- pTNM: pT2 pN1c'));
  assert.ok(r.includes('3 tumour deposits'));
});

test('synoptic order: histology paragraph after grade; damages before extension', () => {
  const r = runP({}).report;
  const gi = r.indexOf('- Histologic grade:');
  const hi = r.indexOf('- Tumour histology:');
  const di = r.indexOf('- Tumour deposits:');
  const ei = r.indexOf('- Tumour extension:');
  const li = r.indexOf('- Lymphovascular invasion:');
  assert.ok(gi > 0 && hi > gi && di > hi && ei > di && li > ei);
});

test('histology notes typed free text wins over the derived paragraph', () => {
  const out = runP({ histologyNotes: 'The glands are lined by ciliated columnar cells.' });
  assert.ok(out.report.includes('- Tumour histology:\n  The glands are lined by ciliated columnar cells.'));
  assert.ok(!out.report.includes('The tumour is a moderately differentiated'));
});

test('validate: missing pieces and specific hints', () => {
  let out = runP({ nodesExamined: '', nodesInvolved: '' });
  assert.ok(out.issues.some((i) => i.level === 'error' && /regional lymph nodes examined is required/.test(i.message)));
  out = runP({ nodesExamined: 5, nodesInvolved: '' });
  assert.ok(out.issues.some((i) => i.level === 'error' && /involved lymph nodes is required/.test(i.message)));
  out = runP({ nodesExamined: 5, nodesInvolved: 7 });
  assert.ok(out.issues.some((i) => i.level === 'error' && /Involved nodes exceed/.test(i.message)));
  out = runP({ tumourDeposits: 'Present (specify number)', tumourDepositsN: '' });
  assert.ok(out.issues.some((i) => i.level === 'warn' && /record the number/.test(i.message)));
  out = runP({ tumourExtension: [], nodesExamined: 5, nodesInvolved: 0 });
  assert.ok(out.issues.some((i) => i.level === 'error' && /Tumour extension is required/.test(i.message)));
  out = runP({
    tumourExtension: ['Tumour directly invades adjacent organs or structures (specify)'], extensionDetail: ''
  });
  assert.ok(out.issues.some((i) => i.level === 'warn' && /specify them/i.test(i.message)));
});

test('validate: LAMN with infiltrative invasion upgrades the type', () => {
  const out = runP({
    histType: 'Low-grade appendiceal mucinous neoplasm',
    tumourExtension: ['Acellular mucin invades submucosa', 'Tumour invades submucosa']
  });
  assert.ok(out.issues.some((i) => i.level === 'warn' && /invasive mucinous adenocarcinoma rather than a LAMN/.test(i.message)));
});

test('validate: acellular-mucin rows on a non-mucinous type prompt review', () => {
  const out = runP({
    tumourExtension: ['Acellular mucin invades submucosa']
  });
  assert.ok(out.issues.some((i) => i.level === 'warn' && /acellular-mucin extension row/.test(i.message)));
});

test('validate: margins with involved mucinous neoplasm prompt further-surgery note', () => {
  const out = runP({ proximalMargin: 'Involved by low-grade appendiceal mucinous neoplasm', proximalMarginMm: '' });
  assert.ok(out.issues.some((i) => i.level === 'warn' && /further surgery is needed/.test(i.message)));
});

test('typed override wins and is echoed with its reason', () => {
  const out = runP({ tnmOverride: 'pT4a pN1b pM1a', tnmOverrideReason: 'resection after pseudomyxoma peritonei' });
  const r = flat(out.report);
  assert.ok(r.includes('pT4a pN1b pM1a [pathologist override; derived T2/N0 - resection after pseudomyxoma peritonei]'));
});

test('printPTNM off: no stage lines in synoptic or diagnosis', () => {
  const out = runP({}, { ...schema.example.options, printPTNM: false });
  assert.ok(!out.report.includes('pTNM'));
  assert.ok(!out.report.includes('Stage group'));
  assert.ok(!out.report.includes('AJCC 8th edition'), 'AJCC');
});

test('macro off: no macro and block key', () => {
  const out = runP({}, { ...schema.example.options, macro: false });
  assert.ok(!out.report.includes('Received in formalin'));
  assert.ok(!out.report.includes('Tumour with mesoappendix.'));
});

test('site prose: base involvement qualifies the proximal half', () => {
  const out = runP({ tumourSite: ['Proximal half of appendix + base of appendix involved by tumour'] });
  assert.ok(out.report.includes('Appendix, proximal half of the appendix + base of appendix involved by tumour, appendectomy'));
  assert.ok(out.report.includes('There is a tumour in the proximal half of the appendix + base of appendix involved by tumour'));
});
