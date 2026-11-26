// Wave 1: Endocrine/Paediatric (3) & GU (4) cancer resection templates:
//   adrenal_cortical_carcinoma (QMH Endocrine-Adrenal; AJCC 8th / ENSAT)
//   pheochromocytoma (QMH Endocrine-Pheochromocytoma; AJCC 8th Ch. 77)
//   neuroblastoma (QMH Pedi-Neuroblastoma; INPC Shimada + INRGSS)
//   urethral_carcinoma (QMH UG-Urethra; AJCC 8th dual-track)
//   penile_carcinoma (QMH UG-Penis; AJCC 8th pT1a/pT1b auto-upgrade)
//   testis_tumour (QMH UG-Testis; AJCC 8th Ch. 59 + S0–S3)
//   wilms_tumour (QMH Pedi-Wilms; COG / SIOP Stage I–V)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCase, generate } from '../src/engine.js';
import { loadAll, loadManifest } from '../src/registry.js';
import { deriveTNM } from '../src/staging/index.js';
import { parseIntake, matchParts } from '../src/intake.js';
import * as ADR from '../src/staging/adrenal.js';
import * as PHAEO from '../src/staging/pheochromocytoma.js';
import * as NBL from '../src/staging/neuroblastoma.js';
import * as URE from '../src/staging/urethra.js';
import * as PEN from '../src/staging/penis.js';
import * as TES from '../src/staging/testis.js';
import * as WILMS from '../src/staging/wilms.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const registry = await loadAll();
const jpegSize = (buf) => {
  for (let i = 2; i < buf.length - 8;) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1];
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
};
const manifest = await loadManifest();
const planned = JSON.parse(fs.readFileSync(new URL('../templates/planned.json', import.meta.url), 'utf8'));
const route = (line, history = '') => matchParts(parseIntake(line), history, manifest)[0];

const runExample = (id, over = {}) => {
  const t = registry[id];
  const c = createCase(t.schema, 1);
  c.options = { ...c.options, ...t.schema.example.options };
  c.parts[0].values = { ...c.parts[0].values, ...t.schema.example.parts[0].values, ...over };
  return generate(t.schema, t.generator, c);
};

const W1_IDS = {
  adrenal_cortical_carcinoma: 'Endocrine',
  pheochromocytoma: 'Endocrine',
  neuroblastoma: 'Endocrine',
  urethral_carcinoma: 'GU',
  penile_carcinoma: 'GU',
  testis_tumour: 'GU',
  wilms_tumour: 'GU'
};

// ---------- registration & placeholder retirement ----------

test('Wave 1 templates: all 7 registered, in manifest (113 total), and retired from planned.json', () => {
  for (const [id, sys] of Object.entries(W1_IDS)) {
    assert.ok(registry[id], `${id} registered`);
    assert.equal(registry[id].schema.system, sys, `${id} system`);
    assert.equal(registry[id].schema.kind, 'cancer resection', `${id} kind`);
    assert.ok(!planned.planned.some((p) => p.id === id), `${id} retired from planned.json`);
    assert.ok(manifest.some((m) => m.id === id), `${id} in manifest.json`);
  }
  assert.ok(manifest.length >= 113);
});

// ---------- staging engines ----------

test('adrenal staging: AJCC 8th / ENSAT pT1–pT4, pN0/pN1, pM1', () => {
  const t1 = deriveTNM({ sizeMm: '45', extension: ADR.EXT.confined, nodesExamined: '4', nodesInvolved: '0' }, 'adrenal');
  assert.equal(t1.tnm, 'pT1 pN0');
  assert.equal(t1.stage, 'I');

  const t2 = deriveTNM({ sizeMm: '82', extension: ADR.EXT.confined, nodesExamined: '0' }, 'adrenal');
  assert.equal(t2.tnm, 'pT2');

  const t4n1 = deriveTNM({ sizeMm: '110', extension: ADR.EXT.t4, nodesExamined: '6', nodesInvolved: '2' }, 'adrenal');
  assert.equal(t4n1.tnm, 'pT4 pN1');
  assert.equal(t4n1.stage, 'III');

  const m1 = deriveTNM({ sizeMm: '90', extension: ADR.EXT.t3, distantMets: [ADR.METS.liver] }, 'adrenal');
  assert.equal(m1.tnm, 'pT3 pM1');
  assert.equal(m1.stage, 'IV');
});

