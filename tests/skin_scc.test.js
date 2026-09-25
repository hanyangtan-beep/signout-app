// Skin squamous cell carcinoma excision (synoptic; AJCC 8th head and neck, UICC 9th trunk and limbs,
// BWH class for every site) - generator, staging boundaries, checks, intake and golden fixtures.
// Fixtures: tests/fixtures/skin_scc/*.json (golden; --update only after a deliberate change).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createCase, generate, isVisible } from '../src/engine.js';
import { loadAll, loadManifest } from '../src/registry.js';
import { parseSynoptic } from '../src/synoptic.js';
import { parseIntake, matchParts, presetValues } from '../src/intake.js';
import * as S from '../src/staging/skin_scc.js';
import { pathologicalN } from '../src/staging/hn_nodes.js';
import { MORPHOLOGY, IHC_PHRASE } from '../generators/skin_scc_morphology.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(here, 'fixtures', 'skin_scc');
const UPDATE = process.argv.includes('--update');
const registry = await loadAll();
const manifest = await loadManifest();
const t = registry.skin_scc;
const { schema, generator } = t;
const EX = schema.example.parts[0].values;
const defaults = (s) => Object.fromEntries(s.fields.filter((f) => f.default !== undefined).map((f) => [f.id, f.default]));
const fieldOf = (id) => schema.fields.find((f) => f.id === id);

function run(patch = {}, options = {}) {
  const values = { ...defaults(schema), ...EX, ...patch };
  const cs = { schemaId: 'skin_scc', caseTitle: '', options: { ...schema.example.options, ...options }, parts: [{ label: 'A', templateId: 'skin_scc', values }] };
  return generate(schema, generator, cs);
}
const rows = (out) => Object.fromEntries(parseSynoptic(out.synoptic).filter((r) => r.label).map((r) => [r.label, r.value]));
const sections = (out) => [...new Set(parseSynoptic(out.synoptic).map((r) => r.section))];
const flat = (s) => String(s || '').replace(/\s+/g, ' ');
const flatDx = (out) => flat(out.diagnosis);
const msgs = (out, level) => out.issues.filter((i) => i.level === level).map((i) => i.message);
const tnm = (out) => rows(out)['pTNM'];
const bwh = (out) => rows(out)['BWH class'];

// A trunk or limb site, with the macroscopy of a larger ellipse so the fixtures read true.
const FOREARM = { specimenName: '', tumourSite: 'Forearm', laterality: 'Right', ellipseSize: '5.0 x 2.8 x 1.2', lesionSize: '2.5' };

const CASES = [
  // Card accept: a small well differentiated cheek SCC, pT1 (AJCC 8th), BWH T1.
  ['skin-scc-01-cheek-pt1', { tumourSizeMm: '12', lesionSize: '1.2', grade: 'G1, well differentiated', doiMm: '3' }],
  // Card accept: a poorly differentiated scalp SCC, 7 mm deep with perineural invasion of a large
  // nerve: pT3 (AJCC 8th) and BWH T2b (poor differentiation and the nerve; depth is not a BWH factor).
  ['skin-scc-02-scalp-pt3-bwh-t2b', {
    specimenName: '', tumourSite: 'Scalp', laterality: 'Midline', tumourSizeMm: '15', ellipseSize: '3.5 x 2.0 x 1.0', lesionSize: '1.5',
    grade: 'G3, poorly differentiated', doiMm: '7', anatomicLevel: 'V (carcinoma invades subcutaneum)',
    pni: 'Present, 0.1 mm or more in calibre', ihc: ['p40 positive', 'CK5/6 positive', 'SOX10 negative'],
    peripheralMm: '5', peripheralSite: 'posterior', deepMm: '1'
  }],
  // Card accept: an ear SCC with a neck dissection, two ipsilateral nodes, one with ENE: pN3b.
  ['skin-scc-03-ear-pn3b', {
    specimenName: '', tumourSite: 'Ear', laterality: 'Right', procedure: ['Wide local excision', 'Lymphadenectomy'],
    nodesExamined: '14', nodesInvolved: '2', nodeLaterality: 'Ipsilateral (including midline)', ene: 'Present',
    largestDepositMm: '18', largestDepositSite: 'level II', largestNodeMm: '22', largestNodeSite: 'level II'
  }],
  // Card accept: a 25 mm forearm SCC, pT2 on UICC 9th, BWH T2a (diameter 2 cm or more).
  ['skin-scc-04-forearm-uicc-pt2', { ...FOREARM, tumourSizeMm: '25' }],
  // Card accept: a thigh SCC with one ipsilateral inguinal node, deposit 35 mm: pN2 on UICC 9th.
  ['skin-scc-05-thigh-uicc-pn2', {
    specimenName: '', tumourSite: 'Thigh', laterality: 'Left', tumourSizeMm: '35', ellipseSize: '6.5 x 3.5 x 1.5', lesionSize: '3.5',
    procedure: ['Wide local excision', 'Lymphadenectomy'], nodesExamined: '9', nodesInvolved: '1',
    nodeLaterality: 'Ipsilateral (including midline)', ene: 'Not identified', largestDepositMm: '35', largestDepositSite: 'inguinal'
  }]
];

