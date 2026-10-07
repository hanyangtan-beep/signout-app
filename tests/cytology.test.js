// Cytology suite: six templates share generators/cytology.js.
// Golden fixtures live in tests/fixtures/cytology/*.json ({templateId, values, report});
// regenerate deliberately with `node tests/cytology.test.js --update` after a wording change.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCase, generate } from '../src/engine.js';
import { loadAll } from '../src/registry.js';
import { BETHESDA, MILAN, TIS } from '../generators/cytology.js';

const registry = await loadAll();
const IDS = ['thyroid_fna', 'salivary_fna', 'lymph_node_fna', 'effusion_cytology', 'urine_cytology', 'cervical_cytology'];
const here = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(here, 'fixtures', 'cytology');
const UPDATE = process.argv.includes('--update');

function run(id, values, n = 1, opts = {}) {
  const { schema, generator } = registry[id];
  const cs = createCase(schema, n);
  Object.assign(cs.options, opts);
  Object.assign(cs.parts[0].values, values);
  return generate(schema, generator, cs);
}
function fromExample(id, patch = {}) {
  const { schema, generator } = registry[id];
  const cs = JSON.parse(JSON.stringify(schema.example));
  Object.assign(cs.parts[0].values, patch);
  return generate(schema, generator, cs);
}

test('six cytology templates are registered under kind cytology / system Cytology', () => {
  for (const id of IDS) {
    const t = registry[id];
    assert.ok(t, `${id} missing`);
    assert.equal(t.schema.kind, 'cytology');
    assert.equal(t.schema.system, 'Cytology');
    assert.equal(t.schema.generator, 'cytology');
    assert.ok(t.schema.example, `${id} has an example`);
    // \bROSE\b, not ROSE: "rosettes" (cervical AIS features, Phase 55) is not on-site evaluation.
    assert.ok(!JSON.stringify(t.schema).match(/on-site|\bROSE\b/i), `${id} has no rapid on-site evaluation wording`);
  }
});

test('every example generates without validation errors', () => {
  for (const id of IDS) {
    const out = fromExample(id);
    const errors = (out.issues || []).filter((i) => i.level === 'error');
    assert.deepEqual(errors, [], `${id}: ${JSON.stringify(errors)}`);
    assert.ok(!out.report.includes('(A)'), `${id}: single part drops the letter`);
    assert.ok(!/undefined|null|\bNaN\b/.test(out.report), `${id}: no leaked blanks`);
  }
});

test('thyroid: preparations counted before microscopy, benign line and Bethesda tag', () => {
  const out = fromExample('thyroid_fna');
  assert.equal(out.specimens, 'Thyroid, right lobe nodule, ultrasound-guided fine needle aspiration');
  assert.equal(out.macro, 'Received are two air-dried and two alcohol-fixed smears and a needle rinse (blood-stained), processed as cytospin (1 slide) and cell block (1 block).');
  assert.ok(out.microscopy.startsWith('The smears (4 slides), cytospin (1 slide) and cell block (1 slide) are adequate for evaluation and show abundant colloid'));
  assert.ok(out.microscopy.endsWith('Features are those of a benign follicular nodule.'));
  assert.equal(out.diagnosis, 'THYROID, right lobe nodule, ultrasound-guided fine needle aspiration - BENIGN FOLLICULAR NODULE (Bethesda II: Benign)');
});

test('thyroid: nondiagnostic drops the interpretation, states the reason and suggests the ROM comment', () => {
  const out = fromExample('thyroid_fna', { category: 'I. Nondiagnostic', adequacy: 'Inadequate', inadequacyReason: 'Cyst fluid only', features: ['Haemosiderin-laden macrophages'] });
  assert.equal(out.microscopy, 'The smears (4 slides), cytospin (1 slide) and cell block (1 slide) are inadequate for evaluation (cyst fluid only), showing only haemosiderin-laden macrophages.');
  assert.equal(out.diagnosis, 'THYROID, right lobe nodule, ultrasound-guided fine needle aspiration - NONDIAGNOSTIC, CYST FLUID ONLY (Bethesda I: Nondiagnostic)');
  assert.ok(out.report.includes('estimated risk of malignancy of 13% (5-20%)'));
});

