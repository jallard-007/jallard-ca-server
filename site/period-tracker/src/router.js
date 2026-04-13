import { getUser } from './state.js';

const routes = {
    login: null,
    setup: null,
    home: null,
    profile: null,
};

let currentRoute = null;

export function registerRoutes(handlers) {
    Object.assign(routes, handlers);
}

export function navigate(route) {
    window.location.hash = route;
}

function resolve() {
    const hash = window.location.hash.replace('#', '') || 'login';
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

    const handler = routes[hash];
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
