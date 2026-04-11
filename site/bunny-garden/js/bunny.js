// ========================================================
// Bunny — entity with movement AI and interactions
// ========================================================

import { random, randomInt, randomChoice, clamp, distance, el } from './utils.js';

const NAMES = [
    'Clover', 'Biscuit', 'Mochi', 'Cinnamon', 'Hazel',
    'Pepper', 'Nibbles', 'Tulip', 'Snowball', 'Maple',
    'Daisy', 'Thumper', 'Cocoa', 'Peanut', 'Willow',
    'Sprout', 'Marshmallow', 'Poppy', 'Ginger', 'Luna',
    'Sage', 'Waffles', 'Pickles', 'Bean', 'Truffle',
];

const usedNames = new Set();

function pickName() {
    const available = NAMES.filter(n => !usedNames.has(n));
    const name = available.length > 0 ? randomChoice(available) : `Bunny #${usedNames.size + 1}`;
    usedNames.add(name);
    return name;
}

export class Bunny {
    constructor(container, effectsContainer, x, y, audioCallbacks = {}) {
        this.container = container;
        this.effects = effectsContainer;
        this.x = x;
        this.y = y;
        this.name = pickName();
        this.facingRight = Math.random() > 0.5;
        this.state = 'idle';
        this.stateTimer = random(1, 3);
        this.targetX = x;
        this.hopProgress = 0;
        this.removed = false;
        this.dragging = false;
        this.audio = audioCallbacks; // { onPet, onHop, onMunch }

        this._build();
        this._updatePosition();
        this.el.classList.add('pop-in');
    }

    _build() {
        this.el = el('div', 'bunny');
        this.inner = el('div', 'bunny-inner', this.el);

        // Name tag — outside inner so it doesn't flip with scaleX
        const nameTag = el('div', 'bunny-name', this.el);
        nameTag.textContent = this.name;

        // Ears
        el('div', 'bunny-ear left', this.inner);
        el('div', 'bunny-ear right', this.inner);

        // Head
        const head = el('div', 'bunny-head', this.inner);
        const eyeL = el('div', 'bunny-eye left', head);
        const eyeR = el('div', 'bunny-eye right', head);
        // Stagger blink timing
        const blinkDur = `${random(3, 6)}s`;
        const blinkDelay = `${random(0, 2)}s`;
        eyeL.style.setProperty('--blink-dur', blinkDur);
        eyeL.style.setProperty('--blink-delay', blinkDelay);
        eyeR.style.setProperty('--blink-dur', blinkDur);
        eyeR.style.setProperty('--blink-delay', blinkDelay);

        el('div', 'bunny-cheek left', head);
        el('div', 'bunny-cheek right', head);
        el('div', 'bunny-nose', head);

        // Body, tail, feet
        el('div', 'bunny-body', this.inner);
        el('div', 'bunny-tail', this.inner);
        el('div', 'bunny-foot left', this.inner);
        el('div', 'bunny-foot right', this.inner);

        this.container.appendChild(this.el);

        // Drag + tap handling
        let dragStartX = 0;
        let dragStartY = 0;
        let pointerStartX = 0;
        let pointerStartY = 0;
        let moved = false;

        const onPointerDown = (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.el.setPointerCapture(e.pointerId);
            const gardenRect = this.container.getBoundingClientRect();
            dragStartX = this.x;
            dragStartY = this.y;
            pointerStartX = e.clientX;
            pointerStartY = e.clientY;
            moved = false;
            this.dragging = true;
            this.state = 'dragged';
            this.el.classList.remove('hopping', 'petted', 'munching');
            this.el.classList.add('grabbed');
        };

        const onPointerMove = (e) => {
            if (!this.dragging) return;
            const dx = e.clientX - pointerStartX;
            const dy = e.clientY - pointerStartY;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
            const gardenRect = this.container.getBoundingClientRect();
            this.x = clamp(dragStartX + dx, 0, gardenRect.width - 60);
            this.y = clamp(dragStartY - dy, 0, gardenRect.height * 0.7);
            if (dx > 0) this.facingRight = true;
            else if (dx < 0) this.facingRight = false;
            this._updatePosition();
        };

        const onPointerUp = (e) => {
            if (!this.dragging) return;
            this.dragging = false;
            this.el.classList.remove('grabbed');
            if (!moved) {
                // Treat as tap → pet
                this.pet();
            } else {
                this.state = 'idle';
                this.stateTimer = random(1.5, 3);
            }
        };

        this.el.addEventListener('pointerdown', onPointerDown);
        this.el.addEventListener('pointermove', onPointerMove);
        this.el.addEventListener('pointerup', onPointerUp);
        this.el.addEventListener('pointercancel', onPointerUp);
        this.el.style.touchAction = 'none';
    }

