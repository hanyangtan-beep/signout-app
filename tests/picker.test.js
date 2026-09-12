// Phase 4d: manifest, lazy registry and template picker logic.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildManifest, manifestEntry, KINDS } from '../scripts/build-manifest.mjs';
import { loadManifest, loadTemplate, loadAll } from '../src/registry.js';
import {
  biopsyRow, biopsyRowLayout, resectionStrip, groupBySystem, selectorGroups, rankTemplates, labelOf, pushRecent, togglePin, STRIP_CAP
} from '../src/picker.js';

const committed = JSON.parse(await readFile(new URL('../templates/manifest.json', import.meta.url), 'utf8'));
const manifest = committed.templates;

test('manifest builder round-trips every schema and the committed manifest is current', async () => {
  const built = await buildManifest();
  assert.equal(built.count, manifest.length);
  assert.deepEqual(built.templates, manifest, 'run node scripts/build-manifest.mjs after editing schema metadata');
  for (const t of manifest) {
    assert.ok(t.system && KINDS.includes(t.kind), `${t.id} has system and a valid kind`);
    assert.ok(Array.isArray(t.aliases), `${t.id} has aliases`);
    assert.match(t.shortName, /·|Frozen section/, `${t.id} shortName is "Organ · procedure"`);
    assert.notEqual(labelOf(t).toLowerCase(), 'biopsy', 'bare procedure labels are not allowed');
    assert.notEqual(labelOf(t).toLowerCase(), 'polyp', 'bare lesion labels are not allowed');
  }
});

test('manifest builder rejects schemas without metadata', () => {
  assert.throws(() => manifestEntry({ id: 'x', name: 'X', shortName: 'X', version: '1', generator: 'x' }), /missing "system"/);
  assert.throws(() => manifestEntry({ id: 'x', name: 'X', shortName: 'X', version: '1', generator: 'x', system: 'GI', kind: 'excision' }), /kind "excision"/);
});

test('lazy registry resolves every manifest entry and matches loadAll', async () => {
  const entries = await loadManifest();
  assert.equal(entries.length, manifest.length);
  for (const e of entries) {
    const { schema, generator } = await loadTemplate(e.id);
    assert.equal(schema.id, e.id);
    assert.equal(schema.version, e.version);
    assert.equal(typeof generator.diagnosis, 'function', `${e.id} generator has diagnosis()`);
  }
  const all = await loadAll();
  assert.deepEqual(Object.keys(all).sort(), manifest.map((t) => t.id).sort());
  assert.rejects(loadTemplate('not_a_template'), /not installed/);
});

test('small-biopsy row lists exactly the kind: biopsy templates in frequency order', () => {
  const row = biopsyRow(manifest).map(labelOf);
  assert.deepEqual(row, ['Gastric', 'Colonic polyp', 'Duodenum', 'Oesophagus', 'IBD', 'Prostate', 'Breast', 'Cervix', 'Endometrium', 'Lung']);
  assert.ok(!row.includes('LEEP') && !row.includes('Frozen'));
  const layout = biopsyRowLayout(manifest);
  assert.equal(layout.overflow.length, 0, 'ten biopsies fit on one row');
});

test('small-biopsy row collapses to the top 8 plus overflow when it outgrows one line', () => {
  const many = [...manifest, ...Array.from({ length: 6 }, (_, i) => ({ id: `b${i}`, name: `Biopsy ${i}`, shortName: `Organ${i} · biopsy`, label: `Organ${i}`, system: 'Skin', kind: 'biopsy', rank: 50 + i, aliases: [] }))];
  const { shown, overflow } = biopsyRowLayout(many);
  assert.equal(shown.length, 8);
  assert.equal(shown[0].id, 'gastric_biopsy');
  assert.equal(overflow.length, 16 - 8);
  // the strip cap never touches the biopsy row
  assert.equal(biopsyRow(many).length, 16);
});

