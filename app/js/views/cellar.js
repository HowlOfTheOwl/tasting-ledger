// Cellar: the list of cheeses, the add/edit form and the entry page.
import { app } from '../app.js';
import { S, saveEntry, removeEntry } from '../store.js';
import { esc, fmtEur, fmtDate, fmtDelta, uid } from '../logic/util.js';
import { VERDICT, TASTE_W, TEXT_W, AGAIN, EATEN, PROF, CONS, STYLES, TIER_W, tierOf, perKgOf, nameOf, currentOverall, groupKey } from '../logic/cheese.js';
import { vsBaseline, sampleAvg } from '../logic/rounds.js';
import { cheeseSprite, imgOf, wedges, coins, WEDGE, OWL, CAM } from '../sprites.js';

const ui = app.ui;
Object.assign(ui, { filter: 'All', sort: 'new', photoTab: 'front', draft: null, draftKey: null, armed: null, retaste: null });

/* ---------------- shared bits ---------------- */
export const lookOf = e => (e.ai && e.ai.look) || 'unknown';
export function thumbHTML(e, w) {
  return e.photos && e.photos.front ? `<img class="photo" src="${e.photos.front}" alt="">` : imgOf(cheeseSprite(lookOf(e)), w);
}
const byId = id => S.entries.find(e => e.id === id);

/* ---------------- list ---------------- */
export function cellarView() {
  const all = S.entries;
  const rated = all.map(currentOverall).filter(Boolean);
  const avg = rated.length ? rated.reduce((a, b) => a + b, 0) / rated.length : 0;
  const pend = all.filter(e => !e.ai).length;
  let list = all.slice();
  if (ui.filter === 'Awaiting') list = list.filter(e => !e.ai);
  else if (ui.filter !== 'All') list = list.filter(e => e.ai && e.ai.style === ui.filter);
  if (ui.sort === 'new') list.sort((a, b) => b.created.localeCompare(a.created));
  if (ui.sort === 'best') list.sort((a, b) => currentOverall(b) - currentOverall(a));
  if (ui.sort === 'cheap') list.sort((a, b) => (perKgOf(a) ?? 1e9) - (perKgOf(b) ?? 1e9));
  const hasEx = all.some(e => e.example);
  return `
  ${hasEx ? `<div class="examples"><span><b>Example cheeses.</b> Made up, to show how the cellar fills up.</span><button class="btn-small" type="button" data-act="clear-examples">Clear examples</button></div>` : ''}
  <section class="panel" aria-labelledby="h-cellar">
    <div class="blk">
      <h2 id="h-cellar">The Cellar</h2>
      <div class="tally">
        <div><b>${all.length}</b><span>cheeses logged</span></div>
        <div><b>${avg ? avg.toFixed(1) : '–'}</b><span>average verdict</span></div>
        <div><b>${pend}</b><span>waiting for the appraiser</span></div>
      </div>
    </div>
    <div class="blk">
      <div class="chips" role="group" aria-label="Filter">
        ${['All', ...STYLES, 'Awaiting'].map(f => `<button class="chip ${ui.filter === f ? 'on' : ''}" type="button" data-act="filter" data-v="${f}">${f}</button>`).join('')}
      </div>
      <div class="sortrow"><span class="lead">${list.length} shown</span>
        <div class="seg" role="group" aria-label="Sort">
          ${[['new', 'Newest'], ['best', 'Best'], ['cheap', '€/kg']].map(([k, l]) => `<button type="button" data-act="sort" data-v="${k}" class="${ui.sort === k ? 'on' : ''}">${l}</button>`).join('')}
        </div></div>
    </div>
    ${list.length ? `<ul class="list">${list.map(rowHTML).join('')}</ul>` :
      `<div class="empty">${imgOf(cheeseSprite('unknown'), 84)}<p class="lead">${all.length ? 'Nothing on this shelf yet.' : 'The cellar is empty. Tap the big cheese button to log your first one.'}</p></div>`}
  </section>`;
}
function rowHTML(e) {
  const t = tierOf(perKgOf(e)), n = (e.retastes || []).length;
  const sub = [e.shop, fmtDate(e.created), n ? `tasted ${n + 1}×` : ''].filter(Boolean).join(' · ');
  return `<li><button class="row" type="button" data-go="#entry/${e.id}">
    <span class="thumb">${thumbHTML(e, 52)}</span>
    <span class="rmain">
      <span class="rname ${e.name || (e.ai && e.ai.name) ? '' : 'unk'}">${esc(nameOf(e))}</span>
      <span class="rsub">${esc(sub)}</span>
      <span class="rmeta">${e.ai ? `<span class="tag style">${esc(e.ai.style || 'Appraised')}</span>` : `<span class="tag wait">Awaiting appraisal</span>`}${t ? coins(t) : ''}</span>
    </span>
    <span class="score">${currentOverall(e) || '–'}<small>/5</small></span>
  </button></li>`;
}

