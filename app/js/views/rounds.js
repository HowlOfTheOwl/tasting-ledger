// Tasting rounds: the list, one round's score sheet with live results, and the "new round" form.
import { app } from '../app.js';
import { S, saveRound, saveRoundSoon, removeRound } from '../store.js';
import { esc, fmtDate, fmtDelta } from '../logic/util.js';
import { nameOf } from '../logic/cheese.js';
import { ranking, condMeans, vsBaseline, factorEffects, progress, bestText, displayName, toMarkdown, linesToItems, newRound, sampleAvg } from '../logic/rounds.js';
import { pumpkinSprite, imgOf, WEDGE, PUMPKIN_PIP } from '../sprites.js';
import { thumbHTML } from './cellar.js';

const ui = app.ui;
const byId = id => S.rounds.find(r => r.id === id);
const SUBJECTS = [['pumpkin', 'Pumpkin'], ['cheese', 'Cheese'], ['other', 'Other']];

function sampleArt(r, s, w) {
  if (r.blind && !r.revealed) return `<span class="letter">${esc(s.code)}</span>`;
  if (s.sprite && s.sprite.kind === 'pumpkin') return imgOf(pumpkinSprite(s.sprite), w, w * 0.9);
  const e = s.cheeseId && S.entries.find(x => x.id === s.cheeseId);
  if (e) return thumbHTML(e, w);
  return `<span class="letter">${esc((s.name || '?').slice(0, 1).toUpperCase())}</span>`;
}
const pipIcon = r => (r.subject === 'pumpkin' ? PUMPKIN_PIP : WEDGE);

function progressBar(r) {
  const p = progress(r);
  return `<div class="progress"><div class="progress-top"><span>Bites scored</span><b>${p.done} / ${p.total}</b></div>
    <div class="bar" style="--n:${p.total}">${Array.from({ length: p.total }, (_, i) => `<i class="${i < p.done ? 'on' : ''}"></i>`).join('')}</div></div>`;
}

/* ---------------- list ---------------- */
export function roundsView() {
  const rs = S.rounds.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return `
  <section class="panel" aria-labelledby="h-rounds">
    <div class="blk">
      <h2 id="h-rounds">Tasting rounds</h2>
      <p class="lead">Planned tastings: a fixed set of samples, each tried in several ways (plain, with cheese, with dip…). Results and effects are worked out as you score.</p>
      <div class="actions"><span></span><button class="btn go" type="button" data-go="#new-round">New round</button></div>
    </div>
    ${rs.length ? `<ul class="rlist">${rs.map(r => {
      const rk = ranking(r), top = rk[0] && rk[0].n ? rk[0] : null, p = progress(r);
      return `<li><button type="button" class="rcard" data-go="#round/${r.id}">
        <span class="rc-art">${top ? sampleArt(r, top.s, 44) : '<span class="letter">?</span>'}</span>
        <span class="rc-main"><span class="rname">${esc(r.title)}</span>
          <span class="rsub">${esc(fmtDate(r.date))} · ${r.samples.length} samples × ${r.conds.length} bites${r.blind ? ' · blind' : ''}</span>
          <span class="rsub">${top ? 'Leader: ' + esc(displayName(r, top.s)) + ' (' + top.avg.toFixed(2) + ')' : 'Nothing scored yet'}</span></span>
        <span class="tag ${r.status === 'done' ? 'done' : 'wait'}">${r.status === 'done' ? 'Finished' : p.done + '/' + p.total}</span>
      </button></li>`;
    }).join('')}</ul>` : '<p class="lead">No rounds yet.</p>'}
  </section>`;
}

