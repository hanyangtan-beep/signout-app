// Appendix (appendicectomy) generator. Pure functions: (part, ctx) -> string.
// Benign resection template (Phase 4b, roadmap item 9). Blocks:
//   macro      "(A) Received in formalin is an appendix measuring 6 cm long and 0.8 cm in diameter. ... All embedded in 3 blocks."
//   blockKey   "(A) (1) Proximal resection margin. (2) Body, longitudinal sections. (3) Tip, bisected."
//   microscopy "(A) Sections of the appendix show ulceration and suppurative inflammation ..."
//   diagnosis  "(A) APPENDIX, appendicectomy - ACUTE SUPPURATIVE APPENDICITIS; faecolith; no evidence of dysplasia or malignancy"
// Neoplasm options give a short capitalised line only; grading / staging belongs to the
// QMH appendix cancer template (the schema's auto snippet says so in the COMMENT block).
// Wording is protected by tests/appendix.test.js — change it only deliberately.

const num = (v) => {
  const n = parseFloat(String(v ?? '').trim());
  return Number.isFinite(n) ? n : null;
};
const fmt = (n) => (Number.isInteger(n) ? String(n) : String(n).replace(/\.0+$/, ''));

export const NEGATIVE = 'No dysplasia or malignancy';
export const hasNeoplasm = (v) => !!v.neoplasia && v.neoplasia !== NEGATIVE;

/** "Appendix, incidental" -> "incidental"; "Appendix" / blank -> "". */
function qualifier(part) {
  const raw = String(part.values.specimenName || '').trim();
  const rest = raw.replace(/^\s*appendix\b/i, '').replace(/^[\s,:-]+|[\s,]+$/g, '').trim();
  if (!rest || /^part [A-Z]$/i.test(rest)) return '';
  return rest.charAt(0).toLowerCase() + rest.slice(1);
}

/** "Appendix, appendicectomy" or "Appendix, incidental, appendicectomy". */
export function specimenName(part, ctx) {
  const noun = ctx?.schema?.specimenNoun || 'appendicectomy';
  const q = qualifier(part);
  return q ? `Appendix, ${q}, ${noun}` : `Appendix, ${noun}`;
}

/** "APPENDIX, appendicectomy" or "APPENDIX, incidental, appendicectomy". */
export function organPhrase(part, ctx) {
  const noun = ctx?.schema?.specimenNoun || 'appendicectomy';
  const q = qualifier(part);
  return q ? `APPENDIX, ${q}, ${noun}` : `APPENDIX, ${noun}`;
}

/** Free-text size: "1.2" -> "1.2 cm"; "12 mm" unchanged; "1.2x0.8" -> "1.2 x 0.8 cm". */
function sizeText(raw) {
  let s = String(raw || '').trim().replace(/\s*[xX×]\s*/g, ' x ');
  if (!s) return '';
  if (!/cm|mm/i.test(s)) s += ' cm';
  return s;
}

// ---------- macroscopic description ----------

function measurePhrase(v) {
  const l = num(v.length);
  const d = num(v.diameter);
  const bits = [];
  if (l !== null) bits.push(`${fmt(l)} cm long`);
  if (d !== null) bits.push(`${fmt(d)} cm in diameter`);
  return bits.length ? ` measuring ${bits.join(' and ')}` : '';
}

export function macro(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const s = [];
  s.push(`Received in formalin is an appendix${measurePhrase(v)}.`);

  const site = String(v.perforationSite || '').trim();
  if (v.serosa === 'Smooth, glistening') s.push('The serosal surface is smooth and glistening.');
  else if (v.serosa === 'Fibrinopurulent exudate') s.push('The serosal surface is covered by fibrinopurulent exudate.');
  else if (v.serosa === 'Perforated - site') s.push(`The serosal surface is congested and a perforation is present${site ? ` (${site})` : ''}.`);
  else if (v.serosa) s.push('The serosal surface shows areas of congestion and discolouration.');

  if (v.lumen === 'Empty') s.push('The lumen is empty.');
  else if (v.lumen === 'Faecolith') s.push('The lumen contains a faecolith.');
  else if (v.lumen === 'Mucus') s.push('The lumen contains mucus.');
  else if (v.lumen === 'Pus') s.push('The lumen contains pus.');
  else if (v.lumen) s.push('The lumen contains faecal material.');

  if (v.wall === 'Thickened') s.push('The wall is thickened.');
  else if (v.wall === 'Necrotic') s.push('The wall is necrotic.');
  else if (v.wall) s.push('The wall is unremarkable.');

  if (v.tip === 'Dilated') s.push('The tip is dilated.');
  else if (v.tip === 'Mass - describe') {
    const desc = String(v.tipMass || '').trim();
    s.push(desc ? `At the tip there is a mass: ${desc.replace(/\.$/, '')}.` : 'At the tip there is a mass.');
  }

  if (v.mesoappendix === 'Not included') s.push('The mesoappendix is not included.');

  const blocks = Math.max(1, Math.round(num(v.blocks) ?? 3));
  const noun = blocks === 1 ? 'block' : 'blocks';
  s.push(v.blockHandling === 'Representative sections' ? `Representative sections in ${blocks} ${noun}.` : `All embedded in ${blocks} ${noun}.`);
  return `(${part.label}) ${s.join(' ')}`;
}

