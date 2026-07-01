# 06 — Physique & collisions

> Gravité, intégration du mouvement, et **résolution des collisions AABB contre
> la grille de blocs, axe par axe**. Détection de `onGround`, plafond, et **mur
> invisible** des bords du monde.

## 1. Objectif

Faire tomber, marcher et sauter le joueur de façon **stable et sans traversée de
blocs**, avec une résolution de collision simple (AABB vs voxels) exécutée à
**pas de temps fixe**.

## 2. Périmètre

- ✅ Gravité + vitesse terminale.
- ✅ Intégration à pas fixe (`FIXED_DT = 1/60`).
- ✅ Résolution **axe par axe** (anti-tunneling, anti-accroche aux coins).
- ✅ `onGround`, choc au plafond.
- ✅ Mur invisible aux bords (clamp de position).
- ❌ Montée automatique de marche (« step-up »), pentes.
- ❌ Collisions entité/entité, fluides, poussée.
- ❌ Sous-échantillonnage (inutile : déplacement < 1 bloc/pas, voir §7).

## 3. Entrée / sortie

```ts
export class Physics {
  /** applique gravité + intègre + résout les collisions, MAJ player */
  step(dt: number, world: World, player: Player): void;   // dt = FIXED_DT
}
```

- **Entrée** : `player.velocity` a déjà ses composantes **horizontales** posées
  par `PlayerController` ; `velocity.y` peut valoir `JUMP_SPEED` si saut cette
  frame.
- **Sortie** : `player.position` déplacée et **corrigée**, `player.velocity`
  ajustée (composantes annulées en cas de contact), `player.onGround` à jour.

## 4. Constantes

| Constante        | Valeur | Rôle                                            |
| ---------------- | ------ | ----------------------------------------------- |
| `GRAVITY`        | −25    | accélération verticale (blocs/s²)               |
| `MAX_FALL`       | −50    | vitesse de chute max (blocs/s) → < 1 bloc/pas   |
| `PLAYER_WIDTH`   | 0.6    | côté X/Z de l'AABB                              |
| `PLAYER_HEIGHT`  | 1.8    | hauteur de l'AABB                               |
| `EPS`            | 1e-3   | marge anti-accroche lors des snaps              |

## 5. AABB du joueur

`player.position` = **pieds** (centre-bas). L'AABB en découle :

```
half = PLAYER_WIDTH / 2         // 0.3
min = (x − half, y,               z − half)
max = (x + half, y + PLAYER_HEIGHT, z + half)
```

Asymétrie en Y à retenir : `min.y = position.y` (pieds), `max.y =
position.y + 1.8` (sommet de la tête).

## 6. Algorithme de `step`

```
# 1. Gravité
player.velocity.y = max(player.velocity.y + GRAVITY * dt, MAX_FALL)

# 2. Intégration + collision, UN AXE À LA FOIS (ordre : X, Z, Y)
moveAxis('x', player.velocity.x * dt)
moveAxis('z', player.velocity.z * dt)
player.onGround = false
moveAxis('y', player.velocity.y * dt)      # met onGround = true si contact bas

# 3. Mur invisible (bords du monde)
clampToWorld(player)
```

Résoudre **axe par axe** (et non le vecteur entier d'un coup) évite deux bugs
classiques : la traversée dans les coins et l'accroche fantôme sur des arêtes.

### `moveAxis(axis, delta)`

```
position[axis] += delta
aabb = playerAABB(position)

# cellules de blocs chevauchées par l'AABB (bornes in-monde uniquement)
cells = tous (bx,by,bz) entiers tels que le cube [b,b+1] chevauche aabb
for (bx,by,bz) in cells:
  if not world.isSolid(bx, by, bz): continue          # OOB -> non solide
  # collision sur cet axe -> on recolle au contact
  if delta > 0:
     position[axis] = (borne_min_solide) − taille_positive[axis] − EPS
  else if delta < 0:
     position[axis] = (borne_max_solide) + taille_negative[axis] + EPS
  velocity[axis] = 0
  if axis == 'y' and delta < 0: onGround = true        # posé au sol
  if axis == 'y' and delta > 0: (choc plafond, velocity.y déjà 0)
  break
```

- **Bornes du snap** (rappel AABB asymétrique en Y) :
  - X/Z, `delta>0` : `position[axis] = floor(aabb.max[axis]) − half − EPS`.
  - X/Z, `delta<0` : `position[axis] = ceil(aabb.min[axis]) + half + EPS`.
  - Y, `delta<0` (chute) : `position.y = floor(aabb.min.y) + 1 + EPS` (posé sur
    le dessus du bloc).
  - Y, `delta>0` (saut) : `position.y = ceil(aabb.max.y) − PLAYER_HEIGHT − EPS`.
- **Plage de cellules** : `bx ∈ [floor(min.x), floor(max.x − EPS)]`, idem y, z.
  L'`EPS` évite de capter la cellule collée exactement à une face entière.
- `world.isSolid` **hors bornes = false** : le scan ne bloque jamais sur du vide
  extérieur ; c'est le clamp (§ suivant) qui borne le joueur.

## 7. Garantie anti-tunneling

Déplacement max par pas fixe :
- horizontal : `MOVE_SPEED/60 = 5/60 ≈ 0.083` bloc,
- vertical (chute) : `|MAX_FALL|/60 = 50/60 ≈ 0.83` bloc,
- vertical (saut) : `JUMP_SPEED/60 = 7.75/60 ≈ 0.13` bloc.

Tous **< 1 bloc/pas** → l'AABB ne peut pas « sauter » par-dessus un bloc sans le
chevaucher. Aucun sous-échantillonnage n'est nécessaire. (C'est pourquoi
`MAX_FALL` est plafonné.)

## 8. `onGround`

- Remis à `false` **avant** la résolution Y, mis à `true` si un contact vers le
  bas se produit pendant `moveAxis('y', …)`.
- **Truc du grounded stable** : la gravité applique chaque pas un petit `delta`
  vers le bas ; un joueur au sol tente donc toujours un micro-déplacement
  descendant, bloqué immédiatement → `onGround` reste `true` tant qu'il est posé.
  Le saut ([`05`](./05-player-controls.md) §7) n'est autorisé que si `onGround`.

## 9. Mur invisible aux bords (`clampToWorld`)

Réalisation concrète du « bord = solide pour la physique horizontale »
([`02-world.md`](./02-world.md) §7) : plutôt que de traiter les colonnes OOB
comme solides, on **borne la position** du joueur.

```
half = PLAYER_WIDTH / 2
position.x = clamp(position.x, half, WORLD_X − half)
position.z = clamp(position.z, half, WORLD_Z − half)
si borné sur un axe -> velocity de cet axe = 0
```

- Pas de plafond (hauteur 64 hors d'atteinte à la marche), pas de plancher sous
  `y=0` (la pierre bloque bien avant).

## 10. Ordre dans la boucle

`PlayerController.update` (pose vx, vz, saut) **puis** `Physics.step` (gravité +
intégration + collisions), tous deux dans la boucle à pas fixe
([`01-architecture.md`](./01-architecture.md) §6). Plusieurs sous-pas fixes
peuvent s'exécuter par frame de rendu.

## 11. Questions ouvertes

- **Step-up** (monter une marche d'1 bloc sans sauter) : absent au MVP ; le
  joueur doit sauter. Ajout possible plus tard.
- **Coyote time / jump buffering** (petite tolérance de saut) : non-MVP,
  confort.
- **Collision « tête sous un bloc posé »** : poser un bloc dans le joueur est
  interdit côté interaction ([`07`](./07-interaction.md)), donc pas de coincement
  provoqué par la pose.
