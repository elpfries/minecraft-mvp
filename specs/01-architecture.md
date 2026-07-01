# 01 — Architecture

> Comment le code est **découpé en modules**, comment les données **circulent**,
> et quels **contrats** (interfaces) chaque système expose. Ce document ne
> contient pas d'algorithme détaillé : chaque système a sa propre spec.

## 1. Objectif

Définir une architecture **simple, modulaire et testable** pour le MVP, où
chaque système a une responsabilité claire et des dépendances explicites (pas
de cycles). Le tout doit tenir dans une boucle de jeu à 60 FPS.

## 2. Principes directeurs

- **Séparation données / rendu.** Le `World` ne connaît **pas** three.js. Il
  stocke des identifiants de blocs. Le rendu lit le `World` et produit des
  meshes.
- **Un sens de dépendance.** `render/`, `player/`, `interaction/`, `ui/`
  dépendent du `world/` et du `core/`, jamais l'inverse.
- **Mutations centralisées.** Toute modification du monde passe par
  `World.setBlock(...)`, qui **signale** les sections à re-mailler. Aucun
  système ne modifie un mesh directement.
- **Systèmes orchestrés par `Game`.** Un unique objet `Game` possède les
  systèmes et pilote l'ordre de mise à jour (pas de logique de loop éparpillée).
- **Pas de singletons globaux.** Les dépendances sont injectées au constructeur.

## 3. Vue d'ensemble des modules

```
                         ┌───────────────┐
                         │     Game      │  boucle + orchestration
                         └──────┬────────┘
        ┌───────────────┬───────┼───────────┬───────────────┐
        ▼               ▼       ▼           ▼               ▼
   ┌─────────┐   ┌────────────┐ ┌────────┐ ┌───────────┐ ┌─────────┐
   │  Input  │   │   Player   │ │ Inter- │ │  Render   │ │   UI    │
   │         │   │ +Physics   │ │ action │ │           │ │ (HUD)   │
   └─────────┘   └─────┬──────┘ └───┬────┘ └─────┬─────┘ └─────────┘
                       │            │            │
                       ▼            ▼            ▼
                    ┌───────────────────────────────┐
                    │            World              │  données blocs
                    │  (+ BlockRegistry, coords)    │
                    └───────────────────────────────┘
                                   ▲
                          ┌────────┴────────┐
                          │      core/      │  constantes, maths, clock
                          └─────────────────┘
```

