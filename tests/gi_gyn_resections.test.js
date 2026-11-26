// Remaining GI & Gynae cancer resection templates & galleries:
//   gi_net (site-aware GI neuroendocrine tumour resection; AJCC 8th Ch. 29–33)
//   small_intestine_carcinoma (QMH GI-Small intestine; AJCC 8th Ch. 18)
//   anal_carcinoma (QMH GI-Anus; AJCC 9th)
//   vaginal_carcinoma (QMH GYN-Vagina; AJCC 8th Ch. 50 / FIGO)
//   uterine_sarcoma (QMH GYN-Sarcoma; AJCC 8th Ch. 54 / FIGO 2009)
//   gtd (QMH GYN-Trophoblast; AJCC 8th Ch. 56 / FIGO)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCase, generate } from '../src/engine.js';
import { loadAll, loadManifest } from '../src/registry.js';
import { deriveTNM } from '../src/staging/index.js';
import { parseIntake, matchParts } from '../src/intake.js';
import * as GINET from '../src/staging/gi_net.js';
import * as SI from '../src/staging/small_intestine.js';
import * as ANAL from '../src/staging/anal.js';
import * as VAG from '../src/staging/vagina.js';
import * as USARC from '../src/staging/uterine_sarcoma.js';
import * as GTD from '../src/staging/gtd.js';

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

test('GI & Gynae templates: all 6 registered, in manifest, and retired from planned.json', () => {
  const expected = {
    gi_net: 'GI',
    small_intestine_carcinoma: 'GI',
    anal_carcinoma: 'GI',
    vaginal_carcinoma: 'Gynae',
    uterine_sarcoma: 'Gynae',
    gtd: 'Gynae'
  };
  for (const [id, sys] of Object.entries(expected)) {
    assert.ok(registry[id], `${id} registered`);
    assert.equal(registry[id].schema.system, sys, `${id} system`);
    assert.ok(!planned.planned.some((p) => p.id === id), `${id} retired from planned.json`);
    assert.ok(manifest.some((m) => m.id === id), `${id} in manifest.json`);
  }
  assert.equal(manifest.length, 100);
});

// ---------- staging engines ----------

test('gi_net staging: site-aware AJCC 8th Ch. 29–33 across all 5 GI sites', () => {
  const stom = deriveTNM({ site: GINET.SITES.stomach, sizeMm: '8', depth: GINET.DEPTH.laminaPropria, nodesExamined: '4', nodesInvolved: '0' }, 'gi_net');
  assert.equal(stom.tnm, 'pT1 pN0');
  assert.equal(stom.stage, 'I');
  assert.match(stom.edition, /Ch\. 29/);

  const duod = deriveTNM({ site: GINET.SITES.duodenum, sizeMm: '12', depth: GINET.DEPTH.muscularis, pancreasInvasion: true, nodesExamined: '6', nodesInvolved: '0' }, 'gi_net');
  assert.equal(duod.tnm, 'pT3 pN0');
  assert.equal(duod.stage, 'II');

  const ileal = deriveTNM({ site: GINET.SITES.jejunumIleum, sizeMm: '18', depth: GINET.DEPTH.subserosa, nodesExamined: '15', nodesInvolved: '2', mesentericMassOver20mm: true }, 'gi_net');
  assert.equal(ileal.tnm, 'pT3 pN2');
  assert.equal(ileal.stage, 'III');

  const app = deriveTNM({ site: GINET.SITES.appendix, sizeMm: '25', depth: GINET.DEPTH.muscularis, nodesExamined: '10', nodesInvolved: '0' }, 'gi_net');
  assert.equal(app.tnm, 'pT2 pN0');
  assert.equal(app.stage, 'II');

  const col = deriveTNM({ site: GINET.SITES.colonRectum, sizeMm: '8', depth: GINET.DEPTH.laminaPropria, nodesExamined: '5', nodesInvolved: '0', distantMets: [GINET.METS.liver, GINET.METS.bone] }, 'gi_net');
  assert.equal(col.tnm, 'pT1a pN0 pM1c');
  assert.equal(col.stage, 'IV');
});

test('small_intestine staging: AJCC 8th Ch. 18 pT1a–pT4, pN0–pN2', () => {
  assert.equal(deriveTNM({ extension: SI.EXT.lp, nodesExamined: '12', nodesInvolved: '0' }, 'small_intestine').tnm, 'pT1a pN0');
  assert.equal(deriveTNM({ extension: SI.EXT.ss, nodesExamined: '12', nodesInvolved: '2' }, 'small_intestine').tnm, 'pT3 pN1');
  const t4n2 = deriveTNM({ extension: SI.EXT.pancreas, nodesExamined: '12', nodesInvolved: '4' }, 'small_intestine');
  assert.equal(t4n2.tnm, 'pT4 pN2');
  assert.equal(t4n2.stage, 'IIIB');
});

test('anal staging: AJCC 9th pT1–pT4 and pN1a/b/c', () => {
  assert.equal(deriveTNM({ sizeMm: '18', extension: [ANAL.EXT.sm], otherNodesExamined: '5', otherNodesInvolved: '0' }, 'anal').tnm, 'pT1 pN0');
  const t2n1a = deriveTNM({ sizeMm: '32', extension: [ANAL.EXT.perianalSoftTissue], otherNodesExamined: '10', otherNodesInvolved: '1' }, 'anal');
  assert.equal(t2n1a.tnm, 'pT2 pN1a');
  assert.equal(t2n1a.stage, 'IIIA');
  const t4n1c = deriveTNM({ sizeMm: '55', extension: [ANAL.EXT.adjacent], otherNodesExamined: '6', otherNodesInvolved: '1', externalIliacExamined: '4', externalIliacInvolved: '1' }, 'anal');
  assert.equal(t4n1c.tnm, 'pT4 pN1c');
  assert.equal(t4n1c.stage, 'IIIC');
});