test('pheochromocytoma staging: AJCC 8th Ch. 77 pT1 (<50 mm), pT2 (>=50 mm or sympathetic PGL), pT3, pM1a–c', () => {
  const t1 = deriveTNM({ histType: 'Phaeochromocytoma (intra-adrenal paraganglioma)', sizeMm: '42', extension: PHAEO.EXT.none, nodesExamined: '0' }, 'pheochromocytoma');
  assert.equal(t1.tnm, 'pT1');

  const pgl = deriveTNM({ histType: 'Sympathetic paraganglioma (extra-adrenal)', sizeMm: '30', extension: PHAEO.EXT.none, nodesExamined: '4', nodesInvolved: '0' }, 'pheochromocytoma');
  assert.equal(pgl.tnm, 'pT2 pN0');
  assert.equal(pgl.stage, 'II');

  const m1c = deriveTNM({ histType: 'Phaeochromocytoma (intra-adrenal paraganglioma)', sizeMm: '65', extension: PHAEO.EXT.t3, distantMets: [PHAEO.METS.bone, PHAEO.METS.liver] }, 'pheochromocytoma');
  assert.equal(m1c.tnm, 'pT3 pM1c');
  assert.equal(m1c.stage, 'IV');
});

test('neuroblastoma staging: INPC (Shimada) age × MKI × differentiation & INRGSS', () => {
  assert.equal(NBL.inpcPrognostic({ histType: 'Neuroblastoma (Schwannian stroma-poor), poorly differentiated', ageMonths: '11', mki: 'Low (< 2% or < 100 / 5,000 cells)' }).group, 'Favourable histology');
  assert.equal(NBL.inpcPrognostic({ histType: 'Neuroblastoma (Schwannian stroma-poor), poorly differentiated', ageMonths: '24', mki: 'Low (< 2% or < 100 / 5,000 cells)' }).group, 'Unfavourable histology');
  assert.equal(NBL.inpcPrognostic({ histType: 'Neuroblastoma (Schwannian stroma-poor), differentiating', ageMonths: '36', mki: 'Low (< 2% or < 100 / 5,000 cells)' }).group, 'Favourable histology');
  assert.equal(NBL.inpcPrognostic({ histType: 'Neuroblastoma (Schwannian stroma-poor), differentiating', ageMonths: '65', mki: 'Low (< 2% or < 100 / 5,000 cells)' }).group, 'Unfavourable histology');
  assert.equal(NBL.inpcPrognostic({ histType: 'Ganglioneuroblastoma, intermixed (Schwannian stroma-rich)' }).group, 'Favourable histology');
  assert.equal(NBL.inrgStageCode({ inrgStage: NBL.INRGSS.l2 }), 'L2');
});

test('urethra staging: AJCC 8th dual-track (prostatic vs penile/female) & pN1/pN2', () => {
  const pen = deriveTNM({ site: 'Male, bulbomembranous urethra', extension: URE.EXT.t2, nodesExamined: '6', nodesInvolved: '0' }, 'urethra');
  assert.equal(pen.tnm, 'pT2 pN0');
  assert.equal(pen.stage, 'II');
  assert.match(pen.edition, /Male penile \/ female/);

  const pros = deriveTNM({ site: 'Male, prostatic urethra', extension: URE.EXT.t3, nodesExamined: '10', nodesInvolved: '2' }, 'urethra');
  assert.equal(pros.tnm, 'pT3 pN2');
  assert.equal(pros.stage, 'IV');
  assert.match(pros.edition, /Prostatic urethra/);
});

