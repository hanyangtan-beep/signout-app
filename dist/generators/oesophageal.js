// Oesophageal biopsy generator. Pure functions: (part, ctx) -> string.
// Squamous features (reflux pattern, eosinophil count, Candida, squamous neoplasia)
// and columnar features (intestinal metaplasia, Barrett's context, glandular dysplasia)
// are described independently and combined into one diagnosis line per part.
// Wording is protected by tests/oesophageal.test.js — change it only deliberately.

export const EOE_THRESHOLD = 15;

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

export function specimenName(part) {
  return part.values.specimenName || `Part ${part.label}`;
}

export const hasSquamous = (v) => v.mucosa !== 'Columnar';
export const hasColumnar = (v) => v.mucosa === 'Squamous and columnar' || v.mucosa === 'Columnar';
export const hasIM = (v) => hasColumnar(v) && v.columnarType === 'With intestinal metaplasia';

export function eosCount(v) {
  if (!hasSquamous(v)) return 0;
  const n = num(v.eosPeak);
  return n === null || n < 0 ? 0 : Math.round(n);
}

/** Reflux-pattern injury: any of the classic squamous changes or a sub-threshold eosinophilia. */
export function refluxPattern(v) {
  if (!hasSquamous(v)) return false;
  return v.basalHyperplasia === 'Present' || v.papillae === 'Present' || v.spongiosis === 'Present'
    || (eosCount(v) > 0 && eosCount(v) < EOE_THRESHOLD) || ['Neutrophils', 'Erosion', 'Ulceration'].includes(v.activity);
}

const DYSPLASIA_RANK = { Negative: 0, Indefinite: 1, 'Low grade': 2, 'High grade': 3, 'Intramucosal adenocarcinoma': 4, 'Invasive adenocarcinoma': 5 };
export function glandularGrade(v) {
  return hasColumnar(v) ? (DYSPLASIA_RANK[v.glandularDysplasia] ?? 0) : 0;
}
const SQUAMOUS_RANK = { Absent: 0, 'Low grade dysplasia': 1, 'High grade dysplasia': 2, 'SCC (superficial sampling)': 3, 'SCC (invasive)': 4 };
export function squamousGrade(v) {
  return hasSquamous(v) ? (SQUAMOUS_RANK[v.squamousNeoplasia] ?? 0) : 0;
}

/** "OESOPHAGUS, distal oesophagus, 38 cm, biopsy" or "GASTRO-OESOPHAGEAL JUNCTION, biopsy". */
export function organPhrase(part, ctx) {
  const site = specimenName(part);
  const noun = ctx?.schema?.specimenNoun || 'biopsy';
  if (/junction|\bgoj\b|\bgej\b|z-line|z line/i.test(site)) return `GASTRO-OESOPHAGEAL JUNCTION, ${noun}`;
  // "Distal oesophagus, 38 cm" -> "distal, 38 cm"; the organ is already in the header.
  const trimmed = site.replace(/\s*\b(o)?esophagus\b/i, '').replace(/^[\s,]+|[\s,]+$/g, '').trim();
  if (!trimmed || /^part [A-Z]$/i.test(trimmed)) return `OESOPHAGUS, ${noun}`;
  return `OESOPHAGUS, ${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}, ${noun}`;
}

const isBarrett = (v) => hasIM(v) && v.endoscopy === "Barrett's segment";

// ---------- microscopy ----------

