import { TABS, SYMPTOMS, SIGNES_DETRESSE, DETRESSES, has, fmtTime, joinEt, optOut } from './schema.js';

const isEmpty = (v) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
const toLines = (x) => (Array.isArray(x) ? x.filter((l) => !isEmpty(l)) : isEmpty(x) ? [] : [x]);
const NONE_RE = /^\s*aucun/i;

export function expandFields(fields) {
  return fields.flatMap((f) => (f.type === 'symptoms' ? SYMPTOMS : [f]));
}

export function isVisible(item, s) {
  return !item.show || !!item.show(s);
}

export function gcsTotal(s) {
  const y = Number(s.gcs_y), v = Number(s.gcs_v), m = Number(s.gcs_m);
  return y && v && m ? y + v + m : null;
}

export function computeAge(ddn, ref = new Date()) {
  if (!ddn) return '';
  const [y, m, d] = ddn.split('-').map(Number);
  if (!y || !m || !d) return '';
  let age = ref.getFullYear() - y;
  if (ref.getMonth() + 1 < m || (ref.getMonth() + 1 === m && ref.getDate() < d)) age--;
  return age >= 0 && age < 150 ? age : '';
}

const fmtDate = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

function fieldLines(f, s) {
  if (!f.name && f.type !== 'gcs') return [];
  if (!isVisible(f, s)) return [];
  const v = s[f.name];
  if (f.out) return toLines(f.out(v, s));

  switch (f.type) {
    case 'gcs': {
      const t = gcsTotal(s);
      if (!t) return [];
      return [t === 15 ? 'Glasgow 15' : `Glasgow ${t} (Y${s.gcs_y} - V${s.gcs_v} - M${s.gcs_m})`];
    }
    case 'tri':
      return toLines(v === 'oui' ? f.yes : v === 'non' ? f.no : null);
    case 'radio':
    case 'select': {
      const o = f.options.find((x) => x.v === v);
      return toLines(o?.out);
    }
    case 'checks': {
      if (isEmpty(v)) return [];
      const labels = v.map((k) => f.options.find((o) => o.v === k)?.l ?? k);
      return toLines(f.fmt ? f.fmt(labels) : labels.join(', '));
    }
    case 'eva':
      return isEmpty(v) ? [] : toLines(f.fmt(v));
    default: {
      if (isEmpty(v)) return [];
      const str = String(v).trim();
      if (!str) return [];
      if (f.noneOut && NONE_RE.test(str)) return [f.noneOut];
      if (f.fmt) return toLines(f.fmt(str));
      return str.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    }
  }
}

function groupLines(g, s) {
  let lines = expandFields(g.fields).flatMap((f) => fieldLines(f, s));
  if (g.out) lines = toLines(g.out(s, lines));
  if (g.tail) {
    const sd = SIGNES_DETRESSE.find((x) => x.name === g.tail);
    if (has(s, g.tail, 'aucun')) lines.push(`Pas de signes de détresse ${sd.long}`);
  }
  if (lines.length && g.heading) lines.unshift(g.heading(s));
  return lines;
}

const allGroups = () => TABS.flatMap((t) => t.groups);
const group = (id) => allGroups().find((g) => g.id === id);

// ---------------------------------------------------------------------------
// Sections du bilan
// ---------------------------------------------------------------------------
export function identiteText(s) {
  const age = s.age !== undefined && s.age !== '' ? `${s.age} ans` : '';
  const rows = [
    ['Nom', s.nom ? String(s.nom).toUpperCase() : ''],
    ['Prénom', s.prenom],
    ['Sexe', s.sexe === 'H' ? 'Homme' : s.sexe === 'F' ? 'Femme' : ''],
    ['Date de naissance', s.ddn ? fmtDate(s.ddn) : ''],
    ['Âge', age],
    ['Nationalité', s.nationalite],
    ['Pays de naissance', s.pays_naissance],
    ['Adresse', s.adresse ? String(s.adresse).replace(/\n+/g, ', ') : ''],
    ['Accréditation / dossard', s.acred],
  ];
  return rows.filter(([, v]) => !isEmpty(v)).map(([k, v]) => `${k} : ${v}`).join('\n');
}

const sentence = (str) => {
  const t = String(str).trim();
  if (!t) return '';
  return /[.!?…]$/.test(t) ? t : `${t}.`;
};

