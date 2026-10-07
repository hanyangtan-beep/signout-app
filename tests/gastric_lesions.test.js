// Gastric biopsy polyps / adenomas, WHO carcinoma types and the QMH stomach biomarker panel
// (2026-10-07, docs/specs/gastric-biopsy-polyps-carcinoma.md).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generate, isVisible } from '../src/engine.js';
import { loadAll, loadManifest } from '../src/registry.js';
import { parseIntake, matchParts } from '../src/intake.js';
import {
  POLYPS, CA_MORPHOLOGY, GRADED, LAUREN_TYPES, lesionHead, carcinomaHead, dysplasiaValue,
  biomarkerText, pendingText, claudinTotal, lesionChecks
} from '../generators/gastric_lesions.js';

const registry = await loadAll();
const { schema, generator } = registry.gastric_biopsy;
const field = (id) => schema.fields.find((f) => f.id === id);
const defaults = Object.fromEntries(schema.fields.map((f) => [f.id, f.default ?? '']));
const values = (over = {}) => ({ ...defaults, biopsySite: 'Body', siteType: 'Body type', ...over });
const run = (over = {}) => generate(schema, generator, { schemaId: 'gastric_biopsy', caseTitle: '', options: {}, parts: [{ label: 'A', values: values(over) }] });
const dx = (over) => run(over).diagnosis;
const micro = (over) => run(over).microscopy;
const issues = (over) => generator.validate({ label: 'A', values: values(over) });
const levels = (over) => issues(over).map((i) => `${i.level}:${i.field}`);
const HEAD = 'STOMACH, body, biopsy - ';

const TUBULAR = {
  dysplasia: 'Malignancy present', caType: 'Tubular adenocarcinoma', caGrade: 'Moderately differentiated', caLauren: 'Intestinal type'
};
const PANEL = {
  ...TUBULAR,
  her2: 'Score 2+', her2Ish: 'Not amplified', her2Ratio: '1.40', her2Copies: '3.2',
  eber: 'Negative in tumour cells', mmr: 'Retained (MLH1, PMS2, MSH2, MSH6)',
  pdl1: 'Performed', pdl1Cps: '5', pdl1Tps: '2', claudin: 'Positive', claudin2: '30', claudin3: '50'
};

test('schema: version, flat fields with showIf, and every option has its wording', () => {
  assert.equal(schema.version, '2026.10');
  const ids = schema.fields.map((f) => f.id);
  assert.ok(ids.indexOf('polyp') === ids.indexOf('dysplasia') - 1, 'polyp sits just before dysplasia');
  for (const id of ['caType', 'caOther', 'caGrade', 'caLauren', 'her2', 'her2Ish', 'her2Ratio', 'her2Copies', 'eber', 'mmr', 'pdl1', 'pdl1Clone', 'pdl1Cps', 'pdl1Tps', 'claudin', 'claudin2', 'claudin3']) {
    const f = field(id);
    assert.ok(f, id);
    assert.ok(f.showIf, `${id} is shown only with a carcinoma`);
    assert.equal(f.group, undefined, `${id} is flat`);
  }
  assert.deepEqual(field('polyp').options.filter((o) => o !== 'None').sort(), Object.keys(POLYPS).sort());
  for (const o of field('caType').options.filter((x) => x && x !== 'Other (specify)')) assert.ok(CA_MORPHOLOGY[o], o);
  for (const o of GRADED.concat(LAUREN_TYPES)) assert.ok(field('caType').options.includes(o), o);
  for (const id of ['polyp', 'her2', 'eber', 'pdl1', 'claudin']) assert.ok(field(id).reference?.groups?.length, `${id} has a reference panel`);
});

