// Colonic polyp descriptions and malignant polyp levels (user request 2026-10-05):
// sessile serrated lesion, traditional serrated adenoma and high grade dysplasia sentences that name
// their features; focal high grade dysplasia; Haggitt / Kikuchi levels as the depth sentence, with
// depth and width of submucosal invasion. Spec: docs/specs/colonic-polyp-descriptions.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { generate, snippetsFor, normalisePart, isVisible, createPart } from '../src/engine.js';
import { loadAll } from '../src/registry.js';
import { presetValues } from '../src/intake.js';

const reg = await loadAll();
const { schema, generator } = reg.colonic_polyp;
const field = (id) => schema.fields.find((f) => f.id === id);
const base = { site: 'Sigmoid', type: 'tubularAdenoma', dysplasia: 'Low grade dysplasia', customSpecimen: '', comment: '' };
const ca = {
  dysplasia: 'Invasive adenocarcinoma', caKind: 'Polypectomy', histType: 'Adenocarcinoma NOS', histTypeOther: '',
  differentiation: 'Moderately differentiated', backgroundAdenoma: 'Present (polyp type above)', depth: 'Submucosa',
  lvi: 'Not identified', budding: 'Low (Bd1, 0-4 buds)', margin: 'Clear', marginDistance: '3', haggitt: 'Not applicable',
  kikuchi: 'Not applicable', invasionDepth: '', invasionWidth: '', mmr: 'Not performed', molecularPending: false
};
const run = (values, options = {}) => generate(schema, generator, {
  schemaId: 'colonic_polyp', caseTitle: '', options: { includeHeader: true, uppercaseDx: true, alwaysLetter: true, ...options },
  parts: [{ label: 'A', values: { ...base, ...values } }]
}).report;
const micro = (r) => r.split('MICROSCOPIC EXAMINATION:\n')[1].split('\n\nDIAGNOSIS')[0].replace(/^\(A\) {2}/, '');
const dx = (r) => r.split('DIAGNOSIS:\n')[1].split('\n')[0].replace(/^\(A\) /, '');
const snippets = (values) => snippetsFor({ colonic_polyp: reg.colonic_polyp }, {
  schemaId: 'colonic_polyp', parts: [{ label: 'A', templateId: 'colonic_polyp', values: { ...base, ...values } }], snippets: {}
}).filter((s) => s.active).map((s) => s.id);
const shown = (id, values) => isVisible(field(id), { ...base, ...values });

const HGD_DEFAULT_TEXT = 'showing cribriform and back-to-back glands, loss of polarity with full-thickness nuclear stratification and markedly enlarged nuclei with prominent nucleoli';

test('schema: the description fields, their defaults and when they show', () => {
  assert.equal(schema.version, '2026.10');
  assert.deepEqual(field('sslFeatures').default, ['Basal dilatation', 'Serration into the crypt base']);
  assert.deepEqual(field('tsaFeatures').default, field('tsaFeatures').options);
  assert.deepEqual(field('hgdFeatures').default, ['Cribriform / back-to-back glands', 'Loss of polarity', 'Enlarged nuclei, prominent nucleoli']);
  assert.equal(field('serratedDysplasia').default, 'Intestinal (adenomatous)');
  assert.equal(field('hgdFocal').default, false);
  for (const id of ['sslFeatures', 'tsaFeatures', 'hgdFeatures']) {
    for (const d of field(id).default) assert.ok(field(id).options.includes(d), `${id}: ${d}`);
  }

  assert.ok(shown('sslFeatures', { type: 'sessileSerrated', dysplasia: 'No dysplasia' }));
  assert.ok(!shown('sslFeatures', { type: 'sessileSerrated', dysplasia: 'Invasive adenocarcinoma' }), 'invasive SSL keeps its one-line background');
  assert.ok(!shown('sslFeatures', { type: 'traditionalSerrated' }));
  assert.ok(shown('tsaFeatures', { type: 'traditionalSerrated', dysplasia: 'Low grade dysplasia' }));
  assert.ok(!shown('tsaFeatures', { type: 'sessileSerrated' }));
  assert.ok(shown('serratedDysplasia', { type: 'sessileSerrated', dysplasia: 'Low grade dysplasia' }));
  assert.ok(!shown('serratedDysplasia', { type: 'sessileSerrated', dysplasia: 'No dysplasia' }));
  assert.ok(!shown('serratedDysplasia', { type: 'traditionalSerrated', dysplasia: 'Low grade dysplasia' }), 'a low grade TSA is its own dysplasia');
  assert.ok(shown('serratedDysplasia', { type: 'traditionalSerrated', dysplasia: 'High grade dysplasia' }));
  assert.ok(!shown('serratedDysplasia', { type: 'tubularAdenoma', dysplasia: 'High grade dysplasia' }));
  assert.ok(shown('hgdFocal', { type: 'tubulovillousAdenoma', dysplasia: 'High grade dysplasia' }));
  assert.ok(!shown('hgdFocal', { type: 'tubularAdenoma', dysplasia: 'At least high grade dysplasia' }));
  assert.ok(!shown('hgdFocal', { type: 'sessileSerrated', dysplasia: 'High grade dysplasia' }));
  assert.ok(shown('hgdFeatures', { type: 'sessileSerrated', dysplasia: 'High grade dysplasia' }));
  assert.ok(shown('hgdFeatures', { dysplasia: 'At least high grade dysplasia' }));
  assert.ok(!shown('hgdFeatures', { dysplasia: 'Low grade dysplasia' }));
});

