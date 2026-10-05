// Phase 4: cervical biopsy template. Wording is deliberate; update the strings only on purpose.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCase, generate } from '../src/engine.js';
import { loadAll } from '../src/registry.js';
import { squamousRank, glandularRank, organPhrase, squamousClause } from '../generators/cervical.js';

const registry = await loadAll();
const cx = registry.cervical_biopsy;
const run = (c) => generate(cx.schema, cx.generator, c);
const example = () => ({ ...JSON.parse(JSON.stringify(cx.schema.example)), schemaId: cx.schema.id });
const one = (values, caseFields = {}) => {
  const c = createCase(cx.schema, 1);
  c.parts[0].values = { ...c.parts[0].values, ...values };
  return { ...c, ...caseFields };
};

test('template is registered; third part defaults to endocervical curettings', () => {
  assert.ok(cx);
  const c = createCase(cx.schema, 3);
  assert.deepEqual(c.parts.map((p) => p.values.specimenType), ['Cervical biopsy', 'Cervical biopsy', 'Endocervical curettings']);
  assert.equal(cx.schema.caseFields[0].id, 'cytology');
});

test('ranking helpers and organ phrases', () => {
  assert.equal(squamousRank({ squamous: 'Negative', koilocytosis: 'Present' }), 1, 'koilocytosis alone is HPV effect');
  assert.equal(squamousRank({ squamous: 'HSIL (CIN III)' }), 4);
  assert.equal(squamousRank({ specimenType: 'Endocervical curettings', eccContent: 'Mucus and blood only (inadequate)', squamous: 'HSIL (CIN III)' }), 0, 'inadequate curettings carry no lesion');
  assert.equal(glandularRank({ glandular: 'Adenocarcinoma in situ, HPV-associated' }), 1);
  assert.equal(organPhrase({ values: { specimenType: 'Cervical biopsy', specimenName: '12 o\'clock' } }), "CERVIX, cervical biopsy at 12 o'clock");
  assert.equal(organPhrase({ values: { specimenType: 'Cervical biopsy', specimenName: 'Cervix 3 o\'clock' } }), "CERVIX, cervical biopsy at 3 o'clock");
  assert.equal(organPhrase({ values: { specimenType: 'Endocervical curettings' } }), 'ENDOCERVICAL CURETTINGS');
  assert.equal(organPhrase({ values: { specimenType: 'Cervical polyp' } }), 'CERVIX, polypectomy', 'the commonest released head (2026-10-05)');
});

test('default single biopsy is the house negative paragraph with no part letter', () => {
  const out = run(one({}));
  assert.equal(out.specimens, 'Cervix, biopsy');
  assert.equal(out.microscopy, 'Serial sections show a piece of cervical transformation zone mucosa. The squamous epithelium shows normal maturation and no CIN is seen. The endocervical glands are unremarkable. There is no evidence of squamous intraepithelial lesion, glandular dysplasia or malignancy.');
  assert.equal(out.diagnosis, 'CERVIX, cervical biopsy - NO EVIDENCE OF SQUAMOUS INTRAEPITHELIAL LESION OR MALIGNANCY');
});

test('LSIL with koilocytosis follows the house diagnosis string', () => {
  const out = run(one({ specimenName: "6 o'clock", tissue: 'Ectocervical mucosa', squamous: 'LSIL (CIN I)', koilocytosis: 'Present' }));
  assert.equal(out.diagnosis, "CERVIX, cervical biopsy at 6 o'clock - LOW GRADE SQUAMOUS INTRAEPITHELIAL LESION (LSIL / CIN I AND HPV EFFECT)");
  assert.equal(out.microscopy, 'Serial sections show a piece of ectocervical mucosa. Focally, the squamous epithelium shows enlarged hyperchromatic nuclei limited to the basal third, with maturation towards the surface. Koilocytosis is also seen. There is no evidence of high grade squamous intraepithelial lesion or malignancy.');
  const hpvOnly = run(one({ koilocytosis: 'Present' }));
  assert.match(hpvOnly.diagnosis, /- LOW GRADE SQUAMOUS INTRAEPITHELIAL LESION \(HPV EFFECT\)$/);
  assert.match(hpvOnly.microscopy, /no CIN is seen\. Koilocytosis is present\./);
});

test('HSIL: CIN grade, gland involvement, p16/Ki-67 sentence, invasion caveat', () => {
  const out = run(one({ specimenName: "12 o'clock", squamous: 'HSIL (CIN III)', glandInvolvement: 'Involved', p16: 'Block positive', ki67: 'Extends into the upper two-thirds' }));
  assert.equal(out.diagnosis, "CERVIX, cervical biopsy at 12 o'clock - HIGH GRADE SQUAMOUS INTRAEPITHELIAL LESION (HSIL / CIN III) with endocervical gland involvement");
  assert.match(out.microscopy, /full thickness loss of maturation .* The lesion extends into endocervical glands\. No stromal invasion is identified\. On immunohistochemistry, p16 shows strong diffuse block positivity and Ki-67 labels nuclei extending into the upper two-thirds of the epithelium, supporting a high grade lesion\. There is no evidence of invasive malignancy\.$/);
  assert.doesNotMatch(out.microscopy, /endocervical glands are unremarkable/);

  const cin2 = squamousClause({ squamous: 'HSIL (CIN II)', koilocytosis: 'Present', invasionSuspicious: 'Cannot be excluded' });
  assert.equal(cin2, 'HIGH GRADE SQUAMOUS INTRAEPITHELIAL LESION (HSIL / CIN II AND HPV EFFECT); early stromal invasion cannot be excluded, excision recommended for definitive assessment');
});

