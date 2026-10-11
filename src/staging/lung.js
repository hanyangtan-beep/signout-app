// Lung carcinoma — AJCC 9th edition (TNM 9, effective 2025) pTNM, as displayed on the QMH Thorax-Lung page
// (CAP Lung, Resection 5.1.0.0). Field ids belong to schemas/lung_carcinoma.json.
//
// 9th-edition changes carried here: N2 split into N2a (single ipsilateral mediastinal or subcarinal station)
// and N2b (multiple ipsilateral mediastinal stations); M1c split into M1c1 (multiple extrathoracic
// metastases, one organ system) and M1c2 (multiple organ systems); stage groups rearranged (T1 N1 -> IIA,
// T1 N2a -> IIB, T2 N2a / T3 N2a / T1 N2b -> IIIA, T2-3 N2b / T4 N2 -> IIIB). T is unchanged from the 8th.
// Sources: Rami-Porta R et al., 9th edition summary (https://pmc.ncbi.nlm.nih.gov/articles/PMC12862260/),
// cross-checked with https://www.medicalindependent.ie/update/update-respiratory/updated-lung-cancer-staging-implications-for-management/ ;
// N and M proposals https://pubmed.ncbi.nlm.nih.gov/38447919/ .
//
// Nodes are entered as a station table ("7: 2/3; 10R: 0/2; 11R: 1/1"); parseStations() below is the single
// reader used by the generator and by N(). Stations 1 (supraclavicular / scalene) -> N3; 2-9 mediastinal
// (2, 3a, 3p, 4, 5, 6, 7, 8, 9) -> N2 when ipsilateral, N3 when contralateral; 10-14 hilar / intrapulmonary
// -> N1 when ipsilateral, N3 when contralateral. Ipsilateral is assumed unless the station carries the
// opposite side letter (4R on a left lung), is 5 or 6 on a right lung, or is marked "contralateral".

export const id = 'lung';
export const edition = 'AJCC 9th edition';

const num = (x) => { const n = parseFloat(String(x ?? '').trim()); return Number.isFinite(n) ? n : null; };
const int = (x) => { const n = parseInt(String(x ?? '').trim(), 10); return Number.isFinite(n) ? n : null; };
const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

// ---------- vocab (schema option strings) ----------

export const AIS = /^Adenocarcinoma in situ/;
export const MIA = /^Minimally invasive adenocarcinoma/;
export const SCIS = /^Squamous cell carcinoma in situ/;

// Tumour extension entries by the T category they carry (page list, "Tumor extension"; CAP 5.1.0.0 notes:
// hilar soft-tissue invasion alone is T2a, pericardium (parietal or visceral) is T3, heart is T4).
const EXT_T2 = /^(Adjacent lobe|Main bronchus|Atelectasis or obstructive pneumonitis|Hilar soft tissue)/;
const EXT_T3 = /^(Parietal pleura|Chest wall|Phrenic nerve|Parietal pericardium|Visceral pericardium|Azygos vein|Thoracic nerve root|Stellate ganglion)/;
const EXT_T4 = /^(Cervical nerve root|Brachial plexus|Diaphragm|Heart|Great vessels|Supra-aortic|Brachiocephalic|Subclavian|Thymus|Trachea|Carina|Recurrent laryngeal nerve|Vagus nerve|Oesophagus|Vertebral body|Lamina|Spinal canal)/;

export const NODULES_SAME = 'Same lobe';
export const NODULES_IPSI = 'Different ipsilateral lobe';
export const NODULES_CONTRA = 'Contralateral lobe';

export const treated = (v) => Boolean((v.treatmentEffect || '').trim()) && !/^No known/.test(v.treatmentEffect);   // -> y prefix

// ---------- size ----------

/** Invasive size in mm (lepidic component excluded); falls back to the total size. */
export function invasiveMm(v) {
  const inv = num(v.invasiveSizeMm);
  if (inv !== null) return inv;
  return num(v.tumourSizeMm);
}

export function extension(v) {
  const ext = arr(v.tumourExtension).filter((s) => !/^(Not applicable|Not identified|Adjacent structures present|Cannot be|Other)/.test(s));
  return { t2: ext.some((s) => EXT_T2.test(s)), t3: ext.some((s) => EXT_T3.test(s)), t4: ext.some((s) => EXT_T4.test(s)) };
}

export const pleuraInvaded = (v) => /^PL[12]/.test(v.pleuralInvasion || '');

// ---------- T ----------

