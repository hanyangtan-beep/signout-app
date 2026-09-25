// Pathological N with extranodal extension for the AJCC 8th edition head and neck chapters that
// share it: cutaneous squamous cell carcinoma of the head and neck (chapter 15, src/staging/skin_scc.js)
// and the lip and oral cavity chapter (src/staging/oral.js). Built once so the two cannot drift.
//
// AJCC 8th pN, as listed on the QMH "HN-Skin SCC" page (CAP Cutaneous Carcinoma of the Head and
// Neck v1.2.0.0) and the RCPath cutaneous SCC dataset (v4, February 2019):
//   pN1   single ipsilateral node <= 30 mm, ENE(-)
//   pN2a  single ipsilateral node <= 30 mm, ENE(+); or single ipsilateral node > 30 to 60 mm, ENE(-)
//   pN2b  multiple ipsilateral nodes, none > 60 mm, ENE(-)
//   pN2c  bilateral or contralateral nodes, none > 60 mm, ENE(-)
//   pN3a  a node > 60 mm, ENE(-)
//   pN3b  single ipsilateral node > 30 mm, ENE(+); multiple ipsilateral, contralateral or bilateral
//         nodes, any ENE(+); a single contralateral node of any size, ENE(+)
// The size is that of the largest metastatic deposit, not of the node: RCPath 5.3 (specimen
// handling), "Note that size relates to metastatic deposit and not lymph node."
// ENE is invasion beyond the nodal capsule into the surrounding soft tissue; microscopic (<= 2 mm)
// and major (> 2 mm) ENE both count as ENE for pN (RCPath).
//
// UICC TNM 8 differs for the skin of the head and neck (any ENE is pN3b, with no pN2a exception);
// the card fixes AJCC 8th for head and neck sites, so the AJCC table is the one built here.

/**
 * @param {{ count: number, laterality: 'ipsilateral'|'contralateral'|'bilateral'|'', ene: string, sizeMm: number|null }} n
 *   count: involved nodes (>= 1). laterality '' is treated as ipsilateral (the caller warns).
 *   ene: 'Present' counts as ENE(+); anything else as ENE(-).
 * @returns {{ cat: string, note?: string }}
 */
export function pathologicalN({ count, laterality, ene, sizeMm }) {
  const ipsi = laterality === 'ipsilateral' || laterality === '';
  const single = count === 1;
  const sizeNote = (assumed) => `Size of the largest metastatic deposit not recorded; ${assumed}.`;
  if (ene === 'Present') {
    if (single && ipsi) {
      if (sizeMm === null) return { cat: 'N2a', note: sizeNote('pN2a assumes 30 mm or less, and a larger deposit with extranodal extension is pN3b') };
      return { cat: sizeMm > 30 ? 'N3b' : 'N2a' };
    }
    return { cat: 'N3b' };
  }
  const eneNote = ene === 'Cannot be determined' ? ' Extranodal extension cannot be determined; the ENE(-) category is given.' : '';
  const out = (cat, note = '') => ((note + eneNote).trim() ? { cat, note: (note + eneNote).trim() } : { cat });
  if (sizeMm !== null && sizeMm > 60) return out('N3a');
  if (!ipsi) return out('N2c', sizeMm === null ? sizeNote('pN2c assumes none is larger than 60 mm') : '');
  if (!single) return out('N2b', sizeMm === null ? sizeNote('pN2b assumes none is larger than 60 mm') : '');
  if (sizeMm === null) return out('N1', sizeNote('pN1 assumes 30 mm or less'));
  return out(sizeMm > 30 ? 'N2a' : 'N1');
}
