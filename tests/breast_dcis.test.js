// DCIS / Paget resection (synoptic, AJCC 8th pTis) - generator, fixtures and QMH element order.
// Spec: docs/specs/breast-pair.md. Fixtures: tests/fixtures/breast_dcis/*.json (golden; --update only after a deliberate change).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate } from '../src/engine.js';
import { loadAll } from '../src/registry.js';
import { shortTypeName, gradeText } from '../generators/breast_dcis.js';
import { parseSynoptic } from '../src/synoptic.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(here, 'fixtures', 'breast_dcis');
const UPDATE = process.argv.includes('--update');
const registry = await loadAll();
const { schema, generator } = registry.breast_dcis;
const EX = schema.example.parts[0].values;
const defaults = (s) => Object.fromEntries(s.fields.filter((f) => f.default !== undefined).map((f) => [f.id, f.default]));

function run(patch = {}, options = {}, caseFields = {}) {
  const values = { ...defaults(schema), ...EX, ...patch };
  const cs = { schemaId: 'breast_dcis', caseTitle: '', options: { ...schema.example.options, ...options }, ...caseFields, parts: [{ label: 'A', values }] };
  return generate(schema, generator, cs);
}
const rows = (out) => Object.fromEntries(parseSynoptic(out.synoptic).filter((r) => r.label).map((r) => [r.label, r.value]));
const flatDx = (out) => out.diagnosis.replace(/\s+/g, ' ');
const info = (out) => out.issues.filter((i) => i.level === 'info').map((i) => i.message);
const warns = (out) => out.issues.filter((i) => i.level === 'warn').map((i) => i.message);
const errs = (out) => out.issues.filter((i) => i.level === 'error').map((i) => i.message);

const MASTECTOMY = 'Total mastectomy (including nipple-sparing and skin-sparing mastectomy)';
const COMEDO = 'Present, central (expansive "comedo" necrosis)';

const CASES = [
  ['01-wle-intermediate-grade-dcis-22mm', {}, { printPTNM: true }],
  ['02-mastectomy-high-grade-dcis-with-paget-biomarkers-performed', { procedure: MASTECTOMY, laterality: 'Left', tumourSite: ['Central', 'Nipple'], sitePosition: '', specimenDims: '180 x 150 x 40', weight: '480', skinEllipse: '160 x 55',
    sizeMm: '55', tumourDims: '55 x 40 x 30', cutSurface: ['Ill-defined / stellate', 'Gritty', 'Necrosis'], closestGrossMm: '15, posterior', otherMacro: 'The nipple is eczematous and crusted.',
    blockKeyText: '1-8 lesion with the nipple\n9-12 posterior, superior, inferior and lateral margins\n13 medial and anterior margins\n14-15 background breast\n16 sentinel lymph nodes (2 nodes)',
    dcisBlocks: '9', blocksExamined: '16', dcisPatterns: ['Solid', 'Comedo'], dcisGrade: 'Grade III (high)', dcisNecrosis: COMEDO, nipple: "Paget's disease present",
    biomarkers: 'Performed', priorBiomarkerAccession: '', priorBiomarkerSummary: '', er: 'Negative, Internal control cells present and stain as expected', erIntensity: 'Negative (0)', erNuclei: 'None (0)', pr: 'Negative, Internal control cells present and stain as expected', prIntensity: 'Negative (0)', prNuclei: 'None (0)',
    coldIschemia: '30', fixationTime: '48', testType: 'Laboratory-developed test (QMH, HK).', marginsDcis: 'All: >10', nodeSampling: 'Sentinel node biopsy only', nodesExamined: '2', nodesSentinel: '2' }, { printPTNM: true }],
  ['03-paget-disease-central-excision-anterior-margin-involved', { histType: 'Paget disease', procedure: 'Other (specify)', procedureOther: 'Central excision with nipple', laterality: 'Left', tumourSite: ['Nipple'], sitePosition: '', specimenDims: '45 x 40 x 20', weight: '22', skinEllipse: '30 x 20',
    sizeMode: 'Cannot be determined', sizeMm: '', tumourDims: '', sizeCannot: 'Paget disease confined to the nipple epidermis', cutSurface: [], closestGrossMm: '', otherMacro: 'The nipple skin is eroded over 8 mm. No discrete mass is identified.',
    blockKeyText: '1-4 nipple, entirely embedded\n5-8 margins\n9 remaining breast', dcisBlocks: '', blocksExamined: '9', dcisPatterns: [], dcisGrade: 'Grade III (high)', dcisNecrosis: 'Not identified', microcalcs: ['Not identified'], nipple: "Paget's disease present",
    biomarkers: 'Not performed', priorBiomarkerAccession: '', priorBiomarkerSummary: '', marginsDcis: 'Anterior: involved\nPosterior: >10\nSuperior: 4\nInferior: >10\nMedial: >10\nLateral: >10' }, { printPTNM: true }]
];
const byName = Object.fromEntries(CASES.map(([n, p, o, c]) => [n, { patch: p, options: o || {}, caseFields: c || {} }]));

