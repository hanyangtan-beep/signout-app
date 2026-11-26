// Remaining Head & Neck cancer resection templates & galleries:
//   nasopharyngeal_carcinoma (QMH HN-Nasopharynx; AJCC 9th)
//   hypopharynx_oropharynx_carcinoma (QMH HN-Hypopharynx; AJCC 8th)
//   larynx_carcinoma (QMH HN-Larynx; AJCC 8th tri-subsite)
//   sinonasal_carcinoma (QMH HN-Nasal cavity and Nasal sinuses; AJCC 8th dual-track)
//   salivary_carcinoma (QMH HN-Salivary gland; AJCC 9th)
//   mucosal_melanoma (QMH HN-Mucosal Melanoma; AJCC 8th pT3–pT4b)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCase, generate } from '../src/engine.js';
import { loadAll, loadManifest } from '../src/registry.js';
import { deriveTNM } from '../src/staging/index.js';
import { parseIntake, matchParts } from '../src/intake.js';
import * as NPC from '../src/staging/nasopharynx.js';
import * as HYPO from '../src/staging/hypopharynx_oropharynx.js';
import * as LARYNX from '../src/staging/larynx.js';
import * as SINO from '../src/staging/sinonasal.js';
import * as SAL from '../src/staging/salivary.js';
import * as MM from '../src/staging/mucosal_melanoma.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const registry = await loadAll();
const manifest = await loadManifest();
const planned = JSON.parse(fs.readFileSync(new URL('../templates/planned.json', import.meta.url), 'utf8'));
const route = (line, history = '') => matchParts(parseIntake(line), history, manifest)[0];

const jpegSize = (buf) => {
  for (let i = 2; i < buf.length - 8;) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1];
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
};

const runExample = (id, over = {}) => {
  const t = registry[id];
  const c = createCase(t.schema, 1);
  c.options = { ...c.options, ...t.schema.example.options };
  c.parts[0].values = { ...c.parts[0].values, ...t.schema.example.parts[0].values, ...over };
  return generate(t.schema, t.generator, c);
};

const HN_IDS = [
  'nasopharyngeal_carcinoma',
  'hypopharynx_oropharynx_carcinoma',
  'larynx_carcinoma',
  'sinonasal_carcinoma',
  'salivary_carcinoma',
  'mucosal_melanoma'
];

// ---------- registration & placeholder retirement ----------

test('Head & Neck templates: all 6 registered, in manifest (106 total), and retired from planned.json', () => {
  for (const id of HN_IDS) {
    assert.ok(registry[id], `${id} registered`);
    assert.equal(registry[id].schema.system, 'Head and neck', `${id} system`);
    assert.equal(registry[id].schema.kind, 'cancer resection', `${id} kind`);
    assert.ok(!planned.planned.some((p) => p.id === id), `${id} retired from planned.json`);
    assert.ok(manifest.some((m) => m.id === id), `${id} in manifest.json`);
  }
  assert.equal(manifest.length, 106);
});

// ---------- staging engines ----------

test('nasopharynx staging: AJCC 9th pT1–pT4, pN0–pN3 (advanced ENE / below cricoid), pM1', () => {
  const t1n0 = deriveTNM({ extension: NPC.EXT.t1, nodesExamined: '10', nodesInvolved: '0' }, 'nasopharynx');
  assert.equal(t1n0.tnm, 'pT1 pN0');
  assert.equal(t1n0.stage, 'IA');

  const t2n1 = deriveTNM({ extension: NPC.EXT.t2, nodesExamined: '12', nodesInvolved: '1', nodeLaterality: 'Unilateral cervical', largestNodeMm: '35' }, 'nasopharynx');
  assert.equal(t2n1.tnm, 'pT2 pN1');
  assert.equal(t2n1.stage, 'IB');

  const t3n3 = deriveTNM({ extension: NPC.EXT.t3, nodesExamined: '15', nodesInvolved: '3', nodeLaterality: 'Bilateral cervical', largestNodeMm: '40', advancedEne: true }, 'nasopharynx');
  assert.equal(t3n3.tnm, 'pT3 pN3');
  assert.equal(t3n3.stage, 'III');

  const m1 = deriveTNM({ extension: NPC.EXT.t2, distantMets: [NPC.METS.lung] }, 'nasopharynx');
  assert.equal(m1.tnm, 'pT2 pM1');
  assert.equal(m1.stage, 'IV');
});

