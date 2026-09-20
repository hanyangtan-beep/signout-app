// Family reference plates - data integrity and geometry.
//
// The geometry tests are the same two the pathway chart carries, and for the same reason: a drawing
// that overlaps itself or spills outside its box is unreadable, and neither shows up in a unit test
// of the data alone.
import test from 'node:test';
import assert from 'node:assert/strict';
import { plateFor, plateSupported, plateSelection, plateChart, plateEntries, PLATE_FAMILIES } from '../src/cnsplates.js';
import { proposedGrade } from '../generators/cns_layers.js';
import { loadAll } from '../src/registry.js';

const registry = await loadAll();

test('every plate family is a real dxFamily option', async () => {
  const f = registry.cns_tumour.schema.fields.find((x) => x.id === 'dxFamily');
  for (const fam of PLATE_FAMILIES) {
    assert.ok(f.options.includes(fam), `${fam} is an option on dxFamily`);
  }
});

test('a plate is offered only for a family that has one', () => {
  assert.equal(plateSupported({ dxFamily: 'Paediatric-type diffuse low-grade gliomas' }), true);
  assert.equal(plateSupported({ dxFamily: 'Adult-type diffuse gliomas' }), false);
  assert.equal(plateSupported({}), false);
  assert.equal(plateSupported(undefined), false);
  assert.equal(plateFor('Nonsense'), null);
});

test('the paediatric low-grade plate carries all four WHO entities', () => {
  const p = plateFor('Paediatric-type diffuse low-grade gliomas');
  const names = p.rails.flatMap((r) => r.nodes.map((n) => n.label));
  assert.equal(names.length, 4);
  for (const want of ['Angiocentric glioma', 'Diffuse astrocytoma, MYB- or MYBL1-altered',
    'Polymorphous low-grade neuroepithelial tumour of the young',
    'Diffuse low-grade glioma, MAPK pathway-altered']) {
    assert.ok(names.includes(want), `plate carries ${want}`);
  }
  // Three are grade 1. The MAPK-altered diffuse glioma has no assigned CNS WHO grade, and an
  // earlier build of this plate wrongly gave it grade 1 by reading across from its neighbours.
  const grades = Object.fromEntries(p.rails.flatMap((r) => r.nodes).map((n) => [n.label, n.grade]));
  assert.equal(grades['Angiocentric glioma'], 'CNS WHO grade 1');
  assert.equal(grades['Diffuse astrocytoma, MYB- or MYBL1-altered'], 'CNS WHO grade 1');
  assert.equal(grades['Polymorphous low-grade neuroepithelial tumour of the young'], 'CNS WHO grade 1');
  assert.equal(grades['Diffuse low-grade glioma, MAPK pathway-altered'], 'No CNS WHO grade assigned');
});

test('the plate entity list matches the schema picklist', () => {
  for (const fam of PLATE_FAMILIES) {
    const plate = plateFor(fam);
    const f = registry.cns_tumour.schema.fields.find((x) => x.id === plate.entityField);
    const names = plate.rails.flatMap((r) => r.nodes.map((n) => n.label));
    const options = f.options.filter((o) => !/^Other entity/.test(o));
    for (const o of options) {
      assert.ok(names.some((n) => n === o), `${plate.entityField} option "${o}" appears on the plate`);
    }
    assert.equal(names.length, options.length, `no ${fam} entity is missing from the picklist`);
  }
});

test('the paediatric high-grade plate carries all four WHO entities and their grades', () => {
  const p = plateFor('Paediatric-type diffuse high-grade gliomas');
  const nodes = p.rails.flatMap((r) => r.nodes);
  assert.equal(nodes.length, 4);
  const grades = Object.fromEntries(nodes.map((n) => [n.label, n.grade]));
  // Three are grade 4 by definition. Infant-type hemispheric glioma is assigned no WHO grade at
  // all, which is the point of the plate saying so rather than inferring one from the histology.
  assert.equal(grades['Diffuse midline glioma, H3 K27-altered'], 'CNS WHO grade 4');
  assert.equal(grades['Diffuse hemispheric glioma, H3 G34-mutant'], 'CNS WHO grade 4');
  assert.equal(grades['Diffuse paediatric-type high-grade glioma, H3-wildtype and IDH-wildtype'], 'CNS WHO grade 4');
  assert.equal(grades['Infant-type hemispheric glioma'], 'No CNS WHO grade assigned');
});

