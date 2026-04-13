import { useState, useEffect } from 'react';
import { getUser } from './state.js';
import Login from './pages/Login.jsx';
import Setup from './pages/Setup.jsx';
import Home from './pages/Home.jsx';
import Profile from './pages/Profile.jsx';

const VALID_ROUTES = ['login', 'setup', 'home', 'profile'];

function resolveRoute(raw, user) {
    const route = VALID_ROUTES.includes(raw) ? raw : 'login';
    if (!user && route !== 'login') return 'login';
    if (user && (!user.name || !user.birthday) && route !== 'setup') return 'setup';
    return route;
}

export function navigate(route) {
    window.location.hash = route;
}

export default function App() {
    const [raw, setRaw] = useState(() => window.location.hash.replace('#', ''));

    useEffect(() => {
        const handler = () => setRaw(window.location.hash.replace('#', ''));
        window.addEventListener('hashchange', handler);
        return () => window.removeEventListener('hashchange', handler);
    }, []);

    const user = getUser();
    const route = resolveRoute(raw, user);

    // Sync URL if guard redirected
    useEffect(() => {
        if (route !== raw) window.location.hash = route;
    }, [route, raw]);

    switch (route) {
        case 'login':   return <Login />;
        case 'setup':   return <Setup />;
        case 'home':    return <Home />;
        case 'profile': return <Profile />;
        default:        return <Login />;
    }
}
