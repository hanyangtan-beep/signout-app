// Remaining HPB cancer resection templates & galleries:
//   bile_duct_carcinoma (AJCC 8th Ch. 25 Perihilar & Ch. 26 Distal)
//   intrahepatic_cholangiocarcinoma (QMH GI-Intrahepatic bile ducts, AJCC 8th Ch. 23)
//   pancreas_net (QMH Endocrine-Pancreas-NET, AJCC 9th)
//   hepatoblastoma (QMH Pedi-Hepatoblastoma, CAP 5.0.0.1, PRETEXT/POST-TEXT)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCase, generate } from '../src/engine.js';
import { loadAll, loadManifest } from '../src/registry.js';
import { deriveTNM } from '../src/staging/index.js';
import { parseIntake, matchParts } from '../src/intake.js';
import * as BD from '../src/staging/bile_duct.js';
import * as ICCA from '../src/staging/intrahepatic_bile_duct.js';
import * as PNET from '../src/staging/pancreas_net.js';

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

// ---------- registration & placeholder retirement ----------

test('HPB templates: all 4 registered under Hepatobiliary and retired from planned.json', () => {
  for (const id of ['bile_duct_carcinoma', 'intrahepatic_cholangiocarcinoma', 'pancreas_net', 'hepatoblastoma']) {
    assert.ok(registry[id], `${id} registered`);
    assert.equal(registry[id].schema.system, 'Hepatobiliary', `${id} system`);
    assert.ok(!planned.planned.some((p) => p.id === id), `${id} retired from planned.json`);
    assert.ok(manifest.some((m) => m.id === id), `${id} in manifest.json`);
  }
});

// ---------- staging engines ----------

test('bile_duct staging: Perihilar (Ch. 25) vs Distal (Ch. 26) pT, pN, pM and stage groups', () => {
  const peri = deriveTNM({
    anatomicLocation: 'Perihilar bile ducts',
    perihilarExtension: BD.PERIHILAR_EXT.t2b,
    nodesExamined: '8',
    nodesInvolved: '2',
    distantMets: [BD.METS.na]
  }, 'bile_duct');
  assert.equal(peri.tnm, 'pT2b pN1');
  assert.equal(peri.stage, 'IIIC');
  assert.match(peri.edition, /Perihilar/);

  const dist1 = deriveTNM({
    anatomicLocation: 'Distal extrahepatic bile duct',
    distalExtension: BD.DISTAL_EXT.invasive,
    invasionDepthMm: '4',
    nodesExamined: '12',
    nodesInvolved: '0',
    distantMets: [BD.METS.na]
  }, 'bile_duct');
  assert.equal(dist1.tnm, 'pT1 pN0');
  assert.equal(dist1.stage, 'I');
  assert.match(dist1.edition, /Distal/);

  const dist2 = deriveTNM({
    anatomicLocation: 'Distal extrahepatic bile duct',
    distalExtension: BD.DISTAL_EXT.invasive,
    invasionDepthMm: '14',
    nodesExamined: '14',
    nodesInvolved: '5',
    distantMets: [BD.METS.na]
  }, 'bile_duct');
  assert.equal(dist2.tnm, 'pT3 pN2');
  assert.equal(dist2.stage, 'IIIA');
});

test('intrahepatic_bile_duct staging: AJCC 8th Ch. 23 pT1a/b, pT2 (LVI or multiple), pT3, pT4, pN1', () => {
  assert.equal(deriveTNM({ focality: 'Solitary', sizeMm: '42', lvi: 'Not identified', extension: [ICCA.EXT.parenchyma], nodesExamined: '5', nodesInvolved: '0' }, 'intrahepatic_bile_duct').tnm, 'pT1a pN0');
  assert.equal(deriveTNM({ focality: 'Solitary', sizeMm: '65', lvi: 'Not identified', extension: [ICCA.EXT.parenchyma], nodesExamined: '5', nodesInvolved: '0' }, 'intrahepatic_bile_duct').tnm, 'pT1b pN0');
  assert.equal(deriveTNM({ focality: 'Solitary', sizeMm: '30', lvi: 'Present', extension: [ICCA.EXT.parenchyma], nodesExamined: '5', nodesInvolved: '0' }, 'intrahepatic_bile_duct').tnm, 'pT2 pN0');
  assert.equal(deriveTNM({ focality: 'Multiple', sizeMm: '30', lvi: 'Not identified', extension: [ICCA.EXT.parenchyma], nodesExamined: '5', nodesInvolved: '0' }, 'intrahepatic_bile_duct').tnm, 'pT2 pN0');
  assert.equal(deriveTNM({ focality: 'Solitary', sizeMm: '40', extension: [ICCA.EXT.peritoneum], nodesExamined: '5', nodesInvolved: '0' }, 'intrahepatic_bile_duct').tnm, 'pT3 pN0');
  const t4n1 = deriveTNM({ focality: 'Solitary', sizeMm: '40', extension: [ICCA.EXT.gallbladder], nodesExamined: '5', nodesInvolved: '1' }, 'intrahepatic_bile_duct');
  assert.equal(t4n1.tnm, 'pT4 pN1');
  assert.equal(t4n1.stage, 'IIIB');
});

