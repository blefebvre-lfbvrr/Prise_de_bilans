import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coherence, avisText, noteBilan, rappelEtat, circProposition, speSuggestions, horsNorme, tendance } from '../js/outils.js';
import { gestesText } from '../js/report.js';

const thoracique = {
  detresse: ['thoracique'], sexe: 'H', age: 52, plainte: 'une douleur dans la poitrine', decouverte: 'spontane',
  heure_pec: '14:05', date_pec: '2026-11-15', th_debut: '13h30', th_effort: 'oui', th_loc: 'retro', th_type: 'constrictive',
  arr_position: 'debout', arr_conscience: 'consciente', arr_orientation: 'orientée',
  sd_neuro: ['aucun'], sd_respi: ['aucun'], sd_circu: ['sueurs', 'paleur'],
  gcs_y: '4', gcs_v: '5', gcs_m: '6', ost: 'oui', ms4m: 'oui', pci: 'non', pupilles: 'irs',
  fc: '96', fc_qual: 'BFRS', ta_d: '158/94', trc: 'inf', fr: '20', fr_qual: 'ARS', sat: '97', sat_sous: 'AA',
  temp: '36.8', gly: '6.1', gly_unite: 'mmol/L', atcd: 'HTA', traitements: 'amlodipine', allergies: 'pénicilline',
  gestes: ['repos_assis'],
};

test('vérifications : TA un seul bras, avis manquant, bilan non noté', () => {
  const msgs = coherence(thoracique).map((x) => x.msg).join('\n');
  assert.match(msgs, /un seul bras/);
  assert.match(msgs, /sans avis médical/);
  assert.match(msgs, /bilan complet ou bilan trauma/);
  assert.match(msgs, /nouvelle série/);
  const ok = coherence({ ...thoracique, ta_g: '154/92', gestes: ['bilan_complet', 'avis'], surv: [{ heure: '14:20', fc: '90' }] });
  assert.deepEqual(ok, []);
});

test('vérifications : saturation basse sans O2, hypoglycémie sans resucrage, valeur anormale non cochée', () => {
  const msgs = coherence({ sat: '91', sat_sous: 'AA', gly: '0.5', gly_unite: 'g/L', fc: '130', sd_circu: ['aucun'] }).map((x) => x.msg).join('\n');
  assert.match(msgs, /oxygène/);
  assert.match(msgs, /resucrage/);
  assert.match(msgs, /FC 130/);
  assert.match(msgs, /« Aucun » coché/);
});

test('heure des gestes : ordre chronologique', () => {
  const s = { gestes: ['bilan_complet', 'resucrage', 'avis'], gestes_h: { bilan_complet: '14:10', resucrage: '14:05', avis: '14:30' } };
  assert.equal(gestesText(s), '14h05 : Resucrage\n14h10 : Bilan complet\n14h30 : Avis médical');
  assert.equal(gestesText({ gestes: ['bilan_complet', 'surveillance'] }), 'Bilan complet\nSurveillance');
});

test('message pour l’avis médical', () => {
  const t = avisText({ ...thoracique, ta_g: '154/92' });
  assert.match(t, /^Homme de 52 ans, douleur thoracique\./);
  assert.match(t, /Début : douleur apparue à 13h30/);
  assert.match(t, /DÉTRESSE circu \((sueurs, pâleur|pâleur, sueurs)\)/);
  assert.match(t, /TA 158\/94 à droite, 154\/92 à gauche/);
  assert.match(t, /Sat 97 % en air ambiant/);
  assert.match(t, /Allergie : pénicilline|allergie : pénicilline/);
});

test('rappel de surveillance', () => {
  const now = new Date('2026-11-15T14:20:00').getTime();
  const s = { heure_pec: '14:05', date_pec: '2026-11-15', rappel: { min: 10 }, surv: [{ heure: '14:12' }] };
  const r = rappelEtat(s, now);
  assert.equal(r.reste, 2 * 60_000);
  assert.equal(rappelEtat({ ...s, rappel: null }, now), null);
});

test('propositions : circonstanciel et bilan spé', () => {
  assert.equal(circProposition({ detresse: ['trauma'], sexe: 'F', tr_zone: 'genou', tr_cote: 'g' }), 's’est blessée au genou gauche');
  assert.equal(circProposition({ detresse: ['thoracique'], th_debut: '13h30', th_effort: 'oui' }), 'présente une douleur thoracique apparue à 13h30 à l’effort');
  assert.deepEqual(speSuggestions({ plainte: 'une douleur à la poitrine' }).map((x) => x.v), ['thoracique']);
  assert.deepEqual(speSuggestions({ plainte: 'mal à la cheville', detresse: ['trauma'] }), []);
});

test('repères et tendance', () => {
  assert.equal(horsNorme('fc', '128'), true);
  assert.equal(horsNorme('sat', '96'), false);
  assert.equal(horsNorme('ta', '85/50'), true);
  assert.equal(horsNorme('gly', '0.5', 'g/L'), true);
  assert.equal(tendance('ta', '120/80', '140/90'), '↓');
});

test('note du bilan', () => {
  assert.equal(noteBilan({}).note, 0);
  const complet = { ...thoracique, ta_g: '154/92', gestes: ['bilan_complet', 'avis', 'surveillance'], surv: [{ heure: '14:20', fc: '90' }] };
  assert.equal(noteBilan(complet).note, 20);
  assert.ok(noteBilan(thoracique).note < 18);
});
