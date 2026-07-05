// Tests des données du monde : pose / casse + suivi des sections dirty.
// Cf. specs/11-tests.md §4 (cible 6).

import { describe, it, expect } from "vitest";
import { World } from "@/world/World";
import type { WorldGenerator } from "@/world/WorldGenerator";
import { BlockId } from "@/world/blocks";

// Monde vide (générateur factice) : évite de générer tout le relief.
function emptyWorld(): World {
  return new World({ generate() {} } as unknown as WorldGenerator);
}

describe("World — pose et casse de bloc", () => {
  it("un monde vide ne contient que de l'air", () => {
    const world = emptyWorld();
    expect(world.getBlock(5, 5, 5)).toBe(BlockId.AIR);
    expect(world.isSolid(5, 5, 5)).toBe(false);
  });

  it("après une pose, le voxel contient le bon type et devient solide", () => {
    const world = emptyWorld();
    world.setBlock(5, 5, 5, BlockId.STONE);
    expect(world.getBlock(5, 5, 5)).toBe(BlockId.STONE);
    expect(world.isSolid(5, 5, 5)).toBe(true);
  });

  it("après une casse (pose d'AIR), le voxel redevient vide", () => {
    const world = emptyWorld();
    world.setBlock(5, 5, 5, BlockId.STONE);
    world.setBlock(5, 5, 5, BlockId.AIR);
    expect(world.getBlock(5, 5, 5)).toBe(BlockId.AIR);
    expect(world.isSolid(5, 5, 5)).toBe(false);
  });

  it("ignore les poses hors bornes (getBlock hors monde = AIR)", () => {
    const world = emptyWorld();
    world.setBlock(-1, 0, 0, BlockId.STONE);
    expect(world.getBlock(-1, 0, 0)).toBe(BlockId.AIR);
  });

  it("columnTop renvoie le y du bloc solide le plus haut", () => {
    const world = emptyWorld();
    world.setBlock(8, 3, 8, BlockId.STONE);
    world.setBlock(8, 7, 8, BlockId.DIRT);
    expect(world.columnTop(8, 8)).toBe(7);
  });
});

describe("World — suivi des sections modifiées (dirty)", () => {
  it("marque la section du bloc posé", () => {
    const world = emptyWorld();
    world.takeDirtySections(); // repart d'un état propre
    world.setBlock(20, 5, 20, BlockId.DIRT); // section (1,1)
    expect(world.takeDirtySections()).toContainEqual({ sx: 1, sz: 1 });
  });

  it("vide la liste après lecture", () => {
    const world = emptyWorld();
    world.setBlock(20, 5, 20, BlockId.DIRT);
    world.takeDirtySections();
    expect(world.takeDirtySections()).toEqual([]);
  });

  it("ne marque rien si la pose ne change pas le bloc", () => {
    const world = emptyWorld();
    world.takeDirtySections();
    world.setBlock(5, 5, 5, BlockId.AIR); // déjà AIR → aucun changement
    expect(world.takeDirtySections()).toEqual([]);
  });
});
