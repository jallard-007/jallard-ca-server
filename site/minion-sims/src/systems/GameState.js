import { uuid, moodValueFor } from '../utils.js';

class GameStateManager {
  constructor() {
    this.reset();
  }

  reset() {
    this.bananaCoins = 0;
    this.bananas = 10;
    this.minions = [];
    this.storyProgress = { chapter: 1, completedMissions: [], flags: {} };
    this.unlockedClothing = new Set([
      'overalls', 'default-goggles-1', 'default-goggles-2', 'overalls-bottom',
    ]);
    this.unlockedActions = new Set([
      'kiss', 'highfive', 'feed', 'nap', 'dress-up', 'send-to-factory',
      'recall-from-factory', 'send-to-lab', 'send-to-yard',
      'tickle', 'scold', 'procreate', 'argue', 'gift-banana',
    ]);
    this.settings = {
      musicVolume: 70,
      sfxVolume: 80,
      showMoodBubbles: true,
      showNameLabels: true,
      gameSpeed: 1,
    };
    this.factoryLog = {};
    this.lastSaved = null;
    this.loginDate = new Date().toDateString();
    this.dailyBonusClaimed = false;
    this.currentArea = 'yard';
    this.selectedMinionId = null;
    this.secondMinionId = null;
    this.labUnlocked = false;
    this.capturedMinionId = null;
    this.freeplusMode = false;
    this.activeScene = null;
    this._listeners = {};
  }

  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
    return () => {
      const arr = this._listeners[event];
      if (arr) this._listeners[event] = arr.filter(f => f !== fn);
    };
  }

  emit(event, data) {
    (this._listeners[event] || []).forEach(fn => fn(data));
  }

  createMinion(props) {
    const minion = {
      id: uuid(),
      name: props.name,
      eyeType: props.eyeType || 'two-eye',
      bodyShape: props.bodyShape || 'medium',
      outfit: {
        hat: null,
        goggles: props.eyeType === 'one-eye' ? 'default-goggles-1' : 'default-goggles-2',
        top: 'overalls',
        bottom: 'overalls-bottom',
        shoes: null,
        gloves: null,
        accessory: props.accessory || null,
      },
      moodValue: props.moodValue ?? moodValueFor(props.mood || 'happy'),
      hunger: props.hunger ?? 80,
      energy: props.energy ?? 100,
      friendship: props.friendship || {},
      area: props.area || 'yard',
      isDeletable: props.isDeletable ?? true,
      age: 0,
      traits: props.traits || [],
      isSleeping: false,
      cooldowns: {},
      skinTone: props.skinTone || '#FFD93D',
      heterochromia: props.heterochromia || false,
    };
    this.minions.push(minion);
    this.emit('minion-added', minion);
    return minion;
  }

  getMinion(id) {
    return this.minions.find(m => m.id === id);
  }

  getMinionByName(name) {
    return this.minions.find(m => m.name === name);
  }

  getMinionsInArea(area) {
    return this.minions.filter(m => m.area === area);
  }

  deleteMinion(id) {
    const idx = this.minions.findIndex(m => m.id === id);
    if (idx === -1) return false;
    const minion = this.minions[idx];
    if (!minion.isDeletable) return false;
    this.minions.splice(idx, 1);
    for (const m of this.minions) delete m.friendship[id];
    delete this.factoryLog[id];
    if (this.selectedMinionId === id) this.selectedMinionId = null;
    if (this.secondMinionId === id) this.secondMinionId = null;
    this.emit('minion-deleted', { id });
    return true;
  }

  selectMinion(id) {
    if (this.selectedMinionId && this.selectedMinionId !== id && id) {
      this.secondMinionId = id;
    } else {
      this.selectedMinionId = id;
      this.secondMinionId = null;
    }
    this.emit('selection-changed', {
      primary: this.selectedMinionId,
      secondary: this.secondMinionId,
    });
  }

  clearSelection() {
    this.selectedMinionId = null;
    this.secondMinionId = null;
    this.emit('selection-changed', { primary: null, secondary: null });
  }

  initStartingMinions() {
    const kevin = this.createMinion({
      name: 'Kevin', eyeType: 'two-eye', bodyShape: 'tall',
      isDeletable: false, traits: ['Leader'], mood: 'happy',
    });
    const stuart = this.createMinion({
      name: 'Stuart', eyeType: 'one-eye', bodyShape: 'medium',
      isDeletable: false, traits: ['Lazy'], mood: 'neutral',
    });
    const bob = this.createMinion({
      name: 'Bob', eyeType: 'two-eye', bodyShape: 'short',
      isDeletable: false, traits: ['Childlike'], accessory: 'teddy-bear',
      mood: 'happy', heterochromia: true,
    });
    kevin.friendship[stuart.id] = 30;
    kevin.friendship[bob.id] = 30;
    stuart.friendship[kevin.id] = 30;
    stuart.friendship[bob.id] = 30;
    bob.friendship[kevin.id] = 30;
    bob.friendship[stuart.id] = 30;
  }

  toJSON() {
    return {
      version: 1,
      bananaCoins: this.bananaCoins,
      bananas: this.bananas,
      minions: this.minions,
      storyProgress: this.storyProgress,
      unlockedClothing: [...this.unlockedClothing],
      unlockedActions: [...this.unlockedActions],
      settings: this.settings,
      factoryLog: this.factoryLog,
      lastSaved: new Date().toISOString(),
      labUnlocked: this.labUnlocked,
      loginDate: this.loginDate,
      dailyBonusClaimed: this.dailyBonusClaimed,
      capturedMinionId: this.capturedMinionId,
      freeplusMode: this.freeplusMode,
    };
  }

  fromJSON(data) {
    if (!data || data.version !== 1) return false;
    this.bananaCoins = data.bananaCoins ?? 0;
    this.bananas = data.bananas ?? 10;
    this.minions = data.minions ?? [];
    this.storyProgress = data.storyProgress ?? { chapter: 1, completedMissions: [], flags: {} };
    if (!this.storyProgress.flags) this.storyProgress.flags = {};
    this.unlockedClothing = new Set(data.unlockedClothing ?? [
      'overalls', 'default-goggles-1', 'default-goggles-2', 'overalls-bottom',
    ]);
    this.unlockedActions = new Set(data.unlockedActions ?? []);
    if (this.unlockedActions.size === 0) {
      ['kiss', 'highfive', 'feed', 'nap', 'dress-up', 'send-to-factory',
       'recall-from-factory', 'send-to-lab', 'send-to-yard',
       'tickle', 'scold', 'procreate', 'argue', 'gift-banana',
      ].forEach(a => this.unlockedActions.add(a));
    }
    this.settings = {
      musicVolume: 70, sfxVolume: 80, showMoodBubbles: true,
      showNameLabels: true, gameSpeed: 1, ...(data.settings ?? {}),
    };
    this.factoryLog = data.factoryLog ?? {};
    this.lastSaved = data.lastSaved;
    this.labUnlocked = data.labUnlocked ?? false;
    this.loginDate = data.loginDate ?? new Date().toDateString();
    this.dailyBonusClaimed = data.dailyBonusClaimed ?? false;
    this.capturedMinionId = data.capturedMinionId ?? null;
    this.freeplusMode = data.freeplusMode ?? false;

    // Migrate minions: ensure all properties exist
    for (const m of this.minions) {
      if (m.moodValue === undefined) m.moodValue = moodValueFor(m.mood || 'neutral');
      m.isSleeping = m.isSleeping || false;
      m.cooldowns = m.cooldowns || {};
      m.heterochromia = m.heterochromia || false;
      m.skinTone = m.skinTone || '#FFD93D';
      m.friendship = m.friendship || {};
      m.traits = m.traits || [];
      if (!m.outfit) m.outfit = { hat: null, goggles: null, top: 'overalls', bottom: 'overalls-bottom', shoes: null, gloves: null, accessory: null };
    }

    // Daily login check
    const today = new Date().toDateString();
    if (this.loginDate !== today) {
      this.loginDate = today;
      this.dailyBonusClaimed = false;
    }
    return true;
  }
}

export const GameState = new GameStateManager();
