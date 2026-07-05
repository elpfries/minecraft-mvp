// Construit la géométrie des faces visibles d'une section (face culling).
// Émet position + normale + UV vers l'atlas de textures. Cf. specs/04 §5.
// Lit le World (pas une section isolée) -> frontières correctes.

import * as THREE from "three";
import { SECTION, WORLD_Y } from "../core/constants";
import { BlockId, getBlockDef } from "../world/blocks";
import { ATLAS_COLS, TILE_SIZE } from "../world/textures";
import { World } from "../world/World";

type FaceKind = "top" | "bottom" | "side";

interface Face {
  dir: [number, number, number]; // offset voisin = normale
  corners: [number, number, number][]; // 4 coins CCW vus de l'extérieur
  uv: [number, number][]; // UV locaux [0,1] alignés sur `corners` (v=haut de la tuile)
  kind: FaceKind;
}

// Coins ordonnés pour normale sortante ; UV locaux tels que v suit +Y (côtés)
// -> les textures orientées (herbe, bois) restent à l'endroit.
const FACES: Face[] = [
  { dir: [1, 0, 0], kind: "side", corners: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], uv: [[1, 0], [0, 0], [0, 1], [1, 1]] }, // +X
  { dir: [-1, 0, 0], kind: "side", corners: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], uv: [[0, 0], [1, 0], [1, 1], [0, 1]] }, // -X
  { dir: [0, 1, 0], kind: "top", corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], uv: [[0, 1], [1, 1], [1, 0], [0, 0]] }, // +Y
  { dir: [0, -1, 0], kind: "bottom", corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], uv: [[0, 0], [1, 0], [1, 1], [0, 1]] }, // -Y
  { dir: [0, 0, 1], kind: "side", corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], uv: [[0, 0], [1, 0], [1, 1], [0, 1]] }, // +Z
  { dir: [0, 0, -1], kind: "side", corners: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], uv: [[1, 0], [0, 0], [0, 1], [1, 1]] }, // -Z
];

// UV atlas avec demi-texel de marge (anti-bleeding).
const INSET_U = 0.5 / (ATLAS_COLS * TILE_SIZE);
const INSET_V = 0.5 / TILE_SIZE;

function atlasU(tile: number, lu: number): number {
  const u0 = tile / ATLAS_COLS;
  const u1 = (tile + 1) / ATLAS_COLS;
  return u0 + INSET_U + lu * (u1 - u0 - 2 * INSET_U);
}

function atlasV(lv: number): number {
  return INSET_V + lv * (1 - 2 * INSET_V);
}

export class Mesher {
  buildSection(world: World, sx: number, sz: number): THREE.BufferGeometry {
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    let vert = 0;

    const x0 = sx * SECTION;
    const z0 = sz * SECTION;

    for (let x = x0; x < x0 + SECTION; x++) {
      for (let z = z0; z < z0 + SECTION; z++) {
        for (let y = 0; y < WORLD_Y; y++) {
          const id = world.getBlock(x, y, z);
          if (id === BlockId.AIR) continue;
          const tex = getBlockDef(id).tex;
          if (!tex) continue;

          for (const face of FACES) {
            const [dx, dy, dz] = face.dir;
            if (world.isSolid(x + dx, y + dy, z + dz)) continue; // face cachée

            const tile = face.kind === "top" ? tex.top : face.kind === "bottom" ? tex.bottom : tex.side;

            for (let k = 0; k < 4; k++) {
              const [cx, cy, cz] = face.corners[k];
              positions.push(x + cx, y + cy, z + cz);
              normals.push(dx, dy, dz);
              const [lu, lv] = face.uv[k];
              uvs.push(atlasU(tile, lu), atlasV(lv));
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
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices); // three.js choisit Uint16/Uint32 selon la valeur max
    geo.computeBoundingSphere(); // active le frustum culling par section
    return geo;
  }
}
