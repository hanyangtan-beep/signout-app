import { stripDot } from './_house.js';
// Prostate chips (TURP / HoLEP / enucleation) generator. Pure functions: (part, ctx) -> string.
// Blocks produced:
//   specimens  "Prostate, chips, TURP"
//   macro      "(A) Received in formalin are multiple chips of prostatic tissue weighing 25 g in aggregate and
//               measuring 6 x 5 x 2 cm. All embedded in 8 blocks."
//   blockKey   "(A) (1-8) Prostatic chips, all embedded."
//   microscopy "(A) Sections show chips of prostatic tissue with glandular and stromal nodular hyperplasia. The
//               glands are lined by a layer of epithelial cells and basal cells. Chronic inflammatory cells are
//               present within the stroma. There is no evidence of high grade prostatic intraepithelial
//               neoplasia or malignancy."
//   diagnosis  "(A) PROSTATE, chips, TURP - NODULAR HYPERPLASIA WITH CHRONIC PROSTATITIS"
// A benign line names the hyperplasia and stops: no trailing "no evidence of malignancy" (user preference
// 2026-10-07, Phase 56). The HGPIN caveat "no evidence of invasive malignancy" stays.
// Incidental carcinoma is reported in full (Gleason score / Grade Group, % of tissue, chips involved,
// pT1a <= 5% vs pT1b > 5%) because the TURP is the staging specimen for pT1a/b disease.
// Gleason / Grade Group handling mirrors generators/prostate.js.
// Wording is protected by tests/turp.test.js — change it only deliberately.

