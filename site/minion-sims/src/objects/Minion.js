import Phaser from 'phaser';
import { BODY_DIMS, MOOD_EMOJI, getMoodFromValue, CLOTHING_ITEMS } from '../utils.js';
import { GameState } from '../systems/GameState.js';

export class Minion extends Phaser.GameObjects.Container {
  constructor(scene, x, y, minionData) {
    super(scene, x, y);
    this.minionId = minionData.id;
    this._build();
    this.setSize(90, 120);
    this.setInteractive({ useHandCursor: true });
    scene.add.existing(this);
    this.on('pointerdown', (ptr, lx, ly, event) => {
      event.stopPropagation();
      GameState.selectMinion(this.minionId);
    });
  }

  get mData() {
    return GameState.getMinion(this.minionId);
  }

  _build() {
    const d = this.mData;
    if (!d) return;
    const dims = BODY_DIMS[d.bodyShape];

    // Selection ring
    this.ring = this.scene.make.graphics({ add: false });
    this.add(this.ring);

    // Body graphics
    this.bodyGfx = this.scene.make.graphics({ add: false });
    this.add(this.bodyGfx);

    // Name label
    this.nameLabel = this.scene.make.text({
      x: 0, y: dims.h / 2 + 18,
      text: d.name,
      style: {
        fontSize: '11px', color: '#ffffff', fontFamily: 'Arial, sans-serif',
        stroke: '#000000', strokeThickness: 3, fontStyle: 'bold',
      },
      add: false,
    }).setOrigin(0.5);
    this.add(this.nameLabel);

    // Mood bubble
    this.moodBubble = this.scene.make.text({
      x: 0, y: -dims.h / 2 - 20,
      text: MOOD_EMOJI[getMoodFromValue(d.moodValue)],
      style: { fontSize: '16px' },
      add: false,
    }).setOrigin(0.5);
    this.add(this.moodBubble);

    // Sleep Zzz
    this.sleepText = this.scene.make.text({
      x: 14, y: -dims.h / 2 - 14,
      text: '💤',
      style: { fontSize: '14px' },
      add: false,
    }).setOrigin(0.5);
    this.add(this.sleepText);
    this.sleepText.setVisible(false);

    this.redraw();
  }

