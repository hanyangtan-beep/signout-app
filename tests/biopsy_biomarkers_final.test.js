// Final Stretch: 2 medical biopsies (renal_biopsy, endomyocardial_biopsy) + 9 QMH Biomarker templates
// + curated reference galleries across all 10 Biomarker templates (leaving only autopsy in planned.json).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCase, generate } from '../src/engine.js';
import { loadAll, loadManifest } from '../src/registry.js';
import { parseIntake, matchParts } from '../src/intake.js';

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
  if (t.schema.example.options) c.options = { ...c.options, ...t.schema.example.options };
  c.parts[0].values = { ...c.parts[0].values, ...t.schema.example.parts[0].values, ...over };
  return generate(t.schema, t.generator, c);
};

const NEW_BIOPSIES = {
  renal_biopsy: 'Renal',
  endomyocardial_biopsy: 'Cardiovascular'
};

const ALL_BIOMARKERS = [
  'breast_biomarkers',
  'gyn_biomarkers',
  'colon_her2',
  'stomach_biomarkers',
  'mmr_msi',
  'pdl1_ihc',
  'dna_pcr_tests',
  'rna_rtpcr_tests',
  'fish_tests',
  'ngs_tests'
];

// ---------- registration & placeholder retirement ----------

test('Final Stretch: all 11 new templates registered, manifest = 131, only autopsy left in planned.json', () => {
  for (const [id, sys] of Object.entries(NEW_BIOPSIES)) {
    assert.ok(registry[id], `${id} registered`);
    assert.equal(registry[id].schema.system, sys, `${id} system`);
    assert.equal(registry[id].schema.kind, 'biopsy', `${id} kind`);
    assert.ok(!planned.planned.some((p) => p.id === id), `${id} retired from planned.json`);
    assert.ok(manifest.some((m) => m.id === id), `${id} in manifest.json`);
  }
  for (const id of ALL_BIOMARKERS) {
    assert.ok(registry[id], `${id} registered`);
    assert.equal(registry[id].schema.system, 'Biomarkers', `${id} system`);
    assert.equal(registry[id].schema.kind, 'biomarker', `${id} kind`);
    assert.ok(!planned.planned.some((p) => p.id === id), `${id} retired from planned.json`);
    assert.ok(manifest.some((m) => m.id === id), `${id} in manifest.json`);
  }
  assert.ok(manifest.length >= 133, `expected >= 133 templates in manifest, got ${manifest.length}`);
  assert.deepEqual(planned.planned.map((p) => p.id), ['autopsy']);
});

// ---------- rendering & clinical safety alerts ----------

