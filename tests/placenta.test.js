import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { generate, createCase } from '../src/engine.js';
import placenta from '../generators/placenta.js';

const schema = JSON.parse(fs.readFileSync(new URL('../schemas/placenta.json', import.meta.url), 'utf8'));

function runOne(values) {
  const c = createCase(schema, 1);
  Object.assign(c.parts[0].values, values);
  return { c, out: generate(schema, placenta, c) };
}

test('placenta singleton (Card 1): default checklist style and house wording', () => {
  const { out } = runOne(schema.example.parts[0].values);
  assert.match(out.macro, /Specimen weighs 480 g\./);
  assert.match(out.macro, /It consists of a singleton placenta with an eccentrically inserted umbilical cord\./);
  assert.match(out.macro, /The umbilical cord measures 45 cm long and 1\.2 cm in diameter; its cut surface shows three vessels\./);
  assert.match(out.macro, /The placental membranes are smooth and show no loss of lustre\./);
  assert.match(out.macro, /No significant retroplacental haematoma or infarct is seen\./);
  assert.match(out.macro, /4 representative blocks\./);
  assert.equal(out.blockKey, '(1) Umbilical cord. (2) Placental membranes. (3)&(4) Placental disc.');
  assert.match(out.microscopy, /- Villitis:  Absent/);
  assert.match(out.microscopy, /- Chorioamnionitis:  Absent/);
  assert.match(out.microscopy, /- Funisitis:  Absent/);
  assert.match(out.microscopy, /Third trimester chorionic villi are seen\./);
  assert.equal(out.diagnosis, 'PLACENTA:\n- NO SIGNIFICANT PATHOLOGY.');
});

test('placenta singleton (Card 1): LSCS with chorioamnionitis, funisitis, infarct block and sentence style', () => {
  const { out } = runOne({
    specimenName: 'Placenta, LSCS',
    formalin: true,
    weight: '520',
    trimmedWeight: '450',
    discSize: '19 x 17 x 2.5',
    cordLength: '40',
    cordDiameter: '1.1',
    cordInsertion: 'Central',
    cordVessels: 'Three',
    falseKnotCm: '12',
    membranesAppearance: 'Dull',
    cutSurface: 'Focal infarct',
    cutSurfaceSize: '2.5',
    blocks: '5',
    lesionBlock: 'Infarct',
    microStyle: 'Sentences',
    chorioamnionitis: 'Stage 2 - acute chorioamnionitis',
    fetalResponse: 'Stage 1 - umbilical phlebitis or chorionic vasculitis',
    infarcts: 'Present - remote',
    infarctPercent: '5'
  });
  assert.match(out.macro, /\(Specimen received in formalin\)/);
  assert.match(out.macro, /The trimmed weight of the placenta is 450 g\./);
  assert.match(out.macro, /A false knot is seen 12 cm from the umbilical cord insertion site\./);
  assert.match(out.macro, /The placental membranes are dull\./);
  assert.match(out.macro, /Focally, an infarcted area is seen within the placenta, measuring 2\.5 cm across\./);
  assert.equal(out.blockKey, '(1) Umbilical cord. (2) Placental membranes. (3)&(4) Placental disc. (5) Infarct.');
  assert.match(out.microscopy, /acute chorioamnionitis \(maternal stage 2\)/);
  assert.match(out.microscopy, /early acute funisitis \(fetal stage 1\)/);
  assert.match(out.diagnosis, /^PLACENTA, LSCS:\n- Acute CHORIOAMNIONITIS \(maternal stage 2\);\n- Early acute FUNISITIS \(fetal stage 1\);\n- Focal INFARCT \(5%\)\.$/);
});

test('placenta backward compatibility: Phase 4b saved singleton & twin values print cleanly without undefined', () => {
  const { out } = runOne({
    specimenName: 'Twin placenta',
    plurality: 'Twin - dichorionic diamniotic',
    weight: '850',
    gestation: 'Third trimester',
    discSize: '24 x 20 x 2.5',
    cutSurface: 'Infarct(s)',
    cutSurfaceInfarctPercent: '10',
    blocks: '9',
    chorioamnionitis: 'Absent',
    fetalResponse: 'Absent',
    villitis: 'Absent',
  });
  assert.doesNotMatch(out.macro, /undefined/);
  assert.doesNotMatch(out.microscopy, /undefined/);
  assert.match(out.diagnosis, /DICHORIONIC DIAMNIOTIC TWIN PLACENTA/);
});

