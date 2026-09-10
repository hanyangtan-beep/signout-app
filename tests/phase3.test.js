// Phase 3: prostate + IBD templates, single-part rule, summary hook, per-position defaults.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCase, generate, dropPartLetters, LETTERS } from '../src/engine.js';
import { loadAll } from '../src/registry.js';
import { gradeGroup, gleasonText } from '../generators/prostate.js';
import { nancyIndex, isChronic, organPhrase } from '../generators/ibd.js';

const registry = await loadAll();
const prostate = registry.prostate_biopsy;
const ibd = registry.ibd_biopsy;
const gastric = registry.gastric_biopsy;

const run = (t, c) => generate(t.schema, t.generator, c);
const example = (t) => ({ ...JSON.parse(JSON.stringify(t.schema.example)), schemaId: t.schema.id });

// ---------- engine ----------

test('letters extend past J for large core series', () => {
  assert.equal(LETTERS.length, 26);
  const c = createCase(prostate.schema, 12);
  assert.equal(c.parts[11].label, 'L');
  assert.equal(c.parts[11].values.specimenName, 'Left lateral apex');
});

test('partDefaults give each position its own site', () => {
  const c = createCase(ibd.schema, 7);
  assert.deepEqual(c.parts.map((p) => p.values.site), ['Terminal ileum', 'Caecum', 'Ascending colon', 'Transverse colon', 'Descending colon', 'Sigmoid colon', 'Rectum']);
});

test('dropPartLetters strips the prefix and removes a bare heading line', () => {
  assert.equal(dropPartLetters('(A) STOMACH, antrum, biopsy - X'), 'STOMACH, antrum, biopsy - X');
  assert.equal(dropPartLetters('(A)\n- Site: Pyloric type'), '- Site: Pyloric type');
  assert.equal(dropPartLetters('(B) keep'), '(B) keep');
});

test('single-part rule: one part drops "(A)" everywhere, two parts keep letters', () => {
  const one = createCase(gastric.schema, 1);
  one.parts[0].values.specimenName = 'Antrum';
  const r1 = run(gastric, one);
  assert.equal(r1.specimens, 'Antrum');
  assert.ok(r1.microscopy.startsWith('- Site: Pyloric type'));
  assert.equal(r1.diagnosis, 'STOMACH, antrum, biopsy - NO SIGNIFICANT ABNORMALITY, Helicobacter-negative');
  assert.ok(!r1.report.includes('(A)'));

  const two = createCase(gastric.schema, 2);
  const r2 = run(gastric, two);
  assert.ok(r2.diagnosis.startsWith('(A) STOMACH'));
  assert.ok(r2.diagnosis.includes('\n(B) STOMACH'));
});

test('single-part rule can be switched off per case', () => {
  const one = createCase(gastric.schema, 1);
  one.options.alwaysLetter = true;
  assert.ok(run(gastric, one).diagnosis.startsWith('(A) '));
});

// ---------- prostate ----------

test('ISUP grade groups', () => {
  assert.equal(gradeGroup('3', '3'), 1);
  assert.equal(gradeGroup('3', '4'), 2);
  assert.equal(gradeGroup('4', '3'), 3);
  assert.equal(gradeGroup('4', '4'), 4);
  assert.equal(gradeGroup('3', '5'), 4);
  assert.equal(gradeGroup('5', '3'), 4);
  assert.equal(gradeGroup('4', '5'), 5);
  assert.equal(gradeGroup('5', '5'), 5);
  assert.equal(gradeGroup('2', '3'), null);
  assert.equal(gleasonText('4', '3'), '4+3=7 (Grade Group 3)');
});

