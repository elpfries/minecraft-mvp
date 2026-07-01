// Orchestration : possède tous les systèmes et pilote la boucle de jeu.
// Ordre de la frame : cf. specs/01 §6.

import { EYE_HEIGHT, FIXED_DT, WORLD_X, WORLD_Z } from "./core/constants";
import { Clock } from "./core/Clock";
import { Input } from "./input/Input";
import { BlockHighlight } from "./interaction/BlockHighlight";
import { BlockInteraction } from "./interaction/BlockInteraction";
import { FirstPersonCamera } from "./player/FirstPersonCamera";
import { Physics } from "./player/Physics";
import { Player } from "./player/Player";
import { PlayerController } from "./player/PlayerController";
import { Environment } from "./render/Environment";
import { Renderer } from "./render/Renderer";
import { SectionMeshManager } from "./render/SectionMeshManager";
import { DayNightCycle } from "./time/DayNightCycle";
import { Crosshair } from "./ui/Crosshair";
import { Hotbar } from "./ui/Hotbar";
import { World } from "./world/World";
import { WorldGenerator } from "./world/WorldGenerator";

export class Game {
  private renderer: Renderer;
  private world: World;
  private meshManager: SectionMeshManager;
  private environment: Environment;
  private player: Player;
  private camera: FirstPersonCamera;
  private controller: PlayerController;
  private physics: Physics;
  private input: Input;
  private interaction: BlockInteraction;
  private highlight: BlockHighlight;
  private hotbar: Hotbar;
  private crosshair: Crosshair;
  private dayNight: DayNightCycle;

  private clock = new Clock();
  private accumulator = 0;
  private overlay: HTMLElement;

  constructor(container: HTMLElement) {
    this.renderer = new Renderer(container);

    this.world = new World(new WorldGenerator());
    this.meshManager = new SectionMeshManager(this.world, this.renderer.scene);
    this.meshManager.buildAll();

    this.environment = new Environment(this.renderer.scene);

    // Spawn au centre du monde, posé sur la surface (relief variable).
    const cx = Math.floor(WORLD_X / 2);
    const cz = Math.floor(WORLD_Z / 2);
    this.player = new Player({
      x: cx + 0.5,
      y: this.world.columnTop(cx, cz) + 1,
      z: cz + 0.5,
    });
    this.camera = new FirstPersonCamera();
    this.controller = new PlayerController();
    this.physics = new Physics();

    this.input = new Input(this.renderer.domElement);

    this.interaction = new BlockInteraction();
    this.highlight = new BlockHighlight();
    this.renderer.scene.add(this.highlight.object);

    this.hotbar = new Hotbar();
    this.hotbar.mount(container);
    this.crosshair = new Crosshair();
    this.crosshair.mount(container);

    this.dayNight = new DayNightCycle(this.environment);

    this.overlay = this.createOverlay(container);
  }

  start(): void {
    const loop = (now: number) => {
      const dt = this.clock.tick(now);
      this.accumulator += dt;

      this.input.beginFrame();

      // Regard souris : UNE fois par frame (hors boucle à pas fixe)
      this.camera.applyMouse(this.input.mouseDX, this.input.mouseDY);

      // Physique à pas fixe
      while (this.accumulator >= FIXED_DT) {
        this.controller.update(FIXED_DT, this.input, this.player, this.camera);
        this.physics.step(FIXED_DT, this.world, this.player);
        this.accumulator -= FIXED_DT;
      }

      // Caméra suit les yeux du joueur
      const p = this.player.position;
      this.camera.updateCamera(this.renderer.camera, {
        x: p.x,
        y: p.y + EYE_HEIGHT,
        z: p.z,
      });

      // Interactions (raycast + casser/poser) puis UI
      this.interaction.update(
        this.input,
        this.renderer.camera,
        this.player,
        this.world,
        this.hotbar,
        this.highlight,
      );
      this.hotbar.update(this.input);

      // Meshing des sections modifiées, puis environnement
      this.meshManager.flush();
      this.dayNight.update(dt);

      this.overlay.style.display = this.input.isPointerLocked ? "none" : "flex";

      this.input.endFrame();
      this.renderer.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  private createOverlay(container: HTMLElement): HTMLElement {
    const el = document.createElement("div");
    el.textContent = "Cliquer pour jouer";
    Object.assign(el.style, {
      position: "absolute",
      inset: "0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#ffffff",
      font: "600 24px system-ui, sans-serif",
      background: "rgba(0,0,0,0.45)",
      pointerEvents: "none", // le clic traverse vers le canvas (pointer lock)
      userSelect: "none",
    } as CSSStyleDeclaration);
    container.appendChild(el);
    return el;
  }
}
