// ========================================================
// Garden — flower planting and management
// ========================================================

import { random, el } from './utils.js';

const PETAL_SHADES = ['shade-1', 'shade-2', 'shade-3'];

export class Garden {
    constructor(container, effectsContainer) {
        this.container = container;
        this.effects = effectsContainer;
        this.flowers = [];
    }

    plant(x, y) {
        const stemHeight = random(35, 65);
        const bloomSize = random(36, 52);
        const petalCount = Math.random() < 0.3 ? 5 : 6;
        const flower = el('div', 'lily pop-in');

        flower.style.left = `${x - bloomSize / 2}px`;
        flower.style.bottom = `${y}px`;
        flower.style.width = `${bloomSize}px`;

        // Stem
        const stem = el('div', 'lily-stem', flower);
        stem.style.height = `${stemHeight}px`;
        stem.style.setProperty('--sway-dur', `${random(3.5, 5.5)}s`);
        stem.style.setProperty('--sway-delay', `${random(0, 2)}s`);

        // Bloom container
        const bloom = el('div', 'lily-bloom', flower);
        bloom.style.setProperty('--bloom-size', `${bloomSize}px`);
        bloom.style.top = `${-stemHeight + 4}px`;

        // Petals — evenly spaced with slight random offset for natural look
        const angleStep = 360 / petalCount;
        for (let i = 0; i < petalCount; i++) {
            const angle = angleStep * i + random(-8, 8);
            const shade = PETAL_SHADES[i % PETAL_SHADES.length];
            const petal = el('div', `lily-petal ${shade}`, bloom);
            petal.style.setProperty('--petal-angle', `${angle}deg`);
            petal.style.setProperty('--bloom-delay', `${i * 0.06}s`);
        }

        // Center pistil
        el('div', 'lily-center', bloom);

        // Stamen dots (small golden dots around center)
        const stamenCount = 5;
        for (let i = 0; i < stamenCount; i++) {
            const sAngle = (360 / stamenCount) * i * (Math.PI / 180);
            const radius = bloomSize * 0.14;
            const stamen = el('div', 'lily-stamen', bloom);
            stamen.style.setProperty('--stamen-x', `${Math.cos(sAngle) * radius}px`);
            stamen.style.setProperty('--stamen-y', `${Math.sin(sAngle) * radius}px`);
            stamen.style.setProperty('--stamen-delay', `${0.6 + i * 0.04}s`);
        }

        // Leaves
        el('div', 'lily-leaf left', flower);
        el('div', 'lily-leaf right', flower);

        this.container.appendChild(flower);

        // Trigger bloom after paint
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                flower.classList.add('bloomed');
            });
        });

        // Sparkle burst
        this._sparkle(x, y + stemHeight);

        this.flowers.push(flower);
        return this.flowers.length;
    }

    _sparkle(x, baseY) {
        const sceneRect = this.container.getBoundingClientRect();
        const screenY = sceneRect.bottom - baseY;
        for (let i = 0; i < 5; i++) {
            const spark = el('div', 'sparkle', this.effects);
            spark.style.left = `${x + random(-20, 20)}px`;
            spark.style.top = `${screenY + random(-30, 0)}px`;
            spark.addEventListener('animationend', () => spark.remove());
        }
    }

    get count() {
        return this.flowers.length;
    }
}
