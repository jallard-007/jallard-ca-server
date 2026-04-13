import { useState, useEffect } from 'react';
import pb from './pb.js';
import { getUser } from './state.js';
import Login from './pages/Login.jsx';
import Setup from './pages/Setup.jsx';
import Home from './pages/Home.jsx';
import Profile from './pages/Profile.jsx';

const BASE = '/period-tracker';

function getPath() {
    const p = window.location.pathname;
    const rel = p.startsWith(BASE) ? p.slice(BASE.length) : '/';
    return rel || '/';
}

const ROUTES = ['/', '/login', '/setup', '/profile'];

function resolveRoute(path, user) {
    const route = ROUTES.includes(path) ? path : '/';
    // /login always accessible
    if (route === '/login') return '/login';
    const isLoggedIn = Boolean(user?.loggedIn);
    if (!isLoggedIn) return '/login';
    if (!user.name && route !== '/setup') return '/setup';
    return route;
}

export function navigate(path) {
    window.history.pushState(null, '', BASE + path);
    window.dispatchEvent(new PopStateEvent('popstate'));
}

export default function App() {
    const [path, setPath] = useState(getPath);
    const [, setAuthVersion] = useState(0);
    const [validating, setValidating] = useState(
        () => pb.authStore.isValid && getPath() !== '/login'
    );

    // Re-render whenever auth store changes (login, logout, profile update)
    useEffect(() => pb.authStore.onChange(() => setAuthVersion(v => v + 1)), []);

    // Validate stored auth on mount — skip on explicit /login
    useEffect(() => {
        if (!pb.authStore.isValid || getPath() === '/login') {
            setValidating(false);
            return;
        }
        pb.collection('users').authRefresh()
            .catch(() => {
                console.warn('[App] stored auth invalid, clearing');
                pb.authStore.clear();
            })
            .finally(() => setValidating(false));
    }, []);

    useEffect(() => {
        const handler = () => setPath(getPath());
        window.addEventListener('popstate', handler);
        return () => window.removeEventListener('popstate', handler);
    }, []);

    const user = getUser();
    const route = validating ? null : resolveRoute(path, user);

    // Sync URL if guard redirected
    useEffect(() => {
        if (!route) return;
        const current = getPath();
        if (route !== current) {
            window.history.replaceState(null, '', BASE + route);
            setPath(route);
        }
    }, [route, path]);

    if (validating) return null;

    switch (route) {
        case '/login':   return <Login />;
        case '/setup':   return <Setup />;
        case '/':        return <Home />;
        case '/profile': return <Profile />;
        default:         return <Login />;
    }
}
