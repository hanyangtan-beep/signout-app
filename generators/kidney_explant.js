// Kidney explant — native diseased kidneys (ADPKD/ARPKD, acquired cystic disease, XGP, end-stage
// medical kidney) and failed renal allograft nephrectomies (Banff 2022 rejection, BKV, CNI, thrombosis).

import { stripDot, letteredBlockKey, checks } from './_house.js';
import { renderDiagnosis } from '../src/synoptic.js';

const lettered = (part, ctx) => (ctx?.parts?.length || 1) > 1;
const cap1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const list = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const int = (x) => { const n = parseInt(String(x ?? '').trim(), 10); return Number.isFinite(n) && n > 0 ? n : null; };
const withCm = (s) => (/\b(cm|mm)\b/i.test(s) ? s : `${s} cm`);

const isAllograft = (v) => v.context === 'Failed renal allograft';

export function specimenName(part) {
  const v = part.values;
  const side = v.side && v.side !== 'Not specified' ? `${v.side.toLowerCase()}, ` : '';
  return isAllograft(v) ? `Renal allograft, ${side}transplant nephrectomy` : `Native kidney, ${side}nephrectomy`;
}

export function macro(part, ctx) {
  if (ctx?.options && ctx.options.macro === false) return '';
  const v = part.values;
  const out = [];
  const noun = isAllograft(v) ? 'a failed renal allograft nephrectomy specimen' : 'a native nephrectomy specimen';
  const w = int(v.weight);
  const dim = stripDot(v.dimensions);
  const measures = [w ? `weighing ${w} g` : '', dim ? `measuring ${withCm(dim)}` : ''].filter(Boolean).join(' and ');
  out.push(`Received in formalin is ${noun}${measures ? ` ${measures}` : ''}.`);
  if (v.cutSurface) out.push(`On sectioning, the parenchyma shows ${v.cutSurface.toLowerCase()}.`);
  const cyst = stripDot(v.maxCystCm);
  if (cyst) out.push(`The largest cyst measures ${withCm(cyst)} in diameter.`);
  if (v.vessels && v.vessels !== 'Not identified / fragmented') out.push(`Hilar vessels show: ${v.vessels.toLowerCase()}.`);
  const b = int(v.blocks);
  if (b) out.push(`Representative sections are submitted in ${b} block${b === 1 ? '' : 's'}.`);
  const notes = stripDot(v.macroNotes);
  if (notes) out.push(`${cap1(notes)}.`);
  return `(${part.label}) ${out.join(' ')}`;
}

export const blockKey = (part, ctx) => letteredBlockKey(part, ctx, { lettered, strip: stripDot });

const NATIVE_PROSE = {
  'Autosomal dominant polycystic kidney disease (ADPKD)': 'Sections show renal parenchyma extensively replaced by numerous cysts of variable size lined by flattened to cuboidal epithelium, separated by compressed, fibrotic renal parenchyma with marked nephron loss.',
  'Autosomal recessive polycystic kidney disease (ARPKD)': 'Sections show radially oriented fusiform dilatation of collecting ducts extending from medulla to cortex, lined by uniform cuboidal epithelium.',
  'Acquired cystic kidney disease': 'Sections show end-stage contracted renal parenchyma containing multiple cortical and medullary cysts lined by flattened, cuboidal and focally eosinophilic/atypical epithelium.',
  'End-stage renal disease (diabetic nephropathy)': 'Sections show advanced diabetic nephropathy with diffuse and nodular (Kimmelstiel-Wilson) mesangial expansion, extensive global glomerulosclerosis, arteriolar hyalinosis and advanced interstitial fibrosis and tubular atrophy.',
  'End-stage renal disease (hypertensive nephrosclerosis)': 'Sections show advanced arterionephrosclerosis with severe fibrointimal thickening of arcuate and interlobular arteries, arteriolar hyalinosis, ischaemic glomerular collapse/sclerosis and advanced interstitial fibrosis and tubular atrophy.',
  'End-stage renal disease (chronic glomerulonephritis, NOS)': 'Sections show end-stage renal parenchyma with extensive global glomerulosclerosis, severe tubular atrophy and interstitial fibrosis, precluding definitive subtyping of the underlying glomerulopathy.',
  'Chronic pyelonephritis / reflux nephropathy': 'Sections show broad corticomedullary scars with dense chronic interstitial inflammation, thyroidisation of atrophic tubules, periglomerular fibrosis and pelvicalyceal chronic inflammation.',
  'Xanthogranulomatous pyelonephritis': 'Sections show destructive chronic inflammation replacing the renal parenchyma, composed of sheets of lipid-laden foamy macrophages, lymphocytes, plasma cells, neutrophils and multinucleated giant cells.',
  'End-stage obstructive nephropathy / hydronephrosis': 'Sections show marked pelvicalyceal dilatation with severe cortical thinning, diffuse tubular atrophy, interstitial fibrosis and glomerulosclerosis.'
};