export function microscopy(part) {
  const v = part.values;
  const sq = hasSquamous(v);
  const col = hasColumnar(v);
  const sentences = [];

  const columnarDesc = hasIM(v) ? 'showing intestinal metaplasia with goblet cells' : 'of cardiac type without goblet cells';
  if (v.mucosa === 'Squamous and columnar') sentences.push('Sections show squamous and columnar mucosa.');
  else if (v.mucosa === 'Columnar') sentences.push(`Sections show columnar mucosa ${columnarDesc}.`);
  else sentences.push('Sections show squamous mucosa.');

  if (sq) {
    const changes = [];
    if (v.basalHyperplasia === 'Present') changes.push('basal cell hyperplasia');
    if (v.papillae === 'Present') changes.push('papillary elongation');
    if (v.spongiosis === 'Present') changes.push('intercellular oedema');
    const eos = eosCount(v);
    let eosText = '';
    if (eos >= EOE_THRESHOLD) {
      eosText = `up to ${fmt(eos)} intraepithelial eosinophils per high power field`;
      if (v.eosFeatures === 'Present') eosText += ', including eosinophil microabscesses and surface layering';
    } else if (eos > 0) {
      eosText = `scattered intraepithelial eosinophils (up to ${fmt(eos)} per high power field)`;
    }
    if (changes.length && eosText) sentences.push(`The squamous epithelium shows ${listJoin(changes)}, with ${eosText}.`);
    else if (changes.length) sentences.push(`The squamous epithelium shows ${listJoin(changes)}.`);
    else if (eosText) sentences.push(`The squamous epithelium shows ${eosText}.`);
    else sentences.push('The squamous epithelium is of normal thickness and maturation with no significant intraepithelial eosinophilia.');
    if (v.fibrosis === 'Present') sentences.push('The lamina propria shows fibrosis.');
    if (v.lymphocytes === 'Increased') sentences.push('Intraepithelial lymphocytes are increased.');
  }

  const activity = v.activity === 'Neutrophils' ? 'Neutrophils are present within the epithelium.'
    : v.activity === 'Erosion' ? 'There is surface erosion with neutrophils and granulation tissue.'
    : v.activity === 'Ulceration' ? 'There is ulceration with fibrinopurulent debris and granulation tissue.' : '';
  if (sq && activity) sentences.push(activity);

  if (v.candida === 'Present') sentences.push('Fungal hyphae and spores consistent with Candida are present within the superficial squamous debris.');

  if (sq) {
    const g = v.squamousNeoplasia;
    if (g === 'Low grade dysplasia') sentences.push('There is low grade squamous dysplasia, with cytological atypia confined to the lower half of the epithelium.');
    else if (g === 'High grade dysplasia') sentences.push('There is high grade squamous dysplasia, with full-thickness cytological atypia and loss of maturation.');
    else if (g === 'SCC (invasive)') sentences.push('Nests of malignant squamous cells with keratinisation and intercellular bridges infiltrate the lamina propria, in keeping with invasive squamous cell carcinoma.');
    else if (g === 'SCC (superficial sampling)') sentences.push('Malignant squamous cells are present; the biopsy is superficial and stromal invasion cannot be assessed.');
  }

  if (col) {
    if (hasIM(v)) {
      if (sq) sentences.push('The columnar mucosa shows intestinal metaplasia with goblet cells.');
      if (v.endoscopy === 'GOJ / Z-line') sentences.push('Intestinal metaplasia at the gastro-oesophageal junction does not in itself establish Barrett\'s oesophagus.');
      else if (v.endoscopy === 'Not stated') sentences.push('Correlation with the endoscopic extent of columnar mucosa is required to establish Barrett\'s oesophagus.');
    } else if (sq) {
      sentences.push('The columnar mucosa is of cardiac type without goblet cells.');
    }
    if (!sq && activity) sentences.push(activity);
    const d = v.glandularDysplasia;
    if (d === 'Indefinite') sentences.push('There is nuclear enlargement and stratification in the setting of active inflammation, indefinite for dysplasia.');
    else if (d === 'Low grade') sentences.push('There is low grade dysplasia, with nuclear stratification and hyperchromasia extending to the surface epithelium.');
    else if (d === 'High grade') sentences.push('There is high grade dysplasia, with marked nuclear pleomorphism, loss of polarity and architectural complexity.');
    else if (d === 'Intramucosal adenocarcinoma') sentences.push('Neoplastic glands infiltrate the lamina propria, in keeping with intramucosal adenocarcinoma.');
    else if (d === 'Invasive adenocarcinoma') sentences.push('Infiltrating malignant glands are present, in keeping with invasive adenocarcinoma.');
    if (v.hpylori === 'Present') sentences.push('Helicobacter-like organisms are identified.');
  }

  if (squamousGrade(v) === 0 && glandularGrade(v) === 0) sentences.push('There is no evidence of dysplasia or malignancy.');

  const notes = (v.additionalNotes || '').trim();
  if (notes) sentences.push(notes);
  return `(${part.label}) ${sentences.join(' ')}`;
}

// ---------- diagnosis ----------

function squamousClause(v) {
  if (!hasSquamous(v)) return '';
  const g = v.squamousNeoplasia;
  if (g === 'SCC (invasive)') return 'INVASIVE SQUAMOUS CELL CARCINOMA';
  if (g === 'SCC (superficial sampling)') return 'SQUAMOUS CELL CARCINOMA; invasion cannot be assessed in this superficial biopsy';
  if (g === 'High grade dysplasia') return 'HIGH GRADE SQUAMOUS DYSPLASIA';
  if (g === 'Low grade dysplasia') return 'LOW GRADE SQUAMOUS DYSPLASIA';

  const eos = eosCount(v);
  const activity = v.activity === 'Erosion' ? ', with erosion' : v.activity === 'Ulceration' ? ', with ulceration' : '';
  if (eos >= EOE_THRESHOLD) {
    return `MARKED INTRAEPITHELIAL EOSINOPHILIA (peak ${fmt(eos)} eosinophils/hpf)${activity}, consistent with eosinophilic oesophagitis in the appropriate clinical context`;
  }
  if (refluxPattern(v)) return `REFLUX OESOPHAGITIS${activity}`;
  if (v.lymphocytes === 'Increased') return 'LYMPHOCYTIC OESOPHAGITIS PATTERN';
  if (v.candida === 'Present') return 'CANDIDA OESOPHAGITIS';
  return hasColumnar(v) ? '' : 'SQUAMOUS MUCOSA WITH NO SIGNIFICANT HISTOLOGICAL ABNORMALITY';
}

