// Cervical polyps and endometrial aspirates (user request, 2026-10-05). Spec:
// docs/specs/cervical-polyps-endometrial-aspirates.md. A cervical polyp is described as a polyp and
// signed out by its type (endocervical, decidual or endometrial); an endometrial sample defaults to
// an aspirate and says so on the diagnosis line; a benign endometrial line carries no trailing
// negative. Wording is deliberate; update the strings only on purpose.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCase, generate, isVisible } from '../src/engine.js';
import { parseIntake, matchParts, presetValues } from '../src/intake.js';
import { loadAll, loadManifest } from '../src/registry.js';

const registry = await loadAll();
const manifest = await loadManifest();
const cx = registry.cervical_biopsy;
const em = registry.endometrial_biopsy;

const render = (t, values) => {
  const c = createCase(t.schema, 1);
  c.parts[0].values = { ...c.parts[0].values, ...values };
  return generate(t.schema, t.generator, c);
};
const polyp = (values = {}) => render(cx, { specimenType: 'Cervical polyp', ...values });
const aspirate = (values = {}) => render(em, values);
const field = (t, id) => t.schema.fields.find((f) => f.id === id);
const route = (line) => matchParts(parseIntake(line), '', manifest)[0];
const preset = (t, line) => {
  const parsed = parseIntake(line);
  return presetValues(t.schema, parsed.parts[0], matchParts(parsed, '', manifest)[0]);
};

// ---------- cervical polyps ----------

test('polyp type and features appear only for a polyp, and replace the tissue picker', () => {
  assert.deepEqual(field(cx, 'polypType').options, ['Endocervical polyp', 'Decidual polyp', 'Endometrial polyp']);
  assert.equal(field(cx, 'polypType').default, 'Endocervical polyp');
  assert.deepEqual(field(cx, 'polypFeatures').options, ['Cystically dilated glands', 'Chronic inflammation', 'Thick-walled vessels', 'Squamous metaplasia', 'Surface erosion']);
  assert.deepEqual(field(cx, 'polypFeatures').default, ['Cystically dilated glands', 'Chronic inflammation']);
  const vis = (type) => ['polypType', 'polypFeatures', 'tissue'].filter((id) => isVisible(field(cx, id), { specimenType: type }));
  assert.deepEqual(vis('Cervical polyp'), ['polypType', 'polypFeatures']);
  assert.deepEqual(vis('Cervical biopsy'), ['tissue']);
  assert.deepEqual(vis('Endocervical curettings'), []);
});

test('an endocervical polyp is described as one and signed out by its type alone', () => {
  const r = polyp();
  assert.equal(r.specimens, 'Cervix, polyp');
  assert.equal(r.microscopy, 'Sections show a polypoid piece of tissue composed of endocervical glands, some cystically dilated, lined by mucinous columnar epithelium and set in a fibrovascular stroma with a chronic inflammatory infiltrate. There is no evidence of squamous intraepithelial lesion, glandular dysplasia or malignancy.');
  assert.equal(r.diagnosis, 'CERVIX, polypectomy - ENDOCERVICAL POLYP');
  assert.doesNotMatch(r.microscopy, /normal maturation and no CIN/, 'no biopsy sentence on a polyp');
  const all = polyp({ pieces: '2', polypFeatures: ['Thick-walled vessels', 'Chronic inflammation', 'Squamous metaplasia', 'Surface erosion'] });
  assert.match(all.microscopy, /^Sections show 2 polypoid pieces of tissue composed of endocervical glands lined by mucinous columnar epithelium and set in a fibrovascular stroma with thick-walled vessels and a chronic inflammatory infiltrate\. The surface shows squamous metaplasia and focal erosion\. /);
  assert.match(polyp({ polypFeatures: ['Surface erosion'] }).microscopy, /fibrovascular stroma\. The surface is focally eroded\. /);
  assert.match(polyp({ polypFeatures: ['Squamous metaplasia'] }).microscopy, /fibrovascular stroma\. The surface shows squamous metaplasia\. /);
});

