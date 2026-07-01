# 04 — Rendu (three.js)

> Mise en place three.js, **maillage des blocs par section avec face culling**,
> matériau unique + couleurs par sommet, éclairage support du cycle jour/nuit,
> et surbrillance du bloc visé. L'éclairage temporel lui-même est dans
> [`09-day-night.md`](./09-day-night.md).

## 1. Objectif

Afficher le monde à **60 FPS** avec un pipeline simple : un **mesh par section**,
un **seul matériau partagé**, reconstruction **incrémentale** des sections
modifiées. Pas de texture (couleurs unies), pas d'ombres portées.

## 2. Périmètre

- ✅ `Renderer` : `WebGLRenderer` + `Scene` + `PerspectiveCamera` + resize.
- ✅ `Mesher` : section → `BufferGeometry` par **face culling**.
- ✅ `SectionMeshManager` : build initial + reconstruction des sections dirty.
- ✅ Matériau `MeshLambertMaterial` unique + `vertexColors` + normales.
- ✅ Éclairage : hémisphère + soleil directionnel + ambiante (piloté par `09`).
- ✅ `BlockHighlight` : contour du bloc visé.
- ✅ Brouillard (fog) pour l'ambiance et masquer les bords lointains.
- ❌ **Greedy meshing** (fusion de faces) → post-MVP (voir §11).
- ❌ Textures / atlas, ombres portées, occlusion ambiante calculée, transparence.
- ❌ Post-processing.

## 3. Renderer, scène, caméra

```ts
export class Renderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  render(): void;                 // renderer.render(scene, camera)
  resize(w: number, h: number): void;
}
```

- **WebGLRenderer** : `{ antialias: true }`, `setPixelRatio(min(dpr, 2))`,
  `outputColorSpace = SRGBColorSpace`. Canvas ajouté dans `#app`.
- **Scene** : `scene.background` = couleur du ciel (pilotée par `09`).
  `scene.fog` = `THREE.Fog(skyColor, near, far)` pour fondre les bords.
- **Camera** : `PerspectiveCamera(fov = 70, aspect, near = 0.1, far = 1000)`.
  La caméra est **pilotée par le joueur** (position = yeux du joueur, rotation =
  yaw/pitch, cf. [`05-player-controls.md`](./05-player-controls.md)).
- **Resize** : sur `window.resize`, `camera.aspect = w/h`,
  `updateProjectionMatrix()`, `renderer.setSize(w, h)`.

## 4. Matériau & attributs de géométrie

- **Un seul matériau partagé** pour toutes les sections :
  `new THREE.MeshLambertMaterial({ vertexColors: true, color: 0xffffff })`.
  - `color: 0xffffff` (blanc) → la couleur finale vient des **vertex colors**
    (couleur du bloc) modulée par la **lumière** (jour/nuit). Pas de teinte
    cuite dans les sommets.
- **Géométrie par section** = `BufferGeometry` avec 4 attributs :
  - `position` (Float32, xyz par sommet),
  - `normal` (Float32, normale **plate** de la face — indispensable pour Lambert),
  - `color` (Float32, rgb par sommet = couleur du bloc pour cette face),
  - **index** (Uint32 — une section peut dépasser 65 535 sommets si elle est
    très fragmentée).
- Appeler `computeBoundingSphere()` sur chaque géométrie → active le **frustum
  culling** automatique de three.js par section.

## 5. Maillage d'une section (`Mesher`)

Le mesher lit le **`World`** (pas une section isolée) : les voisins d'une face à
la frontière d'une section sont donc lus correctement.

```ts
export class Mesher {
  /** construit la géométrie des faces visibles de la section (sx, sz) */
  buildSection(world: World, sx: number, sz: number): THREE.BufferGeometry;
}
```

Algorithme :

```
pour x dans [sx*16, sx*16+16):
  pour z dans [sz*16, sz*16+16):
    pour y dans [0, WORLD_Y):
      id = world.getBlock(x, y, z)
      si id == AIR: continue
      pour chaque direction d des 6 faces:
        (nx, ny, nz) = (x, y, z) + offset(d)
        si world.isSolid(nx, ny, nz): continue    # face cachée -> cull
        émettre la face d en (x, y, z):
          - 4 sommets (coins du cube sur la face d)
          - normale = normal(d)
          - couleur = (d == +Y et def.colorTop) ? colorTop : def.color
          - 2 triangles (6 indices), winding CCW vue de l'extérieur
```

- `isSolid` hors bornes = **false** (le voisin OOB vaut AIR) → les faces de bord
  du monde sont émises (falaise visible), cf. [`02-world.md`](./02-world.md) §7.
- Section vide (0 face) → géométrie vide (mesh conservé mais sans triangle).

### Référence des 6 faces

Cube unité du bloc `(x,y,z)` occupant `[x,x+1]×[y,y+1]×[z,z+1]`.