  redraw() {
    const d = this.mData;
    if (!d) return;
    const dims = BODY_DIMS[d.bodyShape];
    const g = this.bodyGfx;
    g.clear();

    const skinColor = parseInt(d.skinTone.replace('#', ''), 16);
    const outfit = d.outfit;

    // --- Shadow ---
    g.fillStyle(0x000000, 0.15);
    g.fillEllipse(0, dims.h / 2 + 5, dims.w + 10, 10);

    // --- Body capsule ---
    g.fillStyle(skinColor, 1);
    const r = { tl: dims.w / 3, tr: dims.w / 3, bl: dims.w / 4, br: dims.w / 4 };
    g.fillRoundedRect(-dims.w / 2, -dims.h / 2, dims.w, dims.h, r);
    g.lineStyle(1.5, 0xC8A800, 0.4);
    g.strokeRoundedRect(-dims.w / 2, -dims.h / 2, dims.w, dims.h, r);

    // --- Bottom clothing ---
    if (outfit.bottom && CLOTHING_ITEMS[outfit.bottom]) {
      g.fillStyle(CLOTHING_ITEMS[outfit.bottom].color, 0.9);
      g.fillRoundedRect(-dims.w / 2 + 1, 0, dims.w - 2, dims.h / 2, { tl: 0, tr: 0, bl: dims.w / 4, br: dims.w / 4 });
    }

    // --- Top clothing ---
    if (outfit.top && CLOTHING_ITEMS[outfit.top]) {
      const c = CLOTHING_ITEMS[outfit.top].color;
      g.fillStyle(c, 0.85);
      const ty = -dims.h / 8;
      g.fillRect(-dims.w / 2 + 2, ty, dims.w - 4, dims.h / 3.5);
      if (outfit.top === 'overalls') {
        g.fillStyle(c, 1);
        g.fillRect(-dims.w / 4, -dims.h / 3.5, 4, dims.h / 5);
        g.fillRect(dims.w / 4 - 4, -dims.h / 3.5, 4, dims.h / 5);
        g.fillStyle(0xFFFFFF, 0.8);
        g.fillCircle(-dims.w / 4 + 2, -dims.h / 3.5 + 2, 2);
        g.fillCircle(dims.w / 4 - 2, -dims.h / 3.5 + 2, 2);
      }
    }

    // --- Arms ---
    g.lineStyle(4, skinColor, 1);
    g.lineBetween(-dims.w / 2, 0, -dims.w / 2 - 7, 8);
    g.lineBetween(dims.w / 2, 0, dims.w / 2 + 7, 8);

    // --- Gloves ---
    if (outfit.gloves && CLOTHING_ITEMS[outfit.gloves]) {
      g.fillStyle(CLOTHING_ITEMS[outfit.gloves].color, 1);
      g.fillCircle(-dims.w / 2 - 7, 10, 4);
      g.fillCircle(dims.w / 2 + 7, 10, 4);
    } else {
      g.fillStyle(skinColor, 1);
      g.fillCircle(-dims.w / 2 - 7, 10, 3);
      g.fillCircle(dims.w / 2 + 7, 10, 3);
    }

    // --- Goggles band ---
    const goggleY = -dims.h / 4;
    g.fillStyle(0x555555, 1);
    g.fillRect(-dims.w / 2 - 4, goggleY - 3, dims.w + 8, 6);

    // --- Goggles + eyes ---
    const goggleColor = this._goggleColor(outfit.goggles);
    if (d.eyeType === 'one-eye') {
      g.fillStyle(goggleColor, 1);
      g.fillCircle(0, goggleY, 11);
      g.lineStyle(2, 0x444444, 1);
      g.strokeCircle(0, goggleY, 11);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(0, goggleY, 8);
      g.fillStyle(0x442200, 1);
      g.fillCircle(1, goggleY, 4.5);
      g.fillStyle(0x000000, 1);
      g.fillCircle(1, goggleY, 2.5);
      g.fillStyle(0xffffff, 0.6);
      g.fillCircle(-1.5, goggleY - 2, 1.5);
    } else {
      for (const xOff of [-8, 8]) {
        g.fillStyle(goggleColor, 1);
        g.fillCircle(xOff, goggleY, 9);
        g.lineStyle(2, 0x444444, 1);
        g.strokeCircle(xOff, goggleY, 9);
        g.fillStyle(0xffffff, 1);
        g.fillCircle(xOff, goggleY, 6);
        if (d.heterochromia) {
          g.fillStyle(xOff < 0 ? 0x228B22 : 0x8B4513, 1);
        } else {
          g.fillStyle(0x442200, 1);
        }
        g.fillCircle(xOff + 0.5, goggleY, 3.5);
        g.fillStyle(0x000000, 1);
        g.fillCircle(xOff + 0.5, goggleY, 1.8);
        g.fillStyle(0xffffff, 0.6);
        g.fillCircle(xOff - 1, goggleY - 1.5, 1.2);
      }
    }

    // --- Mouth ---
    const mouthY = goggleY + 16;
    const mood = getMoodFromValue(d.moodValue);
    g.lineStyle(2, 0x333333, 1);
    g.beginPath();
    if (mood === 'happy' || mood === 'excited') {
      g.arc(0, mouthY - 2, 5, 0.15, Math.PI - 0.15, false);
    } else if (mood === 'sad') {
      g.arc(0, mouthY + 3, 5, Math.PI + 0.15, -0.15, false);
    } else if (mood === 'angry') {
      g.moveTo(-5, mouthY + 1);
      g.lineTo(-2, mouthY - 1);
      g.lineTo(2, mouthY - 1);
      g.lineTo(5, mouthY + 1);
    } else {
      g.moveTo(-4, mouthY);
      g.lineTo(4, mouthY);
    }
    g.strokePath();

    // --- Teeth for excited ---
    if (mood === 'excited') {
      g.fillStyle(0xffffff, 1);
      g.fillRect(-3, mouthY - 1, 2, 3);
      g.fillRect(1, mouthY - 1, 2, 3);
    }

    // --- Hat ---
    if (outfit.hat && CLOTHING_ITEMS[outfit.hat]) {
      this._drawHat(g, dims, outfit.hat);
    }

    // --- Hair (if no hat) ---
    if (!outfit.hat) {
      g.lineStyle(2, 0x333333, 0.6);
      g.lineBetween(-3, -dims.h / 2 - 2, -4, -dims.h / 2 - 8);
      g.lineBetween(3, -dims.h / 2 - 2, 5, -dims.h / 2 - 9);
      g.lineBetween(0, -dims.h / 2 - 2, 0, -dims.h / 2 - 10);
    }

    // --- Shoes ---
    if (outfit.shoes && CLOTHING_ITEMS[outfit.shoes]) {
      g.fillStyle(CLOTHING_ITEMS[outfit.shoes].color, 1);
      g.fillEllipse(-7, dims.h / 2 + 3, 14, 7);
      g.fillEllipse(7, dims.h / 2 + 3, 14, 7);
    } else {
      g.fillStyle(0x222222, 1);
      g.fillEllipse(-7, dims.h / 2 + 2, 10, 5);
      g.fillEllipse(7, dims.h / 2 + 2, 10, 5);
    }

    // --- Accessory ---
    if (outfit.accessory && CLOTHING_ITEMS[outfit.accessory]) {
      this._drawAccessory(g, dims, outfit.accessory, goggleY);
    }

    // Update dynamic text
    this.nameLabel.setVisible(GameState.settings.showNameLabels);
    this.moodBubble.setVisible(GameState.settings.showMoodBubbles && !d.isSleeping);
    this.moodBubble.setText(MOOD_EMOJI[mood]);
    this.sleepText.setVisible(d.isSleeping);
  }

