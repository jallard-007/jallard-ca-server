# Bunny Garden — Specification

## Overview

Bunny Garden is a browser-based interactive scene where users tend a garden of lilies and bunnies. Pure client-side (HTML/CSS/JS modules), served statically. No build step. One external dependency: Google Fonts (Fredoka + Nunito).

Served at `/bunny-garden/` via a Go HTTP server. A `<base href="/bunny-garden/">` tag roots all relative asset paths.

---

## File Structure

```
site/bunny-garden/
├── index.html          # Entry point, all DOM structure
├── css/
│   └── style.css       # All styles, animations, theming
└── js/
    ├── app.js          # Orchestrator: binds UI, game loop, modal
    ├── bunny.js        # Bunny entity: AI, rendering, interaction
    ├── garden.js       # Flower planting and sparkle effects
    ├── particles.js    # Canvas-based petal particle system
    ├── scene.js        # Sky, stars, parallax, day/night
    ├── audio.js        # Procedural SFX (Web Audio API) + generative music
    └── utils.js        # random, clamp, lerp, distance, el()
```

---

## Architecture

### Module Graph

```
app.js
├── bunny.js   → utils.js
├── garden.js  → utils.js
├── particles.js → utils.js
├── scene.js   → utils.js
└── audio.js   (no imports)
```

`app.js` is the single entry point (`<script type="module">`). All modules use ES module `import`/`export`.

### Game Loop

`App._gameLoop(timestamp)` runs via `requestAnimationFrame`. Each frame:
1. Compute `dt` (clamped to 0.1s max to prevent spiral-of-death)
2. Update all `Bunny` instances (AI state machine)
3. Update + render `ParticleSystem` (canvas petals)

No fixed timestep. All movement/timers are `dt`-scaled.

---

## Scene Layer Stack (z-index order)

| z-index | Element           | Description                       |
|---------|-------------------|-----------------------------------|
| 0       | `#sky-day/night`  | Gradient backgrounds              |
| 1       | `#stars`          | Star divs (visible at night)      |
| 2       | `#celestial`      | Sun / Moon                        |
| 3       | `#clouds`         | 3 animated cloud divs             |
| 4       | `#hills`          | 3 parallax hill layers            |
| 5       | `#ground`         | Green gradient floor              |
| 10      | `#garden`         | Interactive click zone            |
| 11      | `.lily`           | Flower elements (within garden)   |
| 12      | `.bunny`          | Bunny elements (within garden)    |
| 15      | `.bunny.grabbed`  | Dragged bunny (elevated)          |
| 20      | `#particle-canvas`| Full-screen canvas (petals)       |
| 25      | `#effects`        | Floating hearts, sparkles         |
| 50      | UI elements       | Header, stats, controls, fact bar |
| 100     | `#bunny-modal`    | Bunny detail modal overlay        |

---

## Bunny System (`bunny.js`)

### Properties

| Property       | Type     | Description                                    |
|----------------|----------|------------------------------------------------|
| `x`, `y`       | number   | Position (CSS left/bottom in garden)            |
| `name`         | string   | Unique name from pool or `Bunny #N` fallback    |
| `color`        | string   | Key into `BUNNY_COLORS` (e.g. `'white'`)        |
| `carrotsEaten` | number   | Lifetime carrot counter                         |
| `facingRight`   | boolean  | Direction (controls `scaleX` flip on inner div) |
| `state`        | string   | Current AI state (see state machine)            |
| `stateTimer`   | number   | Countdown timer for current state (seconds)     |
| `jumpCooldown` | number   | Time until next idle jump (4–10s)               |
| `removed`      | boolean  | Flagged for removal                             |
| `dragging`     | boolean  | Currently held by pointer                       |

### Colors

7 built-in colors. Each bunny assigned random color on spawn. Changeable via modal.

