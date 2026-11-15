// Aides à la rédaction du bilan : vérifications avant l'envoi, rappel de surveillance,
// message pour l'avis médical, propositions (circonstanciel, bilan spé), repères des
// constantes et note d'entraînement. Fonctions pures : elles ne lisent que l'état du bilan.
import { DETRESSES, SIGNES_DETRESSE, de, has, fmtTime, joinEt, optLabel, optOut } from './schema.js';
import { gcsTotal, suggestions } from './report.js';

const num = (x) => {
  if (x === undefined || x === null || String(x).trim() === '') return null;
  const n = Number(String(x).replace(',', '.'));
  return Number.isNaN(n) ? null : n;
};
const filled = (x) => x !== undefined && x !== null && String(x).trim() !== '' && !(Array.isArray(x) && !x.length);
const sys = (ta) => num(String(ta || '').split('/')[0]);
const fr = (v) => String(v).replace('.', ',');

// Glycémie en mmol/L, quelle que soit l'unité saisie.
export function glyMmol(v, unite) {
  const n = num(v);
  if (n === null) return null;
  return unite === 'g/L' ? n * 5.55 : n;
}

export const hasDetresse = (s) => SIGNES_DETRESSE.some((sd) => (s[sd.name] || []).some((k) => k !== 'aucun'));
const geste = (s, v) => has(s, 'gestes', v);
const avisNote = (s) => geste(s, 'avis') || /avis|r[ée]gul|samu|15\b|m[ée]decin|[ée]vacu/i.test(`${s.gestes_autre || ''} ${s.devenir || ''}`);

// ---------------------------------------------------------------------------
// 1. Vérifications avant l'envoi. Chaque point indique l'étape où le corriger.
// ---------------------------------------------------------------------------
export function coherence(s) {
  const out = [];
  const add = (tab, msg) => out.push({ tab, msg });
  const sel = s.detresse || [];

  for (const x of suggestions(s)) {
    const sd = SIGNES_DETRESSE.find((g) => g.name === x.group);
    add('signes', `${x.why} : signe de détresse ${sd.long} non coché.`);
  }
  if (SIGNES_DETRESSE.some((sd) => has(s, sd.name, 'aucun')) && suggestions(s).some((x) => has(s, x.group, 'aucun'))) {
    add('signes', '« Aucun » coché alors que des valeurs sont anormales.');
  }
  const deuxBras = sel.includes('thoracique') || s.fast === 'positif' || has(s, 'sd_neuro', 'fast') || has(s, 'sd_neuro', 'deficit');
  if (deuxBras && (filled(s.ta_d) !== filled(s.ta_g))) {
    add('bilans', 'Tension prise à un seul bras : comparer droite et gauche (douleur thoracique, AVC).');
  }
  const glyUtile = sel.includes('malaise') || sel.includes('intox') || sel.includes('tc')
    || s.fast === 'positif' || gcsTotal(s) !== null && gcsTotal(s) < 15 || s.ost === 'non' || s.arr_orientation === 'désorientée';
  if (glyUtile && !filled(s.gly)) add('bilans', 'Glycémie non mesurée (malaise, intoxication, trouble neurologique).');
  if (sel.includes('intox') && !filled(s.temp)) add('bilans', 'Température non mesurée pour une intoxication.');

  const sat = num(s.sat);
  if (sat !== null && sat < 94 && s.sat_sous !== 'O2' && !geste(s, 'o2')) add('gestes', `Sat ${sat} % en air ambiant : oxygène non noté dans les gestes.`);
  const g = glyMmol(s.gly, s.gly_unite);
  if (g !== null && g < 3.3 && !geste(s, 'resucrage')) add('gestes', `Glycémie ${fr(s.gly)} ${s.gly_unite || 'mmol/L'} : resucrage non noté.`);
  if (hasDetresse(s) && !avisNote(s)) add('gestes', 'Signe de détresse vitale sans avis médical noté.');
  if ((filled(s.gestes) || filled(s.gestes_autre)) && !geste(s, 'bilan_complet') && !geste(s, 'bilan_trauma')) {
    add('gestes', 'Le bilan lui-même n’est pas noté dans les gestes (bilan complet ou bilan trauma).');
  }
  if (hasDetresse(s) && !(s.surv || []).length) add('complementaire', 'Victime en détresse sans nouvelle série de constantes.');
  return out;
}

