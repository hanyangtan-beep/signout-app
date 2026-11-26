// GI and oral graft-versus-host disease biopsy. Card: docs/roadmap.md "GI and oral graft-versus-host disease
// biopsy" (user request and pulled by the user 2026-10-14, Phase 71); spec docs/specs/gvhd-biopsy.md; grounding
// docs/reference/gvhd_biopsy-morphology.md. Wording is deliberate; update the strings only on purpose.
// Fixtures: tests/fixtures/gvhd_biopsy/*.json (golden; --update only after a deliberate change).
// The routing lines below are house-style lines, not case text.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCase, generate, isVisible } from '../src/engine.js';
import { parseIntake, matchParts, presetValues } from '../src/intake.js';
import { biopsyRow, labelOf } from '../src/picker.js';
import { loadAll, loadManifest } from '../src/registry.js';
import { autoGrade, gradeOf, regionOf, findingsOf, differentialOf, transplantDayOf, mmfOf, SITES, OTHER_SITE } from '../generators/gvhd_biopsy.js';

const registry = await loadAll();
const manifest = await loadManifest();
const t = registry.gvhd_biopsy;
const schema = t.schema;
const here = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(here, 'fixtures', 'gvhd_biopsy');
const UPDATE = process.argv.includes('--update');
const one = (values, extra = {}) => {
  const c = createCase(schema, 1);
  c.parts[0].values = { ...c.parts[0].values, ...values };
  return { ...c, ...extra };
};
const run = (values, extra) => generate(schema, t.generator, one(values, extra));
const example = () => ({ ...JSON.parse(JSON.stringify(schema.example)), schemaId: schema.id });
const defaults = () => one({}).parts[0].values;
const visible = (values) => schema.fields.filter((f) => isVisible(f, { ...defaults(), ...values })).map((f) => f.id);
const checksOf = (r) => r.issues.map((i) => [i.level, i.field]);
const route = (line, history = '') => matchParts(parseIntake(line), history, manifest)[0];
const preset = (line, history = '') => {
  const parsed = parseIntake(line);
  return presetValues(schema, parsed.parts[0], matchParts(parsed, history, manifest)[0]);
};
const history = (clinical) => ({ meta: { clinical } });

// ---------- metadata and menus ----------

test('template is registered with the required metadata', () => {
  assert.ok(t, 'registry has gvhd_biopsy');
  assert.equal(schema.system, 'GI');
  assert.equal(schema.kind, 'biopsy');
  assert.equal(schema.label, 'GVHD');
  assert.equal(schema.shortName, 'GI / oral · GVHD biopsy');
  assert.equal(schema.version, '2026.10');
  assert.equal(schema.style.british, true);
  assert.deepEqual(schema.caseFields.map((f) => f.id), ['transplantDay', 'mmf']);
});

test('GVHD follows Peritoneum in the Small biopsy row', () => {
  const row = biopsyRow(manifest).map(labelOf);
  const idx = row.indexOf('GVHD');
  assert.ok(idx > 0);
  assert.equal(row[idx - 1], 'Peritoneum');
});

test('the form offers gut, oral and salivary findings by site, and the grade for the bowel only', () => {
  assert.ok(SITES.includes('Lip') && SITES.includes('Oesophagus') && SITES.includes('Rectum'));
  const colon = visible({ site: 'Sigmoid colon' });
  for (const id of ['apoptosis', 'cryptLoss', 'paneth', 'laminaPropria', 'grade']) assert.ok(colon.includes(id), id);
  assert.ok(!colon.includes('oralFeatures') && !colon.includes('oesoFeatures'));
  const oeso = visible({ site: 'Oesophagus' });
  assert.ok(oeso.includes('apoptosis') && oeso.includes('oesoFeatures'));
  assert.ok(!oeso.includes('cryptLoss') && !oeso.includes('grade'));
  assert.ok(!visible({ site: 'Stomach' }).includes('grade') && !visible({ site: 'Stomach' }).includes('paneth'));
  const lip = visible({ site: 'Lip' });
  assert.ok(lip.includes('oralFeatures') && lip.includes('salivary') && !lip.includes('apoptosis'));
  assert.ok(!lip.includes('lobules'));
  assert.ok(visible({ site: 'Lip', salivary: 'Included' }).includes('salivaryFeatures'));
  assert.ok(!visible({ site: 'Sigmoid colon', nih: 'Possible GVHD' }).includes('grade'), 'grade with Likely GVHD only');
  const other = visible({ site: OTHER_SITE, region: 'Oral mucosa' });
  assert.ok(other.includes('siteOther') && other.includes('oralFeatures') && !other.includes('apoptosis'));
  assert.equal(regionOf({ site: OTHER_SITE, region: 'Small bowel' }), 'small');
});

