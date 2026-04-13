import { GameState } from '../systems/GameState.js';
import { ActionRegistry } from '../systems/ActionRegistry.js';
import { AudioManager } from '../audio/AudioManager.js';
import { getMoodFromValue } from '../utils.js';

class ActionBarClass {
  constructor() {
    this.el = null;
    this._activeTooltip = null;
  }

  create() {
    this.el = document.createElement('div');
    this.el.id = 'action-bar';
    this.el.innerHTML = '<div class="action-bar-inner"></div>';
    document.body.appendChild(this.el);

    // Prevent clicks on the action bar from reaching Phaser's input system.
    // Phaser listens for mousedown/touchstart on window and checks defaultPrevented.
    // stopPropagation on pointerdown alone doesn't block the separate mousedown event.
    for (const evtType of ['pointerdown', 'mousedown', 'touchstart']) {
      this.el.addEventListener(evtType, (e) => {
        e.stopPropagation();
        e.preventDefault();
      });
    }

    GameState.on('selection-changed', () => this.refresh());
    GameState.on('minion-energy-changed', ({ id }) => this._refreshIfSelected(id));
    GameState.on('minion-sleep-changed', ({ id }) => this._refreshIfSelected(id));
    GameState.on('minion-hunger-changed', ({ id }) => this._refreshIfSelected(id));
    this.refresh();
  }

  _refreshIfSelected(id) {
    if (id === GameState.selectedMinionId || id === GameState.secondMinionId) {
      this.refresh();
    }
  }

  refresh() {
    this._dismissTooltip();
    const inner = this.el.querySelector('.action-bar-inner');
    inner.innerHTML = '';

    const primary = GameState.selectedMinionId ? GameState.getMinion(GameState.selectedMinionId) : null;
    const secondary = GameState.secondMinionId ? GameState.getMinion(GameState.secondMinionId) : null;

    if (!primary) {
      this.el.classList.remove('visible');
      return;
    }
    this.el.classList.add('visible');

    // Header
    const header = document.createElement('div');
    header.className = 'action-bar-header';
    const mood = getMoodFromValue(primary.moodValue);
    header.innerHTML = `<b>${primary.name}</b> <small>${mood} | 🍌${primary.hunger} ⚡${primary.energy}</small>`;
    if (secondary) {
      const mood2 = getMoodFromValue(secondary.moodValue);
      header.innerHTML += ` ⟷ <b>${secondary.name}</b> <small>${mood2}</small>`;
    } else {
      header.innerHTML += ' <span class="hint">Tap another Minion for pair actions</span>';
    }
    inner.appendChild(header);

    // Info / release button
    const infoRow = document.createElement('div');
    infoRow.className = 'action-info-row';
    if (primary.isDeletable) {
      const relBtn = document.createElement('button');
      relBtn.className = 'action-btn danger';
      relBtn.textContent = '🚪 Release';
      relBtn.addEventListener('click', () => {
        if (confirm(`Send ${primary.name} away? This cannot be undone.`)) {
          GameState.deleteMinion(primary.id);
          GameState.clearSelection();
          GameState.emit('refresh-minions');
        }
      });
      infoRow.appendChild(relBtn);
    }
    // Pin toggle (stop moving)
    const pinBtn = document.createElement('button');
    pinBtn.className = 'action-btn' + (primary.pinned ? ' active-toggle' : '');
    pinBtn.textContent = primary.pinned ? '📌 Pinned' : '📌 Pin';
    pinBtn.title = 'Toggle: stop minion from wandering';
    pinBtn.addEventListener('click', () => {
      GameState.setMinionPinned(primary.id, !primary.pinned);
      if (primary.pinned && GameState.activeScene?.minionSprites) {
        const spr = GameState.activeScene.minionSprites.get(primary.id);
        if (spr) spr.stopAllMotion();
      }
      this.refresh();
    });
    infoRow.appendChild(pinBtn);
    // Deselect
    const deselBtn = document.createElement('button');
    deselBtn.className = 'action-btn';
    deselBtn.textContent = '✖ Deselect';
    deselBtn.addEventListener('click', () => GameState.clearSelection());
    infoRow.appendChild(deselBtn);
    inner.appendChild(infoRow);

    // Action buttons container
    const btns = document.createElement('div');
    btns.className = 'action-buttons';

    if (secondary) {
      // Pair actions only when two minions selected
      const pairActions = ActionRegistry.getPairActions();
      for (const action of pairActions) {
        btns.appendChild(this._createBtn(action, primary, secondary));
      }
    } else {
      // Solo actions only when one minion selected
      const soloActions = ActionRegistry.getSoloActions();
      for (const action of soloActions) {
        // Filter context-specific actions
        if (action.id === 'recall-from-factory' && primary.area !== 'factory') continue;
        if (action.id === 'send-to-factory' && primary.area === 'factory') continue;
        if (action.id === 'send-to-lab' && primary.area === 'lab') continue;
        if (action.id === 'send-to-yard' && primary.area === 'yard') continue;
        if (action.id === 'nap' && primary.isSleeping) continue;
        if (action.id === 'wake-up' && !primary.isSleeping) continue;
        btns.appendChild(this._createBtn(action, primary, null));
      }
    }

    inner.appendChild(btns);

    // Friendship display for pair
    if (secondary) {
      const fRow = document.createElement('div');
      fRow.className = 'friendship-display';
      const f = primary.friendship[secondary.id] || 0;
      fRow.innerHTML = `❤️ Friendship: <b>${f}</b>/100`;
      inner.appendChild(fRow);
    }
  }

