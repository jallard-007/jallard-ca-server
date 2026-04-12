import Phaser from 'phaser';

export class YardScene extends Phaser.Scene {
  constructor() {
    super({ key: 'YardScene' });
  }

  create() {
    // TODO: Initialize yard background, spawn starting minions, set up input
    this.add.text(
      this.scale.width / 2,
      this.scale.height / 2,
      'Minion Sims — The Yard',
      { fontSize: '32px', color: '#fff' }
    ).setOrigin(0.5);
  }

  update(time, delta) {
    // TODO: MinionAI.update(delta), Story.checkMissions(), SaveManager.autoSave()
  }
}
