import { TABS, SIGNES_DETRESSE, has } from './schema.js';
import {
  buildReport, computeAge, detresseStatus, expandFields, gcsTotal, isVisible, suggestions, victimSummary,
} from './report.js';

// ---------------------------------------------------------------------------
// Bilans (un par victime), gardés uniquement dans le navigateur du téléphone.
// ---------------------------------------------------------------------------
const STORE_KEY = 'prise-de-bilans:bilans';
const OLD_KEYS = ['prise-de-bilans:brouillon', 'prise-de-bilans:onglet'];

function defaults() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return {
    date_pec: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    heure_pec: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    sat_sous: 'AA',
    gly_unite: 'mmol/L',
  };
}

function newBilan(store) {
  store.seq = (store.bilans.length ? store.seq || 0 : 0) + 1;
  return { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, n: store.seq, tab: 0, state: defaults() };
}

function loadStore() {
  let store = null;
  try { store = JSON.parse(localStorage.getItem(STORE_KEY)); } catch { /* stockage indisponible */ }
  if (!store || !Array.isArray(store.bilans) || !store.bilans.length) {
    store = { seq: 0, bilans: [] };
    const b = newBilan(store);
    try {
      // Reprise du brouillon de la version à bilan unique.
      const old = localStorage.getItem(OLD_KEYS[0]);
      if (old) {
        b.state = { ...defaults(), ...JSON.parse(old) };
        b.tab = Number(localStorage.getItem(OLD_KEYS[1])) || 0;
      }
    } catch { /* ignoré */ }
    store.bilans.push(b);
    store.activeId = b.id;
  }
  if (!store.bilans.some((b) => b.id === store.activeId)) store.activeId = store.bilans[0].id;
  return store;
}

const store = loadStore();
const activeBilan = () => store.bilans.find((b) => b.id === store.activeId);
let state = activeBilan().state;

let saveTimer;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(store));
      OLD_KEYS.forEach((k) => localStorage.removeItem(k));
    } catch { /* ignoré */ }
  }, 250);
}

// name -> fonctions de mise à jour de l'affichage
const bindings = new Map();
const bind = (name, fn) => {
  if (!bindings.has(name)) bindings.set(name, []);
  bindings.get(name).push(fn);
  fn(state[name]);
};
const rebindAll = () => bindings.forEach((fns, name) => fns.forEach((fn) => fn(state[name])));
// éléments dont la visibilité dépend de l'état
const conditionals = [];

function setValue(name, v, { silent = false } = {}) {
  if (v === '' || v === null || v === undefined || (Array.isArray(v) && !v.length)) delete state[name];
  else state[name] = v;
  if (name === 'ddn') {
    const age = computeAge(v);
    if (age !== '') setValue('age', age, { silent: true });
  }
  (bindings.get(name) || []).forEach((fn) => fn(state[name]));
  if (!silent) refresh({ animate: true });
}

// ---------------------------------------------------------------------------
// Rendu des champs
// ---------------------------------------------------------------------------
const h = (tag, attrs = {}, ...children) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null) el.append(c);
  return el;
};

// Rejoue une animation CSS sur un élément.
function play(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  el.addEventListener('animationend', () => el.classList.remove(cls), { once: true });
}

let uid = 0;

function optButton(label, extraClass, onClick) {
  const b = h('button', { type: 'button', class: `opt ${extraClass || ''}`, 'aria-pressed': 'false' }, label);
  b.addEventListener('click', () => { play(b, 'just'); onClick(); });
  return b;
}

function renderSegmented(f, opts) {
  const seg = h('div', { class: `seg${f.vertical ? ' vertical' : ''}`, role: 'group' });
  const buttons = opts.map((o) => {
    const b = optButton(o.l, o.cls, () => setValue(f.name, state[f.name] === o.v ? '' : o.v));
    b.dataset.v = o.v;
    seg.append(b);
    return b;
  });
  bind(f.name, (v) => buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === String(v)))));
  return seg;
}