// ---------- registration and schema ----------

test('template is registered with the required metadata', () => {
  assert.ok(t, 'registry has skin_scc');
  assert.equal(schema.system, 'Skin');
  assert.equal(schema.kind, 'cancer resection');
  assert.equal(schema.label, 'Skin SCC');
  assert.ok(schema.shortName.includes('·'), 'shortName is "Organ · procedure"');
  assert.ok(manifest.some((m) => m.id === 'skin_scc'), 'in the manifest');
  const ids = new Set(schema.fields.map((f) => f.id));
  assert.equal(ids.size, schema.fields.length, 'no duplicate field ids');
  for (const k of Object.keys(EX)) assert.ok(ids.has(k), `example key ${k} is a field`);
});

test('schema option lists are the staging module constants', () => {
  const site = fieldOf('tumourSite');
  assert.deepEqual(site.options, S.SITE_OPTIONS);
  const staged = S.SITE_GROUPS.filter((g) => g.region);
  assert.deepEqual(site.optionGroups.map((g) => g.options), staged.map((g) => g.options), 'optgroups follow the staging regions');
  assert.deepEqual(site.optionGroups.map((g) => g.label), ['Head and neck (AJCC 8th)', 'Trunk and limbs (UICC 9th)', 'Not staged here (own chapter)']);
  assert.deepEqual(fieldOf('siteRegion').options, S.REGION_OPTIONS);
  assert.deepEqual(fieldOf('pni').options, S.PNI_OPTIONS);
  assert.deepEqual(fieldOf('boneInvasion').options, S.BONE_OPTIONS);
  assert.deepEqual(fieldOf('doi').options, S.DOI_OPTIONS);
  assert.deepEqual(fieldOf('beyondFat').options, Object.values(S.BEYOND_FAT));
  assert.deepEqual(fieldOf('nodeLaterality').options, Object.values(S.NODE_LATERALITY));
  assert.deepEqual(fieldOf('bwhOverride').options, S.BWH_OPTIONS);
  assert.ok(fieldOf('anatomicLevel').options.includes(S.LEVEL_IN_SITU));
  for (const o of fieldOf('histType').options) {
    if (/not otherwise specified|not listed/.test(o)) continue;
    assert.ok(MORPHOLOGY[o], `${o} has a morphology sentence`);
  }
  for (const o of fieldOf('ihc').options) assert.ok(IHC_PHRASE[o], `${o} has an IHC phrase`);
});

test('the example case renders every expected block', () => {
  const c = { ...JSON.parse(JSON.stringify(schema.example)), schemaId: schema.id };
  c.options = { ...c.options, includeHeader: true };
  const r = generate(schema, generator, c);
  assert.match(r.report, /SPECIMENS?:/);
  assert.match(r.report, /SYNOPTIC REPORT:/);
  assert.match(r.report, /DIAGNOSIS:/);
  assert.match(r.report, /MACROSCOPIC DESCRIPTION:/);
});

test('a multi-part case letters its specimens', () => {
  const r = generate(schema, generator, createCase(schema, 2));
  assert.match(r.specimens, /\(A\)/);
  assert.match(r.specimens, /\(B\)/);
});

// ---------- the example ----------

test('example: specimen, macroscopy, rows and diagnosis', () => {
  const c = run();
  assert.equal(c.specimens, 'Skin, left cheek, excision');
  assert.ok(flat(c.macro).startsWith('Received in formalin is an ellipse of skin measuring 3.2 x 1.4 x 0.8 cm'), 'skin excision macroscopy');
  assert.equal(flat(c.blockKey), '(1) Tip A. (2-4) Lesion, cross-sections. (5) Tip B.');
  const r = rows(c);
  assert.equal(r['Procedure'], 'Excision');
  assert.equal(r['Tumour site'], 'Left cheek');
  assert.equal(r['Tumour size'], '14 mm (greatest dimension)');
  assert.equal(r['Histologic type'], 'Squamous cell carcinoma, not otherwise specified');
  assert.equal(r['Histologic grade'], 'G2, moderately differentiated');
  assert.equal(r['Depth of invasion'], '4 mm');
  assert.equal(r['Anatomic level'], 'IV (carcinoma invades reticular dermis)');
  assert.equal(r['Invasive tumour'], 'All margins negative');
  assert.equal(r['Closest peripheral margin'], '4 mm (superior)');
  assert.equal(r['Deep margin'], '3 mm');
  assert.equal(r['pTNM'], 'pT1 pNX');
  assert.equal(r['BWH class'], 'T1: 0 high-risk factors');
  assert.equal(r['High-risk factors'], undefined, 'no factor list when there are none');
  assert.equal(r['Regional lymph nodes'], undefined, 'no node row when none were submitted');
  assert.ok(flat(r['Tumour histology']).startsWith('The tumour is a moderately differentiated squamous cell carcinoma, invading the reticular dermis to a depth of 4 mm. It is composed of'));
  assert.deepEqual(sections(c), ['Specimen and tumour', 'Microscopic findings', 'Margins', 'Pathological stage (AJCC 8th edition)', 'BWH tumour classification', 'Additional findings']);
  const d = flatDx(c);
  assert.ok(d.startsWith('SKIN, left cheek, excision'));
  assert.ok(d.includes('SQUAMOUS CELL CARCINOMA, moderately differentiated, 14 mm, invading the reticular dermis to a depth of 4 mm; completely excised (closest peripheral margin 4 mm, superior; deep margin 3 mm); see synoptic report'));
  assert.ok(d.includes('pT1 pNX (AJCC 8th edition); BWH T1'));
  assert.deepEqual(c.issues, []);
});

