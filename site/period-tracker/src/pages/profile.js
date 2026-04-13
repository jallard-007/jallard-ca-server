import { getUser, saveUser, clearUser, escapeHtml } from '../state.js';
import { navigate } from '../router.js';

export function renderProfile(app) {
    const user = getUser();

    app.innerHTML = `
        <div class="profile-page">
            <header class="top-bar">
                <button class="icon-btn back-btn" id="back-btn" title="Back" aria-label="Back">
                    <span>←</span>
                </button>
                <h1 class="top-bar-title">Profile</h1>
                <div style="width:40px"></div>
            </header>

            <div class="profile-avatar-wrap">
                <div class="profile-avatar">${escapeHtml((user?.name || '?')[0].toUpperCase())}</div>
                <p class="profile-email">${escapeHtml(user?.email || '')}</p>
            </div>

            <form id="profile-form" class="profile-form" novalidate>
                <h2 class="profile-section-title">Personal information</h2>

                <div class="field-group">
                    <label for="p-name">Display name</label>
                    <input id="p-name" type="text" value="${escapeHtml(user?.name || '')}" placeholder="Your name" required>
                </div>
                <div class="field-group">
                    <label for="p-birthday">Birthday</label>
                    <input id="p-birthday" type="date" value="${escapeHtml(user?.birthday || '')}" required>
                    <small class="field-hint">Used to estimate your cycle phase.</small>
                </div>

                <h2 class="profile-section-title">Security</h2>
                <div class="field-group">
                    <label for="p-password">New password</label>
                    <input id="p-password" type="password" placeholder="Leave blank to keep current" autocomplete="new-password">
                </div>
                <div class="field-group">
                    <label for="p-confirm">Confirm password</label>
                    <input id="p-confirm" type="password" placeholder="Repeat new password" autocomplete="new-password">
                </div>

                <div id="profile-error" class="form-error hidden"></div>
                <div id="profile-success" class="form-success hidden">Changes saved!</div>

                <button type="submit" class="btn btn-primary btn-full">Save changes</button>
            </form>

            <div class="profile-danger-zone">
                <button id="logout-btn" class="btn btn-outline btn-full">Sign out</button>
            </div>
        </div>
    `;

    document.getElementById('back-btn').addEventListener('click', () => navigate('home'));

    document.getElementById('logout-btn').addEventListener('click', () => {
        clearUser();
        navigate('login');
    });

    document.getElementById('profile-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('p-name').value.trim();
        const birthday = document.getElementById('p-birthday').value;
        const password = document.getElementById('p-password').value;
        const confirm = document.getElementById('p-confirm').value;
        const errorEl = document.getElementById('profile-error');
        const successEl = document.getElementById('profile-success');

        errorEl.classList.add('hidden');
        successEl.classList.add('hidden');

        if (!name) {
            errorEl.textContent = 'Name cannot be empty.';
            errorEl.classList.remove('hidden');
            return;
        }
        if (!birthday) {
            errorEl.textContent = 'Birthday is required.';
            errorEl.classList.remove('hidden');
            return;
        }
        if (password && password !== confirm) {
            errorEl.textContent = 'Passwords do not match.';
            errorEl.classList.remove('hidden');
            return;
        }

        const updates = { name, birthday };
        if (password) updates.passwordHint = '(set)'; // Placeholder until PocketBase auth
        saveUser(updates);

        successEl.classList.remove('hidden');
        setTimeout(() => successEl.classList.add('hidden'), 3000);
    });
}
