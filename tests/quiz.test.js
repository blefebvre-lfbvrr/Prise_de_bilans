import { test } from 'node:test';
import assert from 'node:assert/strict';
import { THEMES, pool, drawQuiz } from '../js/quiz.js';
import { CHAPITRES, MEMO_SPE } from '../js/cours.js';

test('chaque question a une seule bonne réponse et des réponses distinctes', () => {
  for (const t of THEMES) {
    const p = pool(t.id);
    assert.ok(p.length >= 10, `${t.id} : ${p.length} questions`);
    for (const x of p) {
      const opts = x.fixed ? x.options : [x.good, ...x.bad];
      assert.equal(new Set(opts).size, opts.length, x.q);
      assert.ok(opts.length >= 3 && x.why, x.q);
      if (x.fixed) assert.ok(x.answer >= 0 && x.answer < opts.length);
    }
  }
});

test('tirage de 10 questions avec un indice de réponse valide', () => {
  for (const t of THEMES) {
    const qs = drawQuiz(t.id, 10);
    assert.equal(qs.length, 10);
    for (const q of qs) assert.ok(q.options[q.answer], q.q);
    assert.equal(new Set(qs.map((q) => q.q + (q.quote || ''))).size, 10, 'pas de doublon');
  }
});

test('cours : chapitres uniques, thèmes de quiz existants', () => {
  assert.equal(new Set(CHAPITRES.map((c) => c.id)).size, CHAPITRES.length);
  for (const c of CHAPITRES) assert.ok(THEMES.some((t) => t.id === c.quiz), c.id);
  for (const t of THEMES) if (t.chapitre) assert.ok(CHAPITRES.some((c) => c.id === t.chapitre), t.id);
  assert.equal(MEMO_SPE.length, 13);
});

test('le compteur de lecture repart chaque lundi', async () => {
  const { mondayOf } = await import('../js/revision.js');
  assert.equal(mondayOf(new Date(2026, 10, 15)), '2026-11-09'); // dimanche
  assert.equal(mondayOf(new Date(2026, 10, 16)), '2026-11-16'); // lundi
  assert.equal(mondayOf(new Date(2026, 10, 18, 23, 30)), '2026-11-16');
  assert.equal(mondayOf(new Date(2027, 0, 1)), '2026-12-28');
});