function renderChecks(f) {
  const seg = h('div', { class: `seg checks${f.big ? ' big' : ''}`, role: 'group' });
  const buttons = f.options.map((o) => {
    const b = optButton(o.l, '', () => {
      let cur = [...(state[f.name] || [])];
      if (cur.includes(o.v)) cur = cur.filter((x) => x !== o.v);
      else if (o.exclusive) cur = [o.v];
      else cur = [...cur.filter((x) => !f.options.find((p) => p.v === x)?.exclusive), o.v];
      setValue(f.name, cur);
    });
    b.dataset.v = o.v;
    seg.append(b);
    return b;
  });
  bind(f.name, (v) => buttons.forEach((b) => b.setAttribute('aria-pressed', String((v || []).includes(b.dataset.v)))));
  return seg;
}

function renderInput(f, id) {
  let el;
  if (f.type === 'textarea') {
    el = h('textarea', { id, rows: 3, placeholder: f.placeholder, autocapitalize: 'sentences' });
  } else {
    el = h('input', {
      id,
      type: f.type === 'text' ? 'text' : f.type,
      placeholder: f.placeholder,
      inputmode: f.type === 'number' ? (f.step ? 'decimal' : 'numeric') : f.inputmode,
      step: f.step,
      min: f.min,
      max: f.max,
      autocomplete: 'off',
      autocapitalize: f.autocap || (f.type === 'text' ? 'sentences' : undefined),
    });
  }
  el.addEventListener('input', () => setValue(f.name, el.value));
  bind(f.name, (v) => {
    const next = v === undefined ? '' : String(v);
    if (el.value !== next) el.value = next;
    el.classList.toggle('filled', next !== '');
  });
  return el;
}

// Couleur de l'EVA : du vert (0) au rouge (10).
const evaColor = (i) => `hsl(${Math.round(140 - i * 14)} 62% 40%)`;

function renderField(f) {
  if (f.type === 'subtitle') return h('h3', {}, f.label);

  const id = `f-${f.name || 'x'}-${uid++}`;
  let wrap;

  switch (f.type) {
    case 'tri':
      wrap = h('div', { class: 'field tri' },
        h('span', { class: 'label' }, f.label),
        renderSegmented(f, [{ v: 'oui', l: 'Oui' }, { v: 'non', l: 'Non', cls: 'no' }]));
      break;
    case 'radio':
    case 'select':
      wrap = h('div', { class: 'field' }, h('span', { class: 'label' }, f.label), renderSegmented(f, f.options));
      break;
    case 'checks':
      wrap = h('div', { class: 'field' }, f.label ? h('span', { class: 'label' }, f.label) : null, renderChecks(f));
      break;
    case 'eva': {
      const seg = renderSegmented(f, Array.from({ length: 11 }, (_, i) => ({ v: String(i), l: String(i) })));
      seg.querySelectorAll('.opt').forEach((b, i) => b.style.setProperty('--eva-c', evaColor(i)));
      wrap = h('div', { class: 'field eva' }, h('span', { class: 'label' }, `${f.label} (EVA /10)`), seg);
      break;
    }
    case 'gcs':
      wrap = renderGcs();
      break;
    default: {
      const input = renderInput(f, id);
      let control = input;
      if (f.suffix) control = h('div', { class: 'with-suffix' }, input, h('span', {}, f.suffix));
      if (f.none) {
        control = h('div', { class: 'with-none' }, control,
          h('button', { type: 'button', class: 'btn mini btn-none', onclick: () => setValue(f.name, f.none) }, f.none));
      }
      wrap = h('div', { class: 'field' }, h('label', { for: id }, f.label), control);
    }
  }
  if (f.help) wrap.append(h('div', { class: 'help' }, f.help));
  if (f.show) conditionals.push({ el: wrap, item: f });
  return wrap;
}

