// Gastrointestinal stromal tumour resection — second synoptic (hybrid) template.
// Fixture wording is protected; change it only deliberately and say why in the commit.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { generate, snippetsFor } from '../src/engine.js';
import { loadAll } from '../src/registry.js';

const reg = await loadAll();
const { schema, generator } = reg.gist_resection;
const exampleValues = schema.example.parts[0].values;
const run = (values = {}, options = {}, extraParts = []) => generate(schema, generator, {
  schemaId: 'gist_resection', caseTitle: '', options: { ...schema.example.options, ...options },
  parts: [{ label: 'A', values: { ...exampleValues, ...values } }, ...extraParts.map((v, i) => ({ label: 'BCD'[i], values: { ...exampleValues, ...v } }))]
});
const snippets = (values) => snippetsFor({ gist_resection: reg.gist_resection }, {
  schemaId: 'gist_resection', parts: [{ label: 'A', templateId: 'gist_resection', values: { ...exampleValues, ...values } }], snippets: {}
}).filter((s) => s.active).map((s) => s.id);
const issues = (values) => run(values).issues.map((i) => `${i.level}: ${i.message}`);
const rows = (out) => Object.fromEntries(out.synoptic.split('\n').filter((l) => l.startsWith('- ')).map((l) => { const i = l.indexOf(': '); return [l.slice(2, i), l.slice(i + 2)]; }));

// Jejunal high-risk, ruptured, KIT-negative, node-positive, peritoneal metastasis, PDGFRA D842V.
const JEJUNAL = {
  tumourSite: 'Jejunum', procedure: 'Segmental small bowel resection', tumourSiteDetail: '', specimenDimensions: '120 mm length of small bowel',
  tumourSize: '7.2', tumourSizeOther: '', tumourGrowth: 'Exophytic (serosal)', cutSurface: 'Tan-white with necrosis', mucosalUlceration: 'Present',
  tumourRupture: 'Present (spontaneous / preoperative)', histType: 'Gastrointestinal stromal tumour, epithelioid type', mitoticCount: '12',
  necrosis: 'Present', necrosisPercent: '20', lvi: 'Present', nodesExamined: '3', nodesPositive: '1', ene: 'Not identified', largestDepositMm: '4',
  marginStatus: 'Involved by GIST', marginName: 'mesenteric', kitIhc: 'Negative', dog1Ihc: 'Positive', cd34Ihc: 'Negative', sdhbIhc: 'Intact', otherIhc: '',
  molecular: 'PDGFRA exon 18 D842V mutation', molecularDetail: 'c.2525A>T p.(Asp842Val)', distantMetastasis: ['Peritoneum'], metastasisDetail: 'two omental nodules, 6 and 9 mm',
  blockKeyText: '1-3 Tumour\n4 Mesenteric margin\n5 Lymph nodes\n6 Omental nodules'
};

test('schema metadata and the QMH source are recorded; manifest lists the template', () => {
  assert.equal(schema.kind, 'cancer resection');
  assert.equal(schema.system, 'GI');
  assert.match(schema.source.url, /GI-GIST\.html$/);
  assert.equal(schema.source.stagingProtocol, 'gist');
  assert.match(schema.source.capProtocol, /GIST Resection 4\.3\.0\.0/);
  assert.ok(schema.aliases.includes('GIST') && schema.aliases.includes('DOG1') && schema.aliases.includes('Miettinen'));
  const manifest = JSON.parse(readFileSync(new URL('../templates/manifest.json', import.meta.url), 'utf8'));
  assert.ok(manifest.templates.some((t) => t.id === 'gist_resection' && t.kind === 'cancer resection'));
  const ids = new Set(schema.fields.map((f) => f.id));
  for (const id of ['tumourSite', 'tumourSize', 'residualTumour', 'nodesExamined', 'nodesPositive', 'distantMetastasis', 'focality', 'recurrent', 'treatmentEffect', 'mitoticStatus', 'mitoticCount', 'riskAssessment', 'tnmOverride', 'tnmOverrideReason']) assert.ok(ids.has(id), `staging field ${id}`);
});

