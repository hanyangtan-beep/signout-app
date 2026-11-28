import { stripDot } from './_house.js';
// Benign and inflammatory bowel resection generator (colon, rectum and small bowel).
// Pure functions: (part, ctx) -> string.
// Covers diverticular disease, IBD (UC / Crohn / IBD-U), ischaemia / infarction, amyloidosis,
// Meckel diverticulum, radiation / infectious / CMV enterocolitis, endometriosis, angiodysplasia,
// pneumatosis, benign stricture, perforation, and standalone resection margins / anastomotic rings.

const num = (v) => {
  const n = parseFloat(String(v ?? '').trim());
  return Number.isFinite(n) ? n : null;
};
const fmt = (n) => (Number.isInteger(n) ? String(n) : String(n).replace(/\.0+$/, ''));
const lc1 = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : '');
const uc1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const listJoin = (items) => {
  const a = items.filter(Boolean);
  if (a.length <= 1) return a[0] || '';
  return `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
};
const ticked = (arr) => (Array.isArray(arr) ? arr : []).filter(Boolean);
const sentence = (s) => (stripDot(s) ? `${uc1(stripDot(s))}.` : '');

const procLabel = (v) => (v.procedure === 'Other' ? (stripDot(v.procedureOther) || 'resection') : (v.procedure || 'resection'));
const procInline = (v) => {
  const p = procLabel(v);
  return /^(Hartmann|Meckel)/i.test(p) ? p : lc1(p);
};

function organHead(v) {
  if (v.procedure === 'Resection margin / anastomotic ring') {
    return v.bowelSegment === 'Small bowel' ? 'SMALL BOWEL, resection margin' : 'COLON, resection margin';
  }
  switch (v.bowelSegment) {
    case 'Small bowel': return 'SMALL BOWEL';
    case 'Ileocaecal / right colon': return 'ILEOCAECAL SEGMENT';
    case 'Rectosigmoid / rectum': return 'RECTOSIGMOID';
    case 'Sigmoid colon': return 'SIGMOID COLON';
    case 'Right colon': return 'RIGHT COLON';
    case 'Transverse colon': return 'TRANSVERSE COLON';
    case 'Left colon': return 'LEFT COLON';
    case 'Total / subtotal colon': return 'COLON';
    default: return 'COLON';
  }
}

export function specimenName(part) {
  const v = part.values;
  const given = stripDot(v.specimenName);
  if (given) return given;
  if (v.procedure === 'Resection margin / anastomotic ring') {
    return `${v.bowelSegment || 'Colon'}, resection margin / anastomotic ring`;
  }
  return `${v.bowelSegment || 'Colon'}, ${procInline(v)}`;
}

// ---------- macroscopy ----------

export function macro(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const s = [];
  const len = num(v.specimenLength);
  const seg = lc1(v.bowelSegment || 'colon');

  if (v.procedure === 'Resection margin / anastomotic ring') {
    s.push(`Received is an anastomotic ring / resection margin of ${seg}${len !== null ? ` measuring ${fmt(len)} cm in length` : ''}.`);
  } else {
    s.push(`Received is a ${procInline(v)} specimen of ${seg}${len !== null ? ` measuring ${fmt(len)} cm in length` : ''}.`);
  }

  const attached = stripDot(v.attachedStructures);
  if (attached) s.push(`Attached structures include ${lc1(attached)}.`);

  if (v.serosaGross && v.serosaGross !== 'Unremarkable') {
    s.push(`The serosal surface shows ${lc1(v.serosaGross)}.`);
  } else {
    s.push('The serosa is smooth and unremarkable.');
  }

  if (v.perforationGross === 'Present — frank perforation') s.push('A frank perforation is identified.');
  else if (v.perforationGross === 'Present — sealed perforation') s.push('A sealed perforation is identified.');

  if (v.mucosaGross && v.mucosaGross !== 'Unremarkable') {
    s.push(`On opening, the mucosa and bowel wall show ${lc1(v.mucosaGross)}.`);
  } else {
    s.push('On opening, the mucosa is unremarkable.');
  }

  const extra = sentence(v.macroNotes);
  if (extra) s.push(extra);

  const n = Math.max(1, Math.round(num(v.blocks) ?? 6));
  s.push(`Representative sections are submitted in ${n} ${n === 1 ? 'block' : 'blocks'}.`);
  return `(${part.label}) ${s.join(' ')}`;
}

export function blockKey(part, ctx) {
  if (ctx?.options?.macro === false) return '';
  const v = part.values;
  const typed = String(v.blockKeyText || '').trim();
  if (typed) return `(${part.label}) ${typed.replace(/\n+/g, ' ')}`;
  if (v.procedure === 'Resection margin / anastomotic ring') {
    return `(${part.label}) (1) Resection margin / anastomotic ring, all embedded.`;
  }
  const n = Math.max(1, Math.round(num(v.blocks) ?? 6));
  if (n <= 2) return `(${part.label}) (1) Resection margins. (2) Representative bowel wall.`;
  if (n === 3) return `(${part.label}) (1) Proximal and distal resection margins. (2)&(3) Representative bowel wall.`;
  return `(${part.label}) (1) Proximal resection margin. (2) Distal resection margin. (3)-(${n}) Representative bowel wall and regional lymph nodes.`;
}

// ---------- microscopy ----------

function patternMicro(v) {
  const s = [];
  switch (v.pattern || 'Diverticular disease') {
    case 'Diverticular disease': {
      const comp = v.diverticularComplication || 'Acute diverticulitis';
      const feats = ticked(v.diverticularFeatures).map(lc1);
      if (comp === 'Uncomplicated diverticulosis') {
        s.push('Sections show colonic wall with multiple false diverticula comprising mucosa and submucosa herniating through the muscularis propria, without active diverticulitis.');
      } else if (comp === 'Perforated acute diverticulitis with pericolic abscess') {
        s.push('Sections show colonic diverticula with acute suppurative diverticulitis, transmural necrosis, perforation and pericolic abscess formation.');
      } else if (comp === 'Chronic diverticulitis with fibrosis / stricture') {
        s.push('Sections show colonic diverticula with chronic active diverticulitis, transmural fibrosis and luminal narrowing.');
      } else if (comp === 'Diverticular disease with fistula') {
        s.push('Sections show colonic diverticula with chronic active diverticulitis and a fistula tract lined by granulation tissue.');
      } else {
        s.push('Sections show colonic diverticula with acute diverticulitis, mucosal ulceration and acute inflammatory infiltrate extending into the peridiverticular fat.');
      }
      if (feats.length) s.push(`Associated features include ${listJoin(feats)}.`);
      break;
    }
    case 'Inflammatory bowel disease (IBD)': {
      const sub = v.ibdSubtype || 'Crohn disease';
      const act = lc1(v.ibdActivity || 'Moderately active');
      const feats = ticked(v.ibdFeatures).map(lc1);
      s.push(`Sections show bowel wall with ${act} chronic inflammatory bowel disease in keeping with ${sub}.`);
      if (feats.length) s.push(`Histological features include ${listJoin(feats)}.`);
      if (v.ibdDysplasia === 'Negative for dysplasia') {
        s.push('No epithelial dysplasia is identified.');
      } else if (v.ibdDysplasia === 'Indefinite for dysplasia') {
        s.push('Focal epithelial changes are indefinite for dysplasia in the background of active inflammation.');
      } else if (v.ibdDysplasia === 'Low-grade dysplasia') {
        s.push('Foci of low-grade epithelial dysplasia are identified.');
      } else if (v.ibdDysplasia === 'High-grade dysplasia') {
        s.push('Foci of high-grade epithelial dysplasia are identified.');
      } else if (v.ibdDysplasia) {
        s.push('Invasive adenocarcinoma is identified arising in the background of inflammatory bowel disease; see synoptic report.');
      }
      break;
    }
    case 'Ischaemia / infarction': {
      const acuity = v.ischaemiaAcuity || 'Transmural ischaemic infarction / gangrene';
      const feats = ticked(v.ischaemiaFeatures).map(lc1);
      s.push(`Sections show bowel wall with ${lc1(acuity)}.`);
      if (feats.length) s.push(`Features include ${listJoin(feats)}.`);
      break;
    }
    case 'Amyloidosis': {
      const comp = ticked(v.amyloidCompartment).map(lc1);
      s.push(`Sections show extensive extracellular, amorphous eosinophilic acellular deposits involving ${comp.length ? listJoin(comp) : 'the bowel wall and submucosal vessels'}.`);
      if (v.congoRed === 'Positive with apple-green birefringence under polarised light') {
        s.push('Congo red stain is positive and demonstrates characteristic apple-green birefringence under polarised light, confirming amyloidosis.');
      } else if (v.congoRed === 'Negative') {
        s.push('Congo red stain is negative.');
      }
      if (v.amyloidSubtype && v.amyloidSubtype !== 'Pending typing (IHC / mass spectrometry)') {
        s.push(`Immunohistochemistry / typing is consistent with ${v.amyloidSubtype}.`);
      } else if (v.congoRed === 'Positive with apple-green birefringence under polarised light') {
        s.push('Amyloid subtyping is pending.');
      }
      break;
    }
    case 'Meckel diverticulum': {
      const het = v.meckelHeterotopia || 'Heterotopic gastric mucosa (oxyntic type)';
      s.push(`Sections show a true diverticulum containing all layers of the small intestinal wall. ${het === 'No heterotopic tissue identified' ? 'No heterotopic gastric or pancreatic tissue is identified.' : `${het} is present.`}`);
      break;
    }
    case 'Radiation enterocolitis':
      s.push('Sections show features of radiation enterocolitis, including mucosal atrophy and ulceration, hyalinisation of the lamina propria and submucosa, atypical stromal fibroblasts, telangiectatic capillaries and obliterative endarteritis.');
      break;
    case 'Infectious / pseudomembranous / CMV':
      s.push('Sections show acute enterocolitis with mucosal ulceration, surface fibrinopurulent exudate / pseudomembranes and mixed acute and chronic inflammation.');
      break;
    case 'Endometriosis':
      s.push('Sections show foci of benign endometrial-type glands and stroma with haemosiderin-laden macrophages infiltrating the bowel wall, accompanied by smooth muscle hyperplasia and fibrosis.');
      break;
    case 'Angiodysplasia / vascular malformation':
      s.push('Sections show dilated, tortuous, thin-walled submucosal and mucosal vascular channels in keeping with angiodysplasia / vascular malformation.');
      break;
    case 'Pneumatosis intestinalis':
      s.push('Sections show multiple variably sized submucosal and subserosal gas-filled cystic spaces partially lined by multinucleated giant cells and histiocytes, consistent with pneumatosis intestinalis.');
      break;
    case 'Benign stricture / adhesions':
      s.push('Sections show mural and submucosal fibrosis with serosal fibrous adhesions and luminal narrowing.');
      break;
    case 'Perforation (non-diverticular / stercoral / iatrogenic)':
      s.push('Sections show full-thickness bowel wall perforation with mucosal ulceration, transmural acute inflammation, necrosis and fibrinous serositis.');
      break;
    case 'Resection margin only (viable / clear)':
      s.push('Sections show viable bowel wall with intact mucosa and unremarkable submucosa and muscularis propria.');
      break;
    default: {
      const other = stripDot(v.patternOther);
      s.push(other ? `Sections show bowel wall with ${lc1(other)}.` : 'Sections show benign bowel wall.');
      break;
    }
  }
  return s;
}

function marginsSentence(v) {
  if (v.procedure === 'Resection margin / anastomotic ring' && v.pattern === 'Resection margin only (viable / clear)') {
    return 'The resection margin is viable and unremarkable.';
  }
  const prox = v.proximalMargin || 'Viable and unremarkable';
  const dist = v.distalMargin || 'Viable and unremarkable';
  const other = v.otherMargin || 'Not submitted';
  const parts = [];
  if (prox !== 'Not applicable' && dist !== 'Not applicable' && prox === dist) {
    parts.push(`Both proximal and distal resection margins are ${lc1(prox)}.`);
  } else {
    if (prox !== 'Not applicable') parts.push(`The proximal resection margin is ${lc1(prox)}.`);
    if (dist !== 'Not applicable') parts.push(`The distal resection margin is ${lc1(dist)}.`);
  }
  if (other !== 'Not submitted') parts.push(`The anastomotic ring / radial margin is ${lc1(other)}.`);
  return parts.join(' ');
}

export function microscopy(part) {
  const v = part.values;
  const s = [...patternMicro(v)];

  const mSent = marginsSentence(v);
  if (mSent) s.push(mSent);

  if (v.lymphNodes === 'Reactive hyperplasia, no malignancy') {
    s.push('Regional lymph nodes show reactive lymphoid hyperplasia with no evidence of malignancy.');
  } else if (v.lymphNodes === 'Reactive with non-necrotising granulomas') {
    s.push('Regional lymph nodes show reactive hyperplasia with non-necrotising epithelioid granulomas.');
  }

  if (v.appendix && v.appendix !== 'Not included') {
    s.push(`The attached appendix shows ${lc1(v.appendix)}.`);
  }

  if (v.cmvIhc === 'Positive (nuclear inclusions confirmed)') {
    s.push('Immunohistochemistry for CMV is positive, confirming viral nuclear inclusions.');
  } else if (v.cmvIhc === 'Negative') {
    s.push('Immunohistochemistry for CMV is negative.');
  }

  const otherStains = sentence(v.otherStains);
  if (otherStains) s.push(otherStains);

  const hasCarcinoma = v.neoplasia === 'Incidental invasive carcinoma (use Colorectal Ca synoptic)'
    || v.ibdDysplasia === 'Invasive adenocarcinoma (use Colorectal Ca synoptic)';
  const hasDysplasia = v.neoplasia === 'Dysplasia present (see description)'
    || (v.pattern === 'Inflammatory bowel disease (IBD)' && ['Low-grade dysplasia', 'High-grade dysplasia'].includes(v.ibdDysplasia));
  if (!hasCarcinoma && !hasDysplasia && v.pattern !== 'Inflammatory bowel disease (IBD)') {
    s.push('There is no evidence of dysplasia or malignancy.');
  } else if (!hasCarcinoma && !hasDysplasia && v.pattern === 'Inflammatory bowel disease (IBD)') {
    s.push('There is no evidence of malignancy.');
  }

  const notes = sentence(v.additionalNotes);
  if (notes) s.push(notes);

  return `(${part.label}) ${s.join(' ')}`;
}

// ---------- diagnosis ----------

export function diagnosis(part) {
  const v = part.values;
  const head = `${organHead(v)}, ${procInline(v)}`;
  const clauses = [];

  switch (v.pattern || 'Diverticular disease') {
    case 'Diverticular disease': {
      const comp = v.diverticularComplication || 'Acute diverticulitis';
      if (comp === 'Uncomplicated diverticulosis') clauses.push('DIVERTICULOSIS');
      else if (comp === 'Perforated acute diverticulitis with pericolic abscess') clauses.push('PERFORATED ACUTE DIVERTICULITIS with PERICOLIC ABSCESS');
      else if (comp === 'Chronic diverticulitis with fibrosis / stricture') clauses.push('CHRONIC DIVERTICULITIS with FIBROSIS');
      else if (comp === 'Diverticular disease with fistula') clauses.push('DIVERTICULITIS with FISTULA FORMATION');
      else clauses.push('ACUTE DIVERTICULITIS');
      if (ticked(v.diverticularFeatures).includes('Fibrinous serositis / acute peritonitis')) clauses.push('acute serositis');
      break;
    }
    case 'Inflammatory bowel disease (IBD)': {
      const sub = (v.ibdSubtype || 'Crohn disease').toUpperCase();
      const act = lc1(v.ibdActivity || 'Moderately active');
      clauses.push(`${sub}, ${act}`);
      if (v.ibdDysplasia === 'Low-grade dysplasia') clauses.push('with LOW-GRADE DYSPLASIA');
      else if (v.ibdDysplasia === 'High-grade dysplasia') clauses.push('with HIGH-GRADE DYSPLASIA');
      else if (v.ibdDysplasia === 'Indefinite for dysplasia') clauses.push('indefinite for dysplasia');
      else if (v.ibdDysplasia === 'Invasive adenocarcinoma (use Colorectal Ca synoptic)') clauses.push('with INVASIVE ADENOCARCINOMA (see synoptic report)');
      else clauses.push('negative for dysplasia');
      break;
    }
    case 'Ischaemia / infarction': {
      const ac = v.ischaemiaAcuity || 'Transmural ischaemic infarction / gangrene';
      if (ac.startsWith('Transmural')) clauses.push('TRANSMURAL ISCHAEMIC INFARCTION');
      else if (ac.startsWith('Chronic')) clauses.push('CHRONIC ISCHAEMIC ENTEROCOLITIS');
      else clauses.push('ACUTE ISCHAEMIC ENTEROCOLITIS');
      if (v.perforationGross && v.perforationGross !== 'Not identified') clauses.push('with perforation');
      break;
    }
    case 'Amyloidosis': {
      const sub = v.amyloidSubtype && v.amyloidSubtype !== 'Pending typing (IHC / mass spectrometry)'
        ? `, ${v.amyloidSubtype}` : '';
      clauses.push(`AMYLOIDOSIS${sub}`);
      break;
    }
    case 'Meckel diverticulum': {
      const het = v.meckelHeterotopia || 'No heterotopic tissue identified';
      clauses.push(het === 'No heterotopic tissue identified'
        ? 'MECKEL DIVERTICULUM'
        : `MECKEL DIVERTICULUM with ${het.toUpperCase()}`);
      break;
    }
    case 'Radiation enterocolitis': clauses.push('RADIATION ENTEROCOLITIS'); break;
    case 'Infectious / pseudomembranous / CMV':
      clauses.push(v.cmvIhc === 'Positive (nuclear inclusions confirmed)' ? 'CYTOMEGALOVIRUS ENTEROCOLITIS' : 'ACUTE ENTEROCOLITIS');
      break;
    case 'Endometriosis': clauses.push('ENDOMETRIOSIS of the bowel wall'); break;
    case 'Angiodysplasia / vascular malformation': clauses.push('ANGIODYSPLASIA'); break;
    case 'Pneumatosis intestinalis': clauses.push('PNEUMATOSIS INTESTINALIS'); break;
    case 'Benign stricture / adhesions': clauses.push('BENIGN STRICTURE with MURAL FIBROSIS'); break;
    case 'Perforation (non-diverticular / stercoral / iatrogenic)': clauses.push('BOWEL PERFORATION with ACUTE PERITONITIS'); break;
    case 'Resection margin only (viable / clear)': clauses.push('VIABLE BOWEL RESECTION MARGIN, no significant pathology'); break;
    default: {
      const other = stripDot(v.patternOther);
      clauses.push(other ? other.toUpperCase() : 'NO SIGNIFICANT PATHOLOGY');
      break;
    }
  }

  // Margin status in diagnosis when abnormal or explicitly viable on resection
  const badMargins = [];
  if (v.proximalMargin === 'Ischaemic / non-viable') badMargins.push('proximal margin ischaemic');
  else if (v.proximalMargin === 'Involved by Crohn disease (transmural inflammation / granulomas)') badMargins.push('Crohn disease at proximal margin');
  else if (v.proximalMargin === 'Dysplasia present') badMargins.push('dysplasia at proximal margin');

  if (v.distalMargin === 'Ischaemic / non-viable') badMargins.push('distal margin ischaemic');
  else if (v.distalMargin === 'Involved by Crohn disease (transmural inflammation / granulomas)') badMargins.push('Crohn disease at distal margin');
  else if (v.distalMargin === 'Dysplasia present') badMargins.push('dysplasia at distal margin');

  if (v.otherMargin === 'Ischaemic / non-viable') badMargins.push('anastomotic ring ischaemic');
  else if (v.otherMargin === 'Dysplasia present') badMargins.push('dysplasia at anastomotic ring');

  if (badMargins.length) {
    clauses.push(badMargins.join('; '));
  } else if (v.pattern !== 'Resection margin only (viable / clear)'
    && v.proximalMargin !== 'Not applicable'
    && v.distalMargin !== 'Not applicable') {
    clauses.push('resection margins viable');
  }

  if (v.cmvIhc === 'Positive (nuclear inclusions confirmed)' && v.pattern !== 'Infectious / pseudomembranous / CMV') {
    clauses.push('superimposed CMV infection');
  }

  return `(${part.label}) ${head} - ${clauses.join('; ')}`;
}

// ---------- validation checks ----------

export function validate(part) {
  const v = part.values;
  const out = [];
  const warn = (message, field) => out.push({ level: 'warn', message, ...(field ? { field } : {}) });
  const info = (message, field) => out.push({ level: 'info', message, ...(field ? { field } : {}) });

  if (v.proximalMargin === 'Ischaemic / non-viable' || v.distalMargin === 'Ischaemic / non-viable' || v.otherMargin === 'Ischaemic / non-viable') {
    warn('Ischaemic / non-viable resection margin recorded: consider urgent clinical communication regarding anastomotic viability.', 'proximalMargin');
  }
  if (v.pattern === 'Amyloidosis' && v.congoRed !== 'Positive with apple-green birefringence under polarised light') {
    warn('Amyloidosis selected without Congo red confirmation (apple-green birefringence under polarised light).', 'congoRed');
  }
  if (v.pattern === 'Inflammatory bowel disease (IBD)' && v.ibdSubtype === 'Ulcerative colitis'
    && ticked(v.ibdFeatures).includes('Non-necrotising epithelioid granulomas')) {
    warn('Non-necrotising epithelioid granulomas recorded on Ulcerative colitis: consider Crohn disease (unless mucin/crypt-rupture granulomas).', 'ibdSubtype');
  }
  if (v.pattern === 'Inflammatory bowel disease (IBD)' && ['Low-grade dysplasia', 'High-grade dysplasia'].includes(v.ibdDysplasia)) {
    info('IBD-associated dysplasia identified: consider double-reporting / GI MDT review and check resection margins for dysplasia.', 'ibdDysplasia');
  }
  if (v.neoplasia === 'Incidental invasive carcinoma (use Colorectal Ca synoptic)'
    || v.ibdDysplasia === 'Invasive adenocarcinoma (use Colorectal Ca synoptic)') {
    warn('Invasive adenocarcinoma present: use the Colon and rectum carcinoma resection synoptic template for full CAP/AJCC staging.', 'neoplasia');
  }
  if ((v.proximalMargin === 'Involved by Crohn disease (transmural inflammation / granulomas)'
    || v.distalMargin === 'Involved by Crohn disease (transmural inflammation / granulomas)')
    && v.pattern === 'Inflammatory bowel disease (IBD)') {
    info('Crohn disease involves a resection margin: histological margin involvement is recorded for postoperative surveillance.', 'proximalMargin');
  }
  return out;
}

export default { specimenName, macro, blockKey, microscopy, diagnosis, validate };
