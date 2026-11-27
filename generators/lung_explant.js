// Lung explant — native diseased lungs (UIP/IPF, NSIP, fibrotic HP, LAM, PLCH, emphysema, CF, PAH)
// and failed lung allografts at re-transplant (ISHLT CLAD BOS / RAS, ACR A/B, AMR).

import { stripDot, letteredBlockKey, checks } from './_house.js';
import { renderDiagnosis } from '../src/synoptic.js';

const lettered = (part, ctx) => (ctx?.parts?.length || 1) > 1;
const cap1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const has = (arr, x) => Array.isArray(arr) && arr.includes(x);
const list = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const int = (x) => { const n = parseInt(String(x ?? '').trim(), 10); return Number.isFinite(n) && n > 0 ? n : null; };
const withCm = (s) => (/\b(cm|mm)\b/i.test(s) ? s : `${s} cm`);
const isAllograft = (v) => v.context === 'Failed lung allograft (re-transplant)';

export function specimenName(part) {
  const v = part.values;
  const side = v.side ? `${v.side.toLowerCase()}, ` : '';
  return isAllograft(v) ? `Lung allograft, ${side}explant (re-transplant)` : `Native lung, ${side}explant`;
}

export function macro(part, ctx) {
  if (ctx?.options && ctx.options.macro === false) return '';
  const v = part.values;
  const out = [];
  const side = v.side ? `${v.side.toLowerCase()} ` : '';
  const noun = isAllograft(v) ? `an explanted ${side}lung allograft` : `an explanted ${side}native lung`;
  const w = int(v.weight);
  const dim = stripDot(v.dimensions);
  const measures = [w ? `weighing ${w} g` : '', dim ? `measuring ${withCm(dim)}` : ''].filter(Boolean).join(' and ');
  out.push(`Received in formalin is ${noun}${measures ? ` ${measures}` : ''}.`);
  if (v.pleura) out.push(`The visceral pleura shows ${v.pleura.toLowerCase()}.`);
  if (v.cutSurface) out.push(`Cut sections show ${v.cutSurface.toLowerCase()}.`);
  if (v.hilarNodes && v.hilarNodes !== 'None identified') out.push(`Hilar lymph nodes are ${v.hilarNodes.toLowerCase()}.`);
  const b = int(v.blocks);
  if (b) out.push(`Representative sections are submitted in ${b} block${b === 1 ? '' : 's'}.`);
  const notes = stripDot(v.macroNotes);
  if (notes) out.push(`${cap1(notes)}.`);
  return `(${part.label}) ${out.join(' ')}`;
}

export const blockKey = (part, ctx) => letteredBlockKey(part, ctx, { lettered, strip: stripDot });