test('decidual and endometrial polyps', () => {
  const d = polyp({ polypType: 'Decidual polyp', benign: 'Decidual change' });
  assert.equal(d.microscopy, 'Sections show a polypoid piece of tissue in which the stroma is replaced by sheets of decidualised cells with abundant eosinophilic cytoplasm, well-defined cell borders and bland round nuclei. Scattered endocervical glands, some cystically dilated, are present and the stroma contains a chronic inflammatory infiltrate. There is no evidence of squamous intraepithelial lesion, glandular dysplasia or malignancy.');
  assert.equal(d.diagnosis, 'CERVIX, polypectomy - DECIDUAL POLYP', 'decidual change is not repeated on a decidual polyp');
  const e = polyp({ polypType: 'Endometrial polyp', polypFeatures: [] });
  assert.equal(e.microscopy, 'Sections show a polypoid piece of tissue composed of irregularly spaced endometrial-type glands set in a fibrous stroma with thick-walled vessels. There is no evidence of squamous intraepithelial lesion, glandular dysplasia or malignancy.');
  assert.equal(e.diagnosis, 'CERVIX, polypectomy - ENDOMETRIAL POLYP');
});

test('a lesion or a second benign finding in a polyp comes with the polyp type', () => {
  const l = polyp({ squamous: 'LSIL (CIN I)', koilocytosis: 'Present' });
  assert.equal(l.diagnosis, 'CERVIX, polypectomy - LOW GRADE SQUAMOUS INTRAEPITHELIAL LESION (LSIL / CIN I AND HPV EFFECT); ENDOCERVICAL POLYP');
  assert.match(l.microscopy, /chronic inflammatory infiltrate\. Focally, the squamous epithelium shows enlarged hyperchromatic nuclei limited to the basal third/);
  assert.equal(polyp({ benign: 'Microglandular hyperplasia', specimenName: "12 o'clock" }).diagnosis, "CERVIX, polypectomy at 12 o'clock - ENDOCERVICAL POLYP; MICROGLANDULAR HYPERPLASIA");
});

test('a biopsy with an endocervical polyp keeps its biopsy line', () => {
  const r = render(cx, { benign: 'Endocervical polyp' });
  assert.match(r.microscopy, /The endocervical glands are unremarkable\. A polypoid fragment of endocervical glands lined by mucinous columnar epithelium in a fibrovascular stroma is also present, in keeping with an endocervical polyp\. There is no evidence/);
  assert.equal(r.diagnosis, 'CERVIX, cervical biopsy - ENDOCERVICAL POLYP; no evidence of dysplasia or malignancy');
});

test('intake: cervical polyp lines open the cervical form as a polyp', () => {
  for (const line of ['Cervical polyp', 'Cervix, polyp', 'Polyp, cervix', 'Cervical polypectomy', 'Cervical polyp, avulsion', 'Endocervical polyp', 'Cervical polyp, excision', 'Decidual polyp, cervix']) {
    const m = route(line);
    assert.equal(m.templateId, 'cervical_biopsy', line);
    assert.equal(m.tier, 'confident', line);
    assert.equal(preset(cx, line).specimenType, 'Cervical polyp', line);
  }
  assert.deepEqual(preset(cx, 'Decidual polyp, cervix'), { specimenType: 'Cervical polyp', polypType: 'Decidual polyp' });
  assert.deepEqual(preset(cx, 'Cervical polyp'), { specimenType: 'Cervical polyp' }, 'no site words from the procedure');
  assert.deepEqual(preset(cx, 'Endocervical curettings'), { specimenType: 'Endocervical curettings' });
  assert.deepEqual(preset(cx, "Cervix, 12 o'clock, biopsy"), { specimenName: "12 o'clock" });
  assert.equal(route('Cervix, LEEP').templateId, 'cervical_excision');
  assert.equal(route('Cervix, excision').templateId, 'cervical_excision');
  assert.equal(route('Endometrial polyp, hysteroscopic polypectomy').templateId, 'endometrial_biopsy');
});

// ---------- endometrial aspirates ----------

