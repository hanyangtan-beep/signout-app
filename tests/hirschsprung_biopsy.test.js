// Hirschsprung rectal biopsy. Card: docs/roadmap.md "Hirschsprung disease — rectal biopsy" (pulled by the user
// 2026-09-30); grounding docs/reference/hirschsprung-morphology.md. Wording is deliberate; update the strings only
// on purpose. Fixtures: tests/fixtures/hirschsprung_biopsy/*.json (golden; --update only after a deliberate change).
// The routing lines below are house-style lines, not case text.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCase, generate, isVisible } from '../src/engine.js';
import { parseIntake, matchParts, presetValues } from '../src/intake.js';
import { rowGroups } from '../src/picker.js';
import { loadAll, loadManifest } from '../src/registry.js';
import { levelOf, ganglionOf, inadequacyOf } from '../generators/hirschsprung_biopsy.js';

const registry = await loadAll();
const manifest = await loadManifest();
const t = registry.hirschsprung_biopsy;
const schema = t.schema;
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const FIX = path.join(here, 'fixtures', 'hirschsprung_biopsy');
const UPDATE = process.argv.includes('--update');
const one = (values) => {
  const c = createCase(schema, 1);
  c.parts[0].values = { ...c.parts[0].values, ...values };
  return c;
};
const run = (values) => generate(schema, t.generator, one(values));
const example = () => ({ ...JSON.parse(JSON.stringify(schema.example)), schemaId: schema.id });
const visible = (values) => schema.fields.filter((f) => isVisible(f, { ...one({}).parts[0].values, ...values })).map((f) => f.id);
const checksOf = (r) => r.issues.map((i) => [i.level, i.field]);
const route = (line, history = '', m = manifest) => matchParts(parseIntake(line), history, m)[0];
const withoutHirschsprung = manifest.filter((e) => e.id !== 'hirschsprung_biopsy');
const preset = (line, history = '') => {
  const parsed = parseIntake(line);
  return presetValues(schema, parsed.parts[0], matchParts(parsed, history, manifest)[0]);
};
const SUCTION = { level: '2', fragments: '2' };
const HD = { ...SUCTION, ganglion: 'Not identified' };
const PRESENT = 'Sections show two pieces of large intestinal mucosa with submucosa, in which clusters of ganglion cells are found.';
const ABSENT = 'Sections show two pieces of large intestinal mucosa with submucosa. No ganglion cells are found.';

// ---------- metadata and menus ----------

test('template is registered with the required metadata', () => {
  assert.ok(t, 'registry has hirschsprung_biopsy');
  assert.equal(schema.system, 'GI');
  assert.equal(schema.kind, 'biopsy');
  assert.equal(schema.label, 'Hirschsprung');
  assert.equal(schema.organ, 'RECTUM');
  assert.equal(schema.shortName, 'Rectum · Hirschsprung biopsy');
  assert.equal(schema.style.british, true);
});

test('it sits with the GI biopsies in the top row, after IBD, and is not a pending placeholder', () => {
  const planned = JSON.parse(fs.readFileSync(path.join(root, 'templates', 'planned.json'), 'utf8')).planned;
  assert.ok(!planned.some((p) => p.id === 'hirschsprung_biopsy'), 'not in planned.json');
  const group = rowGroups(manifest, planned, 'top').find((g) => g.items.some((i) => i.id === 'hirschsprung_biopsy'));
  assert.equal(group.system, 'GI');
  // Peritoneum (Phase 58, 2026-10-07) is built after it. Phase 71 (2026-10-14), deliberate: GVHD now closes the row.
  assert.deepEqual(group.items.filter((i) => !i.planned).map((i) => i.label), ['Gastric', 'Colonic polyp', 'Duodenum', 'Oesophagus', 'IBD', 'Hirschsprung', 'Peritoneum', 'GVHD']);
});