test('synoptic element order follows the saved QMH HN-Skin SCC page', () => {
  const tool = fileURLToPath(new URL('../tools/import-qmh.js', import.meta.url));
  const page = fileURLToPath(new URL('../docs/reference/HN-Skin-SCC.html', import.meta.url));
  execFileSync(process.execPath, [tool, page], { encoding: 'utf8' });
  assert.match(fs.readFileSync(page, 'utf8'), /Skin/i);
  const out = run({ ...CASES[2][1], bedMargin: 'Uninvolved by invasive carcinoma', insituMargin: 'All margins negative for in situ disease', distantMets: ['Not identified'] });
  const labels = parseSynoptic(out.synoptic).map((r) => r.label).filter(Boolean);
  const idx = (l) => { const i = labels.indexOf(l); assert.ok(i >= 0, `${l} missing: ${labels}`); return i; };
  // Page order: type, grade, DOI, anatomic level, LVI, PNI; margins invasive, non-invasive, bed;
  // nodes; distant metastasis; pTNM; BWH; notes. "- Tumour histology:" after the grade is the house
  // exception every synoptic template uses.
  const order = ['Procedure', 'Tumour site', 'Tumour size', 'Histologic type', 'Histologic grade', 'Tumour histology', 'Depth of invasion', 'Anatomic level',
    'Lymphovascular invasion', 'Perineural invasion', 'Invasive tumour', 'Non-invasive tumour', 'Tumour bed margin', 'Regional lymph nodes',
    'Laterality', 'Extranodal extension', 'Size of largest metastatic deposit', 'Size of largest involved lymph node', 'Distant metastasis', 'pTNM', 'BWH class'];
  let cursor = -1;
  for (const label of order) { const i = idx(label); assert.ok(i > cursor, `${label} out of order`); cursor = i; }
  assert.deepEqual(sections(out), ['Specimen and tumour', 'Microscopic findings', 'Margins', 'Lymph nodes', 'Distant metastasis', 'Pathological stage (AJCC 8th edition)', 'BWH tumour classification', 'Additional findings']);
});

// ---------- staging ----------

test('staging system follows the site: AJCC 8th head and neck, UICC 9th trunk and limbs, none for eyelid and perianal', () => {
  assert.ok(sections(run()).includes('Pathological stage (AJCC 8th edition)'));
  assert.ok(sections(run({ ...FOREARM, tumourSizeMm: '14' })).includes('Pathological stage (UICC 9th edition)'));
  for (const site of ['Eyelid', 'Perianal skin (within 5 cm of the anal margin)']) {
    const c = run({ specimenName: '', tumourSite: site });
    assert.ok(!sections(c).some((s) => /^Pathological stage/.test(s)), `${site}: no pTNM block`);
    assert.equal(bwh(c), 'T1: 0 high-risk factors', `${site}: BWH still prints`);
    assert.ok(flatDx(c).endsWith('see synoptic report - BWH T1'));
    assert.deepEqual(msgs(c, 'warn'), ['Eyelid and perianal skin are staged in their own chapters; no pTNM prints here.']);
  }
  // Other and Not specified sites take the region from the second question.
  const other = { specimenName: '', tumourSite: 'Other (specify)', tumourSiteOther: 'nasal vestibule' };
  assert.ok(msgs(run(other), 'error').some((m) => /Choose the staging region/.test(m)));
  assert.ok(sections(run({ ...other, siteRegion: 'Head and neck' })).includes('Pathological stage (AJCC 8th edition)'));
  assert.ok(sections(run({ ...other, siteRegion: 'Trunk and limbs' })).includes('Pathological stage (UICC 9th edition)'));
  assert.equal(rows(run({ ...other, siteRegion: 'Head and neck' }))['Tumour site'], 'Left nasal vestibule');
  // printPTNM off: no block and no stage clause, BWH stays in the synoptic.
  const off = run({}, { printPTNM: false });
  assert.equal(tnm(off), undefined);
  assert.ok(!/pT1|BWH T1/.test(flatDx(off)));
  assert.equal(bwh(off), 'T1: 0 high-risk factors');
});

