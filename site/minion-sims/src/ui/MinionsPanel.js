import { GameState } from '../systems/GameState.js';
import { getMoodFromValue, MOOD_EMOJI } from '../utils.js';

class MinionsPanelClass {
  constructor() {
    this.el = null;
  }

  create() {
    this.el = document.createElement('div');
    this.el.id = 'minions-panel';
    this.el.className = 'overlay-panel';
    this.el.style.display = 'none';
    document.body.appendChild(this.el);

    GameState.on('open-minions', () => this.show());

    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) this.hide();
    });
  }

  show() {
    this.el.style.display = 'flex';
    this._render();
  }

  hide() {
    this.el.style.display = 'none';
  }

  _statBar(value, color) {
    const pct = Math.round(Math.max(0, Math.min(100, value)));
    return `<div class="minion-stat-bar"><div class="minion-stat-fill" style="width:${pct}%;background:${color}"></div></div>`;
  }

  _render() {
    const minions = GameState.minions;
    const rows = minions.map(m => {
      const mood = getMoodFromValue(m.moodValue);
      const emoji = MOOD_EMOJI[mood] || '😐';
      return `
        <div class="minion-row">
          <div class="minion-row-name">${emoji} <b>${m.name}</b></div>
          <div class="minion-row-stats">
            <div class="minion-stat">
              <span class="minion-stat-label">🍗 Hunger</span>
              ${this._statBar(m.hunger, '#4CAF50')}
              <span class="minion-stat-val">${Math.round(m.hunger)}</span>
            </div>
            <div class="minion-stat">
              <span class="minion-stat-label">⚡ Energy</span>
              ${this._statBar(m.energy, '#2196F3')}
              <span class="minion-stat-val">${Math.round(m.energy)}</span>
            </div>
            <div class="minion-stat">
              <span class="minion-stat-label">${emoji} Happiness</span>
              ${this._statBar(m.moodValue, '#FFD93D')}
              <span class="minion-stat-val">${Math.round(m.moodValue)}</span>
            </div>
          </div>
        </div>`;
    }).join('');

    this.el.innerHTML = `
      <div class="panel-content minions-content">
        <div class="panel-header">
          <h2>👥 Minions</h2>
          <button class="btn" id="minions-close">✖ Close</button>
        </div>
        <div class="minions-list">
          ${minions.length ? rows : '<p style="text-align:center;opacity:.6">No minions yet.</p>'}
        </div>
      </div>`;

    this.el.querySelector('#minions-close').addEventListener('click', () => this.hide());
  }

  destroy() {
    if (this.el) this.el.remove();
  }
}

export const MinionsPanel = new MinionsPanelClass();
