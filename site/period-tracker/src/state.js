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
// Retained for future non-JSX rendering (e.g. PocketBase email templates,
// server-rendered HTML). React JSX auto-escapes text content; call this
// only when inserting user data into raw HTML strings.
export function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/`/g, '&#96;');
}

// ── User state (PocketBase auth store only — no localStorage) ──────────────────

import pb from './pb.js';

/**
 * Returns the current user from PocketBase auth store, or null.
 * Shape: { email, name, birthday, loggedIn }
 */
export function getUser() {
    if (pb.authStore.isValid && pb.authStore.record) {
        const r = pb.authStore.record;
        return {
            email: r.email || '',
            name: r.name || '',
            birthday: r.birthday || '',
            loggedIn: true,
        };
    }
    return null;
}

export function clearUser() {
    pb.authStore.clear();
}

// ── PocketBase auth helpers ────────────────────────────────────────────────────

/**
 * Register a new user with email/password.
 * Returns the authenticated record after auto-login.
 * Throws on failure.
 */
export async function register(email, password) {
    await pb.collection('users').create({
        email,
        password,
        passwordConfirm: password,
    });

    // Auto-login after registration
    const result = await pb.collection('users').authWithPassword(email, password);
    return result.record;
}

/**
 * Login with email/password. Returns the auth record.
 * Throws on failure.
 */
export async function login(email, password) {
    const result = await pb.collection('users').authWithPassword(email, password);
    return result.record;
}

/**
 * Update the authenticated user's profile fields.
 * Throws on failure.
 */
export async function updateProfile(data) {
    if (!pb.authStore.isValid || !pb.authStore.record) {
        throw new Error('Not authenticated');
    }
    const id = pb.authStore.record.id;
    const updated = await pb.collection('users').update(id, data);
    // Refresh local auth store record with latest data
    pb.authStore.record.name = updated.name || '';
    pb.authStore.record.birthday = updated.birthday || '';
    return updated;
}

/**
 * Change the authenticated user's password.
 * Requires oldPassword and newPassword.
 */
export async function changePassword(oldPassword, newPassword) {
    if (!pb.authStore.isValid || !pb.authStore.record) {
        throw new Error('Not authenticated');
    }
    const id = pb.authStore.record.id;
    await pb.collection('users').update(id, {
        oldPassword,
        password: newPassword,
        passwordConfirm: newPassword,
    });
}

// ── Phase calculation ──────────────────────────────────────────────────────────

/**
 * Returns the 1-based cycle day (1–28) for today, derived from the user's
 * birthday. Returns null for missing, invalid, or future birthdays.
 */
export function getCycleDay(birthday) {
    if (!birthday || typeof birthday !== 'string') return null;
    // Parse YYYY-MM-DD as local midnight (no suffix = UTC in V8, so append
    // T00:00:00 to force local-time interpretation and avoid off-by-one in
    // timezones behind UTC).
    const localStr = /^\d{4}-\d{2}-\d{2}$/.test(birthday)
        ? birthday + 'T00:00:00'
        : birthday;
    const birth = new Date(localStr);
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
    // daysSinceBirth is always ≥ 0 here (future birthday guarded above)
    const cycleDay = (daysSinceBirth % CYCLE_LENGTH) + 1;
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
