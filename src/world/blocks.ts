// Registre central des blocs. Cf. specs/03.
// Les IDs sont stables : on ajoute à la fin, on ne réordonne jamais.

export enum BlockId {
  AIR = 0,
  GRASS = 1,
  DIRT = 2,
  STONE = 3,
  SAND = 4,
  WOOD = 5,
  LEAVES = 6,
}

export interface BlockDef {
  id: BlockId;
  name: string;
  color: number; // 0xRRGGBB — faces latérales + dessous
  colorTop?: number; // override de la face du dessus
  solid: boolean; // collision + occlusion des faces voisines
  placeable: boolean; // apparaît dans la hotbar & posable
}

// Tableau indexé par BlockId (accès O(1)).
export const BLOCKS: readonly BlockDef[] = [
  { id: BlockId.AIR, name: "Air", color: 0x000000, solid: false, placeable: false },
  { id: BlockId.GRASS, name: "Herbe", color: 0x7a5230, colorTop: 0x5fae3a, solid: true, placeable: true },
  { id: BlockId.DIRT, name: "Terre", color: 0x7a5230, solid: true, placeable: true },
  { id: BlockId.STONE, name: "Pierre", color: 0x8a8a8a, solid: true, placeable: true },
  { id: BlockId.SAND, name: "Sable", color: 0xdcd29a, solid: true, placeable: true },
  { id: BlockId.WOOD, name: "Bois", color: 0x9c6b3f, solid: true, placeable: true },
  { id: BlockId.LEAVES, name: "Feuille", color: 0x3f7a28, solid: true, placeable: true },
];

export function getBlockDef(id: BlockId): BlockDef {
  return BLOCKS[id];
}

export function isSolidId(id: BlockId): boolean {
  return BLOCKS[id].solid;
}

// Hotbar par défaut : 5 blocs posables + 4 slots vides. Cf. specs/03 §7.
export const DEFAULT_HOTBAR: BlockId[] = [
  BlockId.GRASS,
  BlockId.DIRT,
  BlockId.STONE,
  BlockId.SAND,
  BlockId.WOOD,
  BlockId.LEAVES,
  BlockId.AIR,
  BlockId.AIR,
  BlockId.AIR,
];
