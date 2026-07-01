// Générateur de chêne (small oak) inspiré de Minecraft : tronc en WOOD,
// feuillage en couronne en LEAVES. Écrit directement dans le tableau brut.
// Cf. specs/10 §3-4.

import { BlockId } from "./blocks";
import { inBounds, index } from "./coords";

export class TreeGenerator {
  /** écrit un arbre (tronc + feuillage) dans le tableau brut */
  generate(raw: Uint8Array, x: number, baseY: number, z: number, height: number): void {
    const topLog = baseY + height - 1;

    // Tronc (écrit inconditionnellement)
    for (let y = baseY; y <= topLog; y++) {
      this.setLog(raw, x, y, z);
    }

    // Feuillage (écrit seulement dans l'air -> ne recouvre pas les logs)
    this.leafLayer(raw, x, topLog - 2, z, 2, true); // 5x5 sans coins
    this.leafLayer(raw, x, topLog - 1, z, 2, true); // 5x5 sans coins
    this.leafLayer(raw, x, topLog, z, 1, false); // 3x3 plein (centre = log)
    this.leafLayer(raw, x, topLog + 1, z, 1, true); // + au sommet
  }

  private leafLayer(
    raw: Uint8Array,
    cx: number,
    y: number,
    cz: number,
    r: number,
    cutCorners: boolean,
  ): void {
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (cutCorners && Math.abs(dx) === r && Math.abs(dz) === r) continue;
        this.setLeaf(raw, cx + dx, y, cz + dz);
      }
    }
  }

  private setLog(raw: Uint8Array, x: number, y: number, z: number): void {
    if (inBounds(x, y, z)) raw[index(x, y, z)] = BlockId.WOOD;
  }

  private setLeaf(raw: Uint8Array, x: number, y: number, z: number): void {
    if (inBounds(x, y, z) && raw[index(x, y, z)] === BlockId.AIR) {
      raw[index(x, y, z)] = BlockId.LEAVES;
    }
  }
}
