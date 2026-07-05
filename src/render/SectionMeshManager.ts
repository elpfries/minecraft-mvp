// Gère un mesh par section : build initial + reconstruction incrémentale des
// sections dirty. Cf. specs/04 §6.

import * as THREE from "three";
import { SECTIONS_X, SECTIONS_Z } from "../core/constants";
import { sectionKey } from "../world/coords";
import { World } from "../world/World";
import { Mesher } from "./Mesher";

export class SectionMeshManager {
  private mesher = new Mesher();
  private meshes = new Map<string, THREE.Mesh>();

  constructor(
    private world: World,
    private scene: THREE.Scene,
    private material: THREE.Material,
  ) {}

  buildAll(): void {
    for (let sx = 0; sx < SECTIONS_X; sx++) {
      for (let sz = 0; sz < SECTIONS_Z; sz++) {
        const geo = this.mesher.buildSection(this.world, sx, sz);
        const mesh = new THREE.Mesh(geo, this.material);
        mesh.frustumCulled = true;
        this.scene.add(mesh);
        this.meshes.set(sectionKey(sx, sz), mesh);
      }
    }
  }

  /** reconstruit uniquement les sections modifiées cette frame */
  flush(): void {
    for (const { sx, sz } of this.world.takeDirtySections()) {
      const key = sectionKey(sx, sz);
      const mesh = this.meshes.get(key);
      if (!mesh) continue; // section hors monde (voisin d'arête au bord)
      const geo = this.mesher.buildSection(this.world, sx, sz);
      mesh.geometry.dispose(); // libère l'ancienne géométrie GPU
      mesh.geometry = geo;
    }
  }
}
