// Tests du raycast voxel (DDA d'Amanatides & Woo). Cf. specs/11-tests.md §4 (cible 4).

import { describe, it, expect } from "vitest";
import { VoxelRaycaster } from "@/interaction/VoxelRaycaster";
import type { World } from "@/world/World";
import type { Vec3 } from "@/core/math";

// Monde factice : solide uniquement aux positions listées (aucun three.js requis).
function fakeWorld(solids: Vec3[]): World {
  const keys = new Set(solids.map((s) => `${s.x},${s.y},${s.z}`));
  return {
    isSolid: (x: number, y: number, z: number) => keys.has(`${x},${y},${z}`),
  } as unknown as World;
}

describe("VoxelRaycaster — cast", () => {
  const caster = new VoxelRaycaster();

  it("touche le premier bloc solide le long de +X, face tournée vers l'origine", () => {
    const world = fakeWorld([{ x: 5, y: 0, z: 0 }]);
    const hit = caster.cast({ x: 0.5, y: 0.5, z: 0.5 }, { x: 1, y: 0, z: 0 }, 10, world);
    expect(hit).not.toBeNull();
    expect(hit!.block).toEqual({ x: 5, y: 0, z: 0 });
    expect(hit!.normal).toEqual({ x: -1, y: 0, z: 0 });
    expect(hit!.adjacent).toEqual({ x: 4, y: 0, z: 0 }); // block + normal
  });

  it("touche la face du dessus en visant vers le bas", () => {
    const world = fakeWorld([{ x: 0, y: 0, z: 0 }]);
    const hit = caster.cast({ x: 0.5, y: 5.5, z: 0.5 }, { x: 0, y: -1, z: 0 }, 10, world);
    expect(hit!.block).toEqual({ x: 0, y: 0, z: 0 });
    expect(hit!.normal).toEqual({ x: 0, y: 1, z: 0 });
    expect(hit!.adjacent).toEqual({ x: 0, y: 1, z: 0 });
  });

  it("renvoie null quand aucun bloc n'est atteint dans la portée", () => {
    const world = fakeWorld([{ x: 5, y: 0, z: 0 }]);
    expect(caster.cast({ x: 0.5, y: 0.5, z: 0.5 }, { x: 1, y: 0, z: 0 }, 3, world)).toBeNull();
  });

  it("détecte un bloc solide contenant déjà l'origine du rayon", () => {
    const world = fakeWorld([{ x: 0, y: 0, z: 0 }]);
    const hit = caster.cast({ x: 0.5, y: 0.5, z: 0.5 }, { x: 1, y: 0, z: 0 }, 10, world);
    expect(hit!.block).toEqual({ x: 0, y: 0, z: 0 });
    expect(hit!.normal).toEqual({ x: 0, y: 0, z: 0 }); // aucune face traversée
  });
});
