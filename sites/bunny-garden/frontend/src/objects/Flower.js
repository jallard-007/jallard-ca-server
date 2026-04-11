import * as Phaser from 'phaser';
import { random } from '../utils.js';
import { DEPTH } from '../config.js';

const PETAL_SHADES = [
    { from: 0xFF1493, to: 0xFFB6C1 },
    { from: 0xE8138A, to: 0xFFCCE0 },
    { from: 0xD4006A, to: 0xFFC0CB },
];

export class Flower {
    constructor(scene, x, y) {
        this.scene = scene;

        const stemHeight = random(35, 65);
        const bloomSize = random(36, 52);
        const petalCount = Math.random() < 0.3 ? 5 : 6;

        // Container for entire flower
        this.container = scene.add.container(x, y);
        this.container.setDepth(DEPTH.FLOWER);

        // Stem
        const stem = scene.add.rectangle(0, -stemHeight / 2, 3, stemHeight, 0x228B22);
        this.container.add(stem);

        // Leaves
        const leafL = scene.add.ellipse(-9, -stemHeight * 0.4, 18, 9, 0x3CB043);
        leafL.setAngle(-25);
        const leafR = scene.add.ellipse(9, -stemHeight * 0.55, 18, 9, 0x32CD32);
        leafR.setAngle(20);
        this.container.add([leafL, leafR]);

        // Bloom container at top of stem
        const bloomContainer = scene.add.container(0, -stemHeight);

        // Petals
        const angleStep = 360 / petalCount;
        for (let i = 0; i < petalCount; i++) {
            const angle = angleStep * i + random(-8, 8);
            const shade = PETAL_SHADES[i % PETAL_SHADES.length];
            const petalW = bloomSize * 0.48;
            const petalH = bloomSize * 0.22;
            const petal = scene.add.ellipse(0, 0, petalW, petalH, shade.from);
            petal.setAngle(angle);
            // Position petal outward from center
            const rad = angle * Math.PI / 180;
            const dist = bloomSize * 0.2;
            petal.setPosition(Math.cos(rad) * dist, Math.sin(rad) * dist);
            petal.setScale(0);
            bloomContainer.add(petal);

            // Bloom animation: scale petals in with staggered delay
            scene.tweens.add({
                targets: petal,
                scaleX: 1, scaleY: 1,
                duration: 600,
                delay: 100 + i * 60,
                ease: 'Back.easeOut',
            });
        }

        // Center pistil
        const center = scene.add.circle(0, 0, bloomSize * 0.11, 0xFFD700);
        center.setScale(0);
        bloomContainer.add(center);
        scene.tweens.add({
            targets: center,
            scaleX: 1, scaleY: 1,
            duration: 400,
            delay: 550,
            ease: 'Back.easeOut',
        });

        // Stamen dots
        for (let i = 0; i < 5; i++) {
            const sAngle = (360 / 5) * i * (Math.PI / 180);
            const radius = bloomSize * 0.14;
            const stamen = scene.add.circle(
                Math.cos(sAngle) * radius,
                Math.sin(sAngle) * radius,
                2, 0xDAA520
            );
            stamen.setScale(0);
            bloomContainer.add(stamen);
            scene.tweens.add({
                targets: stamen,
                scaleX: 1, scaleY: 1,
                duration: 350,
                delay: 600 + i * 40,
                ease: 'Back.easeOut',
            });
        }

        this.container.add(bloomContainer);

        // Sway animation on the whole flower
        scene.tweens.add({
            targets: this.container,
            angle: { from: -2, to: 2 },
            duration: random(3500, 5500),
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1,
            delay: random(0, 2000),
        });

        // Pop-in scale
        this.container.setScale(0, 0);
        scene.tweens.add({
            targets: this.container,
            scaleX: 1, scaleY: 1,
            duration: 300,
            ease: 'Back.easeOut',
        });

        // Sparkle burst
        this._sparkle(x, y - stemHeight);
    }

    _sparkle(x, y) {
        for (let i = 0; i < 5; i++) {
            const spark = this.scene.add.image(
                x + random(-20, 20),
                y + random(-30, 0),
                'sparkle'
            ).setDepth(DEPTH.EFFECTS).setScale(0);

            this.scene.tweens.add({
                targets: spark,
                scale: { from: 0, to: 1.5 },
                alpha: { from: 1, to: 0 },
                angle: { from: 0, to: 90 },
                duration: 800,
                ease: 'Cubic.easeOut',
                onComplete: () => spark.destroy(),
            });
        }
    }
}
