// Small pure helpers shared by the whole app (no DOM, so the tests can import them).

export const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** 12.5 -> "12,50 €" (German style, as on the price labels). */
export const fmtEur = v => (v == null || isNaN(v)) ? '' : Number(v).toFixed(2).replace('.', ',') + ' €';

/** +0.5 -> "+0.5", -0.3 -> "−0.3", 0 -> "±0.0" */
export const fmtDelta = d => (d > 0 ? '+' : d < 0 ? '−' : '±') + Math.abs(d).toFixed(1);

export const fmtDate = iso => {
  const d = new Date(iso);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('en-GB', sameYear ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' });
};

/** Random id. Built from getRandomValues because crypto.randomUUID needs https (LAN testing is plain http). */
export const uid = () => Array.from(crypto.getRandomValues(new Uint8Array(10)), b => b.toString(16).padStart(2, '0')).join('');

/** Deterministic pseudo-random number in [0,1) for pixel art speckles. */
export function hash(x, y, s) {
  let n = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 982451653)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
}

export const mean = xs => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;

export const norm = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
