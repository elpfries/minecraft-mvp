// Matériau unique partagé par toutes les sections. Cf. specs/04 §4.
// Texturé par l'atlas ; l'éclairage de la scène (jour/nuit) module le rendu.

import * as THREE from "three";

export function createTerrainMaterial(atlas: THREE.Texture): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ map: atlas });
}
