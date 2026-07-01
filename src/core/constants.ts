// Constantes globales du jeu. Cf. specs/00, 02, 05, 06, 09.

// --- Monde ---
export const WORLD_X = 256;
export const WORLD_Y = 64;
export const WORLD_Z = 256;
export const SECTION = 16;
export const SECTIONS_X = WORLD_X / SECTION; // 16
export const SECTIONS_Z = WORLD_Z / SECTION; // 16

// --- Génération superflat ---
export const GROUND_HEIGHT = 32; // y de la couche d'herbe
export const DIRT_LAYERS = 3; // couches de terre sous l'herbe

// --- Physique ---
export const GRAVITY = -25; // blocs/s²
export const MAX_FALL = -50; // vitesse de chute max (blocs/s)
export const FIXED_DT = 1 / 60; // pas fixe de la physique
export const EPS = 1e-3; // marge anti-accroche

// --- Joueur ---
export const MOVE_SPEED = 5; // blocs/s
export const JUMP_SPEED = 7.75; // ~1,2 bloc de hauteur
export const PLAYER_WIDTH = 0.6;
export const PLAYER_HEIGHT = 1.8;
export const EYE_HEIGHT = 1.6;

// --- Interaction ---
export const REACH = 5; // portée casser/poser (blocs)

// --- Caméra ---
export const FOV = 70;
export const NEAR = 0.1;
export const FAR = 1000;
export const MOUSE_SENSITIVITY = 0.0022; // rad/pixel
export const PITCH_MAX = (89 * Math.PI) / 180;

// --- Jour/nuit ---
export const DAY_LENGTH = 180; // secondes / cycle complet
export const DAY_START = 0.3; // t initial (matin)
