// Tiny IndexedDB wrapper. Three stores: entries (cellar cheeses, photos included), rounds (tastings), meta (key/value).
// IndexedDB keeps far more than localStorage, so photos fit.
const NAME = 'tasting-ledger', VERSION = 1;
let dbp = null;

function open() {
  if (!dbp) dbp = new Promise((res, rej) => {
    const r = indexedDB.open(NAME, VERSION);
    r.onupgradeneeded = () => {
      const d = r.result;
      if (!d.objectStoreNames.contains('entries')) d.createObjectStore('entries', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('rounds')) d.createObjectStore('rounds', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta', { keyPath: 'key' });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}

function run(store, mode, fn) {
  return open().then(d => new Promise((res, rej) => {
    const t = d.transaction(store, mode);
    const req = fn(t.objectStore(store));
    t.oncomplete = () => res(req ? req.result : undefined);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error || new Error('Transaction aborted'));
  }));
}

export const getAll = store => run(store, 'readonly', s => s.getAll());
export const put = (store, obj) => run(store, 'readwrite', s => s.put(obj));
export const del = (store, id) => run(store, 'readwrite', s => s.delete(id));
export const clear = store => run(store, 'readwrite', s => s.clear());
