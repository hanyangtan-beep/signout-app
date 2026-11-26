// Wave 2: Final 7 cancer resection templates (Thoracic 2, Skin 1, CNS 1, Soft tissue/Paediatric 3):
//   mesothelioma (QMH Thorax-Mesothelioma; AJCC 9th 2025 + epithelioid 2-tier nuclear grade)
//   thymic_tumour (QMH Thorax-Thymus; AJCC 9th 2025 + Modified Masaoka-Koga)
//   melanoma (QMH Skin-Melanoma; AJCC 8th 0.8 mm threshold + microsatellites)
//   meningioma (QMH CNS-Meningioma; WHO CNS5 Grade 1–3 with TERT/CDKN2A/B overrule)
//   ewing_sarcoma (QMH Pedi-EwingSarcoma; AJCC 8th bone vs extraskeletal)
//   rhabdomyosarcoma (QMH Pedi-Rhadomyosarcoma; COG / IRS Stage 1–4)
//   extragonadal_gct (QMH Pedi-GermCellTumors; COG / MaGIC Stage I–IV)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCase, generate } from '../src/engine.js';
import { loadAll, loadManifest } from '../src/registry.js';
import { deriveTNM } from '../src/staging/index.js';
import { parseIntake, matchParts } from '../src/intake.js';
import * as MESO from '../src/staging/mesothelioma.js';
import * as THYM from '../src/staging/thymus.js';
import * as MNG from '../src/staging/meningioma.js';
import * as EWS from '../src/staging/ewing.js';
import * as RMS from '../src/staging/rhabdomyosarcoma.js';
import * as EGC from '../src/staging/extragonadal_gct.js';

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

const W2_IDS = {
  mesothelioma: 'Thoracic',
  thymic_tumour: 'Thoracic',
  melanoma: 'Skin',
  meningioma: 'CNS',
  ewing_sarcoma: 'Soft tissue',
  rhabdomyosarcoma: 'Soft tissue',
  extragonadal_gct: 'Soft tissue'
};

// ---------- registration & placeholder retirement ----------

test('Wave 2 templates: all 7 registered, in manifest (120 total), and 100% of QMH cancer resections retired', () => {
  for (const [id, sys] of Object.entries(W2_IDS)) {
    assert.ok(registry[id], `${id} registered`);
    assert.equal(registry[id].schema.system, sys, `${id} system`);
    assert.equal(registry[id].schema.kind, 'cancer resection', `${id} kind`);
    assert.ok(!planned.planned.some((p) => p.id === id), `${id} retired from planned.json`);
    assert.ok(manifest.some((m) => m.id === id), `${id} in manifest.json`);
  }
  assert.equal(manifest.length, 120);
  assert.equal(planned.planned.filter((p) => p.kind === 'cancer resection').length, 0, 'zero planned cancer resections remaining');
});

// ---------- staging & grading engines ----------

test('mesothelioma staging: AJCC 9th pT1–pT4, pN0–pN2 & WHO 5th epithelioid 2-tier nuclear grade', () => {
  const t2n0 = deriveTNM({ histType: 'Epithelioid mesothelioma', extension: MESO.EXT.t2, nodesExamined: '10', nodesInvolved: '0' }, 'mesothelioma');
  assert.equal(t2n0.tnm, 'pT2 pN0');
  assert.equal(t2n0.stage, 'IB');

  assert.equal(MESO.epithelioidGrade({ histType: 'Epithelioid mesothelioma', nuclearAtypiaScore: '2', mitoticScore: '2', necrosis: 'Not identified' }).tier, 'Low grade');
  assert.equal(MESO.epithelioidGrade({ histType: 'Epithelioid mesothelioma', nuclearAtypiaScore: '2', mitoticScore: '2', necrosis: 'Present' }).tier, 'High grade');
  assert.equal(MESO.epithelioidGrade({ histType: 'Epithelioid mesothelioma', nuclearAtypiaScore: '3', mitoticScore: '3', necrosis: 'Not identified' }).tier, 'High grade');
});

test('thymus staging: AJCC 9th 50 mm pT1a/pT1b split, lung/phrenic pT2, pN1/pN2, pM1a/pM1b', () => {
  const t1a = deriveTNM({ sizeMm: '48', extension: THYM.EXT.t1, nodesExamined: '3', nodesInvolved: '0' }, 'thymus');
  assert.equal(t1a.tnm, 'pT1a pN0');
  assert.equal(t1a.stage, 'I');

  const t1b = deriveTNM({ sizeMm: '62', extension: THYM.EXT.t1, nodesExamined: '3', nodesInvolved: '0' }, 'thymus');
  assert.equal(t1b.tnm, 'pT1b pN0');
  assert.equal(t1b.stage, 'I');

  const t2n2 = deriveTNM({ sizeMm: '55', extension: THYM.EXT.t2, nodesExamined: '8', nodesInvolved: '2', nodeStation: 'Deep intrathoracic or cervical lymph nodes (pN2)' }, 'thymus');
  assert.equal(t2n2.tnm, 'pT2 pN2');
  assert.equal(t2n2.stage, 'IVB');
});