export function blockKey(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const keys = ['(1) Proximal resection margin.', '(2) Body, longitudinal sections.', '(3) Tip, bisected.'];
  if (v.mesoappendix === 'Included' && hasNeoplasm(v)) keys.push('(4) Mesoappendiceal margin.');
  return `(${part.label}) ${keys.join(' ')}`;
}

// ---------- microscopy ----------

const SEROSA_SENTENCE = 'Neutrophilic fibrinous exudates are present on the serosal surface.';

function inflammationSentences(v) {
  const serositis = v.serositis === 'Neutrophilic fibrinous exudate';
  switch (v.inflammation) {
    case 'Acute appendicitis with periappendicitis':
      return ['Sections of the appendix show ulceration and suppurative inflammation extending to the serosal surface, where neutrophilic fibrinous exudates are seen.',
        'The findings are consistent with acute appendicitis with periappendicitis.'];
    case 'Gangrenous appendicitis':
      return [`Sections of the appendix show transmural suppurative inflammation with extensive necrosis of the wall${serositis ? ' and neutrophilic fibrinous exudates on the serosal surface' : ''}.`,
        'The findings are consistent with gangrenous appendicitis.'];
    case 'Periappendicitis only':
      return ['Sections of the appendix show neutrophilic fibrinous exudates on the serosal surface.',
        'No acute inflammation is seen within the appendiceal mucosa.',
        'Features are in keeping with periappendicitis.'];
    case 'Chronic / interval appendicitis':
      return ['Sections of the appendix show mural fibrosis with a mixed chronic inflammatory infiltrate of lymphocytes, plasma cells and eosinophils.',
        'No acute mucosal inflammation is seen.',
        ...(serositis ? [SEROSA_SENTENCE] : []),
        'The features are in keeping with chronic (interval) appendicitis.'];
    case 'Fibrous obliteration of the lumen':
      return ['Sections of the appendix show fibrous obliteration of the lumen with loss of the mucosa and replacement by fibrous and adipose tissue containing nerve fibres.',
        'There is no acute inflammation.',
        ...(serositis ? [SEROSA_SENTENCE] : [])];
    case 'No acute inflammation - unremarkable':
      return ['Sections of the appendix show unremarkable mucosa with preserved lymphoid tissue.',
        'There is no acute inflammation.',
        ...(serositis ? [SEROSA_SENTENCE] : [])];
    case 'Acute suppurative appendicitis':
    default:
      return [serositis
        ? 'Sections of the appendix show ulceration and suppurative inflammation extending to the serosal surface, where neutrophilic fibrinous exudates are seen.'
        : 'Sections of the appendix show ulceration and suppurative inflammation extending through the muscularis propria.',
      'The findings are consistent with acute suppurative appendicitis.'];
  }
}

function neoplasmSentences(v) {
  const size = sizeText(v.tumourSize);
  const measuring = size ? ` measuring ${size}` : '';
  const out = [];
  switch (v.neoplasia) {
    case 'Low grade appendiceal mucinous neoplasm (LAMN) - see comment':
      out.push(`In addition, there is a low grade appendiceal mucinous neoplasm${measuring}, with an undulating mucinous epithelial proliferation showing low grade cytological atypia, loss of the lamina propria and muscularis mucosae and fibrosis of the wall (see comment).`);
      break;
    case 'Well differentiated neuroendocrine tumour - see comment':
      out.push(`In addition, there is a well differentiated neuroendocrine tumour${measuring}, composed of nests of uniform cells with finely granular chromatin infiltrating the wall (see comment).`);
      break;
    case 'Sessile serrated lesion':
      out.push('In addition, there is a sessile serrated lesion with crypt dilatation and serration extending to the crypt bases, without dysplasia.');
      break;
    case 'Adenocarcinoma - see comment':
      out.push(`In addition, there is an adenocarcinoma${measuring} infiltrating the wall (see comment).`);
      break;
    case 'Goblet cell adenocarcinoma - see comment':
      out.push(`In addition, there is a goblet cell adenocarcinoma${measuring}, composed of tubules and clusters of goblet-like mucinous cells infiltrating the wall (see comment).`);
      break;
    default:
      return out;
  }
  if (v.mesoMargin === 'Involved') out.push('The mesoappendiceal margin is involved.');
  else if (v.mesoMargin === 'Not included') out.push('The mesoappendix is not included for assessment of the mesoappendiceal margin.');
  else if (v.mesoMargin) out.push('The mesoappendiceal margin is not involved.');
  return out;
}