test('defaults print nothing new: no polyp or biomarker bullet, the normal line unchanged', () => {
  const out = run();
  assert.doesNotMatch(out.microscopy, /- Polyp:|- Biomarkers:/);
  assert.match(out.microscopy, /- Dysplasia \/ malignancy: Absent\n- Helicobacter pylori: Absent/);
  assert.equal(out.diagnosis, `${HEAD}NO SIGNIFICANT ABNORMALITY, Helicobacter-negative`);
  // Old drafts carry none of the new keys at all.
  const old = values();
  for (const k of ['polyp', 'caType', 'her2', 'eber', 'mmr', 'pdl1', 'claudin']) delete old[k];
  const legacy = generate(schema, generator, { schemaId: 'gastric_biopsy', caseTitle: '', options: {}, parts: [{ label: 'A', values: old }] });
  assert.equal(legacy.diagnosis, out.diagnosis);
  assert.equal(legacy.microscopy, out.microscopy);
  assert.deepEqual(generator.validate({ label: 'A', values: old }), []);
});

test('polyp alone leads the line without a trailing Helicobacter clause', () => {
  assert.equal(dx({ polyp: 'Fundic gland polyp' }), `${HEAD}FUNDIC GLAND POLYP`);
  assert.match(micro({ polyp: 'Fundic gland polyp' }),
    /- Polyp: Fundic gland polyp\. Cystically dilated oxyntic glands are lined by parietal cells, chief cells and mucous foveolar cells\.\n- Dysplasia \/ malignancy: Absent/);
  assert.equal(dx({ polyp: 'Inflammatory fibroid polyp' }), `${HEAD}INFLAMMATORY FIBROID POLYP`);
});

test('polyp with background gastritis, intestinal metaplasia and atrophy', () => {
  assert.equal(dx({ polyp: 'Hyperplastic polyp', chronic: 'Moderate', activity: 'Mild', hp: 'Low density', imDegree: 'Mild', imType: 'Incomplete' }),
    `${HEAD}HYPERPLASTIC POLYP; HELICOBACTER ASSOCIATED CHRONIC ACTIVE GASTRITIS; mild INTESTINAL METAPLASIA (incomplete)`);
  assert.equal(dx({ polyp: 'Intestinal-type adenoma', dysplasia: 'Low grade dysplasia', chronic: 'Mild', imDegree: 'Moderate', atrophy: 'Mild' }),
    `${HEAD}INTESTINAL-TYPE ADENOMA with LOW GRADE DYSPLASIA; CHRONIC GASTRITIS, inactive, Helicobacter-negative; moderate INTESTINAL METAPLASIA; mild ATROPHY`);
  assert.equal(dx({ polyp: 'Hyperplastic polyp', chronic: 'Mild', activity: 'Mild', ulcer: 'Present' }),
    `${HEAD}HYPERPLASTIC POLYP; CHRONIC ACTIVE GASTRITIS with ULCER`);
  // Ulcer without gastritis is recorded in the microscopy only.
  assert.equal(dx({ polyp: 'Hyperplastic polyp', ulcer: 'Present' }), `${HEAD}HYPERPLASTIC POLYP`);
});

test('polyp dysplasia grades', () => {
  const p = { polyp: 'Foveolar-type adenoma' };
  assert.equal(lesionHead({ ...p, dysplasia: 'High grade dysplasia' }), 'FOVEOLAR-TYPE ADENOMA with HIGH GRADE DYSPLASIA');
  assert.equal(lesionHead({ ...p, dysplasia: 'Indefinite for dysplasia' }), 'FOVEOLAR-TYPE ADENOMA, INDEFINITE FOR DYSPLASIA');
  assert.equal(lesionHead({ ...p, dysplasia: 'Intramucosal carcinoma' }), 'FOVEOLAR-TYPE ADENOMA with INTRAMUCOSAL CARCINOMA');
  assert.equal(lesionHead({ ...p, dysplasia: 'Malignancy present' }), 'FOVEOLAR-TYPE ADENOMA; MALIGNANCY PRESENT');
  assert.equal(dx({ polyp: 'Pyloric gland adenoma', dysplasia: 'Intramucosal carcinoma', caType: 'Tubular adenocarcinoma', caGrade: 'Well differentiated' }),
    `${HEAD}PYLORIC GLAND ADENOMA with INTRAMUCOSAL TUBULAR ADENOCARCINOMA, well differentiated`);
});

