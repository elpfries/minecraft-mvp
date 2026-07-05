// Tests des conversions de coordonnées. Cf. specs/11-tests.md §4 (cible 1).
// Exemple de référence écrit "ensemble" (Séance 1).

import { describe, it, expect } from "vitest";
import { index, inBounds, sectionOf, sectionKey } from "@/world/coords";
import { WORLD_X, WORLD_Y, WORLD_Z, SECTION } from "@/core/constants";

describe("coords — index linéaire (y-major, X le plus rapide)", () => {
  it("place l'origine à 0", () => {
    expect(index(0, 0, 0)).toBe(0);
  });

  it("avance de 1 quand X avance de 1", () => {
    expect(index(1, 0, 0)).toBe(1);
  });

  it("avance de WORLD_X quand Z avance de 1", () => {
    expect(index(0, 0, 1)).toBe(WORLD_X);
  });

  it("avance d'une couche entière (WORLD_X * WORLD_Z) quand Y avance de 1", () => {
    expect(index(0, 1, 0)).toBe(WORLD_X * WORLD_Z);
  });

  it("combine les trois axes : x + WORLD_X * (z + WORLD_Z * y)", () => {
    expect(index(2, 3, 4)).toBe(2 + WORLD_X * (4 + WORLD_Z * 3));
  });

  it("donne des index différents à deux positions différentes", () => {
    expect(index(5, 6, 7)).not.toBe(index(7, 6, 5));
  });
});

describe("coords — inBounds", () => {
  it("accepte l'origine et le coin opposé du monde", () => {
    expect(inBounds(0, 0, 0)).toBe(true);
    expect(inBounds(WORLD_X - 1, WORLD_Y - 1, WORLD_Z - 1)).toBe(true);
  });

  it("rejette les coordonnées négatives", () => {
    expect(inBounds(-1, 0, 0)).toBe(false);
    expect(inBounds(0, -1, 0)).toBe(false);
    expect(inBounds(0, 0, -1)).toBe(false);
  });

  it("rejette ce qui atteint ou dépasse chaque dimension", () => {
    expect(inBounds(WORLD_X, 0, 0)).toBe(false);
    expect(inBounds(0, WORLD_Y, 0)).toBe(false);
    expect(inBounds(0, 0, WORLD_Z)).toBe(false);
  });
});

describe("coords — sections", () => {
  it("découpe le monde en cellules de SECTION blocs", () => {
    expect(sectionOf(0, 0)).toEqual({ sx: 0, sz: 0 });
    expect(sectionOf(SECTION - 1, SECTION - 1)).toEqual({ sx: 0, sz: 0 });
    expect(sectionOf(SECTION, SECTION)).toEqual({ sx: 1, sz: 1 });
  });

  it("perd volontairement l'offset local (pas d'aller-retour exact)", () => {
    // Deux positions distinctes dans la même section → même section.
    expect(sectionOf(3, 4)).toEqual(sectionOf(10, 12));
  });

  it("construit une clé stable 'sx,sz'", () => {
    expect(sectionKey(1, 2)).toBe("1,2");
    const { sx, sz } = sectionOf(40, 5); // floor(40/16)=2, floor(5/16)=0
    expect(sectionKey(sx, sz)).toBe("2,0");
  });
});
