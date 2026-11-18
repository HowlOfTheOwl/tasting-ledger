// Cheese cellar: scales, labels and the pure calculations behind the Cellar and Ledger screens.
import { mean, norm } from './util.js';

export const VERDICT = ['not rated', 'Mouse bait', 'Meh', 'Solid', 'Very good', 'Cellar legend'];
export const TASTE_W = ['', 'Not for me', 'Meh', 'Fine', 'Lovely', 'Wow'];
export const TEXT_W = ['', 'Unpleasant', 'Off', 'Fine', 'Lovely', 'Perfect'];
export const AGAIN = [['yes', 'Yes'], ['maybe', 'Maybe'], ['no', 'No']];
export const EATEN = ['Plain', 'Bread', 'Crackers', 'Melted', 'Fruit', 'Wine', 'Pumpkin', 'Salad', 'Pasta'];
export const PROF = [['nutty', 'Nutty'], ['butter', 'Buttery'], ['salt', 'Salty'], ['tang', 'Tangy'], ['sharp', 'Sharp'], ['funk', 'Funky']];
export const CONS = ['Fresh', 'Soft', 'Semi-soft', 'Semi-hard', 'Hard', 'Extra hard'];
export const STYLES = ['Fresh', 'Soft', 'Blue', 'Semi-hard', 'Hard'];
export const TIER_W = ['unknown', 'Everyday', 'Treat', 'Splurge'];
/** Countries in the cheese passport, in stamp order. Anything else lands on "Elsewhere". */
export const COUNTRIES = ['France', 'Italy', 'Switzerland', 'Netherlands', 'Germany', 'Austria', 'Greece', 'Spain',
  'United Kingdom', 'Ireland', 'Denmark', 'Belgium', 'Portugal', 'Norway', 'Cyprus'];

/** Price tier per kg: under 15 € = 1 coin, 15–30 € = 2, over 30 € = 3. 0 = unknown. */
export const tierOf = kg => kg == null || isNaN(kg) ? 0 : kg < 15 ? 1 : kg <= 30 ? 2 : 3;

/** Price per kg: the appraiser's value (e.g. read from the Grundpreis on the label) wins over our own maths. */
export function perKgOf(e) {
  if (e.ai && e.ai.perKg != null) return e.ai.perKg;
  if (e.priceEur && e.weightG) return e.priceEur / e.weightG * 1000;
  return null;
}

export const nameOf = e => e.name || (e.ai && e.ai.name) || 'Unnamed cheese';

/** The verdict that counts: the latest re-tasting if there is one, else the first verdict. */
export function currentOverall(e) {
  const t = e.retastes;
  if (t && t.length) return t[t.length - 1].overall || 0;
  return (e.r && e.r.overall) || 0;
}

/** Key that ties together the same cheese bought in different shops. */
export function groupKey(e, all) {
  let root = e, guard = 0;
  while (root.sameAs && guard++ < 20) {
    const p = all.find(x => x.id === root.sameAs);
    if (!p) break;
    root = p;
  }
  const k = norm((root.ai && root.ai.canonical) || (e.ai && e.ai.canonical) || root.name || e.name);
  return k || 'id:' + root.id;
}

/** Groups with at least two purchases, best value first inside each group. */
export function sameCheeseGroups(entries) {
  const g = new Map();
  entries.forEach(e => { const k = groupKey(e, entries); if (!g.has(k)) g.set(k, []); g.get(k).push(e); });
  return [...g.values()].filter(a => a.length > 1)
    .map(a => a.slice().sort((x, y) => (perKgOf(x) ?? 1e9) - (perKgOf(y) ?? 1e9)));
}

/** Average taste profile of loved cheeses (current verdict 4–5) against the rest. Appraised cheeses only. */
export function likeProfile(entries) {
  const ap = entries.filter(e => e.ai && e.ai.profile && currentOverall(e));
  const hi = ap.filter(e => currentOverall(e) >= 4), lo = ap.filter(e => currentOverall(e) <= 3);
  const prof = arr => Object.fromEntries(PROF.map(([k]) => [k, mean(arr.map(e => e.ai.profile[k] || 0))]));
  return { hi: prof(hi), lo: prof(lo), nHi: hi.length, nLo: lo.length };
}