app.actions['filter'] = el => { ui.filter = el.dataset.v; app.rerender(); };
app.actions['sort'] = el => { ui.sort = el.dataset.v; app.rerender(); };
app.actions['clear-examples'] = async () => {
  for (const e of S.entries.filter(x => x.example)) await removeEntry(e.id);
  app.render(); app.toast('Examples cleared. The cellar is yours.');
};

/* ---------------- add / edit / bought again ---------------- */
function blankDraft() { return { id: null, sameAs: null, name: '', shop: '', priceEur: '', weightG: '', photos: {}, r: { overall: 0, taste: 0, texture: 0, again: '' }, eaten: [], note: '' }; }
function draftFrom(e) {
  return { id: e.id, sameAs: e.sameAs || null, name: e.name || '', shop: e.shop || '', priceEur: e.priceEur ?? '', weightG: e.weightG ?? '',
    photos: Object.assign({}, e.photos || {}), r: Object.assign({}, e.r), eaten: (e.eaten || []).slice(), note: e.note || '' };
}
/** mode: 'add' | 'edit' | 'again' (same cheese, bought somewhere else) */
export function formView(mode, id) {
  const key = mode + ':' + (id || '');
  if (ui.draftKey !== key) {
    const src = id && byId(id);
    if ((mode === 'edit' || mode === 'again') && !src) return '<p class="panel">That cheese is not in the cellar any more.</p>';
    ui.draft = mode === 'edit' ? draftFrom(src) : blankDraft();
    if (mode === 'again') { ui.draft.name = nameOf(src) === 'Unnamed cheese' ? '' : nameOf(src); ui.draft.sameAs = src.sameAs || src.id; }
    ui.draftKey = key;
  }
  const D = ui.draft;
  const kg = D.priceEur && D.weightG ? D.priceEur / D.weightG * 1000 : null;
  const title = mode === 'edit' ? 'Edit entry' : mode === 'again' ? 'Bought it again' : 'New cheese';
  const back = mode === 'add' ? '#cellar' : '#entry/' + id;
  return `
  <button class="back" type="button" data-go="${back}">◂ Back</button>
  <section class="panel" aria-labelledby="h-add">
    <div class="blk">
      <h2 id="h-add">${title}</h2>
      <p class="lead">${mode === 'again'
        ? `Same cheese, different shop or day. It is linked to <b>${esc(nameOf(byId(D.sameAs) || {}))}</b> so the Ledger can compare them.`
        : 'Snap the pack, give your verdict, done. Name, price per kg and the tasting notes can be filled in later by the appraiser.'}</p>
    </div>
    <div class="blk">
      <h3>Photos <small>front + price label</small></h3>
      <div class="shots">${shotHTML('front', 'Front', 'the cheese or pack')}${shotHTML('label', 'Label', 'price, weight, €/kg')}</div>
    </div>
    <div class="blk">
      <div class="field"><label for="f-name">Name</label><input id="f-name" type="text" data-in="draft" data-f="name" value="${esc(D.name)}" placeholder="Optional: read from the photo later" autocomplete="off"></div>
      <div class="field"><label for="f-shop">Where from</label><input id="f-shop" type="text" data-in="draft" data-f="shop" list="shops" value="${esc(D.shop)}" placeholder="e.g. Rewe, weekly market" autocomplete="off">
        <datalist id="shops">${[...new Set(S.entries.map(e => e.shop).filter(Boolean))].map(s => `<option value="${esc(s)}">`).join('')}</datalist></div>
      <div class="two">
        <div class="field"><label for="f-price">Paid €</label><input id="f-price" type="number" inputmode="decimal" step="0.01" min="0" data-in="draft" data-f="priceEur" value="${esc(D.priceEur)}" placeholder="3.49"></div>
        <div class="field"><label for="f-weight">Weight g</label><input id="f-weight" type="number" inputmode="numeric" step="1" min="0" data-in="draft" data-f="weightG" value="${esc(D.weightG)}" placeholder="200"></div>
      </div>
      <div class="perkg" id="perkg">${perKgLine(kg)}</div>
    </div>
    <div class="blk">
      <h3>Your verdict</h3>
      ${pipRow('overall', 'Overall', VERDICT, D.r.overall)}
      ${pipRow('taste', 'Taste', TASTE_W, D.r.taste)}
      ${pipRow('texture', 'Texture', TEXT_W, D.r.texture)}
      <div class="rate"><span class="rl"><span>Buy again?</span></span>
        <span class="seg again" role="group" aria-label="Buy again">${AGAIN.map(([k, l]) => `<button type="button" data-act="draft-again" data-v="${k}" class="${D.r.again === k ? 'on' : ''}">${l}</button>`).join('')}</span></div>
    </div>
    <div class="blk">
      <h3>Eaten with</h3>
      <div class="chips">${EATEN.map(t => `<button type="button" class="chip ${D.eaten.includes(t) ? 'on' : ''}" data-act="draft-eat" data-v="${t}">${t}</button>`).join('')}</div>
    </div>
    <div class="blk">
      <div class="field"><label for="f-note">Notes</label><textarea id="f-note" data-in="draft" data-f="note" placeholder="Smell, rind, what it reminded you of…">${esc(D.note)}</textarea></div>
    </div>
    <div class="blk">
      <p class="err" id="err" aria-live="polite"></p>
      <div class="actions">
        <button class="btn-small" type="button" data-go="${back}">Cancel</button>
        <button class="btn go" type="button" data-act="draft-save" data-mode="${mode}">${mode === 'edit' ? 'Save changes' : 'Add to the cellar'}</button>
      </div>
    </div>
  </section>`;
}
export function pipRow(key, label, words, v, act = 'draft-rate') {
  return `<div class="rate"><span class="rl"><span>${label}</span><em class="${v ? 'set' : ''}">${v ? words[v] : 'tap to rate'}</em></span>
    <span class="pips ${key === 'overall' ? '' : 'small'}" role="radiogroup" aria-label="${label}">${[1, 2, 3, 4, 5].map(i =>
      `<button type="button" class="pip ${i <= v ? 'on' : ''}" data-act="${act}" data-k="${key}" data-v="${i}" role="radio" aria-checked="${i === v}" aria-label="${i}: ${words[i]}">${WEDGE}</button>`).join('')}</span></div>`;
}
function shotHTML(slot, title, hint) {
  const src = ui.draft.photos[slot];
  return `<div class="shot-wrap"><label class="shot ${src ? 'has' : ''}" for="ph-${slot}">${src ? `<img src="${src}" alt="${title} photo">` : `<span class="cam">${CAM}<span>${title}</span><em>${hint}</em></span>`}
    <input id="ph-${slot}" type="file" accept="image/*" data-ch="photo" data-slot="${slot}" aria-label="${title} photo"></label>
    ${src ? `<button type="button" class="btn-small" data-act="draft-photo-x" data-v="${slot}">Remove</button>` : ''}</div>`;
}
function perKgLine(kg) {
  return kg ? `<span>Price per kg</span><span><b>${fmtEur(kg)}</b> ${coins(tierOf(kg))}</span>`
    : `<span class="lead">No price yet? The appraiser reads it from the label photo.</span>`;
}

