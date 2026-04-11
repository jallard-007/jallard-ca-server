## Repository Layout

This is a monorepo with independent sites within each subfolder under sites/

current sites:

- bunny-garden
- minion-sims
- periodt

---

## Caveman mode

Respond terse like smart caveman. All technical substance stay. Only fluff die.

Rules:
- Drop: articles (a/an/the), filler (just/really/basically), pleasantries, hedging
- Fragments OK. Short synonyms. Technical terms exact. Code unchanged.
- Pattern: [thing] [action] [reason]. [next step].
- Not: "Sure! I'd be happy to help you with that."
- Yes: "Bug in auth middleware. Fix:"

Switch level: /caveman lite|full|ultra|wenyan
Stop: "stop caveman" or "normal mode"

Auto-Clarity: drop caveman for security warnings, irreversible actions, user confused. Resume after.

Boundaries: code/commits/PRs written normal.

---

## Phaser Game Development Best Practices

### Architecture

- **One scene per major game state.** Boot, Menu, Play, GameOver. Keep scenes focused. Use `scene.launch()` for parallel UI scenes (HUD overlay).
- **Separate logic from display.** Game systems (AI, economy, state) = plain JS classes. Scenes wire systems to visuals. Testable, swappable.
- **Centralize config.** Single config module for magic numbers: speeds, spawn rates, dimensions, balance values. Tuning without hunting through files.
- **Use ES modules.** One class/system per file. Import explicitly. No globals except through Phaser's registry/plugin system.
- **Event-driven communication between systems.** Use `scene.events` or `game.events` as message bus. Avoid tight coupling between game objects. Emitter/listener pattern over direct references.

### Performance

- **Object pooling mandatory for frequently created/destroyed objects.** Bullets, particles, enemies, coins. Use `Group` with `maxSize`, `createCallback`, `removeCallback`. Call `group.get()` not `new Sprite()`.
- **Texture atlases over individual images.** Pack sprites into atlases (TexturePacker, free-tex-packer). Fewer draw calls, faster loading. One atlas per scene/category.
- **Minimize `create()` in update loops.** Pre-allocate in `create()`. Reuse via pools. `setActive(false).setVisible(false)` to "remove", reactivate to "spawn".
- **Use `setSize()` and `setOffset()` for physics bodies** smaller than sprite. Tighter collision feels better and costs less.
- **Camera culling is automatic for sprites** but custom rendering (Graphics, manual draws) needs manual bounds checking.
- **Limit physics bodies.** Arcade Physics scales well to ~500 active bodies. Beyond that: spatial partitioning, reduce check frequency, or use collision categories.
- **`TimerEvent` over `setTimeout`.** Respects game pause, time scale, scene lifecycle. `this.time.addEvent({ delay, callback, loop })`.
- **Avoid creating objects in `update()`.** No `new Vector2()` per frame. Cache and reuse math objects. Pre-allocate scratch vectors.
- **Use `SpriteGPULayer` for large counts of similar sprites** (v4). Batches into single draw call. Ideal for bullets, particles, background elements.
- **`TilemapGPULayer` for large tilemaps** (v4). GPU-accelerated rendering. Use for maps with many tiles visible simultaneously.

### Input

- **Pointer events over polling when possible.** `this.input.on('pointerdown')` for clicks. Reserve `update()` polling for continuous movement (cursor keys, WASD).
- **Create key objects once in `create()`.** `this.cursors = this.input.keyboard.createCursorKeys()`. Read in `update()`.
- **Hit areas explicit.** `setInteractive({ useHandCursor: true })` with defined hit area for irregular shapes. Don't rely on full-texture bounds for small clickable targets.

### Asset Loading

- **All loading in `preload()` or dedicated Boot scene.** Never load mid-gameplay. Causes frame drops.
- **Show load progress.** `this.load.on('progress', (value) => ...)` with progress bar in Boot scene.
- **Audio: provide both mp3 and ogg.** `this.load.audio('sfx', ['sfx.ogg', 'sfx.mp3'])`. Browser compat.
- **Use `setPath()` for asset directories.** `this.load.setPath('assets/images')` reduces repetition.

### Animation & Tweens

- **Tweens for UI and non-physics movement.** Menu animations, pop effects, scale pulses. Physics velocity for gameplay movement.
- **Chain tweens with `TweenChain`** (v4) instead of `onComplete` callback nesting. Cleaner, easier to modify.
- **`yoyo` and `repeat` over manual reverse tweens.** Built-in, fewer objects.
- **Define animations once in Boot/create.** `this.anims.create()` registers globally. All sprites sharing same texture share animation definitions.

### State Management

- **`registry` for cross-scene data.** `this.registry.set('score', 0)`. Persists across scenes. Listen with `this.registry.events.on('changedata-score', callback)`.
- **DataManager for per-object state.** `gameObject.setData('health', 100)`. Events fire on change. Good for UI bindings.
- **Save/load via JSON serialization.** Design game state as serializable from start. `localStorage` for web. Versioned save format.

### Common Pitfalls

- **Destroy what you create.** Scene `shutdown` doesn't auto-destroy everything. Clean up event listeners, timers, tweens in `shutdown()` or `destroy()` handlers.
- **`this` context in callbacks.** Arrow functions or `.bind(this)`. Phaser callbacks don't auto-bind scene context.
- **Don't modify display list during iteration.** Collecting items to remove, then removing after loop. Or iterate backwards.
- **Physics `update` vs scene `update`.** Physics step may run multiple times per frame at fixed timestep. Put physics logic in physics callbacks, visual logic in scene `update`.
- **Depth sorting.** `setDepth()` explicit. Don't rely on creation order. Use constants: `DEPTH.BG = 0, DEPTH.ENTITIES = 10, DEPTH.UI = 100`.

### Project Structure

```
src/
  config.js          # Game config, constants, balance values
  main.js            # Game instantiation, scene registration
  scenes/            # One file per scene
  objects/            # Game object classes (Player, Enemy, Item)
  systems/            # Pure logic (AI, spawning, economy, save)
  ui/                 # UI components (HUD, menus, dialogs)
  audio/              # Audio manager, sound definitions
  utils.js            # Shared helpers
```

