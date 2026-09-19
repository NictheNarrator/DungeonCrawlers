# Dungeon Crawler World — Art Direction

`art/style/watercolor-pixel/` is the authoritative reference: the approved
Watercolor Pixel pages (sprite sheet, transit objects, crew portraits, survivor
camp objects, maintenance objects) plus a README listing the casting. This file is
the working summary of them: read both before drawing anything, and treat the
images as final where they disagree. Every asset — tiles, walls, doors, props,
loot, NPCs, creatures, icons, special locations — has to look like it belongs to
the same game.

`art/floor1-style-guide.png` is the older, darker guide. Its Floor 1 layout
thinking still stands; its palette and surface treatment are superseded.

Floor themes change later. The visual language does not.

## Style pillars

- Hand-drawn retro CRPG, slightly top-down, readable at phone size.
- Chunky, pixel-art-inspired forms with clean silhouettes and moderate detail.
- Slightly rough and human: imperfect edges and texture, no glossy rendering.
- Readability beats detail. Suggest more than you show.
- The base world is grimy, grounded and patched together.
- The Dungeon AI layer — system text, rewards, safe rooms — is cleaner, brighter and
  more artificial than the world it interrupts.
- Darkly funny, dangerous, strange; flashes of game-show energy, never a fantasy gloss.

Avoid: AI-art clutter, hyper-detail, cinematic lighting, gradients-as-shading, and
anything that reads as generic fantasy dungeon rather than municipal disaster.

## Palette

Base world — use these for almost everything:

| Token | Hex | Use |
| --- | --- | --- |
| `--charcoal` | `#26292b` | shadow, outline, deepest floor |
| `--warm-gray` | `#6d6a62` | concrete, generic structure |
| `--dirty-beige` | `#b0a184` | signage, paper, lit surfaces |
| `--olive` | `#6f7a4a` | intake, concourse, worn paint |
| `--rust-brown` | `#8a5a34` | metal, decay, Lost Property |
| `--faded-navy` | `#3c4a63` | transit fittings, uniforms, Departures |
| `--desaturated-teal` | `#5d7f7a` | damp, pipework, Pest Control |

Accents — deliberate and sparing; these carry meaning:

| Token | Hex | Meaning |
| --- | --- | --- |
| `--hazard-yellow` | `#e8c14a` | warning stripes, danger edges |
| `--warning-orange` | `#d97a34` | imminent danger, fire |
| `--blood-red` | `#a8332e` | damage, blood, hostility |
| `--electric-cyan` | `#4fc4d8` | Dungeon systems, screens, the AI |
| `--safe-blue` | `#4b8fd0` | Safe Rooms, protection |
| `--acid-gold` | `#d9a63f` | achievements, rewards, loot boxes |
| `--magenta` | `#a457c4` | only for genuinely weird Dungeon elements |

Rules: the world stays dirty and grounded. Bright colour is reserved for danger, system
feedback, rewards and the strange. A room should read as mostly base palette with one or
two purposeful accents.

## Scale and construction

| Thing | Size | Notes |
| --- | --- | --- |
| Tile | 32×32 | the grid unit; tiles read clearly at phone size |
| Character | ~32×48 | modular silhouette, readable at 32×32 on the grid |
| Prop | 32×32 | one tile, ordinary objects placed out of place |
| Large creature | ~64×64 | the Sump Maw and later big things |
| UI icon | 32×32 | flat, minimal, consistent stroke weight |

Keep consistent across every asset: character proportions, pixel density, lighting
direction, shadow style, prop scale, tile scale, outline treatment, and icon weight.

## Icon language

- **Interaction icons** are one language across the whole game — look, talk, take, use,
  open, lock, attack. Reuse them; never invent a one-off.
- **Map markers** are simpler than world art and grouped by category: player, NPC,
  enemy, loot, door, stairs, safe room, objective. Do not give every prop its own marker.
- **World objects** do the opposite: they get distinct sprites so two interactables are
  never confused for one another.

## Lighting and shadow

- One light direction, top-left, everywhere: highlights up-left, shadow down-right.
- Shadows are hard-edged and short, one step darker, never blurred.
- Interior lights (Dungeon AI, safe rooms, screens) are the exception and glow cyan or
  blue — they are the artificial layer intruding on the grimy one.

## Floor 1 feel

Underground concourse and service space: worn, lived in, patched, weirdly bureaucratic.
Props should imply people were here, creatures live here, and something has gone wrong.
Ordinary objects made unsettling by context. Never a generic test room.

## Building order

Work in reusable families, in this order, and finish each before starting the next:

1. sprite/style consistency pass
2. environment tile set
3. wall and door set
4. prop set
5. loot and item set
6. NPC sprite set
7. enemy sprite set
8. interaction, UI and minimap icon set
9. special location art
10. animation cleanup

## Review before adding anything

Check every new asset against `art/floor1-style-guide.png` for scale, silhouette clarity,
palette logic, tone, line and texture feel, and readability at 32×32. If it fails any of
those, revise it before it goes into the game.

## Where the rules live in code

- Palette tokens: `:root` in `style.css` (UI) and `palettes` in `src/app.mjs` (canvas).
  Both must agree with the tables above; every room needs a palette entry.
- Sprites: `sprite()` in `src/app.mjs` draws every character and prop on the tile grid.
- App icon and manifest colours: `icon.svg`, `manifest.webmanifest`.
