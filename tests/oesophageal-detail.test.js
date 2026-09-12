// Oesophageal histological-detail enrichment (both templates): per-type morphology sentences
// in the resection "- Tumour histology:" paragraph, the structured budding / retraction /
// Barrett / HER2 / PD-L1 / MMR fields, and differentiation-graded cancer sentences in the
// biopsy template. House departures from the QMH GI-Esophagus page; pinned strings.
import test from 'node:test';
import assert from 'node:assert/strict';
import { generate } from '../src/engine.js';
import schema from '../schemas/oesophageal_carcinoma.json' with { type: 'json' };
import * as gen from '../generators/oesophageal_carcinoma.js';
import bxSchema from '../schemas/oesophageal_biopsy.json' with { type: 'json' };
import * as bxGen from '../generators/oesophageal.js';

const flat = (t) => t.replace(/\s+/g, ' ');
const part = (over = {}) => ({ label: 'A', templateId: 'oesophageal_carcinoma', values: { ...schema.example.parts[0].values, ...over } });
const runP = (over, options = schema.example.options) => generate(schema, gen, { case: schema.example.case, parts: [part(over)], options });

// The example case is an oesophagectomy for a moderately differentiated SCC invading the adventitia.
const MORPH = {
  'G1-pinned': { overrun: { grade: 'G1, well differentiated' }, s: 'prominent keratinisation, keratin pearls and conspicuous intercellular bridges; the invasive front is broad and pushing' },
  'SCC G3': { overrun: { grade: 'G3, poorly differentiated / undifferentiated' }, s: 'solid nests of basal-like cells with high nuclear to cytoplasmic ratios' },
  'Basaloid SCC': { overrun: { histType: 'Basaloid squamous cell carcinoma' }, s: 'peripherally palisading nuclei and central comedo-type necrosis; microcystic spaces contain basophilic basement membrane-like material without true glandular lumina' },
  'Spindle cell SCC': { overrun: { histType: 'Spindle cell squamous cell carcinoma' }, s: 'sarcomatoid metaplasia of the epithelial component' },
  'Verrucous SCC': { overrun: { histType: 'Verrucous squamous cell carcinoma' }, s: 'blunt, bulbous rete projections that invade with a uniformly pushing front; cytological atypia is minimal' },
  'Adenoca G1': { overrun: { histType: 'Adenocarcinoma', grade: 'G1, well differentiated' }, s: 'irregularly infiltrating tubular glands lined by a single layer of atypical columnar epithelium are set in desmoplastic stroma' },
  'Adenoca G3': { overrun: { histType: 'Adenocarcinoma', grade: 'G3, poorly differentiated / undifferentiated' }, s: 'fused, abortive glands and solid sheets of high-grade atypical cells with only occasional lumen formation' },
  'Mucinous adenoca': { overrun: { histType: 'Mucinous adenocarcinoma' }, s: 'Extracellular mucin pools occupy more than half of the tumour' },
  'Signet-ring': { overrun: { histType: 'Signet-ring cell carcinoma (poorly cohesive carcinoma)' }, s: 'intracytoplasmic mucin displacing the nucleus infiltrate the wall singly' },
  'Small cell NEC': { overrun: { histType: 'Small cell neuroendocrine carcinoma' }, s: 'marked nuclear moulding show crush artefact, extensive necrosis and numerous mitoses' },
  'NET G1': { overrun: { histType: 'G1: Well-differentiated neuroendocrine tumour' }, s: 'salt-and-pepper chromatin form organoid nests and trabeculae, with sparse mitotic activity' }
};

for (const [name, { overrun, s }] of Object.entries(MORPH)) {
  test(`morphology sentence — ${name}`, () => {
    const out = runP(overrun);
    assert.ok(flat(out.report).includes(s), `missing ${s}`);
  });
}

test('unrewarding types keep a bare opener', () => {
  for (const t of ['Carcinoma, type cannot be determined', 'Other']) {
    const out = runP({ histType: t, histTypeOther: t === 'Other' ? 'Rhabdoid carcinoma' : '' });
    assert.ok(!/bridges|glands|sheets|nests|trabeculae/.test(gen.histologyPara({ ...schema.example.parts[0].values, histType: t })), `${t} must not fabricate morphology`);
  }
});

test('high-grade dysplasia / pT0 never gain morphology sentences', () => {
  assert.equal(gen.histologyPara({ ...schema.example.parts[0].values, tumourExtension: 'No evidence of primary tumour' }), 'No viable tumour cells are identified.');
  const cis = gen.histologyPara({ ...schema.example.parts[0].values, tumourExtension: 'High-grade dysplasia / carcinoma in situ' });
  assert.ok(!cis.includes('keratin') && !cis.includes('sheets'), 'pTis paragraph stays at the opener');
});

