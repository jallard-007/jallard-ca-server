import { BaseAreaScene } from './BaseAreaScene.js';
import { randFloat } from '../utils.js';

export class YardScene extends BaseAreaScene {
  constructor() {
    super({ key: 'YardScene' });
  }

  get areaKey() { return 'yard'; }

  drawBackground() {
    const w = this.scale.width;
    const h = this.scale.height;

    // Sky (two-tone gradient approximation — fillGradientStyle removed in v4)
    const sky = this.add.graphics();
    sky.fillStyle(0x87CEEB, 1);
    sky.fillRect(0, 0, w, h * 0.175);
    sky.fillStyle(0xC5E8F7, 1);
    sky.fillRect(0, h * 0.175, w, h * 0.175);

    // Sun
    this.add.text(w - 70, 25, '☀️', { fontSize: '40px' }).setDepth(0);

    // Clouds
    this._bgTweenTargets = [];
    [[w * 0.08, 30, '38px'], [w * 0.35, 50, '28px'], [w * 0.62, 18, '44px'], [w * 0.82, 55, '22px']].forEach(([x, y, size]) => {
      const c = this.add.text(x, y, '☁️', { fontSize: size }).setDepth(0);
      this._bgTweenTargets.push(c);
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
}
