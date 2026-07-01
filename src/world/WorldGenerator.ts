// Génération superflat déterministe. Écrit directement dans le tableau brut
// (aucune section marquée dirty). Cf. specs/02 §8.

import { DIRT_LAYERS, GROUND_HEIGHT, WORLD_X, WORLD_Z } from "../core/constants";
import { BlockId } from "./blocks";
import { index } from "./coords";

export class WorldGenerator {
  generate(raw: Uint8Array): void {
    const dirtBottom = GROUND_HEIGHT - DIRT_LAYERS;
    for (let x = 0; x < WORLD_X; x++) {
      for (let z = 0; z < WORLD_Z; z++) {
        for (let y = 0; y <= GROUND_HEIGHT; y++) {
          let id: BlockId;
          if (y === GROUND_HEIGHT) id = BlockId.GRASS;
          else if (y >= dirtBottom) id = BlockId.DIRT;
          else id = BlockId.STONE;
          raw[index(x, y, z)] = id;
        }
        // y > GROUND_HEIGHT reste AIR (0), valeur par défaut du Uint8Array.
      }
    }
  }
}
