import { saveUser } from '../state.js';
import { navigate } from '../router.js';

export function renderLogin(app) {
    app.innerHTML = `
        <div class="auth-page">
            <div class="auth-card">
                <div class="auth-logo">🌸</div>
                <h1 class="auth-title">Period Tracker</h1>
                <p class="auth-subtitle">Your personal cycle companion</p>
                <form id="login-form" class="auth-form" novalidate>
                    <div class="field-group">
                        <label for="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="hello@example.com"
                            autocomplete="email"
                            required
                        >
                    </div>
                    <div class="field-group">
                        <label for="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            autocomplete="current-password"
                            required
                        >
                    </div>
                    <div id="login-error" class="form-error hidden"></div>
                    <button type="submit" class="btn btn-primary btn-full">Sign in</button>
                </form>
                <p class="auth-footnote">New here? Just sign in and we'll get you set up.</p>
            </div>
        </div>
    `;

    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const errorEl = document.getElementById('login-error');

        if (!email || !password) {
            errorEl.textContent = 'Please enter your email and password.';
            errorEl.classList.remove('hidden');
            return;
        }

        errorEl.classList.add('hidden');
        // Save a stub session – authentication will be handled by PocketBase later
        saveUser({ email, loggedIn: true });
        navigate('setup');
    });
}
