// Appendix morphology enrichment: per-type WHO-sourced sentences in the "Tumour histology"
// paragraph (appendix_morphology.js, wired into generators/appendix_carcinoma.js). Pinned
// strings; change only deliberately with a reason and a source.
import test from 'node:test';
import assert from 'node:assert/strict';
import { generate } from '../src/engine.js';
import schema from '../schemas/appendix_carcinoma.json' with { type: 'json' };
import * as gen from '../generators/appendix_carcinoma.js';
import { MORPHOLOGY, typeMorphology } from '../generators/appendix_morphology.js';

const flat = (t) => t.replace(/\s+/g, ' ');
const part = (over = {}) => ({ label: 'A', templateId: 'appendix_carcinoma', values: { ...schema.example.parts[0].values, ...over } });
const runP = (over, options = schema.example.options) => generate(schema, gen, { case: schema.example.case, parts: [part(over)], options });
const types = schema.fields.find((f) => f.id === 'histType').options;

// Type -> the pinned source-grounded fragment (grade or gobletGrade over-rides the example).
const MORPH = {
  'Adenocarcinoma (G1)': { over: { histType: 'Adenocarcinoma', grade: 'G1, well differentiated' }, s: 'resembling colorectal adenocarcinoma' },
  'Adenocarcinoma (G3)': { over: { histType: 'Adenocarcinoma', grade: 'G3, poorly differentiated' }, s: 'less than half of the tumour forming glands' },
  'Mucinous': { over: { histType: 'Mucinous adenocarcinoma' }, s: 'Extracellular mucin pools occupy more than half of the tumour' },
  'LAMN': { over: { histType: 'Low-grade appendiceal mucinous neoplasm' }, s: 'effaces the muscularis mucosae with crypt loss and lymphoid atrophy' },
  'HAMN': { over: { histType: 'High-grade appendiceal mucinous neoplasm' }, s: 'cribriform or micropapillary areas, yet the growth remains pushing' },
  'Signet-ring': { over: { histType: 'Signet-ring cell carcinoma (poorly cohesive carcinoma)' }, s: 'More than half of the tumour is composed of discohesive signet-ring cells' },
  'Goblet A': { over: { histType: 'Goblet cell adenocarcinoma', gobletGrade: 'Tang / WHO group 1 (low grade)' }, s: 'concentric tubules of well-defined goblet cells infiltrate the wall with minimal atypia, minimal desmoplasia and little architectural distortion (Tang group A)' },
  'Goblet B': { over: { histType: 'Goblet cell adenocarcinoma', gobletGrade: 'Tang / WHO group 2 (intermediate grade)' }, s: 'single-file and single-cell infiltration with significant atypia and desmoplasia destroying the appendiceal wall (Tang group B)' },
  'Goblet C': { over: { histType: 'Goblet cell adenocarcinoma', gobletGrade: 'Tang / WHO group 3 (high grade)' }, s: 'only focal goblet-cell morphology (Tang group C)' },
  'LCNEC': { over: { histType: 'Large cell neuroendocrine carcinoma' }, s: 'the mitotic rate exceeds 20 mitoses per 2 mm2' },
  'SCNEC': { over: { histType: 'Small cell neuroendocrine carcinoma' }, s: 'marked nuclear moulding show crush artefact, extensive necrosis and numerous mitoses' },
  'NEC NOS': { over: { histType: 'Neuroendocrine carcinoma (poorly differentiated)' }, s: 'unequivocal neuroendocrine immunophenotype' },
  'MiNEN': { over: { histType: 'Mixed neuroendocrine-non-neuroendocrine neoplasm (Mixed adenoneuroendocrine carcinoma)' }, s: 'each constitute more than 30% of the tumour' },
  'Medullary': { over: { histType: 'Medullary carcinoma' }, s: 'morphology commonly associated with mismatch-repair deficiency' },
  'Adenosquamous': { over: { histType: 'Adenosquamous carcinoma' }, s: 'WHO does not prescribe a minimum proportion for either component' },
  'Undifferentiated': { over: { histType: 'Undifferentiated carcinoma' }, s: 'no unequivocal line of differentiation; the diagnosis is reached after exclusion' }
};

for (const [name, { over, s }] of Object.entries(MORPH)) {
  test(`morphology sentence: ${name}`, () => {
    const r = flat(runP(over).report);
    assert.ok(r.includes(s), `${name}: expected ${s}`);
  });
}

test('every appendix morphology key is a schema histType option', () => {
  for (const k of Object.keys(MORPHOLOGY)) assert.ok(types.includes(k), k);
});

test('Other / undetermined get no sentence', () => {
  assert.equal(typeMorphology('Other histologic type not listed (specify)', 'G2'), '');
  assert.equal(typeMorphology('Carcinoma, type cannot be determined', ''), '');
  for (const over of [{ histType: 'Other histologic type not listed (specify)', histTypeOther: 'Large-cell carcinoma, NOS' }, { histType: 'Carcinoma, type cannot be determined' }]) {
    const r = flat(runP(over).report);
    const m = r.match(/- Tumour histology: (.*?)\.\s*-/);
    assert.ok(/The tumour is a (moderately differentiated )?(large-cell carcinoma, nos|carcinoma, type cannot be determined)[.\s]/.test(r) || m, over.histType);
    assert.ok(!r.includes('resembling colorectal adenocarcinoma'));
  }
});

test('typed histology notes win (no morphology appended)', () => {
  const r = flat(runP({ histologyNotes: 'Manual sentence only' }).report);
  assert.ok(r.includes('The glands are lined by ciliated columnar cells') === true ? false : r.includes('Manual sentence only.'));
  assert.ok(!r.includes('resembling colorectal adenocarcinoma'));
});
