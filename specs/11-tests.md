# 11 — Tests unitaires

> Vérifier automatiquement le cœur **logique** du jeu avec **Vitest**. Un test
> est une **spec exécutable** : il transforme une règle écrite ici en garantie
> qui **casse (rouge)** ou **passe (vert)** à chaque modification du code.

## 1. Objectif

S'assurer que les fonctions **pures** du jeu (coordonnées, bruit, génération,
raycast, collisions, pose/casse) se comportent comme spécifié — **sans** lancer
le navigateur ni three.js. C'est la compétence n°1 face au code assisté par IA :
**vérifier**.

## 2. Périmètre

- ✅ Fonctions **pures / déterministes** : entrée → sortie, sans effet de bord.
- ✅ Logique de données : `World` (pose/casse), conversions, bornes du monde.
- ✅ Déterminisme du bruit / PRNG (même graine → même résultat).
- ❌ Rendu three.js, meshing visuel, matériaux (aucune assertion « pixels »).
- ❌ Entrées clavier/souris, pointer lock, boucle de jeu (DOM / navigateur).
- ❌ Tests end-to-end / visuels (hors MVP ; cf. §8).

> Règle d'or : **si une fonction a besoin de three.js ou du DOM pour être
> testée, ce n'est pas la bonne cible** — on teste la logique en dessous.

## 3. Outillage

| Élément       | Choix                                          |
| ------------- | ---------------------------------------------- |
| Testeur       | **Vitest** (rapide, natif Vite / TS / ESM)     |
| Environnement | `node` (aucun DOM nécessaire)                  |
| Emplacement   | `*.test.ts` **à côté** du module testé         |
| Lancement     | `npm test` (une fois) · `npm run test:watch`   |

```jsonc
// package.json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest"
}
```

Vitest réutilise `vite.config.ts` (alias `@` → `src`) : pas de config dédiée.

## 4. Cibles & garanties

Chaque ligne = une garantie vérifiée par au moins un test. Les noms de fonctions
sont ceux **réellement** exportés par le code.

| # | Module (fichier)                | Fonctions                                   | Garantie |
|---|---------------------------------|---------------------------------------------|----------|
| 1 | `world/coords.ts`               | `index`, `inBounds`, `sectionOf`, `sectionKey` | index linéaire correct (X varie le plus vite) ; bornes ; découpage en sections |
| 2 | `core/noise.ts`, `core/rng.ts`  | `fbm2`, `ridged2`, `mulberry32`             | déterminisme par graine ; sorties dans [0,1] ; graines ≠ → valeurs ≠ |
| 3 | `world/WorldGenerator.ts`       | `generate(raw)`                             | toute hauteur ∈ [4, `WORLD_Y`−5] ; génération reproductible |
| 4 | `interaction/VoxelRaycaster.ts` | `cast`                                      | vise le bon bloc + bonne face (normale) + cellule adjacente |
| 5 | `player/Physics.ts`             | `step`                                      | chute → posé sur le bloc, `onGround = true` ; mur invisible aux bords |
| 6 | `world/World.ts`                | `setBlock`, `getBlock`, `takeDirtySections` | après pose : bon type ; après casse : `AIR` ; sections *dirty* marquées |

### Notes d'adaptation au code réel

- **Pas d'aller-retour `sectionToWorld`** : `sectionOf` **perd** l'offset local
  (plusieurs positions monde → une même section). On teste donc le **découpage**
  (`floor(x / SECTION)`), pas une réciproque exacte.
- **Graine non paramétrée de bout en bout** : `WorldGenerator` lit la constante
  `WORLD_SEED` (et non un argument). Le test « graines différentes → mondes
  différents » se fait donc au niveau **`fbm2` / `ridged2` / `mulberry32`** (qui,
  eux, prennent `seed`). Au niveau `generate()`, on teste la **reproductibilité**
  (deux appels → tableaux identiques) et les **bornes** de hauteur. *(Refactor
  possible plus tard : extraire `columnHeight(x, z, seed)` — cf. §8.)*
- **Raycast & physique** : leur seule dépendance externe est
  `world.isSolid(x, y, z)`. On peut fournir un **monde factice** `{ isSolid }` —
  pas besoin de three.js.
- **Monde vide pour pose/casse** : le constructeur de `World` génère tout le
  relief ; pour partir d'un monde vide, passer un générateur factice
  `{ generate() {} }` à `new World(...)`.

## 5. Conventions d'écriture

- Structure **AAA** : *Arrange* (préparer) · *Act* (agir) · *Assert* (vérifier).
- Un `describe` par module, un `it` par comportement, **formulé en français** :
  `it("découpe les coordonnées monde en sections de 16", …)`.
- **Réflexe rouge/vert** : casser volontairement le code (ou l'attendu) pour
  **voir le test échouer**, puis réparer — un test qui ne peut pas échouer ne
  garantit rien.
- Valeurs attendues **calculées à la main** ou dérivées des constantes, **jamais**
  recopiées depuis la sortie du code (sinon on teste « le code = le code »).

```ts
import { describe, it, expect } from "vitest";
import { index } from "@/world/coords";
import { WORLD_X, WORLD_Z } from "@/core/constants";

describe("coords", () => {
  it("indexe en linéaire y-major, X le plus rapide", () => {
    expect(index(1, 0, 0)).toBe(1);                  // +1 en X → +1
    expect(index(0, 0, 1)).toBe(WORLD_X);            // +1 en Z → +WORLD_X
    expect(index(0, 1, 0)).toBe(WORLD_X * WORLD_Z);  // +1 en Y → +1 couche
  });
});
```

## 6. Critères de réussite (fin de Phase 1)

- [ ] `npm test` passe en local (et plus tard en CI, cf. Phase 2).
- [ ] **≥ 10 tests** couvrant **≥ 3 modules**.
- [ ] Chaque enfant sait **expliquer** un test qu'il a écrit et ce qu'il garantit.
- [ ] Au moins un test a été **vu échouer** volontairement (rouge → vert).

## 7. Déroulé pédagogique (séances)

1. **Séance 1 (ensemble)** — installer Vitest, écrire les tests de `coords`
   *(fait, comme exemple de référence : [`src/world/coords.test.ts`](../src/world/coords.test.ts))*.
   Introduire le réflexe rouge/vert.
2. **Séance 2 (chacun son module)** — Romain et Anatole choisissent chacun une
   cible (ex. **bruit / génération** pour l'un, **raycast** pour l'autre),
   écrivent leurs tests, et **s'expliquent** mutuellement la garantie.
3. **Séance 3 (cas limites)** — demander à Claude Code des cas limites
   supplémentaires, puis **valider ensemble** leur pertinence (et en **rejeter au
   moins un !**).

## 8. Questions ouvertes

- **Extraire `columnHeight(x, z, seed)`** de `WorldGenerator.buildHeightMap` pour
  rendre la graine paramétrable et tester « graines ≠ → mondes ≠ » de bout en
  bout ? *(Décision actuelle : non — on teste au niveau `fbm2`.)*
- **Couverture** (`vitest --coverage`) : utile plus tard, pas au MVP.
- **Tests dans le typecheck / build** : les `*.test.ts` sont dans `src/`, donc
  vérifiés par `tsc`. À surveiller si le build s'alourdit (option : un `tsconfig`
  séparé pour les tests).
- **Lien CI** : `npm test` sera branché dans le workflow GitHub Actions (Phase 2).
