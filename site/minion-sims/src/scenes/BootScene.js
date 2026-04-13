import * as Phaser from 'phaser';
import { GameState } from '../systems/GameState.js';
import { SaveManager } from '../systems/SaveManager.js';
import { Economy } from '../systems/Economy.js';
import { AudioManager } from '../audio/AudioManager.js';
import { HUD } from '../ui/HUD.js';
import { ActionBar } from '../ui/ActionBar.js';
import { Nursery } from '../ui/Nursery.js';
import { Wardrobe } from '../ui/Wardrobe.js';
import { StoryJournal } from '../ui/StoryJournal.js';
import { Settings } from '../ui/Settings.js';
import { InfoPanel } from '../ui/InfoPanel.js';
import { MinionsPanel } from '../ui/MinionsPanel.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create() {
    // Initialize audio
    AudioManager.init();

    // Load save or create new game
    const loaded = SaveManager.load();
    if (!loaded) {
      GameState.initStartingMinions();
    }

    // Daily login bonus
    Economy.claimDailyBonus();

    // Start global interval timers (auto-save, factory coin ticks)
    SaveManager.start();
    Economy.startFactory();

    // Create DOM UI overlays (once, persistent across scenes)
    HUD.create({ isNewGame: !loaded });
    ActionBar.create();
    Nursery.create();
    Wardrobe.create();
    StoryJournal.create();
    Settings.create();
    InfoPanel.create();
    MinionsPanel.create();

    // Start the yard scene
    this.scene.start('YardScene');
  }
}
