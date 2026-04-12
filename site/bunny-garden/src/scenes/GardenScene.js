import * as Phaser from 'phaser';
import { random, randomChoice, clamp } from '../utils.js';
import { DEPTH, DAY_COLORS, NIGHT_COLORS, GROUND_Y_FRAC, PETAL_TINTS } from '../config.js';
import { Bunny } from '../objects/Bunny.js';
import { Flower } from '../objects/Flower.js';
import { sfxPlant } from '../systems/Audio.js';

export class GardenScene extends Phaser.Scene {
    constructor() {
        super('GardenScene');
    }

    create() {
        this.bunnies = [];
        this.flowers = [];
        this.isNight = false;

        this.input.dragDistanceThreshold = 3;

        this._drawBackground();
        this._createStars();
        this._createCelestial();
        this._createClouds();
        this._createHills();
        this._createGround();
        this._createGardenZone();
        this._createPetalEmitter();
        this._setupParallax();

        this._seedContent();
        this._listenEvents();

        this.scale.on('resize', (gameSize) => {
            this._onResize(gameSize.width, gameSize.height);
        });
    }

    update(time, delta) {
        const dt = Math.min(delta / 1000, 0.1);
        for (const bunny of this.bunnies) {
            bunny.update(dt);
        }
    }

    // ===================== Background =====================

    _drawBackground() {
        const w = this.scale.width;
        const h = this.scale.height;

        // Day sky
        this.skyDay = this.add.graphics().setDepth(DEPTH.SKY);
        this._fillGradient(this.skyDay, 0, 0, w, h, DAY_COLORS.skyTop, DAY_COLORS.skyBottom);

        // Night sky (hidden initially)
        this.skyNight = this.add.graphics().setDepth(DEPTH.SKY).setAlpha(0);
        this._fillGradient(this.skyNight, 0, 0, w, h, NIGHT_COLORS.skyTop, NIGHT_COLORS.skyBottom);
    }

    _fillGradient(gfx, x, y, w, h, topColor, bottomColor) {
        gfx.clear();
        gfx.fillGradientStyle(topColor, topColor, bottomColor, bottomColor);
        gfx.fillRect(x, y, w, h);
    }

    _createStars() {
        this.stars = [];
        const w = this.scale.width;
        const h = this.scale.height;
        for (let i = 0; i < 60; i++) {
            const isLarge = Math.random() < 0.15;
            const image = this.add.image(
                random(w * 0.02, w * 0.98),
                random(h * 0.02, h * 0.55),
                isLarge ? 'star-dot-lg' : 'star-dot'
            ).setDepth(DEPTH.STARS).setVisible(false);

            const tween = this.tweens.add({
                targets: image,
                alpha: { from: 0.2, to: 1 },
                scale: { from: 0.7, to: 1.3 },
                duration: random(1500, 3500),
                yoyo: true,
                repeat: -1,
                delay: random(0, 3000),
                paused: true,
            });

            this.stars.push({ image, tween });
        }
    }

