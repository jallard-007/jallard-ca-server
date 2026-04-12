import { GameState } from '../systems/GameState.js';
import { Economy } from '../systems/Economy.js';
import { Story } from '../systems/Story.js';
import { AudioManager } from '../audio/AudioManager.js';

class HUDClass {
  constructor() {
    this.el = null;
  }

  create() {
    this.el = document.createElement('div');
    this.el.id = 'hud';
    this.el.innerHTML = `
      <div class="hud-left">
        <span class="hud-item" title="Banana Coins">🪙 <b id="coin-count">0</b></span>
        <span class="hud-item" title="Bananas">🍌 <b id="banana-count">10</b></span>
        <button class="hud-btn small" id="buy-bananas-btn" title="Shop">🛒</button>
      </div>
      <div class="hud-center">
        <button class="area-tab active" data-area="yard">🏡 Yard</button>
        <button class="area-tab locked" data-area="lab">🔬 Lab</button>
        <button class="area-tab" data-area="factory">🏭 Factory</button>
      </div>
      <div class="hud-right">
        <button class="hud-btn" id="minions-btn" title="Minions">👥</button>
        <button class="hud-btn" id="info-btn" title="How to Play">ℹ️</button>
        <button class="hud-btn" id="story-btn" title="Story Journal">📖</button>
        <button class="hud-btn" id="settings-btn" title="Settings">⚙️</button>
      </div>
    `;
    document.body.appendChild(this.el);

    // Mission banner
    this.banner = document.createElement('div');
    this.banner.id = 'mission-banner';
    document.body.appendChild(this.banner);

    // Freeplay+ badge
    this.badge = document.createElement('div');
    this.badge.id = 'freeplay-badge';
    this.badge.textContent = '⭐ MINION MASTER ⭐';
    this.badge.style.display = 'none';
    document.body.appendChild(this.badge);

    this._bind();
    this.update();
  }

