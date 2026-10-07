import { TABS, SIGNES_DETRESSE, has } from './schema.js';
import { buildReport, computeAge, expandFields, gcsTotal, isVisible, suggestions } from './report.js';

const STORAGE_KEY = 'prise-de-bilans:brouillon';
const TAB_KEY = 'prise-de-bilans:onglet';

// ---------------------------------------------------------------------------
// État (uniquement en mémoire + localStorage du téléphone, jamais envoyé)
// ---------------------------------------------------------------------------
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

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaults(), ...JSON.parse(raw) };
  } catch { /* stockage indisponible : on repart d'un bilan vide */ }
  return defaults();
}

let state = load();
let saveTimer;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignoré */ }
  }, 250);
}

// name -> liste de fonctions de mise à jour de l'affichage
const bindings = new Map();
const bind = (name, fn) => {
  if (!bindings.has(name)) bindings.set(name, []);
  bindings.get(name).push(fn);
  fn(state[name]);
};
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
  if (!silent) refresh();
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

let uid = 0;

function optButton(label, extraClass, onClick) {
  return h('button', { type: 'button', class: `opt ${extraClass || ''}`, 'aria-pressed': 'false', onclick: onClick }, label);
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
    const type = f.type === 'text' ? 'text' : f.type;
    el = h('input', {
      id,
      type,
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
  });
  return el;
}

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
    case 'eva':
      wrap = h('div', { class: 'field eva' },
        h('span', { class: 'label' }, `${f.label} (EVA /10)`),
        renderSegmented(f, Array.from({ length: 11 }, (_, i) => ({ v: String(i), l: String(i) }))));
      break;
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
  const upd = () => { total.textContent = gcsTotal(state) ? `= ${gcsTotal(state)}` : '–'; };
  ['gcs_y', 'gcs_v', 'gcs_m'].forEach((n) => bind(n, upd));
  return h('div', { class: 'field' },
    h('div', { class: 'tri' }, h('span', { class: 'label' }, 'Glasgow'), set15),
    h('div', { class: 'gcs' }, sel('gcs_y', 'Yeux', 4), sel('gcs_v', 'Verbal', 5), sel('gcs_m', 'Moteur', 6), total));
}

let suggestBox;
function renderDetresseGroup(g, section) {
  for (const f of g.fields) {
    const sd = SIGNES_DETRESSE.find((x) => x.name === f.name);
    const el = renderField(f);
    el.classList.add('sd-block');
    el.querySelector('.label').textContent = `Détresse ${sd.title.toLowerCase()}`;
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
// Onglets
// ---------------------------------------------------------------------------
const ALL_TABS = [...TABS.map((t) => ({ id: t.id, title: t.title })), { id: 'bilan', title: 'Bilan' }];
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
      panel.append(h('p', { class: 'hint', id: 'no-spe' },
        'Choisir une détresse dans l’onglet 1 pour afficher les bilans spécifiques.'));
      conditionals.push({ el: panel.querySelector('#no-spe'), item: { show: (s) => !(s.detresse || []).length } });
    }
    panels.append(panel);
  }
}

function go(i) {
  current = Math.max(0, Math.min(ALL_TABS.length - 1, i));
  ALL_TABS.forEach((t, j) => {
    document.getElementById(`tab-${t.id}`).setAttribute('aria-selected', String(j === current));
    document.getElementById(`panel-${t.id}`).hidden = j !== current;
  });
  document.getElementById(`tab-${ALL_TABS[current].id}`).scrollIntoView({ inline: 'center', block: 'nearest' });
  document.getElementById('btn-prev').disabled = current === 0;
  const next = document.getElementById('btn-next');
  next.textContent = current === ALL_TABS.length - 1 ? 'Enregistrer' : current === ALL_TABS.length - 2 ? 'Voir le bilan ›' : 'Suivant ›';
  if (ALL_TABS[current].id === 'bilan') renderReport();
  window.scrollTo({ top: 0 });
  try { localStorage.setItem(TAB_KEY, String(current)); } catch { /* ignoré */ }
}