- **core/** — constantes, types maths (Vec3, AABB), horloge. Aucune dépendance.
- **world/** — stockage des blocs, registre des blocs, génération superflat,
  helpers de coordonnées. Dépend de `core/`.
- **input/** — état clavier/souris, gestion du Pointer Lock.
- **player/** — état joueur, contrôleur (intention de déplacement), physique
  (gravité + collisions AABB contre le `World`), caméra FPS.
- **interaction/** — raycast voxel, casser/poser, surbrillance du bloc visé.
- **render/** — three.js : renderer/scène/caméra, meshing des sections,
  matériaux, environnement (ciel + lumières).
- **ui/** — hotbar et réticule (DOM overlay au-dessus du canvas).
- **time/** — cycle jour/nuit : avance le temps, pilote l'environnement.

## 4. Structure des fichiers

```
src/
├── main.ts                    # bootstrap : crée Game et démarre la boucle
├── Game.ts                    # possède les systèmes, ordonne update() + render()
│
├── core/
│   ├── constants.ts           # dimensions monde, gravité, vitesses, reach…
│   ├── math.ts                # Vec3, AABB, helpers (clamp, lerp)
│   └── Clock.ts               # dt, temps écoulé (wrap de performance.now)
│
├── world/
│   ├── World.ts               # stockage Uint8Array + get/set + dirty sections
│   ├── blocks.ts              # enum BlockId + registre des définitions
│   ├── WorldGenerator.ts      # remplissage superflat
│   └── coords.ts              # (x,y,z) <-> index, section d'un bloc, bornes
│
├── render/
│   ├── Renderer.ts            # WebGLRenderer, Scene, PerspectiveCamera, resize
│   ├── Mesher.ts              # section -> BufferGeometry (face culling)
│   ├── SectionMeshManager.ts  # sections -> Mesh, reconstruit les "dirty"
│   ├── materials.ts           # matériau(x) partagé(s), vertex colors
│   └── Environment.ts         # ciel, lumière directionnelle + ambiante
│
├── player/
│   ├── Player.ts              # état : position, vélocité, AABB, onGround
│   ├── PlayerController.ts     # Input -> intention de déplacement
│   ├── Physics.ts             # gravité + résolution collisions AABB vs World
│   └── FirstPersonCamera.ts   # yaw/pitch souris, applique à la caméra
│
├── interaction/
│   ├── VoxelRaycaster.ts      # DDA : rayon -> {bloc visé, face, bloc adjacent}
│   ├── BlockInteraction.ts    # casser/poser via raycaster + World + hotbar
│   └── BlockHighlight.ts      # contour (wireframe) du bloc visé
│
├── input/
│   └── Input.ts               # clavier/souris, pointer lock, deltas souris
│
├── ui/
│   ├── Hotbar.ts              # slots, sélection, rendu DOM
│   └── Crosshair.ts           # réticule central (DOM)
│
└── time/
    └── DayNightCycle.ts       # temps normalisé [0,1) -> Environment
```

## 5. Flux de données (une frame)

```
Input (clavier/souris)
   │
   ▼
PlayerController ── intention (dir, saut) ──► Physics ──► met à jour Player.position
   │                                             │            (lit World pour collisions)
   │ (souris)                                     │
   ▼                                              ▼
FirstPersonCamera (yaw/pitch)             caméra suivie sur position joueur
   │
   ▼
BlockInteraction
   │  VoxelRaycaster(camera, World) -> cible
   │  clic gauche  -> World.setBlock(cible, AIR)
   │  clic droit   -> World.setBlock(adjacent, hotbar.blocSélectionné)
   ▼
World  ── marque section(s) "dirty" ──►  SectionMeshManager (reconstruit les meshes dirty)
                                                     │
DayNightCycle(dt) ──► Environment (couleur ciel, intensité/position soleil)
                                                     │
                                                     ▼
                                              Renderer.render(scene, camera)
                                                     │
BlockHighlight ── positionne le contour sur le bloc visé ──► (dans la scène)
Hotbar / Crosshair ── overlay DOM (hors scène three.js) ──► écran
```

Point clé : **le `World` est la seule source de vérité**. Les meshes en sont une
projection reconstruite à la demande via le mécanisme *dirty*.

## 6. Boucle de jeu & pas de temps

`Game` possède la boucle (`requestAnimationFrame`). On sépare **physique** (pas
fixe, déterministe) et **rendu** (pas variable) via un accumulateur :

```
FIXED_DT = 1/60  # pas de physique

loop(now):
  dt = clock.tick(now)          # secondes depuis la frame précédente
  dt = min(dt, 0.1)             # clamp anti-"spirale de la mort"
  accumulator += dt

  input.beginFrame()            # fige l'état des entrées pour la frame

  while accumulator >= FIXED_DT:
    playerController.update(FIXED_DT)   # intention de déplacement
    physics.step(FIXED_DT, world)       # gravité + collisions
    accumulator -= FIXED_DT

  camera.update()               # yaw/pitch souris (peut rester en dt variable)
  interaction.update()          # raycast + casser/poser (clics de la frame)
  sectionMeshManager.flush()    # reconstruit les sections dirty
  dayNight.update(dt)           # avance le temps, MAJ environnement
  highlight.update()            # position du contour

  input.endFrame()              # reset des deltas souris / clics ponctuels
  renderer.render()
  requestAnimationFrame(loop)
```

Ordre imposé : **entrées → physique → interactions → meshing → environnement →
rendu**. Le meshing vient **après** les interactions pour intégrer les blocs
cassés/posés dans la même frame.

## 7. Conventions de coordonnées

- **Repère** : `Y` vers le haut. `X`/`Z` horizontaux. Cohérent avec three.js.
- **Bloc entier** : un bloc de coordonnées `(x,y,z)` (entiers) occupe le cube
  `[x, x+1] × [y, y+1] × [z, z+1]`. Son **centre** est à `(x+0.5, y+0.5, z+0.5)`.
- **Bornes** : `0 ≤ x < 256`, `0 ≤ y < 64`, `0 ≤ z < 256`. Hors bornes → traité
  comme `AIR` en lecture (et comme mur invisible pour la physique).
- **Indexation** stockage linéaire :
  `index = x + WORLD_X * (z + WORLD_Z * y)` (ordre y-major recommandé pour
  regrouper les colonnes ; à figer dans `coords.ts`).
- **Section** d'un bloc : `sx = floor(x/16)`, `sz = floor(z/16)` (sections sur
  toute la hauteur). Voir `04-rendering.md` pour le meshing par section.

## 8. Contrats d'interface (signatures, non implémentation)

> TypeScript indicatif : fige les **frontières** entre systèmes. Les corps
> seront écrits à l'implémentation.

### core/

```ts
export const WORLD_X = 256, WORLD_Z = 256, WORLD_Y = 64;
export const SECTION = 16;
export const GRAVITY = -25;        // blocs/s²
export const MOVE_SPEED = 5;       // blocs/s
export const JUMP_SPEED = 7.75;    // ~1,2 bloc de hauteur (v=√(2·|g|·h))
export const PLAYER_WIDTH = 0.6, PLAYER_HEIGHT = 1.8, EYE_HEIGHT = 1.6;
export const REACH = 5;            // portée casser/poser (blocs)
export const DAY_LENGTH = 180;     // secondes / cycle complet

export interface Vec3 { x: number; y: number; z: number; }
export interface AABB { min: Vec3; max: Vec3; }
```

### world/

```ts
export type BlockId = number;      // 0 = AIR

export interface BlockDef {
  id: BlockId;
  name: string;
  color: number;                   // couleur unie (0xRRGGBB) pour le MVP
  solid: boolean;                  // collision + occlusion des faces
  placeable: boolean;              // apparaît dans la hotbar
}

export class World {
  constructor(gen: WorldGenerator);
  getBlock(x: number, y: number, z: number): BlockId;   // hors bornes -> AIR
  setBlock(x: number, y: number, z: number, id: BlockId): void; // marque dirty
  isSolid(x: number, y: number, z: number): boolean;
  inBounds(x: number, y: number, z: number): boolean;

  /** sections modifiées depuis le dernier flush (clés "sx,sz") */
  takeDirtySections(): Iterable<{ sx: number; sz: number }>;
}
```

### render/

```ts
export class Renderer {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  render(): void;
  resize(w: number, h: number): void;
}