const NATIVE_PROSE = {
  'Usual interstitial pneumonia (UIP / IPF)': 'Sections show a usual interstitial pneumonia (UIP) pattern characterised by spatially and temporally heterogeneous subpleural and paraseptal dense collagenous fibrosis, microscopic honeycombing lined by respiratory epithelium and scattered fibroblastic foci at the leading edge of fibrosis.',
  'Fibrotic non-specific interstitial pneumonia (NSIP)': 'Sections show temporally uniform, diffuse interstitial collagenous fibrosis and mild chronic inflammation with relative preservation of alveolar architecture and minimal honeycombing.',
  'Fibrotic hypersensitivity pneumonitis': 'Sections show airway-centred chronic interstitial fibrosis with bridging fibrosis, peribronchiolar metaplasia and poorly formed non-necrotising interstitial granulomas.',
  'Lymphangioleiomyomatosis (LAM)': 'Sections show diffuse, variably sized thin-walled parenchymal cysts throughout the lung parenchyma, bordered by nodular and fascicular proliferations of bland spindle-to-epithelioid smooth muscle-like (LAM) cells with pale eosinophilic cytoplasm, accompanied by focal haemosiderin-laden macrophages.',
  'Pulmonary Langerhans cell histiocytosis (PLCH)': 'Sections show bronchiolocentric stellate fibrotic nodules and irregular cystic spaces containing clusters of Langerhans cells with grooved nuclei and admixed eosinophils, with background respiratory bronchiolitis.',
  'Severe emphysema / COPD': 'Sections show marked, diffuse destruction of alveolar septa with enlargement of distal airspaces and bullous change, accompanied by chronic small-airway remodelling.',
  'Cystic fibrosis / severe bronchiectasis': 'Sections show severe, widespread cylindrical and saccular bronchiectasis with thickened, chronically inflamed airway walls, squamous metaplasia, inspissated mucopurulent plugs and peribronchial fibrosis.',
  'Pulmonary arterial hypertension (plexogenic arteriopathy)': 'Sections show severe pulmonary arterial hypertensive vasculopathy with medial hypertrophy, concentric laminar intimal fibrosis and plexiform and dilatation lesions involving muscular pulmonary arteries.',
  'Pulmonary sarcoidosis': 'Sections show extensive lymphangitic non-necrotising epithelioid granulomas with multinucleated giant cells and advanced confluent parenchymal fibrosis.',
  'Connective tissue disease-associated ILD (CTD-ILD)': 'Sections show fibrotic interstitial lung disease accompanied by prominent lymphoid aggregates with germinal centres, plasmacytic inflammation and chronic fibrous pleuritis.'
};

const ALLOGRAFT_PROSE = {
  'Chronic lung allograft dysfunction — bronchiolitis obliterans syndrome (CLAD-BOS)': 'Sections of the explanted lung allograft show widespread constrictive/obliterative bronchiolitis with concentric subepithelial collagenous fibrosis markedly narrowing or completely obliterating membranous and respiratory bronchioles, with relative sparing of the distal alveolar parenchyma.',
  'Chronic lung allograft dysfunction — restrictive allograft syndrome (CLAD-RAS)': 'Sections of the explanted lung allograft show extensive subpleural and upper-lobe predominant pleuroparenchymal fibroelastosis (PPFE) and intra-alveolar fibroelastosis.',
  'Mixed CLAD (obliterative bronchiolitis and pleuroparenchymal fibroelastosis)': 'Sections of the explanted lung allograft show combined features of chronic lung allograft dysfunction, including widespread obliterative bronchiolitis (BOS) and extensive pleuroparenchymal fibroelastosis (RAS).',
  'Acute cellular rejection (ISHLT)': 'Sections of the explanted lung allograft show perivascular and interstitial mononuclear lymphocytic infiltrates with endothelialitis and airway inflammation.',
  'Antibody-mediated rejection (AMR)': 'Sections of the explanted lung allograft show neutrophilic capillaritis, microvascular fibrin thrombi and acute lung injury.',
  'Primary graft dysfunction / diffuse alveolar damage': 'Sections of the explanted lung allograft show extensive acute and organising diffuse alveolar damage with hyaline membranes and interstitial oedema.'
};

export function microscopy(part) {
  const v = part.values;
  const out = [];
  const dx = isAllograft(v) ? v.allograftDx : v.nativeDx;
  if (dx === 'Other (specify)') {
    const custom = stripDot(v.dxOther);
    out.push(custom ? `Sections show lung parenchyma with features of ${custom.toLowerCase()}.` : 'Sections show explanted lung parenchyma.');
  } else {
    out.push((isAllograft(v) ? ALLOGRAFT_PROSE[dx] : NATIVE_PROSE[dx]) || 'Sections show explanted lung parenchyma.');
  }

  if (Array.isArray(v.lungFeatures) && v.lungFeatures.length) {
    out.push(`Additional histological features include ${list(v.lungFeatures.map((x) => x.toLowerCase()))}.`);
  }

  if (isAllograft(v)) {
    out.push(`ISHLT acute cellular rejection: ${v.ishltA}; airway inflammation: ${v.ishltB}.`);
    if (v.c4dLung && v.c4dLung !== 'Not performed') out.push(`Capillary C4d immunohistochemistry is ${v.c4dLung.toLowerCase()}.`);
  }

  if (Array.isArray(v.ihcStains) && v.ihcStains.length) {
    out.push(`Immunohistochemistry and special stains performed include ${list(v.ihcStains)}.`);
  }

  if (v.incidentalTumour && v.incidentalTumour !== 'None identified') {
    out.push(`Incidental finding: ${v.incidentalTumour}.`);
  } else {
    out.push('No malignancy is identified.');
  }

  const notes = stripDot(v.morphNotes);
  if (notes) out.push(`${cap1(notes)}.`);
  return `(${part.label}) ${out.join(' ')}`;
}