test('thyroid: Bethesda 2023 risk-of-malignancy figures are the published means', () => {
  assert.equal(BETHESDA['I. Nondiagnostic'].rom, '13% (5-20%)');
  assert.equal(BETHESDA['II. Benign'].rom, '4% (2-7%)');
  assert.equal(BETHESDA['III. Atypia of undetermined significance'].rom, '22% (13-30%)');
  assert.equal(BETHESDA['IV. Follicular neoplasm'].rom, '30% (23-34%)');
  assert.equal(BETHESDA['V. Suspicious for malignancy'].rom, '74% (67-83%)');
  assert.equal(BETHESDA['VI. Malignant'].rom, '97% (97-100%)');
});

test('thyroid: adequacy inconsistent with category is an error; PTC nuclear features in a benign category warn', () => {
  const bad = fromExample('thyroid_fna', { adequacy: 'Inadequate', category: 'II. Benign' });
  assert.ok(bad.issues.some((i) => i.level === 'error' && /inadequate but the category/.test(i.message)));
  const warn = fromExample('thyroid_fna', { features: ['Nuclear grooves', 'Intranuclear pseudoinclusions'] });
  assert.ok(warn.issues.some((i) => i.level === 'warn' && /papillary carcinoma are ticked/.test(i.message)));
});

test('salivary: Milan IVb reads as SUMP with the excision comment; lymphoma suspicion suggests excisional biopsy', () => {
  const out = fromExample('salivary_fna', { category: 'IVb. Salivary gland neoplasm of uncertain malignant potential', sumpDx: 'Cellular basaloid neoplasm', features: ['Basaloid cells with hyaline globules'] });
  assert.equal(out.diagnosis, 'SALIVARY GLAND, left parotid, ultrasound-guided fine needle aspiration - CELLULAR BASALOID NEOPLASM OF UNCERTAIN MALIGNANT POTENTIAL (Milan IVb: SUMP)');
  assert.ok(out.report.includes('estimated risk of malignancy of 35%'));
  assert.equal(MILAN['IVa. Benign neoplasm'].rom, 'less than 3%');
  const ly = fromExample('salivary_fna', { category: 'V. Suspicious for malignancy', suspDx: 'Lymphoma', features: ['Polymorphous lymphoid background'] });
  assert.ok(ly.report.includes('Suggest excisional biopsy for definitive diagnosis.'));
  assert.ok(ly.diagnosis.endsWith('- SUSPICIOUS FOR LYMPHOMA (Milan V: Suspicious for malignancy)'));
});

test('lymph node: EBUS-TBNA station, IHC in the microscopy paragraph, Sydney tag; benign node adds the staging caveat', () => {
  const out = fromExample('lymph_node_fna');
  assert.equal(out.specimens, 'Lymph node, station 7, EBUS-TBNA');
  assert.ok(out.microscopy.includes('Immunostaining on the cell block shows the tumour cells to be positive for TTF-1 and CK7 and negative for p40. Features are those of metastatic adenocarcinoma, consistent with lung primary.'));
  assert.equal(out.diagnosis, 'LYMPH NODE, station 7, EBUS-TBNA - METASTATIC ADENOCARCINOMA, consistent with LUNG PRIMARY (Sydney System L5: Malignant)');
  assert.ok(!out.report.includes('does not exclude metastatic disease'));
  const neg = fromExample('lymph_node_fna', { category: 'L2. Benign', features: ['Polymorphous lymphoid population', 'Lymphoglandular bodies'], ancillary: '' });
  assert.equal(neg.diagnosis, 'LYMPH NODE, station 7, EBUS-TBNA - NO EVIDENCE OF MALIGNANCY; REACTIVE LYMPHOID POPULATION (Sydney System L2: Benign)');
  assert.ok(neg.report.includes('A negative nodal aspirate does not exclude metastatic disease'));
});

