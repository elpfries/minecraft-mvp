// Hotbar : état + rendu DOM (overlay). Cf. specs/08 §4-6.

import { BlockId, DEFAULT_HOTBAR, getBlockDef } from "../world/blocks";
import { Input } from "../input/Input";

function hexColor(hex: number): string {
  return "#" + hex.toString(16).padStart(6, "0");
}

export class Hotbar {
  readonly slots: BlockId[];
  selectedIndex = 0;
  private slotEls: HTMLElement[] = [];

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
    for (let i = 0; i < Math.min(9, this.slots.length); i++) {
      if (input.isDown("Digit" + (i + 1))) this.selectedIndex = i;
    }
    if (input.wheelDelta !== 0) this.scroll(input.wheelDelta);
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