test('pT boundaries are the same in both systems: 20 and 40 mm, 6 mm deep, 0.1 mm nerves, bone', () => {
  for (const base of [{}, FOREARM]) {
    const T = (p) => tnm(run({ ...base, ...p })).split(' ')[0];
    assert.equal(T({ tumourSizeMm: '20' }), 'pT1');
    assert.equal(T({ tumourSizeMm: '20.1' }), 'pT2');
    assert.equal(T({ tumourSizeMm: '40' }), 'pT2');
    assert.equal(T({ tumourSizeMm: '40.1' }), 'pT3');
    assert.equal(T({ doiMm: '6' }), 'pT1');
    assert.equal(T({ doiMm: '6.1' }), 'pT3');
    assert.equal(T({ doi: 'At least (mm)', doiMm: '7' }), 'pT3');
    assert.equal(T({ pni: 'Present, less than 0.1 mm in calibre' }), 'pT1');
    assert.equal(T({ pni: 'Present, 0.1 mm or more in calibre' }), 'pT3');
    assert.equal(T({ pni: 'Present, in a nerve deeper than the dermis' }), 'pT3');
    assert.equal(T({ beyondFat: 'Present (specify)', beyondFatDetail: 'skeletal muscle' }), 'pT3');
    assert.equal(T({ boneInvasion: 'Minor bone erosion' }), 'pT3');
    assert.equal(T({ boneInvasion: 'Gross cortical bone or marrow invasion' }), 'pT4a');
    assert.equal(T({ boneInvasion: 'Skull base or axial skeleton invasion, or foraminal involvement' }), 'pT4b');
  }
  // The size falls back to the macroscopic lesion size and says so.
  const macro = run({ tumourSizeMm: '', lesionSize: '2.2' });
  assert.equal(rows(macro)['Tumour size'], '22 mm (greatest dimension, from the macroscopic lesion size)');
  assert.equal(tnm(macro), 'pT2 pNX');
  const none = run({ tumourSizeMm: '', lesionSize: '' });
  assert.equal(tnm(none), 'pTX pNX');
  assert.ok(msgs(none, 'error').some((m) => /^pT cannot be assigned/.test(m)));
});

test('UICC 9th, trunk and limbs: five or more involved nerves in a section is pT3 whatever the calibre', () => {
  const small = { pni: 'Present, less than 0.1 mm in calibre' };
  const limb = (p) => run({ ...FOREARM, tumourSizeMm: '14', ...p });
  assert.equal(tnm(limb(small)), 'pT1 pNX');
  const five = limb({ ...small, pniFiveNerves: true });
  assert.equal(tnm(five), 'pT3 pNX');
  assert.equal(tnm(limb({ pni: 'Present', pniFiveNerves: true })), 'pT3 pNX');
  assert.equal(bwh(five), 'T1: 0 high-risk factors', 'not a BWH factor');
  // Printed as seen: a line under perineural invasion, and in the diagnosis clause.
  assert.equal(rows(five)['Perineural invasion'], 'Present, less than 0.1 mm in calibre');
  assert.equal(rows(five)['Nerves involved'], 'Five or more in a section');
  assert.ok(flatDx(five).includes('perineural invasion present (less than 0.1 mm in calibre; five or more nerves in a section);'));
  assert.ok(flatDx(limb({ pni: 'Present', pniFiveNerves: true })).includes('perineural invasion present (five or more nerves in a section);'));
  assert.deepEqual(five.issues, [], 'clean');
  assert.ok(msgs(limb({ ...small, pniFiveNerves: true, tnmOverride: 'pT1 pNX', tnmOverrideReason: 'test' }), 'error')
    .includes('pT1 recorded, but perineural invasion of five or more nerves in a section is a pT3 criterion.'));
  // Head and neck stays on AJCC 8th, which has no nerve count, and a tick left behind by a changed
  // site or calibre does not count or print.
  const cheek = run({ ...small, pniFiveNerves: true });
  assert.equal(tnm(cheek), 'pT1 pNX');
  assert.equal(rows(cheek)['Nerves involved'], undefined);
  assert.ok(flatDx(cheek).includes('perineural invasion present (less than 0.1 mm in calibre);'));
  for (const pni of ['Not identified', 'Present, 0.1 mm or more in calibre', 'Cannot be determined']) {
    assert.equal(rows(limb({ pni, pniFiveNerves: true }))['Nerves involved'], undefined, pni);
  }
  // Other and Not specified sites count when the trunk and limbs region is chosen.
  const other = { specimenName: '', tumourSite: 'Other (specify)', tumourSiteOther: 'flank', tumourSizeMm: '14', ...small, pniFiveNerves: true };
  assert.equal(tnm(run({ ...other, siteRegion: 'Trunk and limbs' })), 'pT3 pNX');
  assert.equal(tnm(run({ ...other, siteRegion: 'Head and neck' })), 'pT1 pNX');
});