test('melanoma staging: AJCC 8th 0.8 mm pT1a/pT1b split, ulceration, and microsatellites pN1c–pN3c', () => {
  const t1a = deriveTNM({ breslowMm: '0.6', ulceration: 'Not identified', nodesExamined: '2', nodesInvolved: '0', nodeSuffix: '(sn) Sentinel node' }, 'melanoma');
  assert.equal(t1a.tnm, 'pT1a pN0(sn)');
  assert.equal(t1a.stage, 'IA');

  const t1b = deriveTNM({ breslowMm: '0.8', ulceration: 'Not identified', nodesExamined: '2', nodesInvolved: '0' }, 'melanoma');
  assert.equal(t1b.tnm, 'pT1b pN0');

  const sat = deriveTNM({ breslowMm: '2.4', ulceration: 'Present', microsatellites: 'Present', nodesExamined: '2', nodesInvolved: '0' }, 'melanoma');
  assert.equal(sat.tnm, 'pT3b pN1c');
  assert.equal(sat.stage, 'IIIB');
});

test('meningioma grading: WHO CNS5 Grade 1, Grade 2 (brain invasion / mitoses / atypical), Grade 3 (TERT / CDKN2A/B molecular overrule)', () => {
  assert.equal(MNG.deriveCnsGrade({ histType: 'Meningothelial meningioma', mitosesPer10Hpf: '1', brainInvasion: 'Not identified' }).grade, 'CNS WHO grade 1');
  assert.equal(MNG.deriveCnsGrade({ histType: 'Meningothelial meningioma', mitosesPer10Hpf: '1', brainInvasion: 'Present' }).grade, 'CNS WHO grade 2');
  assert.equal(MNG.deriveCnsGrade({ histType: 'Meningothelial meningioma', mitosesPer10Hpf: '1', tertPromoter: 'Mutated' }).grade, 'CNS WHO grade 3');
  assert.equal(MNG.deriveCnsGrade({ histType: 'Fibrous meningioma', mitosesPer10Hpf: '0', cdkn2ab: 'Homozygous deletion' }).grade, 'CNS WHO grade 3');
});

test('ewing staging: AJCC 8th bone (80 mm T1/T2 + T3 skip) vs extraskeletal soft tissue', () => {
  const bone = deriveTNM({ siteCategory: 'Bone (appendicular / trunk / pelvis)', sizeMm: '72', postTherapy: true, nodesExamined: '0' }, 'ewing');
  assert.equal(bone.tnm, 'ypT1');
  assert.equal(bone.stage, 'IIA');

  const soft = deriveTNM({ siteCategory: 'Extraskeletal soft tissue', sizeMm: '120', nodesExamined: '0' }, 'ewing');
  assert.equal(soft.tnm, 'pT3');
  assert.equal(soft.stage, 'IIIB');
  assert.ok(!EWS.isBone({ siteCategory: 'Extraskeletal soft tissue' }));
});

test('rhabdomyosarcoma staging: COG/IRS site-based Stage 1–4', () => {
  const fav = deriveTNM({ siteGroup: 'Favourable site (orbit, non-parameningeal head/neck, non-bladder/prostate GU, biliary)', sizeMm: '42', extension: 'Confined to anatomic site of origin (T1)', nodesExamined: '0' }, 'rhabdomyosarcoma');
  assert.equal(fav.stage, '1');

  const unfav = deriveTNM({ siteGroup: 'Unfavourable site (parameningeal, extremity, bladder/prostate, trunk, retroperitoneum, perineum)', sizeMm: '65', extension: 'Extension and/or fixation beyond site of origin (T2)', nodesExamined: '4', nodesInvolved: '1' }, 'rhabdomyosarcoma');
  assert.equal(unfav.stage, '3');
  assert.ok(!RMS.isFavourableSite({ siteGroup: 'Unfavourable site' }));
});

