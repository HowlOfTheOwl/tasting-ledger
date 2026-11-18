// Pixel art drawn in code: cheese sprites (from a "look"), pumpkin sprites (from the round data) and small SVG icons.
// All art is original. Sprites are built once into a grid of colours, then cached as data URLs.
import { hash } from './logic/util.js';

const OUT = '#2a1709';

/* ---------------- colours ---------------- */
const hex = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const toHex = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
const okHex = h => typeof h === 'string' && /^#[0-9a-f]{6}$/i.test(h);

/* ---------------- cheese looks ---------------- */
// Presets used by the examples. The appraiser may also send a look object: {shape, paste, rind, pattern, veins?}.
const PRESETS = {
  comte: { shape: 'wedge', paste: '#f3d27a', rind: '#b07a3a', pattern: 'crystals' },
  gorgo: { shape: 'wedge', paste: '#f1e8cc', rind: '#c9a36b', pattern: 'veins', veins: '#4f7d6e' },
  goat: { shape: 'log', paste: '#fbf8ef', rind: '#d6d2c6', pattern: 'ash' },
  gouda: { shape: 'block', paste: '#e9b445', rind: '#3a3330', pattern: 'crystals' },
  feta: { shape: 'block', paste: '#f7f4ea', rind: '#f7f4ea', pattern: 'eyes' },
  bergk: { shape: 'wheel', paste: '#f0cd6d', rind: '#8a5a2b', pattern: 'eyes' },
  mozz: { shape: 'ball', paste: '#fbfaf4', rind: '#fbfaf4', pattern: 'none' },
  unknown: { shape: 'wedge', paste: '#f2c14e', rind: '#b9841c', pattern: 'eyes' },
};

export function resolveLook(look) {
  let L = typeof look === 'string' ? PRESETS[look] : look;
  if (!L || typeof L !== 'object') L = PRESETS.unknown;
  const shape = ['wedge', 'wheel', 'log', 'block', 'ball'].includes(L.shape) ? L.shape : 'wedge';
  const paste = okHex(L.paste) ? L.paste : PRESETS.unknown.paste;
  const rind = okHex(L.rind) ? L.rind : mix(paste, '#6b3f22', 0.5);
  const veins = okHex(L.veins) ? L.veins : '#4f7d6e';
  return {
    shape, pattern: L.pattern || 'none',
    paste, light: mix(paste, '#ffffff', 0.4), shade: mix(paste, '#5a3a10', 0.22),
    rind, rindL: mix(rind, '#ffffff', 0.18), rindD: mix(rind, '#000000', 0.3),
    veins, veins2: mix(veins, '#000000', 0.35), dots: mix(paste, '#5a3a10', 0.3), crystals: mix(paste, '#ffffff', 0.7),
  };
}

