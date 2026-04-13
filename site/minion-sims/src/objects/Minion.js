import * as Phaser from 'phaser';
import { BODY_DIMS, WEIGHT_SCALE, MOOD_EMOJI, getMoodFromValue, CLOTHING_ITEMS, clamp, randFloat, pickRandom } from '../utils.js';
import { GameState } from '../systems/GameState.js';
import { drawBottom, drawTop, drawGloves, drawShoes } from './MinionClothing.js';

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
        this.stopAllMotion();
      }
      this.x = dragX;
      this.y = dragY;
    });

    this.on('dragend', () => {
      if (!this._dragStarted) {
        // Was a tap, not a drag
        GameState.selectMinion(this.minionId);
      } else {
        GameState.setMinionPos(this.minionId, this.x, this.y);
      }
      this._dragStarted = false;
    });

    // Enable drag on this scene's input
    scene.input.setDraggable(this);
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
      drawBottom(g, dims, outfit.bottom);
    }

    // --- Top clothing ---
    if (outfit.top && CLOTHING_ITEMS[outfit.top]) {
      drawTop(g, dims, outfit.top, skinColor);
    }

    // --- Arms ---
    g.lineStyle(4, skinColor, 1);
    g.lineBetween(-dims.w / 2, 0, -dims.w / 2 - 7, 8);
    g.lineBetween(dims.w / 2, 0, dims.w / 2 + 7, 8);

    // --- Gloves ---
    drawGloves(g, dims, outfit.gloves, skinColor);

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
    drawShoes(g, dims, outfit.shoes);

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
    this._rt.render(); // v4: execute buffered draw commands
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

  /** Walk to target position with natural-looking curved path */
  walkTo(targetX, targetY) {
    if (!this.scene || this.mData?.isSleeping) return;
    this.stopAllMotion();

    const dist = Math.hypot(targetX - this.x, targetY - this.y);
    const speed = randFloat(40, 60);
    const totalDuration = Math.max(800, (dist / speed) * 1000);

    this.setData('tweening', true);

    // Walking bob animation
    this._bobTween = this.scene.tweens.add({
      targets: this,
      scaleY: { from: 1, to: 0.95 },
      scaleX: { from: 1, to: 1.03 },
      yoyo: true,
      repeat: Math.max(1, Math.floor(totalDuration / 300)),
      duration: 150,
    });

    // Lean in initial direction
    const dir = targetX > this.x ? 1 : -1;
    this.scene.tweens.add({
      targets: this,
      angle: dir * 3,
      duration: 300,
      ease: 'Sine.easeOut',
    });

    const waypoints = this._buildWaypoints(targetX, targetY);
    this._tweenAlongPath(waypoints, totalDuration);
  }

  _buildWaypoints(tx, ty) {
    const sx = this.x, sy = this.y;
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const margin = 60;
    const minY = h * 0.42;
    const maxY = h - 80;

    const numStops = Math.random() < 0.4 ? 3 : 2;
    const points = [];
    for (let i = 1; i <= numStops; i++) {
      const t = i / (numStops + 1);
      const baseX = sx + (tx - sx) * t;
      const baseY = sy + (ty - sy) * t;
      const perpSign = (i % 2 === 0) ? 1 : -1;
      const offsetMag = randFloat(20, 60) * perpSign;
      const dx = tx - sx, dy = ty - sy;
      const len = Math.hypot(dx, dy) || 1;
      const px = -dy / len * offsetMag;
      const py = dx / len * offsetMag;
      points.push({
        x: clamp(baseX + px, margin, w - margin),
        y: clamp(baseY + py, minY, maxY),
      });
    }
    points.push({ x: tx, y: ty });
    return points;
  }

  _tweenAlongPath(waypoints, totalDuration) {
    const segDuration = totalDuration / waypoints.length;
    let idx = 0;
    const eases = ['Sine.easeInOut', 'Quad.easeInOut', 'Cubic.easeOut'];

    const nextSegment = () => {
      if (idx >= waypoints.length || !this.scene) {
        this._finishWalk();
        return;
      }
      const wp = waypoints[idx];
      const dir = wp.x > this.x ? 1 : -1;
      this.scene.tweens.add({ targets: this, angle: dir * 3, duration: 200, ease: 'Sine.easeOut' });
      this.scene.tweens.add({
        targets: this,
        x: wp.x,
        y: wp.y,
        duration: segDuration,
        ease: pickRandom(eases),
        onComplete: () => { idx++; nextSegment(); },
      });
    };
    nextSegment();
  }

  _finishWalk() {
    this.setData('tweening', false);
    this._bobTween = null;
    GameState.setMinionPos(this.minionId, this.x, this.y);
    if (this.scene) {
      this.scene.tweens.add({
        targets: this,
        scaleX: 1, scaleY: 1, angle: 0,
        duration: 200,
        ease: 'Sine.easeOut',
      });
    }
  }

  /** Play a one-shot reaction animation (tickle wiggle, dance bounce, etc.) */
  playReaction(config) {
    if (!this.scene || this.mData?.isSleeping) return;
    this.scene.tweens.add({ targets: this, ...config });
  }

  /** Start looping work animation (factory) */
  startWorkAnim() {
    if (!this.scene || this.getData('workAnim')) return;
    if (this.mData?.isSleeping) return;
    this.setData('workAnim', true);
    this.scene.tweens.add({
      targets: this,
      scaleY: { from: 1, to: 0.92 },
      scaleX: { from: 1, to: 1.04 },
      angle: { from: -2, to: 2 },
      yoyo: true,
      repeat: -1,
      duration: 400,
      ease: 'Sine.easeInOut',
    });
  }

  /** Spawn a sweat particle if working (not sleeping). Returns true if emitted. */
  trySweat() {
    if (!this.scene || this.mData?.isSleeping) return false;
    const sweat = this.scene.add.text(this.x + 10, this.y - 25, '💦', { fontSize: '12px' })
      .setOrigin(0.5).setDepth(999);
    this.scene.tweens.add({
      targets: sweat, y: this.y - 50, alpha: 0,
      duration: 800,
      onComplete: () => sweat.destroy(),
    });
    return true;
  }

  /** Show a speech bubble that drifts up and fades, attached to this container */
  showDialogue(text) {
    if (!this.scene || this._dialogueBubble || this.mData?.isSleeping) return;
    const baseY = -this.height / 2 - 20;
    let bubble = this._dialogueBubble;
    if (!bubble) {
      bubble = this.scene.make.text({
        x: 0, y: baseY,
        text,
        style: {
          fontSize: '13px',
          fontFamily: 'monospace',
          backgroundColor: '#ffffffdd',
          color: '#333',
          padding: { x: 6, y: 3 },
        },
        add: false,
      }).setOrigin(0.5).setDepth(1000).setScale(0.5);
      this.add(bubble);
    } else {
      bubble.setPosition(0, baseY).setText(text).setAlpha(1).setVisible(true).setScale(0.5);
    }
    this._dialogueBubble = bubble;

    // Pop-in
    this.scene.tweens.add({
      targets: bubble,
      scale: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });

    // Drift up + fade
    this.scene.tweens.add({
      targets: bubble,
      y: baseY - 28,
      alpha: 0,
      delay: 2200,
      duration: 600,
      ease: 'Sine.easeIn',
      onComplete: () => {
        bubble.setVisible(false);
        this._dialogueBubble = null;
      },
    });
  }

  /** Stop all tweens and reset visual state */
  stopAllMotion() {
    if (!this.scene) return;
    this.scene.tweens.killTweensOf(this);
    this.setData('tweening', false);
    this.setData('workAnim', false);
    this.scaleX = 1; this.scaleY = 1; this.angle = 0;
    this._bobTween = null;
  }

  destroy() {
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
