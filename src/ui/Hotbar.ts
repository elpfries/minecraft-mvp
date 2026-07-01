// Hotbar : état + rendu DOM (overlay). Cf. specs/08 §4-6.

import { BlockId, DEFAULT_HOTBAR, getBlockDef } from "../world/blocks";
import { Input } from "../input/Input";

function hexColor(hex: number): string {
  return "#" + hex.toString(16).padStart(6, "0");
}

// Molette : quantité de scroll accumulée pour valider un cran, et nombre de
// frames au repos avant de ré-armer. Adapté à la Magic Mouse (flux continu +
// inertie) -> un seul cran par glissement.
const SCROLL_THRESHOLD = 24;
const SCROLL_IDLE_FRAMES = 6;

export class Hotbar {
  readonly slots: BlockId[];
  selectedIndex = 0;
  private slotEls: HTMLElement[] = [];

  // État de la molette (un cran par geste)
  private scrollAccum = 0;
  private scrollArmed = true;
  private scrollIdle = 0;

  constructor(slots: BlockId[] = [...DEFAULT_HOTBAR]) {
    this.slots = slots;
  }

  selected(): BlockId {
    return this.slots[this.selectedIndex];
  }

  select(index: number): void {
    this.selectedIndex = Math.max(0, Math.min(this.slots.length - 1, index));
  }

  scroll(delta: number): void {
    const n = this.slots.length;
    this.selectedIndex = (this.selectedIndex + Math.sign(delta) + n) % n;
  }

  mount(parent: HTMLElement): void {
    const bar = document.createElement("div");
    Object.assign(bar.style, {
      position: "absolute",
      left: "50%",
      bottom: "16px",
      transform: "translateX(-50%)",
      display: "flex",
      gap: "4px",
      padding: "4px",
      pointerEvents: "none",
    } as CSSStyleDeclaration);

    this.slots.forEach((id) => {
      const slot = document.createElement("div");
      Object.assign(slot.style, {
        width: "44px",
        height: "44px",
        boxSizing: "border-box",
        border: "2px solid rgba(255,255,255,0.25)",
        background: "rgba(0,0,0,0.35)",
        borderRadius: "4px",
      } as CSSStyleDeclaration);

      if (id !== BlockId.AIR) {
        const def = getBlockDef(id);
        slot.style.background = hexColor(def.colorTop ?? def.color);
      }

      bar.appendChild(slot);
      this.slotEls.push(slot);
    });

    parent.appendChild(bar);
    this.refresh();
  }

  update(input: Input): void {
    // Sélection directe par chiffre
    for (let i = 0; i < Math.min(9, this.slots.length); i++) {
      if (input.isDown("Digit" + (i + 1))) this.selectedIndex = i;
    }

    // Molette : un cran par geste, l'inertie (momentum) est absorbée.
    const d = input.wheelDelta;
    if (d === 0) {
      // le geste s'est arrêté : ré-armer après quelques frames au repos
      if (++this.scrollIdle >= SCROLL_IDLE_FRAMES) {
        this.scrollArmed = true;
        this.scrollAccum = 0;
      }
    } else {
      this.scrollIdle = 0;
      if (this.scrollArmed) {
        this.scrollAccum += d;
        if (Math.abs(this.scrollAccum) >= SCROLL_THRESHOLD) {
          this.scroll(this.scrollAccum); // scroll() n'utilise que le signe
          this.scrollArmed = false; // désarmé tant que le geste (momentum) dure
          this.scrollAccum = 0;
        }
      }
      // si désarmé : on ignore (inertie en cours)
    }

    this.refresh();
  }

  private refresh(): void {
    this.slotEls.forEach((el, i) => {
      const active = i === this.selectedIndex;
      el.style.borderColor = active ? "#ffffff" : "rgba(255,255,255,0.25)";
      el.style.borderWidth = active ? "3px" : "2px";
    });
  }
}
