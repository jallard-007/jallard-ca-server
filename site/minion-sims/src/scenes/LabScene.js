import Phaser from 'phaser';

export class LabScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LabScene' });
  }

  create() {
    // TODO: Initialize lab background, minions assigned here, tools/animations
    this.add.text(
      this.scale.width / 2,
      this.scale.height / 2,
      "Minion Sims — Gru's Lab",
      { fontSize: '32px', color: '#fff' }
    ).setOrigin(0.5);
  }

  update(time, delta) {
    // TODO: MinionAI.update(delta)
  }
}
