# Bunny Garden — Specification

## Overview

Bunny Garden is a browser-based interactive scene where users tend a garden of lilies and bunnies. Built with **Phaser 4** for all game rendering (bunnies, flowers, sky, particles) with **DOM overlays** for UI (header, stats, controls, fact bar, modal). Built with Vite.

Served at `/bunny-garden/` via a Go HTTP server.

---

## File Structure

```
site/bunny-garden/
├── index.html          # Entry point, DOM UI structure + #game-container
├── package.json        # Dependencies: phaser ^4.0.0, vite ^6.3.1
├── vite.config.js      # base: '/bunny-garden/', outDir: '../../dist/bunny-garden'
├── css/
│   └── style.css       # DOM overlay styles only (no game rendering CSS)
└── src/
    ├── main.js         # Phaser.Game instantiation + DOM UI bridge
    ├── config.js       # Game config, constants, color palettes, depth values
    ├── utils.js        # random, randomInt, randomChoice, clamp, lerp, distance
    ├── scenes/
    │   ├── BootScene.js    # Generates procedural textures, then starts GardenScene
    │   └── GardenScene.js  # Main scene: background, entities, game logic, resize
    ├── objects/
    │   ├── Bunny.js        # Bunny entity (Phaser Container + AI state machine)
    │   └── Flower.js       # Lily flower with bloom animation (Phaser Container)
    └── systems/
        └── Audio.js        # Procedural SFX (Web Audio API) + generative music
```

---

## Architecture

### Module Graph

```
main.js
├── config.js       → BootScene, GardenScene (scene list)
├── systems/Audio.js (no imports — standalone Web Audio)
└── DOM UI wiring (buttons → game.events, game.events → DOM updates)

config.js
├── scenes/BootScene.js
└── scenes/GardenScene.js

GardenScene.js
├── objects/Bunny.js  → utils.js, config.js, Audio.js
├── objects/Flower.js → utils.js, config.js
└── utils.js, config.js, Audio.js
```

`main.js` is the single entry point (`<script type="module" src="src/main.js">`). All modules use ES module `import`/`export`. Communication between Phaser scenes and DOM UI is via `game.events` (Phaser EventEmitter).

### Hybrid Rendering

- **Phaser canvas** (WebGL): Sky gradients, stars, sun/moon, clouds, hills, ground, bunnies (shape primitives in Containers), flowers (shape primitives in Containers), petal particles, carrots, hearts/sparkles.
- **DOM overlay**: Header, stats, controls, fact bar, bunny detail modal. Positioned via CSS `position: fixed` over the Phaser canvas.

### Game Loop

Phaser's built-in scene `update(time, delta)` method. Each frame:
1. Compute `dt = min(delta / 1000, 0.1)` (clamped to prevent spiral-of-death)
2. Update all `Bunny` instances (AI state machine)

Petal particles, cloud drift, star twinkle, and flower sway are tween/emitter-driven (no per-frame update needed).

---

## Depth Stack (Phaser `setDepth` order)

| Depth | Constant          | Description                        |
|-------|-------------------|------------------------------------|
| 0     | `DEPTH.SKY`       | Day/night sky gradients (Graphics) |
| 1     | `DEPTH.STARS`     | Star images (hidden in day)        |
| 2     | `DEPTH.CELESTIAL` | Sun, sun glow, moon, moon crater   |
| 3     | `DEPTH.CLOUDS`    | 3 drifting cloud containers        |
| 4     | `DEPTH.HILLS`     | 3 parallax hill ellipses           |
| 5     | `DEPTH.GROUND`    | Green gradient ground (Graphics)   |
| 6     | `DEPTH.GARDEN_ZONE` | Invisible interactive zone       |
| 11    | `DEPTH.FLOWER`    | Flower containers                  |
| 12    | `DEPTH.BUNNY`     | Bunny containers + carrots         |
| 15    | `DEPTH.BUNNY_GRABBED` | Dragged bunny (elevated)       |
| 20    | `DEPTH.PARTICLES` | Petal particle emitter             |
| 25    | `DEPTH.EFFECTS`   | Floating hearts, sparkles          |

