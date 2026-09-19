// The Watercolor Pixel palette, sampled off the approved guide rather than
// eyeballed: the sixteen swatches printed on page 04's palette strip, which
// match the header strips on every other page.
//
// This module is the single source of truth. style.css mirrors these values as
// custom properties and a check keeps the two in step.

export const PALETTE = {
 ink:'#07265b',        // deepest blue, for outlines and night
 blue:'#1d5193',       // the transit blue
 teal:'#3279a4',       // dusty blue-green
 sky:'#7aafc3',        // pale sky, the light in the room
 cream:'#fdefcb',      // paper, paint, clean surfaces
 sand:'#eac999',       // tan, dry concrete
 orange:'#df8f44',     // warning orange, warm light
 brick:'#c0393a',      // brick red and blood
 rose:'#b27579',       // dusty red, faded signage
 brown:'#8d725c',      // soft brown, timber, dirt
 olive:'#7c9565',      // muted olive, canvas and webbing
 green:'#99ad7c',      // faded green, moss and foliage
 umber:'#604e4d',      // dark warm brown, shadowed timber
 slate:'#8c8e9e',      // concrete grey-blue
 grey:'#9091a0',       // neutral concrete
 skin:'#efbeb7'        // warm skin, plaster, bloom
};

// Named roles the game actually asks for. Everything points back at a swatch so
// there is no second palette to drift.
export const TOKENS = {
 bg:PALETTE.ink, panel:PALETTE.blue, text:PALETTE.cream, muted:PALETTE.slate,
 accent:PALETTE.orange, danger:PALETTE.brick, safe:PALETTE.teal, system:PALETTE.sky,
 gold:PALETTE.sand, lime:PALETTE.green
};

// Rendering and scaling rules, in one place. The guide's base unit is 16px shown
// at 4x, which is exactly the 64px world cell this game already draws, so the
// art drops in without rescaling the engine.
export const ART = {
 base:16,        // the guide's pixel-art unit
 scale:4,        // nearest-neighbour display multiple
 cell:64,        // base * scale - one world tile
 sprite:{ w:64, h:64 },      // one character or prop cell
 portrait:{ w:96, h:114, display:2 },   // drawn portrait grid and its exact 2x
 icon:{ w:16, h:16 },        // map and interaction markers
 itemIcon:{ w:32, h:32 },    // pack and reward chips
 effect:{ small:16, large:32 }
};

// Darken or lighten a swatch, clamped. Shading logic in one place: light comes
// from the upper left, so highlights are +, shadows are -.
export function shade(hex,amount){const n=parseInt(hex.slice(1),16);
 const clamp=v=>Math.max(0,Math.min(255,Math.round(v)));
 return '#'+[clamp((n>>16)+amount),clamp(((n>>8)&255)+amount),clamp((n&255)+amount)]
  .map(v=>v.toString(16).padStart(2,'0')).join('');}

// One room reads as: two floor tones and a wall band. The second floor tone is
// always the first, stepped down, so checkerboards stay in the same family.
export function floorPair(floor,step=-16){return [floor,shade(floor,step)];}

// The twelve Floor 1 rooms, in room order: the contested concourse, the camp,
// the offices, the ratmen, the checkpoint, the street, the safe room, access
// control, electrical, the tunnels, food storage and the stairwell down.
export const ROOMS=[
 {name:'Main Concourse',floor:PALETTE.slate,wall:PALETTE.blue},
 {name:'Survivor Camp',floor:PALETTE.sand,wall:PALETTE.olive},
 {name:'Records / Security',floor:PALETTE.grey,wall:PALETTE.slate},
 {name:'Ratmen Territory',floor:PALETTE.brown,wall:PALETTE.brick},
 {name:'Final Checkpoint',floor:PALETTE.slate,wall:PALETTE.orange},
 {name:'Surface',floor:PALETTE.green,wall:PALETTE.sky},
 {name:'Safe Room',floor:PALETTE.sky,wall:PALETTE.teal},
 {name:'Access Control',floor:PALETTE.grey,wall:PALETTE.sand},
 {name:'Electrical Control',floor:PALETTE.teal,wall:PALETTE.sky},
 {name:'Maintenance Tunnels',floor:PALETTE.umber,wall:PALETTE.slate},
 {name:'Food Storage',floor:PALETTE.olive,wall:PALETTE.green},
 {name:'Stairwell Down',floor:PALETTE.blue,wall:PALETTE.ink}
];