function renderGcs() {
  const sel = (name, label, max) => {
    const s = h('select', { id: `f-${name}` }, h('option', { value: '' }, '–'),
      ...Array.from({ length: max }, (_, i) => h('option', { value: String(max - i) }, String(max - i))));
    s.addEventListener('change', () => setValue(name, s.value));
    bind(name, (v) => { s.value = v ?? ''; });
    return h('div', {}, h('label', { for: `f-${name}` }, label), s);
  };
  const total = h('div', { class: 'total' }, '–');
  const set15 = h('button', { type: 'button', class: 'btn mini', onclick: () => {
    setValue('gcs_y', '4', { silent: true });
    setValue('gcs_v', '5', { silent: true });
    setValue('gcs_m', '6');
  } }, 'Glasgow 15');
  const upd = () => {
    const t = gcsTotal(state);
    total.textContent = t ? `= ${t}` : '–';
    total.classList.toggle('full', t === 15);
    total.classList.toggle('low', !!t && t < 15);
  };
  ['gcs_y', 'gcs_v', 'gcs_m'].forEach((n) => bind(n, upd));
  return h('div', { class: 'field' },
    h('div', { class: 'tri' }, h('span', { class: 'label' }, 'Glasgow'), set15),
    h('div', { class: 'gcs' }, sel('gcs_y', 'Yeux', 4), sel('gcs_v', 'Verbal', 5), sel('gcs_m', 'Moteur', 6), total));
}

let suggestBox;
const sdBlocks = [];
function renderDetresseGroup(g, section) {
  for (const f of g.fields) {
    const sd = SIGNES_DETRESSE.find((x) => x.name === f.name);
    const el = renderField(f);
    el.classList.add('sd-block');
    el.querySelector('.label').textContent = `Détresse ${sd.long}`;
    sdBlocks.push({ el, name: f.name });
    section.append(el);
  }
  suggestBox = h('div', { class: 'suggest', hidden: true });
  section.append(suggestBox);
}

function renderGroup(g) {
  const section = h('section', { class: `group${g.spe ? ' spe' : ''}` }, h('h2', {}, g.title));
  if (g.hint) section.append(h('p', { class: 'hint' }, g.hint));
  if (g.id === 'detresses_vitales') renderDetresseGroup(g, section);
  else for (const f of expandFields(g.fields)) section.append(renderField(f));
  if (g.spe || g.show) {
    conditionals.push({ el: section, item: { show: (s) => (!g.spe || has(s, 'detresse', g.spe)) && isVisible(g, s) } });
  }
  return section;
}

// ---------------------------------------------------------------------------
// Étapes
// ---------------------------------------------------------------------------
const ALL_TABS = [...TABS.map((t) => ({ id: t.id, title: t.title })), { id: 'bilan', title: 'Bilan' }];
const TAB_DONE = {
  detresse: (s) => (s.detresse || []).length > 0,
  identite: (s) => !!s.sexe && s.age !== undefined,
  circonstances: (s) => !!(s.histoire || s.plainte),
  signes: (s) => !!s.arr_position && SIGNES_DETRESSE.every((sd) => (s[sd.name] || []).length),
  bilans: (s) => !!(gcsTotal(s) && s.fc && s.fr && s.sat),
  gestes: (s) => !!((s.gestes || []).length || s.gestes_autre),
};
let current = 0;

function renderTabs() {
  const nav = document.getElementById('tabs');
  const panels = document.getElementById('panels');
  ALL_TABS.forEach((t, i) => {
    nav.append(h('button', {
      type: 'button', class: 'tab', role: 'tab', id: `tab-${t.id}`, 'aria-controls': `panel-${t.id}`,
      onclick: () => go(i),
    }, h('span', { class: 'num' }, String(i + 1)), t.title));
  });
  for (const t of TABS) {
    const panel = h('section', { class: 'panel', id: `panel-${t.id}`, role: 'tabpanel', hidden: true });
    t.groups.forEach((g) => panel.append(renderGroup(g)));
    if (t.id === 'signes') {
      const p = h('p', { class: 'hint' }, 'Choisir une détresse à l’étape 1 pour afficher les bilans spécifiques.');
      panel.append(p);
      conditionals.push({ el: p, item: { show: (s) => !(s.detresse || []).length } });
    }
    panels.append(panel);
  }
}

