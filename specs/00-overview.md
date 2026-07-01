# 00 — Overview & Périmètre du MVP

> Document fondateur. Il fige **ce qu'on fait** et surtout **ce qu'on ne fait
> pas**. Tous les autres documents doivent rester dans ce périmètre.

## 1. Vision

Un mini-Minecraft **jouable dans le navigateur**. Le joueur explore un monde
de blocs plat en vue première personne, marche dessus (avec gravité et
collisions), **casse et pose** des blocs choisis dans une **hotbar**, le tout
sous un **cycle jour/nuit**. Mode **créatif** : blocs illimités, pas de santé
ni de survie.

Objectif du MVP : valider la boucle cœur *(voir → viser → casser/poser → se
déplacer)* avec un rendu fluide, sans s'encombrer des systèmes lourds (survie,
génération procédurale, réseau).

## 2. Definition of Done

Le MVP est considéré terminé quand, dans un navigateur desktop récent :

- [ ] Le jeu se lance via `npm run dev` sans erreur.
- [ ] Un monde plat texturé est affiché.
- [ ] La caméra est en vue FPS avec **pointer lock** (souris = regard).
- [ ] Le joueur se déplace (WASD), **saute**, **tombe** et **entre en
      collision** avec les blocs (ne traverse ni le sol ni les murs de blocs).
- [ ] Un réticule au centre indique le bloc visé ; le bloc ciblé est
      surligné.
- [ ] **Clic gauche** casse le bloc visé, **clic droit** pose le bloc
      sélectionné sur la face visée.
- [ ] La **hotbar** permet de choisir le type de bloc à poser (molette /
      touches chiffres).
- [ ] Le **ciel et la lumière** évoluent selon un cycle jour/nuit.
- [ ] Performance cible : **60 FPS** sur une machine récente.

## 3. Périmètre

### ✅ Dans le MVP

| Domaine        | Décision                                                         |
| -------------- | --------------------------------------------------------------- |
| Mode de jeu    | **Créatif** (blocs illimités, pas de santé/faim/dégâts)          |
| Monde          | **Plat (superflat)**, fini, généré au démarrage                  |
| Déplacement    | **Marche + gravité + saut + collisions** (AABB), vue FPS         |
| Interaction    | **Casser / poser** des blocs via raycasting                     |
| UI             | **Hotbar** (choix du bloc) + réticule                           |
| Ambiance       | **Cycle jour/nuit** (ciel + lumière directionnelle)             |
| Blocs          | Une **poignée de types** (voir §7)                              |
| Rendu          | three.js, meshing des faces visibles uniquement                 |

### ❌ Hors MVP (explicitement exclu)

Ces éléments sont **volontairement écartés** pour rester léger. Ils pourront
faire l'objet d'itérations ultérieures.

- **Survie** : santé, faim, dégâts de chute, mort, respawn.
- **Craft** et inventaire complet (coffres, stacks, drag & drop).
- **Génération procédurale** : relief, bruit, biomes, grottes, arbres.
- **Monde infini / streaming de chunks** autour du joueur.
- **Sauvegarde / chargement** (localStorage / IndexedDB) — *reporté*.
- **Multijoueur / réseau**.
- **Mobs, PNJ, IA, entités** (items au sol, projectiles…).
- **Fluides** (eau, lave) et leur physique.
- **Sons / musique** — *reporté*.
- **Redstone**, mécanismes, portes, etc.
- **Éclairage par propagation** (light levels façon Minecraft). Le cycle
  jour/nuit du MVP agit sur la lumière **globale**, pas sur un éclairage
  bloc-par-bloc.

## 4. Contraintes techniques

- **Langage** : TypeScript en mode `strict`.
- **Rendu** : three.js (WebGL).
- **Build / dev** : Vite.
- **Plateforme** : navigateur **desktop** (Chrome / Firefox récents).
- **Entrées** : clavier + souris, **Pointer Lock API** pour le regard.
- **Perf** : viser 60 FPS ; le monde plat fini garde la charge maîtrisée.

## 5. Boucle de jeu (haut niveau)