test('invasive squamous cell carcinoma and glandular lesions', () => {
  const scc = run(one({ squamous: 'Squamous cell carcinoma', sccType: 'Keratinising', invasionDepth: '3', lvi: 'Present' }));
  assert.equal(scc.diagnosis, 'CERVIX, cervical biopsy - INVASIVE SQUAMOUS CELL CARCINOMA, keratinising type, depth of invasion at least 3 mm, with lymphovascular invasion');
  assert.match(scc.microscopy, /invasive keratinising squamous cell carcinoma .* to a depth of at least 3 mm in this biopsy\. Lymphovascular invasion is present\./);
  assert.doesNotMatch(scc.microscopy, /no evidence of/);

  const ais = run(one({ squamous: 'HSIL (CIN II)', glandular: 'Adenocarcinoma in situ, HPV-associated' }));
  assert.equal(ais.diagnosis, 'CERVIX, cervical biopsy - HIGH GRADE SQUAMOUS INTRAEPITHELIAL LESION (HSIL / CIN II); ADENOCARCINOMA IN SITU, HPV-associated');
  assert.match(ais.microscopy, /adenocarcinoma in situ of HPV-associated type\. No stromal invasion is identified\. There is no evidence of invasive malignancy\.$/);

  const gastric = run(one({ glandular: 'Adenocarcinoma, HPV-independent (gastric type)' }));
  assert.equal(gastric.diagnosis, 'CERVIX, cervical biopsy - INVASIVE ADENOCARCINOMA, HPV-independent (gastric type)');
});

test('benign findings, cytology discordance comment, polyp and inadequate curettings', () => {
  const cerv = run(one({ benign: 'Chronic cervicitis', correlation: 'Lesion reported on cytology is not represented' }, { cytology: 'HSIL' }));
  assert.equal(cerv.diagnosis, 'CERVIX, cervical biopsy - CHRONIC CERVICITIS; no evidence of dysplasia or malignancy; see comment');
  assert.match(cerv.microscopy, /lymphocytes and plasma cells\. There is no evidence of squamous intraepithelial lesion, glandular dysplasia or malignancy\. The HSIL reported on cytology is not represented in this biopsy; correlation with the colposcopic findings and further sampling are suggested if clinically indicated\.$/);

  // 2026-10-05 (user request): a polyp is described as one and signed out by its type alone.
  const polyp = run(one({ specimenType: 'Cervical polyp', benign: 'Endocervical polyp' }));
  assert.equal(polyp.specimens, 'Cervix, polyp');
  assert.equal(polyp.diagnosis, 'CERVIX, polypectomy - ENDOCERVICAL POLYP', 'the benign pick is not repeated');
  assert.equal(polyp.microscopy, 'Sections show a polypoid piece of tissue composed of endocervical glands, some cystically dilated, lined by mucinous columnar epithelium and set in a fibrovascular stroma with a chronic inflammatory infiltrate. There is no evidence of squamous intraepithelial lesion, glandular dysplasia or malignancy.');

  const ecc = run(one({ specimenType: 'Endocervical curettings', eccContent: 'Mucus and blood only (inadequate)', squamous: 'HSIL (CIN III)' }));
  assert.equal(ecc.microscopy, 'Sections show mucus and blood only. No epithelium is present for assessment.');
  assert.equal(ecc.diagnosis, 'ENDOCERVICAL CURETTINGS - MUCUS AND BLOOD ONLY; NO EPITHELIUM FOR ASSESSMENT (INADEQUATE)');
});

test('example case renders three parts with a SUMMARY line', () => {
  const out = run(example());
  assert.equal(out.specimens, "(A) Cervix, 12 o'clock, biopsy\n(B) Cervix, 6 o'clock, biopsy\n(C) Endocervical curettings");
  assert.match(out.diagnosis, /^\(A\) CERVIX, cervical biopsy at 12 o'clock - HIGH GRADE SQUAMOUS INTRAEPITHELIAL LESION \(HSIL \/ CIN III\) with endocervical gland involvement\n\(B\) .*LSIL \/ CIN I AND HPV EFFECT\)\n\(C\) ENDOCERVICAL CURETTINGS - NO EVIDENCE OF SQUAMOUS INTRAEPITHELIAL LESION OR MALIGNANCY\n\nSUMMARY: Highest grade squamous lesion HSIL \(CIN III\) in part A\.$/);
  assert.match(out.microscopy, /\(C\) Sections show fragments of endocervical mucosa and mucus\. The endocervical glands are unremarkable\./);
  const c = example();
  c.options.summary = false;
  assert.doesNotMatch(run(c).diagnosis, /SUMMARY/);
});