const num = (v) => {
  const n = parseFloat(String(v ?? '').trim());
  return Number.isFinite(n) ? n : null;
};
const fmt = (n) => (Number.isInteger(n) ? String(n) : String(n).replace(/\.0+$/, ''));
const listJoin = (items) => {
  const a = items.filter(Boolean);
  if (a.length <= 1) return a[0] || '';
  return `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
};
const lc1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');
const dash = (s) => String(s || '').replace(/\u2013|\u2014/g, '-');

export const CA_PRESENT = 'Present – incidental adenocarcinoma';
export const hasCarcinoma = (v) => dash(v.carcinoma) === dash(CA_PRESENT);
export const hasHgpin = (v) => /^Present/.test(v.hgpin || '');

// ---------- Gleason / Grade Group (same rules as generators/prostate.js) ----------

/** ISUP 2014 / WHO 2022 Grade Group for a primary + secondary pattern. */
export function gradeGroup(primary, secondary) {
  const p = parseInt(primary, 10);
  const s = parseInt(secondary, 10);
  if (![3, 4, 5].includes(p) || ![3, 4, 5].includes(s)) return null;
  const score = p + s;
  if (score === 6) return 1;
  if (score === 7) return p === 3 ? 2 : 3;
  if (score === 8) return 4;
  return 5;
}

/** "3+4=7 (Grade Group 2)" */
export function gleasonText(primary, secondary) {
  const gg = gradeGroup(primary, secondary);
  if (gg === null) return '';
  return `${primary}+${secondary}=${parseInt(primary, 10) + parseInt(secondary, 10)} (Grade Group ${gg})`;
}

/** pT1a when 5% or less of the resected tissue is involved, pT1b when more; null when unknown. */
export function stage(pct) {
  const n = num(pct);
  if (n === null) return null;
  return n <= 5 ? 'pT1a' : 'pT1b';
}

/** House sampling rule: up to 12 g all embedded; then one extra block per 5 g. */
export function suggestedBlocks(weightG, blocksFor12g = 8) {
  const w = num(weightG);
  if (w === null || w <= 0) return blocksFor12g;
  if (w <= 12) return blocksFor12g;
  return blocksFor12g + Math.ceil((w - 12) / 5);
}

// ---------- procedure / specimen ----------

const PROCEDURE = {
  TURP: { site: 'chips', noun: 'TURP', specimen: 'Prostate, chips, TURP' },
  HoLEP: { site: 'chips', noun: 'HoLEP', specimen: 'Prostate, chips, HoLEP' },
  'Simple prostatectomy (enucleation)': { site: 'enucleation', noun: 'simple prostatectomy', specimen: 'Prostate, enucleation, simple prostatectomy' }
};
const proc = (v) => PROCEDURE[v.procedure] || PROCEDURE.TURP;

export function specimenName(part) {
  return (part.values.specimenName || '').trim() || proc(part.values).specimen;
}

// ---------- macroscopic description ----------

/** "6x5x2" -> "6 x 5 x 2 cm"; '' when blank. */
export function sizePhrase(raw) {
  let s = String(raw || '').trim().replace(/\s*[xX×]\s*/g, ' x ');
  if (!s) return '';
  if (!/cm|mm/i.test(s)) s += ' cm';
  return s;
}

/** "25" -> "25 g"; '' when blank. */
export function weightPhrase(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (/g\b/i.test(s)) return s.replace(/\s*g$/i, ' g');
  const n = num(s);
  return n === null ? '' : `${fmt(n)} g`;
}

const isRepresentative = (v) => v.sampling === 'Representative';
const blockCount = (v) => Math.max(1, Math.round(num(v.blocks) ?? 8));

export function macro(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const desc = lc1(stripDot(v.chipsDescription)) || 'multiple chips of prostatic tissue';
  const singular = /^enucleated/i.test(desc);
  const weight = weightPhrase(v.weight);
  const size = sizePhrase(v.dimensions);
  const measures = [];
  if (weight) measures.push(`weighing ${weight}${singular ? '' : ' in aggregate'}`);
  if (size) measures.push(`measuring ${size}`);
  const s = [];
  s.push(`Received in formalin ${singular ? 'is' : 'are'} ${desc}${measures.length ? ` ${measures.join(' and ')}` : ''}.`);
  const n = blockCount(v);
  if (isRepresentative(v)) s.push(`Representative sections in ${n} block${n === 1 ? '' : 's'}.`);
  else s.push(`All embedded in ${n} block${n === 1 ? '' : 's'}.`);
  return `(${part.label}) ${s.join(' ')}`;
}

export function blockKey(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const n = blockCount(v);
  const range = n === 1 ? '(1)' : `(1-${n})`;
  const tissue = /^enucleated/i.test(String(v.chipsDescription || '')) ? 'Prostatic tissue' : 'Prostatic chips';
  return `(${part.label}) ${range} ${tissue}, ${isRepresentative(v) ? 'representative sections' : 'all embedded'}.`;
}

// ---------- microscopy ----------

const HYPERPLASIA = {
  'Glandular and stromal': 'glandular and stromal nodular hyperplasia',
  'Predominantly stromal': 'nodular hyperplasia which is predominantly stromal',
  'Predominantly glandular': 'nodular hyperplasia which is predominantly glandular'
};

const INFLAMMATION_MICRO = {
  'Chronic prostatitis': 'Chronic inflammatory cells are present within the stroma.',
  'Acute and chronic prostatitis': 'Acute and chronic inflammatory cells are present within the stroma and glandular lumina.',
  'Granulomatous prostatitis - see comment': 'There is a granulomatous inflammatory infiltrate of epithelioid histiocytes, multinucleated giant cells and lymphocytes centred on ruptured ducts and acini; see comment.',
  'Post-BCG granulomatous prostatitis': 'Necrotising granulomatous inflammation with epithelioid histiocytes and multinucleated giant cells is present, in keeping with post-BCG granulomatous prostatitis.'
};

const TREATMENT_MICRO = {
  'Hormonal / 5-alpha reductase inhibitor effect': 'The glands show atrophic change with prominent basal cells and focal squamous metaplasia, in keeping with hormonal therapy effect.',
  'Radiotherapy effect': 'The glands show atrophy with cytological atypia and the stroma shows fibrosis and vascular hyalinisation, in keeping with radiotherapy effect.'
};

function tissueNoun(v) {
  return /^enucleated/i.test(String(v.chipsDescription || '')) ? 'enucleated prostatic tissue' : 'chips of prostatic tissue';
}

function carcinomaSentences(v) {
  const s = [];
  const gl = gleasonText(v.primary, v.secondary);
  let line = `Infiltrating acinar adenocarcinoma is seen${gl ? `, Gleason score ${gl}` : ''}`;
  const pct = num(v.pctInvolved);
  const inv = num(v.chipsInvolved);
  const tot = num(v.chipsTotal);
  const chips = inv !== null && tot !== null ? `${fmt(inv)} of ${fmt(tot)} chips` : inv !== null ? `${fmt(inv)} chip${inv === 1 ? '' : 's'}` : '';
  if (pct !== null) line += `, involving approximately ${fmt(pct)}% of the tissue${chips ? ` (${chips})` : ''}`;
  else if (chips) line += `, involving ${chips}`;
  s.push(`${line}.`);
  const ext = stripDot(v.extent);
  if (ext) s.push(`The tumour is ${lc1(ext)}.`);
  s.push(v.pni === 'Present' ? 'Perineural invasion is present.' : 'Perineural invasion is not identified.');
  const st = stage(v.pctInvolved);
  if (st === 'pT1a') s.push('The tumour involves 5% or less of the resected tissue (pT1a).');
  else if (st === 'pT1b') s.push('The tumour involves more than 5% of the resected tissue (pT1b).');
  return s;
}

export function microscopy(part) {
  const v = part.values;
  const s = [];
  s.push(`Sections show ${tissueNoun(v)} with ${HYPERPLASIA[v.hyperplasia] || HYPERPLASIA['Glandular and stromal']}.`);
  s.push('The glands are lined by a layer of epithelial cells and basal cells.');
  const infl = INFLAMMATION_MICRO[dash(v.inflammation)];
  if (infl) s.push(infl);
  if (v.infarction && v.infarction !== 'Absent') s.push('Areas of infarction with surrounding squamous metaplasia are present.');
  const benign = [];
  if (v.basalCellHyperplasia === 'Present') benign.push('basal cell hyperplasia');
  if (v.urothelialMetaplasia === 'Present') benign.push('transitional (urothelial) metaplasia');
  if (benign.length) s.push(`Foci of ${listJoin(benign)} are seen.`);
  if (TREATMENT_MICRO[v.treatmentEffect]) s.push(TREATMENT_MICRO[v.treatmentEffect]);
  if (hasHgpin(v)) s.push('A focus of high grade prostatic intraepithelial neoplasia is present.');
  if (hasCarcinoma(v)) s.push(...carcinomaSentences(v));
  else if (hasHgpin(v)) s.push('There is no evidence of invasive malignancy.');
  else s.push('There is no evidence of high grade prostatic intraepithelial neoplasia or malignancy.');
  const notes = (v.additionalNotes || '').trim();
  if (notes) s.push(notes);
  return `(${part.label}) ${s.join(' ')}`;
}

// ---------- diagnosis ----------

const INFLAMMATION_DX = {
  'Chronic prostatitis': 'CHRONIC PROSTATITIS',
  'Acute and chronic prostatitis': 'ACUTE AND CHRONIC PROSTATITIS',
  'Granulomatous prostatitis - see comment': 'GRANULOMATOUS PROSTATITIS',
  'Post-BCG granulomatous prostatitis': 'POST-BCG GRANULOMATOUS PROSTATITIS'
};

export function diagnosis(part) {
  const v = part.values;
  const p = proc(v);
  const clauses = [];
  const infl = INFLAMMATION_DX[dash(v.inflammation)];
  clauses.push(`NODULAR HYPERPLASIA${infl ? ` WITH ${infl}` : ''}`);
  if (hasCarcinoma(v)) {
    const gl = gleasonText(v.primary, v.secondary);
    let ca = `INCIDENTAL ACINAR ADENOCARCINOMA${gl ? `, Gleason score ${gl}` : ''}`;
    const pct = num(v.pctInvolved);
    const st = stage(v.pctInvolved);
    if (pct !== null) ca += `, involving ${fmt(pct)}% of chips${st ? ` (${st})` : ''}`;
    else {
      const inv = num(v.chipsInvolved);
      const tot = num(v.chipsTotal);
      if (inv !== null && tot !== null) ca += `, involving ${fmt(inv)} of ${fmt(tot)} chips`;
    }
    clauses.push(ca);
    if (v.pni === 'Present') clauses.push('perineural invasion present');
  }
  if (v.infarction && v.infarction !== 'Absent') clauses.push('infarction');
  if (hasHgpin(v)) clauses.push('focal high grade prostatic intraepithelial neoplasia');
  if (TREATMENT_MICRO[v.treatmentEffect]) clauses.push(v.treatmentEffect === 'Radiotherapy effect' ? 'radiotherapy effect' : 'hormonal therapy effect');
  if (/granulomatous/i.test(v.inflammation || '') && /see comment/i.test(v.inflammation || '')) clauses.push('see comment');
  if (!hasCarcinoma(v) && hasHgpin(v)) clauses.push('no evidence of invasive malignancy');
  return `(${part.label}) PROSTATE, ${p.site}, ${p.noun} - ${clauses.join('; ')}`;
}

export default { specimenName, macro, blockKey, microscopy, diagnosis };