function buildCheese(L, seed) {
  const W = 28, H = 22, g = Array.from({ length: H }, () => Array(W).fill(null));
  const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = c; };
  const hasRind = L.rind !== L.paste;
  if (L.shape === 'wedge') {
    for (let x = 3; x <= 24; x++) {
      const top = Math.round(6 + 11 * (x - 3) / 21);
      for (let y = top; y <= 18; y++) set(x, y, y === 18 ? L.shade : L.paste);
      for (let y = top - 3; y < top; y++) if (y >= 3) set(x + 1, y, L.light);
    }
    for (let y = 3; y <= 18; y++) { set(2, y, L.rindD); set(3, y, L.rind); }
    for (let y = 3; y <= 5; y++) set(4, y, L.rind);
  } else if (L.shape === 'wheel') {
    const cx = 13.5, rx = 11.5, ry = 4;
    const inE = (px, py, cy) => ((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2 <= 1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const px = x + .5, py = y + .5;
      if (Math.abs(px - cx) <= rx && py >= 7 && (py <= 15 || inE(px, py, 15))) g[y][x] = px > cx + rx * 0.5 ? L.rindD : L.rind;
      if (inE(px, py, 7)) g[y][x] = ((px - cx) / rx) ** 2 + ((py - 7) / ry) ** 2 > 0.7 ? L.rind : L.rindL;
    }
    // a slice is cut out at the front: the cut face shows the paste
    for (let y = 7; y < H; y++) for (let x = 14; x <= 21; x++) if (g[y][x] && y >= 8) g[y][x] = y >= 18 ? L.shade : L.paste;
    for (let y = 4; y <= 7; y++) for (let x = 14; x <= 21; x++) if (g[y][x] && inE(x + .5, y + .5, 7)) g[y][x] = L.light;
  } else if (L.shape === 'log') {
    for (let y = 7; y <= 16; y++) for (let x = 3; x <= 20; x++) set(x, y, y <= 8 ? L.rindL : (y >= 15 ? L.rindD : L.rind));
    if (L.pattern === 'ash') for (let i = 0; i < 26; i++) set(3 + Math.floor(hash(i, 1, seed) * 18), 9 + Math.floor(hash(i, 2, seed) * 6), L.rindD);
    for (let y = 6; y <= 17; y++) for (let x = 18; x <= 26; x++) {
      const e = ((x + .5 - 21.5) / 4) ** 2 + ((y + .5 - 12) / 5.6) ** 2;
      if (e <= 1) set(x, y, e > 0.72 ? L.rind : (x < 21 ? L.light : L.paste));
    }
  } else if (L.shape === 'block') {
    for (let y = 9; y <= 18; y++) for (let x = 3; x <= 18; x++) set(x, y, y === 18 ? L.shade : L.paste);
    for (let k = 1; k <= 4; k++) for (let x = 3 + k; x <= 18 + k; x++) set(x, 9 - k, L.light);
    for (let k = 1; k <= 4; k++) for (let y = 9 - k; y <= 18 - k; y++) set(18 + k, y, L.shade);
    if (hasRind) {
      for (let y = 9; y <= 18; y++) { set(3, y, L.rind); set(18, y, L.rind); }
      for (let x = 3; x <= 18; x++) { set(x, 18, L.rindD); set(x, 9, L.rind); }
      for (let k = 1; k <= 4; k++) { set(3 + k, 9 - k, L.rind); set(18 + k, 18 - k, L.rindD); set(18 + k, 9 - k, L.rind); }
    }
  } else if (L.shape === 'ball') {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const dx = x + .5 - 14, dy = y + .5 - 12, d = (dx * dx + dy * dy) / 64;
      if (d <= 1) set(x, y, dx + dy < -6 ? L.light : (dx + dy > 6 ? L.shade : L.paste));
    }
  }
  const isPaste = c => c === L.paste || c === L.light || c === L.shade;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = g[y][x]; if (!isPaste(c)) continue;
    const r = hash(x, y, seed);
    if (L.pattern === 'veins' && c !== L.light && r < 0.2) { g[y][x] = r < 0.08 ? L.veins2 : L.veins; if (hash(x, y, seed + 1) < 0.5 && isPaste(g[y][x + 1])) g[y][x + 1] = L.veins; }
    else if (L.pattern === 'eyes' && c === L.paste && r < 0.06) g[y][x] = L.dots;
    else if (L.pattern === 'crystals' && r < 0.07) g[y][x] = L.crystals;
  }
  return outline(g, W, H);
}