test('fixture: gastric spindle-cell very-low-risk GIST (example case)', () => {
  const out = run();
  assert.equal(out.specimens, 'Stomach, wedge resection');
  assert.equal(out.macro, 'Received in formalin is a wedge resection specimen of stomach measuring 65 x 50 x 30 mm. There is a well-circumscribed intramural tumour in the greater curvature, body measuring 4.5 cm in greatest dimension (4.5 x 3.8 x 3.0 cm). The cut surface is tan-white, whorled and circumscribed. The overlying mucosa is intact. Tumour rupture is not identified. Representative sections are taken; see block key.');
  assert.equal(out.blockKey, '(1) Tumour with overlying mucosa. (2-4) Tumour, deepest point and serosal surface. (5) Tumour, closest resection margin. (6) Uninvolved stomach.');
  assert.equal(out.microscopy, 'Sections show a well-circumscribed gastrointestinal stromal tumour composed of spindle cells arranged in fascicles, with pale eosinophilic cytoplasm and uniform ovoid nuclei; the mitotic count is 2 per 5 mm2. Necrosis is not identified. Lymphovascular invasion is not identified. Perineural invasion is not identified. The tumour is 8 mm from the closest (gastric resection) margin. No lymph nodes are identified. Immunohistochemistry shows the tumour cells are positive for KIT (CD117) and DOG1; desmin, S100 and SOX10 negative. Mutation analysis for KIT and PDGFRA hot spots has been requested (block 3); the result will follow as a supplementary report. The tumour carries a very low risk of progressive disease (Miettinen and Lasota 2006; stomach, 4.5 cm, 2 mitoses per 5 mm2).');
  assert.equal(out.synoptic, [
    '- Procedure: Wedge resection',
    '- Tumour site: Stomach (greater curvature, body)',
    '- Tumour size: 4.5 cm in greatest dimension (4.5 x 3.8 x 3.0 cm)',
    '- Tumour focality: Unifocal',
    '- Tumour rupture: Not identified',
    '- Histologic type: Gastrointestinal stromal tumour, spindle cell type',
    '- Histologic grade: G1: Low grade; mitotic rate 5 or fewer per 5 mm2',
    '- Mitotic count: 2 per 5 mm2 (5 or fewer per 5 mm2)',
    '- Necrosis: Not identified',
    '- KIT (CD117) IHC: Positive',
    '- DOG1 IHC: Positive',
    '- SDHB IHC: Not performed',
    '- Other immunohistochemistry: desmin, S100 and SOX10 negative',
    '- Lymphovascular invasion: Not identified',
    '- Perineural invasion: Not identified',
    '- Risk assessment (Miettinen and Lasota 2006): Very low risk (stomach, 4.5 cm, 2 mitoses per 5 mm2)',
    '- Presurgical treatment: No known presurgical therapy',
    '- Treatment effect: No known presurgical therapy',
    '- Molecular studies: Requested; result to follow (block 3)',
    '- Surgical margins: Uninvolved by GIST (8 mm from the gastric resection margin)',
    '- Regional lymph nodes: No regional lymph nodes submitted or found',
    '- Distant metastasis: Not applicable',
    '- Pathological stage classification (AJCC 8th edition): pT2 pNX',
    '  - Stage group (if cM0): IA'
  ].join('\n'));
  assert.equal(out.diagnosis, 'STOMACH, wedge resection - GASTROINTESTINAL STROMAL TUMOUR, spindle cell type, 4.5 cm, mitotic count 2 per 5 mm2; very low risk (Miettinen and Lasota 2006); margins clear; pT2 pNX (AJCC 8th edition), stage IA (if cM0); KIT and DOG1 positive; molecular studies to follow');
  assert.deepEqual(out.issues, []);
  assert.deepEqual(snippets({}), ['gist_resection_molecular_pending']);
  assert.ok(out.report.includes('supplementary report. The result guides tyrosine kinase inhibitor'));
});