test('schema: Haggitt, Kikuchi, depth and width show on polypectomy and EMR / ESD only', () => {
  for (const id of ['haggitt', 'kikuchi', 'invasionDepth', 'invasionWidth']) {
    assert.ok(shown(id, { ...ca }), `${id} on a polypectomy`);
    assert.ok(shown(id, { ...ca, caKind: 'EMR / ESD fragments' }), `${id} on EMR / ESD`);
    assert.ok(!shown(id, { ...ca, caKind: 'Biopsy of mass' }), `${id} hidden on a biopsy of a mass`);
    assert.ok(!shown(id, { dysplasia: 'High grade dysplasia', caKind: 'Polypectomy' }), `${id} hidden without invasion`);
  }
  assert.deepEqual(field('haggitt').options, ['Not applicable', 'Level 1', 'Level 2', 'Level 3', 'Level 4', 'Not assessable']);
  assert.deepEqual(field('kikuchi').options, ['Not applicable', 'sm1', 'sm2', 'sm3', 'Not assessable']);
  assert.equal(field('haggitt').optionLabels['Level 4'], 'Level 4 (below the stalk)');
  assert.equal(field('kikuchi').optionLabels.sm1, 'sm1 (upper third)');
});

test('a new part carries the defaults; a draft saved before the change prints them (generator defaults)', () => {
  const fresh = createPart(schema, 0).values;
  assert.deepEqual(fresh.sslFeatures, ['Basal dilatation', 'Serration into the crypt base']);
  assert.deepEqual(fresh.hgdFeatures, field('hgdFeatures').default);
  assert.equal(fresh.hgdFocal, false);
  // `base` has none of the new fields, as a draft saved before 2026-10-05 would not.
  assert.match(micro(run({ type: 'sessileSerrated', dysplasia: 'No dysplasia' })), /which show basal dilatation and serration extending into the crypt bases/);
  assert.match(micro(run({ dysplasia: 'High grade dysplasia' })), new RegExp(HGD_DEFAULT_TEXT));
  // The level values saved before the change are still options.
  const old = normalisePart(schema, { label: 'A', values: { ...base, ...ca, haggitt: 'Level 2', kikuchi: 'sm1' } });
  assert.equal(old.values.haggitt, 'Level 2');
  assert.equal(old.values.kikuchi, 'sm1');
});

