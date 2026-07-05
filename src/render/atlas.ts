// Construit l'atlas de textures (les tuiles côte à côte sur un canvas) et le
// renvoie en THREE.Texture pixel-art (Nearest, sans mipmap). Cf. specs/04.

import * as THREE from "three";
import { ATLAS_COLS, ATLAS_TILES, TILE_SIZE } from "../world/textures";

export async function loadAtlas(): Promise<THREE.Texture> {
  const canvas = document.createElement("canvas");
  canvas.width = TILE_SIZE * ATLAS_COLS;
  canvas.height = TILE_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D indisponible");
  ctx.imageSmoothingEnabled = false;

  await Promise.all(
    ATLAS_TILES.map(
      (name, i) =>
        new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, i * TILE_SIZE, 0, TILE_SIZE, TILE_SIZE);
            resolve();
          };
          img.onerror = () => reject(new Error(`Texture introuvable : ${name}`));
          // BASE_URL (= "/minecraft-mvp/" en prod, "/" en dev) : indispensable
          // pour que les assets soient trouvés sous le sous-chemin GitHub Pages.
          img.src = `${import.meta.env.BASE_URL}textures/blocks/${name}.png`;
        }),
    ),
  );

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
