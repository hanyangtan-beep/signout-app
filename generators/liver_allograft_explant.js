// Liver allograft explant — failed liver graft at re-transplant (Banff acute/chronic TCMR, AMR,
// ductopenia, foam cell arteriopathy, hepatic artery thrombosis / ischaemic cholangiopathy, recurrent disease).

import { stripDot, letteredBlockKey, checks } from './_house.js';
import { renderDiagnosis } from '../src/synoptic.js';

const lettered = (part, ctx) => (ctx?.parts?.length || 1) > 1;
const cap1 = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const has = (arr, x) => Array.isArray(arr) && arr.includes(x);
const list = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const int = (x) => { const n = parseInt(String(x ?? '').trim(), 10); return Number.isFinite(n) && n >= 0 ? n : null; };
const withCm = (s) => (/\b(cm|mm)\b/i.test(s) ? s : `${s} cm`);

export function specimenName() {
  return 'Failed liver allograft, explant (re-transplant hepatectomy)';
}

export function macro(part, ctx) {
  if (ctx?.options && ctx.options.macro === false) return '';
  const v = part.values;
  const out = [];
  const w = int(v.weight);
  const dim = stripDot(v.dimensions);
  const measures = [w ? `weighing ${w} g` : '', dim ? `measuring ${withCm(dim)}` : ''].filter(Boolean).join(' and ');
  out.push(`Received in formalin is a failed liver allograft explant${measures ? ` ${measures}` : ''}.`);
  if (v.vessels) out.push(`Hilar vessels show: ${v.vessels.toLowerCase()}.`);
  if (v.biliaryTree && v.biliaryTree !== 'Unremarkable') out.push(`The biliary tree shows ${v.biliaryTree.toLowerCase()}.`);
  if (v.cutSurface) out.push(`The hepatic parenchyma is ${v.cutSurface.toLowerCase()}.`);
  const b = int(v.blocks);
  if (b) out.push(`Representative sections are submitted in ${b} block${b === 1 ? '' : 's'}.`);
  const notes = stripDot(v.macroNotes);
  if (notes) out.push(`${cap1(notes)}.`);
  return `(${part.label}) ${out.join(' ')}`;
}

export const blockKey = (part, ctx) => letteredBlockKey(part, ctx, { lettered, strip: stripDot });

const DX_PROSE = {
  'Chronic (ductopenic) allograft rejection': 'Sections of the explanted liver allograft show chronic (ductopenic) rejection characterised by widespread bile duct senescence and loss, canalicular cholestasis, perivenular hepatocyte dropout/fibrosis and obliterative arteriopathy.',
  'Acute / late-onset T-cell-mediated rejection (TCMR)': 'Sections of the explanted liver allograft show T-cell-mediated rejection with mixed portal inflammatory infiltrates, lymphocytic bile duct damage and portal/central venous endotheliitis.',
  'Antibody-mediated rejection (acute or chronic AMR)': 'Sections of the explanted liver allograft show antibody-mediated rejection with portal microvascular endothelial hypertrophy, dilated portal capillaries, microvasculitis and periportal oedema.',
  'Hepatic artery thrombosis / ischaemic cholangiopathy': 'Sections of the explanted liver allograft show severe ischaemic cholangiopathy with extensive biliary epithelial necrosis/sloughing, bile casts and geographic parenchymal infarction secondary to hepatic artery thrombosis.',
  'Biliary anastomotic stricture / chronic biliary obstruction': 'Sections of the explanted liver allograft show features of chronic large-duct biliary obstruction with portal oedema, prominent ductular reaction, cholestasis and biliary fibrosis/cirrhosis.',
  'Portal vein thrombosis / venous outflow obstruction': 'Sections of the explanted liver allograft show severe vascular compromise with zonal congestion, sinusoidal dilatation, hepatocyte atrophy/necrosis and vascular thrombosis.',
  'Primary non-function / severe ischaemia-reperfusion injury': 'Sections of the explanted liver allograft show extensive confluent and zonal coagulative hepatocyte necrosis with marked cholestasis and neutrophilic inflammation in keeping with severe ischaemia-reperfusion injury / primary non-function.',
  'Recurrent primary liver disease': 'Sections of the explanted liver allograft show advanced recurrent primary liver disease.',
  'Post-transplant lymphoproliferative disorder (PTLD)': 'Sections of the explanted liver allograft show an atypical lymphoid proliferation in keeping with post-transplant lymphoproliferative disorder (PTLD).'
};

export function raiTotal(v) {
  const p = int(v.raiPortal) ?? 0;
  const b = int(v.raiBileDuct) ?? 0;
  const ven = int(v.raiVenous) ?? 0;
  return { p, b, ven, total: p + b + ven };
}

