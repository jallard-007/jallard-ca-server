import { saveUser } from '../state.js';
import { navigate } from '../router.js';

export function renderSetup(app) {
    app.innerHTML = `
        <div class="auth-page">
            <div class="auth-card">
                <div class="auth-logo">✨</div>
                <h1 class="auth-title">Welcome!</h1>
                <p class="auth-subtitle">Let's get to know you a little</p>
                <form id="setup-form" class="auth-form" novalidate>
                    <div class="field-group">
                        <label for="name">Your name</label>
                        <input
                            id="name"
                            type="text"
                            placeholder="e.g. Alex"
                            autocomplete="given-name"
                            required
                        >
                    </div>
                    <div class="field-group">
                        <label for="birthday">Birthday</label>
                        <input
                            id="birthday"
                            type="date"
                            required
                        >
                        <small class="field-hint">Used to estimate your current cycle phase.</small>
                    </div>
                    <div id="setup-error" class="form-error hidden"></div>
                    <button type="submit" class="btn btn-primary btn-full">Let's go 🌸</button>
                </form>
            </div>
        </div>
    `;

    // Pre-fill if data already exists
    const savedName = document.getElementById('name');
    const savedBirthday = document.getElementById('birthday');
    try {
        const user = JSON.parse(localStorage.getItem('pt_user') || '{}');
        if (user.name) savedName.value = user.name;
        if (user.birthday) savedBirthday.value = user.birthday;
    } catch { /* ignore */ }

    document.getElementById('setup-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('name').value.trim();
        const birthday = document.getElementById('birthday').value;
        const errorEl = document.getElementById('setup-error');

        if (!name) {
            errorEl.textContent = 'Please enter your name.';
            errorEl.classList.remove('hidden');
            return;
        }
        if (!birthday) {
            errorEl.textContent = 'Please enter your birthday.';
            errorEl.classList.remove('hidden');
            return;
        }

        errorEl.classList.add('hidden');
        saveUser({ name, birthday });
        navigate('home');
    });
}
