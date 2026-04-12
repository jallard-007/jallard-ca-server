import { GameState } from './GameState.js';
import { Economy } from './Economy.js';
import { getMoodFromValue } from '../utils.js';
import { AudioManager } from '../audio/AudioManager.js';

/* ── helpers ── */

// Pooled text objects to reduce GC pressure from floatText/particleBurst
const _textPool = [];
const MAX_POOL = 60;

function _acquireText(scene, x, y, text, style) {
  let t = _textPool.pop();
  if (t && t.scene === scene) {
    t.setPosition(x, y).setText(text).setStyle(style).setAlpha(1).setVisible(true).setDepth(1000).setOrigin(0.5);
  } else {
    if (t) t.destroy(); // wrong scene, discard
    t = scene.add.text(x, y, text, style).setOrigin(0.5).setDepth(1000);
  }
  return t;
}

function _releaseText(t) {
  if (!t || !t.scene) return;
  t.setVisible(false);
  if (_textPool.length < MAX_POOL) {
    _textPool.push(t);
  } else {
    t.destroy();
  }
}

function floatText(scene, x, y, text, color = '#ffffff') {
  if (!scene) return;
  const t = _acquireText(scene, x, y, text, {
    fontSize: '20px', color, fontFamily: 'Arial',
    stroke: '#000', strokeThickness: 2,
  });
  scene.tweens.add({
    targets: t, y: y - 40, alpha: 0, duration: 1200,
    onComplete: () => _releaseText(t),
  });
}

function particleBurst(scene, x, y, emoji, count = 5) {
  if (!scene) return;
  for (let i = 0; i < count; i++) {
    const t = _acquireText(scene, x, y, emoji, { fontSize: '16px' });
    const angle = (Math.PI * 2 * i) / count;
    const dist = 30 + Math.random() * 30;
    scene.tweens.add({
      targets: t,
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist - 20,
      alpha: 0,
      duration: 800 + Math.random() * 400,
      onComplete: () => _releaseText(t),
    });
  }
}

function getSpritePos(scene, minionId) {
  const spr = scene?.minionSprites?.get(minionId);
  return spr ? { x: spr.x, y: spr.y } : null;
}

function midpoint(scene, a, b) {
  const pa = getSpritePos(scene, a.id);
  const pb = getSpritePos(scene, b.id);
  if (!pa || !pb) return null;
  return { x: (pa.x + pb.x) / 2, y: Math.min(pa.y, pb.y) - 20 };
}

function isOnCooldown(minion, actionId) {
  const cd = minion.cooldowns[actionId];
  if (!cd) return false;
  return Date.now() < cd;
}

function setCooldown(minion, actionId, ms) {
  minion.cooldowns[actionId] = Date.now() + ms;
}

/* ── registry ── */

const actions = [];

export const ActionRegistry = {
  register(action) { actions.push(action); },
  getAll() { return [...actions]; },
  get(id) { return actions.find(a => a.id === id); },

  getSoloActions() {
    return actions.filter(a => a.type === 'solo' && GameState.unlockedActions.has(a.id));
  },
  getPairActions() {
    return actions.filter(a => a.type === 'pair' && GameState.unlockedActions.has(a.id));
  },
};

/* ═══════════════ PAIR ACTIONS ═══════════════ */

ActionRegistry.register({
  id: 'kiss', label: 'Kiss', icon: '💋', type: 'pair', cooldown: 10000,
  canPerform(a, b) {
    if (isOnCooldown(a, 'kiss')) return { ok: false, reason: 'On cooldown' };
    const f = a.friendship[b.id] || 0;
    return { ok: f >= 30, reason: f < 30 ? 'Friendship must be ≥ 30' : '' };
  },
  perform(a, b, scene) {
    GameState.setFriendship(a.id, b.id, (a.friendship[b.id] || 0) + 15);
    GameState.setFriendship(b.id, a.id, (b.friendship[a.id] || 0) + 15);
    GameState.setMinionMood(a.id, 70); GameState.setMinionMood(b.id, 70);
    setCooldown(a, 'kiss', this.cooldown);
    setCooldown(b, 'kiss', this.cooldown);
    GameState.storyProgress.flags.kissPerformed = true;
    GameState.emit('state-changed');
    const mp = midpoint(scene, a, b);
    if (mp) { particleBurst(scene, mp.x, mp.y, '❤️', 6); floatText(scene, mp.x, mp.y - 20, '💋'); }
    return { success: true, message: `${a.name} kissed ${b.name}!` };
  },
});

