// Haemorrhoid (benign batch 3). Card: docs/roadmap.md "Haemorrhoid, cholesteatoma and hernia sac";
// house sentences from the 2021-2026 benign-resection profile (docs/case-mix/benign-resections-2021-2026.md).
// Wording is deliberate; update the strings only on purpose.
// Fixtures: tests/fixtures/haemorrhoid/*.json (golden; --update only after a deliberate change).
// The routing lines below are house-style lines, not case text.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCase, generate } from '../src/engine.js';
import { parseIntake, matchParts, presetValues } from '../src/intake.js';
import { extractMacro } from '../src/macroparse.js';
import { rowGroups } from '../src/picker.js';
import { loadAll, loadManifest } from '../src/registry.js';
import { CLOSING, THROMBOSIS, ULCERATION, PROLAPSE, ATYPIA, FEP } from '../generators/haemorrhoid.js';

const registry = await loadAll();
const manifest = await loadManifest();
const t = registry.haemorrhoid;
const schema = t.schema;
const here = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(here, 'fixtures', 'haemorrhoid');
const UPDATE = process.argv.includes('--update');
const EXAMPLE = schema.example.parts[0].values;
const one = (values) => {
  const c = createCase(schema, 1);
  c.parts[0].values = { ...c.parts[0].values, ...values };
  return c;
};
const run = (values) => generate(schema, t.generator, one(values));
const example = () => ({ ...JSON.parse(JSON.stringify(schema.example)), schemaId: schema.id });
const checksOf = (r) => r.issues.map((i) => [i.level, i.field]);

test('template is registered with the required metadata', () => {
  assert.ok(t, 'registry has haemorrhoid');
  assert.equal(schema.system, 'GI');
  assert.equal(schema.kind, 'benign resection');
  assert.ok(schema.label && !/^(biopsy|polyp|specimen)$/i.test(schema.label), 'label is an organ word');
  assert.ok(schema.shortName.includes('·'), 'shortName is "Organ · procedure"');
  assert.equal(schema.style.british, true);
});

test('it sits in the Resections row under GI and is no longer a pending placeholder', () => {
  const planned = JSON.parse(fs.readFileSync(path.join(here, '..', 'templates', 'planned.json'), 'utf8')).planned;
  assert.ok(!planned.some((p) => p.id === 'haemorrhoid'), 'not in planned.json');
  const group = rowGroups(manifest, planned, 'bottom').find((g) => g.items.some((i) => i.id === 'haemorrhoid'));
  assert.ok(group, 'in the Resections & frozen row');
  assert.equal(group.system, 'GI');
  assert.ok(!group.items.find((i) => i.id === 'haemorrhoid').planned, 'a built template, not a pending one');
});

test('the example case renders every expected block', () => {
  const c = example();
  c.options = { ...c.options, includeHeader: true };
  const r = generate(schema, t.generator, c);
  for (const heading of [/SPECIMENS?:/, /MACROSCOPIC DESCRIPTION:/, /BLOCK KEY:/, /MICROSCOPIC EXAMINATION:/, /DIAGNOSIS:/]) assert.match(r.report, heading);
});

test('the example: a thrombosed haemorrhoid labelled by its clock position', () => {
  const r = run(EXAMPLE);
  assert.equal(r.specimens, "Anus, 3 o'clock haemorrhoid, haemorrhoidectomy");
  assert.equal(r.macro, "Received in formalin is a piece of haemorrhoidal tissue labelled 3 o'clock, measuring 2 x 1.5 x 1 cm. The cut surface shows dilated vessels within the stroma. Representative sections in 1 block.");
  assert.equal(r.blockKey, '(1) Haemorrhoid, representative sections.');
  assert.equal(r.microscopy, `Sections show anal squamous mucosa. Ectatic muscular blood vessels are noted in the stroma. Some of the vessels contain thrombi. The features are those of haemorrhoid. ${CLOSING}`);
  assert.equal(r.diagnosis, "ANUS, 3 o'clock haemorrhoid, haemorrhoidectomy - HAEMORRHOID with THROMBOSIS");
  assert.equal(r.comment, '');
  assert.deepEqual(r.issues, []);
});

