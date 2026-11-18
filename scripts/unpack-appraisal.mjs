// Unpacks an appraisal-request file from the phone: writes each photo as a .jpg and prints a short overview,
// so Claude (or you) can look at the pictures. Output goes to appraisals/<file name>/ (git-ignored, photos are private).
// Run with: node scripts/unpack-appraisal.mjs path/to/appraisal-request-….json
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const file = process.argv[2];
if (!file) { console.error('Usage: node scripts/unpack-appraisal.mjs <appraisal-request.json>'); process.exit(1); }
const req = JSON.parse(readFileSync(file, 'utf8'));
if (req.type !== 'appraisal-request') { console.error('Not an appraisal-request file.'); process.exit(1); }

const out = join('appraisals', basename(file, '.json'));
mkdirSync(out, { recursive: true });
for (const c of req.cheeses) {
  const shots = [];
  for (const [slot, url] of Object.entries(c.photos || {})) {
    const m = /^data:image\/(\w+);base64,(.*)$/.exec(url || '');
    if (!m) continue;
    const p = join(out, `${c.id}-${slot}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`);
    writeFileSync(p, Buffer.from(m[2], 'base64'));
    shots.push(p);
  }
  console.log(`\n${c.id}  ${c.name || '(no name)'}  · ${c.shop || 'shop?'} · ${c.priceEur ?? '?'} € / ${c.weightG ?? '?'} g · verdict ${c.verdict && c.verdict.overall}`);
  if (c.note) console.log('  note: ' + c.note);
  shots.forEach(s => console.log('  photo: ' + s));
}
writeFileSync(join(out, 'request-without-photos.json'), JSON.stringify({ ...req, cheeses: req.cheeses.map(c => ({ ...c, photos: Object.keys(c.photos || {}) })) }, null, 2));
console.log(`\n${req.cheeses.length} cheeses unpacked to ${out}`);