test('pancreas_net staging: AJCC 9th pT1–pT4, pN0–1, pM1a/b/c', () => {
  assert.equal(deriveTNM({ sizeMm: '15', extension: [PNET.EXT.limited], nodesExamined: '8', nodesInvolved: '0' }, 'pancreas_net').tnm, 'pT1 pN0');
  assert.equal(deriveTNM({ sizeMm: '26', extension: [PNET.EXT.limited], nodesExamined: '8', nodesInvolved: '0' }, 'pancreas_net').tnm, 'pT2 pN0');
  assert.equal(deriveTNM({ sizeMm: '25', extension: [PNET.EXT.duodenum], nodesExamined: '8', nodesInvolved: '0' }, 'pancreas_net').tnm, 'pT3 pN0');
  assert.equal(deriveTNM({ sizeMm: '25', extension: [PNET.EXT.spleen], nodesExamined: '8', nodesInvolved: '0' }, 'pancreas_net').tnm, 'pT4 pN0');
  assert.equal(deriveTNM({ sizeMm: '25', extension: [PNET.EXT.limited], nodesExamined: '8', nodesInvolved: '1', distantMets: [PNET.METS.liver] }, 'pancreas_net').tnm, 'pT2 pN1 pM1a');
  assert.equal(deriveTNM({ sizeMm: '25', extension: [PNET.EXT.limited], nodesExamined: '8', nodesInvolved: '0', distantMets: [PNET.METS.lung] }, 'pancreas_net').tnm, 'pT2 pN0 pM1b');
  assert.equal(deriveTNM({ sizeMm: '25', extension: [PNET.EXT.limited], nodesExamined: '8', nodesInvolved: '0', distantMets: [PNET.METS.liver, PNET.METS.bone] }, 'pancreas_net').tnm, 'pT2 pN0 pM1c');
});

// ---------- end-to-end rendering, checks & routing ----------

test('HPB templates: examples render cleanly with expected pTNM / PRETEXT and zero undefined tokens', () => {
  const rBd = runExample('bile_duct_carcinoma');
  assert.match(rBd.synoptic, /pT2a pN0/);
  assert.doesNotMatch(rBd.report, /undefined|\[object|NaN/);

  const rIcca = runExample('intrahepatic_cholangiocarcinoma');
  assert.match(rIcca.synoptic, /pT1a pN0/);
  assert.doesNotMatch(rIcca.report, /undefined|\[object|NaN/);

  const rPnet = runExample('pancreas_net');
  assert.match(rPnet.synoptic, /pT2 pN0/);
  assert.match(rPnet.synoptic, /AJCC 9th edition/);
  assert.doesNotMatch(rPnet.report, /undefined|\[object|NaN/);

  const rHb = runExample('hepatoblastoma');
  assert.match(rHb.synoptic, /PRETEXT III \/ POST-TEXT II/);
  assert.match(rHb.synoptic, /INI1 expression retained/);
  assert.doesNotMatch(rHb.report, /undefined|\[object|NaN/);
});

test('HPB templates: clinical validation checks (WHO NET grade mismatch, INI1 loss)', () => {
  const badNet = runExample('pancreas_net', { grade: 'G1: Well-differentiated neuroendocrine tumour', ki67Pct: '8' });
  assert.ok(badNet.issues.some((x) => x.level === 'warn' && /corresponds to G2/.test(x.message)));

  const iniLoss = runExample('hepatoblastoma', { ini1: 'INI1 expression lost' });
  assert.ok(iniLoss.issues.some((x) => x.level === 'warn' && /malignant rhabdoid tumour/.test(x.message)));
});

test('HPB templates: intake routes each resection accurately without colliding with biopsies', () => {
  assert.equal(route('(A) Perihilar bile ducts, extrahepatic bile duct resection', 'Klatskin tumour').templateId, 'bile_duct_carcinoma');
  assert.equal(route('(A) Liver, right hepatectomy', 'Intrahepatic cholangiocarcinoma').templateId, 'intrahepatic_cholangiocarcinoma');
  assert.equal(route('(A) Pancreas, distal pancreatectomy', 'Pancreatic neuroendocrine tumour').templateId, 'pancreas_net');
  assert.equal(route('(A) Liver, right lobectomy', 'Hepatoblastoma').templateId, 'hepatoblastoma');
  assert.notEqual(route('(A) Liver mass, core biopsy', 'Hepatoblastoma')?.templateId, 'hepatoblastoma');
});

// ---------- reference galleries ----------

test('HPB galleries: all panels on select/multiselect fields, open-licence JPEGs <= 900px/150kB, zero unused images', () => {
  const EXPECTED = {
    bile_duct_carcinoma: { panels: 4, folder: 'assets/reference/bile_duct_carcinoma', files: 3 },
    intrahepatic_cholangiocarcinoma: { panels: 2, folder: 'assets/reference/intrahepatic_cholangiocarcinoma', files: 3 },
    pancreas_net: { panels: 4, folder: null, files: 0 },
    hepatoblastoma: { panels: 4, folder: 'assets/reference/hepatoblastoma', files: 4 }
  };

  for (const [id, spec] of Object.entries(EXPECTED)) {
    const schema = registry[id].schema;
    const refs = schema.fields.filter((f) => f.reference);
    assert.equal(refs.length, spec.panels, `${id} panel count`);
    const used = new Set();
    for (const f of refs) {
      assert.ok(f.type === 'select' || f.type === 'multiselect', `${id}.${f.id} is select/multiselect`);
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
