import { GameState } from '../systems/GameState.js';
import { AudioManager } from '../audio/AudioManager.js';

class FactoryPanelClass {
  constructor() {
    this.el = null;
  }

  create() {
    this.el = document.createElement('div');
    this.el.id = 'factory-panel';
    this.el.className = 'overlay-panel';
    this.el.style.display = 'none';
    document.body.appendChild(this.el);

    // Single delegated click handler — no per-render listener accumulation
    this.el.addEventListener('click', (e) => this._handleClick(e));

    GameState.on('open-factory', () => this.show());
    GameState.on('close-factory', () => this.hide());
    GameState.on('coins-changed', () => { if (this.el.style.display !== 'none') this._render(); });
    GameState.on('minion-moved', () => { if (this.el.style.display !== 'none') this._render(); });
    GameState.on('refresh-minions', () => { if (this.el.style.display !== 'none') this._render(); });
  }

  show() {
    this.el.style.display = 'flex';
    this._render();
    this._interval = setInterval(() => this._render(), 5000);
  }

  hide() {
    this.el.style.display = 'none';
    clearInterval(this._interval);
  }

  _handleClick(e) {
    // Backdrop click to close
    if (e.target === this.el) { this.hide(); return; }

    // Close button
    if (e.target.id === 'factory-close' || e.target.closest('#factory-close')) {
      this.hide();
      return;
    }

    // Recall button — use event delegation
    const recallBtn = e.target.closest('.recall-btn');
    if (recallBtn) {
      AudioManager.play('whistle');
      const id = recallBtn.dataset.id;
      const m = GameState.getMinion(id);
      if (m) {
        if (GameState.factoryLog[m.id]) {
          const elapsed = Date.now() - GameState.factoryLog[m.id].enteredAt;
          const flags = GameState.storyProgress.flags;
          flags.maxFactoryTime = Math.max(flags.maxFactoryTime || 0, elapsed);
        }
        GameState.setMinionArea(m.id, 'yard');
        delete GameState.factoryLog[m.id];
        GameState.emit('refresh-minions');
      }
      this._render();
    }
  }

  _render() {
    const factoryMinions = GameState.getMinionsInArea('factory');
    let html = `<div class="panel-content">
      <div class="panel-header">
        <h2>🏭 The Factory</h2>
        <button class="btn" id="factory-close">✖ Close</button>
      </div>
      <p class="factory-info">Minions here earn 1 Banana Coin per minute.</p>`;

    if (factoryMinions.length === 0) {
      html += '<p class="empty">No Minions in the factory. Send some from the Yard!</p>';
    } else {
      html += '<div class="factory-roster">';
      for (const m of factoryMinions) {
        const log = GameState.factoryLog[m.id];
        let elapsed = '';
        if (log) {
          const secs = Math.floor((Date.now() - log.enteredAt) / 1000);
          const mins = Math.floor(secs / 60);
          const s = secs % 60;
          elapsed = `${mins}m ${s}s`;
        }
        html += `
          <div class="factory-minion" data-id="${m.id}">
            <span class="fm-name">${m.name}</span>
            <span class="fm-time">⏱ ${elapsed}</span>
            <button class="action-btn recall-btn" data-id="${m.id}">📢 Recall</button>
          </div>`;
      }
      html += '</div>';
    }
    html += '</div>';
    this.el.innerHTML = html;
  }

  destroy() {
    clearInterval(this._interval);
    if (this.el) this.el.remove();
  }
}

export const FactoryPanel = new FactoryPanelClass();
