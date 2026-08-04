// Canvas-drawn card textures + 3D card mesh builder.
import * as THREE from 'three';
import { SUIT_SYMBOL } from './baloot.js';

export const CARD_W = 0.63;
export const CARD_H = 0.90;
export const CARD_T = 0.016;

const RED = '#c0392b';
const BLACK = '#1b1b1b';
const faceCache = new Map();
let backTexture = null;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function pipCount(rank) {
  const n = parseInt(rank, 10);
  return Number.isNaN(n) ? 0 : n; // 7,8,9,10
}

function makeFaceCanvas(card) {
  const W = 380, H = 540;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const color = (card.suit === 'hearts' || card.suit === 'diamonds') ? RED : BLACK;
  const sym = SUIT_SYMBOL[card.suit];

  // background
  ctx.fillStyle = '#faf8f2';
  roundRect(ctx, 6, 6, W - 12, H - 12, 34); ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = '#d8d2c0'; ctx.stroke();

  // corner indices
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  const drawCorner = (x, y, flip) => {
    ctx.save();
    ctx.translate(x, y);
    if (flip) ctx.rotate(Math.PI);
    ctx.font = 'bold 64px Georgia, serif';
    ctx.fillText(card.rank, 0, 0);
    ctx.font = '54px Georgia, serif';
    ctx.fillText(sym, 0, 54);
    ctx.restore();
  };
  drawCorner(48, 66, false);
  drawCorner(W - 48, H - 66, true);

  const face = { J: '\u2655', Q: '\u2655', K: '\u2654', A: null };
  if (card.rank === 'A') {
    ctx.font = '220px Georgia, serif';
    ctx.fillText(sym, W / 2, H / 2 + 78);
  } else if (['J', 'Q', 'K'].includes(card.rank)) {
    // court card: framed panel with big rank + suit
    ctx.strokeStyle = color; ctx.lineWidth = 6;
    roundRect(ctx, 78, 96, W - 156, H - 192, 18); ctx.stroke();
    ctx.font = 'bold 150px Georgia, serif';
    ctx.fillText(card.rank, W / 2, H / 2 - 6);
    ctx.font = '96px Georgia, serif';
    ctx.fillText(sym, W / 2, H / 2 + 110);
  } else {
    // pip layout
    const n = pipCount(card.rank);
    ctx.font = '78px Georgia, serif';
    const cols = [W * 0.34, W * 0.66];
    const rowsFor = {
      7: [[0, .22], [1, .22], [0, .40], [1, .40], [.5, .5], [0, .78], [1, .78]],
      8: [[0, .22], [1, .22], [0, .40], [1, .40], [0, .60], [1, .60], [0, .78], [1, .78]],
      9: [[0, .20], [1, .20], [0, .38], [1, .38], [.5, .5], [0, .62], [1, .62], [0, .80], [1, .80]],
      10: [[0, .18], [1, .18], [.5, .30], [0, .40], [1, .40], [0, .60], [1, .60], [.5, .70], [0, .82], [1, .82]],
    }[n] || [];
    for (const [cx, cy] of rowsFor) {
      const x = cx === .5 ? W / 2 : cols[cx];
      ctx.fillText(sym, x, H * cy + 26);
    }
  }
  return cv;
}

function makeBackCanvas() {
  const W = 380, H = 540;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#0b6b3a';
  roundRect(ctx, 6, 6, W - 12, H - 12, 34); ctx.fill();
  ctx.strokeStyle = '#e9c46a'; ctx.lineWidth = 8;
  roundRect(ctx, 26, 26, W - 52, H - 52, 24); ctx.stroke();
  // diamond lattice
  ctx.strokeStyle = 'rgba(233,196,106,0.55)'; ctx.lineWidth = 2;
  const s = 34;
  for (let y = 40; y < H - 40; y += s) {
    for (let x = 40; x < W - 40; x += s) {
      ctx.beginPath();
      ctx.moveTo(x + s / 2, y); ctx.lineTo(x + s, y + s / 2);
      ctx.lineTo(x + s / 2, y + s); ctx.lineTo(x, y + s / 2);
      ctx.closePath(); ctx.stroke();
    }
  }
  ctx.fillStyle = '#e9c46a';
  ctx.textAlign = 'center';
  ctx.font = 'bold 60px Georgia, serif';
  ctx.fillText('\u2660', W / 2, H / 2 + 22);
  return cv;
}

function faceTexture(card) {
  if (faceCache.has(card.id)) return faceCache.get(card.id);
  const tex = new THREE.CanvasTexture(makeFaceCanvas(card));
  tex.anisotropy = 8; tex.colorSpace = THREE.SRGBColorSpace;
  faceCache.set(card.id, tex);
  return tex;
}

function backTex() {
  if (!backTexture) {
    backTexture = new THREE.CanvasTexture(makeBackCanvas());
    backTexture.anisotropy = 8; backTexture.colorSpace = THREE.SRGBColorSpace;
  }
  return backTexture;
}

// Build a card mesh. Front (+Z) face shows the card, back (-Z) shows the pattern.
export function createCardMesh(card) {
  const geo = new THREE.BoxGeometry(CARD_W, CARD_H, CARD_T);
  const edge = new THREE.MeshStandardMaterial({ color: '#f2eee2', roughness: 0.6 });
  const front = new THREE.MeshStandardMaterial({ map: faceTexture(card), roughness: 0.55 });
  const back = new THREE.MeshStandardMaterial({ map: backTex(), roughness: 0.55 });
  // Box material order: +x,-x,+y,-y,+z,-z
  const mats = [edge, edge, edge, edge, front, back];
  const mesh = new THREE.Mesh(geo, mats);
  mesh.castShadow = true;
  mesh.userData.card = card;
  return mesh;
}