test('sessile serrated lesion: distorted crypts named, dysplasia typed', () => {
  const ssl = { type: 'sessileSerrated' };
  assert.equal(micro(run({ ...ssl, dysplasia: 'No dysplasia' })),
    'Sections show large intestinal mucosa with architecturally distorted serrated crypts, which show basal dilatation and serration extending into the crypt bases, in keeping with a sessile serrated lesion / adenoma. No cytological dysplasia is identified. There is no evidence of invasive malignancy.');
  assert.match(micro(run({ ...ssl, dysplasia: 'No dysplasia', sslFeatures: ['Basal dilatation', 'Serration into the crypt base', 'Horizontal growth (L / inverted T)'] })),
    /which show basal dilatation, serration extending into the crypt bases and horizontal growth along the muscularis mucosae \(L-shaped and inverted T-shaped crypts\), in keeping/);
  assert.match(micro(run({ ...ssl, dysplasia: 'No dysplasia', sslFeatures: [] })),
    /^Sections show large intestinal mucosa with architecturally distorted serrated crypts, in keeping with a sessile serrated lesion \/ adenoma\./);
  assert.match(micro(run({ ...ssl, dysplasia: 'Low grade dysplasia' })),
    /adenoma\. There is a focus of low grade dysplasia of intestinal \(adenomatous\) type, with elongated, pseudostratified, hyperchromatic nuclei\. There is no evidence of invasive malignancy\.$/);
  assert.match(micro(run({ ...ssl, dysplasia: 'Low grade dysplasia', serratedDysplasia: 'Serrated' })),
    /There is a focus of low grade dysplasia of serrated type, with cuboidal cells, eosinophilic cytoplasm and enlarged vesicular nuclei\./);
  assert.match(micro(run({ ...ssl, dysplasia: 'Low grade dysplasia', serratedDysplasia: 'Not specified' })),
    /There is a focus of low grade dysplasia\. There is no evidence/);
  assert.match(micro(run({ ...ssl, dysplasia: 'High grade dysplasia' })),
    new RegExp(`There is a focus of high grade dysplasia of intestinal \\(adenomatous\\) type, ${HGD_DEFAULT_TEXT}\\. There is no evidence of invasive malignancy\\.$`));
  assert.match(micro(run({ ...ssl, dysplasia: 'At least high grade dysplasia', hgdReason: 'Fragmented material' })),
    /architecturally distorted serrated crypts.*There is a focus of high grade dysplasia of intestinal \(adenomatous\) type, showing .*\. Invasion cannot be excluded on this fragmented material\.$/);
  assert.equal(dx(run({ ...ssl, dysplasia: 'No dysplasia' })), 'SIGMOID, Sigmoid polyp, polypectomy - SESSILE SERRATED LESION / ADENOMA.', 'diagnosis term unchanged');
});

test('traditional serrated adenoma: the four features, trimmed by the ticks', () => {
  const tsa = { type: 'traditionalSerrated' };
  assert.equal(micro(run({ ...tsa, dysplasia: 'Low grade dysplasia' })),
    'Sections show a polypoid piece of large intestinal mucosa with villiform architecture, slit-like serrations and ectopic crypt foci, lined by tall columnar cells with abundant eosinophilic cytoplasm and pencillate nuclei, in keeping with a traditional serrated adenoma with low grade dysplasia. There is no evidence of invasive malignancy.');
  assert.match(micro(run({ ...tsa, dysplasia: 'Low grade dysplasia', tsaFeatures: ['Slit-like serrations', 'Villiform architecture'] })),
    /^Sections show a polypoid piece of large intestinal mucosa with villiform architecture and slit-like serrations, in keeping with a traditional serrated adenoma with low grade dysplasia\./);
  assert.match(micro(run({ ...tsa, dysplasia: 'Low grade dysplasia', tsaFeatures: ['Eosinophilic cells, pencillate nuclei'] })),
    /^Sections show a polypoid piece of large intestinal mucosa lined by tall columnar cells with abundant eosinophilic cytoplasm and pencillate nuclei, in keeping with/);
  assert.match(micro(run({ ...tsa, dysplasia: 'Low grade dysplasia', tsaFeatures: [] })),
    /^Sections show a polypoid piece of large intestinal mucosa with features of a traditional serrated adenoma with low grade dysplasia\./);
  const hgd = micro(run({ ...tsa, dysplasia: 'High grade dysplasia', serratedDysplasia: 'Serrated' }));
  assert.match(hgd, /pencillate nuclei, in keeping with a traditional serrated adenoma\. There is a focus of high grade dysplasia of serrated type, showing cribriform/);
  assert.doesNotMatch(hgd, /adenoma with low grade dysplasia/);
  assert.equal(dx(run({ ...tsa, dysplasia: 'High grade dysplasia' })), 'SIGMOID, Sigmoid polyp, polypectomy - TRADITIONAL SERRATED ADENOMA with HIGH GRADE DYSPLASIA.');
});

