// Header scene: an alpine dairy hut at dusk with cheese wheels by the door and a little pumpkin patch.
// Painted once on a 200×72 canvas and scaled up with pixelated rendering; fireflies and chimney smoke animate.
import { hash } from './logic/util.js';
import { blit, cheeseSprite, pumpkinSprite } from './sprites.js';
import { pumpkinRound1 } from './data/pumpkinRound1.js';

function paint(cv) {
  const W = cv.width, H = cv.height, ctx = cv.getContext('2d');
  const px = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); };
  const rect = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  const sky = ['#241c3a', '#33244a', '#4a2c55', '#683659', '#8c4458', '#b05a55', '#d27a52', '#e6a05c'];
  const bh = 46 / sky.length;
  sky.forEach((c, i) => rect(0, Math.round(i * bh), W, Math.ceil(bh) + 1, c));
  for (let i = 1; i < sky.length; i++) { const y = Math.round(i * bh); for (let x = y % 2; x < W; x += 2) px(x, y - 1, sky[i]); }
  for (let i = 0; i < 30; i++) px(Math.floor(hash(i, 1, 4) * W), Math.floor(hash(i, 2, 4) * 18), hash(i, 3, 4) < 0.5 ? '#f4dca6' : '#cdb7d6');
  // a moon like a round of cheese
  for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) { const d = x * x + y * y; if (d <= 38) px(30 + x, 12 + y, d <= 20 ? '#fbe7a8' : '#f2c97a'); }
  [[28, 10], [32, 13], [29, 14], [31, 9]].forEach(([x, y]) => px(x, y, '#e0b25e'));
  const ridge = (base, amp, f, ph, col, snow) => {
    for (let x = 0; x < W; x++) {
      const hy = Math.round(base - amp * Math.abs(Math.sin(x / f + ph)) - amp * 0.4 * Math.sin(x / (f * 0.37) + ph * 2));
      rect(x, hy, 1, H - hy, col); if (snow && hy < base - amp * 0.75) rect(x, hy, 1, 2, snow);
    }
  };
  ridge(40, 16, 22, 0.6, '#5a3a5e', '#e9d7e6');
  ridge(46, 9, 15, 2.1, '#43304d', null);
  for (let x = 0; x < W; x++) { const hy = 48 + Math.round(1.5 * Math.sin(x / 17)); rect(x, hy, 1, H - hy, '#4e6a2a'); rect(x, hy, 1, 1, '#6f8c35'); }
  rect(0, 58, W, H - 58, '#3f5722');
  for (let i = 0; i < 90; i++) px(Math.floor(hash(i, 7, 2) * W), 50 + Math.floor(hash(i, 8, 2) * (H - 50)), hash(i, 9, 2) < 0.5 ? '#6f8c35' : '#2f4419');
  for (let i = 0; i < 14; i++) px(Math.floor(hash(i, 17, 2) * W), 54 + Math.floor(hash(i, 18, 2) * (H - 56)), ['#f4dca6', '#e88fa0', '#f9f3e8'][i % 3]);
  const pine = (x, y, h) => { for (let i = 0; i < h; i++) { const w = Math.floor(i / 2.2) + 1; rect(x - w, y + i, 2 * w + 1, 1, i % 3 === 0 ? '#2d4a2e' : '#1f3a24'); } rect(x, y + h, 1, 2, '#3a2215'); };
  pine(10, 30, 20); pine(20, 36, 15); pine(186, 28, 22); pine(176, 36, 14); pine(196, 38, 12);
  // hut
  const hx = 96, hy = 34;
  rect(hx, hy + 8, 46, 20, '#8a5530'); for (let y = hy + 10; y < hy + 28; y += 3) rect(hx, y, 46, 1, '#6b3f22');
  rect(hx + 46, hy + 8, 2, 20, '#5b3217');
  for (let i = 0; i < 12; i++) rect(hx - 4 + i, hy + 8 - i, 54 - 2 * i, 1, i % 2 ? '#9e4a2c' : '#b85a34');
  rect(hx - 5, hy + 8, 56, 2, '#7a3321');
  rect(hx + 34, hy - 6, 4, 8, '#5a4a46'); rect(hx + 33, hy - 7, 6, 1, '#3c302d');
  rect(hx + 8, hy + 15, 9, 13, '#4a2a15'); rect(hx + 9, hy + 16, 7, 12, '#6b3f22'); px(hx + 15, hy + 22, '#e0ac1c');
  rect(hx + 26, hy + 13, 12, 8, '#3a2313'); rect(hx + 27, hy + 14, 10, 6, '#f6c565'); rect(hx + 31, hy + 14, 1, 6, '#3a2313'); rect(hx + 27, hy + 17, 10, 1, '#3a2313');
  rect(hx + 27, hy + 14, 4, 3, '#fde7a0');
  rect(hx + 20, hy + 10, 1, 3, '#3a2313');
  for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) if (x * x + y * y <= 10) px(hx + 20 + x, hy + 16 + y, x * x + y * y >= 6 ? '#7d5226' : '#f2c14e');
  // cheese wheels by the door, a wedge on a barrel
  const wheel = cheeseSprite('bergk').s;
  blit(ctx, wheel, 66, 47); blit(ctx, wheel, 76, 47); blit(ctx, wheel, 71, 38);
  rect(150, 52, 12, 12, '#6b3f22'); rect(150, 55, 12, 1, '#3a2313'); rect(150, 60, 12, 1, '#3a2313'); rect(149, 51, 14, 2, '#8a5530');
  blit(ctx, cheeseSprite('comte').s, 143, 34);
  // fence and a little pumpkin patch
  rect(0, 57, 60, 1, '#9e6a3c'); rect(0, 60, 60, 1, '#9e6a3c'); for (let x = 3; x < 60; x += 9) { rect(x, 54, 2, 9, '#8f5d34'); px(x, 53, '#b07a48'); }
  rect(170, 57, 30, 1, '#9e6a3c'); rect(170, 60, 30, 1, '#9e6a3c'); for (let x = 172; x < W; x += 9) { rect(x, 54, 2, 9, '#8f5d34'); px(x, 53, '#b07a48'); }
  const ps = pumpkinRound1().samples;
  [[ps[4], 6], [ps[1], 26], [ps[5], 47]].forEach(([s, x]) => { const sp = pumpkinSprite(s.sprite).s; blit(ctx, sp, x, 71 - sp.H); });
  for (let y = 62; y < H; y++) { const w = 6 + (y - 62); rect(hx + 12 - Math.floor(w / 2), y, w, 1, y % 2 ? '#a37a4a' : '#8f6a3e'); }
}

