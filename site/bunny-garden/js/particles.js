// ========================================================
// Particles — canvas-based petal & sparkle system
// ========================================================

import { random, randomChoice } from './utils.js';

const PETAL_COLORS = [
    'rgba(255, 105, 180, 0.7)',
    'rgba(255, 182, 193, 0.7)',
    'rgba(255, 192, 203, 0.6)',
    'rgba(255, 20, 147, 0.5)',
    'rgba(255, 255, 255, 0.5)',
];

class Petal {
    constructor(canvas) {
        this.reset(canvas, true);
    }

    reset(canvas, initial = false) {
        this.x = initial ? random(0, canvas.width) : random(-20, canvas.width + 20);
        this.y = initial ? random(-canvas.height, 0) : random(-80, -20);
        this.size = random(4, 10);
        this.speedX = random(-0.3, 0.5);
        this.speedY = random(0.4, 1.2);
        this.rotation = random(0, Math.PI * 2);
        this.rotationSpeed = random(-0.02, 0.02);
        this.wobbleAmp = random(0.3, 1.2);
        this.wobbleFreq = random(0.01, 0.03);
        this.wobbleOffset = random(0, Math.PI * 2);
        this.opacity = random(0.4, 0.8);
        this.color = randomChoice(PETAL_COLORS);
        this.life = 0;
    }
}

export class ParticleSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.petals = [];
        this.baseCount = 15;
        this.burstActive = false;
        this.burstTimer = 0;
        this._resize();
        window.addEventListener('resize', () => this._resize());

        // Initial petals
        for (let i = 0; i < this.baseCount; i++) {
            this.petals.push(new Petal(this.canvas));
        }
    }

    _resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;
        this.canvas.style.width = `${window.innerWidth}px`;
        this.canvas.style.height = `${window.innerHeight}px`;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    burst() {
        this.burstActive = true;
        this.burstTimer = 4;
        // Add extra petals
        const extra = 40;
        for (let i = 0; i < extra; i++) {
            const p = new Petal(this.canvas);
            p.x = random(0, window.innerWidth);
            p.y = random(-200, -10);
            p.speedY = random(1, 3);
            p.size = random(5, 13);
            this.petals.push(p);
        }
    }

    update(dt) {
        if (this.burstActive) {
            this.burstTimer -= dt;
            if (this.burstTimer <= 0) {
                this.burstActive = false;
            }
        }

        const w = window.innerWidth;
        const h = window.innerHeight;

        for (let i = this.petals.length - 1; i >= 0; i--) {
            const p = this.petals[i];
            p.life += dt;
            p.x += p.speedX + Math.sin(p.life * p.wobbleFreq * 60 + p.wobbleOffset) * p.wobbleAmp;
            p.y += p.speedY;
            p.rotation += p.rotationSpeed;

            if (p.y > h + 20 || p.x < -40 || p.x > w + 40) {
                if (!this.burstActive && this.petals.length > this.baseCount) {
                    this.petals.splice(i, 1);
                } else {
                    p.reset(this.canvas);
                }
            }
        }
    }

    render() {
        const ctx = this.ctx;
        const w = window.innerWidth;
        const h = window.innerHeight;
        ctx.clearRect(0, 0, w, h);

        for (const p of this.petals) {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.globalAlpha = p.opacity;
            ctx.fillStyle = p.color;

            // Draw petal shape (leaf-like ellipse)
            ctx.beginPath();
            ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
    }
}
