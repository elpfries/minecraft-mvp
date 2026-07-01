# 02 — Monde & structure de données

> Comment les blocs sont **stockés**, **lus/écrits**, comment les **sections
> dirty** sont signalées, et comment le monde **à relief** (plaines, collines,
> montagnes) est généré au démarrage. Le registre des blocs (couleurs,
> propriétés) est dans [`03-block-system.md`](./03-block-system.md).

## 1. Objectif

Fournir une structure de données de blocs **compacte, rapide en lecture/écriture
aléatoire**, seule source de vérité du jeu, avec un mécanisme de notification
pour que le rendu sache quoi re-mailler.

## 2. Périmètre

- ✅ Stockage dense d'un monde fini **256 × 256 × 64**.
- ✅ `getBlock` / `setBlock`, tests de bornes et de solidité.
- ✅ Suivi des **sections dirty** (granularité de re-meshing 16×16).
- ✅ Génération **procédurale déterministe** du relief (plaines, collines,
  montagnes) par bruit.
- ✅ Sémantique des **bords du monde** (mur invisible).
- ❌ Biomes, grottes, minerais, structures, surplombs (hors MVP).
- ❌ Sauvegarde/chargement (hors MVP).
- ❌ Sections verticales / streaming (les sections couvrent toute la hauteur).

## 3. Dimensions & mémoire

| Constante   | Valeur | Note                          |
| ----------- | ------ | ----------------------------- |
| `WORLD_X`   | 256    | axe X                         |
| `WORLD_Z`   | 256    | axe Z                         |
| `WORLD_Y`   | 64     | hauteur                       |
| `SECTION`   | 16     | côté d'une section (X et Z)   |
| Sections    | 16×16  | = **256 sections**            |

- Total blocs : `256 × 256 × 64 = 4 194 304`.
- Stockage : **`Uint8Array`** (1 octet/bloc) → **~4,2 Mo**. Un `BlockId` tient
  largement dans un octet (< 256 types).

## 4. Indexation

Ordre linéaire figé (**y-major**, colonnes X contiguës) :

```
index(x, y, z) = x + WORLD_X * (z + WORLD_Z * y)
```