    _updatePosition() {
        this.el.style.left = `${this.x}px`;
        this.el.style.bottom = `${this.y}px`;
        this.inner.style.transform = this.facingRight ? 'scaleX(1)' : 'scaleX(-1)';
    }

    pet() {
        if (this.state === 'petted') return;
        this.state = 'petted';
        this.stateTimer = 1;
        this.el.classList.remove('hopping', 'munching');
        this.el.classList.add('petted');
        if (this.audio.onPet) this.audio.onPet();

        // Spawn hearts
        for (let i = 0; i < 4; i++) {
            setTimeout(() => this._spawnHeart(), i * 100);
        }

        this.el.addEventListener('animationend', () => {
            this.el.classList.remove('petted');
        }, { once: true });
    }

    _spawnHeart() {
        const rect = this.el.getBoundingClientRect();
        const heart = el('div', 'heart', this.effects);
        heart.textContent = randomChoice(['💕', '💖', '💗', '✨']);
        heart.style.left = `${rect.left + random(-10, rect.width + 10)}px`;
        heart.style.top = `${rect.top + random(-10, 10)}px`;
        heart.addEventListener('animationend', () => heart.remove());
    }

    hopTo(targetX) {
        if (this.state === 'petted' || this.state === 'munching' || this.state === 'dragged') return;
        this.targetX = clamp(targetX, 30, window.innerWidth - 30);
        this.facingRight = this.targetX > this.x;
        this.state = 'hopping';
        this.hopProgress = 0;
        this.el.classList.remove('hopping');
        void this.el.offsetWidth;
        this.el.classList.add('hopping');
        if (this.audio.onHop) this.audio.onHop();
        this.el.addEventListener('animationend', () => {
            this.el.classList.remove('hopping');
        }, { once: true });
    }

    goToCarrot(carrotX, carrotY, onArrive) {
        this.carrotCallback = onArrive;
        this.carrotTarget = { x: carrotX, y: carrotY };
        this.hopTo(carrotX);
    }

    update(dt) {
        if (this.removed) return;

        this.stateTimer -= dt;

        switch (this.state) {
            case 'idle':
                if (this.stateTimer <= 0) {
                    // Pick random nearby target
                    const range = window.innerWidth * 0.3;
                    const newX = this.x + random(-range, range);
                    this.hopTo(newX);
                    this.stateTimer = random(2, 5);
                }
                break;

            case 'hopping':
                this.hopProgress += dt * 2.5;
                if (this.hopProgress >= 1) {
                    this.x = this.targetX;
                    this.state = 'idle';
                    this.stateTimer = random(1.5, 4);

                    // Check if heading to carrot
                    if (this.carrotCallback && this.carrotTarget) {
                        const dist = Math.abs(this.x - this.carrotTarget.x);
                        if (dist < 50) {
                            this.state = 'munching';
                            this.el.classList.add('munching');
                            this.stateTimer = 1.5;
                            if (this.audio.onMunch) this.audio.onMunch();
                            this.carrotCallback();
                            this.carrotCallback = null;
                            this.carrotTarget = null;
                        }
                    }
                } else {
                    const t = this.hopProgress;
                    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
                    const startX = this.x;
                    const hopX = startX + (this.targetX - startX) * ease;
                    this.el.style.left = `${hopX}px`;
                    this._updatePosition();
                    return; // skip normal position update during hop
                }
                break;

            case 'munching':
                if (this.stateTimer <= 0) {
                    this.el.classList.remove('munching');
                    this.state = 'idle';
                    this.stateTimer = random(2, 4);
                }
                break;

            case 'petted':
                if (this.stateTimer <= 0) {
                    this.state = 'idle';
                    this.stateTimer = random(2, 4);
                }
                break;

            case 'dragged':
                // Controlled by pointer events, skip AI
                break;
        }

        this._updatePosition();
    }

    getCenter() {
        return {
            x: this.x + 30,
            y: window.innerHeight - this.y - 37
        };
    }
}
