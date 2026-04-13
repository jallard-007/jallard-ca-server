import { CLOTHING_ITEMS } from '../utils.js';

/**
 * Draws clothing bottom on a minion's Graphics context.
 * @param {Phaser.GameObjects.Graphics} g
 * @param {{ w: number, h: number }} dims
 * @param {string} bottomId
 */
export function drawBottom(g, dims, bottomId) {
  const item = CLOTHING_ITEMS[bottomId];
  if (!item) return;
  const bc = item.color;
  g.fillStyle(bc, 0.9);
  g.fillRoundedRect(-dims.w / 2 + 1, 0, dims.w - 2, dims.h / 2, { tl: 0, tr: 0, bl: dims.w / 4, br: dims.w / 4 });

  switch (bottomId) {
    case 'jeans':
      g.lineStyle(1, 0x333366, 0.5);
      g.lineBetween(0, 2, 0, dims.h / 2 - 4);
      g.lineStyle(1, 0x333366, 0.3);
      g.lineBetween(-dims.w / 4 + 2, dims.h / 6, -dims.w / 4 + 6, dims.h / 6);
      g.lineBetween(-dims.w / 4 + 2, dims.h / 6, -dims.w / 4 + 2, dims.h / 6 + 5);
      break;
    case 'shorts':
      g.lineStyle(1.5, 0x664422, 0.4);
      g.lineBetween(-dims.w / 2 + 2, dims.h / 4, dims.w / 2 - 2, dims.h / 4);
      g.lineBetween(0, 2, 0, dims.h / 4);
      break;
    case 'tutu':
      for (let i = 0; i < 6; i++) {
        const tx = -dims.w / 2 + 4 + i * (dims.w - 8) / 5;
        g.fillStyle(0xFF88AA, 0.5);
        g.fillTriangle(tx, dims.h / 4, tx + 5, dims.h / 2 + 2, tx - 5, dims.h / 2 + 2);
      }
      break;
    case 'kilt':
      g.lineStyle(1, 0x663311, 0.5);
      for (let i = -dims.w / 2 + 5; i < dims.w / 2; i += 6) {
        g.lineBetween(i, 2, i, dims.h / 2 - 4);
      }
      g.lineStyle(1, 0xAA6633, 0.4);
      for (let j = 4; j < dims.h / 2; j += 6) {
        g.lineBetween(-dims.w / 2 + 2, j, dims.w / 2 - 2, j);
      }
      break;
    case 'maid-skirt':
      g.fillStyle(0x222222, 0.9);
      g.fillRoundedRect(-dims.w / 2 - 2, 0, dims.w + 4, dims.h / 2, { tl: 0, tr: 0, bl: dims.w / 3, br: dims.w / 3 });
      g.fillStyle(0xFFFFFF, 0.8);
      g.fillRoundedRect(-dims.w / 3, 1, dims.w / 1.5, dims.h / 2 - 2, { tl: 0, tr: 0, bl: dims.w / 4, br: dims.w / 4 });
      g.fillStyle(0xFFFFFF, 0.9);
      g.fillRect(-dims.w / 2, -1, dims.w, 4);
      g.fillStyle(0xFFFFFF, 0.7);
      g.fillTriangle(-dims.w / 2 - 4, 0, -dims.w / 2, -3, -dims.w / 2, 3);
      g.fillTriangle(dims.w / 2 + 4, 0, dims.w / 2, -3, dims.w / 2, 3);
      for (let i = -dims.w / 2; i < dims.w / 2; i += 4) {
        g.fillStyle(0xFFFFFF, 0.5);
        g.fillCircle(i, dims.h / 2 - 1, 2);
      }
      break;
  }
}

/**
 * Draws clothing top on a minion's Graphics context.
 * @param {Phaser.GameObjects.Graphics} g
 * @param {{ w: number, h: number }} dims
 * @param {string} topId
 * @param {number} skinColor
 */