/**
 * The embryonal family is where reading a grade across from a neighbour does the most damage. The
 * WHO CNS5 summary review says these tumours "are all grade 4"; the ICCR integrated diagnosis
 * dataset gives three of the six as "n/a", meaning no grade in the tumour definition. Building the
 * plate found FIXED_GRADE printing grade 4 on the BCOR tumour, and CRINET and the NEC/NOS bucket
 * demanding a grade neither carries. These assertions hold the per-entity reading in place.
 */
test('the embryonal plate grades three entities and leaves three ungraded', () => {
  const p = plateFor('Other CNS embryonal tumours');
  const nodes = p.rails.flatMap((r) => r.nodes);
  assert.equal(nodes.length, 6);
  const grades = Object.fromEntries(nodes.map((n) => [n.label, n.grade]));
  assert.equal(grades['Atypical teratoid/rhabdoid tumour'], 'CNS WHO grade 4');
  assert.equal(grades['Embryonal tumour with multilayered rosettes'], 'CNS WHO grade 4');
  assert.equal(grades['CNS neuroblastoma, FOXR2-activated'], 'CNS WHO grade 4');
  assert.equal(grades['Cribriform neuroepithelial tumour'], 'No CNS WHO grade assigned');
  assert.equal(grades['CNS tumour with BCOR internal tandem duplication'], 'No CNS WHO grade assigned');
  assert.equal(grades['CNS embryonal tumour'], 'No CNS WHO grade assigned');
});

/**
 * Medulloblastoma is the only family CNS5 classifies twice over, and the schema models that as two
 * separate `dxFamily` options with a field each. Two plates therefore cover it, each naming its own
 * entity field, and each gate tells the reader the other axis is still outstanding. A later edit that
 * merged them into one plate, or dropped the cross-reference, would misrepresent the integrated
 * diagnosis as a single choice - so both halves of the arrangement are asserted.
 */
test('the medulloblastoma pair is two plates over two fields, each pointing at the other', () => {
  const mol = plateFor('Medulloblastomas, molecularly defined');
  const hist = plateFor('Medulloblastomas, histologically defined');
  assert.equal(mol.entityField, 'dxMedMol');
  assert.equal(hist.entityField, 'dxMedHist');
  for (const p of [mol, hist]) {
    const gate = p.gate.nodes.map((n) => `${n.label} ${n.detail}`).join(' ');
    assert.match(gate, /integrated diagnosis/i);
    assert.match(gate, /other family selection on the form/i);
  }
});

/**
 * Every medulloblastoma is grade 4, whichever group and whichever type. In the ICCR dataset the grade
 * cell for WNT-activated and for non-WNT/non-SHH carries a dagger - "described in the section or
 * chapter but not in the definition" - which is NOT the "n/a" that sent three embryonal entities into
 * UNGRADED. The grade exists and prints. This asserts no plate node quietly acquires the ungraded
 * wording on the strength of that footnote.
 */
test('every medulloblastoma node carries grade 4', () => {
  for (const fam of ['Medulloblastomas, molecularly defined', 'Medulloblastomas, histologically defined']) {
    const nodes = plateFor(fam).rails.flatMap((r) => r.nodes);
    assert.equal(nodes.length, 4);
    for (const n of nodes) assert.equal(n.grade, 'CNS WHO grade 4', `${n.label} must be grade 4`);
  }
});

/**
 * The molecular fork is YAP1 so that WNT and both SHH entities sit on the expressed rail and the
 * non-WNT/non-SHH entity sits alone on the other. That shape is the teaching point: the three-marker
 * panel resolves three groups and cannot separate group 3 from group 4, so the lone rail is where
 * immunohistochemistry stops. A fork that split SHH-wildtype from SHH-mutant would imply a stain
 * makes that call, when only sequencing does.
 */
test('the molecular plate forks on YAP1 and keeps both SHH entities together', () => {
  const p = plateFor('Medulloblastomas, molecularly defined');
  assert.match(p.fork.label, /YAP1/);
  const pos = p.rails.find((r) => r.key === 'yap1pos');
  assert.deepEqual(pos.nodes.map((n) => n.label), [
    'Medulloblastoma, WNT-activated',
    'Medulloblastoma, SHH-activated and TP53-wildtype',
    'Medulloblastoma, SHH-activated and TP53-mutant']);
  const neg = p.rails.find((r) => r.key === 'yap1neg');
  assert.deepEqual(neg.nodes.map((n) => n.label), ['Medulloblastoma, non-WNT/non-SHH']);
});

