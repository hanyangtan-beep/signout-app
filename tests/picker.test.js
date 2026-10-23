// Phase 4d: manifest, lazy registry and template picker logic.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildManifest, manifestEntry, KINDS } from '../scripts/build-manifest.mjs';
import { loadManifest, loadTemplate, loadAll } from '../src/registry.js';
import {
  biopsyRow, rowGroups, standalonePlanned, rowOfKind, groupBySystem, selectorGroups, rankTemplates, labelOf, pushRecent, togglePin, ROWS, SYSTEM_ORDER
} from '../src/picker.js';
import { loadPlanned } from '../src/registry.js';

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
  // Oral cavity (Phase 42) sits after NPC and before Brain on the 2021-2026 biopsy case mix; Liver (medical),
  // built 2026-09-30, after Brain (43 medical-type liver cases against 60 CNS). Liver (mass), built 2026-10-02, shares
  // its rank and follows it (fewer targeted liver biopsies than medical ones). Hirschsprung (2026-09-30) comes last:
  // its rectal biopsies are the rarest biopsy type on the case mix. Peritoneum (Phase 58, 2026-10-07) is appended
  // after it, leaving the order of the others unchanged. Dermatoses (Phase 68, 2026-10-11) sits after Oral cavity and
  // before Brain: 146 inflammatory skin parts on the 2021-2026 biopsy case mix, against 223 oral and 60 CNS.
  // Phase 70 (2026-10-12), deliberate: the cervical form also takes vaginal and vulval biopsies, so its label is
  // "Cervix / vagina / vulva"; it keeps its place.
  // Phase 71 (2026-10-14), deliberate: GI and oral GVHD biopsy (rank 64) appended last; the others keep their order.
  assert.deepEqual(row, ['Gastric', 'Colonic polyp', 'Duodenum', 'Oesophagus', 'IBD', 'Prostate', 'Breast', 'Cervix / vagina / vulva', 'Endometrium', 'Lung', 'NPC', 'Oral cavity', 'Dermatoses', 'Brain', 'Liver (medical)', 'Liver (mass)', 'Hirschsprung', 'Peritoneum', 'GVHD']);
  assert.ok(!row.includes('LEEP') && !row.includes('Frozen'));
  assert.deepEqual(pushRecent(['a', 'b'], 'b'), ['b', 'a']);
  assert.deepEqual(togglePin(togglePin([], 'x'), 'x'), []);
});

const planned = await loadPlanned();

test('planned.json: unique ids that do not collide with built templates; known systems and row kinds', () => {
  assert.ok(planned.length >= 10);
  const ids = planned.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length, 'unique ids');
  const built = new Set(manifest.map((t) => t.id));
  for (const t of planned) {
    assert.ok(!built.has(t.id), `${t.id} is still planned but already built — remove it from planned.json`);
    assert.ok(t.name && t.label && t.system && t.kind && t.roadmap, `${t.id} complete`);
    assert.ok(SYSTEM_ORDER.includes(t.system) || t.kind === 'autopsy', `${t.id}: system ${t.system} is in SYSTEM_ORDER`);
    assert.ok([...ROWS.top.kinds, ...ROWS.bottom.kinds, 'autopsy'].includes(t.kind), `${t.id}: kind ${t.kind} maps to a row`);
  }
});

test('rowOfKind maps every manifest kind to the side of the header switch that lists it', () => {
  assert.equal(rowOfKind('biopsy'), 'top');
  assert.equal(rowOfKind('cytology'), 'top');
  assert.equal(rowOfKind('biomarker'), 'top');
  assert.equal(rowOfKind('cancer resection'), 'bottom');
  assert.equal(rowOfKind('benign resection'), 'bottom');
  assert.equal(rowOfKind('frozen'), 'bottom');
  assert.equal(rowOfKind('generic'), 'bottom');
  assert.equal(rowOfKind('autopsy'), null); // its own placeholder button, not a row
  for (const t of manifest) assert.ok(rowOfKind(t.kind), `${t.id}: kind ${t.kind} has a header side`);
});

