// Multi-part case reconciliation (Phase 1: deterministic lymph node aggregation & sync).
//
// Pure functions: collects structured `contribution()` records from satellite parts (e.g.
// `lymph_node`) and compares them against the primary cancer synoptic part(s) in the same case.
// Produces non-destructive reconciliation items with reversible field patches so the pathologist
// can sync satellite totals/stations into the primary synoptic in one click, and formats a
// concise summary for the Neon HIGH Staging audit prompt.

import { parseStations, side as lungSide } from './staging/lung.js';

const intOrNull = (v) => {
  if (v === '' || v === null || v === undefined) return null;
  const n = parseInt(String(v).trim(), 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

const numOrNull = (v) => {
  if (v === '' || v === null || v === undefined) return null;
  const n = parseFloat(String(v).trim());
  return Number.isFinite(n) && n >= 0 ? n : null;
};

const listLabels = (labels) => {
  const uniq = [...new Set(labels.filter(Boolean))];
  if (!uniq.length) return '';
  if (uniq.length === 1) return `Part ${uniq[0]}`;
  return `Parts ${uniq.slice(0, -1).join(', ')} & ${uniq[uniq.length - 1]}`;
};

const isCancerSynoptic = (schema, gen) => {
  if (!schema || !gen) return false;
  const kind = String(schema.kind || '').toLowerCase();
  return kind.includes('cancer') && typeof gen.synoptic === 'function';
};

// Extract an IASLC lung station code or named station from a lymph node part's site string.
const LUNG_NUM_RE = /(?:station\s*)?(?:level\s*)?\b(1[0-4]|[1-9])\s*([RL])?\b/i;
const LUNG_NAMED_RE = /\b(supraclavicular|scalene|subcarinal|hilar|interlobar|lobar|segmental|subsegmental|intrapulmonary|paratracheal|prevascular|retrotracheal|para-?aortic|aorto-?pulmonary|subaortic|paraoesophageal|pulmonary ligament)\b(?:\s+([RL]|right|left)\b)?/i;

export function extractLungStation(site) {
  const s = String(site || '').trim();
  if (!s) return '';
  const mNum = LUNG_NUM_RE.exec(s);
  if (mNum) {
    let sd = (mNum[2] || '').toUpperCase();
    if (!sd) {
      if (/\bright\b/i.test(s)) sd = 'R';
      else if (/\bleft\b/i.test(s)) sd = 'L';
    }
    return `${mNum[1]}${sd}`;
  }
  const mNamed = LUNG_NAMED_RE.exec(s);
  if (mNamed) {
    const name = mNamed[1].toLowerCase();
    const rawSd = (mNamed[2] || '').toLowerCase();
    const sd = rawSd === 'r' || rawSd === 'right' ? 'R' : rawSd === 'l' || rawSd === 'left' ? 'L' : '';
    return sd ? `${name} ${sd}` : name;
  }
  return '';
}

function summarizeNodes(contribs) {
  let examined = 0;
  let positive = 0;
  let macro = 0;
  let micro = 0;
  let itc = 0;
  let sentinelExamined = 0;
  let hasSentinel = false;
  let hasNonSentinel = false;
  let enePresent = false;
  let maxDepositMm = null;
  let maxDepositSite = '';

  for (const c of contribs) {
    const ex = c.examined || 0;
    const pos = c.positive || 0;
    examined += ex;
    positive += pos;
    macro += c.macro || 0;
    micro += c.micro || 0;
    itc += c.itc || 0;
    if (c.sentinel) {
      hasSentinel = true;
      sentinelExamined += ex;
    } else {
      hasNonSentinel = true;
    }
    if (c.ene === 'Present') enePresent = true;
    if (c.depositMm !== null && c.depositMm !== undefined && (maxDepositMm === null || c.depositMm > maxDepositMm)) {
      maxDepositMm = c.depositMm;
      maxDepositSite = c.site || `Part ${c.partLabel}`;
    }
  }
  return { examined, positive, macro, micro, itc, sentinelExamined, hasSentinel, hasNonSentinel, enePresent, maxDepositMm, maxDepositSite };
}

function reconcileLung(primary, primaryIndex, schema, contribs) {
  const v = primary.values || {};
  const spSide = lungSide(v);
  const existing = parseStations(v.nodeStations || '', spSide);
  const satEntries = [];
  const unmapped = [];

  for (const c of contribs) {
    const st = extractLungStation(c.site);
    if (!st) {
      unmapped.push(c);
      continue;
    }
    satEntries.push({
      station: st,
      key: st.toLowerCase().replace(/\s+/g, ''),
      involved: c.positive || 0,
      examined: c.examined || 0,
      ene: c.ene === 'Present',
      partLabel: c.partLabel
    });
  }

  // Group satellite entries by normalized station key (in case two parts share a station).
  const satMap = new Map();
  for (const e of satEntries) {
    const prev = satMap.get(e.key);
    if (prev) {
      prev.involved += e.involved;
      prev.examined += e.examined;
      prev.ene = prev.ene || e.ene;
      prev.partLabels.push(e.partLabel);
    } else {
      satMap.set(e.key, { ...e, partLabels: [e.partLabel] });
    }
  }

  // Build existing station lookup from Part A's nodeStations.
  const existMap = new Map();
  for (const r of existing.rows) {
    const key = String(r.label || '').toLowerCase().replace(/\s+/g, '');
    existMap.set(key, r);
  }

  const missingOrDiff = [];
  for (const [key, sat] of satMap) {
    const cur = existMap.get(key);
    if (!cur || cur.examined < sat.examined || cur.involved < sat.involved) {
      missingOrDiff.push(sat);
    }
  }

  const agg = summarizeNodes(contribs);
  const fields = {};

  if (missingOrDiff.length) {
    // Preserve any non-satellite stations already typed in Part A, and append/update satellite stations.
    const mergedTokens = [];
    for (const r of existing.rows) {
      const key = String(r.label || '').toLowerCase().replace(/\s+/g, '');
      if (satMap.has(key)) continue;
      mergedTokens.push(`${r.label}: ${r.involved}/${r.examined}`);
    }
    for (const sat of satMap.values()) {
      mergedTokens.push(`${sat.station}: ${sat.involved}/${sat.examined}${sat.ene ? ' (ENE)' : ''}`);
    }
    fields.nodeStations = mergedTokens.join('; ');
  }

  if (agg.enePresent && v.nodeEne !== 'Present') fields.nodeEne = 'Present';
  const curDep = numOrNull(v.nodeDepositMm);
  if (agg.maxDepositMm !== null && (curDep === null || agg.maxDepositMm > curDep)) {
    fields.nodeDepositMm = String(agg.maxDepositMm);
  }

  const needsSync = Object.keys(fields).length > 0;
  const previewText = fields.nodeStations ?? (v.nodeStations || '');
  const preview = parseStations(previewText, spSide);
  const n2Pos = preview.rows.filter((r) => r.zone === 'N2' && r.involved > 0);
  const n3Pos = preview.rows.filter((r) => r.zone === 'N3' && r.involved > 0);
  const n1Pos = preview.rows.filter((r) => r.zone === 'N1' && r.involved > 0);
  const pNPreview = !preview.rows.length ? ''
    : n3Pos.length ? 'pN3'
      : n2Pos.length > 1 ? 'pN2b'
        : n2Pos.length === 1 ? 'pN2a'
          : n1Pos.length ? 'pN1'
            : 'pN0';

  const satLabels = contribs.map((c) => c.partLabel);
  const unmappedNote = unmapped.length
    ? ` (${unmapped.map((u) => `Part ${u.partLabel}: "${u.site || 'unnamed'}" — add station number to auto-map`).join('; ')})`
    : '';

  const summary = needsSync
    ? `${listLabels(satLabels)} (${agg.positive}/${agg.examined} nodes${pNPreview ? ` → ${pNPreview}` : ''}) not yet reflected in Part ${primary.label}`
    : `${listLabels(satLabels)} (${agg.positive}/${agg.examined} nodes${pNPreview ? `, ${pNPreview}` : ''}) synced with Part ${primary.label}`;

  const detail = fields.nodeStations
    ? `Sets Part ${primary.label} stations to: ${fields.nodeStations}${unmappedNote}`
    : (unmappedNote ? `All mapped stations match.${unmappedNote}` : 'All mapped nodal stations are reflected in the primary synoptic.');

  return {
    id: `nodes:${primaryIndex}`,
    kind: 'nodes',
    primaryIndex,
    primaryLabel: primary.label,
    primaryTemplateId: primary.templateId,
    primaryName: schema.name || primary.templateId,
    satelliteLabels: satLabels,
    status: needsSync ? 'needs-sync' : 'synced',
    summary,
    detail,
    patch: needsSync ? { partIndex: primaryIndex, fields } : null,
    totals: { examined: agg.examined, positive: agg.positive, pNPreview }
  };
}

function reconcileBreast(primary, primaryIndex, schema, contribs) {
  const v = primary.values || {};
  const agg = summarizeNodes(contribs);
  const curEx = intOrNull(v.nodesExamined) || 0;
  const curSln = intOrNull(v.nodesSentinel) || 0;
  const curMacro = intOrNull(v.nodesMacro) || 0;
  const curMicro = intOrNull(v.nodesMicro) || 0;
  const curItc = intOrNull(v.nodesItc) || 0;
  const curNone = !v.nodeSampling || v.nodeSampling === 'No nodes submitted';

  const targetSampling = agg.hasSentinel && agg.hasNonSentinel
    ? 'Sentinel node biopsy and axillary dissection'
    : agg.hasSentinel
      ? 'Sentinel node biopsy only'
      : 'Axillary dissection';

  const fields = {};
  const needsCounts = curNone || curEx < agg.examined || curMacro < agg.macro || curMicro < agg.micro || curItc < agg.itc || (agg.sentinelExamined > 0 && curSln < agg.sentinelExamined);

  if (needsCounts) {
    fields.nodeSampling = targetSampling;
    fields.nodesExamined = String(agg.examined);
    if (agg.sentinelExamined > 0) fields.nodesSentinel = String(agg.sentinelExamined);
    fields.nodesMacro = String(agg.macro);
    fields.nodesMicro = String(agg.micro);
    fields.nodesItc = String(agg.itc);
  }
  if (agg.enePresent && v.ene !== 'Present') fields.ene = 'Present';
  const curMm = numOrNull(v.largestNodeMm);
  if (agg.maxDepositMm !== null && (curMm === null || agg.maxDepositMm > curMm)) {
    fields.largestNodeMm = String(agg.maxDepositMm);
    if (agg.maxDepositSite && !v.largestNodeSite) fields.largestNodeSite = agg.maxDepositSite;
  }

  const needsSync = Object.keys(fields).length > 0;
  const satLabels = contribs.map((c) => c.partLabel);
  const breakdown = [
    agg.macro ? `${agg.macro} macro` : '',
    agg.micro ? `${agg.micro} micro` : '',
    agg.itc ? `${agg.itc} ITC` : ''
  ].filter(Boolean).join(', ');

  return {
    id: `nodes:${primaryIndex}`,
    kind: 'nodes',
    primaryIndex,
    primaryLabel: primary.label,
    primaryTemplateId: primary.templateId,
    primaryName: schema.name || primary.templateId,
    satelliteLabels: satLabels,
    status: needsSync ? 'needs-sync' : 'synced',
    summary: needsSync
      ? `${listLabels(satLabels)} (${agg.positive}/${agg.examined} nodes${breakdown ? `: ${breakdown}` : ''}) not yet reflected in Part ${primary.label}`
      : `${listLabels(satLabels)} (${agg.positive}/${agg.examined} nodes) reflected in Part ${primary.label}`,
    detail: needsSync
      ? `Sets Part ${primary.label} to ${targetSampling}, ${agg.examined} examined (${agg.macro} macro, ${agg.micro} micro, ${agg.itc} ITC)${agg.enePresent ? ', ENE present' : ''}.`
      : 'Part A regional lymph node counts include the separate node part(s).',
    patch: needsSync ? { partIndex: primaryIndex, fields } : null,
    totals: { examined: agg.examined, positive: agg.positive, macro: agg.macro, micro: agg.micro, itc: agg.itc }
  };
}

function reconcileColon(primary, primaryIndex, schema, contribs) {
  const v = primary.values || {};
  const agg = summarizeNodes(contribs);
  const apicalContribs = contribs.filter((c) => /\bapical\b/i.test(c.site || ''));
  const apical = summarizeNodes(apicalContribs);

  const curEx = intOrNull(v.nodesExamined);
  const curPos = intOrNull(v.nodesPositive);
  const curApEx = intOrNull(v.apicalExamined);
  const curApPos = intOrNull(v.apicalPositive);

  const fields = {};
  if (curEx === null || curEx === 0) {
    fields.nodesExamined = String(agg.examined);
    fields.nodesPositive = String(agg.positive);
    if (apical.examined > 0) {
      fields.apicalExamined = String(apical.examined);
      fields.apicalPositive = String(apical.positive);
    }
  } else {
    // Primary resection already has mesenteric nodes; check if apical satellite nodes are missing or total is too low.
    if (apical.examined > 0 && (curApEx === null || curApEx < apical.examined || (curApPos || 0) < apical.positive)) {
      const addEx = apical.examined - (curApEx || 0);
      const addPos = apical.positive - (curApPos || 0);
      fields.nodesExamined = String(curEx + Math.max(0, addEx));
      fields.nodesPositive = String((curPos || 0) + Math.max(0, addPos));
      fields.apicalExamined = String(apical.examined);
      fields.apicalPositive = String(apical.positive);
    } else if (curEx < agg.examined || (curPos || 0) < agg.positive) {
      fields.nodesExamined = String(agg.examined);
      fields.nodesPositive = String(agg.positive);
    }
  }
  if (agg.enePresent && v.ene !== 'Present') fields.ene = 'Present';

  const needsSync = Object.keys(fields).length > 0;
  const satLabels = contribs.map((c) => c.partLabel);
  return {
    id: `nodes:${primaryIndex}`,
    kind: 'nodes',
    primaryIndex,
    primaryLabel: primary.label,
    primaryTemplateId: primary.templateId,
    primaryName: schema.name || primary.templateId,
    satelliteLabels: satLabels,
    status: needsSync ? 'needs-sync' : 'synced',
    summary: needsSync
      ? `${listLabels(satLabels)} (${agg.positive}/${agg.examined} nodes${apical.examined ? `, incl. apical ${apical.positive}/${apical.examined}` : ''}) not yet reflected in Part ${primary.label}`
      : `${listLabels(satLabels)} (${agg.positive}/${agg.examined} nodes) consistent with Part ${primary.label}`,
    detail: needsSync
      ? `Updates Part ${primary.label} to ${fields.nodesPositive ?? (curPos || 0)}/${fields.nodesExamined ?? curEx} total nodes${fields.apicalExamined ? ` (apical ${fields.apicalPositive}/${fields.apicalExamined})` : ''}.`
      : 'Primary resection node totals already include the separate node part(s).',
    patch: needsSync ? { partIndex: primaryIndex, fields } : null,
    totals: { examined: agg.examined, positive: agg.positive }
  };
}

function detectLaterality(contribs) {
  let right = false;
  let left = false;
  for (const c of contribs) {
    if ((c.positive || 0) + (c.itc || 0) <= 0) continue;
    if (/\bbilateral\b/i.test(c.site || '')) { right = true; left = true; }
    else if (/\bright\b/i.test(c.site || '')) right = true;
    else if (/\bleft\b/i.test(c.site || '')) left = true;
  }
  if (right && left) return 'Bilateral';
  if (right) return 'Right';
  if (left) return 'Left';
  return '';
}

function reconcileEndometrial(primary, primaryIndex, schema, contribs) {
  const v = primary.values || {};
  const paContribs = contribs.filter((c) => /\b(para-?aortic|aortic)\b/i.test(c.site || ''));
  const pelvicContribs = contribs.filter((c) => !/\b(para-?aortic|aortic)\b/i.test(c.site || ''));
  const pelvic = summarizeNodes(pelvicContribs);
  const pa = summarizeNodes(paContribs);
  const agg = summarizeNodes(contribs);

  const fields = {};
  if (pelvic.examined > 0) {
    if ((intOrNull(v.pelvicExamined) || 0) < pelvic.examined || (intOrNull(v.pelvicMacro) || 0) < pelvic.macro || (intOrNull(v.pelvicMicro) || 0) < pelvic.micro || (intOrNull(v.pelvicItc) || 0) < pelvic.itc) {
      fields.pelvicExamined = String(pelvic.examined);
      fields.pelvicMacro = String(pelvic.macro);
      fields.pelvicMicro = String(pelvic.micro);
      fields.pelvicItc = String(pelvic.itc);
    }
    if (pelvic.hasSentinel && !v.pelvicSentinel) fields.pelvicSentinel = true;
    if (pelvic.enePresent && v.pelvicEne !== 'Present') fields.pelvicEne = 'Present';
    const lat = detectLaterality(pelvicContribs);
    if (lat && (!v.pelvicLaterality || v.pelvicLaterality === 'Not applicable')) fields.pelvicLaterality = lat;
  }
  if (pa.examined > 0) {
    if ((intOrNull(v.paExamined) || 0) < pa.examined || (intOrNull(v.paMacro) || 0) < pa.macro || (intOrNull(v.paMicro) || 0) < pa.micro || (intOrNull(v.paItc) || 0) < pa.itc) {
      fields.paExamined = String(pa.examined);
      fields.paMacro = String(pa.macro);
      fields.paMicro = String(pa.micro);
      fields.paItc = String(pa.itc);
    }
    if (pa.hasSentinel && !v.paSentinel) fields.paSentinel = true;
    if (pa.enePresent && v.paEne !== 'Present') fields.paEne = 'Present';
    const lat = detectLaterality(paContribs);
    if (lat && (!v.paLaterality || v.paLaterality === 'Not applicable')) fields.paLaterality = lat;
  }

  const needsSync = Object.keys(fields).length > 0;
  const satLabels = contribs.map((c) => c.partLabel);
  const partsDesc = [
    pelvic.examined ? `pelvic ${pelvic.positive}/${pelvic.examined}` : '',
    pa.examined ? `para-aortic ${pa.positive}/${pa.examined}` : ''
  ].filter(Boolean).join(', ');

  return {
    id: `nodes:${primaryIndex}`,
    kind: 'nodes',
    primaryIndex,
    primaryLabel: primary.label,
    primaryTemplateId: primary.templateId,
    primaryName: schema.name || primary.templateId,
    satelliteLabels: satLabels,
    status: needsSync ? 'needs-sync' : 'synced',
    summary: needsSync
      ? `${listLabels(satLabels)} (${partsDesc}) not yet reflected in Part ${primary.label}`
      : `${listLabels(satLabels)} (${partsDesc}) reflected in Part ${primary.label}`,
    detail: needsSync
      ? `Updates Part ${primary.label} pelvic/para-aortic lymph node counts (${partsDesc}).`
      : 'Pelvic and para-aortic lymph node counts already reflect the separate node part(s).',
    patch: needsSync ? { partIndex: primaryIndex, fields } : null,
    totals: { examined: agg.examined, positive: agg.positive }
  };
}

function reconcileGenericNodes(primary, primaryIndex, schema, contribs) {
  const fieldIds = new Set((schema.fields || []).map((f) => f.id));
  const exField = fieldIds.has('nodesExamined') ? 'nodesExamined' : '';
  const posField = fieldIds.has('nodesInvolved') ? 'nodesInvolved' : fieldIds.has('nodesPositive') ? 'nodesPositive' : '';
  if (!exField || !posField) return null;

  const v = primary.values || {};
  const agg = summarizeNodes(contribs);
  const curEx = intOrNull(v[exField]) || 0;
  const curPos = intOrNull(v[posField]) || 0;

  const fields = {};
  if (curEx < agg.examined || curPos < agg.positive) {
    fields[exField] = String(agg.examined);
    fields[posField] = String(agg.positive);
  }
  const eneField = fieldIds.has('ene') ? 'ene' : fieldIds.has('nodeEne') ? 'nodeEne' : '';
  if (eneField && agg.enePresent && v[eneField] !== 'Present') fields[eneField] = 'Present';

  const needsSync = Object.keys(fields).length > 0;
  const satLabels = contribs.map((c) => c.partLabel);
  return {
    id: `nodes:${primaryIndex}`,
    kind: 'nodes',
    primaryIndex,
    primaryLabel: primary.label,
    primaryTemplateId: primary.templateId,
    primaryName: schema.name || primary.templateId,
    satelliteLabels: satLabels,
    status: needsSync ? 'needs-sync' : 'synced',
    summary: needsSync
      ? `${listLabels(satLabels)} (${agg.positive}/${agg.examined} nodes) not yet reflected in Part ${primary.label}`
      : `${listLabels(satLabels)} (${agg.positive}/${agg.examined} nodes) consistent with Part ${primary.label}`,
    detail: needsSync
      ? `Updates Part ${primary.label} to ${agg.positive}/${agg.examined} regional lymph nodes${fields[eneField] ? ', ENE present' : ''}.`
      : 'Primary synoptic node counts already include the separate node part(s).',
    patch: needsSync ? { partIndex: primaryIndex, fields } : null,
    totals: { examined: agg.examined, positive: agg.positive }
  };
}

/**
 * Reconcile satellite parts (currently `lymph_node`) against primary cancer synoptic parts.
 * Returns `{ contributions, items }` where each item is `{ id, kind, primaryIndex, primaryLabel,
 * primaryTemplateId, primaryName, satelliteLabels, status, summary, detail, patch, totals }`.
 */
export function reconcileCase(templates, caseState, parts) {
  if (!Array.isArray(parts) || parts.length < 2) return { contributions: [], items: [] };

  const contributions = [];
  const primaries = [];

  parts.forEach((p, idx) => {
    const entry = templates[p.templateId];
    if (!entry) return;
    if (typeof entry.generator?.contribution === 'function') {
      const c = entry.generator.contribution(p);
      if (c) contributions.push({ ...c, partIndex: idx });
    }
    if (isCancerSynoptic(entry.schema, entry.generator)) {
      primaries.push({ part: p, index: idx, schema: entry.schema });
    }
  });

  if (!primaries.length || !contributions.length) return { contributions, items: [] };

  const nodeContribs = contributions.filter((c) => c.kind === 'nodes' && (c.examined > 0 || c.positive > 0 || c.itc > 0));
  const items = [];

  // Reconcile against the primary cancer synoptic (when there is a single primary, all node parts belong to it).
  if (nodeContribs.length && primaries.length === 1) {
    const { part, index, schema } = primaries[0];
    const others = nodeContribs.filter((c) => c.partIndex !== index);
    if (others.length) {
      let item = null;
      if (part.templateId === 'lung_carcinoma') item = reconcileLung(part, index, schema, others);
      else if (part.templateId === 'breast_carcinoma') item = reconcileBreast(part, index, schema, others);
      else if (part.templateId === 'colon_resection') item = reconcileColon(part, index, schema, others);
      else if (part.templateId === 'endometrial_carcinoma') item = reconcileEndometrial(part, index, schema, others);
      else item = reconcileGenericNodes(part, index, schema, others);
      if (item) items.push(item);
    }
  }

  return { contributions, items };
}

/** Concise plain-text summary of deterministic reconciliation for the Neon HIGH Staging audit prompt. */
export function formatReconciliationForAudit(recon) {
  if (!recon?.items?.length) return '';
  const lines = [];
  for (const it of recon.items) {
    lines.push(`- [${it.status}] ${it.summary}. ${it.detail}`);
  }
  return lines.join('\n');
}
