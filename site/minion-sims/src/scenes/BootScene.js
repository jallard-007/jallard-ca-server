import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // TODO: Load all sprite sheets, audio, and assets here
    // this.load.spritesheet('minion-tall', 'img/minions/tall.png', { ... });
    // this.load.audio('yard-theme', 'audio/music/yard-theme.mp3');
  }

  create() {
    this.scene.start('YardScene');
  }
}
