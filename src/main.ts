import "./style.css";
import { Game } from "./Game";
import { loadAtlas } from "./render/atlas";

// Point d'entrée : charge l'atlas de textures puis monte le jeu dans #app.
const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("#app introuvable");

// #app doit contenir le HUD en overlay au-dessus du canvas.
app.style.position = "relative";

loadAtlas()
  .then((atlas) => {
    const game = new Game(app, atlas);
    game.start();
  })
  .catch((err) => {
    console.error("Échec du chargement des textures :", err);
  });