DOM UI (header, stats, controls, fact bar, modal) renders above Phaser canvas via CSS `position: fixed`.

---

## Bunny System (`objects/Bunny.js`)

### Properties

| Property       | Type     | Description                                       |
|----------------|----------|---------------------------------------------------|
| `container`    | Container| Phaser Container at (x, y) — outer wrapper        |
| `inner`        | Container| Nested container, flipped via `scaleX` for facing  |
| `name`         | string   | Unique name from pool or `Bunny #N` fallback       |
| `colorKey`     | string   | Key into `BUNNY_COLORS` (e.g. `'white'`)           |
| `carrotsEaten` | number   | Lifetime carrot counter                            |
| `facingRight`  | boolean  | Direction (controls `inner.scaleX` flip)           |
| `state`        | string   | Current AI state (see state machine)               |
| `stateTimer`   | number   | Countdown timer for current state (seconds)        |
| `jumpCooldown` | number   | Time until next idle jump (4–10s)                  |
| `removed`      | boolean  | Flagged for removal                                |
| `dragging`     | boolean  | Currently held by pointer                          |

### Colors

7 built-in colors. Each bunny assigned random color on spawn. Changeable via modal.

| Key        | Body (hex)  | Accent (hex) |
|------------|-------------|--------------|
| `white`    | `#FFFFFF` | `#FFB6C1` |
| `pink`     | `#FFB6C1` | `#FF69B4` |
| `brown`    | `#D2B48C` | `#C4956A` |
| `gray`     | `#C0C0C0` | `#A0A0A0` |
| `black`    | `#4A4A4A` | `#696969` |
| `golden`   | `#FFE4B5` | `#FFD700` |
| `lavender` | `#E6E6FA` | `#DDA0DD` |

Colors applied programmatically via `setFillStyle()` on Phaser Ellipse/Circle shape objects. `setColor(key)` updates all body-part shapes at once.

### Names

Pool of 25 names: Clover, Biscuit, Mochi, Cinnamon, Hazel, Pepper, Nibbles, Tulip, Snowball, Maple, Daisy, Thumper, Cocoa, Peanut, Willow, Sprout, Marshmallow, Poppy, Ginger, Luna, Sage, Waffles, Pickles, Bean, Truffle.

Names tracked in `usedNames` Set. Once pool exhausted, falls back to `Bunny #N`. Renaming frees the old name.

### State Machine

```
                  ┌──────────────┐
           ┌──── │    idle       │ ◄──── petted (timer)
           │     │ (1–5s timer)  │ ◄──── munching (timer)
           │     └──┬───┬───┬───┘ ◄──── walking (arrive)
           │        │   │   │      ◄──── jumping (0.35s)
           │        │   │   │      ◄──── dragged (pointer up)
           │        │   │   │
   stateTimer ≤ 0   │   │   jumpCooldown ≤ 0
           │        │   │   │
           ▼        │   │   ▼
      ┌─────────┐   │   │  ┌──────────┐
      │ walking │   │   │  │ jumping  │
      │ (120px/s│   │   │  │ (0.35s)  │
      │ bounce) │   │   │  │ sin arc  │
      └─────────┘   │   │  └──────────┘
                    │   │
        pointer ────┘   └──── pet() / tap
           │                    │
           ▼                    ▼
      ┌──────────┐       ┌──────────┐
      │ dragged  │       │ petted   │
      │ (manual) │       │ (1s)     │
      └──────────┘       └──────────┘
```

**States:**

- **`idle`**: Waits for `stateTimer` to expire, then picks random target ±30% of viewport width and transitions to `walking`. Also decrements `jumpCooldown`; when ≤ 0, transitions to `jumping`.
- **`walking`**: Moves toward `targetX` at 120 px/s. Applies sine-wave bounce (8px amplitude, 0.35s period) via inline `translateY`. On arrival, checks for carrot callback. Returns to `idle`.
- **`jumping`**: In-place jump over 0.35s. Sine arc, 12px amplitude via inline `translateY`. Returns to `idle`.
- **`petted`**: Triggered by `pet()`. Adds `.petted` CSS class (happy-bounce animation). Spawns 4 heart emojis at staggered 100ms intervals. Lasts 1s, returns to `idle`.
- **`munching`**: Triggered when bunny arrives at carrot within 50px. Adds `.munching` CSS class (nose animation). Increments `carrotsEaten`. Lasts 1.5s.
- **`dragged`**: Entered on `pointerdown`. Position controlled by pointer delta. Clears `transform`. On release: if no movement detected (< 3px), fires `onTap` callback (opens modal). Otherwise returns to `idle`.