test('prostate example: per-core lines and case summary', () => {
  const r = run(prostate, example(prostate));
  const dx = r.diagnosis.split('\n');
  assert.equal(dx[0], '(A) PROSTATE, right base, needle core biopsy - NO EVIDENCE OF MALIGNANCY');
  assert.equal(dx[1], '(B) PROSTATE, right mid, needle core biopsy - ACINAR ADENOCARCINOMA, Gleason score 3+4=7 (Grade Group 2), pattern 4/5 20%, involving 1 of 2 cores, maximum linear extent 4 mm, 15% of tissue; adjacent high grade PIN');
  assert.equal(dx[2], '(C) PROSTATE, right apex, needle core biopsy - ACINAR ADENOCARCINOMA, Gleason score 4+3=7 (Grade Group 3), pattern 4/5 60%, involving 2 of 2 cores, maximum linear extent 9 mm, 45% of tissue; cribriform pattern present; perineural invasion present');
  assert.equal(dx[4], '(E) PROSTATE, left mid, needle core biopsy - ATYPICAL SMALL ACINAR PROLIFERATION, suspicious for but not diagnostic of adenocarcinoma');
  assert.equal(dx[5], '(F) PROSTATE, left apex, needle core biopsy - HIGH GRADE PROSTATIC INTRAEPITHELIAL NEOPLASIA, no evidence of invasive malignancy');
  assert.equal(dx[dx.length - 1], 'SUMMARY: Acinar adenocarcinoma in 3 of 12 cores (parts B, C); highest Gleason score 4+3=7 (Grade Group 3); cribriform pattern present; perineural invasion present; ASAP in part E; high grade PIN in part F.');
  assert.ok(r.microscopy.includes('(A) Right base, 2 cores\nSections show 2 cores of prostatic tissue containing prostatic glands within a fibromuscular stroma. They are lined by a layer of epithelial cells and basal cells. There is no evidence of high grade prostatic intraepithelial neoplasia or malignancy.\n- Inflammation: Chronic'));
  assert.ok(r.microscopy.includes('(B) Right mid, 2 cores\n- Diagnosis: Acinar adenocarcinoma\n- Gleason score: 3+4=7 (Grade Group 2)\n- Pattern 4/5: 20%'));
});

test('prostate: cores positive is clamped to cores in the part; blanks omitted', () => {
  const c = createCase(prostate.schema, 2);
  Object.assign(c.parts[0].values, { category: 'Adenocarcinoma', coresTotal: '2', coresPositive: '5', primary: '4', secondary: '4', extentMm: '', pctTissue: '', pct45: '' });
  const r = run(prostate, c);
  assert.equal(r.diagnosis.split('\n')[0], '(A) PROSTATE, right base, needle core biopsy - ACINAR ADENOCARCINOMA, Gleason score 4+4=8 (Grade Group 4), involving 2 of 2 cores');
  assert.ok(!r.microscopy.includes('Maximum linear extent'));
});

test('prostate: summary is omitted for a single part and when the option is off', () => {
  const one = createCase(prostate.schema, 1);
  assert.ok(!run(prostate, one).report.includes('SUMMARY'));
  const ex = example(prostate);
  ex.options.summary = false;
  assert.ok(!run(prostate, ex).report.includes('SUMMARY'));
});

test('prostate: all-benign series summarises no malignancy', () => {
  const c = createCase(prostate.schema, 3);
  c.parts.forEach((p) => { p.values.coresTotal = '2'; });
  assert.ok(run(prostate, c).diagnosis.endsWith('SUMMARY: No evidence of malignancy in 6 cores.'));
});

test('prostate: a single benign core uses singular prose and the short diagnosis', () => {
  const c = createCase(prostate.schema, 1);
  const r = run(prostate, c);
  assert.equal(r.microscopy, 'Right base, 1 core\nSections show a core of prostatic tissue containing prostatic glands within a fibromuscular stroma. They are lined by a layer of epithelial cells and basal cells. There is no evidence of high grade prostatic intraepithelial neoplasia or malignancy.');
  assert.equal(r.diagnosis, 'PROSTATE, right base, needle core biopsy - NO EVIDENCE OF MALIGNANCY');
});

// ---------- IBD ----------

test('IBD helpers', () => {
  assert.equal(nancyIndex({ activity: 'Severe', chronic: 'Normal' }), 4);
  assert.equal(nancyIndex({ activity: 'Moderate', chronic: 'Normal' }), 3);
  assert.equal(nancyIndex({ activity: 'Mild', chronic: 'Normal' }), 2);
  assert.equal(nancyIndex({ activity: 'Absent', chronic: 'Marked' }), 1);
  assert.equal(nancyIndex({ activity: 'Absent', chronic: 'Mild' }), 0);
  assert.equal(isChronic({ distortion: 'Absent', basalPlasma: 'Absent', metaplasia: 'Paneth cell metaplasia' }), true);
  assert.equal(isChronic({ distortion: 'Absent', basalPlasma: 'Absent', metaplasia: 'Absent' }), false);
  assert.equal(organPhrase('Terminal ileum'), 'TERMINAL ILEUM');
  assert.equal(organPhrase('Sigmoid colon'), 'COLON, sigmoid colon');
  assert.equal(organPhrase('Rectum'), 'RECTUM');
});

