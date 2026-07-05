# 09 — Cycle jour/nuit

> Le temps avance sur un cycle de **6 minutes**. On en déduit la **direction du
> soleil** et les **couleurs/intensités** (ciel, brouillard, soleil, hémisphère,
> ambiante), poussées vers `Environment` ([`04-rendering.md`](./04-rendering.md)
> §7). Aucun éclairage par bloc.

## 1. Objectif

Donner de l'ambiance et un rythme au monde en animant **globalement** la lumière
et le ciel, sans coût par bloc ni ombres portées.

## 2. Périmètre

- ✅ Temps normalisé `t ∈ [0,1)`, cycle `DAY_LENGTH = 360 s`.
- ✅ Arc du soleil (direction) en fonction de `t`.
- ✅ Interpolation des couleurs/intensités entre **keyframes**.
- ✅ Pilotage de `Environment.apply(...)` chaque frame.
- ❌ Lune, étoiles, nuages, météo.
- ❌ Éclairage par bloc / propagation de lumière, ombres portées.

## 3. Modèle temporel

```
t ← (t + dt / DAY_LENGTH) mod 1        // dt variable (phase environnement)
```

Repères (convention retenue) :

| `t`   | Moment      |
| ----- | ----------- |
| 0.00  | minuit      |
| 0.25  | lever       |
| 0.50  | midi        |
| 0.75  | coucher     |

- **Départ** : `t0 = 0.30` (matin) → le joueur spawn en plein jour
  ([`00-overview.md`](./00-overview.md) : spawn « matin »).

## 4. Direction du soleil

Angle `phi = (t − 0.25) · 2π` (décalé pour que le lever soit à l'horizon est) :

```
sunDir = normalize( (cos(phi), sin(phi), 0.20) )   // léger biais en Z (arc non vertical)
```

- `t=0.25` → `phi=0` → soleil à l'**horizon est** `(1,0,~0)`.
- `t=0.50` → `phi=π/2` → soleil **au zénith** `(0,1,~0)`.
- `t=0.75` → `phi=π` → soleil à l'**horizon ouest** `(-1,0,~0)`.
- `t=0.00` → soleil **sous l'horizon** `(0,-1,~0)` (nuit).

La `DirectionalLight` éclaire depuis `sunDir` : `sun.position = sunDir · D`
(grande distance `D`), cible `(0,0,0)`. Le léger biais en Z évite que les 4 faces
verticales soient éclairées identiquement à midi (complément de la
`HemisphereLight`).

## 5. Couleurs & intensités (keyframes)

Valeurs interpolées **linéairement** en fonction de `t` entre les keyframes
ci-dessous (couleurs en lerp RGB, intensités en lerp scalaire). Le tableau est
**cyclique** (après 0.75 on revient vers 1.00 = 0.00).

| `t`  | phase    | `skyColor` (= fog) | `sunColor` | `sunI` | `hemiI` | `ambI` |
| ---- | -------- | ------------------ | ---------- | ------ | ------- | ------ |
| 0.00 | minuit   | `0x05080F`         | `0x223055` | 0.00   | 0.15    | 0.10   |
| 0.22 | aube     | `0x243056`         | `0xFF9955` | 0.10   | 0.30    | 0.12   |
| 0.28 | lever    | `0xF2A25C`         | `0xFFB066` | 0.70   | 0.55    | 0.18   |
| 0.50 | midi     | `0x87CEEB`         | `0xFFFFFF` | 1.00   | 0.90    | 0.25   |
| 0.72 | coucher  | `0xE8613C`         | `0xFF7A3C` | 0.60   | 0.50    | 0.16   |
| 0.80 | crépusc. | `0x1A2340`         | `0x334066` | 0.10   | 0.25    | 0.12   |
| 1.00 | minuit   | `0x05080F`         | `0x223055` | 0.00   | 0.15    | 0.10   |

> Colonnes : `skyColor` sert **à la fois** au fond de scène et à la couleur du
> fog ; `sunColor`/`sunI` = `DirectionalLight` ; `hemiI` = intensité
> `HemisphereLight` ; `ambI` = `AmbientLight`. Valeurs **indicatives**, à affiner
> visuellement.

Interpolation :

```
trouver les keyframes (a, b) encadrant t (cycliques)
f = (t − a.t) / (b.t − a.t)
skyColor  = lerpColor(a.sky,  b.sky,  f)
sunColor  = lerpColor(a.sun,  b.sun,  f)
sunI      = lerp(a.sunI, b.sunI, f)     # idem hemiI, ambI
```

## 6. HemisphereLight (couleurs)

- `groundColor` : teinte sombre stable (p. ex. `0x3A3529`) — reflet du sol vers
  les faces basses.
- `skyColor` (de l'hémisphère) : peut suivre le `skyColor` courant, ou rester un
  bleu doux fixe ; au MVP on peut le **fixer** et n'animer que `hemiI`. À trancher
  au ressenti.

## 7. Contrat

```ts
export class DayNightCycle {
  t: number;                                  // [0,1)
  constructor(env: Environment, t0?: number); // défaut 0.30
  update(dt: number): void;                   // avance t, calcule, env.apply(...)
}
```

`update` :

```
t = (t + dt / DAY_LENGTH) % 1
phi = (t − 0.25) * 2π
sunDir = normalize((cos phi, sin phi, 0.20))
{sky, sunColor, sunI, hemiI, ambI} = interpoler(t)
env.apply({ sunDir, sunIntensity: sunI, sunColor,
            skyColor: sky, hemiIntensity: hemiI /*, ambI */ })
```

`Environment.apply` met à jour : `sun.position`/`sun.color`/`sun.intensity`,
`hemi.intensity`, `ambient.intensity`, `scene.background` et `scene.fog.color`
(cf. [`04-rendering.md`](./04-rendering.md) §7).

## 8. Ordre dans la boucle

`dayNight.update(dt)` s'exécute dans la phase « environnement », **après** le
meshing et **avant** le rendu ([`01-architecture.md`](./01-architecture.md) §6),
en `dt` variable (pas besoin du pas fixe).

## 9. Questions ouvertes

- **Durée** : 6 min (`DAY_LENGTH=360`). Ajustable ; touche debug pour accélérer
  le temps utile en dev (optionnel).
- **HemisphereLight animée vs fixe** (voir §6).
- **Nuit trop sombre ?** `ambI`/`hemiI` de nuit à régler pour rester jouable
  sans passer en « vision nocturne ».
- **Espace d'interpolation** : lerp RGB simple au MVP (léger virage de teinte
  possible sur certaines transitions) ; HSL/perceptuel = raffinement.