test('vagina staging: AJCC 8th Ch. 50 pT1a–pT4, pN0(i+)/pN1', () => {
  assert.equal(deriveTNM({ sizeMm: '18', extension: [VAG.EXT.none], nodesExamined: '6', nodesInvolved: '0' }, 'vagina').tnm, 'pT1a pN0');
  assert.equal(deriveTNM({ sizeMm: '25', extension: [VAG.EXT.paravaginal], nodesExamined: '6', nodesInvolved: '0', nodesItc: '1' }, 'vagina').tnm, 'pT2b pN0(i+)');
  const t3n1 = deriveTNM({ sizeMm: '35', extension: [VAG.EXT.pelvicSidewall], nodesExamined: '8', nodesInvolved: '2' }, 'vagina');
  assert.equal(t3n1.tnm, 'pT3 pN1');
  assert.equal(t3n1.stage, 'III');
});

test('uterine_sarcoma staging: dual-track All sarcoma vs Adenosarcoma', () => {
  const lms = deriveTNM({ histType: 'Leiomyosarcoma, NOS', sizeMm: '78', extension: [USARC.EXT.limited] }, 'uterine_sarcoma');
  assert.equal(lms.tnm, 'pT1b');
  assert.equal(lms.stage, 'IB');

  const adeno = deriveTNM({ histType: 'Adenosarcoma, NOS', myometrialInvasion: USARC.MYO.ge50, extension: [USARC.EXT.limited], nodesExamined: '6', nodesInvolved: '1' }, 'uterine_sarcoma');
  assert.equal(adeno.tnm, 'pT1c pN1');
  assert.equal(adeno.stage, 'IIIC');
});

test('gtd staging: AJCC 8th Ch. 56 pT1–pT2 and pM1a/pM1b (no pN)', () => {
  const s1 = deriveTNM({ extension: [GTD.EXT.uterus], distantMets: [GTD.METS.na] }, 'gtd');
  assert.equal(s1.tnm, 'pT1');
  assert.equal(s1.stage, 'I');

  const s3 = deriveTNM({ extension: [GTD.EXT.genital], distantMets: [GTD.METS.lung] }, 'gtd');
  assert.equal(s3.tnm, 'pT2 pM1a');
  assert.equal(s3.stage, 'III');

  const s4 = deriveTNM({ extension: [GTD.EXT.uterus], distantMets: [GTD.METS.lung, GTD.METS.liver] }, 'gtd');
  assert.equal(s4.tnm, 'pT1 pM1b');
  assert.equal(s4.stage, 'IV');
});

// ---------- end-to-end rendering, checks & routing ----------

test('GI & Gynae templates: examples render cleanly with expected pTNM and zero undefined tokens', () => {
  for (const id of ['gi_net', 'small_intestine_carcinoma', 'anal_carcinoma', 'vaginal_carcinoma', 'uterine_sarcoma', 'gtd']) {
    const r = runExample(id);
    assert.ok(r.synoptic && r.diagnosis && r.macro, `${id} renders all blocks`);
    assert.doesNotMatch(r.report, /undefined|\[object|NaN/, `${id} has no undefined tokens`);
  }
  assert.match(runExample('gi_net').synoptic, /pT3 pN1/);
  assert.match(runExample('small_intestine_carcinoma').synoptic, /pT3 pN1/);
  assert.match(runExample('anal_carcinoma').synoptic, /pT2 pN1a/);
  assert.match(runExample('vaginal_carcinoma').synoptic, /pT1a pN0/);
  assert.match(runExample('uterine_sarcoma').synoptic, /pT1b/);
  assert.match(runExample('gtd').synoptic, /pT1/);
});

test('GI & Gynae templates: clinical validation checks (GI NET grade mismatch)', () => {
  const badNet = runExample('gi_net', { grade: 'G1: Well-differentiated neuroendocrine tumour', ki67Pct: '12' });
  assert.ok(badNet.issues.some((x) => x.level === 'warn' && /corresponds to G2/.test(x.message)));
});

test('GI & Gynae templates: intake routes each resection accurately without colliding with biopsies', () => {
  assert.equal(route('(A) Ileum, segmental resection', 'Well-differentiated neuroendocrine tumour').templateId, 'gi_net');
  assert.equal(route('(A) Jejunum, segmental resection', 'Small intestine adenocarcinoma').templateId, 'small_intestine_carcinoma');
  assert.equal(route('(A) Anal canal, abdominoperineal resection', 'Anal squamous cell carcinoma').templateId, 'anal_carcinoma');
  assert.equal(route('(A) Vagina, partial vaginectomy', 'Vaginal squamous cell carcinoma').templateId, 'vaginal_carcinoma');
  assert.equal(route('(A) Uterus, total hysterectomy and bilateral salpingo-oophorectomy', 'Uterine leiomyosarcoma').templateId, 'uterine_sarcoma');
  assert.equal(route('(A) Uterus, simple hysterectomy', 'Choriocarcinoma').templateId, 'gtd');
});

// ---------- reference galleries ----------

test('GI & Gynae galleries: open-licence JPEGs <= 900px/150kB, ExpertPath links, zero unused images', () => {
  const EXPECTED = {
    gi_net: { folder: 'assets/reference/gi_net', files: 6 },
    small_intestine_carcinoma: { folder: 'assets/reference/small_intestine_carcinoma', files: 5 },
    anal_carcinoma: { folder: 'assets/reference/anal_carcinoma', files: 5 },
    vaginal_carcinoma: { folder: 'assets/reference/vaginal_carcinoma', files: 3 },
    uterine_sarcoma: { folder: null, files: 0 },
    gtd: { folder: null, files: 0 }
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
