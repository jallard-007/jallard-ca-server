import { BaseAreaScene } from './BaseAreaScene.js';
import { randFloat } from '../utils.js';

export class FactoryScene extends BaseAreaScene {
  constructor() {
    super({ key: 'FactoryScene' });
  }

  get areaKey() { return 'factory'; }

  drawBackground() {
    const w = this.scale.width;
    const h = this.scale.height;

    // Dark industrial ceiling (two-tone gradient approximation — fillGradientStyle removed in v4)
    const bg = this.add.graphics();
    bg.fillStyle(0x2A2A2A, 1);
    bg.fillRect(0, 0, w, h * 0.5);
    bg.fillStyle(0x3A3A3A, 1);
    bg.fillRect(0, h * 0.5, w, h * 0.5);

    // Concrete floor
    bg.fillStyle(0x4A4A4A, 1);
    bg.fillRect(0, h * 0.35, w, h * 0.65);

    // Floor hazard stripes
    bg.fillStyle(0xFFD93D, 0.3);
    for (let x = 0; x < w; x += 60) {
      bg.fillRect(x, h * 0.35, 30, 4);
    }

    // Conveyor belt frame
    bg.fillStyle(0x444444, 1);
    bg.fillRect(0, h * 0.33 - 2, w, 12);
    bg.fillStyle(0x555555, 1);
    bg.fillRect(0, h * 0.33, w, 8);
    // Conveyor rollers (static marks)
    bg.lineStyle(1, 0x777777, 0.6);
    for (let x = 0; x < w; x += 20) {
      bg.lineBetween(x, h * 0.33, x, h * 0.33 + 8);
    }
    // Side rails
    bg.fillStyle(0x666666, 1);
    bg.fillRect(0, h * 0.33 - 3, w, 2);
    bg.fillRect(0, h * 0.33 + 9, w, 2);

    // Animated bananas on conveyor belt
    this._conveyorBananas = [];
    this._bgTweenTargets = [];
    const beltY = h * 0.33 + 4;
    for (let i = 0; i < 6; i++) {
      const banana = this.add.text(i * (w / 5), beltY, '🍌', { fontSize: '18px' })
        .setOrigin(0.5).setDepth(3);
      this._conveyorBananas.push(banana);
      this._bgTweenTargets.push(banana);
      this.tweens.add({
        targets: banana,
        x: w + 30,
        duration: 8000 + i * 200,
        ease: 'Linear',
        repeat: -1,
        onRepeat: () => { banana.x = -30; },
      });
    }
    // Conveyor end chute / collection box
    const chute = this.add.text(w - 20, beltY, '📦', { fontSize: '22px' }).setOrigin(0.5).setDepth(2);

    // Wall girders
    bg.lineStyle(6, 0x555555, 0.4);
    bg.lineBetween(0, h * 0.2, w, h * 0.2);
    bg.lineBetween(0, h * 0.4, w, h * 0.4);
    // Vertical supports
    for (let x = 0; x < w; x += w / 4) {
      bg.lineBetween(x, 0, x, h * 0.33);
    }

    // Hanging lights
    for (let x = w * 0.15; x < w; x += w * 0.25) {
      bg.lineStyle(2, 0x888888, 0.5);
      bg.lineBetween(x, 0, x, h * 0.12);
      this.add.text(x, h * 0.1, '💡', { fontSize: '20px' }).setOrigin(0.5).setDepth(0).setAlpha(0.7);
    }

    // Machinery decorations
    const machines = ['⚙️', '🔧', '🏭', '📦', '🔩', '⛽'];
    for (let i = 0; i < 5; i++) {
      this.add.text(
        randFloat(40, w - 40), randFloat(h * 0.1, h * 0.3),
        machines[i % machines.length], { fontSize: '30px' }
      ).setAlpha(0.4).setDepth(0);
    }

    // Banana crates along the bottom
    for (let i = 0; i < 3; i++) {
      this.add.text(
        randFloat(20, w - 20), randFloat(h * 0.85, h - 30),
        '📦', { fontSize: '24px' }
      ).setAlpha(0.5).setDepth(1);
    }

    // Smoke/steam effects
    for (let i = 0; i < 3; i++) {
      const sx = randFloat(50, w - 50);
      const steam = this.add.text(sx, h * 0.3, '💨', { fontSize: '18px' }).setAlpha(0.3).setDepth(0);
      this._bgTweenTargets.push(steam);
      this.tweens.add({
        targets: steam, y: h * 0.1, alpha: 0,
        duration: 4000 + Math.random() * 2000,
        repeat: -1, yoyo: false,
        onRepeat: () => { steam.y = h * 0.3; steam.setAlpha(0.3); },
      });
    }

    // Title
    this.add.text(w / 2, h * 0.35 + 15, '🏭 The Factory', {
      fontSize: '16px', color: '#FFD93D', fontFamily: 'Arial, sans-serif',
      stroke: '#222', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(2);
  }

  onMinionSpawned(sprite) {
    sprite.startWorkAnim();
  }

  update(time, delta) {
    super.update(time, delta);

    // Throttled sweat/effort particles
    for (const [, sprite] of this.minionSprites) {
      // Restart work anim for awake minions (e.g. after waking from nap)
      if (!sprite.mData?.isSleeping && !sprite.getData('workAnim')) {
        sprite.startWorkAnim();
      }
      if (!sprite.getData('nextSweat') || time >= sprite.getData('nextSweat')) {
        sprite.setData('nextSweat', time + 500);
        if (Math.random() < 0.09) {
          sprite.trySweat();
        }
      }
    }
  }
}