  _bind() {
    this.el.querySelectorAll('.area-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        AudioManager.play('ui-click');
        const area = btn.dataset.area;
        if (area === 'lab' && !GameState.labUnlocked) return;
        this._switchArea(area);
      });
    });

    this.el.querySelector('#buy-bananas-btn').addEventListener('click', (e) => {
      AudioManager.play('ui-click');
      this._toggleShopPopup(e);
    });

    this.el.querySelector('#minions-btn').addEventListener('click', () => {
      AudioManager.play('ui-click');
      GameState.emit('open-minions');
    });

    this.el.querySelector('#story-btn').addEventListener('click', () => {
      AudioManager.play('ui-click');
      GameState.emit('open-story-journal');
    });

    this.el.querySelector('#info-btn').addEventListener('click', () => {
      AudioManager.play('ui-click');
      GameState.emit('open-info');
    });

    this.el.querySelector('#settings-btn').addEventListener('click', () => {
      AudioManager.play('ui-click');
      GameState.emit('open-settings');
    });

    GameState.on('coins-changed', () => this.update());
    GameState.on('bananas-changed', () => this.update());
    GameState.on('area-changed', () => this._updateTabs());
    GameState.on('lab-unlocked', () => this._updateLabTab());
    GameState.on('mission-completed', (m) => this._showMissionComplete(m));
    GameState.on('chapter-completed', (c) => this._showChapterComplete(c));
    GameState.on('minion-captured', (minion) => this._showCapturePopup(minion));
  }

  _toggleShopPopup(e) {
    if (this._shopPopup) {
      this._dismissShopPopup();
      return;
    }
    const popup = document.createElement('div');
    popup.className = 'shop-popup';
    popup.innerHTML = `
      <h3>🛒 Shop</h3>
      <div class="shop-popup-item">
        <span>🍌 Buy 5 Bananas</span>
        <button class="shop-popup-btn" id="shop-buy-bananas">3 🪙</button>
      </div>
    `;

    const btn = this.el.querySelector('#buy-bananas-btn');
    const rect = btn.getBoundingClientRect();
    popup.style.top = `${rect.bottom + 4}px`;
    popup.style.left = `${rect.left}px`;

    document.body.appendChild(popup);
    this._shopPopup = popup;

    popup.querySelector('#shop-buy-bananas').addEventListener('click', () => {
      AudioManager.play('coin');
      if (Economy.buyBananas()) {
        this.update();
        this._dismissShopPopup();
      } else {
        const btn2 = popup.querySelector('#shop-buy-bananas');
        btn2.textContent = 'Not enough coins!';
        btn2.classList.add('disabled');
        setTimeout(() => { btn2.textContent = '3 🪙'; btn2.classList.remove('disabled'); }, 1500);
      }
    });

    // Close on click outside
    this._shopOutsideClick = (ev) => {
      if (!popup.contains(ev.target) && ev.target !== btn) {
        this._dismissShopPopup();
      }
    };
    setTimeout(() => document.addEventListener('pointerdown', this._shopOutsideClick), 0);
  }

  _dismissShopPopup() {
    if (this._shopPopup) {
      this._shopPopup.remove();
      this._shopPopup = null;
    }
    if (this._shopOutsideClick) {
      document.removeEventListener('pointerdown', this._shopOutsideClick);
      this._shopOutsideClick = null;
    }
  }

  _switchArea(area) {
    if (area === GameState.currentArea) return;
    GameState.clearSelection();

    GameState.emit('close-factory');
    GameState.currentArea = area;
    this._updateTabs();

    if (GameState.activeScene) {
      const sceneMap = { yard: 'YardScene', lab: 'LabScene', factory: 'FactoryScene' };
      GameState.activeScene.scene.start(sceneMap[area]);
    }
  }

  _updateTabs() {
    this.el.querySelectorAll('.area-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.area === GameState.currentArea);
    });
    this._updateLabTab();
  }

  _updateLabTab() {
    const lab = this.el.querySelector('[data-area="lab"]');
    lab.classList.toggle('locked', !GameState.labUnlocked);
  }

  _showMissionComplete(mission) {
    AudioManager.play('celebration');
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `✅ Mission Complete: <b>${mission.name}</b><br><small>${mission.rewardText || ''}</small>`;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('show'), 10);
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 3000);
    this.update();
  }

  _showChapterComplete(ch) {
    AudioManager.play('confetti');
    const el = document.createElement('div');
    el.className = 'toast chapter-toast';
    el.innerHTML = `🎉 Chapter Complete: <b>${ch.name}</b><br><small>Reward: ${ch.rewardText || ''}</small>`;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('show'), 10);
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 4000);
    this.update();
  }

  _showCapturePopup(minion) {
    AudioManager.play('alert');
    const overlay = document.createElement('div');
    overlay.className = 'overlay-panel';
    overlay.style.display = 'flex';
    overlay.innerHTML = `<div class="panel-content capture-popup">
      <h2>🚨 Minion Captured!</h2>
      <p><b>${minion.name}</b> has been captured by Vector!</p>
      <p>Complete the remaining missions in this chapter to fund a rescue.</p>
      <button class="btn primary" id="capture-ok">OK</button>
    </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#capture-ok').addEventListener('click', () => overlay.remove());
  }

  update() {
    const coinEl = this.el.querySelector('#coin-count');
    const bananaEl = this.el.querySelector('#banana-count');
    if (coinEl) coinEl.textContent = GameState.bananaCoins;
    if (bananaEl) bananaEl.textContent = GameState.bananas;
    this._updateLabTab();

    // Mission banner
    const active = Story.getActiveMission();
    if (active) {
      this.banner.textContent = `📋 ${active.objective}`;
      this.banner.style.display = 'block';
    } else {
      this.banner.style.display = 'none';
    }

    // Freeplay+ badge
    this.badge.style.display = GameState.freeplusMode ? 'block' : 'none';
  }

  destroy() {
    if (this.el) this.el.remove();
    if (this.banner) this.banner.remove();
    if (this.badge) this.badge.remove();
  }
}

export const HUD = new HUDClass();