export function drawTop(g, dims, topId, skinColor) {
  const item = CLOTHING_ITEMS[topId];
  if (!item) return;
  const c = item.color;
  g.fillStyle(c, 0.85);
  const ty = -dims.h / 8;
  g.fillRect(-dims.w / 2 + 2, ty, dims.w - 4, dims.h / 3.5);

  switch (topId) {
    case 'overalls': {
      g.fillStyle(skinColor, 1);
      g.fillRect(-dims.w / 2 + 2, ty, dims.w - 4, dims.h / 3.5);
      const bibY = -dims.h / 4 + 21;
      const bibH = dims.h / 2 - bibY;
      g.fillStyle(c, 0.85);
      g.fillRect(-dims.w / 3, bibY, dims.w / 1.5, bibH);
      g.fillStyle(c, 1);
      const strapTop = -dims.h / 10;
      g.beginPath();
      g.moveTo(-dims.w / 3 + 2, bibY);
      g.lineTo(-dims.w / 3 + 6, bibY);
      g.lineTo(-dims.w / 2 + 1, strapTop);
      g.lineTo(-dims.w / 2 - 2, strapTop);
      g.closePath();
      g.fillPath();
      g.beginPath();
      g.moveTo(dims.w / 3 - 6, bibY);
      g.lineTo(dims.w / 3 - 2, bibY);
      g.lineTo(dims.w / 2 + 2, strapTop);
      g.lineTo(dims.w / 2 - 1, strapTop);
      g.closePath();
      g.fillPath();
      g.fillStyle(0xFFFFFF, 0.9);
      g.fillCircle(-dims.w / 4 + 2, bibY + 2, 2.5);
      g.fillCircle(dims.w / 4 - 2, bibY + 2, 2.5);
      g.lineStyle(1, 0x3050A0, 0.6);
      g.strokeRect(-5, bibY + 5, 10, 7);
      break;
    }
    case 'hawaiian-shirt': {
      const flowers = [[0.25, 0.3], [0.6, 0.5], [0.4, 0.7], [0.75, 0.25], [0.15, 0.65]];
      for (const [fx, fy] of flowers) {
        const px = -dims.w / 2 + 3 + fx * (dims.w - 6);
        const py = ty + fy * (dims.h / 3.5);
        g.fillStyle(0xFFFF66, 0.7);
        g.fillCircle(px, py, 2);
        g.fillStyle(0xFFFFFF, 0.5);
        g.fillCircle(px - 1.5, py - 1, 1);
        g.fillCircle(px + 1.5, py - 1, 1);
      }
      g.lineStyle(1.5, 0xCC4030, 0.5);
      g.lineBetween(-3, ty, 0, ty + 6);
      g.lineBetween(3, ty, 0, ty + 6);
      break;
    }
    case 'tuxedo-jacket':
      g.fillStyle(0x222222, 0.9);
      g.fillTriangle(-dims.w / 2 + 3, ty, -2, ty, -dims.w / 4, ty + dims.h / 7);
      g.fillTriangle(dims.w / 2 - 3, ty, 2, ty, dims.w / 4, ty + dims.h / 7);
      g.lineStyle(1, 0x333333, 0.6);
      g.lineBetween(0, ty, 0, ty + dims.h / 3.5);
      g.fillStyle(0xFFD700, 1);
      g.fillCircle(0, ty + dims.h / 7, 1.5);
      g.fillCircle(0, ty + dims.h / 5, 1.5);
      break;
    case 'gru-logo-tee':
      g.lineStyle(2, 0xFFD93D, 0.8);
      g.beginPath();
      g.arc(0, ty + dims.h / 7, 5, 0.3, Math.PI * 2 - 0.3, false);
      g.strokePath();
      g.lineBetween(3, ty + dims.h / 7, 0, ty + dims.h / 7);
      break;
    case 'maid-top':
      g.fillStyle(0xFFFFFF, 0.9);
      g.fillEllipse(-dims.w / 5, ty + 2, dims.w / 3, 6);
      g.fillEllipse(dims.w / 5, ty + 2, dims.w / 3, 6);
      for (let i = -4; i <= 4; i++) {
        g.fillStyle(0xFFFFFF, 0.7);
        g.fillCircle(i * 2.5, ty + 5, 2);
      }
      g.fillStyle(0xFF69B4, 1);
      g.fillTriangle(-6, ty + 5, 0, ty + 2, 0, ty + 8);
      g.fillTriangle(6, ty + 5, 0, ty + 2, 0, ty + 8);
      g.fillCircle(0, ty + 5, 2);
      g.fillStyle(0xFFFFFF, 0.85);
      g.fillRoundedRect(-dims.w / 4, ty + 8, dims.w / 2, dims.h / 4.5, 3);
      g.lineStyle(1, 0xDDDDDD, 0.5);
      for (let i = -dims.w / 4 + 2; i < dims.w / 4; i += 4) {
        g.fillStyle(0xFFFFFF, 0.4);
        g.fillCircle(i, ty + 8 + dims.h / 4.5, 1.5);
      }
      g.fillStyle(0xFFFFFF, 0.3);
      g.fillEllipse(-dims.w / 2 + 4, ty + 3, 8, 6);
      g.fillEllipse(dims.w / 2 - 4, ty + 3, 8, 6);
      break;
    case 'striped-shirt':
      g.lineStyle(2, 0x225522, 0.5);
      for (let sy = ty + 3; sy < ty + dims.h / 3.5; sy += 5) {
        g.lineBetween(-dims.w / 2 + 3, sy, dims.w / 2 - 3, sy);
      }
      break;
    case 'lab-coat':
      g.fillStyle(0xDDDDDD, 1);
      g.fillTriangle(-dims.w / 4, ty - 2, 0, ty + 5, -2, ty);
      g.fillTriangle(dims.w / 4, ty - 2, 0, ty + 5, 2, ty);
      g.lineStyle(1, 0xBBBBBB, 0.7);
      g.strokeRect(-dims.w / 3, ty + 6, 7, 5);
      g.fillStyle(0x3366CC, 1);
      g.fillRect(-dims.w / 3 + 2, ty + 4, 1.5, 4);
      break;
    case 'spy-suit-top':
      g.fillStyle(0x444444, 1);
      g.fillRect(-dims.w / 2 + 2, ty + dims.h / 4.5, dims.w - 4, 3);
      g.fillStyle(0xCCCCCC, 1);
      g.fillRect(-2, ty + dims.h / 4.5 - 0.5, 4, 4);
      g.fillStyle(0x2a2a2a, 1);
      g.fillTriangle(-4, ty, 0, ty + 4, 4, ty);
      break;
    case 'vector-top':
      g.lineStyle(2.5, 0xFFFFFF, 0.7);
      g.lineBetween(-dims.w / 3, ty + 2, 0, ty + dims.h / 5);
      g.lineBetween(dims.w / 3, ty + 2, 0, ty + dims.h / 5);
      g.lineStyle(1, 0xFF8800, 0.4);
      g.lineBetween(-dims.w / 2 + 3, ty, -dims.w / 2 + 3, ty + dims.h / 3.5);
      g.lineBetween(dims.w / 2 - 3, ty, dims.w / 2 - 3, ty + dims.h / 3.5);
      break;
  }
}

