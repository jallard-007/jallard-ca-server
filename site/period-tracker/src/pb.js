import PocketBase from 'pocketbase';

// Base URL for the period-tracker PocketBase API.
// In production the frontend and API share the same origin,
// so a path-only URL works.
const pb = new PocketBase('/api/period-tracker');

export default pb;