test('template metadata and registration', () => {
  assert.equal(schema.id, 'breast_dcis');
  assert.equal(schema.kind, 'cancer resection');
  assert.equal(schema.system, 'Breast');
  assert.match(schema.source.url, /BREAST-DCIS\.html$/);
  assert.equal(schema.source.stagingProtocol, 'breast');
  assert.ok(registry.breast_dcis);
  assert.deepEqual(schema.fields.find((f) => f.id === 'histType').options, ['Ductal carcinoma in situ (DCIS)', 'Paget disease', 'Encapsulated papillary carcinoma in situ', 'Solid papillary carcinoma in situ']);
});

test('example case: WLE, intermediate-grade DCIS 22 mm, no nodes -> pTis(DCIS) pNX, no pNX nag', () => {
  const out = run({}, { printPTNM: true });
  const r = rows(out);
  assert.match(out.report, /^Breast, right, wide local excision\n/);
  assert.equal(r['Procedure'], 'Excision (less than total mastectomy)');
  assert.equal(r['Specimen laterality'], 'Right');
  assert.equal(r['Number of blocks with DCIS out of total'], '5 of 14 blocks');
  assert.equal(r['Histologic type'], 'Ductal carcinoma in situ (DCIS)');
  assert.equal(r['Size (extent) of DCIS'], 'Greatest dimension 22 mm (22 x 15 x 10 mm)');
  assert.equal(r['Architectural patterns'], 'Cribriform, Solid');
  assert.equal(r['Nuclear grade'], 'Grade II (intermediate)');
  assert.equal(r['Necrosis'], 'Present, focal (small foci or single cell necrosis)');
  assert.equal(r['Nipple'], 'Not present in specimen');
  assert.equal(r['Regional lymph nodes'], 'No lymph nodes submitted or found');
  assert.equal(r['pTNM'], 'pTis(DCIS) pNX');
  assert.equal(flatDx(out), 'BREAST, right, wide local excision - DUCTAL CARCINOMA IN SITU, intermediate grade, 22 mm; margins clear (closest 3 mm, anterior); no invasive carcinoma identified; see synoptic report - pTis(DCIS) pNX (AJCC 8th edition)');
  assert.ok(!out.issues.some((i) => /^pNX/.test(i.message)), 'pNX is expected for pure DCIS without nodes');
  assert.ok(!/pTNM/.test(run({}).report), 'pTNM prints only with printPTNM');
  assert.match(out.report, /Sections show ductal carcinoma in situ of intermediate grade with cribriform\n  and solid architecture, with focal necrosis and associated microcalcification,\n  spanning 22 mm \(5 of 14 blocks\)\. No invasive carcinoma is identified\./);
});