function go(i, how) {
  const next = Math.max(0, Math.min(ALL_TABS.length - 1, i));
  const anim = how || (next > current ? 'from-right' : next < current ? 'from-left' : null);
  current = next;
  ALL_TABS.forEach((t, j) => {
    document.getElementById(`tab-${t.id}`).setAttribute('aria-selected', String(j === current));
    document.getElementById(`panel-${t.id}`).hidden = j !== current;
  });
  const panel = document.getElementById(`panel-${ALL_TABS[current].id}`);
  if (anim) play(panel, anim);
  const tab = document.getElementById(`tab-${ALL_TABS[current].id}`);
  const nav = document.getElementById('tabs');
  nav.scrollTo({ left: tab.offsetLeft - (nav.clientWidth - tab.clientWidth) / 2 });

  document.getElementById('btn-prev').disabled = current === 0;
  const last = current === ALL_TABS.length - 1;
  document.getElementById('btn-next').textContent = last
    ? 'Enregistrer'
    : `${ALL_TABS[current + 1].title} ›`;
  if (ALL_TABS[current].id === 'bilan') renderReport();
  window.scrollTo({ top: 0 });
  activeBilan().tab = current;
  save();
}

// ---------------------------------------------------------------------------
// Mise à jour de l'affichage
// ---------------------------------------------------------------------------
function refresh({ animate = false } = {}) {
  for (const { el, item } of conditionals) {
    const visible = isVisible(item, state);
    if (animate && visible && el.hidden) play(el, 'reveal');
    el.hidden = !visible;
  }
  for (const { el, name } of sdBlocks) {
    const v = state[name] || [];
    el.classList.toggle('is-alert', v.some((k) => k !== 'aucun'));
    el.classList.toggle('is-ok', v.includes('aucun'));
  }
  updateSuggestions();
  updateProgress();
  updateHeader();
  if (ALL_TABS[current]?.id === 'bilan') renderReport();
  save();
}

function updateProgress() {
  let done = 0;
  for (const [id, test] of Object.entries(TAB_DONE)) {
    const ok = test(state);
    if (ok) done++;
    document.getElementById(`tab-${id}`).classList.toggle('done', ok);
  }
  document.getElementById('progress-bar').style.width = `${(done / Object.keys(TAB_DONE).length) * 100}%`;
}

function victimTitle(b) {
  const { name } = victimSummary(b.state);
  return name ? `V${b.n} · ${name}` : `Victime ${b.n}`;
}

function updateHeader() {
  const b = activeBilan();
  document.getElementById('victim-label').textContent = victimTitle(b);
  const count = document.getElementById('victim-count');
  count.hidden = store.bilans.length < 2;
  count.textContent = String(store.bilans.length);
  document.getElementById('victim-dot').className = `victim-dot ${detresseStatus(state).level}`;
  document.getElementById('btn-victims').setAttribute('aria-label',
    `${victimTitle(b)}. ${store.bilans.length} bilan${store.bilans.length > 1 ? 's' : ''} en cours. Changer de victime`);
}

function updateSuggestions() {
  if (!suggestBox) return;
  const list = suggestions(state);
  suggestBox.hidden = !list.length;
  suggestBox.replaceChildren(h('strong', {}, 'Valeurs anormales relevées dans les bilans'),
    ...list.map((x) => {
      const sd = SIGNES_DETRESSE.find((g) => g.name === x.group);
      const label = sd.options.find((o) => o.v === x.v).l;
      return h('div', { class: 'row' },
        h('span', {}, `${x.why} → ${sd.title} : ${label}`),
        h('button', { type: 'button', onclick: () => {
          setValue(x.group, [...(state[x.group] || []).filter((k) => k !== 'aucun'), x.v]);
        } }, 'Cocher'));
    }));
}