test('typed carcinoma: WHO head with grade and Lauren type, and a biopsy morphology sentence', () => {
  assert.equal(dx(TUBULAR), `${HEAD}TUBULAR ADENOCARCINOMA, moderately differentiated, intestinal type (Lauren)`);
  assert.match(micro(TUBULAR), /- Dysplasia \/ malignancy: Tubular adenocarcinoma, moderately differentiated, intestinal type \(Lauren\)\. Moderately formed tubules/);
  assert.equal(carcinomaHead({ dysplasia: 'Malignancy present', caType: 'Poorly cohesive carcinoma, signet-ring cell type', caLauren: 'Diffuse type' }),
    'POORLY COHESIVE CARCINOMA, signet-ring cell type, diffuse type (Lauren)');
  assert.equal(carcinomaHead({ dysplasia: 'Malignancy present', caType: 'Mixed adenocarcinoma', caLauren: 'Mixed type' }),
    'MIXED ADENOCARCINOMA, mixed intestinal and diffuse type (Lauren)');
  assert.equal(carcinomaHead({ dysplasia: 'Intramucosal carcinoma', caType: 'Adenocarcinoma', caGrade: 'Well differentiated' }),
    'INTRAMUCOSAL ADENOCARCINOMA, well differentiated');
  assert.equal(dx({ dysplasia: 'Malignancy present', caType: 'Carcinoma with lymphoid stroma' }), `${HEAD}CARCINOMA with LYMPHOID STROMA`);
  assert.equal(dx({ dysplasia: 'Malignancy present', caType: 'Other (specify)', caOther: 'Paneth cell carcinoma.' }), `${HEAD}PANETH CELL CARCINOMA`);
  assert.match(micro({ dysplasia: 'Malignancy present', caType: 'Other (specify)', caOther: 'Paneth cell carcinoma' }), /- Dysplasia \/ malignancy: Paneth cell carcinoma\.\n/);
  // Grade and Lauren type print only for the types that carry them.
  assert.equal(carcinomaHead({ dysplasia: 'Malignancy present', caType: 'Hepatoid adenocarcinoma', caGrade: 'Poorly differentiated', caLauren: 'Diffuse type' }), 'HEPATOID ADENOCARCINOMA');
  // Background gastritis follows the carcinoma.
  assert.equal(dx({ ...TUBULAR, hp: 'Moderate density', activity: 'Moderate', chronic: 'Moderate', imDegree: 'Marked' }),
    `${HEAD}TUBULAR ADENOCARCINOMA, moderately differentiated, intestinal type (Lauren); HELICOBACTER ASSOCIATED CHRONIC ACTIVE GASTRITIS; marked INTESTINAL METAPLASIA`);
});

test('untyped carcinoma keeps the legacy wording', () => {
  assert.equal(dx({ dysplasia: 'Intramucosal carcinoma' }), `${HEAD}INTRAMUCOSAL CARCINOMA, Helicobacter-negative`);
  assert.equal(dx({ dysplasia: 'Malignancy present', chronic: 'Mild' }), `${HEAD}CHRONIC GASTRITIS, inactive, Helicobacter-negative; MALIGNANCY PRESENT`);
  assert.equal(dysplasiaValue({ dysplasia: 'Malignancy present', caType: 'Other (specify)', caOther: '' }), 'Malignancy present');
  // A type left over from an earlier carcinoma choice is ignored once dysplasia is no longer a carcinoma.
  assert.equal(dx({ dysplasia: 'High grade dysplasia', caType: 'Tubular adenocarcinoma', her2: 'Score 3+', chronic: 'Mild' }),
    `${HEAD}CHRONIC GASTRITIS, inactive, Helicobacter-negative; HIGH GRADE DYSPLASIA`);
  assert.doesNotMatch(micro({ dysplasia: 'High grade dysplasia', her2: 'Score 3+' }), /Biomarkers/);
});

