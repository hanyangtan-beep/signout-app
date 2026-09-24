// Fallopian tube — ectopic pregnancy generator (benign resection; Gynae).
//
// Salpingectomy, partial salpingectomy, salpingotomy and tubal contents for a tubal ectopic
// pregnancy. Card: docs/roadmap.md (benign batch 2, pulled into Now 2026-09-24); spec
// docs/specs/fallopian-tube-ectopic.md. The worked example is the contributed model report (salpingectomy,
// degenerate villi, haemorrhage to the serosa) and is golden fixture 01.
//
// Grounding (comments only, never printed):
//   RCPath, Tissue pathways for gynaecological pathology, V3, February 2023
//   https://www.rcpath.org/static/94763195-0982-40ed-bbc79ca92370e9ac/Tissue-pathways-for-gynaecological-pathology.pdf
//   §10.2.4 "Record the length and maximum diameter in millimetres of the tube. Note any areas of
//   rupture and describe the contents of the tube. Sample the dilated portion of the tube or
//   implantation site on the surface of the tube. Also sample the non-dilated tube, usually the
//   isthmic end, to document pre-existing inflammation or structural abnormality. Separately
//   submitted blood clots in the specimen container may contain products of conception (POC) and
//   should also sampled. Document whether any fetal tissue is present."
//   §10.3.3 "The identification of a placental implantation site, villi or fetal parts confirms an
//   ectopic gestation. Document any pre-existing pathology that may have predisposed to the
//   development of an ectopic pregnancy, e.g. pelvic inflammatory disease, tubal diverticulum or
//   endometriosis. The presence of an implantation site confirms tubal pregnancy; the presence of
//   villi alone is suggestive but not diagnostic of the same. In practice, the presence of chorionic
//   villi is considered evidence of a tubal pregnancy."
//   §11.1 "Examination of POC is required for documentation of (intrauterine/ectopic) pregnancy,
//   exclusion of gestational trophoblastic disease (GTD)…"
//   NICE NG126, Management of tubal ectopic pregnancy (the salpingotomy comment):
//   https://www.nice.org.uk/guidance/ng126/chapter/Management-of-tubal-ectopic-pregnancy
//   "For women who have had a salpingotomy, take 1 serum hCG measurement at 7 days after surgery,
//   then 1 serum hCG measurement per week until a negative result is obtained. [2012]"
//
// House forms (released ectopic reports in the 2021-2026 biopsy export, 8 parts; counts only):
//   - gross lengths "N cm long" 5 of 6, so the house keeps cm although RCPath asks for millimetres;
//   - block keys use "&" for two blocks and put one entry per line (4 of 4 multi-entry keys), as
//     in the contributed example: "(1) Uninvolved fallopian tube." / "(2)&(3) Haemorrhagic …";
//   - microscopy opens "Sections show" 2, "Sections of" 2, "The sections show" 1; the example's
//     "The sections show" is kept;
//   - closing sentence: the export's usual form is "no evidence of gestational trophoblastic
//     disease" (87 vs 1 file-wide, 4 of 5 ectopic); the example's "gestational trophoblastic
//     neoplasia or other malignancies" is kept as the user's model;
//   - diagnosis heads "Left FALLOPIAN TUBE" 5 of 8; entity "TUBAL PREGNANCY" 4 and "ECTOPIC TUBAL
//     PREGNANCY" 2 - the example's "ECTOPIC TUBAL PREGNANCY" is kept; "with RUPTURE" 2 of 8;
//   - "No foetal parts are grossly identified." follows the example; the export has no single form
//     for that sentence ("seen" 22, "identified" 11, "present" 8, "grossly identified" 5).
//   Spelling: "foetal" is house for this form and products of gestation (2026-09-24); RCPath's
//   "fetal" stays in the quotations above only. The placenta keeps the Amsterdam terms' "fetal".
//
// Blocks produced:
//   specimenName   "Left fallopian tube, salpingectomy"
//   macro          "(A) Received in formalin is a distended segment of tubal tissue …"
//   blockKey       one entry per line; "(A1)" numbering only when the case has several letters
//   microscopy     "(A) The sections show …"
//   diagnosis      "(A) Left FALLOPIAN TUBE, salpingectomy - ECTOPIC TUBAL PREGNANCY"
// Wording is protected by tests/fallopian_tube_ectopic.test.js — change it only deliberately.

import { stripDot, checks } from './_house.js';

const TUBE_PROCEDURES = ['Salpingectomy', 'Partial salpingectomy'];
const PROCEDURE = {
  Salpingectomy: 'salpingectomy',
  'Partial salpingectomy': 'partial salpingectomy',
  Salpingotomy: 'salpingotomy',
  'Tubal contents': 'tubal contents'
};
export const MOLE = 'Suspicious for hydatidiform mole – see comment';
const lettered = (part, ctx) => new Set((ctx?.case?.parts || []).map((p) => p.label)).size > 1;

