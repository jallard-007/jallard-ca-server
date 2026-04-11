import * as Phaser from 'phaser';
import { random, randomChoice, clamp } from '../utils.js';
import { BUNNY_COLORS, COLOR_KEYS, BUNNY_NAMES, DEPTH, BUNNY_SPEED, JUMP_DURATION, JUMP_HEIGHT, WALK_BOUNCE, WALK_PERIOD, PET_DURATION, MUNCH_DURATION } from '../config.js';
import { sfxPet, sfxHop, sfxMunch } from '../systems/Audio.js';

const usedNames = new Set();

function pickName() {
    const available = BUNNY_NAMES.filter(n => !usedNames.has(n));
    const name = available.length > 0 ? randomChoice(available) : `Bunny #${usedNames.size + 1}`;
    usedNames.add(name);
    return name;
}

export class Bunny {
    constructor(scene, x, y) {
        this.scene = scene;
        this.name = pickName();
        this.colorKey = randomChoice(COLOR_KEYS);
        this.carrotsEaten = 0;
        this.facingRight = Math.random() > 0.5;
        this.state = 'idle';
        this.stateTimer = random(1, 3);
        this.targetX = x;
        this.walkCycle = 0;
        this.jumpTimer = 0;
        this.jumpCooldown = random(3, 8);
        this.removed = false;
        this.dragging = false;
        this.wasDragged = false;
        this.carrotCallback = null;
        this.carrotTarget = null;

        this._buildVisual(x, y);
        this._setupInput();
        this._startIdleAnimations();

        // Pop-in
        this.container.setScale(0);
        scene.tweens.add({
            targets: this.container,
            scaleX: 1, scaleY: 1,
            duration: 500,
            ease: 'Back.easeOut',
        });
    }

    _buildVisual(x, y) {
        const scene = this.scene;
        const colors = BUNNY_COLORS[this.colorKey];
        const body = colors.body;
        const accent = colors.accent;

        // Inner container (flippable)
        this.inner = scene.add.container(0, 0);

        // Build body parts — added back-to-front
        this.footL = scene.add.ellipse(-10, -4, 14, 8, body);
        this.footR = scene.add.ellipse(10, -4, 14, 8, body);
        this.bodyShape = scene.add.ellipse(0, -24, 40, 32, body);
        this.tail = scene.add.circle(22, -22, 6, body);

        // Ears
        this.earL = scene.add.ellipse(-10, -62, 11, 28, body);
        this.earInnerL = scene.add.ellipse(-10, -60, 5, 18, accent);
        this.earR = scene.add.ellipse(10, -62, 11, 28, body);
        this.earInnerR = scene.add.ellipse(10, -60, 5, 18, accent);

        this.head = scene.add.ellipse(0, -44, 30, 28, body);

        // Face
        this.eyeL = scene.add.ellipse(-7, -48, 5, 6, 0x333333);
        this.eyeR = scene.add.ellipse(7, -48, 5, 6, 0x333333);
        // Eye highlight
        this.eyeHighL = scene.add.ellipse(-6, -49, 2, 2, 0xFFFFFF);
        this.eyeHighR = scene.add.ellipse(8, -49, 2, 2, 0xFFFFFF);
        this.cheekL = scene.add.ellipse(-11, -40, 8, 5, accent).setAlpha(0.4);
        this.cheekR = scene.add.ellipse(11, -40, 8, 5, accent).setAlpha(0.4);
        this.nose = scene.add.ellipse(0, -39, 5, 4, accent);

        this.inner.add([
            this.footL, this.footR, this.bodyShape, this.tail,
            this.earL, this.earInnerL, this.earR, this.earInnerR,
            this.head, this.eyeL, this.eyeR, this.eyeHighL, this.eyeHighR,
            this.cheekL, this.cheekR, this.nose,
        ]);

        // Name tag (outside inner so it doesn't flip)
        this.nameTag = scene.add.text(0, -82, this.name, {
            fontFamily: "'Nunito', 'Segoe UI', sans-serif",
            fontSize: '11px',
            fontStyle: 'bold',
            color: '#FF1493',
            backgroundColor: 'rgba(255,255,255,0.88)',
            padding: { x: 8, y: 2 },
            align: 'center',
        }).setOrigin(0.5, 1).setAlpha(0);

        // Outer container
        this.container = scene.add.container(x, y, [this.inner, this.nameTag]);
        this.container.setDepth(DEPTH.BUNNY);

        this._updateFacing();
    }

