import Phaser from 'phaser';
import { BODY_DIMS, WEIGHT_SCALE, MOOD_EMOJI, getMoodFromValue, CLOTHING_ITEMS } from '../utils.js';
import { GameState } from '../systems/GameState.js';

export class Minion extends Phaser.GameObjects.Container {
  constructor(scene, x, y, minionData) {
    super(scene, x, y);
    this.minionId = minionData.id;
    this._lastDepthY = Math.floor(y);
    this._build();
    this.setSize(90, 120);
    this.setDepth(this._lastDepthY + 10);
    this.setInteractive({ useHandCursor: true, draggable: true });
    scene.add.existing(this);

    this._dragStarted = false;

    this.on('pointerdown', (ptr, lx, ly, event) => {
      event.stopPropagation();
      this._dragStarted = false;
    });

    this.on('drag', (pointer, dragX, dragY) => {
      if (!this._dragStarted) {
        this._dragStarted = true;
        // Kill movement tweens when drag begins
        scene.tweens.killTweensOf(this);
        this.setData('tweening', false);
        this.scaleX = 1; this.scaleY = 1; this.angle = 0;
      }
      this.x = dragX;
      this.y = dragY;
    });

    this.on('dragend', () => {
      if (!this._dragStarted) {
        // Was a tap, not a drag
        GameState.selectMinion(this.minionId);
      }
      this._dragStarted = false;
    });

    // Enable drag on this scene's input
    scene.input.setDraggable(this);

    // Subscribe to GameState events for reactive UI updates
    this._unsubs = [
      GameState.on('minion-mood-changed', ({ id, mood }) => {
        if (id === this.minionId) this._updateMoodText(mood);
      }),
      GameState.on('minion-sleep-changed', ({ id, isSleeping }) => {
        if (id === this.minionId) {
          this._updateSleepText(isSleeping);
          this._updateMoodVisible(GameState.settings.showMoodBubbles, isSleeping);
        }
      }),
      GameState.on('selection-changed', () => {
        const isSelected = GameState.selectedMinionId === this.minionId;
        const isSecondary = GameState.secondMinionId === this.minionId;
        this._updateSelectionRing(isSelected, isSecondary);
      }),
      GameState.on('setting-changed', ({ key, value }) => {
        if (key === 'showMoodBubbles') {
          const d = this.mData;
          this._updateMoodVisible(value, d?.isSleeping);
        } else if (key === 'showNameLabels') {
          this._updateNameLabel(value);
        }
      }),
      GameState.on('outfit-changed', ({ id }) => {
        if (id === this.minionId) this.redraw();
      }),
    ];
  }

  get mData() {
    return GameState.getMinion(this.minionId);
  }

