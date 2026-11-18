// Ledger: what the cellar adds up to. Standings, value map, wish list, taste fingerprint, passport, comparisons.
import { app } from '../app.js';
import { S } from '../store.js';
import { esc, fmtEur, fmtDelta } from '../logic/util.js';
import { VERDICT, PROF, COUNTRIES, perKgOf, nameOf, currentOverall, likeProfile, upNext, passport, byMilk, sameCheeseGroups } from '../logic/cheese.js';
import { vsBaseline } from '../logic/rounds.js';
import { cheeseSprite, imgOf } from '../sprites.js';
import { thumbHTML, lookOf } from './cellar.js';

export function ledgerView() {
  const E = S.entries;
  const rated = E.filter(e => currentOverall(e)).sort((a, b) => currentOverall(b) - currentOverall(a) || (perKgOf(a) ?? 1e9) - (perKgOf(b) ?? 1e9));
  return `
  <section class="panel" aria-labelledby="h-rank">
    <div class="blk"><h2 id="h-rank">Standings</h2><p class="lead">Latest verdict per cheese. Ties go to the cheaper one per kg.</p></div>
    ${rated.length ? `<ol class="rank">${rated.map((e, i) => `<li><button type="button" class="rk" data-go="#entry/${e.id}">
      <span class="ribbon ${i < 3 ? 'r' + (i + 1) : ''}">${i + 1}</span><span class="thumb sm">${thumbHTML(e, 34)}</span>
      <span class="nm">${esc(nameOf(e))}<small>${esc(VERDICT[currentOverall(e)])}${perKgOf(e) ? ' · ' + fmtEur(perKgOf(e)) + '/kg' : ''}</small></span><span class="sc">${currentOverall(e)}</span></button></li>`).join('')}</ol>`
      : '<p class="lead">Rate a cheese to start the standings.</p>'}
  </section>
  <section class="panel" aria-labelledby="h-map">
    <div class="blk"><h2 id="h-map">Value map</h2><p class="lead">Your verdict against price per kg. Top left is where the bargains live.</p></div>
    <div class="chart-wrap">${mapSVG(E)}</div>
    <div class="legend"><span><i style="background:var(--bargain)"></i>Bargain zone: 4 or more for under 20 €/kg</span></div>
  </section>
  ${upNextHTML(E)}
  <section class="panel" aria-labelledby="h-like">
    <div class="blk"><h2 id="h-like">What you like</h2><p class="lead">Average taste profile of cheeses you rate 4–5 against the ones you rate 1–3. Appraised cheeses only.</p></div>
    ${likeHTML(E)}
  </section>
  ${groupsHTML(E)}
  <section class="panel" aria-labelledby="h-pass">
    <div class="blk"><h2 id="h-pass">Cheese passport</h2><p class="lead">A stamp for every country you have tasted. The number is how many cheeses, the wedges your best verdict.</p></div>
    ${passportHTML(E)}
  </section>
  <section class="panel" aria-labelledby="h-milk">
    <div class="blk"><h2 id="h-milk">By milk</h2></div>
    <div class="milk">${(() => { const rows = byMilk(E), max = Math.max(1, ...rows.map(r => r.n)); return rows.map(r =>
      `<div class="milk-row"><span>${esc(r.milk)}</span><i><u style="width:${r.n / max * 100}%"></u></i><b>${r.n}× · ${r.avg ? r.avg.toFixed(1) : '–'}</b></div>`).join(''); })()}</div>
    <p class="lead">Count, then average verdict.</p>
  </section>
  ${roundsLinkHTML()}`;
}

function mapSVG(E) {
  const pts = E.filter(e => currentOverall(e) && perKgOf(e) != null);
  const W = 320, H = 210, L = 30, R = 12, T = 12, B = 30, xmax = 40;
  const X = v => L + (Math.min(v, xmax) / xmax) * (W - L - R), Y = v => T + (5 - v) / 4 * (H - T - B);
  let s = `<svg class="map" viewBox="0 0 ${W} ${H}" role="img" aria-label="Verdict against price per kg">`;
  s += `<rect x="${X(0)}" y="${Y(5) - 6}" width="${X(20) - X(0)}" height="${Y(4) - Y(5) + 12}" class="zone"/>`;
  for (let v = 1; v <= 5; v++) s += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" class="grid"/><text x="${L - 8}" y="${Y(v) + 3}" text-anchor="end">${v}</text>`;
  [0, 10, 20, 30, 40].forEach(v => { s += `<line x1="${X(v)}" x2="${X(v)}" y1="${T - 6}" y2="${H - B}" class="grid dash"/><text x="${X(v)}" y="${H - B + 14}" text-anchor="middle">${v}${v === 40 ? '+' : ''}</text>`; });
  s += `<text x="${(L + W - R) / 2}" y="${H - 3}" text-anchor="middle">€ per kg</text>`;
  s += `<line x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}" class="axis"/><line x1="${L}" x2="${L}" y1="${T - 6}" y2="${H - B}" class="axis"/>`;
  const seen = {};
  pts.forEach(e => {
    const kg = perKgOf(e), cx = X(kg), cy = Y(currentOverall(e)), sp = cheeseSprite(lookOf(e));
    const key = currentOverall(e) + ':' + Math.round(kg / 4), off = (seen[key] = (seen[key] || 0) + 1) - 1;
    const w = 24, h = Math.round(sp.s.H * w / sp.s.W), right = cx < W - 110;
    s += `<image href="${sp.url}" x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" style="image-rendering:pixelated"/>`;
    const nm = nameOf(e), short = nm.length > 18 ? nm.slice(0, 17) + '…' : nm;
    s += `<text class="lbl" x="${right ? cx + w / 2 + 2 : cx - w / 2 - 2}" y="${cy + 3 + off * 10}" text-anchor="${right ? 'start' : 'end'}">${esc(short)}</text>`;
  });
  return s + '</svg>';
}

