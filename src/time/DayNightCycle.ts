// Cycle jour/nuit : avance le temps, calcule soleil + couleurs, pilote
// l'environnement. Cf. specs/09.

import { DAY_LENGTH, DAY_START } from "../core/constants";
import { lerp } from "../core/math";
import { Environment } from "../render/Environment";

interface Keyframe {
  t: number;
  sky: number;
  sun: number;
  sunI: number;
  hemiI: number;
  ambI: number;
}

// Tableau cyclique (t=1.00 = t=0.00). Cf. specs/09 §5.
const KEYFRAMES: Keyframe[] = [
  { t: 0.0, sky: 0x05080f, sun: 0x223055, sunI: 0.0, hemiI: 0.15, ambI: 0.1 },
  { t: 0.22, sky: 0x243056, sun: 0xff9955, sunI: 0.1, hemiI: 0.3, ambI: 0.12 },
  { t: 0.28, sky: 0xf2a25c, sun: 0xffb066, sunI: 0.7, hemiI: 0.55, ambI: 0.18 },
  { t: 0.5, sky: 0x87ceeb, sun: 0xffffff, sunI: 1.0, hemiI: 0.9, ambI: 0.25 },
  { t: 0.72, sky: 0xe8613c, sun: 0xff7a3c, sunI: 0.6, hemiI: 0.5, ambI: 0.16 },
  { t: 0.8, sky: 0x1a2340, sun: 0x334066, sunI: 0.1, hemiI: 0.25, ambI: 0.12 },
  { t: 1.0, sky: 0x05080f, sun: 0x223055, sunI: 0.0, hemiI: 0.15, ambI: 0.1 },
];

function lerpHex(a: number, b: number, f: number): number {
  const ar = (a >> 16) & 255;
  const ag = (a >> 8) & 255;
  const ab = a & 255;
  const br = (b >> 16) & 255;
  const bg = (b >> 8) & 255;
  const bb = b & 255;
  const r = Math.round(lerp(ar, br, f));
  const g = Math.round(lerp(ag, bg, f));
  const bl = Math.round(lerp(ab, bb, f));
  return (r << 16) | (g << 8) | bl;
}

export class DayNightCycle {
  t: number;

  constructor(private env: Environment, t0: number = DAY_START) {
    this.t = t0;
  }

  update(dt: number): void {
    this.t = (this.t + dt / DAY_LENGTH) % 1;

    // Direction du soleil (arc, léger biais en Z)
    const phi = (this.t - 0.25) * Math.PI * 2;
    const dx = Math.cos(phi);
    const dy = Math.sin(phi);
    const dz = 0.2;
    const len = Math.hypot(dx, dy, dz);

    // Keyframes encadrant t
    let a = KEYFRAMES[0];
    let b = KEYFRAMES[KEYFRAMES.length - 1];
    for (let i = 0; i < KEYFRAMES.length - 1; i++) {
      if (this.t >= KEYFRAMES[i].t && this.t <= KEYFRAMES[i + 1].t) {
        a = KEYFRAMES[i];
        b = KEYFRAMES[i + 1];
        break;
      }
    }
    const f = b.t === a.t ? 0 : (this.t - a.t) / (b.t - a.t);

    this.env.apply({
      sunDir: { x: dx / len, y: dy / len, z: dz / len },
      sunIntensity: lerp(a.sunI, b.sunI, f),
      sunColor: lerpHex(a.sun, b.sun, f),
      skyColor: lerpHex(a.sky, b.sky, f),
      hemiIntensity: lerp(a.hemiI, b.hemiI, f),
      ambIntensity: lerp(a.ambI, b.ambI, f),
    });
  }
}