// Preload images and audio as blob URLs at module load (fetched once, no network on use)
const _imgBase = import.meta.env.BASE_URL || '/minion-sims/';
const _assetCache = {};
const _assetURLs = [
  `${_imgBase}img/IMG_3011.jpg`,
  `${_imgBase}img/IMG_3010.jpg`,
  `${_imgBase}audio/vine-boom.mp3`,
  `${_imgBase}audio/minion-yahoo.mp3`,
];
Promise.all(_assetURLs.map(url =>
  fetch(url)
    .then(r => r.blob())
    .then(blob => { _assetCache[url] = URL.createObjectURL(blob); })
    .catch(() => { _assetCache[url] = url; }) // fallback to original URL
));
function _cached(url) { return _assetCache[url] || url; }

function showProcreateCutscene(parent1, parent2) {
  // Block all input
  const blocker = document.createElement('div');
  blocker.id = 'procreate-cutscene';
  Object.assign(blocker.style, {
    position: 'fixed', inset: '0', zIndex: '99999',
    background: 'rgba(0,0,0,0.85)', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    pointerEvents: 'all',
  });
  blocker.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); }, true);
  blocker.addEventListener('click', e => { e.stopPropagation(); e.preventDefault(); }, true);
  document.body.appendChild(blocker);

  // Use a stack container so both images occupy the same space.
  // IMG_3010 sits underneath from the start — no src swap, no stutter.
  const stack = document.createElement('div');
  Object.assign(stack.style, {
    position: 'relative',
    width: '45vmin', height: '45vmin',
  });
  blocker.appendChild(stack);

  const imgStyle = {
    position: 'absolute', inset: '0',
    width: '100%', height: '100%',
    borderRadius: '12px', objectFit: 'contain',
  };

  const img2 = document.createElement('img');
  Object.assign(img2.style, { ...imgStyle, opacity: '0' });
  img2.src = _cached(`${_imgBase}img/IMG_3010.jpg`);
  stack.appendChild(img2);

  const img1 = document.createElement('img');
  Object.assign(img1.style, { ...imgStyle, opacity: '1' });
  img1.src = _cached(`${_imgBase}img/IMG_3011.jpg`);
  stack.appendChild(img1);

  // Phase 1: flash IMG_3011, vine boom
  AudioManager.playFile(_cached(`${_imgBase}audio/vine-boom.mp3`));

  // Fade IMG_3011 out — IMG_3010 is already rendered underneath
  setTimeout(() => {
    img1.style.transition = 'opacity 0.75s ease';
    img1.style.opacity = '0';
  }, 50);

  // Phase 2: fade IMG_3010 in once IMG_3011 is gone — minion yahoo
  setTimeout(() => {
    img2.style.transition = 'opacity 0.4s ease';
    img2.style.opacity = '1';
    AudioManager.playFile(_cached(`${_imgBase}audio/minion-yahoo.mp3`));
  }, 900);

  // Phase 3: hold 1s then fade both out, open nursery
  setTimeout(() => {
    img2.style.transition = 'opacity 0.4s ease';
    img2.style.opacity = '0';
    setTimeout(() => {
      blocker.remove();
      GameState.emit('open-nursery', { parent1, parent2 });
    }, 400);
  }, 1750);
}

