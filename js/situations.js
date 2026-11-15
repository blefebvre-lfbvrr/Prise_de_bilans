// Mises en situation : un contexte, l'élève rédige le bilan complet, le barème le note sur 20.
// Les cas s'appuient sur les documents du dossier PCPS (Bilan ARGOS, Mémo Bilans Spé, Mémo Urgence,
// fiche bilan papier V2). Pour ajouter un cas, copier un bloc de SITUATIONS et adapter ses critères.
//
// Un critère : { part: 'circ' | 'signes' | 'gestes' | 'any', pts, label, t: [RegExp…], hint }
//   - tous les motifs de `t` doivent se trouver dans la partie (texte mis en minuscules, sans accents) ;
//   - un élément présent mais dans une autre partie rapporte la moitié des points ;
//   - `penalty: true` retire les points si le motif est trouvé.

export const PART_LABELS = { circ: 'Circonstanciel', signes: 'Signes particuliers', gestes: 'Gestes effectués', any: 'Bilan' };

// Minuscules, sans accents, virgule décimale en point, espaces simplifiés.
export function norm(s) {
  return String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/[ \t]+/g, ' ');
}

const num = (v) => String(v).replace('.', '[.]');
const after = (keys, v) => new RegExp(`(${keys})[^0-9\\n]{0,18}${num(v)}(?![0-9])`);

// ------------------------------------------------------------------ Critères communs
function common(sc) {
  const c = [];
  const sexe = sc.sexe === 'F' ? 'femme' : 'homme';
  c.push({ part: 'circ', pts: 1.5, label: `Ouverture : « ${sc.sexe === 'F' ? 'Femme' : 'Homme'} de ${sc.age} ans… »`,
    t: [new RegExp(`^\\W*(une |un )?(jeune )?${sexe}s?\\b[^.\\n]{0,25}\\b${sc.age} ?ans`)],
    hint: 'Le circonstanciel commence par le sexe et l’âge : « H/F + âge + histoire + plainte ».' });
  c.push({ part: 'circ', pts: 1, label: 'Arrivée jusqu’aux secours', t: [/(se presente|presente|amene|retrouve|arrive|soutenu|conduit|accompagne|en chaise|en marchant|brancard)/],
    hint: 'Terminer par la façon dont la victime arrive : « se présente spontanément au PSA en marchant », « retrouvée assise au sol, amenée en chaise »…' });
  c.push({ part: 'circ', pts: 1, penalty: true, label: 'Pas de constantes dans le circonstanciel',
    t: [/\b(fc|fr|sat|spo2|tad|tag|ta|glasgow|gcs)\b ?:? ?\d/],
    hint: 'Les constantes se notent dans les signes particuliers, pas dans le circonstanciel.' });

  c.push({ part: 'signes', pts: 1, label: 'Situation à l’arrivée (position, conscience)', t: [/arriv/, /(debout|assis|allonge|couche|au sol)/, /conscient/],
    hint: 'Commencer par : « À son arrivée au PSA la victime est debout / assise, consciente et orientée. »' });
  c.push({ part: 'signes', pts: 1, label: 'Signes de détresse évalués', t: [/detresse/],
    hint: 'Noter les signes de détresse, ou leur absence : « Pas de signes de détresse circu »…' });

  const v = sc.vitals;
  if (v.gcs) c.push({ part: 'signes', pts: 0.5, label: `Glasgow ${v.gcs}`, t: [after('glasgow|gcs', v.gcs)], hint: 'Le score de Glasgow.' });
  if (v.fc) c.push({ part: 'signes', pts: 0.5, label: `FC ${v.fc}`, t: [after('fc|frequence cardiaque|pouls|pulsations', v.fc)], hint: 'La fréquence cardiaque.' });
  if (v.tad) c.push({ part: 'signes', pts: 0.5, label: `TAD ${v.tad}`, t: [new RegExp(v.tad.replace('/', ' ?/ ?'))], hint: 'La tension au bras droit.' });
  if (v.tag) c.push({ part: 'signes', pts: 0.5, label: `TAG ${v.tag}`, t: [new RegExp(v.tag.replace('/', ' ?/ ?'))], hint: 'La tension au bras gauche : on compare les deux bras.' });
  if (v.fr) c.push({ part: 'signes', pts: 0.5, label: `FR ${v.fr}`, t: [after('fr|frequence respiratoire|respiration', v.fr)], hint: 'La fréquence respiratoire.' });
  if (v.sat) c.push({ part: 'signes', pts: 0.5, label: `Sat ${v.sat} % en air ambiant`, t: [after('sat|spo2|saturation', v.sat), /(\baa\b|air ambiant)/], hint: 'La saturation, en précisant « AA » (air ambiant).' });
  if (v.temp) c.push({ part: 'signes', pts: 0.5, label: `Température ${v.temp.replace('.', ',')} °C`, t: [new RegExp(`${num(v.temp)}(?![0-9])`)], hint: 'La température.' });
  if (v.gly) c.push({ part: 'signes', pts: 0.5, label: `Glycémie ${v.gly[0].replace('.', ',')}`, t: [new RegExp(`(glyc|gly|dextro)[^\\n]{0,25}(${v.gly.map(num).join('|')})(?![0-9])`)], hint: 'La glycémie.' });

  const q = sc.qualif || [];
  const QUALIF = {
    ost: ['OST (orientation)', /(\bost\b|oriente|orientation|desoriente)/],
    ms4m: ['MS4M', /(ms4m|motricite|sensibilite)/],
    pci: ['PCI recherchée', /(pci|perte de connaissance)/],
    pupilles: ['Pupilles', /pupille/],
    fast: ['FAST', /\bfast\b/],
    pouls: ['Qualité du pouls (BFRS)', /(bfrs|bien frappe|regulier|irregulier|filant)/],
    trc: ['TRC', /(trc|recoloration)/],
    respi: ['Qualité de la respiration (ARS)', /(\bars\b|ample|superficiel|reguliere)/],
  };
  for (const k of q) c.push({ part: 'signes', pts: 0.5, label: QUALIF[k][0], t: [QUALIF[k][1]], hint: `À noter dans le bilan : ${QUALIF[k][0]}.` });

  c.push({ part: 'signes', pts: 0.5, label: 'Antécédents', t: [/(atcd|antecedent)/], hint: 'Les antécédents (ou « Pas d’ATCD »).' });
  c.push({ part: 'signes', pts: 0.5, label: 'Traitements', t: [/(traitement|ttt|\bprend\b|insuline|ventoline|kardegic|amlodipine|pilule)/], hint: 'Les traitements (ou « Pas de traitement »).' });
  c.push({ part: 'signes', pts: 0.5, label: 'Allergies', t: [/allergi/], hint: 'Les allergies (ou « Pas d’allergie »).' });

  c.push({ part: 'gestes', pts: 0.5, label: 'Bilan réalisé', t: [/bilan (complet|trauma)/], hint: 'Le bilan lui-même est un geste : « Bilan complet ».' });
  c.push({ part: 'gestes', pts: 0.5, label: 'Surveillance', t: [/surveill/], hint: 'Noter la surveillance.' });
  return c;
}

