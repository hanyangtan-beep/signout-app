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