test('fixture: jejunal high-risk, ruptured, KIT-negative, node-positive GIST with peritoneal metastasis', () => {
  const out = run(JEJUNAL);
  assert.equal(out.specimens, 'Jejunum, segmental small bowel resection');
  assert.equal(out.macro, 'Received in formalin is a segmental small bowel resection specimen of jejunum measuring 120 mm length of small bowel. There is an exophytic tumour arising from the serosal aspect measuring 7.2 cm in greatest dimension. The cut surface is tan-white with necrosis. The overlying mucosa is ulcerated. There is tumour rupture (spontaneous / preoperative). Representative sections are taken; see block key.');
  assert.equal(out.blockKey, '(1-3) Tumour. (4) Mesenteric margin. (5) Lymph nodes. (6) Omental nodules.');
  assert.equal(out.microscopy, 'Sections show a gastrointestinal stromal tumour composed of epithelioid cells with rounded nuclei and eosinophilic to clear cytoplasm, arranged in nests and sheets; the mitotic count is 12 per 5 mm2. Necrosis is present (approximately 20% of the tumour). The overlying mucosa is ulcerated. Lymphovascular invasion is present. Perineural invasion is not identified. The tumour involves the mesenteric margin. 3 regional lymph nodes are identified, one of which contains metastatic GIST (1/3), without extranodal extension; the largest deposit measures 4 mm. Metastatic GIST is present in the peritoneum (two omental nodules, 6 and 9 mm). Immunohistochemistry shows the tumour cells are positive for DOG1 and negative for KIT (CD117) and CD34; SDHB expression is retained. Molecular analysis shows a PDGFRA exon 18 D842V mutation (c.2525A>T p.(Asp842Val)). The tumour is overtly malignant (metastatic).');
  const r = rows(out);
  assert.equal(r['Histologic grade'], 'G2: High grade; mitotic rate more than 5 per 5 mm2');
  assert.equal(r['Necrosis'], 'Present (20%)');
  assert.equal(r['CD34 IHC'], 'Negative');
  assert.equal(r['Risk assessment (Miettinen and Lasota 2006)'], 'Overtly malignant/metastatic');
  assert.equal(r['Molecular studies'], 'PDGFRA exon 18 D842V mutation (c.2525A>T p.(Asp842Val))');
  assert.equal(r['Surgical margins'], 'Involved by GIST (mesenteric margin)');
  assert.equal(r['Regional lymph nodes'], '3 examined; 1 involved; extranodal extension not identified; largest metastatic deposit 4 mm');
  assert.equal(r['Distant metastasis'], 'Peritoneum (two omental nodules, 6 and 9 mm)');
  assert.equal(r['Pathological stage classification (AJCC 8th edition)'], 'pT3 pN1 pM1');
  assert.ok(out.synoptic.endsWith('  - Stage group: IV'));
  assert.equal(out.diagnosis, 'JEJUNUM, segmental small bowel resection - GASTROINTESTINAL STROMAL TUMOUR, epithelioid type, 7.2 cm, mitotic count 12 per 5 mm2; overtly malignant / metastatic; tumour rupture present; mesenteric margin involved; 1 of 3 lymph nodes involved; metastatic GIST in peritoneum; pT3 pN1 pM1 (AJCC 8th edition), stage IV; DOG1 positive; KIT negative; PDGFRA exon 18 D842V mutation');
  assert.deepEqual(out.issues, []);
  assert.deepEqual(snippets(JEJUNAL).sort(), ['gist_resection_kit_negative', 'gist_resection_pdgfra_d842v', 'gist_resection_rupture']);
});

test('synoptic element order follows the saved QMH GI-GIST page', () => {
  const tool = fileURLToPath(new URL('../tools/import-qmh.js', import.meta.url));
  const page = fileURLToPath(new URL('./fixtures/qmh/GI-GIST.html', import.meta.url));
  const draft = JSON.parse(execFileSync(process.execPath, [tool, page], { encoding: 'utf8' }));
  assert.equal(draft.source.page, 'GI-GIST.html');
  assert.match(readFileSync(page, 'utf8'), /GIST Resection 4\.3\.0\.0/);
  // QMH printed label -> our synoptic label (macro elements sit above the QMH list; grade/mitoses are derived).
  const MAP = {
    'Histologic type': 'Histologic type', 'Histologic grade': 'Histologic grade', 'Mitotic count': 'Mitotic count', Necrosis: 'Necrosis',
    'KIT (CD117) IHC': 'KIT (CD117) IHC', 'DOG1 IHC': 'DOG1 IHC', 'SDHB IHC': 'SDHB IHC', 'Perineural invasion': 'Perineural invasion',
    'Risk assessment': 'Risk assessment (Miettinen and Lasota 2006)', 'Presurgical treatment': 'Presurgical treatment', 'Treatment effect': 'Treatment effect',
    'Surgical margins': 'Surgical margins', 'Number of regional lymph nodes examined': 'Regional lymph nodes', 'Primary tumor (pT)': 'Pathological stage classification (AJCC 8th edition)'
  };
  const qmh = draft.fields.map((f) => (f.outLabel || f.label).trim()).filter((l) => MAP[l]);
  assert.ok(qmh.length >= 12, `mapped QMH elements: ${qmh.length}`);
  const ours = Object.keys(rows(run(JEJUNAL)));
  let cursor = -1;
  for (const label of qmh) {
    const idx = ours.indexOf(MAP[label]);
    assert.ok(idx > cursor, `${MAP[label]} out of order (QMH: ${label})`);
    cursor = idx;
  }
  const idx = (l) => ours.indexOf(l);
  assert.ok(idx('Procedure') < idx('Tumour site') && idx('Tumour rupture') < idx('Histologic type'));
  assert.ok(idx('Lymphovascular invasion') < idx('Perineural invasion') && idx('Molecular studies') < idx('Surgical margins'));
  assert.ok(idx('Regional lymph nodes') < idx('Distant metastasis') && idx('Distant metastasis') < idx('Pathological stage classification (AJCC 8th edition)'));
});

