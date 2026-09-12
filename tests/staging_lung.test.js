// Boundary tests for src/staging/lung.js (AJCC 9th edition). Field ids as in schemas/lung_carcinoma.json.
// Stage table: https://pmc.ncbi.nlm.nih.gov/articles/PMC12862260/ (Rami-Porta et al.), N/M proposals
// https://pubmed.ncbi.nlm.nih.gov/38447919/ .
import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveTNM, parseOverride, parseCategory } from '../src/staging/index.js';
import * as L from '../src/staging/lung.js';

const base = { laterality: 'Right', histType: 'Invasive adenocarcinoma', tumourSizeMm: '25', pleuralInvasion: 'Not identified', tumourExtension: ['Not identified'], separateNodules: 'Not identified', treatmentEffect: 'No known presurgical therapy', nodeStations: '7: 0/3; 10R: 0/2', distantMets: ['Not identified'] };
const st = (patch) => deriveTNM({ ...base, ...patch }, 'lung');
const TS = (patch) => st(patch).T;

test('T by invasive size at every boundary (10 / 20 / 30 / 40 / 50 / 70 mm); lepidic component excluded', () => {
  assert.deepEqual(['10', '10.5', '20', '21', '30', '31', '40', '41', '50', '51', '70', '71'].map((mm) => TS({ tumourSizeMm: mm })), ['T1a', 'T1b', 'T1b', 'T1c', 'T1c', 'T2a', 'T2a', 'T2b', 'T2b', 'T3', 'T3', 'T4']);
  assert.equal(TS({ tumourSizeMm: '35', invasiveSizeMm: '12' }), 'T1b', 'invasive size governs over the total size');
  assert.deepEqual([st({ tumourSizeMm: '' }).T, st({ tumourSizeMm: '' }).stage], ['TX', null]);
  assert.ok(st({ tumourSizeMm: '' }).notes.some((n) => /Tumour size not recorded/.test(n)));
});

test('T2 by visceral pleura / main bronchus / atelectasis / adjacent lobe; T3 and T4 by structure and separate nodules', () => {
  assert.equal(TS({ tumourSizeMm: '8', pleuralInvasion: 'PL1' }), 'T2a');
  assert.equal(TS({ tumourSizeMm: '8', pleuralInvasion: 'PL2' }), 'T2a');
  assert.equal(TS({ tumourSizeMm: '8', pleuralInvasion: 'PL0' }), 'T1a');
  assert.equal(TS({ tumourSizeMm: '8', tumourExtension: ['Main bronchus (regardless of distance from the carina, without carinal involvement)'] }), 'T2a');
  assert.equal(TS({ tumourSizeMm: '8', tumourExtension: ['Adjacent lobe (direct extension across the fissure)'] }), 'T2a');
  assert.equal(TS({ tumourSizeMm: '45', pleuralInvasion: 'PL1' }), 'T2b', 'pleura does not upgrade beyond size');
  assert.equal(TS({ tumourSizeMm: '8', pleuralInvasion: 'PL2', tumourExtension: ['Parietal pleura (PL3)'] }), 'T3');
  assert.equal(TS({ tumourSizeMm: '8', tumourExtension: ['Chest wall'] }), 'T3');
  assert.equal(TS({ tumourSizeMm: '8', tumourExtension: ['Phrenic nerve'] }), 'T3');
  assert.equal(TS({ tumourSizeMm: '8', separateNodules: 'Same lobe' }), 'T3');
  assert.equal(TS({ tumourSizeMm: '8', tumourExtension: ['Diaphragm'] }), 'T4');
  assert.equal(TS({ tumourSizeMm: '8', tumourExtension: ['Carina'] }), 'T4');
  assert.equal(TS({ tumourSizeMm: '8', tumourExtension: ['Mediastinum'] }), 'T4');
  assert.equal(TS({ tumourSizeMm: '8', separateNodules: 'Different ipsilateral lobe' }), 'T4');
  assert.equal(TS({ tumourSizeMm: '8', tumourExtension: ['Chest wall', 'Vertebral body'] }), 'T4', 'highest wins');
});

