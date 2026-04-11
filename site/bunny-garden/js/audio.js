// ========================================================
// Audio — procedural sound effects & ambient music
// ========================================================

let ctx = null;
let masterGain = null;
let musicGain = null;
let sfxGain = null;
let musicPlaying = false;
let musicNodes = [];

function ensureCtx() {
    if (!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = ctx.createGain();
        masterGain.gain.value = 0.6;
        masterGain.connect(ctx.destination);

        sfxGain = ctx.createGain();
        sfxGain.gain.value = 0.5;
        sfxGain.connect(masterGain);

        musicGain = ctx.createGain();
        musicGain.gain.value = 0.15;
        musicGain.connect(masterGain);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
}

// ===== SFX =====

function playTone(freq, duration, type = 'sine', gainVal = 0.3, detune = 0) {
    const c = ensureCtx();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    g.gain.setValueAtTime(gainVal, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.connect(g);
    g.connect(sfxGain);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + duration);
}

export function sfxPop() {
    playTone(880, 0.12, 'sine', 0.25);
    playTone(1320, 0.08, 'sine', 0.15, 5);
}

export function sfxPlant() {
    const c = ensureCtx();
    // Rising sparkle — three quick ascending tones
    [523, 659, 784].forEach((f, i) => {
        setTimeout(() => playTone(f, 0.15, 'sine', 0.2), i * 50);
    });
}

export function sfxPet() {
    const c = ensureCtx();
    // Happy chirpy ascending notes
    [660, 880, 1047, 1320].forEach((f, i) => {
        setTimeout(() => playTone(f, 0.12, 'triangle', 0.2), i * 60);
    });
}

export function sfxHop() {
    const c = ensureCtx();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, c.currentTime + 0.08);
    osc.frequency.exponentialRampToValueAtTime(180, c.currentTime + 0.15);
    g.gain.setValueAtTime(0.15, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.18);
    osc.connect(g);
    g.connect(sfxGain);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + 0.2);
}

export function sfxMunch() {
    const c = ensureCtx();
    // Crunchy noise bursts
    for (let i = 0; i < 3; i++) {
        setTimeout(() => {
            const buf = c.createBuffer(1, c.sampleRate * 0.04, c.sampleRate);
            const data = buf.getChannelData(0);
            for (let j = 0; j < data.length; j++) {
                data[j] = (Math.random() * 2 - 1) * 0.3;
            }
            const src = c.createBufferSource();
            src.buffer = buf;
            const bp = c.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.value = 800 + i * 200;
            bp.Q.value = 2;
            const g = c.createGain();
            g.gain.setValueAtTime(0.2, c.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.05);
            src.connect(bp);
            bp.connect(g);
            g.connect(sfxGain);
            src.start();
        }, i * 80);
    }
}

export function sfxPetals() {
    const c = ensureCtx();
    // Shimmery descending sparkle
    [1568, 1319, 1047, 880, 784].forEach((f, i) => {
        setTimeout(() => playTone(f, 0.2, 'sine', 0.12, Math.random() * 10), i * 70);
    });
}

export function sfxDayNight(isNight) {
    const c = ensureCtx();
    if (isNight) {
        // Gentle descending lullaby tones
        [784, 659, 523].forEach((f, i) => {
            setTimeout(() => playTone(f, 0.3, 'sine', 0.15), i * 120);
        });
    } else {
        // Bright ascending morning tones
        [523, 659, 784, 1047].forEach((f, i) => {
            setTimeout(() => playTone(f, 0.2, 'triangle', 0.15), i * 80);
        });
    }
}

export function sfxDrop() {
    const c = ensureCtx();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, c.currentTime + 0.25);
    g.gain.setValueAtTime(0.2, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
    osc.connect(g);
    g.connect(sfxGain);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + 0.3);
}

// ===== AMBIENT MUSIC =====
// Simple generative ambient: layered slow oscillators with gentle volume cycling

export function toggleMusic() {
    ensureCtx();
    if (musicPlaying) {
        stopMusic();
        return false;
    }
    startMusic();
    return true;
}

