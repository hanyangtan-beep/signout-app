// Heart explant — native diseased hearts (ICM, DCM, HCM, ACM/ARVC, amyloid, myocarditis, sarcoid)
// and failed cardiac allografts at re-transplant (ISHLT ACR, pAMR, cardiac allograft vasculopathy).

import { stripDot, letteredBlockKey, checks } from './_house.js';
import { renderDiagnosis } from '../src/synoptic.js';

const lettered = (part, ctx) => (ctx?.parts?.length || 1) > 1;
const cap1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const has = (arr, x) => Array.isArray(arr) && arr.includes(x);
const list = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const int = (x) => { const n = parseInt(String(x ?? '').trim(), 10); return Number.isFinite(n) && n > 0 ? n : null; };
const isAllograft = (v) => v.context === 'Failed cardiac allograft (re-transplant)';

export function specimenName(part) {
  return isAllograft(part.values) ? 'Failed cardiac allograft, explant (re-transplant)' : 'Native heart, explant (orthotopic heart transplant)';
}

export function macro(part, ctx) {
  if (ctx?.options && ctx.options.macro === false) return '';
  const v = part.values;
  const out = [];
  const noun = isAllograft(v) ? 'an explanted cardiac allograft' : 'an explanted native heart';
  const w = int(v.weight);
  out.push(`Received in formalin is ${noun}${w ? ` weighing ${w} g` : ''}.`);
  const walls = [
    int(v.lvWallMm) ? `left ventricular free wall ${int(v.lvWallMm)} mm` : '',
    int(v.septumMm) ? `interventricular septum ${int(v.septumMm)} mm` : '',
    int(v.rvWallMm) ? `right ventricular free wall ${int(v.rvWallMm)} mm` : ''
  ].filter(Boolean);
  if (walls.length) out.push(`Wall thicknesses measure: ${walls.join(', ')}.`);
  if (v.chambers) out.push(`Short-axis biventricular sections show ${v.chambers.toLowerCase()}.`);
  if (v.coronaries) out.push(`Epicardial coronary arteries show: ${v.coronaries.toLowerCase()}.`);
  if (v.lvadSite && v.lvadSite !== 'None') out.push(`Mechanical support site: ${v.lvadSite.toLowerCase()}.`);
  const b = int(v.blocks);
  if (b) out.push(`Representative sections are submitted in ${b} block${b === 1 ? '' : 's'}.`);
  const notes = stripDot(v.macroNotes);
  if (notes) out.push(`${cap1(notes)}.`);
  return `(${part.label}) ${out.join(' ')}`;
}

export const blockKey = (part, ctx) => letteredBlockKey(part, ctx, { lettered, strip: stripDot });

const NATIVE_PROSE = {
  'Ischaemic cardiomyopathy': 'Sections show extensive regional healed and/or organising myocardial infarction replaced by dense collagenous scar, with compensatory hypertrophy of surviving myocytes and severe coronary atherosclerosis.',
  'Dilated cardiomyopathy (DCM)': 'Sections show diffuse myocyte hypertrophy with enlarged hyperchromatic nuclei, myocyte attenuation and patchy interstitial and replacement fibrosis, without significant inflammatory infiltrate, amyloid or storage material.',
  'Hypertrophic cardiomyopathy (HCM)': 'Sections show marked myocyte hypertrophy, widespread myofibre disarray (>10% of the sampled myocardium), interstitial and replacement fibrosis, and intramural small-vessel dysplasia.',
  'Arrhythmogenic cardiomyopathy (ACM / ARVC)': 'Sections show extensive transmural fibrofatty replacement of the right (and/or left) ventricular myocardium extending from epicardium towards endocardium, with entrapped islands of degenerating myocytes.',
  'Cardiac amyloidosis (restrictive cardiomyopathy)': 'Sections show extensive interstitial, pericellular and vascular deposition of amorphous eosinophilic amyloid surrounding atrophic cardiomyocytes.',
  'Restrictive cardiomyopathy (non-amyloid / storage / idiopathic)': 'Sections show interstitial fibrosis and myocyte hypertrophy consistent with restrictive cardiomyopathy.',
  'Giant cell myocarditis': 'Sections show a diffuse, destructive mixed inflammatory infiltrate comprising lymphocytes, macrophages, eosinophils and prominent multinucleated giant cells associated with extensive myocyte necrosis, without well-formed epithelioid granulomas.',
  'Lymphocytic myocarditis / inflammatory cardiomyopathy': 'Sections show multifocal interstitial T-lymphocytic inflammation associated with myocyte necrosis and interstitial fibrosis.',
  'Cardiac sarcoidosis': 'Sections show well-formed non-necrotising epithelioid granulomas with multinucleated giant cells and extensive surrounding myocardial fibrosis.',
  'End-stage valvular / congenital heart disease': 'Sections show marked myocyte hypertrophy and interstitial/replacement fibrosis secondary to chronic pressure/volume overload.'
};