test('an endometrial sample is an aspirate by default and the line says so', () => {
  assert.equal(field(em, 'specimenType').default, 'Endometrial aspirate');
  assert.equal(createCase(em.schema, 1).parts[0].values.specimenType, 'Endometrial aspirate');
  const r = aspirate();
  assert.equal(r.specimens, 'Endometrium, aspirate');
  assert.equal(r.diagnosis, 'ENDOMETRIUM, aspirate - PROLIFERATIVE ENDOMETRIUM');
  assert.match(r.microscopy, /There is no evidence of chronic endometritis, hyperplasia or malignancy\.$/, 'the microscopy keeps its closing negative');
  assert.equal(aspirate({ specimenType: 'Endometrial biopsy (Pipelle)' }).diagnosis, 'ENDOMETRIUM, aspirate - PROLIFERATIVE ENDOMETRIUM', 'a saved draft with the retired option reads as an aspirate');
  assert.equal(aspirate({ specimenType: 'Endometrial biopsy' }).diagnosis, 'ENDOMETRIUM, biopsy - PROLIFERATIVE ENDOMETRIUM');
  assert.equal(aspirate({ specimenType: 'Endometrial curettings', phase: 'Secretory' }).diagnosis, 'ENDOMETRIUM, curettings - SECRETORY ENDOMETRIUM');
});

test('no trailing negative after a benign diagnosis; the atypia and gestational caveats stay', () => {
  assert.equal(aspirate({ amount: 'Scanty (limited assessment)' }).diagnosis, 'ENDOMETRIUM, aspirate - PROLIFERATIVE ENDOMETRIUM (scanty sample)');
  assert.equal(aspirate({ hyperplasia: 'Hyperplasia without atypia' }).diagnosis, 'ENDOMETRIUM, aspirate - ENDOMETRIAL HYPERPLASIA WITHOUT ATYPIA');
  assert.equal(aspirate({ hyperplasia: 'Atypical hyperplasia / EIN' }).diagnosis, 'ENDOMETRIUM, aspirate - ATYPICAL HYPERPLASIA / ENDOMETRIOID INTRAEPITHELIAL NEOPLASIA; no evidence of invasive carcinoma in the fragments examined');
  assert.equal(aspirate({ specimenType: 'Endometrial polypectomy', polyp: 'Present' }).diagnosis, 'ENDOMETRIUM, polypectomy - ENDOMETRIAL POLYP; background proliferative endometrium');
  assert.equal(aspirate({ phase: 'Gestational (decidua and hypersecretory glands)' }).diagnosis, 'ENDOMETRIUM, aspirate - DECIDUA AND HYPERSECRETORY ENDOMETRIUM; no evidence of gestational trophoblastic disease');
  for (const phase of field(em, 'phase').options.filter((o) => !/^(Not assessable|Gestational)/.test(o))) {
    assert.doesNotMatch(aspirate({ phase }).diagnosis, /no evidence of/, phase);
  }
});

test('intake: the request line fills the sample type', () => {
  const cases = [
    ['Endometrial aspirate', 'Endometrial aspirate'],
    ['Endometrium, aspiration', 'Endometrial aspirate'],
    ['Endometrium, EA', 'Endometrial aspirate'],
    ['Endometrial pipelle', 'Endometrial aspirate'],
    ['Endometrial curettings', 'Endometrial curettings'],
    ['Endometrium, D&C', 'Endometrial curettings'],
    ['Endometrial biopsy', 'Endometrial biopsy'],
    ['Hysteroscopic biopsy of endometrium', 'Hysteroscopic biopsy'],
    ['Endometrial polyp, hysteroscopic polypectomy', 'Endometrial polypectomy'],
    ['Endometrial polyp', 'Endometrial polypectomy']
  ];
  for (const [line, type] of cases) {
    assert.equal(route(line).templateId, 'endometrial_biopsy', line);
    assert.equal(preset(em, line).specimenType, type, line);
  }
  assert.deepEqual(preset(em, 'Endometrium'), {}, 'a bare line keeps the aspirate default');
});
