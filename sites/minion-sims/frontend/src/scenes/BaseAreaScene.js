import * as Phaser from 'phaser';
import { GameState } from '../systems/GameState.js';
import { MinionsManager } from '../systems/MinionsManager.js';
import { Minion } from '../objects/Minion.js';
import { randFloat } from '../utils.js';

export class BaseAreaScene extends Phaser.Scene {
  /** @abstract Override to return 'yard' | 'lab' | 'factory' */
  get areaKey() { throw new Error('Subclass must define areaKey'); }

  create() {
    GameState.activeScene = this;
    GameState.currentArea = this.areaKey;
    this.minionSprites = new Map();
    MinionsManager.setSprites(this.minionSprites);
    MinionsManager.startTimers(this);

    this.drawBackground();
    this._spawnMinions();
    this._setupInput();

    this.scale.on('resize', this._onResize, this);

    this._unsubs = [
      GameState.on('refresh-minions', () => this._refreshMinions()),
      GameState.on('minion-added', () => this._refreshMinions()),
      GameState.on('minion-deleted', () => this._refreshMinions()),
    ];
    GameState.emit('area-changed', this.areaKey);
    this.events.once('shutdown', this._shutdown, this);
  }

  /** @abstract Override to draw scene-specific background */
  drawBackground() {}

  /** Override to add per-minion setup after spawn (e.g. factory work anim) */
  onMinionSpawned(_sprite) {}

  _spawnMinions() {
    const minions = GameState.getMinionsInArea(this.areaKey);
    const w = this.scale.width;
    const h = this.scale.height;

    for (const mData of minions) {
      if (this.minionSprites.has(mData.id)) continue;
      let x, y;
      if (mData.pos) {
        x = Phaser.Math.Clamp(mData.pos.x, 80, w - 80);
        y = Phaser.Math.Clamp(mData.pos.y, h * 0.42, h - 80);
      } else {
        x = randFloat(80, w - 80);
        y = randFloat(h * 0.42, h - 80);
        GameState.setMinionPos(mData.id, x, y);
      }
      const sprite = new Minion(this, x, y, mData);
      this.minionSprites.set(mData.id, sprite);
      this.onMinionSpawned(sprite);
    }
  }

  _refreshMinions() {
    for (const [id, sprite] of this.minionSprites) {
      const mData = GameState.getMinion(id);
      if (!mData || mData.area !== this.areaKey) {
        sprite.destroy();
        this.minionSprites.delete(id);
      }
    }
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
    for (const [, sprite] of this.minionSprites) {
      if (sprite.getData('tweening') || sprite._dragStarted) {
        sprite.update();
      }
    }
  }

  _onResize() {
    // Destroy all existing background objects and redraw at new dimensions
    if (this._bgTweenTargets) {
      for (const target of this._bgTweenTargets) {
        this.tweens.killTweensOf(target);
        target.destroy();
      }
      this._bgTweenTargets = null;
    }
    // Remove all non-minion display objects (background graphics, text, etc.)
    const keep = new Set();
    for (const [, sprite] of this.minionSprites) keep.add(sprite);
    const toRemove = this.children.list.filter(child => !keep.has(child));
    for (const child of toRemove) child.destroy();
    this.drawBackground();
  }

  _shutdown() {
    this.scale.off('resize', this._onResize, this);
    if (this._unsubs) this._unsubs.forEach(fn => fn());
    if (this._bgTweenTargets) {
      for (const target of this._bgTweenTargets) this.tweens.killTweensOf(target);
    }
    for (const [id, sprite] of this.minionSprites) {
      GameState.setMinionPos(id, sprite.x, sprite.y);
      this.tweens.killTweensOf(sprite);
    }
    this.minionSprites.clear();
    MinionsManager.stopTimers();
    MinionsManager.clearSprites();
  }
}
