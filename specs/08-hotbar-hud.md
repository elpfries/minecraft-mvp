# 08 — Hotbar & HUD

> Interface écran : **hotbar** (choix du bloc à poser) et **réticule**, en
> **overlay DOM** au-dessus du canvas. Rien n'est dessiné dans la scène three.js.

## 1. Objectif

Permettre de choisir le bloc courant (clavier/molette) et de viser précisément
(réticule), avec un HUD léger qui **n'intercepte jamais** les clics destinés au
jeu.

## 2. Périmètre

- ✅ Hotbar **9 slots** (DOM), pré-remplie ([`03`](./03-block-system.md) §7).
- ✅ Sélection : touches `Digit1`…`Digit9` + molette (wrap).
- ✅ Rendu : pastille de couleur par slot, surbrillance du slot actif.
- ✅ Réticule central (« + »).
- ❌ Inventaire complet, quantités, tooltips, glisser-déposer.
- ❌ Autres éléments de HUD (barres de vie/faim : hors mode créatif).

## 3. Overlay DOM (règle transverse)

- Le HUD est du **HTML positionné en absolu** au-dessus du `<canvas>`
  (`position: absolute`, `z-index` > canvas).
- **`pointer-events: none`** sur tout le HUD → les clics et le Pointer Lock
  atteignent le canvas sans être interceptés. La sélection se fait **uniquement**
  au clavier/molette, jamais au clic sur un slot.
- Le HUD vit dans `#app`, à côté du canvas (pas dans la scène three.js).

## 4. Hotbar — état & API

```ts
export class Hotbar {
  readonly slots: BlockId[];        // longueur 9 (DEFAULT_HOTBAR)
  selectedIndex: number;            // 0..8

  selected(): BlockId;              // slots[selectedIndex]
  select(index: number): void;      // 0..8 (clamp)
  scroll(delta: number): void;      // ±1 avec wrap modulo 9

  mount(parent: HTMLElement): void; // crée les 9 slots une fois
  update(input: Input): void;       // lit Digit1-9 + molette, rafraîchit le visuel
}
```

- `selected()` est lu par [`07`](./07-interaction.md) au moment de poser.
- **Slot vide** (`AIR`) : sélectionnable, mais poser depuis un slot vide = no-op
  ([`07`](./07-interaction.md) §7).

## 5. Hotbar — logique d'entrée (`update`)

```
# Sélection directe par chiffre (idempotent -> pas besoin de détection de front)
pour i de 0 à 8:
  si input.isDown("Digit" + (i+1)): selectedIndex = i

# Molette : défilement circulaire
si input.wheelDelta != 0:
  selectedIndex = (selectedIndex + sign(input.wheelDelta) + 9) % 9

# Rafraîchir la surbrillance du slot actif (voir §6)
```

- Maintenir une touche chiffre ne pose pas de problème : re-sélectionner le même
  slot est **idempotent**.
- `wheelDelta` est accumulé sur la frame et remis à 0 par `input.endFrame()`
  ([`05`](./05-player-controls.md) §4).
- Appelé dans la phase UI de la boucle ([`01`](./01-architecture.md) §6).

## 6. Hotbar — rendu

- **`mount`** (une fois) : crée 9 éléments « slot ». Chaque slot contient une
  **pastille** dont la couleur = `colorTop ?? color` du bloc du slot
  ([`03`](./03-block-system.md)) — l'herbe apparaît donc verte. Un slot `AIR`
  affiche une case vide/sombre.
- **`update`** : applique la classe `--selected` au slot `selectedIndex` (bordure
  claire épaisse) et la retire des autres. Les couleurs de pastilles ne changent
  pas (posées au mount).
- **Disposition** : rangée centrée en bas de l'écran, ~9 cases carrées
  (~40–48 px), petit espacement. Le chiffre du slot (1–9) peut être affiché en
  coin.

```
┌──┬──┬──┬──┬──┬──┬──┬──┬──┐
│▓▓│▓▓│▓▓│▓▓│▓▓│  │  │  │  │
└──┴══┴──┴──┴──┴──┴──┴──┴──┘   (slot 2 = sélectionné, bordure claire)
 1  2  3  4  5  6  7  8  9
```

## 7. Réticule (`Crosshair`)

```ts
export class Crosshair {
  mount(parent: HTMLElement): void;   // « + » centré, statique
}
```

- Simple croix centrée à l'écran (deux traits, ou caractère `+`), couleur claire
  avec léger contraste (ombre) pour rester lisible sur fond variable.
- **Statique** : pas de mise à jour par frame. `pointer-events: none`.

## 8. Cycle de vie

- **Démarrage** : `hotbar.mount(#app)` + `crosshair.mount(#app)` après la
  création du canvas ([`01`](./01-architecture.md) §9, étape UI).
- **Par frame** : `hotbar.update(input)` (phase UI). `crosshair` : rien.
- **Resize** : le HUD est en CSS (centré / ancré en bas), aucun recalcul JS
  nécessaire.

## 9. Questions ouvertes

- **Aspect visuel** : pastille de couleur unie au MVP ; on pourra passer à des
  icônes/miniatures de blocs quand les textures arriveront (post-MVP).
- **Nombre de slots utiles** : 5 remplis / 9 affichés. On peut n'afficher que 5
  slots si les 4 vides gênent visuellement (choix cosmétique).