function startMusic() {
    if (musicPlaying) return;
    musicPlaying = true;
    const c = ensureCtx();

    // --- Bouncy melody over a I-V-vi-IV progression in C major ---
    const BPM = 115;
    const beatSec = 60 / BPM;
    const barSec = beatSec * 4;

    // Chord roots (2 bars each = 8-bar loop)
    const chords = [
        [261.63, 329.63, 392.00], // C
        [196.00, 246.94, 293.66], // G
        [220.00, 261.63, 329.63], // Am
        [174.61, 220.00, 261.63], // F
    ];

    // Catchy melody pattern — note index into pentatonic + octave
    const melodyNotes = [
        523.25, 587.33, 659.25, 523.25,
        783.99, 659.25, 587.33, 523.25,
        659.25, 783.99, 880.00, 783.99,
        659.25, 523.25, 587.33, 0,      // 0 = rest
    ];

    // Schedule one full loop, then repeat
    function scheduleLoop() {
        if (!musicPlaying) return;
        const now = c.currentTime + 0.05;
        const loopLen = barSec * 4;

        // Bass + pad chords
        chords.forEach((chord, ci) => {
            const chordStart = now + ci * barSec;

            // Bass note (triangle, warm)
            const bass = c.createOscillator();
            bass.type = 'triangle';
            bass.frequency.value = chord[0] / 2; // octave lower
            const bg = c.createGain();
            bg.gain.setValueAtTime(0, chordStart);
            bg.gain.linearRampToValueAtTime(0.1, chordStart + 0.05);
            bg.gain.setValueAtTime(0.1, chordStart + barSec - 0.1);
            bg.gain.linearRampToValueAtTime(0, chordStart + barSec);
            bass.connect(bg);
            bg.connect(musicGain);
            bass.start(chordStart);
            bass.stop(chordStart + barSec);
            musicNodes.push({ osc: bass, voiceGain: bg });

            // Staccato chord hits on beats 1 and 3
            [0, 2].forEach(beat => {
                chord.forEach(freq => {
                    const o = c.createOscillator();
                    o.type = 'triangle';
                    o.frequency.value = freq;
                    o.detune.value = Math.random() * 4 - 2;
                    const g = c.createGain();
                    const t = chordStart + beat * beatSec;
                    g.gain.setValueAtTime(0, t);
                    g.gain.linearRampToValueAtTime(0.045, t + 0.02);
                    g.gain.exponentialRampToValueAtTime(0.001, t + beatSec * 0.7);
                    o.connect(g);
                    g.connect(musicGain);
                    o.start(t);
                    o.stop(t + beatSec);
                    musicNodes.push({ osc: o, voiceGain: g });
                });
            });
        });

        // Melody — one note per beat
        melodyNotes.forEach((freq, i) => {
            if (freq === 0) return; // rest
            const t = now + i * beatSec;
            const dur = beatSec * 0.6;

            const o = c.createOscillator();
            o.type = 'sine';
            o.frequency.value = freq;
            o.detune.value = Math.random() * 3;

            // Slight vibrato for warmth
            const vib = c.createOscillator();
            vib.type = 'sine';
            vib.frequency.value = 5;
            const vibG = c.createGain();
            vibG.gain.value = 2;
            vib.connect(vibG);
            vibG.connect(o.frequency);

            const g = c.createGain();
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.09, t + 0.02);
            g.gain.exponentialRampToValueAtTime(0.001, t + dur);

            o.connect(g);
            g.connect(musicGain);
            o.start(t);
            o.stop(t + dur + 0.05);
            vib.start(t);
            vib.stop(t + dur + 0.05);
            musicNodes.push({ osc: o, lfo: vib, voiceGain: g });
        });

        // Schedule next loop
        musicNodes._loopTimer = setTimeout(scheduleLoop, loopLen * 1000 - 100);
    }

    scheduleLoop();
}

function stopMusic() {
    musicPlaying = false;
    const c = ensureCtx();
    const now = c.currentTime;
    clearTimeout(musicNodes._loopTimer);
    musicNodes.forEach(n => {
        if (n.voiceGain) {
            n.voiceGain.gain.cancelScheduledValues(now);
            n.voiceGain.gain.linearRampToValueAtTime(0, now + 0.5);
        }
        if (n.osc) try { n.osc.stop(now + 0.6); } catch {}
        if (n.lfo) try { n.lfo.stop(now + 0.6); } catch {}
    });
    musicNodes = [];
}

export function isMusicPlaying() {
    return musicPlaying;
}