test('the example: suction biopsies at two levels with ganglion cells and calretinin-positive fibrils', () => {
  const c = example();
  c.options = { ...c.options, includeHeader: true };
  const r = generate(schema, t.generator, c);
  for (const heading of [/SPECIMENS?:/, /MICROSCOPIC EXAMINATION:/, /DIAGNOSIS:/]) assert.match(r.report, heading);
  assert.equal(r.specimens, '(A) Rectum, 2 cm from AV, suction rectal biopsy\n(B) Rectum, 3 cm from AV, suction rectal biopsy');
  assert.equal(r.microscopy.split('\n\n')[0], `(A) ${PRESENT} No hypertrophic submucosal nerves are seen. `
    + 'Immunostaining for calretinin shows positive nerve fibrils in the lamina propria and muscularis mucosae.');
  assert.equal(r.diagnosis, '(A) RECTUM, 2 cm from AV, suction rectal biopsy:\n- GANGLION CELLS PRESENT.\n\n(B) RECTUM, 3 cm from AV, suction rectal biopsy:\n- GANGLION CELLS PRESENT.');
  assert.deepEqual(r.issues, []);
});

// ---------- specimen line ----------

test('the level reads "<n> cm from AV" from a bare distance; other wording prints as typed', () => {
  assert.equal(levelOf({ level: '2' }), '2 cm from AV');
  assert.equal(levelOf({ level: '2cm' }), '2 cm from AV');
  assert.equal(levelOf({ level: '2-3' }), '2-3 cm from AV');
  assert.equal(levelOf({ level: '2.5 cm' }), '2.5 cm from AV');
  assert.equal(levelOf({ level: '3 cm from AV.' }), '3 cm from AV');
  assert.equal(levelOf({ level: '2cm above the dentate line' }), '2 cm above the dentate line');
  assert.equal(levelOf({ level: '' }), '');
});

test('the procedure prints the house way: suction rectal biopsy, suction biopsy away from the rectum, full-thickness or plain biopsy', () => {
  assert.equal(run(SUCTION).specimens, 'Rectum, 2 cm from AV, suction rectal biopsy');
  assert.equal(run({ ...SUCTION, site: 'Sigmoid colon' }).specimens, 'Sigmoid colon, 2 cm from AV, suction biopsy');
  assert.equal(run({ ...SUCTION, procedure: 'Full-thickness biopsy' }).specimens, 'Rectum, 2 cm from AV, full-thickness biopsy');
  assert.equal(run({ ...SUCTION, procedure: 'Biopsy' }).specimens, 'Rectum, 2 cm from AV, biopsy');
  assert.equal(run({ fragments: '2' }).specimens, 'Rectum, suction rectal biopsy', 'no level, no distance');
  assert.equal(run(SUCTION).diagnosis.split('\n')[0], 'RECTUM, 2 cm from AV, suction rectal biopsy:', 'a single part drops its letter');
});

// ---------- microscopy ----------

test('the opening sentence counts the pieces and names the submucosa', () => {
  assert.match(run({ ...SUCTION, fragments: '1' }).microscopy, /^Sections show a piece of large intestinal mucosa with submucosa, in which/);
  assert.match(run({ ...SUCTION, fragments: '' }).microscopy, /^Sections show pieces of large intestinal mucosa/);
  assert.match(run({ ...SUCTION, fragments: '12' }).microscopy, /^Sections show 12 pieces of large intestinal mucosa/);
  assert.match(run({ ...HD, submucosa: 'Scant' }).microscopy, /^Sections show two pieces of large intestinal mucosa with very scanty submucosa\. No ganglion cells are found\./);
  assert.match(run({ ...HD, submucosa: 'Absent' }).microscopy, /^Sections show two pieces of large intestinal mucosa without submucosa\. No ganglion cells are found\./);
  assert.equal(run(SUCTION).microscopy, PRESENT);
  assert.equal(run(HD).microscopy, ABSENT);
});