export function microscopy(part) {
  const v = part.values;
  const s = inflammationSentences(v);
  if (v.perforation === 'Present') s.push('There is a full-thickness defect in the wall, in keeping with perforation.');
  if (v.faecolith === 'Present') s.push('A faecolith is present within the lumen.');
  if (v.lymphoidHyperplasia === 'Present') s.push('The mucosal lymphoid tissue is hyperplastic.');
  if (v.enterobius === 'Present') s.push('Enterobius vermicularis organisms are present within the lumen.');
  if (v.granulomas === 'Present - see comment') s.push('Granulomas are present within the wall (see comment).');
  if (v.diverticulum === 'Present') s.push('A diverticulum lined by appendiceal mucosa herniates through the muscularis propria.');
  s.push(...neoplasmSentences(v));
  if (v.proximalMargin === 'Inflamed') s.push('Acute inflammation extends to the proximal resection margin.');
  else if (v.proximalMargin === 'Involved') s.push('The proximal resection margin is involved.');
  if (!hasNeoplasm(v)) s.push('There is no evidence of dysplasia or malignancy.');
  const notes = String(v.additionalNotes || '').trim();
  if (notes) s.push(notes);
  return `(${part.label}) ${s.join(' ')}`;
}

// ---------- diagnosis ----------

const NEOPLASM_LINE = {
  'Low grade appendiceal mucinous neoplasm (LAMN) - see comment': 'LOW GRADE APPENDICEAL MUCINOUS NEOPLASM (LAMN)',
  'Well differentiated neuroendocrine tumour - see comment': 'WELL DIFFERENTIATED NEUROENDOCRINE TUMOUR',
  'Sessile serrated lesion': 'SESSILE SERRATED LESION',
  'Adenocarcinoma - see comment': 'ADENOCARCINOMA',
  'Goblet cell adenocarcinoma - see comment': 'GOBLET CELL ADENOCARCINOMA'
};

/** Main inflammatory entity in capitals; '' when unremarkable and a neoplasm carries the line. */
function inflammationClause(v) {
  const perf = v.perforation === 'Present';
  switch (v.inflammation) {
    case 'Acute appendicitis with periappendicitis':
      return perf ? 'ACUTE APPENDICITIS WITH PERIAPPENDICITIS AND PERFORATION' : 'ACUTE APPENDICITIS WITH PERIAPPENDICITIS';
    case 'Gangrenous appendicitis':
      return perf ? 'GANGRENOUS APPENDICITIS WITH PERFORATION' : 'GANGRENOUS APPENDICITIS';
    case 'Periappendicitis only':
      return perf ? 'PERIAPPENDICITIS; perforation' : 'PERIAPPENDICITIS';
    case 'Chronic / interval appendicitis':
      return perf ? 'CHRONIC (INTERVAL) APPENDICITIS WITH PERFORATION' : 'CHRONIC (INTERVAL) APPENDICITIS';
    case 'Fibrous obliteration of the lumen':
      return perf ? 'FIBROUS OBLITERATION; perforation' : 'FIBROUS OBLITERATION';
    case 'No acute inflammation - unremarkable':
      return hasNeoplasm(v) ? (perf ? 'perforation' : '') : (perf ? 'PERFORATION; no acute inflammation' : 'NO SIGNIFICANT ABNORMALITY');
    case 'Acute suppurative appendicitis':
    default:
      return perf ? 'ACUTE SUPPURATIVE APPENDICITIS WITH PERFORATION' : 'ACUTE SUPPURATIVE APPENDICITIS';
  }
}