app.actions['draft-rate'] = el => { const k = el.dataset.k, v = +el.dataset.v; ui.draft.r[k] = ui.draft.r[k] === v ? 0 : v; app.rerender(); };
app.actions['draft-again'] = el => { ui.draft.r.again = ui.draft.r.again === el.dataset.v ? '' : el.dataset.v; app.rerender(); };
app.actions['draft-eat'] = el => { const a = ui.draft.eaten, i = a.indexOf(el.dataset.v); i < 0 ? a.push(el.dataset.v) : a.splice(i, 1); app.rerender(); };
app.actions['draft-photo-x'] = el => { delete ui.draft.photos[el.dataset.v]; app.rerender(); };
app.inputs['draft'] = el => {
  const k = el.dataset.f, D = ui.draft; if (!D) return;
  D[k] = (k === 'priceEur' || k === 'weightG') ? (el.value === '' ? '' : parseFloat(el.value.replace(',', '.'))) : el.value;
  if (k === 'priceEur' || k === 'weightG') document.getElementById('perkg').innerHTML = perKgLine(D.priceEur && D.weightG ? D.priceEur / D.weightG * 1000 : null);
};
app.changes['photo'] = async el => {
  if (!el.files || !el.files[0]) return;
  try { ui.draft.photos[el.dataset.slot] = await shrink(el.files[0]); app.rerender(); }
  catch { app.toast('Could not read that photo. Try another one.'); }
};
/** Scales a camera photo down to 1000 px on the long side (about 100–200 kB) before storing it. */
function shrink(file, max = 1000) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('bad image')); };
    img.src = url;
  });
}
app.actions['draft-save'] = async el => {
  const D = ui.draft, err = document.getElementById('err');
  if (!D.photos.front && !D.name.trim()) { err.textContent = 'Add a front photo or a name, so you can find it again.'; return; }
  if (!D.r.overall) { err.textContent = 'Give it an overall verdict (the top row of wedges).'; return; }
  const num = v => (v === '' || v == null || isNaN(v) ? null : +v);
  const rec = { name: D.name.trim(), shop: D.shop.trim(), priceEur: num(D.priceEur), weightG: num(D.weightG), photos: D.photos, r: D.r, eaten: D.eaten, note: D.note.trim() };
  if (el.dataset.mode === 'edit') {
    const e = byId(D.id); Object.assign(e, rec); await saveEntry(e);
    ui.draftKey = null; app.go('#entry/' + e.id); app.toast('Saved.');
  } else {
    const e = Object.assign({ id: uid(), kind: 'cheese', created: new Date().toISOString(), retastes: [], ai: null, sameAs: D.sameAs || undefined }, rec);
    await saveEntry(e);
    ui.draftKey = null; ui.filter = 'All'; ui.sort = 'new';
    app.go('#cellar'); app.toast('In the cellar. Waiting for the appraiser.');
  }
};

