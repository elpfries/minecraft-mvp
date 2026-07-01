import "./style.css";
import { Game } from "./Game";

// Point d'entrée : monte le jeu dans #app.
const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("#app introuvable");

// #app doit contenir le HUD en overlay au-dessus du canvas.
app.style.position = "relative";

const game = new Game(app);
game.start();
