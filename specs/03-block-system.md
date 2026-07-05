# 03 — Système de blocs

> Le **registre** des types de blocs : identifiants, couleurs, propriétés
> (solidité, posabilité). Sert de référence à la physique, au rendu, à
> l'interaction et à la hotbar.

## 1. Objectif

Définir un **catalogue central et immuable** des blocs. Chaque bloc est identifié
par un `BlockId` numérique ; toutes ses propriétés se lisent dans un registre
unique. Aucun autre système ne code « en dur » une couleur ou une solidité.

## 2. Périmètre

- ✅ Enum `BlockId` + registre `BlockDef`.
- ✅ Couleurs unies (base + override de face supérieure).
- ✅ Propriétés `solid` / `placeable`.
- ✅ Contenu par défaut de la hotbar.
- ✅ **Textures** (atlas 16×16, tuiles par face) — cf. [`04`](./04-rendering.md) §4.
- ❌ Blocs à comportement (fluides, redstone, orientation, états) — hors MVP.
- ❌ Transparence / semi-transparence (tous les blocs solides sont opaques).

## 3. Identifiants (`BlockId`)

`AIR = 0` est spécial (vide, jamais rendu, non solide). Les autres suivent.

```ts
export enum BlockId {
  AIR = 0,
  GRASS = 1,
  DIRT = 2,
  STONE = 3,
  SAND = 4,
  WOOD = 5,
  LEAVES = 6,
}
```

> Les valeurs sont **stables** (elles finiront un jour en sauvegarde). On
> **ajoute** de nouveaux IDs à la fin, on ne réordonne jamais.

## 4. Modèle de définition

```ts
export interface BlockTex { top: number; bottom: number; side: number; } // index de tuile d'atlas

export interface BlockDef {
  id: BlockId;
  name: string;         // libellé affiché (hotbar, debug)
  color: number;        // 0xRRGGBB — pastille de hotbar (PAS le rendu 3D)
  colorTop?: number;    // couleur de pastille pour la face du dessus
  tex?: BlockTex;       // tuiles de texture par face (absent pour AIR)
  solid: boolean;       // collision physique + occlusion des faces voisines
  placeable: boolean;   // apparaît dans la hotbar & posable par le joueur
}
```

- **Textures par face** : `tex` donne l'index de tuile d'atlas pour le **dessus**,
  le **dessous** et les **côtés** (ex. herbe : `grass_top` / `dirt` / `grass_side`,
  bois : `log_oak_top` / `log_oak_top` / `log_oak`). Les indices et l'atlas sont
  définis dans `world/textures.ts` et [`04-rendering.md`](./04-rendering.md) §4.
- **`color` / `colorTop`** ne servent plus qu'à la **pastille de hotbar**
  ([`08`](./08-hotbar-hud.md)), pas au rendu 3D.
- **Éclairage** : la texture est **modulée par la lumière réelle** de la scène
  (soleil + ambiante, cf. [`09-day-night.md`](./09-day-night.md)).

## 5. Registre des blocs (MVP)

| `BlockId` | name    | `color`    | `colorTop` | solid | placeable |
| --------- | ------- | ---------- | ---------- | ----- | --------- |
| `AIR`     | Air     | —          | —          | false | false     |
| `GRASS`   | Herbe   | `0x7A5230` | `0x5FAE3A` | true  | true      |
| `DIRT`    | Terre   | `0x7A5230` | —          | true  | true      |
| `STONE`   | Pierre  | `0x8A8A8A` | —          | true  | true      |
| `SAND`    | Sable   | `0xDCD29A` | —          | true  | true      |
| `WOOD`    | Bois    | `0x9C6B3F` | —          | true  | true      |
| `LEAVES`  | Feuille | `0x3F7A28` | —          | true  | true      |

> La colonne `color` ne sert qu'à la **pastille de hotbar**. Le rendu 3D utilise
> les **textures** (`tex`) : `GRASS` = `grass_top` (dessus) / `grass_side`
> (côtés, bande verte en haut) / `dirt` (dessous) ; `WOOD` = `log_oak_top`
> (dessus/dessous) / `log_oak` (côtés) ; les autres sont uniformes.
>
> **`LEAVES`** : bloc **opaque et solide** au MVP (texture `leaves_oak_opaque`).
> Le feuillage rend comme un bloc plein — équivalent des « feuilles rapides » de
> Minecraft. La **transparence** (feuillage ajouré) est post-MVP.
> Utilisé par le générateur d'arbres ([`10-trees.md`](./10-trees.md)).

Le registre est un **tableau indexé par `id`** (accès O(1)) :

```ts
export const BLOCKS: readonly BlockDef[] = [ /* index = BlockId */ ];

export function getBlock(id: BlockId): BlockDef;   // BLOCKS[id]
export function isSolidId(id: BlockId): boolean;   // getBlock(id).solid
```

## 6. Règles d'usage par les autres systèmes

- **Rendu** ([`04`](./04-rendering.md)) : ne maille jamais `AIR`. Pour un bloc
  solide, une face n'est émise que si le voisin dans cette direction **n'est pas
  solide** (`AIR` ou hors bornes). Couleur de la face = `colorTop` pour le dessus
  sinon `color`.
- **Physique** ([`06`](./06-physics-collision.md)) : une cellule bloque le joueur
  ssi `isSolidId(getBlock(...))`. `AIR` est traversable.
- **Interaction** ([`07`](./07-interaction.md)) :
  - **Casser** : autorisé sur tout bloc solide → remplace par `AIR`. Casser de
    l'`AIR` = no-op (rien de visé).
  - **Poser** : uniquement un bloc `placeable`, dans une cellule `AIR`, si elle
    n'intersecte pas l'AABB du joueur.
- **Hotbar** ([`08`](./08-hotbar-hud.md)) : ne propose que des blocs `placeable`.

## 7. Contenu par défaut de la hotbar

9 slots ; les 5 blocs `placeable` occupent les premiers, le reste est vide.
Un slot vide = `AIR` (poser depuis un slot vide = no-op).

```ts
export const DEFAULT_HOTBAR: BlockId[] = [
  BlockId.GRASS, BlockId.DIRT, BlockId.STONE, BlockId.SAND, BlockId.WOOD,
  BlockId.LEAVES, BlockId.AIR, BlockId.AIR,   BlockId.AIR,
];
```

## 8. Questions ouvertes

- **Pas de bloc indestructible** au MVP (pas de bedrock) : le joueur peut tout
  casser, y compris atteindre `y=0`. Acceptable (mur invisible + sol de pierre
  empêchent de « tomber »). À revoir si gênant.
- **`GRASS` posé** : garde son dessus vert quelle que soit l'orientation (pas de
  logique « l'herbe pousse/meurt »). Cohérent avec le mode créatif.
- **Palette** : couleurs à affiner une fois le rendu en place (contraste sous la
  lumière de nuit notamment).