test('hypopharynx_oropharynx staging: AJCC 8th pT1–pT4b and ENE-integrated pN0–pN3b', () => {
  const t2n1 = deriveTNM({ sizeMm: '28', extension: HYPO.EXT.none, nodesExamined: '20', nodesInvolved: '1', largestNodeMm: '24', nodeLaterality: 'Ipsilateral (including midline)', ene: 'Not identified' }, 'hypopharynx_oropharynx');
  assert.equal(t2n1.tnm, 'pT2 pN1');
  assert.equal(t2n1.stage, 'III');

  const t3n3b = deriveTNM({ sizeMm: '45', extension: HYPO.EXT.none, nodesExamined: '20', nodesInvolved: '2', largestNodeMm: '35', nodeLaterality: 'Ipsilateral (including midline)', ene: 'Present, major (> 2 mm)' }, 'hypopharynx_oropharynx');
  assert.equal(t3n3b.tnm, 'pT3 pN3b');
  assert.equal(t3n3b.stage, 'IVB');

  const singleEne = deriveTNM({ sizeMm: '18', extension: HYPO.EXT.none, nodesExamined: '12', nodesInvolved: '1', largestNodeMm: '22', nodeLaterality: 'Ipsilateral (including midline)', ene: 'Present, minor (<= 2 mm)' }, 'hypopharynx_oropharynx');
  assert.equal(singleEne.tnm, 'pT1 pN2a');
  assert.equal(singleEne.stage, 'IVA');
});

test('larynx staging: AJCC 8th tri-subsite (glottis pT1a/pT1b, supraglottis, subglottis)', () => {
  const t1a = deriveTNM({ subsite: 'Glottis', extension: LARYNX.EXT.t1a, nodesExamined: '0' }, 'larynx');
  assert.equal(t1a.tnm, 'pT1a');
  assert.match(t1a.edition, /Glottis/);

  const t3n0 = deriveTNM({ subsite: 'Glottis', extension: LARYNX.EXT.t3, nodesExamined: '18', nodesInvolved: '0' }, 'larynx');
  assert.equal(t3n0.tnm, 'pT3 pN0');
  assert.equal(t3n0.stage, 'III');

  const t4a = deriveTNM({ subsite: 'Supraglottis', extension: LARYNX.EXT.t4a, nodesExamined: '24', nodesInvolved: '2', largestNodeMm: '28', nodeLaterality: 'Ipsilateral (including midline)', ene: 'Not identified' }, 'larynx');
  assert.equal(t4a.tnm, 'pT4a pN2b');
  assert.equal(t4a.stage, 'IVA');
});

test('sinonasal staging: AJCC 8th dual-track (maxillary sinus vs nasal cavity/ethmoid)', () => {
  const maxT3 = deriveTNM({ site: 'Paranasal sinus(es), maxillary', extension: SINO.EXT.t3, nodesExamined: '0' }, 'sinonasal');
  assert.equal(maxT3.tnm, 'pT3');
  assert.match(maxT3.edition, /Maxillary sinus/);

  const ethT4b = deriveTNM({ site: 'Paranasal sinus(es), ethmoid', extension: SINO.EXT.t4b, nodesExamined: '10', nodesInvolved: '0' }, 'sinonasal');
  assert.equal(ethT4b.tnm, 'pT4b pN0');
  assert.equal(ethT4b.stage, 'IVB');
  assert.match(ethT4b.edition, /Nasal cavity and ethmoid/);
});