test('conventional high grade dysplasia: features named, focal option', () => {
  assert.equal(micro(run({ dysplasia: 'High grade dysplasia' })),
    `Sections show a polypoid piece of large intestinal mucosa featuring tubular crypts with high grade dysplasia, ${HGD_DEFAULT_TEXT}. There is no evidence of invasive malignancy.`);
  assert.equal(micro(run({ dysplasia: 'High grade dysplasia', hgdFeatures: [] })),
    'Sections show a polypoid piece of large intestinal mucosa featuring tubular crypts with high grade dysplasia. There is no evidence of invasive malignancy.', 'nothing ticked: the plain sentence');
  // Printed in the list's order whatever order the ticks were made in.
  assert.match(micro(run({ dysplasia: 'High grade dysplasia', hgdFeatures: ['Luminal necrosis', 'Glandular crowding', 'Pleomorphism'] })),
    /high grade dysplasia, showing complex glandular crowding and irregularity, nuclear pleomorphism and intraluminal necrotic debris\./);

  const focal = run({ type: 'tubulovillousAdenoma', dysplasia: 'High grade dysplasia', hgdFocal: true });
  assert.equal(micro(focal),
    `Sections show a polypoid fragment of large intestinal mucosa with tubulovillous architecture and low grade dysplasia. There is focal high grade dysplasia, ${HGD_DEFAULT_TEXT}. There is no evidence of invasive malignancy.`);
  assert.equal(dx(focal), 'SIGMOID, Sigmoid polyp, polypectomy - TUBULOVILLOUS ADENOMA with focal HIGH GRADE DYSPLASIA.');
  assert.equal(dx(run({ dysplasia: 'High grade dysplasia', hgdFocal: true }, { uppercaseDx: false })),
    'Sigmoid, Sigmoid polyp, polypectomy - Tubular adenoma with focal high grade dysplasia.');
  // Focal is for conventional adenomas with high grade dysplasia only.
  assert.equal(dx(run({ dysplasia: 'At least high grade dysplasia', hgdFocal: true })), 'SIGMOID, Sigmoid polyp, polypectomy - TUBULAR ADENOMA with at least HIGH GRADE DYSPLASIA.');
  assert.equal(dx(run({ type: 'sessileSerrated', dysplasia: 'High grade dysplasia', hgdFocal: true })), 'SIGMOID, Sigmoid polyp, polypectomy - SESSILE SERRATED LESION / ADENOMA with HIGH GRADE DYSPLASIA.');
  assert.doesNotMatch(micro(run({ dysplasia: 'Low grade dysplasia', hgdFocal: true })), /focal/);
});

test('low grade adenomas and hyperplastic polyps print as before', () => {
  assert.equal(micro(run({ dysplasia: 'Low grade dysplasia' })),
    'Sections show a polypoid piece of large intestinal mucosa featuring tubular crypts with low grade dysplasia. There is no evidence of invasive malignancy.');
  assert.equal(micro(run({ type: 'hyperplasticPolyp', dysplasia: 'Not applicable' })),
    'Sections show a polypoid piece of large intestinal mucosa featuring hyperplastic crypts with stellate-shaped lumina, in keeping with hyperplastic polyp. There is no evidence of dysplasia or malignancy.');
});

test('Haggitt levels: the depth sentence and the diagnosis name the level', () => {
  const lines = {
    'Level 1': 'Invasion extends into the submucosa of the polyp head (Haggitt level 1).',
    'Level 2': 'Invasion extends into the submucosa at the neck of the polyp (Haggitt level 2).',
    'Level 3': 'Invasion extends into the submucosa of the stalk (Haggitt level 3).',
    'Level 4': 'Invasion extends into the submucosa below the stalk (Haggitt level 4).'
  };
  for (const [level, sentence] of Object.entries(lines)) {
    const r = run({ ...ca, haggitt: level });
    assert.ok(micro(r).includes(`invasive moderately differentiated adenocarcinoma composed of irregular malignant glands with a desmoplastic stromal response. ${sentence} Lymphovascular invasion`), level);
    assert.doesNotMatch(micro(r), /Invasion extends into the submucosa\./, `${level}: the level replaces the plain sentence`);
    assert.match(dx(r), new RegExp(`moderately differentiated; submucosal invasion \\(Haggitt level ${level.slice(-1)}\\); margin clear \\(3 mm\\)`), level);
  }
  // A level also stands when the depth was left "Not assessable": the level is the depth.
  assert.match(micro(run({ ...ca, depth: 'Not assessable', haggitt: 'Level 3' })), /of the stalk \(Haggitt level 3\)\./);
  assert.doesNotMatch(micro(run({ ...ca, depth: 'Not assessable', haggitt: 'Level 3' })), /depth of invasion cannot be assessed/);
});