test('type and grade helpers, casing in the diagnosis', () => {
  assert.equal(shortTypeName({ histType: 'Ductal carcinoma in situ (DCIS)' }), 'Ductal carcinoma in situ');
  assert.equal(shortTypeName({ histType: 'Paget disease' }), "Paget's disease of the nipple");
  assert.equal(shortTypeName({ histType: 'Encapsulated papillary carcinoma in situ' }), 'Encapsulated papillary carcinoma in situ');
  assert.equal(gradeText({ dcisGrade: 'Grade III (high)' }), 'high grade');
  assert.equal(gradeText({ dcisGrade: 'Grade I (low)' }), 'low grade');
  assert.match(flatDx(run({ histType: 'Encapsulated papillary carcinoma in situ', dcisPatterns: ['Encapsulated papillary carcinoma in situ'] })), /- ENCAPSULATED PAPILLARY CARCINOMA IN SITU, intermediate grade, 22 mm;/);
});

test('02 mastectomy with Paget disease of the nipple and biomarkers on this specimen', () => {
  const out = run(byName['02-mastectomy-high-grade-dcis-with-paget-biomarkers-performed'].patch, { printPTNM: true });
  const r = rows(out);
  assert.match(out.report, /in the central breast and nipple/);
  assert.equal(r['Nipple'], "Paget's disease present");
  assert.equal(r['Nuclear grade'], 'Grade III (high)');
  assert.equal(r['pTNM'], 'pTis(DCIS) pN0(sn)');
  assert.match(out.synoptic, /- Estrogen receptor: Negative, Internal control cells present and stain as\n  expected\n  - Intensity: Negative \(0\)\n/);
  assert.match(out.synoptic, /- Cold ischemia time: 30 min\n/);
  assert.match(out.synoptic, /- Fixation time in buffered formalin: 48 hours\n/);
  assert.equal(flatDx(out), "BREAST, left, total mastectomy - DUCTAL CARCINOMA IN SITU, high grade, 55 mm; Paget's disease of the nipple; margins clear (all greater than 10 mm); no invasive carcinoma identified; see synoptic report - 0 of 2 sentinel lymph nodes involved - pTis(DCIS) pN0(sn) (AJCC 8th edition), stage 0 (if cM0)", 'a stage group prints once the nodes are staged');
  assert.ok(info(out).some((m) => /^DCIS with Paget disease of the nipple: pTis\(DCIS\)/.test(m)));
  assert.match(out.report, /Two lymph nodes are identified/);
});

test('03 Paget disease alone: blocks row not applicable, size cannot be determined, involved margin wording, pTis(Paget)', () => {
  const out = run(byName['03-paget-disease-central-excision-anterior-margin-involved'].patch, { printPTNM: true });
  const r = rows(out);
  assert.match(out.report, /^Breast, left, central excision with nipple\n/);
  assert.equal(r['Number of blocks with DCIS out of total'], 'Not applicable (no DCIS)');
  assert.equal(r['Histologic type'], 'Paget disease');
  assert.equal(r['Size (extent) of DCIS'], 'Cannot be determined (Paget disease confined to the nipple epidermis)');
  assert.equal(r['Anterior margin'], "Involved by Paget's disease");
  assert.equal(r['pTNM'], 'pTis(Paget) pNX');
  assert.equal(flatDx(out), "BREAST, left, central excision with nipple - PAGET'S DISEASE OF THE NIPPLE, high grade; anterior margin involved by Paget's disease; other margins clear (closest 4 mm, superior); no invasive carcinoma identified; see synoptic report - pTis(Paget) pNX (AJCC 8th edition)");
  assert.ok(info(out).some((m) => m === "Paget's disease at a margin: re-excision is usually recommended after breast-conserving surgery."));
  assert.ok(!info(out).some((m) => /Record the number of blocks/.test(m)), 'blocks nag suppressed for Paget');
  assert.ok(!info(out).some((m) => /No architectural pattern/.test(m)));
});

