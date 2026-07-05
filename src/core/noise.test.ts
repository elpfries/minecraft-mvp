// Tests du bruit déterministe (value noise + fBm + ridged). Cf. specs/11-tests.md §4 (cible 2).

import { describe, it, expect } from "vitest";
import { fbm2, ridged2 } from "@/core/noise";

describe("noise — fbm2", () => {
  it("est déterministe : mêmes arguments → même valeur", () => {
    expect(fbm2(12.5, 7.25, 1337)).toBe(fbm2(12.5, 7.25, 1337));
  });

  it("reste dans [0, 1] sur une grille d'échantillons", () => {
    for (let x = 0; x < 20; x++) {
      for (let z = 0; z < 20; z++) {
        const v = fbm2(x * 0.37, z * 0.53, 1337);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it("change de valeur quand la graine change", () => {
    expect(fbm2(12.5, 7.25, 1337)).not.toBe(fbm2(12.5, 7.25, 1338));
  });
});

describe("noise — ridged2", () => {
  it("est déterministe", () => {
    expect(ridged2(3.3, 9.1, 19)).toBe(ridged2(3.3, 9.1, 19));
  });

  it("reste dans [0, 1]", () => {
    for (let i = 0; i < 200; i++) {
      const v = ridged2(i * 0.13, i * 0.29, 19);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});
