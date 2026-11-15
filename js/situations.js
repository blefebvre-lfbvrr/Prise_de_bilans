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
      { part: 'signes', pts: 1, label: 'Localisation rétrosternale', t: [/(retro[ -]?stern|medio[ -]?thora|milieu de la poitrine|sternum)/], hint: 'La région : médio-thoracique rétrosternale.' },
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
    id: 'intox', title: 'Jeune homme agité après le concert', cat: 'Intoxication', niveau: 'Moyen', sexe: 'H', age: 21,
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
  {
    id: 'convulsion', title: 'Tombé d’un coup devant la scène', cat: 'Neurologique', niveau: 'Moyen', sexe: 'H', age: 22,
    lieu: 'Festival, 15h55.',
    appel: 'La sécurité vous appelle : un jeune homme est tombé d’un coup devant la scène et a été secoué. Vous le retrouvez allongé au sol et l’amenez en brancard au PSA. Son ami l’accompagne.',
    raconte: [
      'Son ami : « Il a 22 ans, il est épileptique. Ce matin, il a oublié de prendre sa Dépakine. »',
      '« Vers 15h50, pendant les flashs des lumières, il est tombé d’un coup, il est devenu tout raide puis il a été secoué pendant environ 2 minutes. Il ne s’est pas cogné la tête. »',
      '« Sa dernière crise, c’était il y a 6 mois. Il n’a rien bu, rien pris. Pas d’allergie. »',
    ],
    constate: [
      'Au PSA, il est allongé, conscient mais somnolent, il ne sait pas où il est.',
      'Morsure sur le côté de la langue. Son pantalon est mouillé : perte d’urine.',
      'Pas de bosse ni de plaie à la tête.',
    ],
    mesures: [['Neuro', 'Glasgow 14 (Y4 V4 M6) · désorienté · MS4M conservées · PCI pendant la crise · pupilles IRS · FAST négatif'], ['Circu', 'FC 92, bien frappé et régulier · TAD 128/76 · TRC < 2 s'], ['Respi', 'FR 18, ample et régulière · Sat 97 % en air ambiant'], ['Autres', 'Température 37,2 °C · Glycémie 1,02 g/L (5,7 mmol/L)']],
    vitals: { gcs: 14, fc: 92, tad: '128/76', fr: 18, sat: 97, temp: '37.2', gly: ['1.02', '5.7'] },
    qualif: ['ost', 'ms4m', 'pci', 'pupilles', 'pouls', 'trc', 'respi'],
    criteres: [
      { part: 'circ', pts: 1, label: 'Plainte : crise convulsive', t: [/(crise|convuls|secoue|tombe)/], hint: 'Dire ce qui s’est passé : chute brutale et convulsions.' },
      { part: 'circ', pts: 1, label: 'Histoire : épileptique, traitement oublié', t: [/(epilep|oubli|depakine|traitement)/], hint: 'Le contexte : épileptique connu qui a oublié son traitement.' },
      { part: 'signes', pts: 1, label: 'Détresse neurologique signalée', t: [/detresse neuro|neuro ?:[^\n]{0,40}(glasgow|desorient|confus|somnol)/], hint: 'Glasgow 14 et désorientation : détresse neurologique, à mettre en tête.' },
      { part: 'signes', pts: 1, label: 'Heure de la crise (15h50)', t: [/15 ?h ?50/], hint: 'L’heure de la crise : 15h50.' },
      { part: 'signes', pts: 1, label: 'Durée de la crise (2 min)', t: [/(2|deux) ?min/], hint: 'La durée : environ 2 minutes (au-delà de 5 min : état de mal convulsif).' },
      { part: 'signes', pts: 0.5, label: 'Nombre de crises', t: [/(une seule|1 seule|unique|premiere crise de la journee|nombre)/], hint: 'Le nombre de crises : une seule.' },
      { part: 'signes', pts: 1, label: 'Morsure de la langue', t: [/morsure/], hint: 'Morsure latérale de la langue.' },
      { part: 'signes', pts: 1, label: 'Perte d’urine', t: [/urin/], hint: 'Perte d’urine.' },
      { part: 'signes', pts: 0.5, label: 'Épileptique connu', t: [/epilep/], hint: 'Épileptique connu.' },
      { part: 'signes', pts: 1, label: 'Traitement non pris ce jour', t: [/(oubli|pas pris|non pris)/], hint: 'Traitement pris ce jour ? Non, oublié ce matin.' },
      { part: 'signes', pts: 0.5, label: 'Déclencheur : flashs lumineux', t: [/(flash|lumiere|strobo)/], hint: 'L’événement déclencheur : les flashs lumineux.' },
      { part: 'signes', pts: 0.5, label: 'Date de la dernière crise', t: [/derniere crise/], hint: 'Date de la dernière crise : il y a 6 mois.' },
      { part: 'signes', pts: 0.5, label: 'Pas de choc à la tête', t: [/(tete|tc|traumatisme cranien)/], hint: 'Signes de TC : pas de choc à la tête.' },
      { part: 'signes', pts: 1, label: 'Détail du Glasgow (Y4 V4 M6)', t: [/y ?4[^\n]{0,6}v ?4[^\n]{0,6}m ?6/], hint: 'Glasgow inférieur à 15 : écrire le détail.' },
      { part: 'gestes', pts: 1, label: 'Position latérale', t: [/(pls|lateral)/], hint: 'Phase de récupération, victime somnolente : position latérale.' },
      { part: 'gestes', pts: 1, label: 'Avis médical', t: [AVIS], hint: 'Crise avec traitement non pris et désorientation persistante : avis médical.' },
    ],
    modele: {
      circ: 'Homme de 22 ans, épileptique connu, qui a fait une crise convulsive devant la scène après avoir oublié son traitement ce matin.\nLa victime est retrouvée allongée au sol, puis amenée en brancard au PSA après appel de la sécurité, accompagnée de son ami.',
      signes: 'SIGNES DE DÉTRESSE :\nNeuro : Glasgow < 15, désorientation\n\nÀ son arrivée au PSA la victime est allongée, consciente, somnolente et désorientée.\n\nUne seule crise à 15h50, pendant les flashs lumineux\nChute brutale, phase tonique puis secousses pendant environ 2 min\nPCI pendant la crise\nMorsure latérale de la langue\nPerte d’urine\nPas de choc à la tête\nÉpileptique connu, traitement oublié ce matin (pas pris ce jour)\nDernière crise il y a 6 mois\nPas d’alcool, pas de drogue\n\nNeuro :\nGlasgow 14 (Y4 - V4 - M6)\nDésorienté (OST non ok)\nMS4M conservées\nPupilles IRS\nFAST négatif\n\nCircu :\nFC 92 BFRS\nTAD 128/76\nTRC inf 2 sec\n\nRespi :\nFR 18 ARS\nSat 97 % AA\n\nTempérature 37,2°\nGlycémie 1,02 g/L (5,7 mmol/L)\n\nATCD : épilepsie\nTraitement : Dépakine\nPas d’allergie',
      gestes: 'Bilan complet\nMise en position latérale\nAvis médical\nSurveillance',
    },
  },

  {
    id: 'meningite', title: 'Mal de tête au camping', cat: 'Neurologique', niveau: 'Difficile', sexe: 'F', age: 19,
    lieu: 'Camping d’un festival, 11h10.',
    appel: 'Deux amies amènent une jeune femme au PSA en chaise depuis le camping. Elle garde les yeux fermés.',
    raconte: [
      '« J’ai 19 ans. J’ai mal à la tête depuis hier soir, de plus en plus fort. »',
      '« J’ai vomi deux fois ce matin, d’un coup, sans prévenir. La lumière me fait mal aux yeux. »',
      'Son amie : « Une fille de notre groupe a été hospitalisée hier pour une méningite. »',
      '« Pas d’antécédent, je prends la pilule. Pas d’allergie. »',
    ],
    constate: [
      'Au PSA, elle s’allonge en chien de fusil. Consciente et orientée.',
      'Elle ne peut pas baisser la tête : nuque raide.',
      'Petites taches violacées sur les jambes qui ne s’effacent pas quand on appuie dessus avec un verre.',
    ],
    mesures: [['Neuro', 'Glasgow 15 · OST ok · MS4M conservées · pas de PCI · pupilles IRS'], ['Circu', 'FC 118, bien frappé et régulier · TAD 104/62 · TRC 3 s'], ['Respi', 'FR 22, ample et régulière · Sat 97 % en air ambiant'], ['Autres', 'Température 39,4 °C · Glycémie 5,4 mmol/L']],
    vitals: { gcs: 15, fc: 118, tad: '104/62', fr: 22, sat: 97, temp: '39.4', gly: ['5.4', '0.97'] },
    qualif: ['ost', 'ms4m', 'pci', 'pupilles', 'pouls', 'trc', 'respi'],
    criteres: [
      { part: 'circ', pts: 1, label: 'Plainte : céphalées', t: [/(cephal|mal (a|de) (la )?tete)/], hint: 'Dire de quoi elle se plaint : maux de tête.' },
      { part: 'circ', pts: 1, label: 'Histoire : depuis hier soir, vomissements', t: [/(hier|vomi|aggrav)/], hint: 'Dire depuis quand et ce qui inquiète : céphalées depuis hier soir, vomissements.' },
      { part: 'signes', pts: 1, label: 'Raideur de la nuque', t: [/(raideur|nuque)/], hint: 'Raideur de la nuque : ne peut pas baisser la tête.' },
      { part: 'signes', pts: 1, label: 'Photophobie', t: [/(photophob|lumiere)/], hint: 'Photophobie : la lumière fait mal.' },
      { part: 'signes', pts: 1, label: 'Vomissements en jet', t: [/en jet/], hint: 'Vomissements en jet (2 fois).' },
      { part: 'signes', pts: 0.5, label: 'Position en chien de fusil', t: [/chien de fusil/], hint: 'Position spontanée en chien de fusil.' },
      { part: 'signes', pts: 1.5, label: 'Purpura', t: [/purpura/], hint: 'Taches qui ne s’effacent pas à la vitropression : purpura. C’est une urgence.' },
      { part: 'signes', pts: 0.5, label: 'Vitropression', t: [/vitropression/], hint: 'Préciser : ne s’efface pas à la vitropression.' },
      { part: 'signes', pts: 1, label: 'Cas contact', t: [/(cas contact|contact|meningite)/], hint: 'Cas contact : une amie hospitalisée pour méningite.' },
      { part: 'signes', pts: 0.5, label: 'Fièvre', t: [/(fievre|hyperthermie)/], hint: 'Nommer la fièvre : 39,4 °C.' },
      { part: 'gestes', pts: 1.5, label: 'Protection : EPI, masque', t: [/(epi|masque)/], hint: 'Suspicion de méningite : EPI (gants, masque, lunettes…) pour l’équipe, masque à la victime.' },
      { part: 'any', pts: 0.5, label: 'Purpura entouré', t: [/entour/], hint: 'Entourer les taches de purpura au stylo pour suivre leur extension.' },
      { part: 'gestes', pts: 1.5, label: 'Avis médical urgent', t: [AVIS], hint: 'Fièvre + purpura : avis médical en urgence.' },
    ],
    modele: {
      circ: 'Femme de 19 ans qui se plaint de céphalées depuis hier soir, de plus en plus fortes, avec vomissements ce matin.\nLa victime est amenée au PSA en chaise depuis le camping par deux amies.',
      signes: 'SIGNES DE DÉTRESSE :\nCircu : TRC allongé, fréquence cardiaque élevée\n\nÀ son arrivée au PSA la victime est assise, consciente et orientée, puis s’allonge en chien de fusil.\n\nCéphalées depuis hier soir\n2 vomissements en jet ce matin\nPhotophobie\nRaideur de la nuque\nPurpura sur les jambes, ne s’efface pas à la vitropression\nFièvre à 39,4°\nCas contact : une amie hospitalisée hier pour une méningite\n\nNeuro :\nGlasgow 15\nOST ok\nMS4M conservées\nPas de PCI\nPupilles IRS\n\nCircu :\nFC 118 BFRS\nTAD 104/62\nTRC 3 sec\n\nRespi :\nFR 22 ARS\nSat 97 % AA\n\nTempérature 39,4°\nGlycémie 5,4 mmol/L\n\nPas d’ATCD\nTraitement : pilule\nPas d’allergie',
      gestes: 'Bilan complet\nEPI pour l’équipe, masque à la victime\nPurpura entouré au stylo\nMise au repos allongée\nAvis médical urgent\nSurveillance',
    },
  },

  {
    id: 'tc', title: 'Choc contre une barre de structure', cat: 'Traumatisme', niveau: 'Moyen', sexe: 'H', age: 34,
    lieu: 'Montage d’un festival, 10h40.',
    appel: 'Un technicien se présente au PSA en marchant, accompagné d’un collègue. Il se tient le front.',
    raconte: [
      'Le collègue : « Il a 34 ans. Vers 10h20, il s’est redressé sous une barre de la structure et s’est cogné le front. Il est tombé et n’a pas répondu pendant quelques secondes. »',
      'Lui : « Je ne me souviens pas du choc. J’ai mal à la tête, 5 sur 10, et envie de vomir. J’ai vomi une fois. »',
      '« Pas de problème de vue. Pas d’antécédent, pas de traitement, pas d’allergie. »',
    ],
    constate: [
      'Il est debout, conscient et orienté.',
      'Bosse sur le front à droite, douloureuse à la palpation. Pas de plaie, pas de déformation du crâne.',
      'Pas de saignement du nez ni des oreilles. Pas de douleur de la nuque.',
    ],
    mesures: [['Neuro', 'Glasgow 15 · OST ok · MS4M conservées · pupilles IRS'], ['Circu', 'FC 84, bien frappé et régulier · TAD 136/82 · TRC < 2 s'], ['Respi', 'FR 16, ample et régulière · Sat 98 % en air ambiant'], ['Autres', 'Température 36,8 °C · Glycémie 1,05 g/L']],
    vitals: { gcs: 15, fc: 84, tad: '136/82', fr: 16, sat: 98, temp: '36.8', gly: ['1.05', '5.8'] },
    qualif: ['ost', 'ms4m', 'pupilles', 'pouls', 'trc', 'respi'],
    criteres: [
      { part: 'circ', pts: 1, label: 'Plainte : choc à la tête', t: [/(tete|front|cogne|choc)/], hint: 'Dire ce qui s’est passé : choc du front contre une barre.' },
      { part: 'circ', pts: 1, label: 'Histoire : chute, PCI brève', t: [/(pci|perte de connaissance|tombe|chute|n'a pas repondu)/], hint: 'La chute et la perte de connaissance brève.' },
      { part: 'signes', pts: 1.5, label: 'PCI de quelques secondes', t: [/(pci|perte de connaissance)[^\n]{0,40}(second|breve|courte)/], hint: 'PCI de quelques secondes : la préciser, c’est ce qui impose l’avis médical.' },
      { part: 'signes', pts: 1, label: 'Amnésie du choc', t: [/(amnesi|ne se souvient)/], hint: 'Amnésie de l’événement.' },
      { part: 'signes', pts: 0.5, label: 'Heure du choc (10h20)', t: [/10 ?h ?20/], hint: 'L’heure du choc : 10h20.' },
      { part: 'signes', pts: 0.5, label: 'Céphalées 5/10', t: [/5 ?\/ ?10/], hint: 'Céphalées évaluées à 5/10.' },
      { part: 'signes', pts: 0.5, label: 'Nausées et vomissement', t: [/nausee/, /vomi/], hint: 'Nausées et 1 vomissement.' },
      { part: 'signes', pts: 1, label: 'Bosse frontale droite', t: [/(bosse|hematome|tumefaction)/], hint: 'La lésion : bosse frontale droite.' },
      { part: 'signes', pts: 0.5, label: 'Pas de déformation (embarrure)', t: [/(deformation|embarrure)/], hint: 'Pas de déformation du crâne.' },
      { part: 'signes', pts: 0.5, label: 'Épistaxis, otorragie', t: [/(epistaxis|otorragie|saignement (du nez|des oreilles))/], hint: 'Pas d’épistaxis ni d’otorragie.' },
      { part: 'signes', pts: 0.5, label: 'Troubles de la vision', t: [/(vision|vue)/], hint: 'Pas de trouble de la vision.' },
      { part: 'signes', pts: 0.5, label: 'Nuque', t: [/(nuque|rachis|cervical)/], hint: 'Pas de douleur de la nuque.' },
      { part: 'gestes', pts: 1, label: 'Froid sur la bosse', t: [/(froid|glace)/], hint: 'Application de froid sur la bosse.' },
      { part: 'gestes', pts: 1, label: 'Avis médical', t: [AVIS], hint: 'Traumatisme crânien avec PCI : avis médical.' },
    ],
    modele: {
      circ: 'Homme de 34 ans qui s’est cogné le front contre une barre de la structure, puis est tombé avec une perte de connaissance de quelques secondes.\nLa victime se présente au PSA en marchant, accompagnée d’un collègue.',
      signes: 'Pas de signe de détresse vitale\n\nÀ son arrivée au PSA la victime est debout, consciente et orientée.\n\nChoc du front contre une barre à 10h20\nPCI de quelques secondes\nAmnésie du choc\nCéphalées évaluées à 5/10\nNausées, 1 vomissement\nBosse frontale droite, douloureuse à la palpation\nPas de plaie, pas de déformation du crâne\nPas d’épistaxis, pas d’otorragie\nPas de trouble de la vision\nPas de douleur de la nuque\n\nNeuro :\nGlasgow 15\nOST ok\nMS4M conservées\nPupilles IRS\n\nCircu :\nFC 84 BFRS\nTAD 136/82\nTRC inf 2 sec\n\nRespi :\nFR 16 ARS\nSat 98 % AA\n\nTempérature 36,8°\nGlycémie 1,05 g/L\n\nPas d’ATCD\nPas de traitement\nPas d’allergie',
      gestes: 'Bilan complet\nApplication de froid sur la bosse\nMise au repos\nAvis médical\nSurveillance',
    },
  },

  {
    id: 'oap', title: 'Essoufflé après le repas', cat: 'Respiratoire', niveau: 'Difficile', sexe: 'H', age: 78,
    lieu: 'Repas de la fête de village, 21h40.',
    appel: 'Une femme vient chercher les secours : son mari a du mal à respirer à table. Vous le trouvez assis et l’amenez en chaise au PSA.',
    raconte: [
      'Son épouse : « Il a 78 ans. Depuis une demi-heure, il respire mal et il tousse. Il a mangé de la choucroute et beaucoup de charcuterie. »',
      '« Il a fait un infarctus il y a 5 ans. Il prend du Kardégic et du Lasilix. Pas d’allergie. »',
      'Lui, par mots : « Pas… couché… j’étouffe. »',
    ],
    constate: [
      'Au PSA, il est assis, conscient et orienté. Il refuse de s’allonger.',
      'Il parle par mots, tousse, de la mousse rosée sort de ses lèvres.',
      'On entend des crépitements quand il respire. Sueurs.',
    ],
    mesures: [['Neuro', 'Glasgow 15 · OST ok · MS4M conservées · pas de PCI · pupilles IRS'], ['Circu', 'FC 108, bien frappé et régulier · TAD 178/98 · TAG 174/96 · TRC < 2 s'], ['Respi', 'FR 30, superficielle · Sat 89 % en air ambiant'], ['Autres', 'Température 36,6 °C']],
    vitals: { gcs: 15, fc: 108, tad: '178/98', tag: '174/96', fr: 30, sat: 89, temp: '36.6' },
    qualif: ['ost', 'ms4m', 'pci', 'pupilles', 'pouls', 'trc'],
    criteres: [
      { part: 'circ', pts: 1, label: 'Plainte : difficulté à respirer', t: [/(respir|souffle|etouff|essouffl)/], hint: 'Dire de quoi il se plaint : une difficulté à respirer.' },
      { part: 'circ', pts: 1, label: 'Histoire : après un repas salé', t: [/(repas|mange|table)/], hint: 'Dire dans quelles circonstances : à table, après un repas.' },
      { part: 'signes', pts: 1.5, label: 'Détresse respiratoire signalée', t: [/detresse respi|respi ?:[^\n]{0,40}(sat|saturation|frequence|mousse|parler)/], hint: 'Sat 89 %, FR 30, parle par mots : détresse respiratoire, à mettre en tête.' },
      { part: 'signes', pts: 1, label: 'Mousse aux lèvres', t: [/mousse/], hint: 'Mousse rosée aux lèvres.' },
      { part: 'signes', pts: 1, label: 'Crépitements', t: [/(crepit|rale)/], hint: 'Crépitements à la respiration.' },
      { part: 'signes', pts: 0.5, label: 'Toux', t: [/tou(x|sse)/], hint: 'Toux.' },
      { part: 'signes', pts: 1, label: 'Repas riche en sel', t: [/(sel|sale|charcut|choucroute)/], hint: 'Repas riche en sel : choucroute, charcuterie.' },
      { part: 'signes', pts: 1, label: 'ATCD cardiaque : infarctus', t: [/(infarctus|cardiaque)/], hint: 'Antécédent cardiaque : infarctus il y a 5 ans.' },
      { part: 'signes', pts: 0.5, label: 'Ne supporte pas d’être allongé', t: [/(allonge|couche)/], hint: 'Refuse de s’allonger : il étouffe couché.' },
      { part: 'signes', pts: 0.5, label: 'Difficulté à parler', t: [/(par mots|parle|parole)/], hint: 'Parle par mots.' },
      { part: 'gestes', pts: 1.5, label: 'Assis, jambes pendantes', t: [/jambes pendantes/], hint: 'OAP : position assise, jambes pendantes.' },
      { part: 'gestes', pts: 1, label: 'Oxygène', t: [/(oxyg|\bo2\b)/], hint: 'Saturation sous 94 % : oxygène.' },
      { part: 'gestes', pts: 1, label: 'Avis médical urgent', t: [AVIS], hint: 'Détresse respiratoire : avis médical urgent.' },
    ],
    modele: {
      circ: 'Homme de 78 ans qui se plaint d’une difficulté à respirer depuis une demi-heure, apparue à table après un repas copieux, avec toux.\nLa victime est retrouvée assise à table, puis amenée en chaise au PSA, accompagnée de son épouse.',
      signes: 'SIGNES DE DÉTRESSE :\nRespi : saturation < 94 %, fréquence respiratoire anormale, difficulté à parler, mousse aux lèvres, bruits respiratoires\nCircu : sueurs\n\nÀ son arrivée au PSA la victime est assise, consciente et orientée. Refuse de s’allonger, étouffe couché.\n\nDifficulté à respirer depuis 30 min\nRepas riche en sel : choucroute et charcuterie\nParle par mots\nToux, mousse rosée aux lèvres\nCrépitements à la respiration\nSueurs\n\nNeuro :\nGlasgow 15\nOST ok\nMS4M conservées\nPas de PCI\nPupilles IRS\n\nCircu :\nFC 108 BFRS\nTAD 178/98\nTAG 174/96\nTRC inf 2 sec\n\nRespi :\nFR 30 superficielle\nSat 89 % AA\n\nTempérature 36,6°\n\nATCD : infarctus il y a 5 ans\nTraitement : Kardégic, Lasilix\nPas d’allergie',
      gestes: 'Bilan complet\nInstallation en position assise, jambes pendantes\nOxygénothérapie\nAvis médical urgent\nSurveillance',
    },
  },

  {
    id: 'embolie', title: 'Point de côté au retour de voyage', cat: 'Circulatoire', niveau: 'Difficile', sexe: 'F', age: 34,
    lieu: 'Festival, stand des bénévoles, 14h30.',
    appel: 'Une bénévole se présente au PSA en marchant lentement. Elle est essoufflée.',
    raconte: [
      '« J’ai 34 ans. Il y a une heure, j’ai eu d’un coup une douleur sur le côté droit de la poitrine, en bas, comme un point de côté. Ça fait mal quand je respire fort. »',
      '« Je suis rentrée hier de la Réunion : 11 heures d’avion. Depuis, mon mollet gauche me fait mal. »',
      '« Je prends la pilule. Pas d’antécédent. Pas d’allergie. »',
    ],
    constate: [
      'Elle est debout, consciente et orientée, essoufflée.',
      'Mollet gauche gonflé, chaud et douloureux. Mollet droit souple.',
      'Douleur à 6/10, augmentée par la respiration profonde.',
    ],
    mesures: [['Neuro', 'Glasgow 15 · OST ok · MS4M conservées · pas de PCI · pupilles IRS'], ['Circu', 'FC 112, bien frappé et régulier · TAD 118/76 · TAG 116/74 · TRC < 2 s'], ['Respi', 'FR 26, superficielle · Sat 92 % en air ambiant'], ['Autres', 'Température 37,4 °C']],
    vitals: { gcs: 15, fc: 112, tad: '118/76', tag: '116/74', fr: 26, sat: 92, temp: '37.4' },
    qualif: ['ost', 'ms4m', 'pci', 'pupilles', 'pouls', 'trc'],
    criteres: [
      { part: 'circ', pts: 1, label: 'Plainte : douleur thoracique, essoufflement', t: [/(douleur|point de cote|essouffl)/], hint: 'Dire de quoi elle se plaint : douleur en point de côté, essoufflement.' },
      { part: 'circ', pts: 1, label: 'Histoire : apparue brutalement', t: [/(brutal|d'un coup|soudain|il y a (une|1) ?h)/], hint: 'Dire comment c’est apparu : brutalement, il y a une heure.' },
      { part: 'signes', pts: 1, label: 'Détresse respiratoire signalée', t: [/detresse respi|respi ?:[^\n]{0,40}(sat|saturation|frequence)/], hint: 'Sat 92 % et FR 26 : détresse respiratoire.' },
      { part: 'signes', pts: 1, label: 'Douleur en point de côté, basithoracique droite', t: [/(point de cote|basithora|bas de la poitrine|en bas)/], hint: 'Localisation : point de côté basithoracique droit.' },
      { part: 'signes', pts: 0.5, label: 'Augmentée par la respiration', t: [/respir[^\n]{0,30}(augment|majore|aggrav)|(augment|majore|aggrav)[^\n]{0,30}respir/], hint: 'Évolution à la respiration : augmentée.' },
      { part: 'signes', pts: 0.5, label: 'Intensité 6/10', t: [/6 ?\/ ?10/], hint: 'Douleur évaluée à 6/10.' },
      { part: 'signes', pts: 1.5, label: 'Mollet gauche douloureux et gonflé', t: [/mollet/, /(douloureu|gonfl|chaud)/], hint: 'Mollet gauche gonflé, chaud, douloureux : phlébite possible.' },
      { part: 'signes', pts: 1.5, label: 'Long voyage en avion', t: [/(avion|vol|voyage)/], hint: 'Facteur de risque : 11 heures d’avion hier.' },
      { part: 'signes', pts: 1, label: 'Contraception (pilule)', t: [/(pilule|contracep)/], hint: 'Facteur de risque : pilule.' },
      { part: 'gestes', pts: 0.5, label: 'Mise au repos', t: [/(repos|demi ?assis|position de confort)/], hint: 'Mise au repos, position de confort.' },
      { part: 'gestes', pts: 1, label: 'Oxygène', t: [/(oxyg|\bo2\b)/], hint: 'Saturation sous 94 % : oxygène.' },
      { part: 'gestes', pts: 1, label: 'Avis médical urgent', t: [AVIS], hint: 'Suspicion d’embolie pulmonaire : avis médical urgent.' },
    ],
    modele: {
      circ: 'Femme de 34 ans qui se plaint d’une douleur en point de côté apparue brutalement il y a une heure, avec essoufflement.\nLa victime se présente spontanément au PSA en marchant.',
      signes: 'SIGNES DE DÉTRESSE :\nRespi : saturation < 94 %, fréquence respiratoire anormale\n\nÀ son arrivée au PSA la victime est debout, consciente et orientée, essoufflée.\n\nDouleur apparue brutalement il y a 1 h\nDouleur en point de côté basithoracique droite\nDouleur augmentée par la respiration profonde\nDouleur évaluée à 6/10\nMollet gauche gonflé, chaud et douloureux, mollet droit souple\nRetour hier d’un vol de 11 h (la Réunion)\nContraception : pilule\n\nNeuro :\nGlasgow 15\nOST ok\nMS4M conservées\nPas de PCI\nPupilles IRS\n\nCircu :\nFC 112 BFRS\nTAD 118/76\nTAG 116/74\nTRC inf 2 sec\n\nRespi :\nFR 26 superficielle\nSat 92 % AA\n\nTempérature 37,4°\n\nPas d’ATCD\nTraitement : pilule\nPas d’allergie',
      gestes: 'Bilan complet\nMise au repos en position de confort\nOxygénothérapie\nAvis médical urgent\nSurveillance',
    },
  },

  {
    id: 'abdo', title: 'Mal au ventre depuis ce matin', cat: 'Autre', niveau: 'Moyen', sexe: 'F', age: 26,
    lieu: 'Festival, 15h20.',
    appel: 'Une jeune femme se présente au PSA en marchant, pliée en deux, accompagnée de son copain.',
    raconte: [
      '« J’ai 26 ans. J’ai mal au ventre depuis ce matin. Ça a commencé autour du nombril, maintenant c’est en bas à droite. »',
      '« J’ai envie de vomir, j’ai vomi une fois. Je n’ai rien mangé depuis hier soir 20h. »',
      '« Je suis allée à la selle hier, normal. Pas de brûlure en urinant, pas de sang. Mes dernières règles, c’était il y a 2 semaines, je prends la pilule. Pas d’allergie. »',
    ],
    constate: [
      'Elle est debout, consciente et orientée.',
      'Ventre douloureux en bas à droite à la palpation, elle contracte le ventre quand vous appuyez (défense).',
      'Douleur à 7/10.',
    ],
    mesures: [['Neuro', 'Glasgow 15 · OST ok · MS4M conservées · pas de PCI'], ['Circu', 'FC 98, bien frappé et régulier · TAD 122/74 · TRC < 2 s'], ['Respi', 'FR 18, ample et régulière · Sat 99 % en air ambiant'], ['Autres', 'Température 38,3 °C · Glycémie 0,95 g/L']],
    vitals: { gcs: 15, fc: 98, tad: '122/74', fr: 18, sat: 99, temp: '38.3', gly: ['0.95', '5.3'] },
    qualif: ['ost', 'ms4m', 'pci', 'pouls', 'trc', 'respi'],
    criteres: [
      { part: 'circ', pts: 1, label: 'Plainte : douleur abdominale', t: [/(ventre|abdo)/], hint: 'Dire de quoi elle se plaint : douleur au ventre.' },
      { part: 'circ', pts: 1, label: 'Histoire : depuis ce matin', t: [/(ce matin|depuis)/], hint: 'Dire depuis quand : ce matin.' },
      { part: 'signes', pts: 1.5, label: 'Localisation : fosse iliaque droite', t: [/(fosse iliaque droite|\bfid\b|en bas a droite|bas droit)/], hint: 'Localisation : en bas à droite (fosse iliaque droite), partie du nombril.' },
      { part: 'signes', pts: 1.5, label: 'Défense à la palpation', t: [/defense/], hint: 'Geste de défense à la palpation.' },
      { part: 'signes', pts: 0.5, label: 'Intensité 7/10', t: [/7 ?\/ ?10/], hint: 'Douleur évaluée à 7/10.' },
      { part: 'signes', pts: 0.5, label: 'Nausées, vomissement', t: [/nausee/, /vomi/], hint: 'Nausées et 1 vomissement.' },
      { part: 'signes', pts: 1, label: 'Dernières selles', t: [/selle/], hint: 'Date et état des dernières selles : hier, normales.' },
      { part: 'signes', pts: 0.5, label: 'Brûlures urinaires', t: [/(urin|brulure)/], hint: 'Pas de brûlure en urinant.' },
      { part: 'signes', pts: 0.5, label: 'Saignement', t: [/(sang|saign)/], hint: 'Pas de saignement aux toilettes.' },
      { part: 'signes', pts: 1, label: 'Dernières règles', t: [/regles/], hint: 'Chez la femme : date des dernières règles (2 semaines), contraception.' },
      { part: 'signes', pts: 0.5, label: 'Dernier repas', t: [/(dernier repas|20 ?h)/], hint: 'Dernier repas hier à 20h.' },
      { part: 'gestes', pts: 1, label: 'Ne rien boire ni manger', t: [/(a jeun|ne rien (boire|manger)|rien a (boire|manger)|pas a boire)/], hint: 'Possible chirurgie : laisser à jeun, ne rien donner à boire ni à manger.' },
      { part: 'gestes', pts: 0.5, label: 'Position de confort', t: [/(repos|confort|jambes flechies|allonge)/], hint: 'Mise au repos en position de confort, jambes fléchies.' },
      { part: 'gestes', pts: 1, label: 'Avis médical', t: [AVIS], hint: 'Douleur avec défense et fièvre : avis médical.' },
    ],
    modele: {
      circ: 'Femme de 26 ans qui se plaint d’une douleur au ventre depuis ce matin, avec nausées.\nLa victime se présente spontanément au PSA en marchant, accompagnée de son copain.',
      signes: 'Pas de signe de détresse vitale\n\nÀ son arrivée au PSA la victime est debout, consciente et orientée.\n\nDouleur abdominale depuis ce matin, d’abord autour du nombril, maintenant en bas à droite (fosse iliaque droite)\nDouleur évaluée à 7/10\nDouleur à la palpation avec défense\nNausées, 1 vomissement\nDernières selles hier, normales\nPas de brûlure en urinant, pas de saignement\nDernières règles il y a 2 semaines, sous pilule\nDernier repas hier à 20h\nFièvre à 38,3°\n\nNeuro :\nGlasgow 15\nOST ok\nMS4M conservées\nPas de PCI\n\nCircu :\nFC 98 BFRS\nTAD 122/74\nTRC inf 2 sec\n\nRespi :\nFR 18 ARS\nSat 99 % AA\n\nTempérature 38,3°\nGlycémie 0,95 g/L\n\nPas d’ATCD\nTraitement : pilule\nPas d’allergie',
      gestes: 'Bilan complet\nMise au repos en position de confort, jambes fléchies\nLaissée à jeun : ne rien boire ni manger\nAvis médical\nSurveillance',
    },
  },

  {
    id: 'hyperthermie', title: 'Coureur à l’arrivée', cat: 'Autre', niveau: 'Difficile', sexe: 'H', age: 35,
    lieu: 'Arrivée d’une course de 15 km, 12h40. Il fait 31 °C.',
    appel: 'Un signaleur vous appelle : un coureur titube après la ligne d’arrivée. Vous le retrouvez assis contre une barrière et l’amenez en brancard au PSA.',
    raconte: [
      'Lui, lentement : « J’ai 35 ans… J’ai couru 1h20 en plein soleil… J’ai très peu bu. »',
      '« J’ai mal à la tête, envie de vomir, des crampes dans les jambes. »',
      'Son ami : « Il dit des choses bizarres depuis l’arrivée. Pas d’antécédent, pas de traitement, pas d’allergie. »',
    ],
    constate: [
      'Au PSA, il est allongé, conscient mais confus.',
      'Peau chaude et rouge, il ne transpire plus.',
    ],
    mesures: [['Neuro', 'Glasgow 14 (Y4 V4 M6) · confus · MS4M conservées · pas de PCI · pupilles IRS'], ['Circu', 'FC 132, filant · TAD 98/58 · TRC 3 s'], ['Respi', 'FR 26, superficielle · Sat 97 % en air ambiant'], ['Autres', 'Température 40,3 °C · Glycémie 0,98 g/L']],
    vitals: { gcs: 14, fc: 132, tad: '98/58', fr: 26, sat: 97, temp: '40.3', gly: ['0.98', '5.4'] },
    qualif: ['ms4m', 'pci', 'pupilles', 'pouls', 'trc'],
    criteres: [
      { part: 'circ', pts: 1, label: 'Plainte : malaise à l’arrivée, confusion', t: [/(titube|malaise|confus|cephal|mal a la tete)/], hint: 'Dire ce qui a motivé l’appel : il titube et est confus.' },
      { part: 'circ', pts: 1, label: 'Histoire : course sous la chaleur', t: [/(course|couru|15 ?km)/], hint: 'Le contexte : course de 15 km sous la chaleur.' },
      { part: 'signes', pts: 1.5, label: 'Détresse signalée (T > 40 °C, neuro, circu)', t: [/detresse (neuro|circu)|(neuro|circu) ?:[^\n]{0,40}(glasgow|confus|frequence|trc|tension)/], hint: 'Température au-dessus de 40 °C, Glasgow 14, FC 132 : détresse vitale.' },
      { part: 'signes', pts: 1, label: 'Durée de l’effort (1h20)', t: [/1 ?h ?20/], hint: 'Durée de l’effort : 1h20.' },
      { part: 'signes', pts: 0.5, label: 'Exposition : soleil, 31 °C', t: [/(soleil|chaleur|31)/], hint: 'Type d’exposition : plein soleil, 31 °C.' },
      { part: 'signes', pts: 0.5, label: 'A peu bu', t: [/(peu bu|hydrat|boire)/], hint: 'Hydratation : très peu bu.' },
      { part: 'signes', pts: 1, label: 'Peau chaude et rouge', t: [/(chaude|rouge)/], hint: 'Peau chaude et rouge.' },
      { part: 'signes', pts: 0.5, label: 'Absence de sueurs', t: [/(sueur|transpir)/], hint: 'Ne transpire plus.' },
      { part: 'signes', pts: 0.5, label: 'Céphalées, nausées', t: [/(cephal|mal a la tete)/, /nausee/], hint: 'Signes neuro : céphalées, nausées.' },
      { part: 'signes', pts: 0.5, label: 'Crampes', t: [/crampe/], hint: 'Signes circu : crampes.' },
      { part: 'signes', pts: 1, label: 'Détail du Glasgow (Y4 V4 M6)', t: [/y ?4[^\n]{0,6}v ?4[^\n]{0,6}m ?6/], hint: 'Glasgow inférieur à 15 : écrire le détail.' },
      { part: 'gestes', pts: 1.5, label: 'Refroidissement actif', t: [/(refroid|linge|humide|ventil|glace|deshabill)/], hint: 'Au-dessus de 40 °C : refroidissement actif (déshabiller, mouiller, ventiler, glace), objectif sous 39,4 °C.' },
      { part: 'gestes', pts: 0.5, label: 'Mise à l’ombre', t: [/(ombre|frais)/], hint: 'Soustraire à la chaleur : à l’ombre, au frais.' },
      { part: 'any', pts: 0.5, label: 'Température recontrôlée', t: [/(temperature|t°)[^\n]{0,30}(regulier|controle|surveil)|(controle|surveil)[^\n]{0,30}(temperature|t°)/], hint: 'Contrôler la température régulièrement.' },
      { part: 'gestes', pts: 1.5, label: 'Avis médical urgent', t: [AVIS], hint: 'Coup de chaleur d’effort : avis médical urgent.' },
    ],
    modele: {
      circ: 'Homme de 35 ans qui titube et devient confus après avoir couru 15 km sous la chaleur, avec céphalées et nausées.\nLa victime est retrouvée assise contre une barrière après la ligne d’arrivée, puis amenée en brancard au PSA après appel d’un signaleur.',
      signes: 'SIGNES DE DÉTRESSE :\nNeuro : Glasgow < 15, confusion\nCircu : fréquence cardiaque anormale, pouls filant, TRC allongé\nTempérature > 40°\n\nÀ son arrivée au PSA la victime est allongée, consciente et confuse.\n\nEffort de 1h20 en plein soleil, 31°\nA très peu bu\nPeau chaude et rouge, plus de sueurs\nCéphalées, nausées\nCrampes dans les jambes\n\nNeuro :\nGlasgow 14 (Y4 - V4 - M6)\nConfus, OST non ok\nMS4M conservées\nPas de PCI\nPupilles IRS\n\nCircu :\nFC 132 filant\nTAD 98/58\nTRC 3 sec\n\nRespi :\nFR 26 superficielle\nSat 97 % AA\n\nTempérature 40,3°\nGlycémie 0,98 g/L\n\nPas d’ATCD\nPas de traitement\nPas d’allergie',
      gestes: 'Bilan complet\nMise à l’ombre, allongé\nRefroidissement actif : déshabillage, linges humides, ventilation, poches de glace\nTempérature contrôlée régulièrement\nAvis médical urgent\nSurveillance',
    },
  },

  {
    id: 'grossesse', title: 'Des contractions pendant le concert', cat: 'Autre', niveau: 'Moyen', sexe: 'F', age: 31,
    lieu: 'Festival, 19h10.',
    appel: 'Une femme enceinte se présente au PSA en marchant, soutenue par son conjoint. Elle s’arrête toutes les quelques minutes en se tenant le ventre.',
    raconte: [
      '« J’ai 31 ans, je suis enceinte de 38 semaines. C’est mon deuxième enfant, le premier est né normalement. »',
      '« Les contractions ont commencé vers 17h. Maintenant, elles reviennent toutes les 5 minutes et durent 1 minute. »',
      '« J’ai perdu les eaux il y a 30 minutes, le liquide était clair. Je ne saigne pas. Je n’ai pas envie de pousser. »',
      '« La grossesse s’est bien passée. Pas d’antécédent, pas de traitement, pas d’allergie. »',
    ],
    constate: [
      'Elle est debout, consciente et orientée.',
      'Pendant 1 minute, elle souffle et se tient le ventre, puis se détend.',
    ],
    mesures: [['Neuro', 'Glasgow 15 · OST ok · pas de PCI · pas de trouble de la vision'], ['Circu', 'FC 96, bien frappé et régulier · TAD 124/78 · TAG 122/76'], ['Respi', 'FR 20, ample et régulière · Sat 99 % en air ambiant'], ['Autres', 'Température 37,1 °C']],
    vitals: { gcs: 15, fc: 96, tad: '124/78', tag: '122/76', fr: 20, sat: 99, temp: '37.1' },
    qualif: ['ost', 'pci', 'pouls', 'respi'],
    criteres: [
      { part: 'circ', pts: 1, label: 'Plainte : contractions', t: [/contraction/], hint: 'Dire de quoi elle se plaint : des contractions.' },
      { part: 'circ', pts: 1, label: 'Histoire : enceinte à terme', t: [/(enceinte|grossesse|38)/], hint: 'Le contexte : enceinte de 38 semaines.' },
      { part: 'signes', pts: 1, label: 'Terme : 38 semaines', t: [/38/], hint: 'Le terme : 38 semaines.' },
      { part: 'signes', pts: 0.5, label: 'Début des contractions (17h)', t: [/17 ?h/], hint: 'Début des contractions : 17h.' },
      { part: 'signes', pts: 1, label: 'Fréquence : toutes les 5 min', t: [/(5|cinq) ?min/], hint: 'Intervalle entre les contractions : 5 minutes.' },
      { part: 'signes', pts: 1, label: 'Durée : 1 min', t: [/(dure|duree)[^\n]{0,20}(1|une) ?min|(1|une) ?min[^\n]{0,20}(dure|chacune)/], hint: 'Durée de chaque contraction : 1 minute.' },
      { part: 'signes', pts: 1.5, label: 'Perte des eaux, liquide clair', t: [/perte des eaux|perdu les eaux/, /clair/], hint: 'Perte des eaux il y a 30 min, liquide clair.' },
      { part: 'signes', pts: 0.5, label: 'Saignements', t: [/(saign|metrorragie)/], hint: 'Pas de saignement.' },
      { part: 'signes', pts: 1, label: 'Envie de pousser', t: [/(pousser|selle)/], hint: 'Pas d’envie de pousser (ni d’aller à la selle).' },
      { part: 'signes', pts: 1, label: 'Parité : 2e enfant', t: [/(g2|p1|2e|deuxieme|second|parite)/], hint: 'Parité, gestité : deuxième enfant, premier accouchement normal.' },
      { part: 'signes', pts: 0.5, label: 'Complications', t: [/complication|bien passee|normal/], hint: 'Complications de cette grossesse et des précédentes : aucune.' },
      { part: 'gestes', pts: 1.5, label: 'Allongée sur le côté gauche', t: [/(cote gauche|lateral gauche)/], hint: 'Femme enceinte : allongée sur le côté gauche.' },
      { part: 'gestes', pts: 1, label: 'Avis médical', t: [AVIS], hint: 'Travail en cours avec perte des eaux : avis médical (maternité).' },
    ],
    modele: {
      circ: 'Femme de 31 ans, enceinte de 38 semaines, qui se plaint de contractions depuis 17h, avec perte des eaux il y a 30 min.\nLa victime se présente spontanément au PSA en marchant, soutenue par son conjoint.',
      signes: 'Pas de signe de détresse vitale\n\nÀ son arrivée au PSA la victime est debout, consciente et orientée.\n\nEnceinte de 38 semaines\nDeuxième enfant (G2 P1), premier accouchement normal\nGrossesse sans complication\nContractions depuis 17h\nContractions toutes les 5 min, qui durent 1 min\nPerte des eaux il y a 30 min, liquide clair\nPas de saignement\nPas d’envie de pousser\n\nNeuro :\nGlasgow 15\nOST ok\nPas de PCI\nPas de trouble de la vision\n\nCircu :\nFC 96 BFRS\nTAD 124/78\nTAG 122/76\n\nRespi :\nFR 20 ARS\nSat 99 % AA\n\nTempérature 37,1°\n\nPas d’ATCD\nPas de traitement\nPas d’allergie',
      gestes: 'Bilan complet\nInstallation allongée sur le côté gauche\nAvis médical\nSurveillance des contractions',
    },
  },

  {
    id: 'rachis', title: 'Chute d’un échafaudage', cat: 'Traumatisme', niveau: 'Difficile', sexe: 'H', age: 24,
    lieu: 'Montage de la scène, 9h20.',
    appel: 'On vous appelle sur le chantier : un monteur est tombé d’un échafaudage. Vous le trouvez allongé sur le dos au sol.',
    raconte: [
      '« J’ai 24 ans. Je suis tombé d’environ 3 mètres, sur les fesses, vers 9h15. Je ne me suis pas cogné la tête, je n’ai pas perdu connaissance. »',
      '« J’ai très mal dans le bas du dos, 7 sur 10. J’ai des fourmillements dans les deux jambes. »',
      '« Pas d’antécédent, pas de traitement, pas d’allergie. Je n’ai rien bu ni pris. »',
    ],
    constate: [
      'Il est allongé sur le dos, conscient et orienté.',
      'Douleur à la palpation des vertèbres lombaires. Pas de déformation visible.',
      'Il bouge ses pieds, sensibilité conservée, mais fourmillements. Pas de perte d’urine.',
    ],
    mesures: [['Neuro', 'Glasgow 15 · OST ok · MS4M : fourmillements des deux jambes · pas de PCI · pupilles IRS'], ['Circu', 'FC 102, bien frappé et régulier · TAD 132/80 · TRC < 2 s'], ['Respi', 'FR 20, ample et régulière · Sat 98 % en air ambiant']],
    vitals: { gcs: 15, fc: 102, tad: '132/80', fr: 20, sat: 98 },
    qualif: ['ost', 'ms4m', 'pci', 'pupilles', 'pouls', 'trc', 'respi'],
    criteres: [
      { part: 'circ', pts: 1, label: 'Plainte : douleur du dos', t: [/(dos|lombaire|rachis)/], hint: 'Dire de quoi il se plaint : douleur du bas du dos.' },
      { part: 'circ', pts: 1, label: 'Mécanisme : chute de 3 m', t: [/(chute|tombe)/], hint: 'Le mécanisme : chute d’un échafaudage.' },
      { part: 'signes', pts: 1.5, label: 'Hauteur : 3 m, sur les fesses', t: [/3 ?m/, /fesse/], hint: 'Mécanisme à risque : chute sur les fesses de plus de 3 m.' },
      { part: 'signes', pts: 0.5, label: 'Heure de la chute (9h15)', t: [/9 ?h ?15/], hint: 'L’heure de la chute : 9h15.' },
      { part: 'signes', pts: 1, label: 'Douleur lombaire 7/10', t: [/7 ?\/ ?10/], hint: 'Douleur lombaire évaluée à 7/10.' },
      { part: 'signes', pts: 0.5, label: 'Douleur à la palpation du rachis', t: [/palpation/], hint: 'Douleur à la palpation des vertèbres.' },
      { part: 'signes', pts: 1.5, label: 'Fourmillements des jambes', t: [/(fourmill|engourd|paresth)/], hint: 'Signe d’atteinte : fourmillements dans les deux jambes.' },
      { part: 'signes', pts: 0.5, label: 'Décharges électriques', t: [/decharge/], hint: 'Rechercher les décharges électriques.' },
      { part: 'signes', pts: 0.5, label: 'Perte d’urine', t: [/(urine|selles|priapisme)/], hint: 'Pas de perte d’urine ni de selles.' },
      { part: 'signes', pts: 0.5, label: 'Pas de choc à la tête', t: [/tete/], hint: 'Pas de choc à la tête.' },
      { part: 'gestes', pts: 1.5, label: 'Maintien de la tête', t: [/(maintien|maintenu)[^\n]{0,20}tete|tete[^\n]{0,20}(maintien|maintenu)|\bmtsa\b/], hint: 'Maintien de la tête en position neutre dès le début.' },
      { part: 'gestes', pts: 1.5, label: 'Immobilisation', t: [/(matelas|immobilis|plan dur|collier|mid)/], hint: 'Signe d’atteinte et mécanisme à risque : immobilisation (collier, matelas immobilisateur).' },
      { part: 'gestes', pts: 1, label: 'Avis médical', t: [AVIS], hint: 'Suspicion de traumatisme du rachis : avis médical.' },
    ],
    modele: {
      circ: 'Homme de 24 ans qui se plaint d’une douleur du bas du dos après une chute d’un échafaudage.\nLa victime est retrouvée allongée sur le dos au sol, au pied de l’échafaudage, prise en charge sur place.',
      signes: 'Pas de signe de détresse vitale\n\nÀ notre arrivée la victime est allongée sur le dos, consciente et orientée.\n\nChute d’environ 3 m sur les fesses à 9h15\nPas de choc à la tête\nDouleur lombaire évaluée à 7/10\nDouleur à la palpation des vertèbres lombaires, pas de déformation\nFourmillements dans les deux jambes\nPas de décharges électriques\nPas de perte d’urine ni de selles\nPas d’alcool, pas de drogue\n\nNeuro :\nGlasgow 15\nOST ok\nMS4M : motricité conservée, fourmillements des deux jambes\nPas de PCI\nPupilles IRS\n\nCircu :\nFC 102 BFRS\nTAD 132/80\nTRC inf 2 sec\n\nRespi :\nFR 20 ARS\nSat 98 % AA\n\nPas d’ATCD\nPas de traitement\nPas d’allergie',
      gestes: 'Bilan trauma\nMaintien de la tête en position neutre\nCollier cervical, immobilisation sur matelas immobilisateur\nAvis médical\nSurveillance',
    },
  },

  {
    id: 'hemorragie', title: 'Coupure au bar', cat: 'Traumatisme', niveau: 'Facile', sexe: 'F', age: 29,
    lieu: 'Bar du festival, 23h15.',
    appel: 'Une barmaid arrive au PSA en marchant, soutenue par un collègue. Elle serre un torchon plein de sang autour de son avant-bras.',
    raconte: [
      '« J’ai 29 ans. Un verre a explosé dans ma main il y a 5 minutes, je me suis coupé l’avant-bras gauche. »',
      '« Ça saigne beaucoup, ça ne s’arrête pas. J’ai la tête qui tourne. »',
      '« Je suis à jour de mes vaccins. Pas d’antécédent, pas de traitement, pas d’allergie. »',
    ],
    constate: [
      'Elle est debout, consciente et orientée, pâle, couverte de sueurs.',
      'Plaie de 4 cm sur la face interne de l’avant-bras gauche, qui saigne abondamment et en continu.',
    ],
    mesures: [['Neuro', 'Glasgow 15 · OST ok · MS4M conservées · pas de PCI'], ['Circu', 'FC 116, bien frappé et régulier · TAD 106/68 · TRC 3 s'], ['Respi', 'FR 20, ample et régulière · Sat 98 % en air ambiant']],
    vitals: { gcs: 15, fc: 116, tad: '106/68', fr: 20, sat: 98 },
    qualif: ['ost', 'ms4m', 'pci', 'pouls', 'trc', 'respi'],
    criteres: [
      { part: 'circ', pts: 1, label: 'Plainte : plaie qui saigne', t: [/(saign|plaie|coup|hemorr)/], hint: 'Dire de quoi elle se plaint : une plaie qui saigne.' },
      { part: 'circ', pts: 1, label: 'Histoire : verre cassé', t: [/verre/], hint: 'Dire ce qui s’est passé : un verre a explosé dans sa main.' },
      { part: 'signes', pts: 1.5, label: 'Hémorragie en tête des signes de détresse', t: [/(hemorrag|saignement abondant)/, /detresse/], hint: 'X de XABCDE : l’hémorragie est la première détresse à signaler et à traiter.' },
      { part: 'signes', pts: 1, label: 'Localisation : avant-bras gauche, face interne', t: [/avant[- ]?bras/, /gauche/], hint: 'Localisation : face interne de l’avant-bras gauche.' },
      { part: 'signes', pts: 0.5, label: 'Taille : 4 cm', t: [/4 ?cm/], hint: 'Taille de la plaie : 4 cm.' },
      { part: 'signes', pts: 1, label: 'Pâleur, sueurs', t: [/(pale|paleur)/, /sueur/], hint: 'Signes de détresse circulatoire : pâleur, sueurs.' },
      { part: 'signes', pts: 0.5, label: 'Vertiges', t: [/(vertige|tete qui tourne)/], hint: 'La tête qui tourne.' },
      { part: 'signes', pts: 0.5, label: 'Vaccination antitétanique', t: [/(vaccin|tetanos)/], hint: 'Plaie : vaccination antitétanique à jour ?' },
      { part: 'gestes', pts: 2, label: 'Compression directe', t: [/compression/], hint: 'Hémorragie : compression directe immédiate.' },
      { part: 'gestes', pts: 1, label: 'Pansement compressif', t: [/(pansement compressif|pansement)/], hint: 'Relais par un pansement compressif.' },
      { part: 'gestes', pts: 1, label: 'Allongée', t: [/allonge/], hint: 'Détresse circulatoire : allonger la victime.' },
      { part: 'any', pts: 0.5, label: 'Saignement arrêté', t: [/(saignement|hemorragie)[^\n]{0,30}(arrete|controle|stoppe|jugule)/], hint: 'Vérifier et noter que le saignement est arrêté.' },
      { part: 'gestes', pts: 0.5, label: 'Protection contre le froid', t: [/(couverture|froid|isotherm)/], hint: 'Couvrir la victime.' },
      { part: 'gestes', pts: 1, label: 'Avis médical', t: [AVIS], hint: 'Hémorragie avec signes de détresse circulatoire : avis médical.' },
    ],
    modele: {
      circ: 'Femme de 29 ans qui présente une plaie qui saigne abondamment à l’avant-bras gauche après l’explosion d’un verre dans sa main.\nLa victime se présente au PSA en marchant, soutenue par un collègue.',
      signes: 'SIGNES DE DÉTRESSE :\nHémorragie : saignement abondant de l’avant-bras gauche\nCircu : pâleur, sueurs, fréquence cardiaque élevée, TRC allongé\n\nÀ son arrivée au PSA la victime est debout, consciente et orientée.\n\nPlaie de 4 cm, face interne de l’avant-bras gauche, par verre cassé il y a 5 min\nSaignement abondant et continu\nPâleur, sueurs\nTête qui tourne (vertiges)\nVaccination antitétanique à jour\n\nNeuro :\nGlasgow 15\nOST ok\nMS4M conservées\nPas de PCI\n\nCircu :\nFC 116 BFRS\nTAD 106/68\nTRC 3 sec\n\nRespi :\nFR 20 ARS\nSat 98 % AA\n\nPas d’ATCD\nPas de traitement\nPas d’allergie',
      gestes: 'Compression directe immédiate\nPansement compressif\nSaignement arrêté après compression\nMise au repos allongée\nCouverture\nBilan complet\nAvis médical\nSurveillance',
    },
  },

  {
    id: 'angor', title: 'Douleur après les gradins', cat: 'Circulatoire', niveau: 'Moyen', sexe: 'F', age: 64,
    lieu: 'Stade, match de rugby, 17h25.',
    appel: 'Une spectatrice se présente au PSA en marchant, accompagnée de sa fille. Elle a la main sur la poitrine.',
    raconte: [
      '« J’ai 64 ans. À 17h10, en montant les gradins, j’ai eu une douleur dans la poitrine, au milieu, qui serre et qui va dans l’épaule gauche. »',
      '« J’ai de l’angine de poitrine. J’ai pris une bouffée de Natispray à 17h15. La douleur est passée de 7 à 2 sur 10, mais elle n’est pas partie. »',
      '« Je suis diabétique de type 2, je prends de la Metformine, et j’ai du cholestérol. Ma mère avait des problèmes de cœur. Pas d’allergie. »',
    ],
    constate: [
      'Elle est debout, consciente et orientée.',
      'Pas de pâleur ni de sueurs. Douleur non modifiée par la palpation ni la respiration.',
      'Mollets souples et non douloureux.',
    ],
    mesures: [['Neuro', 'Glasgow 15 · OST ok · MS4M conservées · pas de PCI · pupilles IRS'], ['Circu', 'FC 88, bien frappé et régulier · TAD 148/86 · TAG 144/84 · TRC < 2 s'], ['Respi', 'FR 18, ample et régulière · Sat 97 % en air ambiant'], ['Autres', 'Température 36,9 °C · Glycémie 1,48 g/L (8,2 mmol/L)']],
    vitals: { gcs: 15, fc: 88, tad: '148/86', tag: '144/84', fr: 18, sat: 97, temp: '36.9', gly: ['1.48', '8.2'] },
    qualif: ['ost', 'ms4m', 'pci', 'pupilles', 'pouls', 'trc', 'respi'],
    criteres: [
      { part: 'circ', pts: 1, label: 'Plainte : douleur thoracique', t: [/(douleur|mal|serre)[^\n]{0,40}(poitrine|thora|stern)|(poitrine|thora)[^\n]{0,20}(douleur|mal)/], hint: 'Dire de quoi elle se plaint : une douleur dans la poitrine.' },
      { part: 'circ', pts: 1, label: 'Histoire : à l’effort, angor connu', t: [/(gradin|monte|effort|angine|angor)/], hint: 'Dire dans quelles circonstances : en montant les gradins, angor connu.' },
      { part: 'signes', pts: 0.5, label: 'Heure de début (17h10)', t: [/17 ?h ?10/], hint: 'L’heure de début : 17h10.' },
      { part: 'signes', pts: 1, label: 'À l’effort', t: [/(effort|gradin|en montant)/], hint: 'Liée à un effort : en montant les gradins.' },
      { part: 'signes', pts: 0.5, label: 'Rétrosternale et constrictive', t: [/(retro[ -]?stern|medio[ -]?thora|milieu)/, /(constrict|serre)/], hint: 'Médio-thoracique, constrictive.' },
      { part: 'signes', pts: 0.5, label: 'Irradiation dans l’épaule gauche', t: [/irradi/, /epaule/], hint: 'Irradiation dans l’épaule gauche.' },
      { part: 'signes', pts: 1.5, label: 'Natispray pris à 17h15', t: [/(natispray|trinitrine|vasodilat)/, /17 ?h ?15/], hint: 'Prise d’un vasodilatateur : 1 bouffée de Natispray à 17h15.' },
      { part: 'signes', pts: 1, label: 'Douleur passée de 7/10 à 2/10', t: [/7 ?\/ ?10/, /2 ?\/ ?10/], hint: 'Évolution : 7/10 avant, 2/10 après, pas disparue.' },
      { part: 'signes', pts: 0.5, label: 'Angor connu', t: [/(angor|angine de poitrine)/], hint: 'ATCD : angor.' },
      { part: 'signes', pts: 0.5, label: 'Facteurs de risque : diabète, cholestérol', t: [/diabet/, /cholest/], hint: 'Facteurs de risque : diabète de type 2, cholestérol.' },
      { part: 'signes', pts: 0.5, label: 'ATCD familial', t: [/(mere|familia)/], hint: 'ATCD cardiaques familiaux : sa mère.' },
      { part: 'signes', pts: 0.5, label: 'Mollets', t: [/mollet/], hint: 'Mollets souples et non douloureux.' },
      { part: 'gestes', pts: 0.5, label: 'Mise au repos', t: [/(repos|position de confort|demi ?assis)/], hint: 'Mise au repos en position de confort.' },
      { part: 'gestes', pts: 1.5, label: 'Avis médical', t: [AVIS], hint: 'Douleur qui ne disparaît pas après le Natispray : avis médical.' },
    ],
    modele: {
      circ: 'Femme de 64 ans, angineuse connue, qui se plaint d’une douleur dans la poitrine apparue en montant les gradins, persistante malgré la prise de son traitement.\nLa victime se présente spontanément au PSA en marchant, accompagnée de sa fille.',
      signes: 'Pas de signe de détresse vitale\n\nÀ son arrivée au PSA la victime est debout, consciente et orientée.\n\nDouleur apparue à 17h10 à l’effort, en montant les gradins\nDouleur médio-thoracique, constrictive (ça serre)\nIrradiation dans l’épaule gauche\nNon modifiée par la palpation ni la respiration\n1 bouffée de Natispray à 17h15 : douleur passée de 7/10 à 2/10, pas disparue\nMollets souples et non douloureux\n\nAngor connu\nFacteurs de risque : diabète de type 2, cholestérol\nATCD cardiaque familial : sa mère\n\nNeuro :\nGlasgow 15\nOST ok\nMS4M conservées\nPas de PCI\nPupilles IRS\n\nCircu :\nFC 88 BFRS\nTAD 148/86\nTAG 144/84\nTRC inf 2 sec\n\nRespi :\nFR 18 ARS\nSat 97 % AA\n\nTempérature 36,9°\nGlycémie 1,48 g/L (8,2 mmol/L)\n\nATCD : angor, diabète de type 2, cholestérol\nTraitement : Natispray, Metformine\nPas d’allergie',
      gestes: 'Bilan complet\nMise au repos en position de confort\nAvis médical\nSurveillance',
    },
  },

  {
    id: 'ait', title: '« C’est revenu tout seul »', cat: 'Neurologique', niveau: 'Difficile', sexe: 'H', age: 71,
    lieu: 'Brocante, 16h05.',
    appel: 'Un homme se présente au PSA en marchant avec sa femme : « Ma femme a insisté pour que je passe vous voir. »',
    raconte: [
      'Son épouse : « Il a 71 ans. Vers 15h30, son bras gauche est devenu tout mou, sa bouche a tourné et il parlait mal. Ça a duré environ 10 minutes, puis tout est revenu. »',
      'Lui : « J’ai eu des fourmillements dans la main gauche. Maintenant je vais bien. »',
      '« Il a un pacemaker, de la tension et une fibrillation. Il prend Eliquis et Coversyl. Pas d’allergie. »',
    ],
    constate: [
      'Il est debout, conscient et orienté.',
      'Visage symétrique, il tient ses deux bras tendus, il parle normalement.',
    ],
    mesures: [['Neuro', 'Glasgow 15 · OST ok · MS4M conservées · pas de PCI · pupilles IRS · FAST négatif'], ['Circu', 'FC 76, irrégulier · TAD 164/92 · TAG 160/90 · TRC < 2 s'], ['Respi', 'FR 16, ample et régulière · Sat 97 % en air ambiant'], ['Autres', 'Température 36,6 °C · Glycémie 1,12 g/L']],
    vitals: { gcs: 15, fc: 76, tad: '164/92', tag: '160/90', fr: 16, sat: 97, temp: '36.6', gly: ['1.12', '6.2'] },
    qualif: ['ost', 'ms4m', 'pci', 'pupilles', 'fast', 'pouls', 'trc', 'respi'],
    criteres: [
      { part: 'circ', pts: 1, label: 'Plainte : signes passagers', t: [/(bras|bouche|parl|fourmill)/], hint: 'Dire ce qui a motivé la venue : faiblesse du bras, bouche déviée, trouble de la parole.' },
      { part: 'circ', pts: 1, label: 'Histoire : signes disparus', t: [/(disparu|revenu|regress|10 ?min|passager)/], hint: 'Préciser que tout est revenu après 10 minutes.' },
      { part: 'signes', pts: 1.5, label: 'Heure du premier signe (15h30)', t: [/15 ?h ?30/], hint: 'L’heure du premier signe : 15h30.' },
      { part: 'signes', pts: 1, label: 'Durée : 10 min', t: [/10 ?min/], hint: 'Durée des signes : environ 10 minutes.' },
      { part: 'signes', pts: 1, label: 'Signes régressifs', t: [/(disparu|revenu|regress|plus de signe|recupere)/], hint: 'Signes disparus : penser à l’AIT.' },
      { part: 'signes', pts: 0.5, label: 'Bras gauche faible', t: [/bras/], hint: 'Faiblesse du bras gauche.' },
      { part: 'signes', pts: 0.5, label: 'Bouche déviée', t: [/(bouche|visage|face)/], hint: 'Bouche déviée.' },
      { part: 'signes', pts: 0.5, label: 'Trouble de la parole', t: [/(parl|parole)/], hint: 'Trouble de la parole.' },
      { part: 'signes', pts: 0.5, label: 'Fourmillements', t: [/(fourmill|engourd)/], hint: 'Fourmillements de la main gauche.' },
      { part: 'signes', pts: 1, label: 'FAST négatif maintenant', t: [/fast (negatif|-)/], hint: 'FAST actuellement négatif.' },
      { part: 'signes', pts: 1, label: 'Pacemaker (contre-indication IRM)', t: [/(pacemaker|pace maker|stimulateur)/], hint: 'Contre-indication à l’IRM : pacemaker.' },
      { part: 'signes', pts: 0.5, label: 'Fibrillation, anticoagulant', t: [/(fibrillation|\bfa\b|eliquis|anticoag)/], hint: 'Fibrillation sous anticoagulant (Eliquis).' },
      { part: 'signes', pts: 0.5, label: 'Pouls irrégulier', t: [/irregulier/], hint: 'Pouls irrégulier.' },
      { part: 'gestes', pts: 1, label: 'Allongé strict', t: [/allonge/], hint: 'Suspicion d’AIT / AVC : allongé strict.' },
      { part: 'gestes', pts: 1.5, label: 'Avis médical urgent', t: [AVIS], hint: 'Même si les signes ont disparu : avis médical urgent, l’AIT annonce souvent un AVC.' },
    ],
    modele: {
      circ: 'Homme de 71 ans qui a présenté vers 15h30 une faiblesse du bras gauche, une bouche déviée et des difficultés à parler pendant environ 10 min, signes disparus depuis.\nLa victime se présente au PSA en marchant, accompagnée de son épouse.',
      signes: 'Pas de signe de détresse vitale actuellement\n\nÀ son arrivée au PSA la victime est debout, consciente et orientée.\n\nPremier signe à 15h30\nFaiblesse du bras gauche, bouche déviée, difficultés à parler\nFourmillements de la main gauche\nSignes d’une durée de 10 min, disparus depuis\n\nNeuro :\nGlasgow 15\nOST ok\nMS4M conservées\nPas de PCI\nPupilles IRS\nFAST négatif\n\nCircu :\nFC 76 irrégulier\nTAD 164/92\nTAG 160/90\nTRC inf 2 sec\n\nRespi :\nFR 16 ARS\nSat 97 % AA\n\nTempérature 36,6°\nGlycémie 1,12 g/L\n\nATCD : pacemaker (contre-indication IRM), hypertension, fibrillation\nTraitement : Eliquis, Coversyl\nPas d’allergie',
      gestes: 'Bilan complet\nMise au repos allongé strict\nAvis médical urgent, heure du premier signe transmise\nSurveillance',
    },
  },

  {
    id: 'medicaments', title: 'Retrouvée somnolente dans sa tente', cat: 'Intoxication', niveau: 'Difficile', sexe: 'F', age: 23,
    lieu: 'Camping d’un festival, 21h30.',
    appel: 'Une jeune femme vient chercher les secours : son amie dort et répond mal. Vous la trouvez allongée dans sa tente et l’amenez en brancard au PSA.',
    raconte: [
      'Son amie : « Elle a 23 ans. On s’est disputées vers 20h, elle est partie dans la tente. Je l’ai trouvée comme ça, avec une plaquette de Xanax vide à côté d’elle. »',
      'La victime, lentement : « J’en ai pris 10… pour dormir… vers 20h15. » Elle n’a pas bu d’alcool.',
      '« Elle prend du Xanax depuis 1 an. Pas d’autre antécédent. Pas d’allergie. »',
    ],
    constate: [
      'Au PSA, elle est allongée, somnolente, ouvre les yeux quand on lui parle, répond lentement et ne sait plus où elle est.',
      'Pas de trace de piqûre, pas de timbre médicamenteux.',
    ],
    mesures: [['Neuro', 'Glasgow 13 (Y3 V4 M6) · désorientée · MS4M conservées · pas de PCI · pupilles IRS'], ['Circu', 'FC 64, bien frappé et régulier · TAD 104/64 · TRC < 2 s'], ['Respi', 'FR 12, superficielle · Sat 95 % en air ambiant'], ['Autres', 'Température 36,2 °C · Glycémie 0,94 g/L']],
    vitals: { gcs: 13, fc: 64, tad: '104/64', fr: 12, sat: 95, temp: '36.2', gly: ['0.94', '5.2'] },
    qualif: ['ost', 'ms4m', 'pci', 'pupilles', 'pouls', 'trc'],
    criteres: [
      { part: 'circ', pts: 1, label: 'Plainte : somnolence', t: [/(somnol|dort|repond mal)/], hint: 'Dire ce qui a motivé l’appel : elle est somnolente et répond mal.' },
      { part: 'circ', pts: 1, label: 'Histoire : prise de médicaments', t: [/(xanax|medicament|comprime|plaquette)/], hint: 'Le contexte : prise de comprimés de Xanax.' },
      { part: 'signes', pts: 1, label: 'Détresse neurologique signalée', t: [/detresse neuro|neuro ?:[^\n]{0,40}(glasgow|somnol|desorient)/], hint: 'Glasgow 13 : détresse neurologique, à mettre en tête.' },
      { part: 'signes', pts: 1.5, label: 'Dose supposée ingérée : 10 comprimés', t: [/(10|dix) comprim/], hint: 'Dose supposée ingérée : 10 comprimés.' },
      { part: 'signes', pts: 0.5, label: 'Produit : Xanax', t: [/xanax/], hint: 'Le produit : Xanax.' },
      { part: 'signes', pts: 1, label: 'Heure d’ingestion (20h15)', t: [/20 ?h ?15/], hint: 'Heure d’ingestion : 20h15.' },
      { part: 'signes', pts: 1, label: 'Contexte volontaire', t: [/(volontaire|dispute)/], hint: 'Contexte : volontaire, après une dispute.' },
      { part: 'signes', pts: 0.5, label: 'Plaquette vide retrouvée', t: [/plaquette/], hint: 'Flacon ou plaquette retrouvé.' },
      { part: 'signes', pts: 0.5, label: 'Alcool', t: [/alcool/], hint: 'Pas d’alcool associé.' },
      { part: 'signes', pts: 0.5, label: 'Traces de piqûre, timbres', t: [/(piqure|timbre|patch)/], hint: 'Pas de trace de piqûre ni de timbre.' },
      { part: 'signes', pts: 1, label: 'Détail du Glasgow (Y3 V4 M6)', t: [/y ?3[^\n]{0,6}v ?4[^\n]{0,6}m ?6/], hint: 'Glasgow inférieur à 15 : écrire le détail.' },
      { part: 'gestes', pts: 1, label: 'Position latérale', t: [/(pls|lateral)/], hint: 'Victime somnolente : position latérale.' },
      { part: 'any', pts: 0.5, label: 'Plaquette conservée et transmise', t: [/plaquette[^\n]{0,40}(conserv|transmi|garde|jointe|recuper)|(conserv|transmi|garde|recuper)[^\n]{0,40}plaquette/], hint: 'Garder la plaquette pour la transmettre.' },
      { part: 'gestes', pts: 1.5, label: 'Avis médical urgent', t: [AVIS], hint: 'Intoxication médicamenteuse volontaire avec Glasgow 13 : avis médical urgent.' },
    ],
    modele: {
      circ: 'Femme de 23 ans, retrouvée somnolente dans sa tente après une prise volontaire de comprimés de Xanax à la suite d’une dispute.\nLa victime est retrouvée allongée dans sa tente, puis amenée en brancard au PSA, après appel de son amie.',
      signes: 'SIGNES DE DÉTRESSE :\nNeuro : Glasgow < 15, somnolence, désorientation\n\nÀ son arrivée au PSA la victime est allongée, consciente, somnolente et désorientée.\n\nPrise volontaire de 10 comprimés de Xanax à 20h15, après une dispute\nPlaquette vide retrouvée à côté d’elle\nPas d’alcool\nPas de trace de piqûre, pas de timbre médicamenteux\n\nNeuro :\nGlasgow 13 (Y3 - V4 - M6)\nDésorientée (OST non ok)\nMS4M conservées\nPas de PCI\nPupilles IRS\n\nCircu :\nFC 64 BFRS\nTAD 104/64\nTRC inf 2 sec\n\nRespi :\nFR 12 superficielle\nSat 95 % AA\n\nTempérature 36,2°\nGlycémie 0,94 g/L\n\nATCD : prise de Xanax depuis 1 an\nTraitement : Xanax\nPas d’allergie',
      gestes: 'Bilan complet\nMise en position latérale\nPlaquette conservée et transmise\nAvis médical urgent\nSurveillance de la respiration',
    },
  },

  {
    id: 'co', title: 'Mal de tête dans le food truck', cat: 'Intoxication', niveau: 'Difficile', sexe: 'H', age: 45,
    lieu: 'Food truck du festival, 13h50.',
    appel: 'Un cuisinier se présente au PSA en marchant : il a mal à la tête et la nausée. Il travaille dans la réserve fermée de son camion, où tourne un groupe électrogène.',
    raconte: [
      '« J’ai 45 ans. Depuis une heure, j’ai mal à la tête, j’ai envie de vomir et la tête qui tourne. »',
      '« Mon collègue, resté dans le camion, a aussi mal à la tête. »',
      '« Pas d’antécédent, pas de traitement, pas d’allergie. »',
    ],
    constate: [
      'Il est debout, conscient et orienté.',
      'Pas de vomissement. Il dit que ça va un peu mieux dehors.',
    ],
    mesures: [['Neuro', 'Glasgow 15 · OST ok · MS4M conservées · pas de PCI · pupilles IRS'], ['Circu', 'FC 104, bien frappé et régulier · TAD 132/84 · TRC < 2 s'], ['Respi', 'FR 22, ample et régulière · Sat 98 % en air ambiant (le saturomètre ne détecte pas le monoxyde de carbone)'], ['Autres', 'Température 36,9 °C']],
    vitals: { gcs: 15, fc: 104, tad: '132/84', fr: 22, sat: 98, temp: '36.9' },
    qualif: ['ost', 'ms4m', 'pci', 'pupilles', 'pouls', 'trc', 'respi'],
    criteres: [
      { part: 'circ', pts: 1, label: 'Plainte : céphalées, nausées', t: [/(cephal|mal (a|de) (la )?tete|nausee)/], hint: 'Dire de quoi il se plaint : céphalées, nausées.' },
      { part: 'circ', pts: 1, label: 'Histoire : local fermé, groupe électrogène', t: [/(groupe electrogene|monoxyde|\bco\b|reserve|ferme)/], hint: 'Le contexte : travail dans un local fermé avec un groupe électrogène.' },
      { part: 'signes', pts: 1.5, label: 'Source : groupe électrogène en local fermé', t: [/groupe electrogene/], hint: 'Danger persistant : groupe électrogène dans un espace fermé (monoxyde de carbone).' },
      { part: 'signes', pts: 0.5, label: 'Céphalées', t: [/(cephal|mal (a|de) (la )?tete)/], hint: 'Céphalées.' },
      { part: 'signes', pts: 0.5, label: 'Nausées', t: [/nausee/], hint: 'Nausées.' },
      { part: 'signes', pts: 0.5, label: 'Vertiges', t: [/(vertige|tete qui tourne)/], hint: 'Vertiges.' },
      { part: 'signes', pts: 0.5, label: 'Depuis 1 heure', t: [/(1|une) ?h/], hint: 'Depuis une heure.' },
      { part: 'signes', pts: 1, label: 'Mieux à l’extérieur', t: [/(dehors|exterieur|mieux)/], hint: 'Amélioration à l’extérieur : argument pour une intoxication.' },
      { part: 'signes', pts: 1.5, label: 'Autre personne atteinte', t: [/(collegue|autre personne|deuxieme victime|autre victime)/], hint: 'Plusieurs personnes avec les mêmes signes : penser au CO.' },
      { part: 'gestes', pts: 1.5, label: 'Soustraire au danger, aérer', t: [/(evacu|aer|sorti|eloign|soustrai)/], hint: 'Danger persistant : faire sortir tout le monde, aérer, ne pas rentrer dans le local.' },
      { part: 'gestes', pts: 1.5, label: 'Oxygène', t: [/(oxyg|\bo2\b)/], hint: 'Suspicion d’intoxication au CO : oxygène, même si la saturation est normale.' },
      { part: 'any', pts: 0.5, label: 'Prise en charge du collègue', t: [/(collegue|autre victime|deuxieme victime)[^\n]{0,40}(evacu|pris en charge|sorti|bilan|demande)|(evacu|pris en charge|sorti|bilan|demande)[^\n]{0,40}(collegue|autre victime|deuxieme victime)/], hint: 'Faire évacuer et prendre en charge le collègue.' },
      { part: 'gestes', pts: 1, label: 'Avis médical', t: [AVIS], hint: 'Suspicion d’intoxication au CO : avis médical.' },
    ],
    modele: {
      circ: 'Homme de 45 ans qui se plaint de céphalées et de nausées depuis une heure, en travaillant dans la réserve fermée d’un food truck où tourne un groupe électrogène.\nLa victime se présente spontanément au PSA en marchant.',
      signes: 'Pas de signe de détresse vitale\n\nÀ son arrivée au PSA la victime est debout, consciente et orientée.\n\nTravail dans un local fermé avec un groupe électrogène\nCéphalées, nausées et vertiges depuis 1 h\nPas de vomissement\nSe sent mieux à l’extérieur\nSon collègue, resté dans le camion, a aussi mal à la tête\n\nNeuro :\nGlasgow 15\nOST ok\nMS4M conservées\nPas de PCI\nPupilles IRS\n\nCircu :\nFC 104 BFRS\nTAD 132/84\nTRC inf 2 sec\n\nRespi :\nFR 22 ARS\nSat 98 % AA (non fiable en cas d’intoxication au CO)\n\nTempérature 36,9°\n\nPas d’ATCD\nPas de traitement\nPas d’allergie',
      gestes: 'Bilan complet\nVictime soustraite au danger, local aéré, ne pas y retourner\nÉvacuation du collègue demandée, bilan du collègue\nOxygénothérapie\nAvis médical\nSurveillance',
    },
  },

  {
    id: 'poignet', title: 'Chute sur la main', cat: 'Traumatisme', niveau: 'Facile', sexe: 'F', age: 58,
    lieu: 'Festival, 18h45.',
    appel: 'Une femme se présente au PSA en marchant. Elle tient son poignet droit contre elle avec l’autre main.',
    raconte: [
      '« J’ai 58 ans. Vers 18h30, je me suis prise les pieds dans un câble et je suis tombée en avant sur la main droite. Je ne me suis pas cogné la tête. »',
      '« J’ai très mal au poignet, 8 sur 10, je ne peux plus le bouger. »',
      '« J’ai de l’ostéoporose, je prends du Fosamax. Pas d’allergie. »',
    ],
    constate: [
      'Elle est debout, consciente et orientée. Elle porte une bague et une montre à droite.',
      'Poignet droit déformé, gonflé. Pas de plaie.',
      'Pouls radial perçu, doigts chauds, mobiles, sensibilité conservée, TRC < 2 s.',
    ],
    mesures: [['Neuro', 'Glasgow 15 · OST ok · pas de PCI'], ['Circu', 'FC 90, bien frappé et régulier · TAD 138/84'], ['Respi', 'FR 18, ample et régulière · Sat 98 % en air ambiant']],
    vitals: { gcs: 15, fc: 90, tad: '138/84', fr: 18, sat: 98 },
    qualif: ['ost', 'pci', 'pouls', 'respi'],
    criteres: [
      { part: 'circ', pts: 1, label: 'Plainte : douleur du poignet', t: [/poignet/], hint: 'Dire de quoi elle se plaint : le poignet droit.' },
      { part: 'circ', pts: 1, label: 'Mécanisme : chute sur la main', t: [/(chute|tombe)/], hint: 'Dire ce qui s’est passé : chute en avant sur la main.' },
      { part: 'signes', pts: 1, label: 'Bilan trauma localisé : poignet droit', t: [/poignet/, /droit/], hint: 'Préciser la zone et le côté : poignet droit.' },
      { part: 'signes', pts: 1.5, label: 'Déformation', t: [/deform/], hint: 'Le poignet est déformé : suspicion de fracture.' },
      { part: 'signes', pts: 0.5, label: 'Gonflement', t: [/(gonfl|oedem|tumefi)/], hint: 'Gonflement.' },
      { part: 'signes', pts: 0.5, label: 'Pas de plaie', t: [/plaie/], hint: 'Pas de plaie (fracture fermée).' },
      { part: 'signes', pts: 0.5, label: 'Douleur 8/10', t: [/8 ?\/ ?10/], hint: 'Douleur évaluée à 8/10.' },
      { part: 'signes', pts: 0.5, label: 'Impotence', t: [/(bouger|impotence|mobilis)/], hint: 'Ne peut plus bouger le poignet.' },
      { part: 'signes', pts: 0.5, label: 'Pouls radial', t: [/(pouls radial|pouls perc|pouls distal)/], hint: 'Le pouls radial, sous la blessure.' },
      { part: 'signes', pts: 0.5, label: 'Chaleur, mobilité, sensibilité des doigts', t: [/(chaud|chaleur)/, /(sensibilite|ms4m)/], hint: 'Doigts chauds, mobiles, sensibilité conservée.' },
      { part: 'signes', pts: 0.5, label: 'TRC des doigts', t: [/(trc|recoloration)/], hint: 'TRC sous la blessure.' },
      { part: 'signes', pts: 0.5, label: 'Ostéoporose', t: [/osteopor/], hint: 'ATCD favorisant : ostéoporose.' },
      { part: 'gestes', pts: 1.5, label: 'Retrait bague et montre', t: [/(bague|montre|bijou)/], hint: 'Retirer bague et montre avant que le gonflement n’augmente.' },
      { part: 'gestes', pts: 1, label: 'Immobilisation', t: [/(attelle|immobilis|echarpe)/], hint: 'Immobilisation du poignet (attelle, écharpe).' },
      { part: 'gestes', pts: 0.5, label: 'Froid', t: [/(froid|glace)/], hint: 'Application de froid.' },
      { part: 'gestes', pts: 1, label: 'Avis médical', t: [AVIS], hint: 'Déformation : suspicion de fracture, avis médical.' },
    ],
    modele: {
      circ: 'Femme de 58 ans qui se plaint d’une douleur au poignet droit après une chute en avant sur la main, en se prenant les pieds dans un câble.\nLa victime se présente spontanément au PSA en marchant.',
      signes: 'Pas de signe de détresse vitale\n\nÀ son arrivée au PSA la victime est debout, consciente et orientée.\n\nChute à 18h30, pas de choc à la tête\nBilan trauma poignet droit :\nDéformation du poignet droit\nGonflement\nPas de plaie\nDouleur évaluée à 8/10, ne peut plus bouger le poignet\nPouls radial perçu\nDoigts chauds, mobiles, sensibilité conservée\nTRC inf 2 sec\n\nNeuro :\nGlasgow 15\nOST ok\nPas de PCI\n\nCircu :\nFC 90 BFRS\nTAD 138/84\n\nRespi :\nFR 18 ARS\nSat 98 % AA\n\nATCD : ostéoporose\nTraitement : Fosamax\nPas d’allergie',
      gestes: 'Bilan trauma\nRetrait de la bague et de la montre\nImmobilisation par attelle et écharpe\nApplication de froid\nAvis médical\nSurveillance',
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