test('header rows: top = biopsy + cytology, bottom = resections + frozen + free text, grouped by system in order, planned appended', () => {
  const top = rowGroups(manifest, planned, 'top');
  const bottom = rowGroups(manifest, planned, 'bottom');
  const kindsIn = (groups) => new Set(groups.flatMap((g) => g.items.map((t) => t.kind)));
  assert.deepEqual([...kindsIn(top)].sort(), ['biomarker', 'biopsy', 'cytology']);
  assert.deepEqual([...kindsIn(bottom)].sort(), ['benign resection', 'cancer resection', 'frozen', 'generic']);
  // system order and labels
  assert.deepEqual(top.map((g) => g.system), ['GI', 'GU', 'Gynae', 'Breast', 'Thoracic', 'Head and neck', 'CNS', 'Skin', 'Medical', 'Biomarkers', 'Cytology']);
  assert.deepEqual(bottom.map((g) => g.label), ['GI', 'HPB', 'GU', 'Gynae', 'Breast', 'Thoracic', 'H&N', 'CNS', 'Skin / soft tissue', 'Lymphoid', 'Endocrine', 'Frozen', 'Generic']);
  assert.equal(top.find((g) => g.system === 'Head and neck').label, 'H&N');
  // merges: medical biopsies share one top button; aortic valve sits with lung under Thoracic; soft tissue with skin
  // Built templates list before pending ones: liver_biopsy was built on 2026-09-30, liver_lesion_biopsy on 2026-10-02
  // (the Medical button holds every hepatobiliary biopsy).
  assert.deepEqual(top.find((g) => g.system === 'Medical').items.map((t) => t.id), ['liver_biopsy', 'liver_lesion_biopsy', 'renal_biopsy', 'endomyocardial_biopsy']);
  assert.ok(bottom.find((g) => g.system === 'Thoracic').items.some((t) => t.id === 'aortic_valve_aorta'));
  assert.ok(bottom.find((g) => g.system === 'Skin').items.some((t) => t.id === 'soft_tissue_benign'));
  assert.ok(bottom.find((g) => g.system === 'Endocrine').items.some((t) => t.id === 'thyroid_benign'));
  // every QMH cancer page is either built or planned: entries carry the QMH page stem.
  // The floor drops by one each time a QMH-stemmed placeholder ships (ampulla_carcinoma, Phase 22;
  // skin_scc, Phase 39; oropharynx_hpv_carcinoma into oral_carcinoma, Phase 42; hcc, Phase 51).
  assert.ok(planned.filter((t) => t.qmh).length >= 46);
  // Biomarkers holds one built template (the standalone HER2 ISH report, Phase 30) and placeholders.
  const biomarkers = top.find((g) => g.system === 'Biomarkers').items;
  assert.ok(biomarkers.every((t) => t.kind === 'biomarker'));
  assert.deepEqual(biomarkers.filter((t) => !t.planned).map((t) => t.id), ['breast_biomarkers']);
  assert.ok(biomarkers.filter((t) => t.planned).length >= 8);
  assert.equal(bottom.find((g) => g.system === 'General').label, 'Generic');
  assert.equal(bottom[bottom.length - 1].system, 'General', 'Free text last');
  // built before planned within a group; planned carry the flag and open Generic in the app
  const gi = top.find((g) => g.system === 'GI');
  assert.deepEqual(gi.items.map(labelOf), ['Gastric', 'Colonic polyp', 'Duodenum', 'Oesophagus', 'IBD', 'Hirschsprung', 'Peritoneum', 'GVHD']);
  // Peritoneum was the last GI placeholder and is built in Phase 58; the Medical button above still shows built before planned.
  // Phase 71 (2026-10-14), deliberate: GVHD is built without a placeholder and closes the GI biopsies.
  assert.ok(gi.items.every((t) => !t.planned), 'every GI biopsy is built');
  const giBottom = bottom.find((g) => g.system === 'GI').items;
  assert.ok(giBottom.findIndex((t) => t.id === 'colon_resection') < giBottom.findIndex((t) => t.id === 'gastric_carcinoma'));
  assert.ok(giBottom.some((t) => t.id === 'appendix_carcinoma' && !t.planned) && giBottom.some((t) => t.id === 'gi_net' && t.planned));
  // every built template appears exactly once across the two rows
  const all = [...top, ...bottom].flatMap((g) => g.items).filter((t) => !t.planned).map((t) => t.id);
  assert.deepEqual(all.sort(), manifest.map((t) => t.id).sort());
  // pins sort first inside their menu, planned still last
  const pinned = rowGroups(manifest, planned, 'top', { pins: ['ibd_biopsy'] }).find((g) => g.system === 'GI').items.map((t) => t.id);
  assert.equal(pinned[0], 'ibd_biopsy');
  assert.equal(pinned.at(-1), 'gvhd_biopsy'); // Phase 71 (2026-10-14), deliberate: GVHD closes the GI biopsies
  // a group that only has planned entries still gets a button (Medical, CNS)
  assert.deepEqual(bottom.find((g) => g.system === 'CNS').items.map((t) => t.id), ['cns_tumour', 'meningioma']);
  // Autopsy is in neither row; it is the standalone button
  assert.ok(![...top, ...bottom].some((g) => g.items.some((t) => t.id === 'autopsy')));
  assert.deepEqual(standalonePlanned(planned).map((t) => t.id), ['autopsy']);
  // rows stay short
  // CNS joined the top row with the brain biopsy template (Phase 23), taking it to 11 buttons.
  assert.ok(top.length <= 11 && bottom.length <= 13, `${top.length} / ${bottom.length} buttons`);
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
  // organ beats keyword: "cervix" ranks the two cervical templates, biopsy first by rank (label renamed in Phase 70)
  assert.deepEqual(rankTemplates(manifest, 'cervix').map(labelOf), ['Cervix / vagina / vulva', 'LEEP', 'Cervical smear', 'Uterus']);
  // Phase 70: vulval and vaginal biopsies are found under the cervical form
  assert.equal(top('vulva'), 'Cervix / vagina / vulva');
  assert.equal(top('vagina'), 'Cervix / vagina / vulva');
  assert.equal(top('dVIN'), 'Cervix / vagina / vulva');
  // multi-token: every token must match
  assert.deepEqual(rankTemplates(manifest, 'cervix cone').map(labelOf), ['LEEP']);
  assert.deepEqual(rankTemplates(manifest, 'zzz'), []);
  // exclude filter (Resections ▾ hides biopsies)
  assert.ok(rankTemplates(manifest, '', { exclude: ['biopsy'] }).every((t) => t.kind !== 'biopsy'));
  // any template in ≤ 3 keystrokes: the first three letters of the label, or an alias of three
  // letters or fewer. Skin SCC shares "Ski" with three benign skin forms that out-rank it on case
  // mix, so it is reached by its alias "SCC" instead (Phase 39).
  for (const t of manifest) {
    const l = labelOf(t);
    const probes = [l.slice(0, 3), ...(t.aliases || []).filter((a) => a.length <= 3)];
    const reached = probes.some((p) => rankTemplates(manifest, p).map(labelOf).slice(0, 3).includes(l));
    assert.ok(reached, `${l} reachable from ${probes.map((p) => `"${p}"`).join(' or ')} (got ${rankTemplates(manifest, l.slice(0, 3)).map(labelOf).join(', ')})`);
  }
});

