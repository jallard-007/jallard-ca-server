import { useState } from 'react';
import { login, register } from '../state.js';
import { navigate } from '../App.jsx';
import { ErrorMsg } from '../components/Feedback.jsx';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [isRegister, setIsRegister] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!email || !password) {
            setError('Please enter your email and password.');
            return;
        }
        if (isRegister && password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }
        if (isRegister && password !== confirm) {
            setError('Passwords do not match.');
            return;
        }
        setError('');
        setLoading(true);
        try {
            if (isRegister) {
                await register(email, password);
                navigate('/setup');
            } else {
                const user = await login(email, password);
                if (user.name) {
                    navigate('/');
                } else {
                    navigate('/setup');
                }
            }
        } catch (err) {
            const msg = err?.response?.data?.message
                || err?.message
                || 'Something went wrong. Please try again.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-dvh flex items-center justify-center p-6 bg-gradient-to-br from-pink-100 via-rose-50 to-orange-50">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-10">
                <div className="text-5xl text-center mb-3">🌸</div>
                <h1 className="font-display text-3xl text-center text-gray-900 mb-1">Period Tracker</h1>
                <p className="text-center text-gray-400 text-sm mb-8">Your personal cycle companion</p>

                <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                    <Field label="Email" htmlFor="login-email">
                        <input
                            id="login-email"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="hello@example.com"
                            autoComplete="email"
                            required
                            className="input"
                        />
                    </Field>
                    <Field label="Password" htmlFor="login-password">
                        <input
                            id="login-password"
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            autoComplete={isRegister ? 'new-password' : 'current-password'}
                            required
                            className="input"
                        />
                    </Field>
                    {isRegister && (
                        <Field label="Confirm password" htmlFor="login-confirm">
                            <input
                                id="login-confirm"
                                type="password"
                                value={confirm}
                                onChange={e => setConfirm(e.target.value)}
                                placeholder="••••••••"
                                autoComplete="new-password"
                                required
                                className="input"
                            />
                        </Field>
                    )}

                    {error && <ErrorMsg>{error}</ErrorMsg>}

                    <button type="submit" disabled={loading} className="btn-primary disabled:opacity-60">
                        {loading ? 'Please wait…' : (isRegister ? 'Create account' : 'Sign in')}
                    </button>
                </form>

                <p className="text-center text-xs text-gray-400 mt-5">
                    {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
                    <button
                        type="button"
                        onClick={() => { setIsRegister(!isRegister); setError(''); setConfirm(''); }}
                        className="text-pink-500 hover:text-pink-600 font-semibold cursor-pointer"
                    >
                        {isRegister ? 'Sign in' : 'Create one'}
                    </button>
                </p>
            </div>
        </div>
    );
}

function Field({ label, htmlFor, children }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label htmlFor={htmlFor} className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</label>
            {children}
        </div>
    );
}
