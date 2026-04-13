import * as Phaser from 'phaser';
import { gameConfig, BUNNY_COLORS } from './config.js';
import { sfxPop, sfxDrop, sfxPetals, sfxDayNight, toggleMusic } from './systems/Audio.js';

const game = new Phaser.Game(gameConfig);

// ===================== DOM UI wiring =====================

const bunnyCountEl = document.getElementById('bunny-count');
const flowerCountEl = document.getElementById('flower-count');
const factTextEl = document.getElementById('fact-text');
const daynightIconEl = document.getElementById('daynight-icon');
const daynightLabelEl = document.getElementById('daynight-label');
const musicIconEl = document.getElementById('music-icon');
const musicLabelEl = document.getElementById('music-label');
const modal = document.getElementById('bunny-modal');
const modalName = document.getElementById('modal-name');
const modalColors = document.getElementById('modal-colors');
const modalCarrots = document.getElementById('modal-carrots');

let activeBunny = null;
let selectedColor = null;

// Build color swatches
for (const [key, val] of Object.entries(BUNNY_COLORS)) {
    const swatch = document.createElement('div');
    swatch.className = 'modal-color-swatch';
    swatch.dataset.color = key;
    const cssColor = '#' + val.body.toString(16).padStart(6, '0');
    swatch.style.background = cssColor;
    swatch.title = val.name;
    if (key === 'white') {
        swatch.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15), inset 0 0 0 1px rgba(0,0,0,0.08)';
    }
    swatch.addEventListener('click', () => {
        modalColors.querySelectorAll('.modal-color-swatch').forEach(s => s.classList.remove('selected'));
        swatch.classList.add('selected');
        selectedColor = key;
    });
    modalColors.appendChild(swatch);
}

// Stat bumps
function updateStat(el, value) {
    el.textContent = value;
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
}

// Listen for game → UI events
game.events.on('stat:bunnyCount', (count) => updateStat(bunnyCountEl, count));
game.events.on('stat:flowerCount', (count) => updateStat(flowerCountEl, count));
game.events.on('daynight:changed', (isNight) => {
    daynightIconEl.textContent = isNight ? '☀️' : '🌙';
    daynightLabelEl.textContent = isNight ? 'Day' : 'Night';
});

// Bunny tap → open modal
game.events.on('bunny:tap', (bunny) => {
    activeBunny = bunny;
    modalName.value = bunny.name;
    modalCarrots.textContent = bunny.carrotsEaten;
    selectedColor = bunny.colorKey;

    modalColors.querySelectorAll('.modal-color-swatch').forEach(s => {
        s.classList.toggle('selected', s.dataset.color === bunny.colorKey);
    });

    modal.classList.remove('modal-hidden');
});

// Button handlers → game events
document.getElementById('btn-bunny').addEventListener('click', () => {
    game.events.emit('action:addBunny');
    sfxPop();
});

document.getElementById('btn-carrot').addEventListener('click', () => {
    game.events.emit('action:feed');
    sfxDrop();
});

document.getElementById('btn-daynight').addEventListener('click', () => {
    game.events.emit('action:daynight');
    // sfxDayNight called after we know isNight state
});
game.events.on('daynight:changed', (isNight) => sfxDayNight(isNight));

document.getElementById('btn-petals').addEventListener('click', () => {
    game.events.emit('action:petals');
    sfxPetals();
});

document.getElementById('btn-music').addEventListener('click', () => {
    const playing = toggleMusic();
    musicIconEl.textContent = playing ? '🔇' : '🎵';
    musicLabelEl.textContent = playing ? 'Mute' : 'Music';
});

// Modal handlers
function closeModal() {
    modal.classList.add('modal-hidden');
    activeBunny = null;
}

modal.querySelector('.modal-backdrop').addEventListener('click', closeModal);
modal.querySelector('.modal-close').addEventListener('click', closeModal);

document.getElementById('modal-pet').addEventListener('click', () => {
    if (activeBunny) game.events.emit('action:petBunny', activeBunny);
});

document.getElementById('modal-delete').addEventListener('click', () => {
    if (!activeBunny) return;
    game.events.emit('action:deleteBunny', activeBunny);
    closeModal();
});

document.getElementById('modal-save').addEventListener('click', () => {
    if (!activeBunny) return;
    const name = modalName.value.trim();
    game.events.emit('action:saveBunny', {
        bunny: activeBunny,
        name: name || null,
        color: selectedColor || null,
    });
    closeModal();
});

// ===================== Fact bar =====================

async function fetchFact() {
    try {
        const res = await fetch('/bunny-garden/api/bunny-fact');
        if (!res.ok) return null;
        const data = await res.json();
        return data.fact;
    } catch {
        return null;
    }
}

async function showFact() {
    const fact = await fetchFact();
    if (fact) {
        factTextEl.style.animation = 'none';
        void factTextEl.offsetWidth;
        factTextEl.textContent = `🐰 ${fact}`;
        factTextEl.style.animation = '';
    }
}

setTimeout(showFact, 3000);
setInterval(showFact, 12000);
