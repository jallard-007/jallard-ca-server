import { useState, useEffect, useRef } from 'react';
import { getUser, saveUser, clearUser, getCycleDay, getPhaseForDay, PHASES, updateProfile, changePassword } from '../state.js';
import { navigate } from '../App.jsx';

export default function Profile() {
    const user = getUser();
    const [name, setName] = useState(user?.name || '');
    const [birthday, setBirthday] = useState(user?.birthday || '');
    const [oldPassword, setOldPassword] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const successTimerRef = useRef(null);

    // Clear pending timer when component unmounts to avoid state update on
    // an unmounted component.
    useEffect(() => () => {
        if (successTimerRef.current) clearTimeout(successTimerRef.current);
    }, []);

    const initial = (user?.name || '?')[0].toUpperCase();

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setSuccess(false);

        if (!name.trim()) { setError('Name cannot be empty.'); return; }
        if (!birthday)    { setError('Birthday is required.'); return; }
        if (!getCycleDay(birthday)) {
            setError('Birthday must be a valid date that is not in the future.');
            return;
        }
        if (password && password.length < 8) { setError('New password must be at least 8 characters.'); return; }
        if (password && password !== confirm) { setError('Passwords do not match.'); return; }
        if (password && !oldPassword) { setError('Please enter your current password to change it.'); return; }

        setLoading(true);
        try {
            await updateProfile({ name: name.trim(), birthday });

            if (password) {
                try {
                    await changePassword(oldPassword, password);
                    setOldPassword('');
                    setPassword('');
                    setConfirm('');
                } catch (pwErr) {
                    const msg = pwErr?.response?.data?.message || pwErr?.message || 'Password change failed.';
                    setError('Profile saved, but password change failed: ' + msg);
                    return;
                }
            }

            setSuccess(true);
            if (successTimerRef.current) clearTimeout(successTimerRef.current);
            successTimerRef.current = setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || 'Save failed.';
            setError(msg);
            // Still save locally as fallback
            saveUser({ name: name.trim(), birthday });
        } finally {
            setLoading(false);
        }
    }

    // Derive phase color from cycle state (works even if Home hasn't mounted)
    const cycleDay = user ? getCycleDay(user.birthday) : null;
    const phaseColor = cycleDay ? getPhaseForDay(cycleDay).phase.color : PHASES[0].color;

    return (
        <div className="min-h-dvh bg-gray-50">
            {/* Top bar */}
            <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3.5 bg-white border-b border-gray-100 shadow-sm max-w-lg mx-auto">
                <button
                    onClick={() => navigate('home')}
                    aria-label="Back"
                    className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors text-lg"
                >←</button>
                <h1 className="text-base font-bold text-gray-900">Profile</h1>
                <div className="w-9" />
            </header>

            <div className="max-w-lg mx-auto pb-10">
                {/* Avatar */}
                <div className="flex flex-col items-center pt-8 pb-6 gap-2">
                    <div
                        className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg"
                        style={{ background: phaseColor }}
                    >
                        {initial}
                    </div>
                    <p className="text-sm text-gray-400">{user?.email || ''}</p>
                </div>

                <form onSubmit={handleSubmit} noValidate className="px-4 flex flex-col gap-0">
                    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Personal information</h2>

                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
                        <ProfileField
                            label="Display name"
                            htmlFor="p-name"
                            border
                        >
                            <input
                                id="p-name"
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Your name"
                                required
                                className="input-inline"
                            />
                        </ProfileField>
                        <ProfileField label="Birthday" htmlFor="p-birthday">
                            <input
                                id="p-birthday"
                                type="date"
                                value={birthday}
                                onChange={e => setBirthday(e.target.value)}
                                required
                                className="input-inline"
                            />
                        </ProfileField>
                    </div>

                    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Security</h2>

                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
                        <ProfileField label="Current password" htmlFor="p-old-password" border>
                            <input
                                id="p-old-password"
                                type="password"
                                value={oldPassword}
                                onChange={e => setOldPassword(e.target.value)}
                                placeholder="Required to change password"
                                autoComplete="current-password"
                                className="input-inline"
                            />
                        </ProfileField>
                        <ProfileField label="New password" htmlFor="p-password" border>
                            <input
                                id="p-password"
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Leave blank to keep current"
                                autoComplete="new-password"
                                className="input-inline"
                            />
                        </ProfileField>
                        <ProfileField label="Confirm password" htmlFor="p-confirm">
                            <input
                                id="p-confirm"
                                type="password"
                                value={confirm}
                                onChange={e => setConfirm(e.target.value)}
                                placeholder="Repeat new password"
                                autoComplete="new-password"
                                className="input-inline"
                            />
                        </ProfileField>
                    </div>

                    {error && (
                        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-4">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm mb-4">
                            Changes saved!
                        </div>
                    )}

                    <button type="submit" disabled={loading} className="btn-primary disabled:opacity-60">
                        {loading ? 'Saving…' : 'Save changes'}
                    </button>
                </form>

                <div className="px-4 mt-4">
                    <button
                        onClick={() => { clearUser(); navigate('login'); }}
                        className="w-full py-3 rounded-xl border-2 border-gray-200 text-gray-500 font-semibold text-sm hover:bg-gray-100 transition-colors"
                    >
                        Sign out
                    </button>
                </div>
            </div>
        </div>
    );
}

function ProfileField({ label, htmlFor, children, border }) {
    return (
        <div className={`flex items-center px-4 py-3 gap-3 ${border ? 'border-b border-gray-100' : ''}`}>
            <label htmlFor={htmlFor} className="text-sm text-gray-500 w-32 shrink-0">{label}</label>
            {children}
        </div>
    );
}
