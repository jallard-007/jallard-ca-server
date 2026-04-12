import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { YardScene } from './scenes/YardScene.js';
import { LabScene } from './scenes/LabScene.js';

export const gameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 1024,
  height: 768,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, YardScene, LabScene],
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  backgroundColor: '#87CEEB',
};
