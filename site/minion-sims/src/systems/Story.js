import { GameState } from './GameState.js';
import { Economy } from './Economy.js';
import { getMoodFromValue, pickRandom } from '../utils.js';

/* ═══════════════ CHAPTER & MISSION DATA ═══════════════ */

const chapters = [
  /* ── Chapter 1: The Banana Heist ── */
  {
    id: 1,
    name: 'The Banana Heist',
    desc: 'Gru has a plan to steal the world\'s largest banana. He needs his Minions ready.',
    missions: [
      {
        id: '1.1', name: 'Roll Call',
        objective: 'Have Kevin, Stuart, and Bob all in The Yard.',
        check: () => {
          const yard = GameState.getMinionsInArea('yard');
          return ['Kevin', 'Stuart', 'Bob'].every(n => yard.some(m => m.name === n));
        },
        reward: () => Economy.addCoins(10),
        rewardText: '10 Banana Coins',
      },
      {
        id: '1.2', name: 'Team Building',
        objective: 'Perform a High Five between any two Minions.',
        check: () => !!GameState.storyProgress.flags.highFivePerformed,
        reward: () => GameState.unlockedActions.add('dance-together'),
        rewardText: 'Unlock "Dance Together" action',
      },
      {
        id: '1.3', name: 'Dress for Success',
        objective: 'Equip any clothing item on any Minion.',
        check: () => !!GameState.storyProgress.flags.clothingEquipped,
        reward: () => { GameState.unlockedClothing.add('hard-hat'); },
        rewardText: 'Hard Hat clothing item',
      },
      {
        id: '1.4', name: 'First Kiss',
        objective: 'Have two Minions kiss (friendship ≥ 30).',
        check: () => !!GameState.storyProgress.flags.kissPerformed,
        reward: () => Economy.addCoins(15),
        rewardText: '15 Banana Coins',
      },
      {
        id: '1.5', name: 'New Recruit',
        objective: 'Procreate a new Minion.',
        check: () => !!GameState.storyProgress.flags.procreationDone,
        reward: () => { GameState.labUnlocked = true; GameState.emit('lab-unlocked'); },
        rewardText: "Unlock Gru's Lab area",
      },
    ],
    reward: () => {
      ['striped-shirt', 'black-beanie', 'mask'].forEach(i => GameState.unlockedClothing.add(i));
    },
    rewardText: '"Banana Thief" outfit set',
  },

  /* ── Chapter 2: Lab Rats ── */
  {
    id: 2,
    name: 'Lab Rats',
    desc: "Gru's Lab is open. He needs Minions to build a new shrink ray.",
    missions: [
      {
        id: '2.1', name: 'Report for Duty',
        objective: 'Send a Minion to Gru\'s Lab.',
        check: () => {
          GameState.storyProgress.flags.minionSentToLab =
            GameState.storyProgress.flags.minionSentToLab || GameState.getMinionsInArea('lab').length > 0;
          return !!GameState.storyProgress.flags.minionSentToLab;
        },
        reward: () => Economy.addCoins(10),
        rewardText: '10 Banana Coins',
      },
      {
        id: '2.2', name: 'Research Team',
        objective: 'Have 3 Minions in Gru\'s Lab simultaneously.',
        check: () => GameState.getMinionsInArea('lab').length >= 3,
        reward: () => GameState.unlockedClothing.add('lab-coat'),
        rewardText: 'Lab Coat clothing item',
      },
      {
        id: '2.3', name: 'Workplace Bonding',
        objective: 'Perform "Dance Together" in Gru\'s Lab.',
        check: () => !!GameState.storyProgress.flags.dancedInLab,
        reward: () => Economy.addCoins(20),
        rewardText: '20 Banana Coins',
      },
      {
        id: '2.4', name: 'Overtime',
        objective: 'Have any Minion work in the Factory for at least 1 minute.',
        check: () => (GameState.storyProgress.flags.maxFactoryTime || 0) >= 60000,
        reward: () => GameState.unlockedClothing.add('safety-goggles'),
        rewardText: 'Safety Goggles clothing item',
      },
      {
        id: '2.5', name: 'Growing Family',
        objective: 'Have at least 5 total Minions alive.',
        check: () => GameState.minions.length >= 5,
        reward: () => GameState.unlockedActions.add('sing'),
        rewardText: 'Unlock "Sing" action for all Minions',
      },
    ],
    reward: () => {
      GameState.unlockedClothing.add('shrink-ray');
      // Scientist trait now available — handled by trait list in nursery
    },
    rewardText: 'Shrink Ray accessory + "Scientist" trait',
  },

  /* ── Chapter 3: Party Time ── */
  {
    id: 3,
    name: 'Party Time',
    desc: "It's Gru's birthday! The Minions need to throw a surprise party.",
    missions: [
      {
        id: '3.1', name: 'Party Hats',
        objective: 'Equip 3 different Minions with hats.',
        check: () => GameState.minions.filter(m => m.outfit.hat).length >= 3,
        reward: () => GameState.unlockedClothing.add('party-hat'),
        rewardText: 'Party Hat clothing item',
      },
      {
        id: '3.2', name: 'Best Friends',
        objective: 'Get any two Minions to friendship level 80+.',
        check: () => GameState.minions.some(m =>
          Object.values(m.friendship).some(f => f >= 80)),
        reward: () => Economy.addCoins(25),
        rewardText: '25 Banana Coins',
      },
      {
        id: '3.3', name: 'Sing-Along',
        objective: 'Have a Minion use "Sing" while 3+ Minions are in the same area.',
        check: () => !!GameState.storyProgress.flags.singPerformed &&
          (GameState.storyProgress.flags.singAreaCount || 0) >= 3,
        reward: () => GameState.unlockedClothing.add('boom-box'),
        rewardText: 'Boom Box accessory',
      },
      {
        id: '3.4', name: 'Food Prep',
        objective: 'Feed 5 different Minions.',
        check: () => (GameState.storyProgress.flags.fedMinionIds || []).length >= 5,
        reward: () => Economy.addCoins(30),
        rewardText: '30 Banana Coins',
      },
      {
        id: '3.5', name: 'The Big Surprise',
        objective: 'Have 8+ Minions all in The Yard, all happy or excited.',
        check: () => {
          const yard = GameState.getMinionsInArea('yard');
          return yard.length >= 8 && yard.every(m => {
            const mood = getMoodFromValue(m.moodValue);
            return mood === 'happy' || mood === 'excited';
          });
        },
        reward: () => GameState.unlockedActions.add('group-dance'),
        rewardText: 'Unlock "Group Dance" action',
      },
    ],
    reward: () => {
      ['bow-tie', 'top-hat', 'fancy-shoes', 'birthday-cake'].forEach(i => GameState.unlockedClothing.add(i));
    },
    rewardText: 'Party outfit set + Birthday Cake accessory',
  },

  /* ── Chapter 4: The Great Escape ── */
  {
    id: 4,
    name: 'The Great Escape',
    desc: 'Some Minions have been captured by Vector! Time for a rescue mission.',
    missions: [
      {
        id: '4.1', name: 'Missing!',
        objective: 'A Minion has been captured!',
        autoTrigger: () => {
          const candidates = GameState.minions.filter(m => m.isDeletable && m.area !== 'factory');
          if (candidates.length > 0 && !GameState.capturedMinionId) {
            const victim = pickRandom(candidates);
            victim.area = 'captured';
            GameState.capturedMinionId = victim.id;
            GameState.emit('minion-captured', victim);
          }
        },
        check: () => !!GameState.capturedMinionId,
        reward: () => {}, // Story event
        rewardText: '(story event)',
      },
      {
        id: '4.2', name: 'Assemble the Team',
        objective: 'Have at least 4 Minions with friendship ≥ 50 with Kevin.',
        check: () => {
          const kevin = GameState.getMinionByName('Kevin');
          if (!kevin) return false;
          return GameState.minions.filter(m =>
            m.id !== kevin.id && (m.friendship[kevin.id] || 0) >= 50
          ).length >= 4;
        },
        reward: () => Economy.addCoins(20),
        rewardText: '20 Banana Coins',
      },
      {
        id: '4.3', name: 'Suit Up',
        objective: 'Equip Kevin, Stuart, and Bob with full outfits (all slots filled).',
        check: () => {
          return ['Kevin', 'Stuart', 'Bob'].every(name => {
            const m = GameState.getMinionByName(name);
            if (!m) return false;
            return m.outfit.hat && m.outfit.goggles && m.outfit.top &&
              m.outfit.bottom && m.outfit.shoes && m.outfit.gloves && m.outfit.accessory;
          });
        },
        reward: () => {
          ['spy-suit-top', 'spy-suit-bottom'].forEach(i => GameState.unlockedClothing.add(i));
        },
        rewardText: 'Spy Suit clothing set',
      },
      {
        id: '4.4', name: 'Factory Push',
        objective: 'Have 3 Minions in Factory and earn 50 coins total from factory.',
        check: () => {
          return GameState.getMinionsInArea('factory').length >= 3 &&
            (GameState.storyProgress.flags.factoryTotalEarned || 0) >= 50;
        },
        reward: () => Economy.addCoins(40),
        rewardText: '40 Banana Coins',
      },
      {
        id: '4.5', name: 'Rescue!',
        objective: 'Spend 75 Banana Coins to fund the rescue.',
        check: () => !!GameState.storyProgress.flags.rescueFunded,
        reward: () => {
          // Return captured minion
          if (GameState.capturedMinionId) {
            const minion = GameState.getMinion(GameState.capturedMinionId);
            if (minion) {
              minion.area = 'yard';
              minion.moodValue = 90;
              if (!minion.traits.includes('Survivor')) minion.traits.push('Survivor');
            }
            GameState.capturedMinionId = null;
          }
          GameState.unlockedActions.add('play-fight');
        },
        rewardText: 'Play Fight action + rescued Minion returns',
      },
    ],
    reward: () => {
      ['vector-top', 'vector-bottom'].forEach(i => GameState.unlockedClothing.add(i));
      // Brave trait 2x likely — stored as flag
      GameState.storyProgress.flags.braveBoosted = true;
    },
    rewardText: "Vector's Tracksuit outfit + Brave trait boost",
  },

  /* ── Chapter 5: Minion World Domination ── */
  {
    id: 5,
    name: 'Minion World Domination',
    desc: 'Gru declares the Minion colony ready to take over... a water park.',
    missions: [
      {
        id: '5.1', name: 'Army',
        objective: 'Have 15+ total Minions alive.',
        check: () => GameState.minions.length >= 15,
        reward: () => Economy.addCoins(50),
        rewardText: '50 Banana Coins',
      },
      {
        id: '5.2', name: 'Fashionistas',
        objective: 'Have 10 Minions each wearing at least 3 clothing items.',
        check: () => {
          return GameState.minions.filter(m => {
            const o = m.outfit;
            let count = 0;
            if (o.hat) count++;
            if (o.goggles) count++;
            if (o.top) count++;
            if (o.bottom) count++;
            if (o.shoes) count++;
            if (o.gloves) count++;
            if (o.accessory) count++;
            return count >= 3;
          }).length >= 10;
        },
        reward: () => GameState.unlockedClothing.add('crown'),
        rewardText: 'Crown accessory',
      },
      {
        id: '5.3', name: 'Harmony',
        objective: 'Have no Minions with mood angry or sad.',
        check: () => GameState.minions.every(m => {
          const mood = getMoodFromValue(m.moodValue);
          return mood !== 'angry' && mood !== 'sad';
        }),
        reward: () => Economy.addCoins(40),
        rewardText: '40 Banana Coins',
      },
      {
        id: '5.4', name: 'BFFs',
        objective: 'Have any two Minions at friendship 100.',
        check: () => GameState.minions.some(m =>
          Object.values(m.friendship).some(f => f >= 100)),
        reward: () => GameState.unlockedClothing.add('friendship-bracelet'),
        rewardText: 'Friendship Bracelet accessory',
      },
      {
        id: '5.5', name: 'Grand Finale',
        objective: 'Trigger "Group Dance" with 10+ Minions.',
        check: () => !!GameState.storyProgress.flags.groupDancePerformed &&
          (GameState.storyProgress.flags.groupDanceMinionCount || 0) >= 10,
        reward: () => {
          Economy.addCoins(100);
          GameState.unlockedClothing.add('grus-scarf');
        },
        rewardText: "100 Banana Coins + Gru's Scarf",
      },
    ],
    reward: () => {
      GameState.freeplusMode = true;
    },
    rewardText: '"Minion Master" title + Freeplay+ mode',
  },
];

