import { GameState } from './GameState.js';
import { clamp, randFloat, randInt, getMoodFromValue } from '../utils.js';

const HUNGER_DECAY_INTERVAL = 30000;
const ENERGY_RECOVERY_INTERVAL = 10000;
const WANDER_MIN = 2000;
const WANDER_MAX = 8000;
const AUTO_INTERACT_CHANCE = 0.1;
const AUTO_INTERACT_INTERVAL = 3000;
const MOOD_DECAY_INTERVAL = 60000;

class MinionAIClass {
  constructor() {
    this._lastHunger = 0;
    this._lastEnergy = 0;
    this._lastAutoInteract = 0;
    this._lastMoodDecay = 0;
    this._wanderTimers = {};
  }

  update(time, delta, minionSprites, scene) {
    const speed = GameState.settings.gameSpeed;

    // Hunger decay
    if (time - this._lastHunger >= HUNGER_DECAY_INTERVAL / speed) {
      this._lastHunger = time;
      for (const m of GameState.minions) {
        if (m.area !== 'factory' && !m.isSleeping) {
          m.hunger = clamp(m.hunger - 1, 0, 100);
          if (m.hunger === 0) m.moodValue = clamp(m.moodValue - 5, 0, 100);
        }
      }
    }

    // Energy recovery (idle minions)
    if (time - this._lastEnergy >= ENERGY_RECOVERY_INTERVAL / speed) {
      this._lastEnergy = time;
      for (const m of GameState.minions) {
        if (m.area !== 'factory' && !m.isSleeping) {
          m.energy = clamp(m.energy + 1, 0, 100);
        }
      }
    }

    // Mood decay toward neutral
    if (time - this._lastMoodDecay >= MOOD_DECAY_INTERVAL / speed) {
      this._lastMoodDecay = time;
      for (const m of GameState.minions) {
        if (m.hunger > 0 && !m.isSleeping) {
          if (m.moodValue > 50) m.moodValue = clamp(m.moodValue - 3, 50, 100);
          else if (m.moodValue < 50) m.moodValue = clamp(m.moodValue + 3, 0, 50);
        }
      }
    }

    // Auto-sleep at 0 energy
    for (const m of GameState.minions) {
      if (m.energy <= 0 && !m.isSleeping && m.area !== 'factory') {
        m.isSleeping = true;
        m.moodValue = clamp(m.moodValue, 40, 60);
        const wakeTime = 15000 / speed;
        setTimeout(() => {
          m.isSleeping = false;
          m.energy = 50;
        }, wakeTime);
      }
    }

    // Wander
    if (minionSprites && scene) {
      for (const [id, sprite] of minionSprites) {
        const mData = GameState.getMinion(id);
        if (!mData || mData.isSleeping) continue;
        if (mData.area !== GameState.currentArea) continue;
        if (!this._wanderTimers[id] || time >= this._wanderTimers[id]) {
          this._wanderTimers[id] = time + randFloat(WANDER_MIN, WANDER_MAX) / speed;
          this._wanderTo(sprite, scene);
        }
      }
    }

    // Auto-interact
    if (time - this._lastAutoInteract >= AUTO_INTERACT_INTERVAL / speed) {
      this._lastAutoInteract = time;
      this._checkAutoInteract(minionSprites, scene);
    }

    // Age
    for (const m of GameState.minions) {
      m.age += (delta * speed) / 1000;
    }
  }

  _wanderTo(sprite, scene) {
    if (!sprite || !scene || sprite.getData('tweening')) return;
    const w = scene.scale.width;
    const h = scene.scale.height;
    const margin = 60;

    // Keep minions on the ground area
    const minY = h * 0.42;
    const maxY = h - 80;

    const targetX = randFloat(margin, w - margin);
    const targetY = randFloat(minY, maxY);
    const dist = Math.hypot(targetX - sprite.x, targetY - sprite.y);

    // Consistent walking speed (~40-60px/s) with slight variation
    const speed = randFloat(40, 60);
    const duration = Math.max(800, (dist / speed) * 1000);

    // Face movement direction
    const dir = targetX > sprite.x ? 1 : -1;

    sprite.setData('tweening', true);

    // Walking bob animation (gentle bounce while moving)
    const bobTween = scene.tweens.add({
      targets: sprite,
      scaleY: { from: 1, to: 0.95 },
      scaleX: { from: 1, to: 1.03 },
      yoyo: true,
      repeat: Math.max(1, Math.floor(duration / 300)),
      duration: 150,
    });

    // Slight lean in direction of movement
    scene.tweens.add({
      targets: sprite,
      angle: dir * 3,
      duration: 300,
      ease: 'Sine.easeOut',
    });

    scene.tweens.add({
      targets: sprite,
      x: targetX,
      y: targetY,
      duration,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        sprite.setData('tweening', false);
        bobTween.stop();
        // Settle back to normal
        scene.tweens.add({
          targets: sprite,
          scaleX: 1, scaleY: 1, angle: 0,
          duration: 200,
          ease: 'Sine.easeOut',
        });
      },
    });
  }

  _checkAutoInteract(minionSprites, scene) {
    if (!minionSprites || minionSprites.size < 2) return;
    const area = GameState.currentArea;
    const minionsHere = GameState.getMinionsInArea(area).filter(m => !m.isSleeping && m.hunger > 0);

    for (let i = 0; i < minionsHere.length; i++) {
      for (let j = i + 1; j < minionsHere.length; j++) {
        const a = minionsHere[i], b = minionsHere[j];
        const sprA = minionSprites.get(a.id), sprB = minionSprites.get(b.id);
        if (!sprA || !sprB) continue;
        const dist = Math.hypot(sprA.x - sprB.x, sprA.y - sprB.y);
        if (dist < 100 && Math.random() < AUTO_INTERACT_CHANCE) {
          const friendship = a.friendship[b.id] || 0;
          if (friendship >= 20) {
            a.friendship[b.id] = clamp((a.friendship[b.id] || 0) + 3, 0, 100);
            b.friendship[a.id] = clamp((b.friendship[a.id] || 0) + 3, 0, 100);
            if (scene) {
              const mx = (sprA.x + sprB.x) / 2;
              const my = Math.min(sprA.y, sprB.y) - 30;
              const t = scene.add.text(mx, my, '✋', { fontSize: '20px' }).setOrigin(0.5).setDepth(999);
              scene.tweens.add({
                targets: t, y: my - 30, alpha: 0, duration: 1000,
                onComplete: () => t.destroy(),
              });
            }
          }
        }
      }
    }
  }

  resetTimers() {
    this._wanderTimers = {};
    this._lastHunger = 0;
    this._lastEnergy = 0;
    this._lastAutoInteract = 0;
    this._lastMoodDecay = 0;
  }
}

export const MinionAI = new MinionAIClass();
