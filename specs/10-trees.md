# 10 — Arbres & génération

> Un **générateur d'arbres** (chêne inspiré de Minecraft : tronc en `WOOD`,
> feuillage en `LEAVES`) et leur **semis aléatoire déterministe** dans le
> générateur de monde. S'appuie sur [`03-block-system.md`](./03-block-system.md)
> (bloc `LEAVES`) et [`02-world.md`](./02-world.md) (génération).

## 1. Objectif

Peupler le monde superflat d'arbres crédibles et variés, générés une fois au
démarrage, **de façon déterministe** (une graine → toujours le même monde) et
sans perturber le budget de rendu (le feuillage opaque profite du face culling).

## 2. Périmètre

- ✅ Un type d'arbre : **chêne** (small oak) façon Minecraft.
- ✅ Hauteur de tronc **aléatoire 4–6**.
- ✅ Feuillage en couronne (2 couches larges + 2 couches étroites).
- ✅ Semis aléatoire **déterministe** (PRNG à graine fixe) avec **espacement
  minimum** entre troncs.
- ✅ Écriture directe dans le tableau brut (pas de section dirty, cf.
  [`02`](./02-world.md) §8).
- ❌ Autres essences (bouleau, sapin…), variations de biome.
- ❌ Feuillage transparent / décroissance des feuilles / repousse.
- ❌ Génération à la volée autour du joueur (le monde est fini et généré une fois).

## 3. Structure du chêne (inspirée de Minecraft)

Tronc vertical d'une colonne, hauteur `H ∈ [4, 6]`. Le log le plus haut est à
`topLog = baseY + H − 1` (avec `baseY` = surface + 1).

Feuillage, en couronne autour du sommet (rayon = distance de Chebyshev en X/Z) :

| Couche `y`     | Étendue | Coins retirés | Forme        |
| -------------- | ------- | ------------- | ------------ |
| `topLog − 2`   | 5×5 (r=2) | oui         | octogone     |
| `topLog − 1`   | 5×5 (r=2) | oui         | octogone     |
| `topLog`       | 3×3 (r=1) | non         | carré plein  |
| `topLog + 1`   | 3×3 (r=1) | oui         | **plus** (+) |

- « Coins retirés » = on n'place pas la feuille si `|dx| == r && |dz| == r`
  (arrondit la couronne ; au sommet `r=1` ça donne une croix `+`).
- **Règle d'écriture** :
  - **Tronc (`WOOD`)** : écrit **inconditionnellement** sur `baseY … topLog`.
  - **Feuille (`LEAVES`)** : écrite **seulement si la cellule est `AIR`** → ne
    recouvre jamais un log (le tronc reste visible au centre des couches
    basses) et gère proprement le chevauchement entre arbres voisins.

Schéma (coupe verticale, `H = 5`, `█`=tronc, `♣`=feuille) :

```
            topLog+1   . ♣ ♣ ♣ .        (plus)
            topLog     ♣ ♣ █ ♣ ♣        (3x3, centre = log)
            topLog-1   ♣♣♣♣♣ (5x5 sans coins), centre = log
            topLog-2   ♣♣♣♣♣ (5x5 sans coins), centre = log
                       █                 tronc nu
                       █
            baseY      █  (posé sur l'herbe)
```

## 4. Contrat du générateur d'arbre

```ts
export class TreeGenerator {
  /** écrit un arbre (tronc + feuillage) dans le tableau brut */
  generate(raw: Uint8Array, x: number, baseY: number, z: number, height: number): void;
}
```

- `raw` : le `Uint8Array` du monde ([`02`](./02-world.md) §3).
- Écritures via l'index linéaire de `coords.ts`. Hors bornes → ignoré (les
  feuilles qui déborderaient du monde sont simplement omises).
- Le générateur **ne choisit pas** l'emplacement ni la hauteur : c'est le semis
  (§5) qui les fournit → générateur pur et testable.

## 5. Semis aléatoire déterministe

Réalisé dans `WorldGenerator` **après** la génération du relief. Les arbres ne
sont **pas** répartis uniformément : un **bruit de densité de forêt** crée des
**zones boisées denses** et des **plaines sans arbres**.

### PRNG

Petit générateur à graine (`mulberry32`) dans `core/rng.ts` → reproductible :

```ts
export function mulberry32(seed: number): () => number; // renvoie [0,1)
```

### Algorithme