/* ---------------- one round ---------------- */
export function roundView(id) {
  const r = byId(id);
  if (!r) return `<button class="back" type="button" data-go="#rounds">◂ Rounds</button><section class="panel"><p class="lead">This round does not exist any more.</p></section>`;
  const locked = r.status === 'done';
  return `
  <button class="back" type="button" data-go="#rounds">◂ Rounds</button>
  <section class="panel guide" aria-labelledby="h-round">
    <div class="blk">
      <h2 id="h-round">${esc(r.title)}</h2>
      <p class="sub">${esc(fmtDate(r.date))} · ${r.status === 'done' ? 'Finished' : 'In progress'}${r.blind ? (r.revealed ? ' · blind, revealed' : ' · blind') : ''}</p>
      ${r.protocol ? `<details><summary>Protocol</summary><div class="protocol">${r.protocol.split('\n').map(l => `<p>${esc(l)}</p>`).join('')}</div></details>` : ''}
    </div>
    <div class="blk">
      <h3>Order of bites <small>first one is the baseline</small></h3>
      <ol class="bites">${r.conds.map(c => `<li>${esc(c.label)}${c.cheeseId ? ' <small>(from the cellar)</small>' : ''}</li>`).join('')}</ol>
      <h3>Scale</h3>
      <ul class="scale">${[1, 2, 3, 4, 5].map(i => `<li><span>${i} · ${esc(r.scale[i])}</span></li>`).join('')}</ul>
      ${progressBar(r)}
    </div>
    <div class="blk"><div class="chips">${r.samples.map(s => {
      const a = sampleAvg(r, s.id), done = a.n === r.conds.length;
      return `<button type="button" class="chip ${done ? 'on' : ''}" data-act="jump" data-v="s-${s.id}">${esc(displayName(r, s))} ${a.n}/${r.conds.length}</button>`;
    }).join('')}</div></div>
  </section>
  ${r.samples.map(s => sampleCard(r, s, locked)).join('')}
  ${resultsHTML(r)}`;
}

function sampleCard(r, s, locked) {
  const st = r.scores[s.id] || { c: {}, p: {}, x: '', note: '' };
  const a = sampleAvg(r, s.id), hidden = r.blind && !r.revealed;
  const dis = locked ? 'disabled' : '';
  return `<section class="panel card" id="s-${s.id}" aria-label="${esc(displayName(r, s))}">
    <div class="card-head">
      <span class="sprite-box">${sampleArt(r, s, 64)}</span>
      <div class="min0"><h2>${esc(displayName(r, s))}</h2>${!hidden && s.sub ? `<p class="sub">${esc(s.sub)}</p>` : ''}</div>
      <div class="vbadge"><b>${a.n ? a.avg.toFixed(1) : '–'}</b><span>avg</span></div>
    </div>
    <div class="blk">
      <h3>Bites</h3>
      ${r.conds.map(c => {
        const v = st.c[c.id] || 0;
        return `<div class="rate"><span class="rl"><span>${esc(c.label)}</span><em class="${v ? 'set' : ''}">${v ? esc(r.scale[v]) : 'not tasted'}</em></span>
          <span class="pips small ${r.subject === 'pumpkin' ? 'pk' : ''}" role="radiogroup" aria-label="${esc(c.label)}">${[1, 2, 3, 4, 5].map(i =>
            `<button type="button" class="pip ${i <= v ? 'on' : ''}" ${dis} data-act="score" data-r="${r.id}" data-s="${s.id}" data-c="${c.id}" data-v="${i}" role="radio" aria-checked="${i === v}" aria-label="${i}: ${esc(r.scale[i])}">${pipIcon(r)}</button>`).join('')}</span></div>`;
      }).join('')}
    </div>
    ${r.prof.length ? `<div class="blk"><h3>Profile <small>1 low · 5 high</small></h3>
      ${r.prof.map(p => { const v = st.p[p.id] || 0; return `<div class="prow2"><span>${esc(p.label)}</span><span class="dots">${[1, 2, 3, 4, 5].map(i =>
        `<button type="button" class="dot ${i <= v ? 'on' : ''}" ${dis} data-act="prof" data-r="${r.id}" data-s="${s.id}" data-p="${p.id}" data-v="${i}" aria-label="${esc(p.label)} ${i}"><i></i></button>`).join('')}</span></div>`; }).join('')}</div>` : ''}
    ${r.extra ? `<div class="blk"><div class="rate"><span class="rl"><span>${esc(r.extra.label)}</span></span>
      <span class="seg">${r.extra.options.map(o => `<button type="button" ${dis} data-act="extra" data-r="${r.id}" data-s="${s.id}" data-v="${o.id}" class="${st.x === o.id ? 'on' : ''}">${esc(o.label)}</button>`).join('')}</span></div></div>` : ''}
    <div class="blk"><div class="field"><label for="n-${s.id}">Notes</label>
      <textarea id="n-${s.id}" ${locked ? 'readonly' : ''} data-in="round-note" data-r="${r.id}" data-s="${s.id}" placeholder="Texture, what the cheese or dip did…">${esc(st.note || '')}</textarea></div></div>
  </section>`;
}

