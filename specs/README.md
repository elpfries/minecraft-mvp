# Spécifications — Minecraft MVP

Ce dossier contient les spécifications du jeu. On les rédige **avant**
d'implémenter. Chaque document décrit un domaine : objectif, données,
comportements attendus, et périmètre (ce qui est **dans** le MVP vs **hors**).

## Périmètre retenu (voir `00-overview.md`)

Mode **créatif** · monde fini avec **relief procédural** (plaines, collines,
montagnes) · **forêts** groupées · **marche + gravité + collisions** ·
**casser/poser** · **hotbar** · **cycle jour/nuit**.
Hors MVP : survie, **biomes/grottes/minerais/structures**, chunks infinis,
**sauvegarde**, réseau, mobs, sons.

## Documents prévus

| #   | Document                    | Contenu                                                        | État |
| --- | --------------------------- | ------------------------------------------------------------- | ---- |
| 00  | `00-overview.md`            | Vision, périmètre MVP, ce qui est explicitement hors-scope     | ✅   |
| 01  | `01-architecture.md`        | Modules, flux de données, boucle de jeu, choix techniques      | ✅   |
| 02  | `02-world.md`               | Structure des blocs + relief procédural (collines/montagnes)   | ✅   |
| 03  | `03-block-system.md`        | Types de blocs, registre, propriétés, textures                 | ✅   |
| 04  | `04-rendering.md`           | Scène three.js, meshing des faces visibles, matériaux, ciel    | ✅   |
| 05  | `05-player-controls.md`     | Caméra FPS, déplacements, pointer lock, entrées clavier/souris | ✅   |
| 06  | `06-physics-collision.md`   | Gravité, AABB, collisions joueur/monde                         | ✅   |
| 07  | `07-interaction.md`         | Raycasting, casser / poser des blocs, sélection                | ✅   |
| 08  | `08-hotbar-hud.md`          | Hotbar, sélection de bloc, réticule                            | ✅   |
| 09  | `09-day-night.md`           | Cycle jour/nuit : ciel + lumière directionnelle                | ✅   |
| 10  | `10-trees.md`               | Bloc feuille, générateur de chêne, forêts (bruit de densité)   | ✅   |
| 11  | `11-tests.md`               | Tests unitaires (Vitest) : cibles, conventions, séances        | ✅   |

> Hors périmètre MVP (non planifiés) : persistance, performance/chunks,
> génération procédurale **avancée** (biomes, grottes, minerais, structures).
> Le relief simple (collines/montagnes/forêts) est, lui, dans le MVP. À rouvrir
> en post-MVP si besoin.

Légende : ⬜ à écrire · 🟨 brouillon (à valider) · ✅ validé

## Méthode de rédaction

Pour chaque document, on suit la même trame :

1. **Objectif** — à quoi sert ce système en une phrase.
2. **Périmètre MVP** — ce qu'on fait / ce qu'on ne fait pas.
3. **Données** — structures, types, unités.
4. **Comportements** — règles précises, cas limites.
5. **Interfaces** — comment ce système est utilisé par les autres.
6. **Questions ouvertes** — décisions à trancher.

## Prochaine étape

Commencer par `00-overview.md` pour figer le **périmètre du MVP** avant tout le
reste — c'est lui qui cadre la profondeur de tous les autres documents.
