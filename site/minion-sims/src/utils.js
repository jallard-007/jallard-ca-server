export function uuid() {
  return crypto.randomUUID?.() ??
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randFloat(min, max) {
  return Math.random() * (max - min) + min;
}

export function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function getMoodFromValue(v) {
  if (v <= 20) return 'angry';
  if (v <= 40) return 'sad';
  if (v <= 60) return 'neutral';
  if (v <= 80) return 'happy';
  return 'excited';
}

export function moodValueFor(mood) {
  const map = { angry: 10, sad: 30, neutral: 50, happy: 70, excited: 90 };
  return map[mood] ?? 50;
}

export const BODY_DIMS = {
  tall:   { w: 36, h: 64 },
  medium: { w: 38, h: 52 },
  short:  { w: 42, h: 42 },
};

export const MOOD_EMOJI = {
  happy: '😊', neutral: '😐', sad: '😢', excited: '🤩', angry: '😠',
};

export const TRAITS_LIST = [
  'Musical', 'Clumsy', 'Brave', 'Greedy', 'Silly',
];

export const CLOTHING_ITEMS = {
  // Hats
  'hard-hat':        { slot: 'hat', name: 'Hard Hat', cost: 0, color: 0xFFA500 },
  'crown':           { slot: 'hat', name: 'Crown', cost: 30, color: 0xFFD700 },
  'beanie':          { slot: 'hat', name: 'Beanie', cost: 10, color: 0x4444DD },
  'party-hat':       { slot: 'hat', name: 'Party Hat', cost: 10, color: 0xFF69B4 },
  'pirate-hat':      { slot: 'hat', name: 'Pirate Hat', cost: 25, color: 0x222222 },
  'banana-peel-hat': { slot: 'hat', name: 'Banana Peel Hat', cost: 15, color: 0xFFE135 },
  'black-beanie':    { slot: 'hat', name: 'Black Beanie', cost: 0, color: 0x111111 },
  'top-hat':         { slot: 'hat', name: 'Top Hat', cost: 0, color: 0x222222 },
  // Goggles
  'default-goggles-1': { slot: 'goggles', name: 'Single Goggle', cost: 0, color: 0xAAAAAA },
  'default-goggles-2': { slot: 'goggles', name: 'Double Goggles', cost: 0, color: 0xAAAAAA },
  'aviator-goggles':   { slot: 'goggles', name: 'Aviator Goggles', cost: 20, color: 0x886633 },
  'heart-goggles':     { slot: 'goggles', name: 'Heart Goggles', cost: 15, color: 0xFF1493 },
  'safety-goggles':    { slot: 'goggles', name: 'Safety Goggles', cost: 0, color: 0x44FF44 },
  // Tops
  'overalls':          { slot: 'top', name: 'Overalls', cost: 0, color: 0x4169E1 },
  'hawaiian-shirt':    { slot: 'top', name: 'Hawaiian Shirt', cost: 15, color: 0xFF6347 },
  'tuxedo-jacket':     { slot: 'top', name: 'Tuxedo Jacket', cost: 30, color: 0x111111 },
  'gru-logo-tee':      { slot: 'top', name: 'Gru Logo Tee', cost: 20, color: 0x333333 },
  'maid-top':          { slot: 'top', name: 'Maid Outfit', cost: 25, color: 0x222222 },
  'striped-shirt':     { slot: 'top', name: 'Striped Shirt', cost: 0, color: 0x336633 },
  'lab-coat':          { slot: 'top', name: 'Lab Coat', cost: 0, color: 0xEEEEEE },
  'spy-suit-top':      { slot: 'top', name: 'Spy Suit Top', cost: 0, color: 0x1a1a1a },
  'vector-top':        { slot: 'top', name: "Vector's Top", cost: 0, color: 0xFF6600 },
  // Bottoms
  'overalls-bottom':   { slot: 'bottom', name: 'Overalls', cost: 0, color: 0x4169E1 },
  'shorts':            { slot: 'bottom', name: 'Shorts', cost: 10, color: 0x8B4513 },
  'tutu':              { slot: 'bottom', name: 'Tutu', cost: 20, color: 0xFF69B4 },
  'jeans':             { slot: 'bottom', name: 'Jeans', cost: 10, color: 0x4444AA },
  'kilt':              { slot: 'bottom', name: 'Kilt', cost: 15, color: 0x884422 },
  'spy-suit-bottom':   { slot: 'bottom', name: 'Spy Suit Bottom', cost: 0, color: 0x1a1a1a },
  'vector-bottom':     { slot: 'bottom', name: "Vector's Bottom", cost: 0, color: 0xFF6600 },
  // Shoes
  'boots':             { slot: 'shoes', name: 'Boots', cost: 10, color: 0x8B4513 },
  'sneakers':          { slot: 'shoes', name: 'Sneakers', cost: 10, color: 0xFFFFFF },
  'clown-shoes':       { slot: 'shoes', name: 'Clown Shoes', cost: 20, color: 0xFF0000 },
  'flip-flops':        { slot: 'shoes', name: 'Flip Flops', cost: 5, color: 0x00BFFF },
  'fancy-shoes':       { slot: 'shoes', name: 'Fancy Shoes', cost: 0, color: 0x111111 },
  // Gloves
  'rubber-gloves':     { slot: 'gloves', name: 'Rubber Gloves', cost: 10, color: 0xFFFF00 },
  'boxing-gloves':     { slot: 'gloves', name: 'Boxing Gloves', cost: 15, color: 0xCC0000 },
  'oven-mitts':        { slot: 'gloves', name: 'Oven Mitts', cost: 10, color: 0xFF6600 },
  // Accessories
  'cape':              { slot: 'accessory', name: 'Cape', cost: 20, color: 0xCC0000 },
  'scarf':             { slot: 'accessory', name: 'Scarf', cost: 10, color: 0x336699 },
  'necklace':          { slot: 'accessory', name: 'Necklace', cost: 15, color: 0xFFD700 },
  'bow-tie':           { slot: 'accessory', name: 'Bow Tie', cost: 10, color: 0xCC0000 },
  'teddy-bear':        { slot: 'accessory', name: 'Teddy Bear', cost: 0, color: 0x8B6914 },
  'mask':              { slot: 'accessory', name: 'Mask', cost: 0, color: 0x111111 },
  'shrink-ray':        { slot: 'accessory', name: 'Shrink Ray', cost: 0, color: 0xAA00FF },
  'boom-box':          { slot: 'accessory', name: 'Boom Box', cost: 0, color: 0x555555 },
  'birthday-cake':     { slot: 'accessory', name: 'Birthday Cake', cost: 0, color: 0xFFCCDD },
  'friendship-bracelet': { slot: 'accessory', name: 'Friendship Bracelet', cost: 0, color: 0xFF69B4 },
  'grus-scarf':        { slot: 'accessory', name: "Gru's Scarf", cost: 0, color: 0x333333 },
};

export function getClothingBySlot(slot) {
  return Object.entries(CLOTHING_ITEMS)
    .filter(([, v]) => v.slot === slot)
    .map(([id, v]) => ({ id, ...v }));
}

export const SLOT_ORDER = ['hat', 'goggles', 'top', 'bottom', 'shoes', 'gloves', 'accessory'];
