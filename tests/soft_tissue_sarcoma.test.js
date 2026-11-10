// Soft tissue sarcoma resection - Phase 84 (10 November 2026, user request: "make sure liposarcoma is included").
// Its own form (Soft tissue, "Sarcoma"), in the QMH MS-Soft tissue sarcoma element order, with the CAP Soft Tissue
// 4.2.0.0 options and the ICCR dataset, graded on FNCLCC and staged on the AJCC 8th edition (AJCC has no version 9
// soft tissue chapter). Sources: docs/reference/soft-tissue-sources.md. Grade and stage: tests/staging_softtissue.test.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTemplate, loadManifest } from '../src/registry.js';
import { createCase, generate } from '../src/engine.js';
import { parseIntake, matchParts, presetValues } from '../src/intake.js';
import * as gen from '../generators/soft_tissue_sarcoma.js';
import { UPGRADE_TO, cmToMm } from '../generators/softtissue.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const FIX = path.join(here, 'fixtures', 'soft_tissue_sarcoma');
const UPDATE = process.env.UPDATE_FIXTURES === '1';
const { schema } = await loadTemplate('soft_tissue_sarcoma');
const manifest = await loadManifest();
const field = (id) => schema.fields.find((f) => f.id === id);
const EXAMPLE = schema.example.parts[0].values;
const OPTIONS = schema.example.options;
const runParts = (list, options = {}) => {
  const c = createCase(schema, list.length);
  c.options = { ...c.options, ...OPTIONS, includeHeader: false, ...options };
  list.forEach((v, i) => { c.parts[i].values = { ...c.parts[i].values, ...v }; });
  return generate(schema, gen, c);
};
const run = (values = {}, options = {}) => runParts([{ ...EXAMPLE, ...values }], options);
const para = (r) => (r.report.match(/- Tumour histology:\n {2}(.*)/) || [])[1] || '';
const messages = (r) => r.issues.map((i) => i.message).join(' | ');
const warnings = (r) => r.issues.filter((i) => i.level !== 'info');
// The report with wrapped lines joined, so a test reads a row whole.
const flat = (r) => r.report.replace(/\n {2,}(?!- )/g, ' ');
const route = (line, history = '') => matchParts(parseIntake(line), history, manifest)[0];
const preset = (line, history = '') => {
  const parsed = parseIntake(line);
  return presetValues(schema, parsed.parts[0], matchParts(parsed, history, manifest)[0]);
};
const LOW = { mitoticCount: '1', necrosis: 'No tumour necrosis', necrosisPct: '' };
const ALT = 'Atypical lipomatous tumour';
const WDLPS = 'Well-differentiated liposarcoma';
const DDLPS = 'Dedifferentiated liposarcoma';
const MLPS = 'Myxoid liposarcoma';
const RP = { siteGroup: 'Retroperitoneum', site: 'left retroperitoneum', depth: [], fascialEnvelope: 'Not applicable' };

// ---------- the form ----------

test('sarcoma: the form, its place in the menus, and the retired placeholder', () => {
  const entry = manifest.find((t) => t.id === 'soft_tissue_sarcoma');
  assert.ok(entry, 'listed in the manifest');
  assert.equal(entry.kind, 'cancer resection');
  assert.equal(schema.label, 'Sarcoma');
  assert.equal(schema.system, 'Soft tissue');
  assert.equal(schema.kind, 'cancer resection');
  const planned = JSON.parse(fs.readFileSync(path.join(root, 'templates/planned.json'), 'utf8'));
  assert.ok(!JSON.stringify(planned).includes('"soft_tissue_sarcoma"'), 'the planned placeholder is retired');
  // Liposarcoma (the user's request): every WHO 5th edition liposarcoma type CAP lists, ALT and WDLPS apart.
  const types = field('histType').options;
  for (const t of [ALT, WDLPS, DDLPS, MLPS, 'Pleomorphic liposarcoma, NOS', 'Epithelioid pleomorphic liposarcoma', 'Myxoid pleomorphic liposarcoma']) assert.ok(types.includes(t), t);
  assert.deepEqual(field('mdm2').options, ['Not performed', 'Amplification detected', 'No amplification detected', 'Pending']);
  assert.ok(field('ddit3').options.includes('FUS::DDIT3 fusion detected'));
  // The liposarcoma rows show for their type only.
  assert.deepEqual(field('wdComponent').showIf, { field: 'histType', is: DDLPS });
  assert.deepEqual(field('hypercellularPct').showIf, { field: 'histType', is: MLPS });
  assert.deepEqual(field('procedure').options, ['Excisional biopsy', 'Intralesional resection', 'Marginal resection', 'Wide resection', 'Radical resection', 'Other (specify)', 'Not specified']);
});

// ---------- the example ----------