/* ---------------- pumpkins (ported from the Pumpkin Ledger) ---------------- */
function buildPumpkin(sp, seed) {
  const w = sp.w, h = sp.h, ox = 2, oy = 4, W = w + 4, H = h + 5;
  const grid = Array.from({ length: H }, () => Array(W).fill(null));
  const cx = w / 2, cy = h / 2, rx = w / 2, ry = h / 2;
  const inBody = (x, y) => {
    const px = x + 0.5, py = y + 0.5;
    if (sp.shape === 'pear') {
      const n = ((px - cx) / (w * 0.29)) ** 2 + ((py - h * 0.27) / (h * 0.29)) ** 2;
      const b = ((px - cx) / (w / 2)) ** 2 + ((py - h * 0.665) / (h * 0.335)) ** 2;
      return n <= 1 || b <= 1;
    }
    const t = (py - cy) / ry; let rxe = rx;
    if (sp.shape === 'tear' && t < 0) rxe = rx * (1 - 0.42 * Math.pow(-t, 1.6));
    return ((px - cx) / rxe) ** 2 + t * t <= 1;
  };
  const mask = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => inBody(x, y)));
  let ytop = h, ybot = -1;
  const rows = mask.map((r, y) => { const a = r.indexOf(true), b = r.lastIndexOf(true); if (a >= 0) { ytop = Math.min(ytop, y); ybot = Math.max(ybot, y); } return a < 0 ? null : { a, b }; });
  const vc = (ytop + ybot + 1) / 2, vr = (ybot - ytop + 1) / 2;
  for (let y = 0; y < h; y++) {
    const R = rows[y]; if (!R) continue;
    const rc = (R.a + R.b + 1) / 2, rh = (R.b - R.a + 1) / 2;
    for (let x = R.a; x <= R.b; x++) {
      if (!mask[y][x]) continue;
      const u = (x + 0.5 - rc) / rh, vy = (y + 0.5 - vc) / vr;
      const sh = u * 0.55 + vy * 0.7;
      let col = sh > 0.6 ? sp.shade : (sh < -0.5 ? sp.light : sp.base);
      let f = 1, k = 0;
      if (sp.ribs) { const a = Math.asin(Math.max(-0.999, Math.min(0.999, u))); const s = (a / Math.PI + 0.5) * sp.ribs; k = Math.floor(s); f = s - k; }
      const r = hash(x, y, seed);
      if (sp.pattern === 'mottle' && hash(x >> 1, y >> 1, seed + 3) < 0.3 && sh < 0.6) col = sp.p1;
      if (sp.pattern === 'marble' && k % 2 === 0 && r < 0.75 && sh < 0.6) col = sp.p1;
      if (sp.pattern === 'warts') { if (r < 0.14) col = sp.p1; else if (r < 0.22 && vy > 0) col = sp.p2; }
      if (sp.pattern === 'stripes') { if ((f < 0.3 || f > 0.92) && Math.abs(u) < 0.95) col = sp.p1; else if (r < 0.07) col = sp.p1; }
      else if (sp.ribs && f < 0.2 && Math.abs(u) < 0.9) col = sp.rib;
      grid[oy + y][ox + x] = col;
    }
  }
  const c = Math.floor(w / 2); let tc = 0; while (tc < h && !mask[tc][c]) tc++;
  const stem = [[c, tc - 1], [c, tc - 2], [c + 1, tc - 3]]; if (w >= 18) stem.push([c - 1, tc - 1]);
  stem.forEach(([x, y]) => { if (oy + y >= 1) grid[oy + y][ox + x] = sp.stem; });
  return outline(grid, W, H);
}

function outline(g, W, H) {
  const add = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (g[y][x]) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const yy = y + dy, xx = x + dx; return yy >= 0 && yy < H && xx >= 0 && xx < W && g[yy][xx]; })) add.push([x, y]);
  }
  add.forEach(([x, y]) => { g[y][x] = OUT; });
  return { W, H, g };
}

export function blit(ctx, s, x0, y0) {
  for (let y = 0; y < s.H; y++) for (let x = 0; x < s.W; x++) { const c = s.g[y][x]; if (c) { ctx.fillStyle = c; ctx.fillRect(x0 + x, y0 + y, 1, 1); } }
}

/* ---------------- cache + <img> helpers ---------------- */
const cache = new Map();
function sprite(key, build) {
  if (!cache.has(key)) {
    const s = build();
    const cv = document.createElement('canvas'); cv.width = s.W; cv.height = s.H; blit(cv.getContext('2d'), s, 0, 0);
    cache.set(key, { s, url: cv.toDataURL() });
  }
  return cache.get(key);
}
let seedN = 0; const seeds = new Map();
const seedOf = k => { if (!seeds.has(k)) seeds.set(k, (seedN++) * 31 + 7); return seeds.get(k); };