### Visual Structure

Each bunny is a `Phaser.GameObjects.Container` with a nested inner container (flippable via `scaleX`). Body parts are Phaser shape primitives:

```
Container (x, y) [depth: BUNNY]
├── inner Container (scaleX: ±1 for facing)
│   ├── Ellipse footL (-10, -4, 14×8)     [body color]
│   ├── Ellipse footR (10, -4, 14×8)      [body color]
│   ├── Ellipse bodyShape (0, -24, 40×32) [body color]
│   ├── Circle tail (22, -22, r6)          [body color]
│   ├── Ellipse earL (-10, -62, 11×28)    [body color]
│   ├── Ellipse earInnerL (-10, -60, 5×18)[accent color]
│   ├── Ellipse earR (10, -62, 11×28)     [body color]
│   ├── Ellipse earInnerR (10, -60, 5×18) [accent color]
│   ├── Ellipse head (0, -44, 30×28)      [body color]
│   ├── Ellipse eyeL (-7, -48, 5×6)       [#333333]
│   ├── Ellipse eyeR (7, -48, 5×6)        [#333333]
│   ├── Ellipse eyeHighL (-6, -49, 2×2)   [white]
│   ├── Ellipse eyeHighR (8, -49, 2×2)    [white]
│   ├── Ellipse cheekL (-11, -40, 8×5)    [accent, alpha 0.4]
│   ├── Ellipse cheekR (11, -40, 8×5)     [accent, alpha 0.4]
│   └── Ellipse nose (0, -39, 5×4)        [accent color]
└── Text nameTag (0, -82) [outside inner, doesn't flip]
```

Name tag is outside `inner` so it doesn't flip with `scaleX`.

### Pointer Interaction

Uses Phaser's input system with `setInteractive` hit area and `setDraggable`.
- **Hit area**: `Phaser.Geom.Rectangle(-30, -80, 60, 80)` on the outer container.
- **Drag threshold**: 3px (`scene.input.dragDistanceThreshold = 3`).
- `pointerdown`: Enter `dragged` state, elevate depth to `BUNNY_GRABBED`, show name tag.
- `drag`: Update `container.x/y` clamped to garden bounds.
- `pointerup`: If no drag detected → emit `bunny:tap` event (opens modal). Otherwise returns to `idle`.
- `pointerover/out`: Fade name tag in/out via tweens.

### Methods

- `pet()` — Enter petted state, play bounce tween, spawn heart emoji texts, play SFX.
- `hopTo(targetX)` — Begin walking to target (rejects if petted/munching/dragged).
- `goToCarrot(x, y, callback)` — Store callback, then `hopTo`. On arrival within 50px, fire callback and enter munching.
- `setColor(key)` — Update `fillStyle` on all body-part shapes.
- `setName(name)` — Update name, free old name in pool, update Text object.
- `remove()` — Flag removed, free name, destroy blink timer, scale-out tween then `container.destroy()`.
- `update(dt)` — Advance state machine, update position.

### Idle Animations (Tweens)

All running continuously from spawn:
- **Ear wiggle**: `earL`/`earR` angle oscillation (3–3.4s period, yoyo, infinite).
- **Tail wag**: `tail` x/y oscillation (750ms period, yoyo, infinite).
- **Eye blink**: `TimerEvent` at random 3–6s intervals, scales eye `scaleY` to 0.1 and back (60ms).

### Spawn Animation

Pop-in: container starts at `scale(0)`, tweens to `scale(1)` over 500ms with `Back.easeOut`.

---

## Garden System (`scenes/GardenScene.js`)

### Flower Planting (`objects/Flower.js`)

Click on the invisible `Phaser.Zone` (garden zone, covers ground area) triggers `_plantFlower(x, y)`. Each flower is a Phaser Container of shape primitives:

- **Stem**: Rectangle, 35–65px tall. Sway tween on whole container (±2°, 3.5–5.5s period, random delay).
- **Leaves**: Two Ellipses (left/right) on the stem, angled ±20–25°.
- **Bloom**: Nested container at top of stem. 5 or 6 petals (30% chance of 5), evenly distributed with ±8° random offset.
- **Petals**: Ellipse shapes, 3 color shades cycling. Bloom animation: individual petals scale from 0→1 with staggered delays (100ms + 60ms per petal), `Back.easeOut`.
- **Center**: Golden Circle pistil with 5 Circle stamen dots, also scale-animated with delays.
- **Sparkle**: 5 sparkle Image objects spawned at bloom position, each scale 0→1.2→0 with stagger.

Pop-in: entire container scales from 0→1 over 300ms (`Back.easeOut`).

Returns current flower count for stat display.

---

## Particle System (Petal Emitter)

Phaser `ParticleEmitter` using the procedurally generated `'petal'` texture.

- **Flow mode**: `frequency: 600`, `quantity: 1` — one petal every 600ms.
- **Petal properties**: `lifespan` 8–15s, `speedX` -15 to 25, `speedY` 20 to 60, `scale` 0.5–1.2, `rotate` 0–360, alpha fades from 0.7 to 0.
- **Tint**: Randomly chosen from `PETAL_TINTS` (5 pink/white shades).
- **Burst mode**: `petalBurst()` emits 40 extra petals at random positions across the top of the screen.
- **Resize**: Emitter x-range updated in `_onResize` via `setConfig`.

---

## Scene Background (`scenes/GardenScene.js`)

### Sky
Two full-screen Graphics objects (day and night) using `fillGradientStyle`. Night sky alpha tweened 0↔1 on toggle.

### Stars
60 Image objects (`'star-dot'` / `'star-dot-lg'` textures) positioned randomly in upper 55%. Each has a twinkle tween (alpha 0.2↔1, scale 0.7↔1.3, random duration 1.5–3.5s, yoyo infinite). Visible only at night.

### Celestial
- **Sun**: Circle (r40, yellow) with pulsing glow Circle (r55, alpha 0.2↔0.35). Fades out at night.
- **Moon**: Circle (r38, beige) with subtle crater Circle. Fades in at night, scales 0.6→1.

### Clouds
3 cloud Containers, each built from overlapping Ellipse + Circle shapes. Drift tween: x from -200 to `width + 200`, repeating. Speed varies by layer (25–40 px/s). Alpha dimmed to 0.12 at night.

### Hills
3 Ellipse shapes at different depths/sizes. Parallax on `pointermove` (fine pointer only) with increasing magnitude (8/14/20px horizontal, 3/5/7px vertical). Colors tween between day/night palettes.

### Ground
Graphics object with `fillGradientStyle` (green gradient). Redrawn on resize and day/night toggle.

### Day/Night Toggle

Tweens over 1000ms:
- Sky night overlay alpha 0↔1
- Star alpha 0↔1
- Sun/moon alpha and scale swap
- Cloud alpha to 0.12 (night) or base value (day)
- Hill fill colors via `addCounter` tween with `IntegerToColor` interpolation
- Ground redrawn with night/day palette after tween

---

## Audio (`systems/Audio.js`)

All sound is procedural via Web Audio API. No audio files. Not using Phaser's sound manager — standalone module.

### AudioContext Setup
Lazy-initialized on first interaction. Three gain nodes:
- `masterGain` (0.6) → destination
- `sfxGain` (0.5) → masterGain
- `musicGain` (0.15) → masterGain

### Sound Effects