test('IBD example: left-sided continuous disease favours ulcerative colitis', () => {
  const r = run(ibd, example(ibd));
  const dx = r.diagnosis.split('\n');
  assert.equal(dx[0], '(A) TERMINAL ILEUM, biopsy - NO SIGNIFICANT HISTOLOGICAL ABNORMALITY, no evidence of active or chronic ileitis');
  assert.equal(dx[3], '(D) COLON, transverse colon, biopsy - CHRONIC INACTIVE COLITIS');
  assert.equal(dx[4], '(E) COLON, descending colon, biopsy - CHRONIC ACTIVE COLITIS, mild activity');
  assert.equal(dx[6], '(G) RECTUM, biopsy - CHRONIC ACTIVE PROCTITIS, severe activity, with erosion / ulceration');
  assert.equal(dx[dx.length - 1], 'SUMMARY: Chronic active colitis involving the transverse colon to the rectum, in a continuous distribution with rectal involvement; caecum and ascending colon without chronicity or activity; terminal ileum without significant abnormality; no non-crypt-associated granulomas; no dysplasia. The features are those of chronic idiopathic inflammatory bowel disease; the distribution favours ulcerative colitis.');
  assert.ok(r.microscopy.includes('- Nancy histological index: 4'));
  assert.ok(r.microscopy.includes('(A) Terminal ileum\n- Villous architecture: Preserved'));
  assert.ok(!r.microscopy.includes('(B) Caecum\n- Villous'));
});

test('IBD: patchy disease with granulomas, ileal involvement and rectal sparing favours Crohn disease', () => {
  const c = createCase(ibd.schema, 7);
  const chronicActive = { distortion: 'Moderate', basalPlasma: 'Diffuse', chronic: 'Moderate', activity: 'Moderate' };
  Object.assign(c.parts[0].values, chronicActive, { villi: 'Blunted', granulomas: 'Present, not crypt-associated' });
  Object.assign(c.parts[2].values, chronicActive);
  Object.assign(c.parts[5].values, chronicActive);
  const r = run(ibd, c);
  const dx = r.diagnosis.split('\n');
  assert.equal(dx[0], '(A) TERMINAL ILEUM, biopsy - CHRONIC ACTIVE ILEITIS, moderate activity, with non-crypt-associated epithelioid granuloma(s) and villous blunting');
  const s = dx[dx.length - 1];
  assert.ok(s.includes('involving the ascending colon and sigmoid colon, in a discontinuous (patchy) distribution with rectal sparing'));
  assert.ok(s.includes('chronic active ileitis'));
  assert.ok(s.includes('non-crypt-associated granulomas present'));
  assert.ok(s.endsWith("the features favour Crohn's disease."));
});

test('IBD: activity without chronicity is not called IBD; dysplasia is carried to the summary', () => {
  const c = createCase(ibd.schema, 3);
  Object.assign(c.parts[1].values, { activity: 'Mild' });
  Object.assign(c.parts[2].values, { dysplasia: 'Low grade dysplasia' });
  const r = run(ibd, c);
  const dx = r.diagnosis.split('\n');
  assert.equal(dx[1], '(B) COLON, caecum, biopsy - ACTIVE COLITIS, mild, without features of chronicity');
  assert.equal(dx[2], '(C) COLON, ascending colon, biopsy - NO SIGNIFICANT HISTOLOGICAL ABNORMALITY, no evidence of active or chronic colitis; LOW GRADE DYSPLASIA');
  assert.equal(dx[dx.length - 1], 'SUMMARY: Active colitis without features of chronicity involving the caecum; low grade dysplasia in the ascending colon. The pattern may represent an infective or early-phase colitis; established inflammatory bowel disease is not demonstrated.');
});

test('IBD: normal series and single site', () => {
  const c = createCase(ibd.schema, 4);
  assert.ok(run(ibd, c).diagnosis.endsWith('SUMMARY: No histological evidence of chronic or active colitis in the 4 sites sampled; no dysplasia.'));
  const one = createCase(ibd.schema, 1);
  one.parts[0].values.site = 'Rectum';
  Object.assign(one.parts[0].values, { distortion: 'Mild', basalPlasma: 'Focal' });
  const r = run(ibd, one);
  assert.equal(r.diagnosis, 'RECTUM, biopsy - CHRONIC INACTIVE PROCTITIS');
  assert.equal(r.specimens, 'Rectum');
});