test('salivary staging: AJCC 9th pTis (intracapsular Ca ex PA), pT1–pT4b, pN1 (1–3 no ENE) vs pN2 (>3 or ENE)', () => {
  const tis = deriveTNM({ histType: 'Carcinoma ex pleomorphic adenoma, intracapsular (non-invasive)', sizeMm: '25', extension: SAL.EXT.none, nodesExamined: '4', nodesInvolved: '0' }, 'salivary');
  assert.equal(tis.tnm, 'pTis pN0');
  assert.equal(tis.stage, '0');

  const t2n1 = deriveTNM({ histType: 'Mucoepidermoid carcinoma', sizeMm: '26', extension: SAL.EXT.none, nodesExamined: '10', nodesInvolved: '2', ene: 'Not identified' }, 'salivary');
  assert.equal(t2n1.tnm, 'pT2 pN1');
  assert.equal(t2n1.stage, 'III');

  const t2n2Ene = deriveTNM({ histType: 'Salivary duct carcinoma', sizeMm: '26', extension: SAL.EXT.none, nodesExamined: '10', nodesInvolved: '1', ene: 'Present, minor (<= 2 mm)' }, 'salivary');
  assert.equal(t2n2Ene.tnm, 'pT2 pN2');
  assert.equal(t2n2Ene.stage, 'IVA');

  const t3n2Cnt = deriveTNM({ histType: 'Adenoid cystic carcinoma, solid pattern', sizeMm: '45', extension: SAL.EXT.none, nodesExamined: '14', nodesInvolved: '4', ene: 'Not identified' }, 'salivary');
  assert.equal(t3n2Cnt.tnm, 'pT3 pN2');
  assert.equal(t3n2Cnt.stage, 'IVA');
});

test('mucosal_melanoma staging: AJCC 8th pT3–pT4b, pN0/pN1 with (sn)/(f) suffix, pM1', () => {
  const t3n0 = deriveTNM({ extension: [MM.EXT.t3], nodesExamined: '5', nodesInvolved: '0' }, 'mucosal_melanoma');
  assert.equal(t3n0.tnm, 'pT3 pN0');
  assert.equal(t3n0.stage, 'III');

  const t4an1sn = deriveTNM({ extension: [MM.EXT.t4a], nodesExamined: '2', nodesInvolved: '1', nodeSuffix: '(sn) Sentinel node' }, 'mucosal_melanoma');
  assert.equal(t4an1sn.tnm, 'pT4a pN1(sn)');
  assert.equal(t4an1sn.stage, 'IVA');

  const t4bm1 = deriveTNM({ extension: [MM.EXT.t4b], distantMets: [MM.METS.lung] }, 'mucosal_melanoma');
  assert.equal(t4bm1.tnm, 'pT4b pM1');
  assert.equal(t4bm1.stage, 'IVC');
});

// ---------- end-to-end rendering & TYPE_MORPH coverage ----------