test('biomarkers print in QMH order as one flat bullet after the dysplasia bullet', () => {
  const m = micro(PANEL);
  assert.match(m, /- Dysplasia \/ malignancy: .*\n- Biomarkers: .*\n- Helicobacter pylori: Absent$/);
  assert.equal(biomarkerText(values(PANEL)), [
    'HER2 (4B5) is equivocal (score 2+).',
    'HER2 dual ISH shows no amplification (HER2/CEP17 ratio 1.4; average 3.2 HER2 signals per cell).',
    'EBER in situ hybridisation is negative in the tumour cells.',
    'Immunohistochemistry shows retained nuclear expression of MLH1, PMS2, MSH2 and MSH6 in the tumour cells (mismatch repair proficient).',
    'PD-L1 (22C3) combined positive score is 5 (tumour proportion score 2%).',
    'Claudin 18.2 (43-14A) is positive, with moderate to strong membranous staining in 80% of tumour cells (2+ 30%, 3+ 50%).'
  ].join(' '));
  // The diagnosis line carries no biomarkers.
  assert.equal(dx(PANEL), `${HEAD}TUBULAR ADENOCARCINOMA, moderately differentiated, intestinal type (Lauren)`);
});

test('biomarker order follows the QMH stomach biomarker page', () => {
  const page = readFileSync(new URL('../docs/reference/qmh/stomach-biomarkers.txt', import.meta.url), 'utf8');
  const headings = ['HER2 IHC, biopsy', 'HER2/neu oncoprotein DISH', 'EBER ISH', 'MMR IHC', 'PD-L1 assessment', 'Claudin18.2 IHC'];
  const onPage = headings.map((h) => page.indexOf(h));
  assert.ok(onPage.every((i) => i >= 0), 'every heading is on the page');
  assert.deepEqual([...onPage].sort((a, b) => a - b), onPage, 'the page order');
  const text = biomarkerText(values(PANEL));
  const printed = ['HER2 (4B5)', 'HER2 dual ISH', 'EBER', 'MLH1', 'PD-L1', 'Claudin 18.2'].map((h) => text.indexOf(h));
  assert.ok(printed.every((i) => i >= 0));
  assert.deepEqual([...printed].sort((a, b) => a - b), printed, 'printed in the same order');
});

test('biomarker variants', () => {
  const b = (over) => biomarkerText(values({ ...TUBULAR, ...over }));
  assert.equal(b({ her2: 'Score 0' }), 'HER2 (4B5) is negative (score 0).');
  assert.equal(b({ her2: 'Score 3+', her2Ish: 'Amplified', her2Ratio: '3' }), 'HER2 (4B5) is positive (score 3+).');
  assert.equal(b({ her2: 'Score 2+', her2Ish: 'Amplified', her2Ratio: '2.6', her2Copies: '' }),
    'HER2 (4B5) is equivocal (score 2+). HER2 dual ISH shows amplification (HER2/CEP17 ratio 2.6).');
  assert.equal(b({ her2: 'Score 2+', her2Ish: 'Pending' }), 'HER2 (4B5) is equivocal (score 2+). HER2 dual ISH has been requested (result to follow).');
  assert.equal(b({ her2: 'Cannot be determined' }), 'HER2 (4B5) cannot be assessed.');
  assert.equal(b({ eber: 'Background lymphoid cells only' }), 'EBER in situ hybridisation is negative in the tumour cells, with scattered positive background lymphoid cells.');
  assert.equal(b({ mmr: 'Loss of MLH1 and PMS2' }), 'Immunohistochemistry shows loss of nuclear expression of MLH1 and PMS2 in the tumour cells, with retained MSH2 and MSH6 (mismatch repair deficient).');
  assert.equal(b({ pdl1: 'Performed', pdl1Clone: '28-8', pdl1Cps: '60' }), 'PD-L1 (28-8) combined positive score is 60.');
  assert.equal(b({ pdl1: 'Performed', pdl1Cps: '' }), '');
  assert.equal(b({ claudin: 'Negative', claudin2: '0', claudin3: '0' }), 'Claudin 18.2 (43-14A) is negative, with no moderate to strong membranous staining.');
  assert.equal(b({ claudin: 'Negative', claudin2: '20', claudin3: '' }), 'Claudin 18.2 (43-14A) is negative, with moderate to strong membranous staining in 20% of tumour cells.');
  assert.equal(b({ claudin: 'Positive' }), 'Claudin 18.2 (43-14A) is positive.');
  assert.equal(claudinTotal({ claudin2: '', claudin3: '' }), null);
});

