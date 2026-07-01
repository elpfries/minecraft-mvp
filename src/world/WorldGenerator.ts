// Génération du monde : relief procédural (plaines / collines / montagnes) via
// bruit, puis semis d'arbres groupés en forêts. Écrit directement dans le
// tableau brut (aucune section dirty). Cf. specs/02 §8 et specs/10 §5.

import {
  DIRT_LAYERS,
  FOREST_FREQ,
  FOREST_FULL,
  FOREST_THRESHOLD,
  HILL_AMP,
  HILL_FREQ,
  HILL_OCTAVES,
  MTN_AMP,
  MTN_FREQ,
  MTN_REGION_FREQ,
  MTN_REGION_HI,
  MTN_REGION_LO,
  MTN_SHARPNESS,
  STEEP_SLOPE,
  STONE_LINE,
  TERRAIN_BASE,
  TREE_ATTEMPTS,
  TREE_MAX_HEIGHT,
  TREE_MIN_HEIGHT,
  TREE_SPACING,
  WORLD_SEED,
  WORLD_X,
  WORLD_Y,
  WORLD_Z,
} from "../core/constants";
import { clamp, smoothstep } from "../core/math";
import { fbm2, ridged2 } from "../core/noise";
import { mulberry32 } from "../core/rng";
import { BlockId } from "./blocks";
import { index } from "./coords";
import { TreeGenerator } from "./TreeGenerator";

export class WorldGenerator {
  private trees = new TreeGenerator();
  private heightMap = new Int16Array(WORLD_X * WORLD_Z);

  generate(raw: Uint8Array): void {
    this.buildHeightMap();
    this.fillColumns(raw);
    this.scatterTrees(raw);
  }

  // --- 1. Carte des hauteurs ---
  private buildHeightMap(): void {
    for (let x = 0; x < WORLD_X; x++) {
      for (let z = 0; z < WORLD_Z; z++) {
        // Collines : bruit doux, arrondi.
        const hills = fbm2(x * HILL_FREQ, z * HILL_FREQ, WORLD_SEED, HILL_OCTAVES);
        let h = TERRAIN_BASE + hills * HILL_AMP;

        // Montagnes : uniquement dans certaines régions, crêtes acérées.
        const region = fbm2(x * MTN_REGION_FREQ, z * MTN_REGION_FREQ, WORLD_SEED + 7, 2);
        const mask = smoothstep(MTN_REGION_LO, MTN_REGION_HI, region);
        if (mask > 0) {
          const ridge = Math.pow(ridged2(x * MTN_FREQ, z * MTN_FREQ, WORLD_SEED + 19, 4), MTN_SHARPNESS);
          h += mask * ridge * MTN_AMP;
        }

        this.heightMap[x + WORLD_X * z] = clamp(Math.round(h), 4, WORLD_Y - 5);
      }
    }
  }

  // --- 2. Remplissage des colonnes ---
  private fillColumns(raw: Uint8Array): void {
    for (let x = 0; x < WORLD_X; x++) {
      for (let z = 0; z < WORLD_Z; z++) {
        const h = this.heightMap[x + WORLD_X * z];
        // Pierre apparente : sommets élevés ou pentes raides.
        const rocky = h >= STONE_LINE || this.steep(x, z);
        const surface = rocky ? BlockId.STONE : BlockId.GRASS;
        const sub = rocky ? BlockId.STONE : BlockId.DIRT;

        for (let y = 0; y <= h; y++) {
          let id: BlockId;
          if (y === h) id = surface;
          else if (y >= h - DIRT_LAYERS) id = sub;
          else id = BlockId.STONE;
          raw[index(x, y, z)] = id;
        }
      }
    }
  }

  private steep(x: number, z: number): boolean {
    const h = this.heightMap[x + WORLD_X * z];
    let maxDelta = 0;
    if (x > 0) maxDelta = Math.max(maxDelta, Math.abs(h - this.heightMap[x - 1 + WORLD_X * z]));
    if (x < WORLD_X - 1) maxDelta = Math.max(maxDelta, Math.abs(h - this.heightMap[x + 1 + WORLD_X * z]));
    if (z > 0) maxDelta = Math.max(maxDelta, Math.abs(h - this.heightMap[x + WORLD_X * (z - 1)]));
    if (z < WORLD_Z - 1) maxDelta = Math.max(maxDelta, Math.abs(h - this.heightMap[x + WORLD_X * (z + 1)]));
    return maxDelta >= STEEP_SLOPE;
  }

  // --- 3. Semis d'arbres groupés en forêts ---
  private scatterTrees(raw: Uint8Array): void {
    const rng = mulberry32(WORLD_SEED + 101);
    const mask = new Uint8Array(WORLD_X * WORLD_Z); // zones d'exclusion (espacement)

    // Dégage le spawn (centre du monde) pour ne pas coincer le joueur.
    this.markDisk(mask, Math.floor(WORLD_X / 2), Math.floor(WORLD_Z / 2), 4);

    for (let a = 0; a < TREE_ATTEMPTS; a++) {
      const x = 2 + Math.floor(rng() * (WORLD_X - 4)); // marge = rayon de couronne
      const z = 2 + Math.floor(rng() * (WORLD_Z - 4));
      if (mask[x + WORLD_X * z]) continue;

      const h = this.heightMap[x + WORLD_X * z];
      // Arbres uniquement sur l'herbe -> pas sur la pierre/montagne.
      if (raw[index(x, h, z)] !== BlockId.GRASS) continue;

      // Densité pilotée par un bruit de forêt : 0 en plaine, max en forêt.
      const forest = fbm2(x * FOREST_FREQ, z * FOREST_FREQ, WORLD_SEED + 53, 3);
      const p = smoothstep(FOREST_THRESHOLD, FOREST_FULL, forest);
      if (rng() > p) continue;

      const height = TREE_MIN_HEIGHT + Math.floor(rng() * (TREE_MAX_HEIGHT - TREE_MIN_HEIGHT + 1));
      this.trees.generate(raw, x, h + 1, z, height);
      this.markDisk(mask, x, z, TREE_SPACING);
    }
  }

  private markDisk(mask: Uint8Array, cx: number, cz: number, r: number): void {
    const r2 = r * r;
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (dx * dx + dz * dz > r2) continue;
        const x = cx + dx;
        const z = cz + dz;
        if (x < 0 || x >= WORLD_X || z < 0 || z >= WORLD_Z) continue;
        mask[x + WORLD_X * z] = 1;
      }
    }
  }
}