test('placenta multiple pregnancy (Card 2 & 3): MCDA twin with anastomoses, T-zone, discordant territories & confirmed', () => {
  const { out } = runOne({
    specimenName: 'Twin placenta',
    plurality: 'Twin',
    requestChorionicity: 'MCDA',
    weight: '780',
    discConfiguration: 'Fused',
    discSize: '22 x 19 x 2.5',
    twin1CordLength: '42',
    twin1CordDiameter: '1.1',
    twin2CordLength: '38',
    twin2CordDiameter: '1.0',
    dividingMembraneGross: 'Thin, translucent and mobile',
    cordDistanceCm: '11',
    vascularEquator: '60 / 40',
    anastomoses: ['Arterio-arterial (AA)', 'Arteriovenous (AV)'],
    laserSites: true,
    tZoneBlock: true,
    membraneSampled: 'Roll and T-zone',
    membraneLayers: 'Two amnions without chorion',
    territoryComparison: 'Discordant — twin II less mature'
  });
  assert.match(out.macro, /single cotyledon/);
  assert.match(out.macro, /The umbilical cord insertions are 11 cm apart\./);
  assert.match(out.macro, /about 60% for twin I and 40% for twin II/);
  assert.match(out.macro, /Arterio-arterial and arteriovenous anastomoses are seen on the fetal surface\./);
  assert.match(out.macro, /Laser coagulation sites are seen along the vascular equator\./);
  assert.match(out.blockKey, /\(9\) Dividing membrane\. \(10\) T-zone\./);
  assert.match(out.microscopy, /At the T-zone, the two amnions separate over an uninterrupted chorionic plate, with no intervening chorion\./);
  assert.match(out.microscopy, /The villi of the twin II territory are immature and hydropic/);
  assert.match(out.diagnosis, /- MONOCHORIONIC DIAMNIOTIC TWIN PLACENTA, confirmed;\n- DISCORDANT VILLOUS MATURATION, twin II territory less mature\./);
});

test('placenta dividing membrane (Card 3): detached amnion compatible vs consistent with T-zone, by-twin checklist, triplet & checks', () => {
  const { c: detachedNoTz, out: out1 } = runOne({
    plurality: 'Twin',
    membraneLayers: 'Chorion with one amnion, the other detached',
    tZoneBlock: false,
    membraneSampled: 'Roll'
  });
  assert.match(out1.microscopy, /compatible with a dichorionic diamniotic twin placenta/);
  assert.match(out1.diagnosis, /- Compatible with DICHORIONIC DIAMNIOTIC TWIN PLACENTA\./);
  const w1 = placenta.validate(detachedNoTz.parts[0], { case: detachedNoTz });
  assert.ok(w1.some((x) => x.level === 'warn' && /detached/i.test(x.message)));

  const { out: out2 } = runOne({
    plurality: 'Twin',
    membraneLayers: 'Chorion with one amnion, the other detached',
    tZoneBlock: true,
    membraneSampled: 'Roll and T-zone',
    tZoneFinding: 'Chorionic layers fused with the chorionic plate'
  });
  assert.match(out2.microscopy, /consistent with a dichorionic diamniotic twin placenta/);
  assert.match(out2.diagnosis, /- DICHORIONIC DIAMNIOTIC TWIN PLACENTA\./);

  const { out: out3 } = runOne({
    plurality: 'Twin',
    microStyle: 'Checklist',
    microLayout: 'By twin',
    findingTwin: 'Twin II',
    chorioamnionitis: 'Stage 2 - acute chorioamnionitis'
  });
  assert.match(out3.microscopy, /Twin I:\n- Villitis:  Absent\n- Chorioamnionitis:  Absent/);
  assert.match(out3.microscopy, /Twin II:\n- Villitis:  Absent\n- Chorioamnionitis:  Present, acute chorioamnionitis/);
  assert.match(out3.microscopy, /Dividing membrane:/);

  const { out: out4 } = runOne({
    plurality: 'Triplet',
    tripletMembrane12: 'Monochorionic (no chorion)',
    tripletMembrane23: 'Dichorionic (chorion present)',
    tripletMembrane13: 'Dichorionic (chorion present)'
  });
  assert.match(out4.diagnosis, /DICHORIONIC TRIAMNIOTIC TRIPLET PLACENTA/);
  assert.match(out4.blockKey, /\(13\) Dividing membrane I\/II\./);

  const { c: badTriplet } = runOne({
    plurality: 'Triplet',
    tripletMembrane12: 'Monochorionic (no chorion)',
    tripletMembrane23: 'Monochorionic (no chorion)',
    tripletMembrane13: 'Dichorionic (chorion present)'
  });
  const wTriplet = placenta.validate(badTriplet.parts[0], { case: badTriplet });
  assert.ok(wTriplet.some((x) => x.level === 'warn' && /Impossible triplet/i.test(x.message)));
});
