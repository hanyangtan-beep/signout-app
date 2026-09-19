// Which fields a pathway node is asking about.
//
// src/cnspathway.js draws the flowchart and src/cnswizard.js walks the funnel one question at a
// time, but nothing yet joins a node on the chart to the field that would settle it. That join is
// this file, and it is the whole of the merge: every node the chart can draw names the fields
// behind it, so clicking the node can put the real form control on the node itself.
//
// Kept here, in the trial, rather than in src/cnspathway.js, so the shipped modules stay exactly as
// they are while the design is still moving. When the trial is folded into the app this map is the
// piece that moves into the pathway module, as a `fields` property on each node.
//
// Keys are `stageId:nodeId`, matching the `key` that pathwayChart() puts on every laid-out node.
// Values are either a list of field ids or a function of the case values returning one, for the
// nodes whose field depends on which family the case is in.
//
// Nothing here is printed. It names form fields; the report register is untouched.

import { FAMILY_FIELD } from '../../generators/cns_layers.js';

/** The entity field belonging to the family the case is actually in, plus the biopsy free field. */
const entityFields = (v) => ['dxFamily', FAMILY_FIELD[v.dxFamily || 'Adult-type diffuse gliomas'], 'finding'].filter(Boolean);

export const NODE_FIELDS = {
  // ----- the funnel every case runs -----
  'funnel:context': ['patientAge', 'site', 'siteOther', 'side'],
  'funnel:morphology': entityFields,
  // The biopsy form splits immunohistochemistry by what the lesion turned out to be, each panel
  // gated on the recorded finding, so listing them all here shows only the one that applies.
  'funnel:ihc': ['ihc', 'ihcOther', 'mgIhc', 'pitIhc', 'swIhc', 'metIhc', 'lyIhc', 'demyIhc'],
  'funnel:idh': entityFields,
  'funnel:r132h': ['idh1R132H'],
  'funnel:seq': ['idhSeq', 'idhSeqDetail'],
  'funnel:branch': ['molStatus', 'idhBranch'],

  // ----- branch A: IDH-mutant -----
  'a1:infiltrating': entityFields,
  'a1:idhmut': ['idh1R132H', 'idhSeq', 'idhSeqDetail'],
  'a1:codel': ['codel', 'codelDetail'],
  'a1:atrx': ['atrx'],
  'a1:p53': ['p53'],
  'a1:dual': ['codel', 'atrx', 'p53'],
  'a2:oligograde': ['features', 'mitoses'],
  'a2:oligocdkn': ['cdkn2a'],
  'a2:g4': ['features', 'cdkn2a', 'pdgfra'],
  'a2:g3': ['mitoses', 'molHigher'],
  'a2:cdkn2a': ['cdkn2a'],
  'a2:molhigher': ['molHigher'],
  'a2:ki67': ['ki67'],

  // ----- branch B: IDH-wildtype -----
  'b1:wildtype': ['idhBranch', 'h3seq'],
  'b1:oneof': ['features', 'tert', 'egfr', 'chr710'],
  'b1:tertsole': ['tert', 'tertDetail', 'features', 'mitoses'],
  'b1:egfrsole': ['egfr', 'patientAge'],
  'b1:c710sole': ['chr710', 'patientAge'],
  'b2:midline': ['site', 'h3k27me3'],
  'b2:k27loss': ['h3k27me3', 'h3seq', 'h3seqDetail', 'ezhip'],
  'b2:differential': ['h3g34w', 'h3seq', 'braf', 'methylation'],
  'b2:mmr': ['ihc', 'ihcOther'],

  // ----- ependymal -----
  'ep:morph': [...['dxFamily', 'dxEpendymal', 'finding'], 'ihc'],
  'ep:pattern': ['dxEpendymal', 'finding'],
  'ep:site': ['site', 'siteOther'],

  // The morphologically defined pair: subependymoma and myxopapillary ependymoma.
  'epm:morph': ['dxEpendymal', 'finding'],
  'epm:gfap': ['ihc', 'ihcOther'],
  'epm:hoxb13': ['epIhc'],
  'epm:meth': ['methylation', 'methFamily', 'methClass', 'methScore', 'methThreshold'],
  'epm:grade': ['grade'],

  // Supratentorial: ZFTA, then YAP1.
  'epst:surrogate': ['epIhc'],
  'epst:zfta': ['zfta', 'zftaDetail'],
  'epst:yap1': ['yap1', 'yap1Detail'],
  'epst:nec': ['dxQualifier', 'dxQualifierDetail'],
  'epst:grade': ['grade'],

  // Posterior fossa: K27me3, EZHIP, methylation.
  'eppf:k27me3': ['h3k27me3'],
  'eppf:ezhip': ['ezhip'],
  'eppf:meth': ['methylation', 'methFamily', 'methClass', 'methScore', 'methThreshold'],
  'eppf:nos': ['dxQualifier', 'dxQualifierDetail'],
  'eppf:grade': ['grade'],

  // Spinal: the mimics, then MYCN, then copy number.
  'epsp:mimic': ['h3k27me3', 'h3seq', 'epIhc'],
  'epsp:mycn': ['mycn', 'epIhc'],
  'epsp:cnv': ['epCnv'],
  'epsp:grade': ['grade'],

  // ----- circumscribed astrocytic gliomas: the MAPK pathway -----
  'mapk:morph': entityFields,
  // BRAF fusion first, so the node asks its own question rather than the molecular-status one it is
  // gated behind; the status control stays on the node so it can be opened from here.
  'mapk:mapk': ['brafFusion', 'brafFusionDetail', 'braf', 'mapkOther', 'molStatus'],
  'mapk:v600': ['braf'],
  'mapk:cdkn': ['cdkn2a'],
  'mapk:meth': ['methylation', 'methClassifier', 'methFamily', 'methClass'],

  // ----- meningioma -----
  // One node, one criterion, so the chart asks the grading questions one at a time rather than
  // putting the whole block behind the morphology node.
  'mg:morph': ['mgIhc', 'mgSubtype', 'finding'],
  'mg:subtype': ['mgSubtype'],
  'mg:mitoses': ['mgMitoses'],
  'mg:soft': ['mgAtypical'],
  'mg:anaplasia': ['mgAnaplasia'],
  'mg:brain': ['mgBrain', 'mgBone'],
  'mg:g3': ['mgMolecular', 'molStatus'],
  'mg:g2': ['mgMolecular'],
  'mg:prognostic': ['mgIhc', 'ki67'],
  'mg:grade': ['grade'],

  // ----- methylation reporting -----
  'meth:layered': ['methylation', 'methClassifier', 'methFamily', 'methClass'],
  'meth:score': ['methScore', 'methThreshold'],
  'meth:qc': ['methQc', 'methQcDetail'],
};

/**
 * The fields behind a node, filtered to the ones this schema actually carries.
 *
 * The resection and the biopsy form are different lists, so a node that asks for `mgSubtype` on the
 * biopsy form simply has nothing to ask on the resection form and says so rather than breaking.
 */
export function nodeFields(key, values, schema) {
  const spec = NODE_FIELDS[key];
  const ids = typeof spec === 'function' ? spec(values || {}) : (spec || []);
  const byId = new Map((schema?.fields || []).map((f) => [f.id, f]));
  const out = [];
  for (const id of ids) {
    const f = byId.get(id);
    if (f && !out.includes(f)) out.push(f);
  }
  return out;
}

export default { NODE_FIELDS, nodeFields };