test('Kikuchi levels, both levels, not assessable, and muscularis propria', () => {
  assert.match(micro(run({ ...ca, kikuchi: 'sm1' })), /Invasion is confined to the upper third of the submucosa \(Kikuchi level sm1\)\./);
  assert.match(micro(run({ ...ca, kikuchi: 'sm2' })), /Invasion extends into the middle third of the submucosa \(Kikuchi level sm2\)\./);
  assert.match(micro(run({ ...ca, kikuchi: 'sm3' })), /Invasion extends into the lower third of the submucosa \(Kikuchi level sm3\)\./);
  assert.match(dx(run({ ...ca, kikuchi: 'sm1' })), /; submucosal invasion \(Kikuchi level sm1\);/);
  const both = run({ ...ca, haggitt: 'Level 2', kikuchi: 'sm1' });
  assert.match(micro(both), /at the neck of the polyp \(Haggitt level 2; Kikuchi level sm1\)\./);
  assert.match(dx(both), /submucosal invasion \(Haggitt level 2, Kikuchi level sm1\)/);

  const na = micro(run({ ...ca, haggitt: 'Not assessable', kikuchi: 'Not assessable' }));
  assert.match(na, /Invasion extends into the submucosa\. The Haggitt level cannot be assessed on this specimen\. The Kikuchi level cannot be assessed, as muscularis propria is not represented\. Lymphovascular/);
  assert.match(dx(run({ ...ca, haggitt: 'Not assessable' })), /; submucosal invasion; margin clear/);

  const mp = run({ ...ca, depth: 'Muscularis propria', haggitt: 'Level 4', kikuchi: 'Not assessable' });
  assert.match(micro(mp), /Invasion extends into the muscularis propria\. Lymphovascular/);
  assert.doesNotMatch(micro(mp), /Haggitt|Kikuchi/);
  assert.match(dx(mp), /; invasion into muscularis propria;/);

  const biopsy = run({ ...ca, caKind: 'Biopsy of mass', margin: 'Not applicable (biopsy)', haggitt: 'Level 2', kikuchi: 'Not assessable', invasionDepth: '2' });
  assert.doesNotMatch(micro(biopsy) + dx(biopsy), /Haggitt|Kikuchi|depth of submucosal invasion/);
});

test('depth and width of submucosal invasion', () => {
  assert.match(micro(run({ ...ca, kikuchi: 'sm1', invasionDepth: '0.8', invasionWidth: '3.5' })),
    /\(Kikuchi level sm1\)\. The depth of submucosal invasion is 0\.8 mm and the width of invasion is 3\.5 mm\. Lymphovascular/);
  assert.match(micro(run({ ...ca, invasionDepth: '1.25' })), /Invasion extends into the submucosa\. The depth of submucosal invasion is 1\.3 mm\. Lymphovascular/);
  assert.match(micro(run({ ...ca, invasionWidth: '4' })), /The width of invasion is 4 mm\./);
  for (const blank of ['', '0', 'abc']) assert.doesNotMatch(micro(run({ ...ca, invasionDepth: blank, invasionWidth: blank })), /depth of submucosal|width of invasion/, `"${blank}"`);
  assert.doesNotMatch(dx(run({ ...ca, invasionDepth: '1.5' })), /1\.5/, 'the measurement stays in the microscopy');
});

test('deep submucosal invasion (Haggitt level 4, Kikuchi sm2 / sm3) is an adverse feature', () => {
  assert.deepEqual(snippets({ ...ca }), ['colonic_malignant_polyp_favourable']);
  for (const v of [{ haggitt: 'Level 4' }, { kikuchi: 'sm2' }, { kikuchi: 'sm3' }]) {
    assert.deepEqual(snippets({ ...ca, ...v }), ['colonic_malignant_polyp_risk'], JSON.stringify(v));
  }
  for (const v of [{ haggitt: 'Level 3' }, { kikuchi: 'sm1' }, { haggitt: 'Not assessable' }, { invasionDepth: '2.5' }]) {
    assert.deepEqual(snippets({ ...ca, ...v }), ['colonic_malignant_polyp_favourable'], JSON.stringify(v));
  }
  // Levels do not apply to a biopsy of a mass, nor once invasion reaches the muscularis propria.
  assert.deepEqual(snippets({ ...ca, caKind: 'Biopsy of mass', haggitt: 'Level 4' }), []);
  const risk = schema.snippets.find((s) => s.id === 'colonic_malignant_polyp_risk').text;
  assert.match(risk, /high grade tumour budding, deep submucosal invasion, or a margin of less than 1 mm\) are present\./);
});

test('intake: the request line sets the specimen kind', () => {
  const kind = (text) => presetValues(schema, { text, raw: text }).caKind;
  assert.equal(kind('Sigmoid colon, polypectomy'), 'Polypectomy');
  assert.equal(kind('Transverse colon polyp'), 'Polypectomy');
  assert.equal(kind('Rectum, snare polypectomy'), 'Polypectomy');
  assert.equal(kind('Rectum, EMR'), 'EMR / ESD fragments');
  assert.equal(kind('Rectum, endoscopic submucosal dissection'), 'EMR / ESD fragments');
  assert.equal(kind('Rectum, polyp, biopsy'), undefined, 'a biopsy of a polyp keeps the form default');
  assert.equal(kind('Sigmoid colon, biopsy'), undefined);
  assert.equal(kind('Rectal mass, biopsy'), undefined);
  assert.equal(field('caKind').default, 'Biopsy of mass');
});