function missingItems() {
  const m = [];
  if (!(state.detresse || []).length) m.push('Type de détresse');
  if (!state.sexe) m.push('Sexe');
  if (state.age === undefined) m.push('Âge');
  if (!state.histoire && !state.plainte) m.push('Circonstanciel');
  for (const sd of SIGNES_DETRESSE) if (!(state[sd.name] || []).length) m.push(`Détresse ${sd.long}`);
  if (!gcsTotal(state)) m.push('Glasgow');
  if (!state.fc) m.push('FC');
  if (!state.ta_g && !state.ta_d) m.push('TA');
  if (!state.fr) m.push('FR');
  if (!state.sat) m.push('Saturation');
  if (!state.atcd) m.push('ATCD');
  if (!state.traitements) m.push('Traitements');
  if (!state.allergies) m.push('Allergies');
  if (!(state.gestes || []).length && !state.gestes_autre) m.push('Gestes');
  return m;
}

function renderSummary() {
  const b = activeBilan();
  const v = victimSummary(state);
  const st = detresseStatus(state);
  document.getElementById('summary').replaceChildren(
    h('div', { class: 'who' },
      h('strong', {}, v.name || `Victime ${b.n}`),
      h('span', { class: 'meta' }, [v.heure, `n° ${b.n}`].filter(Boolean).join(' · '))),
    v.who || v.types.length
      ? h('div', { class: 'chips' }, v.who ? h('span', { class: 'chip' }, v.who) : null,
        ...v.types.map((t) => h('span', { class: 'chip' }, t)))
      : null,
    h('span', { class: `status ${st.level}` }, st.text));
}

// Texte d'une section, avec les lignes de détresse mises en évidence.
function reportPre(sec) {
  const pre = h('pre', {});
  if (!sec.text) {
    pre.textContent = 'Non renseigné';
    pre.classList.add('empty');
    return pre;
  }
  let alert = sec.id === 'signes' && sec.text.startsWith('SIGNES DE DÉTRESSE');
  sec.text.split('\n').forEach((line, i) => {
    if (i) pre.append('\n');
    if (!line) alert = false;
    pre.append(alert ? h('span', { class: 'alert-line' }, line) : line);
  });
  return pre;
}

function renderReport() {
  renderSummary();
  const report = buildReport(state);
  document.getElementById('report-sections').replaceChildren(...report.sections.map((sec) => {
    const btn = h('button', { type: 'button', class: 'btn mini', disabled: !sec.text || undefined }, 'Copier');
    btn.addEventListener('click', () => copy(sec.text, `${sec.title.charAt(0)}${sec.title.slice(1).toLowerCase()} copié`, btn));
    return h('article', { class: 'report-card' }, h('header', {}, h('h3', {}, sec.title), btn), reportPre(sec));
  }));
  const miss = missingItems();
  const box = document.getElementById('missing');
  box.hidden = !miss.length;
  box.replaceChildren(h('strong', {}, 'À vérifier avant d’enregistrer'), h('ul', {}, ...miss.map((x) => h('li', {}, x))));
}

// ---------------------------------------------------------------------------
// Export : Notes (feuille de partage) et presse-papiers
// ---------------------------------------------------------------------------
let toastTimer;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

async function copy(text, msg = 'Copié', btn) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = h('textarea', { readonly: true, style: 'position:fixed;opacity:0' });
    ta.value = text;
    document.body.append(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  toast(`${msg} ✓`);
  if (btn) {
    const label = btn.textContent;
    btn.textContent = 'Copié ✓';
    btn.classList.add('done');
    setTimeout(() => { btn.textContent = label; btn.classList.remove('done'); }, 1600);
  }
}

async function share() {
  const r = buildReport(state);
  if (navigator.share) {
    try {
      await navigator.share({ text: r.full });
      return;
    } catch (e) {
      if (e && e.name === 'AbortError') return;
    }
  }
  await copy(r.full, 'Bilan copié : collez-le dans une nouvelle note');
}

// Action en deux appuis (les boîtes confirm() ne s'affichent pas partout).
function twoStep(btn, armedLabel, action) {
  const label = btn.textContent;
  let timer;
  btn.addEventListener('click', () => {
    if (!timer) {
      btn.textContent = armedLabel;
      btn.classList.add('armed');
      timer = setTimeout(() => { timer = null; btn.textContent = label; btn.classList.remove('armed'); }, 3000);
      return;
    }
    clearTimeout(timer);
    timer = null;
    btn.textContent = label;
    btn.classList.remove('armed');
    action();
  });
}