// ---------------------------------------------------------------------------
// 2. Rappel de surveillance : toutes les 5 min en détresse, sinon 10 min.
// ---------------------------------------------------------------------------
export const rappelDefaut = (s) => (hasDetresse(s) ? 5 : 10);

// Date du dernier relevé (série du bilan complémentaire, sinon bilan initial), en ms.
export function dernierReleve(s, now = new Date()) {
  const toMs = (hhmm, date) => {
    if (!hhmm) return null;
    const [H, M] = String(hhmm).split(':').map(Number);
    const d = date ? new Date(`${date}T00:00`) : new Date(now);
    d.setHours(H, M, 0, 0);
    // Une heure « dans le futur » appartient à la veille (bilan commencé avant minuit).
    if (d - now > 60_000) d.setDate(d.getDate() - 1);
    return d.getTime();
  };
  const surv = s.surv || [];
  for (let i = surv.length - 1; i >= 0; i--) {
    const t = toMs(surv[i].heure);
    if (t) return t;
  }
  return toMs(s.heure_pec, s.date_pec);
}

// État du rappel : null si désactivé, sinon { due (ms), reste (ms, négatif si en retard), minutes }.
export function rappelEtat(s, now = Date.now()) {
  const r = s.rappel;
  if (!r || !r.min) return null;
  const from = Math.max(r.from || 0, dernierReleve(s, new Date(now)) || 0);
  const due = from + r.min * 60_000;
  return { due, reste: due - now, minutes: r.min };
}

