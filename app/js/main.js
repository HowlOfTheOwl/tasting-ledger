// Boot, routing and event wiring. Routes live in the URL hash (#cellar, #entry/<id>, #round/<id>, …),
// so the phone's back gesture works as expected.
import { app } from './app.js';
import { loadAll, seedIfNeeded, setErrorHandler } from './store.js';
import { startScene } from './scene.js';
import { cellarView, entryView, formView } from './views/cellar.js';
import { roundsView, roundView, newRoundView } from './views/rounds.js';
import { ledgerView } from './views/ledger.js';
import { deskView } from './views/desk.js';

const ROUTES = {
  cellar: { tab: 'cellar', hero: 'THE CHEESE CELLAR', view: () => cellarView() },
  entry: { tab: 'cellar', view: a => entryView(a) },
  add: { tab: 'cellar', view: () => formView('add') },
  edit: { tab: 'cellar', view: a => formView('edit', a) },
  again: { tab: 'cellar', view: a => formView('again', a) },
  rounds: { tab: 'rounds', hero: 'TASTING ROUNDS', view: () => roundsView() },
  round: { tab: 'rounds', view: a => roundView(a) },
  'new-round': { tab: 'rounds', view: a => newRoundView(a) },
  ledger: { tab: 'ledger', hero: 'THE LEDGER', view: () => ledgerView() },
  desk: { tab: 'desk', hero: 'APPRAISER’S DESK', view: () => deskView() },
};

const view = document.getElementById('view');
const hero = document.getElementById('hero');

function parse() {
  const h = decodeURIComponent(location.hash.slice(1));
  const i = h.indexOf('/');
  const name = i < 0 ? h : h.slice(0, i), arg = i < 0 ? '' : h.slice(i + 1);
  return ROUTES[name] ? { name, arg } : { name: 'cellar', arg: '' };
}

app.render = () => {
  const { name, arg } = parse(), R = ROUTES[name];
  app.ui.route = name; app.ui.routeArg = arg;
  hero.hidden = !R.hero;
  if (R.hero) document.getElementById('sign-sub').textContent = R.hero;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.tab === R.tab));
  view.innerHTML = R.view(arg);
};
/** Re-draws the current screen but keeps the scroll position and the focused field. */
app.rerender = () => {
  const y = window.scrollY, f = document.activeElement && document.activeElement.id;
  app.render();
  window.scrollTo({ top: y, behavior: 'instant' });
  if (f && /^(f-|nr-|rt-)/.test(f)) { const el = document.getElementById(f); if (el) el.focus({ preventScroll: true }); }
};
app.go = h => {
  if (location.hash === h) { app.render(); window.scrollTo({ top: 0, behavior: 'instant' }); } else location.hash = h;
};
let toastT = 0;
app.toast = msg => {
  const t = document.getElementById('toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2800);
};

window.addEventListener('hashchange', () => { app.render(); window.scrollTo({ top: 0, behavior: 'instant' }); });
document.addEventListener('click', ev => {
  const go = ev.target.closest('[data-go]');
  if (go) { app.go(go.dataset.go); return; }
  const a = ev.target.closest('[data-act]');
  if (a && !a.disabled && app.actions[a.dataset.act]) app.actions[a.dataset.act](a, ev);
});
document.addEventListener('input', ev => { const el = ev.target; if (el.dataset && el.dataset.in && app.inputs[el.dataset.in]) app.inputs[el.dataset.in](el, ev); });
document.addEventListener('change', ev => { const el = ev.target; if (el.dataset && el.dataset.ch && app.changes[el.dataset.ch]) app.changes[el.dataset.ch](el, ev); });

setErrorHandler(e => { console.error(e); app.toast('Could not save: ' + (e && e.message ? e.message : 'storage error')); });

(async function boot() {
  startScene(document.getElementById('scene'));
  try {
    await loadAll();
    await seedIfNeeded();
  } catch (e) {
    console.error(e);
    view.innerHTML = '<section class="panel"><h2>The cellar door is stuck</h2><p class="lead">This browser would not open its storage (private mode?). Open the app normally and try again.</p></section>';
    return;
  }
  app.render();
  // Ask the browser to keep our data even when the phone runs low on space (silently granted for installed apps).
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch { /* not available */ }
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('./sw.js').catch(e => console.warn('Service worker not registered', e));
  }
})();