    _setupInput() {
        const scene = this.scene;
        const hitArea = new Phaser.Geom.Rectangle(-30, -85, 60, 95);
        this.container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
        scene.input.setDraggable(this.container);

        this.container.on('pointerover', () => {
            scene.tweens.add({ targets: this.nameTag, alpha: 1, duration: 200 });
        });
        this.container.on('pointerout', () => {
            if (!this.dragging) {
                scene.tweens.add({ targets: this.nameTag, alpha: 0, duration: 200 });
            }
        });

        this.container.on('pointerdown', () => {
            this.wasDragged = false;
            this.dragging = true;
            this.state = 'dragged';
            this.inner.y = 0; // clear bounce offset
            this.container.setDepth(DEPTH.BUNNY_GRABBED);
            this.nameTag.setAlpha(1);
        });

        this.container.on('dragstart', () => {
            this.wasDragged = true;
        });

        this.container.on('drag', (pointer, dragX, dragY) => {
            const w = scene.scale.width;
            const h = scene.scale.height;
            const groundY = h * 0.45;
            this.container.x = clamp(dragX, 30, w - 30);
            this.container.y = clamp(dragY, groundY + 20, h - 20);
            if (dragX > this.container.x + 2) this.facingRight = true;
            else if (dragX < this.container.x - 2) this.facingRight = false;
            this._updateFacing();
        });

        this.container.on('pointerup', () => {
            this.dragging = false;
            this.container.setDepth(DEPTH.BUNNY);
            if (!this.wasDragged) {
                // Tap → open modal
                this.scene.game.events.emit('bunny:tap', this);
            }
            this.state = 'idle';
            this.stateTimer = random(1.5, 3);
        });
    }

    _startIdleAnimations() {
        const scene = this.scene;

        // Ear wiggle
        scene.tweens.add({
            targets: this.earL,
            angle: { from: -12, to: -20 },
            duration: 3000,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1,
        });
        scene.tweens.add({
            targets: this.earR,
            angle: { from: 12, to: 20 },
            duration: 3400,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1,
        });
        // Ear inners follow
        scene.tweens.add({
            targets: this.earInnerL,
            angle: { from: -12, to: -20 },
            duration: 3000,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1,
        });
        scene.tweens.add({
            targets: this.earInnerR,
            angle: { from: 12, to: 20 },
            duration: 3400,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1,
        });

        // Tail wag
        scene.tweens.add({
            targets: this.tail,
            x: { from: 22, to: 19 },
            y: { from: -22, to: -23 },
            duration: 750,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1,
        });

        // Eye blink (periodic)
        this._blinkTimer = scene.time.addEvent({
            delay: random(3000, 6000),
            callback: () => {
                this._blink();
                this._blinkTimer.delay = random(3000, 6000);
            },
            loop: true,
        });
    }

    _blink() {
        const scene = this.scene;
        [this.eyeL, this.eyeR, this.eyeHighL, this.eyeHighR].forEach(eye => {
            scene.tweens.add({
                targets: eye,
                scaleY: 0.1,
                duration: 60,
                yoyo: true,
                ease: 'Sine.easeInOut',
            });
        });
    }

    _updateFacing() {
        this.inner.scaleX = this.facingRight ? 1 : -1;
    }

    pet() {
        if (this.state === 'petted') return;
        this.state = 'petted';
        this.stateTimer = PET_DURATION;
        this.inner.y = 0;
        sfxPet();

        // Happy bounce tween
        this.scene.tweens.add({
            targets: this.inner,
            y: { from: 0, to: -22 },
            duration: 150,
            yoyo: true,
            repeat: 2,
            ease: 'Sine.easeOut',
        });

        // Name tag visible
        this.nameTag.setAlpha(1);

        // Spawn hearts
        for (let i = 0; i < 4; i++) {
            this.scene.time.delayedCall(i * 100, () => this._spawnHeart());
        }
    }

    _spawnHeart() {
        const cx = this.container.x;
        const cy = this.container.y - 50;
        const emoji = randomChoice(['💕', '💖', '💗', '✨']);
        const heart = this.scene.add.text(
            cx + random(-15, 15), cy + random(-5, 5),
            emoji, { fontSize: '18px' }
        ).setOrigin(0.5).setDepth(DEPTH.EFFECTS);

        this.scene.tweens.add({
            targets: heart,
            y: cy - 70,
            alpha: 0,
            scale: { from: 0.3, to: 1.1 },
            duration: 1200,
            ease: 'Cubic.easeOut',
            onComplete: () => heart.destroy(),
        });
    }