ActionRegistry.register({
  id: 'procreate', label: 'Procreate', icon: '👶', type: 'pair', cooldown: 30000,
  canPerform(a, b) {
    if (isOnCooldown(a, 'procreate')) return { ok: false, reason: 'On cooldown' };
    const f = a.friendship[b.id] || 0;
    if (f < 60) return { ok: false, reason: 'Friendship must be ≥ 60' };
    if (a.energy < 30 || b.energy < 30) return { ok: false, reason: 'Both need ≥ 30 energy' };
    return { ok: true, reason: '' };
  },
  perform(a, b, scene) {
    const mp = midpoint(scene, a, b);
    if (mp) { particleBurst(scene, mp.x, mp.y, '✨', 8); floatText(scene, mp.x, mp.y - 20, '👶'); }
    showProcreateCutscene(a, b);
    return { success: true, message: 'A new Minion is on the way!' };
  },
});

ActionRegistry.register({
  id: 'highfive', label: 'High Five', icon: '🙏', type: 'pair', cooldown: 5000,
  canPerform(a, b) {
    if (isOnCooldown(a, 'highfive')) return { ok: false, reason: 'On cooldown' };
    return { ok: true, reason: '' };
  },
  perform(a, b, scene) {
    GameState.setFriendship(a.id, b.id, (a.friendship[b.id] || 0) + 5);
    GameState.setFriendship(b.id, a.id, (b.friendship[a.id] || 0) + 5);
    setCooldown(a, 'highfive', this.cooldown);
    setCooldown(b, 'highfive', this.cooldown);
    GameState.storyProgress.flags.highFivePerformed = true;
    GameState.emit('state-changed');
    const mp = midpoint(scene, a, b);
    if (mp) { particleBurst(scene, mp.x, mp.y, '⭐', 5); floatText(scene, mp.x, mp.y - 20, '✋'); }
    return { success: true, message: `${a.name} and ${b.name} high-fived!` };
  },
});

ActionRegistry.register({
  id: 'dance-together', label: 'Dance Together', icon: '💃', type: 'pair', cooldown: 10000,
  canPerform(a, b) {
    if (isOnCooldown(a, 'dance-together')) return { ok: false, reason: 'On cooldown' };
    return { ok: true, reason: '' };
  },
  perform(a, b, scene) {
    GameState.setFriendship(a.id, b.id, (a.friendship[b.id] || 0) + 10);
    GameState.setFriendship(b.id, a.id, (b.friendship[a.id] || 0) + 10);
    GameState.setMinionMood(a.id, a.moodValue + 10);
    GameState.setMinionMood(b.id, b.moodValue + 10);
    setCooldown(a, 'dance-together', this.cooldown);
    setCooldown(b, 'dance-together', this.cooldown);
    if (GameState.currentArea === 'lab') GameState.storyProgress.flags.dancedInLab = true;
    GameState.emit('state-changed');
    const mp = midpoint(scene, a, b);
    if (mp) { particleBurst(scene, mp.x, mp.y, '🎵', 6); }
    // Bounce animation
    if (scene) {
      for (const id of [a.id, b.id]) {
        const spr = scene.minionSprites?.get(id);
        if (spr) {
          scene.tweens.add({ targets: spr, scaleY: 1.1, yoyo: true, repeat: 3, duration: 200 });
        }
      }
    }
    return { success: true, message: `${a.name} and ${b.name} danced!` };
  },
});

ActionRegistry.register({
  id: 'argue', label: 'Argue', icon: '⚡', type: 'pair', cooldown: 15000,
  canPerform(a, b) {
    if (isOnCooldown(a, 'argue')) return { ok: false, reason: 'On cooldown' };
    const f = a.friendship[b.id] || 0;
    const moA = getMoodFromValue(a.moodValue), moB = getMoodFromValue(b.moodValue);
    if (f < 20 || moA === 'angry' || moB === 'angry') return { ok: true, reason: '' };
    return { ok: false, reason: 'Friendship must be < 20, or one must be angry' };
  },
  perform(a, b, scene) {
    GameState.setFriendship(a.id, b.id, (a.friendship[b.id] || 0) - 10);
    GameState.setFriendship(b.id, a.id, (b.friendship[a.id] || 0) - 10);
    GameState.setMinionMood(a.id, 10); GameState.setMinionMood(b.id, 10);
    setCooldown(a, 'argue', this.cooldown);
    setCooldown(b, 'argue', this.cooldown);
    const mp = midpoint(scene, a, b);
    if (mp) { particleBurst(scene, mp.x, mp.y, '⚡', 4); floatText(scene, mp.x, mp.y - 20, '😠'); }
    return { success: true, message: `${a.name} and ${b.name} argued!` };
  },
});

