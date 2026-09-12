// Endometrial carcinoma — AJCC 8th edition pTNM, FIGO 2009 and FIGO 2023 derivation.
// Field ids belong to schemas/endometrial_carcinoma.json.
//
// The centre does not report FIGO. figo2009() and figo2023() feed the Checks panel only; the report
// prints the AJCC pTNM block solely when the case option `printPTNM` is on. Nothing here is printed
// unless the generator chooses to.
// Sources: Berek JS et al. FIGO staging of endometrial cancer: 2023. Int J Gynecol Obstet 2023;162:383-394;
// FIGO 2009 and AJCC 8th correspondence as displayed on the QMH GYN-Endometrium page.

export const id = 'endometrium';
export const edition = 'AJCC 8th edition';

const int = (x) => { const n = parseInt(String(x ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const arr = (x) => (Array.isArray(x) ? x : []);

// ---------- histotype ----------

export const ENDOMETRIOID = 'Endometrioid carcinoma';
export const GRADE_1 = 'FIGO grade 1 (endometrioid carcinoma)';
export const GRADE_2 = 'FIGO grade 2 (endometrioid carcinoma)';
export const GRADE_3 = 'FIGO grade 3 (endometrioid carcinoma)';

/**
 * FIGO 2023 histotype class: 'non-aggressive' (endometrioid FIGO grade 1-2), 'aggressive' (grade 3
 * endometrioid and every non-endometrioid type) or 'unknown' (endometrioid with no grade assigned).
 */
export function histotypeClass(v) {
  if (!v.histType) return 'unknown';
  if (v.histType !== ENDOMETRIOID) return 'aggressive';
  if (v.grade === GRADE_1 || v.grade === GRADE_2) return 'non-aggressive';
  if (v.grade === GRADE_3) return 'aggressive';
  return 'unknown';
}
export const aggressive = (histType, grade) => histotypeClass({ histType, grade }) === 'aggressive';
export const isAggressive = (v) => histotypeClass(v) === 'aggressive';

// ---------- extent ----------

export const MYO_NONE = 'Not identified';
export const MYO_LT_HALF = 'Estimated less than 50% myometrial invasion';
export const MYO_GE_HALF = 'Estimated 50% or greater myometrial invasion';

export const NOINV_ENDOMETRIUM = 'Tumour confined to the endometrium';
export const NOINV_POLYP = 'Tumour limited to an endometrial polyp (underlying endometrium and myometrium uninvolved)';
export const NOINV_POLYP_AND_ENDOMETRIUM = 'Tumour in an endometrial polyp and the underlying endometrium';

/**
 * 'polyp' | 'endometrium' | 'lt-half' | 'ge-half' | null (cannot be assessed or not recorded).
 * Without myoinvasion the microscopic `noInvasionExtent` pick decides; only the strict
 * "limited to an endometrial polyp" option gives 'polyp' (FIGO 2023 IA1 basis). Cases saved before
 * the field existed fall back to the macro Tumour site.
 */
export function myoExtent(v) {
  if (v.myoInvasion === MYO_GE_HALF) return 'ge-half';
  if (v.myoInvasion === MYO_LT_HALF) return 'lt-half';
  if (v.myoInvasion === MYO_NONE) {
    if (v.noInvasionExtent === undefined || v.noInvasionExtent === null) return v.tumourSite === 'Endometrial polyp' ? 'polyp' : 'endometrium';
    return v.noInvasionExtent === NOINV_POLYP ? 'polyp' : 'endometrium';
  }
  return null;
}
export const anyMyoinvasion = (v) => ['lt-half', 'ge-half'].includes(myoExtent(v));

export const LVSI_FOCAL = 'Present, focal (less than 5 vessels)';
export const LVSI_SUBSTANTIAL = 'Present, substantial (5 or more vessels)';
export const substantialLvsi = (v) => v.lvsi === LVSI_SUBSTANTIAL;

export const cervicalStroma = (v) => v.cervix === 'Cervical stromal invasion';
export const glandularOnly = (v) => v.cervix === 'Endocervical glandular involvement only';
export const serosaInvolved = (v) => v.serosa === 'Present';

const involvement = (v) => arr(v.otherInvolvement);
const has = (v, re) => involvement(v).some((s) => re.test(s));
export const ovaryInvolved = (v) => has(v, /ovary/i);
export const tubeInvolved = (v) => has(v, /fallopian tube/i);
export const adnexaInvolved = (v) => ovaryInvolved(v) || tubeInvolved(v);
export const vaginaParametriumInvolved = (v) => has(v, /vagina|parametrium|pelvic wall/i);
export const mucosaInvolved = (v) => has(v, /with mucosal involvement/i);
export const omentumInvolved = (v) => has(v, /omentum/i);
/** Pelvic peritoneal deposits: FIGO 2023 IIIB2, but pM1 / FIGO 2009 IVB. */
export const pelvicPeritoneum = (v) => v.pelvicPeritoneum === 'Present';

/** Distant metastatic sites, excluding "Not identified" / "Cannot be determined". */
export const distantSites = (v) => arr(v.distantMets).filter((s) => !/^Not |^Cannot/.test(s));
export const extrapelvicPeritoneal = (v) => omentumInvolved(v) || distantSites(v).some((s) => /omentum|extrapelvic peritoneum/i.test(s));
export const trueDistant = (v) => distantSites(v).some((s) => !/omentum|extrapelvic peritoneum/i.test(s));

/** Node counts for a region ('pelvic' | 'pa'): {examined, macro, micro, itc, positive}. */
export function nodes(v, prefix) {
  const examined = int(v[`${prefix}Examined`]);
  const macro = int(v[`${prefix}Macro`]) ?? 0;
  const micro = int(v[`${prefix}Micro`]) ?? 0;
  const itc = int(v[`${prefix}Itc`]) ?? 0;
  return { examined, macro, micro, itc, positive: macro + micro };
}

/** FIGO 2023 IA3: low-grade endometrioid carcinoma limited to the uterus and ovary. */
export function ia3(v) {
  return histotypeClass(v) === 'non-aggressive' && ovaryInvolved(v) && v.ovarianSynchronous === true
    && !tubeInvolved(v) && !vaginaParametriumInvolved(v) && !mucosaInvolved(v) && !omentumInvolved(v)
    && !serosaInvolved(v) && !pelvicPeritoneum(v) && !distantSites(v).length
    && nodes(v, 'pelvic').positive === 0 && nodes(v, 'pa').positive === 0;
}

/** Confirmed molecular class from the resolved ProMisE label: 'POLEmut' | 'MMRd' | 'p53abn' | 'NSMP' | null. */
export function molecularClass(v) {
  const p = v.promise || '';
  if (/^POLE/.test(p)) return 'POLEmut';
  if (/^Mismatch/.test(p)) return 'MMRd';
  if (/^p53/.test(p)) return 'p53abn';
  if (/^No specific/.test(p)) return 'NSMP';
  return null;
}

// ---------- AJCC 8th ----------

export function T(v) {
  const ext = myoExtent(v);
  if (mucosaInvolved(v)) return { cat: 'T4' };
  if (vaginaParametriumInvolved(v)) return { cat: 'T3b' };
  if (serosaInvolved(v) || adnexaInvolved(v)) return { cat: 'T3a' };
  if (cervicalStroma(v)) return { cat: 'T2' };
  if (ext === 'ge-half') return { cat: 'T1b' };
  if (ext) return { cat: 'T1a' };
  return { cat: 'TX', note: 'Myometrial invasion not recorded; pT cannot be assigned.' };
}

export function N(v) {
  const pel = nodes(v, 'pelvic'); const pa = nodes(v, 'pa');
  if (!((pel.examined || 0) + (pa.examined || 0))) return { cat: 'NX', note: 'No regional lymph nodes submitted; pN not assigned.' };
  if (pa.macro) return { cat: 'N2a' };
  if (pa.micro) return { cat: 'N2mi' };
  if (pel.macro) return { cat: 'N1a' };
  if (pel.micro) return { cat: 'N1mi' };
  if (pel.itc || pa.itc) return { cat: 'N0(i+)' };
  return { cat: 'N0' };
}

export function M(v) {
  return { cat: trueDistant(v) || extrapelvicPeritoneal(v) || pelvicPeritoneum(v) ? 'M1' : 'M-' };
}

export function descriptors() { return []; }

/** AJCC 8th stage groups; identical to FIGO 2009. */
export function stageGroup(Tc, Nc, Mc) {
  if (Mc === 'M1') return 'IVB';
  if (/^N2/.test(Nc)) return 'IIIC2';
  if (/^N1/.test(Nc)) return 'IIIC1';
  if (Tc === 'T4') return 'IVA';
  if (Tc === 'T3b') return 'IIIB';
  if (Tc === 'T3a') return 'IIIA';
  if (Tc === 'T2') return 'II';
  if (Tc === 'T1b') return 'IB';
  if (Tc === 'T1a') return 'IA';
  return null;
}

// ---------- FIGO 2009 ----------

/** @returns {{stage: string|null, note?: string}} */
export function figo2009(v) {
  const n = N(v).cat;
  const stage = stageGroup(T(v).cat, n, M(v).cat);
  if (!stage) return { stage: null, note: 'myometrial invasion not recorded' };
  const notes = [];
  if (glandularOnly(v)) notes.push('endocervical glandular involvement only does not raise the stage');
  if (n === 'N0(i+)') notes.push('isolated tumour cells do not upstage');
  if (n === 'NX') notes.push('nodes not assessed');
  return notes.length ? { stage, note: notes.join('; ') } : { stage };
}

// ---------- FIGO 2023 ----------

/**
 * @returns {{stage: string|null, basis: string, conditional?: string}}
 * `conditional` states the molecular upgrade that would apply once the class is confirmed.
 */
export function figo2023(v) {
  const cls = histotypeClass(v);
  const agg = cls === 'aggressive';
  const clsWord = cls === 'unknown' ? 'grade not assigned, staged as non-aggressive' : `${cls} histotype`;
  const mol = molecularClass(v);
  const ext = myoExtent(v);
  const pel = nodes(v, 'pelvic'); const pa = nodes(v, 'pa');
  const itc = pel.itc + pa.itc ? '; isolated tumour cells do not upstage' : '';

  if (trueDistant(v)) return { stage: 'IVC', basis: 'distant metastasis' };
  if (extrapelvicPeritoneal(v)) return { stage: 'IVB', basis: 'abdominal peritoneal metastasis beyond the pelvis' };
  if (mucosaInvolved(v)) return { stage: 'IVA', basis: 'bladder or bowel mucosal invasion' };
  if (pa.positive) return { stage: pa.macro ? 'IIIC2ii' : 'IIIC2i', basis: `para-aortic ${pa.macro ? 'macrometastasis' : 'micrometastasis'}` };
  if (pel.positive) return { stage: pel.macro ? 'IIIC1ii' : 'IIIC1i', basis: `pelvic ${pel.macro ? 'macrometastasis' : 'micrometastasis'}` };
  if (pelvicPeritoneum(v)) return { stage: 'IIIB2', basis: 'pelvic peritoneal metastasis' };
  if (vaginaParametriumInvolved(v)) return { stage: 'IIIB1', basis: 'vaginal, parametrial or pelvic wall involvement' };
  if (serosaInvolved(v)) return { stage: 'IIIA2', basis: 'uterine serosal involvement' };
  if (ia3(v)) return { stage: 'IA3', basis: 'low-grade endometrioid carcinoma limited to the uterus and ovary' };
  if (adnexaInvolved(v)) return { stage: 'IIIA1', basis: 'spread to ovary or fallopian tube' };
  if (!ext) return { stage: null, basis: 'myometrial invasion not recorded' };

  // Disease confined to the corpus, with or without cervical extension, from here on.
  if (mol === 'p53abn' && anyMyoinvasion(v)) return { stage: 'IICm', basis: `p53abn with myometrial invasion (${clsWord})${itc}` };
  if (mol === 'POLEmut') return { stage: 'IAm', basis: `POLEmut confined to the corpus${cervicalStroma(v) ? ' with cervical extension' : ''} (${clsWord})${itc}` };

  let out;
  if (agg && (anyMyoinvasion(v) || cervicalStroma(v))) out = { stage: 'IIC', basis: `aggressive histotype with ${anyMyoinvasion(v) ? 'myometrial invasion' : 'cervical stromal invasion'}${itc}` };
  else if (agg) out = { stage: 'IC', basis: `aggressive histotype limited to ${ext === 'polyp' ? 'a polyp' : 'the endometrium'}${itc}` };
  else if (substantialLvsi(v) && cervicalStroma(v)) out = { stage: 'II', basis: `cervical stromal invasion and substantial LVSI (IIA and IIB criteria both met), ${clsWord}${itc}` };
  else if (substantialLvsi(v)) out = { stage: 'IIB', basis: `substantial LVSI, ${clsWord}${itc}` };
  else if (cervicalStroma(v)) out = { stage: 'IIA', basis: `cervical stromal invasion, ${clsWord}${itc}` };
  else {
    const focal = v.lvsi === LVSI_FOCAL ? ', focal LVSI' : '';
    if (ext === 'ge-half') out = { stage: 'IB', basis: `invasion of half or more of the myometrium, ${clsWord}${focal}${itc}` };
    else if (ext === 'lt-half') out = { stage: 'IA2', basis: `invasion of less than half of the myometrium, ${clsWord}${focal}${itc}` };
    else out = { stage: 'IA1', basis: `${clsWord} limited to ${ext === 'polyp' ? 'an endometrial polyp' : 'the endometrium'}${itc}` };
  }
  if (!mol) {
    const cond = anyMyoinvasion(v) ? ['IICm if p53abn', 'IAm if POLEmut'] : ['IAm if POLEmut'];
    out.conditional = `would become ${cond.join(' or ')} once the molecular class is confirmed`;
  }
  return out;
}

/** Checks-panel reference lines. Never printed in the report. */
export function referenceLines(v) {
  const a = figo2009(v); const b = figo2023(v);
  return [
    `FIGO 2009 (reference, not reported): ${a.stage || 'not assignable'}${a.note ? ` - ${a.note}` : ''}`,
    `FIGO 2023 (reference, not reported): ${b.stage || 'not assignable'} - ${b.basis}${b.conditional ? `; ${b.conditional}` : ''}`
  ];
}