    _createCelestial() {
        const w = this.scale.width;

        // Sun
        this.sun = this.add.circle(w * 0.85, this.scale.height * 0.08, 40, 0xFFE45E)
            .setDepth(DEPTH.CELESTIAL);

        // Sun glow
        this.sunGlow = this.add.circle(w * 0.85, this.scale.height * 0.08, 55, 0xFFE45E, 0.2)
            .setDepth(DEPTH.CELESTIAL);
        this.tweens.add({
            targets: this.sunGlow,
            scale: { from: 1, to: 1.15 },
            alpha: { from: 0.2, to: 0.35 },
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        // Moon (hidden)
        this.moon = this.add.circle(w * 0.85, this.scale.height * 0.08, 38, 0xF5F5DC)
            .setDepth(DEPTH.CELESTIAL).setAlpha(0).setScale(0.6);
        // Moon crater (subtle)
        this.moonCrater = this.add.circle(w * 0.85 - 8, this.scale.height * 0.08 - 6, 8, 0x000000, 0.06)
            .setDepth(DEPTH.CELESTIAL).setAlpha(0);
    }

    _createClouds() {
        this.clouds = [];
        const w = this.scale.width;
        const h = this.scale.height;
        const configs = [
            { y: h * 0.1, scale: 1.0, speed: 40, alpha: 0.9 },
            { y: h * 0.18, scale: 0.8, speed: 30, alpha: 0.75 },
            { y: h * 0.06, scale: 0.7, speed: 25, alpha: 0.6 },
        ];

        for (const cfg of configs) {
            const cloud = this.add.container(random(-100, w), cfg.y).setDepth(DEPTH.CLOUDS);
            // Build cloud from overlapping circles
            const main = this.add.ellipse(0, 0, 120 * cfg.scale, 40 * cfg.scale, 0xFFFFFF);
            const puff1 = this.add.circle(-20 * cfg.scale, -20 * cfg.scale, 28 * cfg.scale, 0xFFFFFF);
            const puff2 = this.add.circle(15 * cfg.scale, -25 * cfg.scale, 35 * cfg.scale, 0xFFFFFF);
            cloud.add([main, puff1, puff2]);
            cloud.setAlpha(cfg.alpha);

            // Drift animation
            this.tweens.add({
                targets: cloud,
                x: { from: -200, to: w + 200 },
                duration: (w + 400) / cfg.speed * 1000,
                repeat: -1,
            });

            this.clouds.push(cloud);
        }
    }

    _createHills() {
        const w = this.scale.width;
        const h = this.scale.height;
        const groundY = h * GROUND_Y_FRAC;

        this.hillBack = this.add.ellipse(w * 0.5, groundY + 100, w * 1.3, 320, DAY_COLORS.hillBack)
            .setDepth(DEPTH.HILLS);
        this.hillMid = this.add.ellipse(w * 0.55, groundY + 120, w * 1.1, 270, DAY_COLORS.hillMid)
            .setDepth(DEPTH.HILLS);
        this.hillFront = this.add.ellipse(w * 0.4, groundY + 140, w * 1.4, 300, DAY_COLORS.hillFront)
            .setDepth(DEPTH.HILLS);
    }

    _createGround() {
        const w = this.scale.width;
        const h = this.scale.height;
        const groundY = h * GROUND_Y_FRAC;
        const groundH = h - groundY;

        this.ground = this.add.graphics().setDepth(DEPTH.GROUND);
        this.ground.fillGradientStyle(
            DAY_COLORS.groundTop, DAY_COLORS.groundTop,
            DAY_COLORS.groundBottom, DAY_COLORS.groundBottom
        );
        this.ground.fillRect(0, groundY, w, groundH);
    }

    _createGardenZone() {
        const w = this.scale.width;
        const h = this.scale.height;
        const groundY = h * GROUND_Y_FRAC;

        this.gardenZone = this.add.zone(w / 2, (groundY + h) / 2, w, h - groundY)
            .setInteractive()
            .setDepth(DEPTH.GARDEN_ZONE);

        this.gardenZone.on('pointerdown', (pointer) => {
            const count = this._plantFlower(pointer.worldX, pointer.worldY);
            this.game.events.emit('stat:flowerCount', count);
            sfxPlant();
        });
    }

    _createPetalEmitter() {
        const w = this.scale.width;
        const h = this.scale.height;

        this.petalEmitter = this.add.particles(0, 0, 'petal', {
            x: { min: -20, max: w + 20 },
            y: -20,
            lifespan: { min: 8000, max: 15000 },
            speedX: { min: -15, max: 25 },
            speedY: { min: 20, max: 60 },
            scale: { min: 0.5, max: 1.2 },
            rotate: { min: 0, max: 360 },
            alpha: { start: 0.7, end: 0 },
            tint: PETAL_TINTS,
            frequency: 600,
            quantity: 1,
        }).setDepth(DEPTH.PARTICLES);
    }

    petalBurst() {
        const w = this.scale.width;
        // Burst: emit 40 extra petals
        for (let i = 0; i < 40; i++) {
            this.petalEmitter.emitParticleAt(random(0, w), random(-200, -10));
        }
    }

    _setupParallax() {
        if (window.matchMedia('(pointer: fine)').matches) {
            this.input.on('pointermove', (pointer) => {
                if (pointer.isDown) return; // don't parallax during drag
                const cx = (pointer.x / this.scale.width - 0.5) * 2;
                const cy = (pointer.y / this.scale.height - 0.5) * 2;
                this.hillBack.x = this.scale.width * 0.5 + cx * -8;
                this.hillBack.y = this.scale.height * GROUND_Y_FRAC + 100 + cy * -3;
                this.hillMid.x = this.scale.width * 0.55 + cx * -14;
                this.hillMid.y = this.scale.height * GROUND_Y_FRAC + 120 + cy * -5;
                this.hillFront.x = this.scale.width * 0.4 + cx * -20;
                this.hillFront.y = this.scale.height * GROUND_Y_FRAC + 140 + cy * -7;
            });
        }
    }

    // ===================== Game Logic =====================

    _seedContent() {
        const w = this.scale.width;
        const h = this.scale.height;
        const groundY = h * GROUND_Y_FRAC;

        // 3 starter bunnies
        for (let i = 0; i < 3; i++) {
            const bx = random(w * 0.1, w * 0.9);
            const by = random(groundY + 40, h * 0.85);
            this._addBunny(bx, by);
        }
        this.game.events.emit('stat:bunnyCount', this.bunnies.length);

        // 5 starter flowers
        for (let i = 0; i < 5; i++) {
            this.time.delayedCall(300 + i * 200, () => {
                const fx = random(w * 0.05, w * 0.95);
                const fy = random(groundY + 60, h * 0.85);
                const count = this._plantFlower(fx, fy);
                this.game.events.emit('stat:flowerCount', count);
            });
        }
    }

    _addBunny(x, y) {
        const bunny = new Bunny(this, x, y);
        this.bunnies.push(bunny);
        return bunny;
    }

    addBunnyRandom() {
        const w = this.scale.width;
        const h = this.scale.height;
        const groundY = h * GROUND_Y_FRAC;
        const x = random(w * 0.1, w * 0.9);
        const y = random(groundY + 40, h * 0.85);
        this._addBunny(x, y);
        this.game.events.emit('stat:bunnyCount', this.bunnies.length);
    }

    removeBunny(bunny) {
        bunny.remove();
        this.bunnies = this.bunnies.filter(b => b !== bunny);
        this.game.events.emit('stat:bunnyCount', this.bunnies.length);
    }

    _plantFlower(x, y) {
        new Flower(this, x, y);
        this.flowers.push(1); // just track count
        return this.flowers.length;
    }

    dropCarrot() {
        if (this.bunnies.length === 0) return;

        const w = this.scale.width;
        const h = this.scale.height;
        const groundY = h * GROUND_Y_FRAC;
        const carrotX = random(w * 0.1, w * 0.9);
        const carrotY = random(groundY + 80, h * 0.8);

        // Create carrot visual
        const carrotTop = this.add.image(carrotX, carrotY - 15, 'carrot-top')
            .setDepth(DEPTH.BUNNY);
        const carrotBody = this.add.image(carrotX, carrotY + 2, 'carrot-body')
            .setDepth(DEPTH.BUNNY);

        // Drop animation
        const carrotContainer = this.add.container(carrotX, carrotY - 40, [carrotTop, carrotBody])
            .setDepth(DEPTH.BUNNY);
        carrotTop.setPosition(0, -15);
        carrotBody.setPosition(0, 2);

        this.tweens.add({
            targets: carrotContainer,
            y: carrotY,
            duration: 400,
            ease: 'Bounce.easeOut',
        });

        // Find nearest bunny
        let nearest = null;
        let nearestDist = Infinity;
        for (const b of this.bunnies) {
            const d = Math.abs(b.container.x - carrotX);
            if (d < nearestDist) {
                nearestDist = d;
                nearest = b;
            }
        }

        if (nearest) {
            this.time.delayedCall(500, () => {
                nearest.goToCarrot(carrotX, carrotY, () => {
                    this.tweens.add({
                        targets: carrotContainer,
                        scaleX: 0, scaleY: 0,
                        alpha: 0,
                        duration: 300,
                        ease: 'Power2',
                        onComplete: () => carrotContainer.destroy(),
                    });
                });
            });
        }
    }

    toggleDayNight() {
        this.isNight = !this.isNight;
        const dur = 1000;

        // Sky
        this.tweens.add({
            targets: this.skyNight,
            alpha: this.isNight ? 1 : 0,
            duration: dur,
            ease: 'Sine.easeInOut',
        });

        // Stars
        for (const { image, tween } of this.stars) {
            if (this.isNight) {
                image.setVisible(true);
                tween.resume();
            } else {
                tween.pause();
                image.setVisible(false);
            }
        }

        // Sun/Moon
        this.tweens.add({
            targets: [this.sun, this.sunGlow],
            alpha: this.isNight ? 0 : 1,
            scale: this.isNight ? 0.4 : 1,
            duration: dur,
        });
        this.tweens.add({
            targets: [this.moon, this.moonCrater],
            alpha: this.isNight ? 1 : 0,
            scale: this.isNight ? 1 : 0.6,
            duration: dur,
        });

        // Clouds
        for (const cloud of this.clouds) {
            this.tweens.add({
                targets: cloud,
                alpha: this.isNight ? 0.12 : cloud.getData('baseAlpha') || 0.8,
                duration: dur,
            });
        }

        // Hills
        const palette = this.isNight ? NIGHT_COLORS : DAY_COLORS;
        this._tweenFillColor(this.hillBack, palette.hillBack, dur);
        this._tweenFillColor(this.hillMid, palette.hillMid, dur);
        this._tweenFillColor(this.hillFront, palette.hillFront, dur);

        // Ground — redraw with new colors
        this.time.delayedCall(dur, () => {
            const w = this.scale.width;
            const h = this.scale.height;
            const gY = h * GROUND_Y_FRAC;
            this.ground.clear();
            this.ground.fillGradientStyle(
                palette.groundTop, palette.groundTop,
                palette.groundBottom, palette.groundBottom
            );
            this.ground.fillRect(0, gY, w, h - gY);
        });

        return this.isNight;
    }

    _tweenFillColor(shape, targetColor, duration) {
        // Extract RGB from current and target
        const from = Phaser.Display.Color.IntegerToColor(shape.fillColor);
        const to = Phaser.Display.Color.IntegerToColor(targetColor);

        this.tweens.addCounter({
            from: 0,
            to: 100,
            duration,
            onUpdate: (tween) => {
                const t = tween.getValue() / 100;
                const r = Math.round(from.red + (to.red - from.red) * t);
                const g = Math.round(from.green + (to.green - from.green) * t);
                const b = Math.round(from.blue + (to.blue - from.blue) * t);
                shape.setFillStyle(Phaser.Display.Color.GetColor(r, g, b));
            },
        });
    }

    // ===================== Events =====================

    _listenEvents() {
        this.game.events.on('action:addBunny', () => this.addBunnyRandom());
        this.game.events.on('action:feed', () => this.dropCarrot());
        this.game.events.on('action:daynight', () => {
            const isNight = this.toggleDayNight();
            this.game.events.emit('daynight:changed', isNight);
        });
        this.game.events.on('action:petals', () => this.petalBurst());
        this.game.events.on('action:petBunny', (bunny) => bunny.pet());
        this.game.events.on('action:deleteBunny', (bunny) => this.removeBunny(bunny));
        this.game.events.on('action:saveBunny', ({ bunny, name, color }) => {
            if (name) bunny.setName(name);
            if (color) bunny.setColor(color);
        });
    }

    // ===================== Resize =====================

    _onResize(w, h) {
        // Redraw sky
        this._fillGradient(this.skyDay, 0, 0, w, h, DAY_COLORS.skyTop, DAY_COLORS.skyBottom);
        this._fillGradient(this.skyNight, 0, 0, w, h, NIGHT_COLORS.skyTop, NIGHT_COLORS.skyBottom);

        // Reposition ground
        const gY = h * GROUND_Y_FRAC;
        this.ground.clear();
        const palette = this.isNight ? NIGHT_COLORS : DAY_COLORS;
        this.ground.fillGradientStyle(
            palette.groundTop, palette.groundTop,
            palette.groundBottom, palette.groundBottom
        );
        this.ground.fillRect(0, gY, w, h - gY);

        // Reposition hills
        this.hillBack.setPosition(w * 0.5, gY + 100);
        this.hillBack.setSize(w * 1.3, 320);
        this.hillMid.setPosition(w * 0.55, gY + 120);
        this.hillMid.setSize(w * 1.1, 270);
        this.hillFront.setPosition(w * 0.4, gY + 140);
        this.hillFront.setSize(w * 1.4, 300);

        // Reposition celestial
        this.sun.setPosition(w * 0.85, h * 0.08);
        this.sunGlow.setPosition(w * 0.85, h * 0.08);
        this.moon.setPosition(w * 0.85, h * 0.08);
        this.moonCrater.setPosition(w * 0.85 - 8, h * 0.08 - 6);

        // Update garden zone
        this.gardenZone.setPosition(w / 2, (gY + h) / 2);
        this.gardenZone.setSize(w, h - gY);

        // Update petal emitter bounds
        this.petalEmitter.setConfig({ x: { min: -20, max: w + 20 } });
    }
}