/* ═══════════════ STORY SYSTEM ═══════════════ */

class StorySystem {
  constructor() {
    this._lastCheck = 0;
  }

  getChapters() { return chapters; }

  getCurrentChapter() {
    return chapters[GameState.storyProgress.chapter - 1] || null;
  }

  getActiveMission() {
    const ch = this.getCurrentChapter();
    if (!ch) return null;
    for (const m of ch.missions) {
      if (!GameState.storyProgress.completedMissions.includes(m.id)) return m;
    }
    return null;
  }

  isMissionCompleted(id) {
    return GameState.storyProgress.completedMissions.includes(id);
  }

  checkMissions(time) {
    if (time - this._lastCheck < 2000) return;
    this._lastCheck = time;

    const ch = this.getCurrentChapter();
    if (!ch) return;

    for (const mission of ch.missions) {
      if (GameState.storyProgress.completedMissions.includes(mission.id)) continue;
      // This is the next active mission
      if (mission.check()) {
        this._completeMission(mission);
      }
      break; // Only check one active mission
    }
  }

  _completeMission(mission) {
    GameState.storyProgress.completedMissions.push(mission.id);
    mission.reward();
    GameState.emit('mission-completed', mission);

    // Check if chapter complete
    const ch = this.getCurrentChapter();
    if (ch && ch.missions.every(m => GameState.storyProgress.completedMissions.includes(m.id))) {
      ch.reward();
      GameState.storyProgress.chapter++;
      GameState.emit('chapter-completed', ch);

      // Auto-trigger next chapter's first mission if applicable
      const next = this.getCurrentChapter();
      if (next && next.missions[0]?.autoTrigger) {
        next.missions[0].autoTrigger();
      }
    }
  }

  fundRescue() {
    if (!GameState.storyProgress.completedMissions.includes('4.4')) return false;
    if (Economy.spendCoins(75)) {
      GameState.storyProgress.flags.rescueFunded = true;
      return true;
    }
    return false;
  }
}

export const Story = new StorySystem();
