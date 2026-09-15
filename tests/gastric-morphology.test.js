// Gastric morphology enrichment: per-type WHO-sourced sentences in the "Tumour histology"
// paragraph (gastric_morphology.js, wired into generators/gastric_carcinoma.js). Pinned
// strings; change only deliberately with a reason and a source.
import test from 'node:test';
import assert from 'node:assert/strict';
import { generate } from '../src/engine.js';
const schema = schemaSync('gastric_carcinoma');
import * as gen from '../generators/gastric_carcinoma.js';
import { schemaSync } from './_schema.js';

const flat = (t) => t.replace(/\s+/g, ' ');
const part = (over = {}) => ({ label: 'A', templateId: 'gastric_carcinoma', values: { ...schema.example.parts[0].values, ...over } });
const runP = (over, options = schema.example.options) => generate(schema, gen, { case: schema.example.case, parts: [part(over)], options });

// Type -> the pinned source-grounded fragment (grade over-rides come from schema example).
const MORPH = {
  'Tubular (G1)': { overrun: { histType: 'Tubular adenocarcinoma', grade: 'G1, well differentiated' }, s: 'Well-formed, branching tubules lined by atypical columnar epithelium with apical mucin infiltrate broad cohesive fronts' },
  'Tubular (G3)': { overrun: { histType: 'Tubular adenocarcinoma', grade: 'G3, poorly differentiated / undifferentiated' }, s: 'rudimentary tubule formation, with predominant solid, nested or corded growth' },
  'Poorly cohesive': { overrun: { histType: 'Poorly cohesive carcinoma (including signet-ring cell carcinoma and other variants)', grade: '' }, s: 'Discohesive tumour cells infiltrate singly or in small aggregates without well-formed glands' },
  'Mucinous': { overrun: { histType: 'Mucinous adenocarcinoma', grade: '' }, s: 'Pools of extracellular mucin predominate and contain floating strips' },
  'Papillary (G1)': { overrun: { histType: 'Papillary adenocarcinoma', grade: 'G1, well differentiated' }, s: 'Exophytic papillary fronds with delicate fibrovascular cores' },
  'Mixed carcinoma': { overrun: { histType: 'Mixed carcinoma (mixture of discrete glandular and signet-ring / poorly cohesive components)', grade: '' }, s: 'coexist as separable areas' },
  'Hepatoid': { overrun: { histType: 'Hepatoid adenocarcinoma', grade: '' }, s: 'express hepatocellular markers (AFP, glypican-3 and SALL4)' },
  'Lymphoid stroma': { overrun: { histType: 'Carcinoma with lymphoid stroma', grade: '' }, s: 'embedded in a dense, non-desmoplastic lymphoid stroma' },
  'Fundic-gland type': { overrun: { histType: 'Adenocarcinoma of fundic-gland type', grade: '' }, s: 'expressing MUC6 and pepsinogen-I' },
  'Micropapillary': { overrun: { histType: 'Micropapillary adenocarcinoma', grade: '' }, s: 'inside-out apical-basal polarity and float within clear stromal lacunae' },
  'Gastroblastoma': { overrun: { histType: 'Gastroblastoma', grade: '' }, s: 'sheets of monotonous bland spindle cells intermixed with cords' },
  'SCNEC': { overrun: { histType: 'Small cell neuroendocrine carcinoma', grade: '' }, s: 'marked nuclear moulding show crush artefact, extensive necrosis and numerous mitoses' },
  'NET G2': { overrun: { histType: 'Neuroendocrine tumour', grade: 'G2, moderately differentiated' }, s: 'intermediate mitotic activity' },
  'MiNEN (NEC)': { overrun: { histType: 'Mixed adenocarcinoma-neuroendocrine carcinoma', grade: '' }, s: 'are both present, each constituting more than 30% of the tumour' }
};

for (const [name, { overrun, s }] of Object.entries(MORPH)) {
  test(`gastric morphology — ${name}`, () => {
    const out = runP(overrun);
    assert.ok(flat(out.report).includes(s), `missing: ${s}`);
  });
}

test('pTis and pT0 gain no morphology sentence', () => {
  const cis = gen.histologyPara({ ...schema.example.parts[0].values, tumourExtension: 'Carcinoma in situ: intraepithelial tumour without invasion of the lamina propria (high-grade dysplasia)' });
  assert.ok(!/tubules|glands forming|disc cohesive|discohesive/i.test(cis.toLowerCase()), 'pTis paragraph stays at the opener');
});

test('Other type gains no fabricated sentence and keeps the opener', () => {
  const out = runP({ histType: 'Other', histTypeOther: 'Parietal cell carcinoma' });
  assert.ok(!/tubules infiltrate broad cohesive fronts|lacunae|mucin pools occupy/.test(flat(out.report)));
});
