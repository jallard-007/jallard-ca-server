import { GameState } from '../systems/GameState.js';
import { Economy } from '../systems/Economy.js';
import { TRAITS_LIST, pickRandom } from '../utils.js';
import { AudioManager } from '../audio/AudioManager.js';

class NurseryClass {
  constructor() {
    this.el = null;
    this._parent1 = null;
    this._parent2 = null;
  }

  create() {
    this.el = document.createElement('div');
    this.el.id = 'nursery-overlay';
    this.el.className = 'overlay-panel';
    this.el.style.display = 'none';
    document.body.appendChild(this.el);

    GameState.on('open-nursery', (data) => {
      this._parent1 = data.parent1;
      this._parent2 = data.parent2;
      this.show();
    });
  }

  show() {
    this.el.style.display = 'flex';
    const p1 = this._parent1;
    const p2 = this._parent2;

    // Determine defaults biased by parents
    const defaultEye = Math.random() < 0.5 ? p1.eyeType : p2.eyeType;
    const shapes = ['tall', 'medium', 'short'];
    const defaultShape = Math.random() < 0.5 ? p1.bodyShape : p2.bodyShape;
    const weights = ['skinny', 'medium', 'chonky'];
    const defaultWeight = Math.random() < 0.5 ? (p1.weight || 'medium') : (p2.weight || 'medium');

    // Available traits
    const allTraits = [...TRAITS_LIST];
    if (GameState.storyProgress.completedMissions.includes('2.5')) {
      allTraits.push('Scientist');
    }
    if (GameState.freeplusMode) {
      allTraits.push('Legendary');
    }

    this.el.innerHTML = `
      <div class="panel-content nursery-content">
        <h2>🍼 The Nursery</h2>
        <p>A new Minion has arrived! Customize your newborn.</p>
        <p class="parents-info">Parents: <b>${p1.name}</b> & <b>${p2.name}</b></p>

        <div class="nursery-form">
          <label>Name
            <input type="text" id="nursery-name" maxlength="20" placeholder="Enter a unique name" />
          </label>
          <div class="nursery-error" id="nursery-error"></div>

          <label>Eye Type
            <select id="nursery-eye">
              <option value="one-eye" ${defaultEye === 'one-eye' ? 'selected' : ''}>One Eye</option>
              <option value="two-eye" ${defaultEye === 'two-eye' ? 'selected' : ''}>Two Eyes</option>
            </select>
          </label>

          <label>Body Shape
            <select id="nursery-shape">
              ${shapes.map(s => `<option value="${s}" ${s === defaultShape ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`).join('')}
            </select>
          </label>

          <label>Weight
            <select id="nursery-weight">
              ${weights.map(w => `<option value="${w}" ${w === defaultWeight ? 'selected' : ''}>${w.charAt(0).toUpperCase() + w.slice(1)}</option>`).join('')}
            </select>
          </label>

          <fieldset>
            <legend>Personality Traits (pick 1-2)</legend>
            <div class="trait-grid">
              ${allTraits.filter(t => t !== 'Leader' && t !== 'Lazy' && t !== 'Childlike').map(t => {
                const inherited = p1.traits.includes(t) || p2.traits.includes(t);
                return `<label class="${inherited ? 'inherited' : ''}">
                  <input type="checkbox" name="trait" value="${t}" /> ${t}${inherited ? ' ★' : ''}
                </label>`;
              }).join('')}
            </div>
          </fieldset>

          <div class="nursery-actions">
            <button class="btn primary" id="nursery-confirm">🎉 Welcome to the World!</button>
            <button class="btn" id="nursery-cancel">Cancel</button>
          </div>
        </div>
      </div>
    `;

    this.el.querySelector('#nursery-confirm').addEventListener('click', () => this._confirm());
    this.el.querySelector('#nursery-cancel').addEventListener('click', () => this.hide());

    // Limit trait selection to 2
    this.el.querySelectorAll('input[name="trait"]').forEach(cb => {
      cb.addEventListener('change', () => {
        const checked = this.el.querySelectorAll('input[name="trait"]:checked');
        if (checked.length > 2) cb.checked = false;
      });
    });
  }

  _confirm() {
    const name = this.el.querySelector('#nursery-name').value.trim();
    const errorEl = this.el.querySelector('#nursery-error');
    errorEl.textContent = '';

    if (!name) { errorEl.textContent = 'Name is required.'; return; }
    if (name.length > 20) { errorEl.textContent = 'Name too long (max 20).'; return; }
    if (GameState.getMinionByName(name)) { errorEl.textContent = 'Name must be unique.'; return; }

    const eyeType = this.el.querySelector('#nursery-eye').value;
    const bodyShape = this.el.querySelector('#nursery-shape').value;
    const weight = this.el.querySelector('#nursery-weight').value;
    const traits = [...this.el.querySelectorAll('input[name="trait"]:checked')].map(cb => cb.value);

    if (traits.length === 0) { errorEl.textContent = 'Pick at least 1 trait.'; return; }

    const p1 = this._parent1;
    const p2 = this._parent2;

    // Apply energy cost and cooldown only now that the player confirmed
    p1.energy = Math.max(0, p1.energy - 30);
    p2.energy = Math.max(0, p2.energy - 30);
    p1.cooldowns['procreate'] = Date.now() + 30000;
    p2.cooldowns['procreate'] = Date.now() + 30000;
    GameState.storyProgress.flags.procreationDone = true;

    const newMinion = GameState.createMinion({
      name, eyeType, bodyShape, weight,
      traits,
      mood: 'excited',
      hunger: 80,
      energy: 100,
      isDeletable: true,
    });

    // Set friendships with parents
    newMinion.friendship[p1.id] = 20;
    newMinion.friendship[p2.id] = 20;
    p1.friendship[newMinion.id] = 20;
    p2.friendship[newMinion.id] = 20;

    AudioManager.play('celebration');
    GameState.emit('refresh-minions');

    // Check if milestone (10th minion, etc.)
    if (GameState.minions.length % 10 === 0) {
      Economy.addCoins(25);
    }

    this.hide();
  }

  hide() {
    this.el.style.display = 'none';
    this._parent1 = null;
    this._parent2 = null;
  }

  destroy() {
    if (this.el) this.el.remove();
  }
}

export const Nursery = new NurseryClass();