test('the five-nerve tick box shows only on trunk and limb sites, with the calibre not stated or under 0.1 mm', () => {
  const f = fieldOf('pniFiveNerves');
  assert.equal(f.type, 'checkbox');
  assert.equal(f.default, false);
  const trunk = S.SITE_GROUPS.find((g) => g.region === 'trunk').options;
  assert.deepEqual(f.showIf.all[1].any[0].is, trunk, 'the trunk list follows SITE_GROUPS');
  const vis = (p) => isVisible(f, { ...defaults(schema), ...EX, ...p });
  for (const site of trunk) assert.equal(vis({ tumourSite: site, pni: 'Present, less than 0.1 mm in calibre' }), true, site);
  assert.equal(vis({ tumourSite: 'Forearm', pni: 'Present' }), true);
  for (const pni of ['Not identified', 'Present, 0.1 mm or more in calibre', 'Present, in a nerve deeper than the dermis', 'Cannot be determined']) {
    assert.equal(vis({ tumourSite: 'Forearm', pni }), false, pni);
  }
  for (const g of S.SITE_GROUPS.filter((x) => x.region !== 'trunk')) {
    for (const site of g.options.filter((s) => !['Other (specify)', 'Not specified'].includes(s))) assert.equal(vis({ tumourSite: site, pni: 'Present' }), false, site);
  }
  assert.equal(vis({ tumourSite: 'Other (specify)', siteRegion: 'Trunk and limbs', pni: 'Present' }), true);
  assert.equal(vis({ tumourSite: 'Not specified', siteRegion: 'Trunk and limbs', pni: 'Present' }), true);
  assert.equal(vis({ tumourSite: 'Other (specify)', siteRegion: 'Head and neck', pni: 'Present' }), false);
  // Wherever the box shows, a tick stages; wherever it is hidden, a tick does not.
  for (const site of S.SITE_OPTIONS) {
    for (const pni of S.PNI_OPTIONS) {
      const v = { ...defaults(schema), ...EX, tumourSite: site, siteRegion: 'Trunk and limbs', pni, pniFiveNerves: true };
      assert.equal(S.fiveNerves(v), isVisible(f, v), `${site} / ${pni}`);
    }
  }
});

test('head and neck pN is the AJCC 8th ENE table', () => {
  const N = (count, laterality, ene, sizeMm) => pathologicalN({ count, laterality, ene, sizeMm }).cat;
  assert.equal(N(1, 'ipsilateral', 'Not identified', 30), 'N1');
  assert.equal(N(1, 'ipsilateral', 'Not identified', 30.1), 'N2a');
  assert.equal(N(1, 'ipsilateral', 'Present', 30), 'N2a');
  assert.equal(N(1, 'ipsilateral', 'Present', 30.1), 'N3b');
  assert.equal(N(2, 'ipsilateral', 'Not identified', 60), 'N2b');
  assert.equal(N(2, 'ipsilateral', 'Not identified', 60.1), 'N3a');
  assert.equal(N(1, 'contralateral', 'Not identified', 10), 'N2c');
  assert.equal(N(2, 'bilateral', 'Not identified', 10), 'N2c');
  assert.equal(N(1, 'contralateral', 'Present', 10), 'N3b');
  assert.equal(N(2, 'ipsilateral', 'Present', 10), 'N3b');
  assert.equal(N(1, '', 'Not identified', 12), 'N1', 'blank laterality is ipsilateral');
  assert.match(pathologicalN({ count: 1, laterality: 'ipsilateral', ene: 'Cannot be determined', sizeMm: 12 }).note, /ENE\(-\) category/);
  const ear = (p) => tnm(run({ ...CASES[2][1], ...p }));
  assert.equal(ear({}), 'pT1 pN3b');
  assert.equal(ear({ nodesInvolved: '1', ene: 'Not identified' }), 'pT1 pN1');
  assert.equal(ear({ nodesInvolved: '1', ene: 'Present' }), 'pT1 pN2a');
  assert.equal(ear({ nodesInvolved: '0', nodeLaterality: '', ene: '' }), 'pT1 pN0');
  assert.equal(ear({ nodeLaterality: 'Contralateral', ene: 'Not identified' }), 'pT1 pN2c');
});

test('trunk and limb pN is UICC 9th: 30 and 60 mm, no ENE, contralateral nodes are pM1', () => {
  const limb = (p) => tnm(run({ ...CASES[4][1], ...p }));
  assert.equal(limb({ largestDepositMm: '30' }), 'pT2 pN1');
  assert.equal(limb({ largestDepositMm: '30.1' }), 'pT2 pN2');
  assert.equal(limb({ nodesInvolved: '2', largestDepositMm: '12' }), 'pT2 pN2');
  assert.equal(limb({ largestDepositMm: '60.1' }), 'pT2 pN3');
  assert.equal(limb({ largestDepositMm: '12', ene: 'Present' }), 'pT2 pN1', 'no ENE term on UICC 9th');
  const contra = run({ ...CASES[4][1], nodeLaterality: 'Contralateral', largestDepositMm: '12' });
  assert.equal(tnm(contra), 'pT2 pN0 pM1');
  assert.deepEqual(msgs(contra, 'warn'), ['Only contralateral nodes are involved; for a trunk or limb primary they are distant metastasis (pM1), and pN0 assumes the uninvolved nodes are regional.']);
  // pM0 is not a pathological category, so a typed override cannot take the pM1 away.
  assert.equal(tnm(run({ ...CASES[4][1], nodeLaterality: 'Contralateral', largestDepositMm: '12', tnmOverride: 'pT2 pN0 pM0', tnmOverrideReason: 'test' })).split(' [')[0], 'pT2 pN0 pM1');
  assert.equal(tnm(run({ distantMets: ['Lung'] })), 'pT1 pNX pM1');
});