test('an untouched form prints the plain house report', () => {
  const r = run({});
  assert.equal(r.specimens, 'Anus, haemorrhoid, excision');
  assert.equal(r.macro, 'Received in formalin is a piece of haemorrhoidal tissue. The cut surface shows dilated vessels within the stroma. Representative sections in 1 block.');
  assert.equal(r.microscopy, `Sections show anal squamous mucosa. Ectatic muscular blood vessels are noted in the stroma. The features are those of haemorrhoid. ${CLOSING}`);
  assert.equal(r.diagnosis, 'ANUS, haemorrhoid, excision - HAEMORRHOID');
});

test('each finding prints its sentence; the diagnosis joins them the house way', () => {
  const r = run({ ...EXAMPLE, findings: [THROMBOSIS, ULCERATION, PROLAPSE] });
  assert.equal(r.microscopy, `Sections show anal squamous mucosa. Ectatic muscular blood vessels are noted in the stroma. Some of the vessels contain thrombi. The surface is ulcerated. There is mucosal prolapse change, with fibromuscular proliferation in the lamina propria. The features are those of haemorrhoid. ${CLOSING}`);
  assert.equal(r.diagnosis, "ANUS, 3 o'clock haemorrhoid, haemorrhoidectomy - HAEMORRHOID with THROMBOSIS, ULCERATION AND MUCOSAL PROLAPSE CHANGE");
  const polyp = run({ ...EXAMPLE, findings: [FEP, THROMBOSIS] });
  assert.match(polyp.microscopy, /Some of the vessels contain thrombi\. A fibroepithelial polyp is noted, consisting of a fibrovascular core covered by unremarkable epidermis\. The features/);
  assert.equal(polyp.diagnosis, "ANUS, 3 o'clock haemorrhoid, haemorrhoidectomy - FIBROEPITHELIAL POLYP; HAEMORRHOID with THROMBOSIS");
  const atypia = run({ ...EXAMPLE, findings: [ATYPIA] });
  assert.match(atypia.microscopy, /in the stroma\. The squamous epithelium shows reactive atypia\. The features/);
  assert.equal(atypia.diagnosis, "ANUS, 3 o'clock haemorrhoid, haemorrhoidectomy - HAEMORRHOID", 'reactive atypia stays out of the diagnosis line');
});

test('the mucosa chosen opens the microscopy', () => {
  const opening = (mucosa) => run({ ...EXAMPLE, mucosa }).microscopy.split('. ')[0];
  assert.equal(opening('Anal squamous mucosa'), 'Sections show anal squamous mucosa');
  assert.equal(opening('Anorectal junction'), 'Sections show squamous and columnar mucosa of the anorectal junction');
  assert.equal(opening('Rectal mucosa'), 'Sections show rectal mucosa');
  assert.equal(opening('Perianal skin'), 'Sections show perianal skin');
});

test('pieces, a thrombosed cut surface, all-embedded blocks and notes', () => {
  const r = run({ ...EXAMPLE, description: 'Pieces of haemorrhoidal tissue', cutSurface: 'Dilated vessels with thrombus', blocks: '2', blockScheme: 'All embedded', additionalNotes: 'Deeper levels were examined.' });
  assert.equal(r.macro, "Received in formalin are pieces of haemorrhoidal tissue labelled 3 o'clock, measuring 2 x 1.5 x 1 cm in aggregate. The cut surface shows dilated vessels within the stroma, some containing thrombus. All embedded in 2 blocks.");
  assert.equal(r.blockKey, '(1-2) Haemorrhoid, all embedded.');
  assert.ok(r.microscopy.endsWith(`${CLOSING} Deeper levels were examined.`));
});

test('every branch closes on the house sentence and prints "haemorrhoid" in the singular, British spelling', () => {
  const findings = schema.fields.find((f) => f.id === 'findings').options;
  for (const mucosa of schema.fields.find((f) => f.id === 'mucosa').options) {
    for (const f of [[], ...findings.map((x) => [x]), findings]) {
      const c = one({ ...EXAMPLE, mucosa, findings: f });
      c.options = { ...c.options, includeHeader: true };
      const r = generate(schema, t.generator, c);
      assert.ok(r.microscopy.endsWith(CLOSING), `${mucosa} / ${f.join('+')}: closing sentence`);
      assert.ok(!/hemorrhoid/i.test(r.report), 'no US spelling');
      assert.ok(!/HAEMORRHOIDS/.test(r.report), 'singular HAEMORRHOID in the diagnosis');
    }
  }
});