// ---------------------------------------------------------------------------
// Mise à jour
// ---------------------------------------------------------------------------
function refresh() {
  for (const { el, item } of conditionals) el.hidden = !isVisible(item, state);
  updateSuggestions();
  if (ALL_TABS[current]?.id === 'bilan') renderReport();
  save();
}

function updateSuggestions() {
  if (!suggestBox) return;
  const list = suggestions(state);
  suggestBox.hidden = !list.length;
  suggestBox.replaceChildren(h('strong', {}, 'Valeurs anormales relevées dans les bilans :'),
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
  if (!state.histoire && !state.plainte) m.push('Circonstanciel (histoire / plainte)');
  for (const sd of SIGNES_DETRESSE) if (!(state[sd.name] || []).length) m.push(`Signes de détresse ${sd.long}`);
  if (!gcsTotal(state)) m.push('Glasgow');
  if (!state.fc) m.push('Fréquence cardiaque');
  if (!state.ta_g && !state.ta_d) m.push('Tension artérielle');
  if (!state.fr) m.push('Fréquence respiratoire');
  if (!state.sat) m.push('Saturation');
  if (!state.atcd) m.push('Antécédents');
  if (!state.traitements) m.push('Traitements');
  if (!state.allergies) m.push('Allergies');
  if (!(state.gestes || []).length && !state.gestes_autre) m.push('Gestes effectués');
  return m;
}

let lastReport;
function renderReport() {
  lastReport = buildReport(state);
  const container = document.getElementById('report-sections');
  container.replaceChildren(...lastReport.sections.map((sec) => {
    const pre = h('pre', {}, sec.text || '');
    if (!sec.text) { pre.textContent = 'Non renseigné'; pre.classList.add('empty'); }
    return h('article', { class: 'report-card' },
      h('header', {}, h('h3', {}, sec.title),
        h('button', { type: 'button', class: 'btn mini', disabled: !sec.text || undefined,
          onclick: () => copy(sec.text, `${sec.title.toLowerCase()} copié`) }, 'Copier')),
      pre);
  }));
  const miss = missingItems();
  const box = document.getElementById('missing');
  box.hidden = !miss.length;
  box.replaceChildren(h('strong', {}, 'À vérifier avant d’enregistrer :'), h('ul', {}, ...miss.map((x) => h('li', {}, x))));
}

// ---------------------------------------------------------------------------
// Export : Notes (feuille de partage), presse-papiers, fichier
// ---------------------------------------------------------------------------
let toastTimer;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
}

async function copy(text, msg = 'Copié') {
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
  toast(`${msg.charAt(0).toUpperCase()}${msg.slice(1)} ✓`);
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

// Confirmation en deux appuis (les boîtes confirm() ne s'affichent pas partout).
let resetArmed;
function reset() {
  const btn = document.getElementById('btn-new');
  if (!resetArmed) {
    btn.textContent = 'Effacer ?';
    btn.classList.add('armed');
    resetArmed = setTimeout(() => {
      resetArmed = null;
      btn.textContent = 'Nouveau';
      btn.classList.remove('armed');
    }, 3000);
    toast('Appuyer à nouveau pour effacer le bilan');
    return;
  }
  clearTimeout(resetArmed);
  resetArmed = null;
  btn.textContent = 'Nouveau';
  btn.classList.remove('armed');
  const names = [...bindings.keys()];
  state = defaults();
  names.forEach((n) => (bindings.get(n) || []).forEach((fn) => fn(state[n])));
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignoré */ }
  refresh();
  go(0);
}

// ---------------------------------------------------------------------------
// Démarrage
// ---------------------------------------------------------------------------
renderTabs();
document.getElementById('btn-prev').addEventListener('click', () => go(current - 1));
document.getElementById('btn-next').addEventListener('click', () => (current === ALL_TABS.length - 1 ? share() : go(current + 1)));
document.getElementById('btn-share').addEventListener('click', share);
document.getElementById('btn-copy-all').addEventListener('click', () => copy(buildReport(state).full, 'Bilan complet copié'));
document.getElementById('btn-new').addEventListener('click', reset);

let startTab = 0;
try { startTab = Number(localStorage.getItem(TAB_KEY)) || 0; } catch { /* ignoré */ }
refresh();
go(startTab);

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
