// Ciel + lumières de la scène. Les valeurs sont animées par DayNightCycle.
// Cf. specs/04 §7 et specs/09.

import * as THREE from "three";
import { Vec3 } from "../core/math";

const SUN_DISTANCE = 400;

export interface EnvParams {
  sunDir: Vec3;
  sunIntensity: number;
  sunColor: number;
  skyColor: number;
  hemiIntensity: number;
  ambIntensity: number;
}

export class Environment {
  readonly hemi: THREE.HemisphereLight;
  readonly sun: THREE.DirectionalLight;
  readonly ambient: THREE.AmbientLight;

  constructor(private scene: THREE.Scene) {
    this.hemi = new THREE.HemisphereLight(0x87ceeb, 0x3a3529, 0.9);
    this.sun = new THREE.DirectionalLight(0xffffff, 1.0);
    this.sun.castShadow = false;
    this.ambient = new THREE.AmbientLight(0xffffff, 0.2);

    scene.add(this.hemi);
    scene.add(this.sun);
    scene.add(this.sun.target);
    scene.add(this.ambient);
  }

  apply(p: EnvParams): void {
    this.sun.position.set(
      p.sunDir.x * SUN_DISTANCE,
      p.sunDir.y * SUN_DISTANCE,
      p.sunDir.z * SUN_DISTANCE,
    );
    this.sun.target.position.set(0, 0, 0);
    this.sun.intensity = p.sunIntensity;
    this.sun.color.setHex(p.sunColor, THREE.SRGBColorSpace);

    this.hemi.intensity = p.hemiIntensity;
    this.ambient.intensity = p.ambIntensity;

    const sky = new THREE.Color().setHex(p.skyColor, THREE.SRGBColorSpace);
    this.scene.background = sky;
    if (this.scene.fog) this.scene.fog.color.copy(sky);
  }
}
