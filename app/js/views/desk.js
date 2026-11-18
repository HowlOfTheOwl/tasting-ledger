// Appraiser's desk: hand the waiting cheeses to Claude and take the notes back, plus backups and storage.
import { app } from '../app.js';
import { S, saveEntry, setMeta, backup, restore } from '../store.js';
import { esc } from '../logic/util.js';
import { buildAppraisalRequest, validateAppraisal, applyAppraisal, nameOf } from '../logic/cheese.js';
import { OWL } from '../sprites.js';

export const APP_VERSION = '1.0.0';
const ui = app.ui;
ui.storage = null;

export function deskView() {
  const waiting = S.entries.filter(e => !e.ai && !e.example);
  const last = S.meta.lastAppraisal;
  if (!ui.storage) checkStorage();
  return `
  <section class="panel" aria-labelledby="h-desk">
    <div class="ai-head">${OWL}<div><h2 id="h-desk">Appraiser’s desk</h2>
      <p class="lead">${waiting.length ? `${waiting.length} ${waiting.length === 1 ? 'cheese is' : 'cheeses are'} waiting.` : 'Nothing waiting. Every cheese has its notes.'}${S.entries.some(e => e.example && !e.ai) ? ' Example cheeses are never sent.' : ''}${last ? ' Last appraisal: ' + new Date(last).toLocaleDateString('en-GB') + '.' : ''}</p></div></div>
    <ol class="steps">
      <li><b>Export</b> the waiting cheeses (photos included) and send the file to your computer, e.g. via Google Drive.</li>
      <li>Open the <b>tasting-ledger</b> folder in Claude Code and say: <i>“Appraise appraisal-request-….json”</i>. Claude reads the photos and labels and writes an <b>appraisal-result</b> file.</li>
      <li>Get that file onto the phone and <b>import</b> it here. The notes, price per kg and the Ledger charts fill in.</li>
    </ol>
    ${waiting.length ? `<ul class="mini plain">${waiting.map(e => `<li><span>${esc(nameOf(e))}<small>${esc(e.shop || '')}</small></span></li>`).join('')}</ul>` : ''}
    <div class="actions wrap">
      <button class="btn" type="button" data-act="export-appraisal" data-how="share" ${waiting.length ? '' : 'disabled'}>Share request</button>
      <button class="btn-small" type="button" data-act="export-appraisal" data-how="save" ${waiting.length ? '' : 'disabled'}>Save as file</button>
    </div>
    <label class="btn go file-btn" for="imp-appraisal">Import appraisal result<input id="imp-appraisal" type="file" accept=".json,application/json" data-ch="import-appraisal"></label>
    <p class="status" id="imp-status" aria-live="polite">${esc(ui.importMsg || '')}</p>
  </section>
  <section class="panel" aria-labelledby="h-backup">
    <div class="blk"><h2 id="h-backup">Backup</h2>
      <p class="lead">Everything lives only on this phone. Save a backup now and then (photos included), for example to Google Drive. Restoring adds the backup’s cheeses and rounds and replaces the ones with the same id.</p></div>
    <div class="actions wrap">
      <button class="btn" type="button" data-act="export-backup" data-how="share">Share backup</button>
      <button class="btn-small" type="button" data-act="export-backup" data-how="save">Save as file</button>
    </div>
    <label class="btn-small file-btn" for="imp-backup">Restore from a backup<input id="imp-backup" type="file" accept=".json,application/json" data-ch="import-backup"></label>
    <p class="lead">${S.meta.lastBackup ? 'Last backup: ' + new Date(S.meta.lastBackup).toLocaleDateString('en-GB') : 'No backup yet.'}</p>
  </section>
  <section class="panel" aria-labelledby="h-store">
    <div class="blk"><h2 id="h-store">Storage</h2>
      <dl class="kv">
        <dt>Used</dt><dd>${ui.storage ? ui.storage.used : '…'}</dd>
        <dt>Protected</dt><dd>${ui.storage ? (ui.storage.persisted ? 'Yes, the phone will not clear it on its own' : 'Not yet') : '…'}</dd>
        <dt>Cheeses</dt><dd>${S.entries.length} (${S.entries.filter(e => e.photos && e.photos.front).length} with photos)</dd>
        <dt>Rounds</dt><dd>${S.rounds.length}</dd>
        <dt>Version</dt><dd>${APP_VERSION}</dd>
      </dl>
      ${ui.storage && !ui.storage.persisted ? '<div class="actions"><span></span><button class="btn-small" type="button" data-act="persist">Protect my data</button></div>' : ''}
    </div>
  </section>`;
}

async function checkStorage() {
  let used = 'unknown', persisted = false;
  try { if (navigator.storage && navigator.storage.estimate) { const e = await navigator.storage.estimate(); used = (e.usage / 1048576).toFixed(1) + ' MB'; } } catch { /* not available */ }
  try { if (navigator.storage && navigator.storage.persisted) persisted = await navigator.storage.persisted(); } catch { /* not available */ }
  ui.storage = { used, persisted };
  if (location.hash === '#desk') app.rerender();
}
app.actions['persist'] = async () => {
  let ok = false;
  try { ok = await navigator.storage.persist(); } catch { /* not available */ }
  app.toast(ok ? 'Protected.' : 'The browser said no. Installing the app to the home screen usually fixes this.');
  ui.storage = null; app.rerender();
};

/** Hands a JSON file to the Android share sheet, or saves it as a download. */
async function deliver(obj, filename, how) {
  const blob = new Blob([JSON.stringify(obj)], { type: 'application/json' });
  if (how === 'share') {
    const file = new File([blob], filename, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: filename }); return true; }
      catch (e) { if (e && e.name === 'AbortError') return false; }
    } else app.toast('Sharing files is not available here, saving instead.');
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return true;
}
const stamp = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');

app.actions['export-appraisal'] = async el => {
  const req = buildAppraisalRequest(S.entries);
  if (!req.cheeses.length) return app.toast('No cheeses waiting.');
  if (await deliver(req, `appraisal-request-${stamp()}.json`, el.dataset.how)) app.toast(`Exported ${req.cheeses.length} cheeses.`);
};
app.actions['export-backup'] = async el => {
  if (await deliver(backup(), `tasting-ledger-backup-${stamp()}.json`, el.dataset.how)) { await setMeta('lastBackup', new Date().toISOString()); app.rerender(); }
};

async function readJSON(el) {
  const f = el.files && el.files[0]; el.value = '';
  if (!f) return null;
  try { return JSON.parse(await f.text()); } catch { app.toast('That file is not readable JSON.'); return null; }
}
app.changes['import-appraisal'] = async el => {
  const obj = await readJSON(el); if (!obj) return;
  const res = validateAppraisal(obj, S.entries);
  if (!res.ok) { ui.importMsg = res.errors.join(' '); app.rerender(); return; }
  const changed = applyAppraisal(S.entries, res.items);
  for (const e of changed) await saveEntry(e);
  if (res.recs.length) await setMeta('recs', res.recs);
  await setMeta('lastAppraisal', new Date().toISOString());
  ui.importMsg = `Appraised ${changed.length} ${changed.length === 1 ? 'cheese' : 'cheeses'}${res.recs.length ? `, ${res.recs.length} recommendations` : ''}.` + (res.errors.length ? ' Skipped: ' + res.errors.join(' ') : '');
  app.rerender();
};
app.changes['import-backup'] = async el => {
  const obj = await readJSON(el); if (!obj) return;
  try { const n = await restore(obj); app.toast(`Restored ${n.entries} cheeses and ${n.rounds} rounds.`); app.rerender(); }
  catch (e) { app.toast(e.message); }
};