test('treated case with complete response: ypT0, tumour bed wording, risk not applicable', () => {
  const out = run({ residualTumour: 'No residual tumour (complete response)', presurgicalTreatment: 'Systemic therapy performed (imatinib or other tyrosine kinase inhibitor)', presurgicalDetail: 'imatinib 9 months', treatmentEffect: 'Present', viableTumourPercent: '0', mitoticStatus: 'Not applicable', molecular: 'Not performed', molecularDetail: '' });
  assert.match(out.microscopy, /^Sections of the stomach show hyalinised fibrous tissue .* no residual viable gastrointestinal stromal tumour is identified\. The tumour bed is 8 mm from the closest \(gastric resection\) margin\. No lymph nodes are identified\.$/);
  const r = rows(out);
  assert.equal(r['Risk assessment (Miettinen and Lasota 2006)'], 'Not applicable (complete response to treatment)');
  assert.equal(r['Treatment effect'], 'Present (0% viable tumour)');
  assert.equal(r['Presurgical treatment'], 'Systemic therapy performed (imatinib or other tyrosine kinase inhibitor) (imatinib 9 months)');
  assert.equal(r['Pathological stage classification (AJCC 8th edition)'], 'ypT0 ypNX');
  assert.equal(out.diagnosis, 'STOMACH, wedge resection - NO RESIDUAL GASTROINTESTINAL STROMAL TUMOUR (complete response to treatment); margins clear; ypT0 ypNX (AJCC 8th edition)');
  assert.deepEqual(out.issues, []);
});

test('SDHB-deficient, multifocal, pathologist override: descriptors, override echo and snippets', () => {
  const out = run({ sdhbIhc: 'Deficient', focality: 'Multifocal', focalityDetail: '3 nodules, 45, 12 and 8 mm', histType: 'Gastrointestinal stromal tumour, mixed spindle and epithelioid type', tnmOverride: 'pT3 pN0', tnmOverrideReason: 'size 5.6 cm on the fresh specimen', molecular: 'Not performed', molecularDetail: '' });
  const r = rows(out);
  assert.equal(r['Tumour focality'], 'Multifocal (3 nodules, 45, 12 and 8 mm)');
  assert.equal(r['SDHB IHC'], 'Deficient');
  assert.equal(r['Pathological stage classification (AJCC 8th edition)'], 'pT3(m) pN0 [pathologist override; derived T2/NX - size 5.6 cm on the fresh specimen]');
  assert.ok(out.synoptic.endsWith('  - Stage group (if cM0): IB'));
  assert.match(out.microscopy, /SDHB expression is lost \(SDH-deficient\)/);
  assert.match(out.diagnosis, /mixed spindle and epithelioid type, 4\.5 cm.*SDHB-deficient$/);
  assert.match(out.macro, /The tumour is multifocal \(3 nodules, 45, 12 and 8 mm\)\./);
  assert.deepEqual(snippets({ sdhbIhc: 'Deficient', focality: 'Multifocal', molecular: 'Not performed' }).sort(), ['gist_resection_multifocal', 'gist_resection_sdhb_deficient']);
  assert.ok(issues({ sdhbIhc: 'Deficient', molecular: 'Not performed' }).some((m) => /SDHB-deficient GIST: germline SDHx/.test(m)));
  assert.ok(out.issues.some((i) => /Override T3 does not match the size-derived category \(T2 for 4\.5 cm\)/.test(i.message)));
});

