# Prise de bilans

Application web (PWA) pour aider le secouriste à faire un **bilan complet, rapidement et sans rien oublier**,
au format ARGOS, puis à l’**enregistrer dans l’app Notes** du téléphone pour le copier-coller dans ARGOS.

**Aucune donnée n’est envoyée sur Internet** : pas de serveur, pas de cloud, pas de compte.
Le bilan en cours est seulement gardé dans le navigateur du téléphone (pour ne rien perdre si l’app se ferme)
et effacé avec le bouton « Nouveau ».

## Déroulé

1. **Détresse** : une ou plusieurs (malaise, alcool / drogue, douleur thoracique, difficulté respiratoire,
   douleur abdominale, traumatisme crânien, traumatisme, plaie / brûlure, autre).
2. **Identité** : nom, prénom, sexe, date de naissance, âge (calculé automatiquement ou saisi),
   nationalité, pays de naissance, adresse, accréditation / n° de dossard.
3. **Circonstances** : histoire, plainte, découverte de la victime, moyen d’arrivée au PSA.
4. **Signes** : situation à l’arrivée, **signes de détresse** (neuro / respi / circu), puis les **bilans
   spécifiques** des détresses choisies et les signes associés (nausées, céphalées…).
5. **Bilans** : neuro (Glasgow, OST, MS4M, PCI, pupilles, FAST), circu, respi, température, glycémie,
   ATCD / traitements / allergies. Les valeurs anormales (FC, Sat, Glasgow…) sont signalées et peuvent
   être cochées comme signes de détresse en un geste.
6. **Gestes** effectués et devenir.
7. **Bilan complémentaire** (facultatif) : une série de constantes horodatée à chaque contrôle,
   reprise à la fin des signes particuliers.
8. **Bilan** : texte prêt à coller, découpé en IDENTITÉ / CIRCONSTANCIEL / SIGNES PARTICULIERS /
   GESTES EFFECTUÉS (un bouton « Copier » par partie, et un par champ d’identité). Les **signes de détresse sont placés en premier**
   dans les signes particuliers. Une liste « À vérifier » rappelle ce qui manque.

« Enregistrer dans Notes » ouvre la feuille de partage d’iOS / Android : choisir **Notes**.

**Enregistrement direct (iPhone)** : sur l’écran Bilan, le réglage « Enregistrement direct dans Notes »
fait créer la note par un raccourci iOS (app Raccourcis, action « Créer une note » avec « Entrée du raccourci »),
sans passer par le menu de partage. Les étapes de création du raccourci sont affichées dans l’app.

**Plusieurs victimes** : le bouton en haut à droite liste les bilans en cours (nom, heure, détresses,
état de détresse vitale), permet d’en ouvrir un nouveau et de passer de l’un à l’autre sans rien perdre.
Supprimer un bilan une fois enregistré dans Notes.

## Installation sur iPhone

1. Ouvrir l’adresse du site dans **Safari**.
2. Bouton Partager → **Sur l’écran d’accueil**.

L’application fonctionne ensuite hors-ligne.

## Publication (GitHub Pages)

L’application est aussi publiée sur claude.ai : https://claude.ai/artifact/6TQVQCWzBZ2rDXaH5KxD2e (lien privé, copier-coller vers Notes ; le partage direct et le mode hors-ligne n’y sont pas disponibles).

Le workflow `.github/workflows/pages.yml` lance les tests puis publie le site à chaque push sur `main`.
À activer une fois : *Settings → Pages → Source : GitHub Actions*.

## Développement

Aucune dépendance ni compilation : HTML, CSS et JavaScript (modules ES).

```sh
python3 -m http.server 8000   # puis http://localhost:8000
npm test                      # tests du générateur de bilan (Node ≥ 20)
```

- `js/schema.js` : les champs du formulaire et leur formulation dans le bilan (à modifier pour ajouter un signe,
  une détresse ou changer une phrase).
- `js/report.js` : assemblage du texte du bilan et suggestions de signes de détresse.
- `js/app.js` : interface.