function columnarClause(v) {
  if (!hasColumnar(v)) return '';
  const im = hasIM(v);
  const base = im
    ? (isBarrett(v) ? "BARRETT'S OESOPHAGUS (COLUMNAR MUCOSA WITH INTESTINAL METAPLASIA)" : 'COLUMNAR MUCOSA WITH INTESTINAL METAPLASIA')
    : 'COLUMNAR (CARDIAC-TYPE) MUCOSA WITHOUT INTESTINAL METAPLASIA';
  const d = v.glandularDysplasia;
  if (d === 'Invasive adenocarcinoma') return `INVASIVE ADENOCARCINOMA${im ? (isBarrett(v) ? " arising in Barrett's oesophagus" : ' with background intestinal metaplasia') : ''}`;
  if (d === 'Intramucosal adenocarcinoma') return `INTRAMUCOSAL ADENOCARCINOMA${im ? (isBarrett(v) ? " arising in Barrett's oesophagus" : ' with background intestinal metaplasia') : ''}`;
  if (d === 'High grade') return `${base} WITH HIGH GRADE DYSPLASIA`;
  if (d === 'Low grade') return `${base} WITH LOW GRADE DYSPLASIA`;
  if (d === 'Indefinite') return `${base}, INDEFINITE FOR DYSPLASIA`;
  return base;
}

export function diagnosis(part, ctx) {
  const v = part.values;
  const clauses = [squamousClause(v), columnarClause(v)].filter(Boolean);
  const extras = [];
  // Candida alongside another primary finding.
  if (v.candida === 'Present' && clauses[0] !== 'CANDIDA OESOPHAGITIS') extras.push('Candida hyphae present');
  if (hasColumnar(v) && v.hpylori === 'Present') extras.push('Helicobacter-like organisms present');
  const neoplastic = squamousGrade(v) > 0 || glandularGrade(v) > 0;
  if (!neoplastic) extras.push('no evidence of dysplasia or malignancy');
  return `(${part.label}) ${organPhrase(part, ctx)} - ${[...clauses, ...extras].join('; ')}`;
}

// ---------- case summary ----------

const GLANDULAR_TEXT = { 1: 'indefinite for dysplasia', 2: 'low grade dysplasia', 3: 'high grade dysplasia', 4: 'intramucosal adenocarcinoma', 5: 'invasive adenocarcinoma' };
const SQUAMOUS_TEXT = { 1: 'low grade squamous dysplasia', 2: 'high grade squamous dysplasia', 3: 'squamous cell carcinoma', 4: 'invasive squamous cell carcinoma' };
const partList = (parts) => (parts.length === 1 ? `part ${parts[0].label}` : `parts ${listJoin(parts.map((p) => p.label))}`);

/** One SUMMARY line for multi-level series; omitted for single parts or when the option is off. */
export function summary(parts, ctx) {
  if (parts.length < 2 || ctx.options.summary === false) return '';
  const bits = [];

  const sqTop = Math.max(...parts.map((p) => squamousGrade(p.values)));
  if (sqTop > 0) bits.push(`${SQUAMOUS_TEXT[sqTop]} in ${partList(parts.filter((p) => squamousGrade(p.values) === sqTop))}`);

  const imParts = parts.filter((p) => hasIM(p.values));
  if (imParts.length) {
    bits.push(`intestinal metaplasia in ${partList(imParts)}`);
    const glTop = Math.max(...parts.map((p) => glandularGrade(p.values)));
    if (glTop > 0) bits.push(`highest grade ${GLANDULAR_TEXT[glTop]} (${partList(parts.filter((p) => glandularGrade(p.values) === glTop))})`);
    else bits.push('no dysplasia');
  } else {
    const glTop = Math.max(...parts.map((p) => glandularGrade(p.values)));
    if (glTop > 0) bits.push(`${GLANDULAR_TEXT[glTop]} in ${partList(parts.filter((p) => glandularGrade(p.values) === glTop))}`);
  }

  const counts = parts.map((p) => eosCount(p.values));
  const peak = Math.max(...counts);
  if (peak >= EOE_THRESHOLD) {
    const above = counts.filter((c) => c >= EOE_THRESHOLD).length;
    const levels = parts.filter((p) => hasSquamous(p.values)).length;
    const peakParts = parts.filter((p) => eosCount(p.values) === peak);
    bits.push(`peak eosinophil count ${fmt(peak)}/hpf (${partList(peakParts)}); ${EOE_THRESHOLD} or more eosinophils/hpf in ${above} of ${levels} levels sampled, consistent with eosinophilic oesophagitis in the appropriate clinical context`);
  }

  if (!bits.length) return '';
  const text = bits.join('; ');
  return `SUMMARY: ${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
}

export default { specimenName, microscopy, diagnosis, summary };