const AVIS = /(avis medical|regulation|regule|samu|centre 15|medecin|transmis|transmission|evacuation|evac)/;

// ------------------------------------------------------------------ Les cas
export const SITUATIONS = [
  {
    id: 'hypo', title: 'Malaise chez une diabétique', cat: 'Malaise', niveau: 'Facile', sexe: 'F', age: 19,
    lieu: 'Poste de secours d’un festival, 18h20.',
    appel: 'Une jeune femme entre au PSA en marchant, soutenue par une amie. Elle est pâle et dit qu’elle « ne se sent pas bien ».',
    raconte: [
      '« J’ai 19 ans. Je suis diabétique de type 1, j’ai fait mon insuline ce midi avec mon stylo. »',
      '« Je n’ai rien mangé depuis 12h, j’ai dansé tout l’après-midi. »',
      '« Depuis 20 minutes je tremble, je transpire et j’ai la tête qui tourne. »',
      '« Je n’ai pas d’allergie. »',
    ],
    constate: [
      'Vous l’installez sur une chaise : elle est consciente et orientée.',
      'Elle est pâle, couverte de sueurs, ses mains tremblent.',
      'Pas de nausées, pas de céphalées.',
    ],
    mesures: [['Neuro', 'Glasgow 15 · OST ok · MS4M conservées · pas de PCI · pupilles IRS · FAST négatif'], ['Circu', 'FC 104, bien frappé et régulier · TAD 118/72 · TAG 116/70 · TRC < 2 s'], ['Respi', 'FR 18, ample et régulière · Sat 99 % en air ambiant'], ['Autres', 'Température 36,9 °C · Glycémie 0,52 g/L (2,9 mmol/L)']],
    vitals: { gcs: 15, fc: 104, tad: '118/72', tag: '116/70', fr: 18, sat: 99, temp: '36.9', gly: ['0.52', '2.9', '52'] },
    qualif: ['ost', 'ms4m', 'pci', 'pupilles', 'fast', 'pouls', 'trc', 'respi'],
    criteres: [
      { part: 'circ', pts: 1, label: 'Plainte : tremblements, sueurs, vertiges', t: [/(trembl|sueur|transpir|tete qui tourne|vertige|malaise|ne se sent pas bien)/], hint: 'Dire de quoi la victime se plaint.' },
      { part: 'circ', pts: 1, label: 'Histoire : diabète, repas sauté, effort', t: [/(diabet|insuline|rien mange|pas mange|a jeun|danse)/], hint: 'Dire ce qui a motivé la venue au PSA : diabétique, n’a rien mangé, a dansé.' },
      { part: 'signes', pts: 1, label: 'Diabète de type 1', t: [/diabet/], hint: 'L’antécédent lié à la plainte : diabète de type 1.' },
      { part: 'signes', pts: 0.5, label: 'Insuline faite ce midi', t: [/insuline/], hint: 'Le traitement lié à la plainte : insuline au stylo, faite ce midi.' },
      { part: 'signes', pts: 1, label: 'Dernier repas', t: [/(dernier repas|rien mange|pas mange|a jeun|12 ?h)/], hint: 'Le dernier repas : à 12h.' },
      { part: 'signes', pts: 0.5, label: 'Sueurs, pâleur, tremblements', t: [/(sueur|pale|paleur|trembl)/], hint: 'Les signes observés : pâleur, sueurs, tremblements.' },
      { part: 'gestes', pts: 1.5, label: 'Resucrage', t: [/(resucr|sucre|boisson sucree|jus|morceaux)/], hint: 'Glycémie sous 0,6 g/L chez une victime consciente : resucrage (4 morceaux de sucre chez l’adulte).' },
      { part: 'any', pts: 1, label: 'Glycémie recontrôlée après 15 min', t: [/(glyc|dextro)[^\n]{0,60}(15 ?min|recontrol|controle|apres)|(controle|recontrol|nouvelle)[^\n]{0,30}glyc/], hint: 'Après un resucrage, on recontrôle la glycémie 15 minutes plus tard.' },
      { part: 'gestes', pts: 0.5, label: 'Mise au repos', t: [/(repos|assis|allonge)/], hint: 'La position : mise au repos assise.' },
    ],
    modele: {
      circ: 'Femme de 19 ans, diabétique de type 1, qui se plaint de tremblements, de sueurs et de vertiges depuis 20 min. N’a rien mangé depuis 12h et a dansé tout l’après-midi.\nLa victime se présente spontanément au poste de secours en marchant, soutenue par une amie.',
      signes: 'SIGNES DE DÉTRESSE :\nCircu : pâleur, sueurs\n\nÀ son arrivée au PSA la victime est assise, consciente et orientée.\n\nDiabétique de type 1, insuline au stylo faite ce midi\nDernier repas à 12h, a dansé tout l’après-midi\nTremblements, sueurs et vertiges depuis 20 min\nPas de nausées, pas de céphalées\n\nNeuro :\nGlasgow 15\nOST ok\nMS4M conservées\nPas de PCI\nPupilles IRS\nFAST négatif\n\nCircu :\nFC 104 BFRS\nTAD 118/72\nTAG 116/70\nTRC inf 2 sec\n\nRespi :\nFR 18 ARS\nSat 99 % AA\nPas de signes de détresse respi\n\nTempérature 36,9°\nGlycémie 0,52 g/L (2,9 mmol/L)\n\nATCD : diabète de type 1\nTraitement : insuline\nPas d’allergie',
      gestes: 'Bilan complet\nResucrage : 4 morceaux de sucre\nGlycémie recontrôlée 15 min après le resucrage\nMise au repos assise\nSurveillance',
    },
  },

  {
    id: 'thoracique', title: 'Douleur dans la poitrine', cat: 'Circulatoire', niveau: 'Moyen', sexe: 'H', age: 52,
    lieu: 'Montage d’une scène de concert, 14h05.',
    appel: 'Un technicien est amené au PSA en marchant par un collègue. Il se tient la poitrine.',
    raconte: [
      '« J’ai 52 ans. En portant des caisses de matériel, vers 13h30, j’ai eu mal au milieu de la poitrine, derrière le sternum. »',
      '« Ça serre, comme un étau. Ça ne passe pas depuis que je me suis arrêté, et ça descend dans le bras gauche et dans la mâchoire. »',
      '« J’ai envie de vomir, mais je n’ai pas vomi. »',
      '« Je fume un paquet par jour depuis 30 ans. J’ai de la tension, je prends de l’amlodipine. Mon père a fait un infarctus à 60 ans. »',
      '« Je suis allergique à la pénicilline. »',
    ],
    constate: [
      'Il est debout, conscient et orienté.',
      'Il est pâle et transpire.',
      'Douleur à 6/10 au repos, pas modifiée à la palpation ni à la respiration.',
      'Mollets souples et non douloureux.',
    ],
    mesures: [['Neuro', 'Glasgow 15 · OST ok · MS4M conservées · pas de PCI · pupilles IRS'], ['Circu', 'FC 96, bien frappé et régulier · TAD 158/94 · TAG 154/92 · TRC < 2 s'], ['Respi', 'FR 20, ample et régulière · Sat 97 % en air ambiant'], ['Autres', 'Température 36,8 °C · Glycémie 6,1 mmol/L']],
    vitals: { gcs: 15, fc: 96, tad: '158/94', tag: '154/92', fr: 20, sat: 97, temp: '36.8', gly: ['6.1', '1.1'] },
    qualif: ['ost', 'ms4m', 'pci', 'pupilles', 'pouls', 'trc', 'respi'],
    criteres: [
      { part: 'circ', pts: 1, label: 'Plainte : douleur thoracique', t: [/(douleur|mal|douloureu|gene|oppression|serre)[^\n]{0,40}(poitrine|thora|stern)|(poitrine|thora)[^\n]{0,20}(douleur|mal)/], hint: 'Dire de quoi la victime se plaint : une douleur dans la poitrine.' },
      { part: 'circ', pts: 1, label: 'Histoire : apparue en portant des caisses', t: [/(caisse|port|effort|materiel)/], hint: 'Dire dans quelles circonstances : en portant des caisses de matériel.' },
      { part: 'signes', pts: 0.5, label: 'Heure de début (13h30)', t: [/13 ?h ?30/], hint: 'L’heure d’apparition de la douleur : 13h30.' },
      { part: 'signes', pts: 1, label: 'Apparue à l’effort', t: [/(effort|caisse|en portant)/], hint: 'Préciser si la douleur est apparue à l’effort.' },
      { part: 'signes', pts: 1, label: 'Localisation rétrosternale', t: [/(retro ?stern|medio ?thora|milieu de la poitrine|sternum)/], hint: 'La région : médio-thoracique rétrosternale.' },
      { part: 'signes', pts: 1, label: 'Douleur constrictive (ça serre)', t: [/(constrict|serre|etau)/], hint: 'La qualité de la douleur : constrictive, « ça serre ».' },
      { part: 'signes', pts: 1, label: 'Intensité 6/10', t: [/6 ?\/ ?10/], hint: 'La sévérité : 6/10 au repos.' },
      { part: 'signes', pts: 1, label: 'Irradiation : bras gauche et mâchoire', t: [/irradi/, /(bras|machoire)/], hint: 'Préciser l’irradiation : bras gauche et mâchoire.' },
      { part: 'signes', pts: 0.5, label: 'Nausées', t: [/nausee/], hint: 'Les signes associés : nausées, sans vomissement.' },
      { part: 'signes', pts: 0.5, label: 'Facteur de risque : tabac', t: [/(tabac|fume|paquet)/], hint: 'Le tabac : 1 paquet par jour depuis 30 ans.' },
      { part: 'signes', pts: 0.5, label: 'Facteur de risque : hypertension', t: [/(hypertension|\bhta\b|tension)/], hint: 'L’hypertension traitée.' },
      { part: 'signes', pts: 0.5, label: 'ATCD cardiaque familial', t: [/(pere|familia)/], hint: 'Les antécédents familiaux : père, infarctus à 60 ans.' },
      { part: 'signes', pts: 0.5, label: 'Mollets', t: [/mollet/], hint: 'Mollets souples et non douloureux (pour écarter une embolie pulmonaire).' },
      { part: 'gestes', pts: 0.5, label: 'Mise au repos', t: [/(repos|demi ?assis|position de confort|allonge|assis)/], hint: 'La position : mise au repos, dans la position où il se sent le mieux.' },
      { part: 'gestes', pts: 1, label: 'Avis médical', t: [AVIS], hint: 'Une douleur thoracique constrictive qui irradie demande un avis médical.' },
    ],
    modele: {
      circ: 'Homme de 52 ans qui se plaint d’une douleur à la poitrine apparue vers 13h30 en portant des caisses de matériel, avec nausées.\nLa victime est amenée au poste de secours en marchant par un collègue.',
      signes: 'SIGNES DE DÉTRESSE :\nCircu : pâleur, sueurs\n\nÀ son arrivée au PSA la victime est debout, consciente et orientée.\n\nDouleur apparue à 13h30 à l’effort, en portant des caisses\nDouleur médio-thoracique rétrosternale, constrictive (ça serre)\nDouleur évaluée à 6/10 au repos, non modifiée à la palpation ni à la respiration\nIrradiation de la douleur dans le bras gauche et la mâchoire\nPrésence de nausées, pas de vomissement\nMollets souples et non douloureux\n\nTabac : 1 paquet par jour depuis 30 ans\nHypertension traitée\nATCD cardiaque familial : infarctus du père à 60 ans\n\nNeuro :\nGlasgow 15\nOST ok\nMS4M conservées\nPas de PCI\nPupilles IRS\n\nCircu :\nFC 96 BFRS\nTAD 158/94\nTAG 154/92\nTRC inf 2 sec\n\nRespi :\nFR 20 ARS\nSat 97 % AA\nPas de signes de détresse respi\n\nTempérature 36,8°\nGlycémie 6,1 mmol/L\n\nATCD : hypertension\nTraitement : amlodipine\nAllergie : pénicilline',
      gestes: 'Bilan complet\nMise au repos en position de confort\nAvis médical\nSurveillance',
    },
  },

  {
    id: 'cheville', title: 'Chute dans les escaliers de la scène', cat: 'Traumatisme', niveau: 'Facile', sexe: 'F', age: 27,
    lieu: 'Festival, 21h10.',
    appel: 'La sécurité vous appelle : une femme s’est blessée en descendant les marches de la scène. Vous la trouvez assise au sol et l’amenez en chaise au PSA.',
    raconte: [
      '« J’ai 27 ans. J’ai raté une marche, mon pied droit s’est tordu vers l’intérieur, j’ai entendu un craquement. »',
      '« Je ne me suis pas cogné la tête, je n’ai pas perdu connaissance. »',
      '« Je ne peux plus poser le pied par terre. »',
      '« Je ne me suis jamais blessée à cette cheville. Je prends la pilule. Pas d’allergie. »',
    ],
    constate: [
      'Au PSA, elle est assise, consciente et orientée.',
      'Cheville droite gonflée sur la face externe, sans déformation, sans plaie.',
      'Pouls pédieux perçu, chaleur conservée, mobilité et sensibilité des orteils conservées, TRC < 2 s au pied.',
      'Douleur à 3/10 au repos, 7/10 à la mobilisation, « ça lance ».',
    ],
    mesures: [['Neuro', 'Glasgow 15 · OST ok · pas de PCI'], ['Circu', 'FC 88, bien frappé et régulier · TAD 124/78'], ['Respi', 'FR 16, ample et régulière · Sat 99 % en air ambiant']],
    vitals: { gcs: 15, fc: 88, tad: '124/78', fr: 16, sat: 99 },
    qualif: ['ost', 'pci', 'pouls', 'respi'],
    criteres: [
      { part: 'circ', pts: 1, label: 'Plainte : douleur à la cheville droite', t: [/cheville/], hint: 'Dire de quoi la victime se plaint : la cheville droite.' },
      { part: 'circ', pts: 1, label: 'Mécanisme : torsion en ratant une marche', t: [/(tordu|torsion|marche|entorse|chute)/], hint: 'Dire ce qui s’est passé : pied tordu en ratant une marche.' },
      { part: 'signes', pts: 1, label: 'Bilan trauma localisé : cheville droite', t: [/cheville/, /droit/], hint: 'Préciser la zone et le côté : cheville droite.' },
      { part: 'signes', pts: 1, label: 'Gonflement', t: [/(gonfl|oedem|tumefi)/], hint: 'Le gonflement de la face externe.' },
      { part: 'signes', pts: 0.5, label: 'Pas de déformation', t: [/deform/], hint: 'Noter l’absence de déformation.' },
      { part: 'signes', pts: 0.5, label: 'Craquement entendu', t: [/craqu/], hint: 'La victime a entendu un craquement.' },
      { part: 'signes', pts: 0.5, label: 'Pouls pédieux', t: [/(pedieu|pouls distal|pouls perc)/], hint: 'Le pouls pédieux, sous la blessure.' },
      { part: 'signes', pts: 0.5, label: 'Chaleur', t: [/chaleur|chaud|froid/], hint: 'La chaleur du pied.' },
      { part: 'signes', pts: 0.5, label: 'Mobilité et sensibilité', t: [/(mobilite|motricite|sensibilite|ms4m)/], hint: 'Mobilité et sensibilité conservées.' },
      { part: 'signes', pts: 0.5, label: 'Douleur au repos (3/10)', t: [/3 ?\/ ?10/], hint: 'La douleur au repos : 3/10.' },
      { part: 'signes', pts: 0.5, label: 'Douleur à la mobilisation (7/10)', t: [/7 ?\/ ?10/], hint: 'La douleur à la mobilisation : 7/10.' },
      { part: 'signes', pts: 0.5, label: 'Appui impossible', t: [/(appui|poser le pied|marcher)/], hint: 'Elle ne peut pas poser le pied.' },
      { part: 'signes', pts: 0.5, label: 'TRC au pied', t: [/(trc|recoloration)/], hint: 'Le TRC sous la blessure.' },
      { part: 'gestes', pts: 1, label: 'Froid', t: [/(froid|glace)/], hint: 'Application de froid sur la cheville.' },
      { part: 'gestes', pts: 1, label: 'Immobilisation', t: [/(attelle|immobilis|strapping|bande)/], hint: 'Immobilisation de la cheville (attelle).' },
      { part: 'gestes', pts: 0.5, label: 'Repos, jambe surélevée', t: [/(repos|surelev|releve|assis|allonge)/], hint: 'Mise au repos, jambe surélevée.' },
    ],
    modele: {
      circ: 'Femme de 27 ans qui se plaint d’une douleur à la cheville droite après avoir raté une marche en descendant de la scène : pied tordu vers l’intérieur, craquement entendu. Pas de choc à la tête, pas de perte de connaissance.\nLa victime est retrouvée assise au sol, puis amenée en chaise au PSA après appel de la sécurité.',
      signes: 'Pas de signe de détresse vitale\n\nÀ son arrivée au PSA la victime est assise, consciente et orientée.\n\nBilan trauma cheville droite :\nGonflement de la face externe de la cheville droite\nPas de déformation\nPas de plaie\nCraquement entendu au moment de la torsion\nPouls pédieux perçu\nChaleur conservée\nMobilité et sensibilité des orteils conservées\nTRC inf 2 sec\nDouleur évaluée à 3/10 au repos et 7/10 à la mobilisation, douleur qui lance\nNe peut pas poser le pied, appui impossible\nPas d’antécédent sur cette cheville\n\nNeuro :\nGlasgow 15\nOST ok\nPas de PCI\n\nCircu :\nFC 88 BFRS\nTAD 124/78\n\nRespi :\nFR 16 ARS\nSat 99 % AA\n\nPas d’ATCD\nTraitement : pilule\nPas d’allergie',
      gestes: 'Bilan trauma\nApplication de froid\nImmobilisation par attelle\nMise au repos, jambe surélevée\nSurveillance',
    },
  },

  {
    id: 'intox', title: 'Jeune homme agité après le concert', cat: 'Alcool / drogue', niveau: 'Moyen', sexe: 'H', age: 21,
    lieu: 'Concert électro, 0h50.',
    appel: 'La sécurité vous appelle pour un jeune homme agité près de la scène. Vous le retrouvez assis au sol et l’amenez en chaise au PSA. Son ami l’accompagne.',
    raconte: [
      'Son ami : « Il a 21 ans. Depuis 21h, il a bu 6 bières. Vers 23h, il a pris un cachet d’ecstasy acheté sur place. C’est la première fois qu’il en prend. »',
      'Lui : « J’ai trop chaud, j’ai envie de vomir. » Il a vomi deux fois.',
      '« Dernier repas à 19h. Pas d’antécédent, pas de traitement, pas d’allergie. »',
    ],
    constate: [
      'Au PSA, il est assis, conscient, agité. Il ne sait plus quel jour on est.',
      'Mâchoire crispée, sueurs, peau chaude.',
    ],
    mesures: [['Neuro', 'Glasgow 14 (Y4 V4 M6) · désorienté dans le temps · MS4M conservées · pas de PCI · pupilles en mydriase, réactives et symétriques · FAST négatif'], ['Circu', 'FC 128, bien frappé et régulier · TAD 142/88 · TRC < 2 s'], ['Respi', 'FR 22, ample et régulière · Sat 98 % en air ambiant'], ['Autres', 'Température 38,4 °C · Glycémie 5,8 mmol/L']],
    vitals: { gcs: 14, fc: 128, tad: '142/88', fr: 22, sat: 98, temp: '38.4', gly: ['5.8', '1.04', '1.05'] },
    qualif: ['ost', 'ms4m', 'pci', 'pupilles', 'pouls', 'trc', 'respi'],
    criteres: [
      { part: 'circ', pts: 1, label: 'Plainte : chaleur, nausées', t: [/(chaud|chaleur|nausee|vomi|agit)/], hint: 'Dire de quoi il se plaint : il a chaud, des nausées.' },
      { part: 'circ', pts: 1, label: 'Histoire : alcool et ecstasy', t: [/(alcool|biere|drogue|ecstasy|mdma|cachet|consomm)/], hint: 'Dire ce qui a motivé l’appel : consommation d’alcool et d’ecstasy.' },
      { part: 'signes', pts: 1, label: 'Quantité d’alcool (6 bières)', t: [/(6|six) bieres?/], hint: 'Quantité : 6 bières depuis 21h.' },
      { part: 'signes', pts: 0.5, label: 'Produit : ecstasy', t: [/(ecstasy|mdma|cachet|taz)/], hint: 'Le produit : un cachet d’ecstasy.' },
      { part: 'signes', pts: 1, label: 'Heure de prise (23h)', t: [/23 ?h/], hint: 'Heure de prise : 23h.' },
      { part: 'signes', pts: 0.5, label: 'Première consommation', t: [/premiere (fois|prise|consommation)|jamais/], hint: 'Prise habituelle ? Non : première fois.' },
      { part: 'signes', pts: 0.5, label: 'Acheté sur place', t: [/(sur place|achet|revendeur)/], hint: 'Achat sur place ou auprès du revendeur habituel ?' },
      { part: 'signes', pts: 0.5, label: 'Vomissements', t: [/vomi/], hint: '2 épisodes de vomissement.' },
      { part: 'signes', pts: 0.5, label: 'Mâchoire crispée, agitation', t: [/(machoire|crisp|agit)/], hint: 'Les signes observés : agitation, mâchoire crispée.' },
      { part: 'signes', pts: 1, label: 'Détail du Glasgow (Y4 V4 M6)', t: [/y ?4[^\n]{0,6}v ?4[^\n]{0,6}m ?6/], hint: 'Glasgow inférieur à 15 : écrire le détail, « Glasgow 14 (Y4 - V4 - M6) ».' },
      { part: 'signes', pts: 0.5, label: 'Mydriase', t: [/mydriase/], hint: 'Pupilles en mydriase, réactives et symétriques.' },
      { part: 'signes', pts: 1, label: 'Détresse signalée (FC 128, Glasgow 14)', t: [/detresse (neuro|circu)|(neuro|circu) ?:[^\n]{0,40}(glasgow|frequence|fc|confus|desorient)/], hint: 'FC au-dessus de 120 et Glasgow à 14 : ce sont des signes de détresse, à mettre en tête.' },
      { part: 'signes', pts: 0.5, label: 'Dernier repas', t: [/(dernier repas|19 ?h)/], hint: 'Dernier repas à 19h.' },
      { part: 'gestes', pts: 0.5, label: 'Mise au repos', t: [/(repos|assis|allonge|pls)/], hint: 'La position : mise au repos.' },
      { part: 'gestes', pts: 1, label: 'Lutte contre la chaleur', t: [/(refroid|ventil|hydrat|deshabill|linge humide|brumis)/], hint: '38,4 °C et peau chaude : refroidir (déshabiller, ventiler, linges humides).' },
      { part: 'gestes', pts: 1, label: 'Avis médical', t: [AVIS], hint: 'Glasgow à 14 et FC à 128 après une prise de drogue : avis médical.' },
    ],
    modele: {
      circ: 'Homme de 21 ans qui a consommé de l’alcool et un cachet d’ecstasy durant la soirée et se plaint d’avoir chaud et de nausées.\nLa victime est retrouvée assise au sol, agitée, puis amenée en chaise au PSA après appel de la sécurité, accompagnée de son ami.',
      signes: 'SIGNES DE DÉTRESSE :\nNeuro : Glasgow < 15, désorientation\nCircu : fréquence cardiaque anormale\n\nÀ son arrivée au PSA la victime est assise, consciente et désorientée.\n\nLa victime a consommé 6 bières depuis 21h et 1 cachet d’ecstasy\nPrise du cachet à 23h, acheté sur place\nPremière fois qu’il consomme de l’ecstasy\n\nSe plaint d’avoir chaud et de nausées\n2 épisodes de vomissement\nDernier repas à 19h\nLa victime est agitée et présente une crispation de la mâchoire\nSueurs, peau chaude\n\nNeuro :\nGlasgow 14 (Y4 - V4 - M6)\nDésorienté dans le temps (OST non ok)\nMS4M conservées\nPas de PCI\nPupilles en mydriase réactives symétriques\nFAST négatif\n\nCircu :\nFC 128 BFRS\nTAD 142/88\nTRC inf 2 sec\n\nRespi :\nFR 22 ARS\nSat 98 % AA\n\nTempérature 38,4°\nGlycémie 5,8 mmol/L\n\nPas d’ATCD\nPas de traitement\nPas d’allergie',
      gestes: 'Bilan complet\nMise au repos allongé\nRefroidissement : déshabillage, ventilation, linges humides\nAvis médical\nSurveillance',
    },
  },

  {
    id: 'asthme', title: 'Gêne respiratoire après une danse', cat: 'Respiratoire', niveau: 'Moyen', sexe: 'F', age: 23,
    lieu: 'Tournoi de danse, 22h40.',
    appel: 'Une jeune femme se présente au PSA en marchant, accompagnée de sa sœur. Elle respire bruyamment.',
    raconte: [
      '« J’ai 23 ans, je suis asthmatique depuis l’enfance. »',
      '« La crise a commencé il y a 20 minutes, après ma chorégraphie. La salle est pleine de fumée des machines. »',
      '« J’ai pris 2 bouffées de Ventoline à 22h25, ça n’a rien changé. »',
      '« Ma dernière crise, c’était il y a un an. Je ne suis jamais allée en réanimation. Je suis allergique aux acariens. Pas d’autre traitement. »',
    ],
    constate: [
      'Elle est debout, consciente et orientée, puis s’assoit penchée en avant.',
      'Elle parle par phrases courtes, siffle à l’expiration, les muscles de son cou se creusent (tirage). Pas de cyanose.',
    ],
    mesures: [['Neuro', 'Glasgow 15 · OST ok · MS4M conservées · pas de PCI · pupilles IRS'], ['Circu', 'FC 112, bien frappé et régulier · TAD 130/80 · TRC < 2 s'], ['Respi', 'FR 28 · Sat 93 % en air ambiant'], ['Autres', 'Température 36,7 °C']],
    vitals: { gcs: 15, fc: 112, tad: '130/80', fr: 28, sat: 93, temp: '36.7' },
    qualif: ['ost', 'ms4m', 'pci', 'pupilles', 'pouls', 'trc'],
    criteres: [
      { part: 'circ', pts: 1, label: 'Plainte : difficulté à respirer', t: [/(respir|souffle|crise|asthm|essouffl)/], hint: 'Dire de quoi elle se plaint : une difficulté à respirer.' },
      { part: 'circ', pts: 1, label: 'Histoire : après la danse, salle enfumée', t: [/(danse|choregraph|effort|fumee)/], hint: 'Dire dans quelles circonstances : après sa chorégraphie, dans une salle enfumée.' },
      { part: 'signes', pts: 1, label: 'Détresse respiratoire signalée', t: [/detresse respi|respi ?:[^\n]{0,40}(sat|saturation|tirage|frequence)/], hint: 'Sat 93 %, FR 28, tirage, sifflements : détresse respiratoire, à mettre en tête.' },
      { part: 'signes', pts: 0.5, label: 'Asthme connu', t: [/asthm/], hint: 'Asthmatique connue.' },
      { part: 'signes', pts: 1, label: 'Déclencheur : effort, fumée', t: [/(effort|choregraph|danse|fumee)/], hint: 'L’événement déclencheur : effort et fumée.' },
      { part: 'signes', pts: 1, label: 'Traitement pris : Ventoline', t: [/(ventoline|bouffee)/], hint: 'Le traitement est-il pris ? 2 bouffées de Ventoline à 22h25.' },
      { part: 'signes', pts: 0.5, label: 'Sans amélioration', t: [/(sans amelioration|pas d'amelioration|aucune amelioration|n'a rien change|inefficace|sans effet)/], hint: 'Préciser : sans amélioration.' },
      { part: 'signes', pts: 0.5, label: 'Date de la dernière crise', t: [/derniere crise/], hint: 'Date de la dernière crise : il y a un an.' },
      { part: 'signes', pts: 0.5, label: 'Séjour en réanimation', t: [/(rea|reanimation)/], hint: 'Séjour en réanimation ? Jamais.' },
      { part: 'signes', pts: 0.5, label: 'Sifflements expiratoires', t: [/siffl/], hint: 'Sifflement à l’expiration.' },
      { part: 'signes', pts: 0.5, label: 'Difficulté à parler', t: [/(phrase|parle|parole)/], hint: 'Parle par phrases courtes.' },
      { part: 'signes', pts: 0.5, label: 'Tirage', t: [/tirage/], hint: 'Le tirage des muscles du cou.' },
      { part: 'gestes', pts: 1, label: 'Position assise penchée en avant', t: [/(pench|en avant)/], hint: 'Crise d’asthme : position assise, penchée en avant.' },
      { part: 'gestes', pts: 1, label: 'Oxygène', t: [/(oxyg|\bo2\b)/], hint: 'Saturation sous 94 % : oxygène.' },
      { part: 'gestes', pts: 1, label: 'Avis médical', t: [AVIS], hint: 'Crise qui ne cède pas au traitement, avec détresse : avis médical.' },
    ],
    modele: {
      circ: 'Femme de 23 ans, asthmatique connue, qui se plaint d’une difficulté à respirer depuis 20 min, apparue après sa chorégraphie dans une salle enfumée.\nLa victime se présente spontanément au poste de secours en marchant, accompagnée de sa sœur.',
      signes: 'SIGNES DE DÉTRESSE :\nRespi : saturation < 94 %, fréquence respiratoire anormale, tirage, difficulté à parler, bruits respiratoires\n\nÀ son arrivée au PSA la victime est debout, consciente et orientée, puis s’assoit penchée en avant.\n\nAsthmatique depuis l’enfance\nCrise apparue il y a 20 min après l’effort (chorégraphie), dans une salle enfumée\n2 bouffées de Ventoline prises à 22h25, sans amélioration\nDernière crise il y a un an, jamais de séjour en réanimation\nParle par phrases courtes\nSifflements à l’expiration, tirage du cou\nPas de cyanose\n\nNeuro :\nGlasgow 15\nOST ok\nMS4M conservées\nPas de PCI\nPupilles IRS\n\nCircu :\nFC 112 BFRS\nTAD 130/80\nTRC inf 2 sec\n\nRespi :\nFR 28\nSat 93 % AA\n\nTempérature 36,7°\n\nATCD : asthme\nTraitement : Ventoline\nAllergie : acariens',
      gestes: 'Bilan complet\nInstallation en position assise, penchée en avant\nOxygénothérapie\nAvis médical\nSurveillance',
    },
  },

  {
    id: 'avc', title: '« Il parle bizarrement »', cat: 'Neurologique', niveau: 'Difficile', sexe: 'H', age: 67,
    lieu: 'Fête de quartier, 21h05.',
    appel: 'Une femme amène son mari au PSA en le soutenant : « Il parle bizarrement depuis tout à l’heure. »',
    raconte: [
      'Son épouse : « Il a 67 ans. À 20h45, pendant le repas, sa bouche s’est mise de travers et il n’arrivait plus à finir ses phrases. »',
      '« Il n’est pas tombé, il n’a pas perdu connaissance. »',
      '« Il a de la tension et du cholestérol, il prend du Kardégic. Pas d’allergie. »',
    ],
    constate: [
      'Il est assis, conscient mais confus.',
      'Le côté droit de sa bouche tombe. Bras tendus, son bras droit retombe. Sa parole est difficile à comprendre.',
    ],
    mesures: [['Neuro', 'Glasgow 14 (Y4 V4 M6) · confus · faiblesse du bras droit · pas de PCI · pupilles IRS · FAST positif'], ['Circu', 'FC 84, bien frappé et régulier · TAD 172/96 · TAG 168/94 · TRC < 2 s'], ['Respi', 'FR 16, ample et régulière · Sat 96 % en air ambiant'], ['Autres', 'Température 36,7 °C · Glycémie 1,15 g/L (6,4 mmol/L)']],
    vitals: { gcs: 14, fc: 84, tad: '172/96', tag: '168/94', fr: 16, sat: 96, temp: '36.7', gly: ['1.15', '6.4'] },
    qualif: ['ms4m', 'pci', 'pupilles', 'pouls', 'trc', 'respi'],
    criteres: [
      { part: 'circ', pts: 1, label: 'Plainte : trouble de la parole', t: [/(parle|parole|bouche|phrase)/], hint: 'Dire ce qui a motivé la venue : il parle bizarrement, la bouche de travers.' },
      { part: 'circ', pts: 1, label: 'Histoire : apparu pendant le repas', t: [/(repas|20 ?h ?45|travers)/], hint: 'Dire quand et comment c’est apparu : à 20h45, pendant le repas.' },
      { part: 'signes', pts: 1, label: 'Détresse neurologique signalée', t: [/detresse neuro|neuro ?:[^\n]{0,40}(fast|deficit|glasgow|confus)/], hint: 'FAST positif et Glasgow 14 : détresse neurologique, à mettre en tête.' },
      { part: 'signes', pts: 1, label: 'FAST positif', t: [/fast (positif|\+)/], hint: 'Écrire le résultat du FAST : positif.' },
      { part: 'signes', pts: 0.5, label: 'Visage asymétrique', t: [/(bouche|visage|face|commissure|asymetri)/], hint: 'F : la bouche tombe à droite.' },
      { part: 'signes', pts: 0.5, label: 'Faiblesse du bras droit', t: [/bras/], hint: 'A : le bras droit retombe.' },
      { part: 'signes', pts: 0.5, label: 'Trouble de la parole', t: [/(parole|aphasi|parle)/], hint: 'S : parole difficile à comprendre.' },
      { part: 'signes', pts: 1.5, label: 'Heure du premier signe (20h45)', t: [/20 ?h ?45/], hint: 'T : l’heure du premier signe, 20h45 (4 h pour agir).' },
      { part: 'signes', pts: 1, label: 'Détail du Glasgow (Y4 V4 M6)', t: [/y ?4[^\n]{0,6}v ?4[^\n]{0,6}m ?6/], hint: 'Glasgow inférieur à 15 : écrire le détail.' },
      { part: 'signes', pts: 0.5, label: 'Facteurs de risque : HTA, cholestérol', t: [/(hypertension|\bhta\b|tension|cholest)/], hint: 'Les facteurs de risque cardiovasculaires.' },
      { part: 'gestes', pts: 1, label: 'Allongé strict', t: [/allonge/], hint: 'Suspicion d’AVC : position allongée stricte.' },
      { part: 'gestes', pts: 1.5, label: 'Avis médical urgent', t: [AVIS], hint: 'Suspicion d’AVC : avis médical urgent, en donnant l’heure du premier signe.' },
    ],
    modele: {
      circ: 'Homme de 67 ans qui présente depuis 20h45, pendant le repas, une bouche de travers et des difficultés à finir ses phrases. Pas de chute, pas de perte de connaissance.\nLa victime est amenée au poste de secours en marchant, soutenue par son épouse.',
      signes: 'SIGNES DE DÉTRESSE :\nNeuro : Glasgow < 15, désorientation / confusion, déficit moteur, FAST positif\n\nÀ son arrivée au PSA la victime est assise, consciente et confuse.\n\nPremiers signes à 20h45, pendant le repas\nVisage asymétrique : la commissure droite tombe\nBras droit qui retombe\nParole difficile à comprendre\n\nNeuro :\nGlasgow 14 (Y4 - V4 - M6)\nConfus\nMS4M : faiblesse du bras droit\nPas de PCI\nPupilles IRS\nFAST positif\n\nCircu :\nFC 84 BFRS\nTAD 172/96\nTAG 168/94\nTRC inf 2 sec\n\nRespi :\nFR 16 ARS\nSat 96 % AA\nPas de signes de détresse respi\n\nTempérature 36,7°\nGlycémie 1,15 g/L (6,4 mmol/L)\n\nATCD : hypertension, cholestérol\nTraitement : Kardégic\nPas d’allergie',
      gestes: 'Bilan complet\nMise au repos allongé strict\nAvis médical urgent, heure du premier signe transmise\nSurveillance',
    },
  },
];

export const criteresOf = (sc) => [...common(sc), ...sc.criteres];

// Note un bilan : { note (sur 20), score, total, items: [{ ...critère, status, got }] }
export function grade(sc, ans) {
  const parts = { circ: norm(ans.circ).trim(), signes: norm(ans.signes).trim(), gestes: norm(ans.gestes).trim() };
  parts.any = [parts.circ, parts.signes, parts.gestes].join('\n');
  let score = 0;
  let total = 0;
  const items = criteresOf(sc).map((c) => {
    const src = parts[c.part];
    const found = c.t.every((r) => r.test(src));
    if (c.penalty) {
      const got = found ? -c.pts : 0;
      score += got;
      return { ...c, status: found ? 'penalty' : 'ok', got };
    }
    total += c.pts;
    if (found) { score += c.pts; return { ...c, status: 'ok', got: c.pts }; }
    if (c.part !== 'any' && c.t.every((r) => r.test(parts.any))) {
      score += c.pts / 2;
      return { ...c, status: 'misplaced', got: c.pts / 2 };
    }
    return { ...c, status: 'missing', got: 0 };
  });
  const note = Math.max(0, Math.min(20, Math.round((score / total) * 40) / 2));
  return { note, score, total, items };
}
