// Contour du bloc visé. Cf. specs/04 §8.

import * as THREE from "three";
import { Vec3 } from "../core/math";

export class BlockHighlight {
  readonly object: THREE.LineSegments;

  constructor() {
    const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
    const mat = new THREE.LineBasicMaterial({ color: 0x000000 });
    this.object = new THREE.LineSegments(geo, mat);
    this.object.scale.setScalar(1.002); // évite le z-fighting
    this.object.visible = false;
  }

  setTarget(block: Vec3 | null): void {
    if (!block) {
      this.object.visible = false;
      return;
    }
    this.object.visible = true;
    this.object.position.set(block.x + 0.5, block.y + 0.5, block.z + 0.5);
  }
}
