import { GameState } from '../systems/GameState.js';
import { Economy } from '../systems/Economy.js';
import { CLOTHING_ITEMS, SLOT_ORDER, getClothingBySlot } from '../utils.js';
import { AudioManager } from '../audio/AudioManager.js';

class WardrobeClass {
  constructor() {
    this.el = null;
    this._minionId = null;
    this._activeSlot = 'hat';
  }

  create() {
    this.el = document.createElement('div');
    this.el.id = 'wardrobe-overlay';
    this.el.className = 'overlay-panel';
    this.el.style.display = 'none';
    document.body.appendChild(this.el);

    GameState.on('open-wardrobe', (m) => {
      this._minionId = m.id;
      this._activeSlot = 'hat';
      this.show();
    });

    // Single delegated click handler — avoids re-binding on every _render()
    this.el.addEventListener('click', (e) => this._handleClick(e));
  }

  _handleClick(e) {
    const t = e.target;
    if (t === this.el) { this.hide(); return; }
    if (t.id === 'wdr-close' || t.closest('#wdr-close')) { this.hide(); return; }

    const m = GameState.getMinion(this._minionId);
    if (!m) return;

    if (t.id === 'wdr-clear' || t.closest('#wdr-clear')) {
      const defaultGoggles = m.eyeType === 'one-eye' ? 'default-goggles-1' : 'default-goggles-2';
      GameState.setMinionOutfit(m.id, 'hair', null);
      GameState.setMinionOutfit(m.id, 'hat', null);
      GameState.setMinionOutfit(m.id, 'goggles', defaultGoggles);
      GameState.setMinionOutfit(m.id, 'top', 'overalls');
      GameState.setMinionOutfit(m.id, 'bottom', 'overalls-bottom');
      GameState.setMinionOutfit(m.id, 'shoes', null);
      GameState.setMinionOutfit(m.id, 'gloves', null);
      GameState.setMinionOutfit(m.id, 'accessory', null);
      this._render();
      return;
    }

    if (t.id === 'wdr-random' || t.closest('#wdr-random')) {
      this._randomize(m);
      this._render();
      return;
    }

    const slotTab = t.closest('.slot-tab');
    if (slotTab) {
      this._activeSlot = slotTab.dataset.slot;
      this._render();
      return;
    }

    const itemBtn = t.closest('.item-btn');
    if (itemBtn && !itemBtn.disabled) {
      const itemId = itemBtn.dataset.id;
      const slot = itemBtn.dataset.slot;

      if (itemBtn.classList.contains('buy')) {
        const item = CLOTHING_ITEMS[itemId];
        if (Economy.spendCoins(item.cost)) {
          GameState.unlockedClothing.add(itemId);
          AudioManager.play('coin');
        } else return;
      }

      if (m.outfit[slot] === itemId) {
        GameState.setMinionOutfit(m.id, slot, null);
      } else {
        GameState.setMinionOutfit(m.id, slot, itemId);
      }
      AudioManager.play('zipper');
      GameState.storyProgress.flags.clothingEquipped = true;
      GameState.emit('state-changed');
      this._render();
    }
  }

  show() {
    this.el.style.display = 'flex';
    this._render();
  }

  _render() {
    const m = GameState.getMinion(this._minionId);
    if (!m) return;

    const slotLabels = {
      hair: '💇 Hair', hat: '🎩 Hat', goggles: '🥽 Goggles', top: '👕 Top',
      bottom: '👖 Bottom', shoes: '👟 Shoes', gloves: '🧤 Gloves', accessory: '💎 Accessory',
    };

    this.el.innerHTML = `
      <div class="panel-content wardrobe-content">
        <div class="wardrobe-header">
          <h2>👔 Wardrobe — ${m.name}</h2>
          <div class="wardrobe-actions-top">
            <button class="btn small" id="wdr-clear">Clear All</button>
            <button class="btn small" id="wdr-random">🎲 Random</button>
            <button class="btn" id="wdr-close">✖ Close</button>
          </div>
        </div>

        <div class="wardrobe-body">
          <div class="wardrobe-preview">
            <div class="preview-minion">
              <div class="preview-slot-label">${this._slotStatus(m)}</div>
            </div>
          </div>

          <div class="wardrobe-items-panel">
            <div class="slot-tabs">
              ${SLOT_ORDER.map(s => `
                <button class="slot-tab ${s === this._activeSlot ? 'active' : ''}" data-slot="${s}">
                  ${slotLabels[s]}
                </button>
              `).join('')}
            </div>

            <div class="items-grid">
              ${this._renderItems(m)}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  _renderItems(m) {
    const items = getClothingBySlot(this._activeSlot);
    return items.map(item => {
      const owned = GameState.unlockedClothing.has(item.id);
      const equipped = m.outfit[this._activeSlot] === item.id;
      const locked = !owned && item.cost === 0;
      const buyable = !owned && item.cost > 0;
      const price = Economy.getEffectivePrice(item.cost);

      let cls = 'item-btn';
      if (equipped) cls += ' equipped';
      if (locked) cls += ' locked';
      if (buyable) cls += ' buy';

      const colorHex = '#' + item.color.toString(16).padStart(6, '0');

      let label = item.name;
      if (equipped) label += ' ✓';
      else if (locked) label = `🔒 ${item.name}`;
      else if (buyable) label = `${item.name} (${price}🪙)`;

      return `<button class="${cls}" data-id="${item.id}" data-slot="${this._activeSlot}"
        ${locked ? 'disabled' : ''}>
        <span class="item-swatch" style="background:${colorHex}"></span>
        <span class="item-label">${label}</span>
      </button>`;
    }).join('');
  }

  _slotStatus(m) {
    return SLOT_ORDER.map(s => {
      const item = m.outfit[s];
      const name = item ? (CLOTHING_ITEMS[item]?.name || item) : 'None';
      return `<div><small>${s}:</small> ${name}</div>`;
    }).join('');
  }

  _randomize(m) {
    for (const slot of SLOT_ORDER) {
      const items = getClothingBySlot(slot).filter(i => GameState.unlockedClothing.has(i.id));
      if (items.length > 0) {
        const pick = items[Math.floor(Math.random() * items.length)];
        GameState.setMinionOutfit(m.id, slot, pick.id);
      }
    }
  }

  hide() {
    this.el.style.display = 'none';
    this._minionId = null;
  }

  destroy() {
    if (this.el) this.el.remove();
  }
}

export const Wardrobe = new WardrobeClass();