const ALLOGRAFT_PROSE = {
  'Chronic active T-cell-mediated rejection': 'Sections of the failed renal allograft show chronic active T-cell-mediated rejection with interstitial mononuclear inflammation (including within areas of IFTA), tubulitis and chronic allograft arteriopathy characterised by concentric fibrointimal thickening with subendothelial mononuclear inflammation.',
  'Active T-cell-mediated rejection': 'Sections of the failed renal allograft show active T-cell-mediated rejection with dense interstitial mononuclear inflammation, lymphocytic tubulitis and/or intimal arteritis.',
  'Chronic active antibody-mediated rejection': 'Sections of the failed renal allograft show chronic active antibody-mediated rejection with microvascular inflammation (glomerulitis and peritubular capillaritis) and transplant glomerulopathy with glomerular basement membrane double contours.',
  'Active antibody-mediated rejection': 'Sections of the failed renal allograft show active antibody-mediated rejection with microvascular inflammation (glomerulitis and peritubular capillaritis), endothelial swelling and fibrin thrombi.',
  'Mixed T-cell-mediated and antibody-mediated rejection': 'Sections of the failed renal allograft show features of both T-cell-mediated rejection (interstitial inflammation, tubulitis and/or arteritis) and antibody-mediated rejection (microvascular inflammation and/or transplant glomerulopathy).',
  'Severe chronic allograft nephropathy / IFTA': 'Sections of the failed renal allograft show severe interstitial fibrosis and tubular atrophy (IFTA), extensive global glomerulosclerosis and advanced vascular sclerosis without significant active rejection.',
  'BK polyomavirus nephropathy': 'Sections of the failed renal allograft show tubulointerstitial nephritis with enlarged tubular epithelial nuclei containing basophilic ground-glass intranuclear viral inclusions.',
  'Calcineurin inhibitor nephrotoxicity': 'Sections of the failed renal allograft show striped interstitial fibrosis and tubular atrophy accompanied by prominent nodular arteriolar hyalinosis and isometric tubular vacuolisation.',
  'Allograft vascular thrombosis with infarction': 'Sections of the failed renal allograft show extensive coagulative cortical and medullary infarction secondary to renal vascular thrombosis.',
  'Recurrent primary glomerular disease': 'Sections of the failed renal allograft show features of recurrent primary glomerular disease superimposed on chronic parenchymal scarring.',
  'Post-transplant lymphoproliferative disorder (PTLD)': 'Sections of the failed renal allograft show a destructive lymphoid proliferation in keeping with post-transplant lymphoproliferative disorder (PTLD).'
};