- X varie le plus vite (bon pour le balayage d'une ligne par le mesher).
- Toutes les conversions vivent dans `coords.ts` — **aucun** autre fichier ne
  recalcule un index à la main.

```ts
// coords.ts
export function index(x: number, y: number, z: number): number;
export function inBounds(x: number, y: number, z: number): boolean;
export function sectionOf(x: number, z: number): { sx: number; sz: number };
export function sectionKey(sx: number, sz: number): string;   // "sx,sz"
export const SECTIONS_X = WORLD_X / SECTION;   // 16
export const SECTIONS_Z = WORLD_Z / SECTION;   // 16
```

## 5. Sémantique de lecture / écriture

### `getBlock(x, y, z): BlockId`
- **Hors bornes → `AIR` (0).** Conséquence voulue : au bord du monde, les faces
  extérieures des blocs solides sont **rendues** (on voit la tranche du terrain
  comme une falaise). C'est cohérent et gratuit.

### `setBlock(x, y, z, id): void`
- **Hors bornes → no-op** (on ne pose/casse rien en dehors du monde).
- Écrit `id` dans le tableau.
- **Marque dirty** la section du bloc **et** les sections voisines concernées si
  le bloc est sur une arête de section (voir §6).
- Si `id` est inchangé, ne rien faire (pas de dirty inutile).

### `isSolid(x, y, z): boolean`
- `= getBlock(...) !== AIR` **et** `BlockRegistry[id].solid`. Hors bornes :
  **voir §7** (traité comme solide pour la physique horizontale, comme AIR pour
  le rendu — deux usages distincts).

## 6. Sections dirty (notification de re-meshing)

But : ne reconstruire que ce qui change. Le `World` tient un `Set<string>` de
clés de sections modifiées.

- `setBlock` ajoute `sectionKey(sectionOf(x,z))` au set.
- **Voisins d'arête** : une face à la frontière entre deux sections dépend du
  bloc d'en face. Donc si `x % 16 === 0`, marquer aussi la section `(sx-1, sz)` ;
  si `x % 16 === 15`, la section `(sx+1, sz)` ; idem pour `z`. (Pas de voisins
  verticaux : les sections couvrent toute la hauteur.)
- `takeDirtySections()` **retourne puis vide** le set (consommé une fois par
  frame par `SectionMeshManager.flush()`).

```ts
export class World {
  private dirty = new Set<string>();
  setBlock(...) { /* écrit + this.dirty.add(...) pour section + voisins */ }
  takeDirtySections(): { sx: number; sz: number }[] { /* renvoie et vide */ }
}
```

> **Génération initiale** : le remplissage superflat écrit **directement** dans
> le `Uint8Array` (chemin brut, sans marquer dirty), puis
> `SectionMeshManager.buildAll()` maille tout une fois. On évite ainsi de
> marquer 256 sections dirty au démarrage.

## 7. Bords du monde (mur invisible)

Deux usages de « hors bornes », à ne pas confondre :

| Usage      | Hors bornes vaut… | Raison                                          |
| ---------- | ----------------- | ----------------------------------------------- |
| **Rendu**  | `AIR`             | rend les faces de bord (falaise visible)        |
| **Physique horizontale** | **solide** | le joueur est bloqué : il ne sort pas du monde |

Concrètement (détaillé dans [`06-physics-collision.md`](./06-physics-collision.md)) :
l'AABB du joueur est **bornée** à `[0, WORLD_X] × [0, WORLD_Z]` en X/Z — un mur
vertical invisible aux quatre bords. Pas de plafond (hauteur 64 hors d'atteinte),
pas de sol sous `y=0` (le joueur bute sur la pierre bien avant).

## 8. Génération du relief (procédurale, déterministe)

Le relief vient d'un **bruit** maison (value noise + fBm, `core/noise.ts`),
seedé par `WORLD_SEED` → **reproductible**. Trois échelles se combinent en une
**carte de hauteurs** `heightMap[x,z]`, puis chaque colonne est remplie.

### 8.1 Carte des hauteurs

```
hills   = fbm(x·HILL_FREQ, z·HILL_FREQ)                 // [0,1] doux, arrondi
h       = TERRAIN_BASE + hills · HILL_AMP               // plaines + collines
region  = fbm(x·MTN_REGION_FREQ, z·MTN_REGION_FREQ)     // grandes zones
mask    = smoothstep(MTN_REGION_LO, MTN_REGION_HI, region)   // 0 hors montagnes
si mask > 0:
  ridge = ridged(x·MTN_FREQ, z·MTN_FREQ) ^ MTN_SHARPNESS   // crêtes acérées
  h    += mask · ridge · MTN_AMP                        // pics de montagne
heightMap[x,z] = clamp(round(h), 4, WORLD_Y - 5)
```

- **Collines** : `fbm` lisse → reliefs **arrondis**, amplitude modérée.
- **Montagnes** : n'apparaissent que là où `mask > 0` ; le bruit **ridged**
  élevé à une puissance donne des sommets **pointus**.

### 8.2 Remplissage d'une colonne

```
h = heightMap[x,z]
rocky = (h >= STONE_LINE) ou steep(x,z)     // sommets élevés ou pentes raides
surface = rocky ? STONE : GRASS             // pierre apparente en montagne
sub     = rocky ? STONE : DIRT
pour y de 0 à h:
  si y == h                 -> surface
  sinon si y >= h-DIRT_LAYERS -> sub
  sinon                     -> STONE
(y > h reste AIR)
```

- `steep(x,z)` = vrai si l'écart de hauteur avec un voisin ≥ `STEEP_SLOPE`
  → les **flancs raides** montrent la pierre même sous `STONE_LINE`.
- Collines & plaines (basses, douces) restent donc **herbées** ; montagnes
  (hautes, raides) exposent la **pierre**.

### 8.3 Contrat

```ts
export class WorldGenerator {
  /** relief + arbres ; écrit dans le brut, ne marque aucune section dirty */
  generate(raw: Uint8Array): void;
}
```

> Après le relief, `generate` **sème des arbres en forêts** (tronc `WOOD` +
> feuillage `LEAVES`), posés sur la surface. Structure, densité par bruit et
> algorithme : [`10-trees.md`](./10-trees.md).

Constantes clés (`core/constants.ts`) : `TERRAIN_BASE`, `HILL_FREQ`, `HILL_AMP`,
`MTN_REGION_FREQ/LO/HI`, `MTN_FREQ`, `MTN_AMP`, `MTN_SHARPNESS`, `STONE_LINE`,
`STEEP_SLOPE`, `DIRT_LAYERS`.

## 9. Point de spawn

- **Position** : centre horizontal du monde → `x = 128.5, z = 128.5` (centre
  d'une colonne).
- **Hauteur** : posée sur la **surface réelle** (le relief varie). On lit le
  bloc solide le plus haut de la colonne via `World.columnTop(x, z)` et on place
  les pieds à `y = columnTop + 1`. Les yeux sont à `y + EYE_HEIGHT`.
- Le semis d'arbres **dégage une zone autour du spawn** ([`10`](./10-trees.md))
  pour ne pas y faire apparaître le joueur dans un tronc.
- **Orientation** : regard horizontal (pitch 0), yaw arbitraire.

## 10. Contrat complet `World`

```ts
export class World {
  constructor(gen: WorldGenerator);        // alloue le Uint8Array + generate()

  getBlock(x: number, y: number, z: number): BlockId;   // OOB -> AIR
  setBlock(x: number, y: number, z: number, id: BlockId): void; // OOB -> no-op
  isSolid(x: number, y: number, z: number): boolean;
  inBounds(x: number, y: number, z: number): boolean;

  takeDirtySections(): { sx: number; sz: number }[];
  columnTop(x: number, z: number): number;   // y du solide le plus haut (spawn)

  readonly sizeX: number; readonly sizeY: number; readonly sizeZ: number;
}
```

## 11. Questions ouvertes

- **Amplitudes du relief** : `TERRAIN_BASE=18`, `HILL_AMP=10`, `MTN_AMP=34`,
  `STONE_LINE=38` donnent des hauteurs ≈ 19→57 (plafond 64) avec ~11% de surface
  rocheuse. À régler au ressenti.
- **Coût du meshing initial** : le relief expose bien plus de faces que le
  superflat → `buildAll()` un peu plus long au démarrage (acceptable ; Web
  Workers = post-MVP).
- **Bords visibles** : on rend la falaise de bord (choix §5). Alternative :
  cacher ces faces pour un « bord propre » — non retenu (moins lisible).
