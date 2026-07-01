// Horloge : delta-temps entre frames (secondes), borné pour éviter la
// "spirale de la mort" après un onglet mis en pause. Cf. specs/01 §6.

export class Clock {
  private last = performance.now();

  /** secondes écoulées depuis le dernier appel (clampé à 0,1 s) */
  tick(now: number = performance.now()): number {
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > 0.1) dt = 0.1;
    if (dt < 0) dt = 0;
    return dt;
  }
}
