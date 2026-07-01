// Conversions de coordonnées. Point unique de vérité pour l'indexation.
// Cf. specs/02 §4.

import { SECTION, WORLD_X, WORLD_Y, WORLD_Z } from "../core/constants";

// index linéaire y-major : X varie le plus vite.
export function index(x: number, y: number, z: number): number {
  return x + WORLD_X * (z + WORLD_Z * y);
}

export function inBounds(x: number, y: number, z: number): boolean {
  return x >= 0 && x < WORLD_X && y >= 0 && y < WORLD_Y && z >= 0 && z < WORLD_Z;
}

export function sectionOf(x: number, z: number): { sx: number; sz: number } {
  return { sx: Math.floor(x / SECTION), sz: Math.floor(z / SECTION) };
}

export function sectionKey(sx: number, sz: number): string {
  return sx + "," + sz;
}