// ---------------------------------------------------------------------------
// 4. Message pour l'avis médical, à lire au téléphone.
// ---------------------------------------------------------------------------
export function avisText(s) {
  const L = [];
  const sexe = s.sexe === 'H' ? 'Homme' : s.sexe === 'F' ? 'Femme' : 'Victime';
  const types = (s.detresse || []).map((k) => (k === 'autre' && s.detresse_autre ? s.detresse_autre : DETRESSES.find((d) => d.v === k)?.l)).filter(Boolean);
  L.push(`${sexe}${filled(s.age) ? ` de ${s.age} ans` : ''}${types.length ? `, ${types.join(', ').toLowerCase()}` : ''}.`);
  const plainte = (s.plainte || '').trim().replace(/^de\s+/i, '');
  if (plainte) L.push(`Se plaint ${de(plainte)}.`);
  else if ((s.histoire || '').trim()) L.push(`${String(s.histoire).trim().replace(/^./, (c) => c.toUpperCase()).replace(/[.\s]*$/, '')}.`);

  const debut = s.th_debut ? `douleur apparue à ${s.th_debut}` : s.rs_debut ? `difficultés respiratoires depuis ${s.rs_debut}` : s.ab_debut ? `douleur apparue ${s.ab_debut}` : null;
  if (debut) L.push(`Début : ${debut}.`);
  if (s.heure_pec) L.push(`Prise en charge à ${fmtTime(s.heure_pec)}.`);

  const det = SIGNES_DETRESSE.map((sd) => {
    const v = (s[sd.name] || []).filter((k) => k !== 'aucun');
    return v.length ? `${sd.long} (${v.map((k) => sd.options.find((o) => o.v === k)?.l.toLowerCase()).join(', ')})` : null;
  }).filter(Boolean);
  if (det.length) L.push(`DÉTRESSE ${joinEt(det)}.`);
  else if (SIGNES_DETRESSE.every((sd) => has(s, sd.name, 'aucun'))) L.push('Pas de détresse vitale.');

  const c = [];
  const gcs = gcsTotal(s);
  if (gcs) c.push(gcs === 15 ? 'Glasgow 15' : `Glasgow ${gcs} (Y${s.gcs_y} V${s.gcs_v} M${s.gcs_m})`);
  if (filled(s.fc)) c.push(`FC ${s.fc}${s.fc_qual && s.fc_qual !== 'BFRS' ? ` ${s.fc_qual}` : ''}`);
  if (filled(s.ta_d) || filled(s.ta_g)) c.push(['TA', filled(s.ta_d) ? `${s.ta_d} à droite` : null, filled(s.ta_g) ? `${s.ta_g} à gauche` : null].filter(Boolean).join(' ').replace('droite ', 'droite, '));
  if (filled(s.fr)) c.push(`FR ${s.fr}`);
  if (filled(s.sat)) c.push(`Sat ${s.sat} % ${s.sat_sous === 'O2' ? 'sous O2' : 'en air ambiant'}`);
  if (filled(s.temp)) c.push(`T° ${fr(s.temp)}`);
  if (filled(s.gly)) c.push(`glycémie ${fr(s.gly)} ${s.gly_unite || 'mmol/L'}`);
  if (s.fast === 'positif') c.push('FAST positif');
  if (c.length) L.push(`Constantes : ${c.join(', ')}.`);

  const last = [...(s.surv || [])].reverse().find((e) => ['fc', 'ta', 'fr', 'sat', 'gcs'].some((k) => filled(e[k])));
  if (last) {
    const p = [filled(last.gcs) && `Glasgow ${last.gcs}`, filled(last.fc) && `FC ${last.fc}`, filled(last.ta) && `TA ${last.ta}`, filled(last.fr) && `FR ${last.fr}`, filled(last.sat) && `Sat ${last.sat} %`].filter(Boolean);
    L.push(`Dernier contrôle${last.heure ? ` à ${fmtTime(last.heure)}` : ''} : ${p.join(', ')}.`);
  }

  const mhta = [
    filled(s.atcd) && !/^\s*aucun/i.test(s.atcd) ? `ATCD : ${String(s.atcd).trim()}` : null,
    filled(s.traitements) && !/^\s*aucun/i.test(s.traitements) ? `traitement : ${String(s.traitements).trim()}` : null,
    filled(s.allergies) && !/^\s*aucun/i.test(s.allergies) ? `allergie : ${String(s.allergies).trim()}` : null,
  ].filter(Boolean);
  if (mhta.length) L.push(`${mhta.join(' ; ').replace(/^./, (x) => x.toUpperCase()).replace(/\n+/g, ', ')}.`);

  const g = (s.gestes || []).filter((v) => !['bilan_complet', 'bilan_trauma', 'surveillance', 'avis'].includes(v))
    .map((v) => `${optLabel('gestes', v).toLowerCase()}${s.gestes_h?.[v] ? ` à ${fmtTime(s.gestes_h[v])}` : ''}`);
  if (g.length) L.push(`Gestes : ${g.join(', ')}.`);
  return L.join('\n');
}

