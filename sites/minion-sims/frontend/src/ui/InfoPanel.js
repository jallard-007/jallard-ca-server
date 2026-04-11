import { GameState } from '../systems/GameState.js';

class InfoPanelClass {
  constructor() {
    this.el = null;
  }

  create() {
    this.el = document.createElement('div');
    this.el.id = 'info-panel';
    this.el.className = 'overlay-panel';
    this.el.style.display = 'none';
    document.body.appendChild(this.el);

    GameState.on('open-info', () => this.show());

    // Close on backdrop click
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) this.hide();
    });
  }

  show() {
    this.el.style.display = 'flex';
    this._render();
  }

  _render() {
    this.el.innerHTML = `
      <div class="panel-content info-content">
        <div class="panel-header">
          <h2>ℹ️ How to Play</h2>
          <button class="btn" id="info-close">✖ Close</button>
        </div>

        <div class="info-sections">
          <section class="info-section">
            <h3>🏡 Areas</h3>
            <p>Your Minions live across three areas:</p>
            <ul>
              <li><b>The Yard</b> — The main hangout. Minions wander, interact, and play here.</li>
              <li><b>Gru's Lab</b> — A research area unlocked by completing Chapter 1. Send Minions here for story missions.</li>
              <li><b>The Factory</b> — Send Minions to work and earn 1 Banana Coin per Minion per minute.</li>
            </ul>
          </section>

          <section class="info-section">
            <h3>🎯 Selecting Minions</h3>
            <p>Tap a Minion to select it. Tap a second Minion to select a pair — this unlocks <b>pair actions</b> like High Five, Kiss, and Dance Together.</p>
            <p>The action bar appears at the bottom when a Minion is selected.</p>
          </section>

          <section class="info-section">
            <h3>⚡ Actions</h3>
            <p><b>Solo actions</b> affect one Minion:</p>
            <ul>
              <li>🍌 <b>Feed</b> — Costs 1 banana. Restores hunger and boosts mood.</li>
              <li>😴 <b>Nap</b> — Puts a tired Minion to sleep to restore energy.</li>
              <li>👔 <b>Dress Up</b> — Opens the wardrobe to change outfits.</li>
              <li>🤭 <b>Tickle</b> — Boosts mood.</li>
              <li>😤 <b>Scold</b> — Lowers mood.</li>
              <li>🏭 <b>To Factory</b> — Sends the Minion to work.</li>
              <li>🔬 <b>To Lab</b> — Sends the Minion to the lab.</li>
              <li>🏡 <b>To Yard</b> — Sends the Minion back to the yard.</li>
            </ul>
            <p><b>Pair actions</b> require two selected Minions:</p>
            <ul>
              <li>🙏 <b>High Five</b> — Builds friendship.</li>
              <li>💋 <b>Kiss</b> — Requires friendship ≥ 30.</li>
              <li>👶 <b>Procreate</b> — Creates a new Minion. Requires friendship ≥ 60 and both need ≥ 30 energy.</li>
              <li>🍌 <b>Gift Banana</b> — Costs 1 banana. Big friendship boost and feeds the other Minion.</li>
              <li>⚡ <b>Argue</b> — Damages friendship and mood.</li>
            </ul>
            <p>More actions unlock as you progress through the story!</p>
          </section>

          <section class="info-section">
            <h3>💰 Economy</h3>
            <ul>
              <li><b>🪙 Banana Coins</b> — Earned from factory work, story missions, and daily login. Used to buy bananas and clothing.</li>
              <li><b>🍌 Bananas</b> — Used to feed Minions and gift to others. Buy 5 for 3 coins using the 🛒 button in the top bar.</li>
            </ul>
          </section>

          <section class="info-section">
            <h3>📖 Story</h3>
            <p>Complete missions across 5 chapters to unlock new actions, clothing, areas, and the "Minion Master" title. Open the 📖 Story Journal to track your progress.</p>
          </section>

          <section class="info-section">
            <h3>😊 Mood & Needs</h3>
            <p>Each Minion has <b>hunger</b>, <b>energy</b>, and <b>mood</b>. Hunger decays over time — feed them bananas! Energy recovers slowly; at 0 they auto-sleep. Mood drifts toward neutral. Keep your Minions happy through actions and interactions.</p>
          </section>

          <section class="info-section">
            <h3>⚙️ Tips</h3>
            <ul>
              <li>Minions near each other auto-interact and build friendship.</li>
              <li>You get a daily login bonus of 5 coins.</li>
              <li>The game auto-saves every 30 seconds.</li>
              <li>Adjust game speed in ⚙️ Settings.</li>
            </ul>
          </section>
        </div>
      </div>
    `;

    this.el.querySelector('#info-close').addEventListener('click', () => this.hide());
  }

  hide() {
    this.el.style.display = 'none';
  }

  destroy() {
    if (this.el) this.el.remove();
  }
}

export const InfoPanel = new InfoPanelClass();