test('effusion: fluid volume line, TIS categories and ROM, negative wording', () => {
  const out = fromExample('effusion_cytology');
  assert.equal(out.specimens, 'Pleural fluid, right');
  assert.equal(out.macro, 'Received is 50 ml of blood-stained fluid, processed as cytospin (2 slides) and cell block (1 block).');
  assert.equal(out.diagnosis, 'PLEURAL FLUID, right - METASTATIC ADENOCARCINOMA, consistent with LUNG PRIMARY (TIS: Malignant)');
  const neg = fromExample('effusion_cytology', { category: 'Negative for malignancy', features: ['Reactive mesothelial cells', 'Lymphocyte-predominant'], ancillary: '' });
  assert.equal(neg.microscopy, 'The cytospin (2 slides) and cell block (1 slide) are adequate for evaluation and show reactive mesothelial cells and a lymphocyte-predominant background. There is no evidence of malignancy.');
  assert.equal(neg.diagnosis, 'PLEURAL FLUID, right - NO EVIDENCE OF MALIGNANCY (TIS: Negative for malignancy)');
  assert.equal(TIS['Atypia of undetermined significance'].rom, '66%');
  const asc = fromExample('effusion_cytology', { specimenType: 'Peritoneal (ascitic) fluid', specimenName: '' });
  assert.equal(asc.specimens, 'Peritoneal fluid, ascitic');
});

test('urine: Paris 2.0 NHGUC default, LGUN flag under NHGUC, high grade features group as atypical urothelial cells', () => {
  const out = fromExample('urine_cytology');
  assert.equal(out.specimens, 'Urine, voided');
  assert.equal(out.diagnosis, 'URINE, voided - NEGATIVE FOR HIGH GRADE UROTHELIAL CARCINOMA (Paris System: NHGUC)');
  const lg = fromExample('urine_cytology', { lgun: true, features: ['Benign urothelial cells', 'Fibrovascular cores'] });
  assert.ok(lg.diagnosis.includes('NEGATIVE FOR HIGH GRADE UROTHELIAL CARCINOMA; LOW GRADE UROTHELIAL NEOPLASM CANNOT BE EXCLUDED'));
  assert.ok(lg.report.includes('Cytology cannot reliably distinguish low grade papillary urothelial neoplasms'));
  const hg = fromExample('urine_cytology', { category: 'High grade urothelial carcinoma', features: ['N:C ratio 0.7 or more', 'Hyperchromasia', 'Irregular nuclear membranes', 'Necrotic background'] });
  assert.ok(hg.microscopy.includes('a necrotic background and atypical urothelial cells with a nuclear-to-cytoplasmic ratio of 0.7 or more, nuclear hyperchromasia and irregular nuclear membranes'));
  assert.equal(hg.diagnosis, 'URINE, voided - HIGH GRADE UROTHELIAL CARCINOMA (Paris System: HGUC)');
  const wash = fromExample('urine_cytology', { specimenType: 'Ureteric washing (left)' });
  assert.equal(wash.specimens, 'Ureteric washing, left');
  const under = fromExample('urine_cytology', { category: 'High grade urothelial carcinoma', features: ['Hyperchromasia'] });
  assert.ok(under.issues.some((i) => /HGUC requires/.test(i.message)));
});