```
init()                      # scène, monde, joueur, UI, lumières
loop(dt):                   # requestAnimationFrame
  1. lire les entrées       # clavier / souris / molette
  2. mettre à jour joueur   # intention de déplacement + gravité
  3. résoudre collisions    # AABB joueur vs blocs
  4. interactions           # raycast + casser/poser si clic
  5. cycle jour/nuit        # avancer le temps, MAJ lumière + ciel
  6. render()               # dessiner la scène
```

Le détail (ordre précis, sous-systèmes, découpage en modules) est traité dans
[`01-architecture.md`](./01-architecture.md).

## 6. Dimensions du monde (verrouillé)

- **Emprise horizontale** : **256 × 256** blocs en X/Z (monde fini).
- **Hauteur** : **64** blocs.
- **Total** : ~**4,2 M blocs** → 1 octet/bloc = **~4,2 Mo** en mémoire
  (`Uint8Array`), acceptable.
- **Superflat** : couches fixes, du bas (y=0) vers le haut :
  - `y` bas : **pierre**
  - au-dessus : **terre** (quelques couches)
  - surface : **herbe** (1 couche)
  - au-dessus : **air**
- **Bords du monde** : **mur invisible** — le joueur est borné et ne peut pas
  tomber hors du monde.

> **Implication de performance (importante).** Avec 256×256, re-mailler le
> monde entier à chaque bloc modifié saccaderait. Le monde est donc **découpé
> en sections** (p. ex. colonnes **16×16** sur toute la hauteur) : seule la
> section touchée (et ses voisines en bordure) est re-maillée. Ce n'est **pas**
> du streaming de chunks (tout le monde reste chargé) — juste une granularité
> de meshing. Détaillé dans [`04-rendering.md`](./04-rendering.md).

> Valeurs figées ici ; structure de données détaillée dans
> [`02-world.md`](./02-world.md).

## 7. Types de blocs du MVP (proposition)

| ID (concept) | Nom      | Rôle                                  |
| ------------ | -------- | ------------------------------------- |
| `air`        | Air      | Vide, non rendu, traversable          |
| `grass`      | Herbe    | Surface                               |
| `dirt`       | Terre    | Sous la surface                       |
| `stone`      | Pierre   | Profondeur                            |
| `sand`       | Sable    | Bloc posable                          |
| `wood`       | Bois     | Bloc posable                          |

Le registre exact, les textures et les propriétés sont définis dans
[`03-block-system.md`](./03-block-system.md).

## 8. Décisions verrouillées

| Sujet                  | Décision                                                     |
| ---------------------- | ----------------------------------------------------------- |
| Taille du monde        | **256 × 256 × 64**                                           |
| Bords du monde         | **Mur invisible** (pas de chute hors du monde)              |
| Hotbar                 | **9 slots**, pré-remplie avec les blocs posables            |
| Textures               | **Couleurs unies** par bloc (atlas d'images = post-MVP)     |
| Cycle jour/nuit        | **3 min** par cycle complet ; agit sur **ciel + lumière ambiante/directionnelle** (pas d'éclairage par bloc) |
| Vitesse de déplacement | ~**5 blocs/s** (à affiner au ressenti)                       |
| Hauteur de saut        | ~**1,2 bloc** (à affiner au ressenti)                       |

Les valeurs marquées « à affiner » seront ajustées empiriquement pendant
l'implémentation ; elles sont détaillées dans
[`05-player-controls.md`](./05-player-controls.md) et
[`06-physics-collision.md`](./06-physics-collision.md).

## 8bis. Questions encore ouvertes

- Aucune bloquante à ce stade. (À rouvrir si un point ci-dessus s'avère
  inadapté au ressenti de jeu.)

## 9. Ordre de rédaction des specs

1. [`01-architecture.md`](./01-architecture.md) — modules & flux de données
2. [`02-world.md`](./02-world.md) — monde plat, structure de données des blocs
3. [`03-block-system.md`](./03-block-system.md) — registre & propriétés des blocs
4. [`04-rendering.md`](./04-rendering.md) — scène, meshing, matériaux
5. [`05-player-controls.md`](./05-player-controls.md) — caméra FPS & entrées
6. [`06-physics-collision.md`](./06-physics-collision.md) — gravité & AABB
7. [`07-interaction.md`](./07-interaction.md) — raycast, casser / poser
8. [`08-hotbar-hud.md`](./08-hotbar-hud.md) — hotbar & réticule
9. [`09-day-night.md`](./09-day-night.md) — cycle jour/nuit