    hopTo(targetX) {
        if (this.state === 'petted' || this.state === 'munching' || this.state === 'dragged') return;
        const w = this.scene.scale.width;
        this.targetX = clamp(targetX, 30, w - 30);
        this.facingRight = this.targetX > this.container.x;
        this._updateFacing();
        this.state = 'walking';
        this.walkCycle = 0;
        sfxHop();
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
                this.jumpCooldown -= dt;
                if (this.jumpCooldown <= 0) {
                    this._doJump();
                    this.jumpCooldown = random(4, 10);
                }
                if (this.state !== 'idle') break;
                if (this.stateTimer <= 0) {
                    const w = this.scene.scale.width;
                    const range = w * 0.3;
                    const newX = this.container.x + random(-range, range);
                    this.hopTo(newX);
                    this.stateTimer = random(2, 5);
                }
                break;

            case 'jumping':
                this.jumpTimer += dt;
                if (this.jumpTimer >= JUMP_DURATION) {
                    this.inner.y = 0;
                    this.state = 'idle';
                    this.stateTimer = random(2, 5);
                } else {
                    const t = this.jumpTimer / JUMP_DURATION;
                    this.inner.y = -Math.sin(t * Math.PI) * JUMP_HEIGHT;
                }
                break;

            case 'walking': {
                const dx = this.targetX - this.container.x;
                const dir = Math.sign(dx);
                const step = BUNNY_SPEED * dt;

                this.walkCycle += dt;
                const hopPhase = (this.walkCycle % WALK_PERIOD) / WALK_PERIOD;
                this.inner.y = -Math.sin(hopPhase * Math.PI) * WALK_BOUNCE;

                if (Math.abs(dx) <= step) {
                    this.container.x = this.targetX;
                    this.inner.y = 0;
                    this.state = 'idle';
                    this.stateTimer = random(1.5, 4);

                    if (this.carrotCallback && this.carrotTarget) {
                        const dist = Math.abs(this.container.x - this.carrotTarget.x);
                        if (dist < 50) {
                            this.state = 'munching';
                            this.stateTimer = MUNCH_DURATION;
                            this.carrotsEaten++;
                            sfxMunch();
                            this._startMunchAnim();
                            this.carrotCallback();
                            this.carrotCallback = null;
                            this.carrotTarget = null;
                        }
                    }
                } else {
                    this.container.x += dir * step;
                }
                break;
            }

            case 'munching':
                if (this.stateTimer <= 0) {
                    this._stopMunchAnim();
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
                break;
        }
    }

    _doJump() {
        if (this.state !== 'idle') return;
        this.state = 'jumping';
        this.jumpTimer = 0;
    }

    _startMunchAnim() {
        this._munchTween = this.scene.tweens.add({
            targets: this.nose,
            scaleY: { from: 1, to: 0.6 },
            duration: 125,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    }

    _stopMunchAnim() {
        if (this._munchTween) {
            this._munchTween.stop();
            this._munchTween = null;
            this.nose.setScale(1);
        }
    }

    setColor(colorKey) {
        if (!BUNNY_COLORS[colorKey]) return;
        this.colorKey = colorKey;
        const c = BUNNY_COLORS[colorKey];
        // Update body-colored parts
        [this.bodyShape, this.head, this.earL, this.earR, this.tail,
         this.footL, this.footR].forEach(p => p.setFillStyle(c.body));
        // Update accent-colored parts
        [this.earInnerL, this.earInnerR, this.nose].forEach(p => p.setFillStyle(c.accent));
        [this.cheekL, this.cheekR].forEach(p => { p.setFillStyle(c.accent); p.setAlpha(0.4); });
    }

    setName(newName) {
        usedNames.delete(this.name);
        this.name = newName;
        usedNames.add(newName);
        this.nameTag.setText(newName);
    }

    remove() {
        this.removed = true;
        usedNames.delete(this.name);
        if (this._blinkTimer) this._blinkTimer.destroy();
        this._stopMunchAnim();

        this.scene.tweens.add({
            targets: this.container,
            scaleX: 0, scaleY: 0,
            alpha: 0,
            duration: 300,
            ease: 'Back.easeIn',
            onComplete: () => this.container.destroy(),
        });
    }

    destroy() {
        if (this._blinkTimer) this._blinkTimer.destroy();
        this._stopMunchAnim();
        this.container.destroy();
    }
}