test('sarcoma: the example prints the macroscopy, the synoptic and the diagnosis', () => {
  const r = run({}, { includeHeader: true });
  assert.match(r.report, /Received in formalin is a wide excision specimen from the right thigh, measuring 160 x 110 x 80 mm\. The specimen is oriented \(long stitch proximal, short stitch superficial\)\. Sectioning shows a fleshy, necrotic tumour measuring 110 x 70 x 60 mm, 2 mm from the closest \(deep\) margin\. Representative sections are taken in 9 blocks\./);
  assert.match(r.report, /\(1-6\) Tumour\.\n\(7\) Deep margin\.\n\(8\) Proximal margin\.\n\(9\) Distal margin\./);
  assert.match(r.report, /Specimen and tumour\n- Procedure: Wide resection\n- Tumour site: Trunk and extremities \(right thigh\)\n- Tumour size: 110 x 70 x 60 mm \(greatest dimension 110 mm\)\n- Tumour focality: Unifocal\n- Tumour depth: Skeletal muscle, intramuscular\n/);
  assert.match(r.report, /- Histologic type: Undifferentiated pleomorphic sarcoma\n- Tumour histology:\n {2}Sections show an undifferentiated pleomorphic sarcoma\./);
  assert.match(para(r), /The tumour cells are negative for MDM2, desmin, S100 and SOX10\.$/, 'microscopy and immunohistochemistry in one paragraph');
  assert.match(r.report, /- Histologic grade \(FNCLCC grading\): Grade 3 \(score 6 to 8, high grade\)\n {2}- Tumour differentiation: Undifferentiated \(spindle cell and pleomorphic\)\n {4}sarcoma \(score 3\)\n {2}- Mitotic rate: 32 mitoses per 10 HPF, 22 mm eyepiece \(score 3\)\n {2}- Tumour necrosis: 30% \(score 1\)\n/);
  assert.match(r.report, /- Surgical margin: Uninvolved by tumour \(closest 2\.2 mm, deep margin\)\n {2}- Deep margin: Clear by 2\.2 mm \(block 7\)\n {2}- Proximal margin: Clear by 25 mm \(block 8\)\n {2}- Distal margin: Clear by >20 mm \(block 9\)\n {2}- Intact fascial envelope \/ fibrous pseudocapsule at the closest margin:\n {4}Present\n/);
  assert.match(r.report, /Pathological stage \(AJCC 8th edition\)\n- pTNM: pT3\n/);
  assert.match(r.report, /\nMOLECULAR FINDINGS:\nAncillary studies\n- MDM2 amplification \(FISH\): No amplification detected\n/);
  assert.match(r.report, /SOFT TISSUE, right thigh tumour, wide excision:\n- UNDIFFERENTIATED PLEOMORPHIC SARCOMA,\n- FNCLCC Grade 3,\n- Resection margins clear\.$/);
  assert.doesNotMatch(r.report, /Lymph nodes\n|Distant metastasis\n/, 'no node examined and no metastasis: the sections are left out');
  assert.deepEqual(warnings(r), []);
  assert.equal(messages(r), 'Stage group, AJCC 8th edition (reference, not reported): IIIB (no node examined: N0, as CAP directs)');
});

test('sarcoma: two parts are lettered in each section', () => {
  const r = runParts([EXAMPLE, { ...EXAMPLE, site: 'left thigh', histType: MLPS, hypercellularPct: '0', ...LOW, mdm2: 'Not performed', ddit3: 'FUS::DDIT3 fusion detected' }]);
  assert.match(r.report, /^\(A\) Right thigh tumour, wide excision\n\(B\) Left thigh tumour, wide excision\n/);
  assert.match(r.report, /\n\(A1-6\) Tumour\.\n/);
  assert.match(r.report, /\n\(B\) Left thigh tumour, wide excision\nSpecimen and tumour\n/);
  assert.match(r.report, /\n\(B\)\nAncillary studies\n- DDIT3 \/ FUS rearrangement \(FISH\): FUS::DDIT3 fusion detected\n/);
  assert.match(r.report, /\n\(B\) SOFT TISSUE, left thigh tumour, wide excision:\n- MYXOID LIPOSARCOMA,\n- FNCLCC Grade 1,\n/);
  assert.match(r.report, /- Hypercellular \(round cell\) areas: Not identified\n/);
  assert.match(r.report, /No hypercellular \(round cell\) areas are seen\./);
});

// ---------- grade ----------