test('a full-thickness biopsy reads the submucosal and myenteric plexuses; without muscularis propria it reads as a mucosal biopsy', () => {
  const ft = { ...SUCTION, fragments: '1', procedure: 'Full-thickness biopsy' };
  const wall = 'Sections show a full-thickness piece of large intestinal wall, including the muscularis propria.';
  assert.equal(run({ ...ft, ganglion: 'Present', myenteric: 'Present' }).microscopy, `${wall} Clusters of ganglion cells are found in the submucosal and myenteric plexuses.`);
  assert.equal(run({ ...ft, ganglion: 'Present', myenteric: 'Not identified' }).microscopy, `${wall} Clusters of ganglion cells are found in the submucosa; no ganglion cells are found in the myenteric plexus.`);
  assert.equal(run({ ...ft, ganglion: 'Not identified', myenteric: 'Present' }).microscopy, `${wall} Clusters of ganglion cells are found in the myenteric plexus; no ganglion cells are found in the submucosa.`);
  assert.equal(run({ ...ft, ganglion: 'Not identified', myenteric: 'Not identified' }).microscopy, `${wall} No ganglion cells are found in the submucosal or myenteric plexus.`);
  assert.equal(run({ ...ft, fragments: '2', ganglion: 'Present', myenteric: 'Present' }).microscopy.split('.')[0], 'Sections show two full-thickness pieces of large intestinal wall, including the muscularis propria');
  assert.equal(run({ ...ft, ganglion: 'Present', myenteric: 'Not sampled' }).microscopy,
    'Sections show a piece of large intestinal mucosa with submucosa, in which clusters of ganglion cells are found. The muscularis propria is not included.');
  assert.equal(run({ ...ft, ganglion: 'Not identified', myenteric: 'Not sampled', submucosa: 'Scant' }).microscopy,
    'Sections show a piece of large intestinal mucosa with very scanty submucosa. No ganglion cells are found. The muscularis propria is not included.');
  assert.equal(ganglionOf({ procedure: 'Full-thickness biopsy', ganglion: 'Not identified', myenteric: 'Present' }), 'Present', 'myenteric ganglion cells count');
  assert.equal(ganglionOf({ procedure: 'Suction biopsy', ganglion: 'Not identified', myenteric: 'Present' }), 'Not identified', 'a stale myenteric answer on a suction biopsy does not');
});

test('immature ganglion cells, anal canal mucosa and the sections examined', () => {
  assert.equal(run({ ...SUCTION, immature: true }).microscopy, `${PRESENT} The ganglion cells are immature.`);
  assert.equal(run({ ...HD, immature: true }).microscopy, ABSENT, 'immaturity needs ganglion cells');
  assert.equal(run({ ...SUCTION, distal: 'Transitional mucosa' }).microscopy, `${PRESENT} The biopsy also includes transitional mucosa of the anal canal.`);
  assert.equal(run({ ...SUCTION, distal: 'Squamous mucosa' }).microscopy, `${PRESENT} The biopsy also includes squamous mucosa of the anal canal.`);
  assert.equal(run({ ...SUCTION, distal: 'Squamous and transitional mucosa' }).microscopy, `${PRESENT} The biopsy also includes squamous and transitional mucosa of the anal canal.`);
  assert.equal(run({ ...HD, sections: '1' }).microscopy, `${ABSENT} One section is examined.`);
  assert.equal(run({ ...HD, sections: '8' }).microscopy, `${ABSENT} Eight serial sections are examined.`);
  assert.equal(run({ ...HD, sections: '60' }).microscopy, `${ABSENT} A total of 60 serial sections are examined.`);
});

