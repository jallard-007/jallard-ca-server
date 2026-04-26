import * as Phaser from 'phaser';
import { gameConfig } from './config.js';

// Prevent context menu on right-click in game
document.addEventListener('contextmenu', (e) => {
  if (e.target.closest('#game-container')) e.preventDefault();
});

const game = new Phaser.Game(gameConfig);

// Ping server every 1 minute while the game is open; first ping after 1 minute
const PING_INTERVAL = 60 * 1000;
setTimeout(() => {
  const ping = () => fetch('/api/x/ping', { method: 'GET' }).catch(() => {});
  ping();
  setInterval(ping, PING_INTERVAL);
}, PING_INTERVAL);