/**
 * "Up next" wish list: the appraiser's own recommendations first, then the "try next" tips of cheeses you loved.
 * Anything already in the cellar is left out.
 */
export function upNext(entries, recs) {
  const have = new Set(entries.flatMap(e => [norm(e.name), norm(e.ai && e.ai.canonical), norm(e.ai && e.ai.name)]).filter(Boolean));
  const out = [], seen = new Set();
  const add = (name, why) => { const k = norm(name); if (!k || have.has(k) || seen.has(k)) return; seen.add(k); out.push({ name, why }); };
  (recs || []).forEach(r => add(r.name, r.why || 'Suggested by the appraiser'));
  entries.filter(e => e.ai && currentOverall(e) >= 4)
    .sort((a, b) => currentOverall(b) - currentOverall(a))
    .forEach(e => (e.ai.tryNext || []).forEach(t => add(t, 'Because you liked ' + nameOf(e))));
  return out;
}

/** Cheese passport: per country the number of cheeses and the best verdict. */
export function passport(entries) {
  const m = {};
  entries.forEach(e => {
    if (!e.ai || !e.ai.country) return;
    const c = COUNTRIES.includes(e.ai.country) ? e.ai.country : 'Elsewhere';
    m[c] = m[c] || { n: 0, best: 0 };
    m[c].n++; m[c].best = Math.max(m[c].best, currentOverall(e));
  });
  return m;
}