// ---------------------------------------------------------------------------
// 5. Proposition de début de circonstanciel (option).
// ---------------------------------------------------------------------------
export function circProposition(s) {
  const sel = s.detresse || [];
  const parts = [];
  if (sel.includes('malaise')) parts.push(`a fait un malaise${s.ml_contexte ? ` ${s.ml_contexte}` : ''}`);
  if (sel.includes('intox')) {
    const conso = joinEt([s.ix_alcool, s.ix_drogue].map((x) => (x || '').trim()));
    parts.push(conso ? `a consommé ${conso}` : 'a consommé de l’alcool ou des produits');
  }
  if (sel.includes('thoracique')) parts.push(`présente une douleur thoracique${s.th_debut ? ` apparue à ${s.th_debut}` : ''}${s.th_effort === 'oui' ? ' à l’effort' : ''}`);
  if (sel.includes('respi')) parts.push(`présente des difficultés respiratoires${s.rs_debut ? ` depuis ${s.rs_debut}` : ''}`);
  if (sel.includes('abdo')) parts.push(`présente une douleur abdominale${s.ab_debut ? ` ${s.ab_debut}` : ''}`);
  if (sel.includes('tc')) parts.push('s’est cogné la tête');
  if (sel.includes('trauma')) {
    const zone = [s.tr_zone, optOut('tr_cote', s.tr_cote)].filter(Boolean).join(' ');
    parts.push(zone ? `s’est blessé au ${zone}` : 's’est blessé');
  }
  if (sel.includes('plaie')) parts.push(s.pl_type === 'brulure' ? 's’est brûlé' : s.pl_type === 'morsure' ? 'a été mordu' : 's’est blessé (plaie)');
  if (!parts.length) return '';
  const fem = s.sexe === 'F';
  const txt = joinEt(parts);
  return fem ? txt.replace(/(blessé|brûlé|mordu)(?=[\s,(]|$)/g, '$1e') : txt;
}

// ---------------------------------------------------------------------------
// 6. Bilan spé suggéré d'après la plainte et l'histoire (option).
// ---------------------------------------------------------------------------
const SPE_MOTS = [
  ['thoracique', /poitrine|thora|sternum|c(œ|oe)ur/],
  ['respi', /respir|souffle|asthm|etouff|essouffl|toux/],
  ['abdo', /ventre|abdo|estomac|nombril/],
  ['tc', /\btete\b|crane|front|cogne/],
  ['trauma', /chute|tombe|entorse|genou|cheville|poignet|epaule|bras|jambe|pied|main|dos|fractur|tordu/],
  ['plaie', /plaie|coup(e|ure)|saign|brul|morsure|mordu/],
  ['malaise', /malaise|vertige|evanoui|tete qui tourne/],
  ['intox', /alcool|biere|vodka|ivre|drogue|taz|ecstasy|cannabis|joint|cocaine|mdma/],
];
export function speSuggestions(s) {
  const t = `${s.plainte || ''} ${s.histoire || ''} ${s.circ_autre || ''}`.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return SPE_MOTS.filter(([v, re]) => re.test(t) && !has(s, 'detresse', v)).map(([v]) => ({ v, l: DETRESSES.find((d) => d.v === v).l }));
}
// Fiche du Mémo Bilans Spé à rappeler pour chaque bilan spé du formulaire.
export const SPE_MEMO = { thoracique: ['thoracique', 'embolie'], respi: ['asthme', 'oap'], abdo: ['abdo'], tc: ['tc'], intox: ['intox'], trauma: ['rachis'] };

// ---------------------------------------------------------------------------
// 7. Repères des constantes (cours : FR 12-20, FC 60-100, Sat ≥ 94, TA syst ≥ 90,
//    glycémie ≥ 3,3 mmol/L, T° ≤ 37,5) et évolution par rapport au relevé précédent.
// ---------------------------------------------------------------------------
export function horsNorme(k, v, unite) {
  const n = k === 'ta' ? sys(v) : k === 'gly' ? glyMmol(v, unite) : num(v);
  if (n === null) return false;
  switch (k) {
    case 'fc': return n < 60 || n > 100;
    case 'fr': return n < 12 || n > 20;
    case 'sat': return n < 94;
    case 'ta': return n < 90 || n >= 180;
    case 'gcs': return n < 15;
    case 'eva': return n >= 7;
    case 'temp': return n > 37.5 || n < 35;
    case 'gly': return n < 3.3 || n > 11;
    default: return false;
  }
}
export function tendance(k, v, prev) {
  const a = k === 'ta' ? sys(v) : num(v);
  const b = k === 'ta' ? sys(prev) : num(prev);
  if (a === null || b === null) return '';
  return a > b ? '↑' : a < b ? '↓' : '=';
}
// Valeur de référence (bilan initial) d'une constante de série.
export function valeurInitiale(s, k) {
  switch (k) {
    case 'ta': return s.ta_d || s.ta_g;
    case 'gcs': return gcsTotal(s);
    case 'eva': return s.th_eva_repos ?? s.ab_eva_repos ?? s.tr_eva_repos ?? s.cephalees_eva;
    default: return s[k];
  }
}

// ---------------------------------------------------------------------------
// 8. Note d'entraînement d'un bilan réel, sur 20.
// ---------------------------------------------------------------------------
export function noteBilan(s) {
  const sel = s.detresse || [];
  const C = [];
  const c = (pts, label, ok, hint, tab) => C.push({ pts, label, ok: !!ok, hint, tab });
  const spePlein = (prefix) => Object.keys(s).filter((k) => k.startsWith(prefix) && filled(s[k])).length;
  const SPE_PREFIX = { malaise: 'ml_', intox: 'ix_', thoracique: 'th_', respi: 'rs_', abdo: 'ab_', tc: 'tc_', trauma: 'tr_', plaie: 'pl_', autre: 'au_' };

  c(1, 'Type de détresse choisi', sel.length, 'Choisir la ou les détresses : elles ouvrent les bilans spé.', 'detresse');
  c(1, 'Sexe et âge', s.sexe && filled(s.age), 'Le circonstanciel commence par « Homme / Femme de … ans ».', 'identite');
  c(1.5, 'Histoire ou plainte', filled(s.histoire) || filled(s.plainte), 'Dire ce qui amène la victime et de quoi elle se plaint.', 'circonstances');
  c(1, 'Arrivée jusqu’aux secours', s.decouverte, 'Comment la victime arrive : se présente, retrouvée, amenée…', 'circonstances');
  c(1, 'Situation à l’arrivée (position, conscience)', s.arr_position && s.arr_conscience, 'Position et conscience à l’arrivée au PSA.', 'signes');
  c(1.5, 'Signes de détresse évalués (neuro, respi, circu)', SIGNES_DETRESSE.every((sd) => (s[sd.name] || []).length), 'Cocher les signes de détresse ou « Aucun » pour chacune.', 'signes');
  for (const v of sel) {
    const pre = SPE_PREFIX[v];
    if (pre) c(1.5, `Bilan spé ${DETRESSES.find((d) => d.v === v).l.toLowerCase()}`, spePlein(pre) >= (v === 'autre' ? 1 : 3), 'Renseigner au moins 3 éléments du bilan spé.', 'signes');
  }
  c(1, 'Glasgow', gcsTotal(s), 'Le score de Glasgow.', 'bilans');
  c(0.5, 'OST, MS4M, PCI', filled(s.ost) && filled(s.ms4m) && filled(s.pci), 'Orientation, motricité / sensibilité, perte de connaissance.', 'bilans');
  c(0.5, 'Pupilles', s.pupilles, 'L’état des pupilles.', 'bilans');
  c(1, 'FC et qualité du pouls', filled(s.fc) && s.fc_qual, 'FC et pouls (BFRS, filant…).', 'bilans');
  const deuxBras = sel.includes('thoracique') || s.fast === 'positif';
  c(1, deuxBras ? 'TA aux deux bras' : 'Tension', deuxBras ? filled(s.ta_d) && filled(s.ta_g) : filled(s.ta_d) || filled(s.ta_g), deuxBras ? 'Douleur thoracique ou AVC : TA droite et gauche.' : 'La tension.', 'bilans');
  c(0.5, 'TRC', s.trc, 'Le temps de recoloration cutanée.', 'bilans');
  c(1, 'FR et qualité de la respiration', filled(s.fr) && s.fr_qual, 'FR et respiration (ARS…).', 'bilans');
  c(0.5, 'Saturation', filled(s.sat), 'La saturation (air ambiant ou O2).', 'bilans');
  c(0.5, 'Température', filled(s.temp), 'La température.', 'bilans');
  c(sel.includes('malaise') ? 1 : 0.5, 'Glycémie', filled(s.gly), 'La glycémie.', 'bilans');
  c(1.5, 'ATCD, traitements, allergies', filled(s.atcd) && filled(s.traitements) && filled(s.allergies), 'Les trois, même pour noter « Aucun ».', 'bilans');
  c(1, 'Gestes notés, dont le bilan', (geste(s, 'bilan_complet') || geste(s, 'bilan_trauma')), 'Noter le bilan complet ou trauma dans les gestes.', 'gestes');
  c(0.5, 'Surveillance', geste(s, 'surveillance') || (s.surv || []).length, 'Noter la surveillance.', 'gestes');
  if (hasDetresse(s)) c(1, 'Nouvelle série de constantes', (s.surv || []).length, 'Victime en détresse : recontrôler les constantes (bilan complémentaire).', 'complementaire');

  const alertes = coherence(s);
  const total = C.reduce((a, x) => a + x.pts, 0);
  const got = C.reduce((a, x) => a + (x.ok ? x.pts : 0), 0);
  const malus = Math.min(3, alertes.length * 0.5);
  const note = Math.max(0, Math.round(((got / total) * 20 - malus) * 2) / 2);
  return { note, criteres: C, alertes, malus };
}
