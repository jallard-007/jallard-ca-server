import { BaseAreaScene } from './BaseAreaScene.js';
import { randFloat } from '../utils.js';

export class LabScene extends BaseAreaScene {
  constructor() {
    super({ key: 'LabScene' });
  }

  get areaKey() { return 'lab'; }

  drawBackground() {
    const w = this.scale.width;
    const h = this.scale.height;

    // Dark background (two-tone gradient approximation — fillGradientStyle removed in v4)
    const bg = this.add.graphics();
    bg.fillStyle(0x2C2C3E, 1);
    bg.fillRect(0, 0, w, h * 0.5);
    bg.fillStyle(0x1a1a2e, 1);
    bg.fillRect(0, h * 0.5, w, h * 0.5);

    // Metal floor
    bg.fillStyle(0x3A3A4E, 1);
    bg.fillRect(0, h * 0.35, w, h * 0.65);
    // Floor grid lines
    bg.lineStyle(1, 0x4A4A5E, 0.3);
    for (let x = 0; x < w; x += 40) bg.lineBetween(x, h * 0.35, x, h);
    for (let y = h * 0.35; y < h; y += 40) bg.lineBetween(0, y, w, y);

    // Lab equipment decorations
    const deco = ['⚗️', '🔬', '🧪', '💡', '⚙️', '🖥️', '🔩'];
    for (let i = 0; i < 6; i++) {
      this.add.text(
        randFloat(30, w - 30), randFloat(20, h * 0.3),
        deco[i % deco.length], { fontSize: '28px' }
      ).setAlpha(0.5).setDepth(0);
    }

    // Pipes on walls
    bg.lineStyle(4, 0x666688, 0.5);
    bg.lineBetween(0, h * 0.15, w * 0.15, h * 0.15);
    bg.lineBetween(w * 0.15, h * 0.15, w * 0.15, h * 0.32);
    bg.lineBetween(w * 0.85, h * 0.1, w, h * 0.1);
    bg.lineBetween(w * 0.85, h * 0.1, w * 0.85, h * 0.3);

    // Title
    this.add.text(w / 2, h * 0.35 + 15, "🔬 Gru's Lab", {
      fontSize: '16px', color: '#B0B0D0', fontFamily: 'Arial, sans-serif',
      stroke: '#1a1a2e', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(2);
  }
}
