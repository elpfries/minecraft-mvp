// Traduit les entrées en intention de déplacement (écrit player.velocity).
// Ne déplace pas le joueur : c'est Physics.step qui intègre. Cf. specs/05 §7.

import { JUMP_SPEED, MOVE_SPEED } from "../core/constants";
import { Input } from "../input/Input";
import { FirstPersonCamera } from "./FirstPersonCamera";
import { Player } from "./Player";

export class PlayerController {
  // NB : le regard souris (cam.applyMouse) est appliqué UNE fois par frame par
  // Game, hors de la boucle à pas fixe — sinon il serait appliqué plusieurs fois
  // quand plusieurs sous-pas physiques tournent dans la même frame.
  update(_dt: number, input: Input, player: Player, cam: FirstPersonCamera): void {
    // Déplacement horizontal voulu, relatif au yaw
    const f = cam.forward();
    const r = cam.right();
    const ax = (input.isDown("KeyD") ? 1 : 0) - (input.isDown("KeyA") ? 1 : 0);
    const az = (input.isDown("KeyW") ? 1 : 0) - (input.isDown("KeyS") ? 1 : 0);

    let wx = r.x * ax + f.x * az;
    let wz = r.z * ax + f.z * az;
    const len = Math.hypot(wx, wz);
    if (len > 0) {
      wx /= len; // diagonale non plus rapide
      wz /= len;
    }
    player.velocity.x = wx * MOVE_SPEED;
    player.velocity.z = wz * MOVE_SPEED;

    // Saut
    if (input.isDown("Space") && player.onGround) {
      player.velocity.y = JUMP_SPEED;
      player.onGround = false;
    }
  }
}
