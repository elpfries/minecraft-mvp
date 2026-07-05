// Tests de la génération du monde : reproductibilité + bornes de hauteur.
// Cf. specs/11-tests.md §4 (cibles 2 et 3).

import { describe, it, expect } from "vitest";
import { WorldGenerator } from "@/world/WorldGenerator";
import { BlockId } from "@/world/blocks";
import { index } from "@/world/coords";
import { WORLD_X, WORLD_Y, WORLD_Z } from "@/core/constants";

function generate(): Uint8Array {
  const raw = new Uint8Array(WORLD_X * WORLD_Y * WORLD_Z);
  new WorldGenerator().generate(raw);
  return raw;
}

// Sommet de terrain (herbe/terre/pierre) d'une colonne, en ignorant les arbres
// (bois/feuilles) posés au-dessus. -1 si la colonne est vide.
function terrainTop(raw: Uint8Array, x: number, z: number): number {
  for (let y = WORLD_Y - 1; y >= 0; y--) {
    const b = raw[index(x, y, z)];
    if (b === BlockId.GRASS || b === BlockId.DIRT || b === BlockId.STONE) return y;
  }
  return -1;
}

describe("WorldGenerator — reproductibilité (graine fixe)", () => {
  it("produit exactement le même monde à deux générations", () => {
    const a = generate();
    const b = generate();
    expect(a.length).toBe(b.length);
    // Comparaison rapide octet par octet : `toEqual` sur 4 M d'octets est trop lent.
    // firstDiff = index du premier octet divergent, -1 si les mondes sont identiques.
    let firstDiff = -1;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        firstDiff = i;
        break;
      }
    }
    expect(firstDiff).toBe(-1);
  });
});

describe("WorldGenerator — bornes de hauteur", () => {
  const raw = generate();

  it("garde toute hauteur de terrain dans [4, WORLD_Y - 5]", () => {
    // Échantillon : une colonne toutes les 16 en X et Z (256 colonnes).
    for (let x = 0; x < WORLD_X; x += 16) {
      for (let z = 0; z < WORLD_Z; z += 16) {
        const top = terrainTop(raw, x, z);
        expect(top).toBeGreaterThanOrEqual(4);
        expect(top).toBeLessThanOrEqual(WORLD_Y - 5);
      }
    }
  });

  it("remplit chaque colonne jusqu'au sol (y=0 toujours solide)", () => {
    for (let x = 0; x < WORLD_X; x += 32) {
      for (let z = 0; z < WORLD_Z; z += 32) {
        expect(terrainTop(raw, x, z)).toBeGreaterThanOrEqual(0);
        expect(raw[index(x, 0, z)]).not.toBe(BlockId.AIR);
      }
    }
  });
});