test('hypertrophic nerves, acetylcholinesterase and calretinin sentences', () => {
  assert.equal(run({ ...SUCTION, nerves: 'Not recorded' }).microscopy, PRESENT);
  assert.equal(run({ ...SUCTION, nerves: 'Not hypertrophic' }).microscopy, `${PRESENT} No hypertrophic submucosal nerves are seen.`);
  assert.equal(run({ ...HD, nerves: 'Hypertrophic' }).microscopy, `${ABSENT} Hypertrophic submucosal nerves are seen.`);
  assert.equal(run({ ...HD, nerves: 'Hypertrophic', nerveDiameter: '45' }).microscopy, `${ABSENT} Hypertrophic submucosal nerves are seen, measuring up to 45 microns in diameter.`);
  assert.equal(run({ ...SUCTION, ache: 'No increase' }).microscopy, `${PRESENT} Histochemical staining for acetylcholinesterase confirms the presence of these ganglion cells in clusters, `
    + 'and does not reveal any overtly thickened nerve fibres in the muscularis mucosae or lamina propria.');
  assert.equal(run({ ...HD, ache: 'Increased fibres' }).microscopy, `${ABSENT} Histochemical staining for acetylcholinesterase shows increased, thickened nerve fibres in the muscularis mucosae and lamina propria.`);
  assert.equal(run({ ...HD, ache: 'No increase' }).microscopy, `${ABSENT} Histochemical staining for acetylcholinesterase does not reveal any overtly thickened nerve fibres in the muscularis mucosae or lamina propria.`);
  assert.equal(run({ ...SUCTION, calretinin: 'Positive fibres' }).microscopy, `${PRESENT} Immunostaining for calretinin shows positive nerve fibrils in the lamina propria and muscularis mucosae.`);
  assert.equal(run({ ...HD, calretinin: 'No positive fibres' }).microscopy, `${ABSENT} Immunostaining for calretinin shows no positive nerve fibrils in the lamina propria or muscularis mucosae.`);
  assert.equal(run({ ...HD, calretinin: 'No positive fibres', mastCells: true }).microscopy, `${ABSENT} Immunostaining for calretinin shows no positive nerve fibrils in the lamina propria or muscularis mucosae; mast cells are positive.`);
});

test('sentences keep a fixed order inside the one paragraph, and free text closes it', () => {
  const r = run({ ...HD, sections: '60', distal: 'Transitional mucosa', nerves: 'Hypertrophic', ache: 'Increased fibres', calretinin: 'No positive fibres', mastCells: true, additionalNotes: 'no inflammation is seen' });
  assert.equal(r.microscopy, `${ABSENT} The biopsy also includes transitional mucosa of the anal canal. A total of 60 serial sections are examined. `
    + 'Hypertrophic submucosal nerves are seen. Histochemical staining for acetylcholinesterase shows increased, thickened nerve fibres in the muscularis mucosae and lamina propria. '
    + 'Immunostaining for calretinin shows no positive nerve fibrils in the lamina propria or muscularis mucosae; mast cells are positive. No inflammation is seen.');
  assert.ok(!r.microscopy.includes('\n'), 'one paragraph');
});

// ---------- diagnosis ----------

test('diagnosis on Auto: present, none identified, the Hirschsprung statement only with a supporting finding', () => {
  const dx = (values) => run(values).diagnosis.split('\n')[1];
  assert.equal(dx(SUCTION), '- GANGLION CELLS PRESENT.');
  assert.equal(dx(HD), '- NO GANGLION CELLS IDENTIFIED.');
  for (const support of [{ nerves: 'Hypertrophic' }, { calretinin: 'No positive fibres' }, { ache: 'Increased fibres' }]) {
    assert.equal(dx({ ...HD, ...support }), '- NO GANGLION CELLS IDENTIFIED, consistent with HIRSCHSPRUNG DISEASE.', JSON.stringify(support));
  }
  assert.equal(dx({ ...HD, calretinin: 'Positive fibres' }), '- NO GANGLION CELLS IDENTIFIED.', 'positive calretinin is not support');
});

test('diagnosis on Auto: a biopsy with too little submucosa or anal canal mucosa is inadequate for evaluation, unless it holds ganglion cells', () => {
  const dx = (values) => run(values).diagnosis.split('\n')[1];
  assert.equal(dx({ ...HD, submucosa: 'Scant' }), '- INADEQUATE FOR EVALUATION (scant submucosa).');
  assert.equal(dx({ ...HD, submucosa: 'Absent', calretinin: 'No positive fibres' }), '- INADEQUATE FOR EVALUATION (no submucosa).');
  assert.equal(dx({ ...HD, distal: 'Squamous mucosa' }), '- INADEQUATE FOR EVALUATION (anal canal mucosa).');
  assert.equal(dx({ ...SUCTION, distal: 'Squamous mucosa' }), '- GANGLION CELLS PRESENT.', 'ganglion cells in a low biopsy still count');
  assert.equal(dx({ ...SUCTION, submucosa: 'Scant' }), '- GANGLION CELLS PRESENT.');
  assert.equal(inadequacyOf({ procedure: 'Full-thickness biopsy', myenteric: 'Present', submucosa: 'Scant' }), '', 'a hidden submucosa answer is ignored on a full-thickness biopsy');
  assert.equal(inadequacyOf({ procedure: 'Full-thickness biopsy', myenteric: 'Not sampled', submucosa: 'Scant' }), 'scant submucosa');
});