test('structured fields feed paragraph, items and diagnosis', () => {
  const out = runP({
    histType: 'Adenocarcinoma',
    tumourSite: 'Distal oesophagus (low thoracic oesophagus)',
    egjRelationship: 'Tumour located entirely within the tubular oesophagus and does not involve the EGJ',
    budding: 'Bd3 (high, 10 or more buds)',
    retraction: 'Present',
    barrett: 'Present'
  });
  const f = flat(out.report);
  assert.ok(f.includes('Tumour budding, counted as discrete foci of fewer than five cells'));
  assert.ok(f.includes('Retraction artefact is present around tumour nests.'));
  assert.ok(f.includes('Background Barrett-type columnar epithelium with intestinal metaplasia is present.'));
  assert.ok(out.report.includes('- Tumour budding: Bd3 (high, 10 or more buds)'));
  assert.ok(out.report.includes('- Retraction artefact: Present'));
  assert.ok(out.report.includes('- Background Barrett mucosa: Present'));
  assert.ok(f.includes('ADENOCARCINOMA, moderately differentiated, arising in Barrett mucosa'));
});

test('IHC joins the paragraph; HER2 / MMR / PD-L1 items print only when recorded', () => {
  const out = runP({ her2: 'Positive (IHC 3+)', pdl1Cps: '12', mmr: 'Retained nuclear expression (proficient mismatch repair)' });
  const f = flat(out.report);
  assert.ok(f.includes('Immunohistochemistry: HER2 positive (IHC 3+); mismatch repair proteins show retained nuclear expression (proficient mismatch repair); PD-L1 combined positive score 12.'));
  assert.ok(f.includes('- HER2 status: Positive (IHC 3+)'));
  assert.ok(f.includes('- PD-L1 combined positive score: 12'));
  assert.ok(f.includes('- Mismatch repair (MMR) immunohistochemistry: Retained nuclear expression (proficient mismatch repair)'));
  const bare = runP({});
  assert.ok(!bare.report.includes('Immunohistochemistry:'), 'no stray IHC sentence by default');
  assert.ok(!bare.report.includes('- HER2 status:') && !bare.report.includes('- Tumour budding:'), 'structured items hidden while blank');
});

test('MMR alone still earns an uncapitalised-prefix sentence', () => {
  const para = gen.histologyPara({ ...schema.example.parts[0].values, histType: '', mmr: 'Loss of MLH1 and PMS2', grade: 'GX, cannot be assessed' });
  assert.ok(para.includes('Mismatch repair immunohistochemistry shows loss of MLH1 and PMS2.'), para);
});

test('budding warns when the type is not adenocarcinoma', () => {
  const out = runP({ budding: 'Bd1 (low, 0-4 buds)' });
  assert.ok(out.issues.some((i) => i.level === 'warn' && /budding.*not adenocarcinoma/i.test(i.message)));
  const cc = runP({ budding: 'Bd1 (low, 0-4 buds)', histType: 'Adenocarcinoma', tumourSite: 'Distal oesophagus (low thoracic oesophagus)', egjRelationship: 'Tumour located entirely within the tubular oesophagus and does not involve the EGJ' });
  assert.ok(!cc.issues.some((i) => /budding.*not adenocarcinoma/i.test(i.message)));
});

// ---------- biopsy differentiation ----------

const bxPart = (over = {}) => ({ label: 'A', templateId: 'oesophageal_biopsy', values: { ...bxSchema.example.parts[0].values, ...over } });
const runBx = (over) => ({ report: generate(bxSchema, bxGen, { case: {}, parts: [bxPart(over)], options: bxSchema.example.options }).report });

test('biopsy: squamous differentiation grades the invasive SCC sentence', () => {
  const base = { mucosa: 'Squamous', squamousNeoplasia: 'SCC (invasive)' };
  assert.ok(runBx({ ...base, squamousDiff: 'Well differentiated' }).report.includes('prominent keratinisation, keratin pearls and conspicuous intercellular bridges'));
  assert.ok(runBx({ ...base, squamousDiff: 'Moderately differentiated' }).report.includes('focal keratinisation and identifiable intercellular bridges'));
  assert.ok(runBx({ ...base, squamousDiff: 'Poorly differentiated' }).report.includes('squamous differentiation is confirmed by focal individual cell keratinisation'));
  assert.ok(runBx({ ...base, squamousDiff: '' }).report.includes('Nests of malignant squamous cells with keratinisation and intercellular bridges infiltrate the lamina propria'), 'the undifferentiated sentence stays as the pre-enrichment default');
});

test('biopsy: adenocarcinoma differentiation grades both cancer sentences', () => {
  const base = { mucosa: 'Columnar', columnarType: 'With intestinal metaplasia', endoscopy: "Barrett's segment" };
  assert.ok(runBx({ ...base, glandularDysplasia: 'Invasive adenocarcinoma', adenocaDiff: 'Well differentiated' }).report.includes('well-formed infiltrating glands within desmoplastic stroma'));
  assert.ok(runBx({ ...base, glandularDysplasia: 'Invasive adenocarcinoma', adenocaDiff: 'Poorly differentiated' }).report.includes('poorly developed glands and solid sheets within desmoplastic stroma'));
  assert.ok(runBx({ ...base, glandularDysplasia: 'Intramucosal adenocarcinoma', adenocaDiff: 'Moderately differentiated' }).report.includes('moderately developed glands with focal cribriform architecture'));
  assert.ok(runBx({ ...base, glandularDysplasia: 'Invasive adenocarcinoma', adenocaDiff: '' }).report.includes('Infiltrating malignant glands are present, in keeping with invasive adenocarcinoma.'), 'no diff keeps the original sentence verbatim');
});
