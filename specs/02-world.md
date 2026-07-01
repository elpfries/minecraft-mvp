# 02 — Monde & structure de données

> Comment les blocs sont **stockés**, **lus/écrits**, comment les **sections
> dirty** sont signalées, et comment le monde **superflat** est généré au
> démarrage. Le registre des blocs (couleurs, propriétés) est dans
> [`03-block-system.md`](./03-block-system.md).

## 1. Objectif

Fournir une structure de données de blocs **compacte, rapide en lecture/écriture
aléatoire**, seule source de vérité du jeu, avec un mécanisme de notification
pour que le rendu sache quoi re-mailler.

## 2. Périmètre

- ✅ Stockage dense d'un monde fini **256 × 256 × 64**.
- ✅ `getBlock` / `setBlock`, tests de bornes et de solidité.
- ✅ Suivi des **sections dirty** (granularité de re-meshing 16×16).
- ✅ Génération **superflat** déterministe.
- ✅ Sémantique des **bords du monde** (mur invisible).
- ❌ Génération procédurale, biomes, relief (hors MVP).
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

## 8. Génération superflat

Déterministe, sans bruit. Couches du bas (`y=0`) vers le haut, avec la surface
d'herbe au **milieu** du monde pour laisser de la marge en creusant **et** en
construisant.

| Plage `y`      | Bloc     |
| -------------- | -------- |
| `33 … 63`      | `AIR`    |
| `32`           | `GRASS`  |
| `29 … 31`      | `DIRT` (3 couches) |
| `0 … 28`       | `STONE`  |

Constantes :

```ts
export const GROUND_HEIGHT = 32;   // y de la couche d'herbe
export const DIRT_LAYERS = 3;      // couches de terre sous l'herbe
```

Algorithme (`WorldGenerator`) :

```
pour chaque (x, z) dans le monde:
  pour y de 0 à GROUND_HEIGHT:
    si y == GROUND_HEIGHT            -> GRASS
    sinon si y >= GROUND_HEIGHT-DIRT_LAYERS -> DIRT
    sinon                            -> STONE
  (y > GROUND_HEIGHT reste AIR = 0, valeur par défaut du Uint8Array)
```

```ts
export class WorldGenerator {
  /** remplit le tableau brut ; ne marque aucune section dirty */
  generate(raw: Uint8Array): void;
}
```

## 9. Point de spawn

- **Position** : centre horizontal du monde → `x = 128.5, z = 128.5` (centre
  d'une colonne).
- **Hauteur** : pieds du joueur juste au-dessus de l'herbe →
  `y = GROUND_HEIGHT + 1 = 33` (le bloc `y=32` est plein, le joueur se tient
  dessus). Les yeux sont à `y + EYE_HEIGHT`.
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

  readonly sizeX: number; readonly sizeY: number; readonly sizeZ: number;
}
```

## 11. Questions ouvertes

- **Hauteur de sol** `GROUND_HEIGHT = 32` : symétrique (32 blocs pour creuser,
  31 pour construire). Baisser (p. ex. 8) réduirait la masse solide mais aussi
  la profondeur de minage. Retenu : 32 (la masse solide ne coûte rien grâce au
  face culling).
- **Bords visibles** : on rend la falaise de bord (choix §5). Alternative :
  cacher ces faces pour un « bord propre » — non retenu (moins lisible).
