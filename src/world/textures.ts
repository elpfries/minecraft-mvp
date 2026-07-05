// Registre des tuiles de texture (données pures, sans dépendance three.js).
// L'ordre de ATLAS_TILES fixe l'index de chaque tuile dans l'atlas et doit
// rester aligné avec TILE. Cf. specs/03, 04.

export const TILE = {
  GRASS_TOP: 0,
  GRASS_SIDE: 1,
  DIRT: 2,
  STONE: 3,
  SAND: 4,
  LOG_SIDE: 5,
  LOG_TOP: 6,
  LEAVES: 7,
} as const;

// Noms de fichiers dans public/textures/blocks/ (sans extension), index-alignés
// avec TILE ci-dessus.
export const ATLAS_TILES: readonly string[] = [
  "grass_top",
  "grass_side",
  "dirt",
  "stone",
  "sand",
  "log_oak",
  "log_oak_top",
  "leaves_oak_opaque",
];

export const ATLAS_COLS = ATLAS_TILES.length;
export const TILE_SIZE = 16; // pixels par tuile