// ---------- the example ----------

test('the example renders the specimen, microscopy and diagnosis, and nothing a released report should not carry', () => {
  const c = example();
  c.options = { ...c.options, includeHeader: true };
  const r = generate(schema, t.generator, c);
  for (const h of ['SPECIMEN:', 'MICROSCOPIC EXAMINATION:', 'DIAGNOSIS:']) assert.ok(r.report.includes(h), h);
  assert.equal(r.diagnosis, 'SIGMOID COLON, biopsy:\n- CRYPT APOPTOSIS AND CRYPT DROPOUT, likely GRAFT-VERSUS-HOST DISEASE (grade 2).');
  assert.doesNotMatch(r.report, /NIH|Lerner|threshold|per piece|>=|≥|20 days|five lobules|serial sections are/i);
  assert.deepEqual(r.issues, []);
});

// ---------- microscopy ----------

test('gut microscopy: house opening, apoptosis in words, crypt dropout, lamina propria, viral change and CMV, closing lines', () => {
  const r = run({ site: 'Ascending colon', pieces: '2', apoptosis: 'Isolated', cryptChanges: ['Regenerative epithelial changes'], paneth: 'Paneth cell metaplasia',
    gutFeatures: ['Lamina propria fibrosis'], laminaPropria: 'Moderate', eosinophils: 'Inconspicuous', cmv: 'Negative' });
  assert.equal(r.microscopy,
    'Serial sections show two pieces of colonic mucosa. Occasional apoptotic bodies are seen in the basal crypt epithelium. ' +
    'The crypts show regenerative epithelial changes. Paneth cell metaplasia is seen. There is lamina propria fibrosis. ' +
    'The lamina propria shows a moderate chronic inflammatory infiltrate of lymphocytes and plasma cells. Eosinophils are inconspicuous. ' +
    'No viral cytopathic change or granuloma is seen. Immunohistochemistry for cytomegalovirus (CMV) is negative. ' +
    'The overall features likely represent graft-versus-host disease (grade 1). There is no evidence of dysplasia or malignancy. Please correlate with clinical findings.');
  assert.match(run({ apoptosis: 'Exploding crypts' }).microscopy, /Numerous apoptotic bodies are seen in the basal crypt epithelium, with crypts containing clusters of apoptotic bodies and karyorrhectic debris \(exploding crypts\)\./);
  assert.match(run({ apoptosis: 'At least one per piece' }).microscopy, /Apoptotic bodies are seen in the basal crypt epithelium of every piece\./);
  assert.match(run({ apoptosis: 'None seen', nih: 'Not GVHD' }).microscopy, /No crypt apoptosis is seen\./);
  assert.match(run({ cryptLoss: 'Contiguous crypts', apoptosis: 'Numerous', cryptChanges: ['Withering'] }).microscopy, /There is dropout of contiguous crypts\. The remaining crypts show withering\./);
  assert.ok(!run({}, {}).microscopy.includes('Paneth'), 'Paneth cells print only when stated');
  assert.ok(!run({ noDysplasia: false, correlate: false }).microscopy.includes('dysplasia'));
});

test('stomach and oesophagus: glands and basal squamous apoptosis', () => {
  const g = run({ site: 'Gastric body', apoptosis: 'Exploding crypts', cryptLoss: 'Individual crypts' });
  assert.match(g.microscopy, /^Serial sections show pieces of gastric body mucosa\. Numerous apoptotic bodies are seen in the glandular epithelium of the neck region, with glands containing clusters of apoptotic bodies and karyorrhectic debris\. There is dropout of individual glands\./);
  assert.match(g.diagnosis, /- GLANDULAR APOPTOSIS AND GLAND DROPOUT, likely GRAFT-VERSUS-HOST DISEASE\.$/);
  const o = run({ site: 'Oesophagus', apoptosis: 'Numerous', oesoFeatures: ['Lymphocytic exocytosis', 'Epithelial atrophy'], cmv: 'Negative' });
  assert.match(o.microscopy, /^Serial sections show pieces of oesophageal squamous mucosa\. Numerous apoptotic bodies are seen in the basal layer of the squamous epithelium\. There is lymphocytic exocytosis into the epithelium and epithelial atrophy\. Eosinophils are inconspicuous\./);
  assert.ok(!o.microscopy.includes('lamina propria contains'));
  assert.equal(o.diagnosis, 'OESOPHAGUS, biopsy:\n- BASAL EPITHELIAL APOPTOSIS, likely GRAFT-VERSUS-HOST DISEASE.');
});