| Function       | Trigger              | Description                                      |
|----------------|----------------------|--------------------------------------------------|
| `sfxPop()`     | Add bunny button      | Two quick sine tones (880Hz + 1320Hz)            |
| `sfxPlant()`   | Plant flower          | Three ascending sine tones (C5-E5-G5)            |
| `sfxPet()`     | Pet bunny             | Four ascending triangle tones (E5-A5-C6-E6)      |
| `sfxHop()`     | Bunny starts walking  | Sine sweep 200→400→180Hz                         |
| `sfxMunch()`   | Bunny eats carrot     | Three bandpass-filtered noise bursts              |
| `sfxPetals()`  | Petal burst button    | Five descending sine tones (shimmer)              |
| `sfxDayNight()`| Day/night toggle      | Descending (night) or ascending (day) tone series |
| `sfxDrop()`    | Feed carrot button    | Sine sweep 600→150Hz (falling)                   |

### Generative Music

Toggle on/off. Loops a 4-bar pattern at 115 BPM in C major (I-V-vi-IV):
- **Bass**: Triangle wave, root note, one octave down. Held per bar.
- **Chords**: Staccato triangle hits on beats 1 and 3.
- **Melody**: 16-note pentatonic pattern. Sine wave with slight vibrato (5Hz LFO, 2 cents). One note per beat, 60% duration.

Loop re-scheduled via `setTimeout` before previous loop ends. Stop fades all nodes over 0.5s.

---

## UI Components

### Header (`#header`)
- Title: "🐰 Bunny Garden 🌸" — Fredoka font, white with text shadow, gentle bounce animation.
- Subtitle: Instructions text. Both `pointer-events: none`.

### Stats (`#stats`)
Fixed top-right. Two pill-shaped counters:
- 🐰 Bunny count
- 🌸 Flower count

Values animate with `.bump` class (scale 1 → 1.4 → 1, 0.3s).

### Controls (`#controls`)
Fixed right side (column on desktop, row on mobile). 5 buttons:

| Button      | Action                                    |
|-------------|-------------------------------------------|
| 🐰 Add Bunny | Spawn new bunny at random garden position |
| 🥕 Feed     | Drop carrot, nearest bunny walks to eat   |
| 🌙 Night    | Toggle day/night (label swaps to ☀️ Day)  |
| ✨ Petals   | Trigger 4s petal burst                    |
| 🎵 Music    | Toggle generative music                   |

Mobile: label hidden, buttons become circular. Repositioned to top-left row.

### Fact Bar (`#fact-bar`)
Fixed bottom. Fetches from `/api/fact` (JSON `{ fact: string }`). First fetch at 3s, then every 12s. Slide-in animation on update. Falls back silently on error.

### Bunny Detail Modal (`#bunny-modal`)
Opens on bunny tap (not drag). Contains:

- **Name input**: Text field, 20 char max. Pre-filled with current name.
- **Color picker**: Row of circular swatches for each `BUNNY_COLORS` entry. Selected swatch gets pink border.
- **Stats**: Carrots eaten counter.
- **Actions**:
  - 💕 Pet — Triggers `bunny.pet()` while modal open.
  - 🗑️ Delete — Removes bunny (pop-out animation), updates count.
  - ✓ Save — Applies name/color changes, closes modal.
- **Close**: × button or backdrop click.

Toggle via `.modal-hidden` class (opacity 0, pointer-events none). Pop animation on open.

---

## CSS Architecture

Styles cover **only DOM overlay UI** — all game rendering is handled by Phaser.

### Custom Properties (`:root`)

Colors: pinks, gold. Fonts: `--font-display` (Fredoka), `--font-body` (Nunito). UI: `--ui-bg` (frosted glass), `--ui-shadow`.

### Layout

`#game-container` is `position: fixed; inset: 0` — Phaser canvas fills the viewport. All UI elements are `position: fixed` over the canvas.

### Key CSS Animations

| Animation        | Duration | Element          | Trigger            |
|------------------|----------|------------------|--------------------|
| `bump` (scale)   | 0.3s     | `.stat-value`    | Stat counter update|
| modal fade-in    | 0.3s     | `.modal-content` | Modal open         |
| `slide-in`       | 0.5s     | `#fact-text`     | New fact loaded    |

All game-world animations (ear wiggle, tail wag, blink, sway, twinkle, drift, bounce) are Phaser tweens, not CSS.

### Responsive Breakpoints

- **≤ 768px**: Controls become horizontal row at top-left, labels hidden, circular buttons. Stats repositioned.
- **769–900px**: Labels hidden, smaller button padding.
- **`prefers-reduced-motion`**: All CSS animations/transitions forced to 0.01ms.