export function microscopy(part) {
  const v = part.values;
  const out = [];
  if (v.dx === 'Other (specify)') {
    const custom = stripDot(v.dxOther);
    out.push(custom ? `Sections of the explanted liver allograft show features of ${custom.toLowerCase()}.` : 'Sections show explanted liver allograft parenchyma.');
  } else {
    out.push(DX_PROSE[v.dx] || 'Sections show explanted liver allograft parenchyma.');
  }

  const rai = raiTotal(v);
  if (rai.total > 0 || v.dx === 'Acute / late-onset T-cell-mediated rejection (TCMR)') {
    out.push(`Banff rejection activity index (RAI): ${rai.total}/9 (portal inflammation ${rai.p}/3, bile duct damage ${rai.b}/3, venous endotheliitis ${rai.ven}/3).`);
  }

  if (v.ductLoss && v.ductLoss !== 'None') out.push(`Bile duct assessment: ${v.ductLoss.toLowerCase()}.`);
  if (v.arteriopathy && v.arteriopathy !== 'Absent') out.push(`Vascular assessment: ${v.arteriopathy.toLowerCase()}.`);
  if (v.fibrosis) out.push(`Background fibrosis: ${v.fibrosis.toLowerCase()}.`);
  if (v.recurrentDisease && v.recurrentDisease !== 'None') out.push(`Features of ${v.recurrentDisease.toLowerCase()} are present.`);
  if (v.c4dLiver && v.c4dLiver !== 'Not performed') out.push(`Immunohistochemistry for C4d is ${v.c4dLiver.toLowerCase()}.`);
  if (Array.isArray(v.viralStains) && v.viralStains.length) out.push(`Ancillary stains performed include ${list(v.viralStains)}.`);

  const notes = stripDot(v.morphNotes);
  if (notes) out.push(`${cap1(notes)}.`);
  return `(${part.label}) ${out.join(' ')}`;
}

export function diagnosis(part) {
  const v = part.values;
  const head = `(${part.label}) LIVER ALLOGRAFT, explant (re-transplant hepatectomy)`;
  const main = v.dx === 'Other (specify)' ? (stripDot(v.dxOther).toUpperCase() || 'FAILED LIVER ALLOGRAFT (see description)') : v.dx.toUpperCase();
  const lines = [main];
  const rai = raiTotal(v);
  if (rai.total > 0) lines.push(`Banff RAI: ${rai.total}/9 (portal ${rai.p}, bile duct ${rai.b}, venous ${rai.ven})`);
  if (v.ductLoss && v.ductLoss !== 'None') lines.push(v.ductLoss);
  if (v.arteriopathy && v.arteriopathy !== 'Absent') lines.push(v.arteriopathy);
  if (v.recurrentDisease && v.recurrentDisease !== 'None') lines.push(v.recurrentDisease);
  return renderDiagnosis(head, lines);
}

export function flags(parts) {
  const out = [];
  for (const p of parts || []) {
    const v = p.values || {};
    if (v.dx === 'Antibody-mediated rejection (acute or chronic AMR)') out.push('amr');
    if (v.dx === 'Hepatic artery thrombosis / ischaemic cholangiopathy') out.push('hat');
  }
  return [...new Set(out)];
}

export function validate(part) {
  const v = part.values;
  const { out, at, err, warn } = checks();
  const info = (m, f) => at('info', m, f);

  if (v.dx === 'Other (specify)' && !stripDot(v.dxOther)) err('Specify the diagnosis.', 'dxOther');

  if (v.dx === 'Chronic (ductopenic) allograft rejection') {
    if (v.ductLoss === 'None') warn('Chronic ductopenic rejection: record the extent of bile duct loss (<50% early vs >=50% late).', 'ductLoss');
    if (!has(v.viralStains, 'CK7 / CK19 (duct loss)')) info('CK7/CK19 immunohistochemistry is helpful to confirm interlobular bile duct loss.', 'viralStains');
  }

  if (v.dx === 'Antibody-mediated rejection (acute or chronic AMR)' && v.c4dLiver === 'Not performed') {
    warn('Banff liver AMR diagnosis requires C4d immunohistochemistry on portal microvasculature/sinusoids.', 'c4dLiver');
  }

  if (v.dx === 'Acute / late-onset T-cell-mediated rejection (TCMR)' && raiTotal(v).total === 0) {
    warn('Acute TCMR selected with Banff RAI total 0/9; record portal, bile duct and venous scores.', 'raiPortal');
  }

  return out;
}

export default { specimenName, macro, blockKey, microscopy, diagnosis, flags, validate };