test('oral mucosa and minor salivary glands', () => {
  const r = run({ site: 'Lip', detail: 'lower', pieces: '1', oralFeatures: ['Lichenoid interface inflammation', 'Lymphocytic exocytosis', 'Apoptotic keratinocytes', 'Satellitosis'],
    salivary: 'Included', lobules: '6', salivaryFeatures: ['Periductal lymphocytic inflammation', 'Exocytosis into ducts', 'Damaged intralobular ducts', 'Periductal fibrosis'] });
  assert.equal(r.microscopy,
    'Serial sections show a piece of squamous mucosa with underlying minor salivary glands. There is a band-like lymphocytic infiltrate at the epithelium-lamina propria interface, ' +
    'with lymphocytic exocytosis into the epithelium. Apoptotic keratinocytes are seen in the basal and parabasal layers, some with adjacent lymphocytes (satellitosis). ' +
    'Six lobules of minor salivary gland are present. They show periductal lymphocytic inflammation, lymphocytic exocytosis into the intralobular ducts, damage to the intralobular ducts and periductal fibrosis. ' +
    'No viral cytopathic change or granuloma is seen. The overall features likely represent chronic graft-versus-host disease. There is no evidence of dysplasia or malignancy. Please correlate with clinical findings.');
  assert.equal(r.diagnosis, 'LIP, lower, biopsy:\n- LICHENOID MUCOSITIS AND LYMPHOCYTIC SIALADENITIS, likely CHRONIC GRAFT-VERSUS-HOST DISEASE.');
  assert.match(run({ site: 'Lip', salivary: 'Included', lobules: '1' }).microscopy, /One lobule of minor salivary gland is present\. It shows no significant inflammation\./);
  assert.match(run({ site: 'Buccal mucosa', oralFeatures: [] , nih: 'Not GVHD' }).microscopy, /There is no interface inflammation or apoptosis\./);
  assert.equal(findingsOf({ site: 'Tongue', oralFeatures: ['Apoptotic keratinocytes'] }), 'INTERFACE MUCOSITIS');
});

// ---------- diagnosis ----------

const dx = (values) => run(values).diagnosis;

test('diagnosis: the NIH category is the qualifier, the grade follows Likely GVHD, the pointer follows Possible', () => {
  assert.equal(dx({ site: 'Rectum', apoptosis: 'Numerous' }), 'RECTUM, biopsy:\n- CRYPT APOPTOSIS, likely GRAFT-VERSUS-HOST DISEASE (grade 1).');
  assert.equal(dx({ site: 'Rectum', apoptosis: 'Numerous', nih: 'Possible GVHD' }), 'RECTUM, biopsy:\n- CRYPT APOPTOSIS, possible GRAFT-VERSUS-HOST DISEASE (please see description).');
  assert.equal(dx({ site: 'Duodenum', detail: 'D2', nih: 'Not GVHD' }), 'DUODENUM, D2, biopsy:\n- NO EVIDENCE OF GRAFT-VERSUS-HOST DISEASE.');
  assert.equal(dx({ site: 'Caecum', apoptosis: 'Numerous', cryptLoss: 'Extensive, with denudation' }), 'CAECUM, biopsy:\n- EXTENSIVE CRYPT DROPOUT with MUCOSAL DENUDATION, likely GRAFT-VERSUS-HOST DISEASE (grade 4).');
  assert.equal(dx({ apoptosis: 'Numerous', grade: 'Not graded' }), 'COLON, biopsy:\n- CRYPT APOPTOSIS, likely GRAFT-VERSUS-HOST DISEASE.');
  assert.equal(dx({ apoptosis: 'Numerous', phase: 'Acute', differential: ['Mycophenolate effect'] }), 'COLON, biopsy:\n- CRYPT APOPTOSIS, likely ACUTE GRAFT-VERSUS-HOST DISEASE (grade 1; please see description).');
  assert.equal(dx({ apoptosis: 'None seen' }), 'COLON, biopsy:\n- Likely GRAFT-VERSUS-HOST DISEASE.', 'nothing to name: the category stands alone and no grade prints');
  assert.equal(dx({ apoptosis: 'Numerous', nih: 'Possible GVHD', seeDescription: false }), 'COLON, biopsy:\n- CRYPT APOPTOSIS, possible GRAFT-VERSUS-HOST DISEASE.');
});