test('checks: block counts, close DCIS margin, nodal metastasis with pure DCIS, biomarker modes, Paget nipple mismatch', () => {
  assert.ok(errs(run({ dcisBlocks: '20' })).some((m) => /More blocks with DCIS/.test(m)));
  assert.ok(info(run({ dcisBlocks: '' })).some((m) => /Record the number of blocks/.test(m)));
  assert.ok(!/Number of blocks/.test(run({ dcisBlocks: '' }).synoptic), 'row omitted when either count is missing');
  assert.ok(warns(run({ marginsDcis: 'Anterior: 1\nPosterior: 6' })).some((m) => /DCIS within 2 mm of the anterior margin \(1 mm\)/.test(m)));
  assert.ok(warns(run({ nodeSampling: 'Sentinel node biopsy only', nodesExamined: '2', nodesSentinel: '2', nodesMacro: '1', depositMm: '3' })).some((m) => /exclude an unsampled invasive component/.test(m)));
  assert.ok(warns(run({ biomarkers: 'Performed' })).some((m) => /no results are entered/.test(m)));
  assert.ok(info(run({ biomarkers: 'Not performed' })).some((m) => /ER \(and PR\) are requested for DCIS/.test(m)));
  assert.ok(warns(run({ histType: 'Paget disease', nipple: 'Present and not involved' })).some((m) => /nipple field does not record Paget/.test(m)));
  assert.ok(errs(run({ marginsDcis: 'Top: 3' })).some((m) => /lines not understood/.test(m)));
  assert.ok(warns(run({ sizeMm: '' })).some((m) => /Extent of DCIS not recorded/.test(m)));
});

test('report options: macro off, header on, single part without letters, other part restores letters', () => {
  assert.ok(!run({}, { macro: false }).report.includes('The specimen consists of'));
  assert.match(run({}, { includeHeader: true }).report, /^SPECIMEN:\n/);
  assert.ok(!/\(A\)/.test(run({}).report));
  const multi = run({ otherParts: 'B) Breast, right, cavity shave, superior - benign' });
  assert.match(multi.report, /^\(A\) Breast, right, wide local excision\n\(B\) Breast, right, cavity shave, superior/);
  assert.match(multi.diagnosis, /^\(A\) BREAST, right, wide local excision\n/);
});

test('synoptic element order follows the QMH BREAST-DCIS page (analysis/qmh/dcis.txt)', () => {
  const QMH = ['Procedure', 'Specimen laterality', 'Tumour site', 'Number of blocks with DCIS out of total', 'Histologic type', 'Size (extent) of DCIS', 'Nuclear grade', 'Necrosis', 'Anterior margin', 'Regional lymph nodes', 'pTNM'];
  const ours = Object.keys(rows(run(byName['02-mastectomy-high-grade-dcis-with-paget-biomarkers-performed'].patch, { printPTNM: true })));
  let cursor = -1;
  for (const label of QMH) {
    const idx = ours.indexOf(label);
    assert.ok(idx > cursor, `${label} out of QMH order (index ${idx} after ${cursor}); rows: ${ours.join(' | ')}`);
    cursor = idx;
  }
});

test('golden fixtures reproduce byte-for-byte', () => {
  fs.mkdirSync(FIX, { recursive: true });
  for (const [name, patch, opts = {}, caseFields = {}] of CASES) {
    const out = run(patch, opts, caseFields);
    const file = path.join(FIX, `${name}.json`);
    const current = { templateId: 'breast_dcis', patch, options: opts, caseFields, report: out.report, checks: out.issues };
    if (UPDATE || !fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n'); continue; }
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(out.report, saved.report, `${file} changed; re-run with --update only after a deliberate wording change`);
    assert.deepEqual(out.issues, saved.checks, `${file} checks changed`);
  }
});