test('requested tests merge into one sentence', () => {
  const s = values({ ...TUBULAR, her2: 'Pending', pdl1: 'Pending', claudin: 'Pending', eber: 'Pending' });
  assert.equal(pendingText(s), 'HER2, PD-L1 and claudin 18.2 immunohistochemistry have been requested (results to follow). EBER in situ hybridisation has been requested (result to follow).');
  assert.equal(pendingText(values({ mmr: 'Pending' })), 'Mismatch repair immunohistochemistry has been requested (result to follow).');
  assert.equal(biomarkerText(values({ ...TUBULAR, her2: 'Score 1+', claudin: 'Pending' })),
    'HER2 (4B5) is negative (score 1+). Claudin 18.2 immunohistochemistry has been requested (result to follow).');
});

test('printed text carries no cut-offs or citations (brief section 3 rule 2)', () => {
  const out = run({ ...PANEL, polyp: 'Pyloric gland adenoma' });
  const text = `${out.microscopy}\n${out.diagnosis}`;
  for (const bad of [/75%/, /CPS ?≥|CPS 1\b|CPS 10\b/, /ratio of 2|≥ ?2/, /WHO|CAP|ToGA|QMH/, /by definition/i]) assert.doesNotMatch(text, bad);
});

test('checks: polyp grades', () => {
  assert.deepEqual(levels({ polyp: 'Intestinal-type adenoma' }), ['warn:dysplasia']);
  assert.deepEqual(levels({ polyp: 'Foveolar-type adenoma', dysplasia: 'Low grade dysplasia' }), []);
  assert.deepEqual(levels({ polyp: 'Oxyntic gland adenoma', dysplasia: 'High grade dysplasia' }), ['warn:dysplasia']);
  assert.deepEqual(levels({ polyp: 'Oxyntic gland adenoma' }), []);
  assert.deepEqual(levels({ polyp: 'Inflammatory fibroid polyp', dysplasia: 'Low grade dysplasia' }), ['info:dysplasia']);
  assert.deepEqual(levels({ polyp: 'Fundic gland polyp' }), []);
});

test('checks: carcinoma type and Lauren type', () => {
  assert.deepEqual(levels({ dysplasia: 'Malignancy present' }), ['info:caType']);
  assert.deepEqual(levels({ dysplasia: 'Malignancy present', caType: 'Other (specify)' }), ['error:caOther']);
  assert.deepEqual(levels({ dysplasia: 'Malignancy present', caType: 'Poorly cohesive carcinoma, non-signet-ring cell type', caLauren: 'Intestinal type' }), ['warn:caLauren']);
  assert.deepEqual(levels({ dysplasia: 'Malignancy present', caType: 'Papillary adenocarcinoma', caLauren: 'Diffuse type' }), ['warn:caLauren']);
  assert.deepEqual(levels(TUBULAR), []);
  assert.deepEqual(levels({ her2: 'Score 3+' }), ['info:dysplasia'], 'biomarkers without a carcinoma');
});

test('checks: HER2, PD-L1 and claudin 18.2 values', () => {
  assert.deepEqual(levels({ ...TUBULAR, her2: 'Score 2+' }), ['info:her2Ish']);
  assert.deepEqual(levels({ ...TUBULAR, her2: 'Score 2+', her2Ish: 'Amplified' }), ['warn:her2Ratio']);
  assert.deepEqual(levels({ ...TUBULAR, her2: 'Score 2+', her2Ish: 'Amplified', her2Ratio: '1.5' }), ['warn:her2Ratio']);
  assert.deepEqual(levels({ ...TUBULAR, her2: 'Score 2+', her2Ish: 'Not amplified', her2Ratio: '2.0' }), ['warn:her2Ratio']);
  assert.deepEqual(levels({ ...TUBULAR, her2: 'Score 2+', her2Ish: 'Not amplified', her2Ratio: '1.99' }), []);
  assert.deepEqual(levels({ ...TUBULAR, pdl1: 'Performed' }), ['error:pdl1Cps']);
  assert.deepEqual(levels({ ...TUBULAR, pdl1: 'Performed', pdl1Cps: '120' }), ['error:pdl1Cps']);
  assert.deepEqual(levels({ ...TUBULAR, pdl1: 'Performed', pdl1Cps: '12', pdl1Tps: '140' }), ['error:pdl1Tps']);
  assert.deepEqual(levels({ ...TUBULAR, claudin: 'Positive', claudin2: '30', claudin3: '20' }), ['warn:claudin']);
  assert.deepEqual(levels({ ...TUBULAR, claudin: 'Negative', claudin2: '40', claudin3: '40' }), ['warn:claudin']);
  assert.deepEqual(levels({ ...TUBULAR, claudin: 'Positive', claudin2: '60', claudin3: '50' }), ['error:claudin2']);
  assert.deepEqual(levels({ ...TUBULAR, claudin: 'Positive', claudin2: '25', claudin3: '50' }), []);
  assert.deepEqual(levels(PANEL), []);
});

