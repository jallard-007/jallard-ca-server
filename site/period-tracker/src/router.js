import { getUser } from './state.js';

const VALID_ROUTES = ['login', 'setup', 'home', 'profile'];

const routes = new Map(VALID_ROUTES.map(r => [r, null]));

let currentRoute = null;

export function registerRoutes(handlers) {
    for (const key of VALID_ROUTES) {
        if (handlers[key]) routes.set(key, handlers[key]);
    }
}

export function navigate(route) {
    window.location.hash = route;
}

function resolve() {
    const raw = window.location.hash.replace('#', '');
    const hash = VALID_ROUTES.includes(raw) ? raw : 'login';
    const user = getUser();

    // Guard: no user → login
    if (!user && hash !== 'login') {
        window.location.hash = 'login';
        return;
    }
    // Guard: user exists but setup incomplete → setup
    if (user && !user.name && hash !== 'setup') {
        window.location.hash = 'setup';
        return;
    }

    const handler = routes.get(hash);
    if (handler && hash !== currentRoute) {
        currentRoute = hash;
        handler();
    } else if (!handler) {
        window.location.hash = user ? (user.name ? 'home' : 'setup') : 'login';
    }
}

export function initRouter() {
    window.addEventListener('hashchange', resolve);
    resolve();
}