test('CMV, other viral change and a typed diagnosis print as lines of their own', () => {
  assert.equal(dx({ site: 'Transverse colon', apoptosis: 'Numerous', cmv: 'Positive, near the apoptotic cells', nih: 'Possible GVHD', differential: ['CMV-related injury'] }),
    'TRANSVERSE COLON, biopsy:\n- CRYPT APOPTOSIS, possible GRAFT-VERSUS-HOST DISEASE (please see description).\n- CYTOMEGALOVIRUS COLITIS.');
  assert.match(dx({ site: 'Stomach', viral: 'Cytomegalovirus inclusions', nih: 'Not GVHD' }), /- NO EVIDENCE OF GRAFT-VERSUS-HOST DISEASE\.\n- CYTOMEGALOVIRUS GASTRITIS\.$/);
  assert.match(dx({ site: 'Rectum', cmv: 'Positive, away from the apoptotic cells', apoptosis: 'Numerous' }), /- CYTOMEGALOVIRUS PROCTITIS\.$/);
  assert.match(dx({ site: 'Ileum', viral: 'Cytomegalovirus inclusions', apoptosis: 'Numerous' }), /- CYTOMEGALOVIRUS ENTERITIS\.$/);
  assert.match(dx({ viral: 'Other viral cytopathic change', apoptosis: 'Numerous' }), /- VIRAL CYTOPATHIC CHANGE\.$/);
  assert.match(dx({ site: 'Stomach', nih: 'Not GVHD', extraDx: 'MILD CHRONIC INACTIVE GASTRITIS' }), /- NO EVIDENCE OF GRAFT-VERSUS-HOST DISEASE\.\n- MILD CHRONIC INACTIVE GASTRITIS\.$/);
  assert.match(run({ cmv: 'Positive, away from the apoptotic cells' }).microscopy, /highlights infected cells, which are not associated with the apoptotic epithelial cells\./);
});

test('the differential reads as one sentence', () => {
  assert.equal(differentialOf({ differential: ['CMV-related injury', 'Mycophenolate effect'] }), 'cytomegalovirus-related injury and mycophenolate-related injury');
  assert.equal(differentialOf({ differential: ['Other drug effect'] }), 'drug-related injury');
  assert.equal(differentialOf({ differential: ['Mycophenolate effect', 'Other drug effect', 'Conditioning effect'], differentialOther: 'adenovirus infection' }),
    'mycophenolate-related injury, other drug-related injury, injury from the conditioning regimen and adenovirus infection');
  assert.match(run({ apoptosis: 'Numerous', nih: 'Possible GVHD', differential: ['Mycophenolate effect'] }).microscopy, /The overall features may represent graft-versus-host disease\. The differential diagnosis includes mycophenolate-related injury\./);
});

test('gut grade: crypt loss sets 2 to 4, apoptosis alone 1; upper GI and mouth are not graded', () => {
  assert.equal(autoGrade({ site: 'Sigmoid colon', apoptosis: 'Isolated' }), '1');
  assert.equal(autoGrade({ site: 'Sigmoid colon', apoptosis: 'Exploding crypts' }), '1');
  assert.equal(autoGrade({ site: 'Duodenum', apoptosis: 'Numerous', cryptLoss: 'Individual crypts' }), '2');
  assert.equal(autoGrade({ site: 'Rectum', cryptLoss: 'Contiguous crypts' }), '3');
  assert.equal(autoGrade({ site: 'Colon', cryptLoss: 'Extensive, with denudation' }), '4');
  assert.equal(autoGrade({ site: 'Colon', apoptosis: 'None seen' }), '');
  assert.equal(gradeOf({ site: 'Stomach', apoptosis: 'Numerous' }), '');
  assert.equal(gradeOf({ site: 'Oesophagus', apoptosis: 'Numerous', grade: '2' }), '');
  assert.equal(gradeOf({ site: 'Colon', apoptosis: 'Numerous', grade: '3' }), '3');
});

