// Round 1 of the pumpkin tasting (20 Oct 2026), moved over from the old Pumpkin Ledger page with its real results.
// The sprite specs are the ones the old page drew its pumpkins from.

export const PUMPKIN_ROUND_ID = 'pumpkin-round-1';

export function pumpkinRound1() {
  const samples = [
    { id: 'butternut', name: 'Butternut', sub: 'C. moschata · dense, sweet, nutty; firm skin',
      sprite: { kind: 'pumpkin', w: 14, h: 22, shape: 'pear', ribs: 0, base: '#e8c48c', shade: '#c49a5e', light: '#f6deb0', rib: '#c49a5e', stem: '#6d5a2c' } },
    { id: 'hokkaido', name: 'Hokkaido', sub: 'C. maxima · chestnutty, dry and fluffy; skin goes soft',
      sprite: { kind: 'pumpkin', w: 22, h: 18, shape: 'tear', ribs: 6, base: '#e0561f', shade: '#a93a12', light: '#f2864a', rib: '#b9461a', stem: '#5e6b2e' } },
    { id: 'minimuskat', name: 'Mini Muskat', sub: 'C. moschata · compact Musquée de Provence; aromatic, tough skin',
      sprite: { kind: 'pumpkin', w: 26, h: 14, shape: 'flat', ribs: 10, base: '#c78d3e', shade: '#946327', light: '#dcae64', rib: '#7f531d', stem: '#4f5d2a', pattern: 'mottle', p1: '#8a8f55' } },
    { id: 'sweetlightning', name: 'Sweet Lightning', sub: 'C. pepo · mini, ivory-marbled orange; chestnut-sweet',
      sprite: { kind: 'pumpkin', w: 16, h: 14, shape: 'round', ribs: 8, base: '#eea443', shade: '#c27a26', light: '#f7c873', rib: '#b56c1f', stem: '#5b6a2c', pattern: 'marble', p1: '#f6e6c2' } },
    { id: 'mandarin', name: 'Mandarin Orange', sub: 'Small, bright orange and ribbed; thin skin',
      sprite: { kind: 'pumpkin', w: 20, h: 15, shape: 'flat', ribs: 8, base: '#f27f22', shade: '#c45c10', light: '#f9a454', rib: '#bd5810', stem: '#566a2a' } },
    { id: 'sweetdumpling', name: 'Sweet Dumpling', sub: 'C. pepo · cream with green stripes; sweet and nutty',
      sprite: { kind: 'pumpkin', w: 16, h: 13, shape: 'round', ribs: 8, base: '#f0e3c0', shade: '#cdbb8f', light: '#fbf3dc', rib: '#4f6e3a', stem: '#6b5a2e', pattern: 'stripes', p1: '#5d7f42' } },
    { id: 'blackfutsu', name: 'Black Futsu', sub: 'C. moschata · Japanese heirloom, warty; hazelnut-like, edible skin',
      sprite: { kind: 'pumpkin', w: 22, h: 15, shape: 'flat', ribs: 8, base: '#33402c', shade: '#1f281b', light: '#55654a', rib: '#1c2418', stem: '#7a6a3c', pattern: 'warts', p1: '#6c7a55', p2: '#8c7650' } },
  ];
  'ABCDEFG'.split('').forEach((c, i) => { samples[i].code = c; });
  const R = (plain, plainDip, cheese, cheeseDip, sweet, depth, cream, skin, note = '') =>
    ({ c: { plain, plainDip, cheese, cheeseDip }, p: { sweet, depth, cream }, x: skin, note });
  return {
    id: PUMPKIN_ROUND_ID,
    title: 'Pumpkin Round 1',
    subject: 'pumpkin',
    date: '2026-10-20',
    status: 'done',
    blind: false, revealed: true,
    created: '2026-10-20T18:00:00.000Z',
    protocol: [
      'Wedges ~2 cm at the thickest point, skin on. Per 500 g: 1 tbsp olive oil, ~4 g salt, fixed pepper grinds.',
      '180 °C fan. Tray 1 (Butternut, Mini Muskat, Black Futsu) first, tray 2 ~7 min later. Flip and swap trays at ~15 min; cheese on the cheese half for the last 6–8 min; done at ~30 min.',
      'Dip: 250 g Greek yogurt, zest of 1 lemon, 1–2 tbsp lemon juice, salt, splash of olive oil.',
      '4 bites per pumpkin, in rounds: plain → plain + dip → cheese → cheese + dip.',
      'The cheese used was not recorded.',
    ].join('\n'),
    samples,
    conds: [
      { id: 'plain', label: 'Plain', factors: [] },
      { id: 'plainDip', label: 'Plain + dip', factors: ['dip'] },
      { id: 'cheese', label: 'Cheese', factors: ['cheese'] },
      { id: 'cheeseDip', label: 'Cheese + dip', factors: ['cheese', 'dip'] },
    ],
    prof: [{ id: 'sweet', label: 'Sweetness' }, { id: 'depth', label: 'Nutty / earthy' }, { id: 'cream', label: 'Creaminess' }],
    extra: { label: 'Skin', options: [{ id: 'eat', label: 'Eat it' }, { id: 'chewy', label: 'Chewy' }, { id: 'peel', label: 'Peel it' }] },
    scale: ['not tasted', 'Compost heap', 'Meh', 'Solid', 'Very good', 'Prize winner'],
    scores: {
      mandarin: R(4, 4, 5, 5, 4, 2, 4, 'chewy'),
      butternut: R(3, 4, 4, 4, 2, 3, 3, 'eat'),
      sweetlightning: R(3, 3, 4, 4, 3, 3, 4, 'chewy'),
      hokkaido: R(3, 3, 3, 4, 2, 3, 3, 'eat'),
      minimuskat: R(2, 3, 3, 3, 1, 5, 2, 'chewy'),
      sweetdumpling: R(2, 3, 2, 3, 1, 2, 1, 'peel', 'good fiber texture'),
      blackfutsu: R(2, 2, 2, 2, 1, 3, 1, 'chewy'),
    },
  };
}
