import * as Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { GardenScene } from './scenes/GardenScene.js';

export const BUNNY_COLORS = {
    white:    { body: 0xFFFFFF, accent: 0xFFB6C1, name: 'White' },
    pink:     { body: 0xFFB6C1, accent: 0xFF69B4, name: 'Pink' },
    brown:    { body: 0xD2B48C, accent: 0xC4956A, name: 'Brown' },
    gray:     { body: 0xC0C0C0, accent: 0xA0A0A0, name: 'Gray' },
    black:    { body: 0x4A4A4A, accent: 0x696969, name: 'Black' },
    golden:   { body: 0xFFE4B5, accent: 0xFFD700, name: 'Golden' },
    lavender: { body: 0xE6E6FA, accent: 0xDDA0DD, name: 'Lavender' },
};

export const COLOR_KEYS = Object.keys(BUNNY_COLORS);

export const BUNNY_NAMES = [
    'Clover', 'Biscuit', 'Mochi', 'Cinnamon', 'Hazel',
    'Pepper', 'Nibbles', 'Tulip', 'Snowball', 'Maple',
    'Daisy', 'Thumper', 'Cocoa', 'Peanut', 'Willow',
    'Sprout', 'Marshmallow', 'Poppy', 'Ginger', 'Luna',
    'Sage', 'Waffles', 'Pickles', 'Bean', 'Truffle',
];

// Depth constants
export const DEPTH = {
    SKY: 0,
    STARS: 1,
    CELESTIAL: 2,
    CLOUDS: 3,
    HILLS: 4,
    GROUND: 5,
    GARDEN_ZONE: 6,
    FLOWER: 11,
    BUNNY: 12,
    BUNNY_GRABBED: 15,
    PARTICLES: 20,
    EFFECTS: 25,
};

// Day palette
export const DAY_COLORS = {
    skyTop: 0x87CEEB,
    skyBottom: 0xE0F7FA,
    hillBack: 0x5FAD56,
    hillMid: 0x6BC162,
    hillFront: 0x7CCD7C,
    groundTop: 0x7CCD7C,
    groundBottom: 0x4A8B3F,
    cloudAlpha: 0.8,
};

// Night palette
export const NIGHT_COLORS = {
    skyTop: 0x0A0E27,
    skyBottom: 0x2D1B69,
    hillBack: 0x2D5A27,
    hillMid: 0x356B2E,
    hillFront: 0x3D7A35,
    groundTop: 0x3D7A35,
    groundBottom: 0x245020,
    cloudAlpha: 0.12,
};

// Layout
export const GROUND_Y_FRAC = 0.45; // ground surface starts at 45% from top
export const BUNNY_SPEED = 120;    // pixels per second
export const JUMP_DURATION = 0.35;
export const JUMP_HEIGHT = 12;
export const WALK_BOUNCE = 8;
export const WALK_PERIOD = 0.35;
export const PET_DURATION = 1.0;
export const MUNCH_DURATION = 1.5;

// Petal colors (RGBA as hex + alpha)
export const PETAL_TINTS = [0xFF69B4, 0xFFB6C1, 0xFFC0CB, 0xFF1493, 0xFFFFFF];

export const gameConfig = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 1024,
    height: 768,
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, GardenScene],
    backgroundColor: '#87CEEB',
    disableContextMenu: true,
    autoFocus: true,
    pauseOnBlur: false,
    input: {
        windowEvents: false,
    },
    fps: {
        target: 30,
        limit: 30,
    },
};