test('specimen lines: the site, its detail in lower case, the procedure; letters for several parts', () => {
  assert.equal(run({ site: 'Buccal mucosa', detail: 'Left', procedure: 'Punch biopsy' }).specimens, 'Buccal mucosa, left, punch biopsy');
  assert.equal(run({ site: OTHER_SITE, siteOther: 'ileal pouch', region: 'Small bowel' }).specimens, 'Ileal pouch, biopsy');
  const c = createCase(schema, 2);
  c.parts[0].values = { ...c.parts[0].values, site: 'Duodenum', nih: 'Not GVHD' };
  c.parts[1].values = { ...c.parts[1].values, site: 'Sigmoid colon', apoptosis: 'Numerous' };
  const r = generate(schema, t.generator, c);
  assert.equal(r.specimens, '(A) Duodenum, biopsy\n(B) Sigmoid colon, biopsy');
  assert.equal(r.diagnosis, '(A) DUODENUM, biopsy:\n- NO EVIDENCE OF GRAFT-VERSUS-HOST DISEASE.\n\n(B) SIGMOID COLON, biopsy:\n- CRYPT APOPTOSIS, likely GRAFT-VERSUS-HOST DISEASE (grade 1).');
  assert.match(r.microscopy, /^\(A\) Serial sections show pieces of duodenal mucosa\./);
});

// ---------- checks ----------

test('checks: NIH criteria, superficial apoptosis, CMV, eosinophils with mycophenolate', () => {
  assert.deepEqual(checksOf(run({ apoptosis: 'None seen', cmv: 'Negative' })), [['warn', 'apoptosis']]);
  assert.deepEqual(checksOf(run({ site: 'Lip', nih: 'Likely GVHD' })), [['warn', 'oralFeatures']], 'no salivary glands recorded, so no lobule note');
  assert.deepEqual(checksOf(run({ site: 'Lip', nih: 'Likely GVHD', salivary: 'Included' })), [['warn', 'oralFeatures'], ['info', 'lobules']]);
  assert.deepEqual(checksOf(run({ apoptosis: 'Numerous', cmv: 'Negative', nih: 'Possible GVHD' })), [['info', 'differential']]);
  assert.deepEqual(checksOf(run({ superficial: true, nih: 'Possible GVHD', differential: ['Other drug effect'], cmv: 'Negative' })), [['warn', 'superficial']]);
  assert.deepEqual(checksOf(run({ apoptosis: 'Numerous', cmv: 'Positive, near the apoptotic cells' })), [['warn', 'cmv']]);
  assert.deepEqual(checksOf(run({ apoptosis: 'Numerous', cmv: 'Positive, away from the apoptotic cells' })), []);
  assert.deepEqual(checksOf(run({ apoptosis: 'Numerous' })), [['info', 'cmv']], 'no CMV stain recorded');
  assert.deepEqual(checksOf(run({ apoptosis: 'Numerous', cmv: 'Negative', eosinophils: 'Increased' })), [['info', 'eosinophils']]);
  assert.deepEqual(checksOf(run({ apoptosis: 'Numerous', cmv: 'Negative', eosinophils: 'Increased' }, history('post allo-HSCT, on MMF and tacrolimus'))), [['warn', 'eosinophils']]);
  assert.deepEqual(checksOf(run({ apoptosis: 'Numerous', cmv: 'Negative', eosinophils: 'Increased' }, { mmf: 'Yes' })), [['warn', 'eosinophils']]);
  assert.deepEqual(checksOf(run({ apoptosis: 'Numerous', cmv: 'Negative', eosinophils: 'Increased' }, { mmf: 'No', ...history('MMF') })), [['info', 'eosinophils']]);
});