export class SectionMeshManager {
  constructor(world: World, scene: THREE.Scene);
  buildAll(): void;                        // meshing initial du monde
  flush(): void;                           // reconstruit les sections dirty
}

export class Environment {
  constructor(scene: THREE.Scene);
  apply(sunDir: Vec3, skyColor: number, lightIntensity: number): void;
}
```

### player/ · interaction/ · input/ · ui/ · time/

```ts
export class Input {
  isDown(code: string): boolean;
  readonly mouseDX: number; readonly mouseDY: number;
  consumeClick(button: 0 | 2): boolean;    // vrai une seule fois par clic
  beginFrame(): void; endFrame(): void;
  requestPointerLock(canvas: HTMLElement): void;
}

export class Physics {
  step(dt: number, world: World, player: Player): void; // gravité + AABB
}

export interface RayHit {
  block: Vec3;          // bloc visé (entiers)
  adjacent: Vec3;       // case vide côté face touchée (pour poser)
  normal: Vec3;         // normale de la face
}
export class VoxelRaycaster {
  cast(origin: Vec3, dir: Vec3, maxDist: number, world: World): RayHit | null;
}

export class Hotbar {
  readonly slots: BlockId[];    // 9 slots
  selected(): BlockId;
  select(index: number): void;  // touches 1-9
  scroll(delta: number): void;  // molette
}

export class DayNightCycle {
  update(dt: number): void;                 // avance t dans [0,1)
  // pousse sunDir / skyColor / intensity vers Environment
}
```

## 9. Séquence de démarrage (`main.ts` → `Game`)

```
1. Renderer            : WebGLRenderer + Scene + Camera, attache le canvas au #app
2. World               : new World(new WorldGenerator())  -> monde superflat rempli
3. SectionMeshManager  : buildAll()  -> meshes initiaux ajoutés à la scène
4. Environment         : lumières + ciel ajoutés à la scène
5. Player              : position de spawn (centre du monde, au-dessus du sol)
6. FirstPersonCamera   : rattachée au Player
7. Input               : écouteurs clavier/souris ; pointer lock au 1er clic
8. Interaction         : VoxelRaycaster + BlockInteraction + BlockHighlight
9. UI                  : Hotbar (pré-remplie) + Crosshair (overlay DOM)
10. DayNightCycle       : t initial = "matin"
11. Game.start()        : lance la boucle requestAnimationFrame
```

## 10. Gestion des états transverses

- **Resize** : `window.resize` → `Renderer.resize()` (aspect caméra + taille du
  renderer).
- **Perte de focus / pointer lock** : si le pointer lock est perdu, on ignore
  les deltas souris (pas de saut de caméra) et on peut afficher un overlay
  « cliquer pour jouer ».
- **Pause** : hors MVP (le jeu tourne tant que l'onglet est actif ;
  `requestAnimationFrame` se met en pause naturellement onglet caché).

## 11. Questions ouvertes

- **Un mesh par section vs regroupement par matériau** : avec des couleurs
  unies en *vertex colors*, un **seul matériau** partagé suffit → 1 mesh par
  section, 1 draw call par section. À confirmer dans `04-rendering.md`.
- **Ordre d'indexation** (`y`-major vs `z`-major) : impact mineur sur la
  localité mémoire du mesher ; à figer dans `coords.ts`.
- **Meshing initial bloquant** : `buildAll()` sur 256×256 peut prendre un
  instant au démarrage. Acceptable pour le MVP (écran de chargement simple) ;
  Web Workers = post-MVP.
