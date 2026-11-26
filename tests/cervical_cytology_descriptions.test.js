// Cervical cytology cell descriptions (Phase 55, pulled by the user 2026-10-07). Spec:
// docs/specs/cervical-cytology-descriptions.md; grounding docs/reference/cervical_cytology-morphology.md.
// Each abnormal Bethesda category has its own tick list; the ticked items print as released-report prose
// between the adequacy sentence and the findings. Wording is deliberate; update the strings only on purpose.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCase, generate, isVisible } from '../src/engine.js';
import { loadAll } from '../src/registry.js';
import { CERVICAL, cervicalDescription } from '../generators/cytology.js';

const registry = await loadAll();
const { schema, generator } = registry.cervical_cytology;
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const field = (id) => schema.fields.find((f) => f.id === id);
const ADEQ = 'The liquid-based preparation is satisfactory for evaluation, with an endocervical/transformation zone component present.';

// A fresh part (every default filled), with the patch on top.
function run(patch = {}) {
  const cs = createCase(schema, 1);
  Object.assign(cs.parts[0].values, { hpv: 'Not performed' }, patch);
  return generate(schema, generator, cs);
}
// A draft saved before Phase 55: the new lists and the extent are absent altogether.
function legacy(patch = {}) {
  const cs = createCase(schema, 1);
  const v = cs.parts[0].values;
  for (const f of schema.fields) if (/Features$/.test(f.id) || f.id === 'extent') delete v[f.id];
  Object.assign(v, { hpv: 'Not performed', features: [] }, patch);
  return generate(schema, generator, cs);
}
const warns = (out) => out.issues.map((i) => i.message);

test('ASC-US: default description, then the Bethesda definition of the category', () => {
  const out = run({ interpretation: CERVICAL[1] });
  assert.equal(out.microscopy, `${ADEQ} Scattered atypical squamous cells show mild nuclear enlargement, a slightly raised nuclear-to-cytoplasmic ratio and mild hyperchromasia. The changes are insufficient in degree or extent for a definitive interpretation of a squamous intraepithelial lesion.`);
  const para = run({ interpretation: CERVICAL[1], ascusFeatures: ['Atypical parakeratosis'] });
  assert.ok(para.microscopy.includes(`${ADEQ} Atypical parakeratotic cells with dense orangeophilic cytoplasm are present.`), 'no dangling "also" when it stands alone');
  const both = run({ interpretation: CERVICAL[1], extent: 'A few', ascusFeatures: ['Ill-defined perinuclear halos', 'Mild nuclear enlargement', 'Atypical parakeratosis'] });
  assert.ok(both.microscopy.includes('A few atypical squamous cells show ill-defined perinuclear halos, with mild nuclear enlargement. Atypical parakeratotic cells with dense orangeophilic cytoplasm are also present.'));
});

test('ASC-H, LSIL, HSIL and squamous carcinoma: default descriptions', () => {
  assert.ok(run({ interpretation: CERVICAL[2] }).microscopy.includes(`${ADEQ} Scattered small immature squamous cells of metaplastic type, present singly and in small groups, show a high nuclear-to-cytoplasmic ratio and hyperchromasia. The changes are insufficient for a definitive interpretation, but a high grade squamous intraepithelial lesion cannot be excluded.`));
  assert.ok(run({ interpretation: CERVICAL[3] }).microscopy.includes(`${ADEQ} Scattered squamous cells of superficial and intermediate type show sharply defined perinuclear cavitation (koilocytosis), with nuclear enlargement, hyperchromasia, slightly irregular nuclear outlines and binucleation. Features are those of a low grade squamous intraepithelial lesion.`));
  assert.ok(run({ interpretation: CERVICAL[4] }).microscopy.includes(`${ADEQ} Scattered small immature squamous cells, present singly and in syncytial aggregates, show a high nuclear-to-cytoplasmic ratio, hyperchromasia, irregular nuclear membranes and coarsely granular chromatin. Features are those of a high grade squamous intraepithelial lesion.`));
  assert.ok(run({ interpretation: CERVICAL[6] }).microscopy.includes(`${ADEQ} Scattered malignant squamous cells, present singly and in syncytial aggregates, show a high nuclear-to-cytoplasmic ratio, coarsely clumped chromatin and prominent nucleoli. The background shows a granular necrotic (tumour) diathesis. Features are those of squamous cell carcinoma.`));
  const ker = run({ interpretation: CERVICAL[4], extent: 'Numerous', hsilFeatures: ['Keratinised cytoplasm', 'Single cells', 'Hyperchromasia'] });
  assert.ok(ker.microscopy.includes('Numerous small squamous cells, present singly, show dense orangeophilic cytoplasm, with hyperchromasia.'), 'keratinised HSIL drops "immature"; print order ignores tick order');
});

