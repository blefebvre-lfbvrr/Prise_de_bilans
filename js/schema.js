// Description déclarative du formulaire de bilan.
// Chaque champ peut définir comment il se traduit en ligne(s) dans le bilan rendu :
//   - tri    : `yes` / `no` (phrase pour Oui / Non)
//   - radio  : `out` sur chaque option
//   - text   : `fmt(v)` et `noneOut` (si la valeur commence par « Aucun »)
//   - eva    : `fmt(v)`
//   - out(v, s) : surcharge complète (retourne une chaîne, un tableau ou null)

export const has = (s, key, v) => Array.isArray(s[key]) && s[key].includes(v);
const isF = (s) => s.sexe === 'F';
export const fmtTime = (v) => (v ? String(v).replace(/^0?(\d+):(\d\d).*$/, (_, h, m) => (m === '00' ? `${h}h` : `${h}h${m}`)) : v);

const tri = (name, label, yes, no, extra = {}) => ({ type: 'tri', name, label, yes, no, ...extra });
const text = (name, label, extra = {}) => ({ type: 'text', name, label, ...extra });
const area = (name, label, extra = {}) => ({ type: 'textarea', name, label, ...extra });
const eva = (name, label, fmt, extra = {}) => ({ type: 'eva', name, label, fmt, ...extra });

export const DOULEUR_TYPES = [
  { v: 'pique', l: 'Pique', out: 'Douleur qui pique' },
  { v: 'brule', l: 'Brûle', out: 'Douleur à type de brûlure' },
  { v: 'lance', l: 'Lance', out: 'Douleur qui lance' },
  { v: 'serre', l: 'Serre', out: 'Douleur qui serre' },
  { v: 'tire', l: 'Tire', out: 'Douleur qui tire' },
  { v: 'appuie', l: 'Appuie / pesanteur', out: 'Douleur à type de pesanteur' },
  { v: 'sourde', l: 'Sourde', out: 'Douleur sourde' },
  { v: 'crampe', l: 'Crampe', out: 'Douleur à type de crampe' },
];

// ---------------------------------------------------------------------------
// Types de détresse
// ---------------------------------------------------------------------------
export const DETRESSES = [
  { v: 'malaise', l: 'Malaise' },
  { v: 'intox', l: 'Alcool / drogue' },
  { v: 'thoracique', l: 'Douleur thoracique' },
  { v: 'respi', l: 'Difficulté respiratoire' },
  { v: 'abdo', l: 'Douleur abdominale' },
  { v: 'tc', l: 'Traumatisme crânien' },
  { v: 'trauma', l: 'Traumatisme membre / corps' },
  { v: 'plaie', l: 'Plaie / brûlure' },
  { v: 'autre', l: 'Autre' },
];

