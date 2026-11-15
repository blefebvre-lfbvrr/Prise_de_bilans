import test from 'node:test';
import assert from 'node:assert/strict';
import { SITUATIONS, grade } from '../js/situations.js';

test('chaque modèle obtient 20/20', () => {
  const fails = SITUATIONS.map((sc) => {
    const r = grade(sc, sc.modele);
    const miss = r.items.filter((i) => i.status !== 'ok').map((i) => `${i.label} (${i.status})`);
    return r.note === 20 ? null : `${sc.id} ${r.note}: ${miss.join(', ')}`;
  }).filter(Boolean);
  assert.deepEqual(fails, []);
});

test('un bilan vide obtient 0', () => {
  for (const sc of SITUATIONS) assert.equal(grade(sc, { circ: '', signes: '', gestes: '' }).note, 0);
});

test('au moins 20 situations, identifiants uniques', () => {
  assert.ok(SITUATIONS.length >= 20);
  assert.equal(new Set(SITUATIONS.map((s) => s.id)).size, SITUATIONS.length);
});

test('élément au mauvais endroit : moitié des points', () => {
  const sc = SITUATIONS[0];
  const r = grade(sc, { ...sc.modele, gestes: '', signes: sc.modele.signes + '\nResucrage' });
  assert.equal(r.items.find((i) => i.label === 'Resucrage').status, 'misplaced');
});