ActionRegistry.register({
  id: 'gift-banana', label: 'Gift Banana', icon: '🍌', type: 'pair', cooldown: 5000,
  canPerform(a, b) {
    if (isOnCooldown(a, 'gift-banana')) return { ok: false, reason: 'On cooldown' };
    if (GameState.bananas < 1) return { ok: false, reason: 'Need at least 1 banana' };
    return { ok: true, reason: '' };
  },
  perform(a, b, scene) {
    Economy.useBanana();
    GameState.setFriendship(a.id, b.id, (a.friendship[b.id] || 0) + 20);
    GameState.setFriendship(b.id, a.id, (b.friendship[a.id] || 0) + 20);
    GameState.setMinionHunger(b.id, b.hunger + 30);
    setCooldown(a, 'gift-banana', this.cooldown);
    const pos = getSpritePos(scene, b.id);
    if (pos) { floatText(scene, pos.x, pos.y - 30, '🍌'); }
    return { success: true, message: `${a.name} gave ${b.name} a banana!` };
  },
});

ActionRegistry.register({
  id: 'play-fight', label: 'Play Fight', icon: '🥊', type: 'pair', cooldown: 10000,
  canPerform(a, b) {
    if (isOnCooldown(a, 'play-fight')) return { ok: false, reason: 'On cooldown' };
    if (a.energy < 20 || b.energy < 20) return { ok: false, reason: 'Both need ≥ 20 energy' };
    return { ok: true, reason: '' };
  },
  perform(a, b, scene) {
    GameState.setFriendship(a.id, b.id, (a.friendship[b.id] || 0) + 8);
    GameState.setFriendship(b.id, a.id, (b.friendship[a.id] || 0) + 8);
    GameState.setMinionEnergy(a.id, a.energy - 10);
    GameState.setMinionEnergy(b.id, b.energy - 10);
    setCooldown(a, 'play-fight', this.cooldown);
    setCooldown(b, 'play-fight', this.cooldown);
    // Random loser
    const loser = Math.random() < 0.5 ? a : b;
    if (Math.random() < 0.3) GameState.setMinionMood(loser.id, 30);
    const mp = midpoint(scene, a, b);
    if (mp) { particleBurst(scene, mp.x, mp.y, '💥', 4); floatText(scene, mp.x, mp.y - 20, '🥊'); }
    return { success: true, message: `${a.name} and ${b.name} play-fought!` };
  },
});

/* ═══════════════ SOLO ACTIONS ═══════════════ */

ActionRegistry.register({
  id: 'feed', label: 'Feed', icon: '🍌', type: 'solo', cooldown: 3000,
  canPerform(m) {
    if (isOnCooldown(m, 'feed')) return { ok: false, reason: 'On cooldown' };
    if (GameState.bananas < 1) return { ok: false, reason: 'No bananas' };
    return { ok: true, reason: '' };
  },
  perform(m, _, scene) {
    Economy.useBanana();
    GameState.setMinionHunger(m.id, m.hunger + 30);
    GameState.setMinionMood(m.id, 70);
    setCooldown(m, 'feed', this.cooldown);
    // Track fed minions for story
    const flags = GameState.storyProgress.flags;
    if (!flags.fedMinionIds) flags.fedMinionIds = [];
    if (!flags.fedMinionIds.includes(m.id)) flags.fedMinionIds.push(m.id);
    GameState.emit('state-changed');
    const pos = getSpritePos(scene, m.id);
    if (pos) { floatText(scene, pos.x, pos.y - 30, '🍌 Nom!'); }
    return { success: true, message: `Fed ${m.name}!` };
  },
});

