// Frozen section generator. Pure functions: (part, ctx) -> string.
// Each part is one frozen specimen (the department letters frozen specimens A, B, C … and
// converts every frozen block to paraffin, so the same letters carry through to the final report).
// Blocks produced:
//   specimens  "Frozen section: (A) Tongue, medial margin, (B) …"
//   macro      "(A) Received in a fresh state is a piece of tan coloured tissue measuring … All embedded in 1 frozen block and subsequently converted to paraffin block."
//   intraop    "(Prof. A Cheung / Dr. HY Tan)" + grouped frozen diagnoses + the phone-report sentence
//   microscopy "(A) The paraffin section confirms the frozen section diagnosis. It shows … There is no evidence of malignancy."
//   diagnosis  "(A) TONGUE, medial margin, frozen section - NO EVIDENCE OF MALIGNANCY"
// Wording is protected by tests/frozen.test.js — change it only deliberately.

const num = (v) => {
  const n = parseFloat(String(v ?? '').trim());
  return Number.isFinite(n) ? n : null;
};
const fmt = (n) => String(n).replace(/\.0+$/, '');
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const word = (n) => (n >= 0 && n <= 10 ? WORDS[n] : String(n));
const lc1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');
const uc1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const stripDot = (s) => String(s || '').trim().replace(/[.;\s]+$/, '');
const listJoin = (items) => {
  const a = items.filter(Boolean);
  if (a.length <= 1) return a[0] || '';
  return `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
};

export function specimenName(part) {
  return part.values.specimenName || `Part ${part.label}`;
}

/** "Frozen section: (A) Tongue, medial margin, (B) Tongue, posterior margin and (C) Right level I lymph node" */
export function specimens(parts) {
  if (parts.length === 1) return `Frozen section: ${specimenName(parts[0])}`;
  return `Frozen section: ${listJoin(parts.map((p) => `(${p.label}) ${specimenName(p)}`))}`;
}

// ---------- macroscopic description ----------

function tissueNoun(v) {
  const d = v.tissueDesc === 'other' ? (v.tissueDescOther || 'tissue').trim() : v.tissueDesc;
  return d || 'tissue';
}

function sizePhrase(v) {
  let s = String(v.size || '').trim().replace(/\s*[xX×]\s*/g, ' x ');
  if (!s) return '';
  if (!/cm|mm/i.test(s)) s += ' cm';
  return ` measuring ${s}`;
}

export function macro(part, ctx) {
  if (ctx.options.macro === false) return '';
  const v = part.values;
  const n = Math.max(1, Math.round(num(v.pieces) ?? 1));
  const noun = tissueNoun(v);
  const size = sizePhrase(v);
  let received;
  if (noun === 'lymph node') {
    received = n === 1 ? `is a lymph node${size}` : `are ${word(n)} lymph nodes${size}${size && !/each|aggregate/i.test(size) ? ' in aggregate' : ''}`;
  } else if (n === 1) {
    received = `is a piece of ${noun}${size}`;
  } else {
    const agg = size && !/each|aggregate/i.test(size) ? ' in aggregate' : '';
    received = `are ${word(n)} pieces of ${noun}${size}${agg}`;
  }
  const blocks = Math.max(1, Math.round(num(v.blocks) ?? 1));
  const blockPhrase = blocks === 1
    ? 'in 1 frozen block and subsequently converted to paraffin block'
    : `in ${blocks} frozen blocks and subsequently converted to paraffin blocks`;
  const handling = v.handling === 'Representative section taken'
    ? `Representative section taken and embedded ${blockPhrase}. The remainder is formalin fixed.`
    : `${v.handling || 'All embedded'} ${blockPhrase}.`;
  return `(${part.label}) Received in a fresh state ${received}. ${handling}`;
}

// ---------- frozen (intraoperative) diagnosis ----------

const deferred = (v) => v.correlation === 'Deferred'
  || (v.scenario === 'Margin' && v.marginResult === 'Atypical, deferred')
  || (v.scenario === 'Lymph node' && v.nodeResult === 'Deferred')
  || (v.scenario === 'Ovarian / adnexal mass' && v.ovaryResult === 'Deferred')
  || (v.scenario === 'Nodule / mass' && v.noduleResult === 'Deferred');

const tumour = (v, fallback) => stripDot(v.tumourType) || fallback;

/** One sentence, as phoned to the surgeon. */
export function frozenResult(part) {
  const v = part.values;
  switch (v.scenario) {
    case 'Margin':
      switch (v.marginResult) {
        case 'Positive': return `${uc1(tumour(v, 'carcinoma'))} present at the margin.`;
        case 'Close': {
          const d = num(v.marginDistance);
          return `No malignancy at the margin; ${lc1(tumour(v, 'tumour'))} approaches to within ${d === null ? 'less than 1' : fmt(d)} mm.`;
        }
        case 'Dysplasia only': return `${v.dysplasiaGrade || 'Moderate'} dysplasia; no invasive malignancy.`;
        case 'Atypical, deferred': return 'Atypical cells present; deferred to paraffin sections.';
        default: return 'No malignancy.';
      }
    case 'Lymph node':
      switch (v.nodeResult) {
        case 'Macrometastasis':
        case 'Micrometastasis': {
          const d = num(v.metSize);
          const kind = v.nodeResult === 'Macrometastasis' ? 'macrometastasis' : 'micrometastasis';
          return `Metastatic ${lc1(tumour(v, 'carcinoma'))} present (${kind}${d === null ? '' : `, ${fmt(d)} mm`}).`;
        }
        case 'Deferred': return 'Deferred to paraffin sections.';
        default: return 'Negative for malignancy.';
      }
    case 'Parathyroid':
      switch (v.parathyroidResult) {
        case 'Parathyroid, normocellular': return 'Parathyroid tissue, normocellular.';
        case 'Thyroid tissue': return 'Thyroid tissue.';
        case 'Lymph node': return 'Lymph node.';
        case 'Adipose tissue': return 'Adipose tissue.';
        case 'Thymic tissue': return 'Thymic tissue.';
        default: return 'Parathyroid tissue, hypercellular.';
      }
    case 'Ovarian / adnexal mass':
      switch (v.ovaryResult) {
        case 'Borderline': return `Borderline tumour${v.tumourType ? `, ${lc1(tumour(v))}` : ''}.`;
        case 'Malignant': return `Malignant${v.tumourType ? `; ${lc1(tumour(v))}` : ''}.`;
        case 'Deferred': return 'Deferred to paraffin sections.';
        default: return `Benign${v.tumourType ? `; ${lc1(tumour(v))}` : ''}.`;
      }
    case 'Nodule / mass':
      switch (v.noduleResult) {
        case 'Malignant': return `Malignant${v.tumourType ? `; ${lc1(tumour(v))}` : ''}.`;
        case 'Deferred': return 'Deferred to paraffin sections.';
        default: return `Benign${v.tumourType ? `; ${lc1(tumour(v))}` : ''}.`;
      }
    default:
      return v.freeResult ? `${uc1(stripDot(v.freeResult))}.` : 'No malignancy.';
  }
}

/** "(A)-(C)" for a consecutive run of three or more, otherwise "(A) and (B)" / "(A), (C) and (D)". */
export function labelRange(labels) {
  if (labels.length >= 3) {
    const codes = labels.map((l) => l.charCodeAt(0));
    if (codes.every((c, i) => i === 0 || c === codes[i - 1] + 1)) return `(${labels[0]})-(${labels[labels.length - 1]})`;
  }
  return listJoin(labels.map((l) => `(${l})`));
}

export function intraop(parts, ctx) {
  const groups = [];
  for (const p of parts) {
    const text = frozenResult(p);
    const g = groups.find((x) => x.text === text);
    if (g) g.labels.push(p.label); else groups.push({ text, labels: [p.label] });
  }
  const lines = [];
  const who = String(ctx.case.fsPathologists || '').trim();
  if (who) lines.push(`(${who.replace(/^\(|\)$/g, '')})`);
  for (const g of groups) lines.push(`${labelRange(g.labels)} ${g.text}`);
  const time = String(ctx.case.fsTime || '').trim();
  const date = String(ctx.case.fsDate || '').trim();
  const to = String(ctx.case.fsReportedTo || '').trim();
  if (time || date || to) {
    lines.push(`The frozen section diagnosis was phone reported${time ? ` at ${time}` : ''}${date ? ` on ${date}` : ''}${to ? ` to ${to}` : ''}.`);
  }
  return lines.join('\n');
}

// ---------- paraffin microscopy ----------

function defaultTissue(v) {
  switch (v.scenario) {
    case 'Margin':
      return v.marginResult === 'Positive'
        ? `infiltrating ${lc1(tumour(v, 'carcinoma'))} involving the margin`
        : 'squamous mucosa with underlying skeletal muscle';
    case 'Lymph node':
      return ['Macrometastasis', 'Micrometastasis'].includes(v.nodeResult)
        ? `a lymph node infiltrated by metastatic ${lc1(tumour(v, 'carcinoma'))}`
        : 'a lymph node with preserved architecture and reactive follicles';
    case 'Parathyroid':
      switch (v.parathyroidResult) {
        case 'Parathyroid, normocellular': return 'normocellular parathyroid tissue with an admixture of stromal fat';
        case 'Thyroid tissue': return 'thyroid follicles lined by bland follicular cells';
        case 'Lymph node': return 'a lymph node with reactive follicles';
        case 'Adipose tissue': return 'mature adipose tissue';
        case 'Thymic tissue': return 'thymic tissue with Hassall corpuscles';
        default: return 'hypercellular parathyroid tissue composed predominantly of chief cells with a paucity of stromal fat';
      }
    case 'Ovarian / adnexal mass':
      return v.tumourType ? `features of ${lc1(tumour(v))}` : 'ovarian stroma with the lesion described';
    case 'Nodule / mass':
      return v.tumourType ? `features of ${lc1(tumour(v))}` : 'the lesion described';
    default:
      return v.freeResult ? lc1(stripDot(v.freeResult)) : 'the tissue described';
  }
}

function malignant(v) {
  return (v.scenario === 'Margin' && v.marginResult === 'Positive')
    || (v.scenario === 'Lymph node' && ['Macrometastasis', 'Micrometastasis'].includes(v.nodeResult))
    || (v.scenario === 'Ovarian / adnexal mass' && v.ovaryResult === 'Malignant')
    || (v.scenario === 'Nodule / mass' && v.noduleResult === 'Malignant');
}

function closingSentence(v) {
  if (malignant(v) || v.scenario === 'Parathyroid') return '';
  if (v.scenario === 'Margin' && v.marginResult === 'Dysplasia only') return 'There is no evidence of invasive malignancy.';
  if (v.scenario === 'Margin') return 'There is no evidence of dysplasia or malignancy.';
  if (v.scenario === 'Ovarian / adnexal mass' && v.ovaryResult === 'Borderline') return 'There is no evidence of stromal invasion.';
  return 'There is no evidence of malignancy.';
}

export function microscopy(part) {
  const v = part.values;
  const tissue = stripDot(v.tissue) || defaultTissue(v);
  const notes = String(v.additionalNotes || '').trim();
  let s;
  if (v.correlation === 'Discordant') {
    const reason = (v.discordanceReason || 'Sampling').toLowerCase();
    const finalDx = stripDot(v.paraffinDx);
    s = `(${part.label}) The paraffin section shows ${tissue}.`
      + (finalDx ? ` The features are those of ${lc1(finalDx)}.` : '')
      + ` This is discordant with the frozen section diagnosis (${lc1(stripDot(frozenResult(part)))}); the discrepancy is attributed to ${reason}.`;
  } else if (deferred(v)) {
    const finalDx = stripDot(v.paraffinDx);
    s = `(${part.label}) The frozen section diagnosis was deferred. The paraffin section shows ${tissue}.`
      + (finalDx ? ` The features are those of ${lc1(finalDx)}.` : '');
  } else {
    s = `(${part.label}) The paraffin section confirms the frozen section diagnosis. It shows ${tissue}.`;
    const close = closingSentence(v);
    if (close) s += ` ${close}`;
  }
  if (notes) s += ` ${notes}`;
  return s;
}

// ---------- final diagnosis line ----------

function organPhrase(part) {
  const name = specimenName(part).trim();
  const i = name.indexOf(',');
  if (i === -1) return name.toUpperCase();
  return `${name.slice(0, i).toUpperCase()}${name.slice(i)}`;
}

/** Final diagnosis text (uppercase lead) derived from the frozen result, unless a paraffin diagnosis overrides it. */
export function finalDx(part) {
  const v = part.values;
  const override = stripDot(v.paraffinDx);
  if (override && (v.correlation === 'Discordant' || deferred(v))) return override.toUpperCase();
  switch (v.scenario) {
    case 'Margin':
      switch (v.marginResult) {
        case 'Positive': return `INVOLVED BY ${tumour(v, 'carcinoma').toUpperCase()}`;
        case 'Close': {
          const d = num(v.marginDistance);
          return `NO EVIDENCE OF MALIGNANCY; ${lc1(tumour(v, 'tumour'))} within ${d === null ? '1' : fmt(d)} mm of the margin`;
        }
        case 'Dysplasia only': return `${(v.dysplasiaGrade || 'Moderate').toUpperCase()} DYSPLASIA; no evidence of invasive malignancy`;
        case 'Atypical, deferred': return 'SEE MICROSCOPIC EXAMINATION';
        default: return 'NO EVIDENCE OF MALIGNANCY';
      }
    case 'Lymph node':
      switch (v.nodeResult) {
        case 'Macrometastasis':
        case 'Micrometastasis': {
          const d = num(v.metSize);
          const kind = v.nodeResult === 'Macrometastasis' ? 'macrometastasis' : 'micrometastasis';
          return `METASTATIC ${tumour(v, 'carcinoma').toUpperCase()} (${kind}${d === null ? '' : `, ${fmt(d)} mm`})`;
        }
        case 'Deferred': return 'SEE MICROSCOPIC EXAMINATION';
        default: return 'NO EVIDENCE OF MALIGNANCY';
      }
    case 'Parathyroid':
      switch (v.parathyroidResult) {
        case 'Parathyroid, normocellular': return 'NORMOCELLULAR PARATHYROID TISSUE';
        case 'Thyroid tissue': return 'THYROID TISSUE; no parathyroid tissue identified';
        case 'Lymph node': return 'LYMPH NODE; no parathyroid tissue identified';
        case 'Adipose tissue': return 'ADIPOSE TISSUE; no parathyroid tissue identified';
        case 'Thymic tissue': return 'THYMIC TISSUE; no parathyroid tissue identified';
        default: return 'HYPERCELLULAR PARATHYROID TISSUE';
      }
    case 'Ovarian / adnexal mass':
      switch (v.ovaryResult) {
        case 'Borderline': return v.tumourType ? `${tumour(v).toUpperCase()}, BORDERLINE` : 'BORDERLINE TUMOUR';
        case 'Malignant': return v.tumourType ? tumour(v).toUpperCase() : 'MALIGNANT TUMOUR, see microscopic examination';
        case 'Deferred': return 'SEE MICROSCOPIC EXAMINATION';
        default: return v.tumourType ? tumour(v).toUpperCase() : 'BENIGN; no evidence of malignancy';
      }
    case 'Nodule / mass':
      switch (v.noduleResult) {
        case 'Malignant': return v.tumourType ? tumour(v).toUpperCase() : 'MALIGNANT TUMOUR, see microscopic examination';
        case 'Deferred': return 'SEE MICROSCOPIC EXAMINATION';
        default: return v.tumourType ? tumour(v).toUpperCase() : 'BENIGN; no evidence of malignancy';
      }
    default:
      return v.freeResult ? stripDot(v.freeResult).toUpperCase() : 'NO EVIDENCE OF MALIGNANCY';
  }
}

export function diagnosis(part) {
  return `(${part.label}) ${organPhrase(part)}, frozen section - ${finalDx(part)}`;
}

export default { specimens, specimenName, macro, intraop, microscopy, diagnosis };