function upNextHTML(E) {
  const list = upNext(E, S.meta.recs || []).slice(0, 8);
  return `<section class="panel" aria-labelledby="h-next">
    <div class="blk"><h2 id="h-next">Up next</h2><p class="lead">Cheeses to look out for, from the appraiser and from the tips on cheeses you loved.</p></div>
    ${list.length ? `<ul class="nextlist">${list.map(n => `<li>${imgOf(cheeseSprite('unknown'), 26)}<span><b>${esc(n.name)}</b><small>${esc(n.why)}</small></span></li>`).join('')}</ul>`
      : '<p class="lead">Rate an appraised cheese 4 or 5, or ask the appraiser for recommendations, and the list fills up.</p>'}
  </section>`;
}

function likeHTML(E) {
  const lp = likeProfile(E);
  if (!lp.nHi) return '<p class="lead">Rate an appraised cheese 4 or 5 to see your fingerprint.</p>';
  return `<div class="like">${PROF.map(([k, l]) => `<div class="like-row"><span>${l}</span><span class="like-bars">
      <i style="width:${Math.max(2, lp.hi[k] / 5 * 100)}%"></i>${lp.nLo ? `<i class="lo" style="width:${Math.max(2, lp.lo[k] / 5 * 100)}%"></i>` : ''}</span><b>${lp.hi[k].toFixed(1)}</b></div>`).join('')}
    <div class="legend"><span><i style="background:var(--cheese)"></i>Loved (${lp.nHi})</span>${lp.nLo ? `<span><i style="background:var(--parch-4)"></i>Others (${lp.nLo})</span>` : ''}</div></div>`;
}

function groupsHTML(E) {
  const gs = sameCheeseGroups(E);
  if (!gs.length) return '';
  return `<section class="panel" aria-labelledby="h-same">
    <div class="blk"><h2 id="h-same">Same cheese, different shops</h2><p class="lead">Cheapest per kg first. Is the expensive one worth it?</p></div>
    ${gs.map(g => `<div class="blk"><h3>${esc(nameOf(g[0]))}</h3><ul class="mini">${g.map(e => `<li><button type="button" data-go="#entry/${e.id}">
      <span>${esc(e.shop || 'Unknown shop')}</span><span>${perKgOf(e) ? fmtEur(perKgOf(e)) + '/kg' : '–'}</span><b>${currentOverall(e) || '–'}</b></button></li>`).join('')}</ul></div>`).join('')}
  </section>`;
}

function passportHTML(E) {
  const pp = passport(E);
  const stamp = (c, d) => `<li class="stamp ${d ? 'on' : ''}"><span class="st-n">${d ? d.n : ''}</span><span class="st-c">${esc(c)}</span>${d ? `<span class="st-w">${'▰'.repeat(d.best)}${'▱'.repeat(5 - d.best)}</span>` : '<span class="st-w">not yet</span>'}</li>`;
  const got = Object.keys(pp).filter(c => c !== 'Elsewhere').length;
  return `<p class="lead"><b>${got} of ${COUNTRIES.length}</b> stamps</p>
    <ul class="stamps">${COUNTRIES.map(c => stamp(c, pp[c])).join('')}${pp.Elsewhere ? stamp('Elsewhere', pp.Elsewhere) : ''}</ul>`;
}

/** The pumpkin link: every cheese that was used in a tasting round, and what it did there. */
function roundsLinkHTML() {
  const rows = [];
  S.rounds.forEach(r => {
    const vb = vsBaseline(r);
    r.conds.forEach(c => { if (!c.cheeseId) return; const e = S.entries.find(x => x.id === c.cheeseId), v = vb.find(x => x.cond.id === c.id);
      rows.push({ r, name: e ? nameOf(e) : c.label, d: v && v.n ? fmtDelta(v.d) : '–' }); });
  });
  if (!rows.length) return '';
  return `<section class="panel" aria-labelledby="h-rl"><div class="blk"><h2 id="h-rl">Cheeses in tasting rounds</h2>
    <p class="lead">How much each cheese lifted the score against the round’s baseline bite.</p></div>
    <ul class="mini">${rows.map(x => `<li><button type="button" data-go="#round/${x.r.id}"><span>${esc(x.name)}<small>${esc(x.r.title)}</small></span><b>${x.d}</b></button></li>`).join('')}</ul></section>`;
}

void app;
