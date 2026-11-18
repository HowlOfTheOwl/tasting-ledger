// Run with: node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import { ranking, condMeans, vsBaseline, factorEffects, progress, linesToItems, assignCodes, newRound, toMarkdown, displayName } from '../app/js/logic/rounds.js';
import { pumpkinRound1 } from '../app/js/data/pumpkinRound1.js';
import { tierOf, perKgOf, currentOverall, sameCheeseGroups, upNext, passport, validateAppraisal, applyAppraisal, exampleCheeses, buildAppraisalRequest, likeProfile } from '../app/js/logic/cheese.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('pumpkin round 1 reproduces the published results', () => {
  const r = pumpkinRound1();
  assert.deepEqual(ranking(r).map(x => x.s.id), ['mandarin', 'butternut', 'sweetlightning', 'hokkaido', 'minimuskat', 'sweetdumpling', 'blackfutsu']);
  close(ranking(r)[0].avg, 4.5);
  const m = Object.fromEntries(condMeans(r).map(x => [x.cond.id, x.m]));
  close(m.plain, 19 / 7); close(m.cheeseDip, 25 / 7);
  const fe = Object.fromEntries(factorEffects(r).map(x => [x.factor, x]));
  close(fe.cheese.d, 0.5); assert.equal(fe.cheese.n, 14);
  close(fe.dip.d, 5 / 14); assert.equal(fe.dip.n, 14);
  assert.deepEqual(progress(r), { done: 28, total: 28 });
  const vb = vsBaseline(r);
  assert.equal(vb.length, 3); close(vb[2].d, 6 / 7);
  assert.match(toMarkdown(r), /\| 1 \| Mandarin Orange \| 4 \| 4 \| 5 \| 5 \| 4.50 \|/);
});

test('new rounds: unique ids, shuffled blind codes, names hidden until reveal', () => {
  const items = linesToItems('Feta\nGouda\n\nFeta');
  assert.deepEqual(items.map(i => i.id), ['feta', 'gouda', 'feta-2']);
  const s = assignCodes(items.map(i => ({ id: i.id, name: i.label })), () => 0);
  assert.deepEqual(s.map(x => x.code).sort(), ['A', 'B', 'C']);
  const r = newRound({ title: 'T', date: '2026-11-18', samples: s, conds: linesToItems('None\nFeta'), blind: true });
  assert.equal(displayName(r, r.samples[0]).startsWith('Sample '), true);
  r.revealed = true;
  assert.equal(displayName(r, r.samples[0]), r.samples[0].name);
  assert.deepEqual(progress(r), { done: 0, total: 6 });
});

test('price tiers and price per kg', () => {
  assert.equal(tierOf(null), 0); assert.equal(tierOf(14.99), 1); assert.equal(tierOf(15), 2); assert.equal(tierOf(30), 2); assert.equal(tierOf(30.01), 3);
  close(perKgOf({ priceEur: 3.49, weightG: 200 }), 17.45);
  assert.equal(perKgOf({ priceEur: 3.49, weightG: 200, ai: { perKg: 18 } }), 18);
  assert.equal(perKgOf({ priceEur: 3 }), null);
});

test('cellar stats on the example cheeses', () => {
  const ex = exampleCheeses(Date.UTC(2026, 10, 18));
  assert.equal(currentOverall(ex.find(e => e.id === 'ex3')), 5); // re-tasted
  const g = sameCheeseGroups(ex);
  assert.equal(g.length, 1); assert.deepEqual(g[0].map(e => e.id), ['ex3', 'ex4']);
  const pp = passport(ex); assert.equal(pp.Netherlands.n, 2); assert.equal(pp.France.best, 5);
  const nx = upNext(ex, [{ name: 'Comté', why: 'dup' }, { name: 'Époisses', why: 'funky' }]);
  assert.equal(nx[0].name, 'Époisses'); // Comté is already in the cellar
  assert.ok(nx.some(n => n.name === 'Beaufort'));
  const lp = likeProfile(ex); assert.equal(lp.nHi, 4); assert.equal(lp.nLo, 1);
  assert.equal(buildAppraisalRequest(ex).cheeses.length, 0); // examples are never sent out
});

test('appraisal import: validates and fills in', () => {
  const ex = exampleCheeses();
  const bad = validateAppraisal({ type: 'nope' }, ex); assert.equal(bad.ok, false);
  const res = validateAppraisal({ type: 'appraisal-result', appraisals: [
    { id: 'ex7', ai: { name: 'Bergkäse 9 months', style: 'Hard', profile: { nutty: 4 }, cons: 4, perKg: 24 } },
    { id: 'missing', ai: {} },
    { id: 'ex6', ai: { profile: { salt: 9 } } },
  ], recommendations: [{ name: 'Époisses' }] }, ex);
  assert.equal(res.items.length, 1); assert.equal(res.errors.length, 2); assert.equal(res.recs.length, 1);
  applyAppraisal(ex, res.items);
  const e = ex.find(x => x.id === 'ex7'); assert.equal(e.name, 'Bergkäse 9 months'); assert.equal(e.ai.perKg, 24);
});