const ALLOGRAFT_PROSE = {
  'Cardiac allograft vasculopathy (CAV)': 'Sections of the explanted cardiac allograft show diffuse, concentric fibrointimal hyperplasia of the epicardial and intramyocardial coronary arteries with luminal narrowing and secondary ischaemic myocardial fibrosis.',
  'Acute cellular rejection (ISHLT)': 'Sections of the explanted cardiac allograft show multifocal to diffuse interstitial lymphocytic inflammation with myocyte damage.',
  'Antibody-mediated rejection (ISHLT pAMR)': 'Sections of the explanted cardiac allograft show microvascular endothelial swelling, intravascular macrophage accumulation and interstitial oedema/haemorrhage.',
  'Mixed cellular and antibody-mediated rejection with CAV': 'Sections of the explanted cardiac allograft show combined cellular and antibody-mediated rejection accompanied by concentric cardiac allograft vasculopathy and ischaemic myocardial scarring.',
  'Primary graft dysfunction / ischaemic infarction': 'Sections of the explanted cardiac allograft show widespread acute and subacute coagulative myocardial necrosis with contraction band necrosis and haemorrhage.'
};

export function microscopy(part) {
  const v = part.values;
  const out = [];
  const dx = isAllograft(v) ? v.allograftDx : v.nativeDx;
  if (dx === 'Other (specify)') {
    const custom = stripDot(v.dxOther);
    out.push(custom ? `Sections show myocardium with features of ${custom.toLowerCase()}.` : 'Sections show explanted myocardium.');
  } else {
    out.push((isAllograft(v) ? ALLOGRAFT_PROSE[dx] : NATIVE_PROSE[dx]) || 'Sections show explanted myocardium.');
  }

  if (Array.isArray(v.myocardialFeatures) && v.myocardialFeatures.length) {
    out.push(`Additional findings include ${list(v.myocardialFeatures.map((x) => x.toLowerCase()))}.`);
  }

  if (isAllograft(v)) {
    out.push(`ISHLT acute cellular rejection: ${v.ishltAcr}. ISHLT antibody-mediated rejection: ${v.ishltPamr}.`);
    if (v.cavGrade && v.cavGrade !== 'Absent') out.push(`Cardiac allograft vasculopathy: ${v.cavGrade.toLowerCase()}.`);
    if (v.c4dHeart && v.c4dHeart !== 'Not performed') out.push(`Capillary C4d/CD68 staining: ${v.c4dHeart.toLowerCase()}.`);
  }

  if (v.congoRed && v.congoRed !== 'Not performed') {
    const extra = v.congoRed.startsWith('Positive') && v.amyloidType ? ` (subtype: ${v.amyloidType})` : '';
    out.push(`Congo red stain is ${v.congoRed.toLowerCase()}${extra}.`);
  }

  if (Array.isArray(v.specialStains) && v.specialStains.length) {
    out.push(`Special stains and immunohistochemistry performed include ${list(v.specialStains)}.`);
  }

  const notes = stripDot(v.morphNotes);
  if (notes) out.push(`${cap1(notes)}.`);
  return `(${part.label}) ${out.join(' ')}`;
}

export function diagnosis(part) {
  const v = part.values;
  const head = isAllograft(v)
    ? `(${part.label}) CARDIAC ALLOGRAFT, explant (re-transplant)`
    : `(${part.label}) NATIVE HEART, explant`;
  const dx = isAllograft(v) ? v.allograftDx : v.nativeDx;
  const main = dx === 'Other (specify)' ? (stripDot(v.dxOther).toUpperCase() || 'CARDIOMYOPATHY (see description)') : dx.toUpperCase();
  const lines = [main];
  if (isAllograft(v)) {
    lines.push(`ISHLT ACR: ${v.ishltAcr}; ISHLT pAMR: ${v.ishltPamr}`);
    if (v.cavGrade && v.cavGrade !== 'Absent') lines.push(`Cardiac allograft vasculopathy: ${v.cavGrade}`);
  } else if (v.congoRed?.startsWith('Positive')) {
    lines.push(`Congo red positive amyloid (${v.amyloidType || 'typing pending'})`);
  }
  return renderDiagnosis(head, lines);
}

export function flags(parts) {
  const out = [];
  for (const p of parts || []) {
    const v = p.values || {};
    if (isAllograft(v)) out.push('allograft');
    else {
      if (['Hypertrophic cardiomyopathy (HCM)', 'Arrhythmogenic cardiomyopathy (ACM / ARVC)', 'Dilated cardiomyopathy (DCM)'].includes(v.nativeDx)) out.push('genetic');
      if (v.nativeDx === 'Cardiac amyloidosis (restrictive cardiomyopathy)' || v.congoRed?.startsWith('Positive')) out.push('amyloid');
    }
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
    if (v.nativeDx === 'Cardiac amyloidosis (restrictive cardiomyopathy)' && !v.congoRed?.startsWith('Positive')) {
      warn('Cardiac amyloidosis should be confirmed with Congo red stain showing apple-green birefringence.', 'congoRed');
    }
    if (v.nativeDx === 'Cardiac sarcoidosis' && !has(v.specialStains, 'Ziehl-Neelsen (ZN)') && !has(v.specialStains, 'Grocott (GMS)')) {
      info('Cardiac sarcoidosis: consider recording Ziehl-Neelsen and Grocott stains to exclude mycobacterial and fungal granulomas.', 'specialStains');
    }
  } else {
    if (/Antibody-mediated|Mixed/i.test(v.allograftDx) && v.c4dHeart === 'Not performed') {
      warn('Cardiac antibody-mediated rejection: record capillary C4d and CD68 immunohistochemistry.', 'c4dHeart');
    }
  }

  return out;
}

export default { specimenName, macro, blockKey, microscopy, diagnosis, flags, validate };