test('Final Stretch: all 11 new templates render cleanly with zero undefined tokens', () => {
  for (const id of Object.keys(NEW_BIOPSIES)) {
    const r = runExample(id);
    assert.ok(r.synoptic && r.diagnosis, `${id} renders synoptic and diagnosis`);
    assert.doesNotMatch(r.report, /undefined|\[object|NaN/, `${id} has no undefined tokens`);
  }
  for (const id of ALL_BIOMARKERS.slice(1)) {
    const r = runExample(id);
    assert.ok(r.molecular && r.diagnosis && r.microscopy === '', `${id} renders molecular and diagnosis without microscopy`);
    assert.doesNotMatch(r.report, /undefined|\[object|NaN/, `${id} has no undefined tokens`);
  }
});

test('Medical biopsies & biomarkers: clinical adequacy and reflex alerts fire accurately', () => {
  // Renal Banff allograft adequacy warning (< 10 glomeruli or < 2 arteries)
  const ren = runExample('renal_biopsy', { biopsyContext: 'Transplant / allograft kidney biopsy', glomTotal: '4', arteriesCount: '0' });
  assert.ok(ren.issues.some((w) => /Banff|glomeruli|arteries/i.test(w.message)), 'renal Banff adequacy warning fires');

  // Endomyocardial ISHLT < 3 fragments warning
  const emb = runExample('endomyocardial_biopsy', { biopsyContext: 'Cardiac allograft surveillance (ISHLT)', fragmentsMyocardium: '2' });
  assert.ok(emb.issues.some((w) => /ISHLT|3/i.test(w.message)), 'EMB ISHLT adequacy warning fires');

  // MMR dMMR MLH1 loss reflex note
  const mmr = runExample('mmr_msi', { mlh1: 'Loss of nuclear expression (internal control intact)', pms2: 'Loss of nuclear expression (internal control intact)' });
  assert.match(mmr.diagnosis, /Mismatch repair deficient|dMMR/i);
  assert.ok(mmr.issues.some((w) => /BRAF|methylation/i.test(w.message)), 'MMR MLH1 loss reflex note fires');

  // PD-L1 inadequacy warning
  const pdl = runExample('pdl1_ihc', { adequacy: 'Inadequate (< 100 viable tumour cells)' });
  assert.ok(pdl.issues.some((w) => /100 viable|unreliable/i.test(w.message)), 'PD-L1 inadequacy warning fires');
});

// ---------- intake routing ----------

test('Final Stretch: intake routes medical biopsies and molecular/IHC biomarkers accurately', () => {
  assert.equal(route('(A) Native left kidney, medical renal needle biopsy', 'Nephrotic syndrome, IgA nephropathy').templateId, 'renal_biopsy');
  assert.equal(route('(A) Right ventricular endomyocardial biopsy', 'Heart transplant rejection surveillance').templateId, 'endomyocardial_biopsy');
  assert.equal(route('(A) Colon adenocarcinoma, paraffin block for colon HER2 testing', 'Metastatic CRC').templateId, 'colon_her2');
  assert.equal(route('(A) Gastric biopsy for stomach biomarker panel (HER2, PD-L1, CLDN18.2)', 'Gastric adenocarcinoma').templateId, 'stomach_biomarkers');
  assert.equal(route('(A) Colorectal tumour block for MMR IHC panel', 'Lynch syndrome screening').templateId, 'mmr_msi');
  assert.equal(route('(A) Lung biopsy for PD-L1 22C3 IHC', 'NSCLC').templateId, 'pdl1_ihc');
  assert.equal(route('(A) Lung adenocarcinoma block for EGFR PCR', 'DNA PCR mutation testing').templateId, 'dna_pcr_tests');
  assert.equal(route('(A) Soft tissue sarcoma block for SS18-SSX RT-PCR', 'Synovial sarcoma').templateId, 'rna_rtpcr_tests');
  assert.equal(route('(A) Lung adenocarcinoma block for ALK FISH', 'Break-apart FISH').templateId, 'fish_tests');
  assert.equal(route('(A) NSCLC paraffin block for Oncomine NGS panel', 'Next-generation sequencing').templateId, 'ngs_tests');
});

// ---------- biomarker reference galleries ----------

test('Biomarker reference galleries: all 10 biomarkers have JPEGs <= 900px/150kB, open licences, ExpertPath links, zero unused files', () => {
  const EXPECTED_OWN = {
    breast_biomarkers: 3,
    gyn_biomarkers: 2,
    colon_her2: 2,
    stomach_biomarkers: 2, // + 1 reused npc_eber.jpg from nasopharyngeal_carcinoma
    mmr_msi: 2,
    pdl1_ihc: 1,
    dna_pcr_tests: 2,
    rna_rtpcr_tests: 1,
    fish_tests: 2,
    ngs_tests: 2
  };
  for (const [id, ownCount] of Object.entries(EXPECTED_OWN)) {
    const schema = registry[id].schema;
    const refs = schema.fields.filter((f) => f.reference);
    assert.ok(refs.length >= 1, `${id} has at least one reference panel`);
    const usedOwn = new Set();
    let totalImages = 0;
    for (const f of refs) {
      assert.match(f.reference.note, /own ExpertPath login/, `${id}.${f.id} ExpertPath note`);
      for (const g of f.reference.groups) {
        assert.ok(g.points?.length, `${id}.${f.id}: ${g.heading} has points`);
        for (const l of g.links || []) {
          assert.ok(l.label.startsWith('ExpertPath: ') && l.url.startsWith('https://app.expertpath.com/'), `${id}: ${l.label}`);
        }
        for (const im of g.images || []) {
          totalImages++;
          if (im.src.startsWith(`assets/reference/${id}/`)) usedOwn.add(im.src);
          assert.match(im.license, /^(CC0|CC BY|Public domain|NIH|TCGA|Open access)/i, `${im.src} open licence`);
          assert.match(im.url, /^https:\/\//, `${im.src} https URL`);
          const buf = fs.readFileSync(path.join(root, im.src));
          const sz = jpegSize(buf);
          assert.ok(buf.length <= 150 * 1024 && sz && sz.w <= 900 && sz.h <= 900, `${im.src} <= 900px and <= 150 kB`);
        }
      }
    }
    assert.ok(totalImages >= ownCount, `${id} has >= ${ownCount} reference images`);
    const folder = `assets/reference/${id}`;
    const folderFiles = fs.readdirSync(path.join(root, folder)).map((n) => `${folder}/${n}`);
    assert.equal(folderFiles.length, ownCount, `${id} folder image count`);
    assert.deepEqual(folderFiles.filter((s) => !usedOwn.has(s)), [], `${id} has no unused images`);
  }
});