export function microscopy(part) {
  const v = part.values;
  const out = [];
  const dx = isAllograft(v) ? v.allograftDx : v.nativeDx;
  if (dx === 'Other (specify)') {
    const custom = stripDot(v.dxOther);
    out.push(custom ? `Sections show renal parenchyma with features of ${custom.toLowerCase()}.` : 'Sections show renal parenchyma.');
  } else {
    out.push((isAllograft(v) ? ALLOGRAFT_PROSE[dx] : NATIVE_PROSE[dx]) || 'Sections show end-stage renal parenchyma.');
  }

  if (isAllograft(v) && Array.isArray(v.banffFeatures) && v.banffFeatures.length) {
    out.push(`Additional Banff features noted include ${list(v.banffFeatures.map((x) => x.toLowerCase()))}.`);
  }

  if (Array.isArray(v.parenchymalFeatures) && v.parenchymalFeatures.length) {
    out.push(`Background parenchymal findings include ${list(v.parenchymalFeatures.map((x) => x.toLowerCase()))}.`);
  }

  if (isAllograft(v)) {
    if (v.c4d && v.c4d !== 'Not performed') out.push(`Immunohistochemistry for C4d in peritubular capillaries is ${v.c4d.toLowerCase()}.`);
    if (v.sv40 && v.sv40 !== 'Not performed') out.push(`Immunohistochemistry for SV40 (BK polyomavirus) is ${v.sv40.toLowerCase()}.`);
  }

  if (v.incidentalTumour && v.incidentalTumour !== 'None identified') {
    out.push(`Incidental neoplasm: ${v.incidentalTumour}.`);
  } else {
    out.push('No renal cell carcinoma or other malignancy is identified.');
  }

  const notes = stripDot(v.morphNotes);
  if (notes) out.push(`${cap1(notes)}.`);
  return `(${part.label}) ${out.join(' ')}`;
}

export function diagnosis(part) {
  const v = part.values;
  const side = v.side && v.side !== 'Not specified' ? `${v.side.toLowerCase()}, ` : '';
  const head = isAllograft(v) ? `(${part.label}) RENAL ALLOGRAFT, ${side}transplant nephrectomy` : `(${part.label}) NATIVE KIDNEY, ${side}nephrectomy`;
  const dx = isAllograft(v) ? v.allograftDx : v.nativeDx;
  const main = dx === 'Other (specify)' ? (stripDot(v.dxOther).toUpperCase() || 'END-STAGE RENAL PARENCHYMA (see description)') : dx.toUpperCase();
  const lines = [main];
  if (isAllograft(v) && v.c4d && v.c4d !== 'Not performed') lines.push(`Peritubular capillary C4d: ${v.c4d}`);
  if (v.incidentalTumour && v.incidentalTumour !== 'None identified') lines.push(`Incidental neoplasm: ${v.incidentalTumour}`);
  else lines.push('No malignancy identified');
  return renderDiagnosis(head, lines);
}

export function flags(parts) {
  const out = [];
  for (const p of parts || []) {
    const v = p.values || {};
    if (!isAllograft(v) && v.nativeDx === 'Autosomal dominant polycystic kidney disease (ADPKD)' && v.incidentalTumour === 'None identified') out.push('adpkdNoMalignancy');
    if (isAllograft(v)) out.push('banffCorrelate');
    if (v.incidentalTumour && /RCC|Renal cell carcinoma/i.test(v.incidentalTumour)) out.push('incidentalRccSynoptic');
  }
  return [...new Set(out)];
}

export function validate(part) {
  const v = part.values;
  const { out, at, err, warn } = checks();
  const info = (m, f) => at('info', m, f);
  const dx = isAllograft(v) ? v.allograftDx : v.nativeDx;

  if (dx === 'Other (specify)' && !stripDot(v.dxOther)) err('Specify the diagnosis.', 'dxOther');

  if (isAllograft(v)) {
    if (/antibody-mediated|Mixed/i.test(v.allograftDx) && v.c4d === 'Not performed') {
      warn('Antibody-mediated rejection (Banff 2022): record peritubular capillary C4d status.', 'c4d');
    }
    if (v.allograftDx === 'BK polyomavirus nephropathy' && v.sv40 !== 'Positive in tubular epithelial nuclei') {
      warn('BK polyomavirus nephropathy should be confirmed with SV40 immunohistochemistry.', 'sv40');
    }
  } else if (v.nativeDx === 'Acquired cystic kidney disease' && v.incidentalTumour === 'None identified') {
    info('Acquired cystic kidney disease carries a high risk of incidental ACD-RCC; ensure solid/haemorrhagic areas are thoroughly sampled.', 'incidentalTumour');
  }

  if (v.incidentalTumour && /RCC|Renal cell carcinoma/i.test(v.incidentalTumour)) {
    warn('Incidental renal cell carcinoma identified: add the Kidney carcinoma resection synoptic template for formal pTNM staging.', 'incidentalTumour');
  }

  return out;
}

export default { specimenName, macro, blockKey, microscopy, diagnosis, flags, validate };
