import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildReport, computeAge, suggestions } from '../js/report.js';

const intox = {
  detresse: ['malaise', 'intox'],
  nom: 'Dupont', prenom: 'Jean', sexe: 'H', age: 32, date_pec: '2026-06-20', heure_pec: '02:45',
  histoire: 'présente un malaise simple sans PCI suite à la consommation d’alcool et à la prise de drogue',
  decouverte: 'assise_sol', moyen: 'chaise', appel: 'securite',
  arr_position: 'assise', arr_conscience: 'consciente', arr_orientation: 'orientée',
  sd_neuro: ['aucun'], sd_respi: ['aucun'], sd_circu: ['fc'],
  ix_alcool: '1 verre de bière, 3 verres de vodka', ix_drogue: '2 taz', ix_habitude: 'premiere', ix_achat: 'sur_place',
  ix_heures: 'premier taz à 00h30 et deuxième taz à 2h', ix_comportement: ['agitee', 'crispation', 'delire'],
  nausees: 'oui', vomissements: 'oui', vomissements_nb: '1', dernier_repas: '13:00',
  cephalees: 'oui', cephalees_eva: 7, cephalees_depuis: '1h', cephalees_type: 'lance',
  gcs_y: '3', gcs_v: '4', gcs_m: '6', ost: 'oui', ms4m: 'oui', pci: 'non', pupilles: 'mydriase', fast: 'negatif',
  fc: '141', fc_qual: 'BFRS', ta_g: '132/87', trc: 'inf',
  fr: '14', fr_qual: 'ARS', sat: '99', sat_sous: 'AA', temp: '37.6', gly: '5.4',
  atcd: 'Aucun', traitements: 'aucun', allergies: 'Aucune',
  gestes: ['bilan_complet', 'repos_assis', 'surveillance'],
};

test('bilan complet intox', () => {
  const r = buildReport(intox);
  console.log(r.full);
  const signes = r.sections.find((x) => x.id === 'signes').text;
  assert.ok(signes.startsWith('SIGNES DE DÉTRESSE :\nCirculatoire') || signes.startsWith('SIGNES DE DÉTRESSE :\nCircu'));
  assert.match(r.full, /Homme de 32 ans qui présente un malaise/);
  assert.match(r.full, /Amenée en chaise au PSA après appel de la sécurité\./);
  assert.match(signes, /Glasgow 13 \(Y3 - V4 - M6\)/);
  assert.match(signes, /Pas de signes de détresse respi/);
  assert.match(signes, /Céphalées évaluées à 7\/10 depuis 1h, douleur qui lance/);
  assert.match(r.full, /GESTES EFFECTUÉS\nBilan complet\nMise au repos assise\nSurveillance/);
});

test('âge calculé', () => {
  assert.equal(computeAge('2000-10-08', new Date(2026, 9, 7)), 25);
  assert.equal(computeAge('2000-10-07', new Date(2026, 9, 7)), 26);
});

test('suggestions depuis constantes', () => {
  const sug = suggestions({ fc: '141', sat: '91', gcs_y: '3', gcs_v: '4', gcs_m: '6', sd_circu: ['fc'] });
  assert.deepEqual(sug.map((x) => x.v).sort(), ['glasgow', 'sat']);
});

test('formulaire vide', () => {
  const r = buildReport({});
  assert.equal(r.full, 'Bilan\n');
});

test('statut de détresse', async () => {
  const { detresseStatus } = await import('../js/report.js');
  assert.equal(detresseStatus({}).level, 'todo');
  assert.equal(detresseStatus({ sd_neuro: ['aucun'], sd_respi: ['aucun'], sd_circu: ['aucun'] }).level, 'ok');
  assert.deepEqual(detresseStatus({ sd_neuro: ['aucun'], sd_respi: ['sat'], sd_circu: ['fc'] }),
    { level: 'detresse', text: 'Détresse respi et circu' });
});