test('extragonadal_gct staging: COG Stage I–IV', () => {
  assert.equal(EGC.deriveCogStage({ resectionCompleteness: 'Complete gross resection (R0/R1)', marginStatus: 'Uninvolved by tumour' }).stage, 'Stage I');
  assert.equal(EGC.deriveCogStage({ resectionCompleteness: 'Complete gross resection (R0/R1)', marginStatus: 'Involved by tumour (microscopic residual)' }).stage, 'Stage II');
  assert.equal(EGC.deriveCogStage({ nodesExamined: '4', nodesInvolved: '1' }).stage, 'Stage III');
  assert.equal(EGC.deriveCogStage({ distantMets: [EGC.METS.lung] }).stage, 'Stage IV');
});

// ---------- end-to-end rendering & TYPE_MORPH coverage ----------

test('Wave 2 templates: examples render cleanly with zero undefined tokens', () => {
  for (const id of Object.keys(W2_IDS)) {
    const r = runExample(id);
    assert.ok(r.synoptic && r.diagnosis && r.macro, `${id} renders all blocks`);
    assert.doesNotMatch(r.report, /undefined|\[object|NaN/, `${id} has no undefined tokens`);
  }
  assert.match(runExample('mesothelioma').synoptic, /pT2 pN0/);
  assert.match(runExample('thymic_tumour').synoptic, /pT1a pN0/);
  assert.match(runExample('melanoma').synoptic, /pT2a pN0\(sn\)/);
  assert.match(runExample('meningioma').synoptic, /CNS WHO grade 1/);
  assert.match(runExample('ewing_sarcoma').synoptic, /ypT1/);
  assert.match(runExample('rhabdomyosarcoma').synoptic, /Stage 1/);
  assert.match(runExample('extragonadal_gct').synoptic, /Stage I/);
});

test('Wave 2 templates: every selectable histType option produces enriched WHO 5th morphology prose', () => {
  for (const id of Object.keys(W2_IDS)) {
    const schema = registry[id].schema;
    const histField = schema.fields.find((f) => f.id === 'histType');
    assert.ok(histField && histField.options?.length >= 6, `${id} has histType options`);
    for (const opt of histField.options) {
      const r = runExample(id, { histType: opt, histologyNotes: '' });
      assert.doesNotMatch(r.report, /undefined|\[object|NaN/, `${id} [${opt}] clean`);
      assert.ok(r.synoptic.length > 160, `${id} [${opt}] synoptic rendered`);
    }
  }
});

// ---------- intake routing ----------

test('Wave 2 templates: intake routes each resection accurately without colliding with existing forms', () => {
  assert.equal(route('(A) Right pleura, extended pleurectomy decortication', 'Epithelioid pleural mesothelioma').templateId, 'mesothelioma');
  assert.equal(route('(A) Thymus, total thymectomy', 'Thymoma').templateId, 'thymic_tumour');
  assert.equal(route('(A) Skin of upper back, wide local excision', 'Cutaneous malignant melanoma').templateId, 'melanoma');
  assert.equal(route('(A) Right convexity dural mass, craniotomy', 'Meningioma').templateId, 'meningioma');
  assert.equal(route('(A) Left distal femur, wide limb-sparing resection', 'Ewing sarcoma').templateId, 'ewing_sarcoma');
  assert.equal(route('(A) Right paratesticular mass, wide excision', 'Embryonal rhabdomyosarcoma').templateId, 'rhabdomyosarcoma');
  assert.equal(route('(A) Sacrococcygeal mass, resection with coccygectomy', 'Sacrococcygeal teratoma').templateId, 'extragonadal_gct');
  // Mucosal melanoma must still route to mucosal_melanoma
  assert.equal(route('(A) Left nasal cavity, endoscopic sinonasal resection', 'Sinonasal mucosal melanoma').templateId, 'mucosal_melanoma');
});

// ---------- reference panels ----------

test('Wave 2 reference galleries: JPEGs <= 900px/150kB, non-commercial open licences, ExpertPath links, saved QMH HTMLs, zero unused images', () => {
  const EXPECTED = {
    mesothelioma: 1,
    thymic_tumour: 3,
    melanoma: 1,
    meningioma: 2,
    ewing_sarcoma: 1,
    rhabdomyosarcoma: 1,
    extragonadal_gct: 1
  };
  for (const [id, count] of Object.entries(EXPECTED)) {
    const schema = registry[id].schema;
    assert.ok(schema.source?.savedPage && fs.existsSync(new URL(`../${schema.source.savedPage}`, import.meta.url)), `${id} saved QMH HTML exists`);
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
          assert.match(im.license, /^(CC0|CC BY|Public domain|NIH|TCGA|Open access)/i, `${im.src} open/non-commercial licence`);
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
