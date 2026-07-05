// Constantes globales du jeu. Cf. specs/00, 02, 05, 06, 09.

// --- Monde ---
export const WORLD_X = 256;
export const WORLD_Y = 64;
export const WORLD_Z = 256;
export const SECTION = 16;
export const SECTIONS_X = WORLD_X / SECTION; // 16
export const SECTIONS_Z = WORLD_Z / SECTION; // 16

// --- Génération du terrain (relief) cf. specs/02 ---
export const WORLD_SEED = 1337; // graine du monde (génération déterministe)
export const DIRT_LAYERS = 3; // couches de terre sous l'herbe

export const TERRAIN_BASE = 18; // altitude de base (plaines)
export const HILL_FREQ = 1 / 32; // fréquence des collines
export const HILL_AMP = 10; // amplitude des collines (arrondies)
export const HILL_OCTAVES = 4;

export const MTN_REGION_FREQ = 1 / 96; // fréquence des zones montagneuses
export const MTN_REGION_LO = 0.5; // seuil bas d'apparition des montagnes
export const MTN_REGION_HI = 0.78; // seuil haut (montagnes pleines)
export const MTN_FREQ = 1 / 40; // fréquence des crêtes
export const MTN_AMP = 34; // amplitude des montagnes (pointues)
export const MTN_SHARPNESS = 2.2; // exposant -> pics acérés

export const STONE_LINE = 38; // au-dessus : surface rocheuse (pierre apparente)
export const STEEP_SLOPE = 3; // pente (Δh) au-delà de laquelle la pierre affleure

// --- Forêts & arbres (cf. specs/10) ---
export const FOREST_FREQ = 1 / 40; // fréquence des zones de forêt
export const FOREST_THRESHOLD = 0.55; // en dessous : plaine sans arbre
export const FOREST_FULL = 0.78; // au-dessus : densité maximale
export const TREE_MIN_HEIGHT = 4; // hauteur de tronc min
export const TREE_MAX_HEIGHT = 6; // hauteur de tronc max
export const TREE_SPACING = 3; // rayon d'exclusion entre troncs (forêts touffues)
export const TREE_ATTEMPTS = 8000; // tentatives de placement (beaucoup sont rejetées)

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
// Poser un bloc : clic droit OU cette touche (utile sans bouton droit, ex. Magic Mouse)
export const PLACE_KEY = "KeyE";

// --- Caméra ---
export const FOV = 70;
export const NEAR = 0.1;
export const FAR = 1000;
export const MOUSE_SENSITIVITY = 0.0022; // rad/pixel
export const PITCH_MAX = (89 * Math.PI) / 180;

// --- Jour/nuit ---
export const DAY_LENGTH = 180; // secondes / cycle complet
export const DAY_START = 0.3; // t initial (matin)