// ---------------------------------------------------------------------------
// Signes de détresse vitale
// ---------------------------------------------------------------------------
export const SIGNES_DETRESSE = [
  {
    name: 'sd_neuro',
    title: 'Neuro',
    long: 'neuro',
    options: [
      { v: 'pci', l: 'Perte de connaissance' },
      { v: 'glasgow', l: 'Glasgow < 15' },
      { v: 'confusion', l: 'Désorientation / confusion' },
      { v: 'convulsions', l: 'Convulsions' },
      { v: 'deficit', l: 'Déficit moteur / sensitif' },
      { v: 'fast', l: 'FAST positif' },
      { v: 'pupilles', l: 'Pupilles asymétriques' },
      { v: 'agitation', l: 'Agitation / somnolence' },
    ],
  },
  {
    name: 'sd_respi',
    title: 'Respi',
    long: 'respi',
    options: [
      { v: 'fr', l: 'Fréquence respiratoire anormale' },
      { v: 'sat', l: 'Saturation < 94 %' },
      { v: 'tirage', l: 'Tirage / muscles respiratoires' },
      { v: 'parole', l: 'Difficulté à parler' },
      { v: 'cyanose', l: 'Cyanose' },
      { v: 'bruits', l: 'Bruits respiratoires (sifflements…)' },
      { v: 'sueurs', l: 'Sueurs' },
    ],
  },
  {
    name: 'sd_circu',
    title: 'Circu',
    long: 'circu',
    options: [
      { v: 'fc', l: 'Fréquence cardiaque anormale' },
      { v: 'ta', l: 'TA systolique < 90' },
      { v: 'trc', l: 'TRC > 2 sec' },
      { v: 'pouls', l: 'Pouls radial non perçu' },
      { v: 'paleur', l: 'Pâleur' },
      { v: 'marbrures', l: 'Marbrures' },
      { v: 'sueurs', l: 'Sueurs' },
      { v: 'hemorragie', l: 'Hémorragie' },
      { v: 'soif', l: 'Sensation de soif' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Onglets / groupes / champs
// ---------------------------------------------------------------------------
export const TABS = [
  {
    id: 'detresse',
    title: 'Détresse',
    groups: [
      {
        title: 'Type(s) de détresse',
        hint: 'Sélectionner une ou plusieurs détresses : les bilans spécifiques correspondants apparaîtront.',
        fields: [
          { type: 'checks', name: 'detresse', label: '', options: DETRESSES, big: true },
          text('detresse_autre', 'Préciser', { show: (s) => has(s, 'detresse', 'autre') }),
        ],
      },
    ],
  },
  {
    id: 'identite',
    title: 'Identité',
    groups: [
      {
        title: 'Identité de la victime',
        fields: [
          text('nom', 'Nom', { autocap: 'characters' }),
          text('prenom', 'Prénom', { autocap: 'words' }),
          {
            type: 'radio',
            name: 'sexe',
            label: 'Sexe',
            options: [
              { v: 'H', l: 'Homme' },
              { v: 'F', l: 'Femme' },
            ],
          },
          { type: 'date', name: 'ddn', label: 'Date de naissance' },
          { type: 'number', name: 'age', label: 'Âge (calculé ou saisi)', suffix: 'ans', min: 0, max: 130 },
          text('nationalite', 'Nationalité', { autocap: 'words' }),
          text('pays_naissance', 'Pays de naissance', { autocap: 'words' }),
          area('adresse', 'Adresse'),
          text('acred', 'Accréditation / n° de dossard'),
        ],
      },
    ],
  },
  {
    id: 'circonstances',
    title: 'Circonstances',
    groups: [
      {
        title: 'Prise en charge',
        fields: [
          { type: 'date', name: 'date_pec', label: 'Date' },
          { type: 'time', name: 'heure_pec', label: 'Heure' },
        ],
      },
      {
        title: 'Circonstanciel (avant arrivée des secours)',
        hint: 'Ce que la victime explique comme motif, sans réadapter l’histoire selon le bilan.',
        fields: [
          area('histoire', 'Histoire', {
            placeholder: 'a fait une chute mécanique sans PCI…',
            help: 'Commencer en minuscule pour enchaîner : « Homme de 34 ans qui … »',
          }),
          text('plainte', 'Se plaint de', { placeholder: 'une douleur au genou' }),
          {
            type: 'radio',
            name: 'decouverte',
            label: 'Découverte de la victime',
            vertical: true,
            options: [
              { v: 'spontane', l: 'Se présente spontanément au PSA en marchant', out: 'La victime se présente spontanément au poste de secours en marchant' },
              { v: 'assise_sol', l: 'Retrouvée assise au sol', out: 'La victime est retrouvée assise au sol' },
              { v: 'allongee_sol', l: 'Retrouvée allongée au sol', out: 'La victime est retrouvée allongée au sol' },
              { v: 'assise', l: 'Retrouvée assise', out: 'La victime est retrouvée assise' },
              { v: 'debout', l: 'Retrouvée debout', out: 'La victime est retrouvée debout' },
            ],
          },
          text('accompagne', 'Accompagnée de', { placeholder: 'ses amis' }),
          {
            type: 'radio',
            name: 'moyen',
            label: 'Amenée au PSA',
            vertical: true,
            show: (s) => s.decouverte && s.decouverte !== 'spontane',
            options: [
              { v: 'chaise', l: 'En chaise', out: 'Amenée en chaise au PSA' },
              { v: 'marche', l: 'En marchant', out: 'Amenée en marchant au PSA' },
              { v: 'soutenue', l: 'Soutenue par les secouristes', out: 'Amenée au PSA soutenue par les secouristes' },
              { v: 'brancard', l: 'En brancard', out: 'Amenée en brancard au PSA' },
              { v: 'sur_place', l: 'Prise en charge sur place', out: 'Prise en charge sur place' },
            ],
          },
          {
            type: 'radio',
            name: 'appel',
            label: 'Suite à',
            vertical: true,
            show: (s) => s.decouverte && s.decouverte !== 'spontane',
            options: [
              { v: 'securite', l: 'Appel de la sécurité', out: 'après appel de la sécurité' },
              { v: 'temoin', l: 'Appel d’un témoin', out: 'après appel d’un témoin' },
              { v: 'proche', l: 'Appel d’un proche', out: 'après appel d’un proche' },
              { v: 'orga', l: 'Appel de l’organisation', out: 'après appel de l’organisation' },
              { v: 'maraude', l: 'Repérée par une équipe', out: 'après repérage par une équipe de secours' },
            ],
          },
          area('circ_autre', 'Autres éléments du circonstanciel'),
        ],
      },
    ],
  },
  {
    id: 'signes',
    title: 'Signes',
    groups: [
      {
        id: 'arrivee',
        title: 'À l’arrivée au PSA',
        fields: [
          {
            type: 'radio',
            name: 'arr_position',
            label: 'Position',
            options: [
              { v: 'debout', l: 'Debout' },
              { v: 'assise', l: 'Assise' },
              { v: 'allongée', l: 'Allongée' },
            ],
          },
          {
            type: 'radio',
            name: 'arr_conscience',
            label: 'Conscience',
            options: [
              { v: 'consciente', l: 'Consciente' },
              { v: 'inconsciente', l: 'Inconsciente' },
            ],
          },
          {
            type: 'radio',
            name: 'arr_orientation',
            label: 'Orientation',
            show: (s) => s.arr_conscience !== 'inconsciente',
            options: [
              { v: 'orientée', l: 'Orientée' },
              { v: 'désorientée', l: 'Désorientée' },
            ],
          },
        ],
      },
      {
        id: 'detresses_vitales',
        title: 'Signes de détresse',
        hint: 'Affichés en premier dans le bilan. Cocher « Aucun » pour noter l’absence de détresse.',
        fields: SIGNES_DETRESSE.map((g) => ({
          type: 'checks',
          name: g.name,
          label: g.title,
          options: [{ v: 'aucun', l: 'Aucun', exclusive: true }, ...g.options],
        })),
      },

      // ---------------------------------------------------------------- Spé
      {
        id: 'intox',
        spe: 'intox',
        title: 'Spé alcool / drogue',
        fields: [
          text('ix_alcool', 'Alcool (type et quantité)', { placeholder: '1 verre de bière, 3 verres de vodka', out: () => null }),
          text('ix_drogue', 'Drogue (type et quantité)', { placeholder: '2 taz', out: () => null }),
          text('ix_heures', 'Heure(s) de prise', {
            placeholder: 'premier taz à 00h30, deuxième à 2h',
            fmt: (v) => `Prise : ${v}`,
          }),
          {
            type: 'radio',
            name: 'ix_habitude',
            label: 'Consommation',
            options: [
              { v: 'habituelle', l: 'Habituelle', out: 'Consommation habituelle' },
              { v: 'occasionnelle', l: 'Occasionnelle', out: 'Consommation occasionnelle' },
              { v: 'premiere', l: 'Première fois', out: 'Première consommation' },
            ],
          },
          text('ix_effets', 'Effets lors de la dernière prise', { fmt: (v) => `Effets lors de la dernière prise : ${v}` }),
          {
            type: 'radio',
            name: 'ix_achat',
            label: 'Achat',
            options: [
              { v: 'sur_place', l: 'Sur place', out: 'Acheté sur place' },
              { v: 'revendeur', l: 'Revendeur habituel', out: 'Acheté auprès du revendeur habituel' },
              { v: 'inconnu', l: 'Inconnu', out: 'Provenance inconnue' },
            ],
          },
          {
            type: 'checks',
            name: 'ix_comportement',
            label: 'Comportement',
            options: [
              { v: 'agitee', l: 'Agitée' },
              { v: 'crispation', l: 'Crispation mâchoire / doigts' },
              { v: 'delire', l: 'Délire dans ses propos' },
              { v: 'incoherente', l: 'Propos incohérents' },
              { v: 'hallucinations', l: 'Hallucinations' },
              { v: 'euphorique', l: 'Euphorique' },
              { v: 'anxieuse', l: 'Anxieuse' },
              { v: 'somnolente', l: 'Somnolente' },
            ],
            out: (v) => {
              if (!v || !v.length) return null;
              const p = {
                agitee: 'est agitée',
                crispation: 'présente une crispation de la mâchoire et des doigts',
                delire: 'délire dans ses propos',
                incoherente: 'tient des propos incohérents',
                hallucinations: 'présente des hallucinations',
                euphorique: 'est euphorique',
                anxieuse: 'est anxieuse',
                somnolente: 'est somnolente',
              };
              return v.map((k) => `La victime ${p[k]}`);
            },
          },
          area('ix_autre', 'Autres éléments'),
        ],
        out: (s, lines) => {
          const conso = joinEt([s.ix_alcool, s.ix_drogue].map((x) => (x || '').trim()));
          return [conso ? `La victime a consommé ${conso}` : null, ...lines];
        },
      },
      {
        id: 'malaise',
        spe: 'malaise',
        title: 'Spé malaise',
        fields: [
          text('ml_contexte', 'Circonstances du malaise', {
            placeholder: 'en se levant de son siège',
            fmt: (v) => `Malaise survenu ${v}`,
          }),
          {
            type: 'checks',
            name: 'ml_prodromes',
            label: 'Signes avant le malaise',
            options: [
              { v: 'sueurs', l: 'Sueurs' },
              { v: 'vision', l: 'Vision trouble' },
              { v: 'bourdonnements', l: 'Bourdonnements' },
              { v: 'nausees', l: 'Nausées' },
              { v: 'faiblesse', l: 'Faiblesse' },
              { v: 'palpitations', l: 'Palpitations' },
              { v: 'fourmillements', l: 'Fourmillements' },
              { v: 'chaleur', l: 'Bouffée de chaleur' },
            ],
            fmt: (labels) => `Signes avant le malaise : ${labels.join(', ').toLowerCase()}`,
          },
          tri('ml_chute', 'Chute', 'Chute lors du malaise', 'Pas de chute'),
          tri('ml_fatigue', 'Fatigue', 'Se sent très fatiguée depuis', 'Pas de fatigue particulière'),
          tri('ml_atcd', 'Malaises antérieurs', 'ATCD de malaise similaire', 'Pas d’ATCD de malaise'),
          text('ml_hydratation', 'Hydratation', { placeholder: '1 L d’eau depuis ce matin', fmt: (v) => `Hydratation : ${v}` }),
          area('ml_autre', 'Autres éléments'),
        ],
      },
      {
        id: 'thoracique',
        spe: 'thoracique',
        title: 'Spé douleur thoracique',
        fields: [
          text('th_debut', 'Heure d’apparition', { placeholder: '12h30', fmt: (v) => `Douleur apparue à ${v}` }),
          text('th_depuis', 'Depuis', { placeholder: '1h', fmt: (v) => `Douleur présente depuis ${v}, ne passe pas` }),
          tri('th_effort', 'Apparue à l’effort', 'Douleur apparue à l’effort', 'Pas d’effort particulier'),
          eva('th_eva_repos', 'Douleur au repos', (v) => `Douleur évaluée à ${v}/10 au repos`),
          eva('th_eva_palpation', 'Douleur à la palpation', (v) => `Douleur à ${v}/10 à la palpation`),
          eva('th_eva_respi', 'Douleur à la respiration', (v) => `Douleur à ${v}/10 à la respiration`),
          {
            type: 'radio',
            name: 'th_loc',
            label: 'Localisation',
            vertical: true,
            options: [
              { v: 'retro', l: 'Médio-thoracique rétrosternale', out: 'médio-thoracique rétrosternale' },
              { v: 'gauche', l: 'Thoracique gauche', out: 'thoracique gauche' },
              { v: 'droite', l: 'Thoracique droite', out: 'thoracique droite' },
              { v: 'diffuse', l: 'Diffuse', out: 'thoracique diffuse' },
            ],
            out: () => null,
          },
          {
            type: 'radio',
            name: 'th_type',
            label: 'Type de douleur',
            vertical: true,
            options: [
              { v: 'constrictive', l: 'Constrictive (ça serre)', out: 'constrictive (ça serre)' },
              { v: 'pesanteur', l: 'Pesanteur (ça appuie)', out: 'à type de pesanteur (ça appuie)' },
              { v: 'brulure', l: 'Brûlure', out: 'à type de brûlure' },
              { v: 'poignard', l: 'Coup de poignard', out: 'en coup de poignard' },
              { v: 'pique', l: 'Qui pique', out: 'qui pique' },
            ],
            out: (v, s) => {
              const loc = optOut('th_loc', s.th_loc);
              const type = optOut('th_type', v);
              if (!loc && !type) return null;
              return `Douleur ${[loc, type].filter(Boolean).join(', ')}`;
            },
          },
          {
            type: 'checks',
            name: 'th_irradiation',
            label: 'Irradiation',
            options: [
              { v: 'aucune', l: 'Aucune', exclusive: true },
              { v: 'epaule_g', l: 'Épaule gauche', out: 'l’épaule gauche' },
              { v: 'bras_g', l: 'Bras gauche', out: 'le bras gauche' },
              { v: 'bras_d', l: 'Bras droit', out: 'le bras droit' },
              { v: 'machoire', l: 'Mâchoire', out: 'la mâchoire' },
              { v: 'dos', l: 'Dos', out: 'le dos' },
              { v: 'epigastre', l: 'Épigastre', out: 'l’épigastre' },
            ],
            out: (v) => {
              if (!v || !v.length) return null;
              if (v.includes('aucune')) return 'Pas d’irradiation';
              return `Irradiation de la douleur dans ${joinEt(v.map((k) => optOut('th_irradiation', k)))}`;
            },
          },
          tri('th_dyspnee', 'Sensation de manquer d’air', 'Sensation de manquer d’air', 'Pas de sensation de manque d’air'),
          tri('th_fourmis', 'Fourmillements dans les mains', 'Sensation de fourmillements dans les mains', 'Pas de fourmillements'),
          tri('th_mollets', 'Mollets souples et non douloureux', 'Mollets souples et non douloureux', 'Mollets tendus ou douloureux'),
          { type: 'subtitle', label: 'Facteurs de risque' },
          text('th_atcd_fam', 'ATCD cardiaque familial', {
            placeholder: 'infarctus père à 55 ans',
            none: 'Aucun',
            fmt: (v) => `ATCD cardiaque familial : ${v}`,
            noneOut: 'Pas d’ATCD cardiaque familial',
          }),
          text('th_tabac', 'Tabac', {
            placeholder: '1 paquet par jour depuis 10 ans',
            none: 'Aucun',
            fmt: (v) => `Tabac : ${v}`,
            noneOut: 'Non fumeur',
          }),
          tri('th_pilule', 'Pilule contraceptive', 'Prise de pilule contraceptive', 'Pas de pilule contraceptive', { show: isF }),
          tri('th_cholesterol', 'Cholestérol', 'Cholestérol', 'Pas de cholestérol'),
          tri('th_hta', 'Hypertension', 'Hypertension', 'Pas d’hypertension'),
          tri('th_diabete', 'Diabète', 'Diabète', 'Pas de diabète'),
          text('th_poids', 'Poids / surpoids', { placeholder: 'surpoids environ 90 kg', fmt: (v) => `Poids : ${v}` }),
        ],
      },
      {
        id: 'respi_spe',
        spe: 'respi',
        title: 'Spé difficulté respiratoire',
        fields: [
          text('rs_debut', 'Début des difficultés', { placeholder: 'il y a 20 min', fmt: (v) => `Difficultés respiratoires depuis ${v}` }),
          text('rs_declencheur', 'Facteur déclenchant', { placeholder: 'effort, fumée, poussière, stress…', fmt: (v) => `Facteur déclenchant : ${v}` }),
          {
            type: 'radio',
            name: 'rs_parole',
            label: 'Parole',
            vertical: true,
            options: [
              { v: 'phrases', l: 'Phrases complètes', out: 'Parle en phrases complètes' },
              { v: 'mots', l: 'Quelques mots', out: 'Ne parle que par quelques mots' },
              { v: 'impossible', l: 'Ne peut pas parler', out: 'Ne peut pas parler' },
            ],
          },
          tri('rs_sifflements', 'Sifflements', 'Sifflements respiratoires', 'Pas de sifflements'),
          tri('rs_toux', 'Toux', 'Présence de toux', 'Pas de toux'),
          tri('rs_asthme', 'Asthme connu', 'Asthme connu', 'Pas d’asthme connu'),
          text('rs_traitement', 'Traitement déjà pris', { placeholder: 'Ventoline 2 bouffées à 23h', fmt: (v) => `Traitement pris : ${v}` }),
          area('rs_autre', 'Autres éléments'),
        ],
      },
      {
        id: 'abdo',
        spe: 'abdo',
        title: 'Spé douleur abdominale',
        fields: [
          text('ab_loc', 'Localisation', { placeholder: 'fosse iliaque droite', fmt: (v) => `Douleur localisée : ${v}` }),
          text('ab_debut', 'Début', { placeholder: 'depuis ce matin', fmt: (v) => `Douleur apparue ${v}` }),
          eva('ab_eva_repos', 'Douleur au repos', (v) => `Douleur évaluée à ${v}/10 au repos`),
          eva('ab_eva_palpation', 'Douleur à la palpation', (v) => `Douleur à ${v}/10 à la palpation`),
          { type: 'radio', name: 'ab_type', label: 'Type de douleur', options: DOULEUR_TYPES },
          text('ab_transit', 'Transit', { placeholder: 'dernières selles hier, normales', fmt: (v) => `Transit : ${v}` }),
          tri('ab_urines', 'Brûlures mictionnelles', 'Brûlures mictionnelles', 'Pas de brûlures mictionnelles'),
          {
            type: 'radio',
            name: 'ab_grossesse',
            label: 'Grossesse possible',
            show: isF,
            options: [
              { v: 'oui', l: 'Oui', out: 'Grossesse possible' },
              { v: 'non', l: 'Non', out: 'Pas de grossesse possible' },
              { v: 'nsp', l: 'Ne sait pas', out: 'Ne sait pas si grossesse possible' },
            ],
          },
          text('ab_regles', 'Dernières règles', { show: isF, fmt: (v) => `Dernières règles : ${v}` }),
          area('ab_autre', 'Autres éléments'),
        ],
      },
      {
        id: 'tc',
        spe: 'tc',
        title: 'Spé traumatisme crânien',
        heading: () => 'Bilan TC :',
        hint: 'Nausées, vomissements, céphalées, vertiges et vision sont repris dans le bilan TC.',
        fields: [
          text('tc_plaie', 'Plaie', {
            placeholder: 'superficielle sur l’arrière de la tête',
            none: 'Aucune',
            fmt: (v) => `Plaie ${v}`,
            noneOut: 'Pas de plaie',
          }),
          tri('tc_deformation', 'Déformation', 'Déformation', 'Pas de déformation'),
          eva('tc_eva', 'Douleur à la palpation', (v) => `Douleur évaluée à ${v}/10 à la palpation`),
          { type: 'radio', name: 'tc_type', label: 'Type de douleur', options: DOULEUR_TYPES },
          { type: 'symptoms' },
          tri('tc_epistaxis', 'Épistaxis (saignement du nez)', 'Épistaxis', 'Pas d’épistaxis'),
          tri('tc_otorragie', 'Otorragie (saignement de l’oreille)', 'Otorragie', 'Pas d’otorragie'),
          tri('tc_somnolence', 'Somnolence ou agitation', 'Somnolence / agitation', 'Pas de somnolence ou d’agitation'),
          tri('tc_amnesie', 'Amnésie des faits', 'Amnésie des faits', 'Pas d’amnésie'),
          tri('tc_cervical', 'Douleur cervicale', 'Douleur cervicale', 'Pas de douleur cervicale'),
          area('tc_autre', 'Autres éléments'),
        ],
      },
      {
        id: 'trauma',
        spe: 'trauma',
        title: 'Spé traumatisme',
        heading: (s) => `Bilan trauma${[s.tr_zone, optOut('tr_cote', s.tr_cote)].filter(Boolean).map((x) => ' ' + x).join('')} :`,
        fields: [
          text('tr_zone', 'Zone', { placeholder: 'genou', out: () => null }),
          {
            type: 'radio',
            name: 'tr_cote',
            label: 'Côté',
            options: [
              { v: 'g', l: 'Gauche', out: 'gauche' },
              { v: 'd', l: 'Droit', out: 'droit' },
            ],
            out: () => null,
          },
          area('tr_constat', 'Constatations', { placeholder: 'Légère coloration de la face externe du genou gauche' }),
          tri('tr_deformation', 'Déformation', 'Déformation', 'Pas de déformation'),
          tri('tr_gonflement', 'Gonflement', 'Gonflement', 'Pas de gonflement'),
          tri('tr_hematome', 'Hématome / coloration', 'Hématome / coloration', 'Pas d’hématome'),
          tri('tr_plaie', 'Plaie', 'Plaie', 'Pas de plaie'),
          tri('tr_mobsens', 'Mobilité et sensibilité conservées', 'Mobilité et sensibilité du membre conservées', 'Mobilité et/ou sensibilité du membre altérées'),
          tri('tr_trc', 'TRC inf 2 sec', 'TRC inf 2 sec', 'TRC sup 2 sec'),
          tri('tr_pouls', 'Pouls distal perçu', 'Pouls distal perçu', 'Pouls distal non perçu'),
          tri('tr_chaleur', 'Chaleur conservée', 'Chaleur conservée', 'Extrémité froide'),
          tri('tr_craquement', 'Craquement', 'Craquement', 'Pas de craquement'),
          eva('tr_eva_repos', 'Douleur au repos', (v) => `Douleur évaluée à ${v}/10 au repos`),
          eva('tr_eva_palpation', 'Douleur à la palpation', (v) => `Douleur évaluée à ${v}/10 à la palpation`),
          eva('tr_eva_mobil', 'Douleur à la mobilisation', (v) => `Douleur évaluée à ${v}/10 à la mobilisation`),
          { type: 'radio', name: 'tr_type', label: 'Type de douleur', options: DOULEUR_TYPES },
          tri('tr_appui', 'Arrive à marcher / utiliser le membre', 'Arrive à marcher / utiliser le membre', 'N’arrive pas à marcher / utiliser le membre'),
          text('tr_atcd', 'ATCD sur la même zone', {
            placeholder: 'entorse du même genou en 2022 avec attelle',
            none: 'Aucun',
            fmt: (v) => `Antécédent : ${v}`,
            noneOut: 'Pas d’antécédent sur cette zone',
          }),
          area('tr_autres', 'Autres lésions'),
        ],
      },
      {
        id: 'plaie',
        spe: 'plaie',
        title: 'Spé plaie / brûlure',
        heading: (s) => (s.pl_type === 'brulure' ? 'Bilan brûlure :' : s.pl_type === 'morsure' ? 'Bilan morsure :' : 'Bilan plaie :'),
        fields: [
          {
            type: 'radio',
            name: 'pl_type',
            label: 'Type',
            options: [
              { v: 'plaie', l: 'Plaie' },
              { v: 'brulure', l: 'Brûlure' },
              { v: 'morsure', l: 'Morsure' },
            ],
          },
          text('pl_loc', 'Localisation', { fmt: (v) => `Localisation : ${v}` }),
          text('pl_taille', 'Taille / étendue', { placeholder: '3 cm, paume de la main…', fmt: (v) => `Taille : ${v}` }),
          text('pl_aspect', 'Aspect', { placeholder: 'rougeur, cloques, peau blanche…', fmt: (v) => `Aspect : ${v}` }),
          text('pl_cause', 'Cause', { placeholder: 'verre, liquide chaud…', fmt: (v) => `Cause : ${v}` }),
          {
            type: 'radio',
            name: 'pl_saignement',
            label: 'Saignement',
            options: [
              { v: 'aucun', l: 'Aucun', out: 'Pas de saignement' },
              { v: 'arrete', l: 'Arrêté', out: 'Saignement arrêté' },
              { v: 'actif', l: 'Actif', out: 'Saignement actif' },
            ],
          },
          tri('pl_souillee', 'Plaie souillée', 'Plaie souillée', 'Plaie propre'),
          tri('pl_ce', 'Corps étranger', 'Présence d’un corps étranger', 'Pas de corps étranger'),
          {
            type: 'radio',
            name: 'pl_tetanos',
            label: 'Vaccin antitétanique',
            options: [
              { v: 'ajour', l: 'À jour', out: 'Vaccin antitétanique à jour' },
              { v: 'non', l: 'Pas à jour', out: 'Vaccin antitétanique pas à jour' },
              { v: 'nsp', l: 'Ne sait pas', out: 'Statut vaccinal antitétanique inconnu' },
            ],
          },
          area('pl_autre', 'Autres éléments'),
        ],
      },
      {
        id: 'autre',
        spe: 'autre',
        title: 'Spé autre',
        fields: [area('au_obs', 'Observations')],
      },

      // ------------------------------------------------------- Signes généraux
      {
        id: 'symptomes',
        title: 'Plaintes et signes associés',
        hint: 'Qualifier la plainte : nausées, céphalées, douleur…',
        show: (s) => !has(s, 'detresse', 'tc'),
        fields: [{ type: 'symptoms' }],
      },
    ],
  },
  {
    id: 'bilans',
    title: 'Bilans',
    groups: [
      {
        id: 'neuro',
        title: 'Neuro',
        heading: () => 'Neuro :',
        fields: [
          { type: 'gcs', name: 'gcs', label: 'Glasgow' },
          tri('ost', 'Orientation spatio-temporelle', 'OST ok', 'OST non ok'),
          tri('ms4m', 'MS4M conservées', 'MS4M conservées', 'MS4M non conservées'),
          tri('pci', 'Perte de connaissance', 'PCI', 'Pas de PCI', {
            out: (v, s) => (v === 'oui' ? (s.pci_detail ? `PCI : ${s.pci_detail}` : 'PCI') : v === 'non' ? 'Pas de PCI' : null),
          }),
          text('pci_detail', 'Détail de la PCI', { show: (s) => s.pci === 'oui', placeholder: 'absence d’environ 5 sec', out: () => null }),
          {
            type: 'radio',
            name: 'pupilles',
            label: 'Pupilles',
            vertical: true,
            options: [
              { v: 'irs', l: 'IRS (isocores, réactives, symétriques)', out: 'Pupilles IRS' },
              { v: 'mydriase', l: 'Mydriase réactive symétrique', out: 'Pupilles en mydriase réactives symétriques' },
              { v: 'myosis', l: 'Myosis réactif symétrique', out: 'Pupilles en myosis réactives symétriques' },
              { v: 'asym', l: 'Asymétriques', out: 'Pupilles asymétriques' },
              { v: 'areactives', l: 'Aréactives', out: 'Pupilles aréactives' },
            ],
          },
          {
            type: 'radio',
            name: 'fast',
            label: 'FAST',
            options: [
              { v: 'negatif', l: 'Négatif', out: 'FAST négatif' },
              { v: 'positif', l: 'Positif', out: 'FAST positif' },
            ],
          },
          area('neuro_autre', 'Autres éléments neuro'),
        ],
        tail: 'sd_neuro',
      },
      {
        id: 'circu',
        title: 'Circu',
        heading: () => 'Circu :',
        fields: [
          { type: 'number', name: 'fc', label: 'Fréquence cardiaque', suffix: 'bpm', out: () => null },
          {
            type: 'radio',
            name: 'fc_qual',
            label: 'Pouls',
            options: [
              { v: 'BFRS', l: 'BFRS' },
              { v: 'filant', l: 'Filant' },
              { v: 'irrégulier', l: 'Irrégulier' },
            ],
            help: 'BFRS : bien frappé, régulier, symétrique',
            out: (v, s) => (s.fc ? `FC ${s.fc}${v ? ' ' + v : ''}` : null),
          },
          text('ta_g', 'TA gauche', { placeholder: '132/87', inputmode: 'numeric', fmt: (v) => `TA Gauche ${v}` }),
          text('ta_d', 'TA droite', { placeholder: '126/89', inputmode: 'numeric', fmt: (v) => `TA Droite ${v}` }),
          {
            type: 'radio',
            name: 'trc',
            label: 'TRC',
            options: [
              { v: 'inf', l: 'Inf 2 sec', out: 'TRC inf 2 sec' },
              { v: 'sup', l: 'Sup 2 sec', out: 'TRC sup 2 sec' },
            ],
          },
          tri('sueurs', 'Sueurs', 'sueurs', 'pas de sueur', { out: () => null }),
          tri('paleur', 'Pâleur', 'pâleur', 'pas de pâleur', { out: () => null }),
          tri('conjonctives', 'Conjonctives colorées', 'conjonctives colorées', 'conjonctives décolorées', { out: () => null }),
          tri('marbrures', 'Marbrures', 'marbrures', 'pas de marbrure', {
            out: (v, s) => {
              const parts = ['sueurs', 'paleur', 'conjonctives', 'marbrures']
                .map((n) => triOut(n, s[n]))
                .filter(Boolean);
              if (!parts.length) return null;
              const line = parts.join(' / ');
              return line[0].toUpperCase() + line.slice(1);
            },
          }),
          area('circu_autre', 'Autres éléments circu'),
        ],
        tail: 'sd_circu',
      },
      {
        id: 'respi',
        title: 'Respi',
        heading: () => 'Respi :',
        fields: [
          { type: 'number', name: 'fr', label: 'Fréquence respiratoire', suffix: '/min', out: () => null },
          {
            type: 'radio',
            name: 'fr_qual',
            label: 'Respiration',
            options: [
              { v: 'ARS', l: 'ARS' },
              { v: 'superficielle', l: 'Superficielle' },
              { v: 'irrégulière', l: 'Irrégulière' },
              { v: 'asymétrique', l: 'Asymétrique' },
            ],
            help: 'ARS : ample, régulière, symétrique',
            out: (v, s) => (s.fr ? `FR ${s.fr}${v ? ' ' + v : ''}` : null),
          },
          { type: 'number', name: 'sat', label: 'Saturation', suffix: '%', out: () => null },
          {
            type: 'radio',
            name: 'sat_sous',
            label: 'Sous',
            options: [
              { v: 'AA', l: 'Air ambiant' },
              { v: 'O2', l: 'O2' },
            ],
            out: (v, s) => {
              if (!s.sat) return null;
              const sous = v === 'O2' ? ` sous O2${s.sat_debit ? ' ' + s.sat_debit + ' L/min' : ''}` : v === 'AA' ? ' AA' : '';
              return `Sat ${s.sat} %${sous}`;
            },
          },
          { type: 'number', name: 'sat_debit', label: 'Débit O2', suffix: 'L/min', show: (s) => s.sat_sous === 'O2', out: () => null },
          area('respi_autre', 'Autres éléments respi'),
        ],
        tail: 'sd_respi',
      },
      {
        id: 'constantes',
        title: 'Température / glycémie',
        fields: [
          { type: 'number', name: 'temp', label: 'Température', suffix: '°C', step: '0.1', fmt: (v) => `Température ${v}°` },
          { type: 'number', name: 'gly', label: 'Glycémie', step: '0.1', out: () => null },
          {
            type: 'radio',
            name: 'gly_unite',
            label: 'Unité',
            options: [
              { v: 'mmol/L', l: 'mmol/L' },
              { v: 'g/L', l: 'g/L' },
            ],
            out: (v, s) => (s.gly ? `Glycémie ${s.gly} ${v || 'mmol/L'}` : null),
          },
        ],
      },
      {
        id: 'mhta',
        title: 'ATCD / traitements / allergies',
        fields: [
          area('atcd', 'Antécédents', { none: 'Aucun', fmt: (v) => `ATCD : ${v}`, noneOut: 'Pas d’ATCD' }),
          area('traitements', 'Traitements', { none: 'Aucun', fmt: (v) => `Traitement : ${v}`, noneOut: 'Pas de traitement' }),
          area('allergies', 'Allergies', { none: 'Aucune', fmt: (v) => `Allergie : ${v}`, noneOut: 'Pas d’allergie' }),
        ],
      },
    ],
  },
  {
    id: 'gestes',
    title: 'Gestes',
    groups: [
      {
        id: 'gestes',
        title: 'Gestes effectués',
        fields: [
          {
            type: 'checks',
            name: 'gestes',
            label: '',
            big: true,
            options: [
              { v: 'bilan_complet', l: 'Bilan complet' },
              { v: 'bilan_trauma', l: 'Bilan trauma' },
              { v: 'repos_assis', l: 'Mise au repos assise' },
              { v: 'repos_allonge', l: 'Mise au repos allongée' },
              { v: 'pls', l: 'PLS' },
              { v: 'surveillance', l: 'Surveillance' },
              { v: 'froid', l: 'Application de poche de froid' },
              { v: 'nettoyage', l: 'Nettoyage de plaie' },
              { v: 'pansement', l: 'Pansement' },
              { v: 'compressif', l: 'Pansement compressif' },
              { v: 'attelle', l: 'Attelle' },
              { v: 'echarpe', l: 'Écharpe' },
              { v: 'collier', l: 'Collier cervical' },
              { v: 'o2', l: 'Oxygénothérapie' },
              { v: 'resucrage', l: 'Resucrage' },
              { v: 'hydratation', l: 'Hydratation' },
              { v: 'couverture', l: 'Couverture de survie' },
              { v: 'refroidissement', l: 'Refroidissement de la brûlure' },
            ],
            out: (v) => (v || []).map((k) => optLabel('gestes', k)),
          },
          area('gestes_autre', 'Autres gestes'),
          area('devenir', 'Devenir', { placeholder: 'Laissée libre après surveillance / évacuation vers…' }),
        ],
      },
    ],
  },
  {
    id: 'complementaire',
    title: 'Bilan complémentaire',
    short: 'Complém.',
    groups: [
      {
        id: 'complementaire',
        title: 'Bilan complémentaire',
        hint: 'Une nouvelle série de constantes à chaque contrôle, avec son heure.',
        fields: [{ type: 'surveillance', name: 'surv' }],
      },
    ],
  },
];

// Champs d'une série de constantes du bilan complémentaire.
export const SURV_FIELDS = [
  { k: 'fc', l: 'FC', suffix: 'bpm', mode: 'numeric' },
  { k: 'ta', l: 'TA', placeholder: '120/80', mode: 'numeric' },
  { k: 'fr', l: 'FR', suffix: '/min', mode: 'numeric' },
  { k: 'sat', l: 'Sat', suffix: '%', mode: 'numeric' },
  { k: 'gcs', l: 'Glasgow', mode: 'numeric' },
  { k: 'eva', l: 'Douleur', suffix: '/10', mode: 'numeric' },
  { k: 'temp', l: 'Temp.', suffix: '°C', mode: 'decimal' },
  { k: 'gly', l: 'Glycémie', suffix: 'mmol/L', mode: 'decimal' },
];

// Champs « plaintes et signes associés », insérés là où un groupe contient { type: 'symptoms' }.
export const SYMPTOMS = [
  tri('nausees', 'Nausées', 'Présence de nausées', 'Pas de nausées'),
  tri('vomissements', 'Vomissements', 'Vomissements', 'Pas de vomissements', {
    out: (v, s) => {
      if (v === 'non') return 'Pas de vomissements';
      if (v !== 'oui') return null;
      const n = Number(s.vomissements_nb);
      return n ? `${n} épisode${n > 1 ? 's' : ''} de vomissement` : 'Vomissements';
    },
  }),
  { type: 'number', name: 'vomissements_nb', label: 'Nombre d’épisodes', show: (s) => s.vomissements === 'oui', out: () => null },
  tri('cephalees', 'Céphalées', 'Céphalées', 'Pas de céphalées', {
    out: (v, s) => {
      if (v === 'non') return 'Pas de céphalées';
      if (v !== 'oui') return null;
      let line = 'Céphalées';
      if (s.cephalees_eva !== undefined && s.cephalees_eva !== '') line += ` évaluées à ${s.cephalees_eva}/10`;
      if (s.cephalees_depuis) line += ` depuis ${s.cephalees_depuis}`;
      const t = DOULEUR_TYPES.find((o) => o.v === s.cephalees_type);
      if (t) line += `, ${t.out.charAt(0).toLowerCase()}${t.out.slice(1)}`;
      return line;
    },
  }),
  eva('cephalees_eva', 'Intensité des céphalées', () => null, { show: (s) => s.cephalees === 'oui' }),
  text('cephalees_depuis', 'Céphalées depuis', { show: (s) => s.cephalees === 'oui', placeholder: '1h', out: () => null }),
  { type: 'radio', name: 'cephalees_type', label: 'Type', options: DOULEUR_TYPES, show: (s) => s.cephalees === 'oui', out: () => null },
  tri('vertiges', 'Vertiges', 'Vertiges', 'Pas de vertiges'),
  tri('vision', 'Vision trouble', 'Vision trouble', 'Pas de trouble de la vision'),
  text('dernier_repas', 'Dernier repas', {
    placeholder: 'à 13h, il y a 2h, ce midi…',
    // « 13h » ou « 13:00 » → « Dernier repas à 13h » ; sinon le texte tel quel.
    fmt: (v) => (/^\d/.test(v) ? `Dernier repas à ${fmtTime(v)}` : `Dernier repas ${v}`),
  }),
  area('autres_signes', 'Autres signes / douleur', { placeholder: 'Localiser, qualifier et chiffrer la douleur…' }),
];

// ---------------------------------------------------------------------------
// Utilitaires d'accès au schéma
// ---------------------------------------------------------------------------
const FIELD_INDEX = new Map();
function indexFields(fields) {
  for (const f of fields) if (f.name) FIELD_INDEX.set(f.name, f);
}
for (const tab of TABS) for (const g of tab.groups) indexFields(g.fields);
indexFields(SYMPTOMS);

export const getField = (name) => FIELD_INDEX.get(name);

export function optOut(fieldName, v) {
  const o = getField(fieldName)?.options?.find((x) => x.v === v);
  return o ? (o.out ?? o.l) : null;
}

export function optLabel(fieldName, v) {
  return getField(fieldName)?.options?.find((x) => x.v === v)?.l ?? v;
}

export function triOut(fieldName, v) {
  const f = getField(fieldName);
  if (!f) return null;
  return v === 'oui' ? f.yes : v === 'non' ? f.no : null;
}

export function joinEt(items) {
  const a = items.filter(Boolean);
  if (a.length <= 1) return a.join('');
  return `${a.slice(0, -1).join(', ')} et ${a[a.length - 1]}`;
}
