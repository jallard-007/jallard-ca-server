import * as Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    create() {
        this._generateTextures();
        this.scene.start('GardenScene');
    }

    _generateTextures() {
        const gfx = this.make.graphics({ x: 0, y: 0, add: false });

        // Petal texture (ellipse)
        gfx.fillStyle(0xFFFFFF);
        gfx.fillEllipse(5, 3, 10, 6);
        gfx.generateTexture('petal', 10, 6);
        gfx.clear();

        // Sparkle texture (cross)
        gfx.fillStyle(0xFFD700);
        gfx.fillRect(2, 0, 2, 6);
        gfx.fillRect(0, 2, 6, 2);
        gfx.generateTexture('sparkle', 6, 6);
        gfx.clear();

        // Carrot body (triangle-ish)
        gfx.fillStyle(0xFF6600);
        gfx.fillTriangle(6, 0, 12, 0, 6, 26);
        gfx.fillTriangle(0, 0, 6, 0, 6, 26);
        gfx.generateTexture('carrot-body', 12, 26);
        gfx.clear();

        // Carrot top (green)
        gfx.fillStyle(0x32CD32);
        gfx.fillEllipse(8, 5, 16, 10);
        gfx.generateTexture('carrot-top', 16, 10);
        gfx.clear();

        // Star dot
        gfx.fillStyle(0xFFFFFF);
        gfx.fillCircle(2, 2, 2);
        gfx.generateTexture('star-dot', 4, 4);
        gfx.clear();

        // Large star dot
        gfx.fillStyle(0xFFFFFF);
        gfx.fillCircle(3, 3, 3);
        gfx.generateTexture('star-dot-lg', 6, 6);
        gfx.clear();

        // Cloud puff (white circle)
        gfx.fillStyle(0xFFFFFF);
        gfx.fillCircle(30, 30, 30);
        gfx.generateTexture('cloud-puff', 60, 60);
        gfx.clear();

        gfx.destroy();
    }
}
