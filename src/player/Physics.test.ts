// Tests de la physique : chute, pose au sol (AABB) et mur invisible aux bords.
// Cf. specs/11-tests.md §4 (cible 5).

import { describe, it, expect } from "vitest";
import { Physics } from "@/player/Physics";
import { Player } from "@/player/Player";
import { World } from "@/world/World";
import type { WorldGenerator } from "@/world/WorldGenerator";
import { BlockId } from "@/world/blocks";
import { EPS, FIXED_DT, PLAYER_WIDTH, WORLD_X } from "@/core/constants";

const HALF = PLAYER_WIDTH / 2;

// Monde vide (générateur factice) dans lequel on place nos propres blocs.
function emptyWorld(): World {
  return new World({ generate() {} } as unknown as WorldGenerator);
}

describe("Physics — chute et pose au sol", () => {
  it("fait tomber le joueur puis le pose sur le dessus du bloc", () => {
    const world = emptyWorld();
    world.setBlock(5, 0, 5, BlockId.STONE); // sol : cube y ∈ [0,1[, dessus à y=1
    const player = new Player({ x: 5.5, y: 3, z: 5.5 }); // AABB centrée sur la cellule (5,5)
    const physics = new Physics();

    for (let i = 0; i < 240; i++) physics.step(FIXED_DT, world, player);

    expect(player.onGround).toBe(true);
    expect(player.velocity.y).toBe(0);
    expect(player.position.y).toBeCloseTo(1 + EPS, 6); // pieds posés sur le dessus
  });

  it("ne traverse jamais le sol (reste au-dessus du bloc)", () => {
    const world = emptyWorld();
    world.setBlock(5, 0, 5, BlockId.STONE);
    const player = new Player({ x: 5.5, y: 10, z: 5.5 });
    const physics = new Physics();
    for (let i = 0; i < 600; i++) physics.step(FIXED_DT, world, player);
    expect(player.position.y).toBeGreaterThanOrEqual(1);
  });
});

describe("Physics — mur invisible aux bords du monde", () => {
  it("borne le joueur au bord bas et annule sa vitesse horizontale", () => {
    const world = emptyWorld();
    const player = new Player({ x: 0.05, y: 5, z: 5.5 });
    new Physics().step(FIXED_DT, world, player);
    expect(player.position.x).toBe(HALF);
    expect(player.velocity.x).toBe(0);
  });

  it("borne le joueur au bord haut du monde", () => {
    const world = emptyWorld();
    const player = new Player({ x: WORLD_X - 0.05, y: 5, z: 5.5 });
    new Physics().step(FIXED_DT, world, player);
    expect(player.position.x).toBe(WORLD_X - HALF);
    expect(player.velocity.x).toBe(0);
  });
});