test('Tis and T1mi: in-situ and minimally invasive rules with their 30 mm / 5 mm limits', () => {
  const ais = 'Adenocarcinoma in situ, non-mucinous';
  assert.deepEqual([st({ histType: ais, tumourSizeMm: '30' }).T, st({ histType: ais, tumourSizeMm: '30' }).stage], ['Tis', '0']);
  assert.equal(st({ histType: 'Squamous cell carcinoma in situ', tumourSizeMm: '12' }).T, 'Tis');
  const big = st({ histType: ais, tumourSizeMm: '31' });
  assert.equal(big.T, 'T2a');
  assert.ok(big.notes.some((n) => /30 mm or less by definition/.test(n)));
  const mia = 'Minimally invasive adenocarcinoma, non-mucinous';
  assert.deepEqual([st({ histType: mia, tumourSizeMm: '20', invasiveSizeMm: '5' }).T, st({ histType: mia, tumourSizeMm: '20', invasiveSizeMm: '5' }).stage], ['T1mi', 'IA1']);
  const inv6 = st({ histType: mia, tumourSizeMm: '20', invasiveSizeMm: '6' });
  assert.equal(inv6.T, 'T1a');
  assert.ok(inv6.notes.some((n) => /5 mm or less/.test(n)));
  assert.equal(st({ histType: mia, tumourSizeMm: '31', invasiveSizeMm: '4' }).T, 'T1a');
  assert.equal(st({ histType: mia, tumourSizeMm: '20', invasiveSizeMm: '4', pleuralInvasion: 'PL1' }).T, 'T2a', 'pleural invasion excludes MIA');
  assert.equal(parseOverride('pT1mi pN0').T, 'T1mi');
});

test('station table -> N: N1 hilar / intrapulmonary, N2a single vs N2b multiple ipsilateral mediastinal stations, N3 contralateral or supraclavicular', () => {
  assert.equal(st({ nodeStations: '' }).N, 'NX');
  assert.equal(st({ nodeStations: '7: 0/3; 10R: 0/2; 11R: 0/1' }).N, 'N0');
  assert.equal(st({ nodeStations: '7: 0/3; 10R: 1/2' }).N, 'N1');
  assert.equal(st({ nodeStations: '7: 0/3; 12R: 1/1; 11R: 2/2' }).N, 'N1');
  assert.equal(st({ nodeStations: '7: 2/3; 10R: 1/2' }).N, 'N2a', 'one mediastinal station (+ N1) = N2a');
  assert.equal(st({ nodeStations: '7: 2/3; subcarinal: 1/1' }).N, 'N2a', 'the same station under two names counts once');
  assert.equal(st({ nodeStations: '7: 2/3; 4R: 1/2' }).N, 'N2b');
  assert.equal(st({ nodeStations: '7: 0/3; 4R: 1/2; 2R: 1/1' }).N, 'N2b');
  assert.equal(st({ nodeStations: '7: 0/3; 4L: 1/2' }).N, 'N3', '4L on a right lung is contralateral');
  assert.equal(st({ laterality: 'Left', nodeStations: '7: 0/3; 4L: 1/2' }).N, 'N2a');
  assert.equal(st({ laterality: 'Left', nodeStations: '5: 1/1; 6: 1/2' }).N, 'N2b', 'stations 5 and 6 are ipsilateral for a left lung');
  assert.equal(st({ nodeStations: '5: 1/1' }).N, 'N3', 'station 5 is contralateral for a right lung');
  assert.equal(st({ nodeStations: '1: 1/2' }).N, 'N3');
  assert.equal(st({ nodeStations: '10L: 1/2' }).N, 'N3', 'contralateral hilar node is N3');
  assert.equal(st({ nodeStations: '10: 1/2 (contralateral)' }).N, 'N3');
  assert.equal(st({ nodeStations: '7: 0/3', nodeDirectExtension: true }).N, 'N1');
  const bad = st({ nodeStations: '7: 0/3; station seven 1/2' });
  assert.equal(bad.N, 'N0');
  assert.ok(bad.notes.some((n) => /not understood/.test(n)));
  const n = L.nodes({ laterality: 'Right', nodeStations: '7: 2/3; 10R: 0/2; 11R: 1/1' });
  assert.deepEqual([n.examined, n.involved, n.involvedStations], [6, 3, ['7', '11R']]);
});

test('M1a / M1b / M1c1 / M1c2 and the descriptors m, r, y', () => {
  assert.equal(st({ separateNodules: 'Contralateral lobe' }).M, 'M1a');
  assert.equal(st({ distantMets: ['Malignant pleural effusion'] }).M, 'M1a');
  assert.equal(st({ distantMets: ['Pleural nodules'] }).M, 'M1a');
  assert.equal(st({ distantMets: ['Single extrathoracic metastasis in one organ system'] }).M, 'M1b');
  assert.equal(st({ distantMets: ['Multiple extrathoracic metastases in one organ system'] }).M, 'M1c1');
  assert.equal(st({ distantMets: ['Multiple extrathoracic metastases in multiple organ systems'] }).M, 'M1c2');
  assert.equal(st({ distantMets: ['Cannot be determined'] }).M, 'M-');
  assert.equal(st({ multiplePrimaries: true }).tnm, 'pT1c(m) pN0');
  assert.equal(st({ recurrent: true }).tnm, 'rpT1c pN0');
  assert.equal(st({ treatmentEffect: 'Present, 10 % or less residual viable tumour' }).tnm, 'ypT1c ypN0');
  assert.equal(parseOverride('pT2a pN2b pM1c2').M, 'M1c2');
});

