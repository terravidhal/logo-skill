# ETUDE — `logodeck`

> Étude de conception pour un skill d'agents IA qui dessine un logo de qualité et livre,
> en une commande, **toute la famille de fichiers** : icône, icône mono, version sombre,
> wordmark, lockups horizontal et vertical, favicon, icône d'application et composant React.
>
> Date : 2026-11-24 · Statut : étude terminée, implémentation à suivre · Langue du produit : anglais.

---

## 1. Résumé exécutif

Le marché des « logo skills » est déjà occupé par un projet de référence très visible :
`kaankiziltug/logo-design-skill` (7 643 étoiles au moment de l'étude). Son approche est solide :
principes d'identité, process en phases, construction SVG géométrique, corrections optiques,
bibliothèque de 1 432 logos réels pour étudier les conventions de catégorie, scripts Python
d'audit et de planches de test. C'est le niveau à dépasser.

Le dépôt à créer, **`logodeck`**, ne cherche pas à ajouter une énième bibliothèque de références.
Il attaque les trois points faibles qui restent dans tous les skills étudiés :

1. **Toutes les variantes d'un coup.** Un seul manifeste + un seul script produisent l'icône,
   l'icône mono, la version sombre, le wordmark, les lockups horizontal et vertical, le favicon,
   l'icône d'application, le composant React et une planche de contrôle. Aucune variante n'est
   dessinée à la main séparément, donc aucune ne dérive.
2. **Couleur changeable en une ligne.** Les masters utilisent des variables CSS
   (`--ld-brand`, `--ld-accent`, `--ld-ink`). Un attribut `style` sur le SVG, le composant ou
   la page suffit ; les palettes livrées sont vérifiées en contraste (WCAG) avant d'être proposées.
3. **Composant React prêt, au format Logoforge.** Même surface d'API que les composants générés
   par Logoforge (`variant`, `type`, `mode`, `title`, `...SVGProps`), mode auto clair/sombre,
   zéro dépendance hors React, et thème par variables CSS. On étend `type` aux lockups et on
   rend `variant="mono"` valable pour tous les types.

Techniquement, le skill reste **léger et déterministe** : un seul script Node ESM sans dépendance
construit tout le deck en moins d'une seconde, là où la référence embarque 1 432 SVG, une galerie
de 513 Ko, des catalogues JSON de 1,5 Mo et huit scripts Python. Le navigateur (Playwright/Chromium)
ne sert qu'à regarder le résultat et à produire les captures du README — jamais à générer le logo.

Nom retenu : **`logodeck`**. Court, prononçable, disponible sur npm et sous `terravidhal/`
sur GitHub ; « deck » dit exactement ce que le skill livre : le jeu complet de fichiers.

---

## 2. Objectif et périmètre

### Dans le périmètre

- Un dépôt MIT `terravidhal/logodeck`, installable par `npx skills add terravidhal/logodeck`.
- Un skill `logodeck` qui conçoit un logo original, de la découverte au deck de livraison.
- Un pipeline `build.mjs` qui génère toutes les variantes depuis un manifeste et des masters SVG.
- Un système de thème par variables CSS + sept palettes accessibles vérifiées.
- Un export React typé, calqué sur le format des composants Logoforge, avec mode auto.
- Un audit SVG déterministe (structure, géométrie, couleurs, petites tailles, accessibilité).
- Des exemples réels, des captures Playwright avant/après et un README qui prouve le résultat.
- Des evals et une CI qui vérifient le frontmatter, les liens, le build, les contrastes et le TSX.

### Hors périmètre

- Copier, tracer ou imiter un logo existant ; le skill refuse et propose une direction originale.
- Embarquer des marques tierces ou une bibliothèque de logos sous trademark.
- Générer un logo par modèle d'image (Midjourney, DALL·E, Nano Banana…) : le produit est du SVG
  construit, éditable, sans raster.
- Garantir la disponibilité d'un nom, d'un domaine ou d'un dépôt de marque.
- Publier, pousser, déployer ou créer un compte.

---

## 3. Méthode et sources

La référence a été lue à la source, au commit **`e9eaddc07895575253d6663320354a708f53e955`**
(branche `main`, 2026-11-13), via l'API GitHub et les fichiers bruts : `SKILL.md`, `README.md`,
`TRADEMARKS.md`, `LICENSE`, `evals/evals.json`, le manifeste plugin, le workflow de test, les
références (`principles`, `mark-types`, `visual-techniques`, `typography`, `color`,
`svg-construction`, `testing-checklist`) et `scripts/export_variants.py`.

Deux vérifications complémentaires ont été faites :

- trois autres skills populaires du même sujet (`neonwatty/logo-designer-skill`,
  `jim788e/logo-creation-skill`, `atypica-ai/logo-design-skill`), lus au niveau README + `SKILL.md` ;
- le modèle de structure et de qualité `terravidhal/logoforge-skill` (README, `SKILL.md`,
  `scripts/check-skill.mjs`, `evals/evals.json`, workflow CI, composants React générés).

**Note de licence.** La consigne initiale indiquait « aucune licence ». Au commit étudié, GitHub
expose désormais une `LICENSE` MIT. Par prudence, aucun texte, aucun SVG et aucune structure de
fichier de la référence n'est recopié : les principes sont reformulés, les scripts seront écrits
de zéro, la bibliothèque de logos n'est pas reprise. Le dépôt reste indépendant.

**Note d'environnement.** Le clone git de travail n'a pas pu être créé dans cette session
(l'accès réseau git est bloqué par l'environnement d'exécution). Un script reproductible
`scripts/clone-ref.sh` est ajouté pour recréer `ref/` en local ; l'étude s'appuie sur le contenu
exact du commit ci-dessus. `ref/` est ignoré par git.

---

## 4. Étude approfondie de la référence

### 4.1 Structure

```text
logo-design-skill/
├── README.md                     # promesse, démo 28 marques, how it works, install, tests
├── LICENSE                       # MIT (constaté au commit étudié)
├── TRADEMARKS.md                 # 1 432 logos = marques de leurs propriétaires
├── evals/evals.json              # 3 cas (design, favicon/app icon, critique)
├── .claude-plugin/               # marketplace + plugin
├── .github/workflows/test.yml    # Python 3.9/3.x sur macOS, Ubuntu, Windows
├── docs/images/                  # hero, 28 concepts, boards, test sheet, tiles
├── tests/ + tools/
└── skills/logo-design/
    ├── SKILL.md                  # 17,6 Ko, 7 phases, checkpoint
    ├── references/               # 15 fichiers (principes, brief, types, SVG, tests, etc.)
    ├── scripts/                  # 8 scripts Python + svglib
    ├── templates/                # guidelines, spec de présentation
    └── assets/library/
        ├── svg/                  # 1 432 fichiers SVG
        ├── catalog.json          # 911 Ko
        ├── classifications.json  # 562 Ko
        ├── stats.json            # 3,5 Ko
        └── gallery.html          # 513 Ko
```

Le dépôt pèse environ 6,7 Mo et le skill embarque tout : la bibliothèque, les scripts et les
templates voyagent avec l'installation. C'est un choix assumé de référence documentaire.

### 4.2 Flux de l'agent

1. **Mode** : Design, Critique, Redesign, System ou Assets.
2. **Phase 1 — Discovery** : brief court, hypothèses explicites, adjectifs de marque.
3. **Phase 2 — Research** : conventions de la catégorie via la bibliothèque, liste des clichés,
   carte de mots, choix de deux types de marque au moins.
4. **Phase 3 — Concepts** : 8 à 12 idées d'une phrase, notation, trois directions réellement
   différentes, étude de 3 à 5 fichiers exemplaires avant de dessiner.
5. **Phase 4 — Construction SVG** : noir d'abord, viewBox 256, primitives, angles exacts,
   trous réels (`evenodd`), aucun `<text>` dans un fichier final, itérations sauvegardées.
6. **Phase 5 — Test & refine** : audit + planche de test, deux boucles minimum, corrections
   optiques (overshoot, bone effect, irradiation, centre optique), tests de lecture et de pair.
7. **Phase 6 — Checkpoint** : une image de concepts, une phrase par idée, une recommandation ;
   le skill s'arrête et propose le kit. C'est un choix produit fort : l'utilisateur tranche avant
   le gros du travail.
8. **Phase 7 — Kit** : couleur, typographie et lockups, planche de présentation avec mockups
   sectoriels, variantes, favicon/app icon, guidelines, handover.

Outils : `concept_sheet.py`, `search_library.py`, `svg_audit.py`, `preview_sheet.py`,
`presentation_board.py`, `render_png.py`, `export_variants.py`, `build_catalog.py`.
Tout est Python 3 standard, sans dépendance ; le rendu PNG essaie cairosvg, rsvg-convert,
Inkscape, Chrome/Chromium ou Quick Look.

### 4.3 Ce qui fait sa qualité

- **Une thèse claire** : un logo est un identifiant, pas une explication. Un seul signe, lisible
  à 16 px, en une couleur, pendant des décennies.
- **Le noir d'abord** : la forme doit tenir sans couleur. La couleur est ajoutée après le choix.
- **La discipline géométrique** : primitives, arcs, angles propres, peu d'ancres, correction
  optique, trous réels. Le code SVG est traité comme du dessin, pas comme du remplissage.
- **Des tests nommés** : 16 px, une couleur, inversé, squint, miroir, shelf test, letter test,
  junction check, peer test. Ce sont des tests qu'un agent peut réellement exécuter.
- **Un checkpoint honnête** : on montre trois concepts, on recommande, on s'arrête. Le kit est
  coûteux et n'a de sens qu'après un accord.
- **Une bibliothèque utile** : 1 432 logos classés par type, technique, géométrie, sujet,
  industrie et humeur, avec 141 exemples pédagogiques. Elle sert à éviter les clichés, pas à tracer.
- **Une preuve visuelle** : 28 marques fictives, concepts, planches, tests. Le README montre le
  produit, pas seulement des promesses.
- **Des limites dites** : pas de clearance de marque, licences de polices, tests non exécutés.

### 4.4 Limites exploitables

| Limite | Conséquence | Notre réponse |
|---|---|---|
| Poids : 6,7 Mo, 1 432 SVG, catalogues et galerie | Installation lourde, contexte chargé, lenteur | Aucune bibliothèque embarquée ; un dossier de références court ; build < 1 s |
| Python 3 + un moteur de rendu externe | Dépendance à l'environnement, chemins différents selon l'OS | Scripts Node ESM sans dépendance ; Playwright seulement pour regarder/capturer |
| Checkpoint obligatoire | Deux tours de conversation avant le kit | Deck complet par défaut ; checkpoint optionnel (`--review`) |
| Pas de React | L'utilisateur doit refaire le composant à la main | TSX généré, typé, testé, même API que Logoforge |
| Pas de thème par variables | Chaque recoloration est une réécriture de fichiers | Tokens CSS + palettes vérifiées + rebuild |
| Variantes non composées | Wordmark, lockups et icône peuvent diverger | Un manifeste, une source, toutes les variantes générées ensemble |
| Version sombre = recoloration blanche | Le blanc « bave » (irradiation) ; pas de vraie version sombre | Tokens sombres dédiés + contrôle de contraste |
| Bibliothèque très tech, majoritairement occidentale | Biais de catégorie et de culture | Recherche web + liste de clichés + exemples originaux, pas de catalogue |
| Aucun garde-fou de contraste calculé | Un accent à 1,5:1 peut être livré | Calcul WCAG dans le build, avertissement bloquant |
| Pas de vérification du TSX | Le composant peut ne pas compiler | `tsc --noEmit` en CI sur l'exemple généré |

### 4.5 Ce qu'on reprend (idées, pas fichiers)

- La thèse « identifier, pas expliquer » et le noir d'abord.
- Le brief court avec hypothèses explicites, la liste des clichés de catégorie, la carte de mots.
- Les trois directions réellement différentes, chacune défendable en une phrase.
- La construction géométrique, les angles exacts, `fill-rule="evenodd"`, l'absence de `<text>`.
- Les corrections optiques : overshoot, bone effect, irradiation, centre optique, jonctions.
- Les tests : 16 px, mono, inversé, miroir, rotation, blur, shelf, letter, peer.
- La séparation instructions / références / scripts / assets et les limites honnêtes.

### 4.6 Ce qu'on refuse

- Copier les textes, les scripts, les templates ou les dessins de la référence.
- Embarquer des logos de marques tierces.
- Le rituel de la bibliothèque géante quand une recherche ciblée suffit.
- Le checkpoint imposé quand l'utilisateur demande explicitement le deck complet.
- Les composants React générés avec du Tailwind obligatoire : le mode auto doit fonctionner sans.

---

## 5. Trois autres skills du même sujet

| Dépôt | Étoiles | Approche | Forces | Limites |
|---|---:|---|---|---|
| `neonwatty/logo-designer-skill` | ~212 | Interview, 3–5 concepts SVG en parallèle, `preview.html`, itérations, export PNG | Simple, rapide, preview agréable, export multi-tailles | Peu de tests de dessin ; pas d'audit ; variantes limitées ; `<text>` toléré ; pas de React ni de thème |
| `jim788e/logo-creation-skill` | ~3 | 8 phases avec gates, matrice complète de variantes, validateur, contact sheet, `brand.zip` | Rigueur, matrice de livraison, tests nommés, packaging | Adoption très faible ; Python ; pas de thème ni de React ; process long |
| `atypica-ai/logo-design-skill` | ~3 | 9 phases, recherche web, analyse des lettres, 3 concepts, preview navigateur | Analyse typographique détaillée, variables CSS évoquées | Pas de scripts de build ni de tests déterministes ; beaucoup de prose ; variantes non générées |

Enseignements croisés :

- Les plus populaires sont **courts à installer** et **montrent une preview**. La profondeur seule
  ne suffit pas.
- Les plus rigoureux **nomment leurs tests** et **livrent une matrice de fichiers** ; c'est ce
  qu'il faut garder.
- Presque personne ne livre **le composant React** ni **le thème par variables**. C'est notre angle.
- Les workflows à gros checkpoint et les bibliothèques lourdes freinent l'usage réel.
- Un skill de logo doit **refuser de copier une marque existante** ; aucun des trois ne le fait
  aussi explicitement que la référence.

---

## 6. Ce que `logodeck` fait mieux

### 6.1 Plus complet, sans travail manuel

La référence exige de construire séparément le symbole, le wordmark et chaque lockup, puis de
lancer `export_variants.py` sur chaque master. `logodeck` prend **un manifeste + deux masters**
(symbole, wordmark) et compose le reste :

- lockup horizontal et vertical avec un espace optique dérivé d'un module ;
- favicon recadré serré, avec possibilité d'un dessin simplifié dédié ;
- icône d'application sur tuile arrondie avec zone de sécurité ;
- versions sombres dédiées (pas un simple `#fff`) ;
- `mono` pour **tous** les types (icône, wordmark, lockups) ;
- composant React, `palette.css`, `tokens.json`, `preview.html`.

### 6.2 Plus juste

- **Contraste calculé** : le build refuse une palette dont la marque descend sous 3:1 sur son fond
  ou dont l'encre descend sous 4,5:1. La version sombre est testée séparément.
- **Une seule source de vérité** : toutes les variantes sortent du même master ; pas de dérive.
- **Un audit qui bloque** : `<text>`, `<image>`, `<filter>`, `<mask>`, viewBox absent, couleurs
  en trop, stroke non expansé, détail minuscule, angle presque propre, ID dupliqué, titre manquant.
- **Le TSX compile** : la CI installe React et TypeScript et vérifie le composant généré.

### 6.3 Plus rapide et plus simple

- Un seul script Node, aucune dépendance à installer, aucun Python.
- Zéro bibliothèque de 1 432 fichiers : la recherche de clichés se fait par web + références
  courtes, avec une liste explicite des tropes sectoriels.
- Le deck complet est produit en une commande. Le checkpoint devient une option, pas une taxe.
- Le rendu visuel reste obligatoire, mais il est optionnel à l'installation : Playwright/Chromium
  n'est requis que pour les captures et la vérification pixel.

### 6.4 Les trois plus du brief

1. **Toutes les variantes d'un coup** — matrice de 12 fichiers + React + preview.
2. **Couleurs en une ligne** — tokens CSS, attributs, palettes accessibles.
3. **React prêt** — même format que Logoforge, mode auto réel, sans Tailwind imposé.

---

## 7. Nom et disponibilité

**Nom proposé : `logodeck`.**

- 8 caractères, un mot, prononçable en français comme en anglais.
- « deck » = le jeu complet de fichiers (icône, mono, sombre, wordmark, lockups, favicon, app
  icon, React). Le nom dit la promesse, pas la catégorie.
- Il ne reprend pas « logoforge », qui est déjà le nom d'un produit distinct de l'auteur
  (bibliothèque de vrais logos).
- Il ne contient pas « skill », ce qui permet de l'utiliser comme nom de package, de dossier et
  de composant sans répétition.

Vérifications effectuées (équivalents HTTP de `gh repo view` et `npm view`, l'environnement
bloquant les binaires `gh` et `npm` arbitraires) :

| Vérification | Résultat |
|---|---|
| `GET https://api.github.com/repos/terravidhal/logodeck` | **404** → dépôt libre |
| `GET https://api.github.com/repos/terravidhal/logo-deck` | 404 → nom de secours libre |
| `GET https://registry.npmjs.org/logodeck` | **404** → package npm libre |
| `GET https://registry.npmjs.org/logo-deck` | 404 |
| Recherche GitHub `logodeck in:name` | 2 dépôts homonymes, 0 étoile, 2021 et 2025, vides ou sans licence ; aucun package npm publié, aucun conflit de namespace |

Alternatives testées : `logokit` (npm libre mais générique), `logomint` (libre), `markdeck`
(**déjà pris sur npm**), `logo-deck` (libre, moins fluide). `logodeck` reste le meilleur compromis.

À faire avant publication : recherche d'antériorité de marque sur le nom, vérification du compte
npm/GitHub, et réservation du dépôt `terravidhal/logodeck`.

---

## 8. Architecture du dépôt

```text
logodeck/
├── README.md                    # promesse, install, avant/après, démo, limites
├── LICENSE                      # MIT
├── CONTRIBUTING.md
├── ETUDE.md                     # ce document
├── package.json                 # privé, scripts de lint/build, aucune dépendance runtime
├── .gitignore                   # ref/, node_modules, .next, captures temporaires
├── .github/workflows/check.yml  # frontmatter, liens, build, audit, TSX
├── scripts/
│   ├── check-skill.mjs          # vérifie tout le dépôt (sur le modèle logoforge-skill)
│   └── clone-ref.sh             # recrée ref/ pour l'étude (référence uniquement, gitignoré)
├── evals/evals.json
├── assets/
│   ├── palettes.json            # 7 palettes clair/sombre, contrastes calculés
│   ├── templates/
│   │   ├── logo.config.example.json
│   │   ├── symbol.svg           # master d'exemple, tokens CSS
│   │   ├── wordmark.svg         # wordmark d'exemple, paths uniquement
│   │   └── logo.tsx.tpl
│   └── readme/                  # captures Playwright : avant/après, light/dark, React
├── examples/
│   ├── loam/                    # marque fictive complète (symbole + wordmark + config)
│   │   ├── logo.json
│   │   ├── symbol.svg
│   │   ├── wordmark.svg
│   │   └── dist/                # deck généré (12 SVG + TSX + preview + tokens)
│   ├── site/                    # page statique de démonstration (aucun build)
│   └── capture.mjs              # Playwright/Chromium → assets/readme/*.png
└── skills/logodeck/
    ├── SKILL.md                 # instructions chargées par l'agent
    ├── references/
    │   ├── brief.md             # questions, hypothèses, carte de mots, clichés
    │   ├── marks.md             # types de marque, décision, lockups
    │   ├── geometry.md          # construction SVG, grille, optique, négatif
    │   ├── typography.md        # wordmark, espacement, licences, paths
    │   ├── color.md             # palettes, contraste, tokens, sombre
    │   ├── testing.md           # tests 16 px, mono, miroir, shelf, letter, junctions
    │   ├── variants.md          # matrice, nommage, favicon, app icon, React
    │   └── delivery.md          # README de marque, limites, handover
    └── scripts/
        ├── build.mjs            # manifeste → deck complet + preview + option PNG/ICO
        ├── audit.mjs            # audit SVG et score
        └── palette.mjs          # contraste WCAG, import/export de palettes
```

Les références et les scripts sont **dans** `skills/logodeck/`, car c'est ce dossier que
`npx skills add` copie. Les assets de développement (examples, captures, palettes) restent à la
racine, comme dans le dépôt modèle.

---

## 9. `SKILL.md` — plan

### 9.1 Frontmatter

```yaml
---
name: logodeck
description: >-
  Design an original logo and deliver the complete identity deck in one run:
  symbol, mono symbol, dark version, wordmark, horizontal and stacked lockups,
  favicon, app icon, themed SVG, preview sheet and a typed React component with
  automatic light/dark mode. Use when the user asks for a logo, logomark,
  wordmark, monogram, brand mark, app icon, favicon, logo variants, a logo kit,
  a rebrand, or a React logo component — even if they don't say "logo". Enforces
  brief, category clichés, geometric SVG, optical corrections, 16 px and
  one-colour tests, accessible palette contrast, and no copying of existing marks.
license: MIT
---
```

La description est le routeur sémantique : elle contient les mots des utilisateurs, les
livrables, les tests et le refus de copie. Le nom correspond au dossier et au `--skill`.

### 9.2 Corps — ordre proposé

1. **Le contrat** : un logo identifie, il n'explique pas ; noir d'abord ; 16 px ; une idée.
2. **Choisir le mode** : nouveau logo, critique, refonte, assets depuis un logo existant.
3. **Workflow en 7 étapes** :
   - 0. Lire la demande et le projet ; poser au plus 5 questions ou expliciter les hypothèses.
   - 1. Brief d'une page : nom, promesse, audience, 3–5 adjectifs, concurrents, contraintes.
   - 2. Recherche : conventions de la catégorie, **liste des clichés à éviter**, carte de mots.
   - 3. Concepts : 8–12 phrases, 3 directions de types différents, choix argumenté.
   - 4. Construction : symbole et wordmark en noir, `viewBox`, paths, aucun `<text>`.
   - 5. Tests : audit, 16 px, mono, inversé, miroir, blur, letter/junction/peer, deux passes.
   - 6. Deck : `build.mjs` génère toutes les variantes + React + preview ; capture et regarde.
   - 7. Livraison : deck, palette, règles d'usage, limites (marque, polices), prochaine étape.
4. **Outils** : commandes exactes de `build.mjs`, `audit.mjs`, `palette.mjs`.
5. **Matrice des variantes** et quand utiliser chacune.
6. **Thème en une ligne** : variables CSS, exemple HTML, exemple React.
7. **Règles dures** : pas de `<text>`, pas de raster, pas de filtre, ≤ 3 couleurs, contrastes,
   pas de copie, pas de fausse affiliation, pas de test non exécuté.
8. **Checklist finale** et **format de réponse** (fichiers, palette, tests, limites).

### 9.3 Checkpoint optionnel

Par défaut, le skill livre le deck complet (c'est la promesse). Si l'utilisateur demande
« montre-moi d'abord », ou si le projet est stratégique, il passe en mode `review` : trois
concepts, une image, une recommandation, puis attend. Le mode est annoncé dans la réponse, pas imposé.

---

## 10. Le deck : manifeste et pipeline

### 10.1 Manifeste

```json
{
  "name": "Loam",
  "slug": "loam",
  "component": "LoamLogo",
  "title": "Loam — soil health for small farms",
  "palette": "moss-clay",
  "files": {
    "symbol": "symbol.svg",
    "wordmark": "wordmark.svg",
    "symbolSmall": null
  },
  "geometry": {
    "symbolHeight": 1,
    "wordmarkHeight": 0.44,
    "gap": 0.3,
    "padding": 0.08,
    "stackedGap": 0.22,
    "appIconScale": 0.62,
    "appIconRadius": 0.225
  },
  "out": "dist"
}
```

### 10.2 Construction sans calcul de bounding box

Chaque master est un SVG **recadré serré**, avec un `viewBox` propre. Les lockups sont composés
avec des `<svg>` imbriqués (`x`, `y`, `width`, `height`, `viewBox`) : le navigateur fait le
placement, le script n'a pas à parser des courbes pour deviner une boîte englobante. C'est plus
court, plus robuste et parfaitement déterministe. L'audit vérifie que le viewBox est serré
(marge interne < 2 %) et que les masters n'ont ni width/height fixes ni contenu hors cadre.

### 10.3 Matrice de sortie

| Fichier | Contenu | Usage |
|---|---|---|
| `loam-symbol.svg` | symbole couleur, tokens CSS | header, inline, thème live |
| `loam-symbol-mono.svg` | symbole `currentColor` | UI discrète, une couleur |
| `loam-symbol-dark.svg` | symbole pour fond sombre | dark mode, fonds encre |
| `loam-wordmark.svg` | nom construit en paths | formats étroits |
| `loam-wordmark-dark.svg` | wordmark pour fond sombre | dark mode |
| `loam-lockup-horizontal.svg` | symbole + nom | header, signature principale |
| `loam-lockup-horizontal-dark.svg` | idem sur fond sombre | dark mode |
| `loam-lockup-stacked.svg` | symbole au-dessus du nom | formats carrés, social |
| `loam-favicon.svg` | recadrage serré, simplification optionnelle | 16/32 px |
| `loam-app-icon.svg` | tuile arrondie, marque à 62 %, zone de sécurité | iOS/Android/PWA |
| `loam-app-icon-maskable.svg` | marge de sécurité 20 % | PWA maskable |
| `loam.tsx` | composant React typé | React/Next |
| `loam-tokens.json` + `loam-palette.css` | tokens clair/sombre | design system |
| `loam-preview.html` | planche de contrôle autonome | review, captures |

### 10.4 Commandes

```bash
# Deck complet depuis un manifeste
node skills/logodeck/scripts/build.mjs logo.json --out dist

# Changer toute la palette en une option
node skills/logodeck/scripts/build.mjs logo.json --palette cobalt-mint --out dist

# Surcharger une seule couleur, sans toucher aux fichiers
node skills/logodeck/scripts/build.mjs logo.json --theme brand=#0F6B5C --out dist

# Ajouter les PNG + favicon.ico (nécessite Playwright/Chromium)
node skills/logodeck/scripts/build.mjs logo.json --out dist --png 16,32,192,512 --ico

# Audit de tous les SVG produits
node skills/logodeck/scripts/audit.mjs dist/*.svg
```

### 10.5 `preview.html`

Une page autonome, sans réseau, qui montre :

- chaque variante sur fond clair et sombre ;
- l'échelle 64 / 32 / 24 / 16 px et un vrai rendu pixel ;
- la version mono, l'inversé, le flou (squint), le miroir ;
- le favicon dans un onglet simulé, l'icône dans une tuile d'app, le header et la carte ;
- un sélecteur de couleur qui modifie les variables CSS en direct — la démonstration du « une ligne » ;
- le composant React à côté de son rendu (si l'exemple React est compilé).

---

## 11. Thème et palettes accessibles

### 11.1 Contrat de tokens

| Token | Rôle | Exemple |
|---|---|---|
| `--ld-ink` | encre principale (texte, mono) | `#14212B` |
| `--ld-brand` | couleur de marque | `#0F6B5C` |
| `--ld-accent` | accent (≤ 30 % de la surface) | `#FF6B4A` |
| `--ld-bg` | fond clair de référence | `#F7F5EF` |
| `--ld-on-dark` | encre sur fond sombre | `#F2F7F4` |
| `--ld-brand-dark` | variante de marque sur fond sombre | `#5FD3B4` |
| `--ld-accent-dark` | accent sur fond sombre | `#FF8A6B` |

Les masters écrivent `fill="var(--ld-brand, #0F6B5C)"`. Le build :

1. valide les contrastes (3:1 marque/fond, 4,5:1 encre/fond, 3:1 accent/fond, idem en sombre) ;
2. produit un fichier **fixe** par variante pour les usages `<img>` ;
3. produit `palette.css` avec les deux jeux de tokens et une règle `:root[data-theme="dark"]` ;
4. imprime un rapport lisible (ratios, paires, avertissements).

### 11.2 Sept palettes proposées

Des palettes nommées, testées, avec une personnalité différente et sans tomber dans le bleu
tech par défaut :

`moss-clay`, `spruce-coral`, `cobalt-mint`, `plum-gold`, `slate-sky`, `clay-cream`,
`midnight-rose`. Chacune fournit clair + sombre, les ratios et une note d'usage. L'agent peut
aussi partir d'une palette utilisateur et la faire valider.

### 11.3 Une ligne

```html
<!-- inline : le logo suit les variables de la page -->
<svg class="logo" style="--ld-brand:#0F6B5C; --ld-accent:#FF6B4A">…</svg>
```

```tsx
<LoamLogo type="horizontal" style={{ "--ld-brand": "#0F6B5C" }} />
```

```css
/* ou globalement, une seule règle */
:root { --ld-brand: #0F6B5C; --ld-accent: #FF6B4A; }
```

Limite documentée : un SVG chargé par `<img src>` n'hérite pas des variables de la page. Utiliser
le fichier inline pour le thème live, ou le fichier fixe généré pour `<img>`. C'est la seule
contrainte, et elle est explicite.

---

## 12. Composant React

### 12.1 Surface d'API (alignée Logoforge)

```tsx
export type LoamLogoProps = Omit<SVGProps<SVGSVGElement>, "type"> & {
  variant?: "color" | "mono";
  type?: "icon" | "wordmark" | "horizontal" | "stacked";
  mode?: "auto" | "light" | "dark";
  title?: string;
};
```

- `variant="mono"` : `currentColor`, valable pour **tous** les types.
- `type="wordmark"` : lockup complet horizontal, comme Logoforge.
- `type="horizontal"` / `"stacked"` : extension explicite pour les deux lockups.
- `mode="auto"` : choisit clair/sombre sans Tailwind, via `useSyncExternalStore` qui observe
  la classe `.dark`, `[data-theme]` et `prefers-color-scheme`. Snapshot serveur = clair.
- `title=""` : décoratif (`aria-hidden`), sinon `role="img"` + `aria-label`.
- `height: "1em"` par défaut, ratio préservé, `className` transmis.
- Zéro dépendance hors `react` ; aucun import de `next`, de Tailwind ou d'un package de logos.
- Thème par `style={{ "--ld-brand": … }}` ; les fichiers couleur restent la source.

### 12.2 Format de fichier

Même en-tête et même structure que les composants Logoforge : commentaire de génération,
`import type { SVGProps } from "react"`, constantes `Icon`, `IconMono`, `IconDark`, `Wordmark`,
`LockupHorizontal`, `LockupStacked`, `join()`, fonction exportée + export par défaut. La seule
différence volontaire est le mode auto sans classes Tailwind.

### 12.3 Vérification

- `tsc --noEmit` sur l'exemple avec React 19 et `@types/react`.
- Rendu Playwright de la page d'exemple en clair et sombre, avec bascule `.dark` et
  `prefers-color-scheme`, pour prouver les deux chemins.
- Audit du TSX : pas de couleur en dur hors tokens, `title` propagé, pas de `dangerouslySetInnerHTML`.

---

## 13. Qualité : audit, gates, evals, CI

### 13.1 Audit SVG (`audit.mjs`)

Erreurs bloquantes :

- `<text>` dans un master final ;
- `<image>`, `<foreignObject>`, raster embarqué ;
- `<filter>` (flou, ombre, glow) ;
- `viewBox` manquant ou non numérique ;
- largeur/hauteur fixes sur la racine (hors fichiers de rendu) ;
- plus de 4 couleurs littérales (hors tokens) ;
- `stroke` non expansé dans un master ;
- ID dupliqué ;
- master sans `<title>` ni rôle accessible (pour les fichiers autonomes) ;
- couleur de token absente du fallback ;
- variante manquante dans la matrice.

Avertissements :

- `<mask>` / `<clipPath>` (compatibilité) ;
- angle à 0,3–3° d'un angle propre ;
- sous-forme minuscule (approximation par segments) ;
- nombre d'ancres au-dessus du 75e percentile d'un petit corpus de contrôle ;
- marge interne du viewBox > 2 % ou < 1 % ;
- stroke width < 1/48 de la largeur ;
- contraste de palette sous le seuil.

Score sur 100, mais **la règle est : zéro erreur pour livrer**. Le score sert à comparer les
itérations, pas à excuser une erreur.

### 13.2 Audit de dessin (humain/agent, non automatisable)

- Une phrase pour l'idée.
- Le symbole se lit sans le wordmark.
- Letter test, junction check, peer test.
- 16 px réel, mono, inversé, miroir, rotation, flou.
- Shelf test contre 3–4 concurrents.
- Aucun cliché non retourné.
- Aucune lecture accidentelle (politique, religieuse, sexuelle, marque connue).

### 13.3 Evals (`evals/evals.json`)

| Cas | Prompt | Doit | Ne doit pas |
|---|---|---|---|
| `full-deck` | « Logo pour Loam, app de santé des sols ; toutes les variantes + React » | brief + 3 directions + deck complet + palette testée + TSX + tests | livrer un seul SVG, utiliser `<text>`, sauter le contraste |
| `one-line-theme` | « Passe la marque en #0F6B5C » | changer le token, rebuild, toutes les variantes suivent | éditer 12 fichiers à la main |
| `dark-favicon` | « Une version sombre et un favicon » | fichiers dédiés + test 16 px + contraste | utiliser `invert()` ou un filtre |
| `critique` | « Critique ce logo » | scorecard, 3 correctifs prioritaires, proposition | refondre sans accord |
| `copy-trap` | « Fais comme le logo de Stripe » | refus de copie, direction originale, note marque | tracer ou imiter |
| `font-trap` | « Utilise cette police » | paths, note de licence, fallback | livrer `<text>` dépendant d'une police |

### 13.4 CI (`.github/workflows/check.yml`)

1. `npm run lint` → `scripts/check-skill.mjs` : frontmatter, description, liens relatifs, JSON,
   fichiers requis, noms cohérents, matrice de variantes.
2. Build de l'exemple dans `/tmp`, puis `audit.mjs` : zéro erreur.
3. `npm ci --prefix examples` + `tsc --noEmit` : le TSX généré compile.
4. `git diff --exit-code` sur les artefacts générés de l'exemple : le build est reproduisible.
5. Job séparé, non bloquant, `workflow_dispatch` : captures Playwright avec Chromium.
6. Interdiction de secrets : le check refuse les motifs de clés et les fichiers `.env` suivis.

---

## 14. Exemple et README avant/après

### 14.1 Marque fictive

**Loam** — application de santé des sols pour petites fermes. Adjectifs : ancré, vivant,
précis, généreux. Symbole : une graine dont la fente dessine une courbe de niveau ; wordmark
construit, bas de casse, empattement coupé. Palette `moss-clay`.

L'exemple est **original** et fictif. Aucun logo réel n'est utilisé, ni dans le code, ni dans
les captures. La mention « toute ressemblance… » est inutile : tout est dessiné pour l'exemple.

### 14.2 Avant / après

Le README ouvre sur une comparaison :

- **Avant** : un PNG 512 px flou, un favicon illisible, aucune version mono, aucun dark, un
  wordmark en `<text>` qui casse selon la police, pas de composant.
- **Après** : les 12 SVG, le favicon 16 px lisible, la version sombre, le mono, le lockup, la
  tuile d'app, le TSX et la planche de contrôle.

La capture est produite par `examples/capture.mjs` (Playwright/Chromium), en 1440 px et 390 px,
clair et sombre. Les images sont commitées dans `assets/readme/`. Un GIF court peut être ajouté
plus tard, sans devenir une dépendance du skill.

### 14.3 README — ordre

1. Titre + une phrase + `npx skills add terravidhal/logodeck`.
2. Avant/après, puis les trois plus (deck, thème, React).
3. Installation multi-agents (une ligne par agent) + copie manuelle.
4. Démo : « Ask your agent: design a logo for Loam… ».
5. Ce que le deck contient (tableau).
6. Une ligne de thème (HTML + React).
7. Le composant React (API).
8. Tests et garanties (contraste, 16 px, audit).
9. Ce que le skill ne fera pas (copier, raster, fausse affiliation).
10. Licence MIT, aucun trademark embarqué.

---

## 15. Risques et mitigations

| Risque | Impact | Mitigation |
|---|---|---|
| L'agent produit un logo générique ou clip-art | Très élevé | Liste de clichés obligatoire, 3 directions, letter/junction/peer tests, refus du littéral |
| Le favicon est illisible | Élevé | Test 16 px réel + dessin simplifié optionnel + audit des détails |
| Les variantes divergent | Élevé | Un manifeste, un build, toutes les variantes générées |
| Contraste insuffisant | Élevé | Calcul WCAG bloquant, palettes livrées testées |
| Le TSX ne compile pas | Moyen | `tsc --noEmit` en CI, génération depuis un template unique |
| Le thème ne marche pas en `<img>` | Moyen | Fichiers fixes générés + documentation explicite |
| L'agent copie une marque | Élevé (juridique) | Règle dure, eval `copy-trap`, aucune bibliothèque de marques |
| Playwright absent | Faible | Le build SVG fonctionne sans ; l'agent doit dire qu'il n'a pas pu regarder |
| La référence change de licence | Faible | Aucune dépendance à son code ; tout est réécrit |
| Le nom `logodeck` entre en conflit | Faible | Dépôt/npm libres ; recherche de marque avant publication |

---

## 16. Plan d'implémentation

Chaque étape finit par un commit local, avec l'identité demandée, sans mention d'outil.

1. **Étude** — `ETUDE.md`, `.gitignore`, `scripts/clone-ref.sh`. Commit
   `docs: study logo skill repos and plan logodeck`.
2. **Squelette** — `README.md` initial, `LICENSE`, `CONTRIBUTING.md`, `package.json`,
   arborescence, `assets/palettes.json`. Commit
   `chore: scaffold logodeck skill repository`.
3. **Moteur** — `build.mjs`, `palette.mjs`, templates de masters, exemple Loam, sortie complète.
   Commit `feat: generate the full logo deck from one manifest`.
4. **Audit** — `audit.mjs`, règles de contraste, vérification de la matrice, preview.
   Commit `feat: audit SVG output and palette contrast`.
5. **Instructions** — `SKILL.md` + 8 références courtes, en anglais, orientées action.
   Commit `docs: write logodeck skill instructions`.
6. **React** — template TSX, mode auto sans Tailwind, typecheck de l'exemple.
   Commit `feat: export a typed React logo component`.
7. **Preuves** — captures Playwright avant/après, page d'exemple, README final.
   Commit `docs: add worked example and before/after README`.
8. **Qualité** — `evals/evals.json`, `scripts/check-skill.mjs`, workflow CI.
   Commit `test: add evals, repository checks and CI`.
9. **Revue** — liens, frontmatter, build reproductible, relecture anglaise, poids du dépôt.
   Commit `chore: final review`.

### Critères d'acceptation

- `npx skills add terravidhal/logodeck --list` trouve le skill `logodeck`.
- `SKILL.md` a `name: logodeck` et une description déclencheuse (logo, variantes, React…).
- Un manifeste + deux masters produisent les 12 SVG, le TSX, les tokens et la preview en une commande.
- Changer `--palette` ou une variable CSS met à jour **toutes** les variantes au rebuild.
- Le composant compile avec React 19 et expose `variant`, `type`, `mode`, `title`.
- `audit.mjs` sort zéro erreur sur l'exemple ; les contrastes passent.
- Le README affiche l'installation dans les dix premières lignes et une comparaison avant/après.
- Aucun logo de marque tierce, aucune dépendance runtime, aucun secret.
- La CI passe sur Node 22 ; les captures sont reproductibles.

---

## 17. Sources consultées

### Référence principale

- `https://github.com/kaankiziltug/logo-design-skill` — commit
  `e9eaddc07895575253d6663320354a708f53e955` :
  `README.md`, `LICENSE`, `TRADEMARKS.md`, `evals/evals.json`, `.github/workflows/test.yml`,
  `skills/logo-design/SKILL.md`, `references/{principles,mark-types,visual-techniques,typography,color,svg-construction,testing-checklist}.md`,
  `scripts/export_variants.py`.
- Métadonnées : 7 643 étoiles, 597 forks, licence MIT constatée, 1 432 SVG annoncés.

### Autres skills

- `https://github.com/neonwatty/logo-designer-skill` — README, `skills/logo-designer/SKILL.md`.
- `https://github.com/jim788e/logo-creation-skill` — README, `SKILL.md`.
- `https://github.com/atypica-ai/logo-design-skill` — README, `skills/logo-design/SKILL.md`.

### Modèle de structure

- `https://github.com/terravidhal/logoforge-skill` — README, `SKILL.md`,
  `scripts/check-skill.mjs`, `evals/evals.json`, `.github/workflows/check.yml`,
  `examples/components/logos/{figma,vercel}.tsx`, `package.json`.

### Vérifications de nom

- `https://api.github.com/repos/terravidhal/logodeck` → 404.
- `https://registry.npmjs.org/logodeck` → 404.
- `https://api.github.com/search/repositories?q=logodeck+in:name` → 2 homonymes sans activité.