test('penis staging: AJCC 8th pT1a vs pT1b auto-upgrade on LVI/PNI/G3 and pN1–pN3', () => {
  const t1a = deriveTNM({ extension: PEN.EXT.t1, grade: 'G2: Moderately differentiated', lvi: 'Not identified', pni: 'Not identified', nodesExamined: '0' }, 'penis');
  assert.equal(t1a.tnm, 'pT1a');

  const t1b = deriveTNM({ extension: PEN.EXT.t1, grade: 'G2: Moderately differentiated', lvi: 'Not identified', pni: 'Present', nodesExamined: '8', nodesInvolved: '0' }, 'penis');
  assert.equal(t1b.tnm, 'pT1b pN0');
  assert.equal(t1b.stage, 'IIA');

  const n3 = deriveTNM({ extension: PEN.EXT.t3, nodesExamined: '12', nodesInvolved: '2', ene: 'Present' }, 'penis');
  assert.equal(n3.tnm, 'pT3 pN3');
  assert.equal(n3.stage, 'IV');
});

test('testis staging: AJCC 8th pure seminoma 30 mm pT1a/pT1b split, LVI -> pT2, pN1–pN3, S0–S3', () => {
  const semSmall = deriveTNM({ histType: 'Seminoma', sizeMm: '22', extension: TES.EXT.t1, lvi: 'Not identified', nodesExamined: '0' }, 'testis');
  assert.equal(semSmall.tnm, 'pT1a');

  const semLarge = deriveTNM({ histType: 'Seminoma', sizeMm: '36', extension: TES.EXT.t1, lvi: 'Not identified', nodesExamined: '0' }, 'testis');
  assert.equal(semLarge.tnm, 'pT1b');

  const embLvi = deriveTNM({ histType: 'Embryonal carcinoma', sizeMm: '22', extension: TES.EXT.t1, lvi: 'Present', nodesExamined: '18', nodesInvolved: '2', largestNodeMm: '28', serumMarkers: 'S2: LDH 1.5–10x ULN or hCG 5,000–50,000 mIU/mL or AFP 1,000–10,000 ng/mL' }, 'testis');
  assert.equal(embLvi.tnm, 'pT2 pN2');
  assert.equal(embLvi.stage, 'IIIB');
});

test('wilms staging: COG & SIOP Stage I–V with automatic Stage III upgrade on rupture/nodes/margins', () => {
  assert.equal(WILMS.deriveWilmsStage({ extension: WILMS.EXT.s1, capsuleRupture: 'Not identified', marginStatus: 'Uninvolved by tumour', nodesExamined: '7', nodesInvolved: '0' }).stage, 'Stage I');
  assert.equal(WILMS.deriveWilmsStage({ extension: WILMS.EXT.s1, capsuleRupture: 'Present', marginStatus: 'Uninvolved by tumour', nodesExamined: '7', nodesInvolved: '0' }).stage, 'Stage III');
  assert.equal(WILMS.deriveWilmsStage({ extension: WILMS.EXT.s2, distantMets: [WILMS.METS.lung] }).stage, 'Stage IV');
  assert.equal(WILMS.deriveWilmsStage({ bilateral: true, extension: WILMS.EXT.s1 }).stage, 'Stage V');
});

// ---------- end-to-end rendering & TYPE_MORPH coverage ----------