  _createBtn(action, primary, secondary) {
    const btn = document.createElement('button');
    btn.className = 'action-btn';

    const target = secondary || null;
    const check = ActionRegistry.checkAction(action, primary, secondary);

    btn.innerHTML = `${action.icon} ${action.label}`;

    if (!check.ok) {
      btn.classList.add('unavailable');
      btn.addEventListener('click', (e) => {
        this._showTooltip(btn, check.reason);
        e.stopPropagation();
      });
    } else {
      btn.addEventListener('click', () => {
        this._dismissTooltip();
        AudioManager.play('ui-click');
        const scene = GameState.activeScene;

        // For pair actions, animate minions walking together first
        if (action.type === 'pair' && target && scene?.minionSprites) {
          const sprA = scene.minionSprites.get(primary.id);
          const sprB = scene.minionSprites.get(target.id);
          if (sprA && sprB) {
            const mx = (sprA.x + sprB.x) / 2;
            const my = (sprA.y + sprB.y) / 2;
            const gap = 30;
            const duration = Math.min(600, Math.hypot(sprA.x - sprB.x, sprA.y - sprB.y) * 3);
            sprA.stopAllMotion();
            sprB.stopAllMotion();
            sprA.setData('tweening', true);
            sprB.setData('tweening', true);
            // Walk toward each other
            scene.tweens.add({
              targets: sprA, x: mx - gap, y: my, duration, ease: 'Sine.easeInOut',
            });
            scene.tweens.add({
              targets: sprB, x: mx + gap, y: my, duration, ease: 'Sine.easeInOut',
              onComplete: () => {
                sprA.setData('tweening', false);
                sprB.setData('tweening', false);
                const result = action.perform(primary, target, scene);
                if (result?.message) this._showMessage(result.message);
                this.refresh();
                GameState.emit('action-performed', { actionId: action.id, minion: primary, target });
              },
            });
            return;
          }
        }

        const result = action.perform(primary, target, scene);
        if (result?.message) {
          this._showMessage(result.message);
        }
        // Refresh UI
        this.refresh();
        GameState.emit('action-performed', { actionId: action.id, minion: primary, target });
      });
    }
    return btn;
  }

  _showTooltip(anchorEl, text) {
    this._dismissTooltip();
    const tooltip = document.createElement('div');
    tooltip.className = 'action-tooltip';
    tooltip.textContent = text;
    document.body.appendChild(tooltip);

    const rect = anchorEl.getBoundingClientRect();
    tooltip.style.left = `${rect.left + rect.width / 2}px`;
    tooltip.style.top = `${rect.top - 8}px`;
    tooltip.style.transform = 'translate(-50%, -100%)';

    this._activeTooltip = tooltip;
    this._tooltipTimer = setTimeout(() => this._dismissTooltip(), 2500);
  }

  _dismissTooltip() {
    if (this._activeTooltip) {
      this._activeTooltip.remove();
      this._activeTooltip = null;
    }
    clearTimeout(this._tooltipTimer);
  }

  _showMessage(msg) {
    const el = document.createElement('div');
    el.className = 'action-message';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('show'), 10);
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 2000);
  }

  destroy() {
    this._dismissTooltip();
    if (this.el) this.el.remove();
  }
}

export const ActionBar = new ActionBarClass();