test('a chosen conclusion overrides Auto', () => {
  const dx = (values) => run(values).diagnosis.split('\n')[1];
  assert.equal(dx({ ...HD, conclusion: 'Consistent with Hirschsprung disease' }), '- NO GANGLION CELLS IDENTIFIED, consistent with HIRSCHSPRUNG DISEASE.');
  assert.equal(dx({ ...HD, nerves: 'Hypertrophic', conclusion: 'No ganglion cells identified' }), '- NO GANGLION CELLS IDENTIFIED.');
  assert.equal(dx({ ...HD, conclusion: 'Inadequate for evaluation' }), '- INADEQUATE FOR EVALUATION.');
  assert.equal(dx({ ...HD, submucosa: 'Scant', conclusion: 'Inadequate for evaluation' }), '- INADEQUATE FOR EVALUATION (scant submucosa).');
  assert.equal(dx({ ...SUCTION, conclusion: 'Ganglion cells present' }), '- GANGLION CELLS PRESENT.');
});

test('the printed text carries no thresholds, citations or exclusion logic', () => {
  const r = run({ ...HD, sections: '60', nerves: 'Hypertrophic', nerveDiameter: '45', calretinin: 'No positive fibres', mastCells: true, ache: 'Increased fibres' });
  for (const s of [r.specimens, r.microscopy, r.diagnosis]) {
    assert.doesNotMatch(s, /IWG|ERNICA|AJCP|RCPath|Kapur|Ambartsumyan|excludes?|threshold|at least|µ/, s);
  }
});

// ---------- checks ----------

test('Checks: an aganglionic answer on a biopsy without enough submucosa, or from the anal canal', () => {
  assert.deepEqual(checksOf(run({ ...HD, sections: '60', submucosa: 'Scant' })), [['info', 'submucosa']]);
  assert.deepEqual(checksOf(run({ ...HD, sections: '60', distal: 'Transitional mucosa' })), [['info', 'distal']]);
  const forced = run({ ...HD, sections: '60', submucosa: 'Absent', calretinin: 'No positive fibres', mastCells: true, conclusion: 'Consistent with Hirschsprung disease' });
  assert.deepEqual(checksOf(forced), [['warn', 'submucosa'], ['info', 'conclusion']]);
  assert.match(forced.issues[0].message, /only be judged absent where enough submucosa is sampled/);
  assert.deepEqual(checksOf(run({ ...HD, sections: '60', distal: 'Squamous mucosa', conclusion: 'No ganglion cells identified' })), [['warn', 'distal']]);
});

test('Checks: calretinin or acetylcholinesterase that disagrees with the ganglion cells', () => {
  const pos = run({ ...HD, sections: '60', calretinin: 'Positive fibres' });
  assert.deepEqual(checksOf(pos), [['warn', 'calretinin'], ['info', 'calretinin']]);
  assert.match(pos.issues[0].message, /1-2 cm into aganglionic bowel \(Kapur 2014\)/);
  assert.deepEqual(checksOf(run({ ...SUCTION, calretinin: 'No positive fibres', mastCells: true })), [['warn', 'calretinin']]);
  assert.deepEqual(checksOf(run({ ...SUCTION, ache: 'Increased fibres' })), [['warn', 'ache']]);
  assert.deepEqual(checksOf(run({ ...SUCTION, nerves: 'Hypertrophic' })), [['warn', 'nerves']], 'transition zone');
});

