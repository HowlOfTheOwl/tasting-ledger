// Tasting rounds: a fixed set of samples, each tasted in several conditions (bites), scored 1–5.
// Pure functions only; the Rounds screen and the tests both use them.
//
// Round shape:
// { id, title, subject, date, status: 'open'|'done', blind, revealed, protocol,
//   samples: [{id, name, sub, code, sprite?, cheeseId?}],
//   conds:   [{id, label, factors?: [..], cheeseId?}]   first one is the baseline
//   prof:    [{id, label}]                              profile axes, 1–5
//   extra:   {label, options:[{id,label}]} | null       one multiple-choice question per sample
//   scale:   ['', word1..word5]
//   scores:  {sampleId: {c:{condId:n}, p:{profId:n}, x:'optionId', note:''}} }
import { mean, fmtDelta, uid } from './util.js';

export const DEFAULT_SCALE = ['not tasted', 'Compost heap', 'Meh', 'Solid', 'Very good', 'Prize winner'];

const sc = (round, sid) => round.scores[sid] || { c: {}, p: {}, x: '', note: '' };

export function displayName(round, s) {
  return round.blind && !round.revealed ? 'Sample ' + s.code : s.name;
}

export function progress(round) {
  const total = round.samples.length * round.conds.length;
  let done = 0;
  round.samples.forEach(s => round.conds.forEach(c => { if (sc(round, s.id).c[c.id]) done++; }));
  return { done, total };
}

export function sampleAvg(round, sid) {
  const xs = round.conds.map(c => sc(round, sid).c[c.id] || 0).filter(x => x > 0);
  return { n: xs.length, avg: mean(xs) };
}

/** Samples best first: tasted before untasted, then by mean score, then by number of bites, then list order. */
export function ranking(round) {
  return round.samples.map((s, i) => {
    const a = sampleAvg(round, s.id), c = sc(round, s.id).c;
    let best = [], mx = 0;
    round.conds.forEach(cd => { const x = c[cd.id] || 0; if (x > mx) { mx = x; best = [cd.label]; } else if (x > 0 && x === mx) best.push(cd.label); });
    return { s, i, avg: a.avg, n: a.n, best };
  }).sort((A, B) => ((B.n > 0) - (A.n > 0)) || (B.avg - A.avg) || (B.n - A.n) || (A.i - B.i));
}

export function bestText(r, nConds) {
  if (!r.n) return 'not tasted yet';
  if (r.best.length >= Math.max(3, nConds - 1) && nConds > 2) return 'no clear favourite bite';
  return 'best: ' + r.best.join(' / ');
}

export function condMeans(round) {
  return round.conds.map(c => {
    const xs = round.samples.map(s => sc(round, s.id).c[c.id]).filter(Boolean);
    return { cond: c, m: mean(xs), n: xs.length };
  });
}

/** Each condition against the first one (the baseline), as the mean of within-sample differences. */
export function vsBaseline(round) {
  const base = round.conds[0];
  if (!base) return [];
  return round.conds.slice(1).map(c => {
    const ds = [];
    round.samples.forEach(s => { const x = sc(round, s.id).c; if (x[base.id] && x[c.id]) ds.push(x[c.id] - x[base.id]); });
    return { cond: c, d: mean(ds), n: ds.length };
  });
}

/**
 * Factor effects for factorial designs (e.g. cheese × dip): for each factor, the mean difference over all pairs of
 * conditions that differ only by that factor, within the same sample.
 */
export function factorEffects(round) {
  const has = round.conds.filter(c => Array.isArray(c.factors));
  const factors = [...new Set(has.flatMap(c => c.factors))];
  const key = fs => fs.slice().sort().join('|');
  return factors.map(f => {
    const pairs = [];
    has.forEach(a => {
      if (a.factors.includes(f)) return;
      const b = has.find(c => key(c.factors) === key([...a.factors, f]));
      if (b) pairs.push([a.id, b.id]);
    });
    const ds = [];
    round.samples.forEach(s => { const x = sc(round, s.id).c; pairs.forEach(([a, b]) => { if (x[a] && x[b]) ds.push(x[b] - x[a]); }); });
    return { factor: f, d: mean(ds), n: ds.length };
  }).filter(e => e.n > 0);
}

export function toMarkdown(round) {
  const rk = ranking(round);
  const head = ['#', 'Sample', ...round.conds.map(c => c.label), 'Avg'];
  const lines = [`## ${round.title} (${round.date})`, '', '| ' + head.join(' | ') + ' |', '|' + head.map(() => '---').join('|') + '|'];
  rk.forEach((r, i) => {
    const c = sc(round, r.s.id).c;
    lines.push('| ' + [i + 1, displayName(round, r.s), ...round.conds.map(cd => c[cd.id] || '–'), r.n ? r.avg.toFixed(2) : '–'].join(' | ') + ' |');
  });
  lines.push('', 'Condition means: ' + condMeans(round).map(m => `${m.cond.label} ${m.n ? m.m.toFixed(1) : '–'}`).join(' · '));
  const vb = vsBaseline(round).filter(e => e.n);
  if (vb.length) lines.push(`Against ${round.conds[0].label}: ` + vb.map(e => `${e.cond.label} ${fmtDelta(e.d)} (${e.n})`).join(' · '));
  const fe = factorEffects(round);
  if (fe.length) lines.push('Factor effects: ' + fe.map(e => `${e.factor} ${fmtDelta(e.d)} (${e.n} pairs)`).join(' · '));
  return lines.join('\n');
}

/* ---------------- building rounds ---------------- */
const CODES = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x';

/** Gives every sample a blind code in a shuffled order, so A is not simply the first one on the list. */
export function assignCodes(samples, rand = Math.random) {
  const order = samples.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  order.forEach((si, k) => { samples[si].code = CODES[k] || String(k + 1); });
  return samples;
}

/** Turns lines of text into unique ids + labels. */
export function linesToItems(text) {
  const used = new Set();
  return String(text || '').split('\n').map(l => l.trim()).filter(Boolean).map(label => {
    let id = slug(label), n = 2;
    while (used.has(id)) id = slug(label) + '-' + n++;
    used.add(id);
    return { id, label };
  });
}

export function newRound({ title, subject, date, protocol, samples, conds, prof, extra, blind }) {
  const r = {
    id: uid(), title, subject: subject || 'other', date, status: 'open', blind: !!blind, revealed: !blind, protocol: protocol || '',
    samples, conds, prof: prof || [], extra: extra || null, scale: DEFAULT_SCALE.slice(), scores: {}, created: new Date().toISOString(),
  };
  assignCodes(r.samples);
  return r;
}
