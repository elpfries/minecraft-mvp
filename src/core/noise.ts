// Bruit 2D déterministe (value noise + fBm), sans dépendance externe.
// Utilisé pour le relief du terrain et la densité des forêts. Cf. specs/02, 10.

import { fade, lerp } from "./math";

// Hash entier 32 bits -> [0,1)
function hash2(ix: number, iz: number, seed: number): number {
  let h = Math.imul(ix | 0, 374761393) ^ Math.imul(iz | 0, 668265263) ^ Math.imul(seed | 0, 362437);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// Value noise 2D bilinéaire lissé -> [0,1]
function valueNoise2(x: number, z: number, seed: number): number {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const xf = x - x0;
  const zf = z - z0;
  const v00 = hash2(x0, z0, seed);
  const v10 = hash2(x0 + 1, z0, seed);
  const v01 = hash2(x0, z0 + 1, seed);
  const v11 = hash2(x0 + 1, z0 + 1, seed);
  const u = fade(xf);
  const w = fade(zf);
  return lerp(lerp(v00, v10, u), lerp(v01, v11, u), w);
}

// Fractal Brownian motion -> [0,1]
export function fbm2(
  x: number,
  z: number,
  seed: number,
  octaves = 4,
  lacunarity = 2,
  gain = 0.5,
): number {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise2(x * freq, z * freq, seed + i * 1013);
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}

// Bruit "ridged" (crêtes marquées) -> [0,1], pics là où fbm ≈ 0.5.
export function ridged2(x: number, z: number, seed: number, octaves = 4): number {
  return 1 - Math.abs(2 * fbm2(x, z, seed, octaves) - 1);
}