  _goggleColor(gogglesId) {
    if (!gogglesId || !CLOTHING_ITEMS[gogglesId]) return 0xAAAAAA;
    return CLOTHING_ITEMS[gogglesId].color;
  }

  _drawHat(g, dims, hatId) {
    const item = CLOTHING_ITEMS[hatId];
    if (!item) return;
    const topY = -dims.h / 2;
    g.fillStyle(item.color, 1);

    switch (hatId) {
      case 'hard-hat':
        g.fillRoundedRect(-dims.w / 2 - 2, topY - 14, dims.w + 4, 16, 5);
        g.fillRect(-dims.w / 2 - 5, topY - 1, dims.w + 10, 4);
        break;
      case 'crown':
        g.fillRect(-11, topY - 14, 22, 14);
        g.fillTriangle(-11, topY - 14, -11, topY - 22, -4, topY - 14);
        g.fillTriangle(0, topY - 14, 0, topY - 24, 6, topY - 14);
        g.fillTriangle(11, topY - 14, 11, topY - 22, 4, topY - 14);
        g.fillStyle(0xFF0000, 1);
        g.fillCircle(0, topY - 8, 2);
        break;
      case 'party-hat':
        g.fillTriangle(0, topY - 24, -12, topY, 12, topY);
        g.fillStyle(0xFFFF00, 1);
        g.fillCircle(0, topY - 24, 3);
        break;
      case 'beanie':
      case 'black-beanie':
        g.fillRoundedRect(-dims.w / 2 + 1, topY - 12, dims.w - 2, 16, { tl: 10, tr: 10, bl: 0, br: 0 });
        g.fillCircle(0, topY - 12, 4);
        break;
      case 'pirate-hat':
        g.fillRoundedRect(-14, topY - 18, 28, 18, 4);
        g.fillRect(-20, topY - 2, 40, 5);
        g.fillStyle(0xFFFFFF, 1);
        g.fillCircle(0, topY - 10, 3);
        break;
      case 'top-hat':
        g.fillRect(-9, topY - 22, 18, 22);
        g.fillRect(-15, topY - 2, 30, 5);
        break;
      case 'banana-peel-hat':
        g.fillStyle(item.color, 1);
        g.fillTriangle(0, topY - 16, -8, topY, 8, topY);
        g.fillTriangle(-6, topY - 4, -14, topY + 4, -4, topY + 2);
        g.fillTriangle(6, topY - 4, 14, topY + 4, 4, topY + 2);
        break;
      default:
        g.fillRoundedRect(-dims.w / 2, topY - 12, dims.w, 14, 5);
    }
  }

