import { GameState } from '../systems/GameState.js';

class AudioManagerClass {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio not available');
    }
    // Resume on first user interaction
    const resume = () => {
      if (this.ctx?.state === 'suspended') this.ctx.resume();
      document.removeEventListener('pointerdown', resume);
    };
    document.addEventListener('pointerdown', resume);
  }

  playFile(url) {
    if (!this.enabled) return;
    // Reuse pooled Audio elements to avoid constant allocation
    if (!this._audioPool) this._audioPool = {};
    let audio = this._audioPool[url];
    if (!audio || !audio.paused) {
      audio = new Audio(url);
      this._audioPool[url] = audio;
    }
    audio.currentTime = 0;
    audio.volume = GameState.settings.sfxVolume / 100;
    audio.play().catch(() => {});
  }

  play(soundId) {
    if (!this.ctx || !this.enabled) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const vol = (GameState.settings.sfxVolume / 100) * 0.2;
    const sounds = {
      'kiss':        () => this._chirp(600, 1000, 0.15, vol),
      'highfive':    () => this._noise(0.08, vol),
      'giggle':      () => this._chirp(500, 1200, 0.2, vol),
      'nom':         () => this._tone(300, 0.12, 'square', vol),
      'dance':       () => this._chirp(400, 800, 0.3, vol),
      'argue':       () => this._tone(150, 0.2, 'sawtooth', vol),
      'bonk':        () => this._noise(0.06, vol),
      'snore':       () => this._tone(80, 0.3, 'sine', vol),
      'celebration': () => this._chirp(500, 1500, 0.4, vol),
      'ui-click':    () => this._tone(1000, 0.04, 'sine', vol * 0.5),
      'march':       () => this._tone(250, 0.12, 'square', vol),
      'whistle':     () => this._chirp(800, 1600, 0.12, vol),
      'zipper':      () => this._noise(0.08, vol),
      'tickle':      () => this._chirp(600, 1100, 0.12, vol),
      'scold':       () => this._tone(180, 0.15, 'triangle', vol),
      'sing':        () => this._melody([440, 523, 587, 659, 523], 0.12, vol),
      'coin':        () => this._chirp(1200, 2400, 0.08, vol),
      'confetti':    () => this._chirp(800, 1600, 0.3, vol),
    };
    const fn = sounds[soundId];
    if (fn) fn();
  }

  _tone(freq, duration, type = 'sine', vol = 0.1) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  _chirp(startFreq, endFreq, duration, vol = 0.1) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, this.ctx.currentTime + duration);
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  _noise(duration, vol = 0.05) {
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    source.connect(gain).connect(this.ctx.destination);
    source.start();
  }

  _melody(notes, noteDur, vol = 0.1) {
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = this.ctx.currentTime + i * noteDur;
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + noteDur);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + noteDur);
    });
  }
}

export const AudioManager = new AudioManagerClass();
