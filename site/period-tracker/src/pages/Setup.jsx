import { useState } from 'react';
import { saveUser, getUser } from '../state.js';
import { navigate } from '../App.jsx';

export default function Setup() {
    const existing = getUser();
    const [name, setName] = useState(existing?.name || '');
    const [birthday, setBirthday] = useState(existing?.birthday || '');
    const [error, setError] = useState('');

    function handleSubmit(e) {
        e.preventDefault();
        if (!name.trim()) { setError('Please enter your name.'); return; }
        if (!birthday)    { setError('Please enter your birthday.'); return; }
        setError('');
        saveUser({ name: name.trim(), birthday });
        navigate('home');
    }

    return (
        <div className="min-h-dvh flex items-center justify-center p-6 bg-gradient-to-br from-pink-100 via-rose-50 to-orange-50">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-10">
                <div className="text-5xl text-center mb-3">✨</div>
                <h1 className="font-display text-3xl text-center text-gray-900 mb-1">Welcome!</h1>
                <p className="text-center text-gray-400 text-sm mb-8">Let's get to know you a little</p>

                <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Your name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g. Alex"
                            autoComplete="given-name"
                            required
                            className="input"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Birthday</label>
                        <input
                            type="date"
                            value={birthday}
                            onChange={e => setBirthday(e.target.value)}
                            required
                            className="input"
                        />
                        <span className="text-xs text-gray-400">Used to estimate your current cycle phase.</span>
                    </div>

                    {error && (
                        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    <button type="submit" className="btn-primary">Let's go 🌸</button>
                </form>
            </div>
        </div>
    );
}
