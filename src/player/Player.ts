// État du joueur. position = pieds (centre-bas de l'AABB). Cf. specs/05 §3.

import { Vec3 } from "../core/math";

export class Player {
  position: Vec3;
  velocity: Vec3 = { x: 0, y: 0, z: 0 };
  onGround = false;

  constructor(spawn: Vec3) {
    this.position = { x: spawn.x, y: spawn.y, z: spawn.z };
  }
}