test('Checks: freeze-thaw, the mast-cell control, sections, the muscularis propria and the critical result', () => {
  const hd = { ...HD, sections: '60', calretinin: 'No positive fibres', mastCells: true };
  assert.deepEqual(checksOf(run(hd)), [['info', 'conclusion']]);
  assert.match(run(hd).issues[0].message, /critical result.*\(IWG 2009\).*specialist input \(RCPath G085\)/);
  assert.deepEqual(checksOf(run({ ...hd, ache: 'Increased fibres' })), [['info', 'calretinin'], ['info', 'conclusion']], 'freeze-thaw');
  assert.deepEqual(checksOf(run({ ...hd, mastCells: false })), [['info', 'mastCells'], ['info', 'conclusion']]);
  assert.deepEqual(checksOf(run({ ...hd, sections: '' })), [['info', 'sections'], ['info', 'conclusion']]);
  assert.deepEqual(checksOf(run({ ...SUCTION, procedure: 'Full-thickness biopsy', myenteric: 'Not sampled' })), [['info', 'myenteric']]);
  assert.deepEqual(checksOf(run({ ...HD, sections: '60' })), [['info', 'calretinin']], 'no supporting finding: no Hirschsprung statement');
  assert.deepEqual(checksOf(run({ fragments: '2' })), [['info', 'level']]);
});

test('Checks: a chosen conclusion that contradicts the findings', () => {
  assert.deepEqual(checksOf(run({ ...HD, sections: '60', calretinin: 'No positive fibres', mastCells: true, conclusion: 'Ganglion cells present' })), [['error', 'conclusion']]);
  assert.deepEqual(checksOf(run({ ...SUCTION, conclusion: 'No ganglion cells identified' })), [['error', 'conclusion']]);
  assert.deepEqual(checksOf(run({ ...HD, sections: '60', conclusion: 'Consistent with Hirschsprung disease' })), [['warn', 'conclusion'], ['info', 'conclusion']]);
});

// ---------- form ----------

test('fields show when they apply', () => {
  const base = visible({});
  assert.ok(base.includes('submucosa') && !base.includes('myenteric') && !base.includes('nerveDiameter') && !base.includes('mastCells'));
  const ft = visible({ procedure: 'Full-thickness biopsy', myenteric: 'Present' });
  assert.ok(ft.includes('myenteric') && !ft.includes('submucosa'));
  assert.ok(visible({ procedure: 'Full-thickness biopsy', myenteric: 'Not sampled' }).includes('submucosa'));
  assert.ok(visible({ nerves: 'Hypertrophic' }).includes('nerveDiameter'));
  assert.ok(visible({ calretinin: 'No positive fibres' }).includes('mastCells'));
  assert.ok(!visible({ ganglion: 'Not identified' }).includes('immature'));
  assert.ok(visible({ ganglion: 'Not identified', procedure: 'Full-thickness biopsy', myenteric: 'Present' }).includes('immature'));
});

test('reference galleries sit on the adequacy, ganglion-cell, nerve and stain fields, each image sourced and under 150 kB', () => {
  const used = new Set();
  for (const id of ['submucosa', 'ganglion', 'nerves', 'calretinin', 'ache']) {
    const f = schema.fields.find((x) => x.id === id);
    assert.ok(f.reference && f.reference.groups.length >= 2, `${id} has a gallery`);
    for (const g of f.reference.groups) {
      for (const im of g.images || []) {
        used.add(path.basename(im.src));
        assert.match(im.license, /^CC(0| BY| BY-SA)/, `${im.src} licence`);
        assert.ok(!/NC|ND/.test(im.license), `${im.src} is not NC/ND`);
        assert.ok(im.caption && im.credit && /^https:/.test(im.url), `${im.src} caption, credit and url`);
        assert.ok(fs.statSync(path.join(root, im.src)).size <= 150 * 1024, `${im.src} is at most 150 kB`);
      }
    }
  }
  const files = fs.readdirSync(path.join(root, 'assets', 'reference', 'hirschsprung_biopsy'));
  assert.deepEqual([...used].sort(), files.sort(), 'every image file is used, and every used image exists');
  assert.ok(schema.fields.find((x) => x.id === 'submucosa').reference.groups.every((g) => !g.images.length), 'adequacy is left for the user\'s own photos');
});

// ---------- intake ----------

