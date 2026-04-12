import { GameState } from '../systems/GameState.js';
import { Story } from '../systems/Story.js';
import { AudioManager } from '../audio/AudioManager.js';

class StoryJournalClass {
  constructor() {
    this.el = null;
  }

  create() {
    this.el = document.createElement('div');
    this.el.id = 'story-journal';
    this.el.className = 'overlay-panel';
    this.el.style.display = 'none';
    document.body.appendChild(this.el);

    GameState.on('open-story-journal', () => this.show());
  }

  show() {
    this.el.style.display = 'flex';
    this._render();
  }

  _render() {
    const chapters = Story.getChapters();
    const currentChapter = GameState.storyProgress.chapter;
    const completed = GameState.storyProgress.completedMissions;

    let html = `<div class="panel-content story-content">
      <div class="panel-header">
        <h2>📖 Story Journal — "Gru's Master Plan"</h2>
        <button class="btn" id="story-close">✖ Close</button>
      </div>`;

    // Rescue button for chapter 4
    const rescueAvailable = currentChapter >= 4 && GameState.capturedMinionId
      && !GameState.storyProgress.flags.rescueFunded
      && completed.includes('4.4');
    if (rescueAvailable) {
      const captured = GameState.getMinion(GameState.capturedMinionId);
      html += `<div class="rescue-banner">
        <p>🚨 <b>${captured?.name || 'A Minion'}</b> has been captured by Vector!</p>
        <button class="btn primary" id="fund-rescue">💰 Fund Rescue (75 🪙)</button>
      </div>`;
    }

    for (const ch of chapters) {
      const isActive = ch.id === currentChapter;
      const isCompleted = ch.id < currentChapter;
      const isLocked = ch.id > currentChapter;

      const chMissions = ch.missions;
      const completedCount = chMissions.filter(m => completed.includes(m.id)).length;
      const progress = Math.round((completedCount / chMissions.length) * 100);

      html += `<div class="story-chapter ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isLocked ? 'locked' : ''}">
        <h3>${isCompleted ? '✅' : isLocked ? '🔒' : '📜'} Chapter ${ch.id}: ${ch.name}</h3>
        <p class="chapter-desc">${ch.desc}</p>
        <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
        <p class="progress-text">${completedCount}/${chMissions.length} missions</p>`;

      if (!isLocked) {
        html += '<div class="mission-list">';
        for (const m of chMissions) {
          const done = completed.includes(m.id);
          const active = !done && isActive && Story.getActiveMission()?.id === m.id;
          html += `<div class="mission ${done ? 'done' : ''} ${active ? 'active-mission' : ''}">
            <span class="mission-status">${done ? '✅' : active ? '▶' : '⬜'}</span>
            <span class="mission-name">${m.name}</span>
            <span class="mission-obj">${m.objective}</span>
            <span class="mission-reward">${done ? m.rewardText : ''}</span>
          </div>`;
        }
        html += '</div>';
      }

      if (isCompleted) {
        html += `<p class="chapter-reward">🏆 ${ch.rewardText}</p>`;
      }

      html += '</div>';
    }

    if (GameState.freeplusMode) {
      html += '<div class="freeplay-banner">⭐ Freeplay+ Mode Active! Coin earn rate ×1.5, clothing 50% off. ⭐</div>';
    }

    html += '</div>';
    this.el.innerHTML = html;

    this.el.querySelector('#story-close').addEventListener('click', () => this.hide());

    const rescueBtn = this.el.querySelector('#fund-rescue');
    if (rescueBtn) {
      rescueBtn.addEventListener('click', () => {
        AudioManager.play('coin');
        if (Story.fundRescue()) {
          this._render();
        } else {
          rescueBtn.textContent = 'Not enough coins!';
          setTimeout(() => { rescueBtn.textContent = '💰 Fund Rescue (75 🪙)'; }, 1500);
        }
      });
    }
  }

  hide() {
    this.el.style.display = 'none';
  }

  destroy() {
    if (this.el) this.el.remove();
  }
}

export const StoryJournal = new StoryJournalClass();