function resultsHTML(r) {
  const rk = ranking(r), cm = condMeans(r), vb = vsBaseline(r), fe = factorEffects(r);
  const maxAbs = Math.max(0.5, ...vb.map(e => Math.abs(e.d)), ...fe.map(e => Math.abs(e.d)));
  const effBar = (label, e, sub) => `<div class="eff"><span>${esc(label)}<small>${sub}</small></span>
    <span class="eff-track"><i class="${e.d < 0 ? 'neg' : ''}" style="--w:${Math.abs(e.d) / maxAbs * 50}%"></i></span><b>${e.n ? fmtDelta(e.d) : '–'}</b></div>`;
  return `<section class="panel results" aria-labelledby="h-res">
    <div class="blk"><h2 id="h-res">Standings</h2>
      <ol class="rank">${rk.map((x, i) => `<li class="rrow ${x.n ? '' : 'idle'}">
        <span class="ribbon ${x.n && i < 3 ? 'r' + (i + 1) : ''}">${i + 1}</span><span class="ico">${sampleArt(r, x.s, 36)}</span>
        <span class="nm">${esc(displayName(r, x.s))}<small>${esc(bestText(x, r.conds.length))}</small></span>
        <span class="rbar"><i style="--w:${x.avg / 5 * 100}%"></i></span><span class="sc">${x.n ? x.avg.toFixed(2) : '–'}</span></li>`).join('')}</ol>
    </div>
    <div class="blk"><h3>Mean per bite</h3>
      <div class="means">${cm.map(m => `<div><b>${m.n ? m.m.toFixed(1) : '–'}</b><span>${esc(m.cond.label)}</span></div>`).join('')}</div></div>
    ${vb.length ? `<div class="blk"><h3>Against ${esc(r.conds[0].label)} <small>mean difference within each sample</small></h3>
      ${vb.map(e => effBar(e.cond.label, e, `${e.n} samples`)).join('')}</div>` : ''}
    ${fe.length ? `<div class="blk"><h3>Factor effects <small>pairs that differ only by that factor</small></h3>
      ${fe.map(e => effBar('+ ' + e.factor, e, `${e.n} pairs`)).join('')}</div>` : ''}
    <div class="blk">
      <p class="status" id="copy-status" aria-live="polite"></p>
      <div class="actions wrap">
        <button class="btn" type="button" data-act="copy-md" data-r="${r.id}">Copy results</button>
        ${r.blind && !r.revealed ? `<button class="btn" type="button" data-act="reveal" data-r="${r.id}">${ui.armed === 'rev' + r.id ? 'Tap again to reveal' : 'Reveal names'}</button>` : ''}
        <button class="btn" type="button" data-act="round-status" data-r="${r.id}">${r.status === 'done' ? 'Reopen round' : 'Finish round'}</button>
        <button class="btn-small" type="button" data-go="#new-round/${r.id}">New round with this setup</button>
        <button class="btn-ghost ${ui.armed === 'del' + r.id ? 'armed' : ''}" type="button" data-act="round-del" data-r="${r.id}">${ui.armed === 'del' + r.id ? 'Tap again to delete' : 'Delete round'}</button>
      </div>
      <textarea id="md-fallback" class="mono" readonly hidden aria-label="Results as text"></textarea>
    </div>
  </section>`;
}