/**
 * Two facts the plate exists to carry. GAB1 and YAP1 both fade in the nodular regions of
 * desmoplastic/nodular tumours and MBEN, which is the histology most likely to be SHH - so the two
 * stains that call SHH fail together and fail where they are most needed. And a TP53 mutation defines
 * an entity only within SHH, where 56 per cent are germline; the same mutation in a WNT tumour
 * carries neither implication. Both are exactly the read-across error the earlier plates caught, so
 * they are pinned here rather than left in prose.
 */
test('the medulloblastoma plates carry the surrogate and TP53 cautions', () => {
  const mol = plateFor('Medulloblastomas, molecularly defined');
  const disc = Object.fromEntries(mol.discriminators);
  assert.match(disc['GAB1'], /nodular/i);
  assert.match(disc['YAP1'], /nodular/i);
  assert.match(disc['p53'], /not a substitute for sequencing/i);
  const shhmut = mol.rails.flatMap((r) => r.nodes)
    .find((n) => n.label === 'Medulloblastoma, SHH-activated and TP53-mutant');
  assert.match(shhmut.note, /germline/i);
  const wnt = mol.rails.flatMap((r) => r.nodes).find((n) => n.label === 'Medulloblastoma, WNT-activated');
  assert.match(wnt.note, /neither the prognostic weight nor the germline risk/i);
  const hist = plateFor('Medulloblastomas, histologically defined');
  assert.match(hist.fork.label, /reticulin/i);
  assert.match(Object.fromEntries(hist.discriminators)['Reticulin'], /perinodular/i);
});

/**
 * The fork is SMARCB1 status specifically so that ATRT and cribriform neuroepithelial tumour land on
 * the same rail: both lose SMARCB1, CRINET clusters inside the ATRT-TYR methylation subgroup, and
 * the separation is the absent rhabdoid cells rather than any of that. Splitting them across the
 * fork would teach the wrong thing, so the pairing is asserted rather than left to a later edit.
 */
test('the embryonal plate forks on SMARCB1 and pairs ATRT with CRINET', () => {
  const p = plateFor('Other CNS embryonal tumours');
  assert.match(p.fork.label, /SMARCB1/);
  const lost = p.rails.find((r) => r.key === 'smarcb1lost');
  assert.deepEqual(lost.nodes.map((n) => n.label), [
    'Atypical teratoid/rhabdoid tumour',
    'Cribriform neuroepithelial tumour']);
});

/**
 * The plate states a grade and the generator proposes one. They are written in different files from
 * different sources, so they can drift: the H3-wildtype entity was absent from FIXED_GRADE and the
 * form raised "CNS WHO grade is required" against an entity WHO grades 4. This ties them together.
 */
test('a plate grade agrees with the grade the generator proposes', () => {
  for (const fam of PLATE_FAMILIES) {
    const plate = plateFor(fam);
    for (const n of plate.rails.flatMap((r) => r.nodes)) {
      const v = { dxFamily: fam, [plate.entityField]: n.label };
      const proposed = proposedGrade(v, n.label);
      const m = /^CNS WHO grade (\d)$/.exec(n.grade);
      if (m) {
        assert.equal(proposed, Number(m[1]), `${n.label}: plate says ${n.grade}, generator says ${proposed}`);
      } else {
        assert.equal(proposed, null, `${n.label} carries no WHO grade, so the generator must propose none`);
      }
    }
  }
});