  _build() {
    const d = this.mData;
    if (!d) return;
    const baseDims = BODY_DIMS[d.bodyShape];
    const ws = WEIGHT_SCALE[d.weight || 'medium'] || 1;
    const dims = { w: baseDims.w * ws, h: baseDims.h };

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
    const baseDims = BODY_DIMS[d.bodyShape];
    const ws = WEIGHT_SCALE[d.weight || 'medium'] || 1;
    const dims = { w: baseDims.w * ws, h: baseDims.h };
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
      const bc = CLOTHING_ITEMS[outfit.bottom].color;
      g.fillStyle(bc, 0.9);
      g.fillRoundedRect(-dims.w / 2 + 1, 0, dims.w - 2, dims.h / 2, { tl: 0, tr: 0, bl: dims.w / 4, br: dims.w / 4 });
      // Per-item detail
      switch (outfit.bottom) {
        case 'jeans':
          g.lineStyle(1, 0x333366, 0.5);
          g.lineBetween(0, 2, 0, dims.h / 2 - 4);
          g.lineStyle(1, 0x333366, 0.3);
          g.lineBetween(-dims.w / 4 + 2, dims.h / 6, -dims.w / 4 + 6, dims.h / 6);
          g.lineBetween(-dims.w / 4 + 2, dims.h / 6, -dims.w / 4 + 2, dims.h / 6 + 5);
          break;
        case 'shorts':
          g.lineStyle(1.5, 0x664422, 0.4);
          g.lineBetween(-dims.w / 2 + 2, dims.h / 4, dims.w / 2 - 2, dims.h / 4);
          g.lineBetween(0, 2, 0, dims.h / 4);
          break;
        case 'tutu':
          for (let i = 0; i < 6; i++) {
            const tx = -dims.w / 2 + 4 + i * (dims.w - 8) / 5;
            g.fillStyle(0xFF88AA, 0.5);
            g.fillTriangle(tx, dims.h / 4, tx + 5, dims.h / 2 + 2, tx - 5, dims.h / 2 + 2);
          }
          break;
        case 'kilt':
          g.lineStyle(1, 0x663311, 0.5);
          for (let i = -dims.w / 2 + 5; i < dims.w / 2; i += 6) {
            g.lineBetween(i, 2, i, dims.h / 2 - 4);
          }
          g.lineStyle(1, 0xAA6633, 0.4);
          for (let j = 4; j < dims.h / 2; j += 6) {
            g.lineBetween(-dims.w / 2 + 2, j, dims.w / 2 - 2, j);
          }
          break;
        case 'maid-skirt':
          // Black skirt with slight flare
          g.fillStyle(0x222222, 0.9);
          g.fillRoundedRect(-dims.w / 2 - 2, 0, dims.w + 4, dims.h / 2, { tl: 0, tr: 0, bl: dims.w / 3, br: dims.w / 3 });
          // White apron over skirt
          g.fillStyle(0xFFFFFF, 0.8);
          g.fillRoundedRect(-dims.w / 3, 1, dims.w / 1.5, dims.h / 2 - 2, { tl: 0, tr: 0, bl: dims.w / 4, br: dims.w / 4 });
          // Apron waist band
          g.fillStyle(0xFFFFFF, 0.9);
          g.fillRect(-dims.w / 2, -1, dims.w, 4);
          // Apron bow at back (visible at waist sides)
          g.fillStyle(0xFFFFFF, 0.7);
          g.fillTriangle(-dims.w / 2 - 4, 0, -dims.w / 2, -3, -dims.w / 2, 3);
          g.fillTriangle(dims.w / 2 + 4, 0, dims.w / 2, -3, dims.w / 2, 3);
          // Lace trim at hem
          for (let i = -dims.w / 2; i < dims.w / 2; i += 4) {
            g.fillStyle(0xFFFFFF, 0.5);
            g.fillCircle(i, dims.h / 2 - 1, 2);
          }
          break;
      }
    }

