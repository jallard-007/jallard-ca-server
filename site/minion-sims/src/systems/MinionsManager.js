import { GameState } from './GameState.js';
import { clamp, randFloat, pickRandom } from '../utils.js';

const HUNGER_DECAY_INTERVAL = 30000;
const ENERGY_DECAY_INTERVAL = 15000;
const ENERGY_REGEN_INTERVAL = 5000;
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

class MinionsManagerClass {
  constructor() {
    this._wanderTimers = {};
    this._sprites = null; // Map<id, Minion> — set by scene
    this._scene = null;
    this._timerEvents = null;
    this._speedUnsub = null;
    this._lastAge = 0;

    // Clean up wander timers when minions are deleted
    GameState.on('minion-deleted', ({ id }) => {
      delete this._wanderTimers[id];
    });

    // --- Centralized event handlers (one listener, dispatches to all sprites) ---
    GameState.on('minion-mood-changed', ({ id, mood }) => {
      const spr = this._sprites?.get(id);
      if (spr) {
        spr._updateMoodText(mood);
        spr.redraw();
      }
    });

    GameState.on('minion-sleep-changed', ({ id, isSleeping }) => {
      const spr = this._sprites?.get(id);
      if (spr) {
        spr.stopAllMotion();
        spr._updateSleepText(isSleeping);
        spr._updateMoodVisible(GameState.settings.showMoodBubbles, isSleeping);
      }
    });

    GameState.on('selection-changed', () => {
      if (!this._sprites) return;
      for (const [id, spr] of this._sprites) {
        const isSelected = GameState.selectedMinionId === id;
        const isSecondary = GameState.secondMinionId === id;
        spr._updateSelectionRing(isSelected, isSecondary);
        if (isSelected || isSecondary) spr.stopAllMotion();
      }
    });

    GameState.on('setting-changed', ({ key, value }) => {
      if (!this._sprites) return;
      for (const [id, spr] of this._sprites) {
        if (key === 'showMoodBubbles') {
          const d = spr.mData;
          spr._updateMoodVisible(value, d?.isSleeping);
        } else if (key === 'showNameLabels') {
          spr._updateNameLabel(value);
        }
      }
    });

    GameState.on('outfit-changed', ({ id }) => {
      const spr = this._sprites?.get(id);
      if (spr) spr.redraw();
    });
  }

  /** Called by scene in create() to register sprite map */
  setSprites(sprites) {
    this._sprites = sprites;
  }

  /** Called by scene on shutdown */
  clearSprites() {
    this._sprites = null;
  }

  /** Start all periodic systems as scene timers */
  startTimers(scene) {
    this.stopTimers();
    this._scene = scene;
    this._lastAge = scene.time.now;
    const speed = GameState.settings.gameSpeed;

    this._timerEvents = [
      scene.time.addEvent({ delay: HUNGER_DECAY_INTERVAL / speed, loop: true, callback: this._tickHunger, callbackScope: this }),
      scene.time.addEvent({ delay: ENERGY_DECAY_INTERVAL / speed, loop: true, callback: this._tickEnergy, callbackScope: this }),
      scene.time.addEvent({ delay: ENERGY_REGEN_INTERVAL / speed, loop: true, callback: this._tickEnergyRegen, callbackScope: this }),
      scene.time.addEvent({ delay: MOOD_DECAY_INTERVAL / speed, loop: true, callback: this._tickMoodDecay, callbackScope: this }),
      scene.time.addEvent({ delay: AUTO_INTERACT_INTERVAL / speed, loop: true, callback: this._tickAutoInteract, callbackScope: this }),
      scene.time.addEvent({ delay: SOLO_DIALOGUE_INTERVAL / speed, loop: true, callback: this._tickDialogue, callbackScope: this }),
      scene.time.addEvent({ delay: 1000 / speed, loop: true, callback: this._tickAge, callbackScope: this }),
      scene.time.addEvent({ delay: 2000 / speed, loop: true, callback: this._tickWander, callbackScope: this }),
    ];

    // Recreate timers when game speed changes
    this._speedUnsub = GameState.on('setting-changed', ({ key }) => {
      if (key === 'gameSpeed' && this._scene) this.startTimers(this._scene);
    });
  }

  /** Destroy all periodic timers */
  stopTimers() {
    if (this._timerEvents) {
      for (const t of this._timerEvents) t.destroy();
      this._timerEvents = null;
    }
    if (this._speedUnsub) {
      this._speedUnsub();
      this._speedUnsub = null;
    }
    this._wanderTimers = {};
    this._scene = null;
    if (this._textPool) {
      for (const t of this._textPool) { if (t.scene) t.destroy(); }
      this._textPool = [];
    }
  }

