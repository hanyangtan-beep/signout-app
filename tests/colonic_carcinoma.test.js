// Colonic polyp — "at least high grade dysplasia" and invasive adenocarcinoma (roadmap Phase 4 item 10).
import test from 'node:test';
import assert from 'node:assert/strict';
import { generate, snippetsFor, normalisePart } from '../src/engine.js';
import { loadAll } from '../src/registry.js';

const reg = await loadAll();
const { schema, generator } = reg.colonic_polyp;
const base = { site: 'Sigmoid', type: 'tubulovillousAdenoma', dysplasia: 'Low grade dysplasia', customSpecimen: '', comment: '' };
const ca = {
  dysplasia: 'Invasive adenocarcinoma', caKind: 'Polypectomy', histType: 'Adenocarcinoma NOS', histTypeOther: '',
  differentiation: 'Well differentiated', backgroundAdenoma: 'Present (polyp type above)', depth: 'Submucosa',
  lvi: 'Not identified', budding: 'Low (Bd1, 0-4 buds)', margin: 'Clear', marginDistance: '2', haggitt: 'Not applicable',
  kikuchi: 'Not applicable', mmr: 'Not performed', molecularPending: false
};
const run = (values, options = {}) => generate(schema, generator, {
  schemaId: 'colonic_polyp', caseTitle: '', options: { includeHeader: true, uppercaseDx: true, alwaysLetter: true, ...options },
  parts: [{ label: 'A', values: { ...base, ...values } }]
}).report;
const micro = (r) => r.split('MICROSCOPIC EXAMINATION:\n')[1].split('\n\nDIAGNOSIS')[0].replace(/^\(A\)  /, '');
const dx = (r) => r.split('DIAGNOSIS:\n')[1].split('\n')[0].replace(/^\(A\) /, '');
const snippets = (values) => snippetsFor({ colonic_polyp: reg.colonic_polyp }, {
  schemaId: 'colonic_polyp', parts: [{ label: 'A', templateId: 'colonic_polyp', values: { ...base, ...values } }], snippets: {}
}).filter((s) => s.active).map((s) => s.id);

test('schema offers the two new grades for every adenomatous type but not hyperplastic polyp', () => {
  const f = schema.fields.find((x) => x.id === 'dysplasia');
  assert.deepEqual(f.options.slice(-2), ['At least high grade dysplasia', 'Invasive adenocarcinoma']);
  for (const [type, opts] of Object.entries(f.optionsByField.map)) {
    if (type === 'hyperplasticPolyp') assert.deepEqual(opts, ['Not applicable']);
    else assert.ok(opts.includes('At least high grade dysplasia') && opts.includes('Invasive adenocarcinoma'), type);
  }
});

test('existing grades still print the no-invasion sentence', () => {
  assert.match(micro(run({ dysplasia: 'High grade dysplasia' })), /There is no evidence of invasive malignancy\.$/);
  assert.equal(dx(run({ dysplasia: 'High grade dysplasia' })), 'SIGMOID, Sigmoid polyp, polypectomy - TUBULOVILLOUS ADENOMA with HIGH GRADE DYSPLASIA.');
});

test('at least HGD drops the no-invasion sentence and states invasion cannot be excluded', () => {
  const r = run({ dysplasia: 'At least high grade dysplasia', hgdReason: 'Not stated' });
  assert.doesNotMatch(micro(r), /no evidence of invasive malignancy/);
  // 2026-10-05 (user request): the high grade dysplasia now names its features (the three ticked by default).
  assert.match(micro(r), /tubulovillous architecture and high grade dysplasia, showing cribriform and back-to-back glands, loss of polarity with full-thickness nuclear stratification and markedly enlarged nuclei with prominent nucleoli\. Invasion cannot be excluded on this material\.$/);
  assert.equal(dx(r), 'SIGMOID, Sigmoid polyp, polypectomy - TUBULOVILLOUS ADENOMA with at least HIGH GRADE DYSPLASIA.');
  assert.match(r, /COMMENT:\nCorrelation with endoscopic and radiological findings, with further sampling or resection as clinically indicated, is advised\./);
});

test('at least HGD reason qualifiers', () => {
  assert.match(micro(run({ dysplasia: 'At least high grade dysplasia', hgdReason: 'Fragmented material' })), /on this fragmented material\.$/);
  assert.match(micro(run({ dysplasia: 'At least high grade dysplasia', hgdReason: 'Cautery artefact' })), /owing to cautery artefact\.$/);
  assert.equal(dx(run({ type: 'sessileSerrated', dysplasia: 'At least high grade dysplasia' })), 'SIGMOID, Sigmoid polyp, polypectomy - SESSILE SERRATED LESION / ADENOMA with at least HIGH GRADE DYSPLASIA.');
  assert.deepEqual(snippets({ dysplasia: 'At least high grade dysplasia' }), ['colonic_at_least_hgd']);
});

