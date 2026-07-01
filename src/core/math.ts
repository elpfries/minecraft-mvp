// Types et helpers mathématiques légers. Aucune dépendance (surtout pas three.js),
// pour que world/ et player/ restent découplés du rendu.

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface AABB {
  min: Vec3;
  max: Vec3;
}

export function vec3(x = 0, y = 0, z = 0): Vec3 {
  return { x, y, z };
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Courbe de lissage classique (dérivées nulles aux bornes).
export function fade(t: number): number {
  return t * t * (3 - 2 * t);
}

// Interpolation lissée bornée : 0 sous edge0, 1 au-dessus de edge1.
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function sign(v: number): number {
  return v > 0 ? 1 : v < 0 ? -1 : 0;
}