export function byMilk(entries) {
  const g = {};
  entries.forEach(e => { const k = e.ai && e.ai.milk ? e.ai.milk.split(/[ (]/)[0] : 'Unknown'; (g[k] = g[k] || []).push(e); });
  return Object.entries(g).map(([milk, a]) => ({ milk, n: a.length, avg: mean(a.map(currentOverall).filter(Boolean)) }))
    .sort((a, b) => b.n - a.n);
}

/* ---------------- appraisal: request out, notes back in ---------------- */

export const LOOK_SHAPES = ['wedge', 'wheel', 'log', 'block', 'ball'];
export const LOOK_PATTERNS = ['none', 'eyes', 'veins', 'crystals', 'ash'];

/** What gets handed to Claude: the cheeses still waiting, with their photos, plus the field definitions. */
export function buildAppraisalRequest(entries, recsWanted = true) {
  const waiting = entries.filter(e => !e.ai && !e.example);
  return {
    app: 'tasting-ledger', type: 'appraisal-request', version: 1, exported: new Date().toISOString(),
    instructions: 'See APPRAISAL.md in the tasting-ledger repository. Reply with an appraisal-result file.',
    scales: { profile: PROF.map(p => p[0]), profileRange: '0-5', consistency: CONS, styles: STYLES, countries: COUNTRIES,
      lookShapes: LOOK_SHAPES, lookPatterns: LOOK_PATTERNS },
    tasteSoFar: entries.filter(e => e.ai).map(e => ({ name: nameOf(e), verdict: currentOverall(e), style: e.ai.style, profile: e.ai.profile })),
    wantRecommendations: recsWanted,
    cheeses: waiting.map(e => ({
      id: e.id, name: e.name || null, shop: e.shop || null, priceEur: e.priceEur, weightG: e.weightG,
      verdict: e.r, eatenWith: e.eaten, note: e.note || null, photos: e.photos || {},
    })),
  };
}

const isNum = (v, lo, hi) => typeof v === 'number' && !isNaN(v) && v >= lo && v <= hi;

/** Checks an appraisal-result file. Returns the usable items plus readable problems. */
export function validateAppraisal(obj, entries) {
  const errors = [];
  if (!obj || obj.type !== 'appraisal-result' || !Array.isArray(obj.appraisals)) {
    return { ok: false, items: [], recs: [], errors: ['This is not an appraisal result file (type "appraisal-result" with an "appraisals" list).'] };
  }
  const items = [];
  obj.appraisals.forEach((a, i) => {
    const where = `Appraisal ${i + 1}`;
    if (!a || !a.id || !a.ai) { errors.push(`${where}: needs "id" and "ai".`); return; }
    if (!entries.some(e => e.id === a.id)) { errors.push(`${where}: no cheese with id ${a.id} in this cellar.`); return; }
    const ai = a.ai;
    if (ai.profile) for (const [k] of PROF) if (ai.profile[k] != null && !isNum(ai.profile[k], 0, 5)) { errors.push(`${where}: profile.${k} must be 0–5.`); return; }
    if (ai.cons != null && !isNum(ai.cons, 0, CONS.length - 1)) { errors.push(`${where}: cons must be 0–5.`); return; }
    if (ai.perKg != null && !isNum(ai.perKg, 0, 1000)) { errors.push(`${where}: perKg must be a number.`); return; }
    items.push(a);
  });
  const recs = Array.isArray(obj.recommendations) ? obj.recommendations.filter(r => r && r.name) : [];
  return { ok: items.length > 0 || recs.length > 0, items, recs, errors };
}

/** Adds the appraiser's notes. A name read from the photo fills in only when you left the name empty. */
export function applyAppraisal(entries, items) {
  const changed = [];
  items.forEach(a => {
    const e = entries.find(x => x.id === a.id);
    if (!e) return;
    e.ai = Object.assign({}, a.ai, { appraisedAt: new Date().toISOString() });
    if (!e.name && a.ai.name) e.name = a.ai.name;
    changed.push(e);
  });
  return changed;
}

/* ---------------- example cheeses (made up, clearly marked, removable) ---------------- */
export function exampleCheeses(now = Date.now()) {
  const d = n => new Date(now - n * 86400000).toISOString();
  return [
    { id: 'ex1', example: true, created: d(12), name: 'Comté AOP 18 months', shop: 'Edeka cheese counter', priceEur: 8.90, weightG: 250,
      r: { overall: 5, taste: 5, texture: 4, again: 'yes' }, eaten: ['Plain', 'Bread', 'Wine'], note: 'Crunchy crystals. Better at room temperature.', retastes: [],
      ai: { look: 'comte', canonical: 'Comté', style: 'Hard', milk: 'Cow (raw)', country: 'France', origin: 'Jura, France', age: '18 months', fat: '45 % i. Tr.', perKg: 35.60, perKgSrc: 'computed from your price and weight',
        profile: { nutty: 5, butter: 3, salt: 3, tang: 1, sharp: 3, funk: 2 }, cons: 4, texture: 'Firm, slightly flaky, with crystals that crunch',
        pairings: ['Walnuts', 'Apple', 'Dry white wine'], tryNext: ['Beaufort', 'Gruyère AOP 24 months'], blurb: 'Mountain cheese from big wheels; long ageing gives the roasted-nut depth.' } },
    { id: 'ex2', example: true, created: d(9), name: 'Gorgonzola Dolce DOP', shop: 'Rewe', priceEur: 3.49, weightG: 200,
      r: { overall: 4, taste: 4, texture: 5, again: 'yes' }, eaten: ['Bread', 'Fruit', 'Pumpkin'], note: 'Amazing on roasted pumpkin with honey.', retastes: [],
      ai: { look: 'gorgo', canonical: 'Gorgonzola Dolce', style: 'Blue', milk: 'Cow (pasteurised)', country: 'Italy', origin: 'Lombardy, Italy', age: '2–3 months', fat: '48 % i. Tr.', perKg: 17.45, perKgSrc: 'computed from your price and weight',
        profile: { nutty: 1, butter: 5, salt: 3, tang: 3, sharp: 2, funk: 4 }, cons: 1, texture: 'Spoonable, creamy, melts on the tongue',
        pairings: ['Pear', 'Honey', 'Walnuts'], tryNext: ['Bleu d’Auvergne', 'Gorgonzola Piccante'], blurb: 'The young, mild Gorgonzola, pierced so blue mould grows inside.' } },
    { id: 'ex3', example: true, created: d(7), name: 'Gouda extra aged (2 years)', shop: 'Lidl', priceEur: 2.79, weightG: 200,
      r: { overall: 4, taste: 5, texture: 3, again: 'yes' }, eaten: ['Plain', 'Crackers'], note: 'Caramel! A bit dry at the rind.',
      retastes: [{ date: d(1), overall: 5, note: 'Even better after a week in the fridge paper.' }],
      ai: { look: 'gouda', canonical: 'Gouda extra aged', style: 'Hard', milk: 'Cow (pasteurised)', country: 'Netherlands', origin: 'Netherlands', age: '~24 months', fat: '48 % i. Tr.', perKg: 13.95, perKgSrc: 'read from the label (Grundpreis)',
        profile: { nutty: 4, butter: 3, salt: 4, tang: 1, sharp: 3, funk: 1 }, cons: 5, texture: 'Dense, crumbly, crystalline',
        pairings: ['Dark beer', 'Apple', 'Mustard'], tryNext: ['Mimolette extra vieille', 'Parmigiano Reggiano 24 months'], blurb: 'Long-aged Gouda turns butterscotch-sweet.' } },
    { id: 'ex4', example: true, created: d(6), name: 'Gouda extra aged (2 years)', shop: 'Cheese shop Müller', priceEur: 6.20, weightG: 250, sameAs: 'ex3',
      r: { overall: 4, taste: 4, texture: 4, again: 'maybe' }, eaten: ['Plain'], note: 'Same as the Lidl one? Slightly creamier.', retastes: [],
      ai: { look: 'gouda', canonical: 'Gouda extra aged', style: 'Hard', milk: 'Cow (raw)', country: 'Netherlands', origin: 'North Holland', age: '~24 months', fat: '48 % i. Tr.', perKg: 24.80, perKgSrc: 'computed from your price and weight',
        profile: { nutty: 4, butter: 4, salt: 3, tang: 1, sharp: 2, funk: 1 }, cons: 5, texture: 'Dense with fine crystals',
        pairings: ['Dark beer', 'Apple'], tryNext: ['Old Gouda from raw milk (boerenkaas)'], blurb: 'Farmhouse version of the same style.' } },
    { id: 'ex5', example: true, created: d(4), name: 'Goat cheese log', shop: 'Aldi', priceEur: 1.99, weightG: 150,
      r: { overall: 2, taste: 2, texture: 3, again: 'no' }, eaten: ['Bread', 'Salad'], note: 'Too sour on its own. Maybe warmed on toast?', retastes: [],
      ai: { look: 'goat', canonical: 'Goat cheese log', style: 'Fresh', milk: 'Goat (pasteurised)', country: 'Germany', origin: 'Germany', age: '1–2 weeks', fat: '45 % i. Tr.', perKg: 13.27, perKgSrc: 'computed from your price and weight',
        profile: { nutty: 0, butter: 2, salt: 3, tang: 5, sharp: 2, funk: 2 }, cons: 0, texture: 'Moist, chalky core under a soft skin',
        pairings: ['Honey', 'Figs', 'Baked on toast'], tryNext: ['Sainte-Maure de Touraine'], blurb: 'Young goat cheese is lemony; warming it rounds off the sourness.' } },
    { id: 'ex6', example: true, created: d(2), name: 'Feta PDO', shop: 'Rewe', priceEur: 2.49, weightG: 200,
      r: { overall: 3, taste: 3, texture: 3, again: 'maybe' }, eaten: ['Salad', 'Pumpkin'], note: '', retastes: [], ai: null },
    { id: 'ex7', example: true, created: d(0), name: '', shop: 'Weekly market', priceEur: null, weightG: null,
      r: { overall: 4, taste: 4, texture: 4, again: 'yes' }, eaten: ['Plain'], note: 'Alpine-looking wheel, stall owner said 9 months. Did not catch the name.', retastes: [], ai: null },
  ];
}