/* ---------------- entry page ---------------- */
export function entryView(id) {
  const e = byId(id);
  if (!e) return `<button class="back" type="button" data-go="#cellar">◂ Cellar</button><section class="panel"><p class="lead">This cheese is not in the cellar any more.</p></section>`;
  const kg = perKgOf(e), t = tierOf(kg), A = e.ai;
  const both = e.photos && e.photos.front && e.photos.label;
  const shown = (e.photos && (e.photos[ui.photoTab] || e.photos.front || e.photos.label)) || null;
  const siblings = S.entries.filter(x => x.id !== e.id && groupKey(x, S.entries) === groupKey(e, S.entries));
  const used = roundsUsing(e.id);
  const cur = currentOverall(e), rt = e.retastes || [];
  return `
  <button class="back" type="button" data-go="#cellar">◂ Cellar</button>
  <section class="panel" aria-labelledby="h-det">
    <div class="photo-big">${shown ? `<img class="photo" src="${shown}" alt="">` : imgOf(cheeseSprite(lookOf(e)), 200)}
      ${both ? `<div class="photo-tabs seg">${['front', 'label'].map(k => `<button type="button" data-act="ptab" data-v="${k}" class="${ui.photoTab === k ? 'on' : ''}">${k === 'front' ? 'Front' : 'Label'}</button>`).join('')}</div>` : ''}
      ${!shown ? `<span class="note">${e.example ? 'Example: no photo' : 'No photo'}</span>` : ''}
    </div>
    <div class="dhead">
      <h2 id="h-det">${esc(nameOf(e))}</h2>
      <p class="sub">${esc([A && A.style, A && A.milk, A && A.origin].filter(Boolean).join(' · ') || 'Not appraised yet')}</p>
      <p class="sub">${esc([e.shop, fmtDate(e.created)].filter(Boolean).join(' · '))}</p>
    </div>
    <div class="blk">
      <h3>Your verdict ${rt.length ? `<small>latest of ${rt.length + 1} tastings</small>` : ''}</h3>
      <div class="verdict"><div class="vbadge"><b>${cur || '–'}</b><span>of 5</span></div>
        <div><div class="vword">${VERDICT[cur]}</div>${wedges(cur)}</div></div>
      <dl class="kv">
        <dt>Taste</dt><dd>${e.r.taste ? wedges(e.r.taste) + ' ' + TASTE_W[e.r.taste] : '–'}</dd>
        <dt>Texture</dt><dd>${e.r.texture ? wedges(e.r.texture) + ' ' + TEXT_W[e.r.texture] : '–'}</dd>
        <dt>Buy again</dt><dd>${e.r.again ? AGAIN.find(a => a[0] === e.r.again)[1] : '–'}</dd>
        ${e.priceEur ? `<dt>Paid</dt><dd>${fmtEur(e.priceEur)}${e.weightG ? ` for ${e.weightG} g` : ''}</dd>` : ''}
      </dl>
      ${e.eaten && e.eaten.length ? `<div class="pills">${e.eaten.map(x => `<span class="pill">${esc(x)}</span>`).join('')}</div>` : ''}
      ${e.note ? `<p class="quote">${esc(e.note)}</p>` : ''}
    </div>
    <div class="blk">
      <h3>Tasting history <small>cheese changes in the fridge</small></h3>
      <ol class="timeline">
        <li><span class="tl-d">${fmtDate(e.created)}</span><span class="tl-v">${e.r.overall || '–'}</span><span class="tl-n">First tasting</span></li>
        ${rt.map(x => `<li><span class="tl-d">${fmtDate(x.date)}</span><span class="tl-v">${x.overall}</span><span class="tl-n">${esc(x.note || '')}</span></li>`).join('')}
      </ol>
      ${ui.retaste === e.id ? `<div class="retaste">
          ${pipRow('overall', 'Today', VERDICT, ui.retasteV || 0, 'retaste-rate')}
          <div class="field"><label for="rt-note">What changed?</label><input id="rt-note" type="text" data-in="retaste" value="${esc(ui.retasteNote || '')}" placeholder="e.g. firmer, more ammonia, saltier" autocomplete="off"></div>
          <div class="actions"><button class="btn-small" type="button" data-act="retaste-cancel">Cancel</button><button class="btn go" type="button" data-act="retaste-save">Save tasting</button></div>
        </div>` : `<div class="actions"><button class="btn" type="button" data-act="retaste-open">Taste again</button><button class="btn-small" type="button" data-go="#again/${e.id}">Bought it elsewhere</button></div>`}
    </div>
    ${siblings.length ? `<div class="blk"><h3>Same cheese, other purchases</h3>
      <ul class="mini">${[e, ...siblings].sort((a, b) => (perKgOf(a) ?? 1e9) - (perKgOf(b) ?? 1e9)).map(x => `<li class="${x.id === e.id ? 'me' : ''}"><button type="button" data-go="#entry/${x.id}">
        <span>${esc(x.shop || 'Unknown shop')}<small>${fmtDate(x.created)}</small></span><span>${perKgOf(x) ? fmtEur(perKgOf(x)) + '/kg' : '–'}</span><b>${currentOverall(x) || '–'}</b></button></li>`).join('')}</ul></div>` : ''}
    ${used.length ? `<div class="blk"><h3>Used in tasting rounds</h3><ul class="mini">${used.map(u => `<li><button type="button" data-go="#round/${u.round.id}"><span>${esc(u.round.title)}<small>${esc(u.what)}</small></span><b>${esc(u.score)}</b></button></li>`).join('')}</ul></div>` : ''}
    <div class="blk">
      <h3>Appraiser’s notes <small>${A ? 'filled in by AI' : 'not yet'}</small></h3>
      ${A ? aiHTML(e, kg, t) : pendingHTML(e)}
    </div>
    <div class="blk">
      <div class="actions">
        <button class="btn-ghost ${ui.armed === e.id ? 'armed' : ''}" type="button" data-act="entry-del" data-v="${e.id}">${ui.armed === e.id ? 'Tap again to delete' : 'Delete'}</button>
        <button class="btn" type="button" data-go="#edit/${e.id}">Edit</button>
      </div>
    </div>
  </section>`;
}
function roundsUsing(id) {
  const out = [];
  S.rounds.forEach(r => {
    const vb = vsBaseline(r);
    r.conds.forEach(c => { if (c.cheeseId === id) { const e = vb.find(x => x.cond.id === c.id); out.push({ round: r, what: `as the bite “${c.label}”, against ${r.conds[0].label}`, score: e && e.n ? fmtDelta(e.d) : '–' }); } });
    r.samples.forEach(s => { if (s.cheeseId === id) { const a = sampleAvg(r, s.id); out.push({ round: r, what: 'as a sample, mean score', score: a.n ? a.avg.toFixed(1) : '–' }); } });
  });
  return out;
}
function aiHTML(e, kg, t) {
  const A = e.ai, P = A.profile || {};
  return `<div class="ai">
    <div class="ai-head">${OWL}<p><b>${esc([A.style, A.milk].filter(Boolean).join(' · '))}</b>${esc(A.blurb || '')}</p></div>
    <div class="price-line"><span><small>Price per kg</small><b>${kg ? fmtEur(kg) : '–'}</b><small>${esc(A.perKgSrc || '')}</small></span><span class="tier">${coins(t, true)}<small>${TIER_W[t]}</small></span></div>
    <dl class="kv">${A.origin ? `<dt>Origin</dt><dd>${esc(A.origin)}</dd>` : ''}${A.age ? `<dt>Aged</dt><dd>${esc(A.age)}</dd>` : ''}${A.fat ? `<dt>Fat</dt><dd>${esc(A.fat)}</dd>` : ''}</dl>
    <div class="prof" aria-label="Taste profile"><span class="flabel">Taste profile</span>
      ${PROF.map(([k, l]) => { const v = P[k] || 0; return `<div class="prow"><span>${l}</span><i>${[1, 2, 3, 4, 5].map(i => `<u class="${i <= v ? 'on' : ''}"></u>`).join('')}</i><b>${v}</b></div>`; }).join('')}
    </div>
    ${A.cons != null ? `<div class="cons"><span class="flabel">Consistency</span>
      <div class="cons-track">${CONS.map((c, i) => `<span class="${i === A.cons ? 'on' : ''}" title="${c}"></span>`).join('')}</div>
      <div class="cons-lbl"><span>Fresh</span><span>${CONS[A.cons]}</span><span>Extra hard</span></div>
      ${A.texture ? `<p class="lead">${esc(A.texture)}</p>` : ''}</div>` : ''}
    ${A.pairings && A.pairings.length ? `<div class="field"><span class="flabel">Goes with</span><div class="pills">${A.pairings.map(p => `<span class="pill">${esc(p)}</span>`).join('')}</div></div>` : ''}
    ${A.tryNext && A.tryNext.length ? `<div class="field"><span class="flabel">If you liked this, try</span><div class="pills">${A.tryNext.map(p => `<span class="pill">${esc(p)}</span>`).join('')}</div></div>` : ''}
  </div>`;
}
function pendingHTML(e) {
  return `<div class="ai pending">
    <div class="ai-head">${OWL}<p><b>Waiting for the appraiser</b>Export it from the Desk tab and hand it to Claude. This page fills in when you import the result.</p></div>
    <ul class="ghost-list">
      ${!e.name ? '<li><span>Name, read from the pack</span><span>???</span></li>' : ''}
      <li><span>Style, milk, origin, age</span><span>???</span></li>
      <li><span>Price per kg + tier</span><span>${e.priceEur && e.weightG ? fmtEur(e.priceEur / e.weightG * 1000) : '???'}</span></li>
      <li><span>Taste profile (6 axes)</span><span>???</span></li>
      <li><span>Consistency</span><span>???</span></li>
      <li><span>Pairings, what to try next</span><span>???</span></li>
    </ul></div>`;
}