test('every node and figure carries a source with a real URL', () => {
  for (const fam of PLATE_FAMILIES) {
    const p = plateFor(fam);
    for (const n of [...p.gate.nodes, ...p.rails.flatMap((r) => r.nodes)]) {
      assert.ok(n.source && /^https:\/\//.test(n.source.url), `${n.label} has a source URL`);
    }
    for (const fig of p.figures) {
      assert.match(fig.url, /^https:\/\//, `figure "${fig.label}" links out`);
      assert.ok(fig.cite && fig.cite.length > 4, `figure "${fig.label}" is credited`);
    }
    assert.ok(p.sources.length >= 2, 'the plate foot cites more than one source');
  }
});

// No figure is reproduced, so nothing in this module may point at an image file. This is the test
// that fails if someone later drops a downloaded journal figure into assets/.
test('a plate links to figures and never embeds one', () => {
  for (const fam of PLATE_FAMILIES) {
    const p = plateFor(fam);
    const json = JSON.stringify(p);
    assert.ok(!/\.(png|jpe?g|gif|webp|svg|tiff?)\b/i.test(json), `${fam} embeds no image file`);
    for (const fig of p.figures) {
      assert.ok(!/\/bin\/|\.pdf$/i.test(fig.url), `figure "${fig.label}" links to a page, not a binary`);
    }
  }
});

test('the plate geometry stays inside its box and nothing overlaps', () => {
  for (const fam of PLATE_FAMILIES) {
    const chart = plateChart(plateFor(fam));
    const boxes = [
      ...chart.gate.nodes,
      chart.fork,
      ...chart.rails,
      ...chart.rails.flatMap((r) => r.nodes),
    ];
    for (const b of boxes) {
      assert.ok(b.x >= 0 && b.y >= 0, 'no box starts off the canvas');
      assert.ok(b.x + b.w <= chart.width, `a box stays inside ${chart.width}px`);
      assert.ok(b.y + b.h <= chart.height, `a box stays inside ${chart.height}px`);
      assert.ok(b.w > 60 && b.h > 20, 'no box is degenerate');
    }
    // Siblings must not collide. Rails may contain their own nodes, so compare peers only.
    const peers = [chart.gate.nodes, chart.rails, ...chart.rails.map((r) => r.nodes)];
    for (const group of peers) {
      for (let i = 0; i < group.length; i += 1) {
        for (let j = i + 1; j < group.length; j += 1) {
          const a = group[i];
          const b = group[j];
          const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
          assert.ok(apart, `${a.key || a.label} overlaps ${b.key || b.label}`);
        }
      }
    }
  }
});

test('plateChart tolerates no plate, and entries read in order', () => {
  assert.equal(plateChart(null), null);
  assert.deepEqual(plateEntries(null), []);
  const chart = plateChart(plateFor('Paediatric-type diffuse low-grade gliomas'));
  const keys = plateEntries(chart).map((e) => e.key);
  assert.deepEqual(keys, ['g1', 'g2', 'g3', 'g4', 'ang', 'mybast', 'plnty', 'mapkdlg']);
  assert.equal(new Set(keys).size, keys.length, 'keys are unique');
});

test('the plate prints nothing - it is panel-only', () => {
  const { schema, generator } = registry.cns_tumour;
  const v = { ...schema.example.parts[0].values, dxFamily: 'Paediatric-type diffuse low-grade gliomas' };
  const out = generator.generate ? generator.generate(v) : null;
  const text = typeof out === 'string' ? out : JSON.stringify(out || '');
  for (const banned of [/polymorphous/i, /MYBL1/, /angiocentric/i, /CD34 diffuse/i]) {
    assert.ok(!banned.test(text), `${banned} is panel text and must not print`);
  }
});

/**
 * Every entity picklist in the CNS schema carries a default, so a value in dxPaedHigh is present on
 * a paediatric-LOW case that nobody touched. A plate that tried the entity fields in turn would
 * mark an entity from the wrong family, which is how the first build of this panel wrongly claimed
 * an entity was "recorded on this case".
 */
test('plate selection reads only its own family field', () => {
  const values = {
    dxFamily: 'Paediatric-type diffuse low-grade gliomas',
    dxPaedLow: 'Angiocentric glioma',
    dxPaedHigh: 'Diffuse midline glioma, H3 K27-altered',
    dxGlioneuronal: 'Ganglioglioma',
  };
  assert.equal(plateSelection(values), 'Angiocentric glioma');

  // Same defaults, no entity chosen in this family: nothing is marked rather than another
  // family's default being borrowed.
  assert.equal(plateSelection({ ...values, dxPaedLow: '' }), '');
});

test('plate selection is empty off-family and on no case', () => {
  assert.equal(plateSelection({ dxFamily: 'Adult-type diffuse gliomas', dxPaedLow: 'Angiocentric glioma' }), '');
  assert.equal(plateSelection({}), '');
  assert.equal(plateSelection(null), '');
});

test('every plate names an entity field that exists in the schema', () => {
  const { schema } = registry.cns_tumour;
  const ids = new Set(schema.fields.map((f) => f.id));
  for (const family of PLATE_FAMILIES) {
    const plate = plateFor(family);
    assert.ok(plate.entityField, `${family} names no entity field`);
    assert.ok(ids.has(plate.entityField), `${plate.entityField} is not a field in cns_tumour`);
    const field = schema.fields.find((f) => f.id === plate.entityField);
    assert.equal(field.showIf?.is, family, `${plate.entityField} is not the picklist shown for ${family}`);
  }
});