test('BWH class counts the four factors; bone makes T3; level I is T0', () => {
  const B = (p) => bwh(run(p));
  assert.equal(B({ tumourSizeMm: '19' }), 'T1: 0 high-risk factors');
  assert.equal(B({ tumourSizeMm: '20' }), 'T2a: 1 high-risk factor', '2 cm or more');
  assert.equal(B({ grade: 'G3, poorly differentiated' }), 'T2a: 1 high-risk factor');
  assert.equal(B({ grade: 'G4, undifferentiated' }), 'T2a: 1 high-risk factor');
  assert.equal(B({ pni: 'Present, less than 0.1 mm in calibre' }), 'T1: 0 high-risk factors');
  assert.equal(B({ pni: 'Present, in a nerve deeper than the dermis' }), 'T2a: 1 high-risk factor', 'CAP Note E: deep nerve taken as 0.1 mm or more');
  assert.equal(B({ doiMm: '9' }), 'T1: 0 high-risk factors', 'depth alone is not a BWH factor');
  const four = { tumourSizeMm: '25', grade: 'G3, poorly differentiated', pni: 'Present, 0.1 mm or more in calibre', beyondFat: 'Present (specify)', beyondFatDetail: 'skeletal muscle' };
  assert.equal(B({ ...four, beyondFat: 'Not identified' }), 'T2b: 2-3 high-risk factors');
  assert.equal(B(four), 'T3: 4 high-risk factors or bone invasion');
  assert.equal(rows(run(four))['High-risk factors'], 'Tumour diameter 2 cm or more, poorly differentiated histology, perineural invasion 0.1 mm or more in calibre and invasion beyond the subcutaneous fat');
  assert.equal(B({ boneInvasion: 'Minor bone erosion' }), 'T3: 4 high-risk factors or bone invasion');
  assert.equal(rows(run({ boneInvasion: 'Minor bone erosion' }))['High-risk factors'], 'Bone invasion');
  const insitu = run({ anatomicLevel: 'I (carcinoma in situ)', doiMm: '' });
  assert.equal(bwh(insitu), 'T0: in situ squamous cell carcinoma');
  assert.ok(msgs(insitu, 'warn').includes('Anatomic level I is carcinoma in situ; an in situ lesion is reported on the Skin excision form.'));
  // A matching override prints as derived; a different one is an error and prints flagged.
  assert.equal(B({ bwhOverride: 'T1: 0 high-risk factors' }), 'T1: 0 high-risk factors');
  const ov = run({ bwhOverride: 'T2a: 1 high-risk factor' });
  assert.equal(bwh(ov), 'T2a: 1 high-risk factor [pathologist override; derived T1]');
  assert.deepEqual(msgs(ov, 'error'), ['BWH class T2a recorded, but the recorded factors give T1.']);
  assert.ok(flatDx(ov).endsWith('BWH T2a'));
});

// ---------- prose ----------

test('histology paragraph: seen-only register, articles, IHC and a typed override', () => {
  for (const type of fieldOf('histType').options) {
    for (const grade of ['', 'G1, well differentiated', 'G3, poorly differentiated']) {
      const h = flat(rows(run({ histType: type, histTypeOther: 'squamous cell carcinoma, basaloid', grade }))['Tumour histology']);
      assert.ok(!/WHO|by definition|prognos|recurrence|metasta|exclude|favour|consistent with/i.test(h), `${type}: ${h}`);
      assert.ok(!/ a [aeiou]/i.test(h), `${type}: article (${h})`);
    }
  }
  const aca = flat(rows(run({ histType: 'Acantholytic squamous cell carcinoma', grade: '' }))['Tumour histology']);
  assert.ok(aca.startsWith('The tumour is an acantholytic squamous cell carcinoma, invading the reticular dermis to a depth of 4 mm. Loss of cohesion'));
  const ka = run({ histType: 'Keratoacanthoma', grade: 'G1, well differentiated' });
  assert.ok(flat(rows(ka)['Tumour histology']).startsWith('The tumour is a well differentiated squamous cell carcinoma, keratoacanthoma type,'));
  assert.ok(flatDx(ka).includes('SQUAMOUS CELL CARCINOMA, keratoacanthoma type, well differentiated, 14 mm'));
  const ihc = flat(rows(run({ ihc: ['p40 positive', 'CK5/6 positive', 'SOX10 negative', 'S100 negative'] }))['Tumour histology']);
  assert.ok(ihc.endsWith('The tumour cells express p40 and CK5/6 and are negative for SOX10 and S100.'), ihc);
  assert.equal(flat(rows(run({ histologyNotes: 'Typed paragraph' }))['Tumour histology']), 'Typed paragraph.');
  const fat = flat(rows(run({ anatomicLevel: 'V (carcinoma invades subcutaneum)', beyondFat: 'Present (specify)', beyondFatDetail: 'Skeletal muscle', doiMm: '9' }))['Tumour histology']);
  assert.ok(fat.includes('invading beyond the subcutaneous fat into skeletal muscle to a depth of 9 mm.'), fat);
});