export function diagnosis(part, ctx) {
  const v = part.values;
  const clauses = [];
  if (hasNeoplasm(v)) {
    const size = sizeText(v.tumourSize);
    clauses.push(`${NEOPLASM_LINE[v.neoplasia] || v.neoplasia.toUpperCase()}${size ? ` (${size})` : ''}`);
    if (v.mesoMargin === 'Involved') clauses.push('mesoappendiceal margin involved');
    else if (v.mesoMargin === 'Not included') clauses.push('mesoappendix not included');
    else if (v.mesoMargin) clauses.push('mesoappendiceal margin uninvolved');
  }
  const infl = inflammationClause(v);
  if (infl) clauses.push(infl);
  // Serositis is implicit in the acute / periappendicitis entities; state it for the rest (house: "FIBROUS OBLITERATION; serositis").
  const implicitSerositis = ['Acute suppurative appendicitis', 'Acute appendicitis with periappendicitis', 'Gangrenous appendicitis', 'Periappendicitis only'].includes(v.inflammation);
  if (v.serositis === 'Neutrophilic fibrinous exudate' && !implicitSerositis) clauses.push('serositis');
  if (v.faecolith === 'Present') clauses.push('faecolith');
  if (v.lymphoidHyperplasia === 'Present') clauses.push('lymphoid hyperplasia');
  if (v.enterobius === 'Present') clauses.push('Enterobius vermicularis');
  if (v.granulomas === 'Present - see comment') clauses.push('granulomas - see comment');
  if (v.diverticulum === 'Present') clauses.push('diverticulum');
  if (v.proximalMargin === 'Inflamed') clauses.push('acute inflammation at the proximal margin');
  else if (v.proximalMargin === 'Involved') clauses.push('proximal margin involved');
  if (hasNeoplasm(v)) clauses.push('see comment');
  else clauses.push('no evidence of dysplasia or malignancy');
  return `(${part.label}) ${organPhrase(part, ctx)} - ${clauses.join('; ')}`;
}

/**
 * "Upgrade this part": the benign appendicectomy hands off to the appendiceal tumour
 * synoptic when a reportable neoplasm is ticked (LAMN, invasive adenocarcinoma or goblet
 * cell adenocarcinoma; the well-differentiated NET and serrated lesion carry their own
 * comments). Maps what the benign form can answer; staging items stay at the defaults.
 */
export const UPGRADE_TO = {
  to: 'appendix_carcinoma',
  when: (v) => /appendiceal mucinous neoplasm|Adenocarcinoma|Goblet cell adenocarcinoma/.test(v.neoplasia || ''),
  map: (v) => {
    const isLAMN = /^Low grade appendiceal mucinous neoplasm/.test(v.neoplasia || '');
    const out = {};
    if (isLAMN) out.histType = 'Low-grade appendiceal mucinous neoplasm';
    else if (/^Goblet cell adenocarcinoma/.test(v.neoplasia || '')) out.histType = 'Goblet cell adenocarcinoma';
    else out.histType = 'Adenocarcinoma';
    if (isLAMN) out.grade = 'Not applicable';
    const m = /^([0-9]+(?:\.[0-9]+)?)\s*(cm|mm)/i.exec(String(v.tumourSize || '').trim());
    if (m) out.tumourSizeMm = /cm/i.test(m[2]) ? Math.round(parseFloat(m[1]) * 10) : parseFloat(m[1]);
    if (isLAMN) {
      if (v.mesoMargin === 'Involved') out.mesentericMargin = 'Involved by low-grade appendiceal mucinous neoplasm';
      else if (v.mesoMargin === 'Uninvolved') out.mesentericMargin = 'Uninvolved by appendiceal mucinous neoplasm (specify distance)';
      else if (v.mesoMargin === 'Not included') out.mesentericMargin = 'Cannot be assessed';
      if (v.proximalMargin === 'Involved') out.proximalMargin = 'Involved by low-grade appendiceal mucinous neoplasm';
      else if (v.proximalMargin && v.proximalMargin !== 'Involved') out.proximalMargin = 'Uninvolved by appendiceal mucinous neoplasm (specify distance)';
    } else {
      if (v.mesoMargin === 'Involved') out.mesentericMargin = 'Involved by invasive carcinoma';
      else if (v.mesoMargin === 'Uninvolved') out.mesentericMargin = 'Uninvolved by invasive carcinoma (specify distance)';
      else if (v.mesoMargin === 'Not included') out.mesentericMargin = 'Cannot be assessed';
      if (v.proximalMargin === 'Involved') out.proximalMargin = 'Involved by invasive carcinoma';
      else if (v.proximalMargin && v.proximalMargin !== 'Involved') out.proximalMargin = 'Uninvolved by invasive carcinoma (specify distance)';
    }
    const findings = [];
    if (v.inflammation && v.inflammation !== 'No acute inflammation - unremarkable') findings.push('Appendicitis');
    if (v.perforation === 'Present') findings.push('Perforation, not at the tumour');
    if (findings.length) out.additionalFindings = findings;
    return out;
  }
};

export default { specimenName, macro, blockKey, microscopy, diagnosis, UPGRADE_TO };