test('HSIL with features suspicious for invasion: one sentence after the HSIL description', () => {
  const out = run({ interpretation: CERVICAL[5] });
  assert.ok(out.microscopy.includes('coarsely granular chromatin. There is also a granular necrotic (tumour) diathesis. Features are those of a high grade squamous intraepithelial lesion with features suspicious for invasion.'));
  const all = run({ interpretation: CERVICAL[5], hsilFeatures: [], invasionFeatures: ['Irregular chromatin distribution', 'Prominent nucleoli', 'Bizarre keratinised cells'] });
  assert.ok(all.microscopy.includes(`${ADEQ} There are bizarre keratinised cells and cells with prominent nucleoli and irregularly distributed chromatin.`));
  assert.equal(all.diagnosis, 'CERVIX, liquid-based cytology - HIGH GRADE SQUAMOUS INTRAEPITHELIAL LESION, with FEATURES SUSPICIOUS FOR INVASION (HSIL)');
  assert.ok(warns(run({ interpretation: CERVICAL[5], invasionFeatures: [] })).some((m) => /tick the feature that raised the suspicion/.test(m)));
});

test('AGC: the noun follows the origin, and the closing sentence places the atypia', () => {
  const nos = run({ interpretation: CERVICAL[7] });
  assert.ok(nos.microscopy.includes(`${ADEQ} Atypical glandular cells are present in crowded sheets and strips. The cells show nuclear overlap, enlarged nuclei and mild hyperchromasia. The atypia exceeds reactive change but falls short of adenocarcinoma in situ or invasive adenocarcinoma.`));
  const endo = run({ interpretation: CERVICAL[7], glandularOrigin: 'Endocervical' });
  assert.ok(endo.microscopy.includes('Atypical endocervical cells are present in crowded sheets and strips.') && endo.microscopy.endsWith('falls short of endocervical adenocarcinoma in situ or invasive adenocarcinoma.'));
  const em = run({ interpretation: CERVICAL[7], glandularOrigin: 'Endometrial' });
  assert.ok(em.microscopy.includes('Atypical endometrial cells are present in small groups. The cells show scant, vacuolated cytoplasm, with slightly enlarged nuclei and mild hyperchromasia. The atypia exceeds reactive change but falls short of adenocarcinoma.'));
  const fn = run({ interpretation: CERVICAL[8], glandularOrigin: 'Endocervical' });
  assert.ok(fn.microscopy.endsWith('The features are suspicious for, but fall short of, endocervical adenocarcinoma in situ or invasive adenocarcinoma.'));
  assert.ok(run({ interpretation: CERVICAL[8], glandularOrigin: 'Extrauterine' }).microscopy.endsWith('The features are suspicious for, but fall short of, adenocarcinoma.'));
});

test('AIS and adenocarcinoma: architecture, cells, background and origin', () => {
  assert.ok(run({ interpretation: CERVICAL[9] }).microscopy.includes(`${ADEQ} Abnormal endocervical cells are present in crowded sheets and strips, with peripheral feathering. The cells show elongated pseudostratified nuclei, hyperchromasia, mitotic figures and apoptotic bodies. Features are those of endocervical adenocarcinoma in situ.`));
  assert.ok(run({ interpretation: CERVICAL[9], aisFeatures: ['Rosettes', 'Clean background'] }).microscopy.includes('Abnormal endocervical cells are present in groups with rosettes. The background is clean.'));
  const ca = run({ interpretation: CERVICAL[10], glandularOrigin: 'Endometrial', adenoFeatures: ['Three-dimensional clusters', 'Single cells', 'Vacuolated cytoplasm', 'Prominent nucleoli', 'Watery diathesis'] });
  assert.ok(ca.microscopy.includes(`${ADEQ} Malignant glandular cells are present singly and in three-dimensional clusters. The cells show vacuolated cytoplasm, with prominent nucleoli. The background shows a finely granular, watery diathesis. Features are those of endometrial adenocarcinoma.`));
  assert.equal(ca.diagnosis, 'CERVIX, liquid-based cytology - ADENOCARCINOMA, endometrial');
  assert.ok(run({ interpretation: CERVICAL[10] }).microscopy.endsWith('Features are those of adenocarcinoma.'));
  assert.ok(run({ interpretation: CERVICAL[10], adenoFeatures: ['Psammoma bodies'] }).microscopy.includes(`${ADEQ} Psammoma bodies are present.`));
  assert.equal(run({ interpretation: CERVICAL[11] }).diagnosis, 'CERVIX, liquid-based cytology - OTHER MALIGNANT NEOPLASM');
});