test('lesionChecks is pure over the values it is given', () => {
  const seen = [];
  const sink = (level) => (message, f) => seen.push(`${level}:${f}`);
  lesionChecks({ dysplasia: 'Absent' }, { err: sink('error'), warn: sink('warn'), info: sink('info') });
  assert.deepEqual(seen, []);
});

test('the new fields show only when they apply', () => {
  const shown = (id, over) => isVisible(field(id), values(over));
  assert.equal(shown('caType', {}), false);
  assert.equal(shown('caType', { dysplasia: 'Intramucosal carcinoma' }), true);
  assert.equal(shown('her2', { dysplasia: 'Malignancy present' }), true);
  assert.equal(shown('her2Ish', { dysplasia: 'Malignancy present', her2: 'Score 3+' }), false);
  assert.equal(shown('her2Ish', { dysplasia: 'Malignancy present', her2: 'Score 2+' }), true);
  assert.equal(shown('her2Ratio', { dysplasia: 'Malignancy present', her2: 'Score 2+', her2Ish: 'Amplified' }), true);
  assert.equal(shown('caGrade', { dysplasia: 'Malignancy present', caType: 'Poorly cohesive carcinoma, signet-ring cell type' }), false);
  assert.equal(shown('caLauren', { dysplasia: 'Malignancy present', caType: 'Poorly cohesive carcinoma, signet-ring cell type' }), true);
  assert.equal(shown('pdl1Cps', { dysplasia: 'Malignancy present', pdl1: 'Performed' }), true);
  assert.equal(shown('claudin3', { dysplasia: 'Malignancy present', claudin: 'Pending' }), false);
  assert.equal(shown('polyp', {}), true);
});

test('polypectomy and polyp lines route to the gastric biopsy template', async () => {
  const manifest = await loadManifest();
  for (const line of ['Stomach, polypectomy', 'Gastric polyp', 'Body polyp, polypectomy', 'Fundus polyps']) {
    assert.equal(matchParts(parseIntake(line), '', manifest)[0].templateId, 'gastric_biopsy', line);
  }
});

test('ulcer joiners: "with ULCER" after active gastritis, "; ULCER" after the inactive phrase', () => {
  assert.equal(dx({ chronic: 'Mild', activity: 'Mild', ulcer: 'Present', imDegree: 'Mild' }), `${HEAD}CHRONIC ACTIVE GASTRITIS with ULCER; mild INTESTINAL METAPLASIA`);
  assert.equal(dx({ chronic: 'Mild', ulcer: 'Present' }), `${HEAD}CHRONIC GASTRITIS, inactive, Helicobacter-negative; ULCER`);
  assert.equal(dx({ chronic: 'Mild', activity: 'Mild', hp: 'Low density', ulcer: 'Present', imDegree: 'Mild' }),
    `${HEAD}HELICOBACTER ASSOCIATED CHRONIC ACTIVE GASTRITIS with ULCER; mild INTESTINAL METAPLASIA`);
  assert.equal(dx({ chronic: 'Mild', hp: 'Low density', imDegree: 'Mild', atrophy: 'Mild' }),
    `${HEAD}HELICOBACTER ASSOCIATED CHRONIC GASTRITIS; mild INTESTINAL METAPLASIA; mild ATROPHY`);
});