test('malignant polypectomy — roadmap example line', () => {
  const r = run({ ...ca, site: 'Rectum' });
  assert.equal(dx(r), 'RECTUM, Rectum polyp, polypectomy - TUBULOVILLOUS ADENOMA with INVASIVE ADENOCARCINOMA, well differentiated; submucosal invasion; margin clear (2 mm); no lymphovascular invasion.');
  const m = micro(r);
  assert.doesNotMatch(m, /no evidence of invasive malignancy/);
  assert.match(m, /^Sections show a polypoid piece of large intestinal mucosa with tubulovillous architecture and high grade dysplasia, from which arises an invasive well differentiated adenocarcinoma/);
  assert.match(m, /Invasion extends into the submucosa\. Lymphovascular invasion is not identified\. Tumour budding is low grade \(Bd1\)\. Carcinoma is clear of the polypectomy margin by 2 mm\./);
  assert.deepEqual(snippets({ ...ca }), ['colonic_malignant_polyp_favourable']);
});

test('carcinoma biopsy of a mass — specimen becomes "<Site> mass, biopsy"', () => {
  const r = run({ ...ca, caKind: 'Biopsy of mass', backgroundAdenoma: 'Not identified', differentiation: 'Moderately differentiated', depth: 'At least submucosa (biopsy)', margin: 'Not applicable (biopsy)', budding: 'Not scorable' });
  assert.match(r, /^SPECIMEN:\n\(A\) Sigmoid mass\n/);
  assert.equal(dx(r), 'SIGMOID, Sigmoid mass, biopsy - INVASIVE ADENOCARCINOMA, moderately differentiated; at least submucosal invasion; no lymphovascular invasion.');
  assert.match(micro(r), /Sections show fragments of large intestinal mucosa infiltrated by an invasive moderately differentiated adenocarcinoma/);
  assert.match(micro(r), /at least into the submucosa; the deeper extent cannot be assessed on this biopsy\./);
  assert.doesNotMatch(micro(r), /margin/);
  assert.deepEqual(snippets({ ...ca, caKind: 'Biopsy of mass' }), []);
});

test('histological types and the "Other" free text', () => {
  assert.match(dx(run({ ...ca, histType: 'Mucinous adenocarcinoma' })), /ADENOMA with INVASIVE MUCINOUS ADENOCARCINOMA, well/);
  assert.match(dx(run({ ...ca, histType: 'Signet-ring cell carcinoma', backgroundAdenoma: 'Not identified' })), /- INVASIVE SIGNET-RING CELL CARCINOMA, well/);
  assert.match(dx(run({ ...ca, histType: 'Other', histTypeOther: 'Adenosquamous carcinoma', backgroundAdenoma: 'Not identified' })), /- INVASIVE ADENOSQUAMOUS CARCINOMA, well/);
  assert.match(micro(run({ ...ca, histType: 'Medullary carcinoma' })), /syncytial growth pattern/);
});

test('adverse features flag the risk snippet: poor differentiation, LVI, Bd3, involved or < 1 mm margin', () => {
  assert.deepEqual(snippets({ ...ca, differentiation: 'Poorly differentiated' }), ['colonic_malignant_polyp_risk']);
  assert.deepEqual(snippets({ ...ca, lvi: 'Present' }), ['colonic_malignant_polyp_risk']);
  assert.deepEqual(snippets({ ...ca, budding: 'High (Bd3, 10 or more buds)' }), ['colonic_malignant_polyp_risk']);
  assert.deepEqual(snippets({ ...ca, margin: 'Involved' }), ['colonic_malignant_polyp_risk']);
  assert.deepEqual(snippets({ ...ca, marginDistance: '0.5' }), ['colonic_malignant_polyp_risk']);
  // Piecemeal margin is neither adverse nor favourable: no automatic comment.
  assert.deepEqual(snippets({ ...ca, margin: 'Not assessable (piecemeal)' }), []);
  assert.match(dx(run({ ...ca, margin: 'Involved', lvi: 'Present' })), /; margin involved; lymphovascular invasion present\.$/);
  assert.match(micro(run({ ...ca, margin: 'Not assessable (piecemeal)', caKind: 'EMR / ESD fragments' })), /The resection margin cannot be assessed in this piecemeal specimen\./);
  assert.match(dx(run({ ...ca, caKind: 'EMR / ESD fragments' })), /, EMR \/ ESD - /);
});

test('Haggitt / Kikuchi levels print on polypectomies only', () => {
  // 2026-10-05 (user request): the level is the depth sentence and is named in the diagnosis; the old
  // trailing "The invasion corresponds to ..." sentence is gone.
  assert.match(micro(run({ ...ca, haggitt: 'Level 2' })), /Invasion extends into the submucosa at the neck of the polyp \(Haggitt level 2\)\. Lymphovascular/);
  assert.match(micro(run({ ...ca, kikuchi: 'sm1' })), /Invasion is confined to the upper third of the submucosa \(Kikuchi level sm1\)\. Lymphovascular/);
  assert.doesNotMatch(micro(run({ ...ca, haggitt: 'Level 2' })), /corresponds to|Invasion extends into the submucosa\./);
  assert.match(dx(run({ ...ca, haggitt: 'Level 2' })), /; submucosal invasion \(Haggitt level 2\); margin clear/);
  assert.doesNotMatch(micro(run({ ...ca, caKind: 'Biopsy of mass', haggitt: 'Level 2' })), /Haggitt/);
});

