// Lymph node for lymphoma (WHO-HAEM5). Cards: docs/roadmap.md "Lymph node for lymphoma — form, specimen and
// diagnosis" and "… — immunohistochemistry and ancillary studies" (user request and pulled by the user
// 2026-10-14, Phase 71); spec docs/specs/lymphoma-node.md; grounding docs/reference/lymphoma_node-morphology.md.
// Wording is deliberate; update the strings only on purpose.
// Fixtures: tests/fixtures/lymphoma_node/*.json (golden; --update only after a deliberate change).
// The routing lines below are house-style lines, not case text.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCase, generate, isVisible, snippetsFor } from '../src/engine.js';
import { parseIntake, matchParts, presetValues } from '../src/intake.js';
import { rowGroups } from '../src/picker.js';
import { loadAll, loadManifest } from '../src/registry.js';
import { hansOf, cellOfOrigin, dualExpressor, gradeForCount, DX_OPTIONS, MARKER_NAMES, resultField } from '../generators/lymphoma_node.js';

const registry = await loadAll();
const manifest = await loadManifest();
const t = registry.lymphoma_node;
const schema = t.schema;
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const FIX = path.join(here, 'fixtures', 'lymphoma_node');
const UPDATE = process.argv.includes('--update');
const one = (values, options = {}) => {
  const c = createCase(schema, 1);
  c.parts[0].values = { ...c.parts[0].values, ...values };
  Object.assign(c.options, options);
  return c;
};
const run = (values, options) => generate(schema, t.generator, one(values, options));
const example = () => ({ ...JSON.parse(JSON.stringify(schema.example)), schemaId: schema.id });
const visible = (values) => schema.fields.filter((f) => isVisible(f, { ...one({}).parts[0].values, ...values })).map((f) => f.id);
const checksOf = (r) => r.issues.map((i) => [i.level, i.field]);
const route = (line, history = '') => matchParts(parseIntake(line), history, manifest)[0];
const preset = (line, history = '') => {
  const parsed = parseIntake(line);
  return presetValues(schema, parsed.parts[0], matchParts(parsed, history, manifest)[0]);
};
const active = (c) => snippetsFor({ [schema.id]: { schema, generator: t.generator } }, c).filter((s) => s.active).map((s) => s.id);
const DLBCL = 'Diffuse large B-cell lymphoma, NOS';
// The diagnosis wraps at 80 characters with a hanging indent (src/synoptic.js); the tests read it unwrapped.
const flat = (s) => s.replace(/\n(?!- |\n|\()/g, ' ').replace(/ {2,}/g, ' ');
const ihc = (pairs) => {
  const v = { panel: Object.keys(pairs) };
  for (const [m, r] of Object.entries(pairs)) v[resultField(m)] = r;
  return v;
};

// ---------- metadata and menus ----------

test('template is registered with the required metadata', () => {
  assert.ok(t, 'registry has lymphoma_node');
  assert.equal(schema.system, 'Lymphoid');
  assert.equal(schema.kind, 'cancer resection');
  assert.equal(schema.label, 'Lymphoma');
  assert.equal(schema.organ, 'LYMPH NODE');
  assert.equal(schema.shortName, 'Lymph node · lymphoma work-up');
  assert.equal(schema.version, '2026.10');
  assert.equal(schema.style.british, true);
  assert.ok(!schema.options.some((o) => ['printPTNM', 'stageGroup', 'synopticOnly'].includes(o.id)), 'not staged');
});

test('it replaces the Lymphoma placeholder and follows the lymph node form in the Lymphoid menu', () => {
  const planned = JSON.parse(fs.readFileSync(path.join(root, 'templates', 'planned.json'), 'utf8')).planned;
  assert.ok(!planned.some((p) => p.id === 'lymphoma_node'), 'no placeholder left');
  const group = rowGroups(manifest, planned, 'bottom').find((g) => g.system === 'Lymphoid');
  assert.deepEqual(group.items.filter((i) => !i.planned).map((i) => i.id), ['lymph_node', 'spleen_benign', 'lymphoma_node', 'spleen_lymphoma']);
});

test('the diagnosis list carries the WHO-HAEM5 names in groups, and every marker has a result field', () => {
  const dx = schema.fields.find((f) => f.id === 'dx');
  assert.deepEqual(dx.optionGroups.map((g) => g.label), ['Reactive and tumour-like', 'Mature B-cell', 'Hodgkin', 'T and NK', 'Not further classified']);
  assert.deepEqual(dx.options, DX_OPTIONS);
  for (const name of ['Nodal TFH-cell lymphoma, angioimmunoblastic-type', 'Follicular large B-cell lymphoma', 'DLBCL/HGBL with MYC and BCL2 rearrangements', 'Kikuchi-Fujimoto disease']) {
    assert.ok(dx.options.includes(name), name);
  }
  for (const m of MARKER_NAMES) assert.ok(schema.fields.some((f) => f.id === resultField(m) && f.showIf?.is === m), m);
});

test('the form shows referral fields for slides, macroscopy for tissue, and grade fields by entity', () => {
  assert.ok(!visible({}).includes('refHospital'));
  assert.ok(visible({ received: 'Slides for review' }).includes('refHospital'));
  assert.ok(!visible({ received: 'Slides for review' }).includes('fixation'));
  assert.ok(visible({ procedure: 'Core biopsy' }).includes('cores'));
  assert.ok(!visible({ procedure: 'Core biopsy' }).includes('cutSurface'));
  assert.ok(visible({ dx: 'Follicular lymphoma' }).includes('flGrade'));
  assert.ok(visible({ dx: 'Follicular lymphoma' }).includes('cbCount'));
  assert.ok(!visible({ dx: 'Classic Hodgkin lymphoma' }).includes('bnli'));
  assert.ok(visible({ dx: 'Classic Hodgkin lymphoma', chlSubtype: 'Nodular sclerosis' }).includes('bnli'));
  assert.ok(visible({ dx: DLBCL }).includes('coo'));
  assert.ok(!visible({ dx: 'Kikuchi-Fujimoto disease' }).includes('certainty'));
  assert.ok(!visible({ dx: 'Reactive lymphoid hyperplasia' }).includes('cellSize'));
  assert.ok(visible({ panel: ['MYC'] }).includes('mycPct'));
});

// ---------- the example ----------

test('the example renders every block, the method in the comment and nothing a released report should not carry', () => {
  const c = example();
  c.options = { ...c.options, includeHeader: true };
  const r = generate(schema, t.generator, c);
  for (const h of ['SPECIMEN:', 'MACROSCOPIC DESCRIPTION:', 'BLOCK KEY:', 'MICROSCOPIC EXAMINATION AND SYNOPTIC REPORT:', 'MOLECULAR FINDINGS:', 'DIAGNOSIS:', 'COMMENT:']) {
    assert.ok(r.report.includes(h), h);
  }
  assert.equal(r.diagnosis, 'LYMPH NODE, left neck, excision\n- DIFFUSE LARGE B-CELL LYMPHOMA, NOS, non-GCB type');
  assert.ok(r.comment.includes('The cell of origin is assigned by the Hans immunohistochemical algorithm (CD10, BCL6 and MUM1).'));
  assert.doesNotMatch(r.report, /WHO|HAEM|ICC|by definition|threshold|cut-?off|>=|≥|30%|40%/);
});

// ---------- specimen and macroscopy ----------

test('specimen and diagnosis lines name the site and the procedure, and a referral its slides', () => {
  const r = run({ site: 'left neck', procedure: 'Core biopsy' });
  assert.equal(r.specimens, 'Lymph node, left neck, core biopsy');
  assert.match(r.diagnosis, /^LYMPH NODE, left neck, core biopsy\n- /);
  const ref = run({ site: 'left axillary', received: 'Slides for review', refHospital: 'QEH', refNumber: 'B26/0001', slidesHE: '3', slidesIHC: '10', refBlocks: '1', refDate: '01/10/2026' });
  assert.equal(ref.specimens, 'Lymph node, left axillary, excision for slide review');
  assert.match(flat(ref.diagnosis), /^LYMPH NODE, left axillary, excision for slide review \(B26\/0001 x 13 slides from QEH\)\n- /);
  assert.match(ref.microscopy, /^Three H&E sections, ten immunostained sections and one paraffin block labelled B26\/0001 are received from QEH\. They represent a left axillary lymph node excision, received on 01\/10\/2026\. Sections show a lymph node /);
  assert.equal(ref.macro, '');
});

test('macroscopy: fresh or in formalin, fresh tissue taken, cut surface, cores and embedding', () => {
  assert.equal(run({ fixation: 'Fresh', freshFor: ['Flow cytometry', 'Touch imprints'], size: '3 x 2 x 1.5', cutSurface: 'Nodular', blocks: '2' }).macro,
    'Received fresh is a lymph node measuring 3 x 2 x 1.5 cm. The cut surface is nodular. A portion is taken fresh for flow cytometry. Touch imprints are made. Serially sliced and all embedded in two blocks.');
  assert.equal(run({ procedure: 'Core biopsy', fixation: 'In formalin', cores: '3', coreLength: '10 to 15', blocks: '1' }).macro,
    'Received in formalin are three cores of tan tissue measuring 10 to 15 mm in length. All embedded in one block.');
  assert.equal(run({ procedure: 'Excision', nodeCount: '2', size: '2.5 x 2 x 1', embedded: 'Representative sections', blocks: '4' }).macro,
    'Received fresh are two lymph nodes, the largest measuring 2.5 x 2 x 1 cm. Representative sections are embedded in four blocks.');
  assert.equal(run({}, { macro: false }).macro, '');
});

// ---------- diagnosis wording ----------

const dx = (values) => flat(run({ site: 'left neck', ...values }).diagnosis).replace(/^LYMPH NODE, left neck, excision\n- /, '');

test('diagnosis: qualifiers, recurrence and partial involvement in the house form', () => {
  assert.equal(dx({ dx: 'Follicular lymphoma', flGrade: 'Grade 1', extent: 'Partial involvement', certainty: 'In keeping with' }), 'In keeping with partial involvement by FOLLICULAR LYMPHOMA, grade 1');
  assert.equal(dx({ dx: 'Follicular lymphoma', flGrade: 'Grade 3A', recurrent: true }), 'Recurrent FOLLICULAR LYMPHOMA, grade 3A');
  assert.equal(dx({ dx: 'Peripheral T-cell lymphoma, NOS', recurrent: true, certainty: 'Consistent with' }), 'Consistent with recurrent PERIPHERAL T-CELL LYMPHOMA, NOS');
  assert.equal(dx({ dx: 'Follicular lymphoma', flGrade: 'Grade 3A', flPattern: 'Follicular and diffuse', flDlbcl: true }), 'FOLLICULAR LYMPHOMA, grade 3A, follicular and diffuse pattern, with focal DIFFUSE LARGE B-CELL LYMPHOMA');
  assert.equal(dx({ dx: 'Classic Hodgkin lymphoma', chlSubtype: 'Nodular sclerosis', bnli: 'Grade 2' }), 'NODULAR SCLEROSIS CLASSIC HODGKIN LYMPHOMA, GRADE 2 (BNLI)');
  assert.equal(dx({ dx: 'Classic Hodgkin lymphoma', chlSubtype: 'Mixed cellularity', bnli: 'Grade 2' }), 'MIXED CELLULARITY CLASSIC HODGKIN LYMPHOMA');
  assert.equal(dx({ dx: 'Kikuchi-Fujimoto disease', certainty: 'Suspicious for' }), 'HISTIOCYTIC NECROTISING LYMPHADENITIS, in keeping with KIKUCHI-FUJIMOTO DISEASE');
  assert.equal(dx({ dx: 'DLBCL/HGBL with MYC and BCL2 rearrangements' }), 'DIFFUSE LARGE B-CELL LYMPHOMA/HIGH-GRADE B-CELL LYMPHOMA with MYC and BCL2 REARRANGEMENTS');
  assert.equal(dx({ dx: 'B-cell lymphoma, not further classified' }), 'B-CELL LYMPHOMA (please see description)');
  assert.equal(dx({ dx: 'Reactive lymphoid hyperplasia', reactivePattern: ['Follicular hyperplasia', 'Sinus histiocytosis'] }), 'REACTIVE FOLLICULAR HYPERPLASIA with SINUS HISTIOCYTOSIS');
  assert.equal(dx({ dx: 'Granulomatous lymphadenitis', granulomaType: 'Necrotising' }), 'NECROTISING GRANULOMATOUS LYMPHADENITIS');
  assert.equal(dx({ dx: DLBCL, certainty: 'Suspicious for', coo: 'Not assessed' }), 'Suspicious for DIFFUSE LARGE B-CELL LYMPHOMA, NOS');
});

test('the closing sentence repeats the diagnosis in sentence case', () => {
  const r = run({ dx: 'Follicular lymphoma', flGrade: 'Grade 1', extent: 'Partial involvement', certainty: 'In keeping with' });
  assert.match(r.microscopy, /The overall features are in keeping with partial involvement by follicular lymphoma, grade 1\.\n\n|The overall features are in keeping with partial involvement by follicular lymphoma, grade 1\.$/);
  assert.match(run({ dx: 'Classic Hodgkin lymphoma', chlSubtype: 'Nodular sclerosis', bnli: 'Grade 2' }).microscopy, /those of nodular sclerosis classic Hodgkin lymphoma, grade 2 \(BNLI\)\./);
});

// ---------- immunohistochemistry (card 2) ----------

test('Hans algorithm: CD10, then BCL6, then MUM1; only a positive or negative result counts', () => {
  assert.equal(hansOf(ihc({ CD10: 'Positive' })), 'GCB type');
  assert.equal(hansOf(ihc({ CD10: 'Negative', BCL6: 'Negative' })), 'non-GCB type');
  assert.equal(hansOf(ihc({ CD10: 'Negative', BCL6: 'Positive', MUM1: 'Positive' })), 'non-GCB type');
  assert.equal(hansOf(ihc({ CD10: 'Negative', BCL6: 'Positive', MUM1: 'Negative' })), 'GCB type');
  assert.equal(hansOf(ihc({ CD10: 'Weak', BCL6: 'Positive', MUM1: 'Negative' })), '');
  assert.equal(hansOf(ihc({ CD10: 'Negative', BCL6: 'Positive' })), '');
  assert.equal(cellOfOrigin({ dx: DLBCL, coo: 'Non-GCB type', ...ihc({ CD10: 'Positive' }) }), 'non-GCB type');
  assert.equal(cellOfOrigin({ dx: 'Follicular lymphoma', coo: 'Auto (Hans)', ...ihc({ CD10: 'Positive' }) }), '');
});

test('the DLBCL prints "non-GCB type" from CD10 negative, BCL6 positive and MUM1 positive', () => {
  const r = run({ dx: DLBCL, ...ihc({ CD20: 'Positive', CD10: 'Negative', BCL6: 'Positive', MUM1: 'Positive' }) });
  assert.match(r.diagnosis, /- DIFFUSE LARGE B-CELL LYMPHOMA, NOS, non-GCB type$/);
  assert.match(r.microscopy, /\n- Cell of origin \(Hans algorithm\): Non-GCB type/);
  assert.match(r.comment, /Hans immunohistochemical algorithm/);
  const manual = run({ dx: DLBCL, coo: 'GCB type', ...ihc({ CD20: 'Positive', CD10: 'Negative', BCL6: 'Positive', MUM1: 'Positive' }) });
  assert.match(manual.diagnosis, /NOS, GCB type$/);
  assert.ok(!manual.comment.includes('Hans'), 'a chosen cell of origin does not name the method');
  assert.deepEqual(checksOf(manual), [['warn', 'coo']]);
});

test('the immunophenotype is one paragraph: positive, weak, negative, subset, not assessable, percentages, Ki-67 and EBER', () => {
  const r = run({ dx: DLBCL, coo: 'Not assessed', ...ihc({ CD20: 'Positive', PAX5: 'Positive', BCL2: 'Weak', CD10: 'Negative', CD3: 'Negative', CD30: 'Positive (subset)', 'Cyclin D1': 'Not assessable', MYC: 'Positive' }),
    mycPct: '30', ki67: '70', eber: 'Negative' });
  const para = r.microscopy.split('\n\n')[0];
  assert.ok(para.includes('Immunohistochemical stains show that the atypical lymphoid cells are positive for CD20, PAX5 and MYC, weakly positive for BCL2, and negative for CD10 and CD3. A subset of the atypical lymphoid cells is positive for CD30. Staining for cyclin D1 is not assessable. MYC is expressed in approximately 30% of the atypical lymphoid cells. The Ki-67 proliferative index is approximately 70%. In situ hybridisation for EBER is negative in the atypical lymphoid cells.'), para);
  assert.match(r.microscopy, /\n\nImmunohistochemistry\n- CD20: Positive\n- PAX5: Positive\n- CD10: Negative\n- BCL2: Weak\n- MYC: Positive \(30%\)\n- Cyclin D1: Not assessable\n- CD3: Negative\n- CD30: Positive \(subset\)\n- Ki-67: approximately 70%\n\nIn situ hybridisation\n- EBER: Negative$/);
  assert.ok(!run({ dx: DLBCL, ...ihc({ CD20: 'Positive' }) }, { ihcList: false }).microscopy.includes('\n- CD20'), 'the list is optional');
});

test('Hodgkin and LP cells are the subject for classic Hodgkin lymphoma and NLPHL', () => {
  assert.match(run({ dx: 'Classic Hodgkin lymphoma', ...ihc({ CD30: 'Positive', CD45: 'Negative' }) }).microscopy, /show that the Hodgkin and Reed-Sternberg cells are positive for CD30 and negative for CD45\./);
  assert.match(run({ dx: 'Nodular lymphocyte predominant Hodgkin lymphoma', ...ihc({ CD20: 'Positive' }) }).microscopy, /show that the LP cells are positive for CD20\./);
  assert.match(run({ dx: DLBCL, ihcCells: 'large cells', ...ihc({ CD20: 'Positive' }) }).microscopy, /show that the large cells are positive for CD20\./);
});

test('MYC 50% with BCL2 80% suggests the dual-expression snippet', () => {
  const values = { dx: DLBCL, ...ihc({ MYC: 'Positive', BCL2: 'Positive' }), mycPct: '50', bcl2Pct: '80' };
  assert.equal(dualExpressor(values), true);
  assert.deepEqual(active(one(values)), ['lymphoma_dual_expressor']);
  const r = run(values);
  assert.ok(r.comment.includes('The lymphoma cells co-express MYC and BCL2 by immunohistochemistry (dual expressor).'));
  assert.equal(dualExpressor({ ...values, mycPct: '30' }), false);
  assert.equal(dualExpressor({ ...values, dx: 'Follicular lymphoma' }), false);
});

// ---------- molecular findings and comment ----------

test('FISH and clonality print in MOLECULAR FINDINGS; pending studies suggest the supplementary snippet', () => {
  const values = { dx: DLBCL, fishMYC: 'Rearranged', fishBCL2: 'Not rearranged', fishBCL6: 'Pending', fishOther: 'IGH::CCND1 fusion not detected', clonIG: 'Clonal' };
  const r = run(values);
  assert.equal(r.molecular, 'FISH\n- MYC: Rearranged\n- BCL2: Not rearranged\n- BCL6: Pending\n- IGH::CCND1 fusion not detected\n\nClonality\n- IG gene rearrangement: Clonal');
  assert.deepEqual(active(one(values)), ['lymphoma_pending']);
  assert.ok(r.comment.endsWith('Further studies are in progress; a supplementary report will follow.'));
  assert.equal(run({ dx: DLBCL }).molecular, '');
});

test('flow cytometry correlation prints in the comment', () => {
  assert.equal(run({ dx: 'Follicular lymphoma', flow: 'Concordant', flowRef: 'F26-001', flowText: 'a kappa-restricted CD10-positive B-cell population' }).comment,
    'Flow cytometry (F26-001) shows a kappa-restricted CD10-positive B-cell population, concordant with the histological findings.');
  assert.equal(run({ dx: 'Follicular lymphoma', flow: 'Not concordant' }).comment, 'Flow cytometry is not concordant with the histological findings.');
});

// ---------- checks ----------

test('checks: FISH MYC and BCL2 rearranged on a DLBCL, NOS', () => {
  const r = run({ dx: DLBCL, ...ihc({ CD20: 'Positive' }), fishMYC: 'Rearranged', fishBCL2: 'Rearranged' });
  assert.ok(r.issues.some((i) => i.level === 'warn' && i.field === 'dx' && /MYC and BCL2 are both rearranged/.test(i.message)));
  const entity = run({ dx: 'DLBCL/HGBL with MYC and BCL2 rearrangements', ...ihc({ CD20: 'Positive' }), fishMYC: 'Rearranged', fishBCL6: 'Rearranged' });
  assert.ok(entity.issues.some((i) => /BCL6 rearrangement, without BCL2/.test(i.message)));
});

test('checks: follicular lymphoma grade against the centroblast count, and grade 3A with diffuse areas', () => {
  assert.deepEqual([0, 5, 6, 15, 16].map(gradeForCount), ['Grade 1', 'Grade 1', 'Grade 2', 'Grade 2', 'Grade 3A']);
  const base = { dx: 'Follicular lymphoma', ...ihc({ CD20: 'Positive' }) };
  assert.deepEqual(checksOf(run({ ...base, flGrade: 'Grade 1', cbCount: '10' })), [['warn', 'flGrade']]);
  assert.deepEqual(checksOf(run({ ...base, flGrade: 'Grade 1-2', cbCount: '10' })), []);
  assert.deepEqual(checksOf(run({ ...base, flGrade: 'Grade 3A', cbCount: '20', flPattern: 'Predominantly diffuse' })), [['warn', 'flDlbcl']]);
});

test('checks: immunophenotype against the entity, a referral without a hospital, no immunohistochemistry', () => {
  assert.deepEqual(checksOf(run({ dx: 'Classic Hodgkin lymphoma', ...ihc({ CD30: 'Negative' }) })), [['warn', 'panel']]);
  assert.deepEqual(checksOf(run({ dx: 'Mantle cell lymphoma', ...ihc({ 'Cyclin D1': 'Negative' }) })), [['warn', 'panel']]);
  assert.deepEqual(checksOf(run({ dx: 'Burkitt lymphoma', ...ihc({ CD10: 'Positive' }), ki67: '80' })), [['warn', 'ki67']]);
  assert.deepEqual(checksOf(run({ dx: 'Nodal TFH-cell lymphoma, angioimmunoblastic-type', ...ihc({ CD3: 'Positive', PD1: 'Negative' }) })), [['warn', 'panel']]);
  assert.deepEqual(checksOf(run({ dx: 'Nodal TFH-cell lymphoma, angioimmunoblastic-type', ...ihc({ CD3: 'Positive', PD1: 'Positive' }) })), []);
  assert.deepEqual(checksOf(run({ dx: 'Follicular lymphoma' })), [['warn', 'panel']]);
  assert.deepEqual(checksOf(run({ dx: 'Reactive lymphoid hyperplasia' })), []);
  assert.deepEqual(checksOf(run({ dx: 'Reactive lymphoid hyperplasia', received: 'Slides for review' })), [['warn', 'refHospital']]);
  assert.deepEqual(checksOf(run({ dx: 'Other (type the diagnosis)' })), [['error', 'dxOther']]);
  assert.deepEqual(checksOf(run({ dx: DLBCL, ...ihc({ CD20: 'Positive' }) })), [['info', 'panel']], 'Hans needs CD10, BCL6 and MUM1');
});

// ---------- intake ----------

test('routing: a node line with a lymphoma word in the line or history opens this form; without, the lymph node form', () => {
  assert.equal(route('Lymph node, left neck, excision', '?lymphoma').templateId, 'lymphoma_node');
  assert.equal(route('Lymph node, left neck, excision').templateId, 'lymph_node');
  assert.equal(route('Lymph node, left neck, excision', 'neck mass for 2 months').templateId, 'lymph_node');
  assert.equal(route('Left cervical lymph node, excision', 'known DLBCL, relapse?').templateId, 'lymphoma_node');
  assert.equal(route('Left inguinal LN, excisional biopsy', 'Hodgkin lymphoma?').templateId, 'lymphoma_node');
  assert.equal(route('Lymph node, right axilla, core biopsy', 'r/o lymphoma').templateId, 'lymphoma_node');
  assert.equal(route('Left neck lymphadenopathy, excision', '?lymphoma').templateId, 'lymphoma_node');
  // Sentinel nodes, dissections, aspirates and frozen sections keep their forms.
  assert.equal(route('Sentinel lymph node, left axilla', 'breast carcinoma; history of lymphoma').templateId, 'lymph_node');
  assert.equal(route('Left neck dissection', 'SCC tongue, prior lymphoma').templateId, 'lymph_node');
  assert.equal(route('Lymph node, left neck, FNA', '?lymphoma').templateId, 'lymph_node_fna');
  assert.equal(route('Lymph node, right neck, excision for frozen section', '?lymphoma').templateId, 'lymph_node');
});

test('presets: the site, the procedure and slides for review from the line', () => {
  assert.deepEqual(preset('Lymph node, left neck, excision', '?lymphoma'), { site: 'Left neck', procedure: 'Excision' });
  assert.deepEqual(preset('Lymph node, right axilla, core biopsy', 'r/o lymphoma'), { site: 'Right axilla', procedure: 'Core biopsy' });
  assert.deepEqual(preset('Left inguinal LN, excisional biopsy', 'Hodgkin lymphoma?'), { site: 'Left inguinal', procedure: 'Excisional biopsy' });
  assert.deepEqual(preset('Lymph node, left neck, excision (slides for review)', 'NHL'), { site: 'Left neck', procedure: 'Excision', received: 'Slides for review' });
  // The question on the line itself is not part of the site.
  assert.deepEqual(preset('Lymph node, left neck, excision ?lymphoma'), { site: 'Left neck', procedure: 'Excision' });
  assert.deepEqual(preset('Lymph node, right inguinal, core biopsy (query lymphoma)'), { site: 'Right inguinal', procedure: 'Core biopsy' });
  assert.deepEqual(preset('Right axillary lymph node, excision r/o lymphoma'), { site: 'Right axillary', procedure: 'Excision' });
  assert.deepEqual(preset('Lymph node, left neck, excision for lymphoproliferative disorder'), { site: 'Left neck', procedure: 'Excision' });
  assert.equal(run({ site: 'Left neck' }).specimens, 'Lymph node, left neck, excision', 'the site prints in lower case');
});

test('a multi-part case letters its parts and their molecular findings', () => {
  const c = createCase(schema, 2);
  c.parts[0].values = { ...c.parts[0].values, site: 'left neck', dx: 'Follicular lymphoma', ...ihc({ CD20: 'Positive' }), clonIG: 'Clonal' };
  c.parts[1].values = { ...c.parts[1].values, site: 'right axilla', procedure: 'Core biopsy', dx: 'Reactive lymphoid hyperplasia' };
  const r = generate(schema, t.generator, c);
  assert.equal(r.specimens, '(A) Lymph node, left neck, excision\n(B) Lymph node, right axilla, core biopsy');
  assert.match(r.diagnosis, /^\(A\) LYMPH NODE, left neck, excision\n- FOLLICULAR LYMPHOMA\n\n\(B\) LYMPH NODE, right axilla, core biopsy\n- REACTIVE FOLLICULAR HYPERPLASIA$/);
  assert.match(r.molecular, /^\(A\)\nClonality\n- IG gene rearrangement: Clonal$/);
});

// ---------- golden fixtures ----------

const CASES = [
  ['01-dlbcl-excision-non-gcb', {
    site: 'left neck', procedure: 'Excision', fixation: 'Fresh', freshFor: ['Flow cytometry', 'Cytogenetics'], size: '3.2 x 2.5 x 1.8', cutSurface: 'Homogeneous, tan and fleshy', blocks: '3',
    blockKeyText: '1-3. Lymph node, serial slices', architecture: 'Effaced', pattern: 'Diffuse', cellSize: 'Large', cytology: ['Vesicular nuclei with prominent nucleoli'],
    background: ['Small lymphocytes', 'Histiocytes'], features: ['Frequent mitoses', 'Necrosis'], dx: DLBCL,
    ...ihc({ CD20: 'Positive', PAX5: 'Positive', CD10: 'Negative', BCL6: 'Positive', MUM1: 'Positive', BCL2: 'Positive', MYC: 'Positive', 'Cyclin D1': 'Negative', CD5: 'Negative', CD3: 'Negative', CD30: 'Negative' }),
    mycPct: '50', bcl2Pct: '80', ki67: '80', eber: 'Negative', fishMYC: 'Not rearranged', fishBCL2: 'Not rearranged', fishBCL6: 'Not rearranged',
    flow: 'Concordant', flowText: 'a lambda-restricted B-cell population' }],
  ['02-follicular-lymphoma-core', {
    site: 'right inguinal', procedure: 'Core biopsy', fixation: 'In formalin', cores: '3', coreLength: '10 to 15', blocks: '1',
    architecture: 'Effaced', pattern: 'Follicular / nodular', cellSize: 'Small to medium', cytology: ['Centrocytes and centroblasts', 'Irregular, cleaved nuclei'],
    features: ['Back-to-back follicles', 'Attenuated mantle zones', 'Absent tingible body macrophages'], dx: 'Follicular lymphoma', flGrade: 'Grade 1-2', flPattern: 'Follicular',
    ...ihc({ CD20: 'Positive', CD10: 'Positive', BCL6: 'Positive', BCL2: 'Positive', CD3: 'Negative', 'Cyclin D1': 'Negative' }),
    ihcBackground: 'CD21 highlights expanded follicular dendritic cell meshworks', cbCount: '8', cbField: '40x objective, 0.159 mm2', ki67: '15', clonIG: 'Clonal' }],
  ['03-classic-hodgkin-nodular-sclerosis', {
    site: 'left supraclavicular', procedure: 'Excisional biopsy', fixation: 'Fresh', size: '2.5 x 2.0 x 1.5', cutSurface: 'With fibrous bands', blocks: '4',
    architecture: 'Effaced', pattern: 'Nodular with fibrous bands', cellSize: 'Scattered large cells in a mixed background', cytology: ['Hodgkin and Reed-Sternberg cells', 'Lacunar cells'],
    background: ['Small lymphocytes', 'Eosinophils', 'Plasma cells', 'Histiocytes'], features: ['Sclerosis'], dx: 'Classic Hodgkin lymphoma', chlSubtype: 'Nodular sclerosis', bnli: 'Grade 2',
    ...ihc({ CD20: 'Negative', PAX5: 'Weak', MUM1: 'Positive', CD3: 'Negative', CD30: 'Positive', CD15: 'Positive (subset)', CD45: 'Negative' }), eber: 'Negative' }],
  ['04-kikuchi-fujimoto', {
    site: 'right posterior neck', procedure: 'Excision', fixation: 'In formalin', size: '1.8 x 1.2 x 1.0', blocks: '2', architecture: 'Partially effaced',
    background: ['Histiocytes', 'Small lymphocytes'], dx: 'Kikuchi-Fujimoto disease', ihcCells: 'histiocytes',
    ...ihc({ CD68: 'Positive', MPO: 'Positive' }), ihcBackground: 'CD123 highlights clusters of plasmacytoid dendritic cells. CD3 highlights numerous T cells, with CD8 predominance', eber: 'Negative' }],
  ['05-slide-review-partial-follicular', {
    site: 'left axillary', procedure: 'Excision', received: 'Slides for review', refHospital: 'Queen Elizabeth Hospital', refNumber: 'B26/00001', slidesHE: '3', slidesIHC: '10', slidesISH: '1', refBlocks: '1',
    refDate: '01/10/2026', architecture: 'Partially effaced', pattern: 'Follicular / nodular', cellSize: 'Small to medium', cytology: ['Centrocytes and centroblasts'],
    features: ['Residual reactive follicles'], dx: 'Follicular lymphoma', flGrade: 'Grade 1', extent: 'Partial involvement', certainty: 'In keeping with',
    ...ihc({ CD20: 'Positive', CD10: 'Positive', BCL2: 'Positive' }), ki67: '10', eber: 'Not performed' }],
  ['06-reactive-follicular-hyperplasia', {
    site: 'left neck', procedure: 'Excision', fixation: 'In formalin', size: '1.5 x 1.0 x 0.8', blocks: '2', architecture: 'Preserved',
    dx: 'Reactive lymphoid hyperplasia', reactivePattern: ['Follicular hyperplasia', 'Sinus histiocytosis'], ihcCells: 'germinal centre cells',
    ...ihc({ BCL2: 'Negative', CD10: 'Positive' }), ihcBackground: 'Kappa and lambda in situ hybridisation shows a polytypic pattern' }]
];

test('golden fixtures reproduce byte-for-byte', () => {
  fs.mkdirSync(FIX, { recursive: true });
  for (const [name, values] of CASES) {
    const out = run(values);
    const file = path.join(FIX, `${name}.json`);
    const current = { templateId: 'lymphoma_node', values, report: out.report, checks: out.issues };
    if (UPDATE || !fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n'); continue; }
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(out.report, saved.report, `${file} changed; re-run with --update only after a deliberate wording change`);
    assert.deepEqual(out.issues, saved.checks, `${file} checks changed`);
  }
});