app.actions['ptab'] = el => { ui.photoTab = el.dataset.v; app.rerender(); };
let armT = 0;
app.actions['entry-del'] = async el => {
  const id = el.dataset.v;
  if (ui.armed !== id) { ui.armed = id; app.rerender(); clearTimeout(armT); armT = setTimeout(() => { ui.armed = null; app.rerender(); }, 3000); return; }
  ui.armed = null; await removeEntry(id); app.go('#cellar'); app.toast('Deleted.');
};
app.actions['retaste-open'] = () => { ui.retaste = app.ui.routeArg; ui.retasteV = 0; ui.retasteNote = ''; app.rerender(); };
app.actions['retaste-cancel'] = () => { ui.retaste = null; app.rerender(); };
app.actions['retaste-rate'] = el => { const v = +el.dataset.v; ui.retasteV = ui.retasteV === v ? 0 : v; app.rerender(); };
app.inputs['retaste'] = el => { ui.retasteNote = el.value; };
app.actions['retaste-save'] = async () => {
  const e = byId(ui.retaste);
  if (!ui.retasteV) { app.toast('Tap a wedge for today’s verdict first.'); return; }
  e.retastes = e.retastes || [];
  e.retastes.push({ date: new Date().toISOString(), overall: ui.retasteV, note: (ui.retasteNote || '').trim() });
  await saveEntry(e); ui.retaste = null; app.rerender(); app.toast('Tasting added.');
};
