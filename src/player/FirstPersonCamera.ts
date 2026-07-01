// Caméra FPS : yaw/pitch depuis la souris, vecteurs de déplacement horizontaux.
// Cf. specs/05 §6.

import * as THREE from "three";
import { MOUSE_SENSITIVITY, PITCH_MAX } from "../core/constants";
import { clamp, Vec3 } from "../core/math";

export class FirstPersonCamera {
  yaw = 0; // rotation autour de Y (illimitée)
  pitch = 0; // rotation autour de X (bornée)

  applyMouse(dx: number, dy: number): void {
    this.yaw -= dx * MOUSE_SENSITIVITY;
    this.pitch -= dy * MOUSE_SENSITIVITY;
    this.pitch = clamp(this.pitch, -PITCH_MAX, PITCH_MAX);
  }

  updateCamera(camera: THREE.PerspectiveCamera, eye: Vec3): void {
    camera.position.set(eye.x, eye.y, eye.z);
    camera.rotation.set(this.pitch, this.yaw, 0, "YXZ");
  }

  // Vecteurs horizontaux (y=0) dérivés du yaw seul.
  forward(): Vec3 {
    return { x: -Math.sin(this.yaw), y: 0, z: -Math.cos(this.yaw) };
  }

  right(): Vec3 {
    return { x: Math.cos(this.yaw), y: 0, z: -Math.sin(this.yaw) };
  }
}