export function circonstancielText(s) {
  const out = [];
  const sexe = s.sexe === 'H' ? 'Homme' : s.sexe === 'F' ? 'Femme' : 'Victime';
  const intro = !isEmpty(s.age) ? `${sexe} de ${s.age} ans` : sexe;
  const histoire = (s.histoire || '').trim();
  const plainte = (s.plainte || '').trim().replace(/^de\s+/i, '');

  if (histoire) {
    const startsLower = /^[a-zà-ÿ]/.test(histoire);
    let first = startsLower ? `${intro} qui ${histoire}` : `${intro}. ${histoire}`;
    if (plainte) first = `${first.replace(/[.\s]+$/, '')}${startsLower ? ' et se plaint' : '. Se plaint'} de ${plainte}`;
    out.push(sentence(first));
  } else if (plainte) {
    out.push(sentence(`${intro} qui se plaint de ${plainte}`));
  } else if (s.sexe || !isEmpty(s.age)) {
    out.push(sentence(intro));
  }

  const decouverte = optOut('decouverte', s.decouverte);
  const acc = (s.accompagne || '').trim();
  if (decouverte) out.push(sentence(acc ? `${decouverte}, accompagnée de ${acc}` : decouverte));
  else if (acc) out.push(sentence(`Accompagnée de ${acc}`));

  if (s.decouverte && s.decouverte !== 'spontane') {
    const moyen = optOut('moyen', s.moyen);
    const appel = optOut('appel', s.appel);
    if (moyen || appel) out.push(sentence([moyen || 'Amenée au PSA', appel].filter(Boolean).join(' ')));
  }

  if (s.circ_autre) out.push(...String(s.circ_autre).split(/\n+/).map(sentence).filter(Boolean));
  return out.join('\n');
}

export function detresseLines(s) {
  const pos = [];
  for (const sd of SIGNES_DETRESSE) {
    const v = (s[sd.name] || []).filter((k) => k !== 'aucun');
    if (v.length) pos.push(`${sd.title} : ${v.map((k) => sd.options.find((o) => o.v === k)?.l ?? k).join(', ')}`);
  }
  if (pos.length) return ['SIGNES DE DÉTRESSE :', ...pos];
  if (SIGNES_DETRESSE.every((sd) => has(s, sd.name, 'aucun'))) return ['Pas de signe de détresse vitale'];
  return [];
}

export function arriveeText(s) {
  const parts = [s.arr_position, s.arr_conscience, s.arr_conscience !== 'inconsciente' ? s.arr_orientation : null].filter(Boolean);
  if (!parts.length) return '';
  return `À son arrivée au PSA la victime est ${joinEt(parts)}.`;
}

export function signesText(s) {
  const blocks = [];
  blocks.push(detresseLines(s));
  blocks.push(toLines(arriveeText(s)));

  // Bilans spécifiques, dans l'ordre du schéma, pour les détresses choisies.
  const selected = s.detresse || [];
  for (const g of allGroups()) {
    if (g.spe && selected.includes(g.spe) && isVisible(g, s)) blocks.push(groupLines(g, s));
  }
  if (isVisible(group('symptomes'), s)) blocks.push(groupLines(group('symptomes'), s));

  // Bilans neuro / circu / respi, puis constantes, puis ATCD.
  for (const id of ['neuro', 'circu', 'respi', 'constantes', 'mhta']) blocks.push(groupLines(group(id), s));

  return blocks.filter((b) => b.length).map((b) => b.join('\n')).join('\n\n');
}

export function gestesText(s) {
  return [...groupLines(group('gestes'), s)].join('\n');
}

// Bilan complémentaire : une ligne par série de constantes, précédée de son heure.
export function complementaireText(s) {
  const has = (v) => v !== undefined && v !== null && String(v).trim() !== '';
  return (s.surv || []).map((e) => {
    const parts = [];
    if (has(e.fc)) parts.push(`FC ${e.fc}`);
    if (has(e.ta)) parts.push(`TA ${e.ta}`);
    if (has(e.fr)) parts.push(`FR ${e.fr}`);
    if (has(e.sat)) parts.push(`Sat ${e.sat} % ${e.sat_sous === 'O2' ? 'sous O2' : 'AA'}`);
    if (has(e.gcs)) parts.push(`Glasgow ${e.gcs}`);
    if (has(e.eva)) parts.push(`Douleur ${e.eva}/10`);
    if (has(e.temp)) parts.push(`Température ${e.temp}°`);
    if (has(e.gly)) parts.push(`Glycémie ${e.gly} ${s.gly_unite || 'mmol/L'}`);
    const note = has(e.note) ? String(e.note).trim().split(/\n+/) : [];
    if (!parts.length && !note.length) return '';
    const head = has(e.heure) ? `${fmtTime(e.heure)} :` : 'Contrôle :';
    const lines = parts.length ? [`${head} ${parts.join(', ')}`, ...note] : [`${head} ${note[0]}`, ...note.slice(1)];
    return lines.join('\n');
  }).filter(Boolean).join('\n');
}

