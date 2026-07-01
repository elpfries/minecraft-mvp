# 07 — Interaction (casser / poser)

> **Raycast voxel** depuis la caméra pour cibler un bloc et une face, puis règles
> pour **casser** et **poser**. Met à jour la surbrillance
> ([`04-rendering.md`](./04-rendering.md) §8).

## 1. Objectif

Déterminer chaque frame **quel bloc le joueur vise** (dans la limite de portée),
et appliquer casser/poser via `World.setBlock` — qui déclenche à son tour le
re-meshing de la section concernée.

## 2. Périmètre

- ✅ Raycast voxel **DDA** (Amanatides & Woo) → premier bloc solide dans la
  portée.
- ✅ `RayHit` : bloc visé, **normale de face**, **cellule adjacente** (pour
  poser).
- ✅ Casser (clic gauche) : bloc solide → `AIR`.
- ✅ Poser (clic droit) : bloc `placeable` dans la cellule adjacente si `AIR` et
  **sans chevaucher le joueur**.
- ✅ Mise à jour du highlight (chaque frame, indépendamment des clics).
- ❌ Temps de minage progressif (cassage instantané, mode créatif).
- ❌ Drops / items, sons, animations de main, interactions spécifiques par bloc.
- ❌ Maintien du clic pour répéter (voir §8).

## 3. Contrats

```ts
export interface RayHit {
  block: Vec3;      // bloc solide visé (entiers)
  normal: Vec3;     // normale de la face touchée (unitaire, vers l'origine)
  adjacent: Vec3;   // cellule vide côté face = block + normal (pour poser)
}

export class VoxelRaycaster {
  cast(origin: Vec3, dir: Vec3, maxDist: number, world: World): RayHit | null;
}

export class BlockInteraction {
  update(
    input: Input, camera: THREE.Camera, player: Player,
    world: World, hotbar: Hotbar, highlight: BlockHighlight,
  ): void;
}
```

## 4. Rayon de visée

- **Origine** = yeux du joueur = `player.position + (0, EYE_HEIGHT, 0)`.
- **Direction** = direction avant de la caméra (3D **complète**, pitch inclus) —
  `camera.getWorldDirection(...)`, normalisée.
- **Portée** = `REACH = 5` blocs (`maxDist`).

## 5. Raycast voxel (DDA)

Traversée de grille d'Amanatides & Woo : on avance de cellule en cellule le long
du rayon et on renvoie la **première cellule solide**.

```
o = origin ; d = dir (normalisé)
x,y,z = floor(o.x), floor(o.y), floor(o.z)          # cellule de départ (dans l'air)
stepX = sign(d.x)   (idem Y, Z)
tDeltaX = |1 / d.x|                                  # +∞ si d.x == 0
tMaxX = distance au 1er plan de grille en X          # +∞ si d.x == 0
   = (stepX>0 ? (floor(o.x)+1 − o.x) : (o.x − floor(o.x))) * tDeltaX
normal = (0,0,0)
t = 0
tant que t ≤ maxDist:
  si world.isSolid(x,y,z):
     return { block:(x,y,z), normal, adjacent:(x,y,z)+normal }
  # avancer dans l'axe dont la frontière est la plus proche
  si tMaxX ≤ tMaxY et tMaxX ≤ tMaxZ:
     x += stepX ; t = tMaxX ; tMaxX += tDeltaX ; normal = (−stepX, 0, 0)
  sinon si tMaxY ≤ tMaxZ:
     y += stepY ; t = tMaxY ; tMaxY += tDeltaY ; normal = (0, −stepY, 0)
  sinon:
     z += stepZ ; t = tMaxZ ; tMaxZ += tDeltaZ ; normal = (0, 0, −stepZ)
return null
```

- **Normale = face d'entrée** = opposé du pas effectué (`−step`). D'où
  `adjacent = block + normal` = la cellule (vide) d'où venait le rayon → c'est là
  qu'on pose.
- **Cellule de départ** : les yeux sont toujours dans l'air (le joueur ne peut
  pas être dans un bloc solide, cf. [`06`](./06-physics-collision.md)), donc la
  1re cellule testée n'est pas solide et `normal` est défini avant tout hit.
- `world.isSolid` **hors bornes = false** → viser le ciel/au-delà du bord →
  `null` (rien de visé).

## 6. Surbrillance

Chaque frame, **avant** de traiter les clics :

```
hit = raycaster.cast(eye, dir, REACH, world)
highlight.setTarget(hit ? hit.block : null)
```

Le contour n'apparaît que si un bloc est effectivement visé.

## 7. Casser & poser

Traité seulement si `input.isPointerLocked` était déjà vrai en début de frame
(garde anti-clic-de-capture, cf. [`05`](./05-player-controls.md) §5).

### Casser — clic gauche

```
si input.consumeClick(0) et hit:
   world.setBlock(hit.block, AIR)      # tout bloc solide est cassable (créatif)
```

### Poser — clic droit

```
si input.consumeClick(2) et hit:
   id = hotbar.selected()
   si id == AIR: return                       # slot vide -> rien à poser
   cible = hit.adjacent
   si not world.inBounds(cible): return       # (setBlock serait de toute façon no-op)
   si blocIntersecteJoueur(cible, player): return   # ne pas s'emmurer
   world.setBlock(cible, id)
```

- **`cible` est forcément `AIR`** : c'est la cellule que le rayon traversait juste
  avant d'entrer dans le bloc solide → non solide par construction du DDA.
- **`blocIntersecteJoueur`** : test de recouvrement AABB entre le cube
  `[cx,cx+1]×[cy,cy+1]×[cz,cz+1]` et l'AABB du joueur
  ([`06`](./06-physics-collision.md) §5). Recouvrement ⇒ pose annulée (on évite
  de se coincer dans un bloc).

```
blocIntersecteJoueur(c, player):
  p = playerAABB(player.position)
  return c.x < p.max.x and c.x+1 > p.min.x
     and c.y < p.max.y and c.y+1 > p.min.y
     and c.z < p.max.z and c.z+1 > p.min.z
```

Toute mutation passe par `world.setBlock`, qui marque la (les) section(s)
dirty ; le re-meshing suit dans `SectionMeshManager.flush()`
([`04`](./04-rendering.md) §6) la même frame.

## 8. Ordre dans la boucle

`interaction.update()` s'exécute **après** la physique (le joueur a bougé, le
rayon part de sa position à jour) et **avant** `flush()` (les blocs modifiés
sont maillés dans la même frame). Cf. [`01-architecture.md`](./01-architecture.md)
§6.

## 9. Questions ouvertes

- **Maintien du clic** pour casser/poser en rafale : MVP en 1 action par clic
  (`consumeClick`). Ajout possible : répétition avec cadence (ex. toutes les
  ~200 ms) tant que le bouton est enfoncé.
- **Poser sur soi** : si aucune face libre n'est visée, rien ne se pose (normal).
- **Précision du DDA aux arêtes** : l'ordre des comparaisons `≤` fixe le
  comportement sur les diagonales parfaites ; sans impact perceptible au jeu.