| Direction | offset voisin | normale     | face émise si voisin non solide |
| --------- | ------------- | ----------- | ------------------------------- |
| +X        | (1,0,0)       | (+1, 0, 0)  | face droite                     |
| −X        | (−1,0,0)      | (−1, 0, 0)  | face gauche                     |
| +Y        | (0,1,0)       | (0, +1, 0)  | dessus (utilise `colorTop`)     |
| −Y        | (0,−1,0)      | (0, −1, 0)  | dessous                         |
| +Z        | (0,0,1)       | (0, 0, +1)  | face avant                      |
| −Z        | (0,0,−1)      | (0, 0, −1)  | face arrière                    |

## 6. Gestion des meshes de sections (`SectionMeshManager`)

```ts
export class SectionMeshManager {
  constructor(world: World, scene: THREE.Scene);
  buildAll(): void;    // maille les 256 sections, ajoute les meshes à la scène
  flush(): void;       // reconstruit uniquement les sections dirty
}
```

- **`buildAll()`** (démarrage) : pour chaque section `(sx, sz)`, `buildSection` →
  `Mesh(geometry, sharedMaterial)` → `scene.add` → stocké dans une `Map` par
  `sectionKey`. Opération synchrone (écran de chargement simple ; Web Workers =
  post-MVP).
- **`flush()`** (chaque frame, après les interactions) :
  ```
  pour {sx, sz} dans world.takeDirtySections():
    geo = mesher.buildSection(world, sx, sz)
    mesh = map.get(key)
    mesh.geometry.dispose()      # libère l'ancienne géométrie GPU
    mesh.geometry = geo
  ```
- **Disposal** : toujours `dispose()` l'ancienne `BufferGeometry` avant de la
  remplacer (sinon fuite mémoire GPU). Le matériau, lui, est partagé et jamais
  disposé pendant la partie.

## 7. Éclairage (support du jour/nuit)

Les objets `Light` sont créés ici ; leurs valeurs sont **animées** par
[`09-day-night.md`](./09-day-night.md).

- **`HemisphereLight(skyColor, groundColor, intensity)`** : donne aux faces une
  teinte selon `normal.y` (dessus ↔ ciel, dessous ↔ sol) → **différencie les
  faces même sans soleil rasant**. Pièce maîtresse de la lisibilité voxel.
- **`DirectionalLight`** (le soleil) : direction et intensité animées sur l'arc
  jour/nuit. **Pas d'ombres portées** (`castShadow = false`) au MVP.
- **`AmbientLight`** faible : plancher de luminosité pour que la nuit ne soit
  jamais totalement noire.

```ts
export class Environment {
  constructor(scene: THREE.Scene);
  readonly hemi: THREE.HemisphereLight;
  readonly sun: THREE.DirectionalLight;
  readonly ambient: THREE.AmbientLight;
  /** appelé par DayNightCycle chaque frame */
  apply(p: {
    sunDir: Vec3; sunIntensity: number; sunColor: number;
    skyColor: number; hemiIntensity: number;
  }): void;   // met aussi à jour scene.background et scene.fog.color
}
```

## 8. Surbrillance du bloc visé (`BlockHighlight`)

- Objet **`LineSegments`** construit depuis `EdgesGeometry(BoxGeometry(1,1,1))`
  → contour d'un cube unité, matériau `LineBasicMaterial` sombre.
- Légèrement agrandi (échelle ~`1.002`) ou `polygonOffset` pour éviter le
  z-fighting avec les faces du bloc.
- Positionné au **centre du bloc visé** `(bx+0.5, by+0.5, bz+0.5)`.
- **Masqué** (`visible = false`) quand aucun bloc n'est visé.

```ts
export class BlockHighlight {
  readonly object: THREE.Object3D;         // ajouté à la scène
  setTarget(block: Vec3 | null): void;     // positionne ou masque
}
```

La cible provient du raycast d'interaction ([`07`](./07-interaction.md)).

## 9. Ordre de rendu dans la frame

Rappel (cf. [`01-architecture.md`](./01-architecture.md) §6) : le rendu vient
**en dernier**, après `sectionMeshManager.flush()` (intègre les blocs
cassés/posés) et `dayNight.update()` (lumières/ciel à jour). La hotbar et le
réticule sont un **overlay DOM** hors scène three.js
([`08`](./08-hotbar-hud.md)).

## 10. Budget de performance

| Poste                  | Estimation MVP                                            |
| ---------------------- | -------------------------------------------------------- |
| Draw calls             | ≤ 256 (1 par section) + highlight → OK                    |
| Meshes / frustum cull  | sections hors champ ignorées automatiquement             |
| Faces au démarrage     | superflat ≈ dessus 256×256 + faces de bord ≈ ~70 k faces |
| Re-mesh par édition    | 1 section (16×16×64) ± 1 voisin → reconstruction rapide   |
| Mémoire GPU            | dominée par la géométrie des dessus ; modeste            |

## 11. Questions ouvertes

- **Greedy meshing** (fusionner les faces coplanaires de même couleur) diviserait
  fortement le nombre de triangles des grandes surfaces planes. Non retenu au
  MVP (complexité) ; candidat n°1 d'optimisation post-MVP.
- **Anti-z-fighting du highlight** : échelle `1.002` vs `polygonOffset` — à
  choisir à l'implémentation selon le rendu.
- **fov** 70 : à ajuster au ressenti (75 possible).