test('MMR line, diagnosis tag and follow-up snippets', () => {
  const r = run({ ...ca, mmr: 'Loss of MLH1 and PMS2' });
  assert.match(micro(r), /loss of nuclear expression of MLH1 and PMS2 in the tumour cells, with retained MSH2 and MSH6 \(mismatch repair deficient\)\.$/);
  assert.match(dx(r), /; MMR deficient \(loss of MLH1 \/ PMS2\)\.$/);
  assert.deepEqual(snippets({ ...ca, mmr: 'Loss of MLH1 and PMS2' }), ['colonic_malignant_polyp_favourable', 'colonic_mlh1_loss']);
  assert.deepEqual(snippets({ ...ca, mmr: 'Loss of MSH2 and MSH6' }), ['colonic_malignant_polyp_favourable', 'colonic_lynch_pattern']);
  assert.deepEqual(snippets({ ...ca, mmr: 'Isolated loss of MSH6' }), ['colonic_malignant_polyp_favourable', 'colonic_lynch_pattern']);
  assert.deepEqual(snippets({ ...ca, mmr: 'Pending' }), ['colonic_malignant_polyp_favourable', 'colonic_mmr_pending']);
  assert.deepEqual(snippets({ ...ca, molecularPending: true }), ['colonic_malignant_polyp_favourable', 'colonic_molecular_pending']);
  assert.match(dx(run({ ...ca, mmr: 'Retained (MLH1, PMS2, MSH2, MSH6)' })), /; MMR proficient\.$/);
});

test('sentence-case diagnosis keeps MMR / protein abbreviations upper case', () => {
  const r = run({ ...ca, mmr: 'Loss of MLH1 and PMS2' }, { uppercaseDx: false });
  assert.equal(dx(r), 'Sigmoid, Sigmoid polyp, polypectomy - Tubulovillous adenoma with invasive adenocarcinoma, well differentiated; submucosal invasion; margin clear (2 mm); no lymphovascular invasion; MMR deficient (loss of MLH1 / PMS2).');
});

test('hyperplastic polyp ignores a stray carcinoma grade', () => {
  const r = run({ type: 'hyperplasticPolyp', dysplasia: 'Invasive adenocarcinoma' });
  assert.equal(dx(r), 'SIGMOID, Sigmoid polyp, polypectomy - HYPERPLASTIC POLYP.');
});

test('a saved case that predates the carcinoma block still generates (generator defaults)', () => {
  const r = run({ dysplasia: 'Invasive adenocarcinoma' });
  assert.equal(dx(r), 'SIGMOID, Sigmoid mass, biopsy - INVASIVE ADENOCARCINOMA.');
  assert.match(micro(r), /infiltrated by an invasive adenocarcinoma composed of/);
  assert.match(micro(r), /The depth of invasion cannot be assessed on this material\.$/);
  assert.equal(normalisePart(schema, { label: 'A', values: { ...base } }).values.dysplasia, 'Low grade dysplasia');
});

test('SNOMED form: capitalised terms, lower-case connector, for every type and grade', () => {
  // "TUBULAR ADENOMA with LOW GRADE DYSPLASIA" — each capitalised run codes as one term. Sweeps the
  // whole type x grade grid so a new wording cannot bring back "WITH" unnoticed.
  const f = schema.fields.find((x) => x.id === 'dysplasia');
  let lines = 0;
  for (const [type, grades] of Object.entries(f.optionsByField.map)) {
    for (const g of grades) {
      const values = g === 'Invasive adenocarcinoma' ? { ...ca, type } : { type, dysplasia: g };
      const line = dx(run(values));
      assert.doesNotMatch(line, /\bWITH\b/, `${type} / ${g}: ${line}`);
      if (/dysplasia/i.test(g) && type !== 'hyperplasticPolyp' && g !== 'No dysplasia') assert.match(line, / with (at least )?(LOW|HIGH) GRADE DYSPLASIA\.$/, `${type} / ${g}`);
      lines++;
    }
  }
  assert.ok(lines >= 20, `swept ${lines} lines`);
  assert.equal(dx(run({ type: 'tubularAdenoma' })), 'SIGMOID, Sigmoid polyp, polypectomy - TUBULAR ADENOMA with LOW GRADE DYSPLASIA.');
  assert.equal(dx(run({ type: 'tubularAdenoma' }, { uppercaseDx: false })), 'Sigmoid, Sigmoid polyp, polypectomy - Tubular adenoma with low grade dysplasia.', 'sentence-case mode unchanged');
});
