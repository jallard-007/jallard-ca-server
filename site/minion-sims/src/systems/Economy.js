import { GameState } from './GameState.js';

const FACTORY_COIN_INTERVAL = 60000;

class EconomyClass {
  constructor() {
    this._lastFactoryTick = 0;
  }

  addCoins(amount) {
    if (GameState.freeplusMode) amount = Math.ceil(amount * 1.5);
    GameState.bananaCoins += amount;
    GameState.emit('coins-changed', GameState.bananaCoins);
  }

  spendCoins(amount) {
    const effective = this.getEffectivePrice(amount);
    if (GameState.bananaCoins < effective) return false;
    GameState.bananaCoins -= effective;
    GameState.emit('coins-changed', GameState.bananaCoins);
    return true;
  }

  canAfford(amount) {
    return GameState.bananaCoins >= this.getEffectivePrice(amount);
  }

  getEffectivePrice(basePrice) {
    return GameState.freeplusMode ? Math.ceil(basePrice * 0.5) : basePrice;
  }

  addBananas(count) {
    GameState.bananas += count;
    GameState.emit('bananas-changed', GameState.bananas);
  }

  useBanana() {
    if (GameState.bananas <= 0) return false;
    GameState.bananas--;
    GameState.emit('bananas-changed', GameState.bananas);
    return true;
  }

  buyBananas() {
    if (this.spendCoins(3)) {
      this.addBananas(5);
      return true;
    }
    return false;
  }

  updateFactory(time) {
    if (time - this._lastFactoryTick < FACTORY_COIN_INTERVAL / GameState.settings.gameSpeed) return;
    this._lastFactoryTick = time;
    const factoryMinions = GameState.getMinionsInArea('factory');
    if (factoryMinions.length > 0) {
      this.addCoins(factoryMinions.length);
      GameState.storyProgress.flags.factoryTotalEarned =
        (GameState.storyProgress.flags.factoryTotalEarned || 0) + factoryMinions.length;
    }

    // Track cumulative per-minion factory time for Overtime achievement
    for (const m of factoryMinions) {
      const log = GameState.factoryLog[m.id];
      if (log) {
        const elapsed = Date.now() - log.enteredAt;
        const flags = GameState.storyProgress.flags;
        flags.maxFactoryTime = Math.max(flags.maxFactoryTime || 0, elapsed);
      }
    }
  }

  claimDailyBonus() {
    if (GameState.dailyBonusClaimed) return false;
    GameState.dailyBonusClaimed = true;
    this.addCoins(5);
    return true;
  }
}

export const Economy = new EconomyClass();