test('resection strip: pins first, then recents, then rank-order fill, deduped, biopsies excluded, capped at 8', () => {
  const fake = Array.from({ length: 12 }, (_, i) => ({ id: `r${i}`, name: `Res ${i}`, shortName: `Organ · r${i}`, system: 'GI', kind: 'benign resection', rank: i, aliases: [] }));
  const all = [...manifest, ...fake];
  const strip = resectionStrip(all, ['r3', 'gastric_biopsy', 'r1', 'r3'], ['r1', 'r9', 'lung_biopsy', 'r0', 'r2', 'r4', 'r5', 'r6', 'r7', 'r8']);
  assert.equal(strip.length, STRIP_CAP);
  assert.deepEqual(strip.slice(0, 2).map((t) => t.id), ['r3', 'r1']);
  assert.ok(!strip.some((t) => t.kind === 'biopsy'));
  assert.equal(new Set(strip.map((t) => t.id)).size, strip.length, 'no duplicates');
  // nothing pinned or recent → default set in rank order; a recent moves to the front, the rest still fill
  assert.deepEqual(resectionStrip(manifest).map(labelOf), ['Frozen', 'LEEP', 'Lymph node', 'Placenta', 'Gallbladder', 'Thyroid', 'Parathyroid', 'Appendix']);
  assert.deepEqual(resectionStrip(manifest, [], ['cervical_excision']).map(labelOf).slice(0, 3), ['LEEP', 'Frozen', 'Lymph node']);
  assert.deepEqual(resectionStrip(all, [], ['r9']).map((t) => t.id), ['r9', 'r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6']);
  assert.deepEqual(pushRecent(['a', 'b'], 'b'), ['b', 'a']);
  assert.deepEqual(togglePin(togglePin([], 'x'), 'x'), []);
});

test('palette ranking: exact shortName > alias > organ > keyword', () => {
  const top = (q) => labelOf(rankTemplates(manifest, q)[0]);
  assert.equal(top('Gastric'), 'Gastric');
  assert.equal(top('Colon · polyp'), 'Colonic polyp');
  assert.equal(top('LEEP'), 'LEEP');
  assert.equal(top('Marsh'), 'Duodenum');           // alias
  assert.equal(top('pylori'), 'Gastric');           // alias word
  assert.equal(top('coeliac'), 'Duodenum');
  assert.equal(top('Barrett'), 'Oesophagus');
  assert.equal(top('FS'), 'Frozen');
  assert.equal(top('pipelle'), 'Endometrium');
  assert.equal(top('EBUS'), 'Lung');
  assert.equal(top('gstr'), 'Gastric');             // subsequence fallback
  // organ beats keyword: "cervix" ranks the two cervical templates, biopsy first by rank
  assert.deepEqual(rankTemplates(manifest, 'cervix').map(labelOf), ['Cervix', 'LEEP', 'Cervical smear', 'Uterus']);
  // multi-token: every token must match
  assert.deepEqual(rankTemplates(manifest, 'cervix cone').map(labelOf), ['LEEP']);
  assert.deepEqual(rankTemplates(manifest, 'zzz'), []);
  // exclude filter (Resections ▾ hides biopsies)
  assert.ok(rankTemplates(manifest, '', { exclude: ['biopsy'] }).every((t) => t.kind !== 'biopsy'));
  // any template in ≤ 3 keystrokes
  for (const t of manifest) {
    const l = labelOf(t);
    const hits = rankTemplates(manifest, l.slice(0, 3)).map(labelOf);
    assert.ok(hits.slice(0, 3).includes(l), `${l} reachable from "${l.slice(0, 3)}" (got ${hits.join(', ')})`);
  }
});

test('grouped browse and the part selector put Small biopsy first, systems in canonical order', () => {
  const groups = groupBySystem(manifest);
  assert.deepEqual(groups.map((g) => g.system), ['GI', 'Hepatobiliary', 'GU', 'Gynae', 'Breast', 'Thoracic', 'Head and neck', 'Skin', 'Cardiovascular', 'Lymphoid', 'Soft tissue', 'Endocrine', 'Frozen', 'Cytology', 'General']);
  const gyn = groups.find((g) => g.system === 'Gynae');
  assert.deepEqual(gyn.items.map((t) => t.kind), ['biopsy', 'biopsy', 'benign resection', 'benign resection', 'benign resection', 'benign resection', 'cancer resection', 'cancer resection'], 'ascending specimen size within a system');
  assert.deepEqual(gyn.items.slice(2).map(labelOf), ['LEEP', 'Placenta', 'Uterus', 'Ovarian cyst', 'Endometrial Ca', 'Ovary / tube / peritoneum Ca'], 'rank order within a kind');
  const sel = selectorGroups(manifest);
  assert.equal(sel[0].label, 'Small biopsy');
  assert.equal(sel[0].items.length, 10);
  assert.deepEqual(sel.slice(1).map((g) => g.label), ['GI', 'Hepatobiliary', 'GU', 'Gynae', 'Breast', 'Head and neck', 'Skin', 'Cardiovascular', 'Lymphoid', 'Soft tissue', 'Endocrine', 'Frozen', 'Cytology', 'General']);
});