export function buildReport(s) {
  const when = [s.date_pec ? fmtDate(s.date_pec) : '', s.heure_pec ? fmtTime(s.heure_pec) : ''].filter(Boolean).join(' à ');
  const who = [s.nom ? String(s.nom).toUpperCase() : '', s.prenom].filter(Boolean).join(' ');
  const title = ['Bilan', when, who ? `– ${who}` : ''].filter(Boolean).join(' ');
  const types = (s.detresse || [])
    .map((k) => (k === 'autre' && s.detresse_autre ? s.detresse_autre : DETRESSES.find((d) => d.v === k)?.l))
    .filter(Boolean);

  const sections = [
    { id: 'identite', title: 'IDENTITÉ', text: identiteText(s) },
    { id: 'circonstanciel', title: 'CIRCONSTANCIEL', text: circonstancielText(s) },
    { id: 'signes', title: 'SIGNES PARTICULIERS', text: signesText(s) },
    { id: 'gestes', title: 'GESTES EFFECTUÉS', text: gestesText(s) },
    { id: 'complementaire', title: 'BILAN COMPLÉMENTAIRE', text: complementaireText(s) },
  ];

  const head = [title];
  if (types.length) head.push(`Détresse : ${types.join(', ')}`);
  const body = sections.filter((x) => x.text).map((x) => `${x.title}\n${x.text}`);
  return { title, sections, full: [head.join('\n'), ...body].join('\n\n') + '\n' };
}

// ---------------------------------------------------------------------------
// Suggestions de signes de détresse à partir des constantes saisies.
// ---------------------------------------------------------------------------
export function suggestions(s) {
  const out = [];
  const n = (x) => (x === undefined || x === null || x === '' ? null : Number(String(x).replace(',', '.')));
  const fc = n(s.fc), fr = n(s.fr), sat = n(s.sat);
  const sys = (str) => n(String(str || '').split('/')[0]);
  const ta = [sys(s.ta_g), sys(s.ta_d)].filter((x) => x !== null && !Number.isNaN(x));
  const gcs = gcsTotal(s);

  if (fc !== null && (fc > 120 || fc < 50)) out.push({ group: 'sd_circu', v: 'fc', why: `FC ${fc}` });
  if (ta.length && Math.min(...ta) < 90) out.push({ group: 'sd_circu', v: 'ta', why: `TA syst ${Math.min(...ta)}` });
  if (s.trc === 'sup') out.push({ group: 'sd_circu', v: 'trc', why: 'TRC sup 2 sec' });
  if (s.sueurs === 'oui') out.push({ group: 'sd_circu', v: 'sueurs', why: 'Sueurs' });
  if (s.paleur === 'oui') out.push({ group: 'sd_circu', v: 'paleur', why: 'Pâleur' });
  if (s.marbrures === 'oui') out.push({ group: 'sd_circu', v: 'marbrures', why: 'Marbrures' });
  if (fr !== null && (fr > 25 || fr < 10)) out.push({ group: 'sd_respi', v: 'fr', why: `FR ${fr}` });
  if (sat !== null && sat < 94) out.push({ group: 'sd_respi', v: 'sat', why: `Sat ${sat} %` });
  if (gcs !== null && gcs < 15) out.push({ group: 'sd_neuro', v: 'glasgow', why: `Glasgow ${gcs}` });
  if (s.pci === 'oui') out.push({ group: 'sd_neuro', v: 'pci', why: 'PCI' });
  if (s.fast === 'positif') out.push({ group: 'sd_neuro', v: 'fast', why: 'FAST positif' });
  if (s.pupilles === 'asym') out.push({ group: 'sd_neuro', v: 'pupilles', why: 'Pupilles asymétriques' });
  if (s.ost === 'non' || s.arr_orientation === 'désorientée') out.push({ group: 'sd_neuro', v: 'confusion', why: 'Désorientation' });

  return out.filter((x) => !has(s, x.group, x.v));
}

// ---------------------------------------------------------------------------
// Résumé d'une victime (liste des bilans, en-tête de l'écran Bilan).
// ---------------------------------------------------------------------------
export function detresseStatus(s) {
  const pos = SIGNES_DETRESSE.filter((sd) => (s[sd.name] || []).some((k) => k !== 'aucun'));
  if (pos.length) return { level: 'detresse', text: `Détresse ${joinEt(pos.map((sd) => sd.long))}` };
  if (SIGNES_DETRESSE.every((sd) => has(s, sd.name, 'aucun'))) return { level: 'ok', text: 'Pas de détresse vitale' };
  return { level: 'todo', text: 'Détresse à évaluer' };
}

export function victimSummary(s) {
  const name = [s.nom ? String(s.nom).toUpperCase() : '', s.prenom].filter(Boolean).join(' ');
  const who = [s.sexe === 'H' ? 'Homme' : s.sexe === 'F' ? 'Femme' : '', isEmpty(s.age) ? '' : `${s.age} ans`]
    .filter(Boolean).join(', ');
  const types = (s.detresse || [])
    .map((k) => (k === 'autre' && s.detresse_autre ? s.detresse_autre : DETRESSES.find((d) => d.v === k)?.l))
    .filter(Boolean);
  return { name, who, heure: s.heure_pec ? fmtTime(s.heure_pec) : '', types };
}
