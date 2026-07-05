// Entrées clavier/souris + Pointer Lock. Cf. specs/05 §4-5.
//
// Garde anti-"clic de capture" : un clic n'est enregistré pour le gameplay que
// si la souris est DÉJÀ verrouillée. Le clic qui acquiert le lock est donc
// ignoré par l'interaction — de façon robuste, quelle que soit la frame.

export class Input {
  private down = new Set<string>();
  private pressed = new Set<string>(); // touches passées de relâché -> enfoncé cette frame
  private pendingClicks = new Set<number>();
  private _mouseDX = 0;
  private _mouseDY = 0;
  private _wheelDelta = 0;
  private _locked = false;
  private canvas: HTMLElement;

  constructor(canvas: HTMLElement) {
    this.canvas = canvas;

    window.addEventListener("keydown", (e) => {
      if (!this.down.has(e.code)) this.pressed.add(e.code); // front montant (ignore l'auto-répétition)
      this.down.add(e.code);
    });
    window.addEventListener("keyup", (e) => this.down.delete(e.code));
    // évite qu'une touche reste "enfoncée" si le focus est perdu
    window.addEventListener("blur", () => {
      this.down.clear();
      this.pressed.clear();
    });

    document.addEventListener("mousemove", (e) => {
      if (!this._locked) return;
      this._mouseDX += e.movementX;
      this._mouseDY += e.movementY;
    });

    this.canvas.addEventListener("wheel", (e) => {
      this._wheelDelta += e.deltaY;
    }, { passive: true });

    this.canvas.addEventListener("mousedown", (e) => {
      if (this._locked) this.pendingClicks.add(e.button);
    });
    // le clic sur le canvas (hors lock) sert uniquement à (re)capturer la souris
    this.canvas.addEventListener("click", () => {
      if (!this._locked) this.requestPointerLock();
    });
    // pas de menu contextuel sur clic droit (utilisé pour poser)
    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    document.addEventListener("pointerlockchange", () => {
      this._locked = document.pointerLockElement === this.canvas;
    });
  }

  isDown(code: string): boolean {
    return this.down.has(code);
  }

  /** vrai une seule fois par appui (front montant), auto-répétition ignorée */
  consumeKey(code: string): boolean {
    if (this.pressed.has(code)) {
      this.pressed.delete(code);
      return true;
    }
    return false;
  }

  get mouseDX(): number {
    return this._mouseDX;
  }
  get mouseDY(): number {
    return this._mouseDY;
  }
  get wheelDelta(): number {
    return this._wheelDelta;
  }
  get isPointerLocked(): boolean {
    return this._locked;
  }

  /** vrai une seule fois par clic (bouton 0 = gauche, 2 = droit) */
  consumeClick(button: 0 | 2): boolean {
    if (this.pendingClicks.has(button)) {
      this.pendingClicks.delete(button);
      return true;
    }
    return false;
  }

  requestPointerLock(): void {
    this.canvas.requestPointerLock();
  }

  beginFrame(): void {
    // deltas déjà accumulés au fil des événements ; rien à faire.
  }

  endFrame(): void {
    this._mouseDX = 0;
    this._mouseDY = 0;
    this._wheelDelta = 0;
    this.pendingClicks.clear();
    this.pressed.clear();
  }
}
