import { GameState } from '../systems/GameState.js';
import { SaveManager } from '../systems/SaveManager.js';
import { AudioManager } from '../audio/AudioManager.js';

class SettingsClass {
  constructor() {
    this.el = null;
  }

  create() {
    this.el = document.createElement('div');
    this.el.id = 'settings-panel';
    this.el.className = 'overlay-panel';
    this.el.style.display = 'none';
    document.body.appendChild(this.el);

    GameState.on('open-settings', () => this.show());
  }

  show() {
    this.el.style.display = 'flex';
    this._render();
  }

  _render() {
    const s = GameState.settings;
    this.el.innerHTML = `
      <div class="panel-content settings-content">
        <div class="panel-header">
          <h2>⚙️ Settings</h2>
          <button class="btn" id="settings-close">✖ Close</button>
        </div>

        <div class="settings-form">
          <label>Music Volume: <b id="music-val">${s.musicVolume}%</b>
            <input type="range" id="music-vol" min="0" max="100" value="${s.musicVolume}" />
          </label>

          <label>SFX Volume: <b id="sfx-val">${s.sfxVolume}%</b>
            <input type="range" id="sfx-vol" min="0" max="100" value="${s.sfxVolume}" />
          </label>

          <label class="checkbox-label">
            <input type="checkbox" id="show-mood" ${s.showMoodBubbles ? 'checked' : ''} />
            Show Mood Bubbles
          </label>

          <label class="checkbox-label">
            <input type="checkbox" id="show-names" ${s.showNameLabels ? 'checked' : ''} />
            Show Name Labels
          </label>

          <label>Game Speed
            <select id="game-speed">
              <option value="0.5" ${s.gameSpeed === 0.5 ? 'selected' : ''}>0.5×</option>
              <option value="1" ${s.gameSpeed === 1 ? 'selected' : ''}>1×</option>
              <option value="2" ${s.gameSpeed === 2 ? 'selected' : ''}>2×</option>
            </select>
          </label>

          <hr />

          <button class="btn" id="save-now">💾 Save Now</button>
          <button class="btn danger" id="reset-game">🗑 Reset Game</button>

          <p class="save-info">${GameState.lastSaved ? 'Last saved: ' + new Date(GameState.lastSaved).toLocaleTimeString() : 'Not saved yet'}</p>
        </div>
      </div>
    `;

    // Bind events
    this.el.querySelector('#settings-close').addEventListener('click', () => this.hide());

    this.el.querySelector('#music-vol').addEventListener('input', (e) => {
      GameState.setSetting('musicVolume', parseInt(e.target.value));
      this.el.querySelector('#music-val').textContent = GameState.settings.musicVolume + '%';
    });

    this.el.querySelector('#sfx-vol').addEventListener('input', (e) => {
      GameState.setSetting('sfxVolume', parseInt(e.target.value));
      this.el.querySelector('#sfx-val').textContent = GameState.settings.sfxVolume + '%';
    });

    this.el.querySelector('#show-mood').addEventListener('change', (e) => {
      GameState.setSetting('showMoodBubbles', e.target.checked);
    });

    this.el.querySelector('#show-names').addEventListener('change', (e) => {
      GameState.setSetting('showNameLabels', e.target.checked);
    });

    this.el.querySelector('#game-speed').addEventListener('change', (e) => {
      GameState.setSetting('gameSpeed', parseFloat(e.target.value));
    });

    this.el.querySelector('#save-now').addEventListener('click', () => {
      AudioManager.play('ui-click');
      SaveManager.save();
      this._render();
    });

    this.el.querySelector('#reset-game').addEventListener('click', () => {
      if (confirm('Reset ALL game data? This cannot be undone!')) {
        SaveManager.reset();
        window.location.reload();
      }
    });
  }

  hide() {
    this.el.style.display = 'none';
  }

  destroy() {
    if (this.el) this.el.remove();
  }
}

export const Settings = new SettingsClass();