  _tickHunger() {
    for (const m of GameState.minions) {
      if (m.area !== 'factory' && !m.isSleeping) {
        GameState.setMinionHunger(m.id, m.hunger - 1);
        if (m.hunger === 0) GameState.setMinionMood(m.id, m.moodValue - 5);
      }
    }
  }

  _tickEnergy() {
    for (const m of GameState.minions) {
      if (m.isSleeping) continue;
      const drain = m.area === 'factory' ? 3 : 1;
      GameState.setMinionEnergy(m.id, m.energy - drain);
      if (m.energy <= 0 && m.area !== 'factory') {
        GameState.setMinionSleeping(m.id, true);
        GameState.setMinionMood(m.id, clamp(m.moodValue, 40, 60));
      }
    }
  }

  _tickEnergyRegen() {
    for (const m of GameState.minions) {
      if (!m.isSleeping) continue;
      GameState.setMinionEnergy(m.id, m.energy + 5);
      if (m.energy >= 100) {
        GameState.setMinionSleeping(m.id, false);
      }
    }
  }

  _tickMoodDecay() {
    for (const m of GameState.minions) {
      if (m.hunger > 0 && !m.isSleeping) {
        if (m.moodValue > 50) GameState.setMinionMood(m.id, m.moodValue - 3);
        else if (m.moodValue < 50) GameState.setMinionMood(m.id, m.moodValue + 3);
      }
    }
  }

  _tickWander() {
    if (!this._sprites || !this._scene) return;
    const now = this._scene.time.now;
    const speed = GameState.settings.gameSpeed;
    const w = this._scene.scale.width;
    const h = this._scene.scale.height;
    for (const m of GameState.minions) {
      if (m.isSleeping || m.pinned) continue;
      if (m.id === GameState.selectedMinionId || m.id === GameState.secondMinionId) continue;

      if (m.area === GameState.currentArea) {
        const sprite = this._sprites.get(m.id);
        if (!sprite || sprite._dragStarted) continue;
        if (!this._wanderTimers[m.id] || now >= this._wanderTimers[m.id]) {
          this._wanderTimers[m.id] = now + randFloat(WANDER_MIN, WANDER_MAX) / speed;
          this._wanderTo(sprite);
        }
      } else {
        // Off-screen: update stored position so they drift between scenes
        if (!this._wanderTimers[m.id] || now >= this._wanderTimers[m.id]) {
          this._wanderTimers[m.id] = now + randFloat(WANDER_MIN, WANDER_MAX) / speed;
          const tx = randFloat(80, w - 80);
          const ty = randFloat(h * 0.42, h - 80);
          GameState.setMinionPos(m.id, tx, ty);
        }
      }
    }
  }

  _tickAutoInteract() {
    this._checkAutoInteract();
  }

  _tickDialogue() {
    this._checkSoloDialogue();
  }

  _tickAge() {
    const now = this._scene?.time?.now;
    if (!now) return;
    const speed = GameState.settings.gameSpeed;
    const ageDelta = (now - this._lastAge) * speed / 1000;
    this._lastAge = now;
    for (const m of GameState.minions) {
      m.age += ageDelta;
    }
  }

  _wanderTo(sprite) {
    if (!sprite || !this._scene || sprite.getData('tweening')) return;
    const w = this._scene.scale.width;
    const h = this._scene.scale.height;
    const margin = 60;
    const minY = h * 0.42;
    const maxY = h - 80;

    const targetX = randFloat(margin, w - margin);
    const targetY = randFloat(minY, maxY);
    sprite.walkTo(targetX, targetY);
  }

  _checkAutoInteract() {
    if (!this._sprites || this._sprites.size < 2) return;
    const scene = this._scene;
    const area = GameState.currentArea;
    const minionsHere = GameState.getMinionsInArea(area).filter(m => !m.isSleeping && m.hunger > 0);

    // Early out — skip O(n²) loop when only 0-1 minions
    if (minionsHere.length < 2) return;

    for (let i = 0; i < minionsHere.length; i++) {
      for (let j = i + 1; j < minionsHere.length; j++) {
        const a = minionsHere[i], b = minionsHere[j];
        const sprA = this._sprites.get(a.id), sprB = this._sprites.get(b.id);
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

  _checkSoloDialogue() {
    const area = GameState.currentArea;
    const awake = GameState.getMinionsInArea(area).filter(m => !m.isSleeping);
    if (awake.length === 0) return;

    const m = pickRandom(awake);
    if (Math.random() > SOLO_DIALOGUE_CHANCE) return;

    const spr = this._sprites?.get(m.id);
    if (!spr) return;

    spr.showDialogue(pickRandom(MINION_DIALOGUES));
  }
}

export const MinionsManager = new MinionsManagerClass();
