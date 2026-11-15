import test from 'node:test';
import assert from 'node:assert/strict';
import { SITUATIONS, grade } from '../js/situations.js';

test('chaque modèle obtient 20/20', () => {
  for (const sc of SITUATIONS) {
    const r = grade(sc, sc.modele);
    const miss = r.items.filter((i) => i.status !== 'ok').map((i) => `${i.label} (${i.status})`);
    assert.equal(r.note, 20, `${sc.id}: ${miss.join(', ')}`);
  }
});

test('un bilan vide obtient 0', () => {
  for (const sc of SITUATIONS) assert.equal(grade(sc, { circ: '', signes: '', gestes: '' }).note, 0);
});

test('identifiants uniques', () => {
  assert.equal(new Set(SITUATIONS.map((s) => s.id)).size, SITUATIONS.length);
});

test('élément au mauvais endroit : moitié des points', () => {
  const sc = SITUATIONS[0];
  const r = grade(sc, { ...sc.modele, gestes: '', signes: sc.modele.signes + '\nResucrage' });
  assert.equal(r.items.find((i) => i.label === 'Resucrage').status, 'misplaced');
});