test('cervical: adequacy clause with TZ status, NILM with organisms, HSIL colposcopy comment, unsatisfactory', () => {
  const out = fromExample('cervical_cytology');
  assert.equal(out.specimens, 'Cervix, liquid-based cytology');
  // Phase 55: each finding prints as its own descriptive sentence after the adequacy sentence.
  assert.equal(out.microscopy, 'The liquid-based preparation is satisfactory for evaluation, with an endocervical/transformation zone component present. Reactive cellular changes associated with inflammation are seen, with mild nuclear enlargement, smooth nuclear outlines, fine chromatin and small nucleoli. HPV testing: negative for high-risk HPV. There is no intraepithelial lesion or malignancy.');
  assert.equal(out.diagnosis, 'CERVIX, liquid-based cytology - NEGATIVE FOR INTRAEPITHELIAL LESION OR MALIGNANCY (NILM)');
  const tv = fromExample('cervical_cytology', { features: ['Trichomonas vaginalis'], hpv: 'Not performed' });
  assert.equal(tv.diagnosis, 'CERVIX, liquid-based cytology - NEGATIVE FOR INTRAEPITHELIAL LESION OR MALIGNANCY; Trichomonas vaginalis (NILM)');
  const hsil = fromExample('cervical_cytology', { interpretation: 'High grade squamous intraepithelial lesion (HSIL)', features: [], hpv: 'Positive for HPV 16' });
  assert.equal(hsil.diagnosis, 'CERVIX, liquid-based cytology - HIGH GRADE SQUAMOUS INTRAEPITHELIAL LESION (HSIL)');
  assert.ok(hsil.report.includes('Referral for colposcopy is advised.'));
  const uns = fromExample('cervical_cytology', { adequacy: 'Unsatisfactory', features: [], hpv: 'Not performed' });
  assert.equal(uns.microscopy, 'The liquid-based preparation is unsatisfactory for evaluation (scant squamous cellularity).');
  assert.equal(uns.diagnosis, 'CERVIX, liquid-based cytology - UNSATISFACTORY FOR EVALUATION, SCANT SQUAMOUS CELLULARITY');
  const conv = fromExample('cervical_cytology', { preparation: 'Conventional smear', adequacy: 'Satisfactory, transformation zone component absent', features: [] });
  assert.equal(conv.macro, 'Received is one conventional cervical smear.');
  assert.ok(conv.microscopy.startsWith('The smear is satisfactory for evaluation, with no endocervical/transformation zone component.'));
});

test('multi-part cytology case keeps letters and the macro toggle removes the preparations line', () => {
  const { schema, generator } = registry.thyroid_fna;
  const cs = createCase(schema, 2);
  cs.parts[0].values.specimenName = 'right lobe nodule';
  cs.parts[1].values.specimenName = 'left lobe nodule';
  const out = generate(schema, generator, cs);
  assert.ok(out.report.includes('(A) Thyroid, right lobe nodule') && out.report.includes('(B) Thyroid, left lobe nodule'));
  assert.ok(out.report.includes('(A) Received are'));
  cs.options.macro = false;
  const noMacro = generate(schema, generator, cs);
  assert.ok(!noMacro.report.includes('Received are'));
});

test('golden fixtures reproduce byte-for-byte', () => {
  fs.mkdirSync(FIX, { recursive: true });
  const cases = [
    ['thyroid_fna', {}],
    ['thyroid_fna', { category: 'IV. Follicular neoplasm', fnSubtype: 'Oncocytic follicular neoplasm', features: ['Scant colloid', 'Oncocytic (Hurthle) cells'] }],
    ['salivary_fna', {}],
    ['lymph_node_fna', {}],
    ['effusion_cytology', {}],
    ['urine_cytology', {}],
    ['cervical_cytology', {}],
    ['cervical_cytology', { interpretation: 'Atypical squamous cells of undetermined significance (ASC-US)', features: [], hpv: 'Positive for other high-risk HPV types' }],
  ];
  cases.forEach(([id, patch], i) => {
    const out = fromExample(id, patch);
    const file = path.join(FIX, `${String(i + 1).padStart(2, '0')}-${id}.json`);
    // A deliberate edit's reason lives in the fixture's description; --update keeps it.
    const kept = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')).description : undefined;
    const current = { ...(kept ? { description: kept } : {}), templateId: id, patch, report: out.report };
    if (UPDATE || !fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n');
      return;
    }
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(out.report, saved.report, `${file} changed; re-run with --update only after a deliberate wording change`);
  });
});
