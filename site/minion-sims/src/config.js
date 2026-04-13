import * as Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { YardScene } from './scenes/YardScene.js';
import { LabScene } from './scenes/LabScene.js';
import { FactoryScene } from './scenes/FactoryScene.js';

export const gameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: '100%',
    height: '100%',
  },
  scene: [BootScene, YardScene, LabScene, FactoryScene],
  fps: {
    target: 30,
    limit: 30,
  },
  backgroundColor: '#87CEEB',
  pauseOnBlur: false,
};
