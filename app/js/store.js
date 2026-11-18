// All data lives in memory (it is small) and every change is written through to IndexedDB.
import * as db from './db.js';
import { exampleCheeses } from './logic/cheese.js';
import { pumpkinRound1 } from './data/pumpkinRound1.js';

export const S = { entries: [], rounds: [], meta: {} };
let onError = e => console.error(e);
export const setErrorHandler = f => { onError = f; };

const strip = o => JSON.parse(JSON.stringify(o));

export async function loadAll() {
  const [entries, rounds, meta] = await Promise.all([db.getAll('entries'), db.getAll('rounds'), db.getAll('meta')]);
  S.entries = entries; S.rounds = rounds;
  S.meta = Object.fromEntries(meta.map(m => [m.key, m.value]));
}

/** First start: example cheeses (removable) and the finished pumpkin round with its real results. */
export async function seedIfNeeded() {
  if (S.meta.seeded) return;
  for (const e of exampleCheeses()) await saveEntry(e);
  if (!S.rounds.some(r => r.id === 'pumpkin-round-1')) await saveRound(pumpkinRound1());
  await setMeta('seeded', new Date().toISOString());
}

export function saveEntry(e) {
  e.updatedAt = new Date().toISOString();
  const i = S.entries.findIndex(x => x.id === e.id);
  if (i < 0) S.entries.push(e); else S.entries[i] = e;
  return db.put('entries', strip(e)).catch(onError);
}
export function removeEntry(id) {
  S.entries = S.entries.filter(e => e.id !== id);
  return db.del('entries', id).catch(onError);
}

export function saveRound(r) {
  r.updatedAt = new Date().toISOString();
  const i = S.rounds.findIndex(x => x.id === r.id);
  if (i < 0) S.rounds.push(r); else S.rounds[i] = r;
  return db.put('rounds', strip(r)).catch(onError);
}
const timers = {};
/** For typing in notes: write at most every 400 ms. */
export function saveRoundSoon(r) {
  clearTimeout(timers[r.id]);
  timers[r.id] = setTimeout(() => saveRound(r), 400);
}
export function removeRound(id) {
  S.rounds = S.rounds.filter(r => r.id !== id);
  return db.del('rounds', id).catch(onError);
}

export function setMeta(key, value) {
  S.meta[key] = value;
  return db.put('meta', { key, value: strip(value) }).catch(onError);
}

/** Full backup: everything, photos included. */
export function backup() {
  return { app: 'tasting-ledger', type: 'backup', version: 1, exported: new Date().toISOString(), entries: S.entries, rounds: S.rounds, meta: S.meta };
}

/** Restores a backup by id: records in the file replace the ones with the same id, others stay. */
export async function restore(b) {
  if (!b || b.type !== 'backup' || !Array.isArray(b.entries) || !Array.isArray(b.rounds)) throw new Error('This is not a Tasting Ledger backup file.');
  for (const e of b.entries) await saveEntry(e);
  for (const r of b.rounds) await saveRound(r);
  for (const [k, v] of Object.entries(b.meta || {})) await setMeta(k, v);
  return { entries: b.entries.length, rounds: b.rounds.length };
}
