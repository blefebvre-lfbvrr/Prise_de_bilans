// Accueil, cours et quiz. Le formulaire de bilan reste dans app.js : ce fichier n'y touche pas.
import { CHAPITRES, MEMO_SPE, SPE_NOTES } from './cours.js';
import { THEMES, drawQuiz, pool } from './quiz.js';
import { TABS, DETRESSES, getField } from './schema.js';
import { expandFields } from './report.js';

const KEY = 'prise-de-bilans:revision';
const NAV_KEY = 'prise-de-bilans:revision-nav';
const QUIZ_LEN = 10;

const ICONS = {
  bilan: '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 14h6"/><path d="M12 17v-6"/>',
  cours: '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
  quiz: '<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>',
};

export function initRevision(api) {
  const { h, svg, haptic, play, setMode, bilansInfo } = api;
  const views = { accueil: document.getElementById('view-accueil'), cours: document.getElementById('view-cours'), quiz: document.getElementById('view-quiz') };

  // Progression gardée sur le téléphone : chapitres lus et meilleurs scores.
  const prog = { lus: [], scores: {} };
  try { Object.assign(prog, JSON.parse(localStorage.getItem(KEY)) || {}); } catch { /* ignoré */ }
  const saveProg = () => { try { localStorage.setItem(KEY, JSON.stringify(prog)); } catch { /* ignoré */ } };
  // Chapitre ouvert, pour le retrouver après un rechargement.
  const nav = { chapitre: null };
  try { Object.assign(nav, JSON.parse(sessionStorage.getItem(NAV_KEY)) || {}); } catch { /* ignoré */ }
  const saveNav = () => { try { sessionStorage.setItem(NAV_KEY, JSON.stringify(nav)); } catch { /* ignoré */ } };

  const icon = (paths, cls = 'ico') => { const s = h('span', { class: cls, 'aria-hidden': 'true' }); s.innerHTML = svg(paths); return s; };
  const crumb = (label, fn) => h('button', { type: 'button', class: 'crumb', onclick: fn }, `‹ ${label}`);
  const fill = (view, ...nodes) => { view.replaceChildren(...nodes); view.scrollTo({ top: 0 }); play(view.firstElementChild, 'swap'); };

  // ------------------------------------------------------------------ Accueil
  function renderHome() {
    const info = bilansInfo();
    const best = Object.values(prog.scores).reduce((m, s) => Math.max(m, s.best || 0), 0);
    const card = (cls, ic, title, sub, chips, go) => h('button', { type: 'button', class: `home-card ${cls}`, onclick: () => { haptic(); go(); } },
      icon(ic, 'home-ico'),
      h('span', { class: 'home-txt' }, h('strong', {}, title), h('span', {}, sub),
        chips.length ? h('span', { class: 'home-chips' }, ...chips.map((c) => h('span', { class: 'chip' }, c))) : null),
      h('span', { class: 'go', 'aria-hidden': 'true' }));
    fill(views.accueil, h('div', { class: 'home' },
      h('h1', {}, 'Que voulez-vous faire ?'),
      card('primary', ICONS.bilan, info.started ? 'Reprendre le bilan' : 'Prendre un bilan',
        info.started ? info.title : 'Étape par étape, prêt à coller dans ARGOS.',
        info.started ? [info.status, ...(info.count > 1 ? [`${info.count} bilans en cours`] : [])] : [], () => setMode('bilan')),
      card('', ICONS.cours, 'Relire le cours', 'La prise de bilan, les bilans spé, des exemples rédigés.',
        [`${prog.lus.length} / ${CHAPITRES.length} chapitres lus`], () => { nav.chapitre = null; setMode('cours'); }),
      card('', ICONS.quiz, 'Faire un quiz', `${QUIZ_LEN} questions par thème, corrigées au fur et à mesure.`,
        [best ? `Meilleur score ${best} / ${QUIZ_LEN}` : 'Pas encore de score'], () => setMode('quiz')),
      h('p', { class: 'home-foot' }, 'Bilans, lecture et scores restent sur ce téléphone. Rien n’est envoyé sur Internet.')));
  }

  // ------------------------------------------------------------------ Cours
  function renderSommaire() {
    nav.chapitre = null; saveNav();
    const done = prog.lus.length;
    fill(views.cours, h('div', { class: 'lesson' },
      h('h1', {}, 'Cours'),
      h('p', { class: 'lead' }, `${done} chapitre${done > 1 ? 's' : ''} lu${done > 1 ? 's' : ''} sur ${CHAPITRES.length}`),
      h('div', { class: 'meter' }, h('span', { style: `width:${(done / CHAPITRES.length) * 100}%` })),
      h('div', { class: 'toc' }, ...CHAPITRES.map((c, i) => h('button', { type: 'button', class: `toc-row${prog.lus.includes(c.id) ? ' lu' : ''}`, onclick: () => { haptic(); renderChapitre(c.id); } },
        h('span', { class: 'toc-n' }, String(i + 1)),
        h('span', { class: 'toc-txt' }, h('strong', {}, c.title), h('span', {}, c.summary)),
        h('span', { class: 'toc-state' }, prog.lus.includes(c.id) ? 'Lu ✓' : ''))))));
  }

  const accordion = (title, tag, ...body) => h('details', { class: 'acc' },
    h('summary', {}, h('span', { class: 'acc-title' }, title), tag ? h('span', { class: 'pill' }, tag) : null), h('div', { class: 'acc-body' }, ...body));
  const ul = (items) => h('ul', { class: 'lesson-list' }, ...items.map((x) => h('li', {}, x)));

  // Bilans spé du formulaire : lus dans le schéma, donc toujours à jour.
  function speFromSchema() {
    const groups = TABS.flatMap((t) => t.groups);
    return DETRESSES.map((d) => {
      const g = groups.find((x) => x.spe === d.v);
      if (!g || d.v === 'autre') return null;
      const items = [];
      for (const f of expandFields(g.fields)) {
        if (!f.label || f.type === 'subtitle' || (f.type === 'textarea' && /^Autres/.test(f.label))) continue;
        let label = f.label;
        if (f.show) {
          if (!(f.show({ sexe: 'F' }) && !f.show({ sexe: 'H' }))) continue;
          label += ' (chez la femme)';
        }
        const opts = (f.options || []).filter((o) => !o.exclusive).map((o) => o.l.toLowerCase());
        items.push(opts.length && opts.length <= 8 ? `${label} : ${opts.join(', ')}` : label);
      }
      return accordion(d.l, null, SPE_NOTES[d.v] ? h('p', { class: 'lesson-note' }, SPE_NOTES[d.v]) : null, ul(items));
    }).filter(Boolean);
  }

  function block(b) {
    switch (b.t) {
      case 'p': return h('p', {}, b.text);
      case 'h': return h('h2', {}, b.text);
      case 'list': return ul(b.items);
      case 'steps': return h('ol', { class: 'lesson-steps' }, ...b.items.map(([t, d]) => h('li', {}, h('strong', {}, t), h('span', {}, d))));
      case 'formula': return h('p', { class: 'formula' }, b.text);
      case 'quote': return h('figure', { class: 'doc-quote' }, h('figcaption', {}, 'Document Bilan ARGOS'), h('blockquote', {}, b.text));
      case 'lines': return h('pre', { class: 'lesson-lines' }, b.lines.join('\n'));
      case 'defs': return h('dl', { class: 'lesson-defs' }, ...b.items.map(([t, d]) => h('div', {}, h('dt', {}, t), h('dd', {}, d))));
      case 'note': return h('p', { class: 'lesson-note' }, b.text);
      case 'example': return h('article', { class: 'report-card example' },
        h('header', {}, h('h3', {}, b.title)),
        ...[['Circonstanciel', b.circ], ['Signes particuliers', b.signes], ['Gestes effectués', b.gestes]]
          .flatMap(([t, lines]) => [h('p', { class: 'part' }, t), h('pre', {}, lines.join('\n'))]));
      case 'memo': return h('div', { class: 'acc-list' }, ...MEMO_SPE.map((m) => accordion(m.title, m.cat,
        m.intro ? h('p', {}, m.intro) : null,
        m.alert ? h('p', { class: 'lesson-alert' }, m.alert) : null,
        h('p', { class: 'part' }, 'Rechercher'), ul(m.items),
        m.position ? h('p', { class: 'lesson-note' }, `Position d’attente : ${m.position}`) : null)));
      case 'spe': return h('div', { class: 'acc-list' }, ...speFromSchema());
      case 'gestes': return h('div', { class: 'chips' }, ...(getField('gestes')?.options || []).map((o) => h('span', { class: 'chip' }, o.l)));
      default: return null;
    }
  }

  function renderChapitre(id) {
    const i = Math.max(0, CHAPITRES.findIndex((c) => c.id === id));
    const c = CHAPITRES[i];
    nav.chapitre = c.id; saveNav();
    const next = CHAPITRES[i + 1];
    const end = h('div', { class: 'lesson-end' },
      h('div', { class: 'lesson-nav' },
        h('button', { type: 'button', class: 'btn', onclick: () => (i ? renderChapitre(CHAPITRES[i - 1].id) : renderSommaire()) }, i ? '‹ Précédent' : '‹ Sommaire'),
        h('button', { type: 'button', class: 'btn primary', onclick: () => { haptic(); next ? renderChapitre(next.id) : renderSommaire(); } }, next ? `${next.title} ›` : 'Terminer')),
      c.quiz ? h('button', { type: 'button', class: 'btn block', onclick: () => { setMode('quiz'); startQuiz(c.quiz); } }, 'S’entraîner sur ce chapitre') : null);
    fill(views.cours, h('div', { class: 'lesson' },
      crumb('Sommaire', renderSommaire),
      h('p', { class: 'eyebrow' }, `Chapitre ${i + 1} sur ${CHAPITRES.length}`),
      h('h1', {}, c.title),
      h('p', { class: 'lead' }, c.summary),
      ...c.blocks.map(block), end));
    // Le chapitre compte comme lu quand on arrive en bas.
    if (!prog.lus.includes(c.id) && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => {
        if (es.some((e) => e.isIntersecting) && nav.chapitre === c.id) { prog.lus.push(c.id); saveProg(); io.disconnect(); }
      }, { root: views.cours });
      io.observe(end);
    }
  }

  // ------------------------------------------------------------------ Quiz
  let quiz = null;

  function renderThemes() {
    quiz = null;
    fill(views.quiz, h('div', { class: 'lesson' },
      h('h1', {}, 'Quiz'),
      h('p', { class: 'lead' }, `${QUIZ_LEN} questions tirées au hasard. La bonne réponse et son explication s’affichent après chaque question.`),
      h('div', { class: 'toc' }, ...THEMES.map((t) => {
        const s = prog.scores[t.id];
        return h('button', { type: 'button', class: 'toc-row', onclick: () => { haptic(); startQuiz(t.id); } },
          h('span', { class: 'toc-txt' }, h('strong', {}, t.title), h('span', {}, `${t.desc} ${pool(t.id).length} questions.`)),
          h('span', { class: `toc-state${s ? ' score' : ''}` }, s ? `${s.best} / ${QUIZ_LEN}` : ''));
      }))));
  }

  function startQuiz(themeId) {
    const theme = THEMES.find((t) => t.id === themeId) || THEMES[0];
    quiz = { theme, qs: drawQuiz(theme.id, QUIZ_LEN), i: 0, good: 0, wrong: [] };
    renderQuestion();
  }

  function renderQuestion() {
    const q = quiz.qs[quiz.i];
    const total = quiz.qs.length;
    const feedback = h('div', { class: 'quiz-feedback', hidden: true, role: 'status' });
    const next = h('button', { type: 'button', class: 'btn primary block', hidden: true, onclick: () => { quiz.i++; quiz.i < total ? renderQuestion() : renderResult(); } },
      quiz.i === total - 1 ? 'Voir le résultat' : 'Question suivante ›');
    const buttons = q.options.map((label, k) => {
      const b = h('button', { type: 'button', class: 'quiz-opt' }, label);
      b.addEventListener('click', () => {
        const ok = k === q.answer;
        buttons.forEach((x, j) => { x.disabled = true; if (j === q.answer) x.classList.add('is-good'); });
        if (ok) quiz.good++; else { b.classList.add('is-bad'); quiz.wrong.push({ q, picked: label }); }
        feedback.className = `quiz-feedback ${ok ? 'good' : 'bad'}`;
        feedback.replaceChildren(h('strong', {}, ok ? 'Bonne réponse' : `La bonne réponse : ${q.options[q.answer]}`), h('p', {}, q.why));
        feedback.hidden = false; next.hidden = false;
        haptic();
        play(feedback, 'reveal');
        next.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
      return b;
    });
    fill(views.quiz, h('div', { class: 'lesson quiz' },
      crumb('Thèmes', renderThemes),
      h('div', { class: 'quiz-head' }, h('span', {}, `Question ${quiz.i + 1} sur ${total}`), h('span', {}, quiz.theme.title)),
      h('div', { class: 'meter' }, h('span', { style: `width:${(quiz.i / total) * 100}%` })),
      h('h1', { class: 'quiz-q' }, q.q),
      q.quote ? h('blockquote', { class: 'quiz-quote' }, q.quote) : null,
      h('div', { class: 'quiz-opts' }, ...buttons), feedback, next));
  }

  function renderResult() {
    const total = quiz.qs.length;
    const { theme, good, wrong } = quiz;
    const prev = prog.scores[theme.id]?.best || 0;
    prog.scores[theme.id] = { best: Math.max(prev, good), last: good };
    saveProg();
    const msg = good === total ? 'Sans faute.' : good >= total * 0.8 ? 'Très bien, il reste peu à revoir.' : good >= total * 0.5 ? 'C’est en bonne voie. Relisez les points ci-dessous.' : 'À retravailler : relisez le chapitre, puis réessayez.';
    fill(views.quiz, h('div', { class: 'lesson quiz' },
      crumb('Thèmes', renderThemes),
      h('p', { class: 'eyebrow' }, theme.title),
      h('p', { class: 'score' }, h('strong', {}, String(good)), ` / ${total}`),
      h('p', { class: 'lead' }, msg + (good > prev && prev ? ' Nouveau meilleur score.' : '')),
      h('div', { class: 'lesson-nav' },
        h('button', { type: 'button', class: 'btn primary', onclick: () => startQuiz(theme.id) }, 'Rejouer'),
        theme.chapitre ? h('button', { type: 'button', class: 'btn', onclick: () => { nav.chapitre = theme.chapitre; setMode('cours'); } }, 'Relire le chapitre') : null),
      wrong.length ? h('h2', {}, 'À revoir') : null,
      ...wrong.map(({ q, picked }) => h('div', { class: 'review' },
        h('p', { class: 'review-q' }, q.q), q.quote ? h('blockquote', { class: 'quiz-quote' }, q.quote) : null,
        h('p', { class: 'review-bad' }, `Votre réponse : ${picked}`),
        h('p', { class: 'review-good' }, `Bonne réponse : ${q.options[q.answer]}`),
        h('p', { class: 'review-why' }, q.why)))));
    quiz = null;
  }

  return {
    show(mode) {
      if (mode === 'accueil') renderHome();
      else if (mode === 'cours') (nav.chapitre ? renderChapitre(nav.chapitre) : renderSommaire());
      else if (mode === 'quiz' && !quiz) renderThemes();
    },
  };
}