    // --- Top clothing ---
    if (outfit.top && CLOTHING_ITEMS[outfit.top]) {
      const c = CLOTHING_ITEMS[outfit.top].color;
      g.fillStyle(c, 0.85);
      const ty = -dims.h / 8;
      g.fillRect(-dims.w / 2 + 2, ty, dims.w - 4, dims.h / 3.5);

      switch (outfit.top) {
        case 'overalls': {
          // Clear generic top rect from face area
          g.fillStyle(skinColor, 1);
          g.fillRect(-dims.w / 2 + 2, ty, dims.w - 4, dims.h / 3.5);
          // Bib below mouth
          const bibY = -dims.h / 4 + 21; // below mouthY
          const bibH = dims.h / 2 - bibY;
          g.fillStyle(c, 0.85);
          g.fillRect(-dims.w / 3, bibY, dims.w / 1.5, bibH);
          // Straps over shoulders (angled outward)
          g.fillStyle(c, 1);
          const strapTop = -dims.h / 10;
          // Left strap
          g.beginPath();
          g.moveTo(-dims.w / 3 + 2, bibY);
          g.lineTo(-dims.w / 3 + 6, bibY);
          g.lineTo(-dims.w / 2 + 1, strapTop);
          g.lineTo(-dims.w / 2 - 2, strapTop);
          g.closePath();
          g.fillPath();
          // Right strap
          g.beginPath();
          g.moveTo(dims.w / 3 - 6, bibY);
          g.lineTo(dims.w / 3 - 2, bibY);
          g.lineTo(dims.w / 2 + 2, strapTop);
          g.lineTo(dims.w / 2 - 1, strapTop);
          g.closePath();
          g.fillPath();
          // Buttons where straps meet bib
          g.fillStyle(0xFFFFFF, 0.9);
          g.fillCircle(-dims.w / 4 + 2, bibY + 2, 2.5);
          g.fillCircle(dims.w / 4 - 2, bibY + 2, 2.5);
          // Front pocket
          g.lineStyle(1, 0x3050A0, 0.6);
          g.strokeRect(-5, bibY + 5, 10, 7);
          break;
        }
        case 'hawaiian-shirt':
          // Floral dots
          const flowers = [[0.25, 0.3], [0.6, 0.5], [0.4, 0.7], [0.75, 0.25], [0.15, 0.65]];
          for (const [fx, fy] of flowers) {
            const px = -dims.w / 2 + 3 + fx * (dims.w - 6);
            const py = ty + fy * (dims.h / 3.5);
            g.fillStyle(0xFFFF66, 0.7);
            g.fillCircle(px, py, 2);
            g.fillStyle(0xFFFFFF, 0.5);
            g.fillCircle(px - 1.5, py - 1, 1);
            g.fillCircle(px + 1.5, py - 1, 1);
          }
          // Open collar V
          g.lineStyle(1.5, 0xCC4030, 0.5);
          g.lineBetween(-3, ty, 0, ty + 6);
          g.lineBetween(3, ty, 0, ty + 6);
          break;
        case 'tuxedo-jacket':
          // Lapels
          g.fillStyle(0x222222, 0.9);
          g.fillTriangle(-dims.w / 2 + 3, ty, -2, ty, -dims.w / 4, ty + dims.h / 7);
          g.fillTriangle(dims.w / 2 - 3, ty, 2, ty, dims.w / 4, ty + dims.h / 7);
          // Center line
          g.lineStyle(1, 0x333333, 0.6);
          g.lineBetween(0, ty, 0, ty + dims.h / 3.5);
          // Buttons
          g.fillStyle(0xFFD700, 1);
          g.fillCircle(0, ty + dims.h / 7, 1.5);
          g.fillCircle(0, ty + dims.h / 5, 1.5);
          break;
        case 'gru-logo-tee':
          // "G" logo
          g.lineStyle(2, 0xFFD93D, 0.8);
          g.beginPath();
          g.arc(0, ty + dims.h / 7, 5, 0.3, Math.PI * 2 - 0.3, false);
          g.strokePath();
          g.lineBetween(3, ty + dims.h / 7, 0, ty + dims.h / 7);
          break;
        case 'maid-top':
          // White peter-pan collar
          g.fillStyle(0xFFFFFF, 0.9);
          g.fillEllipse(-dims.w / 5, ty + 2, dims.w / 3, 6);
          g.fillEllipse(dims.w / 5, ty + 2, dims.w / 3, 6);
          // Frilly collar trim
          for (let i = -4; i <= 4; i++) {
            g.fillStyle(0xFFFFFF, 0.7);
            g.fillCircle(i * 2.5, ty + 5, 2);
          }
          // Center ribbon bow
          g.fillStyle(0xFF69B4, 1);
          g.fillTriangle(-6, ty + 5, 0, ty + 2, 0, ty + 8);
          g.fillTriangle(6, ty + 5, 0, ty + 2, 0, ty + 8);
          g.fillCircle(0, ty + 5, 2);
          // White apron bib
          g.fillStyle(0xFFFFFF, 0.85);
          g.fillRoundedRect(-dims.w / 4, ty + 8, dims.w / 2, dims.h / 4.5, 3);
          // Apron lace trim on bib
          g.lineStyle(1, 0xDDDDDD, 0.5);
          for (let i = -dims.w / 4 + 2; i < dims.w / 4; i += 4) {
            g.fillStyle(0xFFFFFF, 0.4);
            g.fillCircle(i, ty + 8 + dims.h / 4.5, 1.5);
          }
          // Puffed sleeve details
          g.fillStyle(0xFFFFFF, 0.3);
          g.fillEllipse(-dims.w / 2 + 4, ty + 3, 8, 6);
          g.fillEllipse(dims.w / 2 - 4, ty + 3, 8, 6);
          break;
        case 'striped-shirt':
          // Horizontal stripes
          g.lineStyle(2, 0x225522, 0.5);
          for (let sy = ty + 3; sy < ty + dims.h / 3.5; sy += 5) {
            g.lineBetween(-dims.w / 2 + 3, sy, dims.w / 2 - 3, sy);
          }
          break;
        case 'lab-coat':
          // Collar
          g.fillStyle(0xDDDDDD, 1);
          g.fillTriangle(-dims.w / 4, ty - 2, 0, ty + 5, -2, ty);
          g.fillTriangle(dims.w / 4, ty - 2, 0, ty + 5, 2, ty);
          // Pocket
          g.lineStyle(1, 0xBBBBBB, 0.7);
          g.strokeRect(-dims.w / 3, ty + 6, 7, 5);
          // Pen detail
          g.fillStyle(0x3366CC, 1);
          g.fillRect(-dims.w / 3 + 2, ty + 4, 1.5, 4);
          break;
        case 'spy-suit-top':
          // Belt
          g.fillStyle(0x444444, 1);
          g.fillRect(-dims.w / 2 + 2, ty + dims.h / 4.5, dims.w - 4, 3);
          // Buckle
          g.fillStyle(0xCCCCCC, 1);
          g.fillRect(-2, ty + dims.h / 4.5 - 0.5, 4, 4);
          // Collar
          g.fillStyle(0x2a2a2a, 1);
          g.fillTriangle(-4, ty, 0, ty + 4, 4, ty);
          break;
        case 'vector-top':
          // "V" stripe
          g.lineStyle(2.5, 0xFFFFFF, 0.7);
          g.lineBetween(-dims.w / 3, ty + 2, 0, ty + dims.h / 5);
          g.lineBetween(dims.w / 3, ty + 2, 0, ty + dims.h / 5);
          // Side stripes
          g.lineStyle(1, 0xFF8800, 0.4);
          g.lineBetween(-dims.w / 2 + 3, ty, -dims.w / 2 + 3, ty + dims.h / 3.5);
          g.lineBetween(dims.w / 2 - 3, ty, dims.w / 2 - 3, ty + dims.h / 3.5);
          break;
      }
    }