const num = (x) => {
  const n = parseFloat(String(x ?? '').trim());
  return Number.isFinite(n) ? n : null;
};
/** "4x2x2" -> "4 x 2 x 2 cm", "5" -> "5 cm"; '' when blank. */
const size = (raw) => {
  let s = String(raw || '').trim().replace(/\s*[xX×*]\s*/g, ' x ');
  if (!s) return '';
  if (!/cm|mm/i.test(s)) s += ' cm';
  return s;
};
const list = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** A salpingectomy or partial salpingectomy: the tube itself is received. */
export const isTube = (v) => TUBE_PROCEDURES.includes(v.procedure || 'Salpingectomy');
export const villiPresent = (v) => (v.villi || 'Present') !== 'Not identified';
const implantationSite = (v) => v.implantation === 'Present';
const foetalPartsSeen = (v) => v.foetalParts === 'Identified';
export const moleSuspected = (v) => villiPresent(v) && v.villousChange === MOLE;
export const ruptured = (v) => isTube(v) && (v.serosa === 'Rupture site' || v.wallRupture === 'Present');
/** Nothing in the specimen confirms the gestation: no villi, no implantation site, no foetal parts. */
export const unconfirmed = (v) => !villiPresent(v) && !implantationSite(v) && !foetalPartsSeen(v);

const sideOf = (v) => (v.side === 'Left' || v.side === 'Right' ? v.side : '');
const procedureOf = (v) => PROCEDURE[v.procedure] || PROCEDURE.Salpingectomy;

// ---------- specimen ----------

export function specimenName(part) {
  const v = part.values;
  return `${sideOf(v) ? `${sideOf(v)} fallopian tube` : 'Fallopian tube'}, ${procedureOf(v)}`;
}

// ---------- macroscopy ----------

// In option order, whatever order the boxes were ticked in.
const CUT = {
  'Extensive blood clot': 'extensive blood clot',
  'Blood clot': 'blood clot',
  'Spongy material': 'spongy material',
  'Villous material': 'villous material',
  'Gestational sac': 'a gestational sac'
};
const cutItems = (v) => {
  const ticked = Array.isArray(v.cutSurface) ? v.cutSurface : [];
  return Object.keys(CUT).filter((k) => ticked.includes(k)).map((k) => CUT[k]);
};
const DISTENSION_SITE = {
  Ampulla: 'The distension is in the ampullary portion of the tube.',
  Isthmus: 'The distension is in the isthmic portion of the tube.',
  'Fimbrial end': 'The distension is at the fimbrial end.',
  'Interstitial (cornual)': 'The distension is in the interstitial (cornual) portion of the tube.'
};
const SEROSA = {
  Intact: 'The serosal surface is intact.',
  'Haemorrhage extends to the serosal surface': 'The area of haemorrhage extends to the serosal surface.'
};

export const blockCount = (v) => Math.max(1, Math.round(num(v.blocks) ?? 3));

function tubeMacro(v) {
  const s = [];
  const overall = size(v.overallSize);
  const length = size(v.tubeLength);
  const lumen = size(v.lumenDiameter);
  const tube = `${sideOf(v) ? `${sideOf(v).toLowerCase()} ` : ''}fallopian tube`;
  s.push(`Received in formalin is a ${lumen ? 'distended ' : ''}segment of tubal tissue${overall ? ` measuring ${overall}` : ''}.`);
  if (length && lumen) s.push(`A segment of ${tube} is identified measuring ${length} long, and its lumen is distended, up to ${lumen} across.`);
  else if (length) s.push(`A segment of ${tube} is identified measuring ${length} long.`);
  else if (lumen) s.push(`The lumen of the ${tube} is distended, up to ${lumen} across.`);
  if (DISTENSION_SITE[v.distensionSite]) s.push(DISTENSION_SITE[v.distensionSite]);
  const cut = cutItems(v);
  if (cut.length) s.push(`The cut surface of the fallopian tube tissue shows ${cut[0]} within the tubal lumen${cut.length > 1 ? `, as well as ${list(cut.slice(1))}` : ''}.`);
  if (v.serosa === 'Rupture site') {
    const r = size(v.ruptureSize);
    s.push(`There is a rupture site${r ? ` measuring ${r}` : ''} on the serosal surface.`);
  } else if (SEROSA[v.serosa]) s.push(SEROSA[v.serosa]);
  if (v.fimbria === 'Identified') s.push('The fimbrial end is identified.');
  else if (v.fimbria === 'Not identified') s.push('The fimbrial end is not identified.');
  const clot = size(v.clotSize);
  if (clot) s.push(`A separate blood clot measuring ${clot} is also received.`);
  return s;
}

