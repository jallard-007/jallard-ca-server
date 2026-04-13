// ── Phase definitions ──────────────────────────────────────────────────────────

export const PHASES = [
    {
        id: 'menstrual',
        label: 'Menstrual',
        days: 5,
        color: '#c0392b',
        colorLight: '#f9e0de',
        emoji: '🌑',
        summary: 'Your body sheds the uterine lining. Rest and gentle movement are best.',
        details: 'Hormone levels are at their lowest. You may feel tired or crampy — this is completely normal. Focus on nourishing your body and resting.',
        selfCare: [
            'Rest and take it easy — your body is working hard',
            'Stay hydrated with warm teas and broths',
            'Eat iron-rich foods: leafy greens, legumes, red meat',
            'Light stretching or restorative yoga can ease cramps',
            'Use a heating pad for lower back or abdominal pain',
        ],
    },
    {
        id: 'follicular',
        label: 'Follicular',
        days: 8,
        color: '#e91e8c',
        colorLight: '#fce4f5',
        emoji: '🌒',
        summary: 'Estrogen rises and follicles develop. Energy and mood begin to lift.',
        details: 'Your body is preparing to ovulate. You may feel more creative, social, and optimistic. A great time to start new projects or routines.',
        selfCare: [
            'Lean into your rising energy — start new projects',
            'Try cardio or higher-intensity workouts',
            'Focus on protein and probiotic-rich foods',
            'Social activities feel easier and more rewarding now',
            'Explore creative pursuits — writing, art, music',
        ],
    },
    {
        id: 'ovulation',
        label: 'Ovulation',
        days: 3,
        color: '#e67e22',
        colorLight: '#fef3e2',
        emoji: '🌕',
        summary: 'Peak estrogen triggers egg release. You are at your most energetic.',
        details: 'Luteinising hormone surges and an egg is released. You may feel confident, communicative, and full of energy. Your body temperature rises slightly.',
        selfCare: [
            'Peak energy — great for high-intensity workouts',
            'Lean into social connection and collaboration',
            'Eat light, fresh, and anti-inflammatory foods',
            'This is your most communicative phase — schedule important talks',
            'Stay cool and hydrated as body temperature is slightly elevated',
        ],
    },
    {
        id: 'luteal',
        label: 'Luteal',
        days: 12,
        color: '#8e44ad',
        colorLight: '#f3e5f5',
        emoji: '🌘',
        summary: 'Progesterone rises then falls. Energy slows and you may feel more inward.',
        details: 'If fertilisation did not occur, progesterone drops towards the end of this phase. PMS symptoms like bloating, mood changes, and fatigue may appear in the last few days.',
        selfCare: [
            'Honour your need to slow down — gentle walks or swimming',
            'Eat magnesium-rich foods: dark chocolate, nuts, seeds',
            'Prioritise quality sleep — your body needs it',
            'Journalling and reflection come naturally now',
            'Reduce caffeine and alcohol to ease PMS symptoms',
        ],
    },
];

export const CYCLE_LENGTH = PHASES.reduce((sum, p) => sum + p.days, 0); // 28

// ── HTML escaping ──────────────────────────────────────────────────────────────

export function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ── User state ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'pt_user';

export function getUser() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function saveUser(data) {
    const existing = getUser() || {};
    const updated = { ...existing, ...data };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
}

export function clearUser() {
    localStorage.removeItem(STORAGE_KEY);
}

// ── Phase calculation ──────────────────────────────────────────────────────────

/**
 * Returns the 1-based cycle day (1–28) for today, derived from the user's
 * birthday. Returns null for missing, invalid, or future birthdays.
 */
export function getCycleDay(birthday) {
    const birth = new Date(birthday);
    if (Number.isNaN(birth.getTime())) {
        return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    birth.setHours(0, 0, 0, 0);

    if (birth > today) {
        return null;
    }

    const msPerDay = 86400000;
    const daysSinceBirth = Math.floor((today - birth) / msPerDay);
    // Use double-modulo to handle any negative remainder in JS
    const cycleDay = ((daysSinceBirth % CYCLE_LENGTH) + CYCLE_LENGTH) % CYCLE_LENGTH + 1;
    return cycleDay;
}

/**
 * Returns the phase object and number of days into that phase for a given
 * 1-based cycle day.
 */
export function getPhaseForDay(cycleDay) {
    let dayCount = 0;
    for (const phase of PHASES) {
        if (cycleDay <= dayCount + phase.days) {
            return { phase, dayInPhase: cycleDay - dayCount };
        }
        dayCount += phase.days;
    }
    // Fallback (shouldn't happen with valid input)
    return { phase: PHASES[0], dayInPhase: 1 };
}