  _drawAccessory(g, dims, accId, goggleY) {
    const item = CLOTHING_ITEMS[accId];
    if (!item) return;
    g.fillStyle(item.color, 1);

    switch (accId) {
      case 'teddy-bear':
        g.fillCircle(dims.w / 2 + 12, dims.h / 4, 6);
        g.fillCircle(dims.w / 2 + 12, dims.h / 4 - 6, 4);
        g.fillCircle(dims.w / 2 + 9, dims.h / 4 - 9, 2.5);
        g.fillCircle(dims.w / 2 + 15, dims.h / 4 - 9, 2.5);
        g.fillStyle(0x000000, 1);
        g.fillCircle(dims.w / 2 + 11, dims.h / 4 - 7, 1);
        g.fillCircle(dims.w / 2 + 14, dims.h / 4 - 7, 1);
        break;
      case 'bow-tie':
        g.fillTriangle(-6, goggleY + 24, 0, goggleY + 20, 0, goggleY + 28);
        g.fillTriangle(6, goggleY + 24, 0, goggleY + 20, 0, goggleY + 28);
        g.fillCircle(0, goggleY + 24, 2);
        break;
      case 'cape':
        g.fillStyle(item.color, 0.6);
        g.fillTriangle(-dims.w / 2 + 3, -dims.h / 4, dims.w / 2 - 3, -dims.h / 4, 0, dims.h / 2 + 10);
        break;
      case 'scarf':
        g.fillRect(-dims.w / 2, goggleY + 20, dims.w, 6);
        g.fillRect(dims.w / 2 - 4, goggleY + 20, 6, 14);
        break;
      case 'necklace':
        g.lineStyle(2, item.color, 1);
        g.strokeCircle(0, goggleY + 26, 8);
        g.fillStyle(item.color, 1);
        g.fillCircle(0, goggleY + 34, 3);
        break;
      default:
        g.fillCircle(dims.w / 2 + 10, -dims.h / 4, 5);
        break;
    }
  }

  update() {
    const d = this.mData;
    if (!d) return;

    // Update visuals
    const mood = getMoodFromValue(d.moodValue);
    this.moodBubble.setText(MOOD_EMOJI[mood]);
    this.moodBubble.setVisible(GameState.settings.showMoodBubbles && !d.isSleeping);
    this.nameLabel.setVisible(GameState.settings.showNameLabels);
    this.sleepText.setVisible(d.isSleeping);

    // Selection highlight
    this.ring.clear();
    if (GameState.selectedMinionId === this.minionId) {
      this.ring.lineStyle(3, 0x00ff00, 0.8);
      this.ring.strokeCircle(0, 0, 42);
    } else if (GameState.secondMinionId === this.minionId) {
      this.ring.lineStyle(3, 0x00aaff, 0.8);
      this.ring.strokeCircle(0, 0, 42);
    }

    // Depth by Y
    this.setDepth(Math.floor(this.y) + 10);
  }

  destroy() {
    super.destroy(true);
  }
}