| Key        | Body      | Accent    |
|------------|-----------|-----------|
| `white`    | `#FFFFFF` | `#FFB6C1` |
| `pink`     | `#FFB6C1` | `#FF69B4` |
| `brown`    | `#D2B48C` | `#C4956A` |
| `gray`     | `#C0C0C0` | `#A0A0A0` |
| `black`    | `#4A4A4A` | `#696969` |
| `golden`   | `#FFE4B5` | `#FFD700` |
| `lavender` | `#E6E6FA` | `#DDA0DD` |

Colors applied via CSS custom properties `--bunny-body` and `--bunny-accent` on the `.bunny` element. Body parts reference these vars.

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

### DOM Structure

```html
<div class="bunny" style="left: Xpx; bottom: Ypx; --bunny-body: #FFF; --bunny-accent: #FFB6C1">
  <div class="bunny-inner" style="transform: scaleX(±1)">
    <div class="bunny-ear left"></div>
    <div class="bunny-ear right"></div>
    <div class="bunny-head">
      <div class="bunny-eye left"></div>
      <div class="bunny-eye right"></div>
      <div class="bunny-cheek left"></div>
      <div class="bunny-cheek right"></div>
      <div class="bunny-nose"></div>
    </div>
    <div class="bunny-body"></div>
    <div class="bunny-tail"></div>
    <div class="bunny-foot left"></div>
    <div class="bunny-foot right"></div>
  </div>
  <div class="bunny-name">Mochi</div>
</div>
```

Name tag is outside `.bunny-inner` so it doesn't flip with `scaleX`.

### Pointer Interaction

Uses Pointer Events API with `setPointerCapture` for reliable drag.
- `pointerdown`: Capture, record start positions, enter `dragged` state.
- `pointermove`: Update `x`/`y` clamped to garden bounds. Threshold of 3px to distinguish tap from drag.
- `pointerup`: If `moved` is false → tap → fires `onTap(bunny)` callback (opens modal). If dragged → returns to `idle`.
- `touchAction: none` on element to prevent browser scroll interference.

### Methods

- `pet()` — Enter petted state, spawn hearts, play SFX.
- `hopTo(targetX)` — Begin walking to target (rejects if petted/munching/dragged).
- `goToCarrot(x, y, callback)` — Store callback, then `hopTo`. On arrival within 50px, fire callback and enter munching.
- `setColor(key)` — Update color, reapply CSS vars.
- `setName(name)` — Update name, free old name in pool, update DOM text.
- `remove()` — Flag removed, free name, add `.pop-out` class, remove DOM on animationend.
- `update(dt)` — Advance state machine, update position.

---

## Garden System (`garden.js`)

### Flower Planting

Click on `#garden` div triggers `garden.plant(x, y)`. Each flower is a pure-CSS lily:

- **Stem**: 35–65px tall, CSS sway animation (3.5–5.5s period, random delay).
- **Bloom**: 36–52px diameter. 5 or 6 petals (30% chance of 5) evenly distributed with ±8° random offset.
- **Petals**: 3 color shades cycling. Bloom animation triggered by adding `.bloomed` class after 2 rAF frames.
- **Center**: Golden radial gradient pistil with 5 stamen dots.
- **Leaves**: Two leaves (left/right) on the stem.
- **Sparkle**: 5 sparkle elements spawned in `#effects` overlay on plant.

Returns current flower count for stat display.

---

## Particle System (`particles.js`)

Canvas-based petal rain. Rendered each frame in the game loop.

- **Base count**: 15 petals always active.
- **Petal properties**: Position, size (4–10px), drift speed, rotation, wobble (sine-based), opacity, color (5 pink/white shades).
- **Movement**: Each petal drifts downward (`speedY` 0.4–1.2) with lateral wobble. Recycles when off-screen.
- **Burst mode**: Button adds 40 extra petals (size 5–13, speedY 1–3). Burst lasts 4 seconds. Excess petals removed after burst ends.
- **Canvas sizing**: Respects `devicePixelRatio` (capped at 2x) for crisp rendering.

---

## Scene (`scene.js`)

### Stars
60 star divs generated in `#stars` container. Each positioned randomly in upper 55% of screen. 15% chance of `.large` variant. Twinkle animation with random duration (1.5–3.5s) and delay.