ActionRegistry.register({
  id: 'nap', label: 'Nap', icon: '😴', type: 'solo', cooldown: 5000,
  canPerform(m) {
    if (m.isSleeping) return { ok: false, reason: 'Already sleeping' };
    if (m.energy >= 50) return { ok: false, reason: 'Energy must be < 50' };
    return { ok: true, reason: '' };
  },
  perform(m, _, scene) {
    GameState.setMinionSleeping(m.id, true);
    const speed = GameState.settings.gameSpeed;
    setTimeout(() => { GameState.setMinionSleeping(m.id, false); GameState.setMinionEnergy(m.id, 100); }, 30000 / speed);
    const pos = getSpritePos(scene, m.id);
    if (pos) { floatText(scene, pos.x, pos.y - 30, '💤'); }
    return { success: true, message: `${m.name} is napping...` };
  },
});

ActionRegistry.register({
  id: 'dress-up', label: 'Dress Up', icon: '👔', type: 'solo', cooldown: 0,
  canPerform() { return { ok: true, reason: '' }; },
  perform(m) {
    GameState.emit('open-wardrobe', m);
    return { success: true, message: '' };
  },
});

ActionRegistry.register({
  id: 'send-to-factory', label: 'To Factory', icon: '🏭', type: 'solo', cooldown: 0,
  canPerform(m) {
    if (m.area === 'factory') return { ok: false, reason: 'Already in factory' };
    return { ok: true, reason: '' };
  },
  perform(m) {
    GameState.setMinionArea(m.id, 'factory');
    GameState.factoryLog[m.id] = { enteredAt: Date.now() };
    GameState.emit('refresh-minions');
    GameState.clearSelection();
    return { success: true, message: `${m.name} sent to factory!` };
  },
});

ActionRegistry.register({
  id: 'recall-from-factory', label: 'Recall', icon: '📢', type: 'solo', cooldown: 0,
  canPerform(m) {
    if (m.area !== 'factory') return { ok: false, reason: 'Not in factory' };
    return { ok: true, reason: '' };
  },
  perform(m) {
    GameState.setMinionArea(m.id, 'yard');
    // Track factory time for story
    if (GameState.factoryLog[m.id]) {
      const elapsed = Date.now() - GameState.factoryLog[m.id].enteredAt;
      const flags = GameState.storyProgress.flags;
      flags.maxFactoryTime = Math.max(flags.maxFactoryTime || 0, elapsed);
    }
    delete GameState.factoryLog[m.id];
    GameState.emit('refresh-minions');
    GameState.clearSelection();
    return { success: true, message: `${m.name} recalled from factory!` };
  },
});

ActionRegistry.register({
  id: 'send-to-lab', label: 'To Lab', icon: '🔬', type: 'solo', cooldown: 0,
  canPerform(m) {
    if (m.area === 'lab') return { ok: false, reason: 'Already in lab' };
    if (!GameState.labUnlocked) return { ok: false, reason: 'Lab not unlocked yet' };
    return { ok: true, reason: '' };
  },
  perform(m) {
    GameState.setMinionArea(m.id, 'lab');
    GameState.storyProgress.flags.minionSentToLab = true;
    GameState.emit('state-changed');
    GameState.emit('refresh-minions');
    GameState.clearSelection();
    return { success: true, message: `${m.name} sent to Gru's Lab!` };
  },
});

ActionRegistry.register({
  id: 'send-to-yard', label: 'To Yard', icon: '🏡', type: 'solo', cooldown: 0,
  canPerform(m) {
    if (m.area === 'yard') return { ok: false, reason: 'Already in yard' };
    return { ok: true, reason: '' };
  },
  perform(m) {
    GameState.setMinionArea(m.id, 'yard');
    GameState.emit('refresh-minions');
    GameState.clearSelection();
    return { success: true, message: `${m.name} sent to the Yard!` };
  },
});

