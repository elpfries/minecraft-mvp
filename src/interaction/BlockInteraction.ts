// Casser / poser des blocs via raycast. Cf. specs/07 §6-7.

import * as THREE from "three";
import { EYE_HEIGHT, PLACE_KEY, PLAYER_HEIGHT, PLAYER_WIDTH, REACH } from "../core/constants";
import { Vec3 } from "../core/math";
import { Input } from "../input/Input";
import { BlockId } from "../world/blocks";
import { World } from "../world/World";
import { Player } from "../player/Player";
import { Hotbar } from "../ui/Hotbar";
import { BlockHighlight } from "./BlockHighlight";
import { VoxelRaycaster } from "./VoxelRaycaster";

const HALF = PLAYER_WIDTH / 2;

export class BlockInteraction {
  private ray = new VoxelRaycaster();
  private _dir = new THREE.Vector3();

  update(
    input: Input,
    camera: THREE.Camera,
    player: Player,
    world: World,
    hotbar: Hotbar,
    highlight: BlockHighlight,
  ): void {
    const eye: Vec3 = {
      x: player.position.x,
      y: player.position.y + EYE_HEIGHT,
      z: player.position.z,
    };
    camera.getWorldDirection(this._dir);
    const dir: Vec3 = { x: this._dir.x, y: this._dir.y, z: this._dir.z };

    const hit = this.ray.cast(eye, dir, REACH, world);
    highlight.setTarget(hit ? hit.block : null);

    if (!input.isPointerLocked || !hit) return;

    // Casser (clic gauche)
    if (input.consumeClick(0)) {
      world.setBlock(hit.block.x, hit.block.y, hit.block.z, BlockId.AIR);
    }

    // Poser (clic droit OU touche E — la Magic Mouse n'a pas de bouton droit).
    // On consomme les deux entrées pour éviter un appui résiduel à la frame suivante.
    const placeByMouse = input.consumeClick(2);
    const placeByKey = input.consumeKey(PLACE_KEY);
    if (placeByMouse || placeByKey) {
      const id = hotbar.selected();
      if (id === BlockId.AIR) return;
      const c = hit.adjacent;
      if (!world.inBounds(c.x, c.y, c.z)) return;
      if (this.intersectsPlayer(c, player)) return;
      world.setBlock(c.x, c.y, c.z, id);
    }
  }

  private intersectsPlayer(c: Vec3, player: Player): boolean {
    const p = player.position;
    return (
      c.x < p.x + HALF &&
      c.x + 1 > p.x - HALF &&
      c.y < p.y + PLAYER_HEIGHT &&
      c.y + 1 > p.y &&
      c.z < p.z + HALF &&
      c.z + 1 > p.z - HALF
    );
  }
}
