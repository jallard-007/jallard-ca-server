import { GameState } from './GameState.js';

const SAVE_KEY = 'minion-sims-save';
const AUTO_SAVE_INTERVAL = 30000;

class SaveManagerClass {
  constructor() {
    this._lastAutoSave = 0;
  }

  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(GameState.toJSON()));
      GameState.lastSaved = new Date().toISOString();
      return true;
    } catch (e) {
      console.error('Save failed:', e);
      return false;
    }
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!GameState.fromJSON(data)) return false;

      // Calculate offline factory earnings
      if (data.lastSaved && data.factoryLog) {
        const elapsed = (Date.now() - new Date(data.lastSaved).getTime()) / 1000;
        const factoryMinions = GameState.getMinionsInArea('factory');
        if (factoryMinions.length > 0 && elapsed > 0) {
          const coinsEarned = Math.floor(elapsed / 60) * factoryMinions.length;
          if (coinsEarned > 0) {
            GameState.bananaCoins += coinsEarned;
          }
        }
      }
      return true;
    } catch (e) {
      console.error('Load failed:', e);
      return false;
    }
  }

  autoSave(time) {
    if (time - this._lastAutoSave >= AUTO_SAVE_INTERVAL) {
      this.save();
      this._lastAutoSave = time;
    }
  }

  reset() {
    localStorage.removeItem(SAVE_KEY);
    GameState.reset();
  }

  exists() {
    return localStorage.getItem(SAVE_KEY) !== null;
  }
}

export const SaveManager = new SaveManagerClass();