```
rng = mulberry32(WORLD_SEED + 101)
mask = Uint8Array(WORLD_X * WORLD_Z)          // zones d'exclusion (keep-out)
marquer un disque (rayon 4) autour du spawn (centre du monde)  // pas d'arbre sur le joueur
pour a de 0 à TREE_ATTEMPTS-1:
  x = 2 + floor(rng() * (WORLD_X - 4))         // marge = rayon de couronne (2)
  z = 2 + floor(rng() * (WORLD_Z - 4))
  si mask[x + WORLD_X*z]: continue             // trop proche d'un arbre existant
  h = heightMap[x,z]                           // surface (relief variable)
  si raw[index(x, h, z)] != GRASS: continue    // arbres seulement sur l'herbe (pas la pierre)
  forest = fbm(x·FOREST_FREQ, z·FOREST_FREQ)   // densité de forêt [0,1]
  p = smoothstep(FOREST_THRESHOLD, FOREST_FULL, forest)   // 0 en plaine, 1 en pleine forêt
  si rng() > p: continue                        // porte probabiliste -> regroupe en forêts
  H = TREE_MIN_HEIGHT + floor(rng() * (TREE_MAX_HEIGHT - TREE_MIN_HEIGHT + 1))
  tree.generate(raw, x, h + 1, z, H)           // posé sur la surface
  marquer un disque de rayon TREE_SPACING autour de (x,z) dans mask
```

- **Distribution non uniforme** : la porte `rng() > p` rejette presque tout en
  plaine (`p ≈ 0`) et laisse passer en forêt (`p → 1`) → **grappes** d'arbres.
- **Sur l'herbe uniquement** : lire la surface (`GRASS`) exclut naturellement
  montagnes et pentes rocheuses.
- **Sur la surface réelle** : `baseY = heightMap[x,z] + 1` → les arbres suivent
  le relief (collines comprises).
- **Marge de bord** (`2`) : garantit que la couronne 5×5 tient dans le monde.
- **Espacement** (`mask` + disque `TREE_SPACING`) : évite les troncs collés
  (les couronnes se chevauchent, comme dans Minecraft — géré par « feuille
  seulement si AIR »).
- **Déterministe** : ordre des tirages `rng()` + bruits seedés fixes.

### Constantes (proposition, `core/constants.ts`)

| Constante          | Valeur | Rôle                                       |
| ------------------ | ------ | ------------------------------------------ |
| `WORLD_SEED`       | 1337   | graine du monde                            |
| `FOREST_FREQ`      | 1/40   | échelle des zones de forêt                  |
| `FOREST_THRESHOLD` | 0.55   | sous ce seuil : plaine sans arbre           |
| `FOREST_FULL`      | 0.78   | au-dessus : densité maximale                |
| `TREE_MIN_HEIGHT`  | 4      | hauteur de tronc min                       |
| `TREE_MAX_HEIGHT`  | 6      | hauteur de tronc max                       |
| `TREE_SPACING`     | 3      | rayon d'exclusion entre troncs (forêt dense)|
| `TREE_ATTEMPTS`    | 8000   | tentatives de placement (beaucoup rejetées) |

> Ordres de grandeur observés (graine 1337) : ~**24 %** de la carte en forêt,
> ~**300** arbres posés, le reste en plaine. Ajuster `FOREST_THRESHOLD`
> (couverture), `TREE_SPACING` (densité), `TREE_ATTEMPTS` (saturation).

## 6. Interactions avec les autres systèmes

- **Rendu** ([`04`](./04-rendering.md)) : `WOOD` et `LEAVES` sont solides et
  opaques → face culling normal ; le feuillage rend comme un volume vert plein.
  Aucun changement au mesher.
- **Physique** ([`06`](./06-physics-collision.md)) : troncs et feuilles sont
  solides → le joueur peut grimper/se poser dessus.
- **Interaction** ([`07`](./07-interaction.md)) : casser/poser fonctionnent
  normalement (créatif). `LEAVES` est `placeable` (dans la hotbar).
- **Meshing initial** : les arbres sont dans le `raw` avant `buildAll()` → ils
  sont maillés au démarrage, sans marquer de sections dirty.

## 7. Questions ouvertes

- **Densité / couverture** : réglées par `TREE_SPACING` (densité intra-forêt),
  `FOREST_THRESHOLD`/`FOREST_FULL` (part de la carte boisée) et `TREE_ATTEMPTS`.
  À affiner au ressenti.
- **Transparence des feuilles** : opaques au MVP ; le rendu ajouré (faces
  internes visibles + alpha) est un raffinement post-MVP qui demanderait un
  matériau distinct et l'exclusion des feuilles du face culling.
- **Essences multiples** : le contrat `TreeGenerator` est prêt à accueillir des
  variantes (bouleau, sapin) via un paramètre de forme.