test('the Checks panel flags mucosal prolapse change recorded on perianal skin', () => {
  assert.deepEqual(checksOf(run({ ...EXAMPLE, mucosa: 'Perianal skin', findings: [PROLAPSE] })), [['warn', 'mucosa']]);
  assert.deepEqual(checksOf(run({ ...EXAMPLE, mucosa: 'Anorectal junction', findings: [PROLAPSE] })), []);
});

test('a multi-part case letters its specimens', () => {
  const r = generate(schema, t.generator, createCase(schema, 2));
  assert.match(r.specimens, /\(A\)/);
  assert.match(r.specimens, /\(B\)/);
});

// ---------- intake ----------

const route = (line, history = '') => matchParts(parseIntake(line), history, manifest)[0];
const preset = (line) => {
  const parsed = parseIntake(line);
  return presetValues(schema, parsed.parts[0], matchParts(parsed, '', manifest)[0]);
};

test('intake: a haemorrhoid line lands on this form, confidently, with its clock position and procedure', () => {
  for (const line of ['Haemorrhoidectomy', "3 o'clock haemorrhoid", 'Anus, haemorrhoid, excision', 'Thrombosed haemorrhoid', 'Haemorrhoid', 'Hemorrhoid', 'Piles', 'Haemorrhoids, haemorrhoidectomy']) {
    const m = route(line);
    assert.deepEqual([m.templateId, m.tier], ['haemorrhoid', 'confident'], line);
  }
  assert.deepEqual(preset('Haemorrhoidectomy'), { procedure: 'Haemorrhoidectomy' });
  assert.deepEqual(preset("3 o'clock haemorrhoid"), { site: "3 o'clock" });
  assert.deepEqual(preset('External haemorrhoid, excision'), { procedure: 'Excision', site: 'External' });
  assert.deepEqual(preset('Thrombosed haemorrhoid'), {}, 'the clinical adjective is not taken as a label');
});

test('intake: other anal lines keep their routes', () => {
  for (const line of ['Perianal abscess', 'Anal fistula', 'Fistula in ano', 'Pilonidal sinus']) assert.equal(route(line).templateId, 'abscess_granulation', line);
  assert.equal(route('Rectal polyp').templateId, 'colonic_polyp');
  assert.notEqual(route('Anal polyp').templateId, 'haemorrhoid');
});

test('pasted gross text fills the description, the measurements and the blocks', () => {
  assert.deepEqual(extractMacro(schema, "Received in formalin is a piece of haemorrhoidal tissue labelled 3 o'clock, measuring 2 x 1.5 x 1 cm. The cut surface shows dilated vessels. Representative sections in 1 block."),
    { dimensions: '2 x 1.5 x 1', blocks: '1', blockScheme: 'Representative sections', description: 'A piece of haemorrhoidal tissue' });
  assert.deepEqual(extractMacro(schema, 'Received in formalin are pieces of haemorrhoidal tissue measuring 3 x 2 x 1 cm in aggregate. All embedded in 2 blocks.'),
    { dimensions: '3 x 2 x 1', blocks: '2', blockScheme: 'All embedded', description: 'Pieces of haemorrhoidal tissue' });
});

// ---------- golden fixtures ----------

const CASES = [
  ['01-thrombosed-haemorrhoid-example', EXAMPLE],
  ['02-plain-haemorrhoid', { procedure: 'Haemorrhoidectomy', dimensions: '1.5 x 1 x 0.8' }],
  ['03-ulcerated-prolapsed-haemorrhoid-pieces', { ...EXAMPLE, description: 'Pieces of haemorrhoidal tissue', cutSurface: 'Dilated vessels with thrombus', mucosa: 'Anorectal junction', findings: [THROMBOSIS, ULCERATION, PROLAPSE], blocks: '2', blockScheme: 'All embedded' }]
];

test('golden fixtures reproduce byte-for-byte', () => {
  fs.mkdirSync(FIX, { recursive: true });
  for (const [name, values] of CASES) {
    const out = run(values);
    const file = path.join(FIX, `${name}.json`);
    const current = { templateId: 'haemorrhoid', values, report: out.report, checks: out.issues };
    if (UPDATE || !fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n'); continue; }
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(out.report, saved.report, `${file} changed; re-run with --update only after a deliberate wording change`);
    assert.deepEqual(out.issues, saved.checks, `${file} checks changed`);
  }
});