/**
 * Draws gloves on a minion's Graphics context.
 */
export function drawGloves(g, dims, glovesId, skinColor) {
  if (glovesId && CLOTHING_ITEMS[glovesId]) {
    const gc = CLOTHING_ITEMS[glovesId].color;
    g.fillStyle(gc, 1);
    switch (glovesId) {
      case 'boxing-gloves':
        g.fillCircle(-dims.w / 2 - 7, 10, 6);
        g.fillCircle(dims.w / 2 + 7, 10, 6);
        g.lineStyle(1, 0x880000, 0.5);
        g.strokeCircle(-dims.w / 2 - 7, 10, 6);
        g.strokeCircle(dims.w / 2 + 7, 10, 6);
        g.fillStyle(0xFFFFFF, 0.6);
        g.fillRect(-dims.w / 2 - 9, 6, 4, 2);
        g.fillRect(dims.w / 2 + 5, 6, 4, 2);
        break;
      case 'oven-mitts':
        g.fillRoundedRect(-dims.w / 2 - 11, 5, 9, 12, 3);
        g.fillRoundedRect(dims.w / 2 + 2, 5, 9, 12, 3);
        g.lineStyle(1, 0xCC5500, 0.4);
        g.lineBetween(-dims.w / 2 - 9, 7, -dims.w / 2 - 4, 7);
        g.lineBetween(dims.w / 2 + 4, 7, dims.w / 2 + 9, 7);
        break;
      case 'rubber-gloves':
        g.fillCircle(-dims.w / 2 - 7, 10, 4.5);
        g.fillCircle(dims.w / 2 + 7, 10, 4.5);
        g.fillStyle(gc, 0.6);
        g.fillRect(-dims.w / 2 - 9, 3, 5, 3);
        g.fillRect(dims.w / 2 + 4, 3, 5, 3);
        break;
      default:
        g.fillCircle(-dims.w / 2 - 7, 10, 4);
        g.fillCircle(dims.w / 2 + 7, 10, 4);
    }
  } else {
    g.fillStyle(skinColor, 1);
    g.fillCircle(-dims.w / 2 - 7, 10, 3);
    g.fillCircle(dims.w / 2 + 7, 10, 3);
  }
}