export function T(v) {
  const type = v.histType || '';
  const total = num(v.tumourSizeMm);
  const ext = extension(v);
  const nodules = v.separateNodules || '';
  const upgraded = ext.t2 || ext.t3 || ext.t4 || pleuraInvaded(v) || nodules === NODULES_SAME || nodules === NODULES_IPSI;
  let note;
  // In situ and minimally invasive tumours, unless something else upgrades them.
  if (!upgraded && (AIS.test(type) || SCIS.test(type))) {
    if (total === null || total <= 30) return { cat: 'Tis' };
    note = `${AIS.test(type) ? 'Adenocarcinoma in situ' : 'Squamous cell carcinoma in situ'} is 30 mm or less by definition; a ${total} mm tumour is staged by its size as an invasive carcinoma.`;
  } else if (!upgraded && MIA.test(type)) {
    const inv = num(v.invasiveSizeMm);
    if ((inv === null || inv <= 5) && (total === null || total <= 30)) return { cat: 'T1mi' };
    note = inv !== null && inv > 5
      ? `Minimally invasive adenocarcinoma has an invasive component of 5 mm or less; ${inv} mm of invasion is staged as invasive adenocarcinoma.`
      : `Minimally invasive adenocarcinoma is 30 mm or less in total; a ${total} mm tumour is staged by its size as an invasive carcinoma.`;
  }
  const size = invasiveMm(v);
  const withNote = (cat) => (note ? { cat, note } : { cat });
  // Highest rule wins.
  if (ext.t4 || nodules === NODULES_IPSI) return withNote('T4');
  if (size !== null && size > 70) return withNote('T4');
  if (ext.t3 || nodules === NODULES_SAME) return withNote('T3');
  if (size !== null && size > 50) return withNote('T3');
  if (size !== null && size > 40) return withNote('T2b');
  if (size !== null && size > 30) return withNote('T2a');
  if (ext.t2 || pleuraInvaded(v)) return withNote('T2a');
  if (size === null) return { cat: 'TX', note: 'Tumour size not recorded; pT cannot be assigned.' };
  if (size > 20) return withNote('T1c');
  if (size > 10) return withNote('T1b');
  return withNote('T1a');
}

// ---------- N: station table ----------

const STATION_RE = /^(?:station\s*)?(\d{1,2})\s*([RL])?\s*(?:\(([^)]*)\))?\s*[:\-–]?\s*(\d+)\s*(?:\/|of)\s*(\d+)\s*(.*)$/i;
const NAMED = { supraclavicular: 1, scalene: 1, subcarinal: 7, hilar: 10, interlobar: 11, lobar: 12, segmental: 13, subsegmental: 14, intrapulmonary: 12, paratracheal: 4, prevascular: 3, retrotracheal: 3, 'para-aortic': 6, paraaortic: 6, 'aorto-pulmonary': 5, 'aortopulmonary': 5, subaortic: 5, paraoesophageal: 8, 'pulmonary ligament': 9 };
const NAMED_RE = new RegExp(`^(${Object.keys(NAMED).join('|')})\\s*([RL])?\\s*[:\\-–]?\\s*(\\d+)\\s*(?:\\/|of)\\s*(\\d+)\\s*(.*)$`, 'i');

/** Side of the specimen: 'R' | 'L' | null. */
export const side = (v) => (/^Right/i.test(v.laterality || '') ? 'R' : /^Left/i.test(v.laterality || '') ? 'L' : null);

/**
 * Parse "7: 2/3; 10R: 0/2; 11R 1/1 (ENE)" into rows. Each row: { station: 7, label: '7', side: 'R'|'L'|null,
 * involved, examined, contralateral, zone: 'N1'|'N2'|'N3', text }. Unparsable tokens land in `bad`.
 */
export function parseStations(text, specimenSide = null) {
  const rows = [];
  const bad = [];
  for (const raw of String(text || '').split(/[;\n]+/)) {
    const tok = raw.trim().replace(/^[-•*]\s*/, '');
    if (!tok) continue;
    let m = STATION_RE.exec(tok);
    let station; let sd; let involved; let examined; let rest; let label;
    if (m) { station = int(m[1]); sd = (m[2] || '').toUpperCase() || null; involved = int(m[4]); examined = int(m[5]); rest = `${m[3] || ''} ${m[6] || ''}`; label = `${m[1]}${m[2] ? m[2].toUpperCase() : ''}`; }
    else {
      m = NAMED_RE.exec(tok);
      if (!m) { bad.push(tok); continue; }
      station = NAMED[m[1].toLowerCase()]; sd = (m[2] || '').toUpperCase() || null; involved = int(m[3]); examined = int(m[4]); rest = m[5] || ''; label = `${m[1].toLowerCase()}${m[2] ? ` ${m[2].toUpperCase()}` : ''}`;
    }
    if (station === null || station < 1 || station > 14 || examined === null || involved === null) { bad.push(tok); continue; }
    const marked = /contralateral/i.test(rest) ? true : /ipsilateral/i.test(rest) ? false : null;
    let contralateral = marked === true;
    if (marked === null) {
      if (sd && specimenSide && sd !== specimenSide) contralateral = true;
      else if (!sd && specimenSide === 'R' && (station === 5 || station === 6)) contralateral = true;
    }
    const zone = station === 1 ? 'N3' : station >= 10 ? (contralateral ? 'N3' : 'N1') : (contralateral ? 'N3' : 'N2');
    rows.push({ station, label, side: sd, involved: Math.min(involved, examined), examined, contralateral, zone, mediastinal: station >= 2 && station <= 9, text: rest.trim() });
  }
  return { rows, bad };
}

