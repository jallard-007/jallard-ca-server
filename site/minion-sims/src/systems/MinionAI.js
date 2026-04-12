import { GameState } from './GameState.js';
import { clamp, randFloat, pickRandom } from '../utils.js';

const HUNGER_DECAY_INTERVAL = 30000;
const ENERGY_DECAY_INTERVAL = 15000;
const WANDER_MIN = 6600;
const WANDER_MAX = 26600;
const AUTO_INTERACT_CHANCE = 0.1;
const AUTO_INTERACT_INTERVAL = 3000;
const MOOD_DECAY_INTERVAL = 60000;
const SOLO_DIALOGUE_INTERVAL = 8000;
const SOLO_DIALOGUE_CHANCE = 0.15;

const MINION_DIALOGUES = [
  'Bello!',
  'Poopaye!',
  'Tulaliloo ti amo!',
  'Bee-do bee-do bee-do!',
  'BANANA!',
  'Gelato!',
  'Me want banana…',
  'Para tú!',
  'Pwede na?',
  'Tank yu!',
  'La la la la la…',
  'Baboi!',
  'Underwear! hehe',
  'Kampai!',
  'Bananaaaa… 🍌',
  'Stupa!',
  'Luk at tu!',
  'Po ka!',
  'Butt… hehehehe',
  'Me le do le do…',
  'Tatata bala tu!',
  'Muak muak muak!',
  'Bi-do! Bi-do!',
  'King Bob!! 👑',
  'Gru? …Gru!',
  'Me build rocket!',
  'Buddies!',
  'Bottom… hehehe',
  'Papagena!',
  'Kanpai!',
];

class MinionAIClass {
  constructor() {
    this._lastHunger = 0;
    this._lastEnergy = 0;
    this._lastAutoInteract = 0;
    this._lastMoodDecay = 0;
    this._lastAge = 0;
    this._wanderTimers = {};
    this._activeDialogues = new Map(); // minionId -> bubble

    // Clean up wander timers when minions are deleted
    GameState.on('minion-deleted', ({ id }) => {
      delete this._wanderTimers[id];
    });
  }