test('checks: salivary lobules, phase, the 20-day window, a chosen grade, serial sections', () => {
  const lip = { site: 'Lip', oralFeatures: ['Lichenoid interface inflammation'], salivary: 'Included', salivaryFeatures: ['Periductal lymphocytic inflammation'] };
  assert.deepEqual(checksOf(run({ ...lip, lobules: '3' })), [['warn', 'lobules']]);
  assert.deepEqual(checksOf(run({ ...lip, lobules: '7' })), []);
  assert.deepEqual(checksOf(run({ ...lip, lobules: '7', phase: 'Acute' })), [['warn', 'phase']]);
  assert.deepEqual(checksOf(run({ site: 'Tongue', oralFeatures: ['Lichenoid interface inflammation'], phase: 'Chronic' })), [['info', 'phase']]);
  assert.deepEqual(checksOf(run({ apoptosis: 'Numerous', cmv: 'Negative', phase: 'Chronic' })), [['info', 'phase']]);
  assert.deepEqual(checksOf(run({ apoptosis: 'Numerous', cmv: 'Negative' }, history('Day +14 post allo-HSCT, diarrhoea'))), [['warn', 'nih']]);
  assert.deepEqual(checksOf(run({ apoptosis: 'Numerous', cmv: 'Negative' }, { transplantDay: '45', ...history('Day +14') })), []);
  assert.deepEqual(checksOf(run({ nih: 'Not GVHD' }, history('D+10 post BMT'))), []);
  assert.deepEqual(checksOf(run({ apoptosis: 'Numerous', cmv: 'Negative', grade: '3' })), [['warn', 'grade']]);
  assert.deepEqual(checksOf(run({ apoptosis: 'Numerous', cmv: 'Negative', sections: '4' })), [['info', 'sections']]);
  assert.deepEqual(checksOf(run({ site: OTHER_SITE, apoptosis: 'Numerous', cmv: 'Negative' })), [['error', 'siteOther']]);
});

test('the history readers: day after the transplant and mycophenolate', () => {
  assert.equal(transplantDayOf({ meta: { clinical: 'post allo-HSCT day +32, diarrhoea' } }), 32);
  assert.equal(transplantDayOf({ meta: { clinical: 'D+100 BMT' } }), 100);
  assert.equal(transplantDayOf({ meta: { clinical: '18 days post transplant' } }), 18);
  assert.equal(transplantDayOf({ meta: { clinical: 'duodenum D2 ?GVHD' } }), null);
  assert.equal(transplantDayOf({ transplantDay: 'Day +12' }), 12);
  assert.equal(mmfOf({ meta: { clinical: 'on mycophenolate mofetil' } }), true);
  assert.equal(mmfOf({ meta: { clinical: 'on ciclosporin' } }), false);
});

// ---------- intake ----------

test('routing: a GI or oral line with GVHD or a transplant in the line or history opens this form', () => {
  assert.equal(route('Sigmoid colon, biopsy', 'BMT, diarrhoea ?GVHD').templateId, 'gvhd_biopsy');
  assert.equal(route('Sigmoid colon, biopsy', 'BMT, diarrhoea ?GVHD').tier, 'confident');
  for (const [line, hist] of [
    ['Duodenum, D2, biopsy', 'post allo-HSCT day +45, diarrhoea'], ['Stomach, antrum, biopsy', '?upper GI GVHD'], ['Oesophagus, biopsy', 'post-BMT dysphagia'],
    ['Terminal ileum, biopsy', 'aGVHD?'], ['Colon, random biopsies', 'post stem cell transplant, diarrhoea'], ['Rectum, biopsy', 'cGVHD'],
    ['Lower lip, biopsy', '?chronic GVHD'], ['Left buccal mucosa, biopsy', 'lichenoid change, post-HSCT'], ['Hard palate, biopsy', 'GvHD'],
    ['Minor salivary gland, biopsy', 'cGVHD?'], ['Sigmoid colon, biopsy ?GVHD', '']
  ]) {
    const m = route(line, hist);
    assert.deepEqual([m.templateId, m.tier], ['gvhd_biopsy', 'confident'], `${line} | ${hist}`);
  }
});

test('routing: without a GVHD or transplant word, and for polyps, dysplasia, skin and liver, the line goes where it went', () => {
  assert.notEqual(route('Sigmoid colon, biopsy', 'diarrhoea').templateId, 'gvhd_biopsy');
  assert.notEqual(route('Sigmoid colon, biopsy').templateId, 'gvhd_biopsy');
  assert.notEqual(route('Ascending colon, biopsy', 'liver transplant, diarrhoea').templateId, 'gvhd_biopsy');
  assert.equal(route('Buccal mucosa, biopsy', 'lichen planus?').templateId, 'oral_biopsy');
  assert.equal(route('Sigmoid colon polyp, polypectomy', 'post BMT').templateId, 'colonic_polyp');
  assert.equal(route('Tongue, leukoplakia, biopsy', 'cGVHD').templateId, 'oral_biopsy');
  assert.equal(route('Skin, back, punch biopsy', 'post allo-HSCT, rash ?GVHD').templateId, 'skin_inflammatory');
  assert.notEqual(route('Liver, biopsy', '?GVHD').templateId, 'gvhd_biopsy');
});

