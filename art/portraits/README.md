# Floor 1 dialogue portraits

Six portraits, drawn for the conversation scene rather than for the map.
`src/portraits.mjs` holds the cast: proportions, palette, hair, expression and
detail for each character. `src/app.mjs` draws them into `#talk-portrait`.

## How a portrait is chosen

1. `art/portraits/<id>.png` — an illustrated portrait, if the file exists.
2. `entry.variants[<expression>]` — a per-expression file, when one is added.
3. The drawn portrait in `src/portraits.mjs` — always available.
4. The enlarged world sprite — for any character with no portrait at all.

Nothing renders blank, and adding an illustrated file needs no code change.

| id | file | who |
|----|------|-----|
| `mara` | `art/portraits/mara.png` | late twenties to early thirties, frightened and refusing to show it |
| `skrit` | `art/portraits/skrit.png` | a person first and a monster second |
| `tobin` | `art/portraits/tobin.png` | thin, patchy, inventorying your pockets |
| `vex` | `art/portraits/vex.png` | composed, unreadable, dangerous without trying |
| `eli` | `art/portraits/eli.png` | an ordinary man pushed well past his comfort zone |
| `june` | `art/portraits/june.png` | striking in a different key to Mara, hurt but not helpless |

## The art brief these follow

Hand-drawn retro CRPG portraits, in the spirit of 1990s computer RPG portrait
art: illustrated rather than photorealistic, slightly rough, restrained painterly
shading, visible human-made texture, strong silhouette, believable anatomy, less
detail than modern concept art. Not glossy, not airbrushed, not hyperreal, no
generic fantasy costume, and no two characters sharing a face.

Every portrait is an adult, cropped head and upper torso, turned slightly toward
the viewer, readable at phone size on a simple dark textured background. All six
share one drawing style, one crop, one light (upper left, hard short shadow) and
the game's palette: charcoal, warm gray, dirty beige, rust, olive, faded navy
and desaturated teal, with accents used on purpose and kept away from the faces.
Attractiveness comes from face, expression, confidence, hair and silhouette -
never from the clothes.

## Expression variants

The seam is `variants` on each registry entry, keyed by state: `neutral`,
`amused`, `angry`, `afraid`, `suspicious`, `injured`, `friendly`, `hostile`.
One strong default is enough for now; variants can be added file by file, and
`drawPortrait` already asks for the loaded state before the default.
