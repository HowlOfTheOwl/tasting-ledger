# Appraising cheeses (instructions for Claude)

The phone app exports `appraisal-request-<date>.json`: the cheeses that have no appraiser's notes yet, with photos
(front of the pack and the price label) as base64 JPEGs, Nico's verdict and notes, and `tasteSoFar` (the cheeses
already appraised, with verdicts and profiles).

## Steps
1. `node scripts/unpack-appraisal.mjs <request file>` writes the photos to `appraisals/<name>/` and prints an overview.
2. Look at every photo (Read the .jpg files). Identify the cheese: name, producer if visible, style, milk, origin.
   On German price labels the **Grundpreis** (price per kg, e.g. "1 kg = 17,45 €") is printed by law; prefer it over
   price ÷ weight. Use web search when the pack is unclear. If you cannot identify a cheese, say so in `blurb` and
   fill only what you can see; never invent a precise name.
3. Write `appraisals/appraisal-result-<date>.json` in the format below and tell Nico to move it to the phone
   (Google Drive or similar) and import it on the Desk tab.

## Result format
```json
{
  "type": "appraisal-result",
  "version": 1,
  "appraisals": [
    {
      "id": "<id from the request>",
      "ai": {
        "name": "Bergkäse 9 Monate (Vorarlberg)",
        "canonical": "Bergkäse",
        "style": "Hard",
        "milk": "Cow (raw)",
        "country": "Austria",
        "origin": "Vorarlberg, Austria",
        "age": "9 months",
        "fat": "50 % i. Tr.",
        "perKg": 24.90,
        "perKgSrc": "read from the label (Grundpreis)",
        "profile": { "nutty": 4, "butter": 3, "salt": 3, "tang": 1, "sharp": 2, "funk": 2 },
        "cons": 4,
        "texture": "Firm and supple, small eyes",
        "pairings": ["Rye bread", "Roasted pumpkin"],
        "tryNext": ["Vorarlberger Alpkäse"],
        "blurb": "One or two sentences on what it is and why it tastes like this.",
        "look": { "shape": "wheel", "paste": "#f0cd6d", "rind": "#8a5a2b", "pattern": "eyes" }
      }
    }
  ],
  "recommendations": [
    { "name": "Époisses", "why": "You rate buttery, funky cheeses highest" }
  ]
}
```

Field rules (the app checks them on import):
- `style`: one of Fresh, Soft, Blue, Semi-hard, Hard (the Cellar filter uses these).
- `country`: English country name; the passport has stamps for France, Italy, Switzerland, Netherlands, Germany,
  Austria, Greece, Spain, United Kingdom, Ireland, Denmark, Belgium, Portugal, Norway, Cyprus (others go to "Elsewhere").
- `profile`: whole numbers 0–5 for nutty, butter (buttery), salt, tang (tangy/acidic), sharp, funk (funky/barnyard).
- `cons`: 0 Fresh, 1 Soft, 2 Semi-soft, 3 Semi-hard, 4 Hard, 5 Extra hard.
- `perKg`: number in euros, or leave it out if unknown.
- `canonical`: the plain cheese name without shop or brand, so the same cheese from two shops is grouped.
- `name`: only used when Nico left the name empty.
- `look` draws the pixel sprite: `shape` wedge | wheel | log | block | ball, `paste` and `rind` as #rrggbb,
  `pattern` none | eyes | veins | crystals | ash, optional `veins` colour for blue cheeses.
- `recommendations` (optional): 3–5 cheeses to try next, based on `tasteSoFar` and the new verdicts.
  Leave out anything already in the cellar.
