import * as Phaser from 'phaser';
import { gameConfig } from './config.js';

// Prevent context menu on right-click in game
document.addEventListener('contextmenu', (e) => {
  if (e.target.closest('#game-container')) e.preventDefault();
});

const game = new Phaser.Game(gameConfig);

// Ping server every 5 minutes while the game is open; first ping after 5 minutes
const PING_INTERVAL = 5 * 60 * 1000;
setTimeout(() => {
  const ping = () => fetch('/minion-sims/api/ping', { method: 'GET' }).catch(() => {});
  ping();
  setInterval(ping, PING_INTERVAL);
}, PING_INTERVAL);
