// Draws the app icon (a pixel cheese wedge on dark walnut) and writes the PNG sizes the manifest needs.
// No image library: the 16×16 pixel grid is scaled up with nearest neighbour and the PNG is encoded by hand.
// Run with: node scripts/make-icons.mjs
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const C = { '.': null, o: [0x2a, 0x17, 0x09], t: [0xfb, 0xe0, 0x8f], b: [0xf2, 0xc1, 0x4e], h: [0xb9, 0x84, 0x1c], r: [0xb0, 0x7a, 0x3a] };
const BG = [0x4b, 0x2c, 0x19];
const ART = [
  '................',
  '................',
  '............ooo.',
  '.........oooottto',
  '......oooottttttbo',
  '...oooottttttbbbo',
  '..otttttttbbbbbbo',
  '..orbbbbbbbbbbbbo',
  '..orbbhhbbbbbhbbo',
  '..orbbhhbbbbbbbbo',
  '..orbbbbbbhhbbbbo',
  '..orbbbbbbhhbbhbo',
  '..orbhbbbbbbbbbbo',
  '..oooooooooooooo.',
  '................',
  '................',
].map(r => r.padEnd(17, '.').slice(0, 17));

function render(size, safe) {
  // the art covers the central part of the icon; "safe" leaves more margin for maskable icons
  const area = Math.round(size * (safe ? 0.6 : 0.8)), off = Math.round((size - area) / 2), cell = area / 17;
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    for (let x = 0; x < size; x++) {
      const gx = Math.floor((x - off) / cell), gy = Math.floor((y - off) / cell);
      const ch = gx >= 0 && gy >= 0 && gy < 16 && gx < 17 ? ART[gy][gx] : '.';
      const col = C[ch] || BG;
      row.set([...col, 255], 1 + x * 4);
    }
    rows.push(row);
  }
  return encodePng(size, size, Buffer.concat(rows));
}

const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
function crc32(buf) { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function encodePng(w, h, raw) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const dir = new URL('../app/icons/', import.meta.url);
mkdirSync(dir, { recursive: true });
writeFileSync(new URL('icon-192.png', dir), render(192, false));
writeFileSync(new URL('icon-512.png', dir), render(512, false));
writeFileSync(new URL('icon-maskable-512.png', dir), render(512, true));
writeFileSync(new URL('apple-touch-icon.png', dir), render(180, false));
console.log('Icons written to app/icons/');