test('a draft saved before Phase 55 prints no description, keeps the old closing wording and is flagged', () => {
  const hsil = legacy({ interpretation: CERVICAL[4] });
  assert.equal(hsil.microscopy, `${ADEQ} Features are those of a high grade squamous intraepithelial lesion.`);
  assert.ok(warns(hsil).includes('No cell description is ticked for HSIL; the microscopy names the category only.'));
  assert.ok(legacy({ interpretation: CERVICAL[1] }).microscopy.endsWith('Atypical squamous cells of undetermined significance are present.'));
  assert.ok(legacy({ interpretation: CERVICAL[8], glandularOrigin: 'Endocervical' }).microscopy.endsWith('Atypical glandular cells (endocervical) are present, favouring a neoplastic process.'));
  // a tick added to an old draft prints without an extent word, as the form shows none chosen
  assert.ok(legacy({ interpretation: CERVICAL[4], hsilFeatures: ['Hyperchromasia'] }).microscopy.includes(`${ADEQ} Small immature squamous cells show hyperchromasia.`));
  for (const i of [CERVICAL[0], CERVICAL[11]]) assert.ok(!warns(legacy({ interpretation: i })).some((m) => /No cell description/.test(m)), `${i} needs no description`);
});

test('lists of other categories are ignored, even when filled by default', () => {
  const nilm = run({ features: [] });
  assert.equal(nilm.microscopy, `${ADEQ} There is no intraepithelial lesion or malignancy.`);
  assert.deepEqual(cervicalDescription({ ...nilm.values, interpretation: CERVICAL[0] }), []);
  const unsat = run({ adequacy: 'Unsatisfactory', interpretation: CERVICAL[4] });
  assert.ok(!/immature/.test(unsat.microscopy), 'no description on an unsatisfactory specimen');
});

test('legacy "Koilocytes" tick: kept once under LSIL, flagged elsewhere', () => {
  const lsil = run({ interpretation: CERVICAL[3], features: ['Koilocytes'] });
  assert.ok(!lsil.microscopy.includes('Koilocytes are present.'), 'not repeated beside the Koilocytosis tick');
  const old = legacy({ interpretation: CERVICAL[3], features: ['Koilocytes'] });
  assert.ok(old.microscopy.includes(`${ADEQ} Koilocytes are present.`));
  assert.ok(!warns(old).some((m) => /Koilocytes are ticked/.test(m)));
  assert.ok(warns(run({ features: ['Koilocytes'] })).some((m) => /Koilocytes are ticked/.test(m)));
  assert.ok(!field('features').options.includes('Koilocytes'), 'no longer offered');
});

test('organisms and non-neoplastic findings print one descriptive sentence each', () => {
  const out = run({ features: ['Trichomonas vaginalis', 'Cytomegalovirus changes', 'Atrophy'] });
  assert.equal(out.microscopy, `${ADEQ} Trichomonas vaginalis is present, as pear-shaped cyanophilic organisms with eccentric nuclei and eosinophilic cytoplasmic granules. Cellular changes consistent with cytomegalovirus are present, with enlarged cells bearing a large intranuclear inclusion surrounded by a clear halo. The squamous cells are mainly parabasal cells in flat sheets with preserved nuclear polarity, in keeping with atrophy. There is no intraepithelial lesion or malignancy.`);
  assert.equal(out.diagnosis, 'CERVIX, liquid-based cytology - NEGATIVE FOR INTRAEPITHELIAL LESION OR MALIGNANCY; Trichomonas vaginalis and cellular changes consistent with cytomegalovirus (NILM)');
  for (const f of field('features').options) {
    const m = run({ features: [f] }).microscopy;
    assert.ok(m.startsWith(`${ADEQ} `) && m.split('. ').length >= 3, `${f} prints a sentence`);
    assert.ok(!/µm|\d+ to \d+|at least/.test(m), `${f}: no thresholds in released text`);
  }
  const uns = run({ adequacy: 'Unsatisfactory', features: ['Cytomegalovirus changes', 'Keratotic changes'] });
  assert.equal(uns.microscopy, 'The liquid-based preparation is unsatisfactory for evaluation (scant squamous cellularity), showing only cellular changes consistent with cytomegalovirus and keratotic changes.');
});