const scoreOf = (r, sid) => (r.scores[sid] = r.scores[sid] || { c: {}, p: {}, x: '', note: '' });
app.actions['score'] = el => { const r = byId(el.dataset.r), st = scoreOf(r, el.dataset.s), v = +el.dataset.v; st.c[el.dataset.c] = st.c[el.dataset.c] === v ? 0 : v; saveRound(r); app.rerender(); };
app.actions['prof'] = el => { const r = byId(el.dataset.r), st = scoreOf(r, el.dataset.s), v = +el.dataset.v; st.p[el.dataset.p] = st.p[el.dataset.p] === v ? 0 : v; saveRound(r); app.rerender(); };
app.actions['extra'] = el => { const r = byId(el.dataset.r), st = scoreOf(r, el.dataset.s); st.x = st.x === el.dataset.v ? '' : el.dataset.v; saveRound(r); app.rerender(); };
app.inputs['round-note'] = el => { const r = byId(el.dataset.r); scoreOf(r, el.dataset.s).note = el.value; saveRoundSoon(r); };
app.actions['jump'] = el => { const t = document.getElementById(el.dataset.v); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
app.actions['round-status'] = el => { const r = byId(el.dataset.r); r.status = r.status === 'done' ? 'open' : 'done'; saveRound(r); app.rerender(); app.toast(r.status === 'done' ? 'Round finished. Scores are locked.' : 'Round reopened.'); };
let armT = 0;
const arm = key => { ui.armed = key; app.rerender(); clearTimeout(armT); armT = setTimeout(() => { ui.armed = null; app.rerender(); }, 3000); };
app.actions['reveal'] = el => { const r = byId(el.dataset.r); if (ui.armed !== 'rev' + r.id) return arm('rev' + r.id); ui.armed = null; r.revealed = true; saveRound(r); app.rerender(); app.toast('Names revealed.'); };
app.actions['round-del'] = async el => { const id = el.dataset.r; if (ui.armed !== 'del' + id) return arm('del' + id); ui.armed = null; await removeRound(id); app.go('#rounds'); app.toast('Round deleted.'); };
app.actions['copy-md'] = el => {
  const md = toMarkdown(byId(el.dataset.r)), st = document.getElementById('copy-status');
  const fallback = () => { const t = document.getElementById('md-fallback'); t.hidden = false; t.value = md; t.focus(); t.select(); st.textContent = 'Copy the selected text.'; };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(md).then(() => { st.textContent = 'Copied as a Markdown table.'; }, fallback);
  else fallback();
};

/* ---------------- new round ---------------- */
function draftFromRound(src) {
  return {
    title: src ? src.title.replace(/\d+\s*$/, m => String(+m + 1)) : '', date: new Date().toISOString().slice(0, 10),
    subject: src ? src.subject : 'cheese', blind: src ? src.blind : false,
    samples: src ? src.samples.map(s => s.name).join('\n') : '',
    conds: src ? src.conds.filter(c => !c.cheeseId).map(c => c.label).join('\n') : 'No cheese',
    prof: src ? src.prof.map(p => p.label).join('\n') : '',
    extraLabel: src && src.extra ? src.extra.label : '', extraOpts: src && src.extra ? src.extra.options.map(o => o.label).join(', ') : '',
    protocol: src ? src.protocol : '', cheeses: [], cheeseAs: 'conds', srcId: src ? src.id : null,
  };
}
export function newRoundView(srcId) {
  const key = 'nr:' + (srcId || '');
  if (ui.rfKey !== key) { ui.rf = draftFromRound(srcId && byId(srcId)); ui.rfKey = key; }
  const D = ui.rf;
  const cellar = S.entries.filter(e => !e.example).concat(S.entries.filter(e => e.example));
  return `
  <button class="back" type="button" data-go="${srcId ? '#round/' + srcId : '#rounds'}">◂ Back</button>
  <section class="panel" aria-labelledby="h-nr">
    <div class="blk"><h2 id="h-nr">New tasting round</h2>
      <p class="lead">${srcId ? 'Setup copied from the earlier round. Change what you like.' : 'One line per item. You can copy the setup of an earlier round from its results.'}</p></div>
    <div class="blk">
      <div class="field"><label for="nr-title">Title</label><input id="nr-title" type="text" data-in="rf" data-f="title" value="${esc(D.title)}" placeholder="Pumpkin Round 2: which cheese?"></div>
      <div class="two">
        <div class="field"><label for="nr-date">Date</label><input id="nr-date" type="date" data-in="rf" data-f="date" value="${esc(D.date)}"></div>
        <div class="field"><span class="flabel">Subject</span><span class="seg">${SUBJECTS.map(([k, l]) => `<button type="button" data-act="rf-subject" data-v="${k}" class="${D.subject === k ? 'on' : ''}">${l}</button>`).join('')}</span></div>
      </div>
    </div>
    <div class="blk">
      <div class="field"><label for="nr-samples">Samples</label><small>What you compare, one per line (e.g. pumpkin varieties).</small>
        <textarea id="nr-samples" rows="5" data-in="rf" data-f="samples" placeholder="Mandarin Orange\nButternut">${esc(D.samples)}</textarea></div>
      <div class="field"><label for="nr-conds">Bites</label><small>How each sample is tasted, in order. The first line is the baseline the others are compared with.</small>
        <textarea id="nr-conds" rows="4" data-in="rf" data-f="conds" placeholder="No cheese\nParmesan\nFeta">${esc(D.conds)}</textarea></div>
    </div>
    <div class="blk">
      <h3>Cheeses from the cellar <small>optional, links the results back</small></h3>
      ${cellar.length ? `<div class="chips">${cellar.map(e => `<button type="button" class="chip ${D.cheeses.includes(e.id) ? 'on' : ''}" data-act="rf-cheese" data-v="${e.id}">${esc(nameOf(e))}${e.example ? ' (example)' : ''}</button>`).join('')}</div>
      <div class="rate"><span class="rl"><span>Add them as</span></span><span class="seg">${[['conds', 'Bites'], ['samples', 'Samples']].map(([k, l]) => `<button type="button" data-act="rf-as" data-v="${k}" class="${D.cheeseAs === k ? 'on' : ''}">${l}</button>`).join('')}</span></div>` : '<p class="lead">The cellar is empty.</p>'}
    </div>
    <div class="blk">
      <div class="field"><label for="nr-prof">Profile axes</label><small>Rated 1–5 per sample, one per line. Leave empty to skip.</small>
        <textarea id="nr-prof" rows="3" data-in="rf" data-f="prof" placeholder="Sweetness\nSaltiness">${esc(D.prof)}</textarea></div>
      <div class="two">
        <div class="field"><label for="nr-xl">Extra question</label><input id="nr-xl" type="text" data-in="rf" data-f="extraLabel" value="${esc(D.extraLabel)}" placeholder="Skin"></div>
        <div class="field"><label for="nr-xo">Answers</label><input id="nr-xo" type="text" data-in="rf" data-f="extraOpts" value="${esc(D.extraOpts)}" placeholder="Eat it, Chewy, Peel it"></div>
      </div>
      <div class="rate"><span class="rl"><span>Blind tasting</span><em>Samples get shuffled letter codes; names stay hidden until you reveal them.</em></span>
        <span class="seg">${[[true, 'On'], [false, 'Off']].map(([k, l]) => `<button type="button" data-act="rf-blind" data-v="${k}" class="${D.blind === k ? 'on' : ''}">${l}</button>`).join('')}</span></div>
      <div class="field"><label for="nr-proto">Protocol</label><textarea id="nr-proto" rows="4" data-in="rf" data-f="protocol" placeholder="Oven, amounts, timing…">${esc(D.protocol)}</textarea></div>
    </div>
    <div class="blk"><p class="err" id="rf-err" aria-live="polite"></p>
      <div class="actions"><button class="btn-small" type="button" data-go="${srcId ? '#round/' + srcId : '#rounds'}">Cancel</button><button class="btn go" type="button" data-act="rf-save">Start round</button></div></div>
  </section>`;
}
app.inputs['rf'] = el => { ui.rf[el.dataset.f] = el.value; };
app.actions['rf-subject'] = el => { ui.rf.subject = el.dataset.v; app.rerender(); };
app.actions['rf-blind'] = el => { ui.rf.blind = el.dataset.v === 'true'; app.rerender(); };
app.actions['rf-as'] = el => { ui.rf.cheeseAs = el.dataset.v; app.rerender(); };
app.actions['rf-cheese'] = el => { const a = ui.rf.cheeses, i = a.indexOf(el.dataset.v); i < 0 ? a.push(el.dataset.v) : a.splice(i, 1); app.rerender(); };
app.actions['rf-save'] = async () => {
  const D = ui.rf, err = document.getElementById('rf-err');
  const src = D.srcId && byId(D.srcId);
  const linked = D.cheeses.map(id => S.entries.find(e => e.id === id)).filter(Boolean);
  const samples = linesToItems(D.samples).map(i => {
    const old = src && src.samples.find(s => s.name === i.label);
    return { id: i.id, name: i.label, sub: old ? old.sub : '', sprite: old ? old.sprite : undefined };
  });
  const conds = linesToItems(D.conds).map(i => {
    const old = src && src.conds.find(c => c.label === i.label);
    return old && old.factors ? { id: i.id, label: i.label, factors: old.factors.slice() } : { id: i.id, label: i.label };
  });
  const target = D.cheeseAs === 'samples' ? samples : conds;
  linked.forEach(e => {
    let id = 'cheese-' + e.id;
    target.push(D.cheeseAs === 'samples' ? { id, name: nameOf(e), sub: e.shop || '', cheeseId: e.id } : { id, label: nameOf(e), cheeseId: e.id });
  });
  if (!D.title.trim()) { err.textContent = 'Give the round a title.'; return; }
  if (!samples.length) { err.textContent = 'Add at least one sample.'; return; }
  if (!conds.length) { err.textContent = 'Add at least one bite (for example “Plain”).'; return; }
  const opts = D.extraOpts.split(',').map(s => s.trim()).filter(Boolean);
  const extra = D.extraLabel.trim() && opts.length ? { label: D.extraLabel.trim(), options: linesToItems(opts.join('\n')) } : null;
  const r = newRound({ title: D.title.trim(), subject: D.subject, date: D.date, protocol: D.protocol.trim(), samples, conds,
    prof: linesToItems(D.prof), extra, blind: D.blind });
  await saveRound(r);
  ui.rfKey = null;
  app.go('#round/' + r.id); app.toast(`Round started: ${samples.length * conds.length} bites to score.`);
};