export function diagnosis(part) {
  const v = part.values;
  const side = v.side ? `${v.side.toLowerCase()}, ` : '';
  const head = isAllograft(v)
    ? `(${part.label}) LUNG ALLOGRAFT, ${side}explant (re-transplant)`
    : `(${part.label}) NATIVE LUNG, ${side}explant`;
  const dx = isAllograft(v) ? v.allograftDx : v.nativeDx;
  const main = dx === 'Other (specify)' ? (stripDot(v.dxOther).toUpperCase() || 'END-STAGE LUNG DISEASE (see description)') : dx.toUpperCase();
  const lines = [main];
  if (isAllograft(v)) lines.push(`ISHLT grade: ${v.ishltA}; ${v.ishltB}`);
  if (v.incidentalTumour && v.incidentalTumour !== 'None identified') lines.push(`Incidental finding: ${v.incidentalTumour}`);
  else lines.push('No malignancy identified');
  return renderDiagnosis(head, lines);
}

export function flags(parts) {
  const out = [];
  for (const p of parts || []) {
    const v = p.values || {};
    if (!isAllograft(v) && v.nativeDx === 'Lymphangioleiomyomatosis (LAM)') out.push('lam');
    if (isAllograft(v)) out.push('allograft');
    if (v.incidentalTumour && /carcinoma/i.test(v.incidentalTumour)) out.push('incidentalCa');
  }
  return [...new Set(out)];
}

export function validate(part) {
  const v = part.values;
  const { out, at, err, warn } = checks();
  const info = (m, f) => at('info', m, f);
  const dx = isAllograft(v) ? v.allograftDx : v.nativeDx;

  if (dx === 'Other (specify)' && !stripDot(v.dxOther)) err('Specify the diagnosis.', 'dxOther');

  if (!isAllograft(v)) {
    if (v.nativeDx === 'Lymphangioleiomyomatosis (LAM)' && !['HMB-45', 'SMA', 'Cathepsin K'].some((m) => has(v.ihcStains, m))) {
      warn('Lymphangioleiomyomatosis (LAM) should be confirmed with HMB-45, SMA and/or Cathepsin K immunohistochemistry.', 'ihcStains');
    }
    if (v.nativeDx === 'Pulmonary Langerhans cell histiocytosis (PLCH)' && !has(v.ihcStains, 'CD1a') && !has(v.ihcStains, 'Langerin (CD207)')) {
      info('Consider confirming PLCH with CD1a and/or Langerin (CD207) immunohistochemistry.', 'ihcStains');
    }
  } else if (v.allograftDx === 'Antibody-mediated rejection (AMR)' && v.c4dLung === 'Not performed') {
    warn('Lung antibody-mediated rejection: record alveolar capillary C4d immunohistochemistry.', 'c4dLung');
  }

  if (v.incidentalTumour && /carcinoma/i.test(v.incidentalTumour)) {
    warn('Incidental lung carcinoma identified: add the Lung carcinoma resection synoptic template for formal pTNM staging.', 'incidentalTumour');
  }

  return out;
}

export default { specimenName, macro, blockKey, microscopy, diagnosis, flags, validate };
