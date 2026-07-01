// Construit la géométrie des faces visibles d'une section (face culling).
// Cf. specs/04 §5. Lit le World (pas une section isolée) -> frontières correctes.

import * as THREE from "three";
import { SECTION, WORLD_Y } from "../core/constants";
import { BlockId, getBlockDef } from "../world/blocks";
import { World } from "../world/World";

interface Face {
  dir: [number, number, number]; // offset voisin = normale
  corners: [number, number, number][]; // 4 coins CCW vus de l'extérieur
  top?: boolean; // face du dessus (+Y) -> utilise colorTop
}

// Coins ordonnés pour que (0,1,2)+(0,2,3) aient la normale sortante attendue.
const FACES: Face[] = [
  { dir: [1, 0, 0], corners: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] }, // +X
  { dir: [-1, 0, 0], corners: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] }, // -X
  { dir: [0, 1, 0], corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], top: true }, // +Y
  { dir: [0, -1, 0], corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] }, // -Y
  { dir: [0, 0, 1], corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] }, // +Z
  { dir: [0, 0, -1], corners: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] }, // -Z
];

const _color = new THREE.Color();

export class Mesher {
  buildSection(world: World, sx: number, sz: number): THREE.BufferGeometry {
    const positions: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    let vert = 0;

    const x0 = sx * SECTION;
    const z0 = sz * SECTION;

    for (let x = x0; x < x0 + SECTION; x++) {
      for (let z = z0; z < z0 + SECTION; z++) {
        for (let y = 0; y < WORLD_Y; y++) {
          const id = world.getBlock(x, y, z);
          if (id === BlockId.AIR) continue;
          const def = getBlockDef(id);

          for (const face of FACES) {
            const [dx, dy, dz] = face.dir;
            if (world.isSolid(x + dx, y + dy, z + dz)) continue; // face cachée

            const hex = face.top && def.colorTop !== undefined ? def.colorTop : def.color;
            // conversion sRGB -> espace de travail linéaire (color management on)
            _color.setHex(hex, THREE.SRGBColorSpace);

            for (const [cx, cy, cz] of face.corners) {
              positions.push(x + cx, y + cy, z + cz);
              normals.push(dx, dy, dz);
              colors.push(_color.r, _color.g, _color.b);
            }
            indices.push(vert, vert + 1, vert + 2, vert, vert + 2, vert + 3);
            vert += 4;
          }
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices); // three.js choisit Uint16/Uint32 selon la valeur max
    geo.computeBoundingSphere(); // active le frustum culling par section
    return geo;
  }
}