test('grouped browse and the part selector put Small biopsy first, systems in canonical order', () => {
  const groups = groupBySystem(manifest);
  assert.deepEqual(groups.map((g) => g.system), ['GI', 'Hepatobiliary', 'GU', 'Gynae', 'Breast', 'Thoracic', 'Head and neck', 'CNS', 'Skin', 'Cardiovascular', 'Lymphoid', 'Soft tissue', 'Endocrine', 'Frozen', 'Biomarkers', 'Cytology', 'General']);
  const gyn = groups.find((g) => g.system === 'Gynae');
  // Phase 74 (23 October 2026), deliberate: the benign tube and ovary form joins after Ovarian cyst.
  assert.deepEqual(gyn.items.map((t) => t.kind), ['biopsy', 'biopsy', 'benign resection', 'benign resection', 'benign resection', 'benign resection', 'benign resection', 'benign resection', 'cancer resection', 'cancer resection'], 'ascending specimen size within a system');
  assert.deepEqual(gyn.items.slice(2).map(labelOf), ['LEEP', 'Placenta', 'Uterus', 'Ovarian cyst', 'Tube and ovary', 'Ectopic', 'Endometrial Ca', 'Ovary / tube / peritoneum Ca'], 'rank order within a kind');
  const sel = selectorGroups(manifest);
  assert.equal(sel[0].label, 'Small biopsy');
  assert.equal(sel[0].items.length, 19); // oral_biopsy joins in Phase 42, liver_biopsy and hirschsprung_biopsy on 2026-09-30, liver_lesion_biopsy on 2026-10-02, peritoneal_nodule on 2026-10-07, skin_inflammatory on 2026-10-11, gvhd_biopsy on 2026-10-14 (Phase 71, deliberate)
  // The CNS biopsy sits in the Small biopsy group; the CNS system group holds the resection.
  assert.deepEqual(sel.slice(1).map((g) => g.label), ['GI', 'Hepatobiliary', 'GU', 'Gynae', 'Breast', 'Thoracic', 'Head and neck', 'CNS', 'Skin', 'Cardiovascular', 'Lymphoid', 'Soft tissue', 'Endocrine', 'Frozen', 'Biomarkers', 'Cytology', 'General']);
});