test('Checks: high grade squamous category with negative HPV, and a vault sample with a TZ component', () => {
  for (const i of [CERVICAL[2], CERVICAL[4], CERVICAL[5], CERVICAL[6]]) {
    assert.ok(warns(run({ interpretation: i, hpv: 'Negative for high-risk HPV' })).some((m) => /negative high-risk HPV/.test(m)), i);
  }
  assert.ok(!warns(run({ interpretation: CERVICAL[3], hpv: 'Negative for high-risk HPV' })).some((m) => /negative high-risk HPV/.test(m)));
  assert.ok(warns(run({ features: ['Glandular cells post hysterectomy'] })).some((m) => /vault sample/.test(m)));
  assert.ok(!warns(run({ adequacy: 'Satisfactory, transformation zone component absent', features: ['Glandular cells post hysterectomy'] })).some((m) => /vault sample/.test(m)));
  assert.ok(!warns(run({ interpretation: CERVICAL[3] })).some((m) => /koilocytes/i.test(m)), 'the old "LSIL without koilocytes" warning is gone');
});

test('each description list shows only for its category (and AGC lists by origin); defaults are valid options', () => {
  const own = {
    ascusFeatures: [CERVICAL[1]], aschFeatures: [CERVICAL[2]], lsilFeatures: [CERVICAL[3]], hsilFeatures: [CERVICAL[4], CERVICAL[5]],
    invasionFeatures: [CERVICAL[5]], sccFeatures: [CERVICAL[6]], aisFeatures: [CERVICAL[9]], adenoFeatures: [CERVICAL[10]],
  };
  for (const [id, cats] of Object.entries(own)) {
    for (const i of CERVICAL) assert.equal(isVisible(field(id), { interpretation: i }), cats.includes(i), `${id} under ${i}`);
  }
  for (const i of CERVICAL) assert.equal(isVisible(field('extent'), { interpretation: i }), CERVICAL.slice(1, 7).includes(i), `extent under ${i}`);
  for (const o of field('glandularOrigin').options) {
    for (const i of [CERVICAL[7], CERVICAL[8]]) {
      assert.equal(isVisible(field('agcFeatures'), { interpretation: i, glandularOrigin: o }), o !== 'Endometrial');
      assert.equal(isVisible(field('agcEndometrialFeatures'), { interpretation: i, glandularOrigin: o }), o === 'Endometrial');
    }
  }
  for (const f of schema.fields.filter((x) => /Features$/.test(x.id))) {
    assert.ok(f.help && f.help.length > 80, `${f.id} carries criteria in its help`);
    assert.ok(f.default.every((d) => f.options.includes(d)), `${f.id} defaults are options`);
    assert.ok(f.options.length <= 11, `${f.id} stays short`);
  }
});

test('reference galleries: Bethesda categories and organisms, every photo sourced, openly licensed and small', () => {
  const galleries = { interpretation: 9, features: 12 };
  const used = new Set();
  for (const [id, n] of Object.entries(galleries)) {
    const ref = field(id).reference;
    assert.equal(ref.groups.length, n, `${id} groups`);
    assert.ok(ref.groups.filter((g) => g.images?.length).length >= 2, `${id} has illustrated groups`);
    for (const g of ref.groups) {
      assert.ok(g.points?.length, `${id}/${g.heading} has criteria points`);
      for (const im of g.images || []) {
        used.add(im.src);
        assert.ok(im.src.startsWith('assets/reference/cervical_cytology/'), im.src);
        assert.ok(fs.existsSync(path.join(root, im.src)), `${im.src} exists`);
        assert.ok(fs.statSync(path.join(root, im.src)).size <= 150 * 1024, `${im.src} is at most 150 kB`);
        assert.match(im.license, /^(CC0|CC BY|Public domain|NIH|TCGA|Open access)/i, `${im.src} licence`);
        assert.match(im.url, /^https:\/\//, `${im.src} url`);
        assert.ok(im.caption.length > 20 && im.credit, `${im.src} caption and credit`);
      }
    }
  }
  assert.deepEqual(field('interpretation').reference.groups.map((g) => g.heading), ['NILM', 'ASC-US', 'ASC-H', 'LSIL', 'HSIL', 'Squamous cell carcinoma', 'AGC and its mimics', 'Endocervical AIS', 'Adenocarcinoma']);
  const files = fs.readdirSync(path.join(root, 'assets', 'reference', 'cervical_cytology')).map((f) => `assets/reference/cervical_cytology/${f}`);
  assert.deepEqual(files.filter((f) => !used.has(f)), [], 'every photo in the folder is used');
});
