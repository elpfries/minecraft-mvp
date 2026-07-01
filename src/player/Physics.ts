// Gravité + intégration + résolution des collisions AABB, axe par axe.
// Cf. specs/06.

import {
  EPS,
  GRAVITY,
  MAX_FALL,
  PLAYER_HEIGHT,
  PLAYER_WIDTH,
  WORLD_X,
  WORLD_Z,
} from "../core/constants";
import { World } from "../world/World";
import { Player } from "./Player";

const HALF = PLAYER_WIDTH / 2;

type Axis = "x" | "y" | "z";

export class Physics {
  step(dt: number, world: World, player: Player): void {
    // 1. Gravité (plafonnée à la vitesse terminale)
    player.velocity.y = Math.max(player.velocity.y + GRAVITY * dt, MAX_FALL);

    // 2. Intégration + collision, un axe à la fois (X, Z, Y)
    this.moveAxis(world, player, "x", player.velocity.x * dt);
    this.moveAxis(world, player, "z", player.velocity.z * dt);
    player.onGround = false;
    this.moveAxis(world, player, "y", player.velocity.y * dt);

    // 3. Mur invisible aux bords du monde
    const p = player.position;
    if (p.x < HALF) {
      p.x = HALF;
      player.velocity.x = 0;
    } else if (p.x > WORLD_X - HALF) {
      p.x = WORLD_X - HALF;
      player.velocity.x = 0;
    }
    if (p.z < HALF) {
      p.z = HALF;
      player.velocity.z = 0;
    } else if (p.z > WORLD_Z - HALF) {
      p.z = WORLD_Z - HALF;
      player.velocity.z = 0;
    }
  }

  private moveAxis(world: World, player: Player, axis: Axis, delta: number): void {
    if (delta === 0) return;
    const p = player.position;
    p[axis] += delta;

    // Plage de cellules chevauchées par l'AABB
    const x0 = Math.floor(p.x - HALF);
    const x1 = Math.floor(p.x + HALF - EPS);
    const y0 = Math.floor(p.y);
    const y1 = Math.floor(p.y + PLAYER_HEIGHT - EPS);
    const z0 = Math.floor(p.z - HALF);
    const z1 = Math.floor(p.z + HALF - EPS);

    for (let bx = x0; bx <= x1; bx++) {
      for (let by = y0; by <= y1; by++) {
        for (let bz = z0; bz <= z1; bz++) {
          if (!world.isSolid(bx, by, bz)) continue;

          if (axis === "x") {
            p.x = delta > 0 ? bx - HALF - EPS : bx + 1 + HALF + EPS;
            player.velocity.x = 0;
          } else if (axis === "z") {
            p.z = delta > 0 ? bz - HALF - EPS : bz + 1 + HALF + EPS;
            player.velocity.z = 0;
          } else {
            if (delta > 0) {
              p.y = by - PLAYER_HEIGHT - EPS; // choc plafond
            } else {
              p.y = by + 1 + EPS; // posé au sol
              player.onGround = true;
            }
            player.velocity.y = 0;
          }
          return; // collision résolue sur cet axe
        }
      }
    }
  }
}