---

## Event Bus (`game.events`)

DOM↔Phaser communication uses Phaser's `game.events` EventEmitter:

| Event                | Direction    | Payload                    | Purpose                      |
|----------------------|-------------|----------------------------|-------------------------------|
| `action:addBunny`    | DOM → Scene | —                          | Spawn random bunny            |
| `action:feed`        | DOM → Scene | —                          | Drop carrot                   |
| `action:daynight`    | DOM → Scene | —                          | Toggle day/night              |
| `action:petals`      | DOM → Scene | —                          | Trigger petal burst           |
| `action:petBunny`    | DOM → Scene | `bunny`                    | Pet a specific bunny          |
| `action:deleteBunny` | DOM → Scene | `bunny`                    | Remove bunny                  |
| `action:saveBunny`   | DOM → Scene | `{ bunny, name, color }`   | Apply name/color changes      |
| `stat:bunnyCount`    | Scene → DOM | `count`                    | Update bunny counter          |
| `stat:flowerCount`   | Scene → DOM | `count`                    | Update flower counter         |
| `daynight:changed`   | Scene → DOM | `isNight`                  | Update button icon/label      |
| `bunny:tap`          | Scene → DOM | `bunny`                    | Open modal for tapped bunny   |

---

## Interactions Summary

| Input                     | Result                                    |
|---------------------------|-------------------------------------------|
| Click garden zone         | Plant lily at click position (Phaser Zone) |
| Tap bunny (no drag)       | Emit `bunny:tap`, open modal in DOM        |
| Drag bunny                | Move bunny container, clamped to ground    |
| "Add Bunny" button        | Spawn bunny at random position            |
| "Feed" button             | Drop carrot, nearest bunny walks + eats   |
| "Night" button            | Toggle day/night theme                    |
| "Petals" button           | 40-petal burst via emitter               |
| "Music" button            | Toggle generative ambient music           |
| Modal "Pet"               | Trigger pet animation + hearts            |
| Modal "Save"              | Apply name/color changes                  |
| Modal "Delete"            | Remove bunny with pop-out                 |
| Modal backdrop/× click    | Close modal without saving                |

---

## Initial State

On load:
- 3 bunnies spawned at random ground positions (random colors/names).
- 5 lilies planted with staggered `delayedCall` (300ms + 200ms each).
- Petal particle emitter active (flow mode, 1 petal per 600ms).
- Day mode. Music off.
- Fact bar shows "Welcome to Bunny Garden! 🌸", first API fetch at 3s.

---

## External Dependencies

- **Phaser 4** (`^4.0.0`): Game framework — all rendering, input, tweens, particles.
- **Vite** (`^6.3.1`): Dev server and build tool.
- **Google Fonts**: Fredoka (display), Nunito (body) — loaded via `<link>` preconnect.
- **Server API**: `GET /api/fact` — returns `{ fact: string }`. Optional; fails silently.

---

## Scenes

| Scene         | Key             | Purpose                                 |
|---------------|-----------------|------------------------------------------|
| `BootScene`   | `'BootScene'`   | Generate procedural textures, then start |
| `GardenScene` | `'GardenScene'` | Main gameplay scene                      |

### BootScene Textures

All textures are generated via `Graphics.generateTexture()` — no image files:

| Key           | Size   | Description                |
|---------------|--------|----------------------------|
| `petal`       | 10×6   | White ellipse (for emitter)|
| `sparkle`     | 6×6    | Golden cross               |
| `carrot-body` | 12×26  | Orange triangle            |
| `carrot-top`  | 16×10  | Green ellipse              |
| `star-dot`    | 4×4    | Small white circle         |
| `star-dot-lg` | 6×6    | Large white circle         |
| `cloud-puff`  | 60×60  | White circle               |

### Resize Handling

`GardenScene` listens to `scale.on('resize')` and repositions:
- Sky gradients (redrawn)
- Ground gradient (redrawn)
- Hills (position + size)
- Celestial bodies (position)
- Garden zone (position + size)
- Petal emitter x-range
- No npm packages. No build tools. No frameworks.