test('margins, nodes and metastasis wording', () => {
  const inv = run({ invasiveMargin: 'Margin(s) involved by invasive tumour (specify)', invasiveInvolvedDetail: 'deep margin', deepMm: '' });
  assert.equal(rows(inv)['Invasive tumour'], 'Involved (deep margin)');
  assert.ok(flatDx(inv).includes('; invasive carcinoma involves the deep margin; see synoptic report'));
  const insitu = run({ insituMargin: 'Margin(s) involved by in situ disease (specify)', insituDetail: 'medial peripheral margin' });
  assert.equal(rows(insitu)['Non-invasive tumour'], 'Involved by in situ disease (medial peripheral margin)');
  assert.ok(flatDx(insitu).includes('invasive carcinoma completely excised (closest peripheral margin 4 mm, superior; deep margin 3 mm); in situ disease involves the medial peripheral margin'));
  assert.equal(rows(run({ bedMargin: 'Uninvolved by invasive carcinoma' }))['Tumour bed margin'], 'Uninvolved by invasive carcinoma');
  assert.equal(rows(run({ invasiveMargin: 'Cannot be assessed' }))['Invasive tumour'], 'Margins cannot be assessed');
  const ear = run(CASES[2][1]);
  const r = rows(ear);
  assert.equal(r['Regional lymph nodes'], '14 examined; 2 involved');
  assert.equal(r['Laterality'], 'Ipsilateral (including midline)');
  assert.equal(r['Size of largest metastatic deposit'], '18 mm, level II');
  assert.ok(flatDx(ear).includes('- 2 of 14 regional lymph nodes involved; extranodal extension present'));
  assert.equal(rows(run({ nodesExamined: '0' }))['Regional lymph nodes'], 'None submitted (0 examined)');
  const mets = run({ distantMets: ['Lung', 'Liver'] });
  assert.equal(rows(mets)['Distant metastasis'], 'Lung and liver');
  assert.ok(flatDx(mets).includes('- distant metastasis: lung and liver'));
  assert.equal(rows(run({ distantMets: ['Not identified'] }))['Distant metastasis'], 'Not identified');
  assert.equal(rows(run())['Distant metastasis'], undefined, 'Not applicable prints nothing');
});

// ---------- checks ----------

test('checks: the errors', () => {
  const E = (p) => msgs(run(p), 'error');
  assert.ok(E({ histType: '' }).includes('Histologic type is required.'));
  assert.ok(E({ tumourSite: '' }).some((m) => /^Tumour site is required/.test(m)));
  assert.ok(E({ nodesExamined: '2', nodesInvolved: '3', nodeLaterality: 'Ipsilateral (including midline)', ene: 'Not identified', largestDepositMm: '5' }).includes('More lymph nodes involved than examined.'));
  assert.ok(E({ nodesExamined: '2', nodesInvolved: '' }).includes('Number of involved lymph nodes is required when nodes are examined.'));
  const hn = E({ nodesExamined: '3', nodesInvolved: '1', nodeLaterality: 'Ipsilateral (including midline)', ene: '', largestDepositMm: '' });
  assert.ok(hn.includes('Extranodal extension is required for involved head and neck nodes: it decides pN.'));
  assert.ok(hn.includes('Size of the largest metastatic deposit is required: pN turns on 30 mm and 60 mm.'));
  assert.ok(!E({ ...FOREARM, nodesExamined: '3', nodesInvolved: '1', nodeLaterality: 'Ipsilateral (including midline)', ene: '', largestDepositMm: '8' }).some((m) => /Extranodal/.test(m)), 'no ENE check on UICC 9th');
  assert.ok(E({ doiMm: '8', tnmOverride: 'pT2 pNX', tnmOverrideReason: 'test' }).includes('pT2 recorded, but depth of invasion 8 mm is a pT3 criterion.'));
});

test('checks: the warnings', () => {
  const W = (p) => msgs(run(p), 'warn');
  assert.ok(W({ grade: '' }).some((m) => /^Histologic grade is not recorded/.test(m)));
  assert.ok(W({ pni: 'Present' }).some((m) => /^Perineural invasion present with the calibre not stated/.test(m)));
  assert.ok(W({ doiMm: '' }).includes('Depth of invasion is not recorded; more than 6 mm is a pT3 criterion.'));
  assert.ok(W({ nodesExamined: '3', nodesInvolved: '1', nodeLaterality: '', ene: 'Not identified', largestDepositMm: '8' }).includes('Laterality of the involved nodes is not recorded; they are staged as ipsilateral.'));
  assert.ok(W({ nodesExamined: '3', nodesInvolved: '1', nodeLaterality: 'Bilateral', ene: 'Not identified', largestDepositMm: '8' }).includes('Bilateral nodal involvement needs at least two involved nodes.'));
  assert.ok(W({ invasiveMargin: 'Margin(s) involved by invasive tumour (specify)' }).includes('Name the margin involved by invasive tumour.'));
  assert.ok(W({ histType: 'Other histologic type not listed (specify)' }).includes('Histologic type "Other" needs specifying.'));
  assert.ok(W({ specimenName: '', tumourSite: 'Not specified', siteRegion: 'Trunk and limbs', tumourSizeMm: '', lesionSize: '' }).length === 0, 'size error, not a warning, on a staged site');
  assert.ok(W({ specimenName: '', tumourSite: 'Eyelid', tumourSizeMm: '', lesionSize: '' }).includes('Tumour size not recorded; the BWH class treats the diameter as under 2 cm.'));
  assert.deepEqual(W({}), [], 'the example is clean');
});

