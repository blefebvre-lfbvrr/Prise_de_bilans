// Banque de questions des quiz de révision.
// Sources : documents du dossier PCPS (Bilan ARGOS, Bilan, Mémo Bilans Spé, fiche bilan papier V2, Mémo Urgence).
// Chaque question : { q, quote?, good, bad: [...], why } ; `fixed` garde l'ordre des réponses.

import { MEMO_SPE } from './cours.js';

export const THEMES = [
  { id: 'regards', title: 'La prise de bilan', desc: '3 S, XABCDE, OPQRST, SAMPLE, surveillance.', chapitre: 'regards' },
  { id: 'parties', title: 'Les 3 parties du bilan ARGOS', desc: 'Ranger chaque phrase au bon endroit.', chapitre: 'structure' },
  { id: 'bilans', title: 'Neuro, circu, respi', desc: 'Glasgow, FAST, constantes et repères chiffrés.', chapitre: 'bilans' },
  { id: 'spe', title: 'Bilans spé', desc: 'Que rechercher pour chaque détresse.', chapitre: 'spe' },
  { id: 'sigles', title: 'Sigles et vocabulaire', desc: 'PCI, OST, MS4M, TRC, IRS…', chapitre: 'sigles' },
  { id: 'tout', title: 'Tout mélanger', desc: 'Des questions de tous les thèmes.', chapitre: null },
];

const PARTS = ['Circonstanciel', 'Signes particuliers', 'Gestes effectués'];
const classer = (quote, part, why) => ({
  q: 'Dans quelle partie du bilan écrit-on ceci ?', quote, options: PARTS, answer: part, fixed: true,
  why: why || `Cela s’écrit dans : ${PARTS[part].toLowerCase()}.`,
});
const BILANS = ['Neuro', 'Circu', 'Respi'];
const ranger = (item, b) => ({
  q: `Dans quel bilan note-t-on : ${item} ?`, options: BILANS, answer: b, fixed: true,
  why: `Cela fait partie du bilan ${BILANS[b].toLowerCase()}.`,
});
const qcm = (q, good, bad, why) => ({ q, good, bad, why });

