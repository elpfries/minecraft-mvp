// Réticule central statique (overlay DOM). Cf. specs/08 §7.

export class Crosshair {
  mount(parent: HTMLElement): void {
    const el = document.createElement("div");
    el.textContent = "+";
    Object.assign(el.style, {
      position: "absolute",
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
      color: "#ffffff",
      font: "20px monospace",
      textShadow: "0 0 2px rgba(0,0,0,0.8)",
      pointerEvents: "none",
      userSelect: "none",
    } as CSSStyleDeclaration);
    parent.appendChild(el);
  }
}
