// Raycast voxel (traversée de grille d'Amanatides & Woo). Cf. specs/07 §5.

import { sign, Vec3 } from "../core/math";
import { World } from "../world/World";

export interface RayHit {
  block: Vec3; // bloc solide visé
  normal: Vec3; // normale de la face touchée (vers l'origine)
  adjacent: Vec3; // cellule vide côté face = block + normal
}

export class VoxelRaycaster {
  cast(origin: Vec3, dir: Vec3, maxDist: number, world: World): RayHit | null {
    let x = Math.floor(origin.x);
    let y = Math.floor(origin.y);
    let z = Math.floor(origin.z);

    const stepX = sign(dir.x);
    const stepY = sign(dir.y);
    const stepZ = sign(dir.z);

    const tDeltaX = dir.x !== 0 ? Math.abs(1 / dir.x) : Infinity;
    const tDeltaY = dir.y !== 0 ? Math.abs(1 / dir.y) : Infinity;
    const tDeltaZ = dir.z !== 0 ? Math.abs(1 / dir.z) : Infinity;

    let tMaxX =
      dir.x !== 0
        ? (stepX > 0 ? Math.floor(origin.x) + 1 - origin.x : origin.x - Math.floor(origin.x)) * tDeltaX
        : Infinity;
    let tMaxY =
      dir.y !== 0
        ? (stepY > 0 ? Math.floor(origin.y) + 1 - origin.y : origin.y - Math.floor(origin.y)) * tDeltaY
        : Infinity;
    let tMaxZ =
      dir.z !== 0
        ? (stepZ > 0 ? Math.floor(origin.z) + 1 - origin.z : origin.z - Math.floor(origin.z)) * tDeltaZ
        : Infinity;

    let nx = 0;
    let ny = 0;
    let nz = 0;
    let t = 0;

    while (t <= maxDist) {
      if (world.isSolid(x, y, z)) {
        return {
          block: { x, y, z },
          normal: { x: nx, y: ny, z: nz },
          adjacent: { x: x + nx, y: y + ny, z: z + nz },
        };
      }
      if (tMaxX <= tMaxY && tMaxX <= tMaxZ) {
        x += stepX;
        t = tMaxX;
        tMaxX += tDeltaX;
        nx = -stepX;
        ny = 0;
        nz = 0;
      } else if (tMaxY <= tMaxZ) {
        y += stepY;
        t = tMaxY;
        tMaxY += tDeltaY;
        nx = 0;
        ny = -stepY;
        nz = 0;
      } else {
        z += stepZ;
        t = tMaxZ;
        tMaxZ += tDeltaZ;
        nx = 0;
        ny = 0;
        nz = -stepZ;
      }
    }
    return null;
  }
}