  update(time, delta, minionSprites, scene) {
    const speed = GameState.settings.gameSpeed;

    // Hunger decay
    if (time - this._lastHunger >= HUNGER_DECAY_INTERVAL / speed) {
      this._lastHunger = time;
      for (const m of GameState.minions) {
        if (m.area !== 'factory' && !m.isSleeping) {
          GameState.setMinionHunger(m.id, m.hunger - 1);
          if (m.hunger === 0) GameState.setMinionMood(m.id, m.moodValue - 5);
        }
      }
    }

    // Energy decay (all non-sleeping minions)
    if (time - this._lastEnergy >= ENERGY_DECAY_INTERVAL / speed) {
      this._lastEnergy = time;
      for (const m of GameState.minions) {
        if (m.isSleeping) continue;
        // Factory drains faster
        const drain = m.area === 'factory' ? 3 : 1;
        GameState.setMinionEnergy(m.id, m.energy - drain);
        // Auto-sleep at 0 energy (checked here instead of per-frame)
        if (m.energy <= 0 && m.area !== 'factory') {
          GameState.setMinionSleeping(m.id, true);
          GameState.setMinionMood(m.id, clamp(m.moodValue, 40, 60));
          const wakeTime = 15000 / speed;
          setTimeout(() => {
            GameState.setMinionSleeping(m.id, false);
            GameState.setMinionEnergy(m.id, 50);
          }, wakeTime);
        }
      }
    }

    // Mood decay toward neutral
    if (time - this._lastMoodDecay >= MOOD_DECAY_INTERVAL / speed) {
      this._lastMoodDecay = time;
      for (const m of GameState.minions) {
        if (m.hunger > 0 && !m.isSleeping) {
          if (m.moodValue > 50) GameState.setMinionMood(m.id, m.moodValue - 3);
          else if (m.moodValue < 50) GameState.setMinionMood(m.id, m.moodValue + 3);
        }
      }
    }

    // Wander
    if (minionSprites && scene) {
      for (const [id, sprite] of minionSprites) {
        const mData = GameState.getMinion(id);
        if (!mData || mData.isSleeping || mData.pinned) continue;
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

    // Solo dialogue
    if (scene && minionSprites && time - this._lastSoloDialogue >= SOLO_DIALOGUE_INTERVAL / speed) {
      this._lastSoloDialogue = time;
      this._checkSoloDialogue(minionSprites, scene);
    }

    // Reposition dialogue bubbles to follow their minion
    if (minionSprites) {
      for (const [id, bubble] of this._activeDialogues) {
        const spr = minionSprites.get(id);
        if (spr && bubble.visible) {
          bubble.x = spr.x;
        } else if (!bubble.visible) {
          this._activeDialogues.delete(id);
        }
      }
    }

    // Age (throttled — 1s intervals, no need for per-frame precision)
    if (time - this._lastAge >= 1000) {
      const ageDelta = (time - this._lastAge) * speed / 1000;
      this._lastAge = time;
      for (const m of GameState.minions) {
        m.age += ageDelta;
      }
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
    const totalDuration = Math.max(800, (dist / speed) * 1000);

    // Face movement direction
    const dir = targetX > sprite.x ? 1 : -1;

    sprite.setData('tweening', true);

    // Walking bob animation (gentle bounce while moving)
    const bobTween = scene.tweens.add({
      targets: sprite,
      scaleY: { from: 1, to: 0.95 },
      scaleX: { from: 1, to: 1.03 },
      yoyo: true,
      repeat: Math.max(1, Math.floor(totalDuration / 300)),
      duration: 150,
    });

    // Slight lean in direction of movement
    scene.tweens.add({
      targets: sprite,
      angle: dir * 3,
      duration: 300,
      ease: 'Sine.easeOut',
    });

    // Build a curved/zigzag path with 2-3 waypoints
    const waypoints = this._buildWaypoints(sprite.x, sprite.y, targetX, targetY, minY, maxY, margin, w);
    this._tweenAlongWaypoints(sprite, scene, waypoints, totalDuration, bobTween);
  }

  _buildWaypoints(sx, sy, tx, ty, minY, maxY, margin, sceneW) {
    const numStops = Math.random() < 0.4 ? 3 : 2;
    const points = [];
    for (let i = 1; i <= numStops; i++) {
      const t = i / (numStops + 1);
      // Interpolate along path then offset perpendicular for a curve
      const baseX = sx + (tx - sx) * t;
      const baseY = sy + (ty - sy) * t;
      // Perpendicular offset — alternating sign gives zigzag feel
      const perpSign = (i % 2 === 0) ? 1 : -1;
      const offsetMag = randFloat(20, 60) * perpSign;
      const dx = tx - sx, dy = ty - sy;
      const len = Math.hypot(dx, dy) || 1;
      // Perpendicular direction (rotated 90°)
      const px = -dy / len * offsetMag;
      const py = dx / len * offsetMag;
      points.push({
        x: clamp(baseX + px, margin, sceneW - margin),
        y: clamp(baseY + py, minY, maxY),
      });
    }
    points.push({ x: tx, y: ty });
    return points;
  }

  _tweenAlongWaypoints(sprite, scene, waypoints, totalDuration, bobTween) {
    const segDuration = totalDuration / waypoints.length;
    let idx = 0;
    const eases = ['Sine.easeInOut', 'Quad.easeInOut', 'Cubic.easeOut'];

    const nextSegment = () => {
      if (idx >= waypoints.length) {
        sprite.setData('tweening', false);
        bobTween.stop();
        scene.tweens.add({
          targets: sprite,
          scaleX: 1, scaleY: 1, angle: 0,
          duration: 200,
          ease: 'Sine.easeOut',
        });
        return;
      }
      const wp = waypoints[idx];
      const dir = wp.x > sprite.x ? 1 : -1;
      // Update lean direction at each segment
      scene.tweens.add({ targets: sprite, angle: dir * 3, duration: 200, ease: 'Sine.easeOut' });
      scene.tweens.add({
        targets: sprite,
        x: wp.x,
        y: wp.y,
        duration: segDuration,
        ease: pickRandom(eases),
        onComplete: () => { idx++; nextSegment(); },
      });
    };
    nextSegment();
  }

  _checkAutoInteract(minionSprites, scene) {
    if (!minionSprites || minionSprites.size < 2) return;
    const area = GameState.currentArea;
    const minionsHere = GameState.getMinionsInArea(area).filter(m => !m.isSleeping && m.hunger > 0);

    // Early out — skip O(n²) loop when only 0-1 minions
    if (minionsHere.length < 2) return;

    for (let i = 0; i < minionsHere.length; i++) {
      for (let j = i + 1; j < minionsHere.length; j++) {
        const a = minionsHere[i], b = minionsHere[j];
        const sprA = minionSprites.get(a.id), sprB = minionSprites.get(b.id);
        if (!sprA || !sprB) continue;
        const dx = sprA.x - sprB.x, dy = sprA.y - sprB.y;
        if (dx * dx + dy * dy < 10000 && Math.random() < AUTO_INTERACT_CHANCE) {
          const friendship = a.friendship[b.id] || 0;
          if (friendship >= 20) {
            GameState.setFriendship(a.id, b.id, (a.friendship[b.id] || 0) + 3);
            GameState.setFriendship(b.id, a.id, (b.friendship[a.id] || 0) + 3);
            if (scene) {
              const mx = (sprA.x + sprB.x) / 2;
              const my = Math.min(sprA.y, sprB.y) - 30;
              // Reuse pooled text if available, avoid create/destroy churn
              if (!this._textPool) this._textPool = [];
              let t = this._textPool.pop();
              if (t && t.scene) {
                t.setPosition(mx, my).setText('✋').setAlpha(1).setVisible(true);
              } else {
                t = scene.add.text(mx, my, '✋', { fontSize: '20px' }).setOrigin(0.5).setDepth(999);
              }
              const pool = this._textPool;
              scene.tweens.add({
                targets: t, y: my - 30, alpha: 0, duration: 1000,
                onComplete: () => { t.setVisible(false); pool.push(t); },
              });
            }
            return;
          }
        }
      }
    }
  }

  _checkSoloDialogue(minionSprites, scene) {
    const area = GameState.currentArea;
    const awake = GameState.getMinionsInArea(area).filter(m => !m.isSleeping);
    if (awake.length === 0) return;

    // Pick a random awake minion
    const m = pickRandom(awake);
    if (Math.random() > SOLO_DIALOGUE_CHANCE) return;

    const spr = minionSprites.get(m.id);
    if (!spr) return;

    // Skip if this minion already has an active bubble
    if (this._activeDialogues.has(m.id)) return;

    const text = pickRandom(MINION_DIALOGUES);
    const bx = spr.x;
    const by = spr.y - 50;

    // Reuse pooled text objects
    if (!this._dialoguePool) this._dialoguePool = [];
    let bubble = this._dialoguePool.pop();
    if (bubble && bubble.scene) {
      bubble.setPosition(bx, by).setText(text).setAlpha(1).setVisible(true).setScale(0.5);
    } else {
      bubble = scene.add.text(bx, by, text, {
        fontSize: '13px',
        fontFamily: 'monospace',
        backgroundColor: '#ffffffdd',
        color: '#333',
        padding: { x: 6, y: 3 },
        borderRadius: 6,
      }).setOrigin(0.5).setDepth(1000).setScale(0.5);
    }

    // Track for per-frame repositioning
    bubble.setData('baseOffsetY', -50);
    bubble.setData('minionId', m.id);
    this._activeDialogues.set(m.id, bubble);

    const pool = this._dialoguePool;
    const dialogues = this._activeDialogues;
    const minionId = m.id;

    // Pop-in
    scene.tweens.add({
      targets: bubble,
      scale: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });

    // Drift upward offset over time
    scene.tweens.add({
      targets: bubble,
      y: by - 28,
      alpha: 0,
      delay: 2200,
      duration: 600,
      ease: 'Sine.easeIn',
      onUpdate: () => {
        // Update baseOffsetY so per-frame reposition uses the drifting offset
        const spr2 = bubble.getData('_trackedSprite');
        if (spr2) bubble.setData('baseOffsetY', bubble.y - spr2.y);
      },
      onComplete: () => {
        bubble.setVisible(false);
        dialogues.delete(minionId);
        pool.push(bubble);
      },
    });

    // Stash sprite ref for the drift tween's onUpdate
    bubble.setData('_trackedSprite', spr);
  }

  resetTimers() {
    this._wanderTimers = {};
    this._lastHunger = 0;
    this._lastEnergy = 0;
    this._lastAutoInteract = 0;
    this._lastMoodDecay = 0;
    this._lastAge = 0;
    this._lastSoloDialogue = 0;
    this._activeDialogues.clear();
    // Destroy pooled text objects from previous scene
    if (this._textPool) {
      for (const t of this._textPool) { if (t.scene) t.destroy(); }
      this._textPool = [];
    }
    if (this._dialoguePool) {
      for (const t of this._dialoguePool) { if (t.scene) t.destroy(); }
      this._dialoguePool = [];
    }
  }
}

export const MinionAI = new MinionAIClass();
