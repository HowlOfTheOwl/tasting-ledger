# Tasting Ledger

Personal tasting app for Nico (chemist, likes things visual and quantitative). Two parts:
- **Cheese Cellar**: an open-ended log. At the counter: photo of the pack + price label, verdict (overall, taste,
  texture, buy again), eaten with, notes. Later an AI "appraiser" (Claude, see `APPRAISAL.md`) adds name, style,
  milk, origin, price per kg, taste profile, consistency, pairings, what to try next.
- **Tasting rounds**: planned experiments, samples × bites scored 1–5, with ranking, mean per bite, effect of each
  bite against the baseline (first bite) and factor effects for factorial designs. Round 1 (pumpkins, 20 Oct 2026)
  is seeded from the old Pumpkin Ledger with its real results (`app/js/data/pumpkinRound1.js`).

Successor of the single-page Pumpkin Ledger (handover zip in this folder). Same look; the gym app
(`../Gym app`) was the model for the phone setup.

## Commands
- `node scripts/serve.mjs`: local server on port 5174, also on the LAN (phone on the same Wi-Fi)
- `node --test`: unit tests for the pure logic (`tests/`)
- `node scripts/make-icons.mjs`: regenerate the PNG icons in `app/icons/`
- `node scripts/unpack-appraisal.mjs <file>`: unpack photos from an appraisal request (see `APPRAISAL.md`)

## Stack and decisions
- **No build step, no dependencies.** Plain HTML/CSS and ES modules in `app/`, served as-is by GitHub Pages.
  Keep it that way unless there is a strong reason.
- **Offline PWA**: `app/manifest.webmanifest` + `app/sw.js` (network first for app files, cache fallback; fonts cache
  first). Bump `VERSION` in `sw.js` when the file list changes, and add new files to `SHELL`.
- **Storage**: IndexedDB (`app/js/db.js`), stores `entries`, `rounds`, `meta`. Photos are stored inside the entry as
  JPEG data URLs, scaled to 1000 px. Everything is loaded into memory at start (`store.js`) and written through.
- **Pure logic** in `app/js/logic/` (no DOM) so `node --test` can import it. Screens in `app/js/views/` return HTML
  strings; events are wired once in `main.js` via `data-act` (click), `data-in` (typing), `data-ch` (file picker),
  `data-go` (navigate). Routes live in the hash (`#cellar`, `#entry/<id>`, `#round/<id>`, …).
- **Examples**: 7 made-up cheeses are seeded on first start, marked `example: true`, removable with one tap, never
  exported for appraisal.
- **Same cheese, different shops**: entries are grouped by `sameAs` (set by "Bought it elsewhere") or by the
  appraiser's `canonical` name.
- **Price tiers**: under 15 €/kg one coin, 15–30 two, over 30 three (`tierOf`).
- **Blind rounds**: samples get shuffled letter codes; names, subtitles and sprites stay hidden until "Reveal".
- **Pumpkin link**: rounds can use cellar cheeses as bites or samples (`cheeseId`); the cheese page and the Ledger
  show the effect.
- **Art** is original and drawn in code (`sprites.js`, `scene.js`). Never use copyrighted images; the repo is public.
- Confirmations are two taps within 3 s, no dialogs.

## Deployment
GitHub repo `HowlOfTheOwl/tasting-ledger` (public). `.github/workflows/deploy.yml` runs the tests and publishes
`app/` to GitHub Pages on every push to `main`: https://howloftheowl.github.io/tasting-ledger/
Commits use the GitHub no-reply address `214977459+HowlOfTheOwl@users.noreply.github.com`.
Private files (photos, appraisal files, the old zip, the prototype) are git-ignored.

## Ideas not built yet
- Cellar map as an actual pixel map of Europe (the passport stamps stand in for it).
- Calling the Claude API from the phone directly (needs an API key on the phone; the file round trip avoids that).
- Sync between devices.