### Parallax
On devices with fine pointer (mouse), hills shift based on cursor position. Three layers with increasing parallax magnitude (8/14/20px horizontal, 3/5/7px vertical).

### Day/Night Toggle
Toggles `.night` class on `<body>`. CSS transitions handle:
- Sky gradient swap (day blue → night purple)
- Star visibility
- Sun → Moon swap
- Cloud dimming
- Hill/ground color darkening

Transition duration: 1s ease.

---

## Audio (`audio.js`)

All sound is procedural via Web Audio API. No audio files.

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

### Custom Properties (`:root`)

Colors: sky, ground, hills, pinks, gold, greens, bunny base colors.
Fonts: `--font-display` (Fredoka), `--font-body` (Nunito).
UI: `--ui-bg` (frosted glass), `--ui-shadow`.
Transition: `--transition-theme: 1s ease` for day/night.

### Bunny Color System

Body parts reference `var(--bunny-body)` and `var(--bunny-accent)` with fallback defaults. Per-bunny colors set as inline `style` on `.bunny` element. Parts affected:
- Body, head, ears, tail, feet → `--bunny-body`
- Ear inner, nose, cheeks → `--bunny-accent`

### Key Animations

| Animation        | Duration | Element         | Trigger            |
|------------------|----------|-----------------|--------------------|
| `ear-wiggle-l/r` | 3–3.4s   | `.bunny-ear`    | Always (infinite)  |
| `blink`          | 3–6s     | `.bunny-eye::after` | Always (infinite) |
| `tail-wag`       | 1.5s     | `.bunny-tail`   | Always (infinite)  |
| `happy-bounce`   | 0.7s     | `.bunny.petted` | Pet action         |
| `munch`          | 0.25s    | `.bunny-nose`   | Munching state     |
| `pop-in`         | 0.5s     | `.bunny.pop-in` | Spawn              |
| `pop-out`        | 0.3s     | `.bunny.pop-out`| Deletion           |
| `sway`           | 3.5–5.5s | `.lily-stem`    | Always (infinite)  |
| `twinkle`        | 1.5–3.5s | `.star`         | Always (infinite)  |
| `drift`          | 40–60s   | `.cloud`        | Always (infinite)  |
| `sun-pulse`      | 4s       | `#sun`          | Always (infinite)  |

Movement bounce (walking/jumping) is JS-driven via inline `style.transform`, not CSS animation.

### Responsive Breakpoints

- **≤ 768px**: Controls become horizontal row at top-left, labels hidden, circular buttons. Stats repositioned.
- **769–900px**: Labels hidden, smaller button padding.
- **`prefers-reduced-motion`**: All animations/transitions forced to 0.01ms.

---

## Interactions Summary

| Input                     | Result                                    |
|---------------------------|-------------------------------------------|
| Click garden background   | Plant lily at click position               |
| Tap bunny (no drag)       | Open bunny detail modal                   |
| Drag bunny                | Move bunny freely, clamped to garden      |
| "Add Bunny" button        | Spawn bunny at random position            |
| "Feed" button             | Drop carrot, nearest bunny walks + eats   |
| "Night" button            | Toggle day/night theme                    |
| "Petals" button           | 4s petal burst on canvas                  |
| "Music" button            | Toggle generative ambient music           |
| Modal "Pet"               | Trigger pet animation + hearts            |
| Modal "Save"              | Apply name/color changes                  |
| Modal "Delete"            | Remove bunny with pop-out                 |
| Modal backdrop/× click    | Close modal without saving                |

---

## Initial State

On load:
- 3 bunnies spawned at random positions (random colors/names).
- 5 lilies planted with staggered delays (300ms + 200ms each).
- Petal particle system active (15 ambient petals).
- Day mode. Music off.
- Fact bar shows "Welcome to Bunny Garden! 🌸", first API fetch at 3s.

---

## External Dependencies

- **Google Fonts**: Fredoka (display), Nunito (body) — loaded via `<link>` preconnect.
- **Server API**: `GET /api/fact` — returns `{ fact: string }`. Optional; fails silently.
- No npm packages. No build tools. No frameworks.