    // --- Arms ---
    g.lineStyle(4, skinColor, 1);
    g.lineBetween(-dims.w / 2, 0, -dims.w / 2 - 7, 8);
    g.lineBetween(dims.w / 2, 0, dims.w / 2 + 7, 8);

    // --- Gloves ---
    if (outfit.gloves && CLOTHING_ITEMS[outfit.gloves]) {
      const gc = CLOTHING_ITEMS[outfit.gloves].color;
      g.fillStyle(gc, 1);
      switch (outfit.gloves) {
        case 'boxing-gloves':
          g.fillCircle(-dims.w / 2 - 7, 10, 6);
          g.fillCircle(dims.w / 2 + 7, 10, 6);
          g.lineStyle(1, 0x880000, 0.5);
          g.strokeCircle(-dims.w / 2 - 7, 10, 6);
          g.strokeCircle(dims.w / 2 + 7, 10, 6);
          g.fillStyle(0xFFFFFF, 0.6);
          g.fillRect(-dims.w / 2 - 9, 6, 4, 2);
          g.fillRect(dims.w / 2 + 5, 6, 4, 2);
          break;
        case 'oven-mitts':
          g.fillRoundedRect(-dims.w / 2 - 11, 5, 9, 12, 3);
          g.fillRoundedRect(dims.w / 2 + 2, 5, 9, 12, 3);
          g.lineStyle(1, 0xCC5500, 0.4);
          g.lineBetween(-dims.w / 2 - 9, 7, -dims.w / 2 - 4, 7);
          g.lineBetween(dims.w / 2 + 4, 7, dims.w / 2 + 9, 7);
          break;
        case 'rubber-gloves':
          g.fillCircle(-dims.w / 2 - 7, 10, 4.5);
          g.fillCircle(dims.w / 2 + 7, 10, 4.5);
          // Cuff
          g.fillStyle(gc, 0.6);
          g.fillRect(-dims.w / 2 - 9, 3, 5, 3);
          g.fillRect(dims.w / 2 + 4, 3, 5, 3);
          break;
        default:
          g.fillCircle(-dims.w / 2 - 7, 10, 4);
          g.fillCircle(dims.w / 2 + 7, 10, 4);
      }
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

    // --- Hair ---
    if (!outfit.hat) {
      if (outfit.hair && CLOTHING_ITEMS[outfit.hair]) {
        this._drawHair(g, dims, outfit.hair);
      } else {
        // Default sprigs
        g.lineStyle(2, 0x333333, 0.6);
        g.lineBetween(-3, -dims.h / 2 - 2, -4, -dims.h / 2 - 8);
        g.lineBetween(3, -dims.h / 2 - 2, 5, -dims.h / 2 - 9);
        g.lineBetween(0, -dims.h / 2 - 2, 0, -dims.h / 2 - 10);
      }
    }

    // --- Shoes ---
    if (outfit.shoes && CLOTHING_ITEMS[outfit.shoes]) {
      const sc = CLOTHING_ITEMS[outfit.shoes].color;
      g.fillStyle(sc, 1);
      switch (outfit.shoes) {
        case 'boots':
          g.fillRoundedRect(-14, dims.h / 2 - 2, 12, 8, 2);
          g.fillRoundedRect(2, dims.h / 2 - 2, 12, 8, 2);
          g.lineStyle(1, 0x663311, 0.5);
          g.lineBetween(-12, dims.h / 2, -4, dims.h / 2);
          g.lineBetween(4, dims.h / 2, 12, dims.h / 2);
          break;
        case 'sneakers':
          g.fillEllipse(-7, dims.h / 2 + 3, 15, 7);
          g.fillEllipse(7, dims.h / 2 + 3, 15, 7);
          // Stripe
          g.lineStyle(1.5, 0xCCCCCC, 0.5);
          g.lineBetween(-12, dims.h / 2 + 3, -3, dims.h / 2 + 1);
          g.lineBetween(2, dims.h / 2 + 3, 11, dims.h / 2 + 1);
          // Laces
          g.fillStyle(0xCCCCCC, 0.8);
          g.fillCircle(-7, dims.h / 2 + 1, 1);
          g.fillCircle(7, dims.h / 2 + 1, 1);
          break;
        case 'clown-shoes':
          g.fillEllipse(-7, dims.h / 2 + 3, 20, 8);
          g.fillEllipse(7, dims.h / 2 + 3, 20, 8);
          // Toe balls
          g.fillStyle(0xFFFF00, 1);
          g.fillCircle(-16, dims.h / 2 + 2, 3);
          g.fillCircle(16, dims.h / 2 + 2, 3);
          break;
        case 'flip-flops':
          g.fillEllipse(-7, dims.h / 2 + 3, 12, 6);
          g.fillEllipse(7, dims.h / 2 + 3, 12, 6);
          // Straps
          g.lineStyle(1.5, 0x0088CC, 0.7);
          g.lineBetween(-9, dims.h / 2, -7, dims.h / 2 + 3);
          g.lineBetween(-5, dims.h / 2, -7, dims.h / 2 + 3);
          g.lineBetween(5, dims.h / 2, 7, dims.h / 2 + 3);
          g.lineBetween(9, dims.h / 2, 7, dims.h / 2 + 3);
          break;
        case 'fancy-shoes':
          g.fillEllipse(-7, dims.h / 2 + 3, 14, 6);
          g.fillEllipse(7, dims.h / 2 + 3, 14, 6);
          // Buckle
          g.fillStyle(0xFFD700, 1);
          g.fillRect(-9, dims.h / 2 + 1, 3, 3);
          g.fillRect(6, dims.h / 2 + 1, 3, 3);
          break;
        case 'maid-shoes':
          // Mary Jane style shoes
          g.fillEllipse(-7, dims.h / 2 + 3, 13, 6);
          g.fillEllipse(7, dims.h / 2 + 3, 13, 6);
          // Strap across top
          g.lineStyle(1.5, 0x222222, 0.8);
          g.lineBetween(-11, dims.h / 2 + 1, -3, dims.h / 2 + 1);
          g.lineBetween(3, dims.h / 2 + 1, 11, dims.h / 2 + 1);
          // Small buckle/button
          g.fillStyle(0xFFFFFF, 0.9);
          g.fillCircle(-6, dims.h / 2 + 1, 1.5);
          g.fillCircle(6, dims.h / 2 + 1, 1.5);
          // White knee-high socks
          g.fillStyle(0xFFFFFF, 0.7);
          g.fillRect(-10, dims.h / 2 - 5, 6, 7);
          g.fillRect(4, dims.h / 2 - 5, 6, 7);
          break;
        default:
          g.fillEllipse(-7, dims.h / 2 + 3, 14, 7);
          g.fillEllipse(7, dims.h / 2 + 3, 14, 7);
      }
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

    // --- Cache graphics as a static texture (1 sprite draw vs 200+ graphics ops/frame) ---
    const padX = Math.ceil(dims.w / 2) + 35;
    const padY = Math.ceil(dims.h / 2) + 55;
    const texW = padX * 2;
    const texH = padY * 2;
    const texKey = `_mb_${this.minionId}`;

    // Don't remove+recreate the texture each redraw — textures.remove()
    // destroys the GL resources shared by the RenderTexture via saveTexture,
    // corrupting the renderer.  Instead, save once and just clear+redraw;
    // the saved texture shares the same underlying data and updates in place.
    if (!this._rt) {
      this._rt = this.scene.make.renderTexture({ width: texW, height: texH, add: false });
    } else {
      this._rt.clear();
    }
    this._rt.draw(g, padX, padY);
    if (!this._texSaved) {
      this._rt.saveTexture(texKey);
      this._texSaved = true;
    }
    g.setVisible(false);

    if (!this.bodyImg) {
      this.bodyImg = this.scene.make.image({ key: texKey, add: false });
      this.bodyImg.setOrigin(padX / texW, padY / texH);
      // Insert right after bodyGfx in the display list
      const idx = this.getIndex(this.bodyGfx);
      this.addAt(this.bodyImg, idx + 1);
    }
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

  _drawHair(g, dims, hairId) {
    const item = CLOTHING_ITEMS[hairId];
    if (!item) return;
    const topY = -dims.h / 2;
    const hc = item.color;

    switch (hairId) {
      case 'spiky-hair':
        g.fillStyle(hc, 0.9);
        g.fillTriangle(-8, topY, -10, topY - 14, -3, topY - 4);
        g.fillTriangle(-2, topY, -1, topY - 18, 3, topY - 3);
        g.fillTriangle(4, topY, 6, topY - 15, 10, topY - 2);
        g.fillTriangle(8, topY, 11, topY - 10, 13, topY);
        break;
      case 'curly-hair':
        g.fillStyle(hc, 0.85);
        for (let i = -3; i <= 3; i++) {
          g.fillCircle(i * 3, topY - 4 - Math.abs(i), 4);
        }
        // Side curls
        g.fillCircle(-dims.w / 2 - 2, topY + 6, 3.5);
        g.fillCircle(dims.w / 2 + 2, topY + 6, 3.5);
        break;
      case 'mohawk':
        g.fillStyle(hc, 1);
        for (let i = -2; i <= 2; i++) {
          const h = 12 + (2 - Math.abs(i)) * 5;
          g.fillRect(i * 3 - 1.5, topY - h, 3, h);
        }
        break;
      case 'long-hair':
        g.fillStyle(hc, 0.8);
        // Top volume
        g.fillEllipse(0, topY - 3, dims.w + 6, 10);
        // Side drapes
        g.fillRect(-dims.w / 2 - 3, topY - 3, 5, dims.h * 0.5);
        g.fillRect(dims.w / 2 - 2, topY - 3, 5, dims.h * 0.5);
        // Rounded bottoms
        g.fillCircle(-dims.w / 2 - 0.5, topY - 3 + dims.h * 0.5, 2.5);
        g.fillCircle(dims.w / 2 + 0.5, topY - 3 + dims.h * 0.5, 2.5);
        break;
      case 'pigtails':
        g.fillStyle(hc, 0.85);
        // Top
        g.fillEllipse(0, topY - 2, dims.w - 4, 8);
        // Pigtails
        g.fillCircle(-dims.w / 2 - 4, topY + 2, 5);
        g.fillCircle(dims.w / 2 + 4, topY + 2, 5);
        // Bands
        g.fillStyle(0xFF4488, 1);
        g.fillCircle(-dims.w / 2 - 1, topY + 1, 1.5);
        g.fillCircle(dims.w / 2 + 1, topY + 1, 1.5);
        break;
      case 'buzz-cut':
        g.fillStyle(hc, 0.5);
        g.fillEllipse(0, topY - 1, dims.w + 2, 6);
        // Stubble dots
        g.fillStyle(hc, 0.3);
        for (let i = -2; i <= 2; i++) {
          g.fillCircle(i * 3, topY - 2, 1);
        }
        break;
      case 'pompadour':
        g.fillStyle(hc, 0.95);
        // Big swept-back shape
        g.fillEllipse(0, topY - 6, dims.w + 2, 16);
        // Front curl
        g.fillStyle(hc, 1);
        g.fillEllipse(2, topY - 10, 10, 8);
        break;
      case 'afro':
        g.fillStyle(hc, 0.8);
        g.fillCircle(0, topY - 6, dims.w / 2 + 6);
        // Highlight
        g.fillStyle(hc, 0.4);
        g.fillCircle(-3, topY - 12, 4);
        break;
      default:
        // Fallback sprigs
        g.lineStyle(2, hc, 0.8);
        g.lineBetween(-3, topY - 2, -5, topY - 10);
        g.lineBetween(3, topY - 2, 5, topY - 10);
        g.lineBetween(0, topY - 2, 0, topY - 12);
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
    if (!this.mData) return;

    // Only recompute depth when position actually changing (tweening or dragging)
    if (!this.getData('tweening') && !this._dragStarted) return;

    const depthY = Math.floor(this.y);
    if (depthY !== this._lastDepthY) {
      this._lastDepthY = depthY;
      this._updateDepth(depthY);
    }
  }

  _updateMoodText(mood) {
    this.moodBubble.setText(MOOD_EMOJI[mood]);
  }

  _updateMoodVisible(showMood, sleeping) {
    this.moodBubble.setVisible(showMood && !sleeping);
  }

  _updateSleepText(sleeping) {
    this.sleepText.setVisible(sleeping);
  }

  _updateNameLabel(showNames) {
    this.nameLabel.setVisible(showNames);
  }

  _updateSelectionRing(isSelected, isSecondary) {
    if (isSelected === this._ringSelected && isSecondary === this._ringSecondary) return;
    this._ringSelected = isSelected;
    this._ringSecondary = isSecondary;
    this.ring.clear();
    if (isSelected) {
      this.ring.lineStyle(3, 0x00ff00, 0.8);
      this.ring.strokeCircle(0, 0, 42);
    } else if (isSecondary) {
      this.ring.lineStyle(3, 0x00aaff, 0.8);
      this.ring.strokeCircle(0, 0, 42);
    }
  }

  _updateDepth(depthY) {
    this.setDepth(depthY + 10);
  }

  destroy() {
    if (this._unsubs) this._unsubs.forEach(fn => fn());
    const texKey = `_mb_${this.minionId}`;
    // Destroy RT first (releases GL framebuffer), then remove the
    // texture-manager entry so nothing references the dead resources.
    if (this._rt) {
      this._rt.destroy();
      this._rt = null;
    }
    if (this.scene && this.scene.textures.exists(texKey)) {
      this.scene.textures.remove(texKey);
    }
    super.destroy(true);
  }
}