test('stage groups follow the 9th-edition table, including the new N2a / N2b splits', () => {
  const g = (T, N, M = 'M-') => L.stageGroup(T, N, M);
  assert.deepEqual(['T1mi', 'T1a', 'T1b', 'T1c', 'T2a', 'T2b', 'T3', 'T4'].map((T) => g(T, 'N0')), ['IA1', 'IA1', 'IA2', 'IA3', 'IB', 'IIA', 'IIB', 'IIIA']);
  assert.deepEqual(['T1a', 'T2a', 'T2b', 'T3', 'T4'].map((T) => g(T, 'N1')), ['IIA', 'IIB', 'IIB', 'IIIA', 'IIIA']);
  assert.deepEqual(['T1a', 'T2a', 'T2b', 'T3', 'T4'].map((T) => g(T, 'N2a')), ['IIB', 'IIIA', 'IIIA', 'IIIA', 'IIIB']);
  assert.deepEqual(['T1a', 'T2a', 'T2b', 'T3', 'T4'].map((T) => g(T, 'N2b')), ['IIIA', 'IIIB', 'IIIB', 'IIIB', 'IIIB']);
  assert.deepEqual(['T1a', 'T2b', 'T3', 'T4'].map((T) => g(T, 'N3')), ['IIIB', 'IIIB', 'IIIC', 'IIIC']);
  assert.deepEqual([g('T1a', 'N0', 'M1a'), g('T4', 'N3', 'M1b'), g('T1a', 'N0', 'M1c1'), g('T1a', 'N0', 'M1c2')], ['IVA', 'IVA', 'IVB', 'IVB']);
  assert.equal(g('T1a', 'NX'), 'IA1', 'pNX (wedge without nodes) is grouped as N0');
  assert.equal(g('Tis', 'N0'), '0');
  assert.equal(g('TX', 'N0'), null);
  assert.equal(st({}).edition, 'AJCC 9th edition');
  assert.equal(st({}).stage, 'IA3');
});

test('prior specimen: typed pT / pN from an earlier wedge combine with this lobectomy, higher category wins, origin tagged', () => {
  const prior = { T: 'pT1a', accession: 'S26-01234', procedure: 'wedge resection' };
  const completion = deriveTNM({ ...base, tumourSizeMm: '', residualTumour: 'Not identified', nodeStations: '7: 0/3; 10R: 0/5' }, 'lung', { prior });
  assert.deepEqual([completion.T, completion.N, completion.stage, completion.origin], ['T1a', 'N0', 'IA1', { T: 'prior', N: 'current' }]);
  assert.ok(!completion.notes.some((n) => /Tumour size not recorded/.test(n)), 'the TX explanation is dropped once the prior fills in');
  const higherHere = deriveTNM({ ...base, tumourSizeMm: '25', nodeStations: '7: 0/3' }, 'lung', { prior });
  assert.deepEqual([higherHere.T, higherHere.origin.T], ['T1c', 'current']);
  assert.ok(higherHere.notes.some((n) => /derives T1c; the prior wedge resection \(S26-01234\) was T1a/.test(n)));
  const higherPrior = deriveTNM({ ...base, tumourSizeMm: '8' }, 'lung', { prior: { T: 'T2a', accession: 'S26-01234', procedure: 'wedge resection' } });
  assert.deepEqual([higherPrior.T, higherPrior.origin.T], ['T2a', 'prior']);
  assert.ok(higherPrior.notes.some((n) => /pT taken from the prior wedge resection \(S26-01234\)/.test(n)));
  const priorN = deriveTNM({ ...base, nodeStations: '' }, 'lung', { prior: { N: 'pN1', accession: 'S26-01234', procedure: 'wedge resection' } });
  assert.deepEqual([priorN.N, priorN.origin.N, priorN.stage], ['N1', 'prior', 'IIA']);
  assert.equal(deriveTNM(base, 'lung').origin.T, 'current');
  assert.deepEqual([parseCategory('pT1a', 'T'), parseCategory('ypN2a', 'N'), parseCategory('T9', 'T'), parseCategory('', 'N')], ['T1a', 'N2a', null, null]);
  const overridden = deriveTNM({ ...base, tnmOverride: 'pT1mi pN2a' }, 'lung', { prior });
  assert.deepEqual([overridden.T, overridden.N, overridden.overridden, overridden.stage], ['T1mi', 'N2a', true, 'IIB']);
});
