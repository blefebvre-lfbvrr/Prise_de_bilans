// Accueil, cours et quiz. Le formulaire de bilan reste dans app.js : ce fichier n'y touche pas.
import { CHAPITRES, MEMO_SPE, SPE_NOTES } from './cours.js';
import { THEMES, drawQuiz, pool } from './quiz.js';
import { TABS, DETRESSES, getField } from './schema.js';
import { expandFields } from './report.js';
import { SITUATIONS, PART_LABELS, grade } from './situations.js';

const KEY = 'prise-de-bilans:revision';
const NAV_KEY = 'prise-de-bilans:revision-nav';
const QUIZ_LEN = 10;
const DRAFT_KEY = 'prise-de-bilans:situations';

const ICONS = {
  bilan: '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 14h6"/><path d="M12 17v-6"/>',
  cours: '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
  situation: '<path d="M12 20h9"/><path d="M16.38 3.62a1 1 0 0 1 3 3L7.37 18.64a2 2 0 0 1-.86.5l-2.87.84a.5.5 0 0 1-.62-.62l.84-2.87a2 2 0 0 1 .5-.86z"/>',
  quiz: '<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>',
};

// Date (AAAA-MM-JJ, heure locale) du lundi de la semaine de `d`.
export function mondayOf(d) {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
  return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}-${String(m.getDate()).padStart(2, '0')}`;
}

export function initRevision(api) {
  const { h, svg, haptic, play, setMode, bilansInfo } = api;
  const views = Object.fromEntries(['accueil', 'cours', 'quiz', 'situation'].map((m) => [m, document.getElementById(`view-${m}`)]));

  // Progression gardée sur le téléphone : chapitres lus et meilleurs scores.
  const prog = { lus: [], scores: {}, notes: {} };
  try { Object.assign(prog, JSON.parse(localStorage.getItem(KEY)) || {}); } catch { /* ignoré */ }
  const saveProg = () => { try { localStorage.setItem(KEY, JSON.stringify(prog)); } catch { /* ignoré */ } };
  // La lecture du cours repart de zéro chaque lundi : on relit tout dans la semaine.
  function checkWeek() {
    const week = mondayOf(new Date());
    if (prog.semaine === week) return;
    prog.semaine = week; prog.lus = []; saveProg();
  }
  checkWeek();
  // Chapitre ouvert, pour le retrouver après un rechargement.
  const nav = { chapitre: null, situation: null, corrige: false, random: false };
  try { Object.assign(nav, JSON.parse(sessionStorage.getItem(NAV_KEY)) || {}); } catch { /* ignoré */ }
  const saveNav = () => { try { sessionStorage.setItem(NAV_KEY, JSON.stringify(nav)); } catch { /* ignoré */ } };

  const icon = (paths, cls = 'ico') => { const s = h('span', { class: cls, 'aria-hidden': 'true' }); s.innerHTML = svg(paths); return s; };
  const crumb = (label, fn) => h('button', { type: 'button', class: 'crumb', onclick: fn }, `‹ ${label}`);
  const fill = (view, ...nodes) => { view.replaceChildren(...nodes); view.scrollTo({ top: 0 }); play(view.firstElementChild, 'swap'); };

  // ------------------------------------------------------------------ Accueil
  function renderHome() {
    checkWeek();
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
        [`${prog.lus.length} / ${CHAPITRES.length} chapitres lus cette semaine`], () => { nav.chapitre = null; setMode('cours'); }),
      card('', ICONS.quiz, 'Faire un quiz', `${QUIZ_LEN} questions par thème, corrigées au fur et à mesure.`,
        [best ? `Meilleur score ${best} / ${QUIZ_LEN}` : 'Pas encore de score'], () => setMode('quiz')),
      card('', ICONS.situation, 'Mise en situation', 'Un cas concret : rédigez le bilan complet, il est noté sur 20.',
        [bestNote() != null ? `Meilleure note ${fmtNote(bestNote())} / 20` : `${SITUATIONS.length} situations, mode au hasard`], () => { nav.situation = null; setMode('situation'); }),
      h('p', { class: 'home-foot' }, 'Bilans, lecture et scores restent sur ce téléphone. Rien n’est envoyé sur Internet.')));
  }

  // ------------------------------------------------------------------ Cours
  function renderSommaire() {
    checkWeek();
    nav.chapitre = null; saveNav();
    const done = prog.lus.length;
    fill(views.cours, h('div', { class: 'lesson' },
      h('h1', {}, 'Cours'),
      h('p', { class: 'lead' }, `${done} chapitre${done > 1 ? 's' : ''} lu${done > 1 ? 's' : ''} sur ${CHAPITRES.length} cette semaine. Le compteur repart à zéro chaque lundi.`),
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

  // ------------------------------------------------------------------ Mises en situation
  // Brouillons gardés sur le téléphone, pour ne rien perdre en changeant d'écran.
  const drafts = {};
  try { Object.assign(drafts, JSON.parse(localStorage.getItem(DRAFT_KEY)) || {}); } catch { /* ignoré */ }
  const saveDrafts = () => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts)); } catch { /* ignoré */ } };
  const fmtNote = (n) => String(n).replace('.', ',');
  function bestNote() {
    const v = Object.values(prog.notes || {}).map((x) => x.best);
    return v.length ? Math.max(...v) : null;
  }
  const noteClass = (n) => (n >= 16 ? 'good' : n >= 10 ? 'mid' : 'low');

  // Tirage au hasard : d'abord les cas jamais faits, sinon tous sauf celui qu'on vient de faire.
  function pickRandom() {
    const notDone = SITUATIONS.filter((x) => !prog.notes?.[x.id]);
    const pool = notDone.length ? notDone : SITUATIONS.filter((x) => x.id !== nav.situation);
    return pool[Math.floor(Math.random() * pool.length)];
  }
  function startRandom() {
    const sc = pickRandom();
    drafts[sc.id] = { circ: '', signes: '', gestes: '' }; saveDrafts();
    haptic(); renderCas(sc.id, true);
  }

  function renderSituations() {
    nav.situation = null; nav.corrige = false; nav.random = false; saveNav();
    const done = SITUATIONS.filter((x) => prog.notes?.[x.id]).length;
    const cats = [...new Set(SITUATIONS.map((x) => x.cat))];
    const row = (sc) => {
      const n = prog.notes?.[sc.id];
      const started = drafts[sc.id] && Object.values(drafts[sc.id]).some((x) => x && x.trim());
      return h('button', { type: 'button', class: 'toc-row', onclick: () => { haptic(); renderCas(sc.id); } },
        h('span', { class: 'toc-txt' }, h('strong', {}, sc.title), h('span', {}, `${sc.niveau}${started && !n ? ' · brouillon en cours' : ''}`)),
        h('span', { class: `toc-state${n ? ` score ${noteClass(n.best)}` : ''}` }, n ? `${fmtNote(n.best)} / 20` : ''));
    };
    fill(views.situation, h('div', { class: 'lesson' },
      h('h1', {}, 'Mise en situation'),
      h('p', { class: 'lead' }, 'Lisez le contexte, puis rédigez le bilan comme dans ARGOS : circonstanciel, signes particuliers, gestes effectués. Le barème le note sur 20 et liste ce qui manque.'),
      h('button', { type: 'button', class: 'random-card', onclick: startRandom },
        h('span', { class: 'random-ico', 'aria-hidden': 'true' }, '?'),
        h('span', { class: 'home-txt' }, h('strong', {}, 'Situation au hasard'),
          h('span', {}, 'Le thème reste caché jusqu’à la correction, comme sur le terrain.')),
        h('span', { class: 'go', 'aria-hidden': 'true' })),
      h('p', { class: 'lead small' }, `${done} situation${done > 1 ? 's' : ''} faite${done > 1 ? 's' : ''} sur ${SITUATIONS.length}`),
      h('div', { class: 'meter' }, h('span', { style: `width:${(done / SITUATIONS.length) * 100}%` })),
      ...cats.flatMap((c) => [h('h2', { class: 'sit-cat' }, c), h('div', { class: 'toc' }, ...SITUATIONS.filter((x) => x.cat === c).map(row))])));
  }

  const ctxBlock = (title, ...body) => h('section', { class: 'sit-block' }, h('p', { class: 'part' }, title), ...body);

  function renderCas(id, random = nav.random) {
    const sc = SITUATIONS.find((x) => x.id === id) || SITUATIONS[0];
    nav.situation = sc.id; nav.corrige = false; nav.random = !!random; saveNav();
    const d = drafts[sc.id] || (drafts[sc.id] = { circ: '', signes: '', gestes: '' });
    const fields = [
      ['circ', 'Circonstanciel', 'Homme / Femme de … ans qui… La victime se présente…', 4],
      ['signes', 'Signes particuliers', 'Signes de détresse, situation à l’arrivée, plainte, constantes, ATCD / traitements / allergies…', 12],
      ['gestes', 'Gestes effectués', 'Bilan complet, position, gestes, avis médical, surveillance…', 4],
    ];
    const grow = (t) => { t.style.height = 'auto'; t.style.height = `${t.scrollHeight + 2}px`; };
    const areas = fields.map(([k, label, ph, rows]) => {
      const t = h('textarea', { id: `sit-${k}`, rows: String(rows), placeholder: ph, autocapitalize: 'sentences', spellcheck: 'true' });
      t.value = d[k] || '';
      t.addEventListener('input', () => { d[k] = t.value; saveDrafts(); grow(t); });
      return h('div', { class: 'field' }, h('label', { for: `sit-${k}` }, label), t);
    });
    const ok = h('button', { type: 'button', class: 'btn primary block', onclick: () => {
      if (!Object.values(d).some((x) => x && x.trim())) { areas[0].querySelector('textarea').focus(); return; }
      haptic(); renderCorrection(sc.id);
    } }, 'Corriger mon bilan');
    fill(views.situation, h('div', { class: 'lesson sit' },
      crumb('Situations', renderSituations),
      h('p', { class: 'eyebrow' }, random ? 'Situation au hasard' : `${sc.cat} · ${sc.niveau}`),
      h('h1', {}, random ? 'Que se passe-t-il ?' : sc.title),
      h('div', { class: 'sit-ctx' },
        ctxBlock('Le contexte', h('p', { class: 'sit-lieu' }, sc.lieu), h('p', {}, sc.appel)),
        ctxBlock('Ce que vous entendez', ...sc.raconte.map((x) => h('p', { class: 'sit-quote' }, x))),
        ctxBlock('Ce que vous constatez', ul(sc.constate)),
        ctxBlock('Vos mesures', h('dl', { class: 'lesson-defs' }, ...sc.mesures.map(([t, v]) => h('div', {}, h('dt', {}, t), h('dd', {}, v)))))),
      h('h2', {}, 'Votre bilan'),
      h('p', { class: 'lead small' }, 'Le brouillon est gardé sur le téléphone.'),
      ...areas, ok));
    requestAnimationFrame(() => areas.forEach((a) => { const t = a.querySelector('textarea'); if (t.value) grow(t); }));
  }

  function renderCorrection(id) {
    const sc = SITUATIONS.find((x) => x.id === id) || SITUATIONS[0];
    nav.situation = sc.id; nav.corrige = true; saveNav();
    const d = drafts[sc.id] || { circ: '', signes: '', gestes: '' };
    const r = grade(sc, d);
    prog.notes = prog.notes || {};
    const prev = prog.notes[sc.id]?.best;
    prog.notes[sc.id] = { best: Math.max(prev ?? 0, r.note), last: r.note };
    saveProg();
    const todo = r.items.filter((i) => i.status !== 'ok');
    const msg = r.note >= 18 ? 'Excellent bilan, complet et bien rangé.' : r.note >= 14 ? 'Bon bilan. Quelques éléments à ajouter.' : r.note >= 10 ? 'L’essentiel est là, mais il manque des éléments importants.' : 'Bilan incomplet : reprenez la structure et les points ci-dessous.';
    const pts = (i) => (i.status === 'penalty' ? `−${fmtNote(i.pts)}` : `${fmtNote(i.got)} / ${fmtNote(i.pts)}`);
    const row = (i) => h('li', { class: `crit is-${i.status}` },
      h('span', { class: 'crit-mark', 'aria-hidden': 'true' }, i.status === 'ok' ? '✓' : i.status === 'misplaced' ? '↕' : '✗'),
      h('span', { class: 'crit-txt' }, h('strong', {}, i.label),
        i.status === 'misplaced' ? h('span', {}, `Présent, mais pas dans la bonne partie (attendu : ${PART_LABELS[i.part]}). ${i.hint}`) : null,
        i.status === 'missing' || i.status === 'penalty' ? h('span', {}, i.hint) : null),
      h('span', { class: 'crit-pts' }, pts(i)));
    const groups = ['circ', 'signes', 'gestes', 'any'].map((p) => {
      const list = todo.filter((i) => i.part === p);
      return list.length ? h('div', { class: 'crit-group' }, h('p', { class: 'part' }, PART_LABELS[p]), h('ul', { class: 'crit-list' }, ...list.map(row))) : null;
    });
    const acquired = r.items.filter((i) => i.status === 'ok' && !i.penalty);
    fill(views.situation, h('div', { class: 'lesson sit' },
      crumb('Situations', renderSituations),
      h('p', { class: 'eyebrow' }, nav.random ? `${sc.cat} · ${sc.title}` : sc.title),
      h('p', { class: `score note ${noteClass(r.note)}` }, h('strong', {}, fmtNote(r.note)), ' / 20'),
      h('p', { class: 'lead' }, msg + (prev != null && r.note > prev ? ' Nouvelle meilleure note.' : '')),
      h('div', { class: 'lesson-nav' },
        h('button', { type: 'button', class: 'btn primary', onclick: () => renderCas(sc.id) }, 'Compléter'),
        nav.random ? h('button', { type: 'button', class: 'btn', onclick: startRandom }, 'Au hasard') : h('button', { type: 'button', class: 'btn', onclick: renderSituations }, 'Autres cas')),
      todo.length ? h('h2', {}, `Ce qu’il manque (${todo.length})`) : h('h2', {}, 'Rien ne manque'),
      ...groups,
      acquired.length ? accordion(`Acquis (${acquired.length})`, null, h('ul', { class: 'crit-list' }, ...acquired.map(row))) : null,
      h('h2', {}, 'Le bilan attendu'),
      h('article', { class: 'report-card example' },
        ...[['Circonstanciel', sc.modele.circ], ['Signes particuliers', sc.modele.signes], ['Gestes effectués', sc.modele.gestes]]
          .flatMap(([t, txt]) => [h('p', { class: 'part' }, t), h('pre', {}, txt)])),
      accordion('Votre bilan', null,
        ...[['Circonstanciel', d.circ], ['Signes particuliers', d.signes], ['Gestes effectués', d.gestes]]
          .flatMap(([t, txt]) => [h('p', { class: 'part' }, t), h('pre', { class: 'lesson-lines' }, txt?.trim() || '—')])),
      h('button', { type: 'button', class: 'btn danger block sit-reset', onclick: () => {
        drafts[sc.id] = { circ: '', signes: '', gestes: '' }; saveDrafts(); renderCas(sc.id);
      } }, 'Effacer et recommencer')));
  }

  return {
    show(mode) {
      if (mode === 'accueil') renderHome();
      else if (mode === 'cours') (nav.chapitre ? renderChapitre(nav.chapitre) : renderSommaire());
      else if (mode === 'quiz' && !quiz) renderThemes();
      else if (mode === 'situation') (nav.situation ? (nav.corrige ? renderCorrection(nav.situation) : renderCas(nav.situation)) : renderSituations());
    },
  };
}