/** Totals and the involved-station list for the report. */
export function nodes(v) {
  const { rows, bad } = parseStations(v.nodeStations, side(v));
  const examined = rows.reduce((s, r) => s + r.examined, 0);
  const involved = rows.reduce((s, r) => s + r.involved, 0);
  const involvedStations = rows.filter((r) => r.involved > 0).map((r) => r.label);
  return { rows, bad, examined, involved, involvedStations };
}

export function N(v) {
  const n = nodes(v);
  const direct = v.nodeDirectExtension === true;
  if (n.rows.length === 0) {
    if (direct) return { cat: 'N1', note: 'Direct extension of the primary tumour into a hilar / intrapulmonary node counts as pN1; no separate nodes recorded.' };
    return { cat: 'NX', none: !n.bad.length, note: n.bad.length ? `Lymph node stations not understood: ${n.bad.join('; ')}. Use "7: 2/3; 10R: 0/2".` : undefined };
  }
  const pos = n.rows.filter((r) => r.involved > 0);
  const note = n.bad.length ? `Some lymph node entries were not understood and are ignored: ${n.bad.join('; ')}.` : undefined;
  if (pos.some((r) => r.zone === 'N3')) return { cat: 'N3', note };
  const n2 = pos.filter((r) => r.zone === 'N2');
  if (n2.length) {
    const stations = new Set(n2.map((r) => r.station));
    return { cat: stations.size > 1 ? 'N2b' : 'N2a', note };
  }
  if (pos.length || direct) return { cat: 'N1', note };
  return { cat: 'N0', note };
}

// ---------- M ----------

export function M(v) {
  const mets = arr(v.distantMets).filter((s) => !/^(Not identified|Not applicable|Cannot)/.test(s));
  if (mets.some((s) => /multiple organ/i.test(s))) return { cat: 'M1c2' };
  if (mets.some((s) => /^Multiple extrathoracic/i.test(s))) return { cat: 'M1c1' };
  if (mets.some((s) => /^Single extrathoracic/i.test(s))) return { cat: 'M1b' };
  if (mets.some((s) => /^(Separate tumour nodule|Pleural nodule|Pericardial nodule|Malignant pleural|Malignant pericardial)/i.test(s)) || v.separateNodules === NODULES_CONTRA) return { cat: 'M1a' };
  return { cat: 'M-' };
}

export function descriptors(v) {
  const d = [];
  if (v.multiplePrimaries === true) d.push('m');
  if (v.recurrent === true) d.push('r');
  if (treated(v)) d.push('y');
  return d;
}

// ---------- stage group (AJCC 9th) ----------

const T_GROUP = (Tc) => (Tc === 'Tis' ? 'Tis' : /^T1/.test(Tc) ? 'T1' : /^T2/.test(Tc) ? 'T2' : Tc === 'T3' ? 'T3' : Tc === 'T4' ? 'T4' : null);

export function stageGroup(Tc, Nc, Mc) {
  if (/^M1c/.test(Mc)) return 'IVB';
  if (Mc === 'M1a' || Mc === 'M1b') return 'IVA';
  if (Tc === 'TX' || Tc === 'T0') return null;
  const tg = T_GROUP(Tc);
  const n = Nc === 'NX' ? 'N0' : Nc;
  if (tg === 'Tis') return n === 'N0' ? '0' : null;
  if (n === 'N3') return tg === 'T1' || tg === 'T2' ? 'IIIB' : 'IIIC';
  if (n === 'N2b') return tg === 'T1' ? 'IIIA' : 'IIIB';
  if (n === 'N2a') return tg === 'T1' ? 'IIB' : tg === 'T4' ? 'IIIB' : 'IIIA';
  if (n === 'N1') return tg === 'T1' ? 'IIA' : tg === 'T2' ? 'IIB' : 'IIIA';
  // N0
  switch (Tc) {
    case 'T1mi': case 'T1a': return 'IA1';
    case 'T1b': return 'IA2';
    case 'T1c': return 'IA3';
    case 'T2a': return 'IB';
    case 'T2b': return 'IIA';
    case 'T3': return 'IIB';
    case 'T4': return 'IIIA';
    default: return null;
  }
}