test('presets: the site, its detail, the procedure and minor salivary glands from the line', () => {
  assert.deepEqual(preset('Sigmoid colon, biopsy', 'BMT, diarrhoea ?GVHD'), { site: 'Sigmoid colon' });
  assert.deepEqual(preset('Duodenum, D2, biopsy', 'post allo-HSCT'), { site: 'Duodenum', detail: 'D2' });
  assert.deepEqual(preset('Stomach, antrum, biopsy', '?GVHD'), { site: 'Gastric antrum' });
  assert.deepEqual(preset('Lower lip, biopsy', '?chronic GVHD'), { site: 'Lip', detail: 'Lower', salivary: 'Included' });
  assert.deepEqual(preset('Left buccal mucosa, punch biopsy', 'post-HSCT'), { site: 'Buccal mucosa', detail: 'Left', procedure: 'Punch biopsy' });
  assert.deepEqual(preset('Hepatic flexure, biopsy', '?GVHD'), { site: 'Hepatic flexure' });
  // The question and the transplant on the line itself are not part of the site detail.
  assert.deepEqual(preset('Sigmoid colon, biopsy ?acute GVHD'), { site: 'Sigmoid colon' });
  assert.deepEqual(preset('Sigmoid colon biopsy, ?graft versus host disease'), { site: 'Sigmoid colon' });
  assert.deepEqual(preset('Duodenum, biopsy (post allo-HSCT)'), { site: 'Duodenum' });
  assert.deepEqual(preset('Buccal mucosa, biopsy, query chronic GVHD'), { site: 'Buccal mucosa' });
  assert.deepEqual(preset('Colon, random biopsies, r/o GVHD'), { site: 'Colon', detail: 'Random' });
});

// ---------- golden fixtures ----------

const CASES = [
  ['01-likely-gvhd-colon-grade-2', {
    site: 'Sigmoid colon', pieces: '2', sections: '10', apoptosis: 'At least one per piece', cryptLoss: 'Individual crypts',
    cryptChanges: ['Withering', 'Regenerative epithelial changes'], laminaPropria: 'Sparse', eosinophils: 'Inconspicuous', cmv: 'Negative', nih: 'Likely GVHD' }],
  ['02-possible-gvhd-with-cmv', {
    site: 'Transverse colon', pieces: '3', apoptosis: 'Numerous', cryptChanges: ['Regenerative epithelial changes'], gutFeatures: ['Erosion'], laminaPropria: 'Moderate',
    eosinophils: 'Inconspicuous', viral: 'Cytomegalovirus inclusions', cmv: 'Positive, near the apoptotic cells', nih: 'Possible GVHD', differential: ['CMV-related injury'] }],
  ['03-no-gvhd-duodenum', {
    site: 'Duodenum', detail: 'D2', pieces: '4', sections: '8', apoptosis: 'None seen', paneth: 'Preserved', laminaPropria: 'Sparse', eosinophils: 'Inconspicuous',
    cmv: 'Negative', nih: 'Not GVHD' }],
  ['04-chronic-gvhd-lip-minor-salivary', {
    site: 'Lip', detail: 'lower', pieces: '1', oralFeatures: ['Lichenoid interface inflammation', 'Lymphocytic exocytosis', 'Apoptotic keratinocytes', 'Satellitosis'],
    salivary: 'Included', lobules: '6', salivaryFeatures: ['Periductal lymphocytic inflammation', 'Plasma cells in the infiltrate', 'Exocytosis into ducts', 'Exocytosis into acini', 'Acinar loss', 'Periductal fibrosis'],
    nih: 'Likely GVHD' }]
];

test('golden fixtures reproduce byte-for-byte', () => {
  fs.mkdirSync(FIX, { recursive: true });
  for (const [name, values] of CASES) {
    const out = run(values);
    const file = path.join(FIX, `${name}.json`);
    const current = { templateId: 'gvhd_biopsy', values, report: out.report, checks: out.issues };
    if (UPDATE || !fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n'); continue; }
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(out.report, saved.report, `${file} changed; re-run with --update only after a deliberate wording change`);
    assert.deepEqual(out.issues, saved.checks, `${file} checks changed`);
  }
});
