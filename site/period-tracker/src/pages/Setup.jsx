import { useState } from 'react';
import { getUser, updateProfile, clearUser } from '../state.js';
import { navigate } from '../App.jsx';
import { ErrorMsg } from '../components/Feedback.jsx';

export default function Setup() {
    const existing = getUser();
    const [name, setName] = useState(existing?.name || '');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!name.trim()) { setError('Please enter your name.'); return; }
        setError('');
        setLoading(true);
        try {
            await updateProfile({ name: name.trim() });
            navigate('/');
        } catch (err) {
            const status = err?.status;
            if (status === 404 || status === 401 || status === 403) {
                clearUser();
                navigate('/login');
                return;
            }
            const msg = err?.response?.data?.message || err?.message || 'Save failed.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-dvh flex items-center justify-center p-6 bg-gradient-to-br from-pink-100 via-rose-50 to-orange-50">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-10">
                <div className="text-5xl text-center mb-3">✨</div>
                <h1 className="font-display text-3xl text-center text-gray-900 mb-1">Welcome!</h1>
                <p className="text-center text-gray-400 text-sm mb-8">Let's get to know you a little</p>

                <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="setup-name" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Your name</label>
                        <input
                            id="setup-name"
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g. Alex"
                            autoComplete="given-name"
                            required
                            className="input"
                        />
                    </div>

                    <ErrorMsg>{error}</ErrorMsg>

                    <button type="submit" disabled={loading} className="btn-primary disabled:opacity-60">
                        {loading ? 'Saving…' : "Let's go 🌸"}
                    </button>
                </form>
            </div>
        </div>
    );
}