function contentsMacro(v) {
  const aggregate = size(v.fragmentSize);
  const s = [`Received in formalin are fragments of haemorrhagic tissue${aggregate ? ` measuring ${aggregate} in aggregate` : ''}.`];
  const cut = cutItems(v);
  if (cut.length) s.push(`The fragments comprise ${list(cut)}.`);
  return s;
}

export function macro(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const s = isTube(v) ? tubeMacro(v) : contentsMacro(v);
  s.push(foetalPartsSeen(v) ? 'Foetal parts are identified.' : 'No foetal parts are grossly identified.');
  const n = blockCount(v);
  const blocks = n === 1 ? 'block' : 'blocks';
  s.push(v.sampling === 'All embedded' ? `All embedded in ${n} ${blocks}.` : `${n} representative ${blocks}.`);
  return `(${part.label}) ${s.join(' ')}`;
}

// ---------- block key ----------

// A typed entry: "(2)&(3) text", "2-4 text", "A1. text" -> number range and the text.
const TYPED_ENTRY = /^\(?[A-Za-z]?(\d+)\)?(?:\s*(&|-|–|to)\s*\(?[A-Za-z]?(\d+)\)?)?[\s.:)-]+(.+)$/;

function typedKey(text, letter) {
  const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return lines.map((l) => {
    const m = l.match(TYPED_ENTRY);
    if (!m) return `${stripDot(l)}.`;
    const [, a, sep, b, rest] = m;
    const key = b ? `(${letter}${a})${sep === '&' ? '&' : '-'}(${letter}${b})` : `(${letter}${a})`;
    return `${key} ${stripDot(rest)}.`;
  }).join('\n');
}

/** [first, last, text] entries: the uninvolved tube first, the haemorrhagic tissue, a separate clot last. */
function keyItems(v) {
  const n = blockCount(v);
  if (!isTube(v)) return [[1, n, 'Haemorrhagic tissue']];
  const clot = !!size(v.clotSize);
  if (n === 1) return [[1, 1, clot ? 'Fallopian tube with haemorrhagic distension, and separate blood clot' : 'Fallopian tube with haemorrhagic distension']];
  const tissueEnd = clot ? n - 1 : n;
  const items = tissueEnd >= 2
    ? [[1, 1, 'Uninvolved fallopian tube'], [2, tissueEnd, 'Haemorrhagic tubal tissue with distension']]
    : [[1, 1, 'Haemorrhagic tubal tissue with distension']];
  if (clot) items.push([n, n, 'Separate blood clot']);
  return items;
}

export function blockKey(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const letter = lettered(part, ctx) ? part.label : '';
  const typed = typedKey(v.blockKeyText, letter);
  if (typed) return typed;
  const range = (a, b) => {
    if (a === b) return `(${letter}${a})`;
    return b === a + 1 ? `(${letter}${a})&(${letter}${b})` : `(${letter}${a})-(${letter}${b})`;
  };
  return keyItems(v).map(([a, b, text]) => `${range(a, b)} ${text}.`).join('\n');
}

// ---------- microscopy ----------

const VILLI = { Present: 'chorionic villi', 'Present, degenerate': 'degenerate chorionic villi' };
const TUBAL_FINDING = {
  'Chronic salpingitis': 'The plicae contain a chronic inflammatory infiltrate with plasma cells, in keeping with chronic salpingitis.',
  'Salpingitis isthmica nodosa': 'The tubal wall contains diverticula of tubal epithelium within hypertrophic smooth muscle, in keeping with salpingitis isthmica nodosa.',
  Endometriosis: 'Foci of endometrial glands and stroma with haemosiderin-laden macrophages are present, in keeping with endometriosis.'
};
const TUBAL_FINDING_DX = {
  'Chronic salpingitis': 'chronic salpingitis',
  'Salpingitis isthmica nodosa': 'salpingitis isthmica nodosa',
  Endometriosis: 'endometriosis'
};
const tubalFindings = (v) => {
  if (!isTube(v) || !Array.isArray(v.epithelium)) return [];
  return Object.keys(TUBAL_FINDING).filter((k) => v.epithelium.includes(k));
};