// ---------------------------------------------------------------------------
// Plusieurs victimes
// ---------------------------------------------------------------------------
function switchTo(id) {
  store.activeId = id;
  const b = activeBilan();
  state = b.state;
  rebindAll();
  current = b.tab;
  refresh();
  go(b.tab, 'swap');
}

function addBilan() {
  const b = newBilan(store);
  store.bilans.push(b);
  closeSheet();
  switchTo(b.id);
  toast(`Victime ${b.n} : nouveau bilan`);
}

function deleteBilan(id) {
  const i = store.bilans.findIndex((b) => b.id === id);
  if (i < 0) return;
  const [gone] = store.bilans.splice(i, 1);
  if (!store.bilans.length) store.bilans.push(newBilan(store));
  if (gone.id === store.activeId) switchTo(store.bilans[Math.max(0, i - 1)].id);
  else refresh();
  if (!document.getElementById('sheet-backdrop').hidden) renderVictims();
  toast(`Bilan de la victime ${gone.n} supprimé`);
}

function renderVictims() {
  const list = document.getElementById('victims');
  list.replaceChildren(...store.bilans.map((b) => {
    const v = victimSummary(b.state);
    const st = detresseStatus(b.state);
    const del = h('button', { type: 'button', class: 'del', 'aria-label': `Supprimer le bilan de la victime ${b.n}` }, 'Supprimer');
    const li = h('li', { class: `victim${b.id === store.activeId ? ' active' : ''}` },
      h('button', { type: 'button', class: 'open', onclick: () => { closeSheet(); if (b.id !== store.activeId) switchTo(b.id); } },
        h('span', { class: 'line1' }, h('span', { class: 'n' }, `Victime ${b.n}`), v.name ? h('span', { class: 'name' }, v.name) : null),
        h('span', { class: 'sub' }, [v.who, v.heure, v.types.join(', ')].filter(Boolean).join(' · ') || 'Bilan vide'),
        h('span', { class: `status ${st.level}` }, st.text)),
      del);
    twoStep(del, 'Confirmer', () => {
      li.classList.add('leaving');
      setTimeout(() => deleteBilan(b.id), 260);
    });
    return li;
  }));
}

let sheetTimer;
function openSheet() {
  renderVictims();
  const bd = document.getElementById('sheet-backdrop');
  clearTimeout(sheetTimer);
  bd.hidden = false;
  requestAnimationFrame(() => requestAnimationFrame(() => bd.classList.add('open')));
  document.getElementById('btn-sheet-close').focus({ preventScroll: true });
}

function closeSheet() {
  const bd = document.getElementById('sheet-backdrop');
  if (bd.hidden) return;
  bd.classList.remove('open');
  sheetTimer = setTimeout(() => { bd.hidden = true; }, 320);
}

// ---------------------------------------------------------------------------
// Démarrage
// ---------------------------------------------------------------------------
renderTabs();
const $ = (id) => document.getElementById(id);
$('btn-prev').addEventListener('click', () => go(current - 1));
$('btn-next').addEventListener('click', () => (current === ALL_TABS.length - 1 ? share() : go(current + 1)));
$('btn-share').addEventListener('click', share);
$('btn-copy-all').addEventListener('click', (e) => copy(buildReport(state).full, 'Bilan complet copié', e.currentTarget));
$('btn-victims').addEventListener('click', openSheet);
$('btn-sheet-close').addEventListener('click', closeSheet);
$('btn-new').addEventListener('click', addBilan);
$('btn-new-bottom').addEventListener('click', addBilan);
twoStep($('btn-delete-current'), 'Confirmer la suppression', () => deleteBilan(store.activeId));
$('sheet-backdrop').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeSheet(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

current = activeBilan().tab || 0;
refresh();
go(current, 'swap');

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