test('intake: suction and full-thickness lines, and rectal biopsies with a Hirschsprung history, route to the form', () => {
  const lines = [
    ['Rectal suction biopsy', ''], ['Rectal biopsy', '?Hirschsprung'], ['Rectal biopsy', '? Hirschsprung disease'], ['Rectum, suction biopsy', ''],
    ['Rectal suction biopsy, 2 cm from AV', ''], ['Suction rectal biopsy 3cm', ''], ['Rectum, 2 cm, suction biopsy', ''], ['Full thickness rectal biopsy', ''],
    ['Rectum, full-thickness biopsy', 'constipation'], ['Rectal biopsy, 2 cm from AV', '?HD'], ['Rectal biopsy', 'delayed passage of meconium'],
    ['Sigmoid colon, suction biopsy', ''], ['Colon, biopsy', '?Hirschsprung, total colonic'], ['Anorectal biopsy', '?HD']
  ];
  for (const [line, history] of lines) {
    const r = route(line, history);
    assert.deepEqual([r.templateId, r.tier], ['hirschsprung_biopsy', 'confident'], `${line} [${history}]`);
  }
  assert.equal(route('Rectal biopsy for ganglion cells').templateId, 'hirschsprung_biopsy', 'offered first');
});

test('intake: rectal and colonic lines without a Hirschsprung word, polyps and pull-throughs keep the routes they had', () => {
  const lines = [
    ['Rectal biopsy', ''], ['Rectal biopsy', 'constipation'], ['Rectum, biopsy', 'UC'], ['Rectal polyp', ''], ['Rectum, polypectomy', ''],
    ['Sigmoid colon, biopsy', ''], ['Rectal mass, biopsy', ''], ['Rectosigmoid, pull-through', ''], ['Colon, transanal endorectal pull-through', '']
  ];
  for (const [line, history] of lines) {
    const now = route(line, history);
    const before = route(line, history, withoutHirschsprung);
    assert.notEqual(now.templateId, 'hirschsprung_biopsy', `${line} [${history}]`);
    assert.deepEqual([now.templateId, now.tier], [before.templateId, before.tier], `${line} [${history}] keeps its route`);
  }
});

test('intake: the site, procedure and level fill from the line', () => {
  assert.deepEqual(preset('Rectal suction biopsy'), { site: 'Rectum', procedure: 'Suction biopsy' });
  assert.deepEqual(preset('Rectal suction biopsy, 2 cm from AV'), { site: 'Rectum', procedure: 'Suction biopsy', level: '2 cm from AV' });
  assert.deepEqual(preset('Suction rectal biopsy 3cm'), { site: 'Rectum', procedure: 'Suction biopsy', level: '3cm' });
  assert.deepEqual(preset('Full thickness rectal biopsy'), { site: 'Rectum', procedure: 'Full-thickness biopsy' });
  assert.deepEqual(preset('Sigmoid colon, suction biopsy'), { site: 'Sigmoid colon', procedure: 'Suction biopsy' });
  assert.deepEqual(preset('Rectal biopsy', '?Hirschsprung'), { site: 'Rectum' });
});

// ---------- golden fixtures ----------

const CASES = [
  ['01-ganglion-cells-present', { level: '2', fragments: '2', sections: '60', nerves: 'Not hypertrophic', calretinin: 'Positive fibres', ache: 'No increase' }],
  ['02-aganglionosis-absent-calretinin-fibrils', { level: '3', fragments: '2', ganglion: 'Not identified', sections: '75', nerves: 'Hypertrophic', nerveDiameter: '50', calretinin: 'No positive fibres', mastCells: true }],
  ['03-inadequate-too-distal', { level: '1', fragments: '1', ganglion: 'Not identified', distal: 'Squamous and transitional mucosa', sections: '60', calretinin: 'Positive fibres' }]
];

test('golden fixtures reproduce byte-for-byte', () => {
  fs.mkdirSync(FIX, { recursive: true });
  for (const [name, values] of CASES) {
    const out = run(values);
    const file = path.join(FIX, `${name}.json`);
    const current = { templateId: 'hirschsprung_biopsy', values, report: out.report, checks: out.issues };
    if (UPDATE || !fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n'); continue; }
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(out.report, saved.report, `${file} changed; re-run with --update only after a deliberate wording change`);
    assert.deepEqual(out.issues, saved.checks, `${file} checks changed`);
  }
});