export function microscopy(part) {
  const v = part.values;
  const tube = isTube(v);
  const haemorrhage = v.haemorrhage !== 'Absent';
  const s = [];
  if (villiPresent(v)) {
    const villi = VILLI[v.villi] || VILLI.Present;
    s.push(tube
      ? `The sections show ${villi}${haemorrhage ? ' and haemorrhage' : ''} within the lumen of the fallopian tube.`
      : `The sections show ${villi}${haemorrhage ? ' and blood clot' : ''}.`);
  } else if (tube) {
    s.push(haemorrhage ? 'The sections show haemorrhage within the lumen of the fallopian tube.' : 'The sections show cross sections of the fallopian tube.');
  } else {
    s.push(haemorrhage ? 'The sections show blood clot.' : 'The sections show fragments of tissue.');
  }
  if (implantationSite(v)) s.push(tube ? 'Implantation-site intermediate trophoblast is present in the tubal wall.' : 'Implantation-site intermediate trophoblast is present.');
  if (!villiPresent(v)) s.push(implantationSite(v) ? 'No chorionic villi are identified.' : 'No chorionic villi or trophoblast are identified.');
  if (villiPresent(v) && v.villousChange === 'Hydropic change') s.push('Some villi show hydropic change.');
  if (moleSuspected(v)) s.push('Some villi are enlarged and hydropic, with trophoblastic hyperplasia; see comment.');
  if (tube && v.wallRupture === 'Present') s.push('There is disruption of the tubal wall, in keeping with rupture.');
  if (tube) {
    const found = tubalFindings(v);
    if (found.length) s.push(...found.map((k) => TUBAL_FINDING[k]));
    else if (!Array.isArray(v.epithelium) || v.epithelium.includes('Unremarkable')) s.push('The tubal epithelium is unremarkable.');
  }
  const extra = stripDot(v.additionalNotes);
  if (extra) s.push(`${extra}.`);
  s.push('There is no evidence of gestational trophoblastic neoplasia or other malignancies.');
  return `(${part.label}) ${s.join(' ')}`;
}

// ---------- diagnosis ----------

function head(v) {
  return `${sideOf(v) ? `${sideOf(v)} ` : ''}FALLOPIAN TUBE, ${procedureOf(v)}`;
}

export function diagnosis(part) {
  const v = part.values;
  const tube = isTube(v);
  const clauses = [];
  if (villiPresent(v)) {
    if (!tube) clauses.push('PRODUCTS OF GESTATION, consistent with ECTOPIC TUBAL PREGNANCY');
    else if (v.dxEntity === 'Products of gestation within the tubal lumen') clauses.push('PRODUCTS OF GESTATION WITHIN THE TUBAL LUMEN');
    else clauses.push('ECTOPIC TUBAL PREGNANCY');
  } else if (implantationSite(v)) {
    // RCPath §10.3.3: an implantation site confirms the tubal pregnancy even without villi.
    clauses.push(`${v.haemorrhage !== 'Absent' ? 'HAEMORRHAGE AND ' : ''}IMPLANTATION-SITE TROPHOBLAST, consistent with ECTOPIC TUBAL PREGNANCY`);
  } else if (foetalPartsSeen(v)) {
    clauses.push(tube ? 'ECTOPIC TUBAL PREGNANCY' : 'PRODUCTS OF GESTATION, consistent with ECTOPIC TUBAL PREGNANCY');
  } else {
    clauses.push('NO CHORIONIC VILLI OR TROPHOBLAST IDENTIFIED');
  }
  if (ruptured(v)) {
    if (clauses[0] === 'ECTOPIC TUBAL PREGNANCY') clauses[0] += ' with RUPTURE';
    else clauses.push('tubal rupture');
  }
  clauses.push(...tubalFindings(v).map((k) => TUBAL_FINDING_DX[k]));
  if (moleSuspected(v) || unconfirmed(v)) clauses.push('see comment');
  return `(${part.label}) ${head(v)} - ${clauses.join('; ')}`;
}

// ---------- checks ----------

export function validate(part) {
  const v = part.values;
  const { out, err, warn } = checks();
  const ticked = Array.isArray(v.cutSurface) ? v.cutSurface : [];
  if (!v.villi) err('Chorionic villi: record whether villi are present.', 'villi');
  if (ticked.includes('Extensive blood clot') && ticked.includes('Blood clot')) warn('Cut surface: tick Extensive blood clot or Blood clot, not both.', 'cutSurface');
  // Both comments below are auto snippets: ticked and tagged "suggested" once the part matches.
  if (unconfirmed(v)) warn('No chorionic villi, implantation-site trophoblast or foetal parts: communicate the result to the clinical team promptly (the no-villi comment is suggested).', 'villi');
  if (moleSuspected(v)) warn('Suspected hydatidiform mole: communicate the result to the clinical team promptly (the p57 comment is suggested).', 'villousChange');
  return out;
}

// The registry loads this default export; a generator without one is not wired in.
export default { specimenName, macro, blockKey, microscopy, diagnosis, validate };
