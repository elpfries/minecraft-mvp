// Matériau unique partagé par toutes les sections. Cf. specs/04 §4.
// La couleur finale vient des vertex colors (couleur du bloc) modulée par la
// lumière de la scène. color=blanc pour ne pas teinter.

import * as THREE from "three";

export const terrainMaterial = new THREE.MeshLambertMaterial({
  vertexColors: true,
  color: 0xffffff,
});
