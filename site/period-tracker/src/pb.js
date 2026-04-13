import PocketBase from 'pocketbase';

// In production the frontend and API share the same origin so a
// path-only URL works. During Vite dev, set VITE_POCKETBASE_URL
// (e.g. http://localhost:8080/api/period-tracker) or rely on the
// Vite server.proxy configured in vite.config.js.
const pb = new PocketBase(
    import.meta.env.VITE_POCKETBASE_URL || '/api/period-tracker',
);

export default pb;