test('Head & Neck templates: examples render cleanly with expected pTNM and zero undefined tokens', () => {
  for (const id of HN_IDS) {
    const r = runExample(id);
    assert.ok(r.synoptic && r.diagnosis && r.macro, `${id} renders all blocks`);
    assert.doesNotMatch(r.report, /undefined|\[object|NaN/, `${id} has no undefined tokens`);
  }
  assert.match(runExample('nasopharyngeal_carcinoma').synoptic, /rpT1/);
  assert.match(runExample('hypopharynx_oropharynx_carcinoma').synoptic, /pT2 pN1/);
  assert.match(runExample('larynx_carcinoma').synoptic, /pT3 pN0/);
  assert.match(runExample('sinonasal_carcinoma').synoptic, /pT3/);
  assert.match(runExample('salivary_carcinoma').synoptic, /pT2 pN0/);
  assert.match(runExample('mucosal_melanoma').synoptic, /pT3/);
});

test('Head & Neck templates: every selectable histType option produces enriched WHO 5th morphology prose', () => {
  for (const id of HN_IDS) {
    const schema = registry[id].schema;
    const histField = schema.fields.find((f) => f.id === 'histType');
    assert.ok(histField && histField.options?.length >= 5, `${id} has histType options`);
    for (const opt of histField.options) {
      const r = runExample(id, { histType: opt, histologyNotes: '' });
      assert.doesNotMatch(r.report, /undefined|\[object|NaN/, `${id} [${opt}] clean`);
      assert.ok(r.synoptic.length > 200, `${id} [${opt}] synoptic rendered`);
    }
  }
});

// ---------- intake routing (no collision with biopsies or benign resections) ----------

test('Head & Neck templates: intake routes each resection accurately without colliding with biopsies or benign forms', () => {
  assert.equal(route('(A) Nasopharynx, nasopharyngectomy', 'Recurrent nasopharyngeal carcinoma').templateId, 'nasopharyngeal_carcinoma');
  assert.equal(route('(A) Hypopharynx and larynx, total pharyngolaryngectomy', 'Hypopharyngeal squamous cell carcinoma').templateId, 'hypopharynx_oropharynx_carcinoma');
  assert.equal(route('(A) Larynx, total laryngectomy', 'Glottic squamous cell carcinoma').templateId, 'larynx_carcinoma');
  assert.equal(route('(A) Right maxillary sinus, partial maxillectomy', 'Sinonasal squamous cell carcinoma').templateId, 'sinonasal_carcinoma');
  assert.equal(route('(A) Right parotid gland, superficial parotidectomy', 'Mucoepidermoid carcinoma').templateId, 'salivary_carcinoma');
  assert.equal(route('(A) Left nasal cavity, endoscopic sinonasal resection', 'Sinonasal mucosal melanoma').templateId, 'mucosal_melanoma');
  // Biopsies and benign salivary/sinonasal specimens must NOT be stolen
  assert.equal(route('(A) Nasopharynx, biopsy', 'Rule out NPC').templateId, 'nasopharyngeal_biopsy');
});

// ---------- reference galleries ----------

test('Head & Neck galleries: open-licence JPEGs <= 900px/150kB, ExpertPath links, zero unused images', () => {
  const EXPECTED = {
    nasopharyngeal_carcinoma: { folder: 'assets/reference/nasopharyngeal_carcinoma', files: 2 },
    hypopharynx_oropharynx_carcinoma: { folder: 'assets/reference/hypopharynx_oropharynx_carcinoma', files: 2 },
    larynx_carcinoma: { folder: 'assets/reference/larynx_carcinoma', files: 2 },
    sinonasal_carcinoma: { folder: null, files: 0 },
    salivary_carcinoma: { folder: 'assets/reference/salivary_carcinoma', files: 1 },
    mucosal_melanoma: { folder: 'assets/reference/mucosal_melanoma', files: 1 }
  };

  for (const [id, spec] of Object.entries(EXPECTED)) {
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
          assert.match(im.license, /^CC(0| BY| BY-SA)/, `${im.src} open licence`);
          assert.doesNotMatch(im.license, /\b(NC|ND)\b/, `${im.src} no NC/ND`);
          assert.match(im.url, /^https:\/\//, `${im.src} https URL`);
          const buf = fs.readFileSync(path.join(root, im.src));
          const sz = jpegSize(buf);
          assert.ok(buf.length <= 150 * 1024 && sz && sz.w <= 900 && sz.h <= 900, `${im.src} <= 900px and <= 150 kB`);
        }
      }
    }
    if (spec.folder) {
      const folderFiles = fs.readdirSync(path.join(root, spec.folder)).map((n) => `${spec.folder}/${n}`);
      assert.equal(folderFiles.length, spec.files, `${id} file count`);
      assert.deepEqual(folderFiles.filter((s) => !used.has(s)), [], `${id} has no unused images`);
    }
  }
});
