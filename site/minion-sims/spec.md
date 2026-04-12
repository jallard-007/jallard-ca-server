# Minion Sims — Game Specification

## 1. Overview

A browser-based life simulation game starring Minions. Players manage a colony of Minions — directing them to interact, work, dress up, procreate, and progress through a storyline involving Gru's master plans. The game starts with three canonical Minions (Kevin, Stuart, Bob) and grows as the player breeds, names, and customizes new Minions.

**Platforms:** Desktop browsers and mobile browsers (responsive layout, touch + mouse/keyboard input).

**Tech Stack:** Phaser 3 (game canvas — sprites, animation, particles, audio, input) + vanilla HTML/CSS for UI overlays (wardrobe, nursery, settings, story journal). Vite for dev server and production bundling. No TypeScript — plain JavaScript with ES modules.

---

## 2. Game World

### 2.1 Areas

The game world consists of multiple distinct areas. Minions can be moved between areas by the player.

| Area | Visible? | Description |
|---|---|---|
| **The Yard** | Yes | Main play area. Minions walk around, idle, and interact here. Default starting area. |
| **Gru's Lab** | Yes | Secondary visible area. Minions here work on inventions/missions. Has unique idle animations (tinkering, wielding tools). |
| **The Factory** | No (off-screen) | Minions sent here are not rendered. They "work for Gru" and generate Banana Coins over time. A sidebar list shows who is in the factory and how long they've been there. Minions can be recalled at any time. |
| **The Wardrobe** | Yes (overlay) | Dress-up screen for a selected Minion. Not a physical area — opens as a modal/panel. |
| **The Nursery** | Yes (overlay) | Where new Minions are born after procreation. The player names and styles the newborn here. |

### 2.2 Area Navigation

- A **tab bar** or **area selector** at the top of the screen switches between The Yard, Gru's Lab, and a Factory roster view.
- Only one visible area is rendered at a time to keep performance stable.
- Minions remember which area they are assigned to.

---

## 3. Minions

### 3.1 Starting Minions

These three Minions are present from game start and **cannot be deleted**.

| Name | Eye Type | Body Shape | Personality Trait |
|---|---|---|---|
| **Kevin** | Two eyes | Tall | Leader — slightly faster movement, initiates group actions |
| **Stuart** | One eye | Medium | Lazy — slower idle cycle, loves music |
| **Bob** | Two eyes (heterochromia: one green, one brown) | Short | Childlike — faster emotional shifts, carries teddy bear "Tim" |

### 3.2 Minion Properties

Every Minion has:

| Property | Type | Description |
|---|---|---|
| `name` | string | Unique display name. Chosen at birth (or preset for starters). |
| `eyeType` | enum | `one-eye`, `two-eye` |
| `bodyShape` | enum | `tall`, `medium`, `short` |
| `outfit` | Outfit object | Currently worn clothing items (see §6 Wardrobe). |
| `mood` | enum | `happy`, `neutral`, `sad`, `excited`, `angry` — affects idle animations and interaction outcomes. |
| `hunger` | 0–100 | Decreases over time. At 0 the Minion becomes sad and unresponsive. Feed with bananas. |
| `energy` | 0–100 | Decreases with actions. Recovers when idle or sleeping. |
| `friendship` | map<minionId, 0–100> | Pairwise relationship score with every other Minion. Affects interaction success rates. |
| `area` | enum | Current area assignment. |
| `isDeletable` | bool | `false` for Kevin, Stuart, Bob. `true` for all others. |
| `age` | number | Time alive in game-minutes. Purely cosmetic (Minions don't die of old age). |
| `traits` | string[] | One or two personality traits assigned at birth (e.g., "Musical", "Clumsy", "Brave", "Greedy", "Silly"). Affect animation flavor and interaction bonuses. |

### 3.3 Minion Rendering

- Minions are rendered as **Phaser 3 Sprites** (or sprite containers with layered body/clothing sprites).
- Each Minion is a `Phaser.GameObjects.Container` holding: body sprite, eye sprite, clothing layer sprites, name `Phaser.GameObjects.Text`, mood bubble sprite.
- Mood is indicated by a small emoji bubble above the Minion (can be toggled off).
- Minions wander their assigned area using Phaser tweens or simple velocity-based movement.
- Idle animations via Phaser's `Sprite.anims` system (walking, looking around, yawning, giggling).
- Paired interactions: both Minion containers face each other, play synchronized animations via timeline or tween chains.

---

## 4. Actions & Interactions

### 4.1 Action System Architecture

Actions are implemented as **pluggable action modules** so new actions can be added without modifying core logic.

```
Action {
  id: string               // unique key, e.g. "kiss"
  label: string            // display name
  icon: string             // emoji or sprite ref
  type: "solo" | "pair"   // solo = one minion, pair = two minions
  requiredMinions: number  // 1 or 2
  canPerform(minion, target?): bool   // precondition check
  perform(minion, target?): ActionResult  // execute, return outcome
  sound: string            // audio file key
  animation: string        // animation key
  cooldown: number         // ms before this minion can do this action again
}
```

New actions are registered in an **ActionRegistry** (simple array/map). The UI dynamically builds action menus from the registry.

### 4.2 Core Actions

#### Pair Actions (require selecting two Minions)

| Action | Precondition | Effect | Sound |
|---|---|---|---|
| **Kiss** | Friendship ≥ 30 | +15 friendship, both Minions become `happy`, heart particles | Smooch SFX |
| **Procreate** | Friendship ≥ 60, both energy ≥ 30 | Opens Nursery overlay to birth a new Minion. Both parents lose 30 energy. | Celebration SFX + baby cry |
| **High Five** | None | +5 friendship, brief animation | Slap SFX |
| **Dance Together** | None | +10 friendship, +10 mood for both, plays music snippet | Minion dance music |
| **Argue** | Friendship < 20 OR mood == `angry` | -10 friendship, both become `angry`, storm cloud particles | Bickering SFX |
| **Gift Banana** | Player has ≥1 banana | +20 friendship, receiver hunger +30 | Nom SFX |
| **Play Fight** | Energy ≥ 20 | +8 friendship, -10 energy each, random chance one becomes `sad` (loser) | Bonk SFX |

#### Solo Actions (single Minion)

| Action | Precondition | Effect | Sound |
|---|---|---|---|
| **Feed** | Player has bananas | +30 hunger, Minion becomes `happy` | Nom SFX |
| **Nap** | Energy < 50 | Minion sleeps for 30 game-seconds, energy restores to 100 | Snoring SFX |
| **Dress Up** | None | Opens Wardrobe overlay for this Minion | Zipper SFX |
| **Send to Factory** | Not already in factory | Move Minion to Factory (off-screen), starts earning Banana Coins | Marching SFX |
| **Recall from Factory** | Minion is in factory | Returns Minion to The Yard | Whistle SFX |
| **Sing** | Trait: "Musical" OR random 50% chance | Nearby Minions gain +5 mood | Banana song snippet |
| **Tickle** | None | Minion giggles, +10 mood | Giggle SFX |
| **Scold** | None | Minion becomes `sad`, -10 mood (useful if Minion is `angry` to reset) | Stern voice SFX |

### 4.3 Interaction Flow

1. **Select a Minion** by clicking/tapping it. A radial menu or bottom action bar appears showing available solo actions.
2. **For pair actions:** After selecting the first Minion, tap a second Minion. The action bar updates to show pair actions available for this duo (filtered by preconditions).
3. Actions that fail preconditions are shown grayed out with a tooltip explaining why.
4. Performing an action triggers: animation → sound → stat changes → particle effects → cooldown timer.

### 4.4 Future Action Extensibility

To add a new action:
1. Create an action object conforming to the `Action` interface.
2. Register it in the `ActionRegistry`.
3. Provide a sound file and animation key.
4. The UI auto-discovers it — no other code changes needed.

---

## 5. Procreation & The Nursery

### 5.1 Procreation Flow

1. Select two Minions → choose "Procreate" from pair actions.
2. A brief animation plays (Minions stand together, sparkles, a stork flies across — keep it family-friendly).
3. The **Nursery Overlay** opens.

### 5.2 Nursery Overlay

The Nursery presents the newborn Minion with customization options:

| Field | Options |
|---|---|
| **Name** | Text input. Must be unique among living Minions. Max 20 characters. |
| **Eye Type** | `one-eye` or `two-eye` (random default biased by parents) |
| **Body Shape** | `tall`, `medium`, `short` (random default biased by parents) |
| **Skin Tone** | Standard Minion yellow (default) or slight hue variation for variety |
| **Personality Traits** | Pick 1–2 from a list. Some traits are inherited from parents with higher probability. |

After confirming, the new Minion appears in The Yard with starting stats:
- Hunger: 80
- Energy: 100
- Mood: `excited`
- Friendships: 20 with each parent, 0 with everyone else.

### 5.3 Minion Deletion

- Any Minion except Kevin, Stuart, and Bob can be deleted.
- Access via a Minion's detail panel → "Release Minion" button (with confirmation dialog: "Send [Name] away? This cannot be undone.").
- Deleted Minions are removed from all friendship maps and the factory roster.

---

## 6. Wardrobe & Clothing

### 6.1 Clothing Slots

Each Minion has the following equipment slots:

| Slot | Examples |
|---|---|
| **Hat** | Hard hat, crown, beanie, party hat, pirate hat, banana peel hat |
| **Goggles** | Default Minion goggles (one-eye / two-eye), aviator goggles, heart-shaped |
| **Top** | Overalls (default), Hawaiian shirt, tuxedo jacket, Gru logo tee, maid outfit top |
| **Bottom** | Overalls (default), shorts, tutu, jeans, kilt |
| **Shoes** | Barefoot (default), boots, sneakers, clown shoes, flip-flops |
| **Gloves** | None (default), rubber gloves, boxing gloves, oven mitts |
| **Accessory** | None (default), cape, scarf, necklace, bow tie, teddy bear (Bob exclusive default) |

### 6.2 Wardrobe UI

- Opens as a full-screen overlay when "Dress Up" is selected.
- Left panel: Minion preview (live-updates as items change).
- Right panel: Scrollable grid of clothing items organized by slot tabs.
- Items can be unlocked via Banana Coins or storyline progression.
- Drag-and-drop or tap-to-equip.
- "Clear All" button to reset to default overalls + goggles.
- "Randomize" button for fun.

### 6.3 Clothing Acquisition

- Some items are free from the start (default overalls, goggles).
- Others cost **Banana Coins** (earned from Factory work and storyline).
- Special items are **storyline rewards** (see §9).

---

## 7. Economy — Banana Coins

| Source | Rate |
|---|---|
| Factory work | 1 coin per Minion per 60 real-seconds in factory |
| Storyline mission completion | Varies (10–100 coins) |
| Daily login bonus | 5 coins |
| Minion milestone (10th Minion born, etc.) | 25 coins |

**Spending:**
- Wardrobe items: 5–50 coins each.
- Banana food stock: 3 coins for 5 bananas.
- Area decorations (future feature placeholder): 10–100 coins.

Banana Coin balance shown in the top HUD bar at all times.

---

## 8. Audio

### 8.1 Background Music

- **Main Theme:** A playful, Minion-styled loop. Upbeat, uses ukulele, kazoo/vocal hums, light percussion. Evocative of the Minions movie soundtrack vibe without infringing (original composition in that style).
- **Gru's Lab Theme:** Slightly more dramatic/mysterious. Minor key with comedic undertones.
- **Factory Ambient:** Industrial sounds mixed with Minion gibberish humming.
- Music crossfades when switching areas.
- Volume slider in settings. Mute toggle.

### 8.2 Sound Effects

Every action has an associated SFX (see §4.2 tables). Additional ambient sounds:

- Minion idle chatter (random gibberish clips every 10–30 seconds).
- Footstep sounds when Minions walk.
- UI click/tap sounds for buttons.
- Notification chime for story objectives.

### 8.3 Audio Implementation

- Use **Phaser's built-in audio system** (`this.sound.add()`) which wraps Web Audio API.
- Preload all SFX in the Phaser `preload()` phase. Music loaded as audio streams.
- Phaser handles simultaneous SFX natively (multiple Minions acting at once).
- Crossfade between area music tracks using Phaser tween on volume.
- Respect device silent mode on mobile.
- All audio files in `public/audio/` directory, loaded via Phaser's asset loader with keys defined in a manifest/config.

---

## 9. Storyline — "Gru's Master Plan"

An optional multi-chapter storyline the player can follow. Provides objectives, rewards, and unlocks. Progress is saved locally.

### 9.1 Story Structure

The story is divided into **5 Chapters**, each with **4–5 missions**. Completing all missions in a chapter unlocks the next chapter and a special reward.

---

#### Chapter 1: "The Banana Heist" (Tutorial)

*Gru has a plan to steal the world's largest banana from the Banana Museum. He needs his Minions ready.*

| Mission | Objective | Reward |
|---|---|---|
| 1.1 — Roll Call | Have Kevin, Stuart, and Bob all in The Yard at the same time. | 10 Banana Coins |
| 1.2 — Team Building | Perform a High Five between any two Minions. | Unlocks "Dance Together" action |
| 1.3 — Dress for Success | Equip any clothing item on any Minion. | Hard Hat (free clothing item) |
| 1.4 — First Kiss | Have two Minions with friendship ≥ 30, then Kiss. | 15 Banana Coins |
| 1.5 — New Recruit | Procreate a new Minion. Name it anything. | Unlocks Gru's Lab area |

**Chapter Reward:** Unlock "Banana Thief" outfit set (striped shirt + black beanie + mask accessory).

---

#### Chapter 2: "Lab Rats"

*Gru's Lab is open. He needs Minions to help build a new shrink ray.*

| Mission | Objective | Reward |
|---|---|---|
| 2.1 — Report for Duty | Send a Minion to Gru's Lab. | 10 Banana Coins |
| 2.2 — Research Team | Have 3 Minions in Gru's Lab simultaneously. | Lab Coat clothing item |
| 2.3 — Workplace Bonding | Perform "Dance Together" in Gru's Lab. | 20 Banana Coins |
| 2.4 — Overtime | Keep a Minion in the Factory for 5 cumulative minutes. | Safety Goggles clothing item |
| 2.5 — Growing Family | Have at least 5 total Minions alive. | Unlocks "Sing" action for all Minions |

**Chapter Reward:** Shrink Ray accessory item + "Scientist" trait available at birth.

---

#### Chapter 3: "Party Time"

*It's Gru's birthday! The Minions need to throw a surprise party.*

| Mission | Objective | Reward |
|---|---|---|
| 3.1 — Party Hats | Equip 3 different Minions with hats. | Party Hat clothing item |
| 3.2 — Best Friends | Get any two Minions to friendship level 80+. | 25 Banana Coins |
| 3.3 — Sing-Along | Have a Minion use "Sing" while 3+ Minions are in the same area. | Boom Box accessory |
| 3.4 — Food Prep | Feed 5 different Minions (bananas). | 30 Banana Coins |
| 3.5 — The Big Surprise | Have 8+ Minions all in The Yard, all with mood `happy` or `excited`. | Unlocks "Group Dance" action (all Minions in area dance simultaneously) |

**Chapter Reward:** Party outfit set (bow tie + top hat + fancy shoes) + Birthday Cake accessory.

---

#### Chapter 4: "The Great Escape"

*Some Minions have been captured by Vector! Time for a rescue mission.*

| Mission | Objective | Reward |
|---|---|---|
| 4.1 — Missing! | A randomly chosen non-starter Minion "disappears" (auto-moved to a locked state). Player is notified. | (story event, no reward yet) |
| 4.2 — Assemble the Team | Have at least 4 Minions with friendship ≥ 50 with Kevin. | 20 Banana Coins |
| 4.3 — Suit Up | Equip Kevin, Stuart, and Bob each with a full outfit (all slots filled). | Spy Suit clothing set |
| 4.4 — Factory Push | Have 3 Minions in the Factory earning coins. Earn 50 coins total from factory. | 40 Banana Coins |
| 4.5 — Rescue! | Spend 75 Banana Coins to "fund the rescue." Captured Minion returns with `excited` mood and a special "Survivor" trait. | Unlocks "Play Fight" action + captured Minion returns |

**Chapter Reward:** Vector's Tracksuit outfit set + "Brave" trait becomes 2x more likely at birth.

---

#### Chapter 5: "Minion World Domination"

*Gru declares the Minion colony ready to take over... a water park. It's ambitious for Minions.*

| Mission | Objective | Reward |
|---|---|---|
| 5.1 — Army | Have 15+ total Minions alive. | 50 Banana Coins |
| 5.2 — Fashionistas | Have 10 Minions each wearing at least 3 clothing items. | Unlocks "Accessory: Crown" |
| 5.3 — Harmony | Have no Minions with mood `angry` or `sad`. All must be `happy`, `excited`, or `neutral`. | 40 Banana Coins |
| 5.4 — BFFs | Have any two Minions at friendship 100 (max). | Friendship Bracelet accessory (paired — both Minions wear it) |
| 5.5 — Grand Finale | Trigger "Group Dance" with 10+ Minions. | 100 Banana Coins + Gru's Scarf accessory |

**Chapter Reward:** "Minion Master" title displayed on screen. Unlocks **Freeplay+** mode: increased coin earn rate, all clothing items 50% off, new trait "Legendary" available.

---

### 9.2 Story UI

- A **Story Journal** button in the HUD opens a panel showing:
  - Current chapter name and description.
  - List of missions with status (locked / active / completed).
  - Progress bar per chapter.
  - Completed chapter rewards shown with checkmarks.
- Active mission objective displayed as a subtle banner at the bottom of the play area.
- Mission completion triggers a celebratory animation (confetti, Minion cheer sound, coin shower).

### 9.3 Story State

- Story progress saved to `localStorage`.
- Missions are evaluated continuously (polling every 2 seconds or event-driven when relevant stats change).
- Player can ignore the story entirely and play in sandbox mode.

---

## 10. UI Layout

### 10.1 Desktop Layout (≥ 1024px)

```
┌──────────────────────────────────────────────────────┐
│  [🍌 142]  [Area: Yard ▾]  [📖 Story]  [⚙ Settings] │  ← HUD Bar
├──────────────────────────────────────────────────────┤
│                                                      │
│                   PLAY AREA                          │
│         (Minions walk, interact here)                │
│                                                      │
│                                                      │
│                                                      │
├──────────────────────────────────────────────────────┤
│  [Selected: Kevin ♥]                                 │  ← Action Bar
│  [Feed] [Nap] [Dress] [Send to Factory] [Tickle]    │
│  Tap another Minion for pair actions                 │
└──────────────────────────────────────────────────────┘
```

### 10.2 Mobile Layout (< 1024px)

- HUD bar collapses to icons only (coin count always visible).
- Play area fills the screen.
- Action bar becomes a **bottom sheet** that slides up on Minion selection.
- Wardrobe and Nursery overlays become full-screen modals.
- Touch: tap to select, tap second Minion for pair actions, long-press for quick-info tooltip.

### 10.3 Settings Panel

| Setting | Default |
|---|---|
| Music Volume | 70% |
| SFX Volume | 80% |
| Show Mood Bubbles | On |
| Show Name Labels | On |
| Game Speed | 1x (options: 0.5x, 1x, 2x) |
| Reset Game | (confirmation dialog) |

---

## 11. Data Persistence

- **All game state saved to `localStorage`** under key `minion-sims-save`.
- Auto-save every 30 seconds and on every significant action.
- Save structure:

```json
{
  "version": 1,
  "bananaCoins": 142,
  "bananas": 12,
  "minions": [ { ...minionProperties } ],
  "storyProgress": {
    "chapter": 2,
    "completedMissions": ["1.1", "1.2", "1.3", "1.4", "1.5", "2.1"]
  },
  "unlockedClothing": ["hard-hat", "lab-coat"],
  "settings": { ... },
  "factoryLog": { "minionId": { "enteredAt": timestamp } },
  "lastSaved": "ISO timestamp"
}
```

- "Reset Game" in settings clears this key after confirmation.
- Future: export/import save as JSON file.

---

## 12. Particle & Visual Effects

| Event | Effect |
|---|---|
| Kiss | Pink/red heart particles float up |
| Procreation | Sparkle burst + stork fly-across |
| High Five | Star burst at hand contact point |
| Dance | Musical notes float around dancers |
| Argue | Small storm cloud with lightning |
| Feed | Banana emoji floats up and fades |
| Mission complete | Confetti shower across screen |
| Coin earned | Coin icon flies to HUD coin counter |
| Nap | Zzz bubbles above sleeping Minion |
| Level up friendship | Small glow pulse around both Minions |

Particles implemented via **Phaser's built-in particle emitter** (`this.add.particles()`) — no custom particle system needed.

---

## 13. Minion AI / Idle Behavior

When not being directed by the player, Minions exhibit autonomous behavior:

- **Wander:** Walk to random positions within their area every 5–15 seconds.
- **Idle animations:** Yawn, scratch head, look at camera, poke nearby Minion.
- **Auto-interact:** If two idle Minions are close, 10% chance per tick they auto-High Five or auto-giggle (friendship ≥ 20 required).
- **Mood decay:** Mood trends toward `neutral` over time. Hunger decay makes mood trend toward `sad`.
- **Hunger decay:** -1 hunger per 30 real-seconds. At 0, mood locks to `sad`, no auto-interactions.
- **Energy recovery:** +1 energy per 10 real-seconds while idle. Actions drain 5–30 energy depending on action.
- **Sleep:** If energy hits 0, Minion auto-naps (uninterruptible for 15 seconds, then energy = 50).

---

## 14. Technical Architecture

### 14.1 File Structure

```
site/minion-sims/
├── package.json           # Dependencies (phaser, vite) & scripts
├── vite.config.js         # Vite config — input/output paths
├── index.html             # Entry HTML (Vite entry point)
├── spec.md
├── src/
│   ├── main.js            # Entry point — create Phaser game instance
│   ├── config.js          # Phaser game config (scenes, dimensions, etc.)
│   ├── scenes/
│   │   ├── BootScene.js   # Preload assets, show loading bar
│   │   ├── YardScene.js   # The Yard — main play area
│   │   └── LabScene.js    # Gru's Lab scene
│   ├── objects/
│   │   └── Minion.js      # Minion class (extends Phaser.GameObjects.Container)
│   ├── systems/
│   │   ├── ActionRegistry.js  # Pluggable action system
│   │   ├── actions/       # One file per action (kiss.js, highfive.js, etc.)
│   │   ├── Economy.js     # Banana Coins logic
│   │   ├── Story.js       # Storyline state machine & mission checks
│   │   ├── MinionAI.js    # Idle behavior, wander, auto-interact
│   │   └── SaveManager.js # localStorage save/load
│   ├── ui/
│   │   ├── HUD.js         # Coin counter, area selector, story button
│   │   ├── ActionBar.js   # Bottom action bar (DOM overlay)
│   │   ├── Nursery.js     # Procreation overlay (DOM)
│   │   ├── Wardrobe.js    # Dress-up overlay (DOM)
│   │   ├── StoryJournal.js # Mission log overlay (DOM)
│   │   └── Settings.js    # Settings panel (DOM)
│   ├── audio/
│   │   └── AudioManager.js # Wraps Phaser audio, crossfade logic
│   └── utils.js           # Shared helpers, RNG, constants
├── public/                # Static assets (copied as-is by Vite)
│   ├── audio/
│   │   ├── music/
│   │   │   ├── yard-theme.mp3
│   │   │   ├── lab-theme.mp3
│   │   │   └── factory-ambient.mp3
│   │   └── sfx/
│   │       ├── kiss.mp3
│   │       ├── highfive.mp3
│   │       ├── giggle.mp3
│   │       ├── nom.mp3
│   │       └── ui-click.mp3
│   └── img/
│       ├── minions/       # Sprite sheets or SVG parts
│       └── clothing/      # Individual clothing item images
├── css/
│   └── style.css          # UI overlay styles (HUD, modals, action bar)
# Build output goes to ../../dist/minion-sims/ (git-ignored, served by Go server)
```

### 14.2 Phaser Game Config

```js
// src/config.js
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { YardScene } from './scenes/YardScene.js';
import { LabScene } from './scenes/LabScene.js';

export const gameConfig = {
  type: Phaser.AUTO,              // WebGL with Canvas fallback
  parent: 'game-container',       // DOM element ID
  width: 1024,
  height: 768,
  scale: {
    mode: Phaser.Scale.RESIZE,    // Fill viewport, maintain aspect
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, YardScene, LabScene],
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  backgroundColor: '#87CEEB',     // Sky blue default
};
```

### 14.3 Game Loop (Phaser-managed)

Phaser provides the game loop via `requestAnimationFrame`. Each Scene has:

```
preload()  → Load assets (sprites, audio)
create()   → Instantiate game objects, register input handlers
update(time, delta) →
  1. MinionAI.update(delta)   — wander, decay, auto-interact
  2. Story.checkMissions()    — throttled to every 2s
  3. SaveManager.autoSave()   — throttled to every 30s
  // Phaser auto-handles: rendering, tweens, animations, particles, physics
```

### 14.4 Responsive Design

- Phaser `Scale.RESIZE` mode scales the game canvas to fill viewport.
- CSS media queries for DOM overlays (HUD, action bar, modals).
- Phaser's pointer events handle both mouse and touch natively.
- No horizontal scrolling. Vertical scroll only in overlay panels.

---

## 15. Accessibility

- All interactive elements keyboard-navigable (Tab / Enter / Escape).
- ARIA labels on buttons and overlays.
- Color not used as sole indicator (mood shown with both color and icon).
- Reduced motion: if `prefers-reduced-motion` is set, disable particle effects and use simple fade transitions.
- Screen reader announcements for mission completion and important events.

---

## 16. Future Expansion Hooks

These are **not** in scope for v1 but the architecture should not prevent them:

- **Multiplayer:** Visit another player's colony.
- **Area decorations:** Buy and place furniture/items in The Yard.
- **Minion jobs:** Specialized roles in Gru's Lab that require specific traits.
- **Mini-games:** Banana collection runner, Minion bowling, etc.
- **Seasons/events:** Holiday-themed clothing and missions.
- **Achievement system:** Badges for milestones (100 kisses, 50 Minions, etc.).
- **Cloud save:** Sync via a backend API.

---

## 17. Build & Deployment

### 17.1 Prerequisites

- Node.js ≥ 18
- npm (comes with Node)

### 17.2 Initial Setup (one time)

```bash
cd site/minion-sims
npm install
```

This installs two dependencies: `phaser` and `vite`.

### 17.3 Development

```bash
npm run dev
```

Starts Vite dev server on `http://localhost:5173` with hot module reload. Edit source files → browser auto-updates. Phaser loads from `node_modules`, assets served from `public/`.

**Note:** During dev, the Go server is not involved. For integration testing with the Go server, run a production build first.

### 17.4 Production Build

```bash
npm run build
```

This runs `vite build` which:
1. Bundles all JS (including Phaser) into optimized chunks in `dist/`.
2. Copies `public/` assets (audio, images) into `dist/`.
3. Generates `dist/index.html` with hashed script tags.

Output is a fully static site in `dist/` — no Node.js needed at runtime.

### 17.5 Deploy to Go Server

```bash
npm run deploy
```

This runs `vite build` then copies `dist/` contents to a location the Go server can serve. The Go server's `http.FileServer` serves `./site/minion-sims/dist/` as static files.

**Alternatively** (simplest): Configure `vite.config.js` with `base: '/minion-sims/'` and `build.outDir` pointing to a served directory, so `npm run build` is the only step.

### 17.6 Vite Config

```js
// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/minion-sims/',     // URL base path on Go server
  build: {
    outDir: '../../dist/minion-sims',  // Output to Go server's served directory
    assetsDir: 'assets',     // JS/CSS chunks go here
    sourcemap: false,        // Enable for debugging
    emptyOutDir: true,       // Clean output dir before build
  },
  server: {
    port: 5173,              // Dev server port
  },
});
```

### 17.7 npm Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

### 17.8 Summary — 3 Commands

| What | Command |
|---|---|
| Install deps | `npm install` |
| Develop | `npm run dev` |
| Build for prod | `npm run build` |