export function startScene(view) {
  const vctx = view.getContext('2d');
  const base = document.createElement('canvas'); base.width = view.width; base.height = view.height; paint(base);
  const W = view.width;
  const flies = Array.from({ length: 10 }, (_, i) => ({ x: hash(i, 41, 1) * W, y: 44 + hash(i, 42, 1) * 24, ph: hash(i, 43, 1) * 6.28 }));
  function frame(t) {
    vctx.drawImage(base, 0, 0);
    flies.forEach(f => {
      if (Math.sin(t * 0.003 + f.ph) <= 0.2) return;
      const x = Math.round(f.x + Math.sin(t * 0.0011 + f.ph) * 5), y = Math.round(f.y + Math.cos(t * 0.0013 + f.ph) * 3);
      vctx.fillStyle = '#f7e98a'; vctx.fillRect(x, y, 1, 1);
      vctx.fillStyle = 'rgba(247,233,138,.35)'; vctx.fillRect(x - 1, y, 3, 1); vctx.fillRect(x, y - 1, 1, 3);
    });
    for (let i = 0; i < 5; i++) {
      const yy = (i * 5 + t * 0.006) % 26, x = 132 + Math.round(Math.sin(t * 0.002 + i) * 1.5 + yy * 0.3), y = 27 - Math.round(yy);
      vctx.fillStyle = yy < 13 ? '#a99aa8' : '#7f6f86'; vctx.fillRect(x, y, 2, 2);
    }
  }
  frame(0);
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let running = false, last = 0, raf = 0;
  const tick = t => { if (!running) return; if (t - last > 80) { frame(t); last = t; } raf = requestAnimationFrame(tick); };
  const start = () => { if (!running) { running = true; raf = requestAnimationFrame(tick); } };
  const stop = () => { running = false; cancelAnimationFrame(raf); };
  if ('IntersectionObserver' in window) new IntersectionObserver(es => es.forEach(e => (e.isIntersecting && !document.hidden ? start() : stop()))).observe(view);
  else start();
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
}