const BANK = {
  regards: [
    qcm('Que signifient les 3 S du bilan circonstanciel ?', 'Sécurité, scène, situation', ['Sécurité, signes, surveillance', 'Scène, secours, soins', 'Situation, sévérité, symptômes'], 'Sécurité, scène, situation : on les vérifie avant d’approcher la victime.'),
    qcm('Dans les 3 S, quelle question correspond à « Scène » ?', 'Les moyens humains et matériels sont-ils suffisants, l’accès est-il possible ?', ['La victime est-elle consciente ?', 'Que s’est-il passé ?', 'Mon équipe est-elle en sécurité ?'], 'La scène, ce sont les moyens et l’accès. « Que s’est-il passé » relève de la situation.'),
    qcm('Dans XABCDE, que recherche-t-on avec le X ?', 'Une hémorragie', ['Un arrêt respiratoire', 'Une perte de connaissance', 'Une fracture'], 'X pour eXsanguination : on traite d’abord l’hémorragie.'),
    qcm('Dans XABCDE, à quoi correspond le A ?', 'Airways : les voies aériennes', ['Allergies', 'Antécédents', 'Arrêt cardiaque'], 'A pour Airways : les voies aériennes sont-elles libres ?'),
    qcm('Dans XABCDE, à quoi correspond le D ?', 'Disability : la conscience', ['Douleur', 'Détresse respiratoire', 'Déformation'], 'D pour Disability : la victime est-elle consciente ?'),
    qcm('Quel principe guide l’ordre du bilan ?', 'On traite ce qui tue en premier', ['On commence par l’identité', 'On commence par la douleur', 'On suit l’ordre où la victime parle'], 'C’est le principe du bilan primaire.'),
    qcm('Quel bilan vient juste après le bilan primaire ?', 'Le bilan secondaire', ['Le bilan complémentaire', 'La surveillance', 'Le bilan circonstanciel'], 'Circonstanciel, primaire, secondaire, complémentaire, puis surveillance.'),
    qcm('Que contient le bilan secondaire ?', 'Les bilans neurologique, ventilatoire et circulatoire', ['OPQRST et SAMPLE', 'Les 3 S', 'Les gestes effectués'], 'Le secondaire regroupe neuro, ventilatoire et circulatoire, avec les constantes.'),
    qcm('À quoi sert OPQRST ?', 'À décrire la plainte de la victime', ['À rechercher une hémorragie', 'À évaluer la conscience', 'À vérifier la sécurité'], 'Origine, provoqué par, qualité, région, sévérité, temps.'),
    qcm('Dans OPQRST, que demande le Q ?', 'La qualité : ce que ressent la victime (ça serre, ça pique…)', ['La quantité de sang perdu', 'Qui a appelé les secours', 'Le quartier où elle habite'], 'Q pour qualité de la sensation.'),
    qcm('Dans OPQRST, que demande le S ?', 'La sévérité, sur une échelle de 0 à 10', ['Les signes associés', 'La saturation', 'Le sexe de la victime'], 'S pour sévérité.'),
    qcm('Dans SAMPLE, que signifie le L ?', 'Last meal : le dernier repas', ['Lésions', 'Localisation de la douleur', 'Lieu de l’intervention'], 'Last meal : heure et consistance du dernier repas.'),
    qcm('Dans SAMPLE, que signifie le M ?', 'Médicaments', ['Malaise', 'Motricité', 'Mécanisme'], 'M pour médicaments : la prescription, et si la victime les a pris.'),
    qcm('Dans SAMPLE, que signifie le P ?', 'Passé médical', ['Pouls', 'Plainte', 'Pupilles'], 'P pour passé médical : antécédents et hospitalisations.'),
    qcm('Sans détresse vitale, à quel rythme refait-on un bilan de surveillance ?', 'Toutes les 10 à 15 minutes', ['Toutes les 2 minutes', 'Toutes les 30 minutes', 'Une seule fois, à la fin'], 'Toutes les 10 à 15 minutes, et toutes les 5 minutes en cas de détresse vitale.'),
    qcm('Avec une détresse vitale, à quel rythme refait-on un bilan ?', 'Toutes les 5 minutes', ['Toutes les 15 minutes', 'Toutes les 30 minutes', 'Toutes les heures'], 'En cas de détresse vitale, un nouveau bilan toutes les 5 minutes.'),
  ],

  parties: [
    classer('Homme de 34 ans qui a fait une chute mécanique sans PCI et se plaint d’une douleur au genou.', 0, 'H/F + âge + histoire + plainte : c’est la formule du circonstanciel.'),
    classer('La victime est retrouvée assise au sol.', 0, 'La façon dont la victime est trouvée fait partie du circonstanciel.'),
    classer('Elle est amenée en chaise au PSA après appel de la sécurité.', 0, 'L’arrivée jusqu’aux secours appartient au circonstanciel.'),
    classer('La victime se présente spontanément au poste de secours en marchant, accompagnée de ses amis.', 0),
    classer('Femme de 28 ans qui se plaint de nausées et d’une douleur à la poitrine.', 0),
    classer('En chutant, sa tête a cogné le sol, pas de perte de connaissance.', 0, 'C’est ce que la victime raconte de l’événement : circonstanciel.'),
    classer('Nous explique avoir eu un malaise avec une courte absence d’environ 5 sec en se levant de son siège.', 0, 'C’est le récit de la victime, avant l’arrivée des secours.'),
    classer('À son arrivée au PSA la victime est debout, consciente et orientée.', 1, 'Les signes particuliers commencent par la situation à l’arrivée.'),
    classer('Prise du premier taz à 00h30 et deuxième taz à 2h.', 1, 'Les réponses aux questions sur la consommation vont dans les signes particuliers.'),
    classer('Céphalées évaluées à 7/10 depuis 1h, douleur qui lance dans toute la tête.', 1),
    classer('Glasgow 13 (Y3 - V4 - M6)', 1),
    classer('FC 141 BFRS', 1),
    classer('Sat 99 % AA', 1),
    classer('Pas d’ATCD, pas de traitement, pas d’allergie.', 1, 'Antécédents, traitements et allergies terminent les signes particuliers.'),
    classer('Douleur médio-thoracique rétrosternale, constrictive (ça serre).', 1),
    classer('ATCD cardiaque familial : infarctus père à 55 ans.', 1, 'Les antécédents liés à la plainte se notent dans les signes particuliers.'),
    classer('Mobilité et sensibilité du membre conservées.', 1),
    classer('Dernier repas à 19h (il y a 2h).', 1),
    classer('Température 36.5°, glycémie 3.8 mmol/L.', 1),
    classer('Pas de signes de détresse circu.', 1, 'L’absence de détresse s’écrit aussi, dans les signes particuliers.'),
    classer('Bilan complet', 2, 'Le bilan lui-même est un geste.'),
    classer('Surveillance', 2, 'La surveillance est un geste effectué.'),
    classer('Mis au repos assis', 2),
    classer('Application de poche de froid', 2),
    classer('Bilan trauma', 2, 'Le bilan trauma se note dans les gestes effectués.'),
    classer('Nettoyage et pansement', 2),
    qcm('Quelle est la formule du circonstanciel ?', 'H/F + âge + histoire ayant motivé les secours + plainte', ['Nom + prénom + adresse + plainte', 'Constantes + plainte + gestes', 'Heure + lieu + nombre de victimes'], 'On ouvre par le sexe et l’âge, puis l’histoire et la plainte.'),
    qcm('Dans le circonstanciel, que fait-on si le bilan contredit l’histoire racontée ?', 'On écrit ce que la personne explique comme motif', ['On réadapte l’histoire selon le bilan', 'On supprime l’histoire', 'On n’écrit que les constantes'], 'On ne réadapte pas l’histoire selon les éléments du bilan.'),
    qcm('Le circonstanciel décrit…', 'ce qui s’est passé avant l’arrivée des secours', ['ce que les secouristes constatent', 'les gestes réalisés', 'l’évolution pendant la surveillance'], 'Circonstanciel : avant l’arrivée des secours.'),
    qcm('Par quoi commencent les signes particuliers ?', 'La situation à l’arrivée : position, conscience, orientation', ['Les gestes effectués', 'L’identité de la victime', 'Les antécédents'], 'On commence par la situation initiale, une fois arrivé au PSA.'),
    qcm('En cas de malaise, qu’ajoute-t-on aux bilans circu, respi et neuro ?', 'Température, glycémie et FAST', ['Seulement la tension', 'Un bilan trauma', 'Rien de plus'], 'Température, glycémie et FAST en cas de malaise.'),
    qcm('S’il y a eu alcool ou drogue, que demande-t-on ?', 'Quantité, heure de prise, prise habituelle, effets de la dernière prise, lieu d’achat', ['Seulement le type de produit', 'Le prix payé', 'Rien, cela ne se note pas'], 'Quantité ? Heure de prise ? Prise habituelle ? Effets lors de la dernière prise ? Achat sur place ou auprès du revendeur habituel ?'),
    qcm('Dans l’application, que trouve-t-on en tête des signes particuliers ?', 'Les signes de détresse', ['Les gestes effectués', 'L’adresse de la victime', 'Le bilan complémentaire'], 'Les signes de détresse sont placés en premier pour être lus tout de suite.'),
  ],

  bilans: [
    ranger('le score de Glasgow', 0), ranger('l’OST', 0), ranger('la MS4M', 0), ranger('la PCI', 0), ranger('les pupilles', 0), ranger('le FAST', 0),
    ranger('la fréquence cardiaque', 1), ranger('la tension (TAD, TAG)', 1), ranger('le TRC', 1), ranger('les marbrures et la pâleur', 1), ranger('la coloration des conjonctives', 1), ranger('la sensation de soif', 1),
    ranger('la fréquence respiratoire', 2), ranger('la saturation', 2), ranger('les sifflements et le tirage', 2), ranger('le battement des ailes du nez', 2),
    qcm('Quel est le score de Glasgow maximal ?', '15', ['10', '12', '20'], 'Y 4 + V 5 + M 6 = 15.'),
    qcm('Quel est le score de Glasgow minimal ?', '3', ['0', '1', '5'], 'Chaque réponse vaut au moins 1 : 1 + 1 + 1 = 3.'),
    qcm('Dans le Glasgow, combien de points au maximum pour la réponse motrice (M) ?', '6', ['4', '5', '10'], 'Yeux sur 4, verbale sur 5, motrice sur 6.'),
    qcm('Dans le Glasgow, combien de points au maximum pour l’ouverture des yeux (Y) ?', '4', ['3', '5', '6'], 'Yeux sur 4, verbale sur 5, motrice sur 6.'),
    qcm('Y3 - V4 - M6 : quel est le Glasgow ?', '13', ['12', '14', '15'], '3 + 4 + 6 = 13. On écrit : Glasgow 13 (Y3 - V4 - M6).'),
    qcm('Une victime ouvre les yeux à la demande. Combien de points pour Y ?', '3', ['4', '2', '1'], '4 spontanée, 3 à la demande, 2 à la douleur, 1 aucune.'),
    qcm('Une réponse verbale confuse vaut…', '4', ['5', '3', '2'], '5 orientée, 4 confuse, 3 inappropriée, 2 incompréhensible, 1 aucune.'),
    qcm('Que recherche le FAST ?', 'Les signes d’un AVC', ['Une hypoglycémie', 'Une hémorragie', 'Une détresse respiratoire'], 'Face, Arm, Speech, Time.'),
    qcm('Dans FAST, que signifie le T ?', 'Time : l’heure de début des signes', ['Tension', 'Température', 'Traumatisme'], 'Time : on note l’heure du premier signe.'),
    qcm('Quels sont les trois critères des pupilles ?', 'Taille, réactivité, symétrie', ['Couleur, forme, humidité', 'Taille, couleur, mobilité', 'Réactivité, douleur, larmes'], 'Taille (myosis, intermédiaires, mydriase), réactivité et symétrie.'),
    qcm('Chez l’adulte, la fréquence respiratoire normale est de…', '12 à 20 par minute', ['6 à 10 par minute', '20 à 30 par minute', '30 à 40 par minute'], '12 à 20 mouvements par minute chez l’adulte.'),
    qcm('Chez l’adulte, la fréquence cardiaque normale est de…', '60 à 100 par minute', ['40 à 60 par minute', '100 à 140 par minute', '120 à 160 par minute'], '60 à 100 battements par minute chez l’adulte.'),
    qcm('Le TRC normal est…', 'inférieur à 2 secondes', ['supérieur à 5 secondes', 'égal à 10 secondes', 'compris entre 3 et 5 secondes'], 'Temps de recoloration cutanée inférieur à 2 secondes.'),
    qcm('À partir de quelle glycémie parle-t-on d’hypoglycémie ?', 'En dessous de 0,6 g/L (3,3 mmol/L)', ['En dessous de 1,26 g/L (7 mmol/L)', 'En dessous de 2 g/L', 'Au-dessus de 0,6 g/L'], 'Référentiel : 60 mg/dL, 0,6 g/L, 3,3 mmol/L.'),
    qcm('Quelle tension systolique est un signe de gravité ?', 'Inférieure à 90 mmHg', ['Inférieure à 120 mmHg', 'Égale à 130 mmHg', 'Inférieure à 150 mmHg'], 'Systolique inférieure à 90 mmHg, ou baisse de plus de 30 % chez une victime hypertendue.'),
    qcm('Quelle est la saturation cible en général ?', '94 à 98 %', ['80 à 85 %', '85 à 90 %', '100 % obligatoirement'], 'Cible de 94 à 98 %, et 89 à 94 % chez l’insuffisant respiratoire chronique.'),
    qcm('Avec la saturation, que faut-il préciser ?', 'Si elle est prise en air ambiant ou sous O2', ['Le bras utilisé', 'La couleur des ongles', 'L’heure du dernier repas'], 'On écrit « Sat 99 % AA » ou on précise le débit d’oxygène.'),
    qcm('Pourquoi prendre la tension aux deux bras et demander la tension de référence ?', 'Pour comparer les deux côtés et avec la tension habituelle', ['Pour gagner du temps', 'Parce qu’un seul bras suffit rarement à lire le chiffre', 'Pour remplacer la prise du pouls'], 'On note TAD, TAG et la tension de référence.'),
  ],

  sigles: [
    qcm('Que signifie PCI ?', 'Perte de connaissance initiale', ['Prise en charge initiale', 'Pouls carotidien irrégulier', 'Plaie cutanée importante'], 'PCI : perte de connaissance initiale.'),
    qcm('Que signifie OST ?', 'Orientation spatio-temporelle', ['Observation des signes de traumatisme', 'Ouverture spontanée des yeux', 'Oxygène sous tension'], 'La victime sait où elle est et quand.'),
    qcm('Que signifie MS4M ?', 'Motricité et sensibilité des 4 membres', ['Mesure de la saturation sur 4 minutes', 'Mobilisation en sécurité à 4 mains', 'Malaise sans 4 des signes majeurs'], 'Motricité et sensibilité des 4 membres.'),
    qcm('Que signifie TRC ?', 'Temps de recoloration cutanée', ['Tension, respiration, conscience', 'Traumatisme du rachis cervical', 'Température rectale corrigée'], 'Temps de recoloration cutanée, normal en dessous de 2 secondes.'),
    qcm('Dans « Sat 99 % AA », que veut dire AA ?', 'Air ambiant', ['Après aspiration', 'Avec assistance', 'Aucune anomalie'], 'La saturation est mesurée sans oxygène.'),
    qcm('Que signifie ATCD ?', 'Antécédents', ['Attitude, tonus, conscience, douleur', 'Aucun traitement connu déclaré', 'Arrêt du traitement en cours'], 'ATCD : antécédents.'),
    qcm('Pour les pupilles, que signifie IRS ?', 'Intermédiaires, réactives, symétriques', ['Inégales, rondes, serrées', 'Immobiles, rouges, sèches', 'Irrégulières, réactives, sensibles'], 'Taille intermédiaire, réactives à la lumière, symétriques.'),
    qcm('Une mydriase, c’est…', 'une pupille dilatée', ['une pupille serrée', 'une paupière tombante', 'un œil rouge'], 'Mydriase : pupille dilatée. Myosis : pupille serrée.'),
    qcm('Un myosis, c’est…', 'une pupille serrée', ['une pupille dilatée', 'une vision trouble', 'un saignement de l’œil'], 'Myosis : pupille serrée.'),
    qcm('Une anisocorie, c’est…', 'des pupilles de tailles différentes', ['des pupilles qui ne réagissent pas', 'une douleur à la lumière', 'une perte de la vision'], 'Les deux pupilles n’ont pas la même taille.'),
    qcm('Dans « FC 93 BFRS », que décrit BFRS ?', 'Le pouls : bien frappé, régulier, symétrique', ['La respiration', 'Les pupilles', 'La conscience'], 'Amplitude (bien frappé), régularité et symétrie du pouls.'),
    qcm('Dans « FR 12 ARS », que décrit ARS ?', 'La respiration', ['Le pouls', 'Les pupilles', 'La tension'], 'ARS qualifie l’amplitude et la régularité de la respiration.'),
    qcm('Dans l’application, que signifie TAD ?', 'Tension artérielle au bras droit', ['Tension artérielle diastolique', 'Température axillaire droite', 'Traumatisme avec déformation'], 'TAD : bras droit. TAG : bras gauche.'),
    qcm('Que signifie MHTA ?', 'Maladies, hospitalisations, traitements, allergies', ['Motricité, hémorragie, température, allergies', 'Malaise, hypoglycémie, traumatisme, AVC', 'Médicaments, heure, tension, âge'], 'Maladies, hospitalisations, traitements, allergies.'),
    qcm('Une épistaxis, c’est…', 'un saignement du nez', ['un saignement de l’oreille', 'une douleur à l’estomac', 'une éruption sur la peau'], 'Épistaxis : saignement du nez.'),
    qcm('Une otorragie, c’est…', 'un saignement de l’oreille', ['un saignement du nez', 'une douleur à l’oreille', 'une surdité brutale'], 'Otorragie : saignement de l’oreille.'),
    qcm('Des céphalées, ce sont…', 'des maux de tête', ['des vertiges', 'des nausées', 'des troubles de la vision'], 'Céphalées : maux de tête.'),
    qcm('Une chute mécanique, c’est…', 'une chute due à une cause extérieure, sans malaise', ['une chute causée par un malaise', 'une chute depuis une machine', 'une chute avec perte de connaissance'], 'Glissade, obstacle… et non un malaise.'),
    qcm('Une embarrure, c’est…', 'une déformation du crâne', ['un saignement du nez', 'une raideur de la nuque', 'une fracture du bassin'], 'Embarrure : enfoncement de l’os du crâne.'),
    qcm('Que signifie DSI dans une intoxication ?', 'Dose supposée ingérée', ['Durée du sommeil induit', 'Détresse sans intoxication', 'Douleur sans irradiation'], 'DSI : dose supposée ingérée.'),
    qcm('Que désigne un AIT ?', 'Des signes d’AVC qui disparaissent', ['Un arrêt cardiaque', 'Une allergie grave', 'Une crise d’asthme'], 'Accident ischémique transitoire.'),
    qcm('Une douleur « constrictive », c’est une douleur…', 'qui serre', ['qui pique', 'qui brûle', 'qui lance'], 'Sensation que ça serre : douleur constrictive.'),
  ],

  // Complétées par des questions générées depuis le Mémo Bilans Spé (voir speQuestions).
  spe: [
    qcm('Quelle position d’attente pour une suspicion d’AVC ?', 'Allongé strict', ['Assis penché en avant', 'Assis jambes pendantes', 'Debout'], 'AVC : allongé strict.'),
    qcm('Quelle position d’attente pour une crise d’asthme ?', 'Assis, penché en avant', ['Allongé strict', 'Allongé jambes relevées', 'Sur le ventre'], 'Asthme : assis et penché en avant.'),
    qcm('Quelle position d’attente pour un OAP sans détresse circulatoire ?', 'Assis jambes pendantes', ['Allongé strict', 'Allongé jambes relevées', 'Sur le côté'], 'OAP : assis jambes pendantes, demi-assis jambes allongées si détresse circulatoire.'),
    qcm('Douleur thoracique sans détresse : quelle position ?', 'Celle où la victime se sent le mieux', ['Toujours allongée jambes relevées', 'Toujours debout', 'Toujours sur le ventre'], 'Position de confort ; allongée en cas de détresse.'),
    qcm('Quand parle-t-on d’état de mal convulsif ?', 'Une crise de plus de 5 min, ou plusieurs crises sans récupération', ['Dès la première crise', 'Une crise de 30 secondes', 'Une crise suivie d’un réveil rapide'], 'C’est une urgence absolue.'),
    qcm('Dans quel ordre se déroule une crise convulsive généralisée ?', 'Début, phase tonique, phase clonique, récupération', ['Clonique, tonique, début, récupération', 'Récupération, tonique, clonique', 'Tonique, récupération, clonique'], 'Chute avec PCI brutale, phase tonique, phase clonique, puis récupération.'),
    qcm('Pour un AVC, quel écart maximal entre les deux tensions systoliques ?', 'Moins de 20 mmHg', ['Moins de 50 mmHg', 'Aucun écart toléré', 'Moins de 5 mmHg'], 'Symétrie des tensions : moins de 20 mmHg d’écart sur la systolique.'),
    qcm('Pour un AVC, de combien de temps dispose-t-on pour agir après le premier signe ?', '4 heures', ['30 minutes', '12 heures', '24 heures'], 'D’où l’importance de noter l’heure du premier signe.'),
    qcm('Face à une suspicion de méningite, que doit faire l’équipe ?', 'Porter les EPI : gants, masque, lunettes, combinaison', ['Donner à boire à la victime', 'Faire marcher la victime', 'Retirer ses propres gants'], 'Les EPI sont obligatoires.'),
    qcm('Hyperthermie : à partir de quelle température parle-t-on de détresse vitale ?', 'Au-dessus de 40 °C', ['Au-dessus de 37,5 °C', 'Au-dessus de 38 °C', 'Au-dessus de 45 °C'], 'Au-dessus de 40 °C : coup de chaleur ou hyperthermie maligne d’effort.'),
    qcm('Douleur abdominale chez une femme : que faut-il rechercher en plus ?', 'Une possibilité de grossesse', ['Une fracture du bassin', 'Une otorragie', 'Une raideur de la nuque'], 'Rapports, contraception, date des dernières règles ; penser à la grossesse extra-utérine.'),
    qcm('Dans la douleur thoracique, pourquoi regarder les mollets ?', 'Pour rechercher une embolie pulmonaire', ['Pour vérifier la tension', 'Pour évaluer la conscience', 'Pour rechercher un AVC'], 'Mollets douloureux, sédentarité, voyage long : penser à l’embolie pulmonaire.'),
    qcm('Traumatisme du rachis : quand immobilise-t-on ?', 'Si les réponses ne sont pas fiables ou s’il y a un signe d’atteinte', ['Jamais', 'Seulement si la victime le demande', 'Uniquement chez l’enfant'], 'Et aussi si ATCD à risque et mécanisme à risque.'),
    qcm('Intoxication aux opioïdes : quand ventile-t-on artificiellement ?', 'Si la FR est inférieure à 6', ['Si la FR est inférieure à 20', 'Dès que la victime est somnolente', 'Jamais'], 'Ventilation artificielle si FR < 6.'),
  ],
};

