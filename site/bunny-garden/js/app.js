// ========================================================
// App — main orchestrator
// ========================================================

import { random, randomInt, clamp, distance, el } from './utils.js';
import { Scene } from './scene.js';
import { Bunny } from './bunny.js';
import { Garden } from './garden.js';
import { ParticleSystem } from './particles.js';
import { sfxPop, sfxPlant, sfxPet, sfxHop, sfxMunch, sfxPetals, sfxDayNight, sfxDrop, toggleMusic, isMusicPlaying } from './audio.js';

class App {
    constructor() {
        this.gardenEl = document.getElementById('garden');
        this.effectsEl = document.getElementById('effects');
        this.canvas = document.getElementById('particle-canvas');

        this.scene = new Scene();
        this.garden = new Garden(this.gardenEl, this.effectsEl);
        this.particles = new ParticleSystem(this.canvas);
        this.bunnies = [];

        this.bunnyCountEl = document.getElementById('bunny-count');
        this.flowerCountEl = document.getElementById('flower-count');
        this.factTextEl = document.getElementById('fact-text');
        this.daynightIconEl = document.getElementById('daynight-icon');
        this.daynightLabelEl = document.getElementById('daynight-label');
        this.musicIconEl = document.getElementById('music-icon');
        this.musicLabelEl = document.getElementById('music-label');

        this.lastTime = 0;
        this.factInterval = null;

        this._bindEvents();
        this._seedInitialContent();
        this._startFactTicker();
        this._gameLoop(0);
    }

    _bindEvents() {
        // Plant flower on garden click
        this.gardenEl.addEventListener('pointerdown', (e) => {
            const rect = this.gardenEl.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const bottomY = rect.bottom - e.clientY;
            const count = this.garden.plant(x, clamp(bottomY, 0, rect.height * 0.6));
            this._updateStat(this.flowerCountEl, count);
            sfxPlant();
        });

        // Add bunny button
        document.getElementById('btn-bunny').addEventListener('click', () => {
            this._addBunny();
            sfxPop();
        });

        // Feed carrot button
        document.getElementById('btn-carrot').addEventListener('click', () => {
            this._dropCarrot();
            sfxDrop();
        });

        // Day/night toggle
        document.getElementById('btn-daynight').addEventListener('click', () => {
            const isNight = this.scene.toggleDayNight();
            this.daynightIconEl.textContent = isNight ? '☀️' : '🌙';
            this.daynightLabelEl.textContent = isNight ? 'Day' : 'Night';
            sfxDayNight(isNight);
        });

        // Petal burst
        document.getElementById('btn-petals').addEventListener('click', () => {
            this.particles.burst();
            sfxPetals();
        });

        // Music toggle
        document.getElementById('btn-music').addEventListener('click', () => {
            const playing = toggleMusic();
            this.musicIconEl.textContent = playing ? '🔇' : '🎵';
            this.musicLabelEl.textContent = playing ? 'Mute' : 'Music';
        });
    }

    _seedInitialContent() {
        // Start with 3 bunnies
        const w = window.innerWidth;
        const gardenH = this.gardenEl.getBoundingClientRect().height;
        for (let i = 0; i < 3; i++) {
            const x = random(w * 0.1, w * 0.9);
            const y = random(80, gardenH * 0.45);
            const bunny = new Bunny(this.gardenEl, this.effectsEl, x, y, this._bunnyAudio());
            this.bunnies.push(bunny);
        }
        this._updateStat(this.bunnyCountEl, this.bunnies.length);

        // Scatter 5 starter lilies
        for (let i = 0; i < 5; i++) {
            const x = random(w * 0.05, w * 0.95);
            const y = random(40, gardenH * 0.45);
            // Small delay for visual delight
            setTimeout(() => {
                const count = this.garden.plant(x, y);
                this._updateStat(this.flowerCountEl, count);
            }, 300 + i * 200);
        }
    }

    _addBunny() {
        const w = window.innerWidth;
        const gardenH = this.gardenEl.getBoundingClientRect().height;
        const x = random(w * 0.1, w * 0.9);
        const y = random(80, gardenH * 0.45);
        const bunny = new Bunny(this.gardenEl, this.effectsEl, x, y, this._bunnyAudio());
        this.bunnies.push(bunny);
        this._updateStat(this.bunnyCountEl, this.bunnies.length);
    }

    _dropCarrot() {
        if (this.bunnies.length === 0) return;

        const w = window.innerWidth;
        const gardenRect = this.gardenEl.getBoundingClientRect();
        const carrotX = random(w * 0.1, w * 0.9);
        const carrotBottomY = random(80, gardenRect.height * 0.3);

        // Create carrot DOM
        const carrot = el('div', 'carrot');
        carrot.style.left = `${carrotX - 6}px`;
        carrot.style.bottom = `${carrotBottomY}px`;
        el('div', 'carrot-top', carrot);
        el('div', 'carrot-body', carrot);
        this.gardenEl.appendChild(carrot);

        // Find nearest bunny
        let nearest = null;
        let nearestDist = Infinity;
        for (const b of this.bunnies) {
            const d = Math.abs(b.x - carrotX);
            if (d < nearestDist) {
                nearestDist = d;
                nearest = b;
            }
        }

        if (nearest) {
            setTimeout(() => {
                nearest.goToCarrot(carrotX, carrotBottomY, () => {
                    carrot.classList.add('eaten');
                    carrot.addEventListener('animationend', () => carrot.remove());
                });
            }, 500);
        }
    }

    _updateStat(el, value) {
        el.textContent = value;
        el.classList.remove('bump');
        void el.offsetWidth;
        el.classList.add('bump');
    }

    _bunnyAudio() {
        return {
            onPet: sfxPet,
            onHop: sfxHop,
            onMunch: sfxMunch,
        };
    }

    async _fetchFact() {
        try {
            const res = await fetch('/api/fact');
            if (!res.ok) return null;
            const data = await res.json();
            return data.fact;
        } catch {
            return null;
        }
    }

    _startFactTicker() {
        const showFact = async () => {
            const fact = await this._fetchFact();
            if (fact) {
                this.factTextEl.style.animation = 'none';
                void this.factTextEl.offsetWidth;
                this.factTextEl.textContent = `🐰 ${fact}`;
                this.factTextEl.style.animation = '';
            }
        };

        // First fact after 3s, then every 12s
        setTimeout(showFact, 3000);
        this.factInterval = setInterval(showFact, 12000);
    }

    _gameLoop(timestamp) {
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
        this.lastTime = timestamp;

        // Update bunnies
        for (const bunny of this.bunnies) {
            bunny.update(dt);
        }

        // Update & render particles
        this.particles.update(dt);
        this.particles.render();

        requestAnimationFrame((t) => this._gameLoop(t));
    }
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
    new App();
});