export function cheeseSprite(look) {
  const L = resolveLook(look), key = 'c:' + JSON.stringify(L);
  return sprite(key, () => buildCheese(L, seedOf(key)));
}
export function pumpkinSprite(sp) {
  const key = 'p:' + JSON.stringify(sp);
  return sprite(key, () => buildPumpkin(sp, seedOf(key)));
}
export function imgOf(sp, width, maxH) {
  const sc = Math.min(width / sp.s.W, maxH ? maxH / sp.s.H : 99);
  return `<img class="px" src="${sp.url}" width="${Math.round(sp.s.W * sc)}" height="${Math.round(sp.s.H * sc)}" alt="">`;
}

/* ---------------- small SVG icons ---------------- */
export const WEDGE = '<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"><path class="wt" d="M1 5h4v-1h4v-1h4v-1h2v3h-14z"/><path class="wb" d="M1 6h14v8h-14z"/><path class="wh" d="M4 8h2v2h-2zM10 10h2v2h-2zM8 7h1v1h-1z"/><path fill="#2a1709" d="M0 5h1v10h-1zM1 14h15v1h-15zM15 5h1v9h-1zM1 4h4v1h-4zM5 3h4v1h-4zM9 2h4v1h-4zM13 1h3v1h-3z"/></svg>';
export const PUMPKIN_PIP = '<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"><path class="ps" d="M7 1h2v3h-2z"/><path class="pb" d="M3 5h10v1h1v1h1v5h-1v1h-1v1h-10v-1h-1v-1h-1v-5h1v-1h1z"/><path class="ph" d="M4 6h2v3h-2z"/><path class="pr" d="M7 5h1v9h-1zM10 6h1v7h-1z"/></svg>';
const COIN = '<svg viewBox="0 0 12 12" shape-rendering="crispEdges" aria-hidden="true"><path class="cr" d="M3 1h6v1h1v1h1v6h-1v1h-1v1h-6v-1h-1v-1h-1v-6h1v-1h1z"/><path class="cb" d="M3 2h6v1h1v6h-1v1h-6v-1h-1v-6h1z"/><path class="ch" d="M4 3h2v1h-1v3h-1z"/><path class="cr" d="M6 4h1v4h-1z"/></svg>';
export const OWL = '<svg class="owl" width="40" height="40" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"><path fill="#5b3217" d="M3 3h10v11h-10z"/><path fill="#a3632e" d="M4 4h8v9h-8z"/><path fill="#5b3217" d="M3 2h2v1h-2zM11 2h2v1h-2z"/><path fill="#fcefcf" d="M4 5h3v3h-3zM9 5h3v3h-3z"/><path fill="#28160b" d="M5 6h1v1h-1zM10 6h1v1h-1z"/><path fill="#e0ac1c" d="M7 8h2v1h-2z"/><path fill="#d29455" d="M6 10h4v3h-4z"/><path fill="#28160b" d="M5 14h2v1h-2zM9 14h2v1h-2z"/></svg>';
export const CAM = '<svg width="34" height="28" viewBox="0 0 17 14" shape-rendering="crispEdges" aria-hidden="true"><path fill="#5b3217" d="M5 1h6v2h5v10h-15v-10h4z"/><path fill="#a3632e" d="M2 4h13v8h-13z"/><path fill="#28160b" d="M6 5h5v1h1v4h-1v1h-5v-1h-1v-4h1z"/><path fill="#8fb3c4" d="M7 6h3v4h-3z"/><path fill="#fcefcf" d="M7 6h1v1h-1zM13 5h1v1h-1z"/></svg>';

export function wedges(n, total = 5) {
  return `<span class="wedges" aria-label="${n} of ${total}">${Array.from({ length: total }, (_, i) => `<span class="${i < n ? 'w-on' : 'w-off'}">${WEDGE}</span>`).join('')}</span>`;
}
export function coins(t, big) {
  const words = ['price unknown', 'Everyday', 'Treat', 'Splurge'];
  return `<span class="coins ${big ? 'big' : ''}" aria-label="${words[t]}">${[1, 2, 3].map(i => `<span class="${i <= t ? 'c-on' : 'c-off'}">${COIN}</span>`).join('')}</span>`;
}