// Questions générées depuis le Mémo Bilans Spé : « Dans quel bilan spé recherche-t-on … ? »
function speQuestions(rng) {
  const titles = MEMO_SPE.map((m) => m.title);
  return MEMO_SPE.flatMap((m) => (m.q || []).map((item) => {
    // Les fiches qui recherchent aussi cet élément ne servent pas de mauvaises réponses.
    const key = item.toLowerCase().split(/[ ,]/)[0];
    const others = MEMO_SPE.filter((o) => o !== m && !o.items.concat(o.q || []).some((x) => x.toLowerCase().includes(key))).map((o) => o.title);
    return qcm(`Dans quel bilan spé recherche-t-on : ${item.charAt(0).toLowerCase()}${item.slice(1)} ?`, m.title, pick(others.length >= 3 ? others : titles.filter((x) => x !== m.title), 3, rng), `C’est un élément du bilan spé « ${m.title} ».`);
  }));
}

function shuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const pick = (arr, n, rng) => shuffle(arr, rng).slice(0, n);

export function pool(themeId, rng = Math.random) {
  if (themeId === 'tout') return THEMES.filter((t) => t.id !== 'tout').flatMap((t) => pool(t.id, rng));
  const base = BANK[themeId] || [];
  return themeId === 'spe' ? [...base, ...speQuestions(rng)] : base;
}

// Tire n questions : { q, quote?, options, answer (indice), why }.
export function drawQuiz(themeId, n = 10, rng = Math.random) {
  return pick(pool(themeId, rng), n, rng).map((x) => {
    if (x.fixed) return { q: x.q, quote: x.quote, options: x.options, answer: x.answer, why: x.why };
    const options = shuffle([x.good, ...x.bad], rng);
    return { q: x.q, quote: x.quote, options, answer: options.indexOf(x.good), why: x.why };
  });
}
