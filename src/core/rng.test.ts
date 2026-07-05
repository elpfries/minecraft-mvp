// Tests du PRNG déterministe mulberry32. Cf. specs/11-tests.md §4 (cible 2).

import { describe, it, expect } from "vitest";
import { mulberry32 } from "@/core/rng";

describe("rng — mulberry32", () => {
  it("reproduit exactement la même séquence pour une même graine", () => {
    const a = mulberry32(1234);
    const b = mulberry32(1234);
    const seqA = [a(), a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it("produit des tirages différents pour des graines différentes", () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });

  it("renvoie des flottants dans [0, 1)", () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("avance à chaque appel (deux tirages consécutifs diffèrent)", () => {
    const rng = mulberry32(7);
    expect(rng()).not.toBe(rng());
  });
});
