import * as Phaser from 'phaser';
import { GameState } from '../systems/GameState.js';
import { SaveManager } from '../systems/SaveManager.js';
import { Economy } from '../systems/Economy.js';
import { AudioManager } from '../audio/AudioManager.js';
import { HUD } from '../ui/HUD.js';
import { ActionBar } from '../ui/ActionBar.js';
import { FactoryPanel } from '../ui/FactoryPanel.js';
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

  preload() {
    // Show a simple loading bar
    const w = this.scale.width;
    const h = this.scale.height;
    const bar = this.add.graphics();
    const text = this.add.text(w / 2, h / 2 - 30, 'Loading Minion Sims...', {
      fontSize: '24px', color: '#FFD93D', fontFamily: 'Arial',
    }).setOrigin(0.5);

    this.load.on('progress', (v) => {
      bar.clear();
      bar.fillStyle(0x333333, 1);
      bar.fillRect(w / 4, h / 2, w / 2, 20);
      bar.fillStyle(0xFFD93D, 1);
      bar.fillRect(w / 4, h / 2, (w / 2) * v, 20);
    });
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
    FactoryPanel.create();
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
