import Phaser from 'phaser';
import { gameConfig } from './config.js';

// Prevent context menu on right-click in game
document.addEventListener('contextmenu', (e) => {
  if (e.target.closest('#game-container')) e.preventDefault();
});

const game = new Phaser.Game(gameConfig);
