// Stockage dense des blocs + suivi des sections dirty. Seule source de vérité.
// Ne connaît pas three.js. Cf. specs/02.

import { SECTION, WORLD_X, WORLD_Y, WORLD_Z } from "../core/constants";
import { BlockId, isSolidId } from "./blocks";
import { inBounds, index, sectionKey, sectionOf } from "./coords";
import { WorldGenerator } from "./WorldGenerator";

export class World {
  readonly sizeX = WORLD_X;
  readonly sizeY = WORLD_Y;
  readonly sizeZ = WORLD_Z;

  private raw: Uint8Array;
  private dirty = new Set<string>();

  constructor(gen: WorldGenerator) {
    this.raw = new Uint8Array(WORLD_X * WORLD_Y * WORLD_Z);
    gen.generate(this.raw);
  }

  inBounds(x: number, y: number, z: number): boolean {
    return inBounds(x, y, z);
  }

  getBlock(x: number, y: number, z: number): BlockId {
    if (!inBounds(x, y, z)) return BlockId.AIR; // OOB -> AIR (falaise de bord rendue)
    return this.raw[index(x, y, z)] as BlockId;
  }

  isSolid(x: number, y: number, z: number): boolean {
    if (!inBounds(x, y, z)) return false; // OOB non solide pour le rendu/scan
    return isSolidId(this.raw[index(x, y, z)] as BlockId);
  }

  /** y du bloc solide le plus haut d'une colonne (-1 si vide). Sert au spawn. */
  columnTop(x: number, z: number): number {
    for (let y = WORLD_Y - 1; y >= 0; y--) {
      if (this.isSolid(x, y, z)) return y;
    }
    return -1;
  }

  setBlock(x: number, y: number, z: number, id: BlockId): void {
    if (!inBounds(x, y, z)) return; // OOB -> no-op
    const i = index(x, y, z);
    if (this.raw[i] === id) return; // pas de changement -> pas de dirty
    this.raw[i] = id;
    this.markDirty(x, z);
  }

  private markDirty(x: number, z: number): void {
    const { sx, sz } = sectionOf(x, z);
    this.dirty.add(sectionKey(sx, sz));
    // Voisins d'arête : une face frontalière dépend du bloc d'en face.
    const lx = x % SECTION;
    const lz = z % SECTION;
    if (lx === 0) this.dirty.add(sectionKey(sx - 1, sz));
    if (lx === SECTION - 1) this.dirty.add(sectionKey(sx + 1, sz));
    if (lz === 0) this.dirty.add(sectionKey(sx, sz - 1));
    if (lz === SECTION - 1) this.dirty.add(sectionKey(sx, sz + 1));
  }

  /** renvoie puis vide l'ensemble des sections modifiées */
  takeDirtySections(): { sx: number; sz: number }[] {
    const out: { sx: number; sz: number }[] = [];
    for (const key of this.dirty) {
      const [sx, sz] = key.split(",").map(Number);
      out.push({ sx, sz });
    }
    this.dirty.clear();
    return out;
  }
}
