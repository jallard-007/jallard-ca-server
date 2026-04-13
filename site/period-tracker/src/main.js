import { initRouter, registerRoutes } from './router.js';
import { renderLogin } from './pages/login.js';
import { renderSetup } from './pages/setup.js';
import { renderHome } from './pages/home.js';
import { renderProfile } from './pages/profile.js';

const app = document.getElementById('app');

registerRoutes({
    login: () => renderLogin(app),
    setup: () => renderSetup(app),
    home: () => renderHome(app),
    profile: () => renderProfile(app),
});

initRouter();
