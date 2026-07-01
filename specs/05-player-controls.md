# 05 — Contrôles joueur & caméra

> Entrées clavier/souris, **Pointer Lock**, caméra FPS (yaw/pitch), et calcul de
> l'**intention de déplacement**. La résolution physique (gravité, collisions)
> est dans [`06-physics-collision.md`](./06-physics-collision.md).

## 1. Objectif

Une caméra première personne fluide et une commande de déplacement au clavier
qui produit une **intention** (vitesse voulue + saut), sans déplacer directement
le joueur — c'est la physique qui applique et résout.

## 2. Périmètre

- ✅ Capture clavier/souris + molette + clics (`Input`).
- ✅ Pointer Lock (capture souris) + overlay « cliquer pour jouer ».
- ✅ Regard souris : yaw illimité, pitch borné.
- ✅ Déplacement horizontal relatif au regard (avant/arrière/latéral) + saut.
- ✅ Sélection hotbar (touches 1-9, molette) — capture ici, logique dans
  [`08-hotbar-hud.md`](./08-hotbar-hud.md).
- ❌ Manette, tactile, interface de reconfiguration des touches.
- ❌ Vol (le mode est marche + gravité), sprint (optionnel, voir §9).

## 3. Représentation du joueur

- `player.position` = **point au sol, centré** sur l'AABB (les « pieds »).
- **Yeux / caméra** = `position + (0, EYE_HEIGHT, 0)` avec `EYE_HEIGHT = 1.6`.
- **AABB** (utilisée par la physique) : largeur `PLAYER_WIDTH = 0.6`, hauteur
  `PLAYER_HEIGHT = 1.8` →
  `min = (x−0.3, y, z−0.3)`, `max = (x+0.3, y+1.8, z+0.3)`.
- État complet :
  ```ts
  export class Player {
    position: Vec3;      // pieds
    velocity: Vec3;      // blocs/s
    onGround: boolean;
  }
  ```

## 4. Module d'entrées (`Input`)

```ts
export class Input {
  isDown(code: string): boolean;          // code physique (KeyboardEvent.code)
  readonly mouseDX: number;               // delta souris X depuis beginFrame
  readonly mouseDY: number;
  readonly wheelDelta: number;            // molette (±) accumulée sur la frame
  consumeClick(button: 0 | 2): boolean;   // vrai une seule fois par clic
  readonly isPointerLocked: boolean;

  beginFrame(): void;                     // (rien à figer, deltas déjà accumulés)
  endFrame(): void;                       // remet deltas souris / molette à 0
  requestPointerLock(canvas: HTMLElement): void;
}
```

- **Touches par `code` physique** (`KeyW`, `KeyA`, …), **pas** par `key`.
  Conséquence voulue : sur un clavier **AZERTY**, les codes `KeyW/KeyA/KeyS/KeyD`
  correspondent aux touches physiques **Z/Q/S/D** — l'ergonomie « WASD » marche
  donc naturellement en ZQSD sans configuration.
- **Souris** : les deltas viennent de `movementX/movementY` (seulement valides
  sous Pointer Lock). Accumulés entre `beginFrame` et `endFrame`.
- **Clics** : `consumeClick` renvoie `true` **une fois** par clic (évite de
  casser en continu si le bouton reste enfoncé — le maintien est géré au niveau
  interaction si besoin).

## 5. Pointer Lock (capture de la souris)

- **État non verrouillé** : un overlay DOM « Cliquer pour jouer » est visible.
  Un clic sur le canvas appelle `requestPointerLock()` — **ce clic ne casse ni
  ne pose de bloc** (voir garde ci-dessous).
- **État verrouillé** : la souris pilote le regard ; les clics gauche/droit
  déclenchent casser/poser ([`07`](./07-interaction.md)).
- **Sortie** : `Échap` (relâchement natif du navigateur) ou perte de focus →
  retour à l'overlay ; on **ignore les deltas souris** tant que non verrouillé
  (pas de saut de caméra à la reprise).

> **Garde anti-« clic de capture »** : `BlockInteraction` ne lit les clics que si
> `input.isPointerLocked` était **déjà** vrai au début de la frame. Le clic qui
> *acquiert* le lock est donc ignoré par l'interaction.

## 6. Caméra FPS (`FirstPersonCamera`)

