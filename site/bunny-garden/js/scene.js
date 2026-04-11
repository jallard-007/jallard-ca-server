// ========================================================
// Scene — sky, stars, parallax
// ========================================================

import { random, randomInt, el } from './utils.js';

export class Scene {
    constructor() {
        this.isNight = false;
        this.starsContainer = document.getElementById('stars');
        this.hills = document.querySelectorAll('.hill');
        this._createStars();
        this._setupParallax();
    }

    _createStars() {
        const count = 60;
        for (let i = 0; i < count; i++) {
            const star = el('div', 'star', this.starsContainer);
            star.style.left = `${random(2, 98)}%`;
            star.style.top = `${random(2, 55)}%`;
            star.style.setProperty('--twinkle-dur', `${random(1.5, 3.5)}s`);
            star.style.setProperty('--twinkle-delay', `${random(0, 3)}s`);
            if (Math.random() < 0.15) star.classList.add('large');
        }
    }

    _setupParallax() {
        if (window.matchMedia('(pointer: fine)').matches) {
            document.addEventListener('mousemove', (e) => {
                const cx = (e.clientX / window.innerWidth - 0.5) * 2;
                const cy = (e.clientY / window.innerHeight - 0.5) * 2;
                this.hills[0].style.transform = `translateX(${cx * -8}px) translateY(${cy * -3}px)`;
                this.hills[1].style.transform = `translateX(${cx * -14}px) translateY(${cy * -5}px)`;
                this.hills[2].style.transform = `translateX(${cx * -20}px) translateY(${cy * -7}px)`;
            }, { passive: true });
        }
    }

    toggleDayNight() {
        this.isNight = !this.isNight;
        document.body.classList.toggle('night', this.isNight);
        return this.isNight;
    }
}