test('sarcoma: FNCLCC rows, the per mm2 unit, not graded, high grade by definition and GX', () => {
  assert.match(run({ mitoticCount: '1' }).report, /- Mitotic rate: 1 mitosis per 10 HPF, 22 mm eyepiece \(score 1\)\n/);
  const mm2 = run({ mitoticCount: '6', mitoticUnit: 'per mm²' });
  assert.match(mm2.report, /- Mitotic rate: 6 mitoses per mm2 \(score 2\)\n/);
  assert.match(messages(mm2), /Mitotic count 6 per mm2 sits near a cut-off between mitotic scores\. CAP: "If the mitotic rate is close to the cutoff between mitotic scores, the count should be repeated\."/);
  assert.match(messages(run({ mitoticCount: '28' })), /Mitotic count 28 per 10 HPF, 22 mm eyepiece sits near a cut-off/);
  assert.doesNotMatch(messages(run({ mitoticCount: '20' })), /near a cut-off/);
  const lms = run({ histType: 'Leiomyosarcoma', mitoticCount: '15', necrosis: 'No tumour necrosis', necrosisPct: '' });
  assert.match(lms.report, /- Tumour differentiation: Conventional leiomyosarcoma \(score 2\)\n {2}- Mitotic rate: 15 mitoses per 10 HPF, 22 mm eyepiece \(score 2\)\n {2}- Tumour necrosis: Not identified \(score 0\)\n/);
  assert.match(lms.report, /- FNCLCC Grade 2,/);
  // Angiosarcoma (CAP, Note G) and solitary fibrous tumour take no grade; the diagnosis gives none.
  const angio = run({ histType: 'Angiosarcoma, NOS' });
  assert.match(angio.report, /- Histologic grade \(FNCLCC grading\): Not graded \(not applicable for this tumour\n {2}type\)\n- Lymphovascular/);
  assert.match(angio.report, /- ANGIOSARCOMA,\n- Resection margins clear\.$/);
  assert.match(messages(angio), /CAP \(Note G\): "Grade is not used for angiosarcoma/);
  assert.match(messages(run({ histType: 'Solitary fibrous tumour' })), /solitary fibrous tumours "are best categorized by risk stratification parameters"/);
  const arms = run({ histType: 'Alveolar rhabdomyosarcoma' });
  assert.match(arms.report, /- Histologic grade \(FNCLCC grading\): Not graded \(high grade by definition\)\n/);
  assert.match(messages(arms), /IIIB/, 'the stage group reads it as high grade');
  const gx = run({ gradeMode: 'Cannot be assessed (GX)' });
  assert.match(gx.report, /- Histologic grade \(FNCLCC grading\): Cannot be assessed \(GX\)\n- Lymphovascular/);
  assert.doesNotMatch(gx.report, /FNCLCC Grade/);
  assert.match(messages(run({ histType: 'Malignant peripheral nerve sheath tumour, NOS' })), /"The prognostic significance of FNCLCC grading in malignant peripheral nerve sheath tumor is unclear\."/);
});

test('sarcoma: an incomplete grade is left out with a warning; a necrosis percentage that disagrees is flagged', () => {
  const r = run({ mitoticCount: '' });
  assert.doesNotMatch(r.report, /Histologic grade|FNCLCC Grade/);
  assert.match(messages(r), /FNCLCC grade incomplete: mitotic count not recorded, so the grade row is left out\./);
  assert.match(messages(r), /not assignable - the FNCLCC grade is needed/);
  const n = run({ necrosisPct: '60' });
  assert.match(n.report, /- Tumour necrosis: Less than 50% \(score 1\)\n/, 'the option picked gives the score');
  assert.match(messages(n), /Tumour necrosis: 60% is typed but "Less than 50% tumour necrosis" is picked/);
  const ehe = run({ histType: 'Epithelioid haemangioendothelioma, NOS' });
  assert.match(messages(ehe), /No FNCLCC differentiation score is set for epithelioid haemangioendothelioma, NOS/);
});

test('sarcoma: preresection therapy prints yp, the treatment effect and the CAP grading caveat', () => {
  const r = run({ preresection: ['Radiation therapy performed'], treatmentEffect: 'Present', viablePct: '10', treatmentFeatures: ['Geographic necrosis', 'Fibrosis'] });
  assert.match(r.report, /- pTNM: ypT3\n/);
  assert.match(flat(r), /- Treatment effect: Present \(10% viable tumour/);
  assert.match(messages(r), /CAP notes that an adequate sample for accurate grading "is not always available \.\.\. in tumors previously treated with radiation or chemotherapy" \(Note G\), and "In problematic cases, the grade of the pretreatment specimen \(if available\) should take precedence" \(Note D\)\./);
  assert.match(messages(run({ preresection: ['Chemotherapy performed'] })), /Preresection therapy is recorded \(yp\): record the treatment effect\./);
  assert.match(messages(run({ preresection: ['Chemotherapy performed'], treatmentEffect: 'Present' })), /Treatment effect present: record the percentage of viable tumour \(QMH\)\./);
  assert.match(messages(run({ treatmentEffect: 'Present', viablePct: '30' })), /A treatment effect is recorded but no preresection therapy/);
  assert.doesNotMatch(messages(run({ preresection: ['Chemotherapy performed'], gradeMode: 'Cannot be assessed (GX)', treatmentEffect: 'Not identified' })), /adequate sample for accurate grading/, 'no caveat without an FNCLCC grade');
});

// ---------- liposarcoma ----------

test('liposarcoma: dedifferentiated liposarcoma rows, paragraph and diagnosis (the user\'s wording)', () => {
  const r = run({ ...RP, histType: DDLPS, wdComponent: 'Present', dedifSizeMm: '60', heterologous: 'Present (specify)', heterologousType: 'rhabdomyoblastic', mitoticCount: '23', mdm2: 'Amplification detected' });
  assert.match(r.report, /- Tumour site: Retroperitoneum \(left\)\n/);
  assert.match(r.report, /- Histologic type: Dedifferentiated liposarcoma\n {2}- Well-differentiated component: Present\n {2}- Dedifferentiated component, size: 60 mm\n {2}- Heterologous differentiation: Present \(rhabdomyoblastic\)\n/);
  assert.match(para(r), /The dedifferentiated liposarcoma is surrounded by well-differentiated liposarcoma, comprising adipocytes that vary in size, separated by fibrous septa containing atypical stromal cells with hyperchromatic nuclei\. Heterologous rhabdomyoblastic differentiation is present\./);
  assert.match(r.report, /- Tumour differentiation: Dedifferentiated liposarcoma \(score 3\)\n/);
  assert.match(r.report, /\nLeft RETROPERITONEAL tumour, wide excision:\n- DEDIFFERENTIATED LIPOSARCOMA arising from adjacent WELL DIFFERENTIATED\n {2}LIPOSARCOMA,\n- FNCLCC Grade 3,\n/);
  assert.match(r.report, /- MDM2 amplification \(FISH\): Amplification detected\n/);
  assert.deepEqual(warnings(r), []);
  assert.match(messages(run({ ...RP, histType: DDLPS, mdm2: 'Amplification detected' })), /Dedifferentiated liposarcoma: record whether a well-differentiated component is present\./);
});

test('liposarcoma: the retroperitoneal specimen reads as the user writes it', () => {
  const v = { ...EXAMPLE, ...RP, procedure: 'Marginal resection' };
  assert.equal(gen.specimenName({ values: v }), 'Left retroperitoneal tumour, excision');
  assert.equal(gen.diagnosisHead(v), 'Left RETROPERITONEAL tumour, excision');
  assert.equal(gen.siteValue(v), 'Retroperitoneum (left)');
  assert.equal(gen.diagnosisHead({ ...v, site: 'retroperitoneum, para-aortic' }), 'RETROPERITONEAL tumour, para-aortic, excision');
  assert.equal(gen.diagnosisHead({ ...v, specimenName: 'Retroperitoneal mass, excision' }), 'RETROPERITONEAL mass, excision', 'a typed name opening with the organ word is not given it twice');
});

test('liposarcoma: myxoid liposarcoma over 5% hypercellular is high grade (WHO 5th edition); DDIT3 / FUS checks', () => {
  const hi = run({ histType: MLPS, hypercellularPct: '10', mitoticCount: '3', necrosis: 'No tumour necrosis', necrosisPct: '', mdm2: 'Not performed', ddit3: 'DDIT3 rearrangement detected' });
  assert.match(hi.report, /- Tumour differentiation: High-grade myxoid \(round cell\) liposarcoma \(score 3\)\n/);
  assert.match(hi.report, /- Histologic grade \(FNCLCC grading\): Grade 2 \(score 4 or 5, high grade\)\n/);
  assert.match(hi.report, /- MYXOID LIPOSARCOMA with 10% hypercellular \(round cell\) areas,\n- FNCLCC Grade 2,/);
  assert.match(para(hi), /Hypercellular \(round cell\) areas account for about 10% of the tumour\./);
  assert.match(hi.report, /- DDIT3 \/ FUS rearrangement \(FISH\): DDIT3 rearrangement detected\n/);
  assert.deepEqual(warnings(hi), []);
  const lo = run({ histType: MLPS, hypercellularPct: '3', ...LOW, mdm2: 'Not performed' });
  assert.match(lo.report, /- Tumour differentiation: Myxoid liposarcoma \(score 2\)\n/);
  assert.match(messages(lo), /DDIT3 \/ FUS FISH not recorded: CAP \(Note D, Table 1\) gives a FUS\/EWSR1::DDIT3 fusion for myxoid liposarcoma\./);
  assert.match(messages(run({ histType: MLPS, ...LOW })), /Myxoid liposarcoma: record the percentage of hypercellular \(round cell\) areas \(CAP\)\. The WHO 5th edition makes the tumour high grade when they exceed 5%/);
  assert.match(messages(run({ histType: MLPS, hypercellularPct: '0', ...LOW, ddit3: 'No DDIT3 or FUS rearrangement detected' })), /No DDIT3 or FUS rearrangement in a myxoid liposarcoma: review the type\./);
});

test('liposarcoma: MDM2 checks (CAP, Note D, Table 1; WHO 5th edition)', () => {
  assert.match(messages(run({ histType: ALT, depth: ['Subcutis'], ...LOW, mdm2: 'Not performed' })), /MDM2 FISH not recorded: CAP \(Note D, Table 1\) gives MDM2 amplification for atypical lipomatous tumour \/ well-differentiated liposarcoma and for dedifferentiated liposarcoma\./);
  const neg = run({ histType: WDLPS, site: 'left groin', depth: ['Subcutis'], ...LOW, mdm2: 'No amplification detected' });
  assert.match(messages(neg), /MDM2 is not amplified, which does not support this liposarcoma type\. Review the type\./);
  const plps = run({ histType: 'Pleomorphic liposarcoma, NOS', mdm2: 'Amplification detected' });
  assert.match(messages(plps), /Pleomorphic liposarcoma with MDM2 amplification: .*pleomorphic liposarcoma has no characteristic genomic aberration \(WHO 5th edition\)\. Review the type\./);
  assert.match(plps.report, /- PLEOMORPHIC LIPOSARCOMA,\n/);
  assert.doesNotMatch(messages(run({})), /MDM2/, 'an undifferentiated pleomorphic sarcoma without amplification is silent');
});

test('liposarcoma: atypical lipomatous tumour or well-differentiated liposarcoma by site and depth (CAP, Note D)', () => {
  const lipo = (values) => run({ ...LOW, mdm2: 'Amplification detected', ...values });
  const NOTE_D_WD = /CAP \(Note D\): well-differentiated liposarcoma "has been used for groin\/retroperitoneum and deep skeletal muscle tumors"\. At this site, consider well-differentiated liposarcoma as the type\./;
  // At the retroperitoneum, groin, mediastinum or spermatic cord, ALT is a warning.
  const rp = lipo({ ...RP, histType: ALT });
  assert.match(messages(rp), NOTE_D_WD);
  assert.equal(rp.issues.find((i) => NOTE_D_WD.test(i.message)).level, 'warn');
  for (const site of ['left groin', 'right inguinal region', 'anterior mediastinum', 'left spermatic cord']) assert.match(messages(lipo({ histType: ALT, site, depth: ['Subcutis'] })), NOTE_D_WD, site);
  // A deep limb tumour is a note only: the user's own reports name an intramuscular thigh tumour ALT.
  const im = lipo({ histType: ALT });
  assert.match(messages(im), /well-differentiated liposarcoma "has been used for groin\/retroperitoneum and deep skeletal muscle tumors"; the depth ticked is skeletal muscle\./);
  assert.deepEqual(warnings(im), []);
  // WDLPS superficial in a limb is a warning; at the groin it is silent.
  const sc = lipo({ histType: WDLPS, depth: ['Subcutis'] });
  assert.match(messages(sc), /"atypical lipomatous tumor is preferred for superficial subcutaneous tumors with the same histology since these are generally cured by limited excision"\. Consider atypical lipomatous tumour as the type\./);
  assert.doesNotMatch(messages(lipo({ histType: WDLPS, site: 'left groin', depth: ['Subcutis'] })), /Note D/);
  assert.doesNotMatch(messages(lipo({ ...RP, histType: WDLPS })), /Note D/);
  // ALT superficial in a limb is silent; no depth ticked is a note.
  assert.doesNotMatch(messages(lipo({ histType: ALT, depth: ['Subcutis'] })), /Note D/);
  assert.match(messages(lipo({ histType: ALT, depth: [] })), /Tumour depth not ticked: CAP \(Note D\) names a superficial subcutaneous tumour atypical lipomatous tumour, and a groin, retroperitoneal or deep skeletal muscle tumour well-differentiated liposarcoma\./);
  // The diagnosis carries no grade for ALT or WDLPS (the user's form), and uses the user's spelling.
  assert.match(lipo({ histType: WDLPS, site: 'left groin', depth: ['Subcutis'] }).report, /- WELL DIFFERENTIATED LIPOSARCOMA,\n- Resection margins clear\.$/);
  assert.match(lipo({ histType: ALT, depth: ['Subcutis'] }).report, /- ATYPICAL LIPOMATOUS TUMOUR,\n- Resection margins clear\.$/);
});

test('liposarcoma: the WHO 6th edition (2026) changes show in Checks only', () => {
  const lowMit = run({ histType: DDLPS, mitoticCount: '3', mdm2: 'Amplification detected', wdComponent: 'Present' });
  assert.match(messages(lowMit), /WHO 6th edition \(2026\): dedifferentiation now needs a mitotic count of 5 or more per 10 HPF in a non-lipogenic area; at 3 per 10 HPF/);
  assert.match(lowMit.report, /- DEDIFFERENTIATED LIPOSARCOMA/, 'the report is not changed');
  assert.doesNotMatch(messages(run({ histType: DDLPS, mitoticCount: '3', mitoticUnit: 'per mm²', mdm2: 'Amplification detected', wdComponent: 'Present' })), /WHO 6th/, 'the threshold is per 10 HPF');
  assert.match(messages(run({ histType: ALT, depth: ['Subcutis'], mitoticCount: '6', necrosis: 'No tumour necrosis', necrosisPct: '', mdm2: 'Amplification detected' })), /a mitotic count of 5 or more per 10 HPF in a non-lipogenic area of an MDM2-amplified tumour defines dedifferentiated liposarcoma; at 6 per 10 HPF, consider dedifferentiation\./);
  assert.doesNotMatch(messages(run({ histType: ALT, depth: ['Subcutis'], mitoticCount: '4', necrosis: 'No tumour necrosis', necrosisPct: '', mdm2: 'Amplification detected' })), /WHO 6th/);
  const text = run({ ...RP, histType: WDLPS, mitoticCount: '2', necrosis: 'No tumour necrosis', necrosisPct: '', mdm2: 'Amplification detected', histologyNotes: 'Sections show a well-differentiated liposarcoma with areas of low-grade dedifferentiation.' });
  assert.match(messages(text), /WHO 6th edition \(2026\): "low-grade dedifferentiation" is no longer used/);
  assert.equal(para(text), 'Sections show a well-differentiated liposarcoma with areas of low-grade dedifferentiation.', 'typed histology replaces the paragraph');
});

// ---------- staging relevance (CAP, Note F) ----------

test('sarcoma: CAP Note F names the types and sites for which AJCC staging is not clinically relevant', () => {
  assert.match(messages(run({ histType: ALT, depth: ['Subcutis'], ...LOW, mdm2: 'Amplification detected' })), /CAP \(Note F\): AJCC staging is not considered clinically relevant for atypical lipomatous tumour; the pTNM still prints while the block is on\./);
  assert.match(messages(run({ ...RP, histType: 'Leiomyosarcoma' })), /AJCC staging is not considered clinically relevant for retroperitoneal leiomyosarcoma\./);
  assert.doesNotMatch(messages(run({ histType: 'Leiomyosarcoma' })), /Note F/);
  assert.match(messages(run({ histType: 'Embryonal rhabdomyosarcoma', siteGroup: 'Head and neck', site: 'left cheek', hnInvasion: 'No invasion of adjoining structures' })), /not considered clinically relevant for head and neck embryonal rhabdomyosarcoma\./);
  assert.match(messages(run({ histType: 'Epithelioid haemangioendothelioma, NOS', gradeMode: 'Not graded', siteGroup: 'Abdominal visceral organs', site: 'liver', visceralExtent: 'Multifocal (2 sites)', focality: 'Multifocal', focalityDetail: 'two nodules' })), /multifocal epithelioid haemangioendothelioma of the abdominal and thoracic cavities\./);
  for (const t of [DDLPS, MLPS, 'Synovial sarcoma', 'Myxofibrosarcoma']) assert.doesNotMatch(messages(run({ histType: t })), /Note F/, t);
});

// ---------- margins, nodes, metastasis and pTNM ----------

test('sarcoma: margins, one per line, summarised in the row and the diagnosis', () => {
  const inv = run({ marginsText: 'Deep: involved (block 7)\nProximal: 25 (block 8)\nDistal: >20 (block 9)' });
  assert.match(inv.report, /- Surgical margin: Involved by tumour \(deep margin\)\n {2}- Deep margin: Involved \(block 7\)\n/);
  assert.match(inv.report, /- Deep margin involved\.$/);
  const near = run({ marginsText: 'Deep: <1 (blocks 7, 8)\nProximal: 25 (8)', fascialEnvelope: '' });
  assert.match(near.report, /- Surgical margin: Uninvolved by tumour \(closest less than 1 mm, deep margin\)\n {2}- Deep margin: Clear but less than 1 mm \(blocks 7, 8\)\n {2}- Proximal margin: Clear by 25 mm \(block 8\)\n\n/);
  const cannot = run({ marginsText: '', marginsNotAssessable: true });
  assert.match(cannot.report, /- Surgical margin: Cannot be assessed\n/);
  assert.match(cannot.report, /- Margins cannot be assessed\.$/);
  assert.match(messages(run({ marginsText: '' })), /Margins not recorded: type one margin per line/);
  // A line the summary cannot read prints as typed, without the summary row.
  const typed = run({ marginsText: 'Deep: see comment' });
  assert.match(typed.report, /\nMargins\n- Deep margin: See comment\n- Intact fascial envelope/);
  assert.doesNotMatch(typed.report, /Surgical margin|margins clear/);
  assert.match(messages(typed), /A margin line is printed as typed/);
});

test('sarcoma: nodes, metastasis and the pTNM (pN only when nodes are examined, CAP)', () => {
  const n0 = run({ nodesExamined: '2', nodesInvolved: '0' });
  assert.match(n0.report, /Lymph nodes\n- Regional lymph nodes: 2 examined; none involved\n/);
  assert.match(n0.report, /- pTNM: pT3 pN0\n/);
  assert.match(n0.report, /- 0 of 2 regional lymph nodes involved\.$/);
  const n1 = run({ nodesExamined: '3', nodesInvolved: '1', ene: 'Not identified', largestDepositMm: '6', nodeSites: 'inguinal', distantMets: ['Lung'], distantMetsOther: 'right lower lobe wedge' });
  assert.match(n1.report, /- Regional lymph nodes: 3 examined; 1 involved\n {2}- Extranodal extension: Not identified\n {2}- Size of largest metastatic deposit: 6 mm\n {2}- Nodal site\(s\) with tumour: Inguinal\n/);
  assert.match(n1.report, /Distant metastasis\n- Distant metastasis: Lung \(right lower lobe wedge\)\n/);
  assert.match(n1.report, /- pTNM: pT3 pN1 pM1\n/);
  assert.match(messages(n1), /Stage group, AJCC 8th edition \(reference, not reported\): IV$/);
  assert.match(messages(run({ nodesExamined: '2', nodesInvolved: '1' })), /Extranodal extension not recorded\./);
  assert.equal(run({ nodesExamined: '2', nodesInvolved: '3' }).issues.find((i) => /more than the 2 examined/.test(i.message)).level, 'error');
  assert.match(run({ recurrent: true }).report, /- pTNM: rpT3\n/);
  assert.match(run({ siteGroup: '' }).report, /- pTNM: pTX\n/);
  assert.match(messages(run({ siteGroup: '' })), /Tumour site \(AJCC site group\) not recorded: pT needs it\./);
  assert.match(messages(run({ siteGroup: 'Head and neck', site: 'neck' })), /Record the tumour extent for this site group: pT needs it\./);
  assert.doesNotMatch(run({}, { printPTNM: false }).report, /pTNM|Pathological stage/);
});

test('sarcoma: a typed T alone overrides the pT, with the derived T and the reason', () => {
  const r = run({ tnmOverride: 'pT2', tnmOverrideReason: 'the size is of the post-biopsy haematoma' });
  assert.match(r.report, /- pTNM: pT2 \[pathologist override; derived T3 - the size is of the post-biopsy\n {2}haematoma\]\n/);
  assert.match(messages(r), /IIIA/, 'the stage group reads the override');
  assert.match(messages(run({ tnmOverride: 'pT2' })), /pTNM override has no reason\./);
});

// ---------- the QMH order ----------

test('sarcoma: the QMH element order, with the documented departures', () => {
  // The order the QMH page prints its report in (updateDescription in the saved page).
  const html = fs.readFileSync(path.join(root, 'docs/reference/MS-Soft-tissue-sarcoma.html'), 'utf8');
  const fn = html.slice(html.indexOf('function updateDescription'));
  const all = [...fn.matchAll(/"(?:\\n)?"?\s*\+?\s*"?- ([A-Za-z0-9 ,/()-]+?):? ?"/g)].map((m) => m[1].trim());
  const qmh = all.slice(0, all.indexOf('Additional notes'));
  const want = ['Procedure', 'Tumor site', 'Tumor size', 'Tumor focality', 'Tumor histology and immunohistochemical studies', 'Histologic grade (FNCLCC grading)',
    'Histologic type', 'Mitotic rate', 'Tumor necrosis', 'Treatment effect', 'Lymphovascular invasion', 'Perineural invasion', 'Surgical margin', 'Regional lymph nodes',
    'Number of regional lymph nodes examined', 'Number of lymph nodes involved', 'Extracapsular spread', 'Size of largest metastatic deposit (mm), specify site',
    'Size of largest lymph node involved (mm), specify site', 'Distant metastasis', 'Pathologic stage classification (pTNM, AJCC 8th edition)',
    'Additional pathologic findings', 'Preresection treatment', 'Other (specify)'];
  const seen = want.map((w) => qmh.indexOf(w));
  assert.ok(seen.every((i) => i >= 0), `QMH labels found: ${qmh.join(' / ')}`);
  assert.deepEqual([...seen].sort((a, b) => a - b), seen, 'the saved QMH page prints in this order');
  const ours = {
    Procedure: 'Procedure', 'Tumor site': 'Tumour site', 'Tumor size': 'Tumour size', 'Tumor focality': 'Tumour focality',
    'Tumor histology and immunohistochemical studies': 'Tumour histology', 'Histologic grade (FNCLCC grading)': 'Histologic grade (FNCLCC grading)',
    'Histologic type': 'Tumour differentiation', 'Mitotic rate': 'Mitotic rate', 'Tumor necrosis': 'Tumour necrosis', 'Treatment effect': 'Treatment effect',
    'Lymphovascular invasion': 'Lymphovascular invasion', 'Perineural invasion': 'Perineural invasion', 'Surgical margin': 'Surgical margin',
    'Regional lymph nodes': 'Regional lymph nodes', 'Extracapsular spread': 'Extranodal extension',
    'Size of largest metastatic deposit (mm), specify site': 'Size of largest metastatic deposit', 'Distant metastasis': 'Distant metastasis',
    'Pathologic stage classification (pTNM, AJCC 8th edition)': 'pTNM', 'Preresection treatment': 'Preresection treatment', 'Other (specify)': 'Other findings'
  };
  // A case with nodes, a metastasis, treatment and every optional row filled.
  const r = run({ nodesExamined: '3', nodesInvolved: '1', ene: 'Not identified', largestDepositMm: '6', nodeSites: 'inguinal', distantMets: ['Lung'],
    distantMetsOther: 'right lower lobe wedge', preresection: ['Chemotherapy performed'], treatmentEffect: 'Present', viablePct: '40',
    otherFindings: 'skeletal muscle atrophy', ancillaryOther: 'next-generation sequencing: no fusion detected' });
  const labels = r.report.split('\n').filter((l) => /^ *- [^:]+:/.test(l)).map((l) => l.trim()).map((l) => l.slice(2, l.indexOf(':')));
  // Departure 1: the node counts fold into the Regional lymph nodes row ("3 examined; 1 involved"); the nodal sites
  // replace the size of the largest node involved; the "Additional pathologic findings" heading is a section heading.
  const expected = want.map((w) => ours[w]).filter(Boolean);
  // Departure 2: tumour depth (CAP) follows the focality.
  expected.splice(expected.indexOf('Tumour focality') + 1, 0, 'Tumour depth');
  // Departure 3: the histologic type prints as its own row before the paragraph; the QMH FNCLCC "Histologic type"
  // sub-row is named Tumour differentiation.
  expected.splice(expected.indexOf('Tumour histology'), 0, 'Histologic type');
  // Departure 4: treatment effect prints under Additional findings, after the preresection treatment.
  expected.splice(expected.indexOf('Treatment effect'), 1);
  expected.splice(expected.indexOf('Preresection treatment') + 1, 0, 'Treatment effect');
  // Departure 5: each margin prints under the Surgical margin row, with the fascial envelope (CAP, ICCR).
  expected.splice(expected.indexOf('Surgical margin') + 1, 0, 'Deep margin', 'Proximal margin', 'Distal margin', 'Intact fascial envelope / fibrous pseudocapsule at the closest margin');
  expected.splice(expected.indexOf('Size of largest metastatic deposit') + 1, 0, 'Nodal site(s) with tumour');
  // Departure 6: MDM2 and other ancillary studies print under Molecular findings.
  expected.push('MDM2 amplification (FISH)', 'Other ancillary studies');
  assert.deepEqual(labels, expected);
});

// ---------- specimen intake ----------

test('intake: sarcoma resections open the sarcoma form; biopsies, lipomas, bone and margins do not', () => {
  const sts = [
    ['Right thigh tumour, wide excision', 'Right thigh sarcoma'],
    ['Left retroperitoneal tumour, excision', 'Left retroperitoneal liposarcoma'],
    ['Right thigh atypical lipomatous tumour, marginal excision', ''],
    ['Left groin mass, radical resection', 'Left groin liposarcoma'],
    ['Right forearm tumour, excisional biopsy', '?sarcoma'],
    ['Right wrist mass, excision', 'synovial sarcoma']
  ];
  for (const [line, history] of sts) assert.equal(route(line, history).templateId, 'soft_tissue_sarcoma', `${line} | ${history}`);
  assert.equal(route('Right thigh tumour, wide excision', 'Right thigh sarcoma').tier, 'confident');
  assert.equal(route('Left thigh lipoma, excision', 'Right thigh sarcoma').templateId, 'soft_tissue_benign');
  assert.equal(route('Right thigh mass, biopsy', '?sarcoma').templateId, 'generic', 'a core biopsy is not a resection');
  assert.equal(route('Right tibia, resection', '?sarcoma').templateId, 'bone_joint');
  assert.equal(route('Deep margin', 'Right thigh sarcoma').templateId, 'generic');
});

test('intake: the procedure, site group, site and label are filled from the specimen line', () => {
  assert.deepEqual(preset('Right thigh tumour, wide excision', 'Right thigh sarcoma'), { procedure: 'Wide resection', siteGroup: 'Trunk and extremities', site: 'right thigh', clinicalLabel: 'tumour' });
  assert.deepEqual(preset('Left groin mass, radical resection', 'Left groin liposarcoma'), { procedure: 'Radical resection', siteGroup: 'Trunk and extremities', site: 'left groin', clinicalLabel: 'mass' });
  assert.equal(preset('Right forearm tumour, excisional biopsy', '?sarcoma').procedure, 'Excisional biopsy');
  assert.equal(preset('Right thigh sarcoma, right thigh').site, 'right thigh', 'a site the LIS lists twice is read once');
  const rp = preset('Left retroperitoneal tumour, excision', 'Left retroperitoneal liposarcoma');
  assert.equal(rp.siteGroup, 'Retroperitoneum');
  assert.equal(rp.procedure ?? '', '', 'an excision is not said to be marginal or wide');
});

// ---------- upgrade from the benign soft tissue form ----------

test('upgrade: a benign soft tissue part with ALT or sarcoma ticked maps to the synoptic', () => {
  assert.equal(UPGRADE_TO.to, 'soft_tissue_sarcoma');
  assert.ok(UPGRADE_TO.when({ diagnosis: 'Atypical lipomatous tumour – see comment', procedure: 'Excision' }));
  assert.ok(UPGRADE_TO.when({ diagnosis: 'Sarcoma – see comment', procedure: 'Resection' }));
  assert.ok(!UPGRADE_TO.when({ diagnosis: 'Sarcoma – see comment', procedure: 'Biopsy' }), 'not a biopsy');
  assert.ok(!UPGRADE_TO.when({ diagnosis: 'Lipoma', procedure: 'Excision' }));
  const m = UPGRADE_TO.map({ specimenName: '', organ: 'SOFT TISSUE', site: 'right thigh', clinicalLabel: 'lipoma', procedure: 'Excision', dimensions: '6 x 4 x 2.5', blocks: '3',
    diagnosis: 'Atypical lipomatous tumour – see comment', mdm2: 'Amplified', cutSurface: 'Homogeneous yellow', location: 'Subcutaneous', ihc: 'The atypical cells are positive for MDM2.' });
  assert.deepEqual(m, { specimenName: '', organ: '', site: 'right thigh', clinicalLabel: 'lipoma', siteGroup: 'Trunk and extremities', specimenDims: '60 x 40 x 25',
    cutSurface: ['Fatty'], depth: ['Subcutis'], blocks: '3', histType: ALT, ihcText: 'The atypical cells are positive for MDM2', mdm2: 'Amplification detected' });
  const s = UPGRADE_TO.map({ organ: 'SKIN AND SUBCUTIS', site: 'left retroperitoneum', clinicalLabel: '', diagnosis: 'Sarcoma – see comment', mdm2: 'Not tested', location: 'Subfascial', cutSurface: 'Variegated yellow-brown' });
  assert.equal(s.organ, 'SKIN AND SUBCUTIS');
  assert.equal(s.siteGroup, 'Retroperitoneum');
  assert.equal(s.clinicalLabel, 'tumour');
  assert.equal(s.histType, '', 'the sarcoma type is picked on the synoptic');
  assert.equal(s.mdm2, 'Not performed');
  assert.deepEqual(s.depth, []);
  assert.deepEqual(s.cutSurface, []);
  assert.equal(UPGRADE_TO.map({ site: 'left cheek', diagnosis: 'Sarcoma – see comment' }).siteGroup, 'Head and neck');
  assert.equal(UPGRADE_TO.map({ site: 'pelvis', diagnosis: 'Sarcoma – see comment' }).siteGroup, '', 'not guessed');
  // Every mapped value is a field of the synoptic, with an option it offers.
  for (const [k, val] of Object.entries(m)) {
    const f = field(k);
    assert.ok(f, k);
    if (f.options) for (const x of [].concat(val)) assert.ok(f.options.includes(x), `${k}: ${x}`);
  }
  assert.equal(cmToMm('12 x 8.25 x 4'), '120 x 82.5 x 40');
  assert.equal(cmToMm('6 cm x 4 cm'), '60 x 40');
  assert.equal(cmToMm('about 6 cm'), '', 'not a set of dimensions');
});

// ---------- golden reports ----------

// Written on first run, compared after; edit deliberately (UPDATE_FIXTURES=1 rewrites).
const CASES = [
  ['01-ups-thigh-g3-pt3', 'undifferentiated pleomorphic sarcoma of the right thigh, intramuscular, 110 mm, wide excision, FNCLCC grade 3, deep margin clear by 2.2 mm with an intact fascial envelope, no node examined, pT3, the example', [EXAMPLE]],
  ['02-ups-knee-post-radiotherapy-ypt2', 'undifferentiated pleomorphic sarcoma of the right knee after preoperative radiotherapy, 90 mm, wide excision with skin, 90% necrosis and 10% viable tumour, FNCLCC grade 3 with the CAP grading caveat, anterior margin clear by 2.3 mm without a fascial envelope, ypT2', [{
    ...EXAMPLE, procedure: 'Wide resection', site: 'right knee', tumourSizeMm: '90', tumourDims: '90 x 60 x 55', depth: ['Skeletal muscle, intramuscular'], specimenDims: '130 x 75 x 70',
    skinDims: '70 x 20', orientation: 'one stitch proximal, two stitches anterior', cutSurface: ['Haemorrhagic', 'Necrotic'], macroMarginMm: '2', macroMarginSite: 'anterior',
    blocks: '15', blockKeyText: '1 Skin\n2 Anterior margin\n3 Posterior margin\n4 Proximal margin\n5 Distal margin\n6-15 Tumour',
    ihcText: 'The tumour cells are weakly positive for actin and negative for desmin, myogenin and SATB2.', mitoticCount: '5', necrosis: '50% or more tumour necrosis',
    necrosisPct: '90', marginsText: 'Anterior: 2.3 (block 2)\nPosterior: >10 (block 3)\nProximal: clear (block 4)\nDistal: clear (block 5)', fascialEnvelope: 'Absent',
    preresection: ['Radiation therapy performed'], treatmentEffect: 'Present', viablePct: '10', treatmentFeatures: ['Geographic necrosis', 'Haemorrhage', 'Fibrosis']
  }]],
  ['03-ddlps-retroperitoneum-pt3', 'dedifferentiated liposarcoma of the left retroperitoneum arising from a well-differentiated liposarcoma, 150 mm with a 60 mm dedifferentiated nodule, marginal resection, MDM2 amplified, FNCLCC grade 3, inked surface clear by 1 mm, pT3', [{
    ...EXAMPLE, procedure: 'Marginal resection', siteGroup: 'Retroperitoneum', site: 'left retroperitoneum', tumourSizeMm: '150', tumourDims: '150 x 150 x 100', depth: [],
    specimenDims: '160 x 150 x 100', orientation: '', cutSurface: ['Fatty', 'Fleshy', 'Necrotic'], macroMarginMm: '1', macroMarginSite: 'inked surface',
    macroOther: 'a central fleshy, partly necrotic nodule measuring 60 mm is surrounded by a cuff of fatty tumour', blocks: '15',
    blockKeyText: '1 Fatty tumour\n2-7 Fleshy tumour\n8-11 Tumour capsule\n12-15 Tumour border', histType: DDLPS, wdComponent: 'Present', dedifSizeMm: '60',
    heterologous: 'Not identified', ihcText: 'The tumour cells are positive for MDM2 and CDK4.', mitoticCount: '23', necrosis: 'Less than 50% tumour necrosis', necrosisPct: '30',
    marginsText: 'Inked surface: 1 (block 12)', fascialEnvelope: 'Not applicable', mdm2: 'Amplification detected'
  }]],
  ['04-myxoid-liposarcoma-thigh-pt2', 'myxoid liposarcoma of the left thigh with 10% hypercellular (round cell) areas, intermuscular, 95 mm, wide excision, DDIT3 rearranged, FNCLCC grade 2, deep margin clear by 8 mm, pT2', [{
    ...EXAMPLE, site: 'left thigh', tumourSizeMm: '95', tumourDims: '95 x 70 x 50', depth: ['Skeletal muscle, intermuscular'], specimenDims: '150 x 100 x 70',
    orientation: 'one stitch proximal, two stitches medial', cutSurface: ['Myxoid', 'Fleshy'], macroMarginMm: '8', macroMarginSite: 'deep', blocks: '12',
    blockKeyText: '1-8 Tumour\n9 Deep margin\n10 Proximal margin\n11 Distal margin\n12 Medial and lateral margins', histType: MLPS, hypercellularPct: '10', ihcText: '',
    mitoticCount: '3', necrosis: 'No tumour necrosis', necrosisPct: '', marginsText: 'Deep: 8 (block 9)\nProximal: 30 (block 10)\nDistal: 35 (block 11)\nMedial: 15 (block 12)\nLateral: 20 (block 12)',
    fascialEnvelope: 'Present', mdm2: 'Not performed', ddit3: 'DDIT3 rearrangement detected'
  }]],
  ['05-alt-thigh-subcutis-pt3', 'atypical lipomatous tumour of the right thigh subcutis, 120 mm, marginal excision, MDM2 amplified, deep margin clear by 3 mm, pT3 with the CAP note that AJCC staging is not clinically relevant', [{
    ...EXAMPLE, procedure: 'Marginal resection', site: 'right thigh', clinicalLabel: 'lipomatous tumour', tumourSizeMm: '120', tumourDims: '120 x 80 x 40', depth: ['Subcutis'],
    specimenDims: '140 x 90 x 50', orientation: 'one stitch proximal, two stitches medial', cutSurface: ['Fatty'], macroMarginMm: '3', macroMarginSite: 'deep', blocks: '10',
    blockKeyText: '1 Deep margin\n2 Proximal margin\n3 Distal margin\n4 Medial margin\n5 Lateral margin\n6-10 Tumour', histType: ALT,
    ihcText: 'The atypical stromal cells are positive for MDM2, CDK4 and p16.', mitoticCount: '1', necrosis: 'No tumour necrosis', necrosisPct: '',
    marginsText: 'Deep: 3 (block 1)\nProximal: 20 (block 2)\nDistal: 25 (block 3)\nMedial: 15 (block 4)\nLateral: 18 (block 5)', fascialEnvelope: 'Present', mdm2: 'Amplification detected'
  }]]
];
for (const [name, description, parts] of CASES) {
  test(`golden: ${name}`, () => {
    const r = runParts(parts);
    const file = path.join(FIX, `${name}.json`);
    const current = { description, templateId: 'soft_tissue_sarcoma', options: OPTIONS, values: parts, report: r.report, checks: r.issues };
    if (UPDATE || !fs.existsSync(file)) {
      fs.mkdirSync(FIX, { recursive: true });
      fs.writeFileSync(file, JSON.stringify(current, null, 2) + '\n');
    }
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(r.report, saved.report, `${file} changed; re-run with UPDATE_FIXTURES=1 only after a deliberate wording change`);
    assert.deepEqual(r.issues, saved.checks, `${file} checks changed`);
    // Sub-rows wrap at a four-space indent; no double space inside a line and none trailing.
    assert.doesNotMatch(r.report, /undefined|\[object|NaN|\S {2,}| +\n/);
    assert.deepEqual(r.issues.filter((i) => i.level === 'error'), []);
    assert.doesNotMatch(r.issues.map((i) => i.message).join(' | '), /WHO 6th/, 'the WHO 6th edition checks are silent on these cases');
  });
}