/**
 * Draws shoes on a minion's Graphics context.
 */
export function drawShoes(g, dims, shoesId) {
  if (shoesId && CLOTHING_ITEMS[shoesId]) {
    const sc = CLOTHING_ITEMS[shoesId].color;
    g.fillStyle(sc, 1);
    switch (shoesId) {
      case 'boots':
        g.fillRoundedRect(-14, dims.h / 2 - 2, 12, 8, 2);
        g.fillRoundedRect(2, dims.h / 2 - 2, 12, 8, 2);
        g.lineStyle(1, 0x663311, 0.5);
        g.lineBetween(-12, dims.h / 2, -4, dims.h / 2);
        g.lineBetween(4, dims.h / 2, 12, dims.h / 2);
        break;
      case 'sneakers':
        g.fillEllipse(-7, dims.h / 2 + 3, 15, 7);
        g.fillEllipse(7, dims.h / 2 + 3, 15, 7);
        g.lineStyle(1.5, 0xCCCCCC, 0.5);
        g.lineBetween(-12, dims.h / 2 + 3, -3, dims.h / 2 + 1);
        g.lineBetween(2, dims.h / 2 + 3, 11, dims.h / 2 + 1);
        g.fillStyle(0xCCCCCC, 0.8);
        g.fillCircle(-7, dims.h / 2 + 1, 1);
        g.fillCircle(7, dims.h / 2 + 1, 1);
        break;
      case 'clown-shoes':
        g.fillEllipse(-7, dims.h / 2 + 3, 20, 8);
        g.fillEllipse(7, dims.h / 2 + 3, 20, 8);
        g.fillStyle(0xFFFF00, 1);
        g.fillCircle(-16, dims.h / 2 + 2, 3);
        g.fillCircle(16, dims.h / 2 + 2, 3);
        break;
      case 'flip-flops':
        g.fillEllipse(-7, dims.h / 2 + 3, 12, 6);
        g.fillEllipse(7, dims.h / 2 + 3, 12, 6);
        g.lineStyle(1.5, 0x0088CC, 0.7);
        g.lineBetween(-9, dims.h / 2, -7, dims.h / 2 + 3);
        g.lineBetween(-5, dims.h / 2, -7, dims.h / 2 + 3);
        g.lineBetween(5, dims.h / 2, 7, dims.h / 2 + 3);
        g.lineBetween(9, dims.h / 2, 7, dims.h / 2 + 3);
        break;
      case 'fancy-shoes':
        g.fillEllipse(-7, dims.h / 2 + 3, 14, 6);
        g.fillEllipse(7, dims.h / 2 + 3, 14, 6);
        g.fillStyle(0xFFD700, 1);
        g.fillRect(-9, dims.h / 2 + 1, 3, 3);
        g.fillRect(6, dims.h / 2 + 1, 3, 3);
        break;
      case 'maid-shoes':
        g.fillEllipse(-7, dims.h / 2 + 3, 13, 6);
        g.fillEllipse(7, dims.h / 2 + 3, 13, 6);
        g.lineStyle(1.5, 0x222222, 0.8);
        g.lineBetween(-11, dims.h / 2 + 1, -3, dims.h / 2 + 1);
        g.lineBetween(3, dims.h / 2 + 1, 11, dims.h / 2 + 1);
        g.fillStyle(0xFFFFFF, 0.9);
        g.fillCircle(-6, dims.h / 2 + 1, 1.5);
        g.fillCircle(6, dims.h / 2 + 1, 1.5);
        g.fillStyle(0xFFFFFF, 0.7);
        g.fillRect(-10, dims.h / 2 - 5, 6, 7);
        g.fillRect(4, dims.h / 2 - 5, 6, 7);
        break;
      default:
        g.fillEllipse(-7, dims.h / 2 + 3, 14, 7);
        g.fillEllipse(7, dims.h / 2 + 3, 14, 7);
    }
  } else {
    g.fillStyle(0x222222, 1);
    g.fillEllipse(-7, dims.h / 2 + 2, 10, 5);
    g.fillEllipse(7, dims.h / 2 + 2, 10, 5);
  }
}