test('Wave 1 templates: examples render cleanly with zero undefined tokens', () => {
  for (const id of Object.keys(W1_IDS)) {
    const r = runExample(id);
    assert.ok(r.synoptic && r.diagnosis && r.macro, `${id} renders all blocks`);
    assert.doesNotMatch(r.report, /undefined|\[object|NaN/, `${id} has no undefined tokens`);
  }
  assert.match(runExample('adrenal_cortical_carcinoma').synoptic, /pT2/);
  assert.match(runExample('pheochromocytoma').synoptic, /pT1/);
  assert.match(runExample('neuroblastoma').synoptic, /Favourable histology/);
  assert.match(runExample('urethral_carcinoma').synoptic, /pT2 pN0/);
  assert.match(runExample('penile_carcinoma').synoptic, /pT2/);
  assert.match(runExample('testis_tumour').synoptic, /pT1b/);
  assert.match(runExample('wilms_tumour').synoptic, /Stage I/);
});

test('Wave 1 templates: every selectable histType option produces enriched WHO 5th morphology prose', () => {
  for (const id of Object.keys(W1_IDS)) {
    const schema = registry[id].schema;
    const histField = schema.fields.find((f) => f.id === 'histType');
    assert.ok(histField && histField.options?.length >= 6, `${id} has histType options`);
    for (const opt of histField.options) {
      const r = runExample(id, { histType: opt, histologyNotes: '' });
      assert.doesNotMatch(r.report, /undefined|\[object|NaN/, `${id} [${opt}] clean`);
      assert.ok(r.synoptic.length > 180, `${id} [${opt}] synoptic rendered`);
    }
  }
});

// ---------- intake routing ----------

test('Wave 1 templates: intake routes each resection accurately without colliding with existing forms', () => {
  assert.equal(route('(A) Left adrenal gland, total adrenalectomy', 'Adrenal cortical carcinoma').templateId, 'adrenal_cortical_carcinoma');
  assert.equal(route('(A) Right adrenal gland, total adrenalectomy', 'Phaeochromocytoma').templateId, 'pheochromocytoma');
  assert.equal(route('(A) Right adrenal mass, resection', 'Paediatric neuroblastoma').templateId, 'neuroblastoma');
  assert.equal(route('(A) Urethra, total urethrectomy', 'Urethral urothelial carcinoma').templateId, 'urethral_carcinoma');
  assert.equal(route('(A) Penis, partial penectomy', 'Penile squamous cell carcinoma').templateId, 'penile_carcinoma');
  assert.equal(route('(A) Right testis, radical orchidectomy', 'Testicular seminoma').templateId, 'testis_tumour');
  assert.equal(route('(A) Left kidney, radical nephrectomy', 'Wilms tumour').templateId, 'wilms_tumour');
  // Existing adult renal cell carcinoma must stay on kidney_carcinoma
  assert.equal(route('(A) Left kidney, radical nephrectomy', 'Clear cell renal cell carcinoma').templateId, 'kidney_carcinoma');
});

// ---------- reference panels ----------

test('Wave 1 reference galleries: open-licence JPEGs <= 900px/150kB, ExpertPath links, zero unused images', () => {
  const EXPECTED = {
    adrenal_cortical_carcinoma: 2,
    pheochromocytoma: 2,
    neuroblastoma: 1,
    urethral_carcinoma: 2,
    penile_carcinoma: 2,
    testis_tumour: 4,
    wilms_tumour: 2
  };
  for (const [id, count] of Object.entries(EXPECTED)) {
    const schema = registry[id].schema;
    const refs = schema.fields.filter((f) => f.reference);
    assert.ok(refs.length >= 1, `${id} has at least one reference panel`);
    const used = new Set();
    for (const f of refs) {
      assert.match(f.reference.note, /own ExpertPath login/, `${id}.${f.id} ExpertPath note`);
      for (const g of f.reference.groups) {
        assert.ok(g.points?.length, `${id}.${f.id}: ${g.heading} has points`);
        for (const l of g.links || []) {
          assert.ok(l.label.startsWith('ExpertPath: ') && l.url.startsWith('https://app.expertpath.com/'), `${id}: ${l.label}`);
        }
        for (const im of g.images || []) {
          used.add(im.src);
          assert.match(im.license, /^(CC0|CC BY|Public domain|NIH|TCGA|Open access)/i, `${im.src} open licence`);
          assert.match(im.url, /^https:\/\//, `${im.src} https URL`);
          const buf = fs.readFileSync(path.join(root, im.src));
          const sz = jpegSize(buf);
          assert.ok(buf.length <= 150 * 1024 && sz && sz.w <= 900 && sz.h <= 900, `${im.src} <= 900px and <= 150 kB`);
        }
      }
    }
    const folder = `assets/reference/${id}`;
    const folderFiles = fs.readdirSync(path.join(root, folder)).map((n) => `${folder}/${n}`);
    assert.equal(folderFiles.length, count, `${id} file count`);
    assert.deepEqual(folderFiles.filter((s) => !used.has(s)), [], `${id} has no unused images`);
  }
});
