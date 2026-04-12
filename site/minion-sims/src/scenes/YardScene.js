import Phaser from 'phaser';
import { GameState } from '../systems/GameState.js';
import { MinionAI } from '../systems/MinionAI.js';
import { SaveManager } from '../systems/SaveManager.js';
import { Story } from '../systems/Story.js';
import { Economy } from '../systems/Economy.js';
import { Minion } from '../objects/Minion.js';
import { randFloat } from '../utils.js';

export class YardScene extends Phaser.Scene {
  constructor() {
    super({ key: 'YardScene' });
  }

  create() {
    GameState.activeScene = this;
    GameState.currentArea = 'yard';
    this.minionSprites = new Map();
    MinionAI.resetTimers();

    this._drawBackground();
    this._spawnMinions();
    this._setupInput();

    // Listen for changes
    this._unsubs = [
      GameState.on('refresh-minions', () => this._refreshMinions()),
      GameState.on('minion-added', () => this._refreshMinions()),
      GameState.on('minion-deleted', () => this._refreshMinions()),
    ];
    GameState.emit('area-changed', 'yard');
    this.events.once('shutdown', this.shutdown, this);
  }

  _drawBackground() {
    const w = this.scale.width;
    const h = this.scale.height;

    // Sky
    const sky = this.add.graphics();
    sky.fillGradientStyle(0x87CEEB, 0x87CEEB, 0xC5E8F7, 0xC5E8F7, 1);
    sky.fillRect(0, 0, w, h * 0.35);

    // Sun
    this.add.text(w - 70, 25, '☀️', { fontSize: '40px' }).setDepth(0);

    // Clouds
    const clouds = ['☁️'];
    [[w * 0.08, 30, '38px'], [w * 0.35, 50, '28px'], [w * 0.62, 18, '44px'], [w * 0.82, 55, '22px']].forEach(([x, y, size]) => {
      const c = this.add.text(x, y, '☁️', { fontSize: size }).setDepth(0);
      this.tweens.add({ targets: c, x: x + 30, yoyo: true, repeat: -1, duration: 8000 + Math.random() * 4000, ease: 'Sine.easeInOut' });
    });

    // Grass
    const grass = this.add.graphics();
    grass.fillStyle(0x4CAF50, 1);
    grass.fillRect(0, h * 0.35, w, h * 0.65);
    // Texture
    grass.fillStyle(0x66BB6A, 0.4);
    for (let i = 0; i < 15; i++) {
      grass.fillRect(randFloat(0, w - 80), h * 0.35 + randFloat(0, h * 0.6), randFloat(30, 100), 2);
    }
    // Flowers
    const flowers = ['🌼', '🌸', '🌻', '🌺'];
    for (let i = 0; i < 8; i++) {
      this.add.text(randFloat(20, w - 20), randFloat(h * 0.45, h - 80), flowers[i % flowers.length], { fontSize: '16px' }).setDepth(1);
    }

    // Fence
    grass.fillStyle(0x8B6914, 1);
    grass.fillRect(0, h * 0.35 - 3, w, 6);

    // Title
    this.add.text(w / 2, h * 0.35 + 15, '🏡 The Yard', {
      fontSize: '16px', color: '#fff', fontFamily: 'Arial, sans-serif',
      stroke: '#2E7D32', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(2);
  }

  _spawnMinions() {
    const minions = GameState.getMinionsInArea('yard');
    const w = this.scale.width;
    const h = this.scale.height;

    for (const mData of minions) {
      if (this.minionSprites.has(mData.id)) continue;
      const x = randFloat(80, w - 80);
      const y = randFloat(h * 0.42, h - 80);
      const sprite = new Minion(this, x, y, mData);
      this.minionSprites.set(mData.id, sprite);
    }
  }

  _refreshMinions() {
    // Remove departed
    for (const [id, sprite] of this.minionSprites) {
      const mData = GameState.getMinion(id);
      if (!mData || mData.area !== 'yard') {
        sprite.destroy();
        this.minionSprites.delete(id);
      }
    }
    // Add newcomers
    this._spawnMinions();
  }

  _setupInput() {
    this.input.on('pointerdown', (pointer, gameObjects) => {
      if (gameObjects.length === 0) {
        GameState.clearSelection();
      }
    });
  }

  update(time, delta) {
    MinionAI.update(time, delta, this.minionSprites, this);
    Story.checkMissions(time);
    SaveManager.autoSave(time);
    Economy.updateFactory(time);

    for (const [, sprite] of this.minionSprites) {
      sprite.update();
    }
  }

  shutdown() {
    if (this._unsubs) this._unsubs.forEach(fn => fn());
    this.minionSprites.clear();
  }
}