test('checks: required fields, node arithmetic, KIT/DOG1 double negative, override reason, picked risk vs derived, non-tabulated site', () => {
  assert.ok(issues({ tumourSize: '' }).includes('error: Tumour size (cm) is required to assign pT and the risk category.'));
  assert.ok(issues({ mitoticCount: '' }).includes('error: Mitotic count per 5 mm2 is required (enter 0 if none seen).'));
  assert.ok(issues({ nodesExamined: '' }).includes('error: Number of regional lymph nodes examined is required (enter 0 if none submitted).'));
  assert.ok(issues({ nodesExamined: '2', nodesPositive: '' }).includes('error: Number of involved lymph nodes is required (enter 0 if none).'));
  assert.ok(issues({ nodesExamined: '2', nodesPositive: '3' }).includes('error: Involved lymph nodes exceed the number examined.'));
  assert.ok(issues({ marginMm: '' }).includes('warn: Margins uninvolved: record the distance to the closest margin in mm.'));
  assert.ok(issues({ kitIhc: 'Negative', dog1Ihc: 'Negative' }).some((m) => /Both KIT and DOG1 are negative/.test(m)));
  assert.ok(issues({ kitIhc: 'Negative', molecular: 'Not performed' }).some((m) => /KIT-negative GIST: molecular testing/.test(m)));
  assert.ok(issues({ tnmOverride: 'pT3 pN0' }).includes('error: Give a reason for overriding the derived pTNM.'));
  assert.ok(issues({ tnmOverride: 'stage 2' }).some((m) => /could not be parsed/.test(m)));
  assert.ok(issues({ riskAssessment: 'High risk' }).some((m) => /Risk category picked \(High risk\) differs from the derived category \(Very low risk\)/.test(m)));
  assert.equal(rows(run({ riskAssessment: 'High risk' }))['Risk assessment (Miettinen and Lasota 2006)'], 'High risk');
  assert.ok(issues({ tumourSite: 'Oesophagus' }).some((m) => /oesophagus GIST uses the small-intestinal criteria/.test(m)));
  assert.ok(issues({ treatmentEffect: 'Present' }).some((m) => /Treatment effect recorded but presurgical treatment/.test(m)));
  assert.ok(issues({ presurgicalTreatment: 'Therapy performed, type not specified' }).some((m) => /record the treatment effect/.test(m)));
});

test('options: synoptic only, no macro, stage group off, section headers; multi-part headings', () => {
  const a = run({}, { synopticOnly: true });
  assert.equal(a.microscopy, '');
  assert.ok(a.synoptic.startsWith('- Procedure'));
  const b = run({}, { macro: false });
  assert.equal(b.macro, ''); assert.equal(b.blockKey, '');
  const c = run({}, { stageGroup: false });
  assert.ok(!c.synoptic.includes('Stage group'));
  assert.ok(c.diagnosis.endsWith('pT2 pNX (AJCC 8th edition); KIT and DOG1 positive; molecular studies to follow'));
  const d = run({}, { includeHeader: true }).report;
  assert.ok(d.indexOf('MICROSCOPIC EXAMINATION:') < d.indexOf('SYNOPTIC REPORT:') && d.indexOf('SYNOPTIC REPORT:') < d.indexOf('DIAGNOSIS:'));
  const e = run({}, {}, [{ tumourSite: 'Omentum', procedure: 'Excision of omental / mesenteric mass', tumourSize: '1.5', mitoticCount: '0', tumourSiteDetail: '', specimenDimensions: '20 x 15 x 10 mm', blockKeyText: '1 Nodule' }]);
  assert.equal(e.specimens, '(A) Stomach, wedge resection\n(B) Omentum, excision of omental / mesenteric mass');
  assert.ok(e.synoptic.startsWith('(A) Stomach, wedge resection\n- Procedure') && e.synoptic.includes('\n\n(B) Omentum, excision of omental / mesenteric mass\n- Procedure'));
  assert.match(e.macro, /\(B\) Received in formalin is an excision of omental \/ mesenteric mass \(omentum\) measuring 20 x 15 x 10 mm\./);
  assert.match(e.microscopy, /\(B\) .*The tumour carries no appreciable risk of progressive disease \(Miettinen and Lasota 2006; omentum, 1\.5 cm, 0 mitoses per 5 mm2\)\./);
  assert.match(e.diagnosis, /\(B\) OMENTUM, excision of omental \/ mesenteric mass - GASTROINTESTINAL STROMAL TUMOUR, spindle cell type, 1\.5 cm, mitotic count 0 per 5 mm2; no appreciable risk \(Miettinen and Lasota 2006\); margins clear; pT1 pNX \(AJCC 8th edition\), stage IA \(if cM0\)/);
});
