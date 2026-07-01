# Minecraft MVP

MVP d'un jeu type Minecraft construit avec **TypeScript**, **three.js** et **Vite**.

> ⚠️ Projet en phase de **spécification**. Le code de gameplay n'est pas encore
> implémenté : nous rédigeons d'abord les specs dans [`specs/`](./specs/).

## Prérequis

- [Node.js](https://nodejs.org/) ≥ 18
- npm (fourni avec Node)

## Installation

```bash
npm install
```

## Scripts

| Commande            | Description                                      |
| ------------------- | ------------------------------------------------ |
| `npm run dev`       | Lance le serveur de dev Vite (http://localhost:5173) |
| `npm run build`     | Vérifie les types puis build de production        |
| `npm run preview`   | Sert le build de production en local              |
| `npm run typecheck` | Vérifie les types sans émettre de fichiers        |

## Structure

```
minecraft-mvp/
├── index.html          # Page hôte (monte src/main.ts)
├── public/             # Assets statiques servis tels quels
├── specs/              # 📄 Spécifications (à rédiger — voir specs/README.md)
├── src/
│   ├── main.ts         # Point d'entrée (vide pour l'instant)
│   ├── style.css       # Styles globaux
│   └── vite-env.d.ts   # Types Vite
├── tsconfig.json       # Config TypeScript (app)
├── tsconfig.node.json  # Config TypeScript (outillage / vite.config)
└── vite.config.ts      # Config Vite (alias @ -> src)
```

## Convention d'import

L'alias `@` pointe vers `src/` :

```ts
import { Chunk } from "@/world/Chunk";
```
