// ========================================================
// Utility functions
// ========================================================

export function random(min, max) {
    return Math.random() * (max - min) + min;
}

export function randomInt(min, max) {
    return Math.floor(random(min, max + 1));
}

export function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

export function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

export function lerp(a, b, t) {
    return a + (b - a) * t;
}

export function distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

export function el(tag, classes = '', parent = null) {
    const elem = document.createElement(tag);
    if (classes) elem.className = classes;
    if (parent) parent.appendChild(elem);
    return elem;
}