```ts
export class FirstPersonCamera {
  yaw: number;    // rotation autour de Y (radians), illimitée (wrap)
  pitch: number;  // rotation autour de X (radians), bornée
  applyMouse(dx: number, dy: number): void;
  updateCamera(camera: THREE.PerspectiveCamera, eye: Vec3): void;
  forward(): Vec3;   // direction horizontale (y=0), normalisée
  right(): Vec3;     // droite horizontale (y=0), normalisée
}
```

- **Sensibilité** : `yaw -= dx * SENSITIVITY`, `pitch -= dy * SENSITIVITY`
  avec `SENSITIVITY ≈ 0.0022` rad/pixel.
- **Clamp du pitch** : `pitch ∈ [−PITCH_MAX, +PITCH_MAX]`,
  `PITCH_MAX = 89° (≈1.553 rad)` — empêche de basculer par-dessus la verticale.
- **Application** : `camera.position = eye` ; `camera.rotation.set(pitch, yaw, 0,
  "YXZ")` (ordre `YXZ` = yaw appliqué avant pitch, comportement FPS attendu).
- **Vecteurs de déplacement** (horizontaux, dérivés du **yaw seul** — regarder
  vers le haut/bas ne modifie pas la vitesse au sol) :
  ```
  forward = (−sin(yaw), 0, −cos(yaw))
  right   = ( cos(yaw), 0, −sin(yaw))
  ```

## 7. Intention de déplacement (`PlayerController`)

Appelé dans la phase physique (pas fixe `FIXED_DT`). Ne déplace pas le joueur :
il **écrit `player.velocity`** ; l'intégration + collisions sont faites par
`Physics.step`.

```ts
export class PlayerController {
  update(dt: number, input: Input, player: Player, cam: FirstPersonCamera): void;
}
```

Algorithme :

```
# 1. Regard
cam.applyMouse(input.mouseDX, input.mouseDY)   # (ignoré si non verrouillé)

# 2. Déplacement horizontal voulu
ax = (KeyD ? 1 : 0) − (KeyA ? 1 : 0)
az = (KeyW ? 1 : 0) − (KeyS ? 1 : 0)
wish = normalize(right*ax + forward*az)        # (0 si aucune touche)
player.velocity.x = wish.x * MOVE_SPEED
player.velocity.z = wish.z * MOVE_SPEED

# 3. Saut
si input.isDown("Space") et player.onGround:
    player.velocity.y = JUMP_SPEED             # 7.75 -> ~1,2 bloc
    player.onGround = false

# (velocity.y est ensuite géré par la gravité dans Physics.step)
```

- **Normalisation** : la diagonale n'est pas plus rapide (`normalize`).
- **Vitesse horizontale « instantanée »** (pas d'inertie/accélération au MVP) :
  on écrit directement la vitesse voulue. Une accélération/friction plus douce
  est un raffinement post-MVP.
- **Pas d'input → vitesse horizontale nulle** (arrêt net, cohérent avec le
  point précédent).

## 8. Mapping des commandes

| Action                 | Entrée (`code`)         | Note                                   |
| ---------------------- | ----------------------- | -------------------------------------- |
| Avancer                | `KeyW` (Z en AZERTY)    | axe `+forward`                         |
| Reculer                | `KeyS`                  | axe `−forward`                         |
| Gauche (strafe)        | `KeyA` (Q en AZERTY)    | axe `−right`                           |
| Droite (strafe)        | `KeyD`                  | axe `+right`                           |
| Sauter                 | `Space`                 | seulement si `onGround`                |
| Regarder               | Souris (Pointer Lock)   | yaw/pitch                              |
| Casser bloc            | Clic gauche (`0`)       | logique dans [`07`](./07-interaction.md) |
| Poser bloc             | Clic droit (`2`)        | logique dans [`07`](./07-interaction.md) |
| Sélection hotbar       | `Digit1`…`Digit9`       | logique dans [`08`](./08-hotbar-hud.md)  |
| Sélection hotbar       | Molette                 | `wheelDelta`                           |
| (Re)capturer la souris | Clic sur le canvas      | si non verrouillé                      |
| Libérer la souris      | `Échap`                 | natif navigateur                       |

## 9. Questions ouvertes

- **Sprint** (`ShiftLeft` → ×1,5 vitesse) : agréable mais optionnel ; non retenu
  au MVP, trivial à ajouter.
- **Inertie / accélération** du déplacement : MVP en vitesse instantanée ;
  lissage possible post-MVP.
- **Sensibilité souris** : `0.0022` à valider au ressenti (option d'inversion Y
  non prévue).