// ---------- intake ----------

test('intake: an SCC history brings skin excisions here; BCC, Bowen, in situ and no history stay on Skin excision', () => {
  const route = (line, history = '') => matchParts(parseIntake(`(A) ${line}`), history, manifest)[0];
  assert.equal(route('Skin, left cheek, excision', '?SCC').templateId, 'skin_scc');
  assert.equal(route('Skin, scalp, excision', 'Squamous cell carcinoma').templateId, 'skin_scc');
  assert.equal(route('Skin, scalp, excision', 'Squamous cell carcinoma').tier, 'confident');
  assert.equal(route('Right ear, wedge excision', 'cSCC').templateId, 'skin_scc');
  assert.equal(route('Skin, left cheek, excision, ?SCC').templateId, 'skin_scc', 'SCC in the specimen line opens the gate too');
  for (const history of ['?BCC', "Bowen's disease", 'SCC in situ', 'Keratoacanthoma']) {
    const m = route('Skin, left cheek, excision', history);
    assert.equal(m.templateId, 'skin_excision', history);
    assert.ok(!m.candidates.some((c) => c.id === 'skin_scc'), `${history}: not a candidate`);
  }
  assert.ok(!route('Skin, left cheek, excision').candidates.some((c) => c.id === 'skin_scc'), 'no history: not a candidate');
  assert.notEqual(route('Tongue, excision', 'SCC').templateId, 'skin_scc');
  assert.notEqual(route('Oesophagus, biopsy', 'SCC').templateId, 'skin_scc');
  assert.notEqual(route('Skin, back, excision', 'Lipoma').templateId, 'skin_scc');
  const preset = (line) => {
    const parsed = parseIntake(`(A) ${line}`);
    return presetValues(schema, parsed.parts[0], matchParts(parsed, 'SCC', manifest)[0]);
  };
  assert.deepEqual(preset('Skin, left cheek, excision'), { laterality: 'Left', specimenName: 'left cheek', tumourSite: 'Cheek' });
  assert.deepEqual(preset('Skin, right preauricular, excision'), { laterality: 'Right', specimenName: 'right preauricular', tumourSite: 'Preauricular' });
  assert.deepEqual(preset('Skin, left lower leg, excision'), { laterality: 'Left', specimenName: 'left lower leg', tumourSite: 'Lower leg' });
  assert.equal(preset('Skin, abdomen, lesion, excision').tumourSite, 'Abdomen');
});

test('block key: typed lines are lettered; otherwise the skin excision key', () => {
  assert.equal(flat(run({ blockKeyText: '1 Tip A\n2-4 Lesion\n5 Tip B' }).blockKey), '(1) Tip A. (2-4) Lesion. (5) Tip B.');
  assert.equal(flat(run().blockKey), '(1) Tip A. (2-4) Lesion, cross-sections. (5) Tip B.');
  assert.equal(run({}, { macro: false }).macro, '');
});

// ---------- golden fixtures ----------

test('golden fixtures reproduce byte-for-byte', () => {
  fs.mkdirSync(FIX, { recursive: true });
  for (const [name, patch, opts = {}] of CASES) {
    const out = run(patch, opts);
    const file = path.join(FIX, `${name}.json`);
    // A deliberate edit's reason lives in the fixture's description; --update keeps it.
    const kept = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')).description : undefined;
    const current = { ...(kept ? { description: kept } : {}), templateId: 'skin_scc', patch, options: opts, report: out.report, checks: out.issues };
    if (UPDATE || !fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n'); continue; }
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(out.report, saved.report, `${file} changed; re-run with --update only after a deliberate wording change`);
    assert.deepEqual(out.issues, saved.checks, `${file} checks changed`);
  }
});

test('golden fixtures: the card accept cases stage as the card says', () => {
  const byName = Object.fromEntries(CASES.map(([n, p]) => [n, run(p)]));
  assert.equal(tnm(byName['skin-scc-01-cheek-pt1']), 'pT1 pNX');
  assert.equal(bwh(byName['skin-scc-01-cheek-pt1']), 'T1: 0 high-risk factors');
  assert.equal(tnm(byName['skin-scc-02-scalp-pt3-bwh-t2b']), 'pT3 pNX');
  assert.equal(bwh(byName['skin-scc-02-scalp-pt3-bwh-t2b']), 'T2b: 2-3 high-risk factors');
  assert.equal(tnm(byName['skin-scc-03-ear-pn3b']), 'pT1 pN3b');
  assert.equal(tnm(byName['skin-scc-04-forearm-uicc-pt2']), 'pT2 pNX');
  assert.equal(bwh(byName['skin-scc-04-forearm-uicc-pt2']), 'T2a: 1 high-risk factor');
  assert.ok(sections(byName['skin-scc-04-forearm-uicc-pt2']).includes('Pathological stage (UICC 9th edition)'));
  assert.equal(tnm(byName['skin-scc-05-thigh-uicc-pn2']), 'pT2 pN2');
  for (const [n, out] of Object.entries(byName)) assert.deepEqual(out.issues, [], `${n} is clean`);
});