ActionRegistry.register({
  id: 'sing', label: 'Sing', icon: '🎤', type: 'solo', cooldown: 15000,
  canPerform(m) {
    if (isOnCooldown(m, 'sing')) return { ok: false, reason: 'On cooldown' };
    return { ok: true, reason: '' };
  },
  perform(m, _, scene) {
    if (!m.traits.includes('Musical') && Math.random() >= 0.5) {
      return { success: false, message: `${m.name} doesn't feel like singing...` };
    }
    setCooldown(m, 'sing', this.cooldown);
    // Nearby minions gain mood
    const area = m.area;
    const nearby = GameState.getMinionsInArea(area).filter(n => n.id !== m.id);
    for (const n of nearby) GameState.setMinionMood(n.id, n.moodValue + 5);
    const flags = GameState.storyProgress.flags;
    flags.singPerformed = true;
    flags.singAreaCount = nearby.length + 1;
    GameState.emit('state-changed');
    const pos = getSpritePos(scene, m.id);
    if (pos) { particleBurst(scene, pos.x, pos.y - 20, '🎵', 5); floatText(scene, pos.x, pos.y - 40, '🎤'); }
    return { success: true, message: `${m.name} sang! Nearby minions feel better.` };
  },
});

ActionRegistry.register({
  id: 'tickle', label: 'Tickle', icon: '🤭', type: 'solo', cooldown: 5000,
  canPerform(m) {
    if (isOnCooldown(m, 'tickle')) return { ok: false, reason: 'On cooldown' };
    return { ok: true, reason: '' };
  },
  perform(m, _, scene) {
    GameState.setMinionMood(m.id, m.moodValue + 10);
    setCooldown(m, 'tickle', this.cooldown);
    const pos = getSpritePos(scene, m.id);
    if (pos) { floatText(scene, pos.x, pos.y - 30, '😂'); }
    if (scene) {
      const spr = scene.minionSprites?.get(m.id);
      if (spr) scene.tweens.add({ targets: spr, angle: 5, yoyo: true, repeat: 3, duration: 80 });
    }
    return { success: true, message: `Tickled ${m.name}!` };
  },
});

ActionRegistry.register({
  id: 'scold', label: 'Scold', icon: '😤', type: 'solo', cooldown: 5000,
  canPerform(m) {
    if (isOnCooldown(m, 'scold')) return { ok: false, reason: 'On cooldown' };
    return { ok: true, reason: '' };
  },
  perform(m, _, scene) {
    GameState.setMinionMood(m.id, 30);
    setCooldown(m, 'scold', this.cooldown);
    const pos = getSpritePos(scene, m.id);
    if (pos) { floatText(scene, pos.x, pos.y - 30, '😢'); }
    return { success: true, message: `Scolded ${m.name}.` };
  },
});

ActionRegistry.register({
  id: 'group-dance', label: 'Group Dance', icon: '🕺', type: 'solo', cooldown: 30000,
  canPerform(m) {
    if (isOnCooldown(m, 'group-dance')) return { ok: false, reason: 'On cooldown' };
    return { ok: true, reason: '' };
  },
  perform(m, _, scene) {
    setCooldown(m, 'group-dance', this.cooldown);
    const area = m.area;
    const all = GameState.getMinionsInArea(area);
    for (const n of all) {
      GameState.setMinionMood(n.id, n.moodValue + 15);
      if (scene) {
        const spr = scene.minionSprites?.get(n.id);
        if (spr) scene.tweens.add({ targets: spr, scaleY: 1.15, yoyo: true, repeat: 5, duration: 200 });
      }
    }
    GameState.storyProgress.flags.groupDancePerformed = true;
    GameState.storyProgress.flags.groupDanceMinionCount = all.length;
    GameState.emit('state-changed');
    if (scene) {
      const w = scene.scale.width, h = scene.scale.height;
      for (let i = 0; i < 10; i++) {
        const x = Math.random() * w, y = Math.random() * h * 0.5;
        floatText(scene, x, y, '🎵');
      }
    }
    return { success: true, message: `Group dance with ${all.length} minions!` };
  },
});
